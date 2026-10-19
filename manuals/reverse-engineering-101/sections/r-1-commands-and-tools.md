# 本手册使用的命令与工具

> 列出捕获运行使用的每个 rea 命令与 MCP 工具，包括它回答的问题、输出所在文件及对应讲解章节。

rea 6.7.0 有 153 个 CLI 命令与 207 个 MCP 工具，`binary_session` 在目录中报告了这些计数（capture/out/10-mcp-04-binary-session.json）。捕获工具运行了 17 个单次命令、13 个工具，此外还有 `rea mcp` 和每个会话起始的两个 MCP 方法。CLI 名称以 `-` 连接单词，MCP 以 `_` 连接。三个原生命令对应不同名称的工具：`function` 调用 `analyze_function`，`decompile` 调用 `procedure_pseudo_code`，`analyze` 调用 `binary_overview`。捕获为每个命令传入 `--format json`；记录过大、无法完整保留时，使用 `--filter-output` 加键列表（capture/out/00-commands.txt）。

输出选项 `--format`、`--filter-output`、`--token-limit`、`--token-offset` 接受 `--flag=value` 形式，例如 `--format=json` {{cli Output and exit status}}。Setup 运行对 `--skill=false` 也使用相同形式。

## CLI 命令

| 命令 | 回答的问题 | 捕获文件 | 章节 |
|---|---|---|---|
| `rea doctor --provider ghidra` | 提供器及其环境是否健康，每行一项检查 | `01-doctor-ghidra.json` | [2.2](#s-rea-doctor-and-the-ghidra-provider) |
| `rea capabilities` | 各提供器分组操作、每组的可用性、影响和限制，以及各提供器可用性 | `02-capabilities.json` | [2.3](#s-rea-capabilities) |
| `rea inspect-artifact <path>` | 文件或软件包按内容寻址的产物图 | `03-inspect-artifact.json` | [3.1](#s-inspect-artifact) |
| `rea inspect-binary-layout <path>` | 通过 pwntools 配置查看 ELF 节区、符号和重定位；仅支持 Linux x64，macOS 返回 `capability_unavailable` | `04-inspect-binary-layout.json` | [3.2](#s-inspect-binary-layout-and-the-load-image) |
| `rea inspect-macho <path>` | Mach-O 加载命令、段、节区、导入、导出与构建元数据 | `04-inspect-macho.json` | [3.2](#s-inspect-binary-layout-and-the-load-image) |
| `rea analyze <path> --provider ghidra` | `binary_overview`：文档、段，以及过程和字符串计数 | `05-analyze-arm64-O1.json`, `05-analyze-x86_64-O1.json` | [3.4](#s-analyze-overview) |
| `rea function <path> <name> --provider ghidra` | 一个过程的 `analyze_function` 档案 | `06-function-*.json` | [4.6](#s-analyze-function-and-pseudocode) |
| `rea decompile <path> <name> --provider ghidra` | 一个过程的 `procedure_pseudo_code` | `07-decompile-*.json` | [4.6](#s-analyze-function-and-pseudocode) |
| `rea address-to-file-offset <path> <address> --provider ghidra` | 虚拟地址对应的文件偏移 | `08-address-to-file-offset.json` | [3.3](#s-address-to-file-offset) |
| `rea inspect-evidence-bundle '{"path":..., "detail": "summary"}'` | 每个证据包记录一行，不含载荷 | `11-inspect-evidence-bundle-*.json` | [5.4](#s-evidence-bundles-export-and-import) |
| `rea evidence-export <bundle> <out>` | 键有序的证据包规范副本 | `12-evidence-export.json`, `12-evidence-export.txt` | [5.4](#s-evidence-bundles-export-and-import) |
| `rea evidence-import <bundle>` | 校验包内每个记录标识和清单，拒绝标识校验不通过的包 | `13-evidence-import.json`, `13-evidence-import-rea-6.5.0.json` | [5.4](#s-evidence-bundles-export-and-import) |
| `rea compare <left> <right>` | 按记录成员关系与未知项修订比较两个包 | `14-compare-bundles.json` | [5.5](#s-compare-and-compare-functions) |
| `rea analyze-javascript-application <dir>` | 不运行应用，构建 JavaScript 或 Electron 应用图 | `15-js-app.json`, `15-js-app-graph.json` | [6.1](#s-analyze-javascript-application) |
| `rea inspect-analysis-view <request.json>` | 已保存记录的摘要或一页内容 | `15-js-app-view-summary.json`, `15-js-app-view-modules.json` | [6.1](#s-analyze-javascript-application) |
| `rea inspect-wasm-artifact <path>` | WABT 1.0.42 返回的 WebAssembly 模块校验结果、节区、导入导出接口 | `16-inspect-wasm-artifact.json` | [6.2](#s-inspect-wasm-artifact) |
| `rea setup --client claude_code --skill=false` | 向 Claude Code 配置写入 rea 条目的计划或结果 | `18-setup-claude-jsonc.json`, `18-setup-claude-duplicate.json`, `18-setup-configs.txt` | [8.1](#s-the-rea-mcp-server) |
| `rea mcp` | 通过 stdio 提供 MCP 服务 | `10-mcp-*.json`, `10-mcp-server.log` | [8.1](#s-the-rea-mcp-server) |

CLI 文档说明了退出状态 {{cli Output and exit status}}。操作完成时为 `0`，允许证据不完整或问题未决；无法完成时为 `1`；被信号 `N` 终止时为 `128 + N`。捕获中三个命令以 `1` 退出：对 Mach-O 文件执行 `inspect-binary-layout`、导入 rea 6.5.0 证据包的 `evidence-import`，以及一次 setup 试运行。显式 `--provider` 优先于 `REA_ANALYSIS_PROVIDER`；两者都未设置时，rea 使用唯一可用且支持目标的提供器 {{cli Choose a provider}}。

## MCP 方法与工具

| 名称 | 回答的问题 | 提示 | CLI 命令 | 捕获文件 | 章节 |
|---|---|---|---|---|---|
| `initialize` | 协商后的协议版本、服务端能力、`serverInfo` 与指令字符串 | 方法 | | `10-mcp-01-initialize.json` | [8.1](#s-the-rea-mcp-server) |
| `tools/list` | 带 schema 和注解的全部 207 个工具 | 方法 | | `10-mcp-02-tools-list.json` | [8.1](#s-the-rea-mcp-server) |
| `open_binary` | 打开目标的路径、格式、类别、SHA-256、架构，提供器已绑定但尚未启动 | 开放世界 | 无 | `10-mcp-03`, `10-mcp-16` | [4.1](#s-open-binary-and-the-headless-bridge) |
| `binary_session` | 当前目标、绑定、运行标识、工具可用性、客户端特性与服务身份 | 开放世界 | 无 | `10-mcp-04-binary-session.json` | [8.1](#s-the-rea-mcp-server) |
| `list_procedures` | 每个已分析过程的地址、名称、thunk 与外部标志 | | 无 | `10-mcp-05-list-procedures.json` | [4.2](#s-list-procedures-and-function-bodies) |
| `procedure_assembly` | 一个过程的汇编字符串 | | 无 | `10-mcp-06-procedure-assembly-grade.json` | [4.3](#s-procedure-assembly) |
| `xrefs` | 引用某地址的地址列表 | | `rea xrefs` | `10-mcp-07-xrefs-grade.json` | [4.4](#s-xrefs-and-the-jump-table) |
| `list_strings` | 每个已定义字符串及编码、终止方式、字节长度 | | 无 | `10-mcp-08-list-strings.json` | [4.5](#s-list-strings) |
| `analyze_function` | 一个过程的档案 | | `rea function` | `10-mcp-09` 至 `10-mcp-13`、`10-mcp-17`、`10-mcp-18` | [4.6](#s-analyze-function-and-pseudocode) |
| `export_evidence_bundle` | 写出证据包的路径、字节数、记录数、未知项数 | 破坏性 | 无 | `10-mcp-14`, `10-mcp-19` | [5.4](#s-evidence-bundles-export-and-import) |
| `import_evidence_bundle` | 导入记录数与新的总数 | | 无 | `10-mcp-23-import-evidence-bundle-O1.json` | [5.4](#s-evidence-bundles-export-and-import) |
| `compare_functions` | 两份档案的八维比较 | | 无 | `10-mcp-20`, `10-mcp-21` | [5.5](#s-compare-and-compare-functions) |
| `verify_reconstruction` | 每个声明的 pass、fail 或 unknown | | 无 | `10-mcp-22-verify-reconstruction.json` | [7.1](#s-verify-reconstruction) |
| `close_binary` | 提供器与临时项目销毁后返回 `null` | 破坏性、非幂等 | 无 | `10-mcp-15`, `10-mcp-25` | [4.1](#s-open-binary-and-the-headless-bridge) |
| `inspect_wasm_artifact` | 以 Evidence 返回 WebAssembly 模块的 WABT 校验、节区与接口 | 开放世界 | `rea inspect-wasm-artifact` | `10-mcp-24-inspect-wasm-artifact.json` | [6.2](#s-inspect-wasm-artifact) |

提示列对应 `tools/list` 中四个工具注解：`readOnlyHint`、`destructiveHint`、`idempotentHint`、`openWorldHint`。空白表示只读 false、破坏性 false、幂等 true、开放世界 false，多数分析工具都如此。CLI 列的“无”表示该工具属于 65 个没有 CLI 命令的工具。

## 捕获设置的环境变量

| 变量 | 在 6.7.0 中的作用 | 文档来源 |
|---|---|---|
| `GHIDRA_INSTALL_DIR` | Ghidra 安装目录，绝对路径 | {{install Ghidra}} |
| `JAVA_HOME` | JDK 目录，绝对路径 | {{install Ghidra}} |
| `REA_GHIDRA_STARTUP_TIMEOUT_MS` | 启动期限，默认 330,000 ms | {{mcp Ghidra first-query deadlines and recovery}} |
| `REA_ANALYSIS_PROVIDER` | 默认提供器选择，可由 `--provider` 与 `provider_id` 覆盖 | {{cli Choose a provider}} |
| `REA_MCP_INPUT_SCHEMA_PROFILE` | `compact` 将公开输入 schema 控制在 13,312 字节内 | {{mcp Compact input schema profile}} |
| `REA_MCP_MAX_RESPONSE_BYTES` | 响应预算，至少 10,485,760，启动时读取 | {{mcp Tool results}} |
| `REA_WABT_BIN_DIRECTORY` | WABT 1.0.42 的 `wasm-validate`、`wasm-objdump`、`wasm2wat` 所在绝对目录 | rea docs/wasm-artifacts.md, Offline WebAssembly artifacts |
| `HOME` 与 `CLAUDE_CONFIG_DIR` | 仅用于 setup 运行，指向私有工作目录，使 setup 只发现并写入测试文件副本 | {{install Limit REA to one project or agent profile}} |

捕获工具还从每个 rea 进程环境中移除 `PWD` 与 `JAVA_TOOL_OPTIONS`（capture/README.md），使记录中的路径和 Java 启动在各次运行间保持一致。

工具没有设置 `REA_KUNA_COMMAND`，该变量用于提供 `kuna` 可执行文件的绝对路径。未设置时，Kuna 提供器报告 `not_configured`（[第 2.3 节](#s-rea-capabilities)）。

Sources: capture/out/00-commands.txt, 02-capabilities.json, 13-evidence-import-rea-6.5.0.json, 18-setup-claude-jsonc.json, 18-setup-claude-duplicate.json, 10-mcp-session.txt, 10-mcp-02-tools-list.json, 10-mcp-04-binary-session.json, 04-inspect-binary-layout.json, 16-inspect-wasm-artifact.json, 10-mcp-24-inspect-wasm-artifact.json, 00-versions.txt; capture/README.md; rea docs/cli.md (Native analysis, Choose a provider, Import, export and compare Evidence, Output and exit status), docs/installation.md (Limit REA to one project or agent profile), docs/kuna-provider.md, docs/mcp-contracts.md (Compact input schema profile, Tool results), docs/wasm-artifacts.md (Offline WebAssembly artifacts); rea at 27dc42d: src/cliCommandNames.ts, src/config/environment.ts, src/config/providerStartupTimeout.ts, src/contracts/toolEffects.ts, src/contracts/wasm/wasmToolContracts.ts
