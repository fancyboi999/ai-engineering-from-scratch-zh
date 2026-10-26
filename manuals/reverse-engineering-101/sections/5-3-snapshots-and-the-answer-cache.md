# AnalysisSnapshot 与精确匹配答案缓存

> 快照按绑定目标摘要与配置摘要的查询 id 缓存精确答案；一次变更调用开始分派，就会关闭缓存。

采集运行 `rea function fixtures/ledger-arm64-O1 NAME --provider ghidra` 四次，每个函数一次，每次耗时 7.9 到 9.0 秒（`capture/out/00-commands.txt`）。每次都将相同的 33,872 字节导入新 Ghidra 项目，再丢弃项目。你希望对同一文件的第二个问题没有这种成本。读完本节，你能说明快照能回答哪些调用，手动构建查询 id，也能预测 rea 何时拒绝重放或保存。

## 三种名为快照的事物

rea 中这个词涵盖三种东西，只有一种是可以保留的缓存。

**目标快照：** Ghidra 启动器以 `-readOnly` 和 `-deleteProject` 导入的输入私有副本。每个新的 provider session 都会重新导入目标；会话关闭后，这个副本随项目删除 {{mcp Ghidra first-query deadlines and recovery}}

**分析快照缓存：** 单会话内存表 `AnalysisSnapshotCache`，为一个目标标识保存最多 10,000 项。这是本节讨论的缓存。

**快照文件：** `close_binary` 写入、`open_binary` 读取的 JSON 文件。包含目标标识、provider 绑定、缓存条目和会话 Evidence bundle。CLI 文档说明，快照文件保存的是可复用观察，不是 provider 数据库。只有符合条件的精确查询能命中；新的或实时查询仍可能启动 provider {{cli Save and reuse analysis snapshots}}

## 查询 id

**查询 id：** `query_` 加包含目标、绑定、操作、参数四部分的规范 JSON 的 SHA-256。目标是不带路径的标识：`sha256`、`kind`、`format`、`architecture`。`raw-binary` 还带 `entry_point`。绑定是 provider 与分析配置。采集中对应以 `01b5d08b` 开头的摘要、`executable`、`mach-o`、`arm64`、Ghidra `12.1.4` 和下列配置。

```listing
title: 每个缓存键携带的 Ghidra 分析配置
source: capture/out/05-analyze-arm64-O1.json
lang: json
note: binary_overview 记录携带的配置。25 个参数中省略 20 个。
---
"upstream_analysis_profile": {
  "provider": {
    "id": "ghidra",
    "name": "Ghidra",
    "version": "12.1.4"
  },
  "parameters": {
    "target_kind": "executable",
    "target_format": "mach-o",
    "architecture": "arm64",
    …
    "function_references": "complete-body-and-entry-reference-manager-v2",
    …
    "analyzer_preset": "ghidra-default"
  },
  "digest": "3fc72c9b…"
},
```

参数是版本字符串，每项对应 Ghidra 适配器提供的一种观测契约。摘要是 provider 与 parameters 的规范 JSON 的 SHA-256。只有绑定的 provider 和摘要等于选定配置时，缓存项才匹配。发布版本若将 `function_references` 从 `-v2` 改为 `-v3`，摘要就改变，旧摘要下的每项都不再匹配。这就是本节所说的精确。

6.7.0 就是这样的发布。对这个 Mach-O 目标，参数列表保留 25 个名称，但两个值改变：`instruction_references` 从 `exact-address-incoming-v1` 变为 `exact-address-incoming-without-synthetic-entry-v2`；`function_boundary_observations` 从 `ghidra-function-boundary-limitations-v3` 变为 `-v4`。摘要从 `966e6016…` 变为 `3fc72c9b…`，因此没有 6.5.0 快照项能匹配 6.7.0 会话。bundle 摘要的八行都由同一 Ghidra 会话产生，因此均带摘要 `3fc72c9b…`（见[导出与导入](#s-evidence-bundles-export-and-import)）。

## 缓存回答哪些调用

在任何 provider 运行前，`isSnapshotCacheable` 判断调用能否由缓存回答。必须满足全部条件：

- 操作不是有状态操作 `health`、`current_address`、`current_procedure`、`current_document`、`goto_address`、`list_documents`。
- 以文档为范围的操作指明 `document`。
- 默认使用光标的操作，例如 `xrefs`，指明 `address`。
- 能力声明 `mutatesArtifact: false`、非 `live` 的 `cachePolicy`，且不改变权限。
- `cachePolicy` 为 `snapshot`，或者操作不写文件系统。

Ghidra 适配器将除变更操作和 `list_documents` 外的操作都标为 `cachePolicy: "snapshot"`。`prepareSessionExecution` 计算 id 并查找，`BinarySession` 命中时不接触 provider 就返回。重放答案多一项限制："Loaded from a local REA analysis snapshot; this call did not re-run the provider."。

重放记录使用当前打开目标的路径，`rebindEvidenceToTargetPath` 将路径写入存储记录。`evidence_id` 不变，因为路径在哈希外。Windows 上 Ghidra 重放前必须接纳源文件，因此命中缓存仍可能启动 provider。

未命中时运行 provider，将结果绑定配置和目标，再创建并记录 Evidence，按 id 保存缓存项。

采集没有展示重放，因为 25 次 MCP 调用中没有两次操作和参数相同。`open_binary` 后首次依赖 Ghidra 的调用是 `list_procedures`，无界面导入期间耗时 6 到 7 秒。之后对该目标的分析调用都不到 100 毫秒（`capture/out/10-mcp-session.txt`）。它们快是桥接层已经运行，不是缓存。重复一次 `"procedure": "_percent_change"` 的 `analyze_function` 才会是首次重放。

```figure
id: fig-5-4
kind: decision
title: 一次 analyze_function 调用经过快照缓存
claim: 可缓存调用变成涵盖目标、绑定、操作、参数的查询 id；变更调用在到达 Ghidra 前关闭缓存。
caption: 从上向下读。虚线回复是重放，实线调用是 provider 运行。琥珀色虚线箭头是变更调用分派前的状态改变。值来自 capture/out/10-mcp-09-analyze-function-percent-change-O1.json 与 10-mcp-04-binary-session.json。
```

## 保存与加载

`close_binary` 接收 `snapshot_path` 和 `overwrite`。`closeWithSnapshot` 等待进行中的调用结束，导出快照、写文件、关闭 provider。回执增加 `primitive_entries`、`workflow_entries`、`evidence_records`。`open_binary` 也接收 `snapshot_path`，打开目标前读取文件，将条目导入新会话。采集关闭两个目标时都没有提供路径，因此两次 `close_binary` 结果为 `null`（`10-mcp-15-close-binary-O1.json`、`10-mcp-25-close-binary-O2.json`）。

CLI 通过 `--snapshot` 使用快照。精确 CLI 缓存命中时，通常会在启动 provider 进程前读取结果 {{cli Save and reuse analysis snapshots}}。Windows 上的 Ghidra provider 可能仍会先启动，因为它必须接收源文件。

加载文件会完整检查。条目必须按规范 id 排序，每个查询 id 都重新计算并匹配，id 不得重复。每项都必须在 bundle 中有配置与结果相同的 Evidence 记录。bundle 记录若针对另一目标，整个文件失败。

写入是原子的：先以 `0600` 模式暂存、同步，再重命名或硬链接到目标位置。导入到目标或配置不同的会话时报 "Analysis snapshot profile_mismatch: target, provider, or analysis profile does not match the active binary"。

## 变更调用前使缓存失效

有些 Ghidra 操作会写入会话数据库，例如 `annotate_native_function` 重命名函数或增加注释。每项都在 `effects` 列出 `mutates_artifact`，并附带说明后果的限制。

```listing
title: binary_session 描述的变更操作
source: capture/out/10-mcp-04-binary-session.json
lang: json
note: 三项限制中省略两项。
---
{
  "operations": [
    "annotate_native_function"
  ],
  "effects": [
    "mutates_artifact",
    "launches_process",
    "may_write_filesystem"
  ],
  "limitations": [
    …
    "Metadata edits invalidate immutable analysis snapshots and are discarded on close. CLI returns the updated dossier before session cleanup; this is not a saved Ghidra project."
  ],
  "available": true,
  "reason": null,
  "availability_code": null
}
```

rea 向 provider 发送这种调用前，`BinarySession` 调用 `invalidateSnapshot`，清空缓存并设置标志。从此每次查找都为空，新结果不保存，导出失败并报 "Analysis snapshots are unavailable because analysis metadata may have changed"。错误给出退出方法：用 `export_evidence_bundle` 导出 Evidence，不带快照关闭目标，再重新打开。变更后的导入也以相同方式拒绝。

6.7.0 会先让缓存失效，再调用 provider。调用失败也会使缓存失效，因为失败回复无法证明写入没有到达 Ghidra。6.4.0 的顺序相反，只在调用成功后才失效。CLI 遵循相同规则 {{cli Save and reuse analysis snapshots}}

```takeaways
- 以相同参数重复查询获得缓存答案，并阅读追加的限制。
- 做任何注释前，用 `close_binary` 和 `snapshot_path` 保存快照。
- rea 升级后预期可能被 `profile_mismatch` 拒绝，应重新运行分析。
- 快照是过去问题的答案，不是已保存的 Ghidra 项目。
```

Sources: capture/README.md; capture/out/00-commands.txt, capture/out/05-analyze-arm64-O1.json, capture/out/10-mcp-04-binary-session.json, capture/out/10-mcp-09-analyze-function-percent-change-O1.json, capture/out/10-mcp-15-close-binary-O1.json, capture/out/10-mcp-25-close-binary-O2.json, capture/out/10-mcp-session.txt, capture/fixtures/bundle-rea-6.5.0-O1.json; rea 6.7.0 at 27dc42d: src/domain/analysisSnapshot.ts, src/domain/analysisProfile.ts, src/domain/evidence.ts, src/application/binary/AnalysisSnapshotCache.ts, src/application/binary/BinarySession.ts, src/application/binary/BinarySessionExecution.ts, src/application/binary/BinarySessionRecords.ts, src/application/JsonFiles.ts, src/server/registerCloseLifecycleTool.ts, src/server/registerSessionTools.ts, src/ghidra/GhidraLauncher.ts, src/ghidra/GhidraAnalysisProfile.ts, src/ghidra/GhidraProviderCapabilities.ts; rea docs/cli.md, rea docs/mcp-contracts.md
