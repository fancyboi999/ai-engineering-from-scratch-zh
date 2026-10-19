# 提升为伪代码：从零实现 IR、SSA 与结构恢复

> 反编译输出是一项隐藏了推导过程的主张。亲手实现推导后，每行输出都有据可查。

**类型：** Build
**语言：** Python、C
**前置要求：** 阶段 13 · 32（从零读取 ELF）、阶段 13 · 33（反汇编与控制流）
**预计时间：** 约 150 分钟

## 学习目标

- 将解码后的 x86-64 指令提升为小型 IR，显式表达标志、加载、存储、分支、调用与返回。
- 将栈帧槽转为局部变量，将 System V 参数寄存器转为参数。
- 在支配边界放置 phi 函数，构建最小 SSA，再执行替换、化简和死代码消除。
- 通过后支配节点和回边，从控制流图恢复 `if`、`if else`、`while`、`do while`。
- 解释乘以 `0x66666667` 如何实现除以 10，并证明恒等式。
- 逐行阅读同一函数的 Ghidra 伪代码，指出每处差异背后的指令或猜测。

## 问题背景

你向 rea 请求 `ledger-x86_64-O1.o` 中 `percent_change` 的伪代码。Ghidra 12.1.4 约十秒后回答：

```c
undefined1  [16] percent_change(int param_1,int param_2,ulong param_3)

{
  long lVar1;
  undefined1 auVar2 [16];
  undefined1 auVar3 [16];
  
  if (param_1 != 0) {
    lVar1 = (long)((param_2 - param_1) * 100);
    auVar3._0_8_ = lVar1 / (long)param_1 & 0xffffffff;
    auVar3._8_8_ = lVar1 % (long)param_1 & 0xffffffff;
    return auVar3;
  }
  auVar2._8_8_ = 0;
  auVar2._0_8_ = param_3;
  return auVar2 << 0x40;
}
```

源码只有四行，接收两个 `int`，返回一个 `int`。Ghidra 却报告 16 字节返回值及源码没有的第三个参数。十六字节机器码没有问题，Ghidra 也全部解码正确。函数签名是猜测，文本却未标明。

rea 将此文本作为 `procedure_pseudo_code` 返回，并附一项限制：伪代码是 Ghidra 反编译输出，并非原始源码，也不与 Hopper 输出文本等价。`compare_functions` 将伪代码按文本行比较。其维度记录明确说，汇编是 provider 的不透明文本，且不支持重定位规范化。rea 无法深入文本，单纯阅读它的 agent 也无法。

rea 的 DX-Ball 记录展示了代价：首个反编译结果是调用 `__ftol()` 的 `FUN_00406400(void)`，指令视图却显示栈输入和 x87 表达式。agent 之所以继续调查，仅因两个视图不一致。

本课实现反编译器隐藏的推导。从第 33 课解码的 56 条指令开始，提升为 IR，重命名为 SSA，化简并恢复结构。再将 `percent_change`、`grade`、`total` 的结果与 Ghidra 并排比较，说明每项差异。测试通过 clang 编译输出，并在输入网格上与源码对照执行。

```figure
lifting-stages-percent-change
```

## 夹具与对照基准

`code/fixtures/ledger.c` 是本部分共用的夹具：

```c
int percent_change(int before, int after) {
    if (before == 0) return 0;
    return (after - before) * 100 / before;
}

int grade(int score) {
    switch (score / 10) {
    case 10:
    case 9: return 4;
    case 8: return 3;
    case 7: return 2;
    case 6: return 1;
    default: return 0;
    }
}

int total(const int *values, int count) {
    int sum = 0;
    for (int i = 0; i < count; i++) sum += values[i];
    return sum;
}
```

`grade_label` 也在源码和目标文件中，演示同样提升它。本课测试对象是上述三个函数。

目标文件使用 `clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c ledger.c` 构建；旁边的 `-O0` 版本用于栈槽部分。`code/fixtures/README.md` 列出两条命令、各目标文件的 SHA-256，以及生成 Ghidra 夹具的 rea 命令。在固定工具链上可逐字节重现构建。

解码器基准是 `llvm-objdump -d -r`，两份目标文件的文本已提交为 `ledger-x86_64-O1.objdump.txt` 和 `ledger-x86_64-O0.objdump.txt`。测试解析文本，逐条比较地址、字节和 AT&T 文本，覆盖 `-O1` 全部 56 条指令及 `-O0` 全部指令。若固定路径安装了 `llvm-objdump`，第二项测试还实时运行它再次比较。

基准中的 `percent_change`：

```text
0000000000000000 <percent_change>:
       0: 85 ff                        	testl	%edi, %edi
       2: 74 09                        	je	0xd <percent_change+0xd>
       4: 29 fe                        	subl	%edi, %esi
       6: 6b c6 64                     	imull	$0x64, %esi, %eax
       9: 99                           	cltd
       a: f7 ff                        	idivl	%edi
       c: c3                           	retq
       d: 31 c0                        	xorl	%eax, %eax
       f: c3                           	retq
```

## 第 1 步：从字节到指令

第 33 课实现了解码器。本课保留一份小副本，使代码独立运行，恰好覆盖 clang 为 `ledger.c` 在 `-O0`、`-O1` 下生成的操作码。遇到其他操作码，抛出包含地址和操作码字节的 `DecodeError`。

解码遵循 Intel SDM 第 2 卷 2.1 节：前缀、操作码、ModR/M、SIB、位移、立即数。2.2.1 节添加 `0x40` 至 `0x4F` 的单字节 REX，必须紧邻操作码。REX.W 选择 64 位操作数，REX.R 扩展 `reg`，REX.X 扩展 SIB index，REX.B 扩展 `r/m` 或 SIB base。2.1.3 节定义 ModR/M 的 `mod`、`reg`、`r/m` 及 SIB 的 `scale`、`index`、`base`。64 位模式中，`mod = 00` 且 `r/m = 101` 表示相对于下一指令的 32 位位移（2.2.1.6 节）。

| 操作码字节 | 形式 | 夹具示例 |
|---|---|---|
| `01 29 31 39 85 89` | `op Ev, Gv` | `29 fe` `subl %edi, %esi` |
| `03 2b 3b 8b 8d` | `op Gv, Ev` | `03 04 97` `addl (%rdi,%rdx,4), %eax` |
| `63`，带 REX.W | `movsxd Gv, Ev` | `48 63 c7` `movslq %edi, %rax` |
| `69`、`6b` | `imul Gv, Ev, imm` | `48 69 c0 67 66 66 66` |
| `83 /0 /5 /7` | `add sub cmp Ev, imm8` | `83 c1 fa` `addl $-0x6, %ecx` |
| `c1 /5 /7` | `shr sar Ev, imm8` | `48 c1 f9 22` `sarq $0x22, %rcx` |
| `f7 /7` | `idiv Ev` | `f7 ff` `idivl %edi` |
| `ff /0 /4` | `inc Ev`、`jmp Ev` | `48 ff c2` `incq %rdx` |
| `70` 至 `7f`、`eb`、`e8` | `jcc rel8`、`jmp rel8`、`call rel32` | `74 09` `je 0xd` |
| `99`、`c3`、`90`、`0f 1f` | `cltd`、`retq`、`nop` | `66 0f 1f 44 00 00` `nopw (%rax,%rax)` |

`grade+0x23` 的 `leaq (%rip), %rcx` 长七字节，位移为零。目标文件在位移字段偏移 `0x36` 处携带 `R_X86_64_PC32.rodata+0x10` 重定位，第 3 步将解析它。

## 第 2 步：基本块与支配节点

基本块是一组语句，只有顶部入口和底部出口。这是 Allen（1970）的定义，后续反编译论文都沿用。`build_blocks()` 收集首指令：函数入口、函数内各跳转目标，以及跳转或返回后的地址。末条指令决定后继：条件跳转有两个，`jmp` 有一个，`ret` 没有；以普通指令结束的块顺序进入下一个首指令。

`-O1` 的 `total` 有五块：

| 块 | 指令 | 后继 |
|---|---|---|
| `0x40` | `testl %esi, %esi`，随后 `jle 0x5c` | `0x5c`、`0x44` |
| `0x44` | `movl %esi, %ecx`、`xorl %edx, %edx`、`xorl %eax, %eax`、`nopw` | `0x50` |
| `0x50` | `addl (%rdi,%rdx,4), %eax`、`incq %rdx`、`cmpq %rdx, %rcx`、`jne 0x50` | `0x50`、`0x5b` |
| `0x5b` | `retq` | 出口 |
| `0x5c` | `xorl %eax, %eax`，随后 `retq` | 出口 |

`immediate_dominators()` 实现 Cooper、Harvey、Kennedy（2001）的迭代算法。按逆后序遍历块，对已处理前驱的支配节点求交，直到不再变化。这么小的图两轮即可结束。对 `total`，`0x44` 支配 `0x50`；`0x50` 通过回边支配自身，第 8 步据此发现循环。

同一函数还会运行两次：第 5 步 `dominance_frontiers()` 用于 SSA；第 8 步 `post_dominators()` 在添加虚拟出口的反向图上运行，用于寻找汇合点。

## 第 3 步：提升为小型 IR

IR 有六种语句：`Assign`、`Store`、`Branch`、`Jump`、`IndirectJump`、`Return`。表达式包括常量、变量、带宽度的二元运算、转换（`sext`、`zext`、`trunc`）和加载。另有五种仅供后续化简消除的形式：`Flags`、`Cond`、`Concat`、`SignFill`、`Symbolic`。

寄存器变量以其 64 位家族命名。写 `%eax` 是宽度 32 的 `rax` 赋值，读 `%eax` 则是宽度 32 的 `rax` 读取。64 位模式下，32 位写会零扩展到完整寄存器，因此随后对同一值的 64 位读取是 `zext`。提升器还不知道到达定义，先记录读取宽度，交由第 5 步 SSA 插入转换。

| 指令 | IR 语句 |
|---|---|
| `subl %edi, %esi` | `flags = cmp(esi, edi)`，随后 `esi = esi - edi` |
| `testl %edi, %edi` | `flags = test(edi, edi)` |
| `je 0xd` | `if je(flags) goto 0xd else goto 0x4` |
| `xorl %eax, %eax` | `eax = 0` |
| `cltd` | `edx = signfill(eax)` |
| `idivl %edi` | `dividend = edx:eax`、`eax = dividend / edi`、`edx = dividend % edi` |
| `movslq %edi, %rax` | `rax = sext64(edi)` |
| `sarq $0x22, %rcx` | `rcx = rcx >>s 34` |
| `shrq $0x3f, %rax` | `rax = rax >>u 63` |
| `addl (%rdi,%rdx,4), %eax` | `flags = add(eax, load32(rdi + rdx * 4))`，随后 `eax = eax + load32(rdi + rdx * 4)` |
| 带重定位的 `leaq (%rip), %rcx` | `rcx = &.rodata+0x14` |
| `pushq %rbp`、`movq %rsp, %rbp`、`subq $0x10, %rsp`、`popq %rbp` | 无，属于栈帧维护 |
| `retq` | `return rax` |

### 标志也是变量

所有设置条件码的指令都写入 `flags`，所有条件跳转读取它。`cmp a, b` 写 `cmp(a, b)`，`test a, b` 写 `test(a, b)`，`sub` 的副作用也写出同样的 `cmp` 形式。`jcc` 变为 `Branch(Cond(cc, flags), target, fallthrough)`。第 6 步将条件与标志结合时，由条件码决定比较运算符：

| 码 | `cmp(a, b)` 后 | `test(a, a)` 后 |
|---|---|---|
| `je` | `a == b` | `a == 0` |
| `jne` | `a != b` | `a != 0` |
| `jl`、`jge`、`jle`、`jg` | 有符号 `<`、`>=`、`<=`、`>` | 与 0 做有符号比较 |
| `jb`、`jae`、`jbe`、`ja` | 无符号 `<`、`>=`、`<=`、`>` | 与 0 做无符号比较 |

`xorl %eax, %eax` 直接提升为 `eax = 0`。其标志按 add 形式写入，但夹具没有跳转读取它们。这个 xor 惯用形式在 `grade` 中很重要，Ghidra 没有将它化简出来。

### cltd 与 idiv

`cltd` 用 `%eax` 的符号位填充 `%edx`。`idivl %edi` 将 64 位组合 `%edx:%eax` 除以 `%edi`，商写入 `%eax`，余数写入 `%edx`。提升器先把组合存到临时变量 `dividend`，于是余数语句读的是旧 `%eax`，而非刚产生的商。SSA 中高半部是低半部的 `signfill`；化简器将整个组合约成低半部，除法于是变成 32 位 `/`。

### -O0 的栈槽

`-O0` 下 clang 将所有局部变量保存在栈帧。`percent_change` 将 `%edi` 写到 `-0x8(%rbp)`、`%esi` 写到 `-0xc(%rbp)`，每次使用都读回。提升器识别 `pushq %rbp` 后接 `movq %rsp, %rbp`；该序言之后，基址为 `%rbp`、无索引且有位移的内存操作数变成 `local_<hex>`。`-0x8(%rbp)` 是 `local_8`，`-0xc(%rbp)` 是 `local_c`。

栈帧指令本身不生成 IR，对 `%rsp` 的 `subq`、`addq` 也不生成。其他内存操作数保留为 `Load` 或 `Store`。

### 重定位

`grade` 中 `leaq (%rip), %rcx` 的文件位移为零。偏移 `0x36` 的重定位是 `R_X86_64_PC32.rodata+0x10`，链接器会将 `S + A - P` 写入字段。`S` 是 `.rodata` 地址，`A` 是加数 `0x10`，`P` 是字段地址。指令再计算 `next_ip + disp = (P + 4) + S + A - P = S + A + 4`。

提升器无需链接器即可执行相同运算。目标偏移为加数加字段到指令末尾距离，即 `0x10 + 4 = 0x14`。IR 得到 `rcx = &.rodata+0x14`，这里的表包含五个 `int`：`1, 2, 3, 4, 4`。

## 第 4 步：从调用约定恢复参数

System V AMD64 psABI 第 3.2.3 节规定 INTEGER 类参数依次通过 `%rdi`、`%rsi`、`%rdx`、`%rcx`、`%r8`、`%r9` 传递，结果从 `%rax`，再从 `%rdx` 返回。3.2.1 节规定 `%rbp`、`%rbx`、`%r12` 至 `%r15` 属于调用者，必须保留，其余属于被调用者。

`collect_params()` 只用一条规则：函数内在任何写入之前就被读取的参数寄存器是参数。其中位置最高的寄存器确定数量，所以只读 `%rsi`、不读 `%rdi` 的函数仍有两个参数。`percent_change` 读 `%edi`、`%esi`，得到 `param_1`、`param_2`；`grade` 只读 `%edi`；`total` 将 `%rdi` 读为 64 位基址，将 `%esi` 读为 32 位计数。

现在可以解释 Ghidra 的 `param_3`。`idivl` 写 `%rdx`，而 psABI 允许 `%rax:%rdx` 返回 128 位 INTEGER。目标文件中没有调用者说明返回值宽度，因此 Ghidra 把两个寄存器都保留为返回值。

零返回路径上，`xorl %eax, %eax` 只写 `%eax`。Ghidra 将该路径上的 `%rdx` 视为函数输入，于是产生 `param_3`。指令没有错，签名则是在猜测指令未明确约束的部分。

## 第 5 步：SSA，每次定义一个名字

提升后的 `grade` 写 `rax` 四次、`rcx` 三次。Cytron、Ferrante、Rosen、Wegman、Zadeck（1991）定义静态单赋值形式：每个变量只赋值一次，汇合点上的 phi 从到达定义中选择。构建分两步：论文 5.1 节用支配边界放置 phi，5.2 节沿支配树重命名每个定义和使用。`insert_phis()`、`rename()` 分别遵循这两节。

`total` 的 SSA 列表展示构建结果：

```text
block 0x44 -> 0x50
  ecx_1 = esi_0
  edx_1 = 0
  eax_1 = 0
block 0x50 -> 0x50, 0x5b
  eax_2 = phi(0x44: eax_1, 0x50: eax_3)
  rdx_2 = phi(0x44: edx_1, 0x50: rdx_3)
  flags_2 = phi(0x44: flags_1, 0x50: flags_5)
  flags_3 = add(eax_2, load32(rdi_0 + rdx_2 * 4))
  eax_3 = eax_2 + load32(rdi_0 + rdx_2 * 4)
  flags_4 = inc(rdx_2, 1)
  rdx_3 = rdx_2 + 1
  flags_5 = cmp(zext64(ecx_1), rdx_3)
  if jne(flags_5) goto 0x50 else goto 0x5b
```

寄存器版本 0 是入口值，`esi_0`、`rdi_0` 是参数。循环头 `0x50` 有初始化块和自身两个前驱，因此循环中有定义的变量都会在那里放置 phi。`flags_2` 的 phi 生成后就是死代码：最小 SSA 因两个前驱都有 `flags` 定义而放置它，第 6 步再因无人读取而删除。

重命名也修正宽度。`edx_1 = 0` 为 32 位定义，`rdx_3 = rdx_2 + 1` 为 64 位，所以 phi `rdx_2` 取较宽宽度。`cmpq %rdx, %rcx` 读取 64 位 `%rcx`，但定义 `ecx_1 = esi_0` 是 32 位，于是使用变为 `zext64(ecx_1)`。最终伪代码的每次转换都源自这条规则。

“轻量”之处在于退出 SSA 的方式。`coalesce_webs()` 将每个 phi 及其参数合并为同一变量，称为 web，并使用同一名称。这适合这些函数的编译器形状，却可能在并行复制时失效，例如汇合点上两个 phi 交换值。本课不处理该情况，Cytron 第 7 节介绍通过着色完成通用退出。

## 第 6 步：化简、替换、删除死代码

`optimize()` 重复三个过程，直到不再变化。化简器自底向上应用：

| 化简前 | 化简后 |
|---|---|
| `Cond(je, cmp(a, b))` | `a == b`，其余九种码类似 |
| `Cond(jle, test(a, a))` | `a <= 0` |
| `x + (-6)` | `x - 6` |
| `trunc32(zext64(x))`，`x` 为 32 位 | `x` |
| 64 位操作数的 `trunc32(a + b)` | `trunc32(a) + trunc32(b)` |
| `(signfill(x): x) / d` | 32 位 `x / d` |
| `load32(base + idx * 4)` | `base[idx]` |
| `trunc32(p >>s 34) + trunc32(p >>u 63)`，其中 `p = sext64(x) * 0x66666667` | `x / 10` |

前向替换将定义移入其唯一使用处，条件有三：使用在同一块；使用是语句而非 phi；若定义包含加载，定义和使用之间不得有存储或调用。常量和节地址可替换到除 phi 以外的任意位置，因为 phi 参数必须保持为变量供 web 合并。

死代码消除删除目的变量无人使用、且表达式不含调用的赋值或 phi。过程顺序很重要。`percent_change` 的余数 `edx_2 = dividend_1 % edi_0` 先被删除，留下只使用一次的 `edx_1 = signfill(eax_1)`，可替入 `dividend_1 = edx_1:eax_1`。

组合规则再将 `signfill(eax_1):eax_1` 约为 `eax_1`，除法变成 `eax_1 / edi_0`。接着 `eax_1 = esi_1 * 100`、`esi_1 = esi_0 - edi_0` 各使用一次，都移进返回语句。`flags` 定义替入分支条件后消失。四条指令成为一行：

```c
return (param_2 - param_1) * 100 / param_1;
```

### 乘以 0x66666667

`grade` 将分数除以 10，clang 却不发出 `idiv`，而是 `imulq $0x66666667, %rax, %rax`，随后对副本执行 `sarq $0x22, %rcx`，再执行 `shrq $0x3f, %rax` 并相加。Granlund、Montgomery 的“Division by Invariant Integers using Multiplication”（PLDI 1994）解释此方法：编译器选择乘数 `m` 和移位 `s`，使范围内所有 `x` 的 `(x * m) >> s` 等于 `x / d`。

此处 `m = 0x66666667 = 1717986919`，`s = 34`。`2^34 / 10 = 1717986918.4`，向上取整为 `1717986919`。误差 `m * 10 - 2^34 = 6`。为使恒等式对所有 32 位 `x` 成立，误差乘 `2^31` 必须小于 `2^34`，即误差至多为 8。6 不超过 8，因此对非负 `int`，`(x * m) >> 34` 等于 `floor(x / 10)`。

对负 `x`，向下取整远离零，而 C 向零取整。`shrq $0x3f` 提取乘积符号位，仅在 `x` 为负时为 1，加上它即可修正舍入。

`magic_divisor(m, s)` 测试候选组合，先将 `2^s` 除以 `m` 的整数商作为 `d`，尝试 `d` 与 `d + 1`。只有 `m` 等于 `2^s / d` 的上取整、且误差界成立时才接受。相同乘数配 `s = 33` 得 `d = 5`，因为 `0x66666667` 也是 `2^33 / 5` 的上取整。测试在含 `int` 两端的 2,406 个值上与 `c_div(x, 10)` 比较。

开启识别后，`grade` 显示 `ecx_1 = param_1 / 10 - 6;`；关闭时，演示打印原始形式：

```c
rax_1 = (long)param_1 * 0x66666667;
ecx_1 = (int)(rax_1 >> 34) + (int)((unsigned long)rax_1 >> 63) - 6;
```

两种形式都能编译，计算结果相同。保留这个开关。读取未经研究的编译器输出时，原始形式更诚实。

## 第 7 步：从使用方式推断类型

机器码有宽度，没有类型。`infer_types()` 将三类证据转为 C 类型：定义宽度为 32 位的 web 是 `int`，64 位是 `long`；若 web 用作 4 字节元素访问 `base[idx]` 的基址，则为 `int *`。指针类型沿复制与 phi 传播，所以 `-O0` 的 `local_8 = param_1` 使二者都成为 `int *`。返回类型取各 `return` 值的宽度。

`total` 得到 `int total(int *param_1, int param_2)`，Ghidra 写成 `int total(long param_1,uint param_2)`。二者都与指令相容：提升器将带比例加载当作指针证据，Ghidra 保留寄存器宽度，将访问写成 `*(int *)(param_1 + uVar2 * 4)`。二者都看不到 `const`，也无法区分 `int *` 和 `unsigned *`。

Lee、Avgerinos、Brumley（TIE，NDSS 2011）将类型恢复表述为格上的约束求解，结果是上下界而非单个猜测。Noonan、Loginov、Cok（Retypd，PLDI 2016）加入多态与递归，借助编译器留下的惯用形式，对 `const` 指针注解报告了 98% 召回率。本课只采用其中两条最便宜的规则，并明确说明盲区。

无符号算术保留在表达式中，而非变量类型中。`cmpl $0x4, %ecx` 后的 `ja` 打印为 `(unsigned int)ecx_1 > 4`，`shrq` 打印为 `(unsigned long)rax_1 >> 63`。变量保持有符号，让读者同时看到寄存器值，以及指令将其视为无符号的具体位置。

## 第 8 步：从图恢复结构

Cifuentes（1994）第 6 章将图区域与高级语言形状匹配：先循环（6.6.1），再双路条件（6.6.2），最后多路条件（6.6.3）。Yakdan、Eschweiler、Gerhards-Padilla、Smith（NDSS 2015）采用另一条路线：推导每个节点的执行条件，再据此构建结构，不依赖固定形状。动机来自测量：某样本中 Hex-Rays 在 49,514 行产生 1,571 条 `goto`，每 32 行一条；他们的方法在 1,530 个 coreutils 函数中没有产生 `goto`。

`structure()` 属于前一类的简化实现，需要第 2 步的两个事实：以 `Branch` 结束的块，其直接后支配节点是条件汇合点；回边指向支配其源节点的块。自然循环包含所有无需经过头节点就能到达回边源节点的块。

对汇合点为 `j` 的 `Branch`：

- 若 `j` 是跳转目标，输出 `if (!cond) { fallthrough region }`，再从 `j` 继续。
- 若 `j` 是顺序后继，输出 `if (cond) { target region }`，再从 `j` 继续。
- 若 `j` 是函数出口，两臂都返回。将较小臂输出为 `if (cond) {... }`，另一臂放后面，不用 `else`。`percent_change`、`total` 的提前返回属此类。
- 否则输出 `if (cond) { target } else { fallthrough }`，再从 `j` 继续。`-O0` 的 `percent_change` 两臂都写 `local_4`，在尾声汇合，属此类。

对循环头：

- 若头以 `Branch` 结束且有一个循环外后继，输出 `while (cond) { body }`。`-O0` 的 `total` 先比较 `local_14` 与 `local_c`，在 `jge` 时退出，正是此形。
- 若头同时也是带回边的块，或从循环锁存块退出，输出 `do { body } while (cond);`。`-O1` 的 `total` 在 `0x50` 累加、递增、比较并跳回自身。

`IndirectJump` 令块结束且没有后继。`-O0` 的 `grade` 确实是跳转表，`jmpq *%rax` 经过 `.rodata+0x0` 的五个相对偏移，第 33 课能解析这些目标。本课提升器只打印说明：`0x76`、`0x7f`、`0x88`、`0x91` 四块仅能经间接跳转到达，未被提升。实践实验将补上 `switch`。

### -O1 如何改写 switch

`-O1` 下 clang 没有保留 `grade` 的跳转表，而是计算 `score / 10 - 6`，以无符号数与 4 比较，再从 `.rodata+0x14` 的五项 `int` 表加载返回值。一次无符号比较同时覆盖 `score / 10 < 6` 与 `score / 10 > 10`，因为负差值会变成很大的无符号值，同样无法通过检查。

表对应商 6 至 10，保存 `1, 2, 3, 4, 4`。带五个 `return` 的 `switch` 变成 `if` 加数组读取。提升器忠实输出此形式，并按节偏移将表命名为 `lookup_14`。

表长来自启发式。`table_values()` 从表起点读到下一个被任意 `.text` 重定位引用的 `.rodata` 偏移，或读到节尾。本目标文件的下一引用偏移为 `0x28`，即 `grade_label` 的表，所以 `lookup_14` 有 `(0x28 - 0x14) / 4 = 5` 项，与无符号比较 4 相符。Ghidra 也不知道长度，写成 `*(uint *)(&DAT_001000b4 + (ulong)uVar2 * 4)`，即字节地址加偏移，将五个值留给读者查询。

## 与 Ghidra 并排比较

演示打印每一对。Ghidra 文本来自 `code/fixtures/ghidra/*.json`，是 rea 于 2026-10-14 返回的 Evidence 记录。命令为 `npx -y rea-agents@6.5.0 decompile ledger-x86_64-O1.o <function> --provider ghidra --format json`。每条记录带 `confidence: observed`、`authority: shipped-artifact`。文本本身是观察结果，文本内部的主张却是推导，记录未区分二者。

### percent_change

```text
lifter                                         | ghidra
-----------------------------------------------+-----------------------------------------------
int percent_change(int param_1, int param_2)   | undefined1  [16] percent_change(int param_1,int param_2,ulong param_3)
{                                              | {
  if (param_1 == 0) {                          |   long lVar1;
    return 0;                                  |   undefined1 auVar2 [16];
  }                                            |   undefined1 auVar3 [16];
  return (param_2 - param_1) * 100 / param_1;  |   if (param_1 != 0) {
}                                              |     lVar1 = (long)((param_2 - param_1) * 100);
                                               |     auVar3._0_8_ = lVar1 / (long)param_1 & 0xffffffff;
                                               |     auVar3._8_8_ = lVar1 % (long)param_1 & 0xffffffff;
                                               |     return auVar3;
                                               |   }
                                               |   auVar2._8_8_ = 0;
                                               |   auVar2._0_8_ = param_3;
                                               |   return auVar2 << 0x40;
                                               | }
```

| 差异 | 指令或猜测 |
|---|---|
| 返回类型 `undefined1 [16]` 对比 `int` | 猜测。`idivl` 写 `%rax`、`%rdx`，没有调用者限定返回宽度，于是两个寄存器都保留。 |
| `param_3` | 上一猜测的结果。零路径只写 `%eax`，`%rdx` 因而作为输入读取。 |
| `lVar1 / (long)param_1 & 0xffffffff` 对比 `/ param_1` | 指令。`cltd` 加 `idivl` 对符号扩展的 32 位值做 64 位除法，再截断到 32 位。二者描述相同，本文通过 `signfill` 规则约去组合。 |
| 保留 `lVar1 % (long)param_1` | 由返回类型导致。余数 `%rdx` 在本文分析中为死值，在 Ghidra 中仍活跃。 |
| `if (param_1 != 0)` 后放零分支 | 指令顺序。`je 0xd` 跳到零返回。Ghidra 先放计算臂，本文先放较小臂，均正确。 |
| `return auVar2 << 0x40` | 猜测。反编译器用低半部为 `param_3` 的 16 字节值左移，表达 `%rax = 0` 而 `%rdx` 未知。 |

`code/fixtures/ghidra/ledger-x86_64-O1.ghidra-repaired.c` 的修订版只修改此函数，测试对 81 对输入与源码比较。

### grade

```text
lifter                                         | ghidra
-----------------------------------------------+-----------------------------------------------
static const int lookup_14[5] = {1, 2, 3, 4, 4}; | uint grade(int param_1)
int grade(int param_1)                         | {
{                                              |   uint uVar1;
  int eax_1;                                   |   uint uVar2;
  int ecx_1;                                   |   
                                               |   uVar2 = param_1 / 10 - 6;
  ecx_1 = param_1 / 10 - 6;                    |   uVar1 = -(param_1 >> 0x1f) ^ (uint)((ulong)((long)param_1 * 0x66666667) >> 0x3f);
  eax_1 = 0;                                   |   if (uVar2 < 5) {
  if ((unsigned int)ecx_1 <= 4) {              |     uVar1 = *(uint *)(&DAT_001000b4 + (ulong)uVar2 * 4);
    eax_1 = lookup_14[(unsigned long)(unsigned int)ecx_1]; |   }
  }                                            |   return uVar1;
  return eax_1;                                | }
}                                              |
```

| 差异 | 指令或猜测 |
|---|---|
| 二者都有 `param_1 / 10 - 6` | 指令。二者都识别了 `0x66666667` 惯用形式。 |
| `uVar1 = -(param_1 >> 0x1f) ^ (uint)(... >> 0x3f)` 对比 `eax_1 = 0` | `grade+0x1a` 的 `xorl %eax, %eax` 将寄存器清零。Ghidra 写成参数符号与乘积符号位的异或，同一位的两种表达却未抵消。所有 `int` 下均为 0，测试在 141 个分数上验证。只信文本会误以为默认值依赖分数。 |
| `uVar2 < 5` 对比 `(unsigned int)ecx_1 <= 4` | `cmpl $0x4, %ecx` 后接 `ja`，条件相同。Ghidra 将变量定为 `uint`，本文在使用处转换。 |
| `*(uint *)(&DAT_001000b4 + (ulong)uVar2 * 4)` 对比 `lookup_14[...]` | 指令加重定位。Ghidra 将 `.rodata` 加载到 `0x001000a0`，故 `0x001000b4` 是 `.rodata + 0x14`。它应用重定位后保留字节地址，本文命名表并读取五个值。 |
| 返回 `uint` 对比 `int` | 两边都是猜测，指令只说明 32 位。 |

### total

```text
lifter                                         | ghidra
-----------------------------------------------+-----------------------------------------------
int total(int *param_1, int param_2)           | int total(long param_1,uint param_2)
{                                              | {
  int eax_1;                                   |   int iVar1;
  int ecx_1;                                   |   ulong uVar2;
  long rdx_1;                                  |   
                                               |   if (0 < (int)param_2) {
  if (param_2 <= 0) {                          |     uVar2 = 0;
    return 0;                                  |     iVar1 = 0;
  }                                            |     do {
  ecx_1 = param_2;                             |       iVar1 = iVar1 + *(int *)(param_1 + uVar2 * 4);
  rdx_1 = 0;                                   |       uVar2 = uVar2 + 1;
  eax_1 = 0;                                   |     } while (param_2 != uVar2);
  do {                                         |     return iVar1;
    eax_1 = eax_1 + param_1[rdx_1];            |   }
    rdx_1 = rdx_1 + 1;                         |   return 0;
  } while ((unsigned long)(unsigned int)ecx_1 != rdx_1); | }
  return eax_1;                                |
}                                              |
```

| 差异 | 指令或猜测 |
|---|---|
| `int *param_1` 对比 `long param_1` | 本文从 `addl (%rdi,%rdx,4), %eax` 推断指针，Ghidra 保留宽度。 |
| `uint param_2`、`(int)param_2` 对比 `int param_2` | Ghidra 因 `cmpq %rdx, %rcx` 比较零扩展计数而选无符号。本文保留 `int`，在比较处转换。 |
| 二者都用 `do { } while` | 块内 `jne 0x50` 跳回自身。编译器旋转了循环，`-O0` 则保留 `while`。 |
| 保留 `ecx_1 = param_2`，对比 `param_2 != uVar2` | 本文替换规则限于同块。复制 `movl %esi, %ecx` 在初始化块，比较在循环块，因而保留变量；Ghidra 进行了传播。 |
| `(unsigned long)(unsigned int)ecx_1` | 指令。`movl %esi, %ecx` 零扩展，64 位比较读取完整寄存器。 |

行为测试原样编译 Ghidra 的 `grade`、`total`，只添加两行 `typedef`，并用 `.rodata+0x14` 的二十字节定义 `DAT_001000b4`。两函数在输入网格上与源码一致。

## 研究如何看待读取伪代码

LLM4Decompile（EMNLP 2024）在 HumanEval-Decompile 上测得单独 Ghidra 的可重新执行率为 20.12%，约五分之一函数可重新编译并通过基准断言。用其 6.7B 模型改进 Ghidra 输出后升至 52.74%。DecompileBench（Findings of ACL 2025）在 130 个程序的 23,400 个函数上测试六款工业反编译器及六种 LLM 方法：LLM 输出更易读，但功能正确性低了 52.2%。

Liu、Raff、Micinski（arXiv 2609.05370，2026 年 9 月）解释了差距。他们使用 300 个 GitHub 库函数和 287 个 CVE 相关函数。最强的改进模型将 Ghidra 构建率从 75% 提高到 90%，行为匹配率却从 74% 降至 62%。通过基准全部测试的候选仍会在模糊测试输入上分歧：八套系统总体为 4.9%，某一系统可达 13%。最多十分之一已披露漏洞在改进代码中消失。

他们追溯的原因很直接：杜撰的字段、类型、被调用者和保护条件，替换了反编译器保留的可见未知项。

这就是提升器保留 `(unsigned long)(unsigned int)ecx_1` 而不用漂亮名称的原因。未解析跳转输出说明而不猜 `switch`，表命名为 `lookup_14` 而非模型杜撰的标签。每行推导都能在 `code/main.py` 阅读。Ghidra 的 `undefined1 [16]` 难看却诚实；改进模型给出的干净 `int percent_change(int, int)` 可能结果正确、依据错误，下一函数就可能产生干净但错误的签名。

## 动手构建

运行演示：

```bash
cd phases/13-tools-and-protocols/34-lifting-to-pseudocode
python3 code/main.py
```

演示解码 `-O1` 目标文件四个函数，将全部指令与已提交的 `llvm-objdump` 比较。对 `percent_change`、`grade`、`total` 打印 SSA 前 IR、含 phi 的 SSA 列表，并将伪代码与 Ghidra 文本并排放置。随后打印关闭除法识别的 `grade`、`-O0` 的 `percent_change`、`total`、`grade_label` 及汇总：

```json
{
  "functions": ["grade", "grade_label", "percent_change", "total"],
  "instructions": 56,
  "blocks": {"percent_change": 3, "grade": 3, "total": 5, "grade_label": 4},
  "phis": {"percent_change": 0, "grade": 1, "total": 2, "grade_label": 1},
  "objdumpDifferences": 0
}
```

按以下顺序阅读 `code/main.py`：

1. `read_object()` 读取 ELF64 可重定位目标文件的节头、符号表及 `.rela` 节。
2. `decode_one()`、`render_att()` 解码单条指令，并按 `llvm-objdump` 的方式打印。
3. `build_blocks()`、`immediate_dominators()`、`dominance_frontiers()` 构建图事实。
4. `lift_insn()` 将指令转为 IR 并解析重定位。
5. `insert_phis()`、`rename()` 构建 SSA 并插入宽度转换。
6. `make_simplifier()`、`substitute_once()`、`remove_dead_code()` 在 `optimize()` 内执行。
7. `collect_params()`、`coalesce_webs()`、`infer_types()` 命名 web 并推断类型。
8. `structure()` 配合 `post_dominators()`、`natural_loops()` 输出 C 函数体。
9. `lift_function()` 串起各步，`lift_all()` 携带被调用者签名提升整个目标文件。

## 实际使用

要提升自己的函数，先用 `clang -target x86_64-unknown-linux-gnu -c` 构建，再调用 `lift_all(read_object(path))`。遇 `DecodeError`，从消息读取操作码字节，在 SDM 映射中找到后向文件顶部表添加一项。提升器遇助记符抛错时，给 `lift_insn()` 添加一条规则。结构恢复器输出 `goto` 时，用 `IrPrinter` 打印图，判断缺少哪种形状规则。每次增加都很小，并由现有测试通过 `llvm-objdump` 或 clang 核验。

若安装了 Ghidra，用 rea 对同一函数运行，并排放置文本。相信任一文本前先填写差异表。有指令支撑的差异是呈现选择；没有指令支撑的差异是猜测，猜测可能来自任一边。

## 交互实验

### 实验 A：一个函数经过五个阶段

在 `code` 目录启动 Python：

```bash
cd phases/13-tools-and-protocols/34-lifting-to-pseudocode/code
python3 -q
```

运行：

```python
from main import *
obj = read_object(FIXTURES / "ledger-x86_64-O1.o")
lifted = lift_function(obj, "percent_change")
for insn in lifted.decoded: print(f"0x{insn.address:x}: {insn.raw.hex(' ')}  {insn.att()}")
print(lifted.ir_text)
print(lifted.ssa_text)
print(lifted.pseudocode)
```

跟踪 `%esi`：从 `subl %edi, %esi`，到 `esi_1 = esi_0 - edi_0`，再到 `(param_2 - param_1)`。字节 `fe` 是 `subl` 的 ModR/M，`mod = 11`、`reg = edi`、`r/m = esi`。

### 实验 B：除法惯用形式

```python
print(lift_function(obj, "grade", recognize_division=False).pseudocode)
print(magic_divisor(0x66666667, 34), magic_divisor(0x66666667, 33), magic_divisor(0x66666667, 31))
```

第一行打印原始乘法和移位，第二行打印 `10 5 None`。解释为何相同乘数少移一位就能除以 5，以及为何移位 31 无法满足误差界。

### 实验 C：新目标文件令解码器停止

以 `-O2` 构建并提升夹具：

```bash
clang -target x86_64-unknown-linux-gnu -O2 -fno-asynchronous-unwind-tables -c fixtures/ledger.c -o "$TMPDIR/ledger-O2.o"
python3 -c 'from main import *; from pathlib import Path; import os; lift_all(read_object(Path(os.environ["TMPDIR"]) / "ledger-O2.o"))'
```

解码器在 `0x56` 停止，消息为 `opcode 81 is outside the fixture subset`。`81` 是带 32 位立即数的第 1 组形式。指令为 `andl $0x7ffffff8, %edx`，clang 将它用于 `total` 的向量化循环。在 `decode_one()` 的 `0x83` 旁加入它，重跑，记录下一个阻塞操作码。子集每次只扩一项，每项均与 `llvm-objdump` 核对。

### 实验 D：Ghidra 的 grade 默认值

```python
print(ghidra_pseudocode("grade"))
for score in (-25, 0, 59, 60, 100, 115):
    sign = -(score >> 31)
    product_sign = ((score * 0x66666667) & ((1 << 64) - 1)) >> 63
    print(score, sign ^ product_sign)
```

每行都打印 0。Ghidra 的 `uVar1` 表达式正确但难读，而 `xorl %eax, %eax` 两字节就说明了同一件事。

## 实践实验

为 `-O0` 的 `grade` 添加 `switch` 恢复。

要求：

- 读取 `ledger-x86_64-O0.o` 的 `.rela.rodata` 五项重定位，每项为 `R_X86_64_PC32.text+offset`，从 `.rodata+0x0` 的表计算五个分支目标。
- 给 IR 添加 `Switch` 终结语句，包含索引表达式、目标列表及加载前 `ja` 指向的默认分支。
- switch 块为每个目标设置后继，使支配、后支配和 SSA 继续正常工作。
- 输出 `switch (local_10) { case 0:... }`，每个目标一个 `case`，汇合后的共享尾声放在后面。
- 对无法限定表范围的间接跳转保留说明。
- 用 clang 编译结果，在测试的分数网格上与源码比较。

验收标准：`-O0`、`-O1` 的 `grade` 在网格上输出相同，前者有一个 `switch` 且没有 `goto`。

## 交付产物

本课生成 `outputs/skill-lifting-to-pseudocode.md`，用于提升函数、为每行保留推导，并填写与反编译文本的差异表。产物要求参考反汇编、重定位、调用约定、编译检查、行为比较及每个差异行的判定。

## 验证

运行演示及确定性测试：

```bash
cd phases/13-tools-and-protocols/34-lifting-to-pseudocode
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

套件有 25 项测试，验证：

- 两个目标文件的每条指令都与已提交 `llvm-objdump` 文本一致；安装工具时也与实时输出一致。
- REX、ModR/M、SIB 及 `leaq (%rip), %rcx` 位移字段偏移按 SDM 解码。
- 子集外操作码抛出 `DecodeError`，不猜测。
- ELF 读取器列出四函数与三个 `.text` 重定位。
- `total` 有五块，`0x44` 支配 `0x50`，`0x50` 是以自身为主体的循环头。
- `%rdi`、`%rsi` 变为 `param_1`、`param_2`，`total` 的 `param_1` 是 `int *`。
- `test`、`cmp` 配合 `je`、`jle`、`ja`、`jge` 转成 `==`、`<=`、无符号 `>`、`<`。
- SSA 在 `total` 循环头放两个活跃 phi，`percent_change` 不放 phi。
- `percent_change`、`grade`、`total` 伪代码与预期文本一致。
- 开启识别时 `grade` 显示 `param_1 / 10 - 6`，关闭时显示原始乘法。
- `0x66666667` 配移位 34 除以 10、配移位 33 除以 5，恒等式在网格上成立。
- `-O0` 栈槽变成 `local_4`、`local_8`、`local_c`，不出现帧指针。
- 通过重定位读取 `.rodata+0x14` 的表得到 `1, 2, 3, 4, 4`。
- `-O0` 的 `grade` 间接跳转连同四个未提升块被明确报告。
- Ghidra 夹具含 16 字节返回值、`param_3`、未化简 xor、`long param_1`。
- 六个输出单元均可用 `clang -std=c11 -Wall -Werror` 为 `x86_64-unknown-linux-gnu` 编译。
- 提升后的函数、修订 Ghidra 文本和源码在输入网格上打印相同 232 行。

## 生产故障模式

| 故障 | 粗略阅读的结论 | 推导必须展示 |
|---|---|---|
| 反编译器扩大返回值 | “返回 16 字节结构体” | `idivl` 写 `%rdx`，无调用者限定宽度 |
| 反编译器添加参数 | “接受三个参数” | 该寄存器只因猜测返回宽度，才在某路径被当成输入 |
| 未识别惯用形式 | “乘一个魔法常数” | 乘数为 `2^s / d` 上取整，误差界成立 |
| 识别惯用形式却未消除 xor | “默认值取决于输入” | `xorl %eax, %eax` 写零，同一位的两种表达会抵消 |
| 指针定为整数 | “接受 long” | 以该寄存器为基址的 4 字节带比例加载是指针证据 |
| 表长未知 | “读出表范围” | 下个引用偏移或节尾限定范围，边界检查与之相符 |
| 误读循环形状 | “while 循环” | 头无出口、锁存块回跳，所以是 `do while` |
| 猜测间接跳转 | “五分支 switch” | 目标来自 `.rela.rodata`，否则报告未解析 |
| 跨存储替换 | “单个表达式” | 将加载值移过存储或调用会改变含义 |
| 模型改写文本 | “能编译且看似正确” | 构建率上升、行为匹配下降，杜撰保护替换了可见未知项 |
| 解码器猜操作码 | “反汇编看起来正常” | 带地址和字节的 `DecodeError`，然后仅增加一项并与 `llvm-objdump` 核对 |

## 操作规则

将伪代码视为尚未看到的推导。用可读提升器从指令重现，将两份文本并排，为每个差异行写明指令依据或猜测。有源码时，编译两者并与源码运行比较。没有指令支撑的一行，无论多整洁，都仍是猜测。

## 延伸阅读

- [Intel SDM 第 2 卷第 2 章：指令格式](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [System V AMD64 psABI 第 3.2 节：函数调用序列](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Cytron 等，Efficiently Computing Static Single Assignment Form and the Control Dependence Graph，TOPLAS 1991](https://doi.org/10.1145/115372.115320)
- [Cooper、Harvey、Kennedy，A Simple, Fast Dominance Algorithm，2001](https://www.cs.tufts.edu/~nr/cs257/archive/keith-cooper/dom14.pdf)
- [Cifuentes，Reverse Compilation Techniques，博士论文，QUT 1994](https://eprints.qut.edu.au/36820/)
- [Yakdan 等，No More Gotos，NDSS 2015](https://www.ndss-symposium.org/ndss2015/ndss-2015-programme/no-more-gotos-decompilation-using-pattern-independent-control-flow-structuring-and-semantics/)
- [Granlund、Montgomery，Division by Invariant Integers using Multiplication，PLDI 1994](https://doi.org/10.1145/178243.178249)
- [Lee、Avgerinos、Brumley，TIE，NDSS 2011](https://www.ndss-symposium.org/ndss2011/tie-principled-reverse-engineering-of-types-in-binary-programs/)
- [Noonan、Loginov、Cok，Polymorphic Type Inference for Machine Code，PLDI 2016](https://arxiv.org/abs/1603.05495)
- [LLM4Decompile，EMNLP 2024](https://arxiv.org/abs/2403.05286)
- [DecompileBench，Findings of ACL 2025](https://aclanthology.org/2025.findings-acl.1194/)
- [Liu、Raff、Micinski，When LLM Decompilers Recompile More and Preserve Less，2026](https://arxiv.org/abs/2609.05370)
- [rea 6.5.0 Ghidra provider 说明](https://github.com/morluto/rea/blob/rea-agents-6.5.0/docs/ghidra-provider.md)
- 本课所述 rea 6.5.0 源码位于标签 `3b79af2`：`src/domain/functionComparisonDimensions.ts`、`website/evidence/dx-ball-sound-pan.md`。
