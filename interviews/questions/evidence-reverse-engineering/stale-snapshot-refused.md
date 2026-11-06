---
id: stale-snapshot-refused
title: 升级与重命名后的 profile_mismatch
card: evidence-reverse-engineering
kind: debug
level: 2
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer, ai-data-engineer]
rounds: [debugging, system-design]
tags: [reverse-engineering, cache, snapshot, analysis-profile, invalidation]
minutes: 8
lessons: [phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns]
manuals: [reverse-engineering-101#s-snapshots-and-the-answer-cache]
practice: []
cheatsheet: [reverse-engineering]
related: [evidence-reverse-engineering/evidence-id-excludes-the-path]
updated: 2026-11-03
---

在工具升级后，使用已保存快照调用 `open_binary` 返回了 `profile_mismatch`，尽管分析目标的 SHA-256 和提供方（provider）均未发生变化。同一天上午，某同事重命名了一个函数，随后传入快照路径调用 `close_binary` 失败，提示 "Analysis snapshots are unavailable because analysis metadata may have changed"。解释这两种拒绝的原因，并说明快照究竟是什么以及不是什么。

## Short answer

缓存键是由字符串 `query_` 加上对目标标识、绑定关系、操作以及参数计算的 SHA-256 哈希值构成的，其中绑定关系包含了对 25 个参数版本字符串计算的分析配置摘要；工具升级变动了其中两个数值，导致配置摘要发生改变，已存储的条目均无法命中，导入过程据此报告 `profile_mismatch`。重命名属于变更状态的调用，会话在调用实际派发前就会清空缓存并设置脏标记，即使调用应答失败亦是如此，因为失败的应答无法证明写入操作从未到达过提供方，因此快照导出会被拒绝，此时的解决方式是导出证据包、在不带快照路径的情况下关闭会话，随后重新打开。快照是一个包含历史精确应答及其证据包的文件，而不是保存的提供方数据库。

## Full answer

### 被称为快照的三种事物

目标快照（target snapshot）是启动器以只读模式导入并在关闭时删除的私有副本；分析过程中的任何状态都不会在其上存留，每个新会话都会重新导入该目标。内存中的分析快照缓存针对单个目标标识最多保留 10,000 个条目。快照文件则是 `close_binary` 负责写入、`open_binary` 负责读取的物理文件：它保存了目标标识、提供方绑定、缓存条目以及该会话的证据包。只有符合条件的精确查询才能复用已有结果，而新的或实时的查询仍会启动提供方。

### 准入条件与缓存命中特征

一个调用若要符合快照准入条件，必须满足：其操作是非状态化的、在隐式需要时指明了文档或地址、声明不修改产物，且携带了 `snapshot` 缓存策略。命中缓存的调用不会触碰提供方即可直接返回，并附加一条局限性说明："Loaded from a local REA analysis snapshot; this call did not re-run the provider."。重放的记录重新绑定到当前打开目标的路径，并保留其原始的 `evidence_id`，因为路径位于哈希范围之外。本课的实测数据佐证了这一点：带有全新导入的首个查询耗时 8.6 s，针对同一快照的不同查询因未命中耗时 8.5 s，而重复查询耗时仅 2.1 s 并返回带有相同 ID 的相同记录。

### 加载执行全量校验

条目必须按照规范化 ID 顺序排列，每个查询 ID 都会重新计算并必须匹配，不允许出现重复 ID，且每个条目都必须在证据包中包含具有相同配置与结果的对应证据记录。证据包中若存在针对其他目标的记录将导致整个文件校验失败。写入操作采用原子写入，且仅限文件所有者访问。

### 为什么失效顺序至关重要

当前版本在调用提供方之前就使缓存失效；而早期版本仅在调用成功后才使缓存失效。文档明确规范了该原则：元数据写入即使在应答失败时也会清除活动会话的缓存，因为提供方可能已经应用了该写入。

## Follow-ups

- **Level 2:** 你为某函数缓存了 `analyze_function`，随后查询另一函数，为什么未命中？ Expected: 参数是缓存键的一部分，因此只有完全相同的问题才能重放。
- **Level 3:** 为什么不在变更调用成功之后再使缓存失效？ Expected: 失败的应答无法证明发生了状态回滚，失败后保留的缓存可能会重放针对已变更数据库的过时答案。
- **Level 3:** 读者如何区分重放的记录与全新生成的记录？ Expected: 查看附加的局限性说明文字，其中指出提供方并未重新运行。
- **Level 4:** 在发生升级拒绝后正确的应对做法是什么？ Expected: 在新的配置下重新运行分析，并将旧的证据包作为关于旧契约的证据保留；不要编辑摘要来强制匹配。

## Wrong answers

- "快照就是保存的项目文件；直接重新打开即可。" 它保存的是针对历史提问的答案，底层项目在关闭时已被删除。
- "修补配置摘要以便让旧条目能够匹配。" 摘要指明了生成这些答案所依据的契约版本；强制匹配会导致重放来自已变更契约的答案。
- "重命名只是元数据变更，所以缓存的答案依然有效。" 重命名是状态变更调用；缓存已在派发前被清空，快照导出会被拒绝。

## Taught in

[快照章节](../../../manuals/reverse-engineering-101/sections/5-3-snapshots-and-the-answer-cache.md)给出了缓存键、准入规则与失效顺序，[证据课程](../../../phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns/)构建了相同的缓存并拒绝了升级配置版本的快照。
