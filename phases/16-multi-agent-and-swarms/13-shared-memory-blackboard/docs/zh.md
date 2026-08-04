# 共享内存与黑板模式

> 2026 年的多 agent 系统里两种做法并存：**消息池**（人人看到人人的消息，如 AutoGen GroupChat 或 MetaGPT）和**带订阅的黑板**（agent 订阅相关事件，如 Context-Aware MCP 或 Matrix 框架）。两者都是多 agent 系统里唯一有状态的部分——这意味着两者都是有意思的 bug 安家的地方。标准故障模式是**记忆投毒（memory poisoning）**：一个 agent 幻想出一个「事实」，其他 agent 把它当成已验证的，准确率逐渐衰减，这种方式比立刻崩溃难调试得多。本课用标准库构建这两种结构，注入一次投毒攻击，并展示三种在生产里真正管用的缓解手段。

**类型：** Learn + Build
**语言：** Python（标准库，`threading`）
**前置要求：** Phase 16 · 04（原语模型）、Phase 16 · 09（并行 Swarm 网络）
**预计时间：** ~75 分钟

## 问题背景

多 agent 系统需要一个地方让 agent 共享事实。一个字面选项是「什么都用消息传」——但那是在重新发明共享状态，还多了拷贝。另一个是「给每个人一份全局日志」——但全局日志无限增长、又容易中毒。第三个是「为每个 agent 投影一个视图」——可扩展但 schema 很重。

当其中一个 agent 产生幻觉、把幻觉写进共享状态时，每一个读那份状态的下游 agent 都会把这幻觉当成事实接受。等到人注意到时，推理链已经深入五步，而根因是有史以来写下的第三条消息。调试多 agent 的准确率衰减，比调试一次崩溃更难。

这就是记忆投毒。它是 MAST 分类法（Cemri 等人，arXiv:2503.13657）里记录第二多的故障家族，而且是结构性的：任何没有溯源、没有不可写 verifier 的共享内存设计，迟早都会表现出它。

## 核心概念

### 两种主要拓扑

**全消息池。** 每个 agent 读每条消息。AutoGen GroupChat 和 MetaGPT 用这个。简单、透明、可检视，但扩展不过约 10 个 agent，因为每个 agent 的上下文都被其他 agent 的工作填满。

```
agent-A ──write──▶ ┌────────────────┐ ◀──read── agent-D
                   │ message pool   │
agent-B ──write──▶ │                │ ◀──read── agent-E
                   │ (global log)   │
agent-C ──write──▶ └────────────────┘ ◀──read── agent-F
```

**带订阅的黑板。** agent 声明对哪些主题感兴趣；底层只路由相关消息。CA-MCP（arXiv:2601.11595）和 Matrix 去中心化框架（arXiv:2511.21686）用这个。能扩展得更远，但需要前期的 schema 设计才能让订阅有意义。

```
                   ┌─ topic: prices ──┐
agent-A ──pub────▶ │                  │ ──▶ agent-D (subscribed)
                   ├─ topic: orders ──┤
agent-B ──pub────▶ │                  │ ──▶ agent-E (subscribed)
                   ├─ topic: alerts ──┤
agent-C ──pub────▶ │                  │ ──▶ agent-F (subscribed)
                   └──────────────────┘
```

### 各自何时占优

- **全池** 在 agent 少（< 10）、异质、对话短时占优。当人人看到一切时，推理「谁说了什么」是小事一桩。
- **黑板** 在 agent 多、角色同质但实例众多（swarm）、对话长时占优。路由省下 token 成本和上下文污染。

生产系统常混用：顶层一个小全池（规划层），下面是黑板（worker 层）。

### 记忆投毒，用一个场景说

三个 agent 在做一个调研任务。agent A 是检索 agent。agent B 是总结 agent。agent C 是分析 agent。

1. A 抓了一个页面，往共享状态写一条消息：「这项研究报告了 42% 的准确率提升。」
2. 抓到的页面实际说的是「4.2% 提升」。A 幻想出了一个小数点。
3. B 读了共享状态，写道：「报告了大幅 42% 的准确率增益（来源：A）。」
4. C 读了共享状态，写道：「建议采用——42% 的提升是变革性的。」
5. 最终报告引用了一个从未存在过的 42% 数字。

没有 agent 崩溃。没有测试失败。系统「正常工作」。幻觉通过共享状态，从一个 agent 的上下文穿进了每个下游 agent 的推理。

### 为什么这是结构性的

没有共享状态时，agent A 的幻觉留在 A 的上下文里。下游 agent 会重新抓取或重新推导，可能抓住错误。有了朴素的共享状态，A 的上下文成了人人的上下文，幻觉被洗白成了事实。

问题不在共享状态本身——而在于**没有溯源、没有独立 verifier 的共享状态**。三种缓解手段对此下药：

1. **每次写入都标注溯源。** 共享状态里的每条记录都记下谁写的、何时写的、在什么 prompt 下写的、以及（如适用）agent 引用了什么来源。下游 agent 按溯源调整怀疑程度地阅读。
2. **给写入打版本；当成只追加。** 一次修正是一条覆盖旧条目的新条目，而不是原地更新。审计轨迹被保留。
3. **保留至少一个不能写共享状态的 agent。** 一个只读的 verifier agent 抽样条目、重新抓取来源、标出不一致。因为它不能往池子里写，它就不会被池子毒到。

### 黑板的先例（Hayes-Roth，1985）

黑板模式比 LLM agent 早了四十年。Hayes-Roth（1985，《A Blackboard Architecture for Control》）描述了一些专精的「知识源（Knowledge Source）」，它们观察一块全局黑板、贡献部分解、并触发其他源。2026 年的黑板（CA-MCP、Matrix）是同一个模式，只是 LLM agent 当知识源、JSON 数据块当部分解。旧文献已经记录了对写竞争、机会主义控制、一致性的解法，现代系统正在重新发现这些。

### 投影对全视图

纯黑板给每个订阅者同样的投影（按主题裁剪）。一种更激进的设计是**按 agent 投影**：每个 agent 拿到一个为它角色定制的视图。LangGraph 的 state reducer 是 2026 年的标准实现——reducer 函数把全局状态折叠成一个角色专属的切片。

按 agent 投影扩展得更远，但需要一份 schema。没有它，你就在每个 agent 的 prompt 里临时重建投影。

### 写竞争模式

多个 agent 同时写入是一个并发问题，不只是 LLM 问题。三种模式管用：

- **串行写者（单生产者）。** 所有写入都过一个协调者 agent 来串行化。简单，但是个瓶颈。
- **带版本的乐观并发。** 每条记录有一个版本；写者在版本不匹配时失败并重试。经典数据库技术。
- **主题分区。** 不同 agent 拥有不同主题。无跨主题竞争。需要设计好的分区边界。

大多数 2026 框架默认用串行写者，因为 LLM 调用够慢、竞争罕见，瓶颈也不疼。

### 不可写的 verifier

最承重的缓解是那个只读 verifier。实现规则：

- verifier 和团队共享状态（读黑板或池子）。
- verifier 对共享状态没有写句柄——只能写一个独立的验证通道。
- verifier 独立抓取写入里引用的来源。标出分歧。
- verifier 自己的输出被路由给人或一个独立的决策 agent，绝不喂回池子。

没有这种隔离，verifier 的输出就成了池子里的新条目，于是一个被毒的池子会毒到 verifier，进而毒到它的验证。

```figure
swarm-blackboard
```

## 动手构建

`code/main.py` 用标准库 Python 实现了两种拓扑，外加一次玩具投毒攻击和三种缓解手段。

- `MessagePool` —— 线程安全的只追加日志，可全量读出。
- `Blackboard` —— 按主题分键的 pub/sub，带按 agent 的订阅。
- `ProvenanceEntry` —— 每次写入记录 (writer, timestamp, prompt_hash, source_uri)。
- `PoisoningScenario` —— 跑一个三 agent 的调研任务，agent A 幻想出一个小数点。打印最终报告。
- `Verifier` —— 一个重新抓取来源、标出不一致的只读 agent。在 verifier 在场的情况下跑同一个场景。

运行：

```
python3 code/main.py
```

预期输出：
- 第 1 次运行（无 verifier）：幻想出的 42% 传播到最终报告。
- 第 2 次运行（有 verifier）：verifier 标出不一致，池子被打上「flagged」标签，最终报告包含一段撤回。

## 实际使用

`outputs/skill-memory-auditor.md` 是一个 skill，它审计任意多 agent 系统的共享内存设计，看溯源、版本控制、verifier 隔离。在新多 agent 架构上生产前跑它。

## 拿去用

对任何共享内存设计：

- 每次写入都记录溯源：`(writer, timestamp, prompt_hash, tool_calls_cited, source_uri)`。
- 让日志只追加。修正是引用被覆盖条目的新条目。
- 部署至少一个有独立来源访问能力的只读 verifier agent。
- 把 verifier 输出路由到一个独立通道，而不是回到共享池。
- 记录写入中「覆盖」所占的比例——这个比例上升是幻觉模式的早期证据。

## 练习

1. 跑 `code/main.py`。确认第 1 次运行传播了幻觉、第 2 次抓住了它。
2. 加第二个幻觉：agent B 编造一个数据集大小。verifier 应该两个都抓住，且不为任何一个手工调参。
3. 把全池换成带主题分区（`prices`、`summaries`、`analyses`）的黑板。主题分区让哪些投毒场景更难得逞，又对哪些没帮助？
4. 读 Hayes-Roth（1985，《A Blackboard Architecture for Control》）。指出论文里本课没讨论、而 2026 年系统会受益的两种控制模式。
5. 读 CA-MCP（arXiv:2601.11595）。把它的 Shared Context Store 映射到 `code/main.py` 里的 MessagePool 或 Blackboard 类。CA-MCP 在其之上加了哪些原语？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| Message pool | 「共享聊天历史」 | 每个 agent 都读的只追加日志。完全透明，扩展性差。 |
| Blackboard | 「共享工作区」 | 按主题分键的 pub/sub。agent 订阅相关主题。扩展更远。 |
| Provenance | 「谁写了什么」 | 每次写入上的元数据：写者、时间戳、prompt、来源。 |
| Memory poisoning | 「幻觉在扩散」 | 一个 agent 的错误进入共享状态，下游 agent 把它当事实接受。 |
| Append-only | 「无原地更新」 | 修正是覆盖旧条目的新条目。保留审计轨迹。 |
| Unwritable verifier | 「独立审计员」 | 重新抓取来源、标出不一致的只读 agent。 |
| Projection | 「裁剪视图」 | 从全局状态算出的按 agent 视图。LangGraph reducer 是标准案例。 |
| Knowledge Source | 「专精 agent」 | Hayes-Roth 1985 年对黑板参与者的称呼。 |

## 延伸阅读

- [Cemri et al. — Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) —— MAST 分类法；记忆投毒是协调失败的一个子家族
- [CA-MCP — Context-Aware Multi-Server MCP](https://arxiv.org/abs/2601.11595) —— 协调多个 MCP 服务器的 Shared Context Store
- [Matrix — decentralized multi-agent framework](https://arxiv.org/abs/2511.21686) —— 基于消息队列、无中心 orchestrator 的黑板
- [LangGraph state and reducers](https://docs.langchain.com/oss/python/langgraph/workflows-agents) —— 生产里的按 agent 投影模式
- [Anthropic — How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) —— 来自生产部署的溯源与验证笔记
