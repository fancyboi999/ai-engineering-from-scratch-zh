# 程序解剖：从零编写 ELF 读取器

> 编译后的程序是一组相互指向的表。自己写的读取器，输出可以逐字节核对。

**类型：** Build
**语言：** Python（标准库）、C（仅用于夹具）
**前置要求：** 阶段 0 · 01（开发环境），已安装 clang；Python 3.10 或更高版本；十六进制运算
**预计时间：** 约 120 分钟

## 学习目标

- 说明本路线每个目标的授权规则，以及 17 U.S.C. 1201(f) 的四项限制。
- 使用 `struct.unpack` 读取 ELF 头、节头表及两个字符串表。
- 按 gABI 和 x86-64 psABI 的名称解码 `.symtab` 条目和 `.rela` 记录。
- 返回指定函数的精确字节，并将每个文件偏移映射到所属结构。
- 读取程序头，通过 `PT_LOAD` 将虚拟地址映射到文件偏移。
- 读取 Mach-O 目标文件的加载命令，指出其对应的 ELF 概念。

## 开始之前：授权与法律

第 32 至 36 课的所有目标都是你自己编写和编译的程序。源文件 `code/fixtures/ledger.c` 只有四个简短的 C 函数。源代码、编译命令及生成的目标文件都由你掌握。不涉及第三方代码、许可条款或保护机制。本路线不讨论软件保护、许可检查，也不分析不属于你的程序。

设立这条规则，是因为法律将反汇编视为复制。在 *Sega Enterprises Ltd. v. Accolade, Inc.*, 977 F.2d 1510（第九巡回上诉法院，1992 年）中，法院认定反汇编过程中产生的中间副本属于《版权法》所说的复制。法院同时认定：若反汇编是接触受版权保护程序中思想及功能要素的唯一途径，且接触具有正当理由，则反汇编依法构成合理使用。

第二个案例是 *Sony Computer Entertainment, Inc. v. Connectix Corp.*, 203 F.3d 596（第九巡回上诉法院，2000 年）。Connectix 在开发模拟器时复制了 PlayStation BIOS，法院认定这些复制属于合理使用。两案保护了研究行为，都没有保护最终产品中的代码抄袭。

两项法规界定了边界。17 U.S.C. 1201(f) 允许合法取得程序副本使用权的人绕过访问控制，但唯一目的必须是识别和分析实现独立开发程序与其他程序互操作所必需的要素。四项限制须同时满足：副本合法、目的为互操作、信息尚非轻易可得、分析本身不侵权。1201(f) 只例外豁免反规避规则；复制是否合法仍需按合理使用判断。

欧盟 Directive 2009/24/EC 第 5(3) 条涉及研究。拥有副本使用权的人，可以观察、研究或测试程序的运行，以确定程序各要素背后的思想和原理。此权利适用于加载、显示、运行、传输或存储程序的过程。

第 6 条允许在获取独立开发程序互操作所需信息不可或缺时，未经权利人授权进行反编译。条件与 1201(f) 类似：由被许可人实施，信息尚非轻易可得，行为限于必要部分。第 6(2) 条禁止将结果用于其他目的，或用于表达实质相似的程序。第 8 条规定，与第 6 条或第 5(3) 条相抵触的合同条款无效。

| 来源 | 允许的行为 | 条件 |
|---|---|---|
| 17 U.S.C. 1201(f) | 绕过访问控制以分析程序 | 合法副本、互操作目的、信息非轻易可得、不侵权 |
| Directive 2009/24/EC 第 5(3) 条 | 观察、研究和测试运行中的程序 | 拥有副本使用权，行为限于正常加载和运行 |
| Directive 2009/24/EC 第 6 条 | 反编译 | 被许可人、互操作目的、信息非轻易可得、仅限必要部分 |
| *Sega v. Accolade* | 将反汇编认定为合理使用 | 接触思想和功能要素的唯一途径，有正当理由 |
| *Sony v. Connectix* | 逆向工程过程中的中间复制 | 最终产品不侵权 |

以上说明来自法规和判决，不构成法律建议。今后若目标不属于你，应在打开文件前取得书面授权，并与证据一同保存。《逆向工程 101》手册第 2.1 节提供完整引文及欧盟法院案例。

## 问题背景

编译 `ledger.c` 后，对目标文件运行 `llvm-objdump -t`。输出中 `percent_change` 的值是 `0000000000000000`，大小是 `0000000000000010`。这个 1,768 字节文件中的哪 16 个字节属于它？列表还在偏移 `0x36` 处显示 `R_X86_64_PC32 .rodata+0x10`，但文件中该位置的四个字节都是零。它们将变成什么？表从 `0x14` 开始，为什么加数却是 `0x10`？

rea 使用 `inspect_binary_layout` 回答布局问题，但该工具仅在 Linux x64 上可用，且需要 `REA_PWNTOOLS_PYTHON` 指向 pwntools 4.15.0。在这台 Mac 上没有它。`address_to_file_offset` 需要 Ghidra 会话及 SHA-256 匹配的原始文件完整副本。`inspect_artifact` 只按路径和内容哈希列出容器内容，不读取目标文件内部的表。因此，本课用约 950 行无依赖 Python 和 `struct.unpack` 自己实现读取器。测试将每张表与预先捕获到夹具中的 `llvm-objdump` 文本比较。

```figure
elf-byte-map
```

## 文件由相互指向的表构成

System V gABI 第 4 章图 4-1 给出同一文件的两个视图。链接视图包含 ELF 头、可选程序头表、节，以及必需的节头表。执行视图包含 ELF 头、必需的程序头表、段，以及可选节头表。gABI 的一句话支配整个读取器：文件中只有 ELF 头的位置固定。其余结构的位置，都由其他结构中保存的偏移确定。

gABI 还规定了标量类型，并明确 ELF 不使用位域。`Elf64_Addr` 和 `Elf64_Off` 为 8 字节，`Elf64_Half` 为 2 字节，`Elf64_Word` 为 4 字节，`Elf64_Xword` 为 8 字节。x86-64 psABI 第 4.1.1 节要求 `ELFCLASS64`、`ELFDATA2LSB`、`e_machine` 为 `EM_X86_64`（62）、`e_flags` 为 0。固定宽度加小端序，意味着带 `<` 前缀的 `struct.unpack` 一次即可读完整条记录。

`ledger-x86_64-O1.o` 的前 64 字节：

```text
00000000: 7f45 4c46 0201 0100 0000 0000 0000 0000  .ELF............
00000010: 0100 3e00 0100 0000 0000 0000 0000 0000  ..>.............
00000020: 0000 0000 0000 0000 2804 0000 0000 0000  ........(.......
00000030: 0000 0000 4000 0000 0000 4000 0b00 0100  ....@.....@.....
```

对照 gABI 的“ELF Header”页面读取。`e_ident` 共 16 字节：`7f 45 4c 46` 是魔数，class 2 表示 64 位，data 1 表示小端，version 1，OS ABI 0 表示 System V，后面为填充。

随后，`e_type` `0x0001` 为 `ET_REL`，表示可重定位目标文件。`e_machine` `0x003e` 即 62，为 `EM_X86_64`。目标文件没有入口点，所以 `e_entry` 为零；没有程序头，所以 `e_phoff` 为零。`e_shoff` `0x428` 是节头表的文件偏移。最后一行包含 `e_ehsize` `0x40`、`e_phentsize` 0、`e_phnum` 0、`e_shentsize` `0x40`、`e_shnum` `0x0b`（11 个头）和 `e_shstrndx` `0x0001`。

读取器用一次调用处理这行数据：

```python
fields = struct.unpack_from("<HHIQQQIHHHHHH", data, 16)
```

格式字符串从左到右对应 gABI 图示：两个半字、一个字、三个 8 字节值、一个字和六个半字。读取器拒绝魔数、类别或字节序不符的文件，也拒绝不是 64 和 56 的 `e_shentsize` 与 `e_phentsize`。宽度错误会使后续所有偏移失效，因此必须先检查。

## 节头与两个字符串表

每个节头是 64 字节的 `Elf64_Shdr`（gABI 图 4-8）：`sh_name`、`sh_type`、`sh_flags`、`sh_addr`、`sh_offset`、`sh_size`、`sh_link`、`sh_info`、`sh_addralign`、`sh_entsize`。格式字符串为 `<IIQQQQIIQQ`。`sh_name` 是索引 `e_shstrndx` 所指节中的偏移，名称到首个零字节结束。本目标文件中 `e_shstrndx` 为 1，clang 将该节命名为 `.strtab`，因此同一张表同时保存节名和符号名。

读取器打印 -O1 目标文件的 11 个节头：

```text
Idx Name             Type         Flags   Offset     Size       Addr Link Info Align
  0                  NULL                    0x0      0x0        0x0    0    0     0
  1 .strtab          STRTAB                0x368     0xbe        0x0    0    0     1
  2 .text            PROGBITS     AX        0x40     0x9f        0x0    0    0    16
  3 .rela.text       RELA         I        0x2a8     0x48        0x0   10    2     8
  4 .rodata          PROGBITS     A         0xe0     0x50        0x0    0    0     8
  5 .rela.rodata     RELA         I        0x2f0     0x78        0x0   10    4     8
  6 .rodata.str1.1   PROGBITS     AMS      0x130      0xa        0x0    0    0     1
  7 .comment         PROGBITS     MS       0x13a     0x2f        0x0    0    0     1
  8 .note.GNU-stack  PROGBITS              0x169      0x0        0x0    0    0     1
  9 .llvm_addrsig    LLVM_ADDRSIG E        0x368      0x0        0x0   10    0     1
 10 .symtab          SYMTAB                0x170    0x138        0x0    1    9     8
```

索引 0 是保留的空节头。`.text` 紧接 ELF 头，从文件偏移 `0x40` 开始保存 159 字节代码，标志 `A` 表示分配到内存，`X` 表示可执行。`.rodata` 保存 80 字节只读数据。`.rodata.str1.1` 保存五个标签字符串 `F\0D\0C\0B\0A\0`，共 10 字节，标志 `M` 表示可合并，`S` 表示字符串。

`.comment` 保存 47 字节的编译器印记 `\0Apple clang version 17.0.0 (clang-1700.6.3.2)\0`。`.llvm_addrsig` 的类型为 `0x6fff4c03`，处于 gABI 保留给操作系统的 `SHT_LOOS` 到 `SHT_HIOS` 范围，名称由 LLVM 的 `ELF.h` 定义。它的 `E` 标志是 `SHF_EXCLUDE`，链接器会将其丢弃。

`sh_link` 和 `sh_info` 是表之间的指针。`.rela.text` 的 `sh_info` 为 2、`sh_link` 为 10：它修补节 2，并从节 10 取得符号。`.symtab` 的 `sh_link` 为 1，指向符号名称字符串表；`sh_info` 为 9，是首个非局部符号的索引。每行的 `sh_addr` 都是零，因为目标文件还没有地址，地址由链接器分配。

gABI 的两条规则允许读取器画出完整文件映射：节连续且不重叠，文件也可能有未使用空间。读取器按偏移排序所有结构，并补出空隙：

```text
     0x0 +64    header   ELF header
    0x40 +159   section  .text
    0xdf +1     gap      inactive space
    0xe0 +80    section  .rodata
   0x130 +10    section  .rodata.str1.1
   0x13a +47    section  .comment
   0x169 +7     gap      inactive space
   0x170 +312   section  .symtab
   0x2a8 +72    section  .rela.text
   0x2f0 +120   section  .rela.rodata
   0x368 +190   section  .strtab
   0x426 +2     gap      inactive space
   0x428 +704   table    section header table
```

三处空隙共 10 字节，全部用于对齐。`.rodata` 的 `sh_addralign` 为 8，因此从 `0xe0` 而非 `0xdf` 开始。`.symtab` 按 8 字节对齐，故 `.comment` 后留空 7 字节。节头表本身也按 8 字节对齐。

`SHT_NOBITS` 类型的节不占文件字节，映射必须跳过。本目标文件没有这种节。链接后程序的 `.bss` 属于此类；若读取器盲信其 `sh_size`，就会读出文件范围。

## 符号：绑定、类型、节、值和大小

`Elf64_Sym` 共 24 字节（gABI 图 4-18）：`st_name`、`st_info`、`st_other`、`st_shndx`、`st_value`、`st_size`，格式为 `<IBBHQQ`。`st_info` 的高四位是绑定，低四位是类型。gABI 定义绑定 `STB_LOCAL` 0、`STB_GLOBAL` 1、`STB_WEAK` 2；类型为 `STT_NOTYPE` 0、`STT_OBJECT` 1、`STT_FUNC` 2、`STT_SECTION` 3、`STT_FILE` 4。`st_other` 低两位保存可见性，此处均为 `STV_DEFAULT` 0。

```text
Idx            Value   Size Bind   Type    Section          Name
  0              0x0      0 LOCAL  NOTYPE  *UND*
  1              0x0      0 LOCAL  FILE    *ABS*            ledger.c
  2              0x0     20 LOCAL  OBJECT  .rodata          labels.rel
  3              0x0      0 LOCAL  SECTION .rodata          .rodata
  4              0x2      2 LOCAL  OBJECT  .rodata.str1.1   .L.str.1
  5              0x4      2 LOCAL  OBJECT  .rodata.str1.1   .L.str.2
  6              0x6      2 LOCAL  OBJECT  .rodata.str1.1   .L.str.3
  7              0x8      2 LOCAL  OBJECT  .rodata.str1.1   .L.str.4
  8              0x0      0 LOCAL  SECTION .rodata.str1.1   .rodata.str1.1
  9              0x0     16 GLOBAL FUNC    .text            percent_change
 10             0x10     46 GLOBAL FUNC    .text            grade
 11             0x40     31 GLOBAL FUNC    .text            total
 12             0x60     63 GLOBAL FUNC    .text            grade_label
```

索引 0 是保留的未定义符号。`st_shndx` 指明定义该符号的节，另有三个保留值：`SHN_UNDEF` 0、用于文件名的 `SHN_ABS` `0xfff1`，以及 `SHN_COMMON` `0xfff2`。节符号名称为空，`llvm-objdump` 因而显示节本身的名称，读取器也这样处理。gABI 要求所有 `STB_LOCAL` 符号排在弱符号和全局符号之前，所以前九行是局部符号，`.symtab` 的 `sh_info` 也因此记录为 9。

在可重定位目标文件中，`sh_addr` 为零，`st_value` 就是符号在所属节中的偏移。因此函数文件偏移为 `sh_offset + st_value - sh_addr`，长度为 `st_size`：

```python
section = elf.sections[symbol.st_shndx]
file_offset = section.sh_offset + (symbol.st_value - section.sh_addr)
code = elf.data[file_offset : file_offset + symbol.st_size]
```

对 `percent_change`，偏移是 `0x40 + 0`，16 个字节为 `85 ff 74 09 29 fe 6b c6 64 99 f7 ff c3 31 c0 c3`。大小与起点同样重要。`grade` 在 `.text` 偏移 `0x3e` 结束，随后两个字节 `66 90` 是编译器插入的 `nop`，让 `total` 从 16 字节边界 `0x40` 开始。这两个字节不属于任何符号。第 33 课以 `st_size` 作为反汇编停止条件，第 36 课在比较重建结果前将这些字节屏蔽。

## 重定位：零字节的含义

`Elf64_Rela` 共 24 字节（gABI 图 4-23）：`r_offset`、`r_info`、有符号的 `r_addend`，格式 `<QQq`。gABI 用两个宏拆开 `r_info`：`ELF64_R_SYM(i)` 为 `i >> 32`，`ELF64_R_TYPE(i)` 为 `i & 0xffffffff`。在可重定位文件中，`r_offset` 是表的 `sh_info` 所指节内部的偏移。类型名和公式来自 x86-64 psABI 表 4.9。`S` 是符号值，`A` 是加数，`P` 是修补位置，`L` 是 PLT 条目。`R_X86_64_64` 为 `S + A`，`R_X86_64_PC32` 为 `S + A - P`，`R_X86_64_PLT32` 为 `L + A - P`。

-O1 目标文件包含八条记录：

```text
  .rela.text       0x36 R_X86_64_PC32          .rodata+0x10
  .rela.text       0x84 R_X86_64_PC32          .rodata+0x24
  .rela.text       0x93 R_X86_64_PC32          .rodata-0x4
  .rela.rodata      0x0 R_X86_64_PC32          .rodata.str1.1
  .rela.rodata      0x4 R_X86_64_PC32          .L.str.1+0x4
  .rela.rodata      0x8 R_X86_64_PC32          .L.str.2+0x8
  .rela.rodata      0xc R_X86_64_PC32          .L.str.3+0xc
  .rela.rodata     0x10 R_X86_64_PC32          .L.str.4+0x10
```

拆解第一条。偏移 `0x36` 位于范围 `0x10` 至 `0x3e` 的 `grade` 内。`0x33` 处的指令是 `48 8d 0d 00 00 00 00`，即读取 RIP 相对地址的 `lea`；其四字节位移位于 `0x36`。处理器将位移加到下一条指令地址 `0x3a`。

编译器希望结果为 `.rodata + 0x14`，这里开始存放五个 32 位值 `1, 2, 3, 4, 4`。所以写入值必须是 `(.rodata + 0x14) - 0x3a`。在 `S + A - P` 中代入 `P = 0x36` 得 `.rodata + A - 0x36`，令两式相等，得 `A = 0x14 - 4 = 0x10`。加数等于目标偏移减去位移字段到指令末尾的四个字节。

这是 clang 在 -O1 下编译 `grade` 中 `switch` 的方式。代码通过乘 `0x66666667` 和两次移位计算 `score / 10`，再减 6、与 4 比较并索引表。-O1 ELF 目标文件不为该表保留符号，而以节符号 `.rodata` 加一个加数引用。只有同一源码的 arm64 构建将其命名为 `l_switch.table.grade`。第二条记录位于 `grade_label` 的 `0x84`，指向 `.rodata + 0x28` 处另一张 8 字节值表。第三条位于 `0x93`，指向 `.rodata + 0x0`，即 `labels.rel` 的起点。

五条 `.rela.rodata` 记录填充 `labels.rel`。每项位于偏移 `4i`，加数也为 `4i`，因此 `S + A - P` 化简为字符串地址减表基址。`grade_label` 用 `movslq` 读取条目，再加回表基址得到指针。第一条记录指向节符号 `.rodata.str1.1`，加数为 0，因为字符串 `F` 位于该节首字节。其余记录指向 `.L.str.1` 到 `.L.str.4`，即编译器为 `D`、`C`、`B`、`A` 生成的局部标签。

同一源码在三个优化级别生成三种表。无需反汇编器，读取器就能显示差异：

| 构建 | `labels` 的位置 | `grade` 的选择方式 | `grade_label` 如何调用 `grade` |
|---|---|---|---|
| -O0 | `.data`，五个 8 字节指针，五条 `R_X86_64_64` 记录 | `.rodata` 中的跳转表，五条指向 `.text` 的 `R_X86_64_PC32` 记录 | 带 `R_X86_64_PLT32 grade-0x4` 的调用 |
| -O1 | `.rodata` 中的 `labels.rel`，五个 32 位相对条目 | `.rodata+0x14` 的值表，一条 `R_X86_64_PC32` | 内联，无调用 |
| -O2 | 同 -O1 | 同 -O1 | 内联，`total` 增至 140 字节 |

-O0 下的 `switch` 是真正的跳转表，五个条目回指 `.text` 的 `+0x91`、`+0x8c`、`+0x87`、`+0x82`、`+0x86`。调用 `grade` 的加数也是 `-0x4`，原因与 `lea` 相同。-O1 下优化器发现每个分支都返回常量，将跳转换成结果表。第 33 课将解码这两种形式。

## 程序头：加载器视图

可重定位目标文件没有程序头，所以 `e_phnum` 为 0。可执行文件或共享对象有程序头，而加载器只读取程序头。`Elf64_Phdr` 共 56 字节（gABI 图 5-1）：`p_type`、`p_flags`、`p_offset`、`p_vaddr`、`p_paddr`、`p_filesz`、`p_memsz`、`p_align`，格式 `<IIQQQQQQ`。gABI 为 `PT_LOAD` 规定三条规则：按 `p_vaddr` 升序排列；`p_memsz` 大于 `p_filesz` 的部分填零；`p_vaddr` 与 `p_offset` 模 `p_align` 同余。

本路线所有目标都由你自己构建，而这台 Mac 的链接器无法把 `ledger.o` 链接为 Linux 可执行文件。因此夹具 `tiny-x86_64` 由 `code/fixtures/build_tiny_elf.py` 通过 `struct.pack` 写出，共 736 字节。文件包含 ELF 头、两个程序头、36 字节 `_start`、3 字节 `.rodata`、符号表及六个节头。`_start` 向文件描述符 1 写入 `ok\n`，然后以状态 42 退出。它能在 Linux x86-64 运行；在此用来测试程序头读取路径。

```text
Program headers:
  PT_LOAD          r-x offset=0x0 vaddr=0x400000 filesz=0x2e0 memsz=0x2e0 align=0x1000
  PT_GNU_STACK     rw- offset=0x0 vaddr=0x0 filesz=0x0 memsz=0x0 align=0x10

entry 0x4000b0 is file offset 0xb0 through PT_LOAD
```

唯一的 `PT_LOAD` 将整个 736 字节文件映射到 `0x400000`。读取器查找包含地址的 `PT_LOAD`，再计算 `p_offset + (address - p_vaddr)`。对入口点，结果为 `0 + (0x4000b0 - 0x400000) = 0xb0`，即 `.text` 的起点。

rea 的 `address_to_file_offset` 背后也是这个计算。Ghidra 目标返回 `{address, file_offset}`；Hopper provider 还返回 `provider_file_offset` 和 `image_base_file_offset`。工具需要完整原文件副本，且 SHA-256 必须与目标匹配。rea 的 `inspect_binary_layout` 文档有一句应牢记：链接地址不是运行时地址。位置无关可执行文件的加载基址由内核决定，文件偏移才是稳定坐标。

程序头也解释了为什么剥离符号后的可执行文件仍能运行。链接器可以完全删除节头表，使 `e_shoff` 为零。遍历节的工具会看不到内容，但加载器本来就不依赖节头表。

## Mach-O 中的对应概念

Apple 未发布 Mach-O 的文字规范，XNU 源码中的头文件就是规范：`EXTERNAL_HEADERS/mach-o/loader.h`、`nlist.h`、`reloc.h`。夹具 `ledger-arm64-O1.o` 由同一份 `ledger.c` 使用 `clang -target arm64-apple-macos -O1 -fno-asynchronous-unwind-tables -c` 构建。

`mach_header_64` 共 32 字节：`magic`、`cputype`、`cpusubtype`、`filetype`、`ncmds`、`sizeofcmds`、`flags`、`reserved`。魔数是 `0xfeedfacf`，即 `MH_MAGIC_64`；`cputype` `0x0100000c` 为 `CPU_TYPE_ARM64`；`filetype` 1 为 `MH_OBJECT`。`ncmds` 为 5，`sizeofcmds` 为 616，表示加载命令占据头后 616 字节，每条以 `{cmd, cmdsize}` 开头。标志 `0x2000` 为 `MH_SUBSECTIONS_VIA_SYMBOLS`。

```text
Load commands:
  0 LC_SEGMENT_64                cmdsize=472 at 0x20
  1 LC_BUILD_VERSION             cmdsize=24 at 0x1f8
  2 LC_LINKER_OPTIMIZATION_HINT  cmdsize=16 at 0x210
  3 LC_SYMTAB                    cmdsize=24 at 0x220
  4 LC_DYSYMTAB                  cmdsize=80 at 0x238
```

`LC_SEGMENT_64`（0x19）同时对应 ELF 的两类表。它的 `segment_command_64` 包含 `segname`、`vmaddr`、`vmsize`、`fileoff`、`filesize`、`maxprot`、`initprot`、`nsects`、`flags`。同一命令后接 `nsects` 个各 80 字节的 `section_64`。`loader.h` 对 `MH_OBJECT` 的注释说，所有节都在一个没有段填充的无名段中。夹具正是如此：段名为空，`fileoff` 648，`filesize` 456，共五个节。

```text
  Idx Section                    Addr   Size Offset Reloff Nreloc Type
    1 __TEXT,__text               0x0   0xd0    648   1104      6 S_REGULAR
    2 __DATA,__const             0xd0   0x28    856   1152      5 S_REGULAR
    3 __TEXT,__cstring           0xf8    0xa    896      0      0 S_CSTRING_LITERALS
    4 __TEXT,__const            0x108   0x40    912      0      0 S_REGULAR
    5 __LD,__compact_unwind     0x148   0x80    976   1192      4 S_REGULAR
```

每个节通过 `segname` 指明父段，因此两个 `__const` 不会混淆：一个是 `__DATA,__const`，另一个是 `__TEXT,__const`。重定位由各节的 `reloff` 和 `nreloc` 定位；ELF 则为每个目标设置独立的 `.rela.X` 节。

每个 `relocation_info` 为 8 字节，先是有符号的 `r_address`，再是一个 32 位字段，打包 `r_symbolnum`（24 位）、`r_pcrel`（1 位）、`r_length`（2 位）、`r_extern`（1 位）、`r_type`（4 位）。六条 `__text` 记录是三对 `ARM64_RELOC_PAGE21` 和 `ARM64_RELOC_PAGEOFF12`，每次表引用占一对。arm64 的 `adrp` 加 `add` 完成 x86-64 一条 `lea` 的工作，所以一次引用需要两条记录。五条 `__DATA,__const` 记录是 `ARM64_RELOC_UNSIGNED`，`r_length` 为 3，各修补一个 8 字节绝对指针。

-O1 下 arm64 构建仍将 `labels` 存为普通指针，而 x86-64 构建生成相对表。

`LC_SYMTAB`（0x2）包含 `symoff` 1240、`nsyms` 17、`stroff` 1512、`strsize` 176。1512 加 176 等于文件大小 1688。每个 `nlist_64` 为 16 字节：`n_strx`、`n_type`、`n_sect`、`n_desc`、`n_value`。`n_type` 是位域。`N_TYPE`（掩码 `0x0e`）等于 `N_SECT`（`0xe`）表示符号定义在 `n_sect` 指定的节中，节序号从 1 开始。`N_EXT`（`0x01`）标记外部符号。

`nlist_64` 没有大小字段。读取器以同节下一个符号 `_grade` 的地址 `0x18` 为终点，得到 `_percent_change` 的 24 个字节。此处 C 符号以 `_` 开头，因此函数名为 `_percent_change`。

`LC_DYSYMTAB`（0xb）记录了与 ELF `sh_info` 相同的局部符号优先规则：`ilocalsym` 0、`nlocalsym` 13、`iextdefsym` 13、`nextdefsym` 4。`LC_BUILD_VERSION`（0x32）用打包的 `XXXX.YY.ZZ` 整数记录 `platform` 1（macOS）、`minos` 26.0、`sdk` 26.2。这也是将 arm64 夹具以字节提交的原因：不同 SDK 的 Mac 构建会生成不同文件。

读取器的 `compare_formats` 并排比较两个文件：

| 概念 | ELF，`ledger-x86_64-O1.o` | Mach-O，`ledger-arm64-O1.o` |
|---|---|---|
| 文件标识 | `e_ident` `7f 45 4c 46`，64 位、小端 | `magic` `0xfeedfacf` |
| 机器类型 | `e_machine` 62，`EM_X86_64` | `cputype` `0x100000c`，`CPU_TYPE_ARM64` |
| 文件类型 | `e_type` 1，`ET_REL` | `filetype` 1，`MH_OBJECT` |
| 表的位置 | `e_shoff` `0x428`，11 个节头 | 5 条加载命令，占头后 616 字节 |
| 代码 | `.text` 在 `0x40`，大小 `0x9f`，标志 `AX` | `__TEXT,__text` 在 648，大小 `0xd0`，位于无名段 |
| 符号名称 | `.symtab`（节 10），通过 `sh_link` 1 在 `.strtab` 取名 | `LC_SYMTAB` `symoff` 1240、`nsyms` 17，名称在 `stroff` 1512 |
| 符号大小 | `st_size`：`percent_change` 为 16 字节 | 无字段：下个符号减当前符号，为 24 字节 |
| 重定位 | `.rela.text`，3 条 `R_X86_64_PC32` | `__text` `reloff` 1104，6 条 `PAGE21` 和 `PAGEOFF12` |
| 函数字节 | `percent_change`：`0x40` 处 16 字节 | `_percent_change`：`0x288` 处 24 字节 |

rea 通过 `inspect_macho` 读取 Mach-O，该工具经 `xcrun` 运行 `otool -h -l`、`nm -gjU`、`dyld_info -imports -exports`、`dwarfdump --uuid`。你的读取器无需这些工具，也能读出 `otool -l` 打印的同一组 `symoff` 和 `stroff`。rea 的 `open_binary` 通过魔数识别 ELF、MZ、PE、单架构或通用 Mach-O，并直接读取偏移 18 处的 `e_machine`，正是本课实现的前 20 字节。对无头文件，需要提供 `format: raw-binary`、架构和入口地址。Ghidra provider 拒绝通用二进制，要求先提取单架构切片；读取器看到 `0xcafebabe` 时也这样处理。

## 动手构建

运行标准库读取器：

```bash
cd phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch
python3 code/main.py
```

演示先读取 `ledger-x86_64-O1.o`，打印头、节、符号、重定位及文件偏移映射，再打印四个函数的字节串。随后读取 `ledger-arm64-O1.o` 并输出对照表，最后打印 `tiny-x86_64` 的程序头。预期输出行：

```text
percent_change: 16 bytes at file offset 0x40: 85 ff 74 09 29 fe 6b c6 64 99 f7 ff c3 31 c0 c3
grade: 46 bytes at file offset 0x50: 48 63 c7 48 69 c0 67 66 66 66 ...
entry 0x4000b0 is file offset 0xb0 through PT_LOAD
```

传入路径即可读取单个文件：`python3 code/main.py code/fixtures/ledger-x86_64-O0.o`。读取器根据前四个字节选择 ELF 或 Mach-O。

按以下顺序阅读 `code/main.py`：

1. `ElfFile._read_header()` 检查魔数、类别、字节序和条目大小，然后解包头。
2. `ElfFile._read_sections()` 和 `read_cstring()` 读取节头表，并通过 `e_shstrndx` 解析名称。
3. `ElfFile._read_symbols()` 拆解 `st_info`，通过 `sh_link` 解析名称，并为保留节索引提供可读表示。
4. `ElfFile._read_relocations()` 遍历所有 `SHT_RELA` 节，拆解 `r_info`，按表 4.9 命名类型。
5. `ElfFile.function_span()` 和 `function_bytes()` 将符号转为文件范围及其中的字节。
6. `ElfFile.file_offset_map()` 按偏移排序所有结构，并补出未使用空间。
7. `ElfFile._read_program_headers()` 和 `address_to_file_offset()` 处理可执行文件。
8. `MachOFile` 读取头、加载命令、`LC_SEGMENT_64` 及其节、`LC_SYMTAB`、`LC_BUILD_VERSION` 和各节重定位。
9. `compare_formats()` 使用两个文件中读出的值，对照同一概念。

## 实际使用

后续课程先将本课 `code` 目录加入 `sys.path`，再用 `from main import ElfFile` 导入。第 33 课调用 `function_bytes` 和 `relocations_for(".text")`；第 35 课将输出记录为观察证据；第 36 课获取重定位偏移，在字节比较前屏蔽它们。

用相同的 `clang -target x86_64-unknown-linux-gnu -c` 命令将自己的 C 程序编译为目标文件，再运行读取器。只有 x86-64 psABI 表 4.9 中列出的重定位才添加名称；只有 gABI 或生成文件的工具链文档说明过的节类型才添加名称。遇到未命名值，输出十六进制数字，不猜测。

## 交互实验

### 实验 A：手读头部

在 `code` 目录启动 Python：

```bash
cd phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/code
python3 -q
```

运行：

```python
import struct
from main import ElfFile, FIXTURES
data = (FIXTURES / "ledger-x86_64-O1.o").read_bytes()
data[:4], data[4], data[5]
struct.unpack_from("<HHIQQQIHHHHHH", data, 16)
elf = ElfFile(data)
elf.header.e_shoff, elf.header.e_shnum, elf.sections[elf.header.e_shstrndx].name
```

元组显示 `e_type` 1、`e_machine` 62、`e_shoff` 1064，即 `0x428`。最后一行说明节 1 `.strtab` 保存节名。

### 实验 B：switch 背后的值表

```python
rodata = elf.section_bytes(elf.section(".rodata"))
[int.from_bytes(rodata[i : i + 4], "little") for i in range(0x14, 0x28, 4)]
[int.from_bytes(rodata[i : i + 8], "little") for i in range(0x28, 0x50, 8)]
[r for r in elf.relocations_for(".text") if r.symbol == ".rodata"]
```

两张表都读出 `1, 2, 3, 4, 4`。对照 `ledger.c`：`grade(65)` 计算 `65 / 10 - 6 = 0`，读取条目 0 得到 1，即 `case 6` 的值。`grade(100)` 读取条目 4 得到 4，即 `case 10` 与 `case 9` 共用的值。

### 实验 C：一份源码，三种构建

```python
for level in ("O0", "O1", "O2"):
    obj = ElfFile.from_path(FIXTURES / f"ledger-x86_64-{level}.o")
    print(level, [s.name for s in obj.sections if s.name in (".data", ".rodata")])
    print(level, sorted({r.type_name for r in obj.relocations}))
    print(level, {s.name: s.st_size for s in obj.symbols if s.type == "FUNC"})
```

-O0 目标文件有 `.data` 节和三种重定位类型。-O1、-O2 没有 `.data`，只有一种重定位类型。`total` 在 -O0 下为 66 字节，-O1 下为 31 字节，-O2 下为 140 字节。

### 实验 D：Mach-O 中的同一函数

```python
from main import MachOFile
macho = MachOFile.from_path(FIXTURES / "ledger-arm64-O1.o")
[(c.name, c.cmdsize) for c in macho.load_commands]
macho.function_span("_percent_change")
macho.function_bytes("_percent_change")[:4].hex()
```

范围为文件偏移 648 处的 24 字节。前四字节 `a0000034` 是指令 `0x340000a0` 的小端表示，`llvm-objdump -d` 将其打印为 `cbz w0, 0x14`。这是 `before == 0` 的保护分支，与 x86-64 构建中 `85 ff 74 09` 编码的检查相同。

## 实践实验

将读取器扩展到已链接程序。在 Linux x86-64 上运行 `clang -O1 -shared -fPIC code/fixtures/ledger.c -o libledger.so`；自行添加 `main` 后运行 `clang -O1 code/fixtures/ledger.c -o ledger_main`，再用读取器读取两个文件。

要求：

- 以相同的 `Elf64_Sym` 布局读取 `.dynsym`，因为 `SHT_DYNSYM` 为 11，而记录格式不变。
- 将 `.dynamic` 读取为包含 `d_tag` 和 `d_val` 的 `Elf64_Dyn` 记录，并按 gABI“Dynamic Section”页面命名 `DT_NEEDED`、`DT_STRTAB`、`DT_SYMTAB`、`DT_RELA`、`DT_JMPREL`。
- 将 `st_shndx` 为 `SHN_UNDEF` 的未定义符号列为导入，将 `.rela.plt` 中的 `R_X86_64_JUMP_SLOT` 记录列为到达这些导入的调用位置。
- 按 gABI“一个目标文件段包含一个或多个节”的规则，将每个 `PT_LOAD` 段映射到包含的节。
- 用 `address_to_file_offset` 证明共享对象中每个已定义函数的字节与 `function_bytes` 返回结果相同。
- 将两个文件的 `llvm-objdump -h -t -r -p` 与 `llvm-objdump -T` 输出保存到 `code/fixtures/`，在测试中对照读取器结果。

导入列表、段映射及每个函数范围都应与捕获的工具输出一致，且测试期间不运行工具。

## 编程练习

本课的夹具包含五个问题。用你构建的代码找出答案，并写入 `code/lab_answers.json`。数值可直接写数字，或写成 `"0x40"` 这样的十六进制字符串；列表使用 JSON 数组。

1. `t1`：`ledger-x86_64-O1.o` 的 `e_shoff`，填写数值。
2. `t2`：该文件中 `percent_change` 的 `st_size`。
3. `t3`：该文件中 `.text` 的文件偏移，填写十六进制。
4. `t4`：`ledger-x86_64-O0.o` 中的重定位类型名，排序后以列表填写。
5. `t5`：`ledger-x86_64-O1.o` 中 `.rodata+0x14` 的五个整数。

检查答案：

```bash
cd phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch
python3 code/lab.py
```

检查器会用 `code/main.py` 和已提交夹具计算答案，并为每项输出 `PASS`、`FAIL` 或 `TODO` 及总分。只有五项全部通过时，命令才以状态码 0 退出。可运行 `python3 code/lab.py my-answers.json` 检查另一份答案。`code/tests/test_lab.py` 会验证检查器既接受正确答案，也拒绝错误答案。

### 交互图解

[Inside a Decompiler](https://aieng-zh.cn/inside-a-decompiler) 模拟了本课的前两个工位：卷轴读取保存 `percent_change` 的目标文件头，工作台打开 `.text` 并读取符号。关闭 Symbols 后，可以观察符号表提供了哪些事实。

## 交付产物

本课生成 `outputs/skill-program-anatomy-elf-from-scratch.md`，可用于 Claude、Cursor、Codex、OpenClaw、Hermes 或任何读取 SKILL.md 的 agent。该技能将用户自己构建的目标文件或可执行文件转成布局报告，给出每个结构、符号和重定位的文件范围，并与捕获的工具输出核对。

## 验证

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

测试证明：

- 三个 x86-64 目标文件与微型可执行文件中，每个节的索引、名称、大小、地址、类型都与捕获的 `llvm-objdump -h` 一致。
- 每个符号的值、绑定、类型、节、大小和名称都与 `llvm-objdump -t` 一致。
- 每项重定位的偏移、类型名、符号和加数都与 `llvm-objdump -r` 一致，包括 -O0 的 `R_X86_64_PLT32` 与 `R_X86_64_64`。
- `tiny-x86_64` 的两个程序头与 `llvm-objdump -p` 一致，目标文件没有程序头。
- `percent_change` 在文件偏移 `0x40` 处，长 16 字节，内容符合预期；所有函数都在 `.text` 内。
- 文件偏移映射恰好覆盖每个夹具的所有字节一次，-O1 的三处对齐空隙位置正确。
- `tiny-x86_64` 的入口点通过 `PT_LOAD` 映射到文件偏移 `0xb0`，可重定位目标文件拒绝地址映射。
- Mach-O 头、每条加载命令、段、五个节、`LC_SYMTAB`、`LC_BUILD_VERSION` 均与捕获的 `--private-headers` 一致。
- Mach-O 符号和 15 项重定位与 `llvm-objdump` 一致，`_percent_change` 在偏移 648 处，长 24 字节。
- 错误魔数、32 位类别、大端文件、截断表、通用二进制及 C 源文件都会引发 `FormatError`。
- `build_tiny_elf.py` 逐字节重现已提交的 `tiny-x86_64`。
- figure 模块 `site/figures-re-32.js` 携带 `ledger-x86_64-O1.o` 的精确字节。

## 生产故障模式

| 故障 | 粗略读取的报告 | 读取器必须证明的事实 |
|---|---|---|
| 将 `st_value` 当成文件偏移 | “`percent_change` 在 0” | 偏移为 `sh_offset + st_value - sh_addr`，这里为 `0x40` |
| 将填充计入代码 | “`grade` 为 48 字节” | `st_size` 为 46，后面的 `66 90` 不属于任何符号 |
| 从错误的表读取节名 | 乱码名称或异常 | `e_shstrndx` 指明名称表，此处为节 1 |
| 对 `SHT_NOBITS` 盲信 `sh_size` | 读出文件末尾 | `.bss` 不占文件字节，映射应跳过 |
| 把零字节当成操作数 | “`lea 0(%rip)`” | `0x36` 的 `.rela.text` 记录指向 `.rodata+0x10` |
| 将加数当成目标偏移 | “表从 `0x10` 开始” | `S + A - P` 结合指令末尾得出 `0x14` |
| 在剥离后的可执行文件上只遍历节 | “文件没有代码” | `PT_LOAD` 映射加载器使用的每个地址 |
| 将链接地址当成运行时地址 | 随机基址下偏移错误 | `PT_LOAD` 得出的文件偏移是稳定坐标 |
| 只按 `sectname` 查找 Mach-O 节 | 两个 `__const` 合为一个 | 名称应为 `segname,sectname` |
| 期待 `nlist_64` 有大小字段 | 异常或零字节 | 同节下一个符号确定函数终点 |
| 将通用二进制当作单个 Mach-O | “未知魔数 `0xcafebabe`” | 拒绝，并要求提取单架构切片 |
| 在另一台 Mac 重建 arm64 目标文件 | “夹具变了” | `LC_BUILD_VERSION` 记录 SDK，因此以已提交字节为夹具 |

## 操作规则

读取可信的头，沿其偏移寻找结构，按定义它的规范为每个字段命名。将比较过的工具输出提交为夹具，使测试无需运行原工具。规范没有名称的值，就打印数字。能逐字节核对的读取器，是后续所有课程的基础。

## 延伸阅读

- [System V gABI 第 4 章：目标文件](https://www.sco.com/developers/gabi/latest/ch4.intro.html)，以及 [ELF 头](https://www.sco.com/developers/gabi/latest/ch4.eheader.html)、[节](https://www.sco.com/developers/gabi/latest/ch4.sheader.html)、[符号表](https://www.sco.com/developers/gabi/latest/ch4.symtab.html)、[重定位](https://www.sco.com/developers/gabi/latest/ch4.reloc.html)
- [System V gABI 第 5 章：程序头](https://www.sco.com/developers/gabi/latest/ch5.pheader.html)与[动态链接](https://www.sco.com/developers/gabi/latest/ch5.dynamic.html)
- [System V ABI，AMD64 架构处理器补充规范](https://gitlab.com/x86-psABIs/x86-64-ABI)，表 4.9 重定位类型
- [Apple XNU `loader.h`](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/loader.h)、[`nlist.h`](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/nlist.h)、[`reloc.h`](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/reloc.h)
- [17 U.S.C. 1201](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title17-section1201&num=0&edition=prelim)与 [Directive 2009/24/EC](https://eur-lex.europa.eu/eli/dir/2009/24/oj/eng)
- [Sega v. Accolade, 977 F.2d 1510](https://law.resource.org/pub/us/case/reporter/F2/977/977.F2d.1510.92-15655.html)与 [Sony v. Connectix, 203 F.3d 596](https://law.resource.org/pub/us/case/reporter/F3/203/203.F3d.596.99-15852.html)
- [rea 6.5.0 `docs/binary-diagnostics.md`](https://github.com/morluto/rea/blob/rea-agents-6.5.0/docs/binary-diagnostics.md)与 [`docs/ghidra-provider.md`](https://github.com/morluto/rea/blob/rea-agents-6.5.0/docs/ghidra-provider.md)
