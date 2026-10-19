# 调用约定与栈帧：System V、Windows x64 与 AArch64

> 反汇编显示函数读取哪些寄存器，只有 ABI 说明这些寄存器的含义。ABI 由目标文件头决定，所以先读头，再逐个核对寄存器背后的规则。

**类型：** Build
**语言：** Python、C、x86-64 与 AArch64 汇编
**前置要求：** 阶段 13 · 32（从零读取 ELF）、阶段 13 · 33（反汇编与控制流）
**预计时间：** 约 140 分钟

## 学习目标

- 根据头选择调用约定：ELF x86-64 用 System V psABI，COFF AMD64 用 Microsoft x64，ELF AArch64 用 AAPCS64，Mach-O arm64 用 Apple 变体。
- 逐字节解码各 ABI 的一个函数序言，以入口栈指针为基准放置保存寄存器、返回地址、帧指针。
- 从先读后写恢复参数寄存器，从入口栈指针上方加载恢复栈参数槽。
- 区分 System V 独立寄存器序列、Microsoft x64 位置槽，以及 AAPCS64 的 NGRN、NSRN 计数器。
- 将推断与源码签名、规范规则，以及 `.pdata`、`.xdata`、`.eh_frame` 的编译器展开数据核对。
- 比较 Ghidra、IDA、Binary Ninja、radare2、rizin、angr 对相同事实的命名和恢复，记录与源码的分歧。

## 问题背景

以 `-O2` 为 Linux x86-64 编译 `convention.c`，向 radare2 6.2.4 查询 eight_args 参数。它回答七个：rdi、rsi、rdx、r8、r9、rsp+0x8、rsp+0x10。C 源码有八个。字节在 `leaq (%rdx,%rcx), %rax` 读取 rcx 一次，但变量恢复没有统计仅在地址中出现的寄存器。

再用 rizin 0.9.1 打开 Windows 构建，它报告 amd64 约定，找到 r8、rcx、rdx 和三栈槽。目标格式是 COFF，应该用 Microsoft x64，第四参数寄存器为 r9，且有四个栈槽。两工具对同一源码遗漏了不同寄存器。

列表是指令序列，调用约定则是列表外的契约：哪些寄存器传参、哪些被调用者必须保留、返回地址和栈参数在哪、调用者须在栈指针上方预留什么。本课涉及四份文档：System V AMD64 psABI 1.0（构建日期 2025-03-12）3.2.1–3.2.3；Microsoft x64 调用约定、栈使用、序言尾声页面（日期 2018-12-17 至 2025-03-19）；Arm AAPCS64 2025Q4（2026-01-23）6.1–6.9；Apple arm64 平台说明。本课将规则应用于同一 C 文件的三类构建，编写分析器，将列表转成经过检查的参数位置、保存寄存器与栈帧偏移。

```figure
re-38-three-frames
```

## 文件头决定规则手册

convention.c 有十二函数：leaf_add、eight_args、mixed、by_value、big_ret、sum_varargs、keeps，以及五个调用同形状 extern 函数的调用者。结构体用 long long，因为 MSVC 目标的 long 为四字节、其他目标为八字节；结构体大小变化就会改变约定。原始机器用 Apple clang 17.0.0 编译七次：`-target x86_64-unknown-linux-gnu`、`x86_64-pc-windows-msvc`、`aarch64-unknown-linux-gnu` 各配 -O0/-O2，`arm64-apple-macos` 配 -O2。无 Linux/Windows 头文件，源码自行声明所需内容，只包含 clang 自有 stdarg.h、stddef.h。

`code/main.py` 的 `describe_object()` 读取四字节魔数及一个机器字段，确定契约：

| 文件头 | 字段 | 值 | 规则 |
|---|---|---|---|
| `7f 45 4c 46` ELF | 偏移 0x12 的 e_machine | 62 | System V AMD64 psABI |
| `64 86` COFF | 偏移 0 的 Machine | 0x8664 | Microsoft x64 |
| `7f 45 4c 46` ELF | e_machine | 183 | AAPCS64 |
| `cf fa ed fe` Mach-O 64 | 偏移 4 的 cputype | 0x0100000c | AAPCS64 加 Apple 差异 |

三份契约在下表几乎每行都不同。各值均来自表头所指规范，并通过夹具测试。

| 规则 | System V psABI | Microsoft x64 | AAPCS64 |
|---|---|---|---|
| 整数参数 | `%rdi %rsi %rdx %rcx %r8 %r9`，下个空寄存器 | RCX RDX R8 R9，按位置 | x0–x7，按 NGRN |
| 浮点参数 | xmm0–xmm7，下个空寄存器 | XMM0–XMM3，按位置 | v0–v7，按 NSRN |
| 整数结果 | rax，随后 rdx | RAX | x0，随后 x1 |
| 浮点结果 | xmm0，随后 xmm1 | XMM0 | v0 |
| 结果过大 | 地址经 rdi 作为隐含首参数传入，rax 返回 | 指针经 RCX，参数右移，RAX 返回 | 地址在 x8，不影响 x0–x7 |
| 被调用者保留 | rbp、rbx、r12–r15 | RBX RBP RDI RSI RSP R12–R15、XMM6–XMM15 | r19–r29、SP、v8–v15 低 64 位 |
| 入口首个栈参数 | 8(%rsp) | 40(%rsp)，32 字节影子空间上方 | 0(sp) |
| 栈指针下方 | 128 字节红区 | 视为易失内存 | 无红区（Apple：128 字节） |
| 调用对齐 | 入口 rsp + 8 是 16 的倍数 | 序言尾声之外按 16 字节对齐 | SP mod 16 = 0 |
| 可变参数标记 | al 保存已用向量寄存器数上界 | 浮点值复制到对应整数寄存器 | 无寄存器标记，Apple 用八字节栈槽 |

## System V：两套独立寄存器序列与红区

psABI 3.2.3 将每个参数的每个八字节分类为 INTEGER、SSE、MEMORY，再从两套独立列表分配。INTEGER 依次取 rdi、rsi、rdx、rcx、r8、r9 的下个可用位置，SSE 取 xmm0–xmm7。若某参数任一八字节无寄存器可用，则整个参数走栈；内存参数按从右到左顺序入栈。

-O2 的 `eight_args(a, b, c, d, e, f, g, h)` 共 27 字节：

```text
      10: 48 01 fe                     	addq	%rdi, %rsi
      13: 48 8d 04 0a                  	leaq	(%rdx,%rcx), %rax
      17: 48 01 f0                     	addq	%rsi, %rax
      1a: 4c 01 c0                     	addq	%r8, %rax
      1d: 4c 01 c8                     	addq	%r9, %rax
      20: 48 03 44 24 08               	addq	0x8(%rsp), %rax
      25: 48 03 44 24 10               	addq	0x10(%rsp), %rax
      2a: c3                           	retq
```

六寄存器，再从 8(%rsp)、16(%rsp) 加载。psABI 图 3.3 在 rbp 为栈帧基址时，将内存参数八字节 0 放在 16(%rbp)，对应尚未 push 的入口 8(%rsp)。g 在 8，h 在 16。

`mixed(int i, double d, long long l, float f)` 展示双列表：整数用 edi、rsi，分别是第一、第二 INTEGER；double、float 用 xmm0、xmm1，分别是第一、第二 SSE。首指令 `cvtsi2sd %edi, %xmm2` 的 xmm2 是先写后读的临时寄存器。若将目标也视为读取，就会虚构第三个浮点参数。radare2 正如此，报告三个 double，位于 xmm0、xmm1、xmm2。

`by_value(struct pair p)` 用 rdi、rsi 两个 INTEGER 八字节传递 16 字节结构，并以 rax、rdx 返回：`leaq 0x1(%rdi), %rax; leaq -0x1(%rsi), %rdx; retq`。`big_ret(long long seed)` 返回 32 字节，属于 MEMORY。调用者提供存储，地址经 rdi 作为隐含首参数，seed 移到 rsi；函数以 `movq %rdi, %rax` 开始，因为返回时 rax 应包含调用者经 rdi 提供的地址。

红区是另一特征。psABI 3.2.2 保留 rsp 下方 128 字节，信号或中断处理器不得修改。-O0 的 eight_args 先 `pushq %rbp; movq %rsp, %rbp`，再六次存到 -0x8(%rbp) 至 -0x30(%rbp)，没有 subq，实际位于栈指针下方 48 字节。-O2 的 sum_varargs 以 `subq $0x58, %rsp` 分配 88 字节，再把寄存器保存区写到 -0x58(%rsp) 至 -0x80(%rsp)，占满当前栈指针下方 128 字节红区。用 -mno-red-zone 构建时，leaf_add 增加 pushq rax、addq 0x8，为八字节局部变量在栈指针上方留空间。

可变参数调用另用 al 隐含传递已使用向量寄存器数上界，范围 0–8。call_varargs 在 -O2 用 xorl eax,eax 清零，-O0 用 movb 0,al。sum_varargs 先 `testb %al, %al; je`，未用向量寄存器时跳过八次 movaps xmmN 保存。

## Microsoft x64：位置、影子空间、无红区

Microsoft 按位置分配。前四参数的整数用 RCX、RDX、R8、R9，浮点按位置用 XMM0L–XMM3L。同一 mixed 因而用 ecx、xmm1、r8、xmm3：槽 0 整数用 RCX，槽 1 double 用 XMM1，槽 3 float 用 XMM3，XMM0、XMM2 留空。

无论被调用者参数是否足四个，调用者都必须预留四寄存器参数存储。这称为 shadow store 或 home addresses，四槽实际归被调用者所有。入口 0(%rsp) 是返回地址，8–39 是四个 home，首栈参数在 40。-O2 的 eight_args 读取 0x28、0x30、0x38、0x40，即 40、48、56、64。

调用者展示计算：-O2 call8 先 subq 0x48，再将 5、6、7、8 存于 0x20–0x38，然后设置 ecx 等寄存器。72 字节 = 32 影子 + 32 四个栈参数 + 8 对齐。call_varargs 只有寄存器参数也分配 0x28：32 影子加 8 对齐。keeps 先推三个非易失寄存器（24 字节），再 subq 0x20，使 ext 在返回地址下方获得 32 字节影子空间。

结构体有单独规则：不符合 1、2、4、8 字节或超过八字节的参数必须按引用传递，16 字节参数也如此。by_value 因而先在 rcx 接隐含结果指针，再在 rdx 接参数副本指针，其他参数右移。call_pair 用 movaps 在 0x20(%rsp) 构建副本，以 leaq 0x20,rdx 传入；以 leaq 0x38,rcx 传结果缓冲，再从 0x40 读回 .b。

没有红区。当前 RSP 下方所有内存视为易失，操作系统、调试器或中断处理器可覆盖。-O0 leaf_add 需八字节局部空间，入口 pushq rax，ret 前 popq rcx，以两条单字节指令替代 subq/addq。栈使用文档定义叶函数无需函数表项，且不得改变包括 RSP 在内的非易失寄存器。

可变参数函数将寄存器写入 home。对可变参数或无原型函数，浮点值也须复制到对应通用寄存器。-O2 sum_varargs 在一次 pushq rax 后，将 rdx、r8、r9 存到 0x18、0x20、0x28，对应入口 16、24、32，即第二至第四参数 home。va_list 由 `leaq 0x18(%rsp), %rax` 指向首个未命名参数 rdx 的 home。

## AAPCS64 与 Apple 差异

AAPCS64 6.8.2 用两计数器逐条分配。C.9 将整数低位复制到 x[NGRN] 后递增；C.1 对浮点用 NSRN。C.12 允许不超过 8-NGRN 个双字的组合类型进入连续通用寄存器。C.13 规定参数一旦上栈，NGRN 设为 8，之后不再回寄存器。eight_args 用 x0–x7，不碰栈；mixed 用 w0、d0、x1、s1；by_value 用 x0、x1 输入并返回。

6.9 规定，本可通过寄存器传递的结果在相同寄存器返回；否则经 x8 附加传入结果内存地址。big_ret 写 `str x0, [x8]`、`stur q0, [x8, #0x8]`、`str x9, [x8, #0x18]`，不写 x0。call_big 设置 `mov x8, sp`，seed 仍在 x0。6.9 不要求被调用者保留 x8，且 x8 不是普通参数寄存器。

6.1.1 要求调用保留 r19–r29 和 SP。6.4.5.2 要求公共接口 SP mod 16 = 0。栈向低地址满递减，线程不得访问栈指针下方未使用区域。因此 Linux -O0 leaf_add 为八字节局部空间输出 `sub sp, sp, #0x10`，而 System V 用红区。

6.4.6 定义栈帧记录为两个 64 位值：低地址双字指向前一个记录，高地址双字保存入口 LR；记录在帧内的位置未规定。clang 在同文件展示两位置：Linux -O2 keeps 用 `stp x29, x30, [sp, #-0x30]!; mov x29, sp` 放底部，-O0 用 `sub sp, sp, #0x20; stp x29, x30, [sp, #0x10]; add x29, sp, #0x10` 放顶部。

Apple 保留寄存器和对齐规则，改变栈帧、红区和可变参数。x29 必须指向有效帧记录，但叶函数或尾调用可省略记录。Apple keeps 先保存 x22、x21、x20、x19，再用 `stp x29, x30, [sp, #0x20]; add x29, sp, #0x20` 将记录放顶部。平台保留 x18，不得使用。Apple 的 arm64 红区是 SP 下方 128 字节，但 clang 对 -O0 叶函数仍发出 sub sp 0x10，默认未使用。可变参数放入适当数量八字节栈槽，va_list 是 char*。Apple call_varargs 将 10、20、30 存到 [sp]、[sp,#8]、[sp,#0x10]，只传 w0；Linux 用 w1、w2、w3，再 b extva 尾调用。Apple sum_varargs 以 `add x8, sp, #0x10` 取得调用者 SP，作为 va_list；Linux 把 x1–x7、q0–q7 保存到 224 字节帧，用 `mov x8, #-0x38; movk x8, #0xff80, lsl #32` 将 __gr_offs、__vr_offs 初始化为 -56、-128。

符号也不同。Mach-O 给 C 符号加下划线，列表显示 _keeps，首函数可能显示私有标签 ltmp0，分析器通过符号表重命名。

## 同一序言手动解码三次

keeps(int n) 在循环调用 ext(i)，需跨调用保存 n、i、acc，所以各 ABI 都保存寄存器。读取各目标 -O2 首字节。

System V，四字节：

1. 55 是低三位选择寄存器的 push r64：50 + 5，即 rbp。深度 8，入口偏移 -8 保存 rbp。
2. 41 56：41 是设置 B 的 REX，56 是 50 + 6，REX.B 扩展到寄存器 14，故 pushq r14 位于 -16。
3. 53 是 50 + 3，pushq rbx 位于 -24。

三次 push 为 24 字节，加返回地址八字节得 32，故循环 callq ext 无需 subq 即对齐。没有 mov rsp,rbp，因此无帧指针。rbp 被用作保留寄存器保存 acc（xorl ebp,ebp；addl eax,ebp）。尾声镜像为 `5b 41 5e 5d c3`。

Microsoft x64，七字节：

1. 56 保存 rsi 于 -8，57 保存 rdi 于 -16，53 保存 rbx 于 -24。三者在此均非易失，而 RDI、RSI 在 System V 是参数寄存器。
2. 48 83 ec 20：REX.W、带八位立即数的 83 /5，ModRM ec 为 11 101 100，即 subq 0x20,rsp。深度 56。

56 加返回地址得 64，已对齐；32 字节是欠 ext 的影子空间。规范只允许以 add RSP 常量或 lea RSP 常量[FPReg] 开始尾声，后接若干八字节 pop 和 return/jmp。本例字节为 `48 83 c4 20 5b 5f 5e c3`。

AArch64，四个小端字，共 16 字节：

1. a9bd7bfd 是前索引 stp。31:30 为 10，选 64 位；25:23 为 011，选前索引；22 为 0，表示存储。21:15 的 imm7 为 1111010，即 -6，按八字节缩放得 -48。14:10 Rt2 为 30，9:5 Rn 为 31（sp），4:0 Rt 为 29。`stp x29, x30, [sp, #-0x30]!` 先降 SP 48，x29 放 -48，x30 放 -40。
2. f9000bf5 为无符号 12 位偏移 str，缩放八倍，21:10 的 imm12 为 2，Rn 为 sp，Rt 为 21。`str x21, [sp, #0x10]` 位于入口 -32。
3. 910003fd 为立即数 add，imm12 0、Rn sp、Rd 29，即 mov x29,sp，使帧指针指向 -48 的记录。
4. a9024ff4 为有符号偏移 stp，imm7 4，缩放到 32；Rt2 19、Rt 20，即 `stp x20, x19, [sp, #0x20]`，x20 位于 -16，x19 位于 -8。

帧共 48 字节：相对帧底 x29 在 0、x30 在 8、x21 在 16、24 处八字节填充、x20 在 32、x19 在 40。记录低字指前版、高字存 LR，符合 6.4.6。第一、第二次存储间有 cmp w0,1，是调度器移入序言的比较，分析器允许栈操作之间穿插比较或算术。

## 编译器将同一事实写了两次

序言解析是一条推导，编译器为展开器生成另一条，两者必须一致。

Windows 的第二条来自 .pdata、.xdata。不加 -fno-asynchronous-unwind-tables 构建 -O2，llvm-objdump -h 显示 .xdata 0x34 字节、.pdata 0x48 字节。0x48 即 72，是六项各十二字节 RUNTIME_FUNCTION，每项有三个 IMAGE_REL_AMD64_ADDR32NB 重定位，分别对应 sum_varargs、keeps、call8、call_varargs、call_pair、call_big。其他六个为叶函数；异常处理规范说未找到表项时按叶函数处理，RSP 直接指向返回指针。

keeps 的 .xdata 为 `01 07 04 00 07 32 03 30 02 70 01 60`。UNWIND_INFO 起始三位 Version、五位 Flags，此处版本 1、无标志；SizeOfProlog 7、CountOfCodes 4、FrameRegister/FrameOffset 0。每个 UNWIND_CODE 是序言偏移加操作码与 info。07 32 表示偏移 7 的 op 2（UWOP_ALLOC_SMALL），info 3 即 3*8+8=32；03 30 为 op 0（UWOP_PUSH_NONVOL）、寄存器 3 rbx；02 70 为 rdi；01 60 为 rsi。编码按执行逆序排列，对应同样三次 push 和 32 字节分配，字节为 `56 57 53 48 83 ec 20`。sum_varargs 项为 `01 01 01 00 01 02 00 00`：一字节序言、一次 UWOP_ALLOC_SMALL 八字节。展开器将 pushq rax 看作分配，因为 rax 易失，无需保存值。

Linux 的第二条来自 .eh_frame，由 psABI 4.2.4 定义，DWARF 5 第 6.4 节编码。对可重定位目标运行 llvm-dwarfdump --eh-frame，每函数输出一个 FDE，并解析 R_X86_64_PC32，范围可直接用。keeps 为：

```text
  DW_CFA_def_cfa_offset: +16
  DW_CFA_def_cfa_offset: +24
  DW_CFA_def_cfa_offset: +32
  DW_CFA_offset: RBX -32
  DW_CFA_offset: R14 -24
  DW_CFA_offset: RBP -16
```

CFA 是调用前 SP，比入口 SP 高八字节，因此 RBP -16 对应入口 -8，R14 -24 对应 -16，RBX -32 对应 -24，最深 CFA 偏移 32 为 24 字节帧加返回地址。AArch64 keeps 的 FDE 为 `DW_CFA_def_cfa: W29 +48`，保存 W29 -48、W30 -40、W21 -32、W20 -16、W19 -8。此处 CFA 就是入口 SP，不需换算；记录存在期间由 x29 定义 CFA。`eh_frame_cross_check()` 对两目标各十二 FDE 比较。call8 在 System V 函数体中途推两个输出参数，最深 CFA 为 32，而序言帧只有 8；检查需比较函数体最深 SP 24 加八字节。

## 工具如何称呼这些概念

每工具都有调用约定数据结构及为函数分配约定的过程，名称和盲区不同。闭源工具按文档描述，开放工具由原始课程在夹具上运行，输出保存在目标旁。

**Ghidra 12.1.4（Apache-2.0）。** 规则位于 SLEIGH 语言旁的 .cspec。x86-64-gcc.cspec 的 default_proto 名为 __stdcall，说明源自 2016 年 4 月 System V AMD64 补充规范，pentry 列出 XMM0_Qa–XMM7_Qa 和 RDI、RSI、RDX、RCX、R8、R9，栈从 8 开始；join_dual_class 处理至多 16 字节类型，输出 XMM0_Qa、XMM1_Qa、RAX、RDX，其余 hidden_return。x86-64-win.cspec 定义 __fastcall，四个 group 将 XMM0_Qa 配 RCX、XMM1_Qa 配 RDX 等，实现位置规则；栈从 40 开始；convert_to_ptr 处理 3/5/6/7 字节结构，注释说明只有 8/16/32/64 位结构能打包进寄存器；unaffected 为 RBX RBP RDI RSI RSP R12–R15、XMM6–XMM15；localrange 栈 8–39 即影子空间。AARCH64.cspec 定义 __cdecl，首项是 storage="hiddenret" 的 x8，再 q0–q7、x0–x7；17 字节以上结构 convert_to_ptr；killedbycall 含 x8，说明它是间接结果位置寄存器，不在普通 pentry 列表。最终阶段称 Establish Function's Prototype，分析器为 Call Convention ID、Decompiler Parameter ID，Prototype Evaluation 选默认模型。

**IDA Pro、IDA Free（Hex-Rays，商业；本课原始资料版本 9.4，构建 9.4.260714）。** 函数类型通过 SetType 设置 C 声明，IDA 据此给反汇编加参数注释。非标准位置用专有约定：`int __usercall func@<ebx>(int x, int y@<esi>)` 表示结果在 EBX、y 在 ESI；`@<^12.4>` 按偏移大小指定栈位置。__userpurge 再加被调用者清栈；__spoils 列破坏集合，__hidden、__return_ptr、__struct_ptr 对应本课手动恢复的隐含参数。Decompile as call 可为单条指令接受 __usercall 原型。IDA Free 仅支持 x86、x86-64。

**Binary Ninja 6.0 Krypton（Vector 35，商业，Free 可反编译 x86、x86_64、ARMv7、AArch64）。** Platform 包含执行环境，主要是调用约定、操作系统、架构；有 linux-x86_64、windows-x86_64、linux-aarch64、mac-aarch64，各有 default_calling_convention。CallingConvention 提供 int_arg_regs、float_arg_regs、callee_saved_regs、caller_saved_regs、int_return_reg、high_int_return_reg、float_return_reg。两个标志直接表达本课差异：arg_regs_share_index 为真时，第 N 参数不论类型都占整数和浮点列表第 N 槽；stack_reserved_for_arg_regs 表示 Windows x64 的 shadow/home。eligible_for_heuristics、required_arg_regs、required_clobbered_regs 驱动启发式检测。平台类型为 types/platform/ 下每平台一份 C 头。

**radare2 6.2.4（LGPL-3.0，原课已运行）。** afcl 对 x86-64 列出 `amd64 amd64syscall dlang golang golang_abi0 ms p9 reg swift`，对 AArch64 列 `arm64 dlang golang p9 reg swift`。afc 报当前函数约定，afcr 打印 cc.amd64.arg0:rdi 至 arg5:r9、ret0:rax，配置为 cc-ARCH-BITS.sdb。它对 ELF 选择 amd64、COFF 选择 ms，格式区分正确。afv 列参数变量，afs 打印签名。Linux -O2 eight_args 少 rcx，仅七参；Windows 少 r9，找到 rcx、rdx、r8 和四栈槽。两缺失寄存器都只在 lea 中出现。mixed 在 Linux 报 xmm0/xmm1/xmm2 三个 double，Windows 无参数。AArch64 eight_args 找齐 x0–x7，big_ret 却报 x0 与 d1 的 double，而函数实际读取 x8、向 q1 加载常量。afs 都以 void 开始，因为不推断返回类型。-O0 参数都存栈时，eight_args 找齐八参，栈两项为 rbp+0x10、rbp+0x18。

**rizin 0.9.1（LGPL-3.0，原课已运行）与 Cutter 2.5.0。** afcl 列 `amd64 amd64syscall ms reg swift`，但 COFF 的 afc 返回 amd64，说明 Microsoft 配置虽存在，却未按格式选择。afi 对 Linux eight_args 报七参，仍漏 rcx；Windows 报 r8、rcx、rdx 和三槽，漏 r9、0x40 槽。没有 afv，列表命令是 afvl。Cutter 是 rizin 图形前端。

**angr 10.0.3（BSD-2，原课已运行）。** CFGFast 后运行 `CompleteCallingConventions(recover_variables=True)`，按格式将 calling_convention 设为 SimCCSystemVAMD64、SimCCMicrosoftAMD64 或 SimCCAArch64，将 prototype 设为签名。三目标 eight_args 八参均齐；x86-64 big_ret 隐含指针恢复为 `(BOT*, long long) -> BOT*`，Windows by_value 恢复 `(BOT*, BOT*) -> BOT*`，System V sum_varargs 为 `(long long, ...)`。盲区不同：System V/AArch64 mixed 为 `(long long, long long, double, float)`，寄存器正确但整数列表先打印导致顺序错；AArch64 big_ret 为 `(long long) -> double`，漏 x8、将向量存储当结果；AArch64 sum_varargs 有十六参数，把整个保存区都算进来。

**其他。** Hopper 6.6.0 是 macOS/Linux 商业反汇编、反编译器，本课未运行或记录其约定处理。lldb 1703、gdb 通过 frame info、register read 展示实时帧，第 42 课从动态角度查看同偏移。Compiler Explorer 可从源码并排看三种列表，是查字节前确认规则的最快办法。

| 概念 | Ghidra | IDA | Binary Ninja | radare2 / rizin | angr | 本课 |
|---|---|---|---|---|---|---|
| 约定对象 | cspec 的 prototype | 函数类型中的调用约定关键字 | Platform 上 CallingConvention | afc 名、cc-ARCH-BITS.sdb | SimCC 子类 | expected_locations(abi, name) |
| 目标默认约定 | 每 cspec 的 default_proto | 编译器设置 | Platform.default_calling_convention | afc=、anal.cc | 按格式 | describe_object() |
| 参数寄存器 | pentry，位置规则用 group | __usercall 的 @<reg> | int_arg_regs、float_arg_regs、arg_regs_share_index | cc.NAME.argN | ARG_REGS、FP_ARG_REGS | INT_ARG_REGS、FLOAT_ARG_REGS |
| 影子空间 | localrange 栈 8–39 | 隐含 | stack_reserved_for_arg_regs | cc.ms.argn=stack | STACKARG_SP_DIFF | STACK_ARG_BASE[WIN64] = 40 |
| 隐含结果指针 | hidden_return、storage="hiddenret" | __return_ptr、__hidden | 结果过大，int_return_reg 放不下 | 未建模 | 首参 BOT* | HIDDEN_RETURN_REG |
| 被调用者保留 | unaffected | __spoils 列相反集合 | callee_saved_regs | 配置 | CALLEE_CLEANUP 与架构 | CALLEE_SAVED |
| 分配函数约定 | Call Convention ID、Establish Function's Prototype | 用户或类型库 | required_arg_regs 启发式 | afc、afva、aaft | CallingConventionAnalysis | 先读后写加规范 |

## 动手构建

运行演示：

```bash
cd phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames
python3 code/main.py
```

输出 JSON，逐个列七目标的格式、机器、ABI，再逐个列十二函数的序言字节、保存寄存器及入口偏移、帧大小、帧指针、参数寄存器、栈参数偏移、溢出存储、返回寄存器/隐含指针、调用深度、调用者输出寄存器和存储。每函数最后列规则、源码签名预期、字节观察值及是否一致。报告末尾为两类展开交叉核验及工具捕获。84 项函数分析共有 489 个检查，全部一致。

预期结构：

```json
{
  "objects": {
    "convention-x86_64-windows-O2": {
      "format": "COFF", "machine": "AMD64", "abi": "Microsoft x64", "checks": "73/73 agree",
      "functions": {
        "keeps": {
          "prologue": ["56  pushq %rsi", "57  pushq %rdi", "53  pushq %rbx", "48 83 ec 20  subq $0x20, %rsp"],
          "frameBytes": 56,
          "savedRegisters": [{"register": "rsi", "entryOffset": -8}, {"register": "rdi", "entryOffset": -16}, {"register": "rbx", "entryOffset": -24}],
          "parameterRegisters": ["rcx"],
          "returnRegisters": ["rax"],
          "calls": [{"callee": "ext", "depth": 56}],
          "checks": [{"rule": "Microsoft x64: the caller must always allocate ...", "expected": "at least 32 bytes ...", "observed": [56], "agree": true}, "..."]
        }
      }
    }
  },
  "sehCrossCheck": ["..."],
  "ehFrameCrossCheck": {"...": "..."}
}
```

按顺序阅读 `code/main.py`：

1. describe_object() 读取 ELF/COFF/Mach-O 头及符号表，返回 ABI、函数列表。
2. parse_listing() 将 llvm-objdump -d -r 文本分函数，保留调用跳转的重定位目标。AT&T 以 # 去注释，AArch64 用 //、;，因为 # 是立即数前缀。
3. effect_x86()、effect_arm() 将单指令转为读取、地址读取、写入、加载、存储、SP 增量。AT&T 最后操作数为目标；AArch64 除存储、比较、分支外，首操作数为目标。lea 只读地址、不加载；mov、cvtsi2sd、setcc、xor r,r 的目标只写。call 写全部易失集合。前索引存储先改 SP，后索引加载后改 SP。
4. analyze_function() 走到首个 ret 或尾跳，跟踪 SP 相对入口的深度。disp(rsp) 的入口偏移为 disp-depth，disp(rbp) 为 frame_pointer+disp。记录先读后写的参数寄存器、ABI 首栈参数偏移以上的加载、参数寄存器入帧存储、当前 SP 下访问及每次调用深度。
5. _return_registers() 在结果寄存器退出前最后访问是写时保留它。作为数据读取会取消候选，作为地址基址读取不会。因此 Microsoft big_ret 中 mov rcx,rax 后经 (rax) 存储，仍保留 rax 为结果。
6. expected_locations() 将三份规则应用于 C 签名：System V 双列表加八字节类别，Microsoft 位置槽加引用结构，AAPCS64 计数器及大于十六字节结果的 x8。
7. run_checks() 比较推断和规则，并检查：被写保留寄存器须保存；每调用 rsp+8 或 sp 按十六对齐；Microsoft 每调用有 32 影子；Microsoft/AAPCS64 不访问 SP 下方，System V 不超过 128；尾声镜像序言，SP 恢复入口。
8. seh_cross_check()、eh_frame_cross_check() 读取未禁用异步展开表的目标，比较展开与序言。

另有 `python3 code/main.py analyze convention-x86_64-windows-O2 keeps`（单函数）、`python3 code/main.py object FILE`（头判断）、`python3 code/main.py seh`（各 UNWIND_INFO）。

## 实际使用

对自建新目标按顺序操作。

1. 用 `python3 code/main.py object FILE.o` 记 ABI，若与构建命令矛盾则停止，至少一方错误。
2. 在目标旁捕获 `llvm-objdump -d -r FILE.o`，运行分析。先读序言和保存寄存器，将帧大小与 push、sub 核对。
3. 对源码签名读参数寄存器和栈偏移。无法解释者可能是隐含指针、可变参数标记，或误判为参数的临时寄存器。最后一种是效果表 bug，应按该指令的一般规则修复。
4. 阅读不一致检查，先查其引用规则，再看字节，最后查分析器。
5. 有展开数据则交叉核验，两条一致推导是本课最强证据。
6. 安装其他工具时，用精确命令捕获并比较。一致则有三条推导，分歧则有具体寄存器、指令可查，并成为第 35 课的一项发现。

## 交互实验

### 实验 A：一条指令，三种效果

在 code 目录启动 Python：

```bash
cd phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames/code
python3 -q
```

运行：

```python
from main import *
effect(Instruction(0, "48 8d 04 0a", "leaq", "(%rdx,%rcx), %rax"), SYSV)
effect(Instruction(0, "f2 0f 2a d7", "cvtsi2sd", "%edi, %xmm2"), SYSV)
effect(Instruction(0, "a9bd7bfd", "stp", "x29, x30, [sp, #-0x30]!"), AAPCS64)
```

每次调用前先写预期读取、地址读取、写入、栈增量。将 `[sp, #-0x30]!` 换成 ldp 的 `[sp], #0x30`，观察增量由 sp_delta 转为 post_sp_delta。

### 实验 B：keeps 的栈帧

```python
info, listing = load_fixture("convention-aarch64-linux-O2")
keeps = analyze_function("keeps", listing["keeps"], info.abi)
keeps.saved
keeps.frame_pointer
[c.to_dict() for c in frame_cells(keeps)]
```

与上方手算偏移比较。加载 convention-arm64-macos-O2 再运行三行，记录移到 -16，四寄存器在下方。再加载 convention-x86_64-linux-O2-fp，看 keeps.saved：帧指针恢复，且多一次只为使调用时 rsp+8 按十六对齐的 pushq rax。

### 实验 C：mixed 的先读后写

```python
info, listing = load_fixture("convention-x86_64-linux-O2")
mixed = analyze_function("mixed", listing["mixed"], info.abi)
mixed.param_registers
mixed.return_registers
expected_locations(SYSV, "mixed")["parameters"]
expected_locations(WIN64, "mixed")["parameters"]
```

System V 列表为 rdi、xmm0、rsi、xmm1；Microsoft 为 rcx、xmm1、r8、xmm3。加载 Windows 目标再运行前三行。打开 Linux 的 radare2 捕获，找 [afv mixed] 的三个 double，定位解释第三个的指令。

### 实验 D：展开器的第二意见

```python
for row in seh_cross_check():
    print(row["function"], row["sizeOfProlog"], row["unwindPushes"], row["unwindAllocBytes"], row["agree"])
for row in eh_frame_cross_check("convention-x86_64-linux-O2-eh"):
    print(row["function"], row["cfiSaved"], row["cfiMaxOffset"], row["deepestStack"], row["agree"])
```

在 SEH 表找到 sum_varargs 的 pushq rax，解释为何编码为分配；再在 .eh_frame 找 call8，解释 32。

## 实践实验

添加第四目标和规则。

要求：

- 用 `-target x86_64-apple-macos -O2` 编译 convention.c，捕获列表。扩展 describe_object() 读取 Mach-O cputype 0x01000007，映射为 Apple x86-64 遵循的 System V，处理下划线前缀。
- 确认每函数符合 System V 检查，记录 Darwin 各优化级别保留帧指针这一序言差异。
- 加 Linux x86-64 的 -fstack-protector-strong 构建。扩展序言扫描，将 fs:0x28 的 canary 加载和局部变量下方存储记为 canary 单元，ret 前比较记为尾声保护。
- 测试：canary 存储若被算作参数溢出存储则失败。
- 运行分析器前手绘 with_canary 类代码栈帧，将图放测试旁。

验收标准：演示报告新目标全部检查一致，受保护函数的帧单元在局部变量和保存寄存器间显示 canary。

## 交付产物

`outputs/skill-calling-conventions-and-stack-frames.md` 将自建目标、列表、C 签名转为参数位置、帧布局、返回寄存器，并与规范及编译器展开数据逐项核对。它要求先判头部 ABI，禁止将 cvtsi2sd、xor r,r 的目标视为读，最后给出首个分歧。

## 验证

运行演示与确定性测试：

```bash
cd phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应证明：

- 七目标 ELF/COFF/Mach-O 头分别确定 System V、Microsoft x64、AAPCS64、Apple arm64。
- 各符号表均十二函数，正确解析 Mach-O 下划线及 ltmp0。
- 列表解析保留 ext 调用目标及 AArch64 #-0x30 等立即数。
- lea 读取两个地址寄存器但不加载；xor 自身、cvtsi2sd 目标只写；前索引 stp 先改 SP、后索引 ldp 后改。
- -O2 keeps 在 System V 为 55 41 56 53、24 字节无帧指针；Microsoft 为 56 57 53 48 83 ec 20、56 字节；AArch64 首字 a9bd7bfd、记录 -48。
- Apple 在四个保存寄存器上方 -16 放记录。
- Linux -O0 有帧指针、-O2 无；-fno-omit-frame-pointer 带对齐 push 恢复它。
- -O0 叶函数在 System V 用八字节红区，Microsoft 用 pushq rax，AAPCS64 用 sub sp 0x10；-mno-red-zone 消除红区使用。
- 各尾声镜像序言，SP 回入口。
- 两优化级别 eight_args 分别为六寄存器加 8/16 栈槽、四寄存器加 40–64、或 x0–x7。
- mixed 在 System V 为 rdi/xmm0/rsi/xmm1，Microsoft 为 rcx/xmm1/r8/xmm3，二者 xmm0 返回。
- 十六字节结构在 System V/AAPCS64 用双寄存器，Microsoft 在隐含指针后按引用传递。
- 三十二字节结构经 rdi、rcx、x8 返回。
- 可变参数被调用者读 al，或将 rdx/r8/r9 写入口 16/24/32，或保存 x1–x7/q0–q7，Apple 则读调用者 SP。
- 调用者设预期寄存器，将 7/8 存 0/8 或将 5–8 存 32–56，可变参数前清零 al，以 rdi/rcx/x8 传结果缓冲。
- 489 个规则检查全部一致。
- 六个 UNWIND_INFO 与序言相符，叶函数无记录。
- 24 个 FDE 与保存偏移和最深 SP 相符。
- 捕获记录 radare2 amd64/ms、rizin COFF 上 amd64、遗漏 rcx、三个 double、angr 原型。
- 站点模块嵌入 figure 数据与分析器一致。

## 生产故障模式

| 故障 | 粗略工具报告 | 分析必须证明 |
|---|---|---|
| COFF 按 System V 读 | 从不读取的 rdi/rsi 被当参数 | 头为 0x8664，须 Microsoft x64 |
| 只在 lea 内读寄存器 | 八参函数报七参 | 基址、索引也是读取 |
| cvtsi2sd 目标算读取 | xmm2 是第三 double | 首次访问为写，mixed 只有两 SSE 参数 |
| 位置槽当独立序列 | Windows double 在 xmm0 | 槽 1 为 XMM1，槽 3 为 XMM3 |
| push rbp 就认帧指针 | -O2 的累加器 rbp 被当帧指针 | push 后还需 mov rsp,rbp |
| 从入口 SP 量红区 | “SP 下 216 字节” | sub 88 后当前 SP 下方仅 128 |
| 影子空间当局部 | 栈参数在 8–32 | Microsoft 从 40 开始 |
| lea 当加载 | 可变参数函数 0x60(rsp) 是栈参数 | lea 计算 overflow_arg_area，不加载 |
| 隐含指针当普通参数 | big_ret(void *, long long) | 通过指针存储，复制到 rax，或保持 x8 |
| 最深 CFA 对比序言帧 | 调用者中途 push 输出参数时不一致 | 对比函数体最深 SP |
| 仅凭 ISA 断言约定 | COFF 用 amd64 | 格式选规则，再由 ISA 选寄存器 |
| 信任单工具原型 | 三个 double 或十六可变参数 | 需源码签名或第二推导一致 |

## 操作规则

首条指令前先读头、确定规范。以入口 SP 定位各保存寄存器和参数，与规范及同帧的编译器展开数据核对。工具原型在字节或源码确认之前，只是一项主张。

## 延伸阅读

- [System V Application Binary Interface, AMD64 Architecture Processor Supplement, Version 1.0 (sections 3.2.1 to 3.2.3, 4.2.4)](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Microsoft x64 calling convention](https://learn.microsoft.com/en-us/cpp/build/x64-calling-convention)
- [Microsoft x64 stack usage](https://learn.microsoft.com/en-us/cpp/build/stack-usage)
- [Microsoft x64 prolog and epilog](https://learn.microsoft.com/en-us/cpp/build/prolog-and-epilog)
- [Microsoft x64 exception handling: RUNTIME_FUNCTION, UNWIND_INFO, UNWIND_CODE](https://learn.microsoft.com/en-us/cpp/build/exception-handling-x64)
- [Arm Procedure Call Standard for the Arm 64-bit Architecture (AAPCS64), release 2025Q4](https://github.com/ARM-software/abi-aa/blob/main/aapcs64/aapcs64.rst)
- [Apple: Writing ARM64 code for Apple platforms](https://developer.apple.com/documentation/xcode/writing-arm64-code-for-apple-platforms)
- [DWARF Debugging Information Format Version 5, section 6.4 Call Frame Information](https://dwarfstd.org/doc/DWARF5.pdf)
- [Clang driver frame-pointer defaults, `useFramePointerForTargetByDefault` in `CommonArgs.cpp`](https://github.com/llvm/llvm-project/blob/main/clang/lib/Driver/ToolChains/CommonArgs.cpp)
- [Clang command line reference: `-fomit-frame-pointer`, `-momit-leaf-frame-pointer`](https://clang.llvm.org/docs/ClangCommandLineReference.html)
- [Fedora 38 change: frame pointers by default](https://fedoraproject.org/wiki/Changes/fno-omit-frame-pointer)
- [Ubuntu 24.04: performance engineering with frame pointers by default](https://ubuntu.com/blog/ubuntu-performance-engineering-with-frame-pointers-by-default)
- [Ghidra compiler specification: `x86-64-gcc.cspec`](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Processors/x86/data/languages/x86-64-gcc.cspec)
- [Ghidra compiler specification: `x86-64-win.cspec`](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Processors/x86/data/languages/x86-64-win.cspec)
- [Ghidra compiler specification: `AARCH64.cspec`](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Processors/AARCH64/data/languages/AARCH64.cspec)
- [Hex-Rays: SetType and the `__usercall` convention](https://docs.hex-rays.com/ida-actions/settype)
- [Hex-Rays: Decompile as call](https://docs.hex-rays.com/ida-actions/hx_userdefinedcall)
- [Binary Ninja API 6.0: `callingconvention` module](https://api.binary.ninja/binaryninja.callingconvention-module.html)
- [Binary Ninja API 6.0: `platform` module](https://api.binary.ninja/binaryninja.platform-module.html)
- [Binary Ninja user documentation: platform types](https://docs.binary.ninja/guide/types/platformtypes.html)
- [The Official Radare2 Book: calling conventions](https://book.rada.re/analysis/calling_conventions.html)
- [The Official Radare2 Book: code analysis](https://book.rada.re/analysis/code_analysis.html)
- [angr documentation: decompiler analysis passes, including calling convention recovery](https://docs.angr.io/en/latest/analyses/decompiler.html)
- [radare2 6.2.4 release](https://github.com/radareorg/radare2/releases/tag/6.2.4)
- [rizin 0.9.1 release](https://github.com/rizinorg/rizin/releases/tag/v0.9.1)
