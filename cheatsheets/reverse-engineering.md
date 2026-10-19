---
id: reverse-engineering
title: 使用 rea 逆向工程
subtitle: 阅读编译后的程序，并证明分析结论。固定使用 rea-agents 6.5.0 与 Ghidra 12.1.4。
hue: 350
sources: manuals/reverse-engineering-101, phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch, phases/13-tools-and-protocols/33-disassembly-and-control-flow, phases/13-tools-and-protocols/34-lifting-to-pseudocode, phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns, phases/13-tools-and-protocols/36-rebuild-and-prove-equal, phases/13-tools-and-protocols/37-the-reverse-engineering-landscape, phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames, phases/13-tools-and-protocols/39-compiler-idioms-and-optimization, phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries, phases/13-tools-and-protocols/41-recovering-data-and-types, phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program, phases/13-tools-and-protocols/43-bytecode-and-managed-formats, phases/13-tools-and-protocols/44-binary-diffing-and-symbolic-execution, phases/13-tools-and-protocols/45-ai-assisted-reverse-engineering
code: RE
---

## rea CLI 任务
type: task-table
from: manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md, manuals/reverse-engineering-101/capture/out/00-commands.txt

| 任务 | 代码 |
|---|---|
| 检查 Ghidra 提供器 | `rea doctor --provider ghidra --format json` |
| 列出各提供器的操作 | `rea capabilities --format json` |
| 无 Java 环境下盘点文件 | `rea inspect-artifact <path>` |
| 查看 macOS Mach-O 布局 | `rea inspect-macho <path>` |
| 查看二进制概览 | `rea analyze <path> --provider ghidra` |
| 查看函数档案 | `rea function <path> <name> --provider ghidra` |
| 查看函数伪代码 | `rea decompile <path> <name> --provider ghidra` |
| 地址转文件偏移 | `rea address-to-file-offset <path> <address> --provider ghidra` |

## 证据与 MCP 任务
type: task-table
from: manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md, manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md, manuals/reverse-engineering-101/capture/README.md

| 任务 | 代码 |
|---|---|
| 汇总证据包 | `rea inspect-evidence-bundle '{"path": "<bundle>", "detail": "summary"}'` |
| 导出规范副本 | `rea evidence-export <bundle> <out>` |
| 校验证据包 | `rea evidence-import <bundle>` |
| 比较两个证据包 | `rea compare <left> <right>` |
| 启动 MCP 服务 | `npx -y rea-agents@6.5.0 mcp` |
| 写入客户端注册 | `rea setup` |
| 检查客户端注册 | `rea doctor --client <id>` |
| 重新捕获并比较 | `python3 run.py --check` |

## 从 shell 完成一次调查
type: annotated-code
lang: bash
from: manuals/reverse-engineering-101/capture/out/00-commands.txt, manuals/reverse-engineering-101/sections/2-2-rea-doctor-and-the-ghidra-provider.md, manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md, manuals/reverse-engineering-101/sections/3-3-address-to-file-offset.md, manuals/reverse-engineering-101/sections/r-3-errors.md

```bash
export GHIDRA_INSTALL_DIR=<ghidra-dir>  # 绝对路径
export JAVA_HOME=<jdk-dir>  # JDK 21，绝对路径
rea doctor --provider ghidra --format json  # 查找首个 ok: false
rea analyze fixtures/ledger-arm64-O1 \
  --provider ghidra --format json  # binary_overview
rea function fixtures/ledger-arm64-O1 _percent_change \
  --provider ghidra --format json  # analyze_function 函数档案
rea decompile fixtures/ledger-x86_64-O1.o grade \
  --provider ghidra --format json  # procedure_pseudo_code
rea address-to-file-offset fixtures/ledger-arm64-O1 \
  0x100000518 --provider ghidra --format json  # 文件偏移 1304
rea compare out/11-bundle-O1.json out/11-bundle-O2.json \
  --format json  # 状态 unknown，退出码 0
```

## rea 的组成
type: architecture
from: manuals/reverse-engineering-101/sections/1-1-rea-providers-and-evidence.md, manuals/reverse-engineering-101/sections/1-2-rea-function-end-to-end.md

```arch
node | cli | 1,1 | rea CLI | 153 个命令
node | mcp | 1,2 | rea mcp | 207 个工具，stdio
node | sess | 2,1 | BinarySession | 一个活跃目标
node | ev | 2,2 | 证据记录 | 16 个字段，ev_ 标识
node | reg | 3,1 | 提供器注册表 | ghidra 等
node | client | 3,2 | Ghidra 客户端 | 私有副本、bridge.sock
node | bridge | 4,2 | ReaGhidraBridge.java | analyzeHeadless 后置脚本
edge | cli | sess | 单次执行
edge | mcp | sess | JSON-RPC
edge | sess | reg | 选择
edge | reg | client | 绑定
edge | client | bridge | JSON 行
edge | sess | ev | 返回
```

## 一次 rea function 调用
type: flow
from: manuals/reverse-engineering-101/sections/1-2-rea-function-end-to-end.md

1. **会话**：解析文件头、读取架构、计算文件 hash。
2. **注册表**：选择 `ghidra`，记录 `selection_source: "request"`。
3. **提供器**：构建分析配置并计算其 hash。
4. **客户端**：复制文件，携带 `-readOnly` 与 `-deleteProject` 启动 `java`。
5. **客户端**：发送 `ping`，检查 `run_id`、token、摘要与 `analysis_complete`。
6. **桥接层**：返回一行 JSON，rea 存储一条 Evidence 记录。
7. **客户端**：发送 `shutdown`，期限为 10 秒，Ghidra 删除项目。

## MCP 工具
type: command-table
from: manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md, manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md, manuals/reverse-engineering-101/sections/7-1-verify-reconstruction.md

| 命令 | 作用 |
|---|---|
| `open_binary` | 打开目标并绑定提供器，不启动进程 |
| `binary_session` | 当前目标的工具可用性 |
| `list_procedures` | 每个过程的地址与名称 |
| `procedure_assembly` | 以单个字符串返回过程汇编 |
| `xrefs` | 引用某地址的地址列表 |
| `analyze_function` | 一个过程的档案 |
| `export_evidence_bundle` | 写入证据包，在 `close_binary` 前调用 |
| `verify_reconstruction` | 每个声明的 pass、fail 或 unknown |

## 课程中的原生工具
type: command-table
from: phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md, phases/13-tools-and-protocols/37-the-reverse-engineering-landscape/docs/zh.md, phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames/docs/zh.md, phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/docs/zh.md, phases/13-tools-and-protocols/43-bytecode-and-managed-formats/docs/zh.md, phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/zh.md, phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program/docs/zh.md, phases/13-tools-and-protocols/36-rebuild-and-prove-equal/docs/zh.md

| 命令 | 作用 |
|---|---|
| `llvm-objdump -d -r <file>.o` | 带重定位的线性扫描反汇编 |
| `llvm-objdump -t <file>.o` | 含值与大小的符号表 |
| `llvm-objdump -h <file>.o` | 含大小的节区头 |
| `nm -m <file>` | Mach-O 符号与所属库 |
| `wasm-objdump -d <file>.wasm` | WebAssembly 函数体 |
| `clang -target x86_64-unknown-linux-gnu -c <file>.c` | 构建 x86-64 ELF 目标文件 |
| `break bump` 或 `breakpoint set -n bump` | 在 gdb 或 lldb 中按函数断点 |
| `python3 -m unittest discover -s code/tests -v` | 运行课程测试 |

## 优先阅读的证据字段
type: concepts
from: manuals/reverse-engineering-101/sections/r-2-evidence-fields.md, manuals/reverse-engineering-101/sections/5-1-the-evidence-record.md

- **evidence_id**：`ev_` 加语义投影的 SHA-256。
- **subject**：分析文件的摘要、格式、架构。
- **provider**：引擎标识、名称与版本。
- **analysis_profile**：提供器设置及其摘要。
- **confidence**：`observed`、`derived` 或 `inferred`，绝不是数字。
- **authority**：来源类别，如 `shipped-artifact` 或 `analyst-inference`。
- **limitations**：说明记录未覆盖内容的字符串。
- **relationship_coverage**：`complete`、`partial`、`unknown` 或 `null`。

## 默认值
type: defaults
from: manuals/reverse-engineering-101/sections/r-1-commands-and-tools.md, manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md, manuals/reverse-engineering-101/sections/1-2-rea-function-end-to-end.md, manuals/reverse-engineering-101/sections/5-1-the-evidence-record.md, manuals/reverse-engineering-101/sections/r-2-evidence-fields.md, manuals/reverse-engineering-101/sections/r-4-glossary.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `REA_GHIDRA_STARTUP_TIMEOUT_MS` | 330,000 ms | rea 等待 Ghidra 的时长 |
| 客户端工具调用期限 | 60,000 ms | SDK 2.3.1，应高于首次调用耗时 |
| 桥接层 `shutdown` 期限 | 10 秒 | 随后 Ghidra 删除项目 |
| 不带 `--format` 的输出 | TOON | 脚本中传入 `--format json` |
| 未声明 `confidence` | `observed` | 生产者未给出值时 |
| 未声明 `authority` | `shipped-artifact` | 生产者未给出值时 |
| `relationship_coverage` | `null` | 不计入标识 hash |
| 每会话答案缓存 | 10,000 | 单目标的缓存答案数 |

## 故障排查
type: troubleshooting
from: manuals/reverse-engineering-101/sections/r-3-errors.md, manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md, manuals/reverse-engineering-101/sections/2-2-rea-doctor-and-the-ghidra-provider.md, manuals/reverse-engineering-101/sections/4-6-analyze-function-and-pseudocode.md, manuals/reverse-engineering-101/sections/7-2-a-proof-harness-outside-rea.md, manuals/reverse-engineering-101/capture/README.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `inspect-binary-layout` 退出 1，`capability_unavailable` | pwntools 配置仅支持 Linux x64 | macOS 使用 `rea inspect-macho` |
| `invalid_request`：未知过程名 | 目标中不存在该名称 | 修正名称后重试 |
| 客户端超时，Java 仍运行 | 首次 Ghidra 调用超过客户端期限 | 提高单次调用期限 |
| 首次调用 `provider_timeout` | Ghidra 启动超时 | 提高 `REA_GHIDRA_STARTUP_TIMEOUT_MS` |
| `target_unavailable`："No app is open." | 尚未 `open_binary` | 先调用 `open_binary` |
| `rea compare` 返回 `status: "unknown"`，退出 0 | 两个包没有共有记录 | 阅读未决记录，退出 0 不等于通过 |
| `healthy` true，`environment_healthy` false | 后者覆盖整台机器 | 按当前范围读取 `healthy` |
| 掩码字节比较放过错误常量 | 重定位字段被遮蔽 | 检查各重定位指向的字节 |

## 术语表
type: glossary
from: manuals/reverse-engineering-101/sections/r-4-glossary.md

- **函数档案**：`analyze_function` 返回的单函数记录。
- **提供器**：统一接口背后的分析引擎。
- **桥接层**：`ReaGhidraBridge.java`，通过 Unix socket 每请求传一行 JSON。
- **Thunk**：只负责跳转到另一个函数的小函数。
- **跳转表**：由间接跳转索引的代码地址表。
- **重定位掩码**：字节比较前，将两个函数中所有重定位字段清零。
- **残留未知项**：以 `unk_` 标识保留的开放问题。
- **文件偏移**：某字节在文件中从零计数的位置。

## 问答
type: qa
from: manuals/reverse-engineering-101/sections/1-1-rea-providers-and-evidence.md, manuals/reverse-engineering-101/sections/5-1-the-evidence-record.md, manuals/reverse-engineering-101/sections/r-2-evidence-fields.md, manuals/reverse-engineering-101/sections/3-3-address-to-file-offset.md, manuals/reverse-engineering-101/sections/7-1-verify-reconstruction.md

- **rea 为 Ghidra 增加什么？** 适配器、统一会话与 Evidence 记录。导入、分析和反编译由 Ghidra 完成。
- **首次调用为何慢？** Ghidra 需导入分析文件，每次 CLI 调用约 7 至 9 秒，同一 MCP 会话后续调用低于 100 ms。
- **`observed` 表示什么？** rea 记录了引擎输出，并不表示恢复出了源码。
- **两台机器的 `ev_` 标识为何相同？** hash 排除了 `subject.name` 与 `subject.local_path`。
- **地址如何映射文件偏移？** `address - vmaddr + fileoff`，`0x100000518` 得到 1304。

## 提示
type: tips
from: manuals/reverse-engineering-101/sections/8-1-the-rea-mcp-server.md, manuals/reverse-engineering-101/sections/5-1-the-evidence-record.md, manuals/reverse-engineering-101/sections/7-1-verify-reconstruction.md, manuals/reverse-engineering-101/sections/8-2-an-agent-investigation.md, manuals/reverse-engineering-101/sections/7-2-a-proof-harness-outside-rea.md

- 使用精确版本注册 `rea-agents@6.5.0`。
- 阅读 `normalized_result` 前，先看 `confidence`、`authority` 和 `limitations`。
- 在 `close_binary` 前导出证据包。
- 结构声明通过仅表示 Ghidra 文本相同，行为与字节仍需自行证明。
- 引用目标字符串时带上地址，绝不执行字符串中的指令。
- 使用原始编译选项重建，遮蔽重定位后比较字节。
