# 模型交互流程

> 工具调用不是 wire 上的一条消息，而是 host 在用户、模型和服务器之间运行的循环。循环中的每一轮，都决定模型下一步能看到什么。

**类型：** Reference
**语言：** Python
**前置要求：** 第 09 课
**预计时间：** 约 45 分钟

## 学习目标

- 追踪完整路径：从用户请求、host 构建模型上下文、选择工具、经过确认门、发出 `tools/call`、服务器执行，一直到结果返回模型
- 准确说明模型每一轮能看到什么：调用前是工具名称、描述和 schema，调用后是 content 或 `isError` 标志
- 使用清单阅读课程中的注解默认值，在破坏性调用抵达 wire 前，通过确认门向人类展示工具拟定的输入
- 解释确定性工具排序为何同时保护客户端自身缓存和模型提供商的 prompt cache
- 根据循环下一步的变化，区分 `input_required` 中断、工具执行错误和协议错误

## 问题背景

前几课讨论了服务器交给客户端的文档：discover 结果、工具列表，以及值得带着怀疑审读的清单。但这些都没有解释用户输入请求的瞬间到底发生什么。`tools/list` 里的工具定义本身不会动，必须有某种机制把它转化为决策、wire 调用和答案。这个机制是 host 运行的循环，不是单个请求。跳过这套循环，你仍能回答消息形态相关的问题，却会错过行为问题：客户端会不会重试格式错误的调用？发送破坏性操作前，会不会先展示给人类？每轮重排工具数组，是否会悄悄破坏模型提供商依赖的缓存？

这套循环中有两类错误，考试都会考。第一类是协议错误：把原始 JSON-RPC error 直接塞回模型，并期待模型自行修复；或者忘了 `input_required` 后的重试需要新 id，并逐字节原样回显 `requestState`。第二类是完全不触及 wire 的 host 设计错误：跳过确认提示、敏感调用前不向用户展示工具拟定的参数，或每轮都打乱工具列表。客户端可以在 wire 上完全符合规范，却仍把循环做错，因为其中一半属于规范只作建议的 host 策略。

## 核心概念

回忆 host、client 和 server 课程中的分工：host 为每个服务器运行一个 client，并负责与模型的对话；client 只是把决策转成请求的薄层。本课追踪的循环分为五个阶段，逐步交接。

第一，host 构建模型上下文。它已经持有缓存的 `tools/list` 结果（来自发现课程），会把每个条目转成模型实际看到的内容：`name`、`description`、`inputSchema`，以及服务器提供时的 `annotations`。工具实现细节不会跨过这道边界。模型看不到服务器代码、凭据或清单的注册表元数据，只能看到审查者在清单课程里读取的那些字段。

第二，本实验用一个小型确定性函数代替 LLM。它读取上下文和用户请求，拟定工具名称与参数。此时还没有任何 wire message，只是 host 内部的决策。

第三，在 client 发送任何内容前，host 先运行确认门。规范要求人类应能拒绝调用，client 应在调用前展示工具输入。确认门是否触发，由清单课程讲过的注解默认值决定：`readOnlyHint` 默认为 false，`destructiveHint` 默认为 true。因此，完全没有 `annotations` 块的工具默认具有破坏性，必须得到同意后才能继续。如果确认门拒绝，循环当场结束。client 根本不会构造 `tools/call`，所以被拒绝的操作不会在 wire 上留下痕迹，只会由 host 在自身状态中记一笔。

第四，获批调用会成为普通的 `tools/call`，并像本课程的其他请求一样，在 `params._meta` 中携带协议版本和能力。服务器可能用三种方式回答，每种结果会把循环导向不同分支。

```json
{"jsonrpc": "2.0", "id": 5, "result": {"resultType": "input_required", "inputRequests": {"priority": {"method": "elicitation/create", "params": {"mode": "form", "message": "What priority should this ticket have?", "requestedSchema": {"type": "object", "properties": {"priority": {"type": "string"}}, "required": ["priority"]}}}}, "requestState": "eyJ0aXRsZSI6IlZQTiBkcm9wcyJ9"}}
```

`resultType` 为 `complete` 且 `isError` 为 false，是最简单的路径：模型读取 `content`；如果工具定义了 `outputSchema`，还会读取 `structuredContent`；host 随即把这些内容直接纳入答案。`complete` 结果中 `isError` 为 true 表示工具执行错误，也就是集成问题课程讲过的双错误通道在循环中的应用：模型读取解释后，可以使用新 id 和修正过的参数重试。这里不涉及 `inputResponses`，因为这只是另一次普通调用，不是 multi round trip 模式。`input_required` 则是该模式（简报第 7 节）：服务器需要自己没有的信息，并通过 `elicitation/create`、`sampling/createMessage` 或 `roots/list` 获取。host 必须收集答案，然后用新的 JSON-RPC id 重试同一次调用；`inputResponses` 的键要和服务器命名一致；`requestState` 必须逐字节原样回显。client 永远不能打开并读取该字符串。最后，`-32602` 未知工具之类的 JSON-RPC error 属于协议错误，循环不应原样重试：请求没有变化，结果自然也不会变化。

第五，当 host 拿到 `complete` 结果，或判定某个分支不受支持后，会把 content 放回模型的持续上下文。模型据此生成答案，而且答案应引用工具实际返回的内容，而不是独立猜测。

还有一项性质贯穿循环的每一轮：只要底层工具集合没有变化，`tools/list` 每次都应按相同顺序返回。这不是外观问题。host 通常只构建一次模型上下文数组，并在多轮对话中复用；大多数模型提供商会缓存该数组所在的 prompt 前缀。重排数组——哪怕只是把新发现的工具插到中间而非追加到末尾——都会让缓存失效，额外消耗的 token 甚至可能超过工具定义本身。确定性排序既让客户端可以信任自己的缓存，也让模型提供商的缓存持续命中。

```figure
mcpa-10-interaction-flow
```

## 交互实验

图中追踪一条请求经过全部五个阶段。沿顶行观察：用户提出请求，host 构建上下文，模型选择工具，然后进入确认门。确认门有两条出口：批准的调用继续向右抵达服务器；拒绝的调用直接落入下方虚线框，被暂存且永不发送。服务器下方分出三种结果：complete 结果向下进入答案；工具执行错误和 `input_required` 结果都会向上绕回模型，虚线表示它们属于重试，而非向前推进。图中两条重试路径看起来相似，机制却不同：只有其中一条会携带新 id 和回显的 `requestState`。

## 实践实验

打开 `code/main.py`，在课程目录运行：

```bash
python3 code/main.py
```

transcript 会打印九组请求与响应。先读前两个 `get_forecast` 调用：模型拟定了空参数，服务器用 `isError: true` 回答并指出缺少字段；随后模型才从用户原句中取出已有的城市，用新 id 再次调用。接着读两个 `open_ticket` 调用：第一次已经提供有效 `title`，却仍返回 `input_required`，因为该服务器始终要求人类确认优先级，而不是让模型猜测；重试时携带 `inputResponses`，并把服务器交付的 `requestState` 字符串原样带回，既不读取也不修改。然后查看输出中的确认门部分：`close_ticket` 完全没有 `annotations` 块，所以 host 依照规范默认值将其视为破坏性工具，在发送前把两次拟定调用都展示给人类。其中一个工单获批并抵达 wire；另一个低优先级工单需要第二位审查者，因此被拒绝，根本没有变成 `tools/call`。最后，模型尝试服务器未公开的 `archive_ticket` 工具，收到 `-32602` 后没有原样重试。底部最终答案引用了成功调用的真实 content，没有凭空编造摘要。修改 `choose_priority` 或 `approve_close` 后重新运行，可以观察同一循环走上不同路径。

## 交付产物

`outputs/interaction-flow-trace.md` 是一页式流程与决策表：模型调用前后分别看到什么、`tools/call` 结果通过哪三种方式路由循环，以及如何构建能在调用前展示输入、且绝不原样重试协议错误的 host 循环。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课的结论：`tools/list` 每次都以相同的确定性顺序返回工具定义；session 中的每个请求都在 `_meta` 中携带协议版本和能力；缺少 `_meta` 的请求会以 `-32602` 被拒绝；没有 `annotations` 块的工具默认具有破坏性并需要确认，而明确只读或非破坏性的工具不需要；确认门会阻止被拒绝的 `close_ticket` 调用进入 wire，同时允许获批调用送达；`get_forecast` 工具执行错误会反馈给模型，修正后的调用用新 id 成功；`open_ticket` 的 `input_required` 结果会中断循环，直到获得回答；重试会用新 id 并原样回显 `requestState`；`archive_ticket` 协议错误绝不会被原样重试；最终答案引用真实结果 content。仓库的 wire 检查器还会按 2026-07-28 规则验证本课 transcript：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/10-model-interaction-flow
```

## 综合项目关联

综合项目的端到端交换，就是把这套循环真正跑起来：构建上下文、让模型选择、敏感内容发出前先确认、读取三种结果之一，再依据工具实际返回内容回答。综合项目追问某次调用为何从未发送，或某次重试为何使用新 id 时，答案来自本课，而不只是 wire 规则。

## 关键术语

| 术语 | 含义 |
|------|---------|
| Model context | 每个工具的 name、description、inputSchema 和 annotations，也就是模型选择工具前实际看到的内容 |
| Confirmation gate | 位于 host 侧、永不上 wire 的检查，在敏感调用发送前向人类展示拟定输入 |
| Tool execution error | `isError` 为 true 的 complete 结果；模型读取后可使用修正参数和新 id 重试 |
| input_required | MRTR 中断；host 收集缺失输入后，用新 id 和原样回显的 requestState 重试 |
| Protocol error | `-32602` 之类的 JSON-RPC error；循环不应原样重试请求 |
| Deterministic ordering | `tools/list` 每次按相同顺序返回，保护客户端缓存和模型提供商的 prompt cache |
| requestState | MRTR 重试时由客户端原样回显、不得读取或修改的不透明字符串 |
| Annotation defaults | 工具没有 annotations 时，`readOnlyHint` 为 false、`destructiveHint` 为 true；确认门据此判断 |

## 延伸阅读

- [MCP 2026-07-28 规范：工具、消息流与用户交互模型](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP 2026-07-28 规范：多轮请求](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [MCP 架构概览](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)
- [MCP 客户端最佳实践：与 prompt 缓存协作](https://modelcontextprotocol.io/docs/2026-07-28/develop/clients/client-best-practices)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 5、7、10 节
- `phases/13-tools-and-protocols/02-function-calling-deep-dive`：深入学习工具调用循环中的模型侧逻辑
