# 链接、加载与剥离符号后的二进制：PLT、GOT、导入、修正与函数识别

> 链接后的程序会调用自身不包含的函数。本课读取链接器为这些调用写入的三种格式的表，沿一次调用追踪到加载器填充的槽，并在构建失去名称后找回其中的函数。

**类型：** Build
**语言：** Python, C, x86-64 and arm64 assembly
**前置要求：** 阶段 13 · 32（从零构建 ELF）、33（反汇编与控制流）、38（调用约定）
**预计时间：** ~160 分钟

## 学习目标

- 根据重定位记录和符号表，判断链接器会生成什么：固定距离、带 GOT 槽的 PLT 条目，还是动态重定位。
- 读取位置无关 ELF 可执行文件的动态节、PLT 和 GOT，并用 psABI 公式沿一次调用追踪它们。
- 读取 COFF 目标文件（20 字节文件头、40 字节节条目、18 字节符号、10 字节重定位），以及 PE32+ 映像的导入、导出和基址重定位目录。
- 逐字解码 Mach-O 链式修正，并把每个字与 `dyld_info` 对照。
- 说明每种格式中 `strip` 删除什么、保留什么，并运行剥离符号后的程序证明它仍可工作。
- 用 `LC_FUNCTION_STARTS`、序言扫描和调用目标还原已剥离符号的 arm64 构建的函数起点，对照未剥离副本的符号表为各方法评分，并用 FLIRT 式签名命名函数。

## 问题背景

你将 `main.c` 与 `libledger.dylib` 链接，问 agent：`main` 在 `0x1000005a0` 调用哪个函数？agent 反汇编指令，读到 `bl 0x100000694`。该地址存放十二个字节：`adrp x16`、`ldr x16, [x16, #0x38]`、`br x16`。agent 沿加载追踪到 `0x100004038`，读出八字节 `00 00 00 00 00 00 10 80`，报告说程序通过损坏指针调用内核空间。

随后你剥离同一程序静态构建的符号，问它包含多少函数。agent 运行 `nm`，只看到一个名称 `__mh_execute_header`，回答一个。

两个回答都把文件当成运行中的进程。`0x100004038` 的字是链式修正。第 63 位表示绑定，十二个位表示下一处修正的位置，低位表示绑定哪个导入。dyld 会在 `main` 运行前将这个字替换为 `_puts` 的地址。剥离后的文件失去符号表，却保留了 `LC_FUNCTION_STARTS`；九个字节列出了全部五个函数起点。

本课用 Python 标准库构建五类读取器：读取自有目标文件的 COFF 读取器，以及读取导入、导出和基址重定位目录的 PE32+ 读取器；读取加载命令、桩、间接符号表、链式修正链和导出前缀树的 Mach-O 读取器，并逐字与 `dyld_info` 核对；读取动态节、PLT 和 GOT 的 ELF 读取器，以及说明我们的目标文件链接成 PIE 时将产生什么的规划器；针对已剥离构建的函数查找器，包含四种方法及各自评分；采用 FLIRT 形态的签名构建器，用通配符覆盖重定位字节，并对尾部计算 CRC16。

上游实验机器只支持链接 Mach-O。arm64 可执行文件和 dylib 均经过链接、剥离和运行。ELF 与 COFF 目标文件用 `clang -target` 编译；因为没有安装 ELF 或 PE 链接器，这两种格式的链接后映像由 fixture 目录中的两个 Python 脚本依据规范逐字节写出。`llvm-objdump` 和库探针都能读取它们。但它们没有运行过，正文会在相关位置明确指出。

```figure
re-40-call-through-three-formats
```

## 链接器怎样处理重定位

第 32 课读取了重定位记录，第 33 课将 `S + A - P` 用于 `lea`。一条记录指定位置 `P`、类型、符号 `S` 和加数 `A`。x86-64 psABI 表 4.9 为各类型给出公式，其中 `L` 表示符号 PLT 条目的位置，`G` 表示其 GOT 偏移，`GOT` 表示 GOT 地址，`B` 表示映像加载基址。我们的目标文件涵盖三种结果。

链接器将值写入字段，然后记录消失。指向输入中已定义符号的 `R_X86_64_PC32` 就是这种情况。无论加载地址如何变化，同一映像中两个字节之间的距离都不变。

链接器创建 PLT 条目和 GOT 槽。指向未定义函数的 `R_X86_64_PLT32` 属于这种情况。调用得到 `L + A - P`，即到条目的距离。条目通过槽跳转。`.rela.plt` 中的 `R_X86_64_JUMP_SLOT` 记录通知动态链接器填充槽。

链接器为加载器保留重定位。`R_X86_64_64` 是八字节绝对地址，而位置无关可执行文件直到加载时才知道自身地址。该记录在 `.rela.dyn` 中转成公式为 `B + A` 的 `R_X86_64_RELATIVE`。

`main-x86_64-O1.o` 有 18 条记录：`.text` 中 14 条，`.data.rel.ro` 中 2 条，`.rodata` 中 2 条。`code/main.py` 的 `plan_dynamic_link()` 将三条规则用于它和 `ledger-x86_64-O1.o` 的全部记录：

| 记录 | 数量 | 决策 | 原因 |
|---|---|---|---|
| 指向 `.rodata`、`.L.str`、`fns` 和 `.rodata` 内表的 `R_X86_64_PC32` | 16 | 原地写入 | 符号已在输入中定义 |
| 指向 `percent_change`、`grade`、`total`、`grade_label` 的 `R_X86_64_PLT32` | 4 | 直接调用，无 PLT | 已在 `ledger-x86_64-O1.o` 定义，链接器将 PLT32 化简为 PC32 |
| 两次指向 `puts`、两次指向 `printf` 的 `R_X86_64_PLT32` | 4 | PLT 条目与 GOT 槽 | 未定义，由共享库提供 |
| `fns[]` 中指向 `grade` 的 `R_X86_64_64` | 2 | `R_X86_64_RELATIVE` | PIE 中的绝对地址字段 |

两个导入产生 48 字节 `.plt`（PLT0 加两个各 16 字节的条目）、40 字节 `.got.plt`（三个保留槽加两个槽），以及 48 字节 `.rela.plt`。两条相对记录产生 48 字节 `.rela.dyn`。这些数字是把规范应用到我们的记录得到的。手工构建的 `tiny-dyn-x86_64` 为同两个导入实现了这个规划的 PLT 部分，大小与规划一致。

自 binutils 2.31（H.J. Lu，2018-02-13）和 LLVM 7.0.0（D43383，2018-02-20）起，编译器为每次调用都写 `PLT32`，不论符号已定义还是未定义。链接器再决定如何处理。因此目标文件里的 `PLT32` 只表示“一次调用”，不能说明是否会存在 PLT 条目。其他构建还会出现两类类型。`R_X86_64_GOTPCRELX` 和 `R_X86_64_REX_GOTPCRELX`（`G + GOT + A - P`）请求 GOT 槽而不使用 PLT；`-fno-plt` 产生这种形式，符号是局部符号时，链接器可以将其松弛为直接 `lea` 或 `call`（psABI 附录 B）。`R_X86_64_32` 和 `R_X86_64_32S` 放不下 PIE 中的地址，会导致链接失败。我们的两个目标文件都不含这些类型。

## 动态节、PLT 与 GOT

gABI 第 5 章规定，参与动态链接的可执行文件有一个 `PT_INTERP` 程序头，且必须位于所有可加载段之前；还要有一个覆盖 `.dynamic` 节的 `PT_DYNAMIC`。该节是 `Elf64_Dyn` 对的数组，每对含一个有符号标签和一个值，以 `DT_NULL` 结束。

`tiny-dyn-x86_64` 共 5,184 字节，由 `build_tiny_dyn_elf.py` 按 gABI 和 psABI 写出。它的动态节在 `0x1000` 处存放十二对：

| 标签 | 编号 | 值 | 含义 |
|---|---|---|---|
| `DT_NEEDED` | 1 | `libc.so.6` | 字符串表偏移 `0xb`，指定要加载的库 |
| `DT_HASH` | 4 | `0x1a0` | SysV 哈希表 |
| `DT_STRTAB` | 5 | `0x188` | `.dynstr` |
| `DT_SYMTAB` | 6 | `0x140` | `.dynsym`，每项 24 字节 |
| `DT_STRSZ` | 10 | `0x15` | 21 字节字符串 |
| `DT_SYMENT` | 11 | `0x18` | 24 |
| `DT_PLTGOT` | 3 | `0x10c0` | `.got.plt` |
| `DT_PLTRELSZ` | 2 | `0x30` | 两条各 24 字节的记录 |
| `DT_PLTREL` | 20 | 7 | 记录类型是 `DT_RELA` |
| `DT_JMPREL` | 23 | `0x1b8` | `.rela.plt` |
| `DT_FLAGS_1` | `0x6ffffffb` | `0x08000000` | GNU 标签 `DF_1_PIE` |
| `DT_NULL` | 0 | 0 | 结束 |

gABI 解释了 `DT_JMPREL` 单独存在的原因：它保存只与过程链接表相关的重定位条目地址，分离这些条目后，启用延迟绑定时，动态链接器可在进程初始化阶段忽略它们。`DT_FLAGS` 的 `DF_BIND_NOW`、`DT_FLAGS_1` 的 `DF_1_NOW` 或环境变量 `LD_BIND_NOW` 会关闭延迟绑定，动态链接器在启动时处理这些记录。

### PLT0 与 puts 的条目

psABI 5.2 节的图 5.2 给出两种形态。我们文件中的字节如下：

```text
     1f0: ff 35 d2 0e 00 00    pushq  0xed2(%rip)      # 0x10c8 = GOT+8
     1f6: ff 25 d4 0e 00 00    jmpq   *0xed4(%rip)     # 0x10d0 = GOT+16
     1fc: 0f 1f 40 00          nopl   (%rax)

     200: ff 25 d2 0e 00 00    jmpq   *0xed2(%rip)     # 0x10d8 = GOT+24, the slot for puts
     206: 68 00 00 00 00       pushq  $0x0             # index 0 into DT_JMPREL
     20b: e9 e0 ff ff ff       jmp    0x1f0            # PLT0
```

手算一次。RIP 相对位移以后一条指令为基准。`0x1f6 + 0xed2 = 0x10c8`，即 `.got.plt + 8`。`0x1fc + 0xed4 = 0x10d0`，即 `.got.plt + 16`。`0x206 + 0xed2 = 0x10d8`，即第四个槽。`0x210 - 0x20 = 0x1f0`，即 PLT0。每项 16 字节，因此 `exit` 的条目从 `0x210` 开始，压入 `$0x1`，读取 `0x10e0`。

GOT 保留三个槽。psABI 5.2 规定：第零项存放 `_DYNAMIC` 的地址，第一、第二项也保留。我们的 `.got.plt` 内容是 `0x1000, 0, 0, 0x206, 0x216`。glibc 加载文件时，以 `struct link_map` 填充第一槽，以 `_dl_runtime_resolve` 填充第二槽。第三槽在文件中为 `0x206`，即 `puts@plt` 内部的 `pushq`。psABI 规定，该槽初始保存紧随其后的 `pushq` 指令地址。

因此第一次调用依次执行 `call 0x200`；`jmpq *0x10d8` 落到 `pushq $0`；`jmp 0x1f0` 经 PLT0 压入 GOT+8，再通过 GOT+16 跳到解析器。解析器读取 `DT_JMPREL` 的第 0 条记录 `R_X86_64_JUMP_SLOT puts`，在 `libc.so.6` 查找 `puts`，将地址写入 `0x10d8` 并跳过去。第二次调用只需 `call`、`jmpq *0x10d8`，便抵达目标。Drepper 指出，第一次之后的调用开销因此“只有”一次间接跳转。psABI 关于 `%r11` 的脚注也解释了第 38 课的一项寄存器选择：它是临时寄存器，所以 PLT 代码无需将寄存器溢出保存。

`.text` 内调用点在 `0x227` 的字节为 `e8 d4 ff ff ff`，且 `0x22c - 0x2c = 0x200`。`llvm-objdump` 将它打印为 `callq 0x200 <puts@plt>`，依据 `.rela.plt` 记录命名条目，`plt_entries()` 也用同样方法命名。

### 文件缺少什么

该文件没有 `PT_GNU_RELRO`。Jakub Jelinek 于 2004-01-06 在 binutils 邮件列表提出 RELRO：将仅在重定位时写入的节移到可写段开头，动态链接器随后用 `mprotect` 将其设为只读。GNU ld 默认脚本将 `.init_array`、`.fini_array`、`.data.rel.ro`、`.dynamic` 和 `.got` 放入范围内，但 `.got.plt` 只有三个保留槽在内，共 24 字节，因为其余槽需延迟写入。这是部分 RELRO。`-z now` 设置 `DF_BIND_NOW` 并将整个 `.got.plt` 放入范围内，因为启动后不再写入，这就是完整 RELRO。glibc 的 `_dl_protect_relro` 对按页对齐的范围调用 `mprotect(start, end - start, PROT_READ)`。编译器侧的 `-fno-plt` 更进一步：调用通过 `jmpq *name@GOTPCREL(%rip)`，无法延迟绑定；GCC 手册说明，所有外部符号都在加载时解析。

该文件也没有版本节。真正链接 `libc.so.6` 时会添加 `.gnu.version`，每个 `.dynsym` 条目对应一个 `Elfxx_Half`；还会添加 `.gnu.version_r`，每个库对应一个 `Verneed`，每个版本名对应一条 `Vernaux`。`printf@GLIBC_2.2.5` 的含义是：`.gnu.version` 中 `printf` 的条目存放一个索引；`vna_other` 等于该索引的 `Vernaux` 的 `vna_name` 为“GLIBC_2.2.5”，位于 `vn_file` 为“libc.so.6”的 `Verneed` 下。索引 0 为局部，1 为全局，第 15 位（`VERSYM_HIDDEN`，`0x8000`）向链接器隐藏某个版本。

哈希表是 SysV `DT_HASH`，一个桶和三个条目的链，共 24 字节。动态链接器需要 `DT_HASH` 或 `DT_GNU_HASH` 才能在文件中查找符号。此文件不导出任何内容，且没有在上游实验机器运行过，所以 glibc 是否接受单桶表仍未验证。

### .dynsym、.symtab 与 strip

gABI 将 `.dynsym` 和 `.dynstr` 设为需分配内存的节，`.symtab` 和 `.strtab` 则无需分配。动态链接器读取前一对，从不读取后一对。Drepper 指出，普通符号表不在运行时使用，所以不必为了性能将它从二进制中剥离；它不影响性能。

GNU `strip --strip-all` 删除 `.symtab`、`.strtab`、`.debug_*` 和 `.comment`。所有需分配内存的节都保留：`.interp`、`.dynsym`、`.dynstr`、`.gnu.hash`、`.gnu.version*`、`.rela.dyn`、`.rela.plt`、`.plt`、`.text`、`.rodata`、`.eh_frame`、`.init_array`、`.dynamic`、`.got`、`.got.plt`、`.data`、`.bss` 及 note。节头也保留，除非加上 `--strip-section-headers`（binutils 2.41），或运行 `llvm-strip --strip-sections`。`--strip-debug` 保留符号。`--only-keep-debug` 写出调试文件，随后可用 `--add-gnu-debuglink` 在已剥离文件的 `.gnu_debuglink` 中记录其名称和 CRC32；`ld --build-id` 则写入 `.note.gnu.build-id`，供调试器配对两者。

## COFF 目标文件

`clang -target x86_64-pc-windows-msvc -O1 -fno-asynchronous-unwind-tables -c` 生成了 `main-x86_64.obj` 和 `ledger-x86_64.obj`。PE Format 文档定义了目标文件：20 字节文件头，没有可选头，节表每项 40 字节，符号表每条 18 字节，每个节的重定位记录每条 10 字节。

`code/main.py` 的 `CoffObject` 读取这四部分。文件头给出机器类型 `0x8664`、10 个节、37 条符号记录、`SizeOfOptionalHeader` 为 0。节表包含 `.text`、`.data`、`.bss`、六个名为 `.rdata` 的节，以及 `/16`。以 `/` 开头的名称是字符串表内的十进制偏移；字符串表以其自身的四字节长度开头。`/16` 解析为 `.llvm_addrsig`，与 `llvm-objdump -h` 打印的名称一致。

37 条记录包含辅助记录。节符号（存储类 3）带一条辅助记录，含节长度、重定位数量、校验和与 COMDAT 选择。五个 `.rdata` 节的选择为 2，即“any”，每节在一个 MSVC 修饰名称下保存一个字符串字面量：`??_C@_04JDDJEAHN@even?$AA@` 对应字符串“even”。链接器为每个字符串保留一份。最后一条是 `.file`，辅助记录为“main.c”。`llvm-objdump -t` 将它们打印成 `[ 0]`、`AUX scnlen ...`、`[ 2]` 等，跳过辅助记录索引；测试把我们的索引和名称对与这份文本比较。

重定位方面：`.text` 中有 14 条 `IMAGE_REL_AMD64_REL32`，`.rdata` 中有 4 条 `IMAGE_REL_AMD64_ADDR64`。`REL32` 表示从重定位字段之后的那个字节起算的 32 位相对地址。它相当于内置 `-4` 的 `R_X86_64_PC32`：ELF 有加数字段，所以记录携带加数 `-4`；COFF 没有该字段。`ledger-x86_64.obj` 在 `0x36`、`0x84`、`0x93` 有三条 `REL32`，第 32 课的 `ledger-x86_64-O1.o` 在完全相同的三个偏移有三条 `R_X86_64_PC32`。代码相同，格式只在数字 4 写在哪里有所不同。`ADDR64` 是八字节绝对地址，对应字符串指针 `labels` 表，在映像中变成基址重定位，类似 `R_X86_64_64` 变成 `R_X86_64_RELATIVE`。

| | ELF `Elf64_Rela` | COFF 重定位 | Mach-O `relocation_info` |
|---|---|---|---|
| 记录大小 | 24 字节 | 10 字节 | 8 字节 |
| 字段 | 偏移、`r_info` 内的类型与符号、加数 | 偏移、符号索引、类型 | 地址，再接一个含 symbolnum:24、pcrel:1、length:2、extern:1、type:4 的 32 位字 |
| 加数 | 显式 | 无，放在字段内 | 无，或在实际记录前放一条 `ARM64_RELOC_ADDEND` |
| 对 `puts` 的调用 | `R_X86_64_PLT32 puts-0x4` | `IMAGE_REL_AMD64_REL32 puts` | `ARM64_RELOC_BRANCH26 _puts` |

## PE 映像：导入、导出与基址重定位

`tiny-x86_64.exe` 共 2,560 字节，由 `build_tiny_pe.py` 写出。它与 tiny ELF 做同一件事：调用 `msvcrt.dll` 的 `puts` 和 `exit`。它还导出一个名称，携带一条基址重定位，因此本课所需的三个目录都存在。pefile 2024.8.26 和 `llvm-objdump -p` 均能读取它，两份输出都保存为 fixture。

逐步读取头。MS-DOS 桩以 `MZ` 开头，在偏移 `0x3c` 存放 `e_lfanew`，值为 `0x40`。`0x40` 处是签名 `PE\0\0`。然后是 COFF 文件头：机器 `0x8664`、4 个节、`SizeOfOptionalHeader` 为 240、特征 `0x22`（可执行映像，支持大地址）。可选头以 `Magic` 字段 `0x20b` 开头，表示 PE32+。`AddressOfEntryPoint` 为 `0x1000`，`ImageBase` 为 `0x140000000`，`SectionAlignment` 为 `0x1000`，`FileAlignment` 为 `0x200`，`SizeOfImage` 为 `0x5000`，`Subsystem` 为 3（控制台）。`DllCharacteristics` 的 `0x8160` 可解码为 `HIGH_ENTROPY_VA 0x0020`、`DYNAMIC_BASE 0x0040`、`NX_COMPAT 0x0100`、`TERMINAL_SERVER_AWARE 0x8000`。随后是 16 对 RVA 与大小组成的数据目录。其中四项已设置：导出位于 `0x2080`，大小 `0x4d`；导入位于 `0x2000`，大小 `0x28`；基址重定位位于 `0x4000`，大小 `0xc`；IAT 位于 `0x2040`，大小 `0x18`。

映像中的地址是 RVA，即相对加载基址的偏移。节表将它们映射到文件偏移：`.text` 的 RVA `0x1000` 对应文件 `0x200`，`.rdata` 的 RVA `0x2000` 对应 `0x400`，`.data` 的 RVA `0x3000` 对应 `0x600`，`.reloc` 的 RVA `0x4000` 对应 `0x800`。`PeImage.rva_to_offset()` 实现这张表。

### 导入目录

RVA `0x2000` 处是 20 字节导入描述符的数组，以全零描述符结束。我们的文件只有一个：导入查找表 `0x2028`、时间戳 0、转发器链 0、名称 `0x2068`、导入地址表 `0x2040`。名称 RVA 指向“msvcrt.dll”。查找表保存 64 位条目，以零结束。第 63 位置位表示按序号导入，序号在第 15 至 0 位；第 63 位清零表示第 30 至 0 位是 hint/name 条目的 RVA，该条目先是 16 位 hint，即导出名称指针表的索引，再是 ASCII 名称。我们的条目为 `0x2058`（hint 0，“puts”）和 `0x2060`（hint 0，“exit”）。

规范规定，在映像绑定前，IAT 与导入查找表的内容相同。我们的 IAT 在 `0x2040`，保存同两个 RVA；测试检查 `0x2028` 的 24 字节与 `0x2040` 的 24 字节相等。绑定期间，导入地址表条目被改写为所导入符号的地址，PE32 为 32 位，PE32+ 为 64 位。Windows 加载器在入口点运行前执行此操作。这里没有延迟绑定，也没有桩，代码直接访问槽：

```text
    100b: ff 15 2f 10 00 00    call qword ptr [rip + 0x102f]   # 0x1011 + 0x102f = 0x2040, the IAT slot of puts
    1013: ff 15 2f 10 00 00    call qword ptr [rip + 0x102f]   # 0x1019 + 0x102f = 0x2048, the IAT slot of exit
```

`FF /2` 是间接近调用。两条指令的字节相同，因为一条指令比另一条晚八字节，对应读取的槽也晚八字节。`iat_calls()` 在代码节扫描 `ff 15`，加上六和位移，再从导入目录为槽命名。

### 导出目录

RVA `0x2080` 处是 40 字节导出目录表：标志、时间戳、版本、指向“tiny-x86_64.exe”的名称 RVA、序号基数 1、1 个地址表条目、1 个名称指针。随后有三张表。`0x20a8` 的导出地址表保存一个 RVA `0x1000`。`0x20ac` 的导出名称指针表保存指向字符串“tiny_entry”的一个 RVA。`0x20b0` 的导出序号表保存一个 16 位无偏置索引 0。名称 `k` 映射到地址条目 `ordinals[k]`，导出序号为 `ordinals[k] + ordinal base`。规范还有一条这里没用到的规则：若地址条目指向导出节内部，则它是 `MYDLL.expfunc` 这样的转发器字符串；名称指针表按字典序排列，以支持二分搜索。

### 基址重定位

`.reloc` 保存多个块。每块先是页 RVA 和块大小，再是多个 16 位条目：高四位为类型，低十二位为页内偏移。我们的唯一块为：页 `0x3000`、大小 12、条目 `0xa000`、类型 10 即 `IMAGE_REL_BASED_DIR64`、偏移 0，外加一条类型 0 即 `IMAGE_REL_BASED_ABSOLUTE` 的填充条目。RVA `0x3000` 的八字节保存 `0x1400020d0`，即映像基址加字符串“linked by hand”的 RVA。加载器若把映像放在其他位置，会将基址差加到该字段。规范说明，映像文件不包含 COFF 重定位；映像在 `.reloc` 节中以基址重定位形式保存重定位信息，除非具有 `IMAGE_FILE_RELOCS_STRIPPED` 属性。当前 link.exe 默认开启 `/DYNAMICBASE`，因此映像带有 `.reloc` 和 `DYNAMIC_BASE`。

PE 映像没有可供剥离的符号表。文件头的 `PointerToSymbolTable` 对映像应为零，因为 COFF 调试信息已弃用；名称存放在独立 PDB 中。每个映像保留导入目录和导出目录；64 位代码还保留 `.pdata`，其中的 `RUNTIME_FUNCTION` 条目给出每个分配栈或调用其他函数的函数的起止地址。叶函数不在其中。

## Mach-O 映像：加载命令、桩与间接符号表

`ledger_main` 是链接后的 arm64 可执行文件。`otool -h` 打印 19 个加载命令和标志 `0x00200085`。`MH_NOUNDEFS 0x1`、`MH_DYLDLINK 0x4`、`MH_TWOLEVEL 0x80`、`MH_PIE 0x200000` 相加得到该值。19 个命令分别是四个 `LC_SEGMENT_64`（`__PAGEZERO`、`__TEXT`、`__DATA_CONST`、`__LINKEDIT`），两个 `LC_LOAD_DYLIB`（先 `@rpath/libledger.dylib`，再 `/usr/lib/libSystem.B.dylib`），以及各一个 `LC_DYLD_CHAINED_FIXUPS`、`LC_DYLD_EXPORTS_TRIE`、`LC_SYMTAB`、`LC_DYSYMTAB`、`LC_LOAD_DYLINKER`、`LC_UUID`、`LC_BUILD_VERSION`、`LC_SOURCE_VERSION`、`LC_MAIN`、`LC_RPATH`、`LC_FUNCTION_STARTS`、`LC_DATA_IN_CODE` 和 `LC_CODE_SIGNATURE`。`MachoFile.command_names()` 按与 `otool -l` 相同的顺序返回相同列表。

`__TEXT` 从 `0x100000000` 开始。`__text` 位于 `0x100000558`，共 256 字节，只有 `main`，因为四个 ledger 函数在 dylib 中。`__stubs` 位于 `0x100000658`，共 84 字节，即七个各十二字节的桩。`__DATA_CONST` 从 `0x100004000` 开始，含 64 字节的 `__got`，即八个指针槽，节类型为 `S_NON_LAZY_SYMBOL_POINTERS`；还含 32 字节的 `__const`，即 `main.c` 的 `fns[]` 和 `names[]` 表。

### 手算一个桩

`_puts` 的桩位于 `0x100000694`：

```text
    30 00 00 90    adrp x16, 0x100004000
    10 1e 40 f9    ldr  x16, [x16, #0x38]
    00 02 1f d6    br   x16
```

`0x90000030` 是 `adrp`。最低五位给出寄存器 16。`immlo` 是第 30 至 29 位，为 0；`immhi` 是第 23 至 5 位，为 1。值为 `immhi << 2 | immlo = 4`，单位是 4,096 字节页，所以目标页是指令所在页 `0x100000000` 加 `0x4000`。`0xf9401e10` 是带无符号 12 位偏移、按 8 缩放的 `ldr`：第 21 至 10 位为 7，乘以 8 得 `0x38`，因此加载读取 `0x100004038`。`0xd61f0200` 是 `br x16`。ld64 源码的 arm64 桩正是这三条指令组成的 `StubAtom`。

槽对应的名称来自间接符号表。`LC_DYSYMTAB` 指向符号表的 15 个索引。桩节的 `reserved1` 表示其索引序列的起点，`reserved2` 表示每个桩的大小（12）。指针节用 `reserved1`，每槽八字节。`__stubs` 从索引 0 开始，`__got` 从索引 7 开始，因此第 5 号桩映射到符号表第 10 项 `_puts`，`__got` 的第 7 号槽也映射到该项。`otool -Iv` 打印两段序列，`indirect_table()` 复现每一行。

### 两级命名空间

`nm -m` 打印 `(undefined) external _puts (from libSystem)` 和 `(undefined) external _grade (from libledger)`。库来自符号记录本身。`nlist.h` 将 `GET_LIBRARY_ORDINAL(n_desc)` 定义为 `n_desc` 的第 15 至 8 位：1 表示第一个 `LC_LOAD_DYLIB`，2 表示第二个，`0xfe` 表示动态查找，`0xff` 表示可执行文件。`ld(1)` 说明，默认的 `-two_levelnamespace` 仅在命令行列出的 dylib 中搜索符号，并记录符号来自哪个 dylib。`nm_lines()` 从 `n_type`、`n_sect`、`n_desc`、`n_value` 渲染十二条记录，测试逐行对照保存的 `nm -m` 输出。用 `-Wl,-flat_namespace` 重新链接，再看 `otool -h`，可见 `MH_TWOLEVEL` 位消失。

## 逐字节读取链式修正

`LC_DYLD_CHAINED_FIXUPS` 是一个 `linkedit_data_command`：`dataoff 0x8000`、`datasize 208`。这 208 字节遵循 `fixup-chains.h`。

头有七个 32 位字段：`fixups_version 0`、`starts_offset 32`、`imports_offset 80`、`symbols_offset 112`、`imports_count 8`、`imports_format 1`（`DYLD_CHAINED_IMPORT`）、`symbols_format 0`（未压缩）。`llvm-objdump --macho --chained-fixups` 打印这七个值，测试进行对照。

偏移 32 处是 `dyld_chained_starts_in_image`：`seg_count 4` 和四个偏移，每段一个，没有修正的段为零。只有 `__DATA_CONST` 有修正。其 `dyld_chained_starts_in_segment` 内容为 `size 24`、`page_size 0x4000`、`pointer_format 6`（`DYLD_CHAINED_PTR_64_OFFSET`，即目标为虚拟内存偏移）、`segment_offset 0x4000`、`max_valid_pointer 0`、`page_count 1`，以及一个值为 0 的 `page_start`。`DYLD_CHAINED_PTR_START_NONE` 即 `0xffff` 表示该页没有修正。

链从文件偏移 `0x4000 + 0` 开始。每个 64 位字携带两种信息：当前位置要写入什么，以及下一个字在哪里。

```text
  dyld_chained_ptr_64_bind    ordinal:24  addend:8  reserved:19  next:12  bind:1 = 1
  dyld_chained_ptr_64_rebase  target:36   high8:8   reserved:7   next:12  bind:1 = 0
```

读取第一个字 `0x8010000000000000`。第 63 位置位，表示绑定。`next` 位于第 62 至 51 位，为 `0x002`，以 4 字节为单位，因此下一处修正在八字节后。序号为 0。读取 `0x4058` 的第十二个字 `0x00000000000006db`。第 63 位清零，表示重定基址。`next` 为 0，表示链尾。目标 `0x6db` 是虚拟内存偏移，加上映像基址 `0x100000000` 得 `0x1000006db`，即 `__cstring` 中的字符串“odd”。前一个字 `0x00100000000006d6` 将 `names[0]` 重定基址到“even”。

遍历共访问十二个字：`__got` 中序号 0 至 7 的八次绑定，`__const` 中序号为 0 的两次绑定（`fns[]` 的两项都指向 `_grade`），以及 `names[]` 的两次重定基址。`chained_fixups()` 返回它们的文件偏移和原始字，测试将十二对 `(offset, raw)` 与 `dyld_info -fixup_chain_details` 对照。后者为第一项打印 `raw: 0x8010000000000000 bind: (next: 002, bindOrdinal: 0x000000)`。

偏移 80 的导入表有八个 32 位条目：`lib_ordinal:8`、`weak_import:1`、`name_offset:23`，名称位于偏移 112。序号 0 至 3 是库 1 的 `_grade`、`_grade_label`、`_percent_change`、`_total`；4 至 7 是库 2 的 `___stack_chk_fail`、`___stack_chk_guard`、`_printf`、`_puts`。`fixup_rows()` 联结两张表，生成 `dyld_info -fixups` 打印的行，例如 `__DATA_CONST __got 0x100004038 bind libSystem/_puts`，测试对照全部十二行。

所以 `0x100004038` 的“损坏指针”实际是第 7 号导入。dyld 在加载时遍历一次链，将 `_puts` 地址写入槽。Apple 的 WWDC22 课程这样解释：DATA 中的 64 位指针位置里，部分位包含下一处修正的偏移，还打包了一位，表示该修正是绑定还是重定基址。Xcode 13 将此格式作为部署目标 macOS 12 或 iOS 15 的默认格式，Xcode 13.3 扩展到 macOS 11 和 iOS 13.4。此格式没有延迟绑定，每个槽都在 `main` 运行前绑定。

### 它替代的布局

`ledger_main_nochain` 是同一链接加上 `-Wl,-no_fixup_chains` 的结果。它改用 `LC_DYLD_INFO_ONLY`，包含四张字节码表：rebase 8 字节、bind 72 字节、lazy bind 120 字节、export 64 字节。它还包含链式文件没有的三个节：`__TEXT,__stub_helper`（108 字节）、仅 16 字节且保存 `___stack_chk_guard` 和 `dyld_stub_binder` 的 `__got`，以及 `__DATA,__la_symbol_ptr`（56 字节，七个槽）。`dyld_info -fixups` 列出七行 `lazy-bind` 和七次重定基址，后者使每个延迟槽指向 `__stub_helper` 中自己的跳板。跳板压入索引并跳到 `dyld_stub_binder`，由它解析名称并写槽。这就是前节 PLT 和 GOT 的 Mach-O 形态：`__la_symbol_ptr` 对应 `.got.plt`，`__stub_helper` 对应 PLT0 和 `pushq $index`，`dyld_stub_binder` 对应 `_dl_runtime_resolve`。`code/main.py` 报告该文件的偏移和节，不解码绑定操作码；实践实验要求补上这部分。

### 导出前缀树

`LC_DYLD_EXPORTS_TRIE` 是一棵前缀树。每个节点先是 uleb128 终结数据大小；非零时，随后为 uleb128 标志和 uleb128 偏移；然后一个字节的子节点数；每个子节点则是一条字符串边和一个 uleb128 节点偏移。`exports_trie()` 遍历它。对 `libledger.dylib`，它返回 `_percent_change 0x410`、`_grade 0x428`、`_total 0x464`、`_grade_label 0x498`，正是 `dyld_info -exports` 打印的四个偏移。对可执行文件，它返回 `__mh_execute_header`、`_fns` 和 `_main`。

## strip 会留下什么

Apple 的 `strip(1)` 规定，不带选项处理动态链接可执行文件时，其行为与 `-u -r` 相同：保留未定义符号和动态引用的符号。`-x` 删除局部符号。`-N` 删除整个符号表和字符串表。对于动态共享库，通常最多剥离到 `-x`，因为动态链接过程只使用全局符号。

我们的 fixture 观察如下。`strip ledger_main` 将 `LC_SYMTAB` 从 12 条记录减到 10 条，删除 `_main`、`_fns` 和 `_names`。八个未定义导入保留，因为 dyld 需要名称进行绑定；`__mh_execute_header` 也保留，因为它标记为 `REFERENCED_DYNAMICALLY`。第十条记录是名为 `radr://5614542`、类型为 `N_OPT` 的 stab，Apple 工具写入它以避免表为空，`nm` 不打印它。剥离后的程序打印与原程序相同的三行，退出码为 0。`LC_FUNCTION_STARTS` 仍有一个起点，即 `main`。

不带选项执行 `strip libledger.dylib` 的实际效果比手册通常描述的 `-x` 更彻底：`LC_SYMTAB` 记录数为 0，`nm` 打印“no symbols”。导出前缀树仍在相同偏移列出四个函数，因为 dyld 通过前缀树绑定，从不通过 `LC_SYMTAB`。`LC_FUNCTION_STARTS` 仍列出四个起点。实验 C 将新 `main.c` 与已剥离 dylib 链接，证明前缀树同样服务于链接器。

| 内容 | ELF 执行 `--strip-all` 后 | PE 映像 | Mach-O 执行 `strip` 后 |
|---|---|---|---|
| 静态符号表 | 删除 | 映像中从不存在 | 局部和已定义名称删除，未定义导入保留 |
| 加载器绑定的名称 | `.dynsym`、`.dynstr` 保留 | 导入目录保留 | 导入保留在 `LC_SYMTAB` 和链式导入表中 |
| 导出名称 | `.dynsym` 保留 | 导出目录保留 | 导出前缀树保留 |
| 函数起点 | `.eh_frame` 的 FDE，除非构建时未生成展开表 | 非叶函数的 `.pdata` | `LC_FUNCTION_STARTS` 保留 |
| 调试信息 | `.debug_*` 删除 | 在 PDB 中，从不在映像中 | 在 dSYM 中，从不在映像中 |
| 节头或加载命令头 | 保留，除非使用 `--strip-section-headers` | 保留 | 保留 |

## 没有符号时寻找函数

`static-arm64-O2` 将 `main-arm64-O2.o` 和 `ledger-arm64-O2.o` 链接为一个可执行文件，`__text` 中有五个函数。未剥离文件的 `nm -n` 是真值：`_main` 位于 `0x100000500`（244 字节），`_percent_change` 位于 `0x1000005f4`（24），`_grade` 位于 `0x10000060c`（60），`_total` 位于 `0x100000648`（248），`_grade_label` 位于 `0x100000740`（72）。`static-arm64-O2.stripped` 的 `__text` 内没有 `N_SECT` 符号。`FunctionFinder` 对它运行四种方法，`score()` 将每份列表与真值比较。

### LC_FUNCTION_STARTS

命令指向 `__LINKEDIT` 内九字节：`80 0a f4 01 18 3c f8 01 00`。格式是 uleb128 增量，第一个以 `__TEXT` 地址为基准。`80 0a` 是 `0x500`，所以首个起点为 `0x100000500`。`f4 01` 是 `0xf4`，得到 `0x1000005f4`；`18` 得到 `0x10000060c`；`3c` 得到 `0x100000648`；`f8 01` 得到 `0x100000740`；`00` 结束列表。`-O0` 和 `-O2` 下均找全五个，没有误报。链接器为栈展开器和崩溃报告器写入这张表，`strip` 不会改它。Ghidra 的“Mach-O Function Starts”分析器读取它，`dyld_info -function_starts` 打印它，LIEF 以 `function_starts` 暴露它。

### 序言扫描

Ghidra 的 AARCH64 起始模式以 `fd 7b bf a9` 开头，即 `stp x29, x30, [sp, #-0x10]!`。在我们的文件中，它在两个级别都只找到 0/5。clang 先生成 `sub sp, sp, #N`，再用正偏移的 `stp x29, x30, [sp, #M]`，因此从未出现前索引形式。匹配 `sub sp, sp, #imm` 的掩码 `(word & 0xff0003ff) == 0xd10003ff` 在 `-O0` 找到 5/5，因为每个函数都有栈帧；在 `-O2` 仅找到 1/5，因为 `percent_change`、`grade`、`total`、`grade_label` 都是没有栈帧的叶函数。`percent_change` 以 `cbz w0, ...` 开头。序言扫描只能报告编译器选择生成的内容；第 38 课已说明，编译器经常根本不生成序言。

这里两种扫描都没有误报，因为程序很小。x86-64 中表示 `push rbp` 的单字节模式 `55` 会命中其他指令内部，因此 Ghidra 的 x86-64 模式文件把 `55 48 89 e5` 这样的后模式，与必须结束前一函数的 `ret` 或 `nop` 前模式搭配。

### 调用目标

`__text` 中的每条 `bl` 都指向函数起点，因为编译器不会为 C 生成跳入函数中间的 `bl`。编码为 `0x94000000` 加有符号 26 位字偏移。`0x1000005a0` 的 `bl` 字节为 `3d 00 00 94`：`0x3d` 为 61，乘以 4 得 `0xf4`，所以目标是 `0x100000694`。在 `ledger_main` 中，这是 `_puts` 的桩。对静态构建，`call_targets()` 收集 `__text` 内的目标，丢弃落入 `__stubs` 的目标，并加入 `LC_MAIN` 入口，因为没有其他代码调用 `main`。两种级别都找全 5/5。Nucleus（Andriesse、Slowinska、Bos，2017）以此为基础检测编译器生成代码中的函数；Andriesse 等人在 2016 年的测量表明，函数边界是反汇编的难点，比指令边界更难。

## FLIRT 式签名

Hex-Rays 的 FLIRT 文档描述：模式取函数前 32 字节，所有可变字节都做标记。可变字节来自修正和外部引用，模式保存在树中。模式之后，从第 33 个字节直到首个可变字节之前计算 CRC16，并保存长度。两个函数若模式和 CRC 相同，先用尾部某个不同位置的字节区分，再用它们引用的名称区分。无法区分的冲突由人判断。少于四字节且不含外部引用的函数被排除。文档还指出，除函数名称外，签名文件不含原始库的字节。

`signatures_from_object()` 从 `ledger-arm64-O2.o` 和 `main-arm64-O2.o` 构建该签名，正如 FLAIR 从库的目标文件构建签名。每个 `relocation_info` 记录覆盖一个四字节字，这些字节被标为可变。rizin 解析器记录的 `.pat` 行布局依次为模式、CRC 长度、CRC16、函数长度、`:0000` 与名称，以及每个引用名称对应的 `^offset name`：

```text
A00000342800004B890C8052087D091B000DC01AC0035FD6 00 0000 0018 :0000 _percent_change
E8CC8C52C8CCAC72087C289B09FD7FD308FD62930801090B081900511F110071 04 9AAF 003C :0000 _grade ^0000 l_switch.table.grade ^0001 l_switch.table.grade
E8CC8C52C8CCAC72087C289B09FD7FD308FD62930801090B081900511F110071 04 9AAF 0048 :0000 _grade_label ^0000 l_switch.table.grade_label ^0001 l_switch.table.grade_label ^0002 _labels ^0003 _labels
```

`_percent_change` 共 24 字节，所以模式就是整个函数，CRC 长度为 0。`_grade` 共 60 字节，首个重定位在第 36 字节，所以 CRC 覆盖四字节。CRC16 使用公开 `.pat` 解析器采用的算法：多项式 `0x8408`、初值 `0xffff`、取补、交换两字节。ASCII 字符串“123456789”的结果为 `0x6e90`，测试固定这一结果。

`match_signatures()` 在已剥离构建的每个函数起点尝试每个签名，先匹配模式，再匹配 CRC。`-O0` 下五个函数都得到名称，没有冲突。`-O2` 下，上面两行会冲突。`grade_label` 内联了 `grade`，因此两函数共享前 36 字节和四个 CRC 字节。两个签名都会匹配 `0x10000060c` 和 `0x100000740`。尾部将它们区分：第 44 字节，`_grade` 是 `20`，`_grade_label` 是 `28`，对应 `ldr w0, [x9, w8, uxtw #2]` 与 `ldr x8, [x9, w8, uxtw #3]`，长度分别为 60 和 72。报告记录两处冲突及作出判断的字节。两个级别都成功命名 5/5。

测试 `test_object_bytes_equal_linked_bytes_outside_relocated_words` 检查前提：每个目标文件函数的每个非可变字节，都与链接后可执行文件相同偏移处的字节相等，因此链接器只改动了被重定位的字。`_total` 没有重定位，也没有任何可变字节。

### 工具怎样使用相同思路

IDA Pro 9.4 随附各处理器的 FLIRT 签名和构建签名的 `sigmake` 工具；IDA Free 只覆盖 x86 与 x86-64，且限非商业用途。Lumina 是按函数 md5 索引元数据的服务器，跳过不足 32 字节的函数。Ghidra 12.1.4（Apache-2.0）的 Function ID 对助记符和寻址模式计算完整哈希，以抵抗链接导致的变化；另一个具体哈希加入常数操作数，按匹配指令评分，用父函数和子函数打破平局。其随附数据库只覆盖 Visual Studio 库，可从自己的二进制填充数据库。Binary Ninja 6.0 Krypton（商业软件，有 Free 版）使用 WARP（Apache-2.0）：函数 GUID 是对基本块 GUID 计算的 UUIDv5，而每个基本块 GUID 是对将所有可重定位指令清零、删除 NOP 后的块字节计算的 UUIDv5，并以被调用、调用者和相邻函数作约束。BinDiff 8（Apache-2.0）按固定步骤顺序匹配两个二进制中的函数，从哈希匹配、流图 MD 索引到调用序列匹配，并依据匹配的边、块、指令和流图 MD 索引加权相似度。Diaphora 3.4.3（AGPL-3.0，仅适用于 IDA）加入小质数乘积：各助记符映射到质数，函数表示为其乘积，形成与顺序无关的多重集指纹。radare2 6.2.4（LGPL-3.0）有 zignatures（`zg`、`z/`、`zb`），用 `zfs` 读取 FLIRT `.sig` 文件；rizin 0.9.1（LGPL-3.0）用 `Fc` 从已打开二进制创建 `.pat` 或 `.sig`，用 `Fs` 应用签名。

IDA 和 Binary Ninja 闭源，这里依据文档描述。上游本课实验机器没有安装 radare2 和 rizin，命令引自手册和源码。实际运行这些 fixture 的工具是 Command Line Tools 提供的 `clang`、`ld`、`llvm-objdump`、`otool`、`nm`、`strip`、`dyld_info`，以及通过探针运行的 LIEF 1.0.0、pyelftools 0.33、pefile 2024.8.26。LIEF 读取了这里的全部格式，包括自 0.17.0 起支持的 COFF 目标文件；对 `ledger_main` 报告十次绑定和两次重定基址，同样是十二处修正。pyelftools 只读取 ELF。pefile 以 `PEFormatError: 'DOS Header magic not found.'` 拒绝 `main-x86_64.obj`，但能读取 tiny 映像。

## 动手构建

运行演示：

```bash
cd phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries
python3 code/main.py
```

输出是一份含五部分的 JSON 报告。`elf` 保存两个目标文件的重定位计数、链接规划，以及 `tiny-dyn-x86_64` 的动态节、PLT 和 GOT。`coff` 保存两个目标文件的节、重定位、函数和未定义名称。`pe` 保存 `tiny-x86_64.exe` 的头、目录、导入、导出、基址重定位和 IAT 调用。`macho` 保存 `ledger_main` 的桩、链式修正、修正行和导出，`ledger_main_nochain` 的传统布局、dylib，以及两份剥离报告。`identification` 保存 `-O0` 和 `-O2` 的真值、四种方法及其评分，以及签名与冲突。

预期结构：

```json
{
  "elf": {"linkPlan": {"pltSymbols": ["puts", "printf"], "sizes": {".plt": 48, ".got.plt": 40, ".rela.plt": 48, ".rela.dyn": 48}, "...": "..."}, "tiny-dyn-x86_64": {"...": "..."}},
  "coff": {"main-x86_64.obj": {"...": "..."}},
  "pe": {"imports": [{"dll": "msvcrt.dll", "iat": "0x2040", "...": "..."}], "...": "..."},
  "macho": {"ledger_main": {"flags": "0x200085", "fixupRows": ["__DATA_CONST __got 0x100004000 bind libledger/_grade", "..."], "...": "..."}, "strip": {"...": "..."}},
  "identification": {"O2": {"methods": {"functionStarts": {"recall": "5/5"}, "prologueSub": {"recall": "1/5"}, "...": "..."}, "correctNames": 5}}
}
```

按以下顺序阅读 `code/main.py`：

1. `ElfFile` 读取头、节、两张符号表和重定位；`dynamic_entries()`、`jump_slots()`、`plt_entries()`、`plt0()` 读取链接后映像。
2. `plan_dynamic_link()` 把表 4.9 和 5.2 节用于可重定位目标文件的重定位记录。
3. `CoffObject` 读取文件头、节表、带辅助记录的 18 字节符号，以及 10 字节重定位。
4. `PeImage` 读取 MS-DOS 桩、PE 签名、可选头、数据目录、节，以及导入、导出和基址重定位目录；`iat_calls()` 解码 `ff 15`。
5. `MachoFile` 读取加载命令、段、`nlist` 记录、间接符号表、桩、链式修正、导出前缀树和目标文件重定位。
6. `FunctionFinder` 运行四个起点查找器，`score()` 将各结果与真值比较。
7. `signatures_from_object()` 和 `match_signatures()` 构建并应用 FLIRT 式签名。
8. `parse_*` 函数读取测试用于对照的工具文本记录。

其他命令：`python3 code/main.py elf FILE`、`coff FILE`、`pe FILE` 和 `macho FILE` 各打印一份报告。`python3 code/main.py plan OBJECT...` 为任意一组 ELF 目标文件打印链接规划。`python3 code/main.py functions STRIPPED UNSTRIPPED OBJECT...` 为你自己的另一对构建中的查找器和签名评分。

## 实际使用

对自己构建的程序，按以下顺序使用读取器。

1. 读取头，确定格式与类型：可重定位目标文件、可执行文件或共享库。读取器拒绝不认识的内容，拒绝本身也是信息。
2. 列出导入及其提供方：`DT_NEEDED` 和 `.dynsym`、导入目录，或链式导入表和 `LC_LOAD_DYLIB`。调用该列表中的名称都会离开当前映像。
3. 手工沿一次调用追踪到槽。写下调用字节、桩或 PLT 字节、槽地址、文件中的字，以及加载器会写入什么。如果文件中的字看起来像垃圾，先按修正格式解码，再下结论。
4. 比较符号表、导出和函数起点。加载器所需名称在 `strip` 后保留，只有调试器需要的名称则不保留。说明缺失名称原属哪组。
5. 对已剥离构建运行可用的查找器，并在还保有未剥离副本时以它评分。优先使用链接器写入的 `LC_FUNCTION_STARTS`、`.pdata` 或 `.eh_frame` 表，再考虑字节模式，用调用目标补缺。
6. 从自己的目标文件构建签名并应用。记录每次冲突及区分它的字节。两个签名同时认领的名称应保持未知，直到尾部或引用名称作出判断。

将捕获的工具文本与文件保存在一起。工具链变化时重新捕获，因为列表变了，fixture 就变了。

## 交互实验

### 实验 A：手算 PLT

从 `code` 目录打开 Python：

```bash
cd phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/code
python3 -q
```

运行：

```python
from main import *
elf = load_elf("tiny-dyn-x86_64")
[(e.tag_name, e.text) for e in elf.dynamic_entries()]
elf.plt0()
[(e.symbol, hex(e.address), hex(e.slot), hex(e.slot_initial)) for e in elf.plt_entries()]
[hex(w) for w in elf.got_plt_words()]
```

每次调用前，先从前文字节计算答案。然后把 `build_tiny_dyn_elf.py` 的 `IMPORTS` 改为三个名称，重建，并在读取前预测 `.plt`、`.got.plt` 和 `.rela.plt` 的新大小。

### 实验 B：一个链式修正

```python
exe = load_macho("ledger_main")
stub = next(s for s in exe.stubs() if s.symbol == "_puts")
stub.lines()
raw = int.from_bytes(exe.read(stub.slot, 8), "little")
hex(raw), raw >> 63, (raw >> 51) & 0xfff, raw & 0xffffff
[(i.index, i.name, i.library) for i in exe.chained_fixups()["imports"]]
```

先在纸上解码绑定字：绑定位、以四字节为单位的 `next` 字段、序号。再读取八字节后的字，确认它就是下一处修正。最后读取链末尾 `0x100004058` 的字，解释为什么它的 `next` 为零。

### 实验 C：剥离与重新链接

在 fixture 目录中，用完全剥离的 dylib 链接一个新程序：

```bash
cd phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/code/fixtures
clang -target arm64-apple-macos -O1 main.c -L. -lledger.stripped -Wl,-rpath,@executable_path -o /tmp/relinked
nm /tmp/relinked | grep ' U '
dyld_info -exports libledger.stripped.dylib
```

即使库的 `LC_SYMTAB` 为空，链接仍成功，因为链接器读取导出前缀树。然后运行 `python3 ../main.py macho libledger.stripped.dylib`，比较 `symtab`、`exports` 和 `functionStarts`。接着改用 `-N` 剥离静态构建，查看 `dyld_info -function_starts` 还会打印什么。

### 实验 D：签名冲突

```python
from main import *
stripped = load_macho("static-arm64-O2.stripped")
sigs = signatures_from_object(load_macho("ledger-arm64-O2.o"))
[s.pat_line() for s in sigs]
starts = FunctionFinder(stripped).function_starts()
match_signatures(sigs, stripped, starts)
```

读取两条冲突记录。然后从 `ledger-arm64-O0.o` 构建签名，与 `static-arm64-O0.stripped` 匹配，并从 `.pat` 行解释为什么 `-O0` 不冲突。再把 `PATTERN_LENGTH` 缩短到 16，统计有多少函数冲突。

## 实践实验

解码传统绑定表，并添加 PE 查找器。

要求：

- 将 `ledger_main_nochain` 的 `LC_DYLD_INFO_ONLY` rebase、bind 和 lazy bind 操作码流解码为包含段、节、地址、类型和目标的行，使其与保存的 `dyld_info -fixups` 文本的 21 行相同。
- 为 `build_tiny_dyn_elf.py` 添加 `PT_GNU_RELRO` 程序头和含 `DF_BIND_NOW` 的 `DT_FLAGS`，将 `.got.plt` 移入覆盖范围，让 `llvm-objdump -p` 显示新头。在 fixture README 中说明这复现了完整 RELRO 的哪部分，哪部分只能由 glibc 执行。
- 为 PE32+ 映像编写 `.pdata` 读取器，以及使用 `RUNTIME_FUNCTION` 起始地址的函数查找器。用 `clang -target x86_64-pc-windows-msvc -c` 构建目标文件，不加 `-fno-asynchronous-unwind-tables`，读取 `.pdata` 重定位，并说明哪些函数是表中省略的叶函数。
- 每个读取器编写一个与保存的工具文本比较的测试。

成功标准：`python3 code/main.py macho ledger_main_nochain` 打印与 `dyld_info` 相同的 21 行修正；tiny ELF 带有 `llvm-objdump` 能列出的 `PT_GNU_RELRO`；`.pdata` 查找器为能识别的函数命名，并列出无法识别的叶函数。

## 课程产物

本课提供 `outputs/skill-linking-loading-and-stripped-binaries.md`。用它将自己构建的程序转换为：导入及提供方列表、追踪到加载器填充槽的一次调用、`strip` 删除与保留内容的说明，以及对已剥离构建的函数起点和名称恢复结果评分。必须提供未剥离副本作为真值，每项结论必须有保存的工具列表，并记录每次冲突。

## 验证

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries
python3 code/main.py
python3 code/tests/test_main.py
```

验证应证明：

- `tiny-dyn-x86_64` 的动态节逐标签匹配 `llvm-objdump -p`，`DT_FLAGS_1` 带 `DF_1_PIE`
- 两条 `R_X86_64_JUMP_SLOT` 记录与 `llvm-objdump -R` 匹配，名称为 `puts` 和 `exit`
- PLT0 压入 GOT+8，经 GOT+16 跳转；每个条目读取自己的槽并压入自己的索引；每个槽保存自身 `pushq` 的地址
- tiny ELF 的节和程序头与 `llvm-objdump -h -p` 匹配
- 两个 ELF 目标文件的重定位记录与 `llvm-objdump -r` 匹配
- 链接规划找到两个 PLT 符号、四次直接调用、两条相对重定位，以及 tiny 映像的大小
- COFF 节表、含辅助记录的 37 条符号记录和重定位与 `llvm-objdump -h -t -r` 匹配，`/16` 解析为 `.llvm_addrsig`
- `ledger` 的三条 COFF `REL32` 位于三条 ELF `PC32` 相同的偏移
- PE 头、`DllCharacteristics` 和数据目录与 `llvm-objdump -p` 匹配
- 导入目录、hint/name 条目和 IAT 与 `llvm-objdump`、`pefile` 匹配，绑定前 IAT 与查找表相等
- 导出目录和 `DIR64` 基址重定位可解码，重定位后的指针指向字符串“linked by hand”
- RVA `0x100b` 的 `ff 15` 解析到 `puts` 的 IAT 槽
- Mach-O 标志、19 个加载命令名称和两个库与 `otool` 匹配
- 七个桩可解码到八个 `__got` 槽，间接符号表与 `otool -Iv` 匹配
- 链式修正头与 `llvm-objdump --macho --chained-fixups` 匹配
- 链遍历复现 `dyld_info -fixup_chain_details` 的全部十二个原始字
- 修正行和导入表与 `dyld_info -fixups`、`-imports` 匹配
- dylib 及其剥离副本的导出前缀树与 `dyld_info -exports` 匹配
- 可执行文件及其剥离副本的 `nm_lines()` 与 `nm -m` 相同
- `strip` 删除 `_main`、`_fns`、`_names`，保留九个名称和一个 `radr://5614542` stab；剥离后的程序打印相同输出
- 传统布局带有 `LC_DYLD_INFO_ONLY`、七个延迟指针，以及通向 `__stub_helper` 的重定基址
- arm64 目标文件重定位与 `llvm-objdump -r` 匹配
- `LC_FUNCTION_STARTS` 在两个级别都恢复 5/5，结果与 `nm` 和 `dyld_info -function_starts` 相同
- `sub sp` 扫描在 `-O0` 找到 5/5，在 `-O2` 找到 1/5；`stp` 栈帧扫描一个也找不到
- `bl` 目标加 `LC_MAIN` 入口恢复 5/5
- 签名在两个级别都命名全部五个函数，并记录由第 44 字节区分的 `grade` 冲突
- “123456789”的 CRC16 为 `0x6e90`，`main` 的 GOT 加载指令对覆盖的八字节为可变字节
- 每个非可变目标文件字节都等于链接后的字节
- 演示与图表数据报告相同地址，站点模块以 ES5 内嵌相同数据

## 生产中的失败模式

| 失败 | 较弱工具的报告 | 分析必须证明的内容 |
|---|---|---|
| `bl` 或 `call` 落入桩 | “调用 0x694 的无名函数” | 桩字节、它加载的槽及该槽绑定的导入 |
| 从文件读取 GOT 字 | “损坏指针 0x8010000000000007” | 第 63 位表示绑定，`next` 为 2，序号 7 是库 2 的 `_puts` |
| 目标文件中的 `PLT32` | “每次调用都经过 PLT” | 已定义符号化简为直接距离，只有未定义符号得到条目 |
| 把部分 RELRO 看作完整 RELRO | “GOT 只读” | 未加 `-z now` 时，`.got.plt` 的三个保留槽之后的槽位于 `PT_GNU_RELRO` 之外 |
| 比较 COFF `REL32` 与 ELF `PC32` | “Windows 构建的重定位不同” | 偏移相同，`-4` 位于 ELF 加数和 COFF 字段中 |
| 加载前读取 IAT | “导入指向字符串” | 加载器绑定前 IAT 等于查找表，字符串是 hint/name 条目 |
| 剥离后的 dylib | “没有符号，没有导出” | 导出前缀树和 `LC_FUNCTION_STARTS` 列出每个函数 |
| 对剥离后的可执行文件运行 `nm` | “一个函数” | 九字节 `LC_FUNCTION_STARTS` 列出五个起点 |
| `-O2` 的序言扫描 | “一个函数” | 四个叶函数没有栈帧，调用目标和起点表可以找到它们 |
| 两个函数共享 36 字节 | “grade_label 就是 grade” | 第 44 字节和长度 60、72 区分冲突 |
| 对另一台机器的构建运行工具 | 直接套用本文数字 | 从自己的 fixture 重新捕获每份列表 |

## 操作准则

沿每个外部调用从调用点追到加载器填充的槽；在把槽中的字当成地址前，先按格式定义解码。剥离前记录加载器仍需什么。先从链接器写入的表恢复函数起点，再扫描字节；对照带符号的副本为每个查找器评分，并逐个记录签名冲突及区分它们的字节。

## 延伸阅读

- [System V gABI, chapter 5: Program Loading 和 Dynamic Linking](https://www.sco.com/developers/gabi/latest/ch5.dynamic.html)
- [System V Application Binary Interface, AMD64 Architecture Processor Supplement: section 5.2 和 Table 4.9](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Drepper, "How To Write Shared Libraries", version 4.1.2](https://akkadia.org/drepper/dsohowto.pdf)
- [Drepper, "ELF Symbol Versioning"](https://akkadia.org/drepper/symbol-versioning)
- [Jelinek, "Little hardening DSOs/executables against exploits", binutils list, 2004-01-06](https://www.sourceware.org/ml/binutils/2004-01/msg00070.html)
- [Taylor, "Linker relro", 2008](https://www.airs.com/blog/archives/189)
- [binutils commit bd7ab16b: PLT32 for calls, 2018-02-13](https://gnu.googlesource.com/binutils-gdb/+/bd7ab16b4537788ad53521c45469a1bdae84ad4a) 和 [LLVM D43383](https://reviews.llvm.org/D43383)
- [GNU Binutils: strip](https://sourceware.org/binutils/docs/binutils/strip.html) 和 [llvm-objcopy](https://llvm.org/docs/CommandGuide/llvm-objcopy.html)
- [Microsoft, PE Format](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format)
- [CALL instruction reference, FF /2](https://www.felixcloutier.com/x86/call)
- [Apple, mach-o/loader.h](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/loader.h) 和 [mach-o/nlist.h](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/nlist.h)
- [Apple dyld, mach-o/fixup-chains.h](https://github.com/apple-oss-distributions/dyld/blob/main/include/mach-o/fixup-chains.h)
- [Apple ld64, stub_arm64.hpp](https://github.com/apple-oss-distributions/ld64/blob/main/src/ld/passes/stubs/stub_arm64.hpp)
- [Xcode 13 release notes: chained fixups](https://developer.apple.com/documentation/xcode-release-notes/xcode-13-release-notes) 和 [WWDC22 session 110362, "Link fast: Improve build 和 launch times"](https://developer.apple.com/videos/play/wwdc2022/110362/)
- [strip(1)](https://keith.github.io/xcode-man-pages/strip.1.html), [ld(1)](https://keith.github.io/xcode-man-pages/ld.1.html), 和 [dyld(1)](https://keith.github.io/xcode-man-pages/dyld.1.html)
- [Hex-Rays, IDA F.L.I.R.T. Technology: In-Depth](https://docs.hex-rays.com/core/flirt/concepts/ida-f.l.i.r.t.-technology-in-depth) 和 [Lumina overview](https://docs.hex-rays.com/add-ons/lumina/overview)
- [Ghidra Function ID help](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Features/FunctionID/src/main/help/help/topics/FunctionID/FunctionID.html) 和 [AARCH64 function start patterns](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Processors/AARCH64/data/patterns/AARCH64_LE_patterns.xml)
- [Vector 35, WARP](https://github.com/Vector35/warp) 和 [Binary Ninja WARP guide](https://docs.binary.ninja/guide/warp.html)
- [BinDiff manual](https://www.zynamics.com/bindiff/manual/) 和 [BinDiff source](https://github.com/google/bindiff)
- [Diaphora](https://github.com/joxeankoret/diaphora)
- [rizin pat.c, the .pat parser](https://github.com/rizinorg/rizin/blob/dev/librz/sign/pat.c), [radare2 flirt.c](https://github.com/radareorg/radare2/blob/master/libr/anal/flirt.c), 和 [radare2 book: Zignatures](https://book.rada.re/signatures/zignatures.html)
- [Andriesse et al., "An In-Depth Analysis of Disassembly on Full-Scale x86/x64 Binaries" (USENIX Security 2016)](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/andriesse) 和 [Andriesse, Slowinska, Bos, "Compiler-Agnostic Function Detection in Binaries" (EuroS&P 2017)](https://danielandriesse.com/papers/eurosp-2017.pdf)
- [Bao et al., ByteWeight (USENIX Security 2014)](https://www.usenix.org/conference/usenixsecurity14/technical-sessions/presentation/bao) 和 [Shin, Song, Moazzezi, "Recognizing Functions in Binaries with Neural Networks" (USENIX Security 2015)](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/shin)
- [LIEF changelog](https://lief.re/doc/latest/changelog.html), [pyelftools](https://github.com/eliben/pyelftools), 和 [pefile](https://github.com/erocarrera/pefile)
