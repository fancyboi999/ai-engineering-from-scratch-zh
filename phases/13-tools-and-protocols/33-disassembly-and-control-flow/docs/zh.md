# 反汇编与控制流：从字节到可核验的图

> 反汇编列表是在声称哪些字节是指令。本课编写解码器和控制流图，核验这项声称。

**类型：** Build
**语言：** Python、C、x86-64 汇编
**前置要求：** 阶段 13 · 32（从零读取 ELF）
**预计时间：** 约 150 分钟

## 学习目标

- 按 Intel SDM 第 2 卷第 2 章的规则，解码 ledger 夹具中的 x86-64 指令子集。
- 将每种构建的每条指令与 `llvm-objdump -d` 核对，验证解码器。
- 对相同字节执行线性扫描与递归下降，解释各自的错误。
- 将指令划分为基本块，用带类型的边构建控制流图。
- 用 Cooper、Harvey、Kennedy 的迭代算法计算直接支配节点，通过回边发现循环。
- 根据指向跳转表的重定位条目恢复间接跳转目标。

## 问题背景

你在 `-O0` 下编译 `ledger.c`，询问 agent `grade` 的作用。它调用反汇编器，阅读列表，回答函数以目标未知的 `jmpq *%rax` 结束，随后写出的伪代码只有一个 `return 0`。

你用 `llvm-objdump -d` 打开同一个目标文件，看到跳转后还有四个块，分别写入 4、3、2、1。这些块一直在列表中。列表没有说明执行如何到达它们，于是工具将其视为死代码。

列表只回答哪些字节构成哪条指令，不回答哪些指令会运行、按什么顺序、从哪里到达。回答这些问题还需三种结构：控制流可达的字节、基本块，以及块之间的边。

rea 6.5.0 自身没有反汇编器。其 README 要求深度分析时自行配备 Ghidra、Hopper 或 IDA；离线检查也可调用自行安装的 GNU objdump 或 Rizin。其调用图只包含已解析的调用者和被调用者，无目标的计算控制流仍标为未知。本课实现产生这些事实的部分，使你能判断工具报告是否可信。

```figure
re-33-sweep-vs-descent
```

## 指令格式：每个字段都有规则

Intel SDM 第 2 卷图 2-1 规定指令的字节顺序：可选前缀、一至三个操作码字节、可选 ModRM、可选 SIB、0/1/2/4 字节位移，最后是 0/1/2/4 字节立即数。整条指令最多 15 字节（SDM 2.3.11）。AMD APM 第 3 卷第 1 章 1.1 至 1.7 节用更少篇幅说明同一格式，适合交叉核对。

每个字段决定下个字段的含义。因此解码器是一串小判断，每项判断都应有手册中的规则支撑。

### 前缀分四组

SDM 2.1.1 列出传统前缀。第 1 组包含 `F0` lock 与重复前缀 `F2`、`F3`；第 2 组包含六种段覆盖（`2E` 是 `%cs`）及分支提示；第 3 组为操作数大小覆盖 `66`；第 4 组为地址大小覆盖 `67`。

手册规定每组可用一个前缀，但编译器会发出更多。`ledger-x86_64-O0.o` 偏移 `0xf2` 的对齐填充为 `66 66 66 66 66 2e 0f 1f 84 00 00 00 00 00`，连续五个 `66`。`llvm-objdump` 将其打印为 `nopw %cs:(%rax,%rax)`，本课解码器也如此。解码器先收集全部前缀，再判断哪些真正生效。

`66` 还有另一项作用：对 SSE 指令，它是选择操作码的强制前缀。因此 `66 0f ef c0` 是 `pxor %xmm0, %xmm0`，并非某条 16 位指令。`F3 0f 6f` 是 `movdqu`。解码器先查强制前缀与第二操作码字节的组合，只有查不到条目时，`66` 才表示 16 位操作数。

### REX 增加四位，且必须紧邻操作码

SDM 2.2.1 将 REX 定义为 `40` 至 `4F` 的一个字节，格式 `0100WRXB`。`W` 选择 64 位操作数，`R` 扩展 ModRM 的 reg 字段，`X` 扩展 SIB 的 index 字段，`B` 扩展 ModRM 的 r/m、SIB 的 base 或操作码内的寄存器字段（表 2-4）。REX 必须紧挨操作码或转义字节；其后若还有传统前缀，该 REX 会被忽略。

`48 89 e5` 中，`48` 是设置了 `W` 的 REX。操作码 `89` 为 `MOV r/m, r`，ModRM `e5` 选择将 `%rsp` 写入 `%rbp`。去掉 REX，相同字节就变为 `movl %esp, %ebp`。

REX 也改变字节寄存器的名称。有任意 REX 时，编码 4 至 7 选择 `%spl`、`%bpl`、`%sil`、`%dil`，而非 `%ah`、`%ch`、`%dh`、`%bh`，所以解码器保留两张名称表。

### 操作码分布在两张映射表中

单字节操作码最常见。`0F` 转入双字节表，`0F 38`、`0F 3A` 转入夹具未使用的三字节表（SDM 2.1.2）。部分操作码将 ModRM 的 reg 字段用作另外三位操作码，手册记为 `/digit`。`83 /7` 是带 8 位立即数的 `cmp`，`83 /5` 是 `sub`，`FF /4` 是间接 `jmp`。

`code/main.py` 的解码器覆盖四个夹具目标文件的操作码及少量相邻形式：八种算术形式、`mov`、`lea`、`movslq`、`movzbl`、`imul`、移位、`test`、`idiv`，以及 `push`、`pop`、`call`、`ret`、十六种条件跳转、多字节 `nop` 和五种 SSE2 操作码。其他操作码均抛出带地址和原因的 `DecodeError`。猜测的解码器比停止的解码器更糟。

### ModRM 和 SIB 选择操作数

SDM 2.1.3 将 ModRM 分为 `mod`（位 7:6）、`reg`（5:3）、`r/m`（2:0）。`mod = 11` 表示 r/m 是寄存器；`00`、`01`、`10` 分别表示无位移、8 位位移、32 位位移的内存操作数。`r/m = 100` 表示后接 SIB。SIB 分为 `scale`（7:6）、`index`（5:3）、`base`（2:0），index 为 `100` 表示没有索引寄存器。

64 位模式下，表 2-2 的两个特例很重要。`mod = 00` 且 `r/m = 101` 不是 `(%rbp)`，而是相对于下一条指令的 32 位位移（SDM 2.2.1.6）。`mod = 00` 且 SIB base 为 `101` 表示没有基址寄存器的 32 位位移。

看 `-O0` 的 `grade` 中 `8d 44 08 fa`。`8D` 是 `lea`，ModRM `44` 为 `01 000 100`：8 位位移、reg `%eax`、后接 SIB。SIB `08` 为 `00 001 000`：比例 1、索引 `%rcx`、基址 `%rax`。位移 `fa` 是 -6。AT&T 文本是 `leal -0x6(%rax,%rcx), %eax`，计算 switch 索引 `score / 10 - 6`。

### 位移字段是链接编辑器的写入位置

`48 8d 0d 00 00 00 00` 是 `leaq (%rip), %rcx`。四个零字节是 RIP 相对操作数的位移字段，在可重定位目标文件中只是占位。`.rela.text` 偏移 `0x69` 的条目写着 `R_X86_64_PC32.rodata-0x4`。psABI 表 4.9 将 `R_X86_64_PC32` 定义为 `S + A - P`：符号地址加加数，再减字段地址。

处理器将字段加到下一条指令地址，因此最终目标为 `S + A + (end - P)`。此 `lea` 的字段是最后四字节，故 `end - P` 为 4，目标是 `.rodata + (-4) + 4 =.rodata + 0x0`。加数 -4 预先补偿了这四字节。夹具每个 RIP 相对操作数的加数都包含这项 -4，因此 `-O1` 的 `lea` 中 `.rodata+0x10` 实际表示 `.rodata+0x14`。

解码器记录每条指令内位移字段的偏移。`resolve_reference()` 用该偏移查询重定位表，报告链接后的操作数目标。它将 `leaq (%rip), %rcx` 转成“.rodata+0x0 处的表”。

### 立即数最多 32 位，只有一个例外

SDM 2.2.1.5 规定 64 位模式的立即数最多 32 位，并进行符号扩展。例外是 `MOV r64, imm64`（带 `REX.W` 的 `B8+r`），AT&T 称为 `movabsq`。解码器把算术用的 8 位立即数视为有符号数（`83 c1 fa` 是 `addl $-0x6, %ecx`），把移位次数和重排选择器视为无符号数（`pshufd $0xee`），与 `llvm-objdump` 输出一致。

近分支、`push`、`pop` 默认使用 64 位操作数并忽略 `66`（SDM 2.2.1.7）。所以解码器无需读取操作数大小前缀，就将其命名为 `pushq`、`popq`、`callq`、`retq`。

## 手动解码一条指令

信任代码之前，先在纸上解码 `grade` 中的 `48 69 c0 67 66 66 66`。

1. `48` 位于 `40` 到 `4F`，为 `W = 1` 的 REX，操作数大小 64 位。
2. `69` 是 `IMUL r, r/m, imm32`。
3. `c0` 是 ModRM `11 000 000`：寄存器形式，reg `%rax`，r/m `%rax`。
4. 接下来四字节是小端立即数 `0x66666667`。
5. AT&T 顺序为立即数、源、目标：`imulq $0x66666667, %rax, %rax`。

共七字节，`llvm-objdump` 输出同样文本。该常数是倒数常量，让 clang 通过乘法及随后的 `sarq $0x22`（右移 34 位）实现除以 10。第 34 课会再次遇到这一对，提升器将它还原为 `score / 10`。

解码器在 `Decoder.decode()`、`_State.modrm()`、`_State.finish()` 中完成这五步。按此顺序阅读，将每个分支与 docstring 标注的 SDM 小节核对。

## 线性扫描

Schwarz、Debray、Andrews 在“Disassembly of Executable Code Revisited”（WCRE 2002）第 3.1 节介绍线性扫描：从代码节首字节开始，解码一条指令，从下一字节继续，直到末尾。`objdump` 和 `llvm-objdump` 都这样工作。

```python
def linear_sweep(code: bytes, start: int = 0, end: int | None = None) -> SweepResult:
    position = start
    while position < end:
        try:
            instruction = decode(code[:end], position)
        except DecodeError:
            undecodable.append((position, code[position]))
            position += 1
            continue
        instructions.append(instruction)
        position = instruction.end
```

该方法的故障见论文图 1：数据字节被解码成指令，导致后续一段真实指令边界丢失。x86 通常在几字节内重新同步，错误因此难以察觉。只有碰到无效操作码才会检测出来，论文结论是此类算法会静默失败。

本课的对照基准同样是线性扫描。解码器必须与 `llvm-objdump -d` 对每个夹具的每条指令达成一致，而后者自身也是线性扫描。捕获文本保存在 `code/fixtures/*.objdump.txt`。测试将每行解析为地址、字节、文本，删除 `#` 后的注释再比较。四个目标文件分别有 86、56、84、11 条指令，共 237 条，解码器全部匹配。

## 递归下降

同一论文第 3.2 节将第二种方法称为递归遍历。从已知入口解码，直到控制转移。直接跳转继续处理目标；条件分支同时处理目标和下一条指令；调用后继续处理下一条，因为被调用者会返回；遇返回则停止。记录已访问地址，使遍历终止。

```python
if instruction.flow == "branch":
    worklist.append(instruction.target)
    address = instruction.end
elif instruction.flow == "indirect-jump":
    table = resolver(instruction, instructions) if resolver else None
    if table is None:
        unresolved.append(instruction)
        break
```

它的故障正好相反：间接跳转的字节中没有目标。遍历到此停止，只有经过该跳转才能到达的块都保持未知。论文图 2 给出另一危险：从重定位推导的目标可能位于指令中间。`main.py` 的下降算法将其记为冲突并停止该路径，让重叠可见，而非静默解码两次。

Andriesse 等人对 981 个编译生成的二进制测试了九款反汇编器（USENIX Security 2016）。真实编译器输出中，内联数据和重叠代码比文献假设的少，函数边界恢复才是困难的基础问题。要同时记住这两点：下一节的陷阱在编译器输出中少见，`grade` 的间接跳转却很常见。

## 扫描错误、下降正确的夹具

`code/fixtures/sweep-trap.s` 是 24 字节手写汇编，在函数体内嵌四字节表。函数通过 `movzbl (%rcx,%rax), %eax` 索引表，再跳过它。

```asm
lookup:
        movslq  %edi, %rax
        leaq    .Ltable(%rip), %rcx
        movzbl  (%rcx,%rax), %eax
        jmp     .Ldone
.Ltable:
        .byte   0x31, 0xc0, 0x90, 0x48
.Ldone:
        addl    $1, %eax
        retq
```

使用 `clang -target x86_64-unknown-linux-gnu -c sweep-trap.s` 构建。表中四字节刻意选成可解码的指令：`31 c0` 是 `xorl %eax, %eax`，`90` 是 `nop`，`48` 是 REX 前缀。扫描将 `48` 与真实的三字节 `addl $1, %eax` 合并，打印 `addq $0x1, %rax`。捕获的 `llvm-objdump` 输出正是如此：

```text
       e: eb 04                        	jmp	0x14 <lookup+0x14>
      10: 31 c0                        	xorl	%eax, %eax
      12: 90                           	nop
      13: 48 83 c0 01                  	addq	$0x1, %rax
      17: c3                           	retq
```

列表看上去没有问题：每个字节都成功解码，助记符都存在，也有 `retq`。但它有三处错误。`0xe` 的跳转目标是 `0x14`，列表却没有从 `0x14` 开始的指令；实际在 `0x14` 运行的是 32 位 `addl`，列表却在前一字节显示 64 位 `addq`；四个表字节被当成代码。

从 `lookup` 符号开始递归下降只解码六条指令，沿跳转到达 `0x14`，报告 `addl $0x1, %eax`。它不会认领四个表字节，也不会认领 `plus_one` 前的八个填充字节。`main.py` 中的 `trap_report()` 打印对照：

```json
"linearSweep": {
  "instructions": 9,
  "atJumpTarget": {"starts": "0x13", "text": "addq\t$0x1, %rax", "startsAtTarget": false},
  "claimedDataBytes": 4,
  "claimedPaddingBytes": 8
},
"recursiveDescent": {
  "instructions": 6,
  "atJumpTarget": "addl\t$0x1, %eax",
  "claimedDataBytes": 0,
  "claimedPaddingBytes": 0
}
```

测试 `test_sweep_and_objdump_share_the_same_mistake` 断言 `llvm-objdump` 在 `0x13` 输出 `addq $0x1, %rax`。对照基准是线性扫描，因此继承同样盲区。与基准一致只能检查解码器，哪些指令实际运行要由下降算法检查。

## 基本块

Allen 在“Control Flow Analysis”（1970）中将基本块定义为：只从首条指令进入、只从末条指令离开的指令序列。Yakdan 等人在“No More Gotos”（NDSS 2015）第 II.A.2 节针对反编译重述该定义，并以头节点作为函数入口。

构建过程对按地址排序的已解码指令扫描两遍。第一遍收集首指令：入口、分支或跳转目标、跳转表目标，以及任意控制转移后的指令。第二遍在每个首指令及地址序列空隙处开启新块。

```python
for instruction in self.instructions:
    if instruction.address in leaders or current is None or current.end != instruction.address:
        current = Block(instruction.address, [])
        self.blocks[instruction.address] = current
    current.instructions.append(instruction)
```

每个块的末条指令决定边。返回没有后继；跳转有一个 `jump` 后继；条件分支有 `taken` 与 `fallthrough` 两个后继。当下一条指令是分支目标，普通指令也可能位于块尾，并顺序进入下一块。间接跳转的目标来自表，边标为 `table`；若无目标，将块记录到 `unresolved`。

同一次扫描还给出两个事实。入口无法到达的块不可达，`-O0` 的 `grade` 线性扫描会产生五个。块起点若位于另一种方法列表的某条指令内部，就是陷阱中的重叠情况。

## total 的控制流图

`-O1` 的 `total` 共 31 字节、13 条指令：

```text
      40: 85 f6                        	testl	%esi, %esi
      42: 7e 18                        	jle	0x5c <total+0x1c>
      44: 89 f1                        	movl	%esi, %ecx
      46: 31 d2                        	xorl	%edx, %edx
      48: 31 c0                        	xorl	%eax, %eax
      4a: 66 0f 1f 44 00 00            	nopw	(%rax,%rax)
      50: 03 04 97                     	addl	(%rdi,%rdx,4), %eax
      53: 48 ff c2                     	incq	%rdx
      56: 48 39 d1                     	cmpq	%rdx, %rcx
      59: 75 f5                        	jne	0x50 <total+0x10>
      5b: c3                           	retq
      5c: 31 c0                        	xorl	%eax, %eax
      5e: c3                           	retq
```

首指令为 `0x40`（入口）、`0x44`（`jle` 后）、`0x50`（`jne` 目标）、`0x5b`（`jne` 后）、`0x5c`（`jle` 目标）。共五个块、五条边：

| 起点 | 终点 | 类型 | 原因 |
|---|---|---|---|
| `0x40` | `0x44` | fallthrough | 不执行 `jle` 跳转，count 为正 |
| `0x40` | `0x5c` | taken | count 为零或负，返回 0 |
| `0x44` | `0x50` | fallthrough | 块中的 `nopw` 用于对齐，执行会经过它 |
| `0x50` | `0x50` | taken | `jne 0x50`，形成循环 |
| `0x50` | `0x5b` | fallthrough | 循环退出，返回总和 |

`0x4a` 处六字节 `nopw` 是填充，让循环头 `0x50` 对齐 16 字节边界。它可达，因而属于块 `0x44`。最后一个 `retq` 后 `0x5f` 处的一字节 `nop` 也是填充，却不可达。函数线性扫描为其建立第六个块，`unreachable()` 会列出它。

`-O2` 下同一函数增至 140 字节，有两个循环。`0x80` 处 SSE2 循环体通过 `paddd` 每轮累加八个值，标量余数循环在 `0xc0`。CFG 有 `0x80 -> 0x80` 和 `0xc0 -> 0xc0` 两条回边，测试会检查二者。

## 用迭代算法计算支配节点

若从入口到块 `b` 的所有路径都经过块 `d`，则 `d` 支配 `b`。`b` 的直接支配节点是距离 `b` 最近的支配节点。概念可从 Allen（1970）追溯到 Prosser（1959），第 34 课需要它来正确放置 `if` 和 `while`。

Cooper、Harvey、Kennedy 在“A Simple, Fast Dominance Algorithm”（2001）中指出：采用紧凑表示、按逆后序运行的数据流算法，在约千节点以下的图上优于 Lengauer-Tarjan（1979）。论文说明目的并非提出新算法，而是展示简单算法在实践中可能更快，也适合教学。函数 CFG 几乎不会达到一千节点。

```python
def intersect(first: int, second: int) -> int:
    while first != second:
        while number[first] > number[second]:
            first = idom[first]
        while number[second] > number[first]:
            second = idom[second]
    return first

changed = True
while changed:
    changed = False
    for start in order[1:]:
        processed = [p for p in self.predecessors(start) if p in idom]
        candidate = processed[0]
        for other in processed[1:]:
            candidate = intersect(other, candidate)
        if idom.get(start) != candidate:
            idom[start] = candidate
            changed = True
```

`number` 保存各块的逆后序位置，入口为 0。`intersect` 用两个指针沿当前支配树向上走，直到相遇。论文用后序编号和 `<` 比较；此处使用逆后序，所以比较为 `>`。其余部分遵循论文伪代码。

`-O1` 的 `total` 得到 `idom(0x44) = 0x40`、`idom(0x50) = 0x44`、`idom(0x5b) = 0x50`、`idom(0x5c) = 0x40`。`0x50 -> 0x50` 是回边，因为目标支配源节点，而回边标记循环（Allen 1970）。`back_edges()` 返回该边。`test_dominators_on_a_hand_built_diamond_with_a_loop` 对含汇合点的 16 字节序列运行同一算法，让 `intersect` 处理两个前驱。

## -O0 下 grade 的跳转表

`-O0` 下 clang 将 `grade` 的 `switch` 编译成位置无关跳转表惯用形式：

```text
      5d: 83 e8 04                     	subl	$0x4, %eax
      60: 77 38                        	ja	0x9a <grade+0x6a>
      62: 48 8b 45 f0                  	movq	-0x10(%rbp), %rax
      66: 48 8d 0d 00 00 00 00         	leaq	(%rip), %rcx
		0000000000000069:  R_X86_64_PC32	.rodata-0x4
      6d: 48 63 04 81                  	movslq	(%rcx,%rax,4), %rax
      71: 48 01 c8                     	addq	%rcx, %rax
      74: ff e0                        	jmpq	*%rax
```

从中读取四个事实。`subl $0x4` 后的 `ja` 是边界检查：大于 4 的索引转到 `0x9a` 默认分支，因此表有五项。带重定位的 `leaq` 将表地址写入 `%rcx`，前节已证明是 `.rodata+0x0`。`movslq` 按比例 4 加载有符号 32 位项。`addq` 加上表基址，所以每项都是表到对应分支块的距离。

目标文件的每个表字节都是零。目标只存在于 `.rela.rodata` 的重定位中：

```text
RELOCATION RECORDS FOR [.rodata]:
OFFSET           TYPE                     VALUE
0000000000000000 R_X86_64_PC32            .text+0x91
0000000000000004 R_X86_64_PC32            .text+0x8c
0000000000000008 R_X86_64_PC32            .text+0x87
000000000000000c R_X86_64_PC32            .text+0x82
0000000000000010 R_X86_64_PC32            .text+0x86
```

对位于偏移 `4k` 的第 `k` 项应用 `S + A - P`。存储值为 `.text + A - (.rodata + 4k)`，代码再加 `.rodata + 0`，所以目标为 `.text + A - 4k`。第 0 项为 `0x91 - 0 = 0x91`，第 1 项为 `0x8c - 4 = 0x88`，第 2 项为 `0x87 - 8 = 0x7f`；第 3、4 项分别为 `0x82 - 12 = 0x76`、`0x86 - 16 = 0x76`。`score / 10` 的 case 6、7、8、9、10 分别进入写入 1、2、3、4、4 的块，与 C 源码逐行一致，也保留了 9 和 10 共用分支的关系。

`recover_table()` 完成上述运算。`jump_table_resolver()` 从 `jmpq` 向后匹配惯用形式，寻找生成该寄存器的 `addq`、加载它的 `movslq`、生成基址的 `leaq` 及限制范围的 `ja`。下降算法将四个不同目标压入工作列表，继续遍历。已链接可执行文件的表中已有最终值，不再有重定位；同一函数便读取有符号 32 位项并加表地址，`evidence` 记录目标来自哪条路径。

`python3 code/main.py cfg code/fixtures/ledger-x86_64-O0.o grade` 给出的 `-O0` 数据：

| 方法 | 指令数 | 块数 | 边数 | 字节 | 问题 |
|---|---|---|---|---|---|
| 线性扫描 | 34 | 9 | 7 | 118 代码 + 10 填充 | 5 个不可达块，四个分支块没有入边，填充被解码为 `nopw` |
| 递归下降 | 25 | 3 | 2 | 82 代码 | 36 字节代码未到达，`0x74` 的 `jmpq *%rax` 未解析 |
| 带跳转表的下降 | 33 | 8 | 11 | 118 代码 | 无 |

有跳转表后，支配树完整了。每个分支块的 `idom` 为含跳转的块 `0x62`。`0xa1` 的 `idom` 为入口 `0x30`，因为从 `0x9a` 来的默认路径无需经过 `0x62` 就能到达 `0xa1`。

## -O1 优化器如何改写 grade

常见描述是 `grade` 的 switch 被编译成跳转表，但字节给出的信息更具体。`-O1` 和 `-O2` 下，`grade` 根本没有间接跳转：

```text
      2c: 83 f9 04                     	cmpl	$0x4, %ecx
      2f: 77 0c                        	ja	0x3d <grade+0x2d>
      31: 89 c8                        	movl	%ecx, %eax
      33: 48 8d 0d 00 00 00 00         	leaq	(%rip), %rcx
		0000000000000036:  R_X86_64_PC32	.rodata+0x10
      3a: 8b 04 81                     	movl	(%rcx,%rax,4), %eax
      3d: c3                           	retq
```

重定位加数 `0x10` 加上惯常的 4，表位于 `.rodata+0x14`。加载是一条普通 `movl`，该处字节为 `01 00 00 00 02 00 00 00 03 00 00 00 04 00 00 00 04 00 00 00`。编译器将五个分支块替换成五个返回值组成的表。这里有重定位、表和边界检查，但控制流只有三个块、三条边、一个条件分支。`find_value_tables()` 将其报告为 `value-table`，条目 `[1, 2, 3, 4, 4]`，`evidence: "bytes"`。

`-O2` 的 `grade_label` 更进一步。五个字符串指针组成的 `labels` 数组被改成 `.rodata+0x0` 的五个 32 位偏移。每项带有指向字符串节的 `R_X86_64_PC32` 重定位，函数将加载的值加上表地址。`recover_table()` 读取五条重定位，返回 `.rodata.str1.1` 内偏移 `0, 2, 4, 6, 8`，对应 `F`、`D`、`C`、`B`、`A`。恢复跳转表的同一运算也能恢复相对数据表，因为二者都是已知偏移处的 `S + A - P`。

应按字节所示事实命名。跳转表改变控制流图，值表改变一次加载。将二者都称为“switch”，会掩盖第 34 课必须重建的差异。

## rea 与 Ghidra 提供了什么

使用 Ghidra 12.1.4 provider 的 rea 6.5.0，通过 `procedure_assembly` 以单个字符串返回函数 Listing 文本。`inspect_native_instruction` 返回单条指令的字节、长度、解码文本、操作数 token、带类型引用和控制流，返回指令通过 p-code 分类。`xrefs` 返回 Ghidra `ReferenceManager.getReferencesTo` 的去重、排序来源地址。`analyze_function` 带函数 CFG 和 `body`。`procedure_info` 以闭区间提供函数体，并警告不能将空隙与共享尾部当成函数拥有的字节。

这些事实都是 Ghidra 递归下降及分析器的序列化结果。rea 分析配置固定了 `instruction_flow_evidence`、`function_references`、`jump_table_evidence` 的契约版本，因此结果可指出产生它的规则，但无法展示推导过程。若 Ghidra 未发现表，流就标为 unknown，分支块也不会出现在调用者、被调用者和 CFG 中。

现在你有自己的推导。对相同目标运行 `python3 code/main.py cfg`，比较 provider 返回的块起点、边数和恢复表。一致处有两条独立推导，不一致处有具体地址可检查，第 35 课将其记录为未知项。

解码器本身也是程序。Capstone 6.0.0-Alpha10（2026-07-21）修复了 CVE-2026-55893、CVE-2026-55894 对应的越界读写；5.0.9（2026-05-28）回移了 CVE 修复。解码器读取的字节并非自己生成。15 字节限制、`_Cursor.byte()` 的截断检查及拒绝猜测未知操作码，可保护 `main.py` 不被超出其设计范围的输入破坏。

## 动手构建

运行演示：

```bash
cd phases/13-tools-and-protocols/33-disassembly-and-control-flow
python3 code/main.py
```

输出是一份 JSON 报告。它为每个夹具给出对照基准一致性，为每个函数给出三种方法的指令、块、边计数，并列出不可达块、未解析间接跳转、回边、直接支配节点及表，最后给出陷阱比较。

预期结构：

```json
{
  "fixtures": {
    "ledger-x86_64-O0.o": {
      "oracle": "86/86 instructions agree with llvm-objdump",
      "functions": {
        "grade": {
          "range": "0x30-0xa6",
          "paddingBytes": 10,
          "linearSweep": {"instructions": 34, "blocks": 9, "edges": 7, "unreachableBlocks": ["0x76", "0x7f", "0x88", "0x91", "0xa6"], "...": "..."},
          "recursiveDescent": {"instructions": 25, "blocks": 3, "edges": 2, "unresolvedIndirectJumps": ["0x74"], "...": "..."},
          "recursiveDescentWithTables": {"instructions": 33, "blocks": 8, "edges": 11, "...": "..."},
          "tables": [{"kind": "jump-table", "table": ".rodata+0x0", "count": 5, "entries": ["0x91", "0x88", "0x7f", "0x76", "0x76"], "evidence": "relocation", "...": "..."}]
        }
      }
    }
  },
  "sweepTrap": {"...": "..."}
}
```

按以下顺序阅读 `code/main.py`：

1. `ElfObject` 读取节头、符号、`.rela.*` 条目；`symbolize()` 按 `llvm-objdump` 的方式命名地址。
2. `Decoder.decode()` 读取前缀和 REX，再按单字节或双字节操作码表分派。
3. `_State.modrm()` 读取 ModRM、SIB、位移，记录位移字段偏移。
4. `resolve_reference()` 对位移或立即数字段的重定位应用 `S + A - P`。
5. `linear_sweep()` 和 `recursive_descent()` 实现两种方法，记录各自的失败。
6. `recover_table()` 和 `jump_table_resolver()` 通过重定位或字节读取表。
7. `ControlFlowGraph` 构建首指令、块、带类型边，`dominators()` 实现迭代算法。
8. `analyze_function()` 对一个函数运行所有方法，`compare_with_oracle()` 检查解码器。

另有两条命令：`python3 code/main.py disasm FILE.o` 打印列表，并在有重定位的指令后标出目标；`python3 code/main.py cfg FILE.o FUNCTION` 打印单个函数的分析。

## 实际使用

对新目标文件按以下顺序使用三种方法。

1. 先比较对照基准。普通指令上若与 `llvm-objdump` 不一致，说明解码器有 bug，后续结构都会继承错误。
2. 从每个函数符号执行递归下降，查看 `unresolved`。每项都是尚无目标的间接跳转或调用。
3. 对每个未解析跳转，查找表惯用形式及指向表的重定位。若形式不匹配，读取跳转前的字节并记录观察结果，这就是第 35 课的首个未知项。
4. 逐字节比较扫描与下降。只有扫描认领的字节可能是填充或数据；两者都未认领的字节不可达，或属于尚未发现的函数。
5. 从已恢复表的下降结果构建 CFG，读取回边。每条回边是第 34 课要转成 `while` 或 `for` 的循环。

将对照文本和目标文件一同保存。更换编译器版本后重新捕获，因为列表改变就意味着夹具改变。

## 交互实验

### 实验 A：纸上解码，再核对

在 `code` 目录启动 Python：

```bash
cd phases/13-tools-and-protocols/33-disassembly-and-control-flow/code
python3 -q
```

运行：

```python
from main import *
decode(bytes.fromhex("48 8d 0d 00 00 00 00"), 0).text
decode(bytes.fromhex("8d 44 08 fa"), 0).text
decode(bytes.fromhex("66 66 66 66 66 2e 0f 1f 84 00 00 00 00 00"), 0).length
```

每次调用前先写出预期。去掉第一个示例的 `48`，观察操作数大小变化；再尝试 `decode(bytes.fromhex("0f 0a"), 0)`，阅读 `DecodeError`。

### 实验 B：lea 的重定位

```python
elf = load_fixture("ledger-x86_64-O0.o")
code = elf.section(".text").data
lea = decode(code, 0x66)
lea.displacement_offset
resolve_reference(elf, lea)
```

引用显示 `.rodata+0x0`。将地址改为 `grade_label` 中的 `0x116`，读取指向 `.data` 的引用。再解码 `0x10e` 的 `callq` 并解析它：立即数字段携带 `R_X86_64_PLT32 grade-0x4`，解析目标为 `grade` 所在的 `0x30`。

### 实验 C：观察两种方法的分歧

```python
trap = load_fixture("sweep-trap.o")
text = trap.section(".text").data
[i.text for i in linear_sweep(text, 0, 0x20).instructions]
[i.text for i in recursive_descent(text, [0], 0x20).sorted_instructions()]
```

统计两个列表的指令数，找到起点为 `0x13` 的指令。将 `sweep-trap.s` 最后一个表字节从 `0x48` 改为 `0xe8`，重建后再运行二者。扫描会将 `addl` 和 `retq` 吞进一条目标位于节外的 `callq`，函数看上去便没有返回。

### 实验 D：手算支配节点

```python
analysis = analyze_function(load_fixture("ledger-x86_64-O1.o"), "total")
analysis.cfg.edges
analysis.cfg.reverse_postorder()
analysis.cfg.dominators()
analysis.cfg.back_edges()
```

先在纸上画出五个块并计算支配节点，再看结果。对 `-O0` 的 `grade` 运行相同四行，解释为何 `idom(0xa1)` 是 `0x30` 而非 `0x62`。

## 实践实验

为夹具添加间接调用点，扩展分析。

要求：

- 编写 C 函数，通过从小数组选出的函数指针调用。在 `-O0`、`-O1` 构建，将目标文件及 `llvm-objdump` 文本一同提交。
- 让解码器在两个目标文件上均与基准一致，仅在夹具指令需要时增加操作码。
- 扩展 `recursive_descent()`，遇到间接调用时在 `calls` 记录调用点，以 `None` 为目标，并继续调用后的指令。
- 编写解析器，通过重定位读取函数指针数组，报告可能的被调用者。
- 将被调用者集合以 `indirectCalls` 加入报告，并给出每个目标的证据类型。
- 编写测试：解析器返回非函数符号目标时必须失败。

验收标准：`python3 code/main.py cfg` 能给出每个可能被调用者及证明它的重定位，且所有目标文件的基准比较仍通过。

## 编程练习

本课的夹具包含五个问题。用你构建的代码找出答案，并写入 `code/lab_answers.json`。数值可直接写数字，或写成 `"0x40"` 这样的十六进制字符串；列表使用 JSON 数组。

1. `t1`：`-O1` 下 `grade` 经递归下降解码出的指令数。
2. `t2`：`-O1` 下 `total` 的基本块数。
3. `t3`：`-O1` 下 `total` 循环头的地址，填写十六进制。
4. `t4`：`sweep-trap.o` 中，线性扫描那条覆盖 `0x14` 的指令起始地址，填写十六进制。
5. `t5`：`-O0` 下 `grade` 跳转表的项数。

检查答案：

```bash
cd phases/13-tools-and-protocols/33-disassembly-and-control-flow
python3 code/lab.py
```

检查器会用 `code/main.py` 和已提交夹具计算答案，并为每项输出 `PASS`、`FAIL` 或 `TODO` 及总分。只有五项全部通过时，命令才以状态码 0 退出。可运行 `python3 code/lab.py my-answers.json` 检查另一份答案。`code/tests/test_lab.py` 会验证检查器既接受正确答案，也拒绝错误答案。

### 交互图解

[Inside a Decompiler](https://aieng-zh.cn/inside-a-decompiler?program=trap&sweep=linear) 模拟解码床与基本块面板。链接以线性扫描打开 `sweep-trap.o`：界面会把四个数据字节当作指令解码，并标出落在 `0x13` 处 `addq` 指令内部的跳转目标 `0x14`。将解码器切换为递归下降，观察跳转如何绕过这段数据。

## 交付产物

本课提供 `outputs/skill-disassembly-and-control-flow.md`，将目标文件和函数名转成经检查的列表、块、带类型边、支配节点及所有未解析转移。它要求基准比较、两种反汇编方法、字节归属核算、每个恢复表的重定位证据，以及仍未知的内容声明。

## 验证

运行演示及确定性测试套件：

```bash
cd phases/13-tools-and-protocols/33-disassembly-and-control-flow
python3 code/main.py
python3 code/tests/test_main.py
```

验证应证明：

- 四个夹具共 237 条指令均与 `llvm-objdump -d` 一致。
- REX.W 选择 64 位操作数，REX.R 和 REX.B 扩展寄存器字段。
- ModRM、SIB 生成包含比例、索引和有符号位移的 AT&T 内存操作数。
- RIP 相对位移记录了指令内字段偏移。
- 重复传统前缀和段覆盖的解码与基准一致。
- 强制 `66` 前缀选择 SSE 操作码，并保持 32 位寄存器。
- 算术 8 位立即数做符号扩展，移位次数按无符号数处理。
- 超过 15 字节、截断、未知操作码均抛出 `DecodeError`。
- `lea` 上的 `R_X86_64_PC32` 解析到表，`call` 上的 `R_X86_64_PLT32` 解析到被调用者。
- 扫描将陷阱表当成代码，且跳转目标没有对应指令。
- 下降不认领表或填充，在目标处读取 `addl $0x1, %eax`。
- `llvm-objdump` 在陷阱上与扫描犯同样错误。
- 指令内部的入口会记录为冲突。
- 未解析间接跳转会停止下降并被列出。
- `-O1` 的 `total` 有五块、五条带类型边、一条回边及预期的直接支配节点。
- 手写带循环菱形图得到符合算法定义的支配节点。
- `-O2` 的 `total` 有两个循环。
- `-O0` 的 `grade` 从 `.rela.rodata` 恢复五项跳转表，目标为 `0x91, 0x88, 0x7f, 0x76, 0x76`。
- 没有表时，`-O0` 的 `grade` 只有三个块和一个未解析跳转。
- `-O1`、`-O2` 的 `grade` 是值表 `[1, 2, 3, 4, 4]`，无间接跳转。
- `-O2` 的 `grade_label` 通过五条重定位读取相对字符串表。
- 交互图嵌入分析所生成的相同数据。

## 生产故障模式

| 故障 | 粗略工具的报告 | 分析必须证明的事实 |
|---|---|---|
| `.text` 中嵌入数据 | 所有字节都被解码的可信列表 | 下降不认领数据字节，跳转目标是指令起点 |
| 最后一次返回后的填充 | 函数末尾有 `nopw` | 这些字节从入口不可达 |
| 经表间接跳转 | “jmp rax”及四个死块 | `lea` 重定位给出表地址，边界检查给出项数，`.rela.rodata` 给出目标 |
| switch 变成值表 | “带重定位的跳转表” | 从 `.rodata+0x14` 加载的 `movl`，三个块，无间接转移 |
| 零位移调用 | `callq 0x113`，即下一条指令 | `R_X86_64_PLT32 grade-0x4` 解析到 `0x30` |
| 解码器猜测未知操作码 | 看似正确的助记符 | 带地址的 `DecodeError`，扫描记录该字节 |
| 指令长于 15 字节 | 很长的“指令” | 游标在读取第 16 字节前抛错 |
| 分支进入指令中间 | 两份重叠列表 | 同时包含两个地址的冲突记录 |
| 循环被报告为直线代码 | 伪代码没有 `while` | 目标支配源节点的回边 |
| 基准来自不同编译器 | 在过期文本上通过测试 | 夹具 README 记录精确编译器和命令 |

## 操作规则

用基准核对解码，从已知入口遍历控制流，将每个字节归为已认领、填充、数据或不可达。每个间接目标都必须由可定位的重定位或表恢复。其余项连同地址记为未知。

## 延伸阅读

- [Intel 64 与 IA-32 架构软件开发手册，第 2 卷第 2 章：指令格式](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [AMD64 架构程序员手册，第 3 卷第 1 章：指令编码](https://docs.amd.com/v/u/en-US/24594_3.38_APM_Vol3_PUB)
- [System V 应用二进制接口，AMD64 架构处理器补充规范，表 4.9：重定位类型](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Schwarz、Debray、Andrews，“Disassembly of Executable Code Revisited”（WCRE 2002）](https://www2.cs.arizona.edu/~debray/Publications/disasm.pdf)
- [Andriesse 等，“An In-Depth Analysis of Disassembly on Full-Scale x86/x64 Binaries”（USENIX Security 2016）](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/andriesse)
- [Allen，“Control Flow Analysis”（1970）](https://doi.org/10.1145/800028.808479)
- [Cooper、Harvey、Kennedy，“A Simple, Fast Dominance Algorithm”（2001）](https://www.cs.tufts.edu/~nr/cs257/archive/keith-cooper/dom14.pdf)
- [Lengauer、Tarjan，“A fast algorithm for finding dominators in a flowgraph”（1979）](https://doi.org/10.1145/357062.357071)
- [Capstone 6.0.0-Alpha10 发布说明](https://github.com/capstone-engine/capstone/releases/tag/6.0.0-Alpha10)
- 本课所述 rea 6.5.0 源码位于标签 `3b79af2`：`README.md`、`docs/ghidra-provider.md`、`docs/ghidra-dos.md`、`docs/reverse-engineering-tools.md`、`bridge/ghidra/ReaGhidraBridge.java`、`src/contracts/officialToolContracts.ts`、`src/ghidra/GhidraAnalysisProfile.ts`。
