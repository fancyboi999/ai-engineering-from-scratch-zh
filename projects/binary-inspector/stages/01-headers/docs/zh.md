# 识别格式并解析文件头

第 1 阶段，共 6 阶段。先读[项目 README](../../../README.md)。本阶段应用第 [32](../../../../../phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md) 课的 ELF 文件头读取器，并用第 [40](../../../../../phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/docs/zh.md) 课的表扩展到 COFF、PE32+ 和 Mach-O。

## 构建内容

在 `formats` 模块中实现三个函数：

- `detect_format(data)` 读取起始字节，返回 `"elf64"`、`"coff"`、`"pe"` 或 `"macho64"`。
- `parse_header(data)` 为四种格式返回统一的字典结构。
- `load_commands(data)` 按文件顺序返回 Mach-O 加载命令。

后续每个阶段都先调用 `parse_header`。文件头读错，之后的节、符号和修正也全会出错。

## 为什么重要

扩展名不能识别二进制格式。clang 生成的 `.o` 可以是 ELF 或 Mach-O，`.obj` 是 COFF 目标文件，甚至没有魔数。检查器必须根据字节决定格式，拒绝无法正确读取的文件。猜测后继续运行的工具会输出貌似正确、实际错误的表。

本项目四种格式都是小端。预置辅助函数 `unpack(fmt, data, offset)` 用 `struct.unpack_from` 读取一条记录，越过文件末尾时抛出 `FormatError`。每次读取都使用它，让截断文件总能以指出偏移的消息失败。

## 具体案例

剥离符号后的 arm64 构建，前 32 字节如下：

```text
cf fa ed fe 0c 00 00 01 00 00 00 00 02 00 00 00
12 00 00 00 a8 05 00 00 85 00 20 00 00 00 00 00
```

将其读取为八个小端 32 位字段（`<IiiIIIII`）：

| 字段 | 字节 | 值 | 含义 |
|---|---|---|---|
| magic | `cf fa ed fe` | `0xfeedfacf` | Mach-O 64，小端 |
| cputype | `0c 00 00 01` | `0x0100000c` | arm64（`CPU_TYPE_ARM` 加 64 位标志） |
| filetype | `02 00 00 00` | 2 | `MH_EXECUTE`，所以 kind 是 `"executable"` |
| ncmds | `12 00 00 00` | 18 | 后接 18 条加载命令 |
| sizeofcmds | `a8 05 00 00` | 1448 | 占据字节 32 到 1480 |
| flags | `85 00 20 00` | `0x00200085` | `MH_NOUNDEFS`、`MH_DYLDLINK`、`MH_TWOLEVEL`、`MH_PIE` |

加载命令从偏移 32 开始，每条以 `cmd` 和 `cmdsize` 开头。第一条是 `LC_SEGMENT_64`（`0x19`），下一条位于 32 加上其 `cmdsize`。18 条中有一条 `LC_MAIN`（`0x80000028`），其 `entryoff` 为 `0x5e8`。`__TEXT` 段起始虚拟地址是 `0x100000000`，因此入口为 `0x1000005e8`，正是未剥离构建中 `_main` 的地址。

其他格式遵循相同模式：

- ELF：`7f 45 4c 46`，随后 `EI_CLASS` 为 2（64 位），`EI_DATA` 为 1（小端）。`e_type` 为 1 表示可重定位，`e_machine` 为 62（`0x3e`）表示 x86-64。tally 目标文件的 `e_shnum` 为 13，`e_shstrndx` 为 1。
- COFF 目标文件：没有魔数。字节 `64 86` 表示机器类型 `0x8664`，随后 `0a 00` 表示 10 个节。`SizeOfOptionalHeader` 为 0，这是目标文件的特征。
- PE 映像：偏移 0 是 `MZ`，`0x3c` 处的 `e_lfanew` 是 `0x40`，`0x40` 处是 `PE\0\0`。可选头从 `0x58` 开始，魔数为 `0x20b`（PE32+）。`AddressOfEntryPoint` 的 `0x1000` 加上 `ImageBase` 的 `0x140000000`，得到入口 `0x140001000`。

```figure
pj-binary-inspector-1
```

在实验中选择格式并修改字段。实验按 `detect_format` 相同逻辑决策，显示最先失败的检查。

## 实现契约

`detect_format(data: bytes) -> str`

- 少于 4 字节：抛出 `FormatError`。
- `\x7fELF`：要求 `EI_CLASS` 为 2、`EI_DATA` 为 1，否则抛出包含 "ELF64" 或 "little-endian" 的 `FormatError`。返回 `"elf64"`。
- `MZ`：读取 `0x3c` 处的 `e_lfanew`，要求其指向 `PE\0\0`。返回 `"pe"`。
- 按小端字读取到 `0xfeedfacf`：返回 `"macho64"`。遇到 `0xfeedface`（"32-bit"）或 `ca fe ba be`（"universal"）则抛异常。
- 否则，若前 20 字节可解析为 COFF 文件头，机器类型属于 `COFF_MACHINES`、`SizeOfOptionalHeader` 为 0、节数为 1 到 96，则返回 `"coff"`。
- 其余情况抛出 `FormatError("unknown format: ...")`。

`parse_header(data: bytes) -> dict` 返回：

```python
{
    "format": "elf64" | "coff" | "pe" | "macho64",
    "arch": "x86_64" | "arm64" | ...,
    "bits": 64,
    "endian": "little",
    "kind": "relocatable" | "executable" | "shared" | ...,
    "entry": int | None,
    "fields": {...},
}
```

必须包含的 `fields` 键，后续阶段及测试会读取：

- ELF：`e_type`、`e_machine`、`e_flags`、`e_phoff`、`e_phnum`、`e_shoff`、`e_shnum`、`e_shstrndx`。头表越过文件末尾、条目大小不为 64（节）或 56（程序头）、`e_shstrndx` 不小于 `e_shnum` 时均抛异常。可重定位文件的 `entry` 为 `None`。
- COFF 和 PE：`machine`、`number_of_sections`、`time_date_stamp`、`pointer_to_symbol_table`、`number_of_symbols`、`size_of_optional_header`、`characteristics` 和 `section_table`（首个节条目的文件偏移）。
- PE 另有 `magic`、`entry_rva`、`image_base`、`section_alignment`、`file_alignment`、`size_of_image`、`size_of_headers`、`subsystem`、`dll_characteristics`、`dll_flags`（名称来自 `DLL_CHARACTERISTICS`），以及 `data_directories`：仅含非零项，从 `PE_DIRECTORIES` 名称映射到 `{"rva", "size"}`。拒绝魔数 `0x10b`（PE32）。characteristics 的 `0x2000` 位（DLL）置位时，`kind` 为 `"shared"`。
- Mach-O：`cputype`、`filetype`、`ncmds`、`sizeofcmds`、`flags`、`flag_names` 和 `load_commands`（名称列表）。

`load_commands(data: bytes) -> list[dict]` 为每条命令返回 `{"cmd", "name", "offset", "size"}`。名称来自 `LOAD_COMMANDS`，未知值使用 `LC_0x...`。`sizeofcmds` 越出文件，或 `cmdsize` 小于 8、不是 8 的倍数、越出 `sizeofcmds` 时抛异常。

## 验证与检查

在仓库根目录执行一次初始化，然后评分：

```bash
python3 scripts/project_test.py binary-inspector --init learning-artifacts/binary-inspector
python3 scripts/project_test.py binary-inspector --stage 1 --path learning-artifacts/binary-inspector --strict
```

新工作区会以 `not implemented yet: stage 1: implement parse_header` 失败。测试覆盖四种格式、按 `otool -l` 顺序的 18 条 Mach-O 加载命令、`llvm-objdump -p` 输出的 PE 字段、五种应拒绝变体，以及留出程序。

## 探索失败边界

- 将 ELF 的 `e_shoff` 设为接近文件末尾的值。`parse_header` 必须在读取任何节之前抛异常。
- 将 Mach-O 首条命令的 `cmdsize` 设为 0。没有大小检查，循环就会无限读取同一条命令。
- 将 `e_lfanew` 设到 PE 文件末尾之外。`unpack` 边界检查必须指出偏移。
- 输入 C 源文件。最后的 COFF 检查必须因机器字段不匹配而拒绝。

## 扩展

- 读取 32 位字段布局，增加 ELF32 和 PE32 支持，保持输出结构不变。
- 读取通用 Mach-O 的一个切片：fat 头按架构列出偏移与大小。
- 将 `LC_BUILD_VERSION` 解码为平台和最低 OS 版本。

## 参考资料

- [System V gABI, ELF header](https://www.sco.com/developers/gabi/latest/ch4.eheader.html)
- [Microsoft PE Format](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format)
- [Apple mach-o/loader.h](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/loader.h)
- [Python struct module](https://docs.python.org/3/library/struct.html)
