---
id: structured-outputs
title: 结构化输出与约束解码
code: SO
subtitle: 每次获取有效 JSON。速查模式、严格模式、logit 掩码、校验器、重试与输出护栏项目。
hue: 215
sources: phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding, phases/11-llm-engineering/03-structured-outputs, phases/13-tools-and-protocols/04-structured-output, projects/json-schema-output-guard
source_hash: ee9e5e72c828c55a
---

## 输出护栏流水线
type: architecture
from: projects/json-schema-output-guard/solution/main.ts, projects/json-schema-output-guard/README.md

```arch
node | gen | 1,1 | generate | 反馈、尝试次数 | model
node | parse | 2,1 | parseJSON | 100_000 字节上限 | process
node | check | 2,2 | checkSchema | 预检，深度 32 | process
node | val | 3,1 | validate | 带路径的 Issue[] | process
node | ok | 4,1 | 已接受 | 值加轨迹 | client
node | rep | 3,2 | 修复 | maxAttempts 预算 | queue
node | out | 4,2 | 已耗尽 | 轨迹保留每次尝试 | client
edge | gen | parse | 原始字符串
edge | check | val | 模式
edge | parse | val | 值
edge | val | ok | 无问题
edge | val | rep | 问题
edge | rep | gen | Issue[]
edge | rep | out | 预算耗尽
```

## 一步约束解码
type: flow
from: phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/docs/zh.md, phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/code/main.py

1. **模型**：输出覆盖全词表（约 100k token）的 logit 向量。
2. **FSM**：`fsm.valid_tokens(state, tokenizer)` 列出仍可通向接受状态的 token。
3. **掩码**：`mask_logits` 将其余 logit 设为 `float("-inf")`。
4. **采样**：softmax 将全部概率放在有效 token 上，再选一个。
5. **推进**：调用 `fsm.transition(state, tok)`，在 `fsm.is_accept(state)` 时停止。

## 运行输出护栏项目
type: command-table
span: 2
from: projects/json-schema-output-guard/README.md, projects/json-schema-output-guard/stages/04-bounded-repair/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python3 scripts/project_test.py json-schema-output-guard --init <ws>` | 一次性创建工作区，初始代码会失败 |
| `python3 scripts/project_test.py json-schema-output-guard --stage 1 --path <ws> --strict` | 评分一个阶段，范围 1 至 4 |
| `python3 scripts/project_test.py json-schema-output-guard --all --solution --strict` | 评分参考实现 |
| `node cli.ts --schema samples/schema.json --attempts samples/attempts.json --output guard.json --html guard.html` | 记录修复过程，第 1 次尝试在 `$/confidence` 失败 |

## 代码任务
type: task-table
span: 2
from: phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/docs/zh.md, phases/11-llm-engineering/03-structured-outputs/docs/zh.md, phases/13-tools-and-protocols/04-structured-output/code/main.py, projects/json-schema-output-guard/solution/main.ts

| 任务 | 代码 |
|---|---|
| 用 FSM 生成本地 JSON | `generator = outlines.generate.json(model, Review)` |
| 任意提供方的 Pydantic 加重试 | `client = instructor.from_anthropic(Anthropic())` |
| 厂商模式约束 | `client.beta.chat.completions.parse(..., response_format=Product)` |
| 校验字典 | `validate_schema(data, schema)` 返回错误列表 |
| 解析、校验、重试 | `extract_with_retry(text, schema, max_retries=3)` |
| 三分支处理器 | `process_model_output(raw, INVOICE_SCHEMA)` |
| 防护一个原始字符串 | `guard(raw, schema)` 返回 `ok`、`value`、`issues` |
| 有界修复 | `await repair(generate, schema, maxAttempts)` |

## 问答
type: qa
from: phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/docs/zh.md, phases/13-tools-and-protocols/04-structured-output/docs/zh.md, projects/json-schema-output-guard/README.md, projects/json-schema-output-guard/stages/04-bounded-repair/docs/zh.md

- **拒绝应触发重试吗？** 不应。记录并返回有类型的拒绝结果。
- **约束解码更慢吗？** 通常更快，强制 token 可以跳过生成。
- **需要大模型吗？** 不需要。带语法的 3B 模型胜过只用 prompt 的 70B 模型。
- **被接受就证明答案正确吗？** 不，它不能证明事实正确。
- **为何先调用 checkSchema？** 损坏的模式不会消耗提供方预算。

## 提示
type: tips
from: phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/docs/zh.md, phases/11-llm-engineering/03-structured-outputs/docs/zh.md, projects/json-schema-output-guard/README.md, projects/json-schema-output-guard/stages/04-bounded-repair/docs/zh.md

- 本地模型、扁平模式用 Outlines，递归模式用 XGrammar 或 llguidance。
- 自托管服务使用 vLLM 的 `guided_json`、`guided_regex`、`guided_choice`。
- 模型需要从多种模式中选择时，使用工具调用。
- 将结构化 `Issue[]` 而非自由文本反馈给模型。
- 轨迹保留每次尝试，后续成功不能掩盖早先失败。
- 护栏拒绝 `$ref`、format 和组合器。
- 项目命令中的 `<ws>` 是 `learning-artifacts/json-schema-output-guard`。

## 使用 Instructor 的 Pydantic 模式
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/docs/zh.md

```python
class Invoice(BaseModel):
    vendor: str
    total_usd: float = Field(ge=0)       # 数值下界
    line_items: list[str]

client = instructor.from_anthropic(Anthropic())
invoice = client.messages.create(
    model="claude-opus-4-7",
    max_tokens=1024,
    response_model=Invoice,              # 校验失败时重试
    messages=[{"role": "user", "content": "<text>"}],
)
```

## TypeScript 有界修复
type: annotated-code
lang: typescript
from: projects/json-schema-output-guard/solution/main.ts

```typescript
const schema: Schema = {
  type: "object",
  properties: {
    answer: { type: "string", minLength: 1 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["answer", "confidence"],
  additionalProperties: false,         // 未知属性视为问题
};
await repair(async (_, i) => outputs[i - 1], schema)  // 状态与轨迹
```

## 控制层级
type: concepts
from: phases/11-llm-engineering/03-structured-outputs/docs/zh.md, phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/docs/zh.md, phases/13-tools-and-protocols/04-structured-output/docs/zh.md

- **基于 prompt**："Respond in valid JSON"，约 90% 有效，无强制机制。
- **JSON 模式**：保证 JSON 语法有效，不保证模式匹配。
- **模式约束**：输出匹配 JSON Schema，各主要提供方原生支持。
- **约束解码**：屏蔽无效 token，从构造上保证 100% 有效。
- **Instructor**：不修改 logits，负责解析、校验与重试。
- **Outlines**：将模式或正则编译为 FSM，递归需要展平。
- **XGrammar、llguidance**：CFG 引擎，可处理递归模式。
- **严格模式**：全部属性列入 `required`，`additionalProperties: false`，无 `$ref`。

## 默认值与数字
type: defaults
from: phases/11-llm-engineering/03-structured-outputs/docs/zh.md, phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/docs/zh.md, phases/13-tools-and-protocols/04-structured-output/docs/zh.md, projects/json-schema-output-guard/solution/main.ts, projects/json-schema-output-guard/solution/cli.ts

| 设置 | 默认值 | 说明 |
|---|---|---|
| `max_retries` | 3 | 位于 `extract_with_retry` |
| Instructor 重试次数 | 3 | 校验失败时 |
| 重试上限 | 3 次 | 更多重试说明模式可能有问题 |
| `maxAttempts` | 3 | 预算必须为 1..10 |
| 深度上限 | 32 | `checkSchema` 与 `validate` |
| 输出大小上限 | 100_000 | 字节，在 `JSON.parse` 前检查 |
| CLI 退出码 | 2 | 结果被拒或尝试耗尽 |
| 仅用 prompt 的 JSON | 85 至 95% | 前沿模型成功率 |

## 常见问题排查
type: troubleshooting
from: phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/docs/zh.md, phases/11-llm-engineering/03-structured-outputs/docs/zh.md, phases/13-tools-and-protocols/04-structured-output/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| JSON 有效，答案错误 | `answer` 位于 `reasoning` 之前 | 将推理字段放在前面 |
| 模型编造日期 | 语法过严 | 允许 `null` 或哨兵值 |
| 10,000 选项枚举超时 | 枚举过大 | 检索 top-k，仅约束到这些值 |
| Outlines 树形输出失败 | FSM 将递归展平 | 使用 XGrammar 或 llguidance |
| JSON 有效，形状错误 | JSON 模式没有模式约束 | 始终发送完整模式 |
| API 返回 400 | 违反严格模式规则 | 修正 `required`、额外属性和 `$ref` |
| 类型正确，值是编造的 | 值幻觉 | 模式无法捕获，需检查具体值 |
| 可选字段被省略 | 字段未列为必需 | 改为必需，同时允许 `null` |

## 缩写
type: glossary
from: phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/docs/zh.md, phases/13-tools-and-protocols/04-structured-output/docs/zh.md, projects/json-schema-output-guard/solution/main.ts

- **FSM**：有限状态机，有效下一 token 的查找复杂度为 $O(1)$。
- **CFG**：上下文无关文法，可处理递归。
- **Logit 处理器**：`(logits, state) -> masked_logits`。
- **引导解码**：推理服务器中的同类机制。
- **拒绝**：输入无法满足模式时的有类型结果。
- **解析错误**：输出不是 JSON，严格模式下不会出现。
- **模式违规**：输出可解析，但违反模式。
- **Issue**：护栏项目中的 `{ path: string; message: string }`。
