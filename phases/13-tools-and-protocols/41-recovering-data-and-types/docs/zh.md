# 恢复数据与类型：结构体、数组、C++ 对象和 DWARF

> 反编译器有类型表时打印 `a->balance`，没有时打印 `*(int *)(param_1 + 4)`。本课从内存访问构建类型表，从 DWARF 5 读取真实类型表，再展示两者何处一致。

**类型：** Build
**语言：** Python, C, C++, x86-64 assembly
**前置要求：** 阶段 13 · 33（反汇编与控制流）、阶段 13 · 34（提升为伪代码）
**预计时间：** ~140 分钟

## 学习目标

- 依据 Intel SDM 寻址规则，将结构体成员访问读成基址寄存器加位移，将数组访问读成基址加索引乘步长。
- 手工将 System V 对齐规则应用于 `struct account`，解释每个填充字节。
- 构建类型恢复遍，将列表中的访问转为字段偏移、宽度、种类、步长和大小，并逐项附上证据。
- 为可重定位目标文件的 `.debug_info`、`.debug_abbrev`、`.debug_str_offsets`、`.debug_addr` 编写 DWARF 5 读取器，并与 `llvm-dwarfdump` 核对。
- 比较恢复布局与 DWARF 布局，将每项差异明确归为缺少证据、合并访问或无法证明的种类。
- 从重定位读取 Itanium C++ 虚表、typeinfo 和修饰名称，并将虚调用解析到槽。

## 问题背景

你不带 `-g` 编译 `account.c`，问 agent `bump` 做什么。agent 将目标文件交给 Ghidra 12.1.4，得到：

```c
void bump(long param_1,int param_2)
{
  *(int *)(param_1 + 4) = param_2 + *(int *)(param_1 + 4);
  return;
}
```

同一源码加 `-g` 编译，同一个反编译器给出：

```c
int bump(account *a,int by)
{
  a->balance = by + a->balance;
  return a->balance;
}
```

两个目标文件的指令完全相同。差别在类型表。有表时，反编译器知道第一个参数指向 32 字节结构体，偏移 4 的字段是名为 `balance` 的 4 字节 `int`。没有表时，它只知道 `%rdi` 传来了一个 8 字节宽的值，并读写了 `+4` 处的 4 字节。

表中每条信息都有来源。偏移 4 来自 `addl 0x4(%rax), %ecx` 的位移字节；宽度 4 来自后缀 `l`；名称来自 `.debug_info` 中的 `DW_TAG_member` 条目。本课构建两半：一遍恢复指令能够证明的内容，一个读取器解码编译器记录的内容。两者的差距，就是获得类型名称所需的信息。

```figure
re-41-struct-recovery
```

## 成员访问就是位移

Intel SDM 第 1 卷 3.7.5 节将有效地址定义为 `Offset = Base + (Index * Scale) + Displacement`，比例因子为 1、2、4 或 8，位移宽度为 8、16 或 32 位。3.7.5.1 节加入 64 位模式的 `RIP + Displacement` 形式。结构体成员访问使用没有索引的第一种形式：基址寄存器保存对象地址，位移就是成员偏移。数组访问增加索引项，比例因子或单独乘法携带元素大小。

以 `-O0` 的 `bump` 为例。`llvm-objdump -d -r` 的列表如下：

```text
       4: 48 89 7d f8                  	movq	%rdi, -0x8(%rbp)
       e: 48 8b 45 f8                  	movq	-0x8(%rbp), %rax
      12: 03 48 04                     	addl	0x4(%rax), %ecx
      15: 89 48 04                     	movl	%ecx, 0x4(%rax)
```

按第 33 课规则解码 `03 48 04`。`03` 是 `ADD r32, r/m32`。ModRM `48` 是 `01 001 000`：`mod = 01` 表示带 8 位位移的内存操作数，`reg = 001` 是 `%ecx`，`r/m = 000` 是 `%rax`。位移字节为 `04`。指令读取 `%rax + 4` 的 4 字节，加到 `%ecx`。`llvm-objdump` 打印的 `l` 后缀表示操作数大小，因此字段宽 4 字节。`%rax` 来自栈帧槽 `-0x8(%rbp)`，该槽接收过 `%rdi`，即 System V 调用约定的第一个整数实参。因此能得出三个事实：第一参数是指针，它指向的对象在偏移 4 有一个 4 字节字段，`bump` 读写该字段。

这些字节没有说明 `int`、`balance` 或 `struct account`，也没说明对象多大。结构体剩下的 28 字节对 `bump` 不可见。

## System V 布局规则

x86-64 psABI 3.1.2 节为聚合类型给出三条规则：结构体和联合体采用其成员中最严格的对齐；每个成员分配到满足对齐要求的最低可用偏移；对象大小始终是其对齐值的倍数。同文档图 3.1 给出标量大小与对齐：`char` 为 1 和 1，`short` 为 2 和 2，`int` 为 4 和 4，`double` 为 8 和 8，任意指针为 8 和 8。

将规则应用于 `account.c` 的结构体：

```c
struct account {
    char kind;
    int balance;
    short code;
    double rate;
    const char *label;
};
```

| 成员 | 大小 | 对齐 | 可容纳它的最低偏移 | 前置填充 |
|---|---|---|---|---|
| `kind` | 1 | 1 | 0 | 0 |
| `balance` | 4 | 4 | 4 | 3（字节 1 至 3） |
| `code` | 2 | 2 | 8 | 0 |
| `rate` | 8 | 8 | 16 | 6（字节 10 至 15） |
| `label` | 8 | 8 | 24 | 0 |

末成员结束于 32。最严格对齐为 8，32 已是 8 的倍数，所以大小为 32，没有尾部填充。32 字节中有九字节填充；psABI 规定填充内容未定义。

成员顺序决定大小。同五个成员按 `double, pointer, int, short, char` 排列时，偏移为 0、8、16、20、22，结束于 23，向上舍入为 24。`code/main.py` 的 `sysv_layout()` 应用三条规则，生成两个结果。Python 的 `ctypes` 通过宿主编译器约定应用相同规则，同一结构体的 `ctypes.sizeof`、`ctypes.alignment` 和各字段 `.offset` 分别给出 32、8、`0, 4, 8, 16, 24`。在上游实验机器构建并运行程序本身，会打印第三份结果：

```text
sizeof 32 align 8
kind 0 balance 4 code 8 rate 16 label 24
sum 315 tag -3 projected 318.75 label_length 7
```

该原生构建是 arm64。Arm AAPCS64 5.10.1 节规定相同聚合规则，Apple 的 arm64 文档保留这五种标量大小，因此两个目标的数字一致。本课 x86-64 目标文件用 `-target x86_64-unknown-linux-gnu` 编译，以供第 33 课的 ELF 读取器和后文 DWARF 读取器使用。

## 手工读取结构体其余部分

`bump` 看见一个字段。`account.c` 的另外四个函数看见其余字段，每个展示一种不同指令形式。下列地址均来自 `account-x86_64-O0-g.objdump.txt`。

`sum_balances` 索引结构体数组：

```text
      51: 48 8b 45 f8                  	movq	-0x8(%rbp), %rax
      55: 48 63 4d ec                  	movslq	-0x14(%rbp), %rcx
      59: 48 c1 e1 05                  	shlq	$0x5, %rcx
      5d: 48 01 c8                     	addq	%rcx, %rax
      60: 8b 40 04                     	movl	0x4(%rax), %eax
```

`%rax` 是 `list`，`%rcx` 是符号扩展为 64 位的 `i`，`shlq $0x5` 将其乘以 32。`addq` 后，`%rax` 为 `list + 32 * i`，加载读取元素 `i` 偏移 4 处的 4 字节。移位量是该目标文件中唯一以数值形式呈现结构体大小的位置。包含这些指令的循环从 `0x49` 延伸到 `0x72` 的 `jmp 0x49`。

`tag` 读取两个窄字段：

```text
      8c: 0f be 00                     	movsbl	(%rax), %eax
      98: 0f bf 48 08                  	movswl	0x8(%rax), %ecx
```

`movsbl` 加载偏移 0 的一个字节并符号扩展，所以偏移 0 的字段是有符号 1 字节整数。`movswl` 加载偏移 8 的两字节并符号扩展，所以该字段是有符号 2 字节整数。在 `-O1`，第一处访问变成 `cmpb $0x6c, (%rdi)`，仍表示偏移 0 的一个字节，但不说明符号。

`projected` 读取浮点值：

```text
      cc: f2 0f 2a 40 04               	cvtsi2sdl	0x4(%rax), %xmm0
      d5: f2 0f 59 40 10               	mulsd	0x10(%rax), %xmm0
```

`cvtsi2sdl` 将内存中的有符号 32 位整数转换为 double，确认偏移 4 保存有符号 4 字节整数。`mulsd` 乘以内存中的 double，所以偏移 16 保存 8 字节浮点值。

`label_length` 读取指针，再沿指针访问：

```text
      f3: 48 8b 40 18                  	movq	0x18(%rax), %rax
      f7: 48 63 4d f4                  	movslq	-0xc(%rbp), %rcx
      fb: 80 3c 08 00                  	cmpb	$0x0, (%rax,%rcx)
```

`movq` 读取偏移 24 的 8 字节。单看它，可能是 8 字节整数或指针。`cmpb` 将加载值用作内存操作数的基址。被用作地址的值就是指针。`cmpb` 从它的 `%rcx` 索引处读取 1 字节；在 `-O1`，循环内用 `leaq 0x1(%rcx), %rcx` 推进指针，因此被指向的元素相隔 1 字节。

综合五个函数，结构体是 `{ i8 at 0, i32 at 4, i16 at 8, f64 at 16, pointer at 24 }`，步长为 32。1 至 3 和 10 至 15 的空隙恰好是 psABI 预测的填充。指令没有说明成员名称、指针为 `const char *`、偏移 0 的有符号字节声明类型为源码中的 `char`，也没有说明五函数接收同一类型。最后一点来自 `main`，它将同一个栈帧对象传给五函数。`-O0` 的调用点清楚展示：`callq bump` 前先 `leaq -0x70(%rbp), %rdi` 再 `addq $0x20, %rdi`，`callq tag` 前则 `addq $0x40, %rdi`。偏移 0、`0x20`、`0x40` 是同一数组的三个元素，填充该数组的 `memcpy` 复制 `0x60` 即 96 字节，正好是三个 32 字节元素。

## 恢复遍

`code/main.py` 的 `trace_function()` 按地址顺序遍历一个函数的指令，维护小型抽象状态。持有位置是 64 位寄存器或 `-0x8(%rbp)` 这样的栈帧槽。每个位置有三种值之一。`Pointer` 由根、常量偏移和步长集合组成，步长记录加上了未知倍数的某个字节数。`Index` 是未知值的整数，但已知它是某个比例的倍数。其余均视为未知。

初始状态把六个 System V 实参寄存器设为 `Pointer("param0", 0)` 至 `Pointer("param5", 0)`。随后每条指令应用一条规则：

- 64 位寄存器和栈帧槽之间的 `movq` 复制值。向寄存器写入 32 位或更窄值后，它变成比例为 1 的 `Index`。
- 带指针基址的 `leaq` 生成加上位移的指针；若有索引寄存器，将 `scale * index_scale` 加入步长。以 `%rbp` 或 `%rsp` 为基址的 `leaq` 命名栈帧对象，`main` 就是这样传递 `rows`。
- 对 `Index` 执行 `shlq $n` 将其比例乘以 `2^n`，`imulq $k` 则乘以 `k`。
- 指针与索引的 `addq` 保留指针，将索引比例加入步长。指针上的 `addq $k` 改变偏移，并被记录为该寄存器的增量。
- 调用使每个调用者保存寄存器变为未知，并将保存指针的实参寄存器记为调用点。
- 基址寄存器保存指针的每个内存操作数，都生成一个 `Access`，记录指针根和偏移、由助记符确定的宽度和种类，以及存储标志。

宽度与种类仅来自助记符。`access_width()` 将 `b`、`w`、`l`、`q` 后缀映射为 1、2、4、8 字节，`movsbl` 和 `movswl` 映射为有符号窄加载，`movzbl` 映射为无符号，标量 SSE 的 `sd`、`ss` 映射为 8 字节和 4 字节浮点，`cvtsi2sdl` 映射为有符号 4 字节整数源，16 字节 `movaps` 家族映射为向量。`leaq` 和各种 `nop` 不算访问。

```python
if memory.base in FRAME_REGISTERS:
    return Pointer(f"frame({memory.base}{format_signed(memory.displacement) if memory.displacement else ''})", 0)
base = env.get(memory.base)
if not isinstance(base, Pointer):
    return Unknown
strides = set(base.strides)
if memory.index is not None:
    index_value = env.get(memory.index)
    strides.add((index_value.scale if isinstance(index_value, Index) else 1) * memory.scale)
return Pointer(base.root, base.offset + memory.displacement, frozenset(strides), base.origin)
```

经指针加载 8 字节会产生新指针，其根标记来源字段，例如 `param0->0x18`。该值随后用作基址，或由 `leaq` 推进时，来源字段被标为已证明的指针。这条规则让偏移 24 从“8 字节”变成“指针”。

### 四类步长证据

`infer_layout()` 合并每个见证函数的访问，从四种来源收集步长，每项都附上产生它的指令。

| 种类 | 来源 | 展示该来源的构建 |
|---|---|---|
| `scale` | 比例大于 1 的 `Index` 到达指针，来自 `shlq $0x5` 或 `imulq` | `-O0`，`0x59` 的 `shlq $0x5, %rcx` |
| `loop-step` | 循环内对基址或索引寄存器的 64 位递增，循环同时包含该访问 | `-O1`，`0x24` 的 `addq $0x20, %rdx` |
| `offset-delta` | 同一循环内经同一基址寄存器访问相同宽度，偏移相差固定值 | `-O2`，八次加载相隔 32 |
| `call-site` | 同一栈帧对象传给见证函数时的偏移 | `-O0`，`main` 传入 `rows`、`rows+0x20`、`rows+0x40` |

循环是向后的 `jmp` 或条件分支；只有循环范围同时包含递增和访问，该递增才计入。这排除了 `-O0` 中推进 `i` 的 `addl $0x1, %eax`，因为它是 32 位加法，而且访问不经 `%eax`。最终步长是所有值的最大公约数。步长至少覆盖末字段结尾时，大小就是步长。

### -O2 的向量化循环

在 `-O2`，clang 将 `sum_balances` 向量化。`0x50` 至 `0xaa` 的循环体每次读取八个元素：

```text
      3b: 48 8d 87 e4 00 00 00         	leaq	0xe4(%rdi), %rax
      50: 66 0f 6e 50 80               	movd	-0x80(%rax), %xmm2
      55: 66 0f 6e 98 60 ff ff ff      	movd	-0xa0(%rax), %xmm3
      61: 66 0f 6e 90 40 ff ff ff      	movd	-0xc0(%rax), %xmm2
      69: 66 0f 6e a0 20 ff ff ff      	movd	-0xe0(%rax), %xmm4
      7d: 66 0f 6e 10                  	movd	(%rax), %xmm2
      81: 66 0f 6e 58 e0               	movd	-0x20(%rax), %xmm3
      8a: 66 0f 6e 50 c0               	movd	-0x40(%rax), %xmm2
      8f: 66 0f 6e 60 a0               	movd	-0x60(%rax), %xmm4
      a0: 48 05 00 01 00 00            	addq	$0x100, %rax
      aa: 75 a4                        	jne	0x50 <sum_balances+0x40>
```

`%rax` 从 `list + 0xe4` 开始。八个位移将加载置于相对 `list` 的 `0x04, 0x24, 0x44, 0x64, 0x84, 0xa4, 0xc4, 0xe4`，即 `4, 36, 68, 100, 132, 164, 196, 228`。增量 `0x100` 即 256。如果恢复遍只按遇到的偏移记录，就会报告八个字段和至少 232 字节的结构体。列表正确，结论错误。

`fold_unrolled()` 应用一条规则：在同一循环内，取经同一基址寄存器、相同宽度的访问，它们的偏移相隔 `d`，此处为 32。若循环步长为 `k * d`，且恰好有 `k` 个不同偏移，则循环展开了 `k` 次，每次访问都是相同元素访问，偏移为 `(offset - lowest) mod d`。此处 `256 = 8 * 32` 且有八个偏移，所以八次加载都折叠到偏移 4，步长证据记录 `offset-delta 32`、`unrolled 32`、`loop-step 256`。`0xe0` 的标量余数循环还从 `shlq $0x5, %rdx` 添加 `scale 32`，从 `addq $0x20, %rdx` 添加 `loop-step 32`。全部五个值的最大公约数为 32。

交互图提供关闭折叠的按钮。关闭后，`-O2` 构建在第 32 字节之外显示七个字段，且没有大小。这正是只信位移、不看循环的读者会得到的结果。

## 从字节读取 DWARF 5

`account.c` 的 `-g` 构建携带八个调试节：`.debug_info` 为 493 字节，`.debug_abbrev` 为 179，`.debug_str` 为 230，`.debug_str_offsets` 为 124，`.debug_addr` 为 112，`.debug_line` 为 312，`.debug_line_str` 为 12，`.debug_frame` 为 264。DWARF 5 标准的引言将 `.debug_str_offsets`、`.debug_addr`、`.debug_line_str` 列为第 5 版新增。`code/main.py` 的读取器需要前五个。

### 单元头

标准 7.5.1.1 节给出完整编译单元头：`unit_length`、`version`、`unit_type`、`address_size`、`debug_abbrev_offset`。`.debug_info` 前十二字节为：

```text
e9 01 00 00   unit_length = 0x1e9 = 489
05 00         version = 5
01            unit_type = DW_UT_compile
08            address_size = 8
00 00 00 00   debug_abbrev_offset = 0
```

`unit_type` 字节是第 5 版新增，同节也明确说明。长度计算其自身之后的字节，因此下一单元应从 `4 + 489 = 493` 开始，即该节末尾。`llvm-dwarfdump --debug-info` 在 `Compile Unit:` 行打印相同五值，第一个测试解析该行并比较。

### 缩写

2.1 节规定，每个调试信息条目由标识标签和一系列属性组成。条目本身只存缩写码；该码选择 `.debug_abbrev`（7.5.3 节）中的声明，后者给出标签、是否跟随子节点，以及每个属性的形式。本目标文件有 14 个声明，这里重点看两个：

```text
[12] DW_TAG_structure_type  DW_CHILDREN_yes
     DW_AT_name              DW_FORM_strx1
     DW_AT_byte_size         DW_FORM_data1
     DW_AT_decl_file         DW_FORM_data1
     DW_AT_decl_line         DW_FORM_data1
[13] DW_TAG_member           DW_CHILDREN_no
     DW_AT_name              DW_FORM_strx1
     DW_AT_type              DW_FORM_ref4
     DW_AT_decl_file         DW_FORM_data1
     DW_AT_decl_line         DW_FORM_data1
     DW_AT_data_member_location  DW_FORM_data1
```

`parse_abbreviations()` 读取 ULEB128 码、ULEB128 标签、一个子节点字节，再读属性与形式对，直到 `0, 0`。7.5.6 节给出形式编码：`data1` 为一字节，`ref4` 为相对单元的 4 字节偏移，`strx1` 为字符串偏移表的一字节索引，`sec_offset` 和 `data4` 为 4 字节，`addrx` 为地址表的 ULEB128 索引，`exprloc` 为 ULEB128 长度后接指定字节数，`flag_present` 则不占任何字节。

### 手工解码 balance 成员

`account` 的结构体条目从偏移 `0x195` 开始，字节为 `0c 15 20 00 03`。缩写码 12 表示结构体；`DW_AT_name` 为字符串索引 `0x15`；`DW_AT_byte_size` 为 `0x20` 即 32；`DW_AT_decl_file` 为 0；`DW_AT_decl_line` 为 3，对应源码中 `struct account {` 所在行。

第二个成员条目从 `0x1a3` 开始，字节为 `0d 10 88 01 00 00 00 05 04`：

1. `0d` 是缩写 13，表示成员。
2. `10` 是 `strx1` 形式的 `DW_AT_name`，即字符串索引 16。
3. `88 01 00 00` 是 `ref4` 形式的 `DW_AT_type`，即距单元起点 `0x188`，指向名为 `int` 的 `DW_TAG_base_type` 条目。
4. `00` 是 `DW_AT_decl_file`，`05` 是 `DW_AT_decl_line`，对应 `account.c` 第 5 行。
5. `04` 是 `DW_AT_data_member_location`，即偏移 4。

5.7.6 节规定，成员条目可有 `DW_AT_data_member_location` 或 `DW_AT_data_bit_offset` 属性，整数常量表示距包含实体起点的字节偏移。这个字节与 `addl 0x4(%rax), %ecx` 的位移是同一个数，`compare_layouts()` 将两者并列比较。

### 字符串和地址经过两张表

字符串索引 16 不是 `.debug_str` 的偏移。读取器从单元条目取 `DW_AT_str_offsets_base`，其值为 8，再读 `.debug_str_offsets` 中 `8 + 4 * 16` 处的 4 字节条目。该条目保存 `"balance"` 在 `.debug_str` 中的偏移。地址采用相同间接层。`sum_balances` 条目以 `07 07` 开头：缩写 7 表示子程序，随后 `DW_AT_low_pc` 采用 `addrx` 索引 7。`.debug_addr` 的 `8 + 8 * 7` 处八字节为 `0x30`，即函数在 `.text` 中的地址。该表前六项是六个字符串字面量的地址。

在可重定位目标文件中，两张表都不含最终值。`.debug_str_offsets` 每项在文件中都是零，`.rela.debug_str_offsets` 保存 29 条指向 `.debug_str` 的 `R_X86_64_32`，真实偏移在加数中。`.debug_addr` 有 13 条指向 `.text` 和 `.rodata.str1.1` 的 `R_X86_64_64`。`.debug_info` 自身有四条重定位：缩写偏移、以 `.debug_str_offsets+0x8` 表示的 `DW_AT_str_offsets_base`、`DW_AT_stmt_list`，以及以 `.debug_addr+0x8` 表示的 `DW_AT_addr_base`。读取器解析节之前，`ElfObject.relocated()` 对 32 位和 64 位类型应用 `S + A`。目标文件中的节符号值为 0，因此字段得到加数。`llvm-dwarfdump` 执行同样的解析，所以输出的名称和地址已经解析所有索引。

### 类型、函数与位置

`DwarfInfo.type_name()` 沿 `DW_AT_type` 引用追踪。`label` 成员指向 `DW_TAG_pointer_type`，再指向 `DW_TAG_const_type`，最后是 `char` 基本类型，组合名称为 `const char *`。`type_size()` 对基本类型和结构体返回 `DW_AT_byte_size`，对指针返回 8，对数组返回数量乘元素大小。`type_kind()` 将基本类型的 `DW_AT_encoding` 化简为带符号信息的 `int` 或 `float`，将指针类型化简为 `pointer`，作为比较的统一词汇。

`DwarfInfo.functions()` 读取六个 `DW_TAG_subprogram`。`bump` 从 `0x0` 到 `0x21`，即 `DW_AT_low_pc` 加 `DW_AT_high_pc` 长度。其栈帧基址为 `DW_OP_reg6 RBP`，参数 `a` 的位置表达式为 `91 78`：`DW_OP_fbreg` 加 SLEB128 值 `0x78`，即 -8。这正是列表在地址 `0x4` 将 `%rdi` 存入的栈帧槽 `-0x8(%rbp)`。调试信息和指令从两侧描述同一个槽。

## 比较两种布局

`compare_layouts()` 遍历 DWARF 成员，在相同偏移寻找推断字段。成员没有字段则为 `no-evidence`；字段大小不同为 `size-mismatch`；指针成员的字段从未被解引用为 `pointer-unproven`；种类不一致，如指令使用整数算术而类型是浮点，则为 `kind-mismatch`。从成员内部或填充内部开始的推断字段为 `unexpected`。大小通过比较步长与 `DW_AT_byte_size` 判断。

以下是 `python3 code/main.py` 给出的三个构建的数据：

| 构建 | 经第一参数的访问数 | 字段 | 步长证据 | 匹配成员 | 大小 |
|---|---|---|---|---|---|
| `-O0` | 11 | 5 | `scale 32`、`call-site 32`、`call-site 64` | 5/5 | 32，匹配 |
| `-O1` | 9 | 5 | `loop-step 32` | 5/5 | 32，匹配 |
| `-O2` | 17 | 折叠后 5，折叠前 12 | `offset-delta 32`、`unrolled 32`、`loop-step 256`、`scale 32`、`loop-step 32` | 5/5 | 32，匹配 |

各构建推断的间隙均为字节 1 至 3、10 至 15，恰好等于 DWARF 布局的填充。每个推断字段都位于自身大小的倍数处，符合 psABI 规则，`natural_alignment_ok()` 记录该事实。

逐个加入函数，图景会变化。只有 `bump` 时，布局仅有偏移 4 的一个字段，大小未知，下界为 8。`sum_balances` 加入步长，`tag` 加入偏移 0 和 8，`projected` 加入偏移 16 的浮点值，`label_length` 加入偏移 24 的指针并证明它是指针。`main` 在 `-O0` 加入调用点，在 `-O1`、`-O2` 不增加内容，因为编译器内联了所有调用。交互图按此顺序逐步展示每个构建。

仍有三类信息无法触及：名称不在指令里，`const` 限定符不在指令里，`label` 的被指向类型只能从字符串循环的 `leaq 0x1(%rcx), %rcx` 得知“元素相隔 1 字节”，这与 `char`、`unsigned char`、`_Bool` 都相容。`-O1` 下偏移 0 的字节符号未知，因为 `cmpb $0x6c, (%rdi)` 只比较、不扩展。恢复遍在那里报告 `int8`；`-O0` 有 `movsbl` 符号扩展，则报告 `i8`。第 35 课将这些事实记为未知项。

## C++ 对象

`shapes.cpp` 定义了 `Shape`，含虚析构、纯虚 `area()` 和虚 `name()`；派生类 `Rect` 增加两个 `int` 成员。Itanium C++ ABI 决定 clang 在 x86-64 Linux 上如何布局它们。

### 修饰名称

ABI 5.1.2 节规定，在名称编码前加 `_Z` 来修饰名称。目标文件有 19 个此类符号。`_ZNK4Rect4areaEv` 可拆为：`_Z`；表示嵌套名称的 `N`；表示 const 成员函数的 `K`；带长度前缀的源码名称 `4Rect`、`4area`；结束嵌套名称的 `E`；表示空参数列表的 `v`。`llvm-cxxfilt` 打印 `Rect::area() const`。`_Z8describeRK5Shapei` 是 `describe(Shape const&, int)`：`R` 为引用，`K` 为 const，`5Shape` 为类，`i` 为 `int`。5.1.4 节的特殊名称包括虚表的 `_ZTV`、typeinfo 的 `_ZTI`、typeinfo 名称字符串的 `_ZTS`。构造和析构使用 `C1`、`C2`、`D0`、`D1`、`D2`，因此 `_ZN4RectD0Ev` 和 `_ZN4RectD2Ev` 都打印为 `Rect::~Rect()`：删除析构函数和基对象析构函数共享源码名称。

`code/main.py` 的 `Demangler` 覆盖该子集，以及 5.1.5.2 节的内建类型码、5.1.10 节的 `S_` 替换。测试对全部 19 个名称运行它，与保存的 `llvm-cxxfilt --no-strip-underscore` 输出比较。这个选项在 macOS 很重要：工具默认剥掉一个前导下划线，随后无法识别 `Z8describe...`。

### 从重定位读取虚表

ABI 2.5.2 节按顺序列出虚表组件：虚调用偏移、虚基类偏移、到顶部的偏移、typeinfo 指针，随后是虚函数指针。地址点，即对象 vptr 保存的值，是第一个函数指针的地址（2.6.2 节）。`Rect` 没有虚基类，所以表只有到顶部的偏移、typeinfo 和函数。

符号 `_ZTV4Rect` 大小为 0x30 字节，即六个八字节槽。目标文件中每个字节都是零，内容在 `.rela.data.rel.ro._ZTV4Rect`：

```text
0000000000000008 R_X86_64_64              _ZTI4Rect
0000000000000010 R_X86_64_64              _ZN4RectD2Ev
0000000000000018 R_X86_64_64              _ZN4RectD0Ev
0000000000000020 R_X86_64_64              _ZNK4Rect4areaEv
0000000000000028 R_X86_64_64              _ZNK4Rect4nameEv
```

槽 0 保存到顶部的偏移，值为 0，无需重定位。槽 1 是 typeinfo。地址点位于 `+16`。从地址点起，槽 0 为完整对象析构，槽 1 为删除析构，槽 2 为 `area`，槽 3 为 `name`。`read_vtable()` 读取符号大小、范围内的重定位，以及偏移 0 的零。`Shape` 的表形态相同，但槽 2 为 `__cxa_pure_virtual`，即纯虚调用会到达的运行时函数。

### RTTI

2.9.4 节将 `std::type_info` 描述为 vptr 后接指向修饰类型名称的指针，并列出派生类。`_ZTI4Rect` 有三条重定位：`_ZTVN10__cxxabiv120__si_class_type_infoE+0x10`、`_ZTS4Rect`、`_ZTI5Shape`。第一条是 `__si_class_type_info` 的虚表，ABI 用该类表示在偏移零处有单一公开非虚基类的类型；`+0x10` 是虚表地址点。第二条指向字符串 `4Rect`，即修饰类型名称，`type_info` 的 `name()` 恰好返回此字符串。第三条是基类。`_ZTI5Shape` 使用 `__class_type_info`，没有基类指针。`read_typeinfo()` 返回这三个事实。

### 虚调用

`-O0` 的 `describe` 执行一次虚调用：

```text
       f: 48 8b 7d f8                  	movq	-0x8(%rbp), %rdi
      13: 48 8b 07                     	movq	(%rdi), %rax
      16: ff 50 10                     	callq	*0x10(%rax)
```

第一条 `movq` 加载对象指针。第二条读取对象偏移 0 的八字节，即 vptr，因为 ABI 将它放在有虚函数的类的首位。`callq` 通过 vptr 后的 `0x10` 调用，`0x10 / 8` 为槽 2。`find_virtual_calls()` 匹配模式，报告两个候选：来自 `_ZTV4Rect` 的 `Rect::area() const`，以及来自 `_ZTV5Shape` 的 `__cxa_pure_virtual`。具体运行哪个取决于对象，因此调用是间接的。

DWARF 记录同一个槽。两类的 `area` 对应 `DW_TAG_subprogram` 均含 `DW_AT_vtable_elem_location (DW_OP_constu 0x2)`；`name` 对应槽 3，析构函数对应槽 0。`Rect` 是 16 字节的 `DW_TAG_structure_type`，含偏移 0 的 `Shape` 继承条目 `DW_TAG_inheritance`，以及偏移 8 的 `w` 和偏移 12 的 `h`。`Shape` 大小 8 字节，含一个人工成员 `_vptr$Shape`。重定位表和调试条目这两条独立推导，都得到 `area` 位于槽 2。

在 `-O1`，目标文件根本没有虚表。`main` 将 `Rect` 构造为局部对象，编译器在编译时解析 `r.name()` 和 `describe(r, 2)` 并内联。没有代码取虚表地址，因此不生成虚表。`describe` 仍含 `movq (%rdi), %rax` 和 `callq *0x10(%rax)`，因为参数可能是任意 `Shape`。虚表缺失只是某个目标文件的事实，测试 `test_the_optimised_object_keeps_the_call_pattern_but_drops_the_vtables` 同时检查这两方面。

Microsoft ABI 的所有这些细节都不同。修饰名称以 `?` 开头，并编码调用约定，因此按 C++ `__cdecl` 编译的 `void test(void)` 是 `?test@@ZAXXZ`。RTTI 定位器以 `_RTTICompleteObjectLocator` 存在于 `vfptr[-1]`；vftable 符号为 `??_7`，定位器为 `??_R4`。Microsoft 文档明确表示，不同编译器供应商之间没有 C++ 命名标准。本课 fixture 只覆盖 Itanium。

## 工具怎样呈现恢复的类型

下表中列出的实际输出均在上游实验机器生成，保存到 `code/fixtures/tools/`。未安装工具的行仅描述文档，并明确标记。

| 工具 | 版本、许可 | 类型保存位置 | 对本课 fixture 的表现 |
|---|---|---|---|
| Ghidra | 12.1.4，2026-09-21，Apache-2.0 | Data Type Manager 的内建、自定义和派生类型；`.gdt` 档案；程序使用的类型被复制到程序中 | 有 DWARF：`/DWARF/account.c/account size=32 align=8`、`a->balance = by + a->balance;`。无 DWARF：`long param_1` 下的 `*(int *)(param_1 + 4)`、`tag(char *param_1)`、`*(char **)(param_1 + 0x18)` |
| IDA Pro | 9.4，2026-07-13，商业；IDA Free 限非商业，只有 x86 云反编译器 | Local Types 窗口、`.til` 类型库、将 DWARF 和 PDB 导入 `dwarf` 或 `pdb` 文件夹 | 未安装，仅依据文档 |
| Binary Ninja | 6.0，2026-09-03，商业，有 Free 版 | 类型编辑、头文件导入导出、类型档案、DWARF 和 PDB 调试信息、类型库、平台类型 | 未安装，仅依据文档 |
| radare2 | 6.2.4，2026-10-05，LGPLv3 | `ts`、`tsc`、`afvd` | 对设置 `bin.dbginfo=true` 的可重定位目标文件，`ts` 和 `tsc account` 无输出；`pdf` 显示 `mov dword [rax + 4], ecx`，附 DWARF 源码行注释 |
| rizin | 0.9.1，2026-06-29，核心为 LGPL | `ts`、`tsc`、`afvd` | `tsc account` 从 DWARF 打印 `struct account { char kind; int balance; short code; double rate; const char *label; };`；不带 `-g` 的构建只列出随附头文件类型 |
| lldb | lldb-1703.0.236.21 | `image lookup -t` | 从 ELF 目标文件得到 `byte-size = 32` 和完整 `compiler_type` 文本 |
| gdb | 上游实验机器未安装 | `ptype /o` 打印结构体字段偏移、大小并标记空洞 | 仅依据文档 |
| pyelftools | 0.33，公有领域 | `.debug_info` 的 Python API | 43 行脚本打印相同五个成员和 `unit version 5` |
| llvm-dwarfdump | Apple LLVM 17.0.0 | `--debug-info`、`--debug-abbrev`、`--debug-str-offsets` | 所有读取器测试的参照 |

Ghidra 无 DWARF 的输出也展示相同两条规则。它为 `tag` 参数赋予 `char *`，因为函数经该指针比较一个字节；为 `0x18` 字段赋予 `char **`，因为 `label_length` 解引用加载值并比较字节。这正是本课恢复遍的规则：指令给宽度，解引用证明指针。Ghidra 反编译器文档说明，p-code varnode 不一定关联数据类型，反编译器最终通过传播赋予正式类型。“Infer constant pointers”选项把同类传播扩展到常数。Ghidra 12.1 添加了位字段恢复，本课 fixture 未覆盖。

手工类型表是另一半。Ghidra Data Type Manager、IDA Local Types、Binary Ninja 类型档案、rizin `td` 都允许按恢复布局输入结构体，再观察反编译器重新渲染。恢复遍告诉你应输入什么、哪些字段仍在猜测。

rea 6.5.0 使用 Ghidra provider 时将反编译文本作为记录返回。Ghidra 行的全部说明同样适用；记录携带类型名称，却没有产生名称的证据。对同一列表运行 `python3 code/main.py infer` 即可取得这些证据。

## 类型推断研究

本课恢复遍是类型推断系统的约束生成部分，范围限于通过参数触达的一个结构体。该领域已有更深入的工作。

- TIE（Lee、Avgerinos、Brumley，NDSS 2011）将类型重建建模为二进制 IR 上的约束生成与求解，测量保守性和精度，并在 87 个 coreutils 程序上与商业反编译器比较。
- Retypd（Noonan、Loginov、Cok，PLDI 2016）加入子类型、多态和递归类型，报告指针 `const` 标注重建召回率 98%。GrammaTech 名下有开源实现。
- OSPREY（Zhang 等，IEEE S&P 2021）将每个内存位置视为随机变量，推断最可能的类型。
- DIRTY（Chen 等，USENIX Security 2022）与 ReSym（Xie 等，CCS 2024）用学习模型后处理反编译输出；ReSym 报告完整结构体布局精度 72.9%。
- RecStruct（Chen 等，USENIX Security 2026）不依赖反编译器，以流不敏感符号执行和栈槽上的并查集恢复嵌套结构体。

栈上结构体是本课恢复遍首先跳过的情况。`-O1` 的 `main` 把 `rows` 保留在栈上，内联代码读取 `0x24(%rsp)`、`0x40(%rsp)`、`0x48(%rsp)`、`0x30(%rsp)`、`0x38(%rsp)`。这些偏移模 32 为 4、0、8、16、24，即同一结构体，却没有参数可作初始根。实践实验要求恢复它。

## 动手构建

运行演示：

```bash
cd phases/13-tools-and-protocols/41-recovering-data-and-types
python3 code/main.py
```

输出是一份含五部分的 JSON 报告。`dwarf` 保存 `-O0` 目标文件的单元头、结构体和函数。`oracles` 保存 psABI 规则布局、`ctypes` 布局、DWARF 布局、原生运行结果和 `agree` 标志。`builds` 保存三个目标文件各自的访问、推断布局和比较。`cxx` 保存反修饰名称、两个虚表、两条 typeinfo、虚调用和 DWARF 槽。`tools` 列出保存的工具输出。

预期结构：

```json
{
  "dwarf": {"unit": {"unitLength": 489, "version": 5, "unitType": "DW_UT_compile", "addressSize": 8, "abbrevOffset": 0}, "...": "..."},
  "oracles": {"agree": true, "psabiRules": {"size": 32, "align": 8, "...": "..."}, "...": "..."},
  "builds": {
    "O0": {"layout": {"stride": 32, "size": 32, "gaps": [1, 2, 3, 10, 11, 12, 13, 14, 15], "...": "..."}, "comparison": {"matches": 5, "members": 5, "...": "..."}},
    "O1": {"...": "..."},
    "O2": {"...": "..."}
  },
  "cxx": {"virtualCalls": [{"slot": 2, "candidates": {"Shape": "__cxa_pure_virtual", "Rect": "_ZNK4Rect4areaEv"}, "...": "..."}], "...": "..."}
}
```

按以下顺序阅读 `code/main.py`：

1. `ElfObject` 读取节、符号、重定位，`relocated()` 对调试节应用 `S + A`。
2. `parse_abbreviations()` 和 `DwarfInfo._parse_unit()` 读取头、缩写表与条目，再经两张表解析 `strx`、`addrx`。
3. `DwarfInfo.struct_layouts()` 和 `functions()` 结合 `type_name()`、`type_size()`、`type_kind()`，将条目转换为 `StructLayout`、`FunctionInfo`。
4. `parse_listing()`、`parse_memory()`、`access_width()` 读取 `llvm-objdump` 文本。
5. `trace_function()` 是抽象状态机，`fold_unrolled()` 与 `infer_layout()` 将访问转换成布局。
6. `compare_layouts()` 生成状态行，`sysv_layout()`、`ctypes_layout()` 是另两个参照。
7. `Demangler`、`read_vtable()`、`read_typeinfo()`、`find_virtual_calls()` 覆盖 C++ 目标文件。

另有四个命令。`python3 code/main.py dwarf FILE.o` 打印任意 DWARF 5 可重定位目标文件的结构体和函数。`python3 code/main.py infer LISTING.txt [FILE.o]` 对列表运行恢复遍；提供目标文件时，对照其 DWARF。`python3 code/main.py demangle NAME...` 和 `python3 code/main.py vtable FILE.o` 覆盖 C++ 部分。

## 实际使用

对自己构建的新目标文件：

1. 捕获 `llvm-objdump -d -r`，与目标文件放在一起。恢复遍读取该文本。
2. 对列表运行 `python3 code/main.py infer`。先读 witnesses 行，它列出第一参数被用作内存基址的函数。若缺某函数，说明参数从未到达内存操作数，或经过了恢复遍不跟踪的路径。
3. 读取每个字段及其访问数。一次访问就是一个见证。只有一个见证的字段记为推断。
4. 读取步长证据。`call-site` 或 `scale` 很强；只有一个 `loop-step` 而无其他种类则较弱，因为展开循环报告多个元素的总步长。出现 `unrolled` 时，手工检查折叠。
5. 有 `-g` 构建时运行比较，阅读所有非 `match` 行。`no-evidence` 指出没有函数触及的成员，`unexpected` 指出恢复遍无法放置的访问。
6. 在工具的类型管理器中将布局输入为结构体，记录哪些字段、名称和种类是猜测。

保留三个参照。规则、`ctypes` 和 DWARF 对你写的布局不一致时，可能找到了紧凑结构体、位字段或规则不同的目标平台。

## 交互实验

### 实验 A：解码成员条目

从 `code` 目录打开 Python：

```bash
cd phases/13-tools-and-protocols/41-recovering-data-and-types/code
python3 -q
```

运行：

```python
from main import *
elf = load_object("account-x86_64-O0-g.o")
dwarf = DwarfInfo(elf)
dwarf.header()
elf.section(".debug_info").data[0x1a3:0x1ac].hex(" ")
dwarf.dies[0x1a3].attributes
dwarf.type_name(dwarf.type_of(dwarf.dies[0x1a3]))
```

查看字典之前，先用缩写 13 在纸上解码九个字节。然后读取未重定位原始节 `elf.section(".debug_str_offsets").data[8:16].hex()` 和重定位后的 `elf.relocated(".debug_str_offsets")[8:16].hex()`，解释差异。

### 实验 B：跟踪一个函数

```python
listing = load_listing("account-x86_64-O0-g.objdump.txt")
trace = trace_function("label_length", listing["label_length"])
[(hex(a.address), a.root, a.offset, a.width, a.kind) for a in trace.accesses]
trace.pointer_uses
trace_function("sum_balances", listing["sum_balances"]).loops
```

运行前先写下哪次访问证明偏移 24 是指针。再对 `-O1` 列表运行相同行，在 `trace.increments` 中找到 `leaq 0x1(%rcx), %rcx`。

### 实验 C：折叠向量化循环

```python
o2 = load_listing("account-x86_64-O2-g.objdump.txt")
trace = trace_function("sum_balances", o2["sum_balances"])
sorted({a.offset for a in trace.accesses})
folded, evidence = fold_unrolled(trace, trace.accesses)
sorted({a.offset for a in folded}), [(e.kind, e.value, e.text) for e in evidence]
```

再运行 `analyze_build("O2", fold=False)["comparison"]`，统计 `unexpected` 行。将折叠规则改为要求循环步长恰好等于 `k * d` 且 `k` 至少为 2，确认仅有一次访问、步长 32 的 `-O1` 循环保持不变。

### 实验 D：虚表与名称

```python
shapes = load_object("shapes-x86_64-O0-g.o")
read_vtable(shapes, "_ZTV4Rect")
read_typeinfo(shapes, "_ZTI4Rect")
demangle("_ZNK4Rect4areaEv"), demangle("_Z8describeRK5Shapei")
find_virtual_calls(load_listing("shapes-x86_64-O0-g.objdump.txt"), [read_vtable(shapes, "_ZTV5Shape"), read_vtable(shapes, "_ZTV4Rect")])
```

在纸上从 `callq *0x10(%rax)` 计算槽，再对照 `DwarfInfo(shapes).struct("Rect").virtual_methods` 确认。随后加载 `shapes-x86_64-O1-g.o`，尝试对它执行 `read_vtable`。阅读 `ElfError`，解释符号为何缺失。

## 实践实验

恢复 `-O1` 的 `main` 中栈上结构体。

要求：

- 扩展 `trace_function()`，允许栈帧槽区域作为根。用从 `.data.rel.ro` 填充 `0x0(%rsp)` 至 `0x5f(%rsp)` 的 `movaps` 存储作为种子；这是 `rows` 的 96 字节初始化数据。
- 将内联访问 `0x24(%rsp)`、`0x40(%rsp)`、`0x48(%rsp)`、`0x30(%rsp)`、`0x38(%rsp)` 归于该根，报告相对候选步长取模后的偏移。
- 从 `0x120` 至 `0x12c` 的循环推导步长 32：`%r14` 从 4 起步，每次加 `0x20`，直到 `0x64`；展示循环界 `0x64` 等于三个元素加字段偏移。
- 对照 DWARF 布局达到五项匹配，记录哪些种类仍未证明。
- 添加测试，在栈帧根被归于参数时失败。

成功标准：对 `-O1` 列表运行 `python3 code/main.py infer`，将 `main` 列为带栈帧根的见证，比较仅凭 `main` 就显示五项匹配。

## 课程产物

本课提供 `outputs/skill-recovering-data-and-types.md`。用它将列表和可选调试构建转换为每字段带证据的结构体布局、带来源的步长、与 DWARF 的比较，以及仍未知的内容。必须给出访问表、步长证据、折叠检查，有 DWARF 时提供该参照，并说明哪些名称和限定符不可能由指令提供。

## 验证

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/41-recovering-data-and-types
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应证明：

- 单元头、14 个缩写和五个成员偏移与 `llvm-dwarfdump` 一致
- 名称经重定位后的 `.debug_str_offsets` 表取得，单元的 `str_offsets_base`、`addr_base` 均为 8
- 六个函数携带转储所示的范围、`DW_OP_reg6 RBP`、`DW_OP_fbreg` 位置，低地址等于列表的函数起点
- 没有 `.debug_info` 的目标文件触发异常，LEB128 解码器将 `0x78` 处理为 -8
- `pyelftools`、`lldb` 打印与读取器相同的布局
- psABI 规则、`ctypes`、DWARF、原生运行给出偏移 `0, 4, 8, 16, 24` 和大小 32，重排结构体为 24 字节
- 列表解析器在 `bump` 读取 13 条指令，将 `R_X86_64_PLT32 bump-0x4` 附到 `0x194` 的调用，并找到 `0x72` 的向后跳转
- 可从 AT&T 文本和助记符解码内存操作数、宽度、种类、符号
- `-O0` 的 `bump` 从栈帧槽读回指针，在偏移 4 产生三次访问
- 步长在 `-O0` 来自 `shlq $0x5`，在 `-O1` 来自 `addq $0x20, %rdx`，在 `-O2` 来自按步长 256 折叠的八次加载
- `label_length` 通过解引用证明偏移 24 是指针
- `main` 在 `-O0` 以偏移 0、`0x20`、`0x40` 传递同一个栈帧对象，在 `-O1` 只调用 `printf`
- 每个构建都匹配 5/5 成员，大小为 32，间隙等于 DWARF 填充
- 不折叠时，`-O2` 构建在字节 32 之后报告七个字段，没有大小
- 反修饰器复现全部 19 个 `llvm-cxxfilt` 字符串
- 两个虚表、两条 typeinfo 和 `0x16` 的虚调用均解析到槽 2，DWARF 也一致
- `-O1` 的 C++ 目标文件保留调用模式，没有虚表
- Ghidra、rizin、radare2 的记录展示有 DWARF 时的结构体，以及无 DWARF 时的原始偏移
- 交互图内嵌数据与分析生成的数据相同

## 生产中的失败模式

| 失败 | 较弱工具的报告 | 分析必须证明的内容 |
|---|---|---|
| 展开循环 | 八个相隔 32 字节的字段，232 字节结构体 | 循环步长 256 等于偏移差 32 的八倍，因此只有偏移 4 的一个字段 |
| 从单次增量读取步长 | 从 `addq $0x100` 得 `sizeof` 256 | 所有步长来源的最大公约数，包括标量尾部的 `addq $0x20` |
| 将八字节字段称为指针 | 偏移 24 是 `void *` | 后续访问将加载值用作基址，否则种类保持 `int64` |
| 将指针称为整数 | 偏移 24 是 `long` | `0xfb` 的解引用，被记录为指针证据 |
| 窄比较 | 带符号的 `char` | `cmpb` 不携带符号信息，只有 `movsbl` 或 `movzbl` 才有 |
| 假定五函数共享类型 | 没有别名证据就合成一个结构体 | `main` 的调用点传入同一个栈帧对象，或分析者明确作此断言 |
| 按索引从 `.debug_str` 读字符串 | 可重定位目标文件中的乱码名称 | `str_offsets_base` 加重定位后 `.debug_str_offsets` 的条目 |
| 将地址直接当数值读取 | 每个函数 `low_pc` 都为 0 | 经重定位后 `.debug_addr` 表解析 `addrx` |
| DWARF 4 目标文件 | 读取器误解析头 | 检查头的第二字段版本；第 4 版没有 `unit_type` 字节 |
| 缺失虚表 | “类没有虚函数” | `-O1` 内联了所有调用，`-O0` 有虚表及重定位 |
| 从错误基址读取虚表槽 | 槽号相差二 | 地址点在符号之后 16 字节，越过到顶部偏移和 typeinfo |
| 修饰名称被剥前缀 | `Z8describeRK5Shapei` 原样保留 | macOS 使用 `--no-strip-underscore`，或用检查 `_Z` 的反修饰器 |
| 按某工具猜测录入结构体 | 把 `char *param_1` 当字段类型 | 记录宽度和解引用证据，将名称标为猜测 |

## 操作准则

从访问恢复字段，从循环恢复步长，各自附上指令。相信超过步长的偏移前，先折叠展开循环。通过缩写和重定位表读取 DWARF，绝不直接按索引读取字符串节。逐字段比较，把每个无证据成员、未证明指针和名称记为未知。对 C++ 目标文件，从重定位读取虚表，从调用读取槽，再用 DWARF 确认槽号。

## 延伸阅读

- [System V Application Binary Interface, AMD64 Architecture Processor Supplement, section 3.1.2: Data Representation](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Procedure Call Standard for the Arm 64-bit Architecture (AAPCS64), section 5.10: Composite Types](https://github.com/ARM-software/abi-aa/blob/main/aapcs64/aapcs64.rst)
- [Writing ARM64 code for Apple platforms](https://developer.apple.com/documentation/xcode/writing-arm64-code-for-apple-platforms)
- [Intel 64 和 IA-32 Architectures Software Developer's Manual, Volume 1, section 3.7.5: Specifying an Offset](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [DWARF Debugging Information Format Version 5, sections 2.1, 5.7.6, 7.5.1.1, 7.5.3, 7.5.6](https://dwarfstd.org/doc/DWARF5.pdf)
- [Itanium C++ ABI, sections 2.5 (Virtual Table Layout), 2.9 (Run-Time Type Information), 5.1 (External Names)](https://itanium-cxx-abi.github.io/cxx-abi/abi.html)
- [Microsoft Learn: Decorated names](https://learn.microsoft.com/en-us/cpp/build/reference/decorated-names?view=msvc-170) 和 [Name Decoration](https://learn.microsoft.com/en-us/cpp/error-messages/tool-errors/name-decoration?view=msvc-170)
- [llvm-dwarfdump command guide](https://llvm.org/docs/CommandGuide/llvm-dwarfdump.html) 和 [llvm-cxxfilt command guide](https://llvm.org/docs/CommandGuide/llvm-cxxfilt.html)
- [Python ctypes: Structure layout, sizeof, alignment](https://docs.python.org/3/library/ctypes.html)
- [Ghidra Data Type Manager](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Features/Base/src/main/help/help/topics/DataTypeManagerPlugin/data_type_manager_description.htm), [Decompiler Concepts](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Features/Decompiler/src/main/help/help/topics/DecompilePlugin/DecompilerConcepts.html), [Decompiler Options](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Features/Decompiler/src/main/help/help/topics/DecompilePlugin/DecompilerOptions.html), 和 [Ghidra 12.1.4 release](https://github.com/NationalSecurityAgency/ghidra/releases/tag/Ghidra_12.1.4_build)
- [IDA 9.1 user guide: Types](https://docs.hex-rays.com/9.1/user-guide/types), [IDA 9.4 release post](https://hex-rays.com/blog/ida-9.4-release-a-new-dyld-shared-cache-swift-analysis-new-teams-add-on-and-more-), 和 [IDA Free](https://hex-rays.com/ida-free)
- [Binary Ninja user guide: Types](https://docs.binary.ninja/guide/types/) 和 [Binary Ninja 6.0 Krypton](https://binary.ninja/2026/09/03/binary-ninja-6.0-krypton.html)
- [radare2 6.2.4 release](https://github.com/radareorg/radare2/releases/tag/6.2.4) 和 [rizin v0.9.1 release](https://github.com/rizinorg/rizin/releases/tag/v0.9.1)
- [GDB manual: Examining the Symbol Table, ptype /o](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Symbols.html)
- [pyelftools on PyPI](https://pypi.org/project/pyelftools/)
- [Lee, Avgerinos, Brumley, "TIE: Principled Reverse Engineering of Types in Binary Programs" (NDSS 2011)](https://www.ndss-symposium.org/ndss2011/tie-principled-reverse-engineering-of-types-in-binary-programs/)
- [Noonan, Loginov, Cok, "Polymorphic Type Inference for Machine Code" (PLDI 2016)](https://arxiv.org/abs/1603.05495) 和 [the retypd repository](https://github.com/GrammaTech/retypd)
- [Zhang et al., "OSPREY: Recovery of Variable 和 Data Structure via Probabilistic Analysis for Stripped Binary" (IEEE S&P 2021)](https://ieeexplore.ieee.org/document/9519451/)
- [Chen et al., "Augmenting Decompiler Output with Learned Variable Names 和 Types" (USENIX Security 2022)](https://www.usenix.org/conference/usenixsecurity22/presentation/chen-qibin)
- [Xie et al., "ReSym: Harnessing LLMs to Recover Variable 和 Data Structure Symbols from Stripped Binaries" (CCS 2024)](https://dl.acm.org/doi/10.1145/3658644.3670340)
- [Chen et al., "RecStruct" (USENIX Security 2026)](https://www.usenix.org/conference/usenixsecurity26/presentation/chen-yuxin)
