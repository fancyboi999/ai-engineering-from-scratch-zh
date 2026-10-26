---
id: re-from-scratch-tools
title: 从零构建二进制分析工具
code: BA
subtitle: 读取 ELF 与 Mach-O，解码 x86-64，构建 CFG，提升到 C 并验证。仅使用 Python 标准库。
hue: 28
sources: phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch, phases/13-tools-and-protocols/33-disassembly-and-control-flow, phases/13-tools-and-protocols/34-lifting-to-pseudocode, projects/binary-inspector, projects/mini-decompiler
source_hash: 74057c431a63f960
---

## 从字节到经检查的 C
type: architecture
from: phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md, phases/13-tools-and-protocols/33-disassembly-and-control-flow/docs/zh.md, phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/zh.md, projects/mini-decompiler/README.md

```arch
node | obj | 1,1 | 目标文件 | clang 编译的 ledger.c | store
node | elf | 2,1 | ELF 读取器 | 节、符号、rela | process
node | dec | 3,1 | 解码器 | REX, ModRM, SIB | process
node | cfg | 4,1 | CFG | 基本块、支配关系 | process
node | ir | 4,2 | 提升器 | IR、标志变量 | process
node | ssa | 3,2 | SSA | phi、重命名 | process
node | opt | 2,2 | 简化 | 替换、死代码 | process
node | c | 1,2 | 结构化 | if, while, do while | model
edge | obj | elf | 字节
edge | elf | dec | 函数字节
edge | dec | cfg | 指令
edge | cfg | ir |
edge | ir | ssa |
edge | ssa | opt |
edge | opt | c | C 文本
```

## 运行课程
type: command-table
from: phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md, phases/13-tools-and-protocols/33-disassembly-and-control-flow/docs/zh.md, phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` (32) | 头部、节、符号、重定位、映射 |
| `python3 code/main.py <object>` (32) | 读取一个文件，选择 ELF 或 Mach-O |
| `python3 code/main.py` (33) | 为每个夹具输出一个 JSON 报告 |
| `python3 code/main.py disasm <object>` | 显示带重定位目标的反汇编列表 |
| `python3 code/main.py cfg <object> <function>` | 分析单个函数 |
| `python3 code/main.py` (34) | 将 IR、SSA、伪代码与 Ghidra 并排展示 |
| `python3 -m unittest discover -s code/tests -v` | 第 32 和 34 课的测试套件 |
| `python3 code/tests/test_main.py` | 第 33 课的测试套件 |

## ELF64 记录格式
type: task-table
from: phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md

| 任务 | 代码 |
|---|---|
| e_ident 后的头部，偏移 16 | `"<HHIQQQIHHHHHH"` |
| 节头部，64 字节 | `<IIQQQQIIQQ` |
| 符号，24 字节 | `<IBBHQQ` |
| Rela 记录，24 字节 | `<QQq` |
| 程序头部，56 字节 | `<IIQQQQQQ` |
| r_info 的符号索引 | `ELF64_R_SYM(i)` 为 `i >> 32` |
| r_info 的类型 | `ELF64_R_TYPE(i)` 为 `i & 0xffffffff` |
| Mach-O 符号，16 字节 | `nlist_64` 没有大小字段 |

## 地址计算
type: concepts
from: phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md, phases/13-tools-and-protocols/33-disassembly-and-control-flow/docs/zh.md, phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/zh.md

- **函数字节**：文件偏移为 `sh_offset + st_value - sh_addr`，长度为 `st_size`。
- **R_X86_64_PC32**：链接器将 `S + A - P` 写入字段。
- **R_X86_64_64**：`S + A`。**R_X86_64_PLT32**：`L + A - P`。
- **RIP 目标**：加数加 4。`lea` 上的 `.rodata+0x10` 表示 `.rodata+0x14`。
- **PT_LOAD**：文件偏移为 `p_offset + (address - p_vaddr)`。
- **Mach-O 大小**：同一节中下一个符号减去当前符号。
- **除以 10**：使用 `0x66666667` 并移位 34。误差 6 不超过 8。

## 用 Python 读取目标文件
type: annotated-code
lang: python
from: phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md, phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/code/main.py

```python
from main import ElfFile, MachOFile, FIXTURES
elf = ElfFile.from_path(FIXTURES / "ledger-x86_64-O1.o")
elf.header.e_shoff, elf.header.e_shnum      # 0x428，11 个头部
elf.function_span("percent_change")         # 0x40 处的 16 字节
elf.function_bytes("percent_change")        # 85 ff 74 09 ...
elf.relocations_for(".text")                # 3 条 R_X86_64_PC32 记录
elf.file_offset_map()                       # 3 个对齐间隙
tiny = ElfFile.from_path(FIXTURES / "tiny-x86_64")
tiny.address_to_file_offset(0x4000b0)       # 通过 PT_LOAD 得到 0xb0
macho = MachOFile.from_path(FIXTURES / "ledger-arm64-O1.o")
macho.function_span("_percent_change")      # 偏移 648 处的 24 字节
```

## 扫描还是递归下降：-O0 下的 grade
type: comparison
from: phases/13-tools-and-protocols/33-disassembly-and-control-flow/docs/zh.md

| 比较项 | 线性扫描 | 递归下降 | 带跳转表的递归下降 |
|---|---|---|---|
| 指令 | 34 | 25 | 33 |
| 基本块 | 9 | 3 | 8 |
| 边 | 7 | 2 | 11 |
| 失败 | 将数据解码成代码 | 在 `jmpq *%rax` 停止 | 无 |
| 用途 | 与参考工具比对 | 判断哪些字节会执行 | 恢复完整 CFG |

## 分析新的目标文件
type: flow
from: phases/13-tools-and-protocols/33-disassembly-and-control-flow/docs/zh.md

1. **参考工具**：先将解码器与 `llvm-objdump -d` 比较。
2. **递归下降**：从每个函数符号开始遍历，读取 `unresolved`。
3. **跳转表**：为每个间接跳转匹配跳转表惯用模式及其重定位。
4. **字节**：只有线性扫描识别的字节属于填充或数据。
5. **CFG**：用恢复的跳转表构建图。每条回边代表一个循环。

## 从指令到 IR
type: command-table
from: phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/zh.md

| 命令 | 作用 |
|---|---|
| `testl %edi, %edi` | `flags = test(edi, edi)` |
| `je 0xd` | `if je(flags) goto 0xd else goto 0x4` |
| `xorl %eax, %eax` | `eax = 0` |
| `cltd` | `edx = signfill(eax)` |
| `movslq %edi, %rax` | `rax = sext64(edi)` |
| `sarq $0x22, %rcx` | `rcx = rcx >>s 34` |
| `pushq %rbp` 与栈帧移动 | 不生成操作，仅记录栈帧 |
| `retq` | `return rax` |

## 故障与修正
type: troubleshooting
span: 2
from: phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md, phases/13-tools-and-protocols/33-disassembly-and-control-flow/docs/zh.md, phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| “`percent_change` 位于 0” | 将 `st_value` 当作文件偏移 | 使用 `sh_offset + st_value - sh_addr`，此处为 `0x40` |
| “`grade` 为 48 字节” | 将填充 `66 90` 算入代码 | `st_size` 为 46，填充不属于任何符号 |
| “跳转表从 `0x10` 开始” | 将加数当作目标偏移 | 加上到指令末尾的 4 字节，得到 `0x14` |
| 数据表上出现貌似合理的反汇编 | 线性扫描把数据解码为代码 | 从符号递归下降不会识别任何数据字节为指令 |
| 出现“jmp rax”和死基本块 | 间接跳转缺少跳转表 | 从 `.rela.rodata` 和边界检查读取目标 |
| 反编译器报告第三个参数 | `idivl` 写入 `%rdx`，且返回值宽度靠猜测 | 参数寄存器先读后写，才代表参数 |

## 两个项目
type: comparison
span: 2
from: projects/binary-inspector/README.md, projects/binary-inspector/API.md, projects/mini-decompiler/README.md

| 比较项 | binary-inspector | mini-decompiler |
|---|---|---|
| 产物 | ELF、PE/COFF、Mach-O 静态检查器 | x86-64 子集反编译器 |
| 输入 | ELF64 目标文件、COFF 目标文件、PE32+ 映像、Mach-O 64 | clang 构建的 ELF64 `ET_REL` 目标文件 |
| 输出 | JSON 报告、HTML 字节映射、构建差异 | 结构化 C 与 `report.json` |
| 运行 | `python3 cli.py inspect <file> --json report.json` | `python3 -m minidec verify <object> --source <source>` |
| 检查 | 用精确率与召回率评价函数起点 | 掩码字节与行为测试网格 |
| 退出 | 无效文件返回 2，附 `error: <message>` | `pass` 或 `behaviour-only` 返回 0，否则为 1 |

## 项目命令
type: command-table
span: 2
from: projects/binary-inspector/README.md, projects/binary-inspector/API.md, projects/mini-decompiler/README.md, projects/mini-decompiler/solution/minidec/cli.py

| 命令 | 作用 |
|---|---|
| `python3 scripts/project_test.py <project> --init learning-artifacts/<project>` | 创建工作区，阶段 1 故意失败 |
| `python3 scripts/project_test.py <project> --all --path learning-artifacts/<project> --strict` | 运行累积评分器 |
| `python3 cli.py inspect <stripped> --truth <unstripped> --html report.html` | 对照未剥离符号的构建结果评价函数起点 |
| `python3 cli.py diff <old> <new> --json diff.json` | 显示节增长、符号移动和导入变更 |
| `python3 -m minidec decompile <object> --ir --no-division-idioms` | 显示 IR 与 SSA，保留魔数乘法 |
| `python3 -m minidec verify <object> --source <source> --opt O1 --out <dir>` | 重新编译、比较字节并运行测试网格 |

## 问答
type: qa
from: phases/13-tools-and-protocols/33-disassembly-and-control-flow/docs/zh.md, phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/zh.md, phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md, projects/mini-decompiler/README.md

- **参考工具为何在陷阱处与扫描结果一致？** `llvm-objdump` 也采用线性扫描。
- **何时一条边是回边？** 目标支配源节点时，它标记一个循环。
- **-O1 下的 `total` 为何是 `do while`？** 循环头同时也是带回边的基本块。
- **-O1 下的 `grade` 为何没有跳转表？** 每个分支都返回常量，值表取代了跳转。
- **行为通过能证明等价吗？** 不能。它只覆盖一台主机上声明的测试网格。
