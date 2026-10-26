# Evidence: cheatsheets/reverse-engineering.md
upstream_revision: 3f9715c62a3bedcffb68a260f1a65ee2dd9cc10a

# 证据对照：使用 rea 进行逆向工程

下列英文记录保留冻结上游的路径、行号和数值。它们不代表中文行号，也不代表本次重新运行了命令、GPU 测量或外部模型。区块标题对应中文速查表。

Abbreviations: M = manuals/reverse-engineering-101, S1 = manuals/reverse-engineering-101/sections, CR = manuals/reverse-engineering-101/capture.

## rea 与 Ghidra 的职责边界 (architecture, 5 nodes, 4 edges)
- rea CLI, one question per call: S1/1-1-rea-providers-and-evidence.md:21
- rea MCP server, 207 tools and 6 prompts: S1/1-1-rea-providers-and-evidence.md:21
- BinarySession, one active target: S1/1-1-rea-providers-and-evidence.md:21
- rea-artifact-graph, no Ghidra needed: S1/1-1-rea-providers-and-evidence.md:67
- GhidraProvider, analyzeHeadless and a socket: S1/1-1-rea-providers-and-evidence.md:17, 57

## 逐步完成一次检查 (flow, 4 steps)
1. Caller runs rea inspect-artifact: S1/1-1-rea-providers-and-evidence.md:37, S1/3-1-inspect-artifact.md:17
2. Hash and format from magic bytes: S1/1-1-rea-providers-and-evidence.md:65
3. Manifest with integrity_policy fail: S1/3-1-inspect-artifact.md:50
4. Answer under a second without Java: S1/1-1-rea-providers-and-evidence.md:67

## 检查一个二进制文件的完整过程 (annotated-code, 5 lines)
- rea doctor --provider ghidra, one check per row: S1/r-1-commands-and-tools.md:13
- rea inspect-artifact <path>, artifact graph: S1/r-1-commands-and-tools.md:15
- rea analyze <path> --provider ghidra, segments and counts: S1/r-1-commands-and-tools.md:18
- rea function <path> <name> --provider ghidra, dossier: S1/r-1-commands-and-tools.md:19
- rea decompile <path> <name> --provider ghidra, pseudocode: S1/r-1-commands-and-tools.md:20

## 操作 Evidence 证据包 (task-table, 5 rows)
- rea inspect-evidence-bundle, one row per record without payloads: S1/r-1-commands-and-tools.md:22
- rea evidence-export <bundle> <out>, keys sorted: S1/r-1-commands-and-tools.md:23
- rea evidence-import <bundle>, validates every record id and manifest: S1/r-1-commands-and-tools.md:24
- rea compare <left> <right>, record membership: S1/r-1-commands-and-tools.md:25
- rea address-to-file-offset <path> <address> --provider ghidra: S1/r-1-commands-and-tools.md:21

## 向 rea 提一个问题 (task-table, 4 rows)
- rea doctor --provider ghidra with filter-output: S1/1-1-rea-providers-and-evidence.md:31
- rea capabilities --format json: S1/1-1-rea-providers-and-evidence.md:34
- rea inspect-artifact fixtures/ledger-arm64-O1: S1/1-1-rea-providers-and-evidence.md:37
- rea inspect-macho on macOS: S1/1-1-rea-providers-and-evidence.md:67

## 命令与环境变量 (command-table, 4 rows)
- rea function calls analyze_function: S1/1-1-rea-providers-and-evidence.md:21
- rea decompile calls procedure_pseudo_code: S1/1-1-rea-providers-and-evidence.md:21
- rea analyze calls binary_overview: S1/1-1-rea-providers-and-evidence.md:21
- GHIDRA_INSTALL_DIR and Homebrew path: CR/README.md:27

## 固定版本与限制 (defaults, 5 rows)
- rea 6.7.0: M/README.md:27
- Ghidra 12.1.4: M/README.md:28
- JDK OpenJDK 21.0.12.1: M/README.md:29
- One-shot Ghidra call 7 to 9 s: S1/1-1-rea-providers-and-evidence.md:61
- integrity_policy fail: S1/3-1-inspect-artifact.md:50

## 故障排查 (troubleshooting, 3 rows)
- rea doctor fails a check, missing pinned tool: S1/r-1-commands-and-tools.md:13, CR/README.md:11
- First Ghidra call 7 to 9 s, fresh project: S1/1-1-rea-providers-and-evidence.md:61
- inspect-binary-layout capability_unavailable on macOS, use inspect-macho: S1/r-1-commands-and-tools.md:16-17

## 问答 (qa, 3 items)
- Does inspect-artifact need Ghidra: S1/1-1-rea-providers-and-evidence.md:67
- Which command gives pseudocode: S1/1-1-rea-providers-and-evidence.md:21
- First call on a new file: S1/3-1-inspect-artifact.md:17

## 提示 (tips, 3 bullets)
- Evidence record and Ghidra listing: S1/1-1-rea-providers-and-evidence.md:74
- CLI for one question, MCP for a session: S1/1-1-rea-providers-and-evidence.md:75
- 7 to 9 s first, then milliseconds: S1/1-1-rea-providers-and-evidence.md:77
