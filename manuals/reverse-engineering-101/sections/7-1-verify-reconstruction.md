# verify_reconstruction

> verify_reconstruction 根据一条比较记录评判每个声明；pass 表示提供器文本匹配，绝不表示两个函数等价。

磁盘上已有 `ledger.c` 的 `-O1` 与 `-O2` 两个可执行文件，以及[第 5.5 节](#s-compare-and-compare-functions)中的两条 `compare_functions` 记录。你想让 rea 判断两个版本的 `total` 是否相同。对应工具是 `verify_reconstruction`。捕获运行调用了一次，提交四个声明，得到两个通过、两个失败。读完本节，你可以编写结构声明规格，读取 rea 为每个声明返回的状态，并说明通过能证明什么、不能证明什么。

## 声明规格

**规格：** `verify_reconstruction` 的输入，包含 `name` 和至少一个声明。每个声明包含 `claim_id`、`title`、`kind`、`dimension`、`comparison_evidence_id`（capture/out/10-mcp-02-tools-list.json）。最后一项是当前会话中已有比较记录的 `ev_` 标识。kind 指明记录的生产者：`behavioral` 声明指向 `compare_process_captures`，`structural-function` 指向 `compare_functions`，`structural-artifact` 指向 `compare_artifacts`。`structural-function` 使用九个维度之一：`overall`、`identity`、`pseudocode`、`assembly`、`comments`、`calls`、`references`、`strings_names`、`cfg`。

捕获工具针对[第 5.5 节](#s-compare-and-compare-functions)的两条比较记录建立四个声明：`percent_change` 的伪代码与汇编，以及 `total` 的伪代码与汇编。

```listing
title: 捕获运行发送的规格
source: capture/out/10-mcp-22-verify-reconstruction.json
lang: json
note: 省略了第二和第三个声明。同一文件中，请求之后紧接响应。
---
{
  "request": {
    "jsonrpc": "2.0",
    "id": 22,
    "method": "tools/call",
    "params": {
      "name": "verify_reconstruction",
      "arguments": {
        "specification": {
          "name": "ledger functions rebuilt at -O2 against the -O1 build",
          "claims": [
            {
              "claim_id": "percent-change-pseudocode",
              "title": "percent_change: the Ghidra pseudocode is the same text in the -O1 and -O2 builds",
              "kind": "structural-function",
              "dimension": "pseudocode",
              "comparison_evidence_id": "ev_2161e17a…"
            },
            …
            {
              "claim_id": "total-assembly",
              "title": "total: the Ghidra assembly is the same text in the -O1 and -O2 builds",
              "kind": "structural-function",
              "dimension": "assembly",
              "comparison_evidence_id": "ev_40ba96d8…"
            }
          ]
        }
      }
    }
  },
  …
}
```

此工具没有 CLI 命令。它属于 65 个没有 CLI 命令的 MCP 工具，因此无法通过单次 `rea` 调用运行。MCP 处理器用 `session.exportEvidenceBundle()` 取得当前连接的证据包，再按包验证规格。声明引用的比较标识不在包中时，整次调用以 `Missing comparison Evidence` 失败。比较的两个来源若不是 `analyze_function` 记录，也无法通过来源检查。

这条规则解释了捕获顺序。第 15 步的 `close_binary` 清除了 `-O1` 目标保留的记录。第 20、21 步将两份 `-O1` 函数档案重新放回台账：`compare_functions` 先记录两个内联输入，再记录比较结果。第 23 步的 `import_evidence_bundle` 随后报告 `imported: 6`、`total: 15`（capture/out/10-mcp-23-import-evidence-bundle-O1.json）。`O1` 包含八条记录，其中两条已由前述比较恢复。

## rea 返回了什么

与其他结果一样，响应也是 Evidence 记录：`subject: null`，提供器为版本 `1` 的 `rea-reconstruction-verifier`，谓词为 `rea.reconstruction-verification`，`confidence: "derived"`，`authority: "analyst-inference"`。`parameters` 包含规格的 SHA-256 和声明标识，因此声明变化会改变记录标识。

```listing
title: 验证记录的头部与汇总
source: capture/out/10-mcp-22-verify-reconstruction.json
lang: json
note: 省略了 analysis_profile、逐声明条目、探测建议与证据链接。
---
      "structuredContent": {
        "evidence_id": "ev_ccbaea4b…",
        "subject": null,
        "provider": {
          "id": "rea-reconstruction-verifier",
          "name": "REA reconstruction verifier",
          "version": "1"
        },
        …
        "normalized_result": {
          "status": "fail",
          "specification_sha256": "9e8d22fa…",
          "summary": {
            "total": 4,
            "passed": 2,
            "failed": 2,
            "unknown": 0,
            "behavioral": 0,
            "structural": 4
          },
          …
          "limitations": [
            "Pass means every declared claim passed; it does not establish global implementation equivalence."
          ]
        },
        "confidence": "derived",
        "authority": "analyst-inference",
        …
```

总体 `status` 遵循一条规则：任何声明失败则为 `fail`；否则，任何声明未决则为 `unknown`；否则为 `pass`。`summary` 按状态和类别统计声明。记录自己的 `limitations` 还包含 "Artifact identity is unavailable for this observation."；`createEvidence` 会为每条没有 subject 的记录附加此限制。

## 单个声明的状态

**声明状态：** `pass`、`fail` 或 `unknown`，按照固定顺序由三项输入计算。首先，任何限制都会使声明变为 `unknown`。其中一种限制来自来源的权威性。

来源档案中不完整的调用覆盖也属于限制。它适用于 `calls` 声明，以及没有其他变化维度的 `overall` 声明。其次，观测状态为 `changed`、`added`、`removed` 或 `contradiction` 时，声明为 `fail`。第三，观测状态为 `unknown`、`truncated`，或者比较中存在未关闭的残留未知项时，声明为 `unknown`。其他情况均为 `pass`。

对于 `structural-function` 声明，观测状态就是比较记录中指定维度的 `status`。

```listing
title: total-assembly 声明
source: capture/out/10-mcp-22-verify-reconstruction.json
lang: json
note: 省略了 evidence_links 数组和 30 条限制中的 28 条。Residual unknown 一行是此声明在比较记录原有限制之外附加的内容。
---
                "claim_id": "total-assembly",
                "kind": "structural-function",
                "dimension": "assembly",
                "status": "fail",
                "observed_status": "changed",
                "comparison_evidence_id": "ev_40ba96d8…",
                "left_evidence_ids": [
                  "ev_a1fe53ff…"
                ],
                "right_evidence_ids": [
                  "ev_bfe3275b…"
                ],
                …
                "unknown_ids": [
                  "unk_823f4184…"
                ],
                "limitations": [
                  "Artifact identity is unavailable for this observation.",
                  …
                  "Residual unknown: Function comparison is changed (comparison ev_40ba96d8…)",
                  …
                ]
```

两个 `percent_change` 声明通过，尽管比较记录 `ev_2161e17a` 的总体状态为 `unknown`。每个声明只读取自身维度，而该记录报告伪代码、汇编均为 `unchanged`。唯一未知的维度为 `references`。它创建的残留未知项只涉及 `overall` 与 `references`，因此两个声明的 `unknown_ids` 都不包含它。若声明针对 `references` 或 `overall`，结果就会是 `unknown`。

两个 `total` 声明失败，因为 `ev_40ba96d8` 的伪代码与汇编均为 `changed`，八个维度中共有五个变化。`unknown_ids` 不是验证器凭空创造的。`compare_functions` 在状态不为 `unchanged` 时总会记录残留未知项；变化时问题为 `Function comparison is changed (comparison ev_...)`，严重程度为 `medium`。验证器在包中找到该未知项，将标识列入两个 `total` 声明，并将问题复制到限制中。声明仍为 `fail`，因为按照前述优先顺序，变化的观测结果优先于未关闭的未知项。

若某个声明变为 `unknown`，调用还会额外记录自己的未知项。总体状态为 `unknown` 时，处理器记录问题 "Does the reconstruction satisfy every declared claim?"，并附上验证器推荐的探测。`pass` 与 `fail` 不新增未知项，此处 `recommended_probes` 为空。

```figure
id: fig-7-1
kind: tree
title: 两条比较记录上的四个声明
claim: 每个声明从一条比较记录的一个维度取得状态，total 声明还携带 compare_functions 记录的未知项。
caption: 自上而下阅读。验证记录引用四个声明，每个声明引用一条比较记录，每条比较记录又引用左右两份函数档案。琥珀色声明通过，玫红色虚线声明失败。标识截为前八位十六进制字符。来源：capture/out/10-mcp-22-verify-reconstruction.json。
```

## 通过不能证明什么

每条验证记录的固定限制已说清："Pass means every declared claim passed; it does not establish global implementation equivalence."。`structural-function` 维度通过的声明仅为“提供器文本相同”，因为 `compare_functions` 逐行比较 Ghidra 打印的伪代码与汇编。每条比较记录的这两个维度都附有告诫："Exact provider text is compared without address or generated-name normalization; layout-only differences do not establish a behavior change."。汇编维度还补充："Assembly is opaque provider text; relocation normalization is unavailable."（capture/out/10-mcp-20-compare-functions-percent-change.json）。rea 6.7.0 不运行函数，也不编译函数。声明通过仅表示两份反编译输出逐行相同，失败则表示不同。

对 `ledger` 样例有两个后果。两个构建来自相同源码行，`total` 声明仍失败：`-O2` 将循环展开为 62 条指令，`-O1` 只有 13 条（capture/out/10-mcp-11-analyze-function-total-O1.json、capture/out/10-mcp-18-analyze-function-total-O2.json）。文本不同不等于行为不同。

反过来也成立。查找表常量错误的重建版本可能与原函数具有相同汇编文本。文本不会显示那一个不同的数据字节，因此错误函数也能通过文本声明。[第 7.2 节](#s-a-proof-harness-outside-rea)将构建两项检查来解决这两种情况。

rea 仓库内部使用更完整的验证器。文档中的 readiness 页面介绍了 `npm run verify:readiness`：包含九个阶段的一致性运行，其中一个阶段名为 `verify-reconstruction-closure`，并明确说明其性质：

```rule
label: readiness 验证器不是公共工具
source: readiness Reconstruction readiness conformance
---
该报告评估器属于仓库内的 verifier，不是公开的 REA 工具。
```

应将它的聚合规则复用到自己的验证框架：

```rule
label: 任何弱于 pass 的状态都不能汇总为 pass
source: readiness Required stages
---
`fail`、`unknown`、`unsupported`、`truncated` 或 `skipped` 中任一状态都不能汇总为 `pass`。
```

```takeaways
- 调用 verify_reconstruction 前，将两份函数档案与比较记录放进同一个连接。
- 先阅读每个声明的 observed_status 与 unknown_ids，再看总体状态。
- 将通过的结构声明视为“Ghidra 文本相同”，行为与字节仍需自行证明。
- 在 close_binary 前导出证据包，因为关闭会清除保留的记录。
```

Sources: capture/out/10-mcp-22-verify-reconstruction.json, 10-mcp-20-compare-functions-percent-change.json, 10-mcp-21-compare-functions-total.json, 10-mcp-11-analyze-function-total-O1.json, 10-mcp-18-analyze-function-total-O2.json, 10-mcp-23-import-evidence-bundle-O1.json, 10-mcp-02-tools-list.json, 10-mcp-session.txt; rea at rea-agents-6.7.0 (27dc42d): src/domain/reconstructionVerification.ts, src/domain/reconstructionUnknowns.ts, src/domain/functionCallCoverage.ts, src/server/registerInvestigationTools.ts, src/server/registerFunctionComparisonTool.ts, src/domain/functionComparisonDimensions.ts, src/domain/evidence.ts, src/cliCommandNames.ts; rea docs/reconstruction-readiness.md
