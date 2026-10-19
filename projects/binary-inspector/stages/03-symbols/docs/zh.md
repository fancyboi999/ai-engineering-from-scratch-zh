# 符号、字符串表与名称还原

第 3 阶段，共 6 阶段。读取第 [32](../../../../../phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md) 课的 ELF 符号记录，以及第 [40](../../../../../phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/docs/zh.md) 课的 COFF 和 Mach-O 符号表。C++ 名称来自第 [41](../../../../../phases/13-tools-and-protocols/41-recovering-data-and-types/docs/zh.md) 课。

## 构建内容

在 `symbols` 模块中实现三个函数：

- `read_cstring(data, offset, end=None)` 读取以 NUL 结尾的名称，拒绝在 `end` 前没有终止符的名称。
- `demangle(name)` 将支持的 Itanium C++ 名称还原为源码形式，否则返回 `None`。
- `symbols(data)` 用统一结构返回文件的全部符号。

## 为什么重要

符号是评审者最先阅读的名称：构建定义了哪些函数、需要哪些外部函数、strip 删除了什么。三种格式都用字符串表中的偏移存储名称。名称偏移超出所属表，是损坏文件最常见的问题。不检查偏移的读取器会打印其他表的文本。

三种记录布局：

| 格式 | 记录 | 大小 | 字段 |
|---|---|---|---|
| ELF `Elf64_Sym` | `<IBBHQQ` | 24 | 名称偏移、info（高 4 位为绑定，低 4 位为类型）、other、节索引、值、大小 |
| COFF 符号 | `<8sIhHBB` | 18 | 短名称或 `0` 加字符串表偏移、值、节号（有符号）、类型、存储类别、辅助记录数 |
| Mach-O `nlist_64` | `<IBBHQ` | 16 | 字符串偏移、`n_type`、`n_sect`、`n_desc`、值 |

## 具体案例

ELF。tally 目标文件的 `.symtab` 从偏移 488 开始，条目 9 为：

```text
59 00 00 00 12 00 02 00 00 00 00 00 00 00 00 00 92 00 00 00 00 00 00 00
```

名称在 `.strtab`（偏移 1064）中的偏移是 `0x59`，得到 `tally_sum`。Info 为 `0x12`，表示绑定 1（`"global"`）和类型 2（`"func"`）。节索引 2 是 `.text`。值为 0，大小为 `0x92`（146）。`llvm-objdump -t` 输出 `0000000000000000 g F .text 0000000000000092 tally_sum`。

COFF。目标文件第 28 条记录为 `00 00 00 00 6c 00 00 00 a0 00 00 00 01 00 20 00 02 00`。前四字节为零，名称位于 36 条记录之后的字符串表偏移 `0x6c`：`tally_scale`。值 `0xa0`，节号 1（`.text`），类型 `0x20`（函数），存储类别 2（外部，因此是 `"global"`），没有辅助记录。`.text` 这样的节符号有一条辅助记录。跳过辅助记录，但保留原始记录索引，因为阶段 4 的重定位也会计入辅助记录。

Mach-O。可执行文件条目 9 为 `62 00 00 00 0f 01 00 00 40 07 00 00 01 00 00 00`。`n_type` 的 `0x0f` 是 `N_SECT 0x0e` 加 `N_EXT 0x01`：已定义、全局。`n_sect` 为 1，指向含指令的 `__text`，因此类型是 `"func"`。值为 `0x100000740`。条目 14 为 `_puts`，`n_type` 为 1（未定义、外部），`n_desc` 为 `0x0100`。`n_desc` 的第 8 到 15 位存放库序号 1，即首个 `LC_LOAD_DYLIB`。

C++。`names.cpp` 编译得到 `_ZN5tally5resetEPNS_7CounterE`，解析如下：

1. `_Z` 开始一个编码。`N ... E` 是嵌套名称：`5tally`、`5reset`。将 `tally` 记录为替换项 `S_`。不记录函数名的最后一部分。
2. 随后是参数，`P` 表示指向下一个类型的指针。
3. `N S_ 7Counter E` 是嵌套名称。`S_` 展开为 `tally`，然后接 `Counter`。将 `tally::Counter` 记录为 `S0_`。
4. 指针类型 `tally::Counter*` 成为 `S1_`。

结果为 `tally::reset(tally::Counter*)`，与 `c++filt` 输出相同。

```figure
pj-binary-inspector-3
```

在实验中输入修饰后的名称，查看各 token、逐渐增长的替换表与最终结果。

## 实现契约

`read_cstring(data: bytes, offset: int, end: int | None = None) -> str`：`offset` 不在 `[0, end)` 内，或 `end` 前没有 NUL 时，抛出 `FormatError`。按 UTF-8 解码，非法字节使用替换字符。

`demangle(name) -> str | None`。支持的子集：

- `_Z` 及 Mach-O 形式 `__Z`。
- 普通与嵌套名称（`N ... E`）、const 成员函数（`NK`）、构造函数 `C1` `C2` `C3`、析构函数 `D1` `D2` `D3`，以及代表 `std::` 的 `St`。
- 内建类型 `v b c a h s t i j l m x y f d e w z`，以及 `P`、`R`、`O`、`K`（指针、引用、右值引用、const）。`K` 输出为后缀：`char const*`。
- 用 36 进制数字表示的替换项 `S_`、`S0_`、`S1_` 等。
- 只有参数 `v` 的函数输出 `()`。
- 未修饰名称、非字符串，以及子集外的内容（如模板 `I ... E` 或未定义替换项）返回 `None`，绝不抛异常。

`symbols(data: bytes) -> list[dict]`，每个符号一个字典：

```python
{"index": int, "name": str, "demangled": str | None, "value": int, "size": int | None,
 "kind": "func" | "object" | "section" | "file" | "notype" | ..., "binding": "local" | "global" | "weak",
 "section": str | None, "defined": bool, "table": "symtab" | "dynsym" | "coff" | "nlist"}
```

- ELF：读取所有 `SYMTAB` 与 `DYNSYM` 节，跳过条目 0，从 `sh_link` 获取字符串表。节索引 0 表示未定义（`None`），`0xfff1` 为 `"*ABS*"`，`0xfff2` 为 `"*COMMON*"`。无名节符号使用所属节名称。
- COFF：正节号指向节，-1 为 `"*ABS*"`，-2 为 `"*DEBUG*"`；外部符号节号为 0 且值非零时为 `"*COMMON*"`。存储类别 103 为 `"file"`。名称与所属节相同且有辅助记录的静态符号为 `"section"`。类型 `0x20` 为 `"func"`。PE 映像无符号表，返回 `[]`。
- Mach-O：跳过调试项（`n_type & 0xe0`）。`N_SECT` 指向节，`N_ABS` 为 `"*ABS*"`；未定义外部符号值非零时为 `"*COMMON*"`。为未定义符号增加 `library_ordinal`（`n_desc` 的第 8 到 15 位）。
- `defined` 等于 `section is not None`。

## 验证与检查

```bash
python3 scripts/project_test.py binary-inspector --stage 3 --path learning-artifacts/binary-inspector --strict
```

测试将名称、值、大小、绑定和所属节与 `llvm-objdump -t`、`nm -m` 对照，将还原名称与 `c++filt` 对照。

## 探索失败边界

- 将 ELF 条目 1 的名称偏移设为 `0x7ffffff0`。`symbols` 必须抛异常，不能返回空名称。
- 比较未剥离和已剥离的 arm64 构建。strip 保留五条记录：四个 dyld 绑定所需的未定义导入，以及被动态引用的 `__mh_execute_header`。已剥离 dylib 则不保留记录。
- 尝试 `_Z1fS_`。尚无替换项，名称解码器必须返回 `None`。
- `??_C@_03IMLOALHE@low?$AA@` 等 MSVC 名称使用另一套方案，解码器对其返回 `None`。

## 扩展

- 增加模板参数（`I ... E`）与模板形参（`T_`）。
- 读取 ELF `.gnu.version` 表，为 `.dynsym` 名称附加 `@GLIBC_2.2.5` 形式的版本。
- 输出 COFF 辅助节记录：长度、重定位数、校验和、COMDAT 选择。

## 参考资料

- [System V gABI, symbol table](https://www.sco.com/developers/gabi/latest/ch4.symtab.html)
- [Microsoft PE Format, COFF symbol table](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#coff-symbol-table)
- [Apple mach-o/nlist.h](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/nlist.h)
- [Itanium C++ ABI, mangling](https://itanium-cxx-abi.github.io/cxx-abi/abi.html#mangling)
