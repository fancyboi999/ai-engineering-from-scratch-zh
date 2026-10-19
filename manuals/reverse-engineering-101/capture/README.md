# 逆向工程入门捕获工具包

手册每份清单都截自 `out/` 文件。工具包在运行主机上驱动真实 `rea` 6.7.0 命令行及带 Ghidra 12.1.4 provider 的 MCP 服务，记录返回结果，仅用 Python 标准库。

```bash
python3 run.py                   # 写入 out/
python3 run.py --check           # 在临时目录重新捕获，屏蔽变化值后与 out/ 比较
python3 run.py --build-fixtures  # 重建固件二进制与 WASM 模块，再打印 SHA-256
```

运行对象需要 Ghidra、JDK 和 Node，因此不能在仓库 CI 运行。缺少 rea 6.7.0、Ghidra 12.1.4 或 JDK 21 时，`--check` 打印 `skipped: <reason>`，退出 0；普通运行打印原因，退出 1。每次运行先删除 `out/` 全部文件，因此 `out/` 始终保留一次完整捕获。

## 录制环境

| 项目 | 值 |
|---|---|
| 主机 | Apple silicon 笔记本，macOS 26.2（构建 25C56），arm64 |
| rea | npx 缓存的 rea-agents 6.7.0，通过 `node .../node_modules/rea-agents/scripts/rea.mjs` 启动，Node 22.22.0 |
| Ghidra | Homebrew 的 12.1.4 PUBLIC（构建 2026-Sep-21），`GHIDRA_INSTALL_DIR=/opt/homebrew/Cellar/ghidra/12.1.4/libexec` |
| JDK | Homebrew 的 OpenJDK 21.0.12.1，`JAVA_HOME=/opt/homebrew/opt/openjdk@21` |
| clang | Apple clang 17.0.0（clang-1700.6.3.2），目标 arm64-apple-darwin25.2.0 |
| WABT | 1.0.42（Homebrew formula `wabt` 1.0.42_1），`REA_WABT_BIN_DIRECTORY=/opt/homebrew/bin` |
| 录制日期 | 2026-10-18 |

`00-versions.txt` 保留各工具在录制主机实际打印的版本输出。

`run.py` 依次查找工具：已设置的 `REA_COMMAND`（argv 字符串）、`PATH` 中 `--version` 打印 6.7.0 的 `rea`、版本为 6.7.0 的 npx 缓存 `~/.npm/_npx/*/node_modules/rea-agents`。Ghidra 来自 `GHIDRA_INSTALL_DIR` 或 Homebrew 路径，`Ghidra/application.properties` 必须包含 `application.version=12.1.4`。JDK 来自 `JAVA_HOME` 或 `/opt/homebrew/opt/openjdk@21`。WABT 来自 `REA_WABT_BIN_DIRECTORY` 或 `/opt/homebrew/bin`。没有 WABT，`inspect-wasm-artifact` 无法运行其工具。

每条 rea 命令以当前目录为工作目录，设置 `GHIDRA_INSTALL_DIR`、`JAVA_HOME`、`REA_WABT_BIN_DIRECTORY`，移除环境中的 `PWD`、`JAVA_TOOL_OPTIONS`。传入路径为绝对路径，`00-commands.txt` 显示为相对路径。

## 耗时

录制主机完整运行约 125 秒。每条依赖 Ghidra 的独立 CLI 调用都将目标导入新无界面项目，耗时 7 到 9 秒，记录于 `00-commands.txt`。MCP 会话中 `open_binary` 后首个 Ghidra 调用耗时 5 到 7 秒，相同目标后续每次调用低于 100 毫秒（`10-mcp-session.txt`）。`--check` 重跑完整捕获，因此在 `manual.json` 预留时间：

```json
"capture": {
  "run": ["python3", "capture/run.py"],
  "check": ["python3", "capture/run.py", "--check"],
  "timeoutSeconds": 900
}
```

## out/ 中的文件

| 文件 | 内容 |
|---|---|
| `00-commands.txt` | 按顺序记录全部 CLI 命令、退出码、耗时、stderr 及输出文件 |
| `00-versions.txt` | rea、node、clang、llvm-objdump、macOS、Ghidra、JDK、WABT 版本 |
| `00-fixtures.txt` | 各固件文件的 SHA-256 和大小 |
| `01-doctor-ghidra.json` | `rea doctor --provider ghidra`，过滤为 `healthy`、`environment_healthy`、`scope`、`scope_checks`。信息类检查涉及用户 agent 注册，已被过滤排除 |
| `02-capabilities.json` | `rea capabilities`：各操作的可用性、副作用、限制 |
| `03-inspect-artifact.json` | 对 arm64 可执行文件运行 `inspect-artifact` |
| `04-inspect-binary-layout.json` | macOS 错误信封：`capability_unavailable`，pwntools 配置仅支持 Linux x64 |
| `04-inspect-macho.json` | 对 arm64 可执行文件运行 `inspect-macho`，这是 macOS 可用布局工具 |
| `05-analyze-arm64-O1.json`、`05-analyze-x86_64-O1.json` | Mach-O 可执行文件与 ELF 可重定位目标文件的 `binary_overview` Evidence |
| `06-function-*.json` | arm64 -O1 可执行文件的 `_percent_change`、`_grade`、`_total`、`_grade_label`，以及 x86-64 -O1 目标文件中 `grade` 的 `analyze_function` 档案 |
| `07-decompile-total.json`、`07-decompile-grade-x86_64-O1.json` | `_total`（arm64）和 `grade`（x86-64）的 `procedure_pseudo_code` |
| `08-address-to-file-offset.json` | `_grade` 入口 `0x100000518` 解析到文件偏移 1304 |
| `10-mcp-NN-<tool>.json` | 每文件一次 MCP 交互：`request`、`response`、服务有发送时的 `notifications`，以及结果为错误时的 `decoded_text`（解析后的 `content[0].text`） |
| `10-mcp-session.txt` | 按交互顺序列出方法、工具、状态、文件、耗时 |
| `10-mcp-server.log` | `rea mcp` 的 stderr：各工具调用一行 pino JSON |
| `11-bundle-O1.json`、`11-bundle-O2.json` | `export_evidence_bundle` 写出的 bundle，保留原字节，仅屏蔽捕获路径并追加换行 |
| `11-inspect-evidence-bundle-O1.json`、`-O2.json` | `rea inspect-evidence-bundle` 的各 bundle 摘要，每记录一行 |
| `11-bundles.txt` | 两份 bundle 的 SHA-256 与大小 |
| `12-evidence-export.json`、`12-evidence-export.txt` | 用 `rea evidence-export` 将 bundle O1 导出为规范文件，以及两文件摘要 |
| `13-evidence-import.json` | 用 `rea evidence-import` 导入 bundle O1 |
| `13-evidence-import-rea-6.5.0.json` | 对 rea 6.5.0 写出的 bundle O1 `fixtures/bundle-rea-6.5.0-O1.json` 运行 `rea evidence-import`：以 `evidence_integrity_mismatch` 拒绝 |
| `14-compare-bundles.json` | 用 `rea compare` 比较 bundle O1、O2 |
| `15-js-app.json` | `--filter-output` 排除 `graph`、`semantic_graph` 的 `analyze_javascript_application` 记录 |
| `15-js-app-graph.json` | 同记录的 `normalized_result.graph`：42 节点、59 边 |
| `15-js-app-view-summary.json`、`15-js-app-view-modules.json` | 完整记录的 `rea inspect-analysis-view` 摘要与模块页面 |
| `16-inspect-wasm-artifact.json` | 对 `wasm/ledger.wasm` 运行 `inspect-wasm-artifact`：`wabt-artifact` provider 的 Evidence 记录 |
| `16-wabt.txt` | 直接运行 rea 对模块调用的三条 WABT 命令 |
| `17-harness-grid.json` | 第 36 课测试程序的 92 个输入单元：`percent_change` 输入对、`grade` 分数、风险类别计数、十个简单案例 |
| `17-harness-execute-plausible.json`、`17-harness-execute-equal.json` | 执行比较：原版与候选编入同程序，在网格运行，保留各行、不匹配及模型分歧。plausible 为 `percent_change_wide.c` 配 `grade_thresholds.c`，equal 为 `percent_change_mul_first.c` 配 `grade_switch.c` |
| `17-harness-bytes.json` | 八个候选对照 `ledger-x86_64-O1.o` 的重编译比较：函数字节、重定位、掩码范围、引用表、状态及原因 |
| `17-harness.txt` | 测试程序说明、加载位置、运行的宿主机与编译器 |
| `18-setup-claude-jsonc.json` | 对含注释与尾随逗号的 Claude Code 配置运行 `rea setup --client claude_code --skill=false --dry-run`：`needs_human`、注册 `invalid` |
| `18-setup-claude-duplicate.json` | 对含两个 `rea` 成员的配置运行 `rea setup --client claude_code --skill=false --yes`：`ready` |
| `18-setup-configs.txt` | setup 后两份配置文件的内容 |

## MCP 会话

`run.py` 的 `Mcp` 是通过换行分隔 stdio 通信的小型 JSON-RPC 2.0 客户端。启动 `rea mcp`，以协议版本 2025-06-18 发送 `initialize`，再发送 `notifications/initialized` 通知及以下调用。会话按顺序记录每次调用：

1. `tools/list`，207 个工具。
2. 用 `provider_id: "ghidra"` 对 `fixtures/ledger-arm64-O1` 调用 `open_binary`，再调用 `binary_session`。
3. `list_procedures`、`_grade` 的 `procedure_assembly`、`_grade` 入口的 `xrefs`、`list_strings`。
4. 四个 ledger 函数的 `analyze_function`，再请求 `_nothing`，后者以 `invalid_request` 失败。
5. `export_evidence_bundle` 到工作文件，复制为 `11-bundle-O1.json`，再 `close_binary`。
6. 对 `fixtures/ledger-arm64-O2` 调用 `open_binary`，对 `_percent_change`、`_total` 调用 `analyze_function`，`export_evidence_bundle` 到 `11-bundle-O2.json`。
7. `_percent_change` 的 `compare_functions`（八个维度全部未变），及 `_total` 的比较（五个维度改变）。
8. 对两条比较记录的四个 `structural-function` 结论调用 `verify_reconstruction`：两个 `percent_change` 通过，两个 `total` 失败。
9. 对 bundle O1 调用 `import_evidence_bundle`，对 `wasm/ledger.wasm` 调用 `inspect_wasm_artifact`，最后 `close_binary`。

## setup 步骤

`step_setup` 针对 `fixtures/setup/` 文件的两份副本，为 Claude Code 运行 `rea setup`。每次在工作目录内使用独立 `HOME`、`CLAUDE_CONFIG_DIR`，从不读取或写入宿主用户配置。`--skill=false` 排除 skill 安装。JSONC 案例为 dry run；重复成员案例用 `--yes` 应用修改。`18-setup-configs.txt` 显示 setup 写入最后一个 `rea` 成员，第一个保持原样。

## 第 36 课测试程序

`17-*` 文件不是 rea 输出。`run.py` 从本仓库加载 `phases/13-tools-and-protocols/36-rebuild-and-prove-equal/code/main.py`，对 `fixtures/ledger-x86_64-O1.o` 执行两种验证，其字节与课程副本相同。第一分支用宿主 clang 的 `-O1` 编译 `fixtures/ledger.c` 及各函数候选，通过 `-Dpercent_change=cand_percent_change -Dgrade=cand_grade` 重命名候选，与课程 `driver.c` 链接，运行 92 个单元。在此 arm64 主机，原版是原生编译源码（`original_kind: fixture-source`），因此陷阱单元返回 `-2147483648`，不是除法陷阱。第二分支用 `clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c` 编译八个候选源码，用课程 ELF 读取器读两份目标文件，清零重定位字段，比较字节、重定位记录和 `grade` 重定位指向的五个表项。该步骤需要 clang，约两秒。缺少 clang 或课程代码时，`17-harness.txt` 说明原因，不写其他 `17-*` 文件。

## run.py 的截取

每处截取都以 `<cut by run.py:` 开头的字符串标记。

- `tools/list`：仅为会话调用的十二个工具保留 `inputSchema`、`outputSchema`，其他 195 个工具保留 `name`、`title`、`description`、`annotations`。
- `binary_session`：若 `tool_availability` 或 `server_identity.catalog.tools` 为列表，只保留三项。6.7.0 中前者含组，目录仅有计数和摘要，因此此截取不删除内容。
- 若工具结果 `content[0].text` 是 `structuredContent` 的 JSON 文本，保留 `structuredContent`，用标记替换文本副本，标记注明副本字节数。
- `compare_functions` 请求为 `left`、`right` 保留 `evidence_id`，并注明各完整档案所在文件。

Evidence 记录内部不截取。`out/` 每个 `evidence_id` 均可从旁边记录重新计算。

## 屏蔽规则

输出文件不包含宿主路径或用户名。写入时，将捕获目录替换为 `$CAPTURE`，输出目录替换为 `$OUT`，工作目录替换为 `$WORK`，主目录替换为 `$HOME`，路径段中的用户名替换为 `$USER`，npx 缓存 hash 替换为 `_npx/<hash>`。

`--check` 在新文件与 `out/` 双方屏蔽每次变化的值后比较：RFC 3339 时间戳、服务日志的 epoch 毫秒、`durationMs`、索引中的 `(N s)` 与 `(N ms)`、`analysis_run.run_id` 等 UUID、macOS 临时目录、`rea-ghidra-*` 运行时根目录、进程 id。Evidence id 是内容 hash，不屏蔽。录制主机两次运行产生相同记录，检查通过。

## 已录制的失败

- `04-inspect-binary-layout.json`：`capability_unavailable`，类别 `unsupported_provider`。pwntools ELF 配置仅支持 Linux x64，因此捕获以 `inspect-macho` 作为 macOS 布局工具。
- `10-mcp-13-analyze-function-missing.json`：以 `procedure: "_nothing"` 调用 `analyze_function`，返回 `isError: true`，`content[0].text` 内为 `invalid_request` 信封。
- `12-evidence-export.txt`：`rea evidence-export` 写出的规范文件，与 MCP `export_evidence_bundle` 文件具有相同 JSON 内容，但字节顺序不同。CLI 排序键且不写末尾换行。
- `13-evidence-import-rea-6.5.0.json`：`records.3.evidence_id` 处出现 `evidence_integrity_mismatch`，类别 `integrity_mismatch`。rea 6.7.0 将 `null` 的 `relationship_coverage` 纳入记录身份，因此首个不带覆盖信息的 6.5.0 记录不再通过校验。
- `18-setup-claude-jsonc.json`：`needs_human`。Claude Code 读取严格 JSON，setup 在备份或写入之前拒绝注释与尾随逗号。
- `14-compare-bundles.json`：`status: "unknown"`，有 10 个未解决记录。两 bundle 来自不同构建，没有共同记录，bundle 也不带清单完整性标记。

## 测试固件

所有测试程序均为本手册编写。`ledger.c` 含四个函数：`percent_change`（带零值守卫的除法）、`grade`（按 `score / 10` 做 switch，编译成查找表和乘 `0x66666667`）、`total`（内存上的循环）、`grade_label`（调用与数据引用）。`ledger-main.c` 是解析参数并打印结果的小型 `main`。

| 路径 | 在 `fixtures/` 运行的构建命令 | 可复现性 |
|---|---|---|
| `ledger-x86_64-O0.o`、`-O1.o`、`-O2.o` | `clang -target x86_64-unknown-linux-gnu -O<n> -fno-asynchronous-unwind-tables -c ledger.c -o ledger-x86_64-O<n>.o` | 逐字节一致 |
| `ledger-arm64-O1.o`、`ledger-arm64-O2.o` | `clang -O<n> -fno-asynchronous-unwind-tables -c ledger.c -o ledger-arm64-O<n>.o` | 逐字节一致 |
| `ledger-arm64-O1`、`ledger-arm64-O2` | `clang -O<n> -o ledger-arm64-O<n> ledger.c ledger-main.c` | 相同输出名称时逐字节一致。链接器的 ad-hoc 代码签名嵌入文件名，换名链接会得到不同字节 |
| `wasm/ledger.wasm` | `wat2wasm wasm/ledger.wat -o wasm/ledger.wasm` | 逐字节一致 |
| `js-app/` | 无，六个源文件 | |

`out/` 的记录均描述已提交字节。`--build-fixtures` 原位重建全部固件，打印变化文件。录制工具链每次重建均复现已提交字节。不同 clang 会改变可执行文件、目标文件，以及 `out/` 全部 SHA-256、`evidence_id`、bundle 摘要，因此此类变化后必须重新运行 `run.py`。

`js-app/` 是小型 Electron 风格应用：`main.js` 创建带预加载脚本的 `BrowserWindow` 及三个 `ipcMain` 处理器；`preload.js` 通过 `contextBridge` 暴露 `ledger` API；`renderer.js` 调用 `fetch`、`localStorage` 和暴露的 API；`ledger.js` 将四个 C 函数移植到 JavaScript。`wasm/ledger.wat` 是手写 WebAssembly 文本模块，导出相同四个函数，另有一个导入（`env.log`）、一个内存及含成绩标签的数据段。

`bundle-rea-6.5.0-O1.json` 是工具包 6.5.0 版录制的 bundle O1，逐字节保留，用于展示 6.7.0 如何处理旧 bundle。`setup/claude-jsonc.json`、`setup/claude-duplicate.json` 是 setup 步骤的两个小型 Claude Code 配置文件。三者均不由 `--build-fixtures` 重建。

`invoice`、`invoice.c` 是协调者的冒烟测试程序，本工具包不使用。`00-fixtures.txt` 将其与其他固件一并列出。
