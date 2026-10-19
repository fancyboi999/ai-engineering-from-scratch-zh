# 节、段、权限与熵

第 2 阶段，共 6 阶段。使用第 [32](../../../../../phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md) 课的节头表，以及第 [40](../../../../../phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/docs/zh.md) 课三种格式的段表与节表。

## 构建内容

在 `layout` 模块中实现五个函数：

- `shannon_entropy(data)` 返回位/字节，四舍五入到小数点后 4 位。
- `sections(data)` 列出每个节的权限串和字节熵。
- `segments(data)` 列出 ELF 程序头和 Mach-O 段。
- `section_at_offset(section_list, offset)` 与 `section_at_address(section_list, address)` 查找文件偏移或虚拟地址的归属。阶段 4、5、6 会使用它们。

## 为什么重要

节说明链接编辑器生成了什么，段说明加载器映射了什么、使用哪些权限。可写又可执行的节、熵接近 8 的数据节，都是评审者在发布前必须看到的事实。熵衡量字节值分布的均匀程度。256 个值等频出现时最大为 8 位/字节，零填充为 0。测试固件的代码节为 5.5 到 5.9，字符串节为 4.0 到 4.7，段间填充为 0.0。压缩或加密数据接近 8。

各格式存放权限的位置不同：

| 格式 | 位置 | 位 |
|---|---|---|
| ELF 节 | `sh_flags` | `SHF_WRITE 0x1`、`SHF_ALLOC 0x2`、`SHF_EXECINSTR 0x4` |
| ELF 段 | `p_flags` | `PF_X 0x1`、`PF_W 0x2`、`PF_R 0x4` |
| COFF 与 PE 节 | `Characteristics` | `MEM_EXECUTE 0x20000000`、`MEM_READ 0x40000000`、`MEM_WRITE 0x80000000` |
| Mach-O 段 | `initprot`、`maxprot` | `VM_PROT_READ 1`、`VM_PROT_WRITE 2`、`VM_PROT_EXECUTE 4` |

没有 `SHF_ALLOC` 的 ELF 节不会加载，因此权限串为 `"---"`。Mach-O 节没有自己的权限位，使用同名段的 `initprot`。Mach-O 目标文件唯一的段没有名称，因此指令属性 `0x80000400` 对应 `"r-x"`，其余查 `MACHO_SEGMENT_PERMS` 表。

## 具体案例

tally 的 ELF 目标文件在 `e_shoff` 1320 处有 13 个 64 字节节头。条目 2 是 `.text`，`sh_flags` 为 `0x6`：`SHF_ALLOC` 和 `SHF_EXECINSTR` 置位，`SHF_WRITE` 未置位，因此为 `"r-x"`。`sh_offset` 为 64，`sh_size` 为 `0x13c`（316）。条目 5 是 `.bss`，类型为 `SHT_NOBITS`（8）。其大小为 4，但文件中不占字节，因此 `file_size` 为 0，熵为 0.0。

计算 15 字节字符串 `tally report v3` 的熵，统计各字节值：

| 字节 | 次数 | p | p log2(1/p) |
|---|---|---|---|
| `t`、`l`、`r`、空格 | 各 2 次 | 2/15 | 各 0.3876 |
| `a`、`y`、`e`、`p`、`o`、`v`、`3` | 各 1 次 | 1/15 | 各 0.2605 |

总和为 4 × 0.3876 + 7 × 0.2605 = 3.3736 位/字节。字节串 `aabb` 恰为 1.0，0 到 255 的全部 256 个值各出现一次时恰为 8.0。

arm64 可执行文件中，`__TEXT,__text` 为 768 字节，熵为 5.8595；`__TEXT,__cstring` 的熵为 4.6413；`__DATA,__common` 是零填充，`file_size` 为 0。`__PAGEZERO` 段映射 4 GiB，不占文件字节，权限为 `"---"`。

```figure
pj-binary-inspector-2
```

拖动滑块设置区域内不同字节值的数量以及最常见值的频率。实验根据所选标志位计算熵和权限串。

## 实现契约

`shannon_entropy(data: bytes) -> float`：空输入返回 0.0。否则 H = 各字节值的 p × log2(1/p) 之和，其中 p = 次数 / 长度，用 `round(value, 4)` 舍入。

`sections(data: bytes) -> list[dict]`：每节一个字典，恰含以下键：

| 键 | ELF | COFF 目标文件 | PE 映像 | Mach-O |
|---|---|---|---|---|
| `index` | 头索引（跳过 0） | 从 1 开始 | 从 1 开始 | 跨全部段从 1 开始 |
| `name` | 来自 `.shstrtab` | 8 字节名称，或 `/n` 指向字符串表 | 同左 | `sectname` |
| `segment` | `None` | `None` | `None` | `segname` |
| `type` | `ELF_SECTION_TYPES` 名称 | `"code"`、`"initialized"`、`"uninitialized"`、`"other"` | 同左 | `MACHO_SECTION_TYPES` 名称 |
| `addr` | `sh_addr` | 0 | `ImageBase + VirtualAddress` | `addr` |
| `offset` | `sh_offset` | `PointerToRawData`，无文件字节时为 0 | 同左 | `offset`，零填充时为 0 |
| `size` | `sh_size` | `SizeOfRawData` | `VirtualSize` | `size` |
| `file_size` | `NOBITS` 为 0，否则为 `sh_size` | 未初始化数据为 0 | `min(SizeOfRawData, VirtualSize)` | 零填充类型为 0 |
| `perms` | 来自 `sh_flags` | 来自 `Characteristics` | 同左 | 来自所属段 |
| `code` | `SHF_EXECINSTR` | `CNT_CODE 0x20` 或 `MEM_EXECUTE` | 同左 | 指令属性 |
| `entropy` | `data[offset:offset + file_size]` 的熵 | 同左 | 同左 | 同左 |

节的文件字节越过文件末尾时抛出 `FormatError`。Mach-O `LC_SEGMENT_64` 容不下 `nsects` 个 80 字节条目时也抛异常。

`segments(data: bytes) -> list[dict]` 返回 `{"name", "addr", "size", "offset", "file_size", "perms", "max_perms", "entropy"}`。ELF 名称来自 `ELF_SEGMENT_TYPES`，`max_perms` 为 `None`。Mach-O 使用 `segname`、`vmsize`、`initprot` 和 `maxprot`。可重定位 ELF、COFF 目标文件及 PE 映像返回 `[]`，因为 PE 映像直接映射每个节。

`section_at_offset(section_list, offset)` 返回文件范围包含偏移且 `file_size` 最小的节，没有则返回 `None`。`section_at_address(section_list, address)` 返回第一个在 `[addr, addr + size)` 中包含地址的节，没有则返回 `None`。

## 验证与检查

```bash
python3 scripts/project_test.py binary-inspector --stage 2 --path learning-artifacts/binary-inspector --strict
```

测试对照同一文件的 `llvm-objdump -h` 与 `otool -l` 输出检查名称、大小和偏移，并检查上述熵值。

## 探索失败边界

- 将 `.text` 的 `sh_offset` 设到接近文件末尾。`sections` 必须在对不足长的切片计算熵之前抛异常。
- 将 Mach-O `__PAGEZERO` 命令的 `nsects` 增到 40。命令仅 72 字节，节条目会与下一条命令重叠。
- 比较 `.bss` 与 `__common`。对零填充节读取 `size` 字节的工具，会为其他区域的字节报告熵。
- 检查 `__DATA_CONST`。文件中其 `initprot` 为 `"rw-"`。`SG_READ_ONLY` 标志要求 dyld 在应用阶段 4 的修正后将其设为只读。

## 扩展

- 标记所有既可写又可执行的区域。
- 为代码节增加 256 字节滑动窗口熵曲线。
- 读取 ELF 的 `GNU_RELRO` 程序头，报告其覆盖的节。

## 参考资料

- [System V gABI, sections](https://www.sco.com/developers/gabi/latest/ch4.sheader.html) and [program header](https://www.sco.com/developers/gabi/latest/ch5.pheader.html)
- [Microsoft PE Format, section flags](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#section-flags)
- [Apple mach-o/loader.h](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/loader.h)
- [Shannon, "A Mathematical Theory of Communication", 1948](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf)
