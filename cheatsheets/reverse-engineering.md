---
id: reverse-engineering
title: 使用 rea 进行逆向工程
code: RE
subtitle: 基于 rea 6.7.0 与 Ghidra 12.1.4：检查二进制文件、读取 Evidence 记录并比较证据包。
hue: 200
sources: manuals/reverse-engineering-101, phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch, phases/13-tools-and-protocols/33-disassembly-and-control-flow, phases/13-tools-and-protocols/34-lifting-to-pseudocode, phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns, phases/13-tools-and-protocols/36-rebuild-and-prove-equal, phases/13-tools-and-protocols/37-the-reverse-engineering-landscape, phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames, phases/13-tools-and-protocols/39-compiler-idioms-and-optimization, phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries, phases/13-tools-and-protocols/41-recovering-data-and-types, phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program, phases/13-tools-and-protocols/43-bytecode-and-managed-formats, phases/13-tools-and-protocols/44-binary-diffing-and-symbolic-execution, phases/13-tools-and-protocols/45-ai-assisted-reverse-engineering
source_hash: 889b1cd0ed689a54
---

## rea 与 Ghidra 的职责边界
type: architecture
from: manuals/reverse-engineering-101/sections/1-1-rea-providers-and-evidence.md

```arch
node | cli | 1,1 | rea CLI | 每次调用一个问题 | client
node | mcp | 2,1 | rea MCP server | 207 个工具，6 个 prompt | client
node | session | 3,1 | BinarySession | 一个活动目标 | process
node | art | 1,2 | rea-artifact-graph | 无需 Ghidra | process
node | prov | 2,2 | GhidraProvider | analyzeHeadless 与套接字 | process
edge | cli | session | 一个问题
edge | mcp | session | 一个会话
edge | session | prov | 绑定 Ghidra
edge | session | art | 检查
```

## 逐步完成一次检查
type: flow
from: manuals/reverse-engineering-101/sections/1-1-rea-providers-and-evidence.md, manuals/reverse-engineering-101/sections/3-1-inspect-artifact.md

1. **调用者**：运行 `rea inspect-artifact fixtures/ledger-arm64-O1 --format json`，不会启动 Ghidra。
2. **rea-artifact-graph**：计算文件的 SHA-256，并根据魔数识别格式。
3. **清单**：包含一个节点和一次出现，`integrity_policy` 为 `fail`。
4. **结果**：一秒内返回 Evidence 记录，无需 Java。

## 检查一个二进制文件的完整过程
type: annotated-code
lang: bash
from: manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md

```bash
rea doctor --provider ghidra                        # 检查 provider 是否健康
rea inspect-artifact <path>                         # 生成文件产物图，无需 Ghidra
rea analyze <path> --provider ghidra                # 统计段、过程与字符串
rea function <path> <name> --provider ghidra        # 读取一个过程的资料
rea decompile <path> <name> --provider ghidra       # 读取一个过程的伪代码
```

## 操作 Evidence 证据包
type: task-table
from: manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md

| 任务 | 代码 |
|---|---|
| 列出证据包记录，不含载荷 | `rea inspect-evidence-bundle '{"path":"<bundle>", "detail": "summary"}'` |
| 输出键按顺序排列的规范副本 | `rea evidence-export <bundle> <out>` |
| 验证包内每个记录 ID 与清单 | `rea evidence-import <bundle>` |
| 比较两个包的记录成员 | `rea compare <left> <right>` |
| 将虚拟地址映射到文件偏移 | `rea address-to-file-offset <path> <address> --provider ghidra` |

## 向 rea 提一个问题
type: task-table
from: manuals/reverse-engineering-101/sections/1-1-rea-providers-and-evidence.md

| 任务 | 代码 |
|---|---|
| 检查 Ghidra 与运行环境 | `rea doctor --provider ghidra --format json --filter-output healthy,environment_healthy,scope,scope_checks` |
| 列出能力 | `rea capabilities --format json` |
| 检查产物 | `rea inspect-artifact fixtures/ledger-arm64-O1 --format json` |
| 在 macOS 检查 Mach-O 布局 | `rea inspect-macho` |

## 命令与环境变量
type: command-table
from: manuals/reverse-engineering-101/sections/1-1-rea-providers-and-evidence.md, manuals/reverse-engineering-101/capture/README.md

| 命令 | 作用 |
|---|---|
| `rea function` | Calls `analyze_function` for one dossier per procedure |
| `rea decompile` | 调用 `procedure_pseudo_code` 读取伪代码 |
| `rea analyze` | 调用 `binary_overview` 检查整个二进制文件 |
| `GHIDRA_INSTALL_DIR` | Ghidra 安装目录，未设置时使用 Homebrew 路径 |

## 固定版本与限制
type: defaults
from: manuals/reverse-engineering-101/README.md, manuals/reverse-engineering-101/capture/README.md, manuals/reverse-engineering-101/sections/1-1-rea-providers-and-evidence.md, manuals/reverse-engineering-101/sections/3-1-inspect-artifact.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| rea | 6.7.0 | `rea-agents` 包版本 |
| Ghidra | 12.1.4 | PUBLIC 构建 |
| JDK | OpenJDK 21.0.12.1 | `JAVA_HOME` 或 Homebrew 路径 |
| 单次 Ghidra 调用 | 7 到 9 秒 | 导入到新建项目 |
| `integrity_policy` | fail | `inspect-artifact` 的参数 |

## 故障排查
type: troubleshooting
from: manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md, manuals/reverse-engineering-101/sections/1-1-rea-providers-and-evidence.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `rea doctor` 检查失败 | 缺少 rea 6.7.0、Ghidra 12.1.4 或 JDK 21 | 安装固定版本，再运行 `rea doctor` |
| 首次 Ghidra 调用耗时 7 到 9 秒 | Ghidra 将文件导入新建项目 | 保持同一个 MCP 会话 |
| `inspect-binary-layout` 返回 `capability_unavailable` | 该操作使用 pwntools 配置，仅支持 Linux x64 | 在 Linux x64 上运行，或在 macOS 使用 `rea inspect-macho` |

## 问答
type: qa
from: manuals/reverse-engineering-101/sections/1-1-rea-providers-and-evidence.md, manuals/reverse-engineering-101/sections/3-1-inspect-artifact.md

- **`inspect-artifact` 需要 Ghidra 吗？** 不需要。无需 Java，一秒内即可返回。
- **哪个命令返回单个函数的伪代码？** `rea decompile`，它会调用 `procedure_pseudo_code`。
- **检查新文件时先调用什么？** 运行 `rea inspect-artifact`，它不需要分析引擎。

## 提示
type: tips
from: manuals/reverse-engineering-101/sections/1-1-rea-providers-and-evidence.md

- 请求 rea 返回 Evidence 记录；有疑问时直接阅读 Ghidra 的原始清单。
- 单个问题使用 CLI，连续多个问题使用 MCP 服务会话。
- 对一个文件的首次 Ghidra 查询通常需要 7 到 9 秒，后续查询通常只需毫秒。
