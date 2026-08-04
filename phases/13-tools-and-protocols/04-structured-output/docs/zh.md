# 结构化输出——JSON Schema、Pydantic、Zod、受约束解码

> "客客气气求模型返回 JSON"有 5% 到 15% 的概率失败，连前沿模型也不例外。结构化输出用受约束解码弥合这道鸿沟：模型从字面上就被阻止吐出任何会违反 schema 的 token。OpenAI 的严格模式、Anthropic 的 schema 定型工具调用、Gemini 的 `responseSchema`、Pydantic AI 的 `output_type`、Zod 的 `.parse`，是同一个想法的五种表面形式。本课构建 schema 校验器和严格模式契约，学员之后每一条生产抽取管线都会用到它们。

**类型：** Build
**语言：** Python（标准库，JSON Schema 2020-12 子集）
**前置要求：** 阶段 13 · 02（function calling 深入剖析）
**预计时间：** ~75 分钟

## 学习目标

- 用对的约束（enum、min/max、required、pattern）为一个抽取目标写一份 JSON Schema 2020-12。
- 解释为什么严格模式和受约束解码给出的保证，和"生成后再校验"不一样。
- 区分三种失败模式：解析错误、schema 违反、模型拒绝。
- 交付一条带定型修复和定型拒绝处理的抽取管线。

## 问题背景

一个读采购订单邮件的 agent 需要把自由文本变成 `{customer, line_items, total_usd}`。三种做法。

**做法一：prompt 求 JSON。** "用 JSON 回复，字段为 customer、line_items、total_usd。"在前沿模型上有 85% 到 95% 的概率行。会以六种方式失败：缺花括号、多余逗号、类型错误、幻觉字段、在 token 上限处被截断、泄漏出"这是你要的 JSON："这类散文。

**做法二：生成后再校验。** 自由生成，解析，按 schema 校验，失败就重试。可靠但昂贵——每次重试你都要付费，而截断 bug 每发生一次就多花一轮。

**做法三：受约束解码。** provider 在解码时强制 schema。非法 token 被从采样分布里掩掉。输出保证能解析、保证能通过校验。失败塌缩为一种模式：拒绝（模型判断输入装不进 schema）。

2026 年每家前沿 provider 都交付了某种形式的做法三。

- **OpenAI。** `response_format: {type: "json_schema", strict: true}`，外加模型若拒绝则响应里带 `refusal`。
- **Anthropic。** 对 `tool_use` 输入做 schema 强制；`stop_reason: "refusal"` 不是个东西，但 `end_turn` 且无工具调用就是那个信号。
- **Gemini。** 请求层面的 `responseSchema`；2026 年 Gemini 为选定类型交付 token 级语法约束。
- **Pydantic AI。** `output_type=InvoiceModel` 吐出一个定型到 `InvoiceModel` 的结构化 `RunResult`。
- **Zod（TypeScript）。** 运行时解析器，按 Zod schema 校验 provider 输出；与 OpenAI 的 `beta.chat.completions.parse` 配对。

共同主线：声明一次 schema，端到端地强制它。

## 核心概念

### JSON Schema 2020-12——通用语

每家 provider 都接受 JSON Schema 2020-12。你用得最多的构造：

- `type`：`object`、`array`、`string`、`number`、`integer`、`boolean`、`null` 之一。
- `properties`：字段名到子 schema 的映射。
- `required`：必须出现的字段名清单。
- `enum`：允许值的封闭集合。
- `minimum` / `maximum`（数字）、`minLength` / `maxLength` / `pattern`（字符串）。
- `items`：施加到每个数组元素上的子 schema。
- `additionalProperties`：`false` 禁止额外字段（默认值因模式而异）。

OpenAI 严格模式额外加三条要求：每个 property 都必须列进 `required`、处处 `additionalProperties: false`、没有未解析的 `$ref`。你破坏这些，API 在请求时返回 400。

### Pydantic，Python 绑定

Pydantic v2 通过 `model_json_schema()` 从 dataclass 形状的模型生成 JSON Schema。Pydantic AI 把它包起来，于是你写：

```python
class Invoice(BaseModel):
    customer: str
    line_items: list[LineItem]
    total_usd: Decimal
```

agent 框架就在边缘把 schema 翻译成 OpenAI 严格模式、Anthropic `input_schema` 或 Gemini `responseSchema`。模型的输出回来时是一个定型的 `Invoice` 实例。校验错误抛出带定型错误路径的 `ValidationError`。

### Zod，TypeScript 绑定

Zod（`z.object({customer: z.string(), ...})`）是 TS 里的对应物。OpenAI 的 Node SDK 暴露 `zodResponseFormat(Invoice)`，它翻译成 API 的 JSON Schema 载荷。

### 拒绝

严格模式没法强迫模型回答。如果输入装不进 schema（"这封邮件是首诗，不是发票"），模型吐出一个 `refusal` 字段，含原因。你的代码必须把它当作一等结果处理，而非失败。拒绝作为安全信号也有用：一个被要求从受保护内容邮件里抽取信用卡号的模型，会返回一个附带安全原因的拒绝。

### 公开的受约束解码

开源权重实现用三种技术。

1. **基于语法的解码**（`outlines`、`guidance`、`lm-format-enforcer`）：从 schema 构建一个确定性有限自动机；每一步把会违反这个 FSM 的 token 的 logit 掩掉。
2. **配 JSON 解析器的 logit 掩码**：让一个流式 JSON 解析器与模型同步运行；每一步算出合法的下一 token 集合。
3. **配验证器的推测解码**：廉价的草稿模型提议 token，验证器强制 schema。

商业 provider 在幕后选其一。2026 年的最新水平，对短结构化输出比纯生成更快，对长输出大致同速。

### 三种失败模式

1. **解析错误。** 输出不是合法 JSON。严格模式下不可能发生。在非严格 provider 上仍会发生。
2. **schema 违反。** 输出能解析但违反 schema。严格模式下不可能发生。在它之外很常见。
3. **拒绝。** 模型拒绝。必须当作定型结果处理。

### 重试策略

当你在严格模式之外（Anthropic 工具调用、非严格 OpenAI、更老的 Gemini）时，恢复模式是：

```
生成 -> 解析 -> 校验 -> 若失败，注入错误并重试，最多 3 次
```

一次重试通常就够。三次重试能兜住弱模型的偶发抽风。超过三次是个 schema 不好的信号：模型对某些输入满足不了它，prompt 或 schema 需要修。

### 小模型支持

受约束解码在小模型上也好使。一个带语法强制的 3B 参数开源模型，在结构化任务上胜过一个用裸 prompt 的 70B 参数模型。这是结构化输出对生产之所以重要的主要原因：它把可靠性和模型大小解耦。

```figure
constrained-decoding
```

## 实际使用

`code/main.py` 用标准库交付一个极简 JSON Schema 2020-12 校验器（types、required、enum、min/max、pattern、items、additionalProperties）。它包一份 `Invoice` schema，让一份假 LLM 输出过一遍校验器，演示解析错误、schema 违反和拒绝三条路径。生产里把假输出换成任意 provider 的真实响应。

要看什么：

- 校验器返回一个带路径和消息的定型 `[ValidationError]` 列表。这正是你想抛进重试 prompt 的形状。
- 拒绝分支不重试。它记录日志并返回一个定型拒绝。阶段 14 · 09 把拒绝当安全信号用。
- `additionalProperties: false` 检查在对抗性测试输入上触发，显示严格模式为何对幻觉字段关上了门。

## 拿去用

本课产出 `outputs/skill-structured-output-designer.md`。给定一个自由文本抽取目标（发票、工单、简历等），这个 skill 产出一份兼容严格模式的 JSON Schema 2020-12，以及一个与之镜像的 Pydantic 模型，定型拒绝和重试处理打好桩。

## 练习

1. 跑 `code/main.py`。加第四个测试用例，其 `total_usd` 是负数。确认校验器以 `minimum` 约束路径拒绝它。

2. 扩展校验器以支持带判别字段的 `oneOf`。常见情况：`line_item` 要么是商品要么是服务，由 `kind` 标记。严格模式在这里有微妙的规则；查 OpenAI 的结构化输出指南。

3. 把同一份 Invoice schema 写成一个 Pydantic BaseModel，把 `model_json_schema()` 输出和你手搓的 schema 比一比。找出 Pydantic 默认设、而手搓版本漏掉的那个字段。

4. 测量拒绝率。构造十个本不该可抽取的输入（一段歌词、一个数学证明、一封空邮件），用严格模式过一遍真实 provider。数拒绝 vs 幻觉输出。这是你做拒绝感知重试的真值。

5. 从头到尾读 OpenAI 的结构化输出指南。找出一个它在严格模式里明确禁止、而纯 JSON Schema 允许的构造。然后设计一个非必需地用上那个被禁构造的 schema，再把它重构成兼容严格模式的。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| JSON Schema 2020-12 | "schema 规范" | 每家现代 provider 都说的 IETF 草案 schema 方言 |
| Strict mode | "保证 schema" | OpenAI 的标志，经由受约束解码强制 schema |
| Constrained decoding | "logit 掩码" | 解码时强制，掩掉非法的下一 token |
| Refusal | "模型拒绝" | 输入装不进 schema 时的定型结果 |
| Parse error | "非法 JSON" | 输出没解析成 JSON；严格模式下不可能 |
| Schema violation | "形状错了" | 解析了但违反 types / required / enum / range |
| `additionalProperties: false` | "不许有额外的" | 禁止未知字段；OpenAI 严格模式中必须 |
| Pydantic BaseModel | "定型输出" | 吐出并校验 JSON Schema 的 Python 类 |
| Zod schema | "TypeScript 输出类型" | 用于 provider 输出校验的 TS 运行时 schema |
| Grammar enforcement | "开源权重受约束解码" | 基于 FSM 的 logit 掩码，如 outlines / guidance 中那样 |

## 延伸阅读

- [OpenAI — Structured outputs](https://platform.openai.com/docs/guides/structured-outputs) — 严格模式、拒绝与 schema 要求
- [OpenAI — Introducing structured outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/) — 2024 年 8 月发布博文，解释解码保证
- [Pydantic AI — Output](https://ai.pydantic.dev/output/) — 序列化到每家 provider 的定型 output_type 绑定
- [JSON Schema — 2020-12 release notes](https://json-schema.org/draft/2020-12/release-notes) — 权威规范
- [Microsoft — Structured outputs in Azure OpenAI](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs) — 企业部署说明与严格模式告诫
