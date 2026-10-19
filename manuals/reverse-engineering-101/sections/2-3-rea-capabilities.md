# rea capabilities

> rea capabilities 按声明的副作用为操作分组，调用前即可知道它是否启动进程、写文件或修改会话数据库。

agent 即将对你提供的文件调用工具。有些 rea 操作启动 Java 进程，有些写运行时目录；三种会修改分析数据库的名称，还有 Hopper 操作可能打开窗口。你需要在调用前看到列表。`rea capabilities` 打印它，相同记录作为 MCP 工具 `binary_session` 返回给 agent。

读完本节，你能阅读能力组、说出七种副作用标志，并选出不产生变更的操作。

## 命令与记录

`capabilities` 和 `providers` 一起注册，前者描述为“列出 provider 能力与副作用”。两者均打印会话状态，即 MCP 的 `binary_session` 返回对象。没有打开目标时，以 `open: false` 开始：

```listing
title: 状态记录开头
source: capture/out/02-capabilities.json
lang: json
note: 保留首个 provider 块的首组，以及 ghidra 候选的起始字段。省略该块其余三组、其他三个无需目标的块、其余三个候选。
---
{
  "open": false,
  "cleanup_pending": false,
  "capabilities": [
    {
      "provider": {
        "id": "native-macos",
        "name": "macOS native inspection utilities",
        "version": null
      },
      "shared_limitations": [
        "Availability and textual formats depend on the installed macOS/Xcode toolchain."
      ],
      "groups": [
        {
          "operations": [
            "capture_native_ui_scenario",
            "observe_native_calls"
          ],
          "effects": [
            "launches_process",
            "may_show_ui",
            "may_access_network",
            "may_write_filesystem"
          ],
          "limitations": [],
          "available": true,
          "reason": null,
          "availability_code": null
        },
        …
  ],
  "analysis_provider_binding": null,
  "analysis_provider_candidates": [
    {
      "provider": {
        "id": "ghidra",
        "name": "Ghidra",
        "version": null
      },
      "availability": {
        "status": "available",
…
```

捕获记录有九个顶层字段：`open`、`cleanup_pending`、`capabilities`、`analysis_provider_binding`、`analysis_provider_candidates`、`analysis_run`、`analysis_activity`、`provider_operation_health`、`server_identity`。`capabilities` 在四个 provider 块中列出 19 个无需绑定 provider 的操作：`native-macos`、`rea-artifact-graph`、`rea-dotnet-static`、`sqlite`。例如 `inspect_artifact`、`inspect_macho` 及托管 .NET 读取器。`analysis_provider_candidates` 包含四个深度 provider、可用性及各自能力块。没有打开目标，故 `analysis_provider_binding` 为 `null`，各候选报告 `target_support.status: "unknown"`，原因为 `No target is open.`。

捕获中 `cleanup_pending` 为假。会话保留无法清理的 provider 进程或文件时，它变为真；即使 `open: false` 也可能为真{{mcp Identity and discovery}}。打开下一目标前先读它，因为关闭目标不代表资源已释放。

有一项无需目标的操作在录制 Mac 不可用：`inspect_sqlite_database` 为 `available: false`，代码 `unsupported_version`。原因说明需要 Node.js 24.15 或更高的 24.x，或 Node.js 26 及以上。录制 Mac 运行 Node 22.22.0。

**能力组：** 共享一个 `available` 标志、一份副作用列表和一份限制列表的操作集合。`effects` 只列出为真的标志。完整限制是块的 `shared_limitations` 后接组的 `limitations`。组不可用时，`reason`、`availability_code` 说明原因。会话从各 provider 的描述符构建组，因此字段名对所有 provider 一致。[此图](#fig-2-3)展示一组。

```figure
id: fig-2-3
kind: structure
title: ghidra 下 analyze_function 能力组
claim: 能力组在调用前回答四个问题：操作是否可用、启动什么、写入什么、改变什么。
caption: 阅读字段、ghidra 块中 analyze_function 组的取值及说明。来自 capture/out/02-capabilities.json，schema 来自固定标签的 src/contracts/toolOutputSchemaPrimitives.ts。
```

## 七种副作用

组的 `effects` 从固定七种标志中取值。未列出的标志对该组全部操作均为假。

| 标志 | 含义 | 捕获中为真的操作 |
|---|---|---|
| `mutates_artifact` | 修改分析数据库的名称或注释 | 3 个 Ghidra、6 个 Hopper 操作 |
| `launches_process` | 启动程序，此处为 Ghidra JVM 或 macOS 工具 | 全部 Ghidra、Hopper、Kuna 操作，以及 12 个无需目标的操作 |
| `may_show_ui` | 可能打开窗口 | 全部 Hopper、4 个 IDA、2 个无需目标的操作 |
| `may_access_network` | 可能建立网络连接 | 全部 IDA 适配器操作、2 个无需目标的操作 |
| `may_write_filesystem` | 写文件，此处为运行时根目录和项目 | 全部 Ghidra、Kuna，6 个 Hopper，6 个无需目标的操作 |
| `changes_permissions` | 改变文件或进程权限 | 无 |
| `requires_root` | 需要 root | 无 |

两种标志需要细读。`mutates_artifact` 看似修改原文件，实际并非如此。Ghidra 块的共享限制说明：“导入的 Program 和临时项目是短暂的，关闭时删除。注解操作修改会话数据库元数据，从不写入原始可执行字节。”（capture/out/02-capabilities.json）。设置该标志的 `annotate_native_function`、`set_address_name`、`set_addresses_names` 在 Ghidra 数据库中重命名符号，修改随会话消失。

所有 Ghidra 操作的 `may_write_filesystem` 都为真，包括 `list_documents`。首次调用会写运行时根目录、私有副本和项目（[第 1.2 节](#s-rea-function-end-to-end)）。[此图](#fig-2-4)按 provider 统计标志。

```figure
id: fig-2-4
kind: comparison
title: 捕获中各 provider 声明的副作用
claim: 所有 Ghidra 操作均声明 launches_process、may_write_filesystem，其中三个还声明 mutates_artifact；捕获中的操作均未声明 changes_permissions 或 requires_root。
caption: 每列一个 provider，每行一个标志，各单元为声明该标志的操作数。统计自 capture/out/02-capabilities.json。
```

## 四个候选，一个绑定

```listing
title: 三个不可用候选
source: capture/out/02-capabilities.json
lang: json
note: 仅保留 hopper、ida、kuna 的 provider 与可用性；省略诊断、目标支持和能力块。
---
    {
      "provider": {
        "id": "hopper",
        "name": "Hopper Disassembler",
        "version": null
      },
      "availability": {
        "status": "unavailable",
        "code": "executable_missing",
        "reason": "Hopper launcher is missing or not executable: /Applications/Hopper Disassembler.app/Contents/MacOS/hopper",
…
    {
      "provider": {
        "id": "ida",
        "name": "IDA MCP adapter",
        "version": "1"
      },
      "availability": {
        "status": "unavailable",
        "code": "not_configured",
        "reason": "Set REA_IDA_MCP_CONFIG to an upstream IDA MCP JSON registration; see docs/ida-provider.md.",
…
    {
      "provider": {
        "id": "kuna",
        "name": "Kuna",
        "version": null
      },
      "availability": {
        "status": "unavailable",
        "code": "not_configured",
        "reason": "Set REA_KUNA_COMMAND to the absolute path of a caller-supplied kuna executable (verified with 1.833). REA does not download, install or update Kuna.",
…
```

`ghidra` 候选为 `available`，`diagnostics` 重复[第 2.2 节](#s-rea-doctor-and-the-ghidra-provider)的八项检查，路径相同。其能力块有 22 组、30 个操作。一组为 `read_binary_inventory_summary`，支撑[第 3.4 节](#s-analyze-overview)的计数。`hopper` 不可用，代码 `executable_missing`；`ida`、`kuna` 为 `not_configured`。

不可用候选仍列出操作：Hopper 37 个、IDA 13 个、Kuna 13 个。Hopper、IDA 的组均为 `available: true`，唯独 Hopper 的 `search_bytes` 为 `available: false`，原因为“尚未验证 Hopper 的掩码字节搜索”。Kuna 所有组均为 `available: false`，代码 `not_configured`，原因与候选相同。本手册未运行 Kuna，因为已有覆盖记录仅在 Linux，而捕获主机是 Mac。

引擎可用性与操作可用性是不同事实。文档规定：“这些命令描述 binary-session provider 与辅助能力。”{{cli Choose a provider}}。使用 `--provider ghidra` 或 `provider_id: "ghidra"` 时，仅 Ghidra 块适用。

## 限制是声明的一部分

所有 Ghidra 操作在自身限制之前先携带四条共享限制：默认自动分析完成后才服务操作；Program 与项目为临时对象；取消请求会终止数据库并丢弃注解；地址为默认地址空间中小写 `0x` 十六进制（capture/out/02-capabilities.json）。

然后各组添加自身限制。将空列表理解为不存在之前，必须读这些句子。`list_strings` 说明：“空搜索结果不能证明产物中没有文本。”`procedure_callers` 没有自身限制，但其回答包含 `relationship_coverage`，其中 Ghidra 诊断说明仅返回已解析调用引用，“未解析的计算或间接调用仍为未知”（capture/out/06-function-percent-change.json）。背后的设计规则是：“缺失覆盖意味着未知，而非不存在。”{{design Define the contract}}。

## tools/list 的另一套词汇

记录以 `server_identity` 结束，其 `catalog` 包含计数及目录的三个 SHA-256 摘要：

```listing
title: server_identity 中的目录
source: capture/out/02-capabilities.json
lang: json
note: 仅保留目录，摘要截为八位十六进制；省略 server_identity 其他字段。
---
    "catalog": {
      "counts": {
        "cli_commands": 153,
        "mcp_tools": 207,
        "mcp_prompts": 6
      },
      "digests": {
        "tools_sha256": "af39310c…",
        "prompts_sha256": "7152916a…",
        "combined_sha256": "96d8f6e6…"
      }
    },
```

目录没有逐工具条目。每个 MCP 工具的副作用在 `tools/list` 返回的工具注解中：

```listing
title: xrefs 的 tools/list 条目
source: capture/out/10-mcp-02-tools-list.json
lang: json
note: 仅保留名称、标题和注解；省略描述及两个 schema。
---
        {
          "name": "xrefs",
          "title": "Xrefs",
          …
          "annotations": {
            "readOnlyHint": false,
            "destructiveHint": false,
            "idempotentHint": true,
            "openWorldHint": false
          },
          …
```

源码中 `xrefs` 的 `mutatesSession: true`，因为每次回答都会进入 Evidence 账本。rea 根据这些副作用生成注解，因此 `readOnlyHint` 为假。provider 的 `xrefs` 能力仍未列 `mutates_artifact`。两套词汇回答不同问题：能力说明引擎对机器做什么，注解说明工具对 MCP 会话做什么。按问题选择，不要混用。

```takeaways
- 在新机器第一次调用前运行 `rea capabilities --format json`。
- 将 `launches_process`、`may_write_filesystem` 视为所有 Ghidra 操作的成本。
- 只有需要会话内重命名时才用 `annotate_native_function`、`set_address_name`、`set_addresses_names`。
- 将空结果视为不存在之前，先读共享限制和组内 `limitations`。
```

Sources: cli Choose a provider (rea docs/cli.md); mcp Identity and discovery (rea docs/mcp-contracts.md); design Define the contract (rea docs/tool-design.md); rea at 27dc42d: src/cli/utilityCommands.ts, src/application/binary/BinarySessionStatus.ts, src/contracts/toolOutputSchemaPrimitives.ts, src/contracts/toolEffects.ts, src/serverIdentity.ts, src/catalogIdentity.ts, src/domain/relationshipCoverage.ts, src/ghidra/GhidraProviderCapabilities.ts, src/kuna/KunaProvider.ts, docs/kuna-provider.md, bridge/ghidra/ReaGhidraBridge.java; capture/out/02-capabilities.json, 06-function-percent-change.json, 10-mcp-02-tools-list.json
