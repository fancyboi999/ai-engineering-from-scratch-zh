# rea、provider 与 Evidence

> rea 统一问题、会话与 Evidence 记录，将导入、分析和反编译交给绑定的引擎，本手册使用 Ghidra 12.1.4。

你用 `clang -O1` 编译了 `ledger.c`，想知道 `before` 为 0 时 `percent_change` 的机器码做什么。可以在 Ghidra 中打开文件，自己阅读清单；也可以询问 rea，由它代问 Ghidra，再返回说明发现和依据的记录。本节划清两个程序的职责。

读完本节，你能说明 rea 为 Ghidra 增加了什么、从不做什么，以及一次提问应选择哪个适配器。

## rea 统一的三件事

**Evidence：** 每次成功分析调用返回的统一记录类型，严格包含 16 个字段：`evidence_id`、`subject`、`provider`、`analysis_profile`、`predicate_type`、`operation`、`parameters`、`raw_result`、`normalized_result`、`confidence`、`authority`、`environment`、`limitations`、`relationship_coverage`、`locations`、`evidence_links`。

id 由 `ev_` 和语义内容的 SHA-256 组成。同样字节上的同样观察，在任何机器上都得到同一 id。即使 `relationship_coverage` 为 `null`，也在 id 覆盖范围内。因此旧版 rea 的记录可能无法通过新版检查（[第 5.4 节](#s-evidence-bundles-export-and-import)）。`confidence` 为 `observed`、`derived` 或 `inferred`，`authority` 说明支撑事实的来源类型。

MCP 工具会在文本和 `structuredContent` 中都返回完整、规范的 Evidence 记录 {{mcp Tool results}}。[第 1.2 节](#s-rea-function-end-to-end)逐字段阅读一条记录，[第 5 部分](#p-5)完整介绍记录。

**Provider：** 统一接口后的分析引擎。`GhidraProvider implements AnalysisProviderCandidate`，提供 `identity()`、`capabilities()`、`inspectAvailability()`、`inspectTargetSupport(target)`、`resolveAnalysisProfile(...)` 和 `createClient(...)`。6.7.0 的会话有四个深度 provider：`hopper`、`ghidra`、`ida`、`kuna`，另有无需引擎的辅助 provider。本手册仅使用 `ghidra`。Kuna 需要自行安装，其已有覆盖记录在 Linux；录制 Mac 将它报告为 `not_configured`。

注册表按 id 排序候选，因此无需启动引擎即可选择。注册顺序不会影响选择或调用者可见的输出。provider 绑定后不会变化；运行失败时系统不会自动切换 provider {{mcp Identity and discovery}}。

**适配器：** 调用者访问会话的方式。独立 CLI 有 153 条命令和一个别名，MCP 服务有 207 个工具和 6 个 prompt。捕获的 `server_identity.catalog.counts` 报告这些数字（capture/out/02-capabilities.json）。两种适配器共享一个 `BinarySession`，由它管理唯一的活动目标。CLI 名称用连字符，MCP 名称用 `_` 分词。native 家族例外：`rea function` 调用 `analyze_function`，`rea decompile` 调用 `procedure_pseudo_code`，`rea analyze` 调用 `binary_overview`。

rea 不替你规划调查。REA issue 32 的路线图将调查规划交给 agent：它选择目标，并综合检查、捕获、跟踪和比较结果组织调查。该路线图还要求工具结果区分观察、推断与未知项（[rea issue 32](https://github.com/morluto/rea/issues/32)）。规划由你或 agent 负责，rea 为每个问题返回可检查的记录。

捕获对同一文件使用了两种适配器：

```listing
title: 四条独立命令及退出状态
source: capture/out/00-commands.txt
lang: text
note: 仅保留前四条命令。各命令耗时每次录制都会变化，故省略；其他命令也省略。
---
$ rea doctor --provider ghidra --format json --filter-output healthy,environment_healthy,scope,scope_checks
[exit 0] (… s) -> 01-doctor-ghidra.json

$ rea capabilities --format json
[exit 0] (… s) -> 02-capabilities.json

$ rea inspect-artifact fixtures/ledger-arm64-O1 --format json
[exit 0] (… s) -> 03-inspect-artifact.json

$ rea inspect-binary-layout fixtures/ledger-x86_64-O1.o --format json
[exit 1] (… s) -> 04-inspect-binary-layout.json
…
```

前三条命令约一秒完成，因为都不启动 Ghidra。第四条失败，[第 3.2 节](#s-inspect-binary-layout-and-the-load-image)说明原因。[此图](#fig-1-1)将各名称放在职责边界对应一侧。

```figure
id: fig-1-1
kind: layers
title: rea 统一什么，又将什么交给 Ghidra
claim: rea 负责适配器、会话和 Evidence 记录，Ghidra 负责导入、分析和反编译；双方每个问题用一行 JSON 交互。
caption: 各栈从上往下读。计数来自 capture/out/02-capabilities.json 与 05-analyze-arm64-O1.json，文件名来自 00-fixtures.txt，类名来自固定标签的 docs/architecture.mermaid。
```

## rea 交给 Ghidra 的工作

rea 没有自己的反汇编器或反编译器。面对原生可执行文件，它在新的临时项目中启动 `analyzeHeadless`，导入文件的私有副本，让 Ghidra 默认自动分析完成，再通过 socket 提问。回答来自 Ghidra。函数档案会组合 Ghidra FunctionManager、Listing、ReferenceManager、BasicBlockModel 和反编译器的观察；每条 `analyze_function` 限制都有说明（capture/out/06-function-percent-change.json）。伪代码来自 Ghidra decompiler，并非程序的原始源码 {{ghidra Admitted function-analysis semantics}}。

**桥接：** `ReaGhidraBridge.java` 是一个 `GhidraScript`，由 `analyzeHeadless` 作为最后的 post-script 运行，随后在 Unix socket 上服务请求。请求是一行 JSON：`{ id, token, method, params }`；回复为 `{ id, ok: true, result }` 或 `{ id, ok: false, error }`。桥接通过一个 Java `switch` 处理 17 个清单方法和 13 个函数方法。[第 4 部分](#p-4)逐项追踪。

成本也主要来自 Ghidra。录制 Mac 上每条依赖 Ghidra 的独立命令耗时 7 到 9 秒（capture/README.md、capture/out/00-commands.txt），大部分花在导入和自动分析。同一次 MCP 会话的首次 Ghidra 调用耗时 5 到 7 秒（capture/README.md、capture/out/10-mcp-session.txt），同文件的后续每次调用均低于 100 毫秒。

## rea 自行读取的内容

引擎运行前，rea 先读文件，识别 `7f 45 4c 46`、`MZ` 及四种 Mach-O 魔数。它以 64 KiB 分块计算目标 SHA-256，认识十种架构：`x86`、`x86_64`、`arm`、`arm64`、`mips`、`6502`、`riscv`、`powerpc`、`m68k`、`hexagon`。原始二进制没有头，架构由调用者指定。只有原始二进制可选 `6502` 或大端 `m68k`，入口地址必须适合处理器。

两条命令无需 Java 就能展示结果。`rea inspect-artifact` 用 `rea-artifact-graph` provider 遍历文件，不到一秒返回 Evidence 记录，不依赖 Java（capture/out/03-inspect-artifact.json）。macOS 上 `rea inspect-macho` 通过 `xcrun` 运行 Xcode 工具，耗时约三秒（capture/out/04-inspect-macho.json）。[第 3 部分](#p-3)解读这些记录。

## 原生代码之外的格式

本手册还涉及三个读取入口。`inspect-wasm-artifact` 通过 WABT 工具读取 WebAssembly 模块，`inspect-go-binary` 读取 Go 构建信息，raw-binary 格式按你指定的架构与入口地址打开无头文件。捕获对测试模块运行 `inspect-wasm-artifact`，退出码为 0（capture/out/16-inspect-wasm-artifact.json）。[第 6.2 节](#s-inspect-wasm-artifact)解读记录。

```takeaways
- 向 rea 请求 Evidence 记录；存疑时阅读 Ghidra 自身的清单。
- 单个问题用 CLI，多问题会话用 MCP 服务。
- 将 16 个字段视为契约，`normalized_result` 中的档案视为 Ghidra 的回答。
- 文件的首次 Ghidra 提问预计 7 到 9 秒，之后为毫秒级。
```

Sources: mcp Tool results, Identity and discovery (rea docs/mcp-contracts.md); ghidra Admitted function-analysis semantics (rea docs/ghidra-provider.md); rea at 27dc42d: src/domain/evidence.ts, src/ghidra/GhidraProvider.ts, src/composition/binary.ts, src/application/binary/AnalysisProviderRegistry.ts, src/application/binary/BinarySession.ts, src/cliCommandNames.ts, src/ghidra/GhidraClient.ts, src/ghidra/GhidraClientWire.ts, src/ghidra/protocol.ts, src/ghidra/GhidraInventoryValues.ts, src/ghidra/GhidraFunctionValues.ts, bridge/ghidra/ReaGhidraBridge.java, src/domain/binaryTarget.ts, src/application/BinaryTargetResolver.ts, src/domain/binaryTargetTypes.ts, src/catalogIdentity.ts, src/go/GoBinaryProvider.ts, src/wasm/WabtArtifactProvider.ts, src/kuna/KunaProvider.ts, docs/architecture.mermaid, docs/roadmap.md; rea issue 32 (roadmap); capture/README.md; capture/out/00-commands.txt, 00-fixtures.txt, 02-capabilities.json, 03-inspect-artifact.json, 04-inspect-macho.json, 05-analyze-arm64-O1.json, 06-function-percent-change.json, 10-mcp-session.txt, 16-inspect-wasm-artifact.json
