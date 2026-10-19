# 导入、导出、重定位与链式修正

第 4 阶段，共 6 阶段。实现第 [40](../../../../../phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/docs/zh.md) 课的链接表：重定位记录、PE 导入和导出目录、Mach-O 链式修正、导出 trie。重定位字段来自第 [32](../../../../../phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md) 课。

## 构建内容

在 `linkage` 模块中实现五个函数：

- `uleb128(data, offset)` 解码一个无符号 LEB128 值。
- `relocations(data)` 列出 ELF、COFF、Mach-O 重定位记录及 PE 基址重定位。
- `imports(data)` 列出文件需要的外部项，以及接收各地址的槽。
- `exports(data)` 列出文件提供给其他程序的项。
- `chained_fixups(data)` 解码已链接 Mach-O 文件的每个修正字。

## 为什么重要

目标文件中调用或指针的字节经常是零，重定位记录说明链接编辑器应在那里写什么。已链接映像中，加载器在程序运行前填充导入槽。当前 macOS 将修正信息存于指针槽内部，组成 64 位字链。反汇编器若不解码就读取槽，会报告一个不存在的地址。第 40 课开篇就是这个错误。

记录布局：

| 格式 | 记录 | 字段 |
|---|---|---|
| ELF `Elf64_Rela` | `<QQq`，24 字节 | 偏移、`r_info`（高 32 位符号索引、低 32 位类型）、加数 |
| COFF 重定位 | `<IIH`，10 字节 | 偏移、原始符号索引、类型。无加数字段。 |
| Mach-O `relocation_info` | `<iI`，8 字节 | 地址，随后 symbolnum:24、pcrel:1、length:2、extern:1、type:4 |
| PE 基址重定位块 | `<II` 后接 `<H` 条目 | 页 RVA、块大小，随后为类型（高 4 位）和页内偏移（低 12 位） |

## 具体案例

ELF。tally 目标文件首条 `.rela.text` 记录的偏移为 `0x15`，`r_info` 为 `0x0000000a00000002`（符号索引 10，类型 2），加数为 -4。类型 2 是 `R_X86_64_PC32`，符号 10 是 `tally_counter`。`llvm-objdump -r` 输出 `0000000000000015 R_X86_64_PC32 tally_counter-0x4`。

PE 导入。小型 PE 映像的导入目录位于 RVA `0x2000`，`.rdata` 将其映射到文件偏移 `0x400`。20 字节描述符读为：查找表 `0x2028`、时间戳 0、转发项 0、名称 `0x2096`、地址表 `0x2048`。名称 RVA 得到 `kernel32.dll`。查找表含三个 64 位条目和一个零。各条目第 63 位未置位，因此都是提示值加名称的 RVA：提示 0 为 `GetStdHandle`，提示 1 为 `WriteConsoleA`，提示 2 为 `ExitProcess`。导入 *i* 的槽为 `ImageBase + 0x2048 + 8 * i`：`0x140002048`、`0x140002050`、`0x140002058`。

Mach-O 链式修正。`LC_DYLD_CHAINED_FIXUPS` 指向 `__LINKEDIT` 中的 152 字节，头部含七个 32 位字段：

```text
00 00 00 00  20 00 00 00  50 00 00 00  60 00 00 00  04 00 00 00  01 00 00 00  00 00 00 00
version 0    starts 32    imports 80   symbols 96   count 4      format 1     names 0
```

偏移 32 处 `seg_count` 为 5，每段一个起始偏移。只有段 2（`__DATA_CONST`）具有起始偏移 24。在 32 + 24 处，`dyld_chained_starts_in_segment` 读为：大小 24、页面大小 `0x4000`、指针格式 6（`DYLD_CHAINED_PTR_64_OFFSET`）、段偏移 `0x4000`、页数 1、页起点 0。

链从 `__DATA_CONST` 文件偏移（`0x4000`）加第 0 页加 0 开始，逐个读取 64 位字：

| 偏移 | 原始值 | 第 63 位 | next（第 51 到 62 位） | 解码结果 |
|---|---|---|---|---|
| `0x4000` | `0x8010000000000000` | 1，绑定 | 2（8 字节） | 序号 0 |
| `0x4018` | `0x8010000000000003` | 1，绑定 | 2 | 序号 3 |
| `0x4020` | `0x001000000000098d` | 0，重定基址 | 2 | 目标 `0x98d` + `0x100000000` |
| `0x4038` | `0x000000000000099a` | 0，重定基址 | 0，结束 | 目标 `0x10000099a` |

偏移 80 的导入表含 32 位条目：库序号（8 位）、弱绑定（1 位）、名称偏移（23 位）。条目 3 为 `0x5c01`：序号 1、非弱绑定、名称偏移 46；偏移 96 + 46 处是 `_puts`。库序号 1 指首个 `LC_LOAD_DYLIB`，即 `/usr/lib/libSystem.B.dylib`。因此槽 `0x100004018` 接收 `_puts` 的地址，与 `dyld_info -fixups` 输出完全相同。

dylib 的导出 trie 起始字节为 `00 01 5f 74 61 6c 6c 79 5f 00 53`：终端大小 0、一个子节点、边 `_tally_`、子节点偏移 `0x53`。每个终端节点含 ULEB128 标志，以及相对映像基址的 ULEB128 偏移。`_tally_sum` 位于 `0x4a8`。strip 删除 dylib 的 `LC_SYMTAB` 记录，但保留此 trie，因为 dyld 通过它绑定。

```figure
pj-binary-inspector-4
```

在实验中输入 64 位修正字。实验将其拆分为位字段，判断绑定还是重定基址，并计算下一偏移与目标。

## 实现契约

`uleb128(data: bytes, offset: int) -> tuple[int, int]`：返回数值及其后的偏移。还没遇到第 7 位未置位的字节就结束，或已读取 10 字节时，抛出 `FormatError`。

`relocations(data: bytes) -> list[dict]`，每项为 `{"section", "offset", "type", "symbol", "addend"}`：

- ELF：读取所有 `RELA`（24 字节，显式加数）和 `REL`（16 字节，加数为 `None`）节。`section` 是 `sh_info` 指向的待修改节名。符号来自 `sh_link` 表。类型名为 `R_X86_64_` 或 `R_AARCH64_` 加预置表中的名称，未知时使用数字。
- COFF：按表顺序读取各节记录，类型为 `IMAGE_REL_AMD64_` 加名称，加数为 `None`。符号索引计入辅助记录。
- PE：读取 `basereloc` 目录的基址重定位，跳过类型 0（填充）。`offset` 为 RVA，`symbol` 为 `None`，类型 10 名为 `IMAGE_REL_BASED_DIR64`。
- Mach-O：读取各节记录。`ARM64_RELOC_ADDEND`（类型 10）携带下一记录的有符号 24 位加数，本身不列出。`extern` 为 0 时，`symbolnum` 是从 1 开始的节号。
- 记录引用不存在的符号或节时抛出 `FormatError`。

`imports(data: bytes) -> list[dict]`，每项为 `{"name", "library", "slots", "hint", "ordinal"}`：

- PE：每个查找表条目一行。第 63 位置位表示按序号导入（`name` 为 `"#n"`）。`slots` 包含 IAT 槽的绝对地址。
- 带链式修正的 Mach-O：每个链式导入一行，`ordinal` 为索引，`slots` 列出使用该导入的绑定地址。
- 其余情况：使用阶段 3 的未定义全局符号，每名称一行，`slots` 为空。Mach-O 根据 `library_ordinal` 获取 `library`。

`exports(data: bytes) -> list[dict]`，每项为 `{"name", "address", "ordinal", "forwarder"}`：

- PE：读取导出目录。名称 *k* 映射到地址项 `ordinals[k]`，导出序号为该索引加序号基数。落在导出目录内的地址是转发字符串。
- 存在非空 `LC_DYLD_EXPORTS_TRIE` 的 Mach-O：读取 trie，按名称排序，地址 = `__TEXT` 基址 + 偏移。
- 其余情况：使用已定义的全局和弱符号，排除节、文件、`*ABS*`、`*DEBUG*` 条目。文件有 `.dynsym` 时只使用该表。

`chained_fixups(data: bytes) -> dict` 返回 `{"header", "imports", "fixups"}`。无 `LC_DYLD_CHAINED_FIXUPS` 时返回 `{"header": None, "imports": [], "fixups": []}`。

- `header`：`{"version", "imports_count", "imports_format", "pointer_formats"}`。
- `imports`：`{"index", "name", "library", "weak", "addend"}`。支持导入格式 1、2、3。库序号 `0`、`-1`、`-2` 分别为 `"self"`、`"main-executable"`、`"flat-lookup"`。
- `fixups`：`{"offset", "address", "section", "raw", "next", "kind"}`；绑定另有 `ordinal`、`name`、`library`、`addend`，重定基址另有 `target`。支持指针格式 2 和 6。格式 6 将 `__TEXT` 基址加到目标上。
- 非零版本、压缩名称、不支持的格式、多起点页面均抛出 `FormatError`。绑定序号超出导入表、链越出页面时也抛异常。

## 验证与检查

```bash
python3 scripts/project_test.py binary-inspector --stage 4 --path learning-artifacts/binary-inspector --strict
```

测试对照 `llvm-objdump -r`、`llvm-objdump -p` 与 `dyld_info -fixups -exports`，并输入损坏的链、trie 和重定位记录。

## 探索失败边界

- 将首个修正字的 `next` 设为 `0xfff`。下一字会在 `0x3ffc` 字节之后，越出页面。没有页面检查，读取器会跟随指针进入无关数据。
- 仅有 4 个导入时，将绑定序号设为 50。解码器必须抛异常，不能从表后方读名称。
- 将 trie 子节点指回偏移 0。没有已访问集合的读取器会无限循环。
- 对照 `0x102` 处 `bucket_names` 的 COFF 重定位与同位置 ELF 记录。ELF 记录携带加数 -4，而 COFF 类型 `REL32` 已内含 -4。

## 扩展

- 对以 `-no_fixup_chains` 链接的文件解码 `LC_DYLD_INFO_ONLY` 绑定操作码。
- 读取 ELF `.dynamic` 节，为共享目标列出 `DT_NEEDED` 库。
- 读取 PE 延迟加载导入目录。

## 参考资料

- [System V gABI, relocation](https://www.sco.com/developers/gabi/latest/ch4.reloc.html) and [AMD64 psABI](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Microsoft PE Format: COFF relocations, the .idata and .edata sections, base relocations](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format)
- [Apple dyld, mach-o/fixup-chains.h](https://github.com/apple-oss-distributions/dyld/blob/main/include/mach-o/fixup-chains.h)
- [Apple mach-o/loader.h, exports trie](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/loader.h)
- [DWARF 5, section 7.6, LEB128](https://dwarfstd.org/doc/DWARF5.pdf)
