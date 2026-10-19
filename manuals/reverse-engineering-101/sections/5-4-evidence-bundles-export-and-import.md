# export_evidence_bundle、evidence-export 与 evidence-import

> Evidence bundle 是规范 JSON 中七个已排序数组，因此 MCP 服务和 CLI 对相同记录生成相同字节。

今晚 agent 的 MCP 连接关闭，它在 `ledger-arm64-O1` 收集的八条记录也随之消失。明天同事想在另一台 Mac 上检查它们，不使用 Ghidra。读完本节，你能将会话导出为 bundle，不依赖引擎读取摘要，也能将其导入新会话或 CLI 检查。

## export_evidence_bundle

**Evidence bundle：** 包含七个数组的 JSON 对象：`artifacts`、`providers`、`environments`、`scenarios`、`captures`、`unknowns`、`records`。前五个由记录本身构建，保存按摘要、格式、架构区分的主体，去重的 provider 和环境，再是受控重放记录与进程采集记录。records 按 `evidence_id` 排序，顺序没有其他含义。

MCP 工具接收 `path` 和 `overwrite` 标志，返回路径、字节数、记录数和未知项数。

```listing
title: 对 ledger-arm64-O1 调用八次后的 export_evidence_bundle
source: capture/out/10-mcp-14-export-evidence-bundle-O1.json
lang: json
note: 请求和结果的文本副本已省略。
---
"structuredContent": {
  "result": {
    "path": "$WORK/bundle-O1.json",
    "bytes": 178853,
    "records": 8,
    "unknowns": 0
  }
}
```

写入采用规范形式且是原子的。`writeEvidenceBundle` 再次验证 bundle，流式输出规范 JSON 片段。`writeTextParts` 以 `wx` 和 `0600` 模式创建暂存文件并同步。`overwrite` 为 true 时重命名覆盖目标，否则在目标不得存在时用硬链接发布。契约同样说明："Complete bundle exports stream canonical JSON into an atomically published file." {{mcp Tool results}}

采集将服务写入文件复制为 `11-bundle-O1.json`，屏蔽采集目录并追加换行。七个数组包含一个产物、一个 provider，没有环境、场景、采集、未知项，以及八条记录。

```listing
title: 采集的两个 bundle 文件
source: capture/out/11-bundles.txt
lang: text
note: 无省略。
---
94fca3db…  178398  11-bundle-O1.json (the bytes export_evidence_bundle wrote, with the capture path masked and a newline added)
6130b135…  286433  11-bundle-O2.json (the bytes export_evidence_bundle wrote, with the capture path masked and a newline added)
```

## inspect-evidence-bundle

读取 bundle 不需要 rea 引擎或会话。`rea inspect-evidence-bundle` 接收含 `path`、`detail` 和可选 `filters` 的 JSON 参数，为每条记录输出一行，不含载荷。MCP 工具 `get_evidence_bundle` 为实时会话记录使用相同投影。

```listing
title: O1 bundle 摘要的首行与首个档案行
source: capture/out/11-inspect-evidence-bundle-O1.json
lang: json
note: 每行的主体与 provider、第二行及最后五行已省略。
---
{
  "kind": "evidence-bundle-summary",
  "filters": {},
  "total_retained_records": 8,
  "matching_records": 8,
  "unknown_revisions": 0,
  "records": [
    {
      "evidence_id": "ev_2c883c7b…",
      …
      "operation": "procedure_assembly",
      …
      "limitation_count": 6,
      "native_dossier": {
        "available": false,
        "reason": "different-operation"
      }
    },
    …
    {
      "evidence_id": "ev_41e8ca1c…",
      …
      "operation": "analyze_function",
      "confidence": "observed",
      "authority": "shipped-artifact",
      "analysis_profile_digest": "3fc72c9b…",
      "retention": "complete-record",
      "limitation_count": 10,
      "native_dossier": {
        "available": true,
        "procedure_address": "0x100000518",
        "procedure_name": "_grade",
        …
```

行按 `evidence_id` 排序，因此首行是 `procedure_assembly` 记录，`_grade` 档案为第三行。非档案行的 `native_dossier` 为不可用，原因为 `different-operation`。八行包括 `_percent_change`、`_grade`、`_total`、`_grade_label` 四份 `analyze_function` 档案，以及 `list_procedures`、`procedure_assembly`、`xrefs`、`list_strings` 各一条。每行有相同配置摘要 `3fc72c9b…`，因为均由同一 Ghidra 会话产生。O2 bundle 有两行，即 -O2 构建的 `_total` 和 `_percent_change` 档案（`11-inspect-evidence-bundle-O2.json`）。契约列出摘要接受的过滤器："Optional `filters` match exact `evidence_id`, `operation`, `target_sha256`, `analysis_profile_digest` or `procedure_address`." {{mcp Tool results}}

## CLI 中的 evidence-export 与 evidence-import

`rea evidence-export SOURCE OUTPUT` 读取并验证 bundle，再按规范形式写入，返回路径、字节数、记录数。采集将 `11-bundle-O1.json` 导出为工作文件，比较两者摘要。

```listing
title: 相同记录的 MCP 导出与 CLI 导出
source: capture/out/12-evidence-export.txt
lang: text
note: 无省略。
---
94fca3db…  178398  export_evidence_bundle over MCP, out/11-bundle-O1.json
47160c2d…  178397  evidence-export over the CLI, $WORK/canonical-O1.json
same bytes as the MCP export: no
same JSON content as the MCP export: yes
```

一个字节的差异就是工具包给副本追加的换行。去掉后，副本为 178,397 字节，摘要 `47160c2d`，与 CLI 文件一致。MCP 服务与 CLI 为相同记录写入相同规范字节，兑现了本节开头的主张。

`rea evidence-import PATH` 验证 bundle 并报告数量。CLI 没有会话，因此 `imported`、`total` 都是文件记录数，`13-evidence-import.json` 中为 `{"imported": 8, "unknowns_added": 0, "total": 8}`。CLI 文档划清边界："Separate CLI calls consume full saved records." {{cli Import, export and compare Evidence}}

## 用 import_evidence_bundle 导入实时会话

MCP 中，同名操作合并到连接的账本。处理器读取验证文件，调用 `importEvidenceBundle`，返回新增记录数、新增未知项修订数和新总数。账本加入尚未持有的记录，保留已有记录；相同 id 但内容不同会被拒绝并报 "Conflicting evidence record"。

```listing
title: 将 O1 bundle 导入分析 O2 的会话
source: capture/out/10-mcp-23-import-evidence-bundle-O1.json
lang: json
note: 请求和结果的文本副本已省略。
---
"result": {
  "imported": 6,
  "unknowns_added": 0,
  "total": 15
}
```

八项加入六项，总数十五。会话之前关闭过 O1，而 `close_binary` 会清空账本："`close_binary` clears them, even when no binary is active." {{mcp Retained application Evidence inputs}} 打开另一目标或重启当前目标会保留记录。

因此 O2 打开时 O1 记录已消失。随后两次 `compare_functions` 内联传入 O1 的 `_percent_change` 与 `_total` 档案，工具在自身结果前记录两侧输入。这两个 O1 记录回到账本，导入只需加入另外六项。

十五项包括六条新记录和已有九条：

- 第 17、18 次调用产生的两个 O2 档案。
- 比较作为来源记录的两个 O1 档案。
- 第 20、21 次调用产生的两个比较记录。
- 第 22 次调用产生的 `verify_reconstruction` 记录。
- 两次比较创建的未知项的两条变更记录（见[剩余未知项](#s-residual-unknowns-and-coverage)）。

[图](#fig-5-5)跟踪 bundle 从会话到四种读取者的流向。

```figure
id: fig-5-5
kind: flow
title: 一个 bundle 从 MCP 会话到四种读取者
claim: 一个规范文件离开会话，CLI 摘要、CLI 导出、CLI 导入和第二个 MCP 会话均无需 Ghidra 即可读取。
caption: 从左向右读。青色实线是持久写入，墨色实线是调用。依据 capture/out/10-mcp-14-export-evidence-bundle-O1.json、11-bundles.txt、11-inspect-evidence-bundle-O1.json、12-evidence-export.txt、13-evidence-import.json 和 10-mcp-23-import-evidence-bundle-O1.json。
```

## 较早版本的 bundle

读取 bundle 的版本按自身哈希规则检查每个 id。工具包保留了 rea 6.5.0 为本手册写入的 O1 bundle，将其交给 6.7.0 的 `rea evidence-import`。导入以退出码 1 停止。

```listing
title: rea 6.7.0 拒绝 rea 6.5.0 的 O1 bundle
source: capture/out/13-evidence-import-rea-6.5.0.json
lang: json
note: 修复建议与详情已省略。
---
{
  "error": "Analysis failed",
  "code": "evidence_integrity_mismatch",
  "category": "integrity_mismatch",
  "message": "Evidence bundle does not match the bundle schema at records.3.evidence_id: Evidence semantic identifier does not match its record. Supply an unmodified bundle written by export_evidence_bundle or rea evidence-export.",
  "retryable": false,
  …
}
```

bundle 字节就是 6.5.0 写入的字节。6.5.0 从语义投影中排除值为 `null` 的 `relationship_coverage`，6.7.0 则将其按 `null` 哈希（见[Evidence 记录](#s-the-evidence-record)）。旧 bundle 的记录 0 到 2 是带覆盖的 `analyze_function` 档案，id 仍能验证。记录 3 是 `list_procedures`，首个覆盖为 `null` 的记录，因此最先失败。

错误不可重试，rea 不迁移已保存 Evidence。归档每个 bundle 时保留 rea 版本，才能用同版本重新读取。要在新版本使用旧证据，应以新版本重新运行分析，导出新 bundle。

```takeaways
- `close_binary` 会清空账本，先导出 bundle 再关闭。
- 导入任何位置前，先用 `rea inspect-evidence-bundle` 读取 bundle。
- 两人交换证据时比较 bundle 摘要，不比较文件名。
- 会话已有部分记录时，`imported` 小于总记录数是正常现象。
- 每个 bundle 一起归档 rea 版本，升级后重新生成证据。
```

Sources: capture/README.md; capture/out/10-mcp-14-export-evidence-bundle-O1.json, capture/out/10-mcp-23-import-evidence-bundle-O1.json, capture/out/11-bundle-O1.json, capture/out/11-bundles.txt, capture/out/11-inspect-evidence-bundle-O1.json, capture/out/11-inspect-evidence-bundle-O2.json, capture/out/12-evidence-export.json, capture/out/12-evidence-export.txt, capture/out/13-evidence-import.json, capture/out/13-evidence-import-rea-6.5.0.json, capture/fixtures/bundle-rea-6.5.0-O1.json; rea 6.7.0 at 27dc42d: src/domain/evidenceBundle.ts, src/server/registerSessionRecordTools.ts, src/application/EvidenceBundleFiles.ts, src/application/EvidenceBundleCommands.ts, src/application/JsonFiles.ts, src/cliEvidenceCommands.ts, src/cli/analysisViewCommands.ts, src/application/investigation/EvidenceLedger.ts, src/server/registerFunctionComparisonTool.ts, src/server/sessionEvidence.ts; rea docs/mcp-contracts.md, rea docs/cli.md
