---
id: addend-0x10-table-0x14
title: 表起始于 0x14 而加数记录为 0x10
card: evidence-reverse-engineering
kind: code-reading
level: 2
roles: [applied-ai-engineer, agentic-ai-engineer]
rounds: [coding, screen]
tags: [reverse-engineering, elf, relocation, symbol-table, file-offset]
minutes: 8
lessons: [phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch, phases/13-tools-and-protocols/33-disassembly-and-control-flow]
manuals: []
practice: []
cheatsheet: [re-from-scratch-tools]
related: []
updated: 2026-11-03
---

来自一个可重定位目标文件：符号 `grade` 具有 `st_value 0x10`、`st_size 46`，位于节 `.text`；`.text` 具有 `sh_offset 0x40` 和 `sh_addr 0`。重定位表在偏移 `0x36` 处持有一条记录，类型为 `R_X86_64_PC32`，符号为 `.rodata`，加数（addend）为 `0x10`；位于 `0x33` 处的指令是 `leaq (%rip), %rcx`，其最后四个字节为零。回答三个问题：哪些文件字节属于 `grade`、这四个零字节最终会变成什么，以及为什么返回值表起始于 `.rodata+0x14` 时加数却显示为 `0x10`。

## Short answer

函数的物理文件偏移量为 `sh_offset + st_value - sh_addr`，在此处即为 `0x40 + 0x10`，因此 `grade` 对应于文件偏移 `0x50` 处的 46 个字节，单独的 `st_value` 仅是节内偏移而非文件位置。这四个零字节是 RIP 相对寻址操作数的位移字段，链接编辑器会将 `S + A - P` 写入其中，即符号值加上加数再减去该字段本身的地址。处理器执行时会将该字段与下一条指令地址 `0x3a` 相加，该地址距位移字段后缘恰好相差 4 个字节，因此最终寻址目标为 `.rodata + 0x10 + 4 = .rodata + 0x14`。加数记录的数值恰好等于目标偏移量减去该字段到指令末尾之间的 4 个字节。

## Full answer

### 互相指向的结构表

在文件中只有 ELF 头部具有固定位置。其余所有结构都由保存在另一结构中的偏移量定位：`e_shoff` 指向节头部表，`sh_offset` 指向节数据字节，`st_value` 是由 `st_shndx` 指定的节内偏移量，而在目标文件中 `sh_addr` 为零。大小与起始位置同样重要：`grade` 在 `.text` 节偏移 `0x3e` 处结束，其后的两个字节 `66 90` 是编译器为了让下一个函数对齐在 16 字节边界而填充的 `nop` 指令。它们不属于任何符号，反汇编器会在达到 `st_size` 时停止，字节比较工具也会将它们掩码过滤。

### 三种重定位结果

| 类型 | 计算公式 | 链接编辑器的处理 |
|---|---|---|
| 指向已定义符号的 `R_X86_64_PC32` | `S + A - P` | 写入相对距离并移除该重定位记录 |
| 指向未定义函数的 `R_X86_64_PLT32` | `L + A - P` | 当符号保持可抢占时创建 PLT 条目与 GOT 槽位；当链接绑定了该符号时，写入直接距离 |
| 位置无关映像中的 `R_X86_64_64` | `S + A` | 为加载器保留相对重定位记录 |

同样的补偿也出现在测试用例中的每个 RIP 相对操作数上：出于相同原因，对 `grade` 的调用会带有 `grade-0x4`。在 `.rodata+0x14` 处的 5 个字读取为 `1, 2, 3, 4, 4`，这正是编译器在 `-O1` 优化级别下将 `switch` 结构转换为返回值查表的方式。

### -O0 下的跳转表使用相同的算术逻辑

在未优化的目标文件中，跳转表的每个字节均为零，目标地址仅作为 `.rela.rodata` 中的 5 条记录存在。对偏移量 `4k` 处的第 `k` 项应用公式 `S + A - P`：存储的值为 `.text + A - (.rodata + 4k)`，代码在运行时会加回 `.rodata`，因此目标地址为 `.text + A - 4k`。第 0 项为 `0x91`，第 1 项为 `0x8c - 4 = 0x88`，第 2 项为 `0x7f`，第 3 项和第 4 项均为 `0x76`，即共享的分支处理逻辑。

### 当节头被剥离时

链接器可以移除节头部表，此时 `e_shoff` 变为零，遍历节的工具将一无所获。加载器本身从不依赖节头：`PT_LOAD` 程序头通过 `p_offset + (address - p_vaddr)` 将虚拟地址映射到文件偏移量。链接后的地址也不是运行时绝对地址，因为位置无关可执行文件加载在内核决定的基址上，而文件偏移量才是稳定的绝对坐标。

## Follow-ups

- **Level 2:** `grade` 紧随其后的两个字节是什么，它们归属于谁？ Expected: 对齐填充字节，是一条 `nop` 指令，不属于任何符号；`st_size` 是判断其边界的停止条件。
- **Level 3:** 在 `-O0` 目标文件中，跳转表的字节全为零，目标跳转地址存放在哪里？ Expected: 存放在 5 条重定位记录中；目标地址等于加数减去 `4k`，代码在运行时会加回表基址。
- **Level 3:** 如果可执行文件被剥离了节头，如何找到某虚拟地址背后的物理字节？ Expected: 通过 `PT_LOAD` 程序头定位，公式为 `p_offset + (address - p_vaddr)`。
- **Level 4:** 反编译工具在绝对地址下以 `DAT_` 命名显示该表，如何将其与 `.rodata+0x14` 对应？ Expected: 反编译工具将目标文件加载在了自选基址上并应用了重定位；只需减去它赋予 `.rodata` 的基址，所得偏移量就是 `0x14`。

## Wrong answers

- "`grade` 位于文件偏移量 `0x10` 处。" 那是 `st_value`，只是 `.text` 节内的偏移量；实际文件偏移量必须加上 `sh_offset`。
- "表从 `0x10` 开始，因为加数就是这么写的。" 加数补偿了操作数字段到指令末尾之间的 4 个字节；实际目标地址偏移是 `0x14`。
- "该指令就是 `lea 0(%rip)`。" 零字节只是占位符，由链接编辑器填入真实位移；重定位记录指明了该操作数。

## Taught in

[ELF 读取器课程](../../../phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/)手工推导了文件偏移量与加数计算，[反汇编课程](../../../phases/13-tools-and-protocols/33-disassembly-and-control-flow/)将相同公式应用于跳转表。
