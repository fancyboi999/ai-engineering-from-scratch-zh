# Evidence 字段

> 列出 6.7.0 每条 Evidence 的 16 个字段、类型和允许值，并给出捕获的 _percent_change 档案中的实例。

Evidence schema 是一个有 16 个字段的严格 Zod 对象。记录中出现未知字段就会被拒绝。`relationship_coverage` 是第十六个字段，必须存在，值可以是对象或 `null`，两种情况均计入标识 hash。

档案列取值来自 `ledger-arm64-O1` 中 `_percent_change` 的 `analyze_function` 记录 `ev_b492c85e`（capture/out/10-mcp-09-analyze-function-percent-change-O1.json）。推导记录列取自 `verify_reconstruction` 记录 `ev_ccbaea4b`（capture/out/10-mcp-22-verify-reconstruction.json）。[第 5.1 节](#s-the-evidence-record)对记录作文字解读。

## 16 个字段

| 字段 | 类型 | _percent_change 档案中的值 | 验证记录中的值 |
|---|---|---|---|
| `evidence_id` | `ev_` 加 64 位十六进制字符，语义投影的 SHA-256 | `ev_b492c85eb9570bd5f8e866f94523122c8600ea0106603d90e9ea5445cf757b2a` | `ev_ccbaea4b45697017422c68a0dcabbe574c7e1b498aa3f0f3a0b47e351b389e23` |
| `subject` | 分析文件 `{ name, digest.sha256, format, architecture, local_path }`，或 `null` | `ledger-arm64-O1`, `01b5d08b…`, `mach-o`, `arm64`, `$CAPTURE/fixtures/ledger-arm64-O1` | `null` |
| `provider` | `{ id, name, version }`，version 可为空 | `ghidra`, `Ghidra`, `12.1.4` | `rea-reconstruction-verifier`, `REA reconstruction verifier`, `1` |
| `analysis_profile` | `{ provider, parameters, digest }` 或 `null`，始终存在 | 25 个参数，摘要为 `3fc72c9b…` | `null` |
| `predicate_type` | 非空字符串 | `rea.analysis` | `rea.reconstruction-verification` |
| `operation` | 工具名称 | `analyze_function` | `verify_reconstruction` |
| `parameters` | 调用方输入对象 | `{ "procedure": "_percent_change" }` | `specification_sha256` 与四个 `claim_ids` |
| `raw_result` | 提供器原生值或 `null` | 含 `procedure`、`pseudocode` 等字段的桥接值 | `null` |
| `normalized_result` | 读者使用的规范化结果 | 从 `procedure` 到 `limitations` 共 16 个键 | `status`, `specification_sha256`, `summary`, `claims`, `recommended_probes`, `evidence_links`, `limitations` |
| `confidence` | `observed`、`derived` 或 `inferred` | `observed` | `derived` |
| `authority` | 下列五种值之一 | `shipped-artifact` | `analyst-inference` |
| `environment` | `{ id, platform, architecture, isolation }` 或 `null` | `null` | `null` |
| `limitations` | 字符串数组 | 十个字符串，从自动分析到 macOS 反编译器 | 两个字符串：产物身份与 pass 规则 |
| `relationship_coverage` | `{ status, ... }`，status 为 `complete`、`partial`、`unknown`，或整体为 `null` | `complete`，附有关于已解析调用引用的一条诊断 | `null` |
| `locations` | 下列五种位置结构的数组 | `[]` | `[]` |
| `evidence_links` | 推导本记录所依据的 `ev_` 标识 | `[]` | 六个标识：四份档案、两条比较 |

档案的 `normalized_result` 包含键 `procedure`、`pseudocode`、`assembly`、`comments`、`callers`、`callees`、`incoming_references`、`outgoing_references`、`unresolved_calls`、`referenced_strings`、`referenced_names`、`basic_blocks`、`native_api`、`native_value_flow`、`facet_availability`、`limitations`。`facet_availability` 说明提供器供应了八个侧面中的哪些。内部 limitations 描述这些侧面，记录自身的 `limitations` 则描述提供器会话。

## 枚举

| 字段 | 允许值 |
| --- | --- |
| `confidence` | `observed`, `derived`, `inferred` |
| `authority` | `shipped-artifact`, `controlled-replay`, `historical-reference`, `external-service`, `analyst-inference` |
| `environment.isolation` | `none`, `process`, `container`, `virtual-machine` |
| `locations[].kind` | `address` 携带 `address`，`address-range` 携带 `start` 和 `end`，`artifact-path` 携带 `path`，`file-offset` 携带 `offset`，`file-offset-range` 携带 `start` 和 `end` |
| `subject.format` | `hopper`, `analysis-database`, `mach-o`, `elf`, `pe`, `dos-mz`, `dos-com`, `raw-binary`, `zip`, `ipa`, `apk`, `msix`, `appx`, `hap`, `hsp`, `app-pack`, `asar`, `dmg`, `pkg`, `plist`, `javascript`, `source-map`, `directory`, `file`, `unknown`, `mach-o-universal`, `javascript-bundle`, `entitlements` |
| `subject.architecture` | `x86`、`x86_64`、`arm`、`arm64`、`mips`、`riscv`、`powerpc`、`hexagon` 或 `null`；`6502`、`m68k` 仅限 `raw-binary` subject |

格式限定可声明的架构。rea 认识十个家族，`6502`、`m68k` 仅支持原始二进制，因为文件头检测从不报告它们。`raw-binary` subject 可使用全部十种，其他格式排除这两种。`hexagon` 来自 ELF 文件头。

## 标识

标识是记录语义投影的 hash。投影保留 subject 的 `digest`、`format`、`architecture`，以及除 `evidence_id` 外的其他字段，省略 subject 的 `name` 与 `local_path`。因此对相同字节的相同观测，在任意机器、任意目录中都有相同标识。捕获检查不遮蔽标识，直接比较（capture/README.md）。`parseEvidence` 重新计算每条读入记录的 hash，拒绝不匹配记录。没有 subject 的记录在创建时会附加限制 "Artifact identity is unavailable for this observation."。

投影在 `relationship_coverage` 为 `null` 时也保留该字段。早期版本未将 `null` coverage 计入 hash，因此其记录无法通过当前检查。`evidence-import` 以 `evidence_integrity_mismatch` 拒绝此类包（capture/out/13-evidence-import-rea-6.5.0.json）。应使用当前运行的版本重新生成保存的 Evidence。

捕获中还出现另外两种标识相关摘要。`unk_` 标识用于残留未知项，对 `{ domain, question, scope_digest }` 求 hash；若未知项包含 `comparison_conclusion_scope`，也一并计入（[第 5.2 节](#s-residual-unknowns-and-coverage)）。`analysis_profile.digest` 是提供器及其参数规范 JSON 的 SHA-256。摘要不同的两条记录不能用 `compare_functions` 比较。

Sources: capture/out/10-mcp-09-analyze-function-percent-change-O1.json, 10-mcp-22-verify-reconstruction.json, 13-evidence-import-rea-6.5.0.json; capture/README.md; rea at 27dc42d: src/domain/evidence.ts, src/domain/relationshipCoverage.ts, src/domain/binaryTargetTypes.ts, src/domain/elfFixedHeader.ts, src/domain/residualUnknown.ts, src/domain/analysisProfile.ts
