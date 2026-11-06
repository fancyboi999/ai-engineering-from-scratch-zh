---
id: exit-zero-was-not-a-pass
title: 退出码为 0 但并未通过的比对检查
card: scenarios
kind: incident
level: 4
roles: [ai-evaluation-reliability-engineer, agentic-ai-engineer]
rounds: [debugging, design-review, system-design]
tags: [evidence, bundles, ci, reverse-engineering, unknowns]
minutes: 30
lessons: [phases/14-agent-engineering/26-failure-modes-agentic]
manuals: []
practice: []
cheatsheet: []
related: [scenarios/an-empty-list-is-not-none, scenarios/plausible-is-not-equal]
updated: 2026-11-03
system:
  version: rea 6.7.0 at 27dc42d with the Ghidra provider
  model: no model; the fixtures are the ledger binaries built at -O1 and -O2
  hardware: one aarch64 Mac
source:
  - manuals/reverse-engineering-101/capture/out/00-commands.txt
  - manuals/reverse-engineering-101/capture/out/14-compare-bundles.json
  - manuals/reverse-engineering-101/capture/out/12-evidence-export.txt
  - manuals/reverse-engineering-101/capture/out/13-evidence-import.json
  - manuals/reverse-engineering-101/capture/out/13-evidence-import-rea-6.5.0.json
  - manuals/reverse-engineering-101/capture/out/11-bundles.txt
  - manuals/reverse-engineering-101/sections/5-5-compare-and-compare-functions.md
  - manuals/reverse-engineering-101/sections/5-4-evidence-bundles-export-and-import.md
  - manuals/reverse-engineering-101/sections/r-3-errors.md
---

## Situation

一个团队在版本控制中保存已发布二进制文件的 Evidence 证据包。一个每晚运行的定时作业使用 rea 逆向分析当前构建、导出 bundle、执行 `rea compare` 比对前一晚的 bundle，并在命令退出码为 0 时向团队频道发送“无变更”通知。该机制连续三周每晚都报告“无变更”。随后一次发布采用了不同的编译优化级别，该作业依然汇报“无变更”。一名审查者手动打开两个 bundle，发现两者之间没有一条共享记录。

同一周还发生了另外两起异常：该作业还保存每个 bundle 文件的摘要哈希以检测意外篡改，而一位同事对相同记录执行导出却得出了不同的哈希；此外从 6.5.0 版本升级后，一份此前从未改动过的归档 bundle 在导入时被系统拒绝。团队要求你说明该定时作业三周以来究竟在度量什么，并重新设计该流程。

## Evidence

- [导入与比对命令及其对应的进程退出码](evidence/the-three-commands.txt)
- [比对输出结果的状态与摘要头部](evidence/compare-status-and-summary.txt)
- [十处记录差异中的首项具体内容](evidence/one-unresolved-record.txt)
- [比对结果末尾附带的局限性说明](evidence/the-closing-limitation.txt)
- [针对相同记录分别通过 MCP 与 CLI 导出的结果对比](evidence/two-exports-one-content.txt)
- [当前版本构建生成的 bundle 在导入时的计数情况](evidence/import-of-the-current-bundle.txt)
- [旧版本构建生成的 bundle 在导入时被拒绝的日志](evidence/old-bundle-refused.txt)

## Questions

1. 比对命令在两个毫无共同记录的 bundle 上返回了退出码 0。该作业此前读取了什么，原本应该读取什么？
2. 每项差异均被归类为种类为 `unresolved_branch` 的 `unknown`，且 `records_removed` 为 0。为什么 rea 不将仅在一侧存在的记录判定为删除？
3. 对相同八条记录的两次导出得出了不同的哈希与字节数。哪份哈希应当归档，如何核验两个文件包含相同的证据？
4. 旧 bundle 被拒绝且标注为 `retryable: false`。哪条记录导入失败，为什么是它，团队应对旧版本保存的证据作何处置？
5. 编写定时作业的聚合判定规则，并指出哪个工具能真正回答它试图探究的问题。

## Walkthrough

1. **对照比对结果审视退出码。** 命令记录显示 `rea compare` 退出码为 0。导入当前 bundle 同样退出码为 0。唯独导入旧 bundle 退出码为 1。`rea compare` 返回 0 仅代表比对流程顺利执行完毕，绝不代表找到了两个等价的证据集合。该定时作业将进程退出状态直接等同于业务判定结论，从未解析输出的真正内容。
2. **分析状态与摘要数据。** 比对结果明确标注 `status: "unknown"`。所有 `records_` 统计项均为 0，而 `unresolved` 为 10。两个 bundle 之间没有任何共享记录，既没有任何记录被判定为未变更，也没有任何记录被判定为发生变更。作业发出的“无变更”消息实际上是在描述一次根本没有比对出任何实质结论的比对。
3. **审视单项差异分析。** 第一项差异包含右侧 ID 而左侧为空。其分类为 `unknown`，结论类型为 `unresolved_branch`。差异上的局限性说明指出：bundle 缺乏全量清单完备性标记，因此仅在一侧存在可能反映的是采集不完整。rea 无法区分一条记录是被删除了，还是在另一侧从未被采集，因为 bundle 格式并未声明采集是否完整。
4. **查阅结论性局限性说明。** 末尾的一句话总结了整个比对结果：单侧存在始终属于未知。这两个 bundle 是从两个不同的编译产物生成的。两者的 `evidence_id` 根本不可能匹配，因为该 ID 是记录语义内容的哈希，而语义内容描述的是不同的二进制文件。`rea compare` 用于回答同一构建生成的两个 bundle 之间的“证据集发生了什么变动”。对于两个不同构建之间的差异，必须通过 `compare_functions` 逐个函数展开比对。
5. **对比两份导出产物。** MCP 导出与 CLI 导出包含完全相同的 JSON 语义内容，但字节数不同：178398 字节对 178397 字节。差异的这一个字节仅是抓取套件在其副本末尾添加的换行符。规范哈希是以 `rea evidence-export` 生成的为准，比对结果将其标识为左侧 bundle 哈希。若定时作业需比对文件哈希，必须先将两份文件规范化，或直接比对 JSON 语义内容。
6. **分析两次导入行为。** 当前版本 bundle 导入报告 8/8 成功。旧版本 bundle 导入在 `records.3.evidence_id` 处因 `evidence_integrity_mismatch` 终止且标记为 `retryable: false`。文件字节与旧版本写入时完全一致。原因在于哈希计算规则发生了变更：当前版本将 `relationship_coverage` 为 `null` 纳入了记录的身份标识计算，而旧版本将其排除在外。记录 0 至 2 属于带有覆盖度对象的卷宗，其 ID 验证依然能通过。记录 3 是首个没有覆盖度对象的记录，因此成为首个校验失败的条目。

## Resolution

三周以来该作业衡量的仅仅是 `rea compare` 能否正常启动，从未读取真实的判定状态。重新设计的逻辑解析 JSON 输出并执行一条硬规则：凡是状态为 `unknown` 或 `unresolved` 大于 0 的结果，一律判定为未通过并在报警信息中指明具体计数。只有状态为 `unchanged` 且所有记录均明确归类的结果才被视为通过。该作业仅用于比对同一构建的 bundle。当构建版本发生变更时，它打开两个构建针对每个重点函数调用 `compare_functions`，并审查每个记录的八个维度（正如手册针对 `_percent_change` 和 `_total` 所展示的那样）。

归档存储记录来自 `rea evidence-export` 的规范哈希以及生成它的 rea 版本号。团队不对已保存的证据二次迁移。对于旧 bundle，保留旧版本二进制工具以便随时调阅，并使用当前版本重新生成仍需使用的证据。改造后的首次夜间运行输出了 `unresolved: 10` 并亮起红灯，真实反映了两个不同构建并存的客观现状。

## Wrong turns

- "退出码为 0 说明比对已顺利通过。" 退出码仅代表命令正常结束。业务判定结论位于 `status` 字段中，此处明确为 `unknown`。
- "右侧有十条未解析记录而左侧没有，说明新增了十条记录。" bundle 缺少完备性标记，rea 无法确认左侧是否完成了完整采集。它给出的结论是未知，你也必须尊重这一判定。
- "重算 ID 并重新导入以修复旧 bundle。" 该拒绝明确标记为不可重试，且 rea 不提供证据迁移功能。你自己算出的 ID 不再是逆向工具生成的客观证据。
- "比对文件哈希来检测变更。" 相同记录的两次有效导出仅因末尾换行符产生差异。应当比对规范哈希或 JSON 语义内容。

## Generalize

能够输出“我不知道”的工具，需要能够理解该结论的解析器。任何将工具输出转化为通过或失败的自动化流程，都必须解析承载判定结论的具体字段，并将除 `pass` 以外的任何状态（包括 unknown、unresolved 和 skipped）均视为未通过。在每份产物旁记录生成它的工具具体版本号，因为数据格式的身份标识规则可能在版本更迭中发生改变；始终比对规范化形式，绝不要直接比对原始文件字节。

## Taught in

[逆向工程 101 的比对页面](../../../manuals/reverse-engineering-101/sections/5-5-compare-and-compare-functions.md#rea-compare-on-two-bundles)解读了该输出结果，[bundle 页面](../../../manuals/reverse-engineering-101/sections/5-4-evidence-bundles-export-and-import.md#a-bundle-from-an-earlier-release)解释了两次导出与导入被拒的机制，[错误参考](../../../manuals/reverse-engineering-101/sections/r-3-errors.md#codes-that-are-not-errors)列出了拒绝下达结论但以 0 退出的状态码，而[失效模式课程](../../../phases/14-agent-engineering/26-failure-modes-agentic/)剖析了仅捕获进程崩溃的监控链路为何会漏掉绝大多数致命缺陷。
