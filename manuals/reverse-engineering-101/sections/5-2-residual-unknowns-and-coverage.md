# ResidualUnknown、record_unknown 与覆盖情况

> 未知项是有独立 id 和修订链的持久记录；任何结果中的空列表，都提醒你检查覆盖情况。

`capture/out/10-mcp-09-analyze-function-percent-change-O1.json` 的 `_percent_change` 档案列出 `"callees": []`。agent 读后声称函数没有调用任何内容，记录却只支持更弱结论：Ghidra 解析了哪些调用。rea 为仍未解决的事情提供记录类型。读完本节，你能阅读 ResidualUnknown 的字段，用 `record_unknown` 创建记录，并说明空列表证明什么。

## 空列表证明什么

档案有空 `callees` 数组，840 行之后有相关限制。callees 只保存已解析目标。记录说集合完整：`relationship_coverage.status` 为 `complete`，`unresolved_calls` 为空。完整表示 Ghidra 返回所有已解析调用引用，不表示发现程序运行时所有可能调用。

```listing
title: 空列表及限定它含义的限制
source: capture/out/10-mcp-09-analyze-function-percent-change-O1.json
lang: json
note: 文件第 1052 行和第 1894 行，之间内容全部省略。
---
"callees": [],
…
"Resolved reference metadata identifies computed, indirect, external, call, jump, and data edges; unresolved targetless flows remain unknown, and function classifications distinguish thunks and externals.",
```

provider 文档用一句话给出同样限制："Callers/callees contain only resolved functions." {{ghidra Admitted function-analysis semantics}}

所有 rea 工具背后的设计规则更短："Missing coverage is unknown, not absence." {{design Define the contract}}

**关系覆盖：** Evidence 记录的 `relationship_coverage` 字段，说明调用者与被调用者集合的完整程度。状态为 `complete`、`partial` 或 `unknown`。`partial` 列出限制，可指明受限方向。`unknown` 给出原因。provider 未为 `procedure_callers` 或 `procedure_callees` 报告覆盖时，rea 写入 `unknown`。其他操作没有覆盖时写 `null`。

provider 的注意事项保留在 `limitations`，不会使覆盖变为 partial。同一契约界定 `complete`："`complete` means that set was returned without a known read limit; it does not claim every possible runtime edge." {{design Define the contract}}

档案有一部分确实以数字声明覆盖。值流报告是否被截断，以及省略的操作、输入和边数量。`inspect-evidence-bundle` 为 bundle 中每份档案重复这些数字。

```listing
title: bundle 摘要中一份档案的覆盖数字
source: capture/out/11-inspect-evidence-bundle-O1.json
lang: json
note: 八条记录之一，native_dossier 之前字段已省略。
---
"native_dossier": {
  "available": true,
  "procedure_address": "0x100000500",
  "procedure_name": "_percent_change",
  "value_flow": {
    "status": "observed",
    "truncated": false,
    "omitted_operations_lower_bound": 0,
    "known_omitted_inputs": 0,
    "known_omitted_edges": 0
  }
}
```

这里的零是 rea 明确担保的计数，其他位置的空数组却没有这样的说明。契约说明这些字段的用途："`native_dossier.value_flow` independently reports truncation, unavailable or unknown metadata." {{mcp Tool results}}

采集中另外两个空列表说明同样道理。`14-compare-bundles.json` 的 `rea compare` 列出十条只存在于一个 bundle 的记录，全部归类为 `unknown`，结论类别为 `unresolved_branch`，因为 bundle 没有完整性标记（见[比较](#s-compare-and-compare-functions)）。`15-js-app-view-summary.json` 的 JavaScript 摘要视图为一个六文件应用报告 `"semantic_unknowns": 118`，语义覆盖标为 `unknown`（见[应用图](#s-analyze-javascript-application)）。[图](#fig-5-3)将三种列表并排。

```figure
id: fig-5-3
kind: comparison
title: 三种空列表各证明什么
claim: 完整覆盖下的空 callees、零未知项计数、单侧 bundle 记录，都只证明未观测到，绝不证明不存在。
caption: 每列从上向下读，先看采集值，再看记录自身措辞，最后看可得结论。依据 capture/out/10-mcp-09-analyze-function-percent-change-O1.json、10-mcp-14-export-evidence-bundle-O1.json 和 14-compare-bundles.json。
```

## ResidualUnknown 记录

**剩余未知项：** 证据尚未解决的问题，以记录保存，具有 `unk_` id、修订链、状态，以及解决所需证据。字段如下。

| 字段 | 值 |
| --- | --- |
| `unknown_id` | `unk_` 加 `domain`、`question`、`scope_digest`，以及存在时的 `comparison_conclusion_scope` 的 SHA-256 |
| `revision` | 从 1 开始的整数 |
| `previous_revision_digest` | 前一修订的摘要，第 1 版为 `null` |
| `revision_digest` | 去掉本字段后的记录 SHA-256 |
| `scope_digest` | 主体产物的 SHA-256，或 `null` |
| `question` | 非空文本，折叠空白 |
| `status` | `open`、`investigating`、`blocked`、`contradicted`、`resolved` |
| `severity` | `low`、`medium`、`high`、`critical` |
| `domain` | 自由文本，rea 自己的比较为 `function-comparison` |
| `comparison_conclusion_scope` | 可选：相关比较的 `ev_` id 及未知项涉及的维度，仅用于 `function-comparison` 域 |
| `supporting_evidence_ids`、`contradicting_evidence_ids` | `ev_` id，同一 id 不可同时在两列表中 |
| `required_authority`、`required_confidence`、`required_environment` | 哪些证据可以解决问题 |
| `recommended_probes` | `operation` 与 `rationale` 对 |
| `relationships` | 对另一个 `unk_` id 的 `depends-on`、`related-to` 或 `contradicts` 关系 |
| `resolution` | `null`，或至少有一个 `ev_` id 的 `verified`，或 `withdrawn`、`out-of-scope` |
| `mutation_evidence_ids` | 改变本未知项的记录的 `ev_` id，至少一项 |

模式拒绝违反十一条规则中任意一条的记录。四条维护标识与修订链：未知项 id 必须匹配自身字段哈希；修订摘要必须匹配；只有第 1 版没有前驱；只有已解决未知项能携带解决说明。

其他七条检查证据与链接。被反驳的未知项需要反驳证据。未知项不能关联自己，关系不可重复。证据 id 不可在一个列表中重复，也不可同时支持和反驳未知项。比较范围必须指明支持或反驳该未知项的比较，且仅允许用于 `function-comparison` 域。

id 让问题成为标识。`createResidualUnknown` 折叠问题空白，再对 `domain`、`question`、`scope_digest`，以及存在时的比较范围的规范 JSON 求哈希。同一域中关于同一目标的相同问题，始终有相同 `unk_` id。因此第二次对同一问题调用 `record_unknown` 返回 `already-exists`。输入指明反驳证据时，初始状态为 `contradicted`，否则为 `open`。

改变产生新修订，绝不原地编辑。`update_unknown` 接收 `expected_revision` 和完整新状态。未知 id 返回 `not-found`，预期修订过期返回 `revision-conflict`。新修订的 `revision` 加一，以旧 `revision_digest` 作为 `previous_revision_digest`。

`list_unknowns` 按 `status`、`severity`、`domain` 过滤，按 id 顺序返回当前版本，默认全部返回。提供 `offset` 和 `limit` 可分页。结果给出 `total` 和 `next_offset`，末页为 `null`。

每次变更本身也是 Evidence 记录。provider 为 `rea-unknown-registry`，版本 `1`，谓词类型 `rea.residual-unknown-mutation`，置信度 `derived`，权威来源 `analyst-inference`。限制只有一项："Registry mutation evidence records analyst intent, not proof of the answer." 未知项的 `mutation_evidence_ids` 指向这些记录，因此两个账本共享哈希链接的历史。

```figure
id: fig-5-2
kind: structure
title: ResidualUnknown 及其修订链
claim: 未知项跨修订保持 id，每个修订指明前一版摘要，每次变更写入独立 Evidence 记录。
caption: 从左向右读。第 1 版是 registerFunctionComparisonTool.ts 为 capture/out/10-mcp-21-compare-functions-total.json 中 _total 比较记录的未知项。右列显示 update_unknown 调用改变的字段。
```

## rea 自己创建的未知项

agent 用 `record_unknown` 创建未知项，rea 也会自行创建。`compare_functions` 在状态不是 `unchanged` 时就创建一项，域为 `function-comparison`。`changed` 比较的严重性为 `medium`，支持证据是左档案和比较记录，反驳证据是右档案，因此初始状态为 `contradicted`。

`unknown` 比较的严重性为 `high`，三条记录都支持它。每个未知项在 `comparison_conclusion_scope` 中指明比较。`changed` 比较列出改变的维度；`unknown` 比较列出未知维度并加入 `overall`。两者都要求 `shipped-artifact` 权威来源和 `observed` 置信度，都推荐一次 `analyze_function` 探测，理由为 "Capture complete dossiers for both functions under the same target context."

采集两次触发这条规则。`10-mcp-21-compare-functions-total.json` 的 `_total` 比较为 `changed`，创建严重性 `medium`、状态 `contradicted` 的未知项。`10-mcp-20-compare-functions-percent-change.json` 的 `_percent_change` 在 references 维度为 `unknown`，创建严重性 `high`、状态 `open`、范围为 `overall` 与 `references` 的未知项。

两个记录都没有出现在文件中，因为两次 bundle 导出均早于任何比较。因此采集所有计数都是 `"unknowns": 0` 或 `"unknown_revisions": 0`。`rea compare` 摘要为未知项历史分别保留 `unknowns_added`、`unknowns_advanced`、`unknowns_diverged` 计数（`14-compare-bundles.json`），同样全部为零。

工作流工具无法完成时也会如此。该标签的用户错误目录列出各工具记录的问题，例如重建验证的 "Does the reconstruction satisfy every declared claim?"。[第 35 课](phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns)用 Python 构建同样账本，以问题作为标识，以所需权威来源作为关闭条件。

```takeaways
- 把空列表称为“没有”之前，先读 `relationship_coverage` 与 `limitations`。
- 用 `record_unknown` 记录开放问题，指明解决它所需的权威来源。
- 向 `update_unknown` 传入 `expected_revision`，遇到 `revision-conflict` 后重新读取未知项。
- 只能用观测记录的 `evidence_ids` 关闭未知项，不能只写一句话。
```

Sources: capture/out/10-mcp-09-analyze-function-percent-change-O1.json, capture/out/11-inspect-evidence-bundle-O1.json, capture/out/10-mcp-14-export-evidence-bundle-O1.json, capture/out/10-mcp-20-compare-functions-percent-change.json, capture/out/10-mcp-21-compare-functions-total.json, capture/out/14-compare-bundles.json, capture/out/15-js-app-view-summary.json; phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns; rea 6.7.0 at 27dc42d: src/domain/residualUnknown.ts, src/domain/relationshipCoverage.ts, src/domain/evidence.ts, src/application/binary/BinarySession.ts, src/application/investigation/EvidenceLedger.ts, src/application/investigation/UnknownEvidence.ts, src/server/registerSessionRecordTools.ts, src/server/registerFunctionComparisonTool.ts, src/server/recordDerivedEvidence.ts, docs/user-visible-errors.csv; rea docs/ghidra-provider.md, rea docs/tool-design.md, rea docs/mcp-contracts.md
