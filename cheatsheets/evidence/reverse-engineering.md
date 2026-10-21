# Evidence: cheatsheets/reverse-engineering.md
upstream_revision: 45fa4084de6ba2f88fa96a41e69efa2166f868b3

# 证据对照：使用 rea 逆向工程

中文主题：[使用 rea 逆向工程](../reverse-engineering.md)。下列逐条英文记录保留冻结上游版本的路径、行号与数值；标题对应中文主题。

原始记录中的 docs/en.md 和行号只在上述 upstream 版本有效，不代表当前 docs/zh.md 的行号，也不表示本次重新运行了命令、GPU 测量或外部模型。当前中文主题的 from 路径另由构建器校验。

M = manuals/reverse-engineering-101, S = M/sections, O = M/capture/out, P13 = phases/13-tools-and-protocols

## rea CLI 任务 (task-table)

原始区块：rea CLI tasks (8)
- rea doctor --provider ghidra --format json: S/r-1-commands-and-tools.md:11; O/00-commands.txt:1
- rea capabilities --format json: S/r-1-commands-and-tools.md:12; O/00-commands.txt:4
- rea inspect-artifact <path>, no Java: S/r-1-commands-and-tools.md:13; S/1-1-rea-providers-and-evidence.md:65
- rea inspect-macho <path>: S/r-1-commands-and-tools.md:15
- rea analyze <path> --provider ghidra: S/r-1-commands-and-tools.md:16
- rea function <path> <name> --provider ghidra: S/r-1-commands-and-tools.md:17
- rea decompile <path> <name> --provider ghidra: S/r-1-commands-and-tools.md:18
- rea address-to-file-offset <path> <address> --provider ghidra: S/r-1-commands-and-tools.md:19

## 证据与 MCP 任务 (task-table)

原始区块：Evidence and MCP tasks (8)
- inspect-evidence-bundle '{"path":..., "detail": "summary"}': S/r-1-commands-and-tools.md:20
- evidence-export <bundle> <out>: S/r-1-commands-and-tools.md:21
- evidence-import <bundle>: S/r-1-commands-and-tools.md:22
- compare <left> <right>: S/r-1-commands-and-tools.md:23
- npx -y rea-agents mcp: S/8-1-the-rea-mcp-server.md:23
- rea setup writes client registrations: S/8-1-the-rea-mcp-server.md:33
- rea setup --client <id> --dry-run: S/8-1-the-rea-mcp-server.md:41
- python3 run.py --check: M/capture/README.md:7

## 从 shell 完成一次调查 (annotated-code)

原始区块：One investigation from the shell (14 lines)
- GHIDRA_INSTALL_DIR, JAVA_HOME absolute paths: S/r-1-commands-and-tools.md:57-58; JDK 21: S/2-2 (header and line 88)
- doctor, find first ok: false: S/2-2-rea-doctor-and-the-ghidra-provider.md:135
- analyze arm64 binary_overview: O/00-commands.txt:16; S/r-1-commands-and-tools.md:16
- function _percent_change, analyze_function: O/00-commands.txt:22; S/r-1-commands-and-tools.md:17
- decompile x86_64 grade, procedure_pseudo_code: O/00-commands.txt:40; S/r-1-commands-and-tools.md:18
- address-to-file-offset 0x100000518, offset 1304: O/00-commands.txt:43; S/3-3-address-to-file-offset.md:35,51
- compare O1 O2, exit 0, status unknown: O/00-commands.txt:58-59; S/r-3-errors.md:91

## rea 的组成 (architecture)

原始区块：How rea is built (7 nodes)
- rea CLI 153 commands, rea mcp 207 tools: S/1-1-rea-providers-and-evidence.md:19
- BinarySession one active target, shared by CLI and MCP: S/1-1-rea-providers-and-evidence.md:19
- Evidence record 16 fields, ev_ id: S/1-1-rea-providers-and-evidence.md:11-13
- Provider registry selects ghidra: S/1-1-rea-providers-and-evidence.md:17; S/1-2-rea-function-end-to-end.md:34
- Ghidra client private copy, bridge.sock: S/1-2-rea-function-end-to-end.md:36
- ReaGhidraBridge.java post-script, JSON line per request: S/1-1-rea-providers-and-evidence.md:57
- stdio JSON-RPC edge: S/8-1-the-rea-mcp-server.md:33

## 一次 rea function 调用 (flow)

原始区块：One rea function call (7)
1. parse header, architecture, hash: S/1-2-rea-function-end-to-end.md:33
2. selection_source "request": S/1-2-rea-function-end-to-end.md:34
3. analysis profile hashed: S/1-2-rea-function-end-to-end.md:35
4. copy and java -readOnly -deleteProject: S/1-2-rea-function-end-to-end.md:36
5. ping checks run_id, token, digests, analysis_complete: S/1-2-rea-function-end-to-end.md:37
6. one JSON line, one Evidence record: S/1-2-rea-function-end-to-end.md:38-39
7. shutdown 10 s, project deleted: S/1-2-rea-function-end-to-end.md:40

## MCP 工具 (command-table)

原始区块：MCP tools (8)
- open_binary binds provider, starts no process: S/r-1-commands-and-tools.md:37
- binary_session tool availability: S/r-1-commands-and-tools.md:38
- list_procedures: S/r-1-commands-and-tools.md:39
- procedure_assembly: S/r-1-commands-and-tools.md:40
- xrefs: S/r-1-commands-and-tools.md:41
- analyze_function: S/r-1-commands-and-tools.md:43
- export_evidence_bundle before close_binary: S/r-1-commands-and-tools.md:44; S/7-1-verify-reconstruction.md:180
- verify_reconstruction pass/fail/unknown: S/r-1-commands-and-tools.md:47

## 课程中的原生工具 (command-table)

原始区块：Native tools from the lessons (8)
- llvm-objdump -d -r linear sweep with relocations: P13/37-the-reverse-engineering-landscape/docs/en.md:71; P13/39-compiler-idioms-and-optimization/docs/en.md:35
- llvm-objdump -t value and size: P13/32-program-anatomy-elf-from-scratch/docs/en.md:45
- llvm-objdump -h section sizes: P13/38-calling-conventions-and-stack-frames/docs/en.md:146
- nm -m library per symbol: P13/40-linking-loading-and-stripped-binaries/docs/en.md:187
- wasm-objdump -d: P13/43-bytecode-and-managed-formats/docs/en.md:15
- clang -target x86_64-unknown-linux-gnu -c: P13/34-lifting-to-pseudocode/docs/en.md:460
- break bump / breakpoint set -n bump: P13/42-dynamic-analysis-of-your-own-program/docs/en.md:289 (gdb and lldb table)
- python3 -m unittest discover -s code/tests -v: P13/36-rebuild-and-prove-equal/docs/en.md:403

## 优先阅读的证据字段 (concepts)

原始区块：Evidence fields to read first (8)
- evidence_id: S/r-2-evidence-fields.md:13
- subject: S/r-2-evidence-fields.md:14
- provider: S/r-2-evidence-fields.md:15
- analysis_profile: S/r-2-evidence-fields.md:16
- confidence: S/r-2-evidence-fields.md:22,36
- authority: S/r-2-evidence-fields.md:23,37; S/5-1-the-evidence-record.md:91
- limitations: S/r-2-evidence-fields.md:25
- relationship_coverage: S/r-2-evidence-fields.md:26

## 默认值 (defaults)

原始区块：Defaults (7)
- REA_GHIDRA_STARTUP_TIMEOUT_MS 330,000 ms: S/r-1-commands-and-tools.md:59; S/8-1-the-rea-mcp-server.md:213
- client tool call 60,000 ms, SDK 2.3.1: S/8-1-the-rea-mcp-server.md:214
- TOON without --format: S/1-2-rea-function-end-to-end.md:21
- confidence observed when the producer names none: S/5-1-the-evidence-record.md:87
- authority shipped-artifact when the producer names none: S/5-1-the-evidence-record.md:87
- relationship_coverage null, out of the id hash: S/r-2-evidence-fields.md:5,49
- answer cache 10,000 for one target: S/r-4-glossary.md:10

## 故障排查 (troubleshooting)

原始区块：Troubleshooting (7)
- capability_unavailable, Linux x64 only, inspect-macho: S/r-3-errors.md:9-30; M/capture/README.md:115
- client timeout, Java keeps running: S/8-1-the-rea-mcp-server.md:5 and takeaways
- provider_timeout first call: S/r-3-errors.md:106
- target_unavailable "No app is open.": S/r-3-errors.md:106
- compare unknown, exit 0, not an error: S/r-3-errors.md:91
- healthy vs environment_healthy: S/2-2-rea-doctor-and-the-ghidra-provider.md:121,137
- masked compare passes wrong constant: S/7-2-a-proof-harness-outside-rea.md:176,250

## 术语表 (glossary)

原始区块：Glossary (8)
- Dossier: S/r-4-glossary.md:23
- Provider: S/r-4-glossary.md:38
- Bridge: S/r-4-glossary.md:16
- Thunk: S/r-4-glossary.md:50
- Jump table: S/r-4-glossary.md:35
- Relocation masking: S/r-4-glossary.md:41
- Residual unknown: S/r-4-glossary.md:42
- File offset: S/r-4-glossary.md:28

## 问答 (qa)

原始区块：Q&A (5)
- rea adds adapters, session, Evidence. Ghidra does import, analysis, decompilation: S/1-1-rea-providers-and-evidence.md:3,49
- 7 to 9 s per CLI call, under 100 ms later: S/1-1-rea-providers-and-evidence.md:59
- observed means engine output recorded: S/5-1-the-evidence-record.md:180
- id leaves out subject.name and subject.local_path: S/r-2-evidence-fields.md:47
- offset = address - vmaddr + fileoff, 0x100000518 to 1304: S/3-3-address-to-file-offset.md:51,57

## 提示 (tips)

原始区块：Tips (6)
- one exact version: S/8-1-the-rea-mcp-server.md:29, takeaways
- read confidence, authority, limitations first: S/5-1-the-evidence-record.md:179
- export before close_binary: S/7-1-verify-reconstruction.md:180; S/8-2-an-agent-investigation.md:204
- passed structural claim is same Ghidra text: S/7-1-verify-reconstruction.md:179
- quote target strings with address: S/8-2-an-agent-investigation.md:203
- original flags, mask relocations: S/7-2-a-proof-harness-outside-rea.md:249
## 上游附记：Front matter
- subtitle pin rea-agents 6.7.0, Ghidra 12.1.4: M/manual.json:11
