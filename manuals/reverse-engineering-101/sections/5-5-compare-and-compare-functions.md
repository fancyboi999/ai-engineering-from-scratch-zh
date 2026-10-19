# compare_functions 与 rea compare

> compare_functions 从八个维度比较两份档案，各自报告 unchanged、changed 或 unknown；assembly 维度是没有重定位归一化的文本差异。

你以 `-O2` 重建 `ledger.c`，想在相信关于 `-O1` 构建的主张前，知道编译器改变了哪些函数。采集依次打开两个构建，针对 `_percent_change` 和 `_total` 提问。读完本节，你能阅读比较记录，说明八个维度各自比较什么，也能指出为什么字节级证明仍在 rea 之外。

## 输入两份档案，输出一条派生记录

`compare_functions` 以 `left` 和 `right` 接收两条完整 Evidence，分别经 `parseEvidence` 解析，id 被篡改的记录会拒绝。两者都必须是谓词类型 `rea.analysis` 的 `analyze_function` 记录，否则返回 "Expected analyze_function Evidence"。采集传入的是之前几次调用收到的档案。

```listing
title: 跨两个构建比较 _percent_change 的请求
source: capture/out/10-mcp-20-compare-functions-percent-change.json
lang: json
note: 工具包保留各 evidence_id，用指明文件的标记替代完整档案。
---
"name": "compare_functions",
"arguments": {
  "left": {
    "evidence_id": "ev_b492c85e…",
    "record": "<cut by run.py: the complete analyze_function record, see 10-mcp-09-analyze-function-percent-change-O1.json>"
  },
  "right": {
    "evidence_id": "ev_142cc943…",
    "record": "<cut by run.py: the complete analyze_function record, see 10-mcp-17-analyze-function-percent-change-O2.json>"
  }
}
```

回答是 provider `rea-function-comparison` 版本 `1` 的新 Evidence 记录，谓词类型 `rea.function-comparison`、置信度 `derived`、权威来源 `analyst-inference`。两个输入 id 同时作为参数和 `evidence_links`。记录没有主体，因此带有产物标识不可用的自动限制（见[Evidence 记录](#s-the-evidence-record)）。记录自身前，先将两个输入记入会话账本，因此后来的[导入](#s-evidence-bundles-export-and-import)发现两个 O1 记录已存在。

```listing
title: _percent_change 比较的开头
source: capture/out/10-mcp-20-compare-functions-percent-change.json
lang: json
note: dimensions、changes 和 limitations 已省略。
---
"normalized_result": {
  "status": "unknown",
  "function_match": {
    "status": "matched",
    "method": "symbol",
    "left_name": "_percent_change",
    "right_name": "_percent_change"
  },
  "left_subject_sha256": "01b5d08b…",
  "right_subject_sha256": "8bbbaa58…",
  "summary": {
    "unchanged": 7,
    "changed": 0,
    "unknown": 1
  },
```

**函数匹配：** rea 判断两份档案描述同一函数的方法。按 `symbol` 为 `matched` 表示过程名相同。`mismatched` 或 `ambiguous` 以方法 `explicit` 报告，歧义匹配会让整个比较为 `unknown`。

## 八个维度

`compareDimensions` 按固定顺序运行八种比较：`identity`、`pseudocode`、`assembly`、`comments`、`calls`、`references`、`strings_names`、`cfg`。每个维度有 `unchanged`、`changed`、`unknown` 状态，以及左右摘要、左右计数；两个文本维度还有 `text_delta`，此外还有 `conclusion_kind`。任意维度未知则整体为 `unknown`，否则任意维度改变则为 `changed`，否则为 `unchanged`。

任一档案在 `facet_availability` 中声明所需切面不可用时，该维度也为 `unknown`，计数为 null。没有声明的空切面同样如此。calls 维度还会读取 `relationship_coverage`。

| 维度 | 比较内容 | `_percent_change` | `_total` |
|---|---|---|---|
| `identity` | 规范化过程标识 | unchanged | unchanged |
| `pseudocode` | 按行比较反编译文本 | unchanged，272 与 272 个码点 | changed，300 到 2904 个码点 |
| `assembly` | 按行比较清单文本 | unchanged，161 与 161 | changed，336 到 1866 |
| `comments` | 规范偏移处的注释文本 | unchanged，0 与 0 | unchanged，0 与 0 |
| `calls` | 已解析被调用函数 | unchanged，1 与 1 | unchanged，1 与 1 |
| `references` | 引用端点与类别 | unknown，3 与 3 | changed，4 到 13 |
| `strings_names` | 引用的字符串与名称 | unchanged，1 与 1 | changed，2 到 11 |
| `cfg` | 地址规范化后的基本块与边 | unchanged，3 与 3 | changed，5 到 16 |

## 一个未知维度

`_percent_change` 有七个 `unchanged`、一个 `unknown`，整体因此为 `unknown`。未知维度是 `references`。两边都有三项引用，命名端点相同，但各有一个入引用是没有来源过程的 `DATA`，其端点没有名称。

```listing
title: _percent_change 比较的 references 维度
source: capture/out/10-mcp-20-compare-functions-percent-change.json
lang: json
note: 维度内部无省略。
---
{
  "dimension": "references",
  "left_count": 3,
  "right_count": 3,
  "evidence_links": [
    "ev_b492c85e…",
    "ev_142cc943…"
  ],
  "limitations": [
    "Unnamed reference endpoints have no stable identity across different artifacts, so equal named endpoints do not establish equal references."
  ],
  "status": "unknown",
  "left_digest": null,
  "right_digest": null,
  "text_delta": null,
  "conclusion_kind": "unresolved_branch"
},
```

这条规则只用于来自不同文件的档案。同一文件内，地址是稳定标识。`-O1` 与 `-O2` 是不同文件，rea 因此不能认定左侧未命名端点就是右侧那个。边类别不同时仍算改变，所以 `_total` 的 references 为 `changed`。

先读摘要，再读整体状态。一个未知维度会使整体为 `unknown`，并创建严重性 `high` 的剩余未知项（见[剩余未知项](#s-residual-unknowns-and-coverage)）。其他七个维度保留自身状态。关于 `_percent_change` 伪代码或汇编的主张仍能通过（见[验证](#s-verify-reconstruction)）；关于 `references` 或 `overall` 的主张则不能。

两个比较的 `calls` 维度都有两项限制，各对应一侧，均说明只返回 Ghidra 已解析调用引用。限制限定 `unchanged` 的含义，不改变状态。

## 文本维度

两个文本维度是有预算的行差异：100 毫秒、10,000 次编辑。耗尽预算后，维度为 `unknown`，限制为 "Bounded line diff exceeded its time or edit-distance limit."。计数是文本码点数，`text_delta` 报告增加行、删除行和差异块。两个文本维度均带限制 "Exact provider text is compared without address or generated-name normalization; layout-only differences do not establish a behavior change."

`_total` 的伪代码在 11 个差异块中增加 109 行、删除 11 行（`10-mcp-21-compare-functions-total.json`）；汇编在 2 个差异块中增加 61 行、删除 12 行。`-O2` 的 `_total` 有 16 个基本块，`-O1` 为 5 个；引用从 4 个变为 13 个。这些是 rea 陈述的事实，记录到此为止。编译器为何这样改变，需要你用两份汇编清单回答。

```figure
id: fig-5-6
kind: comparison
title: 用 compare_functions 比较 -O1 与 -O2 的两个函数
claim: 编译器让 _percent_change 七个维度不变、references 未知，让 _total 五个维度改变；rea 报告数量，不解释原因。
caption: 每表从上向下读。琥珀色行是改变的维度，虚线行是未知。依据 capture/out/10-mcp-20-compare-functions-percent-change.json 与 10-mcp-21-compare-functions-total.json。
```

## 汇编维度的限制

无论状态是 `unchanged` 还是 `changed`，每个 assembly 维度都带两项限制。

```listing
title: _total 比较的 assembly 维度
source: capture/out/10-mcp-21-compare-functions-total.json
lang: json
note: 维度内部无省略。
---
{
  "dimension": "assembly",
  "left_count": 336,
  "right_count": 1866,
  "evidence_links": [
    "ev_a1fe53ff…",
    "ev_bfe3275b…"
  ],
  "limitations": [
    "Exact provider text is compared without address or generated-name normalization; layout-only differences do not establish a behavior change.",
    "Assembly is opaque provider text; relocation normalization is unavailable."
  ],
  "status": "changed",
  "left_digest": "40e2d441…",
  "right_digest": "e1140153…",
  "text_delta": {
    "added_lines": 61,
    "removed_lines": 12,
    "hunks": 2
  },
  "conclusion_kind": "derived_relationship"
},
```

任何差异计算之前，rea 就附加这些字符串。档案汇编是 Ghidra 清单文本，地址与已解析操作数都在文本中。工具逐行比较，不解码指令，不知道链接器会修改哪些操作数字节，也无法屏蔽它们。同一代码在不同地址的两个副本会得到 `changed`，可重定位对象与链接映像比较也会得到 `changed`。跨引擎亦然：档案来自不同 provider 时，两个文本维度都变为 `unknown`，限制为 "Exact text comparison requires one provider identity."。

因此 assembly 的 `unchanged` 表示同一引擎文本相等，`changed` 表示文本不同，二者都不陈述字节。字节级证明将重定位字段清零，并比较引用表。[第 36 课](phases/13-tools-and-protocols/36-rebuild-and-prove-equal)构建证明，第 7 部分对同一夹具运行它。references 也有自身限制，因为它比较端点而非类别："Reference endpoints differ independently of provider reference-kind metadata."。

## 对两个 bundle 运行 rea compare

`rea compare LEFT RIGHT`，也可写为 `rea compare-bundles`，无需会话即可比较两个 bundle 文件。按 `evidence_id` 工作：两边都有的记录参与比较，只有一边有的记录是未解决分支。只要有一个变更未解决，整体就是 `unknown`。

```listing
title: 对 O1 与 O2 bundle 运行 rea compare
source: capture/out/14-compare-bundles.json
lang: json
note: 十项变更省略九项，末尾限制也已省略。
---
{
  "status": "unknown",
  "left_bundle_sha256": "47160c2d…",
  "right_bundle_sha256": "e0a9fe04…",
  "summary": {
    "records_unchanged": 0,
    "records_added": 0,
    "records_removed": 0,
    "records_changed": 0,
    "unknowns_unchanged": 0,
    "unknowns_added": 0,
    "unknowns_removed": 0,
    "unknowns_advanced": 0,
    "unknowns_diverged": 0,
    "unresolved": 10
  },
  "changes": [
    {
      "entity": "evidence",
      "key": "ev_142cc943…",
      "classification": "unknown",
      "conclusion_kind": "unresolved_branch",
      "left_evidence_ids": [],
      "right_evidence_ids": [
        "ev_142cc943…"
      ],
      "left_digest": null,
      "right_digest": "142cc943…",
      "limitations": [
        "EvidenceBundle has no inventory completeness marker; one-sided membership may reflect incomplete capture."
      ]
    },
```

十项未解决，没有 unchanged，没有 removed。两个 bundle 来自不同文件 `ledger-arm64-O1`、`ledger-arm64-O2`，没有共同 `evidence_id`，十条记录全部为单侧。工具不称单侧记录为 `removed`，因为 bundle 没有完整性标记。

报告的摘要是规范字节的摘要。`47160c2d` 是去掉工具包尾随换行后的 O1 摘要（见[导出与导入](#s-evidence-bundles-export-and-import)）。`rea compare` 对同一构建的两个 bundle 回答“证据集改变了什么”；对两个构建，则应逐函数使用 `compare_functions`。

```takeaways
- 向 `compare_functions` 传完整 `analyze_function` 记录，不传摘要或视图。
- 先读 `summary.unknown`，再读未知与改变维度，最后读 `limitations`。
- assembly 不变表示同一引擎的文本相等，绝不表示字节相等。
- 对同一构建的 bundle 运行 `rea compare`，否则预期每条记录都未解决。
```

Sources: capture/out/10-mcp-20-compare-functions-percent-change.json, capture/out/10-mcp-21-compare-functions-total.json, capture/out/14-compare-bundles.json, capture/out/12-evidence-export.txt; phases/13-tools-and-protocols/36-rebuild-and-prove-equal; rea 6.7.0 at 27dc42d: src/domain/functionComparisonSchemas.ts, src/domain/functionComparisonDimensions.ts, src/domain/functionComparisonNormalization.ts, src/domain/functionComparisonResults.ts, src/domain/bundleComparison.ts, src/server/registerFunctionComparisonTool.ts, src/cliEvidenceCommands.ts, src/application/EvidenceBundleCommands.ts; rea docs/mcp-contracts.md
