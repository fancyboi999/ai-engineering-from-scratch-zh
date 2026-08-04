# 记忆块与休眠时计算

> 两个想法让记忆扩展到单次对话之外：模型可直接编辑的离散功能性记忆块，以及一个在主 agent 空闲时异步整合记忆的 sleep-time agent。

**类型：** Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 07（MemGPT）
**预计时间：** ~75 分钟

## 学习目标

- 说出 Letta 用的三个记忆层（core、recall、archival）及各自的作用。
- 解释记忆块模式：Human 块、Persona 块，以及作为一等带类型对象的用户自定义块。
- 描述 sleep-time compute 是什么、为什么它在关键路径之外、为什么它能跑一个比主 agent 更强的模型。
- 实现一个脚本化的双 agent 循环：一个主 agent 提供响应，一个 sleep-time agent 在轮次之间整合块。

## 问题背景

MemGPT（第 07 课）解决了虚拟内存的控制流。又冒出三个生产问题：

1. **延迟。** 每个记忆操作都坐在关键路径上。如果 agent 得在用户等待时做剪枝、摘要或调和，尾延迟就会炸。
2. **记忆腐烂。** 写入越攒越多。被推翻的事实还留着。检索淹没在过时内容里。
3. **结构丢失。** 一个扁平的 archival 存储没法表达「Human 块始终在 prompt 里；Persona 块始终在 prompt 里；Task 块每个会话换一次」。

Letta（letta.com）是原 MemGPT 项目在 2024 年采用的平台名称，论文中的模式仍叫 MemGPT；2026 年的 Letta V1 重写是后续独立的一步。记忆块让结构显式化，sleep-time compute 把整合挪出关键路径。

## 核心概念

### 三层

| 层 | 范围 | 它住在哪 | 由谁写入 |
|------|-------|----------------|------------|
| Core | 始终可见 | 主 prompt 内 | agent 工具调用 + sleep-time 重写 |
| Recall | 对话历史 | 可检索 | 自动轮次记录 |
| Archival | 任意事实 | 向量 + KV + 图 | agent 工具调用 + sleep-time 摄入 |

Core 就是 MemGPT 的 core。Recall 是对话缓冲区及其被驱逐的尾部。Archival 是外部存储。这个拆分理清了 MemGPT 两级里那种职责重载。

### 记忆块

一个块是 core 层里一段带类型、持久、可编辑的 section。原版 MemGPT 论文定义了两个：

- **Human 块** —— 关于用户的事实（名字、角色、偏好、目标）。
- **Persona 块** —— agent 的自我概念（身份、语气、约束）。

Letta 把它推广到任意用户自定义块：当前目标用一个 `Task` 块、代码库事实用一个 `Project` 块、硬约束用一个 `Safety` 块。每个块有 `id`、`label`、`value`、`limit`（字符上限）、`description`（好让模型知道何时编辑它）。

块通过工具接触面可编辑：

- `block_append(label, text)`
- `block_replace(label, old, new)`
- `block_read(label)`
- `block_summarize(label)` —— 压缩一个接近上限的块。

### Sleep-time compute

2025 年 Letta 的新增：在后台跑第二个 agent，在关键路径之外。sleep-time agent 处理对话 transcript 和代码库上下文，把 `learned_context` 写进共享块，并整合或失效 archival 记录。

随之而来的特性：

- **无延迟代价。** 主响应不用等记忆操作。
- **允许更强的模型。** sleep-time agent 可以是个更贵、更慢的模型，因为它不受延迟约束。
- **天然的整合窗口。** 在用户不等待时去重、摘要、失效被推翻的事实。

这个形态契合人类的工作方式：你做任务，你睡一觉，长期记忆在过夜里沉淀下来。

### 原生推理

Letta V1（`letta_v1_agent`，2026）废弃了 `send_message`/heartbeat 和内联的 `Thought:` token，转用原生推理。Responses API（OpenAI）和带 extended thinking 的 Messages API（Anthropic）在一个独立通道上输出推理，跨多轮透传（生产环境里跨厂商加密）。控制循环仍是 ReAct。思考轨迹是结构化的，不是 prompt 形态的。

### 这个模式在哪里会出错

- **块膨胀。** 无限 `block_append` 很快就撞上限。在那次会把上限顶破的写入之前接一个块摘要器。
- **静默漂移。** sleep-time agent 重写了一个块，主 agent 却毫不知情。给块加版本，在轨迹里暴露 diff。
- **被投毒的整合。** sleep-time agent 把攻击者可触达的内容加工进了 core。第 27 课同样适用于 sleep-time 接触面。

```figure
memory-blocks
```

## 动手构建

`code/main.py` 实现：

- `Block` —— id、label、value、limit、description。
- `BlockStore` —— CRUD + `near_limit(label)` 辅助函数。
- 两个脚本化 agent —— `PrimaryAgent` 提供一轮，`SleepTimeAgent` 在轮次之间整合。
- 一条轨迹，展示一段带块写入的三轮对话，外加一遍 sleep-time 处理：摘要一个块并失效一个过时事实。

运行它：

```
python3 code/main.py
```

transcript 展示了这种拆分：主轮次快且产生原始写入；sleep 遍历做压实和清理。

## 实际使用

- **Letta**（letta.com）作为参考实现。自托管或托管云。
- **Claude Agent SDK skill** 作为块形态的知识 —— 一个 skill 就是一段具名、有版本、可检索的指令块，agent 按需加载。
- **自定义构建** 给那些想掌控存储后端的团队。用 Letta 的 API 契约，这样你以后能迁移。

## 拿去用

`outputs/skill-memory-blocks.md` 为任意运行时生成一个 Letta 形态的块系统，带 sleep-time hook，包含安全规则和引用接线。

## 练习

1. 加一个 `block_summarize` 工具，当 `near_limit` 返回真时用模型生成的摘要替换块的值。哪个触发阈值能同时最小化摘要调用次数和块溢出？
2. 在 archival 上实现 sleep-time 去重：两条文本 token 重叠 >90% 的记录合并成一条。只在 sleep 遍历里做，绝不在关键路径上。
3. 给块加版本。每次写入都记录旧值和一个 diff。暴露 `block_history(label)` 让运维能调试「agent 为什么忘了 X」。
4. 把 sleep-time agent 当成不可信写入者。当它们碰 Persona 或 Safety 块时，提交前要求第二个 agent 审查。
5. 把示例移植到使用 Letta API（`letta_v1_agent`）。块 schema 有什么变化，原生推理又怎么改变轨迹形态？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Memory block | 「可编辑 prompt section」 | core 记忆里带类型、持久、LLM 可编辑的片段 |
| Human block | 「用户记忆」 | 关于用户的事实，钉在 core 里 |
| Persona block | 「agent 身份」 | 自我概念、语气、约束，钉在 core 里 |
| Sleep-time compute | 「异步记忆工作」 | 在关键路径之外做整合的第二个 agent |
| Core / Recall / Archival | 「层」 | 三层记忆拆分：始终可见 / 对话 / 外部 |
| Block limit | 「上限」 | 每块的字符上限；强制摘要 |
| Native reasoning | 「思考通道」 | 厂商级的推理输出，不是 prompt 级的 `Thought:` |
| Learned context | 「sleep 输出」 | sleep-time agent 写进共享块的事实 |

## 延伸阅读

- [Letta, Memory Blocks blog](https://www.letta.com/blog/memory-blocks) —— 块模式
- [Letta, Sleep-time Compute blog](https://www.letta.com/blog/sleep-time-compute) —— 异步整合
- [Letta, Rearchitecting the Agent Loop](https://www.letta.com/blog/letta-v1-agent) —— 原生推理重写
- [Packer et al., MemGPT (arXiv:2310.08560)](https://arxiv.org/abs/2310.08560) —— 源头
