# 编译器惯用模式：优化怎样改变代码，又怎样读回源码

> 优化编译器会把源码结构替换成成本更低的指令形态。每种形态都有推导过程；本课构建一个识别器，反向执行推导，再对照源码检查结果。

**类型：** Build
**语言：** Python, C, x86-64 assembly, AArch64 assembly
**前置要求：** 阶段 13 · 33（反汇编与控制流）、阶段 13 · 34（提升为伪代码）、阶段 13 · 38（调用约定）
**预计时间：** ~150 分钟

## 学习目标

- 用 Granlund-Montgomery 界推导任意常数除法的魔数和移位量，并从 clang 生成的常数还原除数。
- 说出 LLVM 降低 `switch` 的五种方式，从目标文件读取条目数、表位置和条目内容。
- 将向量化循环读成通道、累加器、每次迭代的元素数、迭代次数掩码、归约和余数循环。
- 识别尾调用、内联的被调用函数、无分支选择，以及转成 `memset` 或 `memcpy` 的循环。
- 在 x86-64 和 AArch64 的 `-O0` 到 `-O3` 构建中，为每个惯用模式报告证据指令和解码后的源码形式。
- 对照 Ghidra、angr、radare2、rizin 和 lldb 对同一组字节的输出。

## 问题背景

你用 `-O2` 编译 `idioms.c`，让 agent 解释 `div7u`。agent 读到 `imulq $0x24924925, %rax, %rax`，回答说函数先乘以 613566757，再移位、相加。每个字都对。这个函数计算的是 `x / 7`。

同一个目标文件里，还有一个含七个 case、却完全没有跳转的 `switch`，一个含五个 case、实现为跳转表的 `switch`，一个含两个 case、实现为 `sete` 和 `cmovne` 的 `switch`，以及一个遍历 `n` 个整数的循环：它用两个 `xmm` 寄存器，每次处理八个整数，再用第二个循环处理剩余元素。在 `-O0` 下，同一份源码生成的是 `divl`、七项跳转表和一个标量循环。在 `-O1` 下，七个 case 的 switch 变成数值表，而向量循环尚未出现。

这些形态就是惯用模式。编译器依据源码中可查的规则生成它们，每种模式也都能解码回原始结构。解码依靠算术，而算术可以检查。第 34 课证明过其中一种，即乘以 `0x66666667`。本课为所有这些模式构建识别器，分析我们自己代码的 18 个构建，并对照 C 源码验证全部 373 份报告。

```figure
re-39-idioms-by-level
```

## 惯用模式是有推导依据的指令形态

惯用模式是编译器为一种源码结构生成的指令序列。它有三个识别特征：形态固定，操作数中的常数符合推导预测，而且形态不同于程序员通常手写的代码。

`code/main.py` 中的识别器处理 `llvm-objdump -d -r` 的文本输出。第 33 课已把它确立为指令边界的参照。识别器把每个函数解析为指令，记录地址、字节、助记符、操作数和紧跟指令的重定位行。它只为两类数据读取目标文件：数值表所在的 `.rodata` 字节，以及链接前跳转表目标所在的 `.rela.rodata` 条目。

每个检测结果都是一条 `Idiom` 记录，含 `kind`、解码后的 `source` 形式、`evidence` 地址列表、`detail` 字典和 `verified` 标志。标志来自 C 源码。`parse_source()` 读取 `idioms.c`，找到各函数，提取 `/` 和 `%` 后的除数、`*` 后的乘数、`switch` 的 case 及数值、`? :` 运算符、`for` 循环和被调用函数。除法模式的除数出现在该函数的除法列表中，才算验证通过。查找表条目与 case 数值一致，或仅相差一个固定倍数，才算通过。尾调用的被调用函数必须确实出现在源码调用中。演示报告最后给出 `unverified` 列表，测试套件断言 18 个构建的该列表都为空。

解码需要名称。识别器按列表顺序遍历每个函数的基本块，执行一个小型符号求值器。它依据第 38 课的 System V 和 AAPCS64 约定，把源码参数名放入实参寄存器。栈槽按操作数字符串跟踪，因此能穿透 `-O0` 的寄存器溢出保存。在每个基本块入口，它合并前驱状态；若状态不同，先前模式赋予的名称优先于常数。这使 `digest` 中的 `cmovll %edx, %eax` 能读回 `sum % 10 < 5 ? sum % 10 : 5`：循环模式把累加器命名为 `sum`，除法模式把商命名为 `sum / 10`，取模模式再把结果命名为 `sum % 10`。源码写的是 `rem > 5 ? 5 : rem`。两式都返回 `rem` 与 5 中较小的值，在 `rem == 5` 时也一致。

## 常数除法

Granlund 和 Montgomery 在《Division by Invariant Integers using Multiplication》（PLDI 1994）中用乘法和移位替换 `n / d`。选择移位量 `s` 和乘数 `m = ceil(2^s / d)`。当误差 `e = m * d - 2^s` 足够小时，范围内所有 `n` 都满足 `floor(n * m / 2^s) = floor(n / d)`。对于无符号 32 位 `n`，界是 `e <= 2^(s - 32)`。对于满足 `|n| < 2^31` 的有符号 `n`，界是 `e <= 2^(s - 31)`；当 `n` 为负时，符号修正还要加 1，因为向下取整不符合负商所需的舍入方向。

`main.py` 的 `magic_numbers(d, bits, signed)` 从 32 开始向上搜索 `s`，返回第一组满足界的数。这个搜索能复现 fixture 中 clang 生成的每一个常数。

### 手算无符号除以 10

`2^35 / 10 = 3435973836.8`，向上取整为 `3435973837 = 0xCCCCCCCD`。误差是 `0xCCCCCCCD * 10 - 2^35 = 2`，`s = 35` 时的界是 `2^3 = 8`。若 `s = 34`，误差为 6，界仅为 4，因此 35 是最小移位量。用 `n = 123` 检查：`123 * 3435973837 = 422624781951`，且 `422624781951 >> 35 = 12`。

clang 在 x86-64 的 `-O2` 下为 `div10u` 生成的恰好是：

```text
       0: 89 f9                        	movl	%edi, %ecx
       2: b8 cd cc cc cc               	movl	$0xcccccccd, %eax
       7: 48 0f af c1                  	imulq	%rcx, %rax
       b: 48 c1 e8 23                  	shrq	$0x23, %rax
```

`0x23` 就是 35。`movl %edi, %ecx` 把 32 位实参零扩展到 64 位寄存器，这对应无符号形式。识别器从供给双操作数 `imulq` 的 `movl $imm` 读取乘数，读取移位量，然后调用 `divisor_from_magic(0xCCCCCCCD, 35)`。该函数尝试 `2^35 // m = 10` 和 11，接受 10，因为 `magic_numbers(10)` 会返回同一组乘数和移位量。

AArch64 上，同一函数是 `mov w8, #0xcccd; movk w8, #0xcccc, lsl #16; umull x8, w0, w8; lsr x0, x8, #35`。常数分成两个 16 位部分传入，乘法是 `umull`，移位量以十进制表示。识别器拼合这两半，报告同一个除数。

### 手算无符号除以 7：带加法修正

`2^35 / 7 = 4908534052.57`，向上取整为 `4908534053 = 0x124924925`，需要 33 位。误差为 3，界为 8，所以移位量为 35，没有更小的可行移位量。32 位乘法放不下这个乘数，因此编译器先乘以低 32 位 `0x24924925`，再按固定序列加回被除数：

```text
      32: 48 69 c0 25 49 92 24         	imulq	$0x24924925, %rax, %rax
      39: 48 c1 e8 20                  	shrq	$0x20, %rax
      3d: 29 c7                        	subl	%eax, %edi
      3f: d1 ef                        	shrl	%edi
      41: 01 f8                        	addl	%edi, %eax
      43: c1 e8 02                     	shrl	$0x2, %eax
```

把它读成 `t = (n * 0x24924925) >> 32`，然后 `q = (((n - t) >> 1) + t) >> 2`。总移位量是 `32 + 1 + 2 = 35`。取 `n = 100`：`t = 14`，`(100 - 14) >> 1 = 43`，`43 + 14 = 57`，`57 >> 2 = 14`。识别器检测 32 位移位后面的 `sub`、`shr`、`add`、`shr` 尾部，把 `2^32` 加回乘数，还原出 7。`evaluate_division()` 执行这段原样序列，测试用 32 位边界值将结果与 `n // 7` 对照。AArch64 的形式是 `sub w9, w0, w8; add w8, w8, w9, lsr #1; lsr w0, w8, #2`，因为带移位的加法只需一条指令，所以少一条。

### 手算有符号除以 3

`2^32 / 3 = 1431655765.33`，向上取整为 `1431655766 = 0x55555556`，误差为 2，`s = 32` 时的有符号界是 `2^1 = 2`。恰好满足界，因此移位量为 32，clang 使用 `shrq $0x20`。取 `n = -7`：乘积为 `-10021590362`，算术右移 32 位得到 `-3`；符号位已置位，所以修正加 1，结果为 `-2`，即 C 中的 `-7 / 3`。有符号 fixture `div10s` 和 `div3s` 都先对乘积副本执行 `shrq $0x3f`，再执行 `addl` 完成修正。

### 不能只看常数

乘数本身不能确定除数。`0x66666667` 搭配移位量 34 表示除以 10；第 34 课已经展示，同一乘数搭配移位量 33 则表示除以 5。因此识别器始终把乘数和总移位量配对，`clangMatchesAlgorithm` 字段记录这组数是否与搜索得到的结果相同。2 的幂不使用乘法。`magic_numbers()` 拒绝这些除数，因为编译器会生成带符号偏置的移位；下一节的 `mod8s` 展示这种形态。

### 惯用模式属于指令选择器

在 `-O0` 下，`div10u` 是 `movl $0xa, %ecx; xorl %edx, %edx; divl %ecx`，`div10s` 是 `cltd; idivl %ecx`。但在同一目标文件中，`digest` 用 `imulq $0x66666667` 将循环和除以 10。一个选项就能解释差异。fixture `idioms-x86_64-nofastisel-O0.o` 使用 `-O0 -mllvm -fast-isel=false` 构建，里面每个除法都成了乘法，包括 `div10u` 的 `movl $0xcccccccd, %ecx; imulq %rcx, %rax; shrq $0x23`。硬件除法是快速指令选择器在 `-O0` 下的选择。乘法则是 SelectionDAG 的降低方式，由 LLVM 的 `UnsignedDivisionByConstantInfo` 和 `SignedDivisionByConstantInfo` 生成。`digest` 中含除法的块也含 `switch`，因此该块交给 SelectionDAG。识别器会同时报告 `hardware idivl` 和 `magic multiply` 两种形式，交互图也展示了这个混合的 `-O0` 函数。

## 取模跟随商

`x % d` 等于 `x - (x / d) * d`。编译器先用前面的模式算商，再乘回去并相减。x86-64 上，乘回 10 的过程是 `addl %ecx, %ecx; leal (%rcx,%rcx,4), %ecx`，即 `2 * q * 5`。AArch64 只需一条 `msub w0, w8, w9, w0`，在 `w9 = 10` 时计算 `w0 - w8 * w9`。识别器穿过复制指令跟踪商寄存器，并通过 `add`、`lea`、`shl`、`imul` 跟踪累计因子；因子等于除数时，才接受该 `sub`。

同一个商若还参与另一表达式，两个模式都保留在报告里。在 `-O1` 下，编译器在 `digest` 中只计算一次 `sum / 10`，同时供 `switch` 索引和取模使用。x86-64 甚至会两次合并商：取模用 `leal (%rax,%rsi), %edi`，switch 用 `addl %esi, %eax`。识别器报告一个除法和一个取模，并将商标记为共享。这里若丢掉除法，`switch` 的索引就无法读懂。

有符号数对 2 的幂取模有自己的形态，因为根本不计算商：

```text
      92: 8d 48 07                     	leal	0x7(%rax), %ecx
      95: 85 ff                        	testl	%edi, %edi
      97: 0f 49 cf                     	cmovnsl	%edi, %ecx
      9a: 83 e1 f8                     	andl	$-0x8, %ecx
      9d: 29 c8                        	subl	%ecx, %eax
```

当 `x` 为负时，代码先加偏置 7 再掩码，使截断按 C 的要求向零舍入。掩码后的值是 `x` 舍入到 8 的倍数，减法留下 `x % 8`。AArch64 使用 `negs w8, w0; and w9, w0, #0x7; and w8, w8, #0x7; csneg w0, w9, w8, mi`：同时掩码 `x` 和 `-x`，再按符号选择并取负。Ghidra 把这条规则命名为 `RuleSignMod2nOpt`，简述为“转换 INT_SREM 形式：`(V + (sign >> (64-n)) & (2^n-1)) - (sign >> (64-n)) => V s% 2^n`”。

`-O0` 的 AArch64 把取模写成 `sdiv w9, w8, w10; mul w9, w9, w10; subs w0, w8, w9`。识别器也接受这种形式，报告 `hardware sdiv + mul + subs`。

## 降低 switch 的五种方式

LLVM 在两处决定 `switch` 的形态。`SimplifyCFG::simplifySwitchLookup` 在 `-O1` 及以上运行：当至少有三个 case、每个 case 都产生常数，并且目标平台支持构建查找表时，它把 switch 转成数值表。其表类型为 `SingleValueKind`、`LinearMapKind`、`BitMapKind` 和 `ArrayKind`。`-O0` 流水线不运行这一遍。剩余 switch 在指令选择阶段到达 `SwitchLowering::findJumpTables`；如果簇至少有 `min-jump-table-entries` 个条目（默认 4）且足够密集，它就构建跳转表。密度条件是 `NumCases * 100 >= Range * MinDensity`，普通函数的 `jump-table-density` 为 10，`-Os` 下为 40。再剩下的转成针对 case 常数的二分搜索，由 `splitWorkItem` 选择枢轴。fixture 为每种结果各提供一个函数。

| 函数 | 源码 | `-O0` x86-64 | `-O2` x86-64 | `-O2` AArch64 |
|---|---|---|---|---|
| `linear_switch` | case 0 至 6 返回 10 至 70 | 7 项跳转表 | 线性映射 `10*k + 10`，默认 -1 | `madd` 和 `csinv` |
| `table_switch` | case 0 至 6 返回 10 至 60，最后返回 71 | 7 项跳转表 | `.rodata+0x28` 的查找表 | `.rodata+0x0` 的查找表 |
| `call_switch` | case 0 至 4 各调用五个指针之一 | 5 项跳转表 | 5 项跳转表 | 比较树，枢轴为 1 |
| `sparse_switch` | case 为 1、100、10000、1000000、100000000 | 比较链 | 比较树，枢轴为 9999 | 比较树，枢轴为 9999 |
| `two_cases` | case 3 和 4 返回 7 和 9 | 比较链 | 选择链 `k != 3 ? (k == 4)*9 : 7` | 两条 `csel` |

### 从目标文件读取查找表

`-O2` 下的 `table_switch`：

```text
      d0: b8 ff ff ff ff               	movl	$0xffffffff, %eax
      d5: 83 ff 06                     	cmpl	$0x6, %edi
      d8: 77 0c                        	ja	0xe6 <table_switch+0x16>
      da: 89 f8                        	movl	%edi, %eax
      dc: 48 8d 0d 00 00 00 00         	leaq	(%rip), %rcx
		00000000000000df:  R_X86_64_PC32	.rodata+0x24
      e3: 8b 04 81                     	movl	(%rcx,%rax,4), %eax
      e6: c3                           	retq
```

边界检查 `cmpl $6; ja` 意味着有 7 个有效条目。重定位加数 `0x24` 加上 RIP 相对字段的 4 字节，把表定位到 `.rodata+0x28`，这正是第 33 课推导的规则。该处字节为 `0a 00 00 00 14 00 00 00 ...`，因此条目为 `[10, 20, 30, 40, 50, 60, 71]`，与源码 case 的数值相同。汇编器在 `.s` 文件中把这张表命名为 `.Lswitch.table.table_switch`，并加上注释 `@switch.table.table_switch`。目标文件中只剩重定位和字节。这里没有跳转，所以控制流图只有三个块。

AArch64 用 `adrp x8` 和 `add x8, x8, #0x0` 拼出表地址，两条指令各带一个指向 `.rodata` 的重定位，再用 `ldr w0, [x8, w0, uxtw #2]` 加载。识别器从 `add` 的重定位读取加数。

### 完全没有表的线性映射

`linear_switch` 在 `k` 为 0 至 6 时返回 `10 * (k + 1)`。`simplifySwitchLookup` 检测到仿射关系，生成算术指令：

```text
      b0: 83 ff 07                     	cmpl	$0x7, %edi
      b3: 8d 04 bf                     	leal	(%rdi,%rdi,4), %eax
      b6: 8d 4c 00 0a                  	leal	0xa(%rax,%rax), %ecx
      ba: b8 ff ff ff ff               	movl	$0xffffffff, %eax
      bf: 0f 42 c1                     	cmovbl	%ecx, %eax
```

求值器把 `leal (%rdi,%rdi,4)` 读成 `5*k`，把 `leal 0xa(%rax,%rax)` 读成 `10*k + 10`，再把 `cmpl $7` 后的 `cmovb` 读成 `k < 7 ? 10*k + 10 : -1`。识别器随后将公式与源码每个 case 对照，将模式标记为已验证。AArch64 通过 `madd w8, w0, w8, w9` 和 `csinv w0, w8, wzr, lo` 得到相同表达式；默认路径上，搭配 `wzr` 的 `csinv` 产生 `-1`。

### 从重定位读取跳转表

`-O2` 的 `call_switch` 与第 33 课从 `-O0` 的 `grade` 还原出的形态相同：`cmpl $4; ja`、指向 `.rodata-0x4` 的 `leaq`、读取 4 字节条目的 `movslq`、`addq` 和 `jmpq *%rax`。五个条目是 `.rela.rodata` 中的重定位，`target = addend - 4k` 得到 `0x10c, 0x107, 0x10e, 0x110, 0x109`，对应五个不同块，各自通过函数指针执行尾跳转。`dispatch` fixture 将它扩展到 16 个 case：x86-64 有 16 个重定位条目；AArch64 则使用由 16 个单字节组成的压缩表，用 `ldrb w11, [x9, x8]` 读取，以 `add x10, x10, x11, lsl #2` 放大 4 倍，并以首个 case 块的 `adr` 为基址。识别器从字节表解码出 `[0x24, 0x74, 0x54, ...]`，报告 `compressed: true`。

### 同一个 switch 在四个优化级别下的形态

`digest` 对 `sum / 10` 执行 switch，case 6 至 10 对应数值 1、2、4、8、8，随后将结果乘以 16。x86-64 下，`-O0` 是跳转表，`-O1` 是条目为 `[16, 32, 64, 128, 128]` 的查找表，`-O2` 和 `-O3` 又变成跳转表，其四个 case 块存储 `0x10`、`0x20`、`0x40`、`0x80`。从 `-O1` 起，乘以 16 被移入各 case。`-O0` 时各 case 存储 1、2、4、8，乘法保留在 switch 后。对于 `-O1` 的查找表，识别器将条目与源码数值比较，找到恒定比值，报告 `foldedFactor: 16`。AArch64 的 `-O2` 形式是比较树，枢轴为 8，分别检查是否等于 6、7、8，并用范围测试 `sub w9, w9, #9; cmp w9, #2; b.hs` 在两条指令中覆盖 case 9 和 10。识别器报告 `rangeTests: [[9, 10]]`。

两个选项会改变这些边界。`-fno-jump-tables` 将 x86-64 的 `table_switch`、`call_switch` 和 `digest` switch 转成比较树；七个 case 的函数枢轴为 2 和 4。在 AArch64 上，`-mllvm -min-jump-table-entries=4` 仍让 `call_switch` 保持比较树，因此对于该目标平台上含五个间接调用 case 的 switch，条目数并非决定因素。fixture `idioms-arm64-jt4-O2.o` 记录了这次运行。

GCC 将两项决策都放在 `tree-switch-conversion.cc`，涉及 `jump_table_cluster`、`bit_test_cluster`、`switch_decision_tree` 和 `switch_conversion` 类。`-ftree-switch-conversion` 从 `-O2` 开启，`-fjump-tables` 和 `-fbit-tests` 从 `-O1` 开启，跳转表阈值来自 `case-values-threshold`，默认值由机器决定。上游课程的实验机器没有安装 GCC，因此这些名称来自 GCC 源码和手册，可以到 Compiler Explorer 检查。

## 循环：向量化、展开或替换

LLVM 循环向量化器在 `-O2`、`-O3`、`-Os` 开启，在 `-O0`、`-O1` 关闭。这条规则始于 2014 年 1 月的 LLVM 3.4。`-O2` 的 `sum_n` 展示了形态的各个部分：

```text
     1f6: 83 fe 07                     	cmpl	$0x7, %esi
     1f9: 77 09                        	ja	0x204 <sum_n+0x14>
     206: 81 e2 f8 ff ff 7f            	andl	$0x7ffffff8, %edx
     230: f3 0f 6f 14 37               	movdqu	(%rdi,%rsi), %xmm2
     235: 66 0f fe c2                  	paddd	%xmm2, %xmm0
     239: f3 0f 6f 54 37 10            	movdqu	0x10(%rdi,%rsi), %xmm2
     23f: 66 0f fe ca                  	paddd	%xmm2, %xmm1
     243: 48 83 c6 20                  	addq	$0x20, %rsi
     24a: 75 e4                        	jne	0x230 <sum_n+0x40>
     24c: 66 0f fe c8                  	paddd	%xmm0, %xmm1
     250: 66 0f 70 c1 ee               	pshufd	$0xee, %xmm1, %xmm0
     262: 66 0f 7e c8                  	movd	%xmm1, %eax
     270: 03 04 97                     	addl	(%rdi,%rdx,4), %eax
     279: 75 f5                        	jne	0x270 <sum_n+0x80>
```

保护条件 `cmpl $7; ja` 让迭代次数小于 8 的情况走标量循环。掩码 `andl $0x7ffffff8` 把次数向下舍入到 8 的倍数。循环体每次加载 32 字节到两个 `xmm` 累加器，每个累加器有四个 32 位通道，因此向量化因子为 4，交错因子为 2。循环结束后，`paddd`、两条 `pshufd`、另外两条 `paddd` 和 `movd` 把八个通道归约成一个整数。`0x270` 的循环是标量余数循环，处理最后 0 至 7 个元素。识别器通过回边找到循环，发现 SIMD 寄存器，从 `paddd` 读取通道数，统计不同累加器，将步长 `0x20` 除以 4，然后报告 `4 lanes x 2 accumulators = 8 elements per iteration`，并把掩码、保护条件、归约和余数循环列为字段。AArch64 通过 `ldp q2, q3`、两条 `add v.4s`、`addv s0, v0.4s` 和 `fmov w8, s0` 完成相同操作。

固定迭代次数会消除循环。`sum4` 只剩一条 `movdqu`、归约和 `movd`，没有回边。`poly8` 每次迭代依赖上一次的累加器，因此无法向量化，编译器便将它展开八次：从 `%rdi` 起偏移 0 至 `0x1c` 进行八次加载，每次之后接一次左移 5 位和一次减法，计算 `acc * 31`。识别器统计同一基址上连续偏移的加载，报告 `loop unrolled by 8, no back edge`。AArch64 把相同加载写成四对 `ldp`。

用 `-fno-vectorize -fno-slp-vectorize` 关闭向量化器后，`sum_n` 变成展开八次的标量循环，包含八条 `addl k(%rdi,%rdx,4), %eax` 和 `addq $8`，再加余数循环。`sum4` 变成四次加法。识别器对前者报告 `unrolled loop`、`copies: 8` 和 `indexStep: 8`，对后者报告 `copies: 4`。

第 33 课在 `-O2` 的 `total` 中发现两条回边，把它们称为两个循环。本课明确它们的含义：同一个源码循环的向量循环体和标量余数部分。只有目标能再次到达该分支时，回边才是循环。`is_loop()` 会检查这一点，因为 AArch64 的 `digest` 中存在指向共享默认块的向后分支，它们不是循环，但识别器的初版曾把它们统计为向量循环。

### 变成库调用的循环

从 `-O1` 起，`LoopIdiomRecognize` 把逐字节存零的循环转成 `memset` 调用。`-O2` 的 `fill` 是 `testl %esi, %esi; jle; movl %esi, %edx; xorl %esi, %esi; jmp memset@PLT`。调用是尾跳转，带重定位 `R_X86_64_PLT32 memset-0x4`；函数的 `retq` 仅出现在空路径上。识别器报告 `store loop recognized as memset(...)`，并对照源码循环验证，因为源码根本没有写 `memset`。

`copy16` 以常数 16 调用 `memcpy`，x86 后端把它内联展开为 `movups (%rsi), %xmm0; movups %xmm0, (%rdi)`，未超过每次 `memcpy` 最多 8 次存储的限制。在 `-O0` 下，同一调用变成两对 8 字节 `movq`。加上 `-fno-builtin` 后，调用仍是调用：`jmp memcpy@PLT` 配合 `movl $0x10, %edx`；`fill` 也保留循环，随后向量化器将它转成每次迭代含两次 16 字节 `movups` 存储的循环。识别器对该构建报告 `vectorized store loop: 2 x 16-byte stores = 32 bytes per iteration`。

## 消失或变成跳转的调用

`tail_caller` 返回 `tail_target(x + 1)`。`-O0` 时为 `addl $0x1, %edi; callq tail_target@PLT; addq $0x10, %rsp; popq %rbp; retq`；`-O2` 时只剩 `incl %edi; jmp tail_target@PLT`。调用者的栈帧消失，被调用者直接返回到调用者的调用者。AArch64 上是带 `R_AARCH64_JUMP26` 的 `b tail_target`。识别器将带调用重定位的 `jmp` 或 `b` 视为尾调用。第 33 课的递归下降必须把它当作函数出口，因为目标在函数之外。

`twice_sum` 调用 `leaf_add`。`-O0` 时调用仍在，即 `callq leaf_add@PLT`。从 `-O1` 起，`leaf_add` 的函数体 `leal (%rdi,%rsi), %eax` 出现在 `twice_sum` 内部，不再留下调用。在 `-O0` 下，clang 为每个函数标记 `optnone` 和 `noinline`，只运行 always-inliner。识别器从源码知道 `twice_sum` 调用了 `leaf_add`，却找不到对应调用或尾跳转，便在调用者中寻找被调用者函数体的形态：保留助记符和源操作数，去掉目的操作数。因此 AArch64 调用者中的 `add w8, w1, w0` 与被调用者的 `add w0, w1, w0` 匹配。一次匹配就构成证据。

`dispatch` 同时包含这两种情况：16 项跳转表的每个 case 都是 `movl %esi, %edi; jmp fN@PLT`。识别器报告一个 switch 和 16 个尾调用，全部与源码中的 16 次调用核验。

## 变成数据移动的分支

`clamp_max` 是 `movl %esi, %eax; cmpl %esi, %edi; cmovgl %edi, %eax`。求值器把 `%edi` 命名为 `a`、`%esi` 命名为 `b`，记录比较，将 `cmovg` 读成 `a > b ? a : b`，正好对应源码。`abs_int` 是 `movl %edi, %eax; negl %eax; cmovsl %edi, %eax`，读成 `-x < 0 ? x : -x`；AArch64 写成 `cmp w0, #0; cneg w0, w0, mi`，读成 `x < 0 ? -x : x`。`is_pos` 是 `xorl %eax, %eax; testl %edi, %edi; setg %al`，读成 `(x > 0)`。GCC 把它称为 `-fif-conversion`，LLVM 则称为 `cmov` 选择。LLVM 的 `X86CmovConversion` 遍在判断有利可图时能把 `cmov` 再变回分支，因此同一源码在循环里可能呈现任一形态。

这些模式在 `-O0` 下都不存在。此时 `clamp_max` 是一次比较、一条 `jle`、两次向同一槽的存储和一次加载。识别器在 `-O0` 不为它报告模式，从 `-O1` 起报告 `branchless select`；交互图会展示这个事实。

`mul9` 只有一条 `leal (%rdi,%rdi,8), %eax`。因为源码乘以 9，识别器报告 `strength reduction` 和 `x * 9`。它只在源码含该因子时才这样做；用于缩放表索引的 `lea` 不能算作这种乘法。

## 两种看起来像惯用模式的加固机制

栈保护器是编译器功能，会留下某种指令形态，agent 很容易将它误读为程序逻辑。为 x86-64 Linux 用 `-fstack-protector-strong` 编译 `canary.c`，得到：

```text
       7: 64 48 8b 04 25 28 00 00 00   	movq	%fs:0x28, %rax
      10: 48 89 44 24 40               	movq	%rax, 0x40(%rsp)
      26: 64 48 8b 0c 25 28 00 00 00   	movq	%fs:0x28, %rcx
      2f: 48 3b 4c 24 40               	cmpq	0x40(%rsp), %rcx
      34: 75 05                        	jne	0x3b <with_canary+0x3b>
      3b: e8 00 00 00 00               	callq	0x40 <plain_leaf>
		000000000000003c:  R_X86_64_PLT32	__stack_chk_fail-0x4
```

`%fs:0x28` 是 glibc 的 `tcbhead_t` 中偏移 40 字节的 `stack_guard`。LLVM 的 `getIRStackGuard` 为 glibc、bionic 和 Fuchsia 指定该槽。函数序言把保护值复制到缓冲区上方，尾声比较它，失败路径调用 `__stack_chk_fail`。AArch64 Linux 用 `adrp` 和 `ldr` 经 GOT 从全局 `__stack_chk_guard` 取得保护值，失败时执行 `bl __stack_chk_fail`。识别器报告保护值来源、槽、比较和失败调用。没有数组的 `plain_leaf` 在 `strong` 下没有 canary；该模式保护含数组、`alloca` 或地址被获取的局部变量的函数。研究记录还包含 MSVC `/GS` 的形式：cookie 与 `%rsp` 混合，由 `__security_check_cookie` 检查。上游实验机器没有 MSVC 链接器，因此该形态仅依据编译器汇编输出来描述。

`-fcf-protection=full` 把字节为 `f3 0f 1e fa` 的 `endbr64` 放到每个函数的首条指令。它是支持控制流强制执行的处理器上的间接分支落点，在其他处理器上作为 `nop` 执行。因此 Ghidra 的 x86-64 函数起始模式包含带 `endbr64` 前缀的 `push rbp; mov rbp, rsp` 变体。识别器把它报告为 `cet landing pad`，避免将函数开头四个不常见的字节误认成数据。

## 反编译器会折叠哪些模式

第 37 课的每个反编译器都会把其中一些推导作为重写规则。Ghidra 在 `ruleaction.cc` 中为它们命名。`RuleDivOpt` 将 INT_MULT 和移位形式转换为 INT_DIV 或 INT_SDIV，包含 `sub( (zext(V)*c), d) >> e => V / (2^n/(c-1)) where n = d*8 + e`，以及使用 `sext`、`s>>` 的有符号变体。`RuleModOpt` 简化优化过的 INT_REM 和 INT_SREM 表达式。`RuleDivTermAdd` 处理加法修正，`RuleSignDiv2` 把 `(V + -1*(V s>> 31)) s>> 1` 转成 `V s/ 2`，`RulePositiveDiv` 则把符号位确定为零的值的有符号除法转成无符号除法。第 37 课记录了 Ghidra 12.1.4 对第 33 课 `-O1` 的 `grade` 的输出：`uVar2 = param_1 / 10 - 6;`。除法已折叠。

不用 Java 也能看到这些规则的输入。虚拟环境中的 pypcode 4.0.1 使用与 Ghidra 相同的 SLEIGH 规范进行提升，`code/fixtures/idioms-x86_64-O2.lifts.json` 保存 `div10s` 的原始 P-code：七条指令对应 112 个条目，其中 7 个是每条指令开头的 `IMARK` 标记。其间有 `unique[95a00:8] = sext(0x66666667)` 之后的 `RAX = RAX * unique[95a00:8]`、`RCX = RCX >> unique[d1a00:4]` 和 `RAX = RAX s>> unique[c5c00:4]`。`shrq` 带来 41 个操作，`sarq` 带来 40 个，大部分用于计算标志位。`RuleDivOpt` 在这条流中匹配乘法和两次移位，死代码消除再删除无人读取的标志。

angr 10.0.3 在我们的 `-O2` 目标文件上运行，`idioms-x86_64-O2.angr.json` 保存了 20 个函数的反编译输出。它能折叠无符号形式：`div10u` 是 `return a0 / 10;`。它没有折叠有符号形式：`div10s` 是 `v1 = a0 * 1717986919; return ((long long)(v1) >> 0x22) + (v1 >> 63);`，`mod10s` 是 `a0 - (...) * 2 * 5`。对于 `div7u`，它打印 `(a0 / 7 + ((a0 * 6 / 7 & 0xffffffff) >> 1 & 0xffffffff) & 0xffffffff) >> 2`，修正项仍保留为算术。它将 `mul9` 折叠为 `a0 * 9`，`linear_switch` 折叠为 `(a0 < 7 ? a0 * 10 + 10 : 0xffffffff)`，`clamp_max` 折叠为 `((int)a1 < (int)a0 ? a0 : a1)`，`is_pos` 折叠为 `a0 > 0`，`fill` 折叠为 `return memset(a0, 0, a1);`。它把 `table_switch` 打印成加载 `*(int *)(4 * a0 + 4195400)`，不显示数值；`sum_n` 使用 `_mm_add_epi32` 和 `_mm_shuffle_epi32` 内建函数；`tail_caller` 则变成 `tail_target(); return;`，参数丢失。在 `digest` 中，跳转表变成 `goto *((void *)(...))`，表地址算术被完整展开。

radare2 6.2.4 和 rizin 0.9.1 从源码构建到研究缓存，也在同一目标文件上运行。radare2 的 `pdc` 将 `div10s` 打印为 `rax = rax * 0x66666667; rcx >>>= 0x3f; rax >>= 0x22; eax += ecx`，是没有折叠的寄存器级伪 C；`table_switch` 是 `eax = dword [rcx + rax*4]`，`lea` 上有 `RELOC 32 .rodata` 注释。rizin 没有内置反编译器；它的 `aoi` 将 `imul` 的 RzIL 打印为 128 位乘积。lldb-1703.0.236.21 加载 ELF 目标文件后，`disassemble -n div10s` 打印的七条指令与 `llvm-objdump` 相同，因为二者都使用 LLVM 反汇编器。Capstone 5.0.7 解码相同字节，报告 `ret`、`mode64` 等分组；它是解码器，输出中不会有惯用模式。本课没有运行 IDA Pro 和 Binary Ninja。其文档描述了这类重写发生的阶段：微代码优化和 MLIL 到 HLIL 的遍；本课不声称它们能折叠哪些模式。

Compiler Explorer 用于正向分析。粘贴 `idioms.c`，选择例如“x86-64 clang 18.1.0”或“ARM64 GCC 14.2.0”的编译器条目，再设置选项。该服务列出约 1,050 个 C 编译器条目，并提供 API：`GET /api/compilers/c` 返回标识符，`POST /api/compiler/<id>/compile` 返回 JSON 格式汇编。Matt Godbolt 在 2019 年的 ACM Queue 文章中用此工具讲解除法、置位数统计、条件链和求和模式。上游实验机器无法生成 GCC 输出，可用该服务生成，再将 GCC 的跳转表阈值及 GCC 12 起 `-O2` 的默认向量化行为，与 fixture 的 clang 输出对照。

## 动手构建

运行演示：

```bash
cd phases/13-tools-and-protocols/39-compiler-idioms-and-optimization
python3 code/main.py
```

输出是一份 JSON 报告。对 18 个构建中的每一个，它列出全部函数及其模式，包括类型、源码形式、证据地址、验证情况和详细字段。最后给出每个构建的类型矩阵、两种架构下的 `-O2` 与 `-O3` 对比，以及 `unverified` 列表。

预期结构：

```json
{
  "builds": {
    "idioms-x86_64-O2": {
      "arch": "x86_64", "level": "O2", "flags": "x86_64",
      "functions": {
        "div7u": [{"kind": "division", "source": "x / 7", "evidence": ["0x30", "0x32", "0x39", "0x3d", "0x3f", "0x41", "0x43"], "verified": true, "form": "magic multiply with add fix-up", "magic": "0x24924925", "effectiveMagic": "0x124924925", "shift": 35, "...": "..."}],
        "table_switch": [{"kind": "switch", "source": "switch (k) as lookup table", "table": ".rodata+0x28", "entries": 7, "values": [10, 20, 30, 40, 50, 60, 71], "...": "..."}],
        "sum_n": [{"kind": "vector loop", "lanes": 4, "accumulators": 2, "elementsPerIteration": 8, "...": "..."}]
      }
    }
  },
  "kindMatrix": {"idioms-x86_64-O2": {"division": 5, "modulo": 3, "switch": 6, "vector loop": 3, "...": "..."}},
  "sameCodeAtO2AndO3": {"x86_64": {"identical": true}, "arm64": {"identical": false, "differences": ["..."]}},
  "unverified": []
}
```

按以下顺序阅读 `code/main.py`：

1. `parse_listing()` 将 `llvm-objdump -d -r` 文本解析为两种架构的函数、指令及附属重定位。
2. `ElfFile` 读取节、符号和 `.rela.*` 条目，`words()` 读取表条目。
3. `magic_numbers()`、`divisor_from_magic()` 和 `evaluate_division()` 分别执行 Granlund-Montgomery 的正向推导、反向推导和对应指令序列。
4. `parse_source()` 从 C 文件提取验证所需的结构。
5. `Evaluator` 逐块执行符号分析，为寄存器和栈槽命名。
6. `find_divisions()` 和 `find_modulos()` 匹配乘法、移位、修正、乘回和 2 的幂形式。
7. `find_switches()` 分类跳转表、查找表、线性映射、选择链、比较树和比较链。
8. `find_vector_loops()`、`find_unrolled_loops()`、`find_tail_calls()`、`find_inlined_calls()`、`find_selects()`、`find_memory_builtins()`、`find_stack_protector()`、`find_cet()` 和 `find_strength_reduction()` 覆盖其余模式。
9. `analyze_function()` 按顺序运行它们，把每个模式的结果名称送入下一次求值器遍历。

另有三个命令。`python3 code/main.py scan FILE.objdump.txt [FUNCTION]` 对一个列表运行识别器，并在旁边寻找目标文件和匹配的 C 文件。`python3 code/main.py magic DIVISOR [signed]` 打印乘数、移位量、误差，以及恒等式是否在边界值上成立。`python3 code/main.py figure-data` 打印图表内嵌的数据。

## 实际使用

对自己构建的新目标文件，按以下顺序使用识别器。

1. 从目标文件捕获 `llvm-objdump -d -r`，并在旁边保存完整编译命令。识别器从列表头读取架构。
2. 对列表运行 `scan`，先读 `unverified` 条目。每一项要么是源码解析器未发现的结构，要么是识别器误读的形态；两者都应回到证据地址检查。
3. 对每个除法读取 `algorithm` 字段。`clangMatchesAlgorithm` 为 true 时，编译器选择了最小有效移位量；为 false 时，编译器有一个你尚不知道的理由，先记录常数。
4. 对每个 switch，对照你构建的各级别下的 `lowering`。表变成树或树变成表，说明跨过了可以在 LLVM 源码中指认的阈值。
5. 对每个循环读取 `elementsPerIteration` 和 `scalarRemainderLoop`，再确认第 33 课报告的两条回边属于同一个源码循环。
6. 在同一目标文件上运行一个反编译器，把它的文本逐条引用在模式旁边，记录哪些已被折叠。这份记录是第 45 课的基线。

## 交互实验

### 实验 A：推导魔数，再找到它

从 `code` 目录打开 Python：

```bash
cd phases/13-tools-and-protocols/39-compiler-idioms-and-optimization/code
python3 -q
```

运行：

```python
from main import *
magic_numbers(10), magic_numbers(10, signed=True)
magic_numbers(7), magic_numbers(7, signed=True)
divisor_from_magic(0x66666667, 34, signed=True), divisor_from_magic(0x66666667, 33, signed=True)
```

首次调用前，先在纸上算出 `ceil(2^35 / 10)`。然后在 `idioms.c` 的副本中添加函数 `unsigned div13(unsigned x) { return x / 13; }`，用 `build_fixtures.sh` 的命令以 `-O2` 构建，将列表里的常数与 `magic_numbers(13)` 对照。

### 实验 B：表与树

```python
listing = load_listing("idioms-x86_64-O2.objdump.txt")
elf = load_elf("idioms-x86_64-O2.o")
sources = load_source("idioms.c")
[i.to_dict() for i in analyze_function(listing, "table_switch", elf, sources)]
[i.to_dict() for i in analyze_function(listing, "sparse_switch", elf, sources)]
elf.words(".rodata", 0x28, 7)
```

在 `table_switch` 副本中把 `71` 改回 `70`，用 `-O2` 重建，观察查找表变成线性映射。再把一个 case 的值改成 1000，观察它保持为 `ArrayKind` 表。

### 实验 C：三种设置下的循环

```python
for name in ("idioms-x86_64-O1", "idioms-x86_64-O2", "idioms-x86_64-novec-O2"):
    print(name, [i.source for i in analyze_function(load_listing(name + ".objdump.txt"), "sum_n", load_elf(name + ".o"), sources)])
```

手画 `-O2` 下 `sum_n` 的控制流图，标出保护条件、掩码、向量循环体、归约和余数循环，再与 `detail` 字段对照。

### 实验 D：共享的商

```python
for name in ("idioms-x86_64-O1", "idioms-arm64-O1"):
    print([(i.kind, i.source, i.detail.get("sharedQuotient")) for i in analyze_function(load_listing(name + ".objdump.txt"), "digest", load_elf(name + ".o"), sources)])
```

阅读 `digest` 的 `-O1` 列表，找到 x86-64 上将商与符号修正合并的两条指令。再解释为什么 AArch64 构建只需一条。

## 实践实验

给 fixture 增加位操作技巧，并扩展识别器。

要求：

- 用 GCC 内建函数和移位或旋转编写 `popcount`、`ctz`、`rotl`，分别带和不带 `-mpopcnt -mbmi` 以 `-O2` 构建，并提交目标文件及其列表。
- 识别 `TargetLowering::expandCTPOP` 生成的 `0x55555555`、`0x33333333`、`0x0f0f0f0f`、`0x01010101` 置位数统计序列，报告为 `popcount`，并将四个常数列为证据。
- 将 `rep bsfl` 识别为 `tzcnt` 或 `bsf` 编码，将 `roll %cl` 识别为旋转，并将二者解码为内建函数。
- 将新类型加入 `parse_source()` 的验证，使 `popcount` 模式只有在源码调用 `__builtin_popcount` 时才通过验证。
- 每种模式增加一个从 fixture 列表读取常数的测试。

成功标准：`python3 code/main.py` 在两个构建中都报告三个新类型且 `verified: true`，测试套件仍报告空的 `unverified` 列表。

## 课程产物

本课提供 `outputs/skill-compiler-idioms-and-optimization.md`。用它把列表、目标文件及源码转换为已验证的惯用模式报告，并与反编译器对照。每项结论都必须有证据地址，每个除法必须有魔数推导，每个 switch 必须给出降低类型和条目来源，每个模式必须引用一行反编译器输出。

## 验证

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/39-compiler-idioms-and-optimization
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应证明：

- 列表解析器从 `-O2` 目标文件读取 25 个函数、保留字节，并把 `R_X86_64_PC32 .rodata+0x24` 附到 `table_switch` 的 `leaq` 上
- ELF 读取器从 `.rodata+0x28` 返回 `[10, 20, 30, 40, 50, 60, 71]`，并在 `.rela.rodata` 返回十个重定位
- `magic_numbers` 返回移位量 35 对应的 `0xcccccccd`、34 对应的 `0x66666667`、35 对应且带加法形式的 `0x124924925`、32 对应的 `0x55555556`，以及 33 对应的 `0xaaaaaaab`
- 对 2 至 64 中每个非 2 的幂的除数，无论有无符号，恒等式都在 32 位边界值上成立
- `divisor_from_magic` 从对应数对还原 10、5、7、3，并拒绝错误数对
- 加法修正序列精确计算 `n // 7`
- 四个 x86-64 除法报告正确的乘数、移位量、除数和形式，四个 AArch64 除法能解码 `mov` 和 `movk`
- `-O0` 使用 `divl` 和 `idivl`，`-O0 -fast-isel=false` 使用乘法，`-O0` 的 `digest` 混用二者
- 能识别乘回、`msub`、2 的幂、`sdiv` 加 `mul` 加 `subs`，以及硬件 `idivl` 的取模形式
- `-O1` 下共享商时同时保留除法和取模
- 在两种架构的 `-O2` 下分类五种降低方式，并给出公式、数值、目标、枢轴和选择表达式
- `-O0` 的 switch 在 x86-64 上是跳转表，在 AArch64 上是比较链
- x86-64 的 `digest` switch 先是跳转表，再是带折叠因子 16 的查找表，随后是有四个不同目标的跳转表；AArch64 上则是含范围测试 9 至 10 的比较树
- `-fno-jump-tables` 产生比较树；含 16 个 case 的 `dispatch` 在 x86-64 从重定位读取目标，在 AArch64 从压缩字节表读取目标
- 向量循环报告 4 个通道、2 个累加器、每次迭代 8 个元素，以及掩码、保护条件、归约和余数循环
- 固定次数循环完全向量化或完全展开，`-fno-vectorize` 会展开八次
- `-O1` 没有向量化；x86-64 的 `-O2` 与 `-O3` 相同；AArch64 只在 `call_switch` 中不同，`-O3` 有 17 条指令，`-O2` 有 18 条
- `-fno-builtin` 把存储循环变成向量化存储循环，并让 `memcpy` 保持为调用
- 能识别尾调用、`memset` 替换、内联的 16 字节复制和 `-O0` 的两次移动复制
- 从 `-O1` 起可通过函数体形态找到内联的被调用者
- 选择解码为 `a > b ? a : b`、`-x < 0 ? x : -x`、`(x > 0)` 和 `sum % 10 < 5 ? sum % 10 : 5`
- 栈保护器报告 `%fs:0x28`、槽和 `__stack_chk_fail`；CET 构建的每个函数都报告 `endbr64`
- 源码解析器读取函数指针参数、switch 的 case、调用和累加器名称
- 每个构建中的每个模式都通过验证，类型矩阵匹配
- 交互图内嵌的数据与分析生成的数据相同

## 生产中的失败模式

| 失败 | 较弱工具的报告 | 分析必须证明的内容 |
|---|---|---|
| 乘以很大的奇数常数 | “乘以 1717986919” | 常数是某个 `d` 的 `ceil(2^s / d)`，误差满足界，移位量是最小有效值 |
| 32 位移位后的加法修正 | 五条算术指令 | 乘数宽 33 位，尾部是同一方法的加法形式 |
| 乘数相同、移位不同 | 同一个除数 | 移位决定除数：34 对应 10，33 对应 5 |
| 有符号数对 2 的幂取模 | “加 7、掩码、相减” | 偏置使舍入趋向零，结果为 `x % 8` |
| 从 `.rodata` 索引加载 | “跳转表” | 它是数值查找表，从加数加 4 所在位置的字节读取条目 |
| 仿射运算与 `cmov` | “计算 10k + 10” | switch 被降低为线性映射，并与源码每个 case 验证 |
| 按有序比较拆分的比较链 | “一串 if” | 它是对 case 常数的二分搜索，并指出枢轴 |
| 向后分支到默认块 | “循环” | 目标用无条件跳转离开该区域；它是共享尾部 |
| 一个函数中的两条回边 | “两个循环” | 同一个源码循环的向量循环体和标量余数部分 |
| 没有 `ret` 的 `jmp memset@PLT` | “函数没有返回” | 它是替换存储循环的尾调用，通过被调用者返回 |
| 调用图缺少被调用者 | “从未被调用” | 它已内联，被调用者的函数体形态出现在调用者中 |
| 加载并比较 `%fs:0x28` | “读取线程局部数据” | 它是栈保护 canary，失败路径通向 `__stack_chk_fail` |
| 函数起始处四个奇怪字节 | “函数前的数据” | 它是 CET 落点 `endbr64` |
| 反编译器显示原始算术 | “工具出错” | 工具未应用折叠；推导给出源码形式，引用的输出记录差距 |

## 操作准则

匹配形态，反向执行推导，写出证明所需常数。为每个模式报告证据地址和解码后的源码形式，对照自己编译的源码逐项验证，并引用每个反编译器对同一组字节打印的内容。

## 延伸阅读

- [Granlund, Montgomery, "Division by Invariant Integers using Multiplication" (PLDI 1994)](https://gmplib.org/~tege/divcnst-pldi94.pdf)
- [Warren, Hacker's Delight, 2nd edition, Chapter 10: Integer Division By Constants](https://www.informit.com/store/hackers-delight-9780321842688)
- [Lemire, Kaser, Kurz, "Faster Remainder by Direct Computation" (2019)](https://arxiv.org/abs/1902.01961)
- [libdivide, 仅头文件的运行时常数除法](https://github.com/ridiculousfish/libdivide)
- [LLVM `DivisionByConstantInfo.cpp`](https://github.com/llvm/llvm-project/blob/main/llvm/lib/Support/DivisionByConstantInfo.cpp)
- [LLVM `SwitchLoweringUtils.cpp`](https://github.com/llvm/llvm-project/blob/main/llvm/lib/CodeGen/SwitchLoweringUtils.cpp) 和 [`TargetLoweringBase.cpp`](https://github.com/llvm/llvm-project/blob/main/llvm/lib/CodeGen/TargetLoweringBase.cpp)
- [LLVM `SimplifyCFG.cpp`, `simplifySwitchLookup`](https://github.com/llvm/llvm-project/blob/main/llvm/lib/Transforms/Utils/SimplifyCFG.cpp)
- [LLVM 自动向量化文档](https://llvm.org/docs/Vectorizers.html) 和 [LLVM 3.4 发布说明](https://releases.llvm.org/3.4/docs/ReleaseNotes.html)
- [LLVM `LoopIdiomRecognize.cpp`](https://github.com/llvm/llvm-project/blob/main/llvm/lib/Transforms/Scalar/LoopIdiomRecognize.cpp)
- [LLVM `X86CmovConversion.cpp`](https://github.com/llvm/llvm-project/blob/release/20.x/llvm/lib/Target/X86/X86CmovConversion.cpp)
- [LLVM `StackProtector.cpp`](https://github.com/llvm/llvm-project/blob/main/llvm/lib/CodeGen/StackProtector.cpp) 和 [`X86ISelLoweringCall.cpp`, `getIRStackGuard`](https://github.com/llvm/llvm-project/blob/main/llvm/lib/Target/X86/X86ISelLoweringCall.cpp)
- [glibc `sysdeps/x86_64/nptl/tls.h`, `tcbhead_t`](https://sourceware.org/git/?p=glibc.git;a=blob;f=sysdeps/x86_64/nptl/tls.h)
- [GCC `tree-switch-conversion.cc`](https://github.com/gcc-mirror/gcc/blob/master/gcc/tree-switch-conversion.cc), [GCC 优化选项](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html), 和 [GCC 12 发布说明](https://gcc.gnu.org/gcc-12/changes.html)
- [Ghidra 反编译器 `ruleaction.cc`](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Features/Decompiler/src/decompile/cpp/ruleaction.cc)
- [angr 反编译器文档](https://docs.angr.io/en/latest/analyses/decompiler.html)
- [radare2 手册：反编译器](https://book.rada.re/arch/decompile.html)
- [Compiler Explorer API](https://github.com/compiler-explorer/compiler-explorer/blob/main/docs/API.md)
- [Godbolt, "Optimizations in C++ Compilers: A practical journey", ACM Queue 17(5), 2019](https://queue.acm.org/detail.cfm?id=3372264)
- [Microsoft, `/GS` (缓冲区安全检查)](https://learn.microsoft.com/en-us/cpp/build/reference/gs-buffer-security-check)
