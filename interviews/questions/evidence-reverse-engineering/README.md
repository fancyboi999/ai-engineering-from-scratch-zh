# 证据与逆向工程

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

读懂二进制文件，还原意图，并用证据说明结论有多可信。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [callers 为空且 coverage 报告 complete](empty-list-is-not-absence.md) | 概念 | 1 基础 | 6 |
| [描述 grade(55) 的一句话中包含的三个层级词汇](observed-derived-inferred.md) | 概念 | 1 基础 | 6 |
| [表起始于 0x14 而加数记录为 0x10](addend-0x10-table-0x14.md) | 代码阅读 | 2 应用 | 8 |
| [两台机器得出相同 ID 但删除一行后被拒绝导入](evidence-id-excludes-the-path.md) | 概念 | 2 应用 | 8 |
| [nm 报告一个函数而文件实际包含五个](function-finders-in-a-stripped-build.md) | 权衡 | 2 应用 | 8 |
| [四个测试通过而重构产物长达 26 字节](listing-before-pseudocode.md) | 排障 | 2 应用 | 8 |
| [升级与重命名后的 profile_mismatch](stale-snapshot-refused.md) | 排障 | 2 应用 | 8 |
| [每个字节均被解码且跳转落在指令内部](sweep-trap-addq-at-0x13.md) | 排障 | 2 应用 | 8 |
| [相同的 46 字节与重定位结构却对应错误的表](byte-match-is-not-source.md) | 设计 | 3 高级 | 10 |
| [grade 的三个地址与四种基本块计数](four-bases-four-block-counts.md) | 排障 | 3 高级 | 10 |
| [估算证明两个小函数等价所需的测试网格单元数](hazard-grid-estimate.md) | 估算 | 3 高级 | 10 |
| [所有断点均已解析且未命中任何一个](resolved-breakpoint-zero-hits.md) | 排障 | 3 高级 | 10 |
| [解释 95 输出结果并展示推导过程的 Agent](agent-dossier-take-home.md) | 课后任务 | 4 架构与规模 | 60 |
| [没有编译器时保持 unknown 的证明记录](fail-closed-proof-record.md) | 设计 | 4 架构与规模 | 15 |

[全部主题](../../README.md)
