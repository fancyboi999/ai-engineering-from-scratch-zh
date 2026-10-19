# 读取 ELF 可重定位目标文件

第 1 阶段，共 8 阶段。先读[项目前置要求](../../../README.md)。应用[程序解剖：从零构建 ELF 读取器](../../../../../phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md)，以及[反汇编与控制流](../../../../../phases/13-tools-and-protocols/33-disassembly-and-control-flow/docs/zh.md)中的重定位部分。

## 构建内容

构建供后续各阶段读取的加载器。它接收一个小端 x86-64 ELF64 可重定位目标文件（`ET_REL`）的字节，返回：

- 节头，各项包含名称与字节；
- 符号表，含名称、值、大小、类型、绑定与节名；
- 全部 RELA 记录，按所修补的节分组、按偏移排序；
- 逐个函数返回字节、内部重定位与之后的对齐填充。

还要将重定位解析为链接后实际指向的位置。

## 为什么重要

可重定位目标文件是 `clang -c` 的输出。链接编辑器尚未运行，因此引用其他节的地址都是全零字段加一条 RELA 记录。`band` 的跳转表、`-O1` 的查找表，以及对其他函数的每次调用，都只能通过这些记录看到。加载器丢掉记录，阶段 3 就找不到跳转表，阶段 7 无法命名查找表，阶段 8 则会比较链接编辑器将覆写的字节。

函数符号给出起点与大小。前一函数末端到下一函数起点之间是对齐填充。阶段 3 会用线性扫描解码填充，展示扫描与递归下降的差异，因此加载器单独报告填充。

## 具体案例

可以自行构建测试固件，也可使用已提交目标文件。其构建命令为：

```bash
clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c samples.c -o samples-x86_64-O1.o
```

`samples-x86_64-O1.o` 的头部以 `7f 45 4c 46 02 01` 开始：魔数、`ELFCLASS64`（2）、小端（1）。偏移 16 处 `e_type` 为 1（`ET_REL`），`e_machine` 为 62（`EM_X86_64`）。节头表位于 `e_shoff`，各项 64 字节。前五个节名是空的 null 节、`.strtab`、`.text`、`.rela.text`、`.rodata`。`.text` 长 0xb2 字节。

按地址排序的五个函数符号及大小：

| 名称 | 值 | 大小 | 下一起点 | 填充 |
|---|---|---|---|---|
| `tenths_and_fifths` | 0x0 | 0x23 | 0x30 | 13 |
| `thirds` | 0x30 | 0x1a | 0x50 | 6 |
| `band` | 0x50 | 0x17 | 0x70 | 9 |
| `fold` | 0x70 | 0x26 | 0xa0 | 10 |
| `record` | 0xa0 | 0x12 | 0xb2 | 0 |

`band` 包含一条重定位。`.rela.text` 中记录的 `r_offset` 为 0x5f，类型为 2（`R_X86_64_PC32`），符号是 `.rodata` 节符号，加数为 -4。函数内偏移为 0x5f - 0x50 = 0xf。

该字段属于 `leaq (%rip), %rcx`，指令从 0x5c 开始、在 0x63 结束。psABI 规定链接编辑器在 PC 相对字段存入 S + A - P，其中 S 是符号值、A 是加数、P 是字段地址。处理器将字段值加到下一指令地址，因此操作数到达：

```text
S + A - P + end = 0 + (-4) - 0x5f + 0x63 = 0
```

表从 `.rodata+0x0` 开始，前八字节为 `05 00 00 00 08 00 00 00`，即 `band` 的 `switch` 中的值 5 和 8。

`-O0` 下 `.rodata` 自身有六条重定位，每个跳转表项一条。各项都是针对 `.text` 的 PC 相对记录，以表基址作为结束位置解析，目标为 0x78、0x81、0x8a、0x93、0x9c、0xa5，即 `band` 的六个 case 块。

```figure
pj-mini-decompiler-1
```

在实验中修改加数、字段偏移与指令长度。目标的移动量与字段到指令末端的距离变化相同，这正是 `relocation_target` 在缺少末端位置时拒绝 PC 相对记录的原因。

## 实现契约

在 `elf` 模块中实现以下内容。模板保留 dataclass、常量、`_cstring`、`_slice`、`section`、`has_section`、`functions`、`relocation_at` 和 `symbolize`。

| 函数 | 契约 |
|---|---|
| `ElfObject(data: bytes)` | 要求数据含 ELF 魔数、`ELFCLASS64`、小端编码、`EM_X86_64`、`ET_REL`，且 `e_shentsize` 为 64，否则抛 `ElfError`。读取全部节头；`SHT_NOBITS` 没有字节。根据 `e_shstrndx` 命名各节，再设置 `self.symbols` 和 `self.relocations`。任何表越出文件均抛 `ElfError`。 |
| `ElfObject._read_symbols() -> list[Symbol]` | 读取每个 `SHT_SYMTAB` 的全部 24 字节 `Elf64_Sym`，通过 `sh_link` 的字符串表命名。类型为 `st_info & 0xf`，绑定为 `st_info >> 4`。 |
| `ElfObject._read_relocations() -> dict[str, list[Relocation]]` | 读取每个 `SHT_RELA` 的全部 24 字节 `Elf64_Rela`，以 `sh_info` 节名为键，按偏移排序。符号索引越表抛 `ElfError`。 |
| `ElfObject.function_extent(name, section=".text") -> (start, end, padding_end)` | 根据函数符号：`start` 是值，`end` 是 `start + size`，`padding_end` 是下一函数起点或节大小。未知名称抛 `ElfError`。 |
| `ElfObject.function(name, section=".text") -> FunctionBytes` | 返回 `[start, end)` 内的字节与重定位，偏移相对 `start`。 |
| `relocation_target(relocation, field_end=None) -> Target` | 绝对地址：`S + A`。PC 相对（`R_X86_64_PC32`、`R_X86_64_PLT32`）：`S + A + (field_end - P)`。PC 相对记录没有 `field_end` 时抛 `ValueError`。节符号的 S = 0。 |

CLI 已预置。本阶段完成后加载器可运行，`disasm` 命令在阶段 2 后开始可用。

## 验证与检查

在仓库根目录初始化一次工作区：

```bash
python3 scripts/project_test.py mini-decompiler --init learning-artifacts/mini-decompiler
python3 scripts/project_test.py mini-decompiler --stage 1 --path learning-artifacts/mini-decompiler --strict
```

新工作区以 `not implemented yet: Stage 1: implement ElfObject.__init__` 失败。测试检查节顺序、上述符号表、`band` 重定位、`-O0` 跳转表目标、留出目标文件及以下失败案例。

## 失败案例

- 以 `MZ` 开始的字节，或仅有四字节魔数，抛出 `ElfError`。
- 32 位 class、大端数据、其他机器或可执行文件（`ET_EXEC`）抛出 `ElfError`，指出失败字段。
- 文件截到 200 字节，或 `e_shoff` 越过末尾时抛 `ElfError`，而不是读取垃圾。
- RELA 记录指向超出符号表的符号 0xffff 时抛 `ElfError`。
- `relocation_at(".text", 0x60)` 返回 `None`，因为 0x60 在字段内部，但不是起点。

## 扩展

- 读取带 `SHN_COMMON` 与 `SHN_ABS` 的 `.symtab` 项，将其报告为未知节。
- 接受 `R_X86_64_GOTPCREL`，记录目标是仅在链接后存在的 GOT 槽。
- 通过程序头与动态符号表读取 `ET_DYN` 共享目标文件。