# 工具接口——为什么 agent 需要结构化 I/O

> 语言模型产出 token。程序执行动作。这两者之间的鸿沟就是工具接口：一份让模型能请求动作、让宿主能执行动作的契约。2026 年的每一套技术栈——OpenAI、Anthropic、Gemini 上的 function calling；MCP 的 `tools/call`；A2A 的 task part——都是同一个四步循环的不同编码。本课给这个循环起个名字，并展示跑通它所需的最小机制。

**类型：** Learn
**语言：** Python（标准库，不调 LLM）
**前置要求：** 阶段 11（LLM 补全 API）
**预计时间：** ~45 分钟

## 学习目标

- 解释为什么一个只会生成文本的 LLM，单凭自己无法对真实世界采取行动。
- 画出四步工具调用循环（describe → decide → execute → observe），并说清每一步归谁负责。
- 把一个工具描述写成三部分：名字、JSON Schema 输入、一个确定性的执行函数。
- 区分纯工具和有副作用的工具，并说明为什么这个划分对安全很重要。

## 问题背景

LLM 吐出的是下一个 token 的概率分布。这就是它输出的全部表面。如果你问一个聊天模型"班加罗尔现在天气怎么样"，它能写出一句看似合理的话，但它没法接进天气 API。那句话可能碰巧对，也可能是三天前的陈旧数据。

弥合这道鸿沟，正是工具接口的目的。宿主程序——你的 agent 运行时、Claude Desktop、ChatGPT、Cursor，或一段自定义脚本——向模型广播一份可调用工具的清单。当模型判断需要采取行动时，它吐出一个结构化的载荷，指明工具名和参数。宿主解析这个载荷，真正去执行工具，再把结果喂回去。循环持续到模型判断不再需要调用为止。

这份契约的第一个版本于 2023 年 6 月随 OpenAI 的 "functions" 参数发布。Anthropic 紧随其后，在 Claude 2.1 里引入了 `tool_use` block。Gemini 几个月后加上了 `functionDeclarations`。如今每家 provider 都暴露相同的形状：输入是一份用 JSON Schema 定型的工具清单，输出是一个 JSON 载荷的工具调用。Model Context Protocol（2024 年 11 月）把这份契约一般化，让一个工具注册表能服务所有模型。A2A（2026 年 4 月，v1.0）在同一基元之上又叠了一层，用于 agent 之间的委派。

四步循环是这一切底下的不变量。阶段 13 里其余的全部内容，都只是它的细化。

## 核心概念

### 第一步：describe

宿主用三个字段声明每个工具。

- **Name。** 一个稳定、机器可读的标识符。是 `get_weather`，不是"天气那玩意儿"。
- **Description。** 一段自然语言简介。"当用户问某个具体城市的当前天气时使用。不要用于历史数据。"
- **Input schema。** 一个 JSON Schema 对象（draft 2020-12），描述工具的参数。

模型收到这份清单。现代 provider 会用各自特定的模板把这些声明序列化进 system prompt，所以你作为调用方只需打交道于结构化形式。

### 第二步：decide

给定用户消息和可用工具，模型从三种行为里选一个。

1. **直接用文本回答。** 不调用工具。
2. **调用一个或多个工具。** 吐出结构化的调用对象。在 `parallel_tool_calls: true` 下（OpenAI 和 Gemini 默认开启，Anthropic 需手动开启），模型可以在一轮里吐出多个调用。
3. **拒绝。** 严格模式的结构化输出可以产出一个定型的 `refusal` block，而不是调用。

一个工具调用载荷有三个稳定字段：调用 `id`、工具 `name`、一个 JSON `arguments` 对象。id 存在的意义在于让宿主能把后来的结果和具体那次调用对应起来——当并行调用乱序返回时，这一点很关键。

### 第三步：execute

宿主收到调用，按声明的 schema 校验参数，然后运行执行器。参数非法意味着模型幻觉出了一个字段，或用错了类型——这在弱模型上是非常常见的失败模式。生产环境的宿主在参数非法时会做三件事之一：快速失败并把错误抛回给模型、用受约束的解析器修复 JSON，或带着校验错误重试模型。

执行器本身就是普通代码。Python、TypeScript、一条 shell 命令、一次数据库查询。它产出一个结果，通常是字符串，但也可以是任意 JSON 值，或一个结构化内容 block（在 MCP 里是 text、image 或 resource 引用）。结果必须是可序列化的。

### 第四步：observe

宿主把工具结果追加进对话（作为一条 `tool` 角色的消息，带匹配的 `id`），再次调用模型。模型现在上下文里有了工具输出，可以产出最终答案，或请求更多调用。这个过程持续到模型停止吐出调用，或宿主撞上迭代次数的安全上限。

### 信任划分

工具分两种，这个区分对安全很重要。

- **纯工具（Pure）。** 只读、确定性、无副作用。`get_weather`、`search_docs`、`get_current_time`。可以放心地推测性调用。
- **有后果的工具（Consequential）。** 改变状态、花钱、碰用户数据。`send_email`、`delete_file`、`execute_trade`。必须设门槛。

Meta 在 2026 年提出的 agent 安全 "Rule of Two"（二选二规则）说：单独一轮里，以下三者最多只能组合其中两个——不可信输入、敏感数据、有后果的动作。工具接口正是你强制执行这条规则的地方——靠拒绝调用、要求用户确认，或提升权限范围。完整的安全章节见阶段 13 · 15，agent 层面的权限策略见阶段 14 · 09。

### 循环在哪里发生

| 场景 | 谁来 describe | 谁来 decide | 谁来 execute |
|---------|---------------|-------------|--------------|
| 单轮 function calling（OpenAI/Anthropic/Gemini） | 应用开发者 | LLM | 应用开发者 |
| MCP | MCP server | 经由 MCP client 的 LLM | MCP server |
| A2A | Agent Card 发布方 | 调用方 agent | 被调用方 agent |
| Web 浏览器（function-calling agent） | 浏览器扩展 / WebMCP | LLM | 浏览器运行时 |

到处都是同样的四步。列名在变，结构没变。

### 为什么不干脆 prompt 模型吐 JSON 就行？

"让模型用 JSON 回复"是 function calling 之前的做法。在前沿模型上它有大约 5% 到 15% 的概率失败，在更小的模型上失败率高得多。失败模式包括缺花括号、多余逗号、幻觉字段、类型错误。然后你还得加一道 JSON 修复、一次重试，或一个受约束的解码器。

原生 function calling 更好，有三个原因。第一，provider 端到端地用确切的调用形状训练模型，所以严格模式下合法 JSON 的比例升到 98% 到 99%。第二，调用载荷待在它自己的协议槽位里，而不在自由文本中——所以工具调用永远不会泄进用户可见的回复里。第三，provider 用受约束解码强制 schema 合规（OpenAI 的 strict mode、Anthropic 的 `tool_use`、Gemini 的 `responseSchema`）。输出保证能通过校验。

阶段 13 · 02 把三家 provider 的 API 并排走一遍。阶段 13 · 04 深入讲结构化输出。

### 断路器

循环会在模型停止吐出调用、或宿主撞上最大轮数时终止。生产环境的宿主把这个值设在 5 到 20 轮之间。超过这个数，你几乎肯定陷进了一个模型出不来的循环。Claude Code 默认 20；OpenAI Assistants 是 10；Cursor 的 agent 模式是 25。

另一种做法——无界循环——每隔半年就以"agent 一夜之间烧掉 400 美元 API 调用"的复盘形式冒出来一次。没有设上限别上线。

阶段 14 · 12 深入讲错误恢复和自愈；阶段 17 讲生产环境的限流。

### 阶段 13 接下来走向何处

- 第 02 到 05 课打磨 provider 层面的工具调用表面。
- 第 06 到 14 课把这个循环一般化为 MCP。
- 第 15 到 18 课为这个循环抵御恶意 server、对抗性用户，以及未认证的远程鉴权表面。
- 第 19 到 22 课把这套模式扩展到 agent 间协作、可观测性、路由和打包。
- 第 23 课用上每一个基元，交付一套完整的生态。

剩下的每一课都是这个四步循环的细化。把它当作不变量记在心里。

```figure
tp-tool-loop
```

## 实际使用

`code/main.py` 不调 LLM 就跑通这个四步循环。一个假的 "decider" 函数靠对用户消息做模式匹配来模拟模型；而执行器、schema 校验器、observe 步骤的脚手架都是真的。跑一跑，看完整的请求/响应编排，中间状态可打印；之后某一课里再把假 decider 换成任意一家真实 provider。

要看什么：

- 工具注册表每个工具存四个字段：name、description、schema，以及一个执行器引用。
- 校验器是用纯标准库写的一个极简 JSON Schema 子集（types、required、enum、min/max）。阶段 13 · 04 交付一个更完整的。
- 循环把迭代次数的上限定在 5。生产环境的 agent 正需要这种断路器。

## 拿去用

本课产出 `outputs/skill-tool-interface-reviewer.md`。给定一份工具定义草稿（name + description + schema + 执行器轮廓），这个 skill 会审计它是否适配循环：name 是否机器稳定、description 是否是一份完整的使用简介、schema 是否正确用了 JSON Schema 2020-12、纯工具 vs 有后果的工具的分类是否明确。

## 练习

1. 给 `code/main.py` 加上第四个工具，叫 `get_stock_price(ticker)`。把它的 description 写成"当用户用股票代码问当前股价时使用。不要用于历史价格或市场综述。"跑一遍脚手架，确认假 decider 会把提到股票代码的查询路由到这个新工具。

2. 弄坏 schema 校验器。传一个 `arguments` 对象缺了必填字段的调用，确认宿主在执行前就拒绝它。然后传一个带多余未知字段的调用。做决定：宿主该拒绝还是忽略？用一条安全论证来证明你的选择。

3. 把脚手架里的每个工具分类为纯工具或有后果的工具。给需要的注册表条目加上 `consequential: true` 标志，并改造循环，在每次选中有后果的工具时打印一行"将向用户确认"。这就是每个生产宿主都需要的确认门槛的形状。

4. 拿纸画出四步循环，并把上面那张 provider 列表按你最喜欢的客户端（Claude Desktop、Cursor、ChatGPT，或一套自定义栈）填好。和阶段 13 · 06 里 MCP 特定的变体交叉对照。

5. 从头到尾读一遍 OpenAI 的 function calling 指南。找出那个待在请求里、却不在本文这套四步循环里的字段。解释它带来了什么，以及它为什么是方便而非必需的。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Tool | "模型能调的一个东西" | name + JSON Schema 定型的输入 + 执行函数 三件套 |
| Function calling | "原生工具调用" | provider 层面的 API 支持，能吐出结构化工具调用而非散文 |
| Tool call | "模型发出的行动请求" | 模型吐出的一个带 `id`、`name`、`arguments` 的 JSON 载荷 |
| Tool result | "工具返回了什么" | 执行器的输出，包在一条带匹配 id 的 `tool` 角色消息里 |
| Parallel tool calls | "一次多个调用" | 一轮模型输出里的多个调用对象，相互独立，可按 id 排序 |
| Strict mode | "保证是 JSON" | 受约束解码，强制模型输出能通过声明 schema 的校验 |
| Pure tool | "只读工具" | 无副作用；可安全地重跑 |
| Consequential tool | "动作工具" | 改变外部状态；需要门槛、审计或用户确认 |
| Four-step loop | "工具调用周期" | describe → decide → execute → observe |
| Host | "agent 运行时" | 持有工具注册表、调用模型、运行执行器的那个程序 |

## 延伸阅读

- [OpenAI — Function calling guide](https://platform.openai.com/docs/guides/function-calling) — OpenAI 风格工具声明与调用形状的权威参考
- [Anthropic — Tool use overview](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview) — Claude 的 `tool_use` / `tool_result` block 格式
- [Google — Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling) — Gemini 里的 `functionDeclarations` 与并行调用语义
- [Model Context Protocol — Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) — 工具接口的 provider 无关一般化
- [JSON Schema — 2020-12 release notes](https://json-schema.org/draft/2020-12/release-notes) — 每个现代工具 API 都在说的 schema 方言
