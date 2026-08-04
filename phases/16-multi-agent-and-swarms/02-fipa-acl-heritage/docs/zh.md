# FIPA-ACL 与言语行为理论的遗产

> 在 MCP 之前、在 A2A 之前，先有了 FIPA-ACL。2000 年，IEEE 的智能物理 agent 基金会（Foundation for Intelligent Physical Agents）批准了一套 agent 通信语言，带二十个 performative、两种内容语言，以及一套交互协议——contract net、subscribe/notify、request-when。它在工业界淡出，是因为本体（ontology）开销对当时的 web 太重，但 LLM 带来的多 agent 系统复兴正在悄悄重新实现同一批想法，只是丢掉了形式语义：JSON 契约顶替了 performative，自然语言顶替了本体。本课认真读一遍 FIPA-ACL，好让你看清 2026 年的哪些协议决策是旧瓶装新酒、哪些是真创新，以及当前这波浪潮会在哪些地方重新踩中 2000 年代早已解决的坑。

**类型：** Learn
**语言：** Python（标准库）
**前置要求：** Phase 16 · 01（为什么要用多 agent）
**预计时间：** ~60 分钟

## 问题背景

2026 年的 agent 协议版图很热闹：MCP 管工具、A2A 管 agent、ACP 管企业审计、ANP 管去中心化信任、NLIP 管自然语言内容，再加 CA-MCP 和二十多个研究提案。每个规范都自称是奠基性的。

老实说，它们多数都在重新发现一棵非常具体的、二十年前就画好的决策树。Austin（1962）和 Searle（1969）的言语行为理论给了我们「话语即行动」。KQML（1993）把它变成了一套线协议。FIPA-ACL（2000 年批准）拿出了参考标准化方案：二十个 performative、内容语言 SL0/SL1、用于 contract-net 和 subscribe-notify 的交互协议。JADE 和 JACK 是 Java 参考平台。这套东西在 2010 年前后淡出，因为本体开销太重，而 web 正在赢。

当你看 MCP 的 `tools/call`、A2A 的任务生命周期、或 CA-MCP 的共享上下文存储时，你看到的是一份更柔和、JSON 原生的 FIPA 决策翻版。了解这段渊源能告诉你两件事：哪些新「创新」其实是重新发明，以及新规范会重新踩中哪些旧的故障模式。

## 核心概念

### 一段话讲清言语行为

Austin 注意到，有些句子并不描述世界——它们改变世界。「我承诺。」「我请求。」「我宣布。」他把这些叫作施为话语（performative utterance）。Searle 把它形式化成五类：断言型、指令型、承诺型、表达型、宣告型。KQML（Finin 等，1993）把这套东西落地到软件 agent 上：一条消息 = 一个 performative（行动）加内容（行动针对什么）。FIPA-ACL 补齐了 KQML 的缺口，围绕二十个 performative 做了标准化。

### FIPA 的二十个 performative（部分列举）

| Performative | 意图 |
|---|---|
| `inform` | 「我告诉你 P 为真」 |
| `request` | 「我请你做 X」 |
| `query-if` | 「P 为真吗？」 |
| `query-ref` | 「X 的值是多少？」 |
| `propose` | 「我提议我们做 X」 |
| `accept-proposal` | 「我接受这个提议」 |
| `reject-proposal` | 「我拒绝这个提议」 |
| `agree` | 「我同意做 X」 |
| `refuse` | 「我拒绝做 X」 |
| `confirm` | 「我确认 P 为真」 |
| `disconfirm` | 「我否认 P」 |
| `not-understood` | 「你的消息没解析成功」 |
| `cfp` | 「就 X 征集提案」 |
| `subscribe` | 「X 变化时通知我」 |
| `cancel` | 「取消进行中的 X」 |
| `failure` | 「我试了 X，失败了」 |

完整清单在 `fipa00037.pdf`（FIPA ACL Message Structure）里。重点不是把它背下来——重点是这里每一个都对应着某个 LLM 协议最终会重新加回去的原语。

### 标准的 FIPA-ACL 消息

```
(inform
  :sender       agent1@platform
  :receiver     agent2@platform
  :content      "((price IBM 83))"
  :language     SL0
  :ontology     finance
  :protocol     fipa-request
  :conversation-id   conv-42
  :reply-with   msg-17
)
```

七个字段承载协议信封，一个字段（`content`）承载载荷。其余字段，恰恰就是你每次往 JSON 协议上硬塞重试、消息线程、本体时重新发明的那些东西。

### 两个遗留平台

**JADE**（Java Agent DEvelopment framework，1999–2020 年代）是用得最多的 FIPA 兼容运行时。agent 继承一个基类、交换 ACL 消息、在容器里运行、用「behavior」来协调。它附带的交互协议库里有 contract-net、subscribe-notify、request-when 和 propose-accept。

**JACK**（Agent Oriented Software 公司，商业产品）强调在 FIPA 消息之上做 BDI（Belief-Desire-Intention，信念-愿望-意图）推理。更形式化，采用率更低。

两者都在 web 技术栈吞掉多 agent 用例后衰落了。MCP 和 A2A 就是 2026 年的运行时「容器」。

### FIPA 为何淡出

- **本体开销。** FIPA 需要一份共享本体才能解析 `content`。在本体上达成一致是一个长达数年的标准化过程。而 web 直接用了 HTTP + JSON。
- **没人用的形式语义。** SL（Semantic Language，语义语言）给出了严格的真值条件，但大多数生产系统用的是自由格式内容，干脆无视那套形式主义。
- **工具锁定。** JADE 只支持 Java，JACK 是商业产品。多语言团队绕开了这两个。
- **互联网赢了整个技术栈。** REST、然后是 JSON-RPC、然后是 gRPC，替掉了 ACL 的传输层。

### LLM 复兴就是 FIPA 的简化版

拿一个 FIPA `request` 和一个 MCP `tools/call` 对比：

```
(request                                {
  :sender  agent1                         "jsonrpc": "2.0",
  :receiver tool-server                   "method":  "tools/call",
  :content "(lookup stock IBM)"           "params":  {"name":"lookup_stock",
  :ontology finance                                   "arguments":{"symbol":"IBM"}},
  :conversation-id c42                    "id": 42
)                                        }
```

信封相同，语法不同。两者都承载：谁、发给谁、意图、载荷、关联 id。谁也没比谁更革命——它们只是同一套设计上的不同取舍。

Liu 等人 2025 年的综述（《A Survey of Agent Interoperability Protocols: MCP, ACP, A2A, ANP》，arXiv:2505.02279）把这条血脉说得很明白：MCP 对应工具调用类言语行为，A2A 对应 agent 对等类言语行为，ACP 对应审计追踪类言语行为，ANP 对应去中心化身份扩展。新规范都是带 JSON 语法、语义更松的 ACL 后裔。

### 把这个取舍说白了

**FIPA 给了你、而现代规范丢掉的：**

- 形式语义——你能证明 `inform` 蕴含「发送方相信该内容」。
- 一份标准的 performative 目录——你不必反复争论「我们要不要加个 `cancel`？」。
- 几十年的交互协议模式——contract-net、subscribe-notify、propose-accept——都带有已知的正确性属性。

**现代规范给了你、而 FIPA 没有的：**

- 与每种现代工具兼容的 JSON 原生载荷。
- LLM 无需手写本体就能解读的自然语言内容。
- web 技术栈传输（HTTP、SSE、WebSocket）。
- 通过自描述文档实现的能力发现（MCP `listTools`、A2A Agent Card）。

用更松的意图语义换更容易的实现。这就是那笔交易。

### 值得移植的交互协议

FIPA 附带了约 15 个交互协议。其中三个值得带进 LLM 多 agent 系统：

1. **合同网协议（Contract Net Protocol，CNP）。** manager 发出 `cfp`（征集提案）；竞标者用 `propose` 回应；manager 接受/拒绝。这是标准的任务市场模式（Phase 16 · 16 谈判）。
2. **Subscribe/Notify。** 订阅方发 `subscribe`；发布方在主题变化时发 `inform`。这就是 2026 年的每一条事件总线。
3. **Request-When。** 「当条件 Y 成立时做 X。」带前置条件的延迟动作。它在 2026 年的对应物是持久化工作流引擎里的延迟任务（Phase 16 · 22 生产环境扩展）。

每一个都能干净地映射到现代消息队列、HTTP + 轮询、或 SSE 流式推送上。

### 丢掉本体后会崩什么

没有共享本体时，agent 从自然语言内容里推断含义。2026 年记录在案的故障模式是**语义漂移（semantic drift）**：两个 agent 用同一个词（`"customer"`）指代略有差别的概念，接收方 agent 按错误的解读行动，没有任何 schema 校验器能捕到它。FIPA 的本体要求本会在解析阶段就拒掉这条消息。

不上完整本体的缓解手段：

- 给 `content` 加 JSON Schema——在线协议层拒掉结构错误。
- 类型化产物（A2A）——拒掉错误的模态。
- 信封里写明确的 performative——即使内容是自然语言，意图也无歧义。

### 把 2026 年的规范映射到言语行为遗产

| 现代规范 | FIPA 对应物 | 它保留了什么 | 它丢掉了什么 |
|---|---|---|---|
| MCP `tools/call` | `request` | 显式意图、关联 id | 形式语义、本体 |
| MCP `resources/read` | `query-ref` | 显式意图、关联 id | 形式语义 |
| A2A 任务生命周期 | contract-net + request-when | 异步生命周期、状态转移 | 形式完备性保证 |
| A2A 流式事件 | subscribe/notify | 异步推送 | 带类型谓词的订阅 |
| CA-MCP 共享上下文 | 黑板（Hayes-Roth 1985） | 多写者共享内存 | 逻辑一致性模型 |
| NLIP | 自然语言内容 | LLM 原生 | schema |

从上往下读这张表，规律就是：保留结构原语、丢掉形式主义、让 LLM 把歧义糊弄过去。

```figure
sw-contract-net
```

## 动手构建

`code/main.py` 用纯标准库实现了一个 FIPA-ACL 转换器。它编码和解码标准的 ACL 信封，并展示每一种 MCP / A2A 消息形态如何归约到同样的七个字段。这个演示会：

- 把五条 MCP 风格和 A2A 风格的消息编码成 FIPA-ACL。
- 把 FIPA-ACL 解码回现代等价形式。
- 用 `cfp`、`propose`、`accept-proposal`、`reject-proposal` 在一个 manager 和三个竞标者之间跑一轮玩具版合同网谈判。

运行：

```
python3 code/main.py
```

输出是一段并排的追踪记录，把每条现代消息同时以 2026 年的 JSON 形态和 FIPA-ACL 形态展示，再跑一遍合同网竞标的往返编解码。同样的协议原语在往返中幸存下来，变的只有语法。

## 实际使用

`outputs/skill-fipa-mapper.md` 是一个 skill，它读取任意一份 agent 协议规范，产出对应的 FIPA-ACL 映射。在采用一个新协议之前用它来回答：「这是真的新东西，还是带 JSON 语法的 `inform`？」

## 拿去用

别把 FIPA-ACL 请回来。把它的检查清单请回来：

- 每条消息的意图原语（performative）是什么？
- 有没有用于请求-响应和取消的关联 id？
- 有没有明确的内容语言（JSON-RPC、纯文本、结构化类型产物）？
- 交互协议是不是一等公民，还是你又在从头重新实现 contract-net？
- 两个 agent 对内容含义产生分歧时（语义漂移）会怎样？

在把任何新协议推上生产之前，先把这五个问题写进文档。

## 练习

1. 跑 `code/main.py`。观察往返编解码。指出 `tools/call`、`resources/read` 和 A2A 任务创建分别对应哪个 FIPA performative。
2. 给合同网演示加一个 `cancel` performative，让 manager 能在竞标进行到一半时撤回任务。`cancel` 解决了一个单靠重试解决不了的什么故障场景？
3. 读 FIPA ACL Message Structure（http://www.fipa.org/specs/fipa00037/）第 4.1–4.3 节。挑一个本课没覆盖的 performative，描述它的现代 JSON-RPC 对应物。
4. 读 Liu 等人，arXiv:2505.02279。针对 MCP、A2A、ACP、ANP 各自，列出它们保留和丢掉的 FIPA performative 家族。
5. 为你自己系统里 `request` performative 的 `content` 字段设计一份最小 JSON-Schema。这份 schema 给了你纯自然语言给不了的什么东西，又付出了什么代价？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| Speech act | 「一句会做事的话」 | Austin/Searle：话语即行动。ACL 的理论祖宗。 |
| FIPA | 「那个老旧的 XML 玩意儿」 | IEEE 智能物理 agent 基金会。2000 年标准化了 ACL。 |
| ACL | 「Agent 通信语言」 | FIPA 的信封格式：performative + content + 元数据。 |
| Performative | 「那个动词」 | 一条消息的意图类别：`inform`、`request`、`propose`、`cfp` 等。 |
| KQML | 「FIPA 的前身」 | Knowledge Query and Manipulation Language（1993）。更简单、更窄。 |
| Ontology | 「共享词汇表」 | 对内容语言所谈概念的形式化定义。 |
| SL0 / SL1 | 「FIPA 内容语言」 | Semantic Language 的 0 级和 1 级——形式化内容语言家族。 |
| Contract Net | 「任务市场」 | manager 发 cfp；竞标者 propose；manager 接受。标准的交互协议。 |
| Interaction protocol | 「消息的模式」 | 一串带已知正确性的 performative 序列：request-when、subscribe-notify 等。 |

## 延伸阅读

- [Liu et al. — A Survey of Agent Interoperability Protocols: MCP, ACP, A2A, ANP](https://arxiv.org/html/2505.02279v1) —— 把现代规范连回 FIPA 遗产的标志性 2025 综述
- [FIPA ACL Message Structure Specification (fipa00037)](http://www.fipa.org/specs/fipa00037/) —— 2000 年批准的信封格式
- [FIPA Communicative Act Library Specification (fipa00037)](http://www.fipa.org/specs/fipa00037/) —— 完整的 performative 目录
- [MCP specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) —— `request`/`query-ref` 的现代工具调用等价物
- [A2A specification](https://a2a-protocol.org/latest/specification/) —— contract-net 和 subscribe-notify 的现代 agent 对等等价物
