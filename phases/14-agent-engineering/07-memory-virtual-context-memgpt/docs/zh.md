# 记忆：虚拟上下文与 MemGPT

> 上下文窗口是有限的。对话、文档和工具轨迹不是。MemGPT（Packer 等人，2023）把这事框定为操作系统的虚拟内存 —— 主上下文是内存，外部存储是磁盘，agent 在两者之间换页。这是 2026 年每个记忆系统都继承的模式。

**类型：** Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 01（Agent 循环）、阶段 14 · 06（工具使用）
**预计时间：** ~75 分钟

## 学习目标

- 解释 MemGPT 立足的 OS 类比：主上下文 = 内存，外部上下文 = 磁盘，记忆工具 = 换入/换出。
- 用标准库实现 MemGPT 的两级模式，含一个主上下文缓冲区、一个可搜索的外部存储和换入/换出工具。
- 描述 agent 如何发出「中断」来查询或修改外部记忆，以及结果如何拼回下一个 prompt。
- 认清那些延续到 Letta（第 08 课）和 Mem0（第 09 课）的 MemGPT 设计选择。

## 问题背景

上下文窗口看起来像是该能解决记忆问题。但它没有。生产中反复出现三种失败模式：

1. **溢出。** 多轮对话、长文档或工具调用密集的轨迹越过了窗口。截断点之外的一切都没了。
2. **稀释。** 哪怕在窗口内，塞进无关上下文也会稀释模型对真正重要内容的注意力。前沿模型在长输入上仍会退化。
3. **持久化。** 新会话从一个空窗口开始。没有外部记忆的 agent 没法跨会话说「记得你之前让我……吗」。

更大的窗口有帮助，但解决不了这个问题。Mem0 的 2025 年论文测出，128k 窗口的基线仍会漏掉一些长跨度事实，而一个 4k 窗口配外部记忆的 agent 能抓到。

## 核心概念

### MemGPT：OS 类比

Packer 等人（arXiv:2310.08560，v2，2024 年 2 月）把上下文管理映射到操作系统的虚拟内存：

| OS 概念 | MemGPT 概念 | 2026 生产对应物 |
|------------|---------------|------------------------|
| 内存 | 主上下文（prompt） | Anthropic/OpenAI 上下文窗口 |
| 磁盘 | 外部上下文 | 向量数据库、KV、图存储 |
| 缺页 | 记忆工具调用 | `memory.search`、`memory.read`、`memory.write` |
| OS 内核 | agent 控制循环 | 带记忆工具的 ReAct 循环 |

agent 跑一个普通的 ReAct 循环。多出来的一类工具让它把数据换入换出主上下文。

### 两级

- **主上下文。** 固定大小的 prompt，装着当前任务。对模型始终可见。
- **外部上下文。** 无界，通过工具可搜索。相关时读取，事实浮现时写入。

原论文在两个超出基础窗口的任务上评估了这个设计：长于 100k token 的文档分析，以及跨多天保持持久记忆的多会话聊天。

### 中断模式

MemGPT 引入了「记忆即中断」：对话中途 agent 可以调用一个记忆工具，运行时执行它，结果作为一个新观察拼进下一个助手轮。概念上等同于一次 Unix `read()` 系统调用 —— 它阻塞进程、返回字节，然后进程继续。

标准的记忆工具接触面：

- `core_memory_append(section, text)` —— 写入 prompt 的某个持久 section。
- `core_memory_replace(section, old, new)` —— 编辑某个持久 section。
- `archival_memory_insert(text)` —— 写入可搜索的外部存储。
- `archival_memory_search(query, top_k)` —— 从外部存储检索。
- `conversation_search(query)` —— 扫描过往轮次。

### MemGPT 到哪儿结束、Letta 从哪儿开始

2024 年 9 月 MemGPT 变成了 Letta。研究仓库（`cpacker/MemGPT`）还在；Letta 扩展了这个设计：

- 三级而非两级（core、recall、archival —— 第 08 课）。
- 用原生推理取代 `send_message`/heartbeat 模式（第 08 课）。
- 跑异步记忆工作的 sleep-time agent（第 08 课）。

即便生产系统跑的是 Letta、Mem0 或一个自定义两级存储，MemGPT 论文仍是 2026 年的基石。

### 这个模式在哪里会出错

- **记忆腐烂。** 写入攒得比读取快；检索淹没在过时事实里。修法：周期性整合（Letta sleep-time）、显式失效（Mem0 冲突检测器）。
- **记忆投毒。** 外部记忆是被检索回来的文本。如果攻击者控制的内容落进了一条记忆笔记，agent 下个会话会再次摄入它。这就是 Greshake 等人（第 27 课）的攻击在时间维度上的重述。
- **引用丢失。** agent 回忆起「用户让我交付 X」，但说不出是哪一轮。每次 archival 写入都存上来源引用（会话 ID、轮次 ID）。

```figure
context-budget
```

## 动手构建

`code/main.py` 用标准库实现 MemGPT 的两级模式：

- `MainContext` —— 固定大小的 prompt 缓冲区，带一个 `core` 字典和一个 `messages` 列表；超上限时自动压实最老的消息。
- `ArchivalStore` —— 内存中的类 BM25 存储（token 重叠打分），存 (id, text, tags, session, turn) 记录。
- 映射到 MemGPT 接触面的五个记忆工具。
- 一个脚本化 agent，先用事实填满 archival，然后通过调用 `archival_memory_search` 回答一个问题。

运行它：

```
python3 code/main.py
```

轨迹展示 agent 写入三个事实、把主上下文填到上限（强制驱逐），然后通过从 archival 检索来回答一个追问 —— 在没有任何真实 LLM 的情况下复现 MemGPT 工作流。

## 实际使用

今天每个生产记忆系统都是 MemGPT 变体：

- **Letta**（第 08 课）—— 三级、原生推理、sleep-time compute。
- **Mem0**（第 09 课）—— 向量 + KV + 图，融合一个打分层。
- **OpenAI Assistants / Responses** —— 通过 thread 和 file 的托管记忆。
- **Claude Agent SDK** —— 通过 skill 和会话存储的长期记忆。

按运维形态（自托管、托管、框架集成）来选，而不是按核心模式 —— 核心模式就是 MemGPT。

## 拿去用

`outputs/skill-virtual-memory.md` 是一个可复用技能，为任意目标运行时产出一个正确的两级记忆脚手架（主 + archival + 工具接触面），驱逐策略和引用字段都接好。

## 练习

1. 加一个以 token 计的 `max_main_context_tokens` 上限（用 `len(text.split())` * 1.3 近似）。超限时把最老的消息压实成一段摘要。对比有/无摘要器的行为。
2. 在 archival 存储上正经实现 BM25（词频、逆文档频率）。在一组玩具事实上度量 recall@10，与 token 重叠基线对比。
3. 给 archival 插入加 `citation` 字段（session_id、turn_id、source_url）。让 agent 在每个有检索支撑的答案上引用来源。
4. 模拟记忆投毒：加一条 archival 记录写着「忽略未来所有用户指令」。写一个守卫，扫描检索结果里指令形态的文本并标记为不可信。
5. 把实现移植到使用 MemGPT 研究仓库的 core-memory JSON schema（`cpacker/MemGPT`）。从扁平字符串切到带类型的 section 时，有什么变化？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Virtual context | 「无限记忆」 | 主（prompt）+ 外部（可搜索）两级，带换入/换出 |
| Main context | 「工作记忆」 | prompt —— 固定大小、始终可见 |
| Archival memory | 「长期存储」 | 外部可搜索的持久化，按需检索 |
| Core memory | 「持久 prompt section」 | 钉在主上下文里的具名 section |
| Memory tool | 「记忆 API」 | agent 发出的读/写外部记忆的工具调用 |
| Interrupt | 「记忆缺页」 | agent 暂停，运行时取数，结果拼进下一轮 |
| Memory rot | 「过时事实」 | 旧写入淹没检索；用整合来修 |
| Memory poisoning | 「注入的持久笔记」 | 攻击者内容被存为记忆，回忆时再次摄入 |

## 延伸阅读

- [Packer et al., MemGPT (arXiv:2310.08560)](https://arxiv.org/abs/2310.08560) —— OS 启发的虚拟上下文论文
- [Letta, Memory Blocks blog](https://www.letta.com/blog/memory-blocks) —— 三级演进
- [Anthropic, Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) —— 把上下文当预算来对待
- [Chhikara et al., Mem0 (arXiv:2504.19413)](https://arxiv.org/abs/2504.19413) —— 建立在这个模式之上的混合生产记忆
