# 逆向工程全景：历史、工具家族与反编译器构造

> 五款工具读取同一目标文件，对一个 switch 给出四种地址、三种块计数、两种答案。本课构建测试程序，分清这些差异。

**类型：** Build
**语言：** Python、C、x86-64 汇编、Java（一份 Ghidra 脚本）
**前置要求：** 阶段 13 · 32（从零读取 ELF）、阶段 13 · 33（反汇编与控制流）、阶段 13 · 34（提升为伪代码）
**预计时间：** 约 150 分钟

## 学习目标

- 将主要工具放入 1973 至 2026 年的时间线，指出所属家族。
- 说出反编译器的八个阶段，以及 Ghidra、Binary Ninja、Hex-Rays、radare2、rizin、angr 对各阶段的称呼。
- 将指令提升为 ESIL、RzIL、P-code、VEX，解释哪些立即计算标志、哪些保存延迟计算状态。
- 将五款工具的地址归一到 `.text` 偏移，在一个函数上证明转换正确。
- 构建读取捕获工具输出的比较程序，报告指令起点、块、边、函数起点的一致性。
- 根据捕获证据指出各工具在哪里误识别代码、遗漏代码或停在间接跳转。

## 问题背景

你让 agent 总结三款逆向工具对 `ledger-x86_64-O1.o` 的 grade 分析。它各运行一次，阅读列表，报告函数在三者中分别位于 `0x08000050`、`0x400010`、`0x100010`，断言工具对函数位置存在分歧。

工具实际一致。目标文件可重定位，没有加载地址，因此各工具自行选择。减去各工具为 `.text` 设置的地址，答案都是 `0x10`。agent 比较原始地址，是因为不知道各工具的地址含义。

同一 agent 随后读取 `-O0` 的 grade，报告四款工具给出 3、8、8、9 个基本块。数字都真实：一个停在 jmp rax，两个通过重定位读取跳转表，另一个为放标签在跳转处切块。不解释原因的块数，只是没有主张的数字。

本课提供信任这些数字之前所需的地图。第 32–36 课构建了解码器、提升器、证据记录和重建；路线后半将其与实用工具并排比较。为此需要领域历史、工具家族、反编译流水线，以及对自行编译目标比较各工具结论的测试程序。

```figure
re-37-field-map
```

## 五十三年时间线

领域历史比多数工具更长。下列日期均在延伸阅读中有一手来源。

### 1973–1991：先有调试器，再有反汇编器

最早的反编译学位论文出现在 1973 年，作者分别是斯坦福的 Hollander 和普渡的 Housel，今天主要通过引文为人所知。当时实用工具是调试器。Maranzano、Bourne 于 1977 年在贝尔实验室编写 adb 教程，UNIX V7 于 1979 年附带该调试器。Tim Paterson 的 DEBUG 带 8086 反汇编器，于 1981 年 8 月随 PC-DOS 1.00 发布。Richard Stallman 的 GDB 于 1986 年开始分发。SoftICE 于 1987 年将内核调试器带入 DOS。

批处理反汇编器随后出现。V Communications 于 1988 年推出 Sourcer，对 DOS 程序多遍分析并输出注释列表。GNU binutils 从 1988 年无编号快照开始，objdump 的版权年份为 1990。Ilfak Guilfanov 于 1991 年 1 月写下 IDA 首行代码，5 月 20 日以共享软件发布 IDA 0.1。

### 1991–2009：交互式反汇编与早期反编译器

Cristina Cifuentes 于 1994 年 7 月在 QUT 完成“Reverse Compilation Techniques”。其 dcc 将 i80286 DOS 程序转为 C，1995 年与 Gough 的论文确立了后续反编译器沿用的阶段。REC 于 1997 年出现；2002 年的 Boomerang 是首个开源反编译器，使用 BSD 许可。

IDA 于 1996 年在 DataRescue 成为商业产品，1999 年加入插件 SDK，随后转到 2005 年成立的 Hex-Rays。Hex-Rays Decompiler 1.0 于 2007 年 9 月 17 日发布。同年 Mike Van Emmerik 提交“Static Single Assignment for Decompilation”，将 SSA 放在反编译数据流核心。Halvar Flake 的“Structural Comparison of Executable Objects”（2004）开启二进制差分家族，BinDiff 于 2004 年 8 月销售。

radare 于 2006 年 2 月始于支持 64 位偏移的取证十六进制编辑器。模块化重写 radare2 使用 LGPL-3.0，首次发布于 2009 年 3 月 7 日。

### 2009–2019：框架与中间表示

LLDB 于 2010 年 6 月 8 日成为 LLVM 子项目。BAP（Binary Analysis Platform）及 BIL 中间语言发表于 CAV 2011。Google 于 2011 年 3 月 1 日收购 BinDiff 开发者 zynamics。Hopper 约在 2011 年末进入 Mac App Store。Matt Godbolt 于 2012 年创建 Compiler Explorer，让 C++ 开发者查看编译器生成的汇编。

angr 的首行代码写于 2013 年 8 月。Phoenix（Schwartz、Lee、Woo、Brumley，USENIX Security 2013）展示保语义结构恢复，8,676 个函数只留下 40 条 goto。DREAM（Yakdan 等，NDSS 2015）用不依赖模式的结构恢复消除 goto。Vector 35 于 2015 年 1 月 14 日成立，Binary Ninja 于 2016 年 7 月 23 日上市，带 Low Level IL 和 Python API。angr 于 2015 年公开发布，2016 年 8 月获 DARPA Cyber Grand Challenge 第三名。BinDiff 于 2016 年 3 月免费。Cutter 1.0 于 2017 年 12 月为 radare2 提供 Qt GUI。2018 年 Guilfanov 在 Recon 首次公开介绍 Hex-Rays IR，题为“Decompiler internals: microcode”。

### 2019–2026：开放反编译器与研究转向

NSA 于 2019 年 3 月 5 日 RSA 大会按 Apache-2.0 发布 Ghidra 9.0，一个月后在 GitHub 开放完整源码。同年 angr 8.19.2.4 加入初步反编译器。Binary Ninja 2.0 于 2020 年 5 月 20 日发布 High Level IL 反编译器。Rizin 于 2020 年 12 月 8 日宣布从 radare2 分叉，Cutter 团队随之迁移。IDA Freeware 7.6 于 2021 年 5 月添加云端 x64 反编译器。

BinDiff 8 于 2023 年 9 月 25 日按 Apache-2.0 开源。SAILR（Basque 等，USENIX Security 2024）成为 angr 默认结构恢复器，主张只删除额外引入的 goto，因为 Linux 6.1 源码本身有 3,754 条。Binary Ninja 4.0 于 2024 年 2 月增加 Free 版，IDA 9.0 增加无界面 idalib。学习式反编译论文从 SLaDe（2023）、LLM4Decompile（2024）、DecompileBench（2025），发展到 2026 年关于 agent 辅助可读性，以及“重编译更多、保留更少”的两项研究。

本课原始运行使用 2026-10-14 时的版本：Ghidra 12.1.4（2026-09-21）、radare2 6.2.4（2026-10-05）、rizin 0.9.1（2026-06-29）、angr 10.0.3（2026-10-10）。当时的闭源工具版本为 Binary Ninja 6.0 Krypton（2026-09-03）、IDA 9.4（2026-07-13），本课未运行它们。

## 工具家族

按产物划分工具家族。一个程序可横跨多类，而重叠正是多数混淆的来源。

### 反汇编器

线性扫描从代码节首字节一直解码到末尾。GNU `objdump -d`、`llvm-objdump -d` 如此工作，二者都不构建控制流图。GNU objdump 以符号为指令边界，在符号间扫描。binutils 2.47（2026-07-26）采用 GPL-3.0-or-later；LLVM 23.1.3 采用带 LLVM 例外的 Apache-2.0。Apple Command Line Tools 的版本标为 Apple LLVM version 17.0.0，本课捕获的就是这一份。

交互式反汇编器从已知入口递归下降，辅以函数起点启发式，并维护数据库。此类包括 IDA Pro（处理器模块、自动分析队列、FLIRT 签名）、Ghidra（Disassembler 加自动分析器）、Binary Ninja（递归下降后扫描未知区域）、Hopper、radare2/rizin（aa、aaa、af），以及 GUI Cutter、iaito。Andriesse 等（USENIX Security 2016）对九款工具测试编译器生成的二进制，指令准确率接近 100%，困难在函数起点，漏报率可达 20% 或以上。

### 反编译器

商业工具有 Hex-Rays Decompiler（从 x86 到 RISC-V 共十二类目标）、Binary Ninja 的 HLIL/Pseudo C、Hopper 的伪代码视图。开放工具有 Ghidra（Apache-2.0 C++ 引擎，r2ghidra/rz-ghidra 作为插件复用，pypcode 作为提升器复用）、angr（BSD-2-Clause，AIL 加 SAILR）、JavaScript 的 r2dec/jsdec，以及历史上的 Boomerang、dcc。radare2 还内置 pdc，即类 C 语法的伪反汇编。rizin 无内置反编译器，0.9.1 没有 pdc，pdg 需要 rz-ghidra 插件。

### 调试器

包括 GDB（1986）与 GEF、pwndbg 前端，LLDB（2010），带 Time Travel Debugging 的 WinDbg（2017），2014 年停止更新的 OllyDbg，x64dbg（GPL-3.0，2014），带 Python 连接器的 Ghidra Debugger，Binary Ninja 调试器，以及 radare2/rizin 内置调试器。第 42 课会对自有构建使用其中两款。

### 二进制分析框架

Andriesse 提到的框架包括 angr（VEX、符号执行、CFGFast/CFGEmulated、反编译器）、BAP（BIL、OCaml）、Dyninst、Jakstab、ByteWeight。Ghidra 可通过 PyGhidra 当库使用，Binary Ninja 用 `import binaryninja`，IDA 用 idalib。

### 格式与引擎库

LIEF 1.0.0（2026-07-12，Apache-2.0）解析 ELF、PE、Mach-O、COFF、Android 格式。CLE 即 CLE Loads Everything，是 angr 加载器。Capstone 5.0.9（2026-05-28，BSD-3-Clause）解码，Keystone 0.9.2（GPL-2.0）汇编，Unicorn 2.1.4（GPL-2.0）模拟。radare2 6.2.4 捆绑 Capstone 5，rizin 0.9.1 内置 Capstone、Zydis、tree-sitter。

### 差分工具与编译器视图

BinDiff 8（Apache-2.0）通过 BinExport 12 插件支持 IDA Pro、Binary Ninja、Ghidra；Diaphora 3.4.3（2026-10-11，AGPL-3.0）是 IDA 插件；另有 radiff2、rz-diff。Compiler Explorer（BSD-2-Clause）显示源片段编译出的汇编，方向与其他工具相反。第 44 课使用差分家族。

### 版本、许可与本课运行范围

| 工具 | 2026-10-14 读取的版本 | 许可 | 无界面入口 | 原始课程是否运行 |
|---|---|---|---|---|
| Ghidra | 12.1.4 | Apache-2.0 | `analyzeHeadless`、`pyghidra.start()` | 是，全部四目标 |
| radare2 | 6.2.4 | LGPL-3.0 | `r2 -qc '<cmds>' file`、`rabin2` | 是 |
| rizin | 0.9.1 | LGPL-3.0 | `rizin -qc '<cmds>' file`、`rz-bin` | 是 |
| angr | 10.0.3 | BSD-2-Clause | Python `angr.Project` | 是 |
| llvm-objdump | Apple LLVM 17.0.0 | Apache-2.0，含 LLVM 例外 | `llvm-objdump -d -r` | 是 |
| Binary Ninja | 6.0 Krypton | 商业；Free 限非商业 | `binaryninja.load()`，需 Commercial、Ultimate 或无界面许可 | 否，仅文档 |
| IDA Pro | 9.4 | 商业订阅；IDA Free 限非商业 x86/x86-64 | `idat`、`ida -A -S`、`idalib` | 否，仅文档 |
| Hopper | 6.6.0 | 商业永久许可 | 无文档入口 | 否，仅文档 |
| Cutter | 2.5.0 | GPL-3.0 | rizin 上的 GUI | 否 |

Binary Ninja Free 只反编译 x86、x86-64、ARMv7、AArch64，没有 API。IDA Free 没有 IDAPython、SDK、idalib，反编译器运行在云端。本课关于两者的说明全部来自文档和发布说明，图中标记为未运行。

## 反编译流水线逐阶段解析

Cifuentes 于 1994 年列出语法分析、语义分析、中间代码生成、控制流图生成、数据流分析、控制流分析、代码生成，分为机器相关前端、机器与语言无关中层、语言相关后端。后续反编译器保留形状、重命名部分。下表列本课八阶段及各工具术语，图中可选择工具列查看同表。

| 阶段 | Ghidra | Binary Ninja | Hex-Rays / IDA | radare2 | rizin | angr |
|---|---|---|---|---|---|---|
| 加载 | `ElfLoader`、`MachoLoader`、`PeLoader`；`.ldefs` 选语言 | `BinaryView`、`BinaryViewType` | loader 模块（`LDSC`） | RBin（`rabin2`） | RzBin（`rz-bin`） | CLE（`cle.Loader`、`main_object`） |
| 反汇编 | `Disassembler`；SLEIGH `.slaspec` 编为 `.sla`；Disassemble Entry Points、Function Start Search 分析器 | 架构插件；Recursive Descent 后接线性扫描 | 处理器模块（`ana.cpp`、`emu.cpp`、`out.cpp`）；自动分析队列；FLIRT | RArch 插件转 `RAnalOp`；`aa`、`aaa`、`af` | RzAnalysis 插件；`aa`、`aaa`、`af` | Capstone 块；`CFGFast` 搜索函数起点 |
| CFG 恢复 | Generate Basic Blocks and the CFG；`BlockGraph`；Decompiler Switch Analysis | `Function`、`BasicBlock`；CFG Analysis 阶段 | `mbl_graph_t`，在 `MMAT_LOCOPT` 就绪 | `afb`、`agf`、`aab` | `afb`、`agf`、`aab`（Nucleus） | `CFGFast`、`CFGEmulated`；`kb.functions`；IRSB |
| 提升 | Generate Raw P-code；`ram`、`register`、`const`、`unique` 内的 Varnode | Lifted IL、LLIL、Mapped MLIL、MLIL | microcode（`minsn_t`、`mop_t`）；`MMAT_GENERATED` | ESIL（`asm.esil`、`ae`） | RzIL（`aoi`、`aez`） | VEX（`pyvex.lift`、IRSB）后接 AIL |
| SSA | `Heritage`、`ActionHeritage`；`MULTIEQUAL`、`INDIRECT` | LLIL SSA、MLIL SSA、HLIL SSA；`HLIL_VAR_PHI` | 无命名 SSA；`MMAT_GLBOPT1` 至 `3` 做 use-def 数据流 | 无；ESIL 用于模拟 | 无；RzIL 用于模拟 | `_stage_transform_to_ssa_level0`、`level1`；`SeqNodeDephication` |
| 数据流与类型 | `ActionDeadCode`、`ActionInferTypes`、Rule 池；原型来自 `.cspec` | MLIL 常量传播、变量类型；`analyzeReturns` | Transform microcode；`MMAT_CALLS`、`MMAT_GLBOPT`、`MMAT_LVARS`；TIL | `afv`、`afc`、`aaft`；ESIL 模拟 | `afv`、`afc`、`aft` | `CallingConventionAnalysis`、`VariableRecoveryFast`、`Typehoon` |
| 结构恢复 | `CollapseStructure`；`BlockIf`、`BlockWhileDo`、`BlockSwitch`、`BlockGoto` | `HLIL_IF`、`HLIL_WHILE`、`HLIL_SWITCH`；`root` 的 AST | Generate ctree；结构分析；goto 区域 | `pdc`；`pdd`（r2dec）；`pdg`（r2ghidra） | `pdg`（rz-ghidra）；jsdec | `RegionIdentifier`；`RecursiveStructurer` 加 `SAILRStructurer` |
| 输出 | Emit Final C Tokens；`PrintC`、`ActionNameVars`、`ActionSetCasts` | HLIL 渲染；Pseudo C、Pseudo Rust、Pseudo Python | Beautify ctree、Print ctree；`cfunc_t` | `pdc`、`pdd`、`pdg` 文本 | `pdg` 文本 | `CStructuredCodeGenerator`；`codegen.text` |

### 加载

加载器解析容器、映射节、读取符号和重定位。可重定位目标还没有地址，加载器自行选择。radare2/rizin 将文件放在 `0x08000000`，`.text` 因文件偏移 `0x40` 而落在 `0x08000040`；CLE 将 `.text` 放在 `0x400000`；Ghidra ElfLoader 放在 `0x100000`；llvm-objdump 只打印节偏移，无基址。

重定位处理也不同。Ghidra 在导入时处理，CLE 也应用；radare2 打开时提示尚未应用，可用 `bin.relocs.apply=true` 改变。加载器怎样处理重定位，决定后续阶段能看见什么，下方 -O0 跳转表会展示影响。

### 反汇编

第 33 课实现两种方法。除 llvm-objdump 外，表中工具都先递归下降，再搜索函数起点。Binary Ninja 文档依次列 Recursive Descent、Call Target Analysis、CFG Analysis（未知区域线性反汇编）、Tail Call Analysis。Ghidra 按优先级运行分析器，早期有入口反汇编和函数起点搜索。IDA 维护各带优先级的自动分析队列，使用 FLIRT 识别库代码。angr CFGFast 记载四种起点来源：符号、序言扫描、调用目标、剩余字节完整扫描。最后一项正是它将填充误识别为函数的原因。

### CFG 恢复

各工具如第 33 课切块，但有一项可测差异：angr 在 call 处结束块，因为其 IRSB 是单入口多出口块，而调用属于出口。Ghidra、radare2、rizin 则跨调用继续。-O0 的 grade_label 调用 grade，angr 报两块，其他三款报一块，指令却相同。

### 提升

Binary Ninja 将提升定义为从较低级语言翻译为被视作较高级的中间语言。IR 目的不同：P-code、VEX 用于分析和反编译；ESIL、RzIL 用于模拟，均无 SSA。Hex-Rays microcode 从含 72 操作码的类 RISC 代码开始，经过 `MMAT_GENERATED` 到 `MMAT_LVARS` 成熟度。Binary Ninja 先 Lifted IL，再于 LLIL 将标志折成条件，MLIL 将寄存器和内存访问转为变量。下一节对一条指令并排展示四种 IR。

### SSA

Van Emmerik 论文列出 SSA 的益处：表达式传播、不依赖 ABI 假设的参数与返回识别、保留分析、稀疏数据流形式的类型分析、间接跳转和调用分析。Ghidra 称 SSA 构建为 Heritage，并加入只存在于图中的 MULTIEQUAL（phi）和 INDIRECT（副作用）。Binary Ninja 每级 IL 都有 SSA，angr Clinic 内有两阶段 SSA，Hex-Rays 在全局优化中用 use-def 数据流而不命名 SSA。ESIL、RzIL 没有。

### 数据流与类型

Ghidra 反复执行死代码消除、局部类型传播、项重写直至稳定，重写由 Rule 对象池执行。Hex-Rays 变换 microcode，在 MMAT_CALLS 检测调用参数，在 MMAT_LVARS 分配局部变量。angr 运行 CallingConventionAnalysis、VariableRecoveryFast、Typehoon，后者实现 Noonan、Loginov、Cok 的多态类型推断。第 41 课讨论此阶段。

### 结构恢复

Ghidra CollapseStructure 查找匹配结构的子图、折叠成一个节点，卡住时删除一条边并标记非结构化。Hex-Rays 将 CFG 约为 if、while、do、switch，其余保留 goto 区域。angr 识别单入口单出口区域，默认用 SAILRStructurer，另可选 PhoenixStructurer、DreamStructurer。第 34 课手写了结构恢复器。

### 输出

Ghidra 在 ActionNameVars、ActionSetCasts 后通过 PrintC 和 Oppen 美化打印器输出 C token。Hex-Rays 美化并打印 ctree。Binary Ninja 将 HLIL 渲染为 Pseudo C、Pseudo Rust、Pseudo Python。angr 返回 codegen.text。radare2 打印 pdc、pdd 或 pdg。

## 一条指令，四种 IR

取 `48 83 ec 10`，即 `subq $0x10, %rsp`，按第 33 课规则手动解码。

1. 48 是 W = 1 的 REX，操作数为 64 位。
2. 83 是带 8 位立即数的第 1 组算术操作码，ModRM reg 决定操作。
3. ec 是 `11 101 100`：mod 11 为寄存器形式，reg 101 即 /5（sub），r/m 100 为 rsp。
4. 10 是立即数 16。

四种提升器接收相同四字节，夹具保留精确命令及完整文本。

radare2 6.2.4 的 ESIL 是含 30 个 token 的逗号分隔字符串：

```text
16,0x8000000000000000,-,!,16,rsp,-=,63,$o,^,of,:=,63,$s,sf,:=,$z,zf,:=,$p,pf,:=,64,$b,cf,:=,4,$b,af,:=
```

它是栈机，`16,rsp,-=` 原地减法，再用内部运算符写标志：$o 溢出、$s 符号、$z 零、$p 奇偶、$b 借位。

rizin 0.9.1 的 RzIL 是含 14 个 set 副作用的 S 表达式：

```text
(seq (set op1 (var rsp)) (set op2 (bv 64 0x10)) (set sub (- (var op1) (var op2))) (set rsp (var sub))
     (set _result (var sub)) (set pf (! (lsb (let _val (cast 8 false (var _result)) ...))))
     (set zf (is_zero (var _result))) (set sf (msb (var _result))) ... (set cf (|| ...)) (set of (|| ...)) (set af (|| ...)))
```

每个标志都是位向量上的布尔表达式，仅奇偶标志就有四层 let。

pypcode 4.0.1 从 SLEIGH `x86:LE:64:default` 得到的 P-code，在 IMARK 后有九次操作：

```text
CF = RSP < 0x10
OF = sborrow(RSP, 0x10)
RSP = RSP - 0x10
SF = RSP s< 0x0
ZF = RSP == 0x0
unique[58300:8] = RSP & 0xff
unique[58400:1] = popcount(unique[58300:8])
unique[58500:1] = unique[58400:1] & 0x1
PF = unique[58500:1] == 0x0
```

它用 unique 空间临时变量表达寄存器转移，在指令处立即计算标志，且 CF、OF 在减法覆盖 RSP 之前计算。

pyvex 10.0.3 的 VEX 在 IMark 后有七条语句：

```text
t2 = GET:I64(offset=48)
t0 = Sub64(t2,0x0000000000000010)
PUT(offset=144) = 0x0000000000000008
PUT(offset=152) = t2
PUT(offset=160) = 0x0000000000000010
PUT(offset=168) = 0x0000000000000000
PUT(offset=48) = t0
```

其中不出现标志。VEX 用 guest 状态偏移命名寄存器，48 是 rsp，144–168 是 cc_op、cc_dep1、cc_dep2、cc_ndep。提升器保存操作码 8（64 位减法）和两个操作数，之后读取标志的分支再从延迟状态计算。这解释了报告中 pcode.writesFlags 为真、vex.computesFlags 为假，以及 VEX 为何最短。

相同四提升器处理 `48 63 c7`（`movslq %edi, %rax`，-O1 grade 首指令），分别得到 5 个 ESIL token（`32,edi,~,rax,=`）、1 个 RzIL set、1 个 P-code（`RAX = sext(EDI)`）、4 条 VEX。指令无标志，因此均不写标志。无界面脚本捕获的 Ghidra 列表将其写为 `(register, 0x0, 8) INT_SEXT (register, 0x38, 4)`：偏移 0 为 RAX，0x38 为 RDI，大小 8 和 4 字节。

grade 边界检查的 `83 f9 04`（`cmpl $0x4, %ecx`）得到 30 ESIL token、13 RzIL set、10 P-code、7 VEX，cc_op 为 7（32 位减法），没有任何一项写 ecx。VEX 的两种减法宽度分别为 7（32 位）、8（64 位），本课翻译器保留该表。

## 一个函数，四种地址基址

比较前先统一函数位置。对 `ledger-x86_64-O1.o` 的 grade 手算一次。

| 工具 | `.text` 地址 | grade 地址 | 偏移 |
|---|---|---|---|
| llvm-objdump | `0x0` | `0x10` | `0x10 - 0x0 = 0x10` |
| radare2、rizin | `0x08000040` | `0x08000050` | `0x08000050 - 0x08000040 = 0x10` |
| angr | `0x400000` | `0x400010` | `0x400010 - 0x400000 = 0x10` |
| Ghidra | `0x100000` | `0x100010` | `0x100010 - 0x100000 = 0x10` |

符号表说 grade 位于 `.text + 0x10`，大小 46。去掉基址后所有工具一致。比较程序从捕获读取基址：radare2/rizin 的 iSj、angr 的 .text 节项、Ghidra 的 .text 内存块，扫描则为零。测试 `test_every_tool_places_grade_at_offset_0x10_from_its_own_base` 固定此事实。

## 工具在哪里一致、在哪里分歧

`code/main.py` 读取捕获、归一地址并比较。下列数字都由测试断言。

### 一致案例：-O1 的 ledger

四函数，扫描共 56 条，其中符号内 54 条、填充 2 条。所有工具对各函数指令起点一致：9、14、13、18。四款图构建工具都报告 3、3、5、4 块和 2、3、5、4 边，radare2、rizin、angr、Ghidra 的边集合逐对相同。total 的五块五边就是第 33 课手绘结果。

差异只在填充。函数间三字节（grade 后 66 90，total 后 90）被不停顿的扫描解码，也被 angr 解码并建立无符号的 sub_40003e、sub_40005f。其他三款均不认领。

### 向量化案例：-O2 的 ledger

四款图工具的 total 都为 41 指令、10 块、13 边。第 33 课 SSE2 循环及标量余数循环在各处切分相同。angr 再次在填充添加两函数。

### 跳转表：-O0 的 grade

差异就在这里：

| 工具 | 块 | 边 | 捕获说明 |
|---|---|---|---|
| radare2 | 3 | 2 | 0x62 无后继；0x76–0x9a 从未到达，缺 8 个指令起点 |
| rizin | 8 | 11 | 0x62 带 switch_op，5 分支、4 不同目标 |
| angr | 8 | 7 | 分支块存在，但 0x62 转移到无法解析的目标节点 |
| Ghidra | 9 | 12 | 0x74 的 switchD 标签切块；四条 COMPUTED_JUMP 指向 0x76、0x7f、0x88、0x91 |

四款在到达时均解码同样 33 条。radare2 停在 jmp rax，留下 36 字节未认领，比较程序标为遗漏代码。rizin、Ghidra 找到第 33 课从 .rela.rodata 五项重定位读出的四个不同目标。angr 在 grade 内列出分支块，却没有跳转块到它们的边，捕获标为不可解析目标节点，反编译输出计算 goto。Ghidra 比 rizin 多一块一边，因为 switch 分析在 jmp rax 放置标签，块模型在标签处开启新块。

第 33 课为八块十一边，与 rizin 完全一致。9、11、7、2 并非四次“发现代码量”的测量，而是在回答工具跟踪间接跳转多远、选择在哪里切块。

### 代码中的数据：sweep-trap

lookup 共 24 字节，0x10 处四字节表为 31 c0 90 48。扫描在范围内报告八个指令起点，比多数工具多 0x10、0x12、0x13，缺 0x14，即第 33 课提前一字节的 addq。radare2、rizin、Ghidra 报六起点、两块、一边，留 0x10–0x14 未认领。angr 对 lookup 也报两块一边，又在表上杜撰 sub_400010：四字节块中两条指令，结束于 lookup 第二块起点 0x14，因此 0x13 的 REX 不属于任何指令。比较程序最后指出没有图构建工具将 0x10–0x14 解码为函数代码，这些函数字节是数据。

### 各工具的误识别与遗漏

四目标合计，angr 杜撰九个无符号函数，全在填充或陷阱表上。radare2 遗漏一个范围，即 -O0 grade 的 36 个分支字节。线性扫描解码了九个无图工具视为代码的范围：八处填充加陷阱表。没有工具遗漏完整函数。

## 三款反编译器分析 grade

三款捕获工具对 -O1 grade 输出类 C。源码是五分支 `switch (score / 10)`，编译后为边界检查及返回值表。

Ghidra 12.1.4：

```c
uint grade(int param_1)
{
  uint uVar1;
  uint uVar2;

  uVar2 = param_1 / 10 - 6;
  uVar1 = -(param_1 >> 0x1f) ^ (uint)((ulong)((long)param_1 * 0x66666667) >> 0x3f);
  if (uVar2 < 5) {
    uVar1 = *(uint *)(&DAT_001000b4 + (ulong)uVar2 * 4);
  }
  return uVar1;
}
```

angr 10.0.3：

```c
extern unsigned int g_4000b4[4];

unsigned int grade(int a0)
{
    unsigned int v1;  // ecx
    unsigned int v2;  // eax

    v1 = (unsigned int)((long long)(a0 * 1717986919) >> 0x22) + (unsigned int)(a0 * 1717986919 >> 63) - 6;
    v2 = 0;
    if (v1 <= 4)
        v2 = g_4000b4[v1];
    return v2;
}
```

radare2 6.2.4 的 pdc：

```c
void sym.grade (int64_t arg1) {
    rax = edi
    rax = rax * 0x66666667
    rcx = rax
    rcx >>= 0x22
    rax >>>= 0x3f
    ecx += eax
    ecx += 0xfffffffa
    eax = 0
    v = ecx - 4
    if (((unsigned) v) <= 0) {
        eax = ecx
        rcx = rip
        eax = dword [rcx + rax*4]
    }
    return
}
```

结合流水线阅读：Ghidra 项重写将乘 0x66666667、移位 34 折回 param_1 / 10，正是第 34 课惯用形式。angr 提升同字节，却保留 `a0 * 1717986919 >> 0x22`。radare2 pdc 是 ESIL 模拟加伪语法，保留寄存器，无变量、类型，无符号减法后的边界检查被打印为 <= 0。Ghidra 经 DAT_001000b4 读取表；angr 声明 g_4000b4[4]，比源码五项少一项。二者都没恢复分支枚举，因为 -O1 字节中已没有 switch。-O0 仍有跳转表，Ghidra 输出 case 6–10 和 default，angr 输出计算 goto。

rizin 自身无反编译器，捕获也记录 pdc 不存在。本课无法捕获的另外两种输出是 Binary Ninja HLIL 和 Hex-Rays ctree。

## 动手构建

运行演示：

```bash
cd phases/13-tools-and-protocols/37-the-reverse-engineering-landscape
python3 code/main.py
```

输出一份 JSON。开头列捕获时工具版本和本机可用工具（可能全部缺失）；随后逐目标给出符号范围、填充、各工具基址、发现或杜撰的函数起点，并逐函数比较指令起点、块数、边数和缺边。最后给每工具字节核算、工具原注、自然语言发现及 IR 部分：三条指令的翻译器输出与捕获提升的计数。

预期结构：

```json
{
  "captureTools": {"llvm-objdump": "Apple LLVM version 17.0.0", "radare2": "radare2 6.2.4 ...", "rizin": "rizin 0.9.1 ...", "angr": "10.0.3", "ghidra": "12.1.4"},
  "localTools": {"radare2": "absent", "...": "..."},
  "fixtures": {
    "ledger-x86_64-O0.o": {
      "bases": {"llvm-objdump": "0x0", "radare2": "0x8000040", "angr": "0x400000", "ghidra": "0x100000", "...": "..."},
      "functions": {"grade": {"blocks": {"radare2": 3, "rizin": 8, "angr": 8, "ghidra": 9}, "edges": {"radare2": 2, "rizin": 11, "angr": 7, "ghidra": 12}, "...": "..."}},
      "findings": ["radare2 never reaches bytes 0x76-0x9a inside grade that the other graph builders decode", "..."]
    }
  },
  "ir": {"translator": [{"text": "subq $0x10, %rsp", "flags": {"pcodeLike": "eager", "vexLike": "thunk"}, "...": "..."}], "observed": {"...": "..."}}
}
```

按顺序阅读 `code/main.py`：

1. `read_text_symbols()` 读节头及 .text 的 STT_FUNC。符号表是唯一事实基准，`TextSection.gaps()` 从中推导填充。
2. `parse_objdump()`、`parse_r2_family()`、`parse_angr()`、`parse_ghidra()` 各将捕获转为 ToolView：基址、偏移到长度的指令，以及含块、边、反编译文本的 FunctionView。各解析器只了解一款工具术语。
3. `majority()`、`ranges()` 是比较共用辅助函数。
4. `function_report()` 先与图工具多数结果比较指令起点，再比较块数和边集，列出各工具遗漏。
5. `byte_report()` 将各字节归为符号内代码、填充、未认领、误识别或遗漏，指出符号内无图工具解码的字节。
6. `findings()` 生成句子，`compare()` 组装每目标报告。
7. `decode_small()`、`to_pcode_like()`、`to_vex_like()` 是翻译器，处理三种寄存器编码，分别立即计算和延迟计算标志。
8. `observed_ir()` 测量捕获提升，`figure_data()` 组装时间线、阶段表和图中证据。

另有 `python3 code/main.py compare FIXTURE.o`（单目标报告）、`python3 code/main.py ir 4883ec10`（单指令两种 IR）、`python3 code/main.py figure-data`（图嵌入数据）。

捕获由 `code/fixtures/capture_tools.py` 一次性生成，命令和版本记录在 captures.json。测试和比较程序从不启动原工具。若已安装工具，可重跑捕获脚本刷新，环境需求见夹具 README。

## 实际使用

对新目标按以下顺序操作。

1. 自行构建并保留编译命令，打开工具前先读符号表，知道函数数量和填充位置。
2. 每工具无界面捕获一次，原始输出与精确命令放在目标旁。无法重读的分歧不算发现。
3. 检查基址。选一函数，减去各工具 .text 地址后应偏移相同；否则停止，查明工具加载了什么。
4. 先比较指令起点。图工具若在此不同，后续比较讨论的是解码而非分析。
5. 比较块与边，判断计数前先读各工具注释。switch_op、COMPUTED_JUMP、不可解析目标节点解释大部分差异。
6. 核算字节。工具认领填充是启发式，留下符号字节是遍历停止；无图工具认领的符号字节是数据。
7. 明确哪些工具未运行。文档描述有用，但证据类型不同于实际捕获。

## 交互实验

### 实验 A：一个函数，四种基址

在 code 目录启动 Python：

```bash
cd phases/13-tools-and-protocols/37-the-reverse-engineering-landscape/code
python3 -q
```

运行：

```python
from main import *
views = load_views("ledger-x86_64-O1.o")
{tool: hex(view.base) for tool, view in views.items()}
{tool: hex(view.functions["grade"].start + view.base) for tool, view in views.items()}
```

运行第二行前，写下四个原始地址并与本课表对照。将 grade 换为 grade_label，手算其 Ghidra 地址。

### 实验 B：四面观察跳转表

```python
report = compare("ledger-x86_64-O0.o")
report["functions"]["grade"]["blocks"]
report["functions"]["grade"]["edgesMissingPerTool"]["radare2"]
report["notes"]["rizin"]
report["notes"]["ghidra"]
report["bytes"]["radare2"]["misses"]
```

统计 radare2 缺失边，与第 33 课 -O0 列表逐行对应。阅读 Ghidra 注释，在捕获中找到 switchD 标签。

### 实验 C：立即标志与延迟状态

```python
translate("48 83 ec 10")["pcodeLike"]
translate("48 83 ec 10")["vexLike"]
translate("83 f9 04")["vexLike"]
{row["name"]: (row["pcode"]["ops"], row["vex"]["statements"]) for row in observed_ir()["instructions"]}
```

找两份输出的 cc_op，解释为何一个为 8、另一个为 7。尝试 `translate("48 01 c8")` 并阅读 TranslateError。

### 实验 D：五工具下的陷阱

```python
report = compare("sweep-trap.o")
report["functions"]["lookup"]["instructionStarts"]
report["bytes"]["dataInsideSymbols"]
report["functionStarts"]["angr"]
```

先按扫描方式在纸上解码 `31 c0 90 48 83 c0 01`，再按 jmp 后下降的方式解码。将两份列表与程序报告的多余、缺失起点匹配。

## 实践实验

添加第五种捕获并扩展比较程序。

要求：

- 选择本课未捕获且本机可运行的工具：GNU objdump、LIEF 加 Capstone、手动导出的 Binary Ninja Free 会话，或采用不同分析器集合的 Ghidra。捕获四目标，在 captures.json 记精确命令、版本。
- 编写解析器，转成包含基址、指令、函数、工具提供的块和边的 ToolView。
- 加入 TOOLS；构建图的还加入 DESCENT_TOOLS。重跑演示，阅读多数集合变化。
- 测试断言其在 ledger-x86_64-O1.o 的块数及陷阱表处理方式。
- 为课文写一段，使用工具自己的术语说明 loader、disassembler、CFG。

验收标准：演示 captureTools 有新工具，-O1 每函数 allDescentToolsAgree 仍为真，sweep-trap 发现说明其如何处理 0x10–0x14。

## 交付产物

`outputs/skill-the-reverse-engineering-landscape.md` 用于多工具分析自建目标，归一地址，并逐函数报告指令起点、块、边的一致性，以及各工具误识别或遗漏字节。要求捕获记录命令版本、从文件读取符号表，并说明哪些工具仅参考文档。

## 验证

运行演示与确定性测试：

```bash
cd phases/13-tools-and-protocols/37-the-reverse-engineering-landscape
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应证明：

- ELF 读取器在 -O1 找到大小 16、46、31、63 的四函数及两处填充。
- 四目标扫描捕获分别有 86、56、84、11 指令。
- radare2/rizin 在 -O1 指令、块、边相同，仅 radare2 有 pdc 文本。
- angr 将 sub_40003e、sub_40005f 标为无符号函数。
- Ghidra total 的五块与第 33 课一致，调用流不算图边。
- 去基址后每工具 grade 均在 0x10。
- -O1 每函数每指令起点均一致。
- 四图工具分别报 3、3、5、4 块，2、3、5、4 边，边集相同。
- -O2 total 在各工具都是十块十三边。
- -O0 grade 在 radare2、rizin、angr、Ghidra 为 3/8/8/9 块、2/11/7/12 边，注释给出原因。
- -O0 grade_label 除 angr 在调用处切块外，均一块。
- angr 每填充处及陷阱表各误识别一函数，其他工具无误识别或遗漏函数。
- 扫描在陷阱多出 0x10、0x12、0x13，缺 0x14，无图工具解码 0x10–0x14。
- 发现指出 radare2 遗漏范围、angr 各误识别函数。
- manifest 为全部 21 捕获文件记录版本与命令。
- 三工具反编译 grade，仅 Ghidra 折叠除法惯用形式。
- 翻译器一边立即写 CF、OF、SF、ZF、PF，另一边写 cc_op 延迟状态；cmp 不写寄存器，movslq 不写标志。
- 翻译器拒绝内存形式、其他操作码、额外 REX 位和错误长度。
- cc_op 8、7 与捕获 VEX 相符。
- 三指令捕获分别有 9/1/10 个 P-code 操作及 7/4/7 条 VEX。
- 时间线按序覆盖 1973–2026，流水线八阶段六工具每格有术语，两闭源工具标为未运行。
- 交互图嵌入与比较程序相同数据。

## 生产故障模式

| 故障 | 粗略报告 | 比较程序须证明 |
|---|---|---|
| 跨工具比较原始地址 | “grade 位置有分歧” | 去各自基址后同偏移，在函数上核验 |
| 用块数衡量代码发现量 | “Ghidra 发现最多” | 指令起点相同，多块由标签解释 |
| 以单工具为基准 | “objdump 说表是指令” | 它是线性扫描，三图工具不认领该范围 |
| 填充函数当发现 | “angr 多找到七函数” | 全在填充或数据，无符号 |
| 遍历停止当死代码 | “四分支块不可达” | 一工具漏 36 字节，另三款可达 |
| 不读注释比较边数 | “rizin 与 Ghidra 有分歧” | 四计算目标相同，仅多标签切分 |
| 反编译算术当程序语义 | “函数乘以 1717986919” | 第 34 课惯用形式，一款折叠、一款保留 |
| 闭源工具描述冒充实测 | “Binary Ninja 报五块” | 图与表注明仅文档 |
| 捕获无命令 | “运行过 radare2” | manifest 每文件有版本、命令、日期 |
| 无显式标志就说 IR 有损 | “VEX 丢标志” | cc_op、cc_dep1、cc_dep2 保存延迟状态，分支时计算 |

## 操作规则

每工具捕获一次，保留命令和版本；归一地址，先比指令起点，再比块，最后比边。核算每字节为已认领、填充、数据或遗漏。判断计数前读工具注释，说明哪些工具只查过资料。

## 延伸阅读

- [Cifuentes, "Reverse Compilation Techniques", PhD thesis, QUT (1994)](https://eprints.qut.edu.au/36820/)
- [Cifuentes and Gough, "Decompilation of Binary Programs", Software: Practice and Experience (1995)](https://doi.org/10.1002/spe.4380250706)
- [Van Emmerik, "Static Single Assignment for Decompilation", PhD thesis, University of Queensland (2007)](https://espace.library.uq.edu.au/view/UQ:158682)
- [Schwartz, Lee, Woo, Brumley, "Native x86 Decompilation Using Semantics-Preserving Structural Analysis and Iterative Control-Flow Structuring" (USENIX Security 2013)](https://www.usenix.org/conference/usenixsecurity13/technical-sessions/presentation/schwartz)
- [Yakdan et al., "No More Gotos" (NDSS 2015)](https://www.ndss-symposium.org/ndss2015/ndss-2015-programme/no-more-gotos-decompilation-using-pattern-independent-control-flow-structuring-and-semantics/)
- [Basque et al., "Ahoy SAILR! There is No Need to DREAM of C" (USENIX Security 2024)](https://www.usenix.org/conference/usenixsecurity24/presentation/basque)
- [Andriesse et al., "An In-Depth Analysis of Disassembly on Full-Scale x86/x64 Binaries" (USENIX Security 2016)](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/andriesse)
- [Flake, "Structural Comparison of Executable Objects" (DIMVA 2004)](https://dl.gi.de/items/7f573931-cb51-49ef-a12c-0452a9fb0ea4)
- [Maranzano and Bourne, "A Tutorial Introduction to ADB", Bell Labs (1977)](http://squoze.net/UNIX/v7/files/doc/18_adb.pdf)
- [Stallman, KTH lecture on GDB entering distribution (30 October 1986)](https://www.gnu.org/philosophy/stallman-kth.html)
- [Hex-Rays, "IDA: celebrating 30 years of binary analysis innovation"](https://hex-rays.com/blog/ida-celebrating-30-years-of-binary-analysis-innovation)
- [Guilfanov, "Decompiler internals: microcode", Recon Brussels 2018 (slides)](https://www.recon.cx/2018/brussels/resources/slides/RECON-BRX-2018-Decompiler-internals-microcode.pdf)
- [Hex-Rays, microcode view and maturity levels](https://docs.hex-rays.com/core/decompiler/how-tos/microcode-view)
- [Hex-Rays, IDA 9.4 release notes](https://docs.hex-rays.com/release-notes/9_4)
- [Hex-Rays, IDA Free](https://hex-rays.com/ida-free)
- [Ghidra releases (12.1.4)](https://github.com/NationalSecurityAgency/ghidra/releases)
- [Ghidra P-code reference](https://github.com/NationalSecurityAgency/ghidra/blob/master/GhidraDocs/languages/html/pcoderef.html)
- [Ghidra decompiler source, main work flow and Action classes](https://github.com/NationalSecurityAgency/ghidra/tree/master/Ghidra/Features/Decompiler/src/decompile/cpp)
- [Ghidra analyzeHeadless README](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/RuntimeScripts/support/analyzeHeadlessREADME.md)
- [Binary Ninja, BNIL overview](https://docs.binary.ninja/dev/bnil-overview.html)
- [Binary Ninja, "Architecture Agnostic Function Detection in Binaries" (2017)](https://binary.ninja/2017/11/06/architecture-agnostic-function-detection-in-binaries.html)
- [Binary Ninja, batch processing and headless licences](https://docs.binary.ninja/dev/batch.html)
- [Binary Ninja 6.0 "Krypton" release post](https://binary.ninja/2026/09/03/binary-ninja-6.0-krypton.html)
- [Binary Ninja Free](https://binary.ninja/free/)
- [radare2 book, ESIL](https://book.rada.re/emulation/esil.html)
- [radare2 book, decompilers](https://book.rada.re/arch/decompile.html)
- [radare2 releases (6.2.4)](https://github.com/radareorg/radare2/releases)
- [rizin, RzIL design notes](https://github.com/rizinorg/rizin/blob/dev/doc/rzil.md)
- [rizin releases (0.9.1)](https://github.com/rizinorg/rizin/releases)
- [Announcing Rizin (8 December 2020)](https://rizin.re/posts/announcing-rizin/)
- [Cutter releases (2.5.0)](https://github.com/rizinorg/cutter/releases)
- [angr documentation, CFG recovery](https://docs.angr.io/en/latest/analyses/cfg.html)
- [angr documentation, the decompiler and its analysis passes](https://docs.angr.io/en/latest/analyses/decompiler.html)
- [angr documentation, intermediate representation (VEX)](https://docs.angr.io/en/latest/advanced-topics/ir.html)
- [angr on PyPI (10.0.3)](https://pypi.org/project/angr/)
- [pypcode on PyPI](https://pypi.org/project/pypcode/)
- [llvm-objdump command guide](https://llvm.org/docs/CommandGuide/llvm-objdump.html)
- [GNU objdump manual](https://sourceware.org/binutils/docs/binutils/objdump.html)
- [LIEF documentation](https://lief.re/doc/stable/index.html)
- [Capstone releases](https://github.com/capstone-engine/capstone/releases)
- [BinDiff releases (v8, open source)](https://github.com/google/bindiff/releases/tag/v8)
- [Diaphora](https://github.com/joxeankoret/diaphora)
- [Hopper Disassembler downloads](https://www.hopperapp.com/download.html)
- [Compiler Explorer](https://github.com/compiler-explorer/compiler-explorer)
- [LLDB announced as an LLVM subproject (2010)](https://blog.llvm.org/2010/06/new-lldb-debugger.html)
- [Boomerang decompiler](https://boomerang.sourceforge.net/)
- [Tan et al., "LLM4Decompile" (EMNLP 2024)](https://aclanthology.org/2024.emnlp-main.203/)
- [Gao et al., "DecompileBench" (Findings of ACL 2025)](https://aclanthology.org/2025.findings-acl.1194/)
- [Liu, Raff, Micinski, "When LLM Decompilers Recompile More and Preserve Less" (2026)](https://arxiv.org/abs/2609.05370)
