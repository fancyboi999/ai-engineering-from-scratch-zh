# 证据对照：使用 rea 逆向工程

中文主题：[使用 rea 逆向工程](../reverse-engineering.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## rea CLI 任务

对应主题区块：**rea CLI 任务**（`task-table`）。

来源文件：

- [`manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md`](../../manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md)
- [`manuals/reverse-engineering-101/capture/out/00-commands.txt`](../../manuals/reverse-engineering-101/capture/out/00-commands.txt)

构建器核对的标识与数值：

- `--provider`
- `--format`

## 证据与 MCP 任务

对应主题区块：**证据与 MCP 任务**（`task-table`）。

来源文件：

- [`manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md`](../../manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md)
- [`manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md`](../../manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md)
- [`manuals/reverse-engineering-101/capture/README.md`](../../manuals/reverse-engineering-101/capture/README.md)

构建器核对的标识与数值：

- `--client`
- `--check`

## 从 shell 完成一次调查

对应主题区块：**从 shell 完成一次调查**（`annotated-code`）。

来源文件：

- [`manuals/reverse-engineering-101/capture/out/00-commands.txt`](../../manuals/reverse-engineering-101/capture/out/00-commands.txt)
- [`manuals/reverse-engineering-101/sections/2-2-rea-doctor-and-the-ghidra-provider.md`](../../manuals/reverse-engineering-101/sections/2-2-rea-doctor-and-the-ghidra-provider.md)
- [`manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md`](../../manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md)
- [`manuals/reverse-engineering-101/sections/3-3-address-to-file-offset.md`](../../manuals/reverse-engineering-101/sections/3-3-address-to-file-offset.md)
- [`manuals/reverse-engineering-101/sections/r-3-errors.md`](../../manuals/reverse-engineering-101/sections/r-3-errors.md)

构建器核对的标识与数值：

- `GHIDRA_INSTALL_DIR`
- `JAVA_HOME`
- `--provider`
- `--format`
- `O1.o`
- `x86_64`

## rea 的组成

对应主题区块：**rea 的组成**（`architecture`）。

来源文件：

- [`manuals/reverse-engineering-101/sections/1-1-rea-providers-and-evidence.md`](../../manuals/reverse-engineering-101/sections/1-1-rea-providers-and-evidence.md)
- [`manuals/reverse-engineering-101/sections/1-2-rea-function-end-to-end.md`](../../manuals/reverse-engineering-101/sections/1-2-rea-function-end-to-end.md)

构建器核对的标识与数值：

- `bridge.sock`
- `ReaGhidraBridge.java`

## 一次 rea function 调用

对应主题区块：**一次 rea function 调用**（`flow`）。

来源文件：

- [`manuals/reverse-engineering-101/sections/1-2-rea-function-end-to-end.md`](../../manuals/reverse-engineering-101/sections/1-2-rea-function-end-to-end.md)

构建器核对的标识与数值：

- `selection_source`
- `run_id`
- `analysis_complete`

## MCP 工具

对应主题区块：**MCP 工具**（`command-table`）。

来源文件：

- [`manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md`](../../manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md)
- [`manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md`](../../manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md)
- [`manuals/reverse-engineering-101/sections/7-1-verify-reconstruction.md`](../../manuals/reverse-engineering-101/sections/7-1-verify-reconstruction.md)

构建器核对的标识与数值：

- `open_binary`
- `binary_session`
- `list_procedures`
- `procedure_assembly`
- `analyze_function`
- `export_evidence_bundle`
- `close_binary`
- `verify_reconstruction`

## 课程中的原生工具

对应主题区块：**课程中的原生工具**（`command-table`）。

来源文件：

- [`phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md`](../../phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md)
- [`phases/13-tools-and-protocols/37-the-reverse-engineering-landscape/docs/zh.md`](../../phases/13-tools-and-protocols/37-the-reverse-engineering-landscape/docs/zh.md)
- [`phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames/docs/zh.md`](../../phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames/docs/zh.md)
- [`phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/docs/zh.md`](../../phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/docs/zh.md)
- [`phases/13-tools-and-protocols/43-bytecode-and-managed-formats/docs/zh.md`](../../phases/13-tools-and-protocols/43-bytecode-and-managed-formats/docs/zh.md)
- [`phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/zh.md`](../../phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/zh.md)
- [`phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program/docs/zh.md`](../../phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program/docs/zh.md)
- [`phases/13-tools-and-protocols/36-rebuild-and-prove-equal/docs/zh.md`](../../phases/13-tools-and-protocols/36-rebuild-and-prove-equal/docs/zh.md)

构建器核对的标识与数值：

- `x86_64`

## 优先阅读的证据字段

对应主题区块：**优先阅读的证据字段**（`concepts`）。

来源文件：

- [`manuals/reverse-engineering-101/sections/r-2-evidence-fields.md`](../../manuals/reverse-engineering-101/sections/r-2-evidence-fields.md)
- [`manuals/reverse-engineering-101/sections/5-1-the-evidence-record.md`](../../manuals/reverse-engineering-101/sections/5-1-the-evidence-record.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 默认值

对应主题区块：**默认值**（`defaults`）。

来源文件：

- [`manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md`](../../manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md)
- [`manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md`](../../manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md)
- [`manuals/reverse-engineering-101/sections/1-2-rea-function-end-to-end.md`](../../manuals/reverse-engineering-101/sections/1-2-rea-function-end-to-end.md)
- [`manuals/reverse-engineering-101/sections/5-1-the-evidence-record.md`](../../manuals/reverse-engineering-101/sections/5-1-the-evidence-record.md)
- [`manuals/reverse-engineering-101/sections/r-2-evidence-fields.md`](../../manuals/reverse-engineering-101/sections/r-2-evidence-fields.md)
- [`manuals/reverse-engineering-101/sections/r-4-glossary.md`](../../manuals/reverse-engineering-101/sections/r-4-glossary.md)

构建器核对的标识与数值：

- `REA_GHIDRA_STARTUP_TIMEOUT_MS`
- `330,000 ms`
- `60,000 ms`
- `10`
- `--format`
- `TOON`
- `observed`
- `shipped-artifact`
- `relationship_coverage`
- `null`
- `10,000`

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`manuals/reverse-engineering-101/sections/r-3-errors.md`](../../manuals/reverse-engineering-101/sections/r-3-errors.md)
- [`manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md`](../../manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md)
- [`manuals/reverse-engineering-101/sections/2-2-rea-doctor-and-the-ghidra-provider.md`](../../manuals/reverse-engineering-101/sections/2-2-rea-doctor-and-the-ghidra-provider.md)
- [`manuals/reverse-engineering-101/sections/4-6-analyze-function-and-pseudocode.md`](../../manuals/reverse-engineering-101/sections/4-6-analyze-function-and-pseudocode.md)
- [`manuals/reverse-engineering-101/sections/7-2-a-proof-harness-outside-rea.md`](../../manuals/reverse-engineering-101/sections/7-2-a-proof-harness-outside-rea.md)
- [`manuals/reverse-engineering-101/capture/README.md`](../../manuals/reverse-engineering-101/capture/README.md)

构建器核对的标识与数值：

- `capability_unavailable`
- `invalid_request`
- `provider_timeout`
- `REA_GHIDRA_STARTUP_TIMEOUT_MS`
- `target_unavailable`
- `open_binary`
- `environment_healthy`

## 术语表

对应主题区块：**术语表**（`glossary`）。

来源文件：

- [`manuals/reverse-engineering-101/sections/r-4-glossary.md`](../../manuals/reverse-engineering-101/sections/r-4-glossary.md)

构建器核对的标识与数值：

- `analyze_function`
- `ReaGhidraBridge.java`

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`manuals/reverse-engineering-101/sections/1-1-rea-providers-and-evidence.md`](../../manuals/reverse-engineering-101/sections/1-1-rea-providers-and-evidence.md)
- [`manuals/reverse-engineering-101/sections/5-1-the-evidence-record.md`](../../manuals/reverse-engineering-101/sections/5-1-the-evidence-record.md)
- [`manuals/reverse-engineering-101/sections/r-2-evidence-fields.md`](../../manuals/reverse-engineering-101/sections/r-2-evidence-fields.md)
- [`manuals/reverse-engineering-101/sections/3-3-address-to-file-offset.md`](../../manuals/reverse-engineering-101/sections/3-3-address-to-file-offset.md)
- [`manuals/reverse-engineering-101/sections/7-1-verify-reconstruction.md`](../../manuals/reverse-engineering-101/sections/7-1-verify-reconstruction.md)

构建器核对的标识与数值：

- `subject.name`
- `subject.local_path`
- `local_path`

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md`](../../manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md)
- [`manuals/reverse-engineering-101/sections/5-1-the-evidence-record.md`](../../manuals/reverse-engineering-101/sections/5-1-the-evidence-record.md)
- [`manuals/reverse-engineering-101/sections/7-1-verify-reconstruction.md`](../../manuals/reverse-engineering-101/sections/7-1-verify-reconstruction.md)
- [`manuals/reverse-engineering-101/sections/8-2-an-agent-investigation.md`](../../manuals/reverse-engineering-101/sections/8-2-an-agent-investigation.md)
- [`manuals/reverse-engineering-101/sections/7-2-a-proof-harness-outside-rea.md`](../../manuals/reverse-engineering-101/sections/7-2-a-proof-harness-outside-rea.md)

构建器核对的标识与数值：

- `normalized_result`
- `close_binary`

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: reverse-engineering

M = manuals/reverse-engineering-101, S = M/sections, O = M/capture/out, P13 = phases/13-tools-and-protocols

## Front matter
- subtitle pin rea-agents 6.5.0, Ghidra 12.1.4: M/manual.json:9-12

## rea CLI tasks (8)
- rea doctor --provider ghidra --format json: S/r-1-commands-and-tools.md:11; O/00-commands.txt:1
- rea capabilities --format json: S/r-1:12; O/00-commands.txt:4
- rea inspect-artifact <path>, no Java: S/r-1:13; S/1-1:65
- rea inspect-macho <path>: S/r-1:15
- rea analyze <path> --provider ghidra: S/r-1:16
- rea function <path> <name> --provider ghidra: S/r-1:17
- rea decompile <path> <name> --provider ghidra: S/r-1:18
- rea address-to-file-offset <path> <address> --provider ghidra: S/r-1:19

## Evidence and MCP tasks (8)
- inspect-evidence-bundle '{"path":..., "detail": "summary"}': S/r-1:20
- evidence-export <bundle> <out>: S/r-1:21
- evidence-import <bundle>: S/r-1:22
- compare <left> <right>: S/r-1:23
- npx -y rea-agents@6.5.0 mcp: S/8-1:23
- rea setup, rea doctor --client <id>: S/8-1:29
- python3 run.py --check: M/capture/README.md:7

## One investigation from the shell (14 lines)
- GHIDRA_INSTALL_DIR, JAVA_HOME absolute paths: S/r-1:57-58; JDK 21: S/2-2 (header and line 88)
- doctor, find first ok: false: S/2-2:135
- analyze arm64 binary_overview: O/00-commands.txt:16; S/r-1:16
- function _percent_change, analyze_function: O/00-commands.txt:22; S/r-1:17
- decompile x86_64 grade, procedure_pseudo_code: O/00-commands.txt:40; S/r-1:18
- address-to-file-offset 0x100000518, offset 1304: O/00-commands.txt:43; S/3-3:35,51
- compare O1 O2, exit 0, status unknown: O/00-commands.txt:58-59; S/r-3:91

## How rea is built (7 nodes)
- rea CLI 153 commands, rea mcp 207 tools: S/1-1:19
- BinarySession one active target, shared by CLI and MCP: S/1-1:19
- Evidence record 16 fields, ev_ id: S/1-1:11-13
- Provider registry selects ghidra: S/1-1:17; S/1-2:34
- Ghidra client private copy, bridge.sock: S/1-2:36
- ReaGhidraBridge.java post-script, JSON line per request: S/1-1:57
- stdio JSON-RPC edge: S/8-1:33

## One rea function call (7)
1. parse header, architecture, hash: S/1-2:33
2. selection_source "request": S/1-2:34
3. analysis profile hashed: S/1-2:35
4. copy and java -readOnly -deleteProject: S/1-2:36
5. ping checks run_id, token, digests, analysis_complete: S/1-2:37
6. one JSON line, one Evidence record: S/1-2:38-39
7. shutdown 10 s, project deleted: S/1-2:40

## MCP tools (8)
- open_binary binds provider, starts no process: S/r-1:37; S/8-1 ("open_binary took 39 ms and started no process")
- binary_session tool availability: S/r-1:38
- list_procedures: S/r-1:39. procedure_assembly: S/r-1:40. xrefs: S/r-1:41. analyze_function: S/r-1:43
- export_evidence_bundle before close_binary: S/r-1:44; S/7-1:180
- verify_reconstruction pass/fail/unknown: S/r-1:47

## Native tools from the lessons (8)
- llvm-objdump -d -r linear sweep with relocations: P13/37/docs/en.md:71; P13/39/docs/en.md:35
- llvm-objdump -t value and size: P13/32/docs/en.md:45
- llvm-objdump -h section sizes: P13/38/docs/en.md:146
- nm -m library per symbol: P13/40/docs/en.md:187
- wasm-objdump -d: P13/43/docs/en.md:15
- clang -target x86_64-unknown-linux-gnu -c: P13/34/docs/en.md:460
- break bump / breakpoint set -n bump: P13/42/docs/en.md:289 (gdb and lldb table)
- python3 -m unittest discover -s code/tests -v: P13/36/docs/en.md:403

## Evidence fields (8)
- evidence_id, subject, provider, analysis_profile: S/r-2:13-16
- confidence, authority: S/r-2:22-23,36-37; S/5-1:91
- limitations: S/r-2:25. relationship_coverage: S/r-2:26

## Defaults (8)
- REA_GHIDRA_STARTUP_TIMEOUT_MS 330,000 ms: S/r-1:59; S/8-1 startup deadline table
- client tool call 60,000 ms, SDK 2.3.1: S/8-1 deadline table
- bridge shutdown 10 s: S/1-2:40
- TOON without --format: S/1-2:21
- confidence observed, authority shipped-artifact when the producer names none: S/5-1:87
- relationship_coverage null, out of the id hash: S/r-2:5,49
- answer cache 10,000 for one target: S/r-4:10

## Troubleshooting (8)
- capability_unavailable, Linux x64 only, inspect-macho: S/r-3:9-30; M/capture/README.md:115
- invalid_request unknown procedure, fix name: S/r-3:56; S/4-6:266
- client timeout, Java keeps running: S/8-1:5 and takeaways
- provider_timeout first call: S/r-3:106
- target_unavailable "No app is open.": S/r-3:106
- compare unknown, exit 0, not an error: S/r-3:91
- healthy vs environment_healthy: S/2-2:121,137
- masked compare passes wrong constant: S/7-2:176,250

## Glossary (8)
- Dossier: S/r-4:23. Provider: S/r-4:38. Bridge: S/r-4:16. Thunk: S/r-4:50. Jump table: S/r-4:35
- Relocation masking: S/r-4:41. Residual unknown: S/r-4:42. File offset: S/r-4:28

## Q&A (5)
- rea adds adapters, session, Evidence. Ghidra does import, analysis, decompilation: S/1-1:3,49
- 7 to 9 s per CLI call, under 100 ms later: S/1-1:59
- observed means engine output recorded: S/5-1:180
- id leaves out subject.name and subject.local_path: S/r-2:47
- offset = address - vmaddr + fileoff, 0x100000518 to 1304: S/3-3:51,57

## Tips (6)
- one exact version: S/8-1:29, takeaways
- read confidence, authority, limitations first: S/5-1:179
- export before close_binary: S/7-1:180; S/8-2:204
- passed structural claim is same Ghidra text: S/7-1:179
- quote target strings with address: S/8-2:203
- original flags, mask relocations: S/7-2:249
````
