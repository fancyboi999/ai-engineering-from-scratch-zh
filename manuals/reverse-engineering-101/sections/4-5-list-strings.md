# list_strings

> list_strings 返回 Ghidra 定义为 Data 的每个字符串，包括加载器元数据和符号片段，但不包含 Ghidra 未定义的文本。

你预期五个标签和三个格式字符串，`list_strings` 却返回 39 项，包括 `/usr/lib/dyld`、`_label`、`_` 和空字符串。每项都是真实文件字节。列表完整覆盖 Ghidra 定义的内容，也仅止于此。

读完本节，你能将 39 个字符串逐一定位到加载命令，也能说明空结果能证明和不能证明什么。

## 调用

```listing
title: list_strings 及其中三项
source: capture/out/10-mcp-08-list-strings.json
lang: json
note: 请求参数、39 项中的三项，以及七项限制中的两项字符串限制。
---
"name": "list_strings",
"arguments": {}
…
{
  "address": "0x100000770",
  "value": "F",
  "string": {
    "encoding": "US-ASCII",
    "termination": "present_or_not_required",
    "byte_length": 2
  }
},
…
{
  "address": "0x1000007cf",
  "value": "",
  "string": {
    "encoding": "US-ASCII",
    "termination": "present_or_not_required",
    "byte_length": 1
  }
},
…
{
  "address": "0x1000080c7",
  "value": "_label",
  "string": {
    "encoding": "US-ASCII",
    "termination": "present_or_not_required",
    "byte_length": 7
  }
},
…
"limitations": [
  …
  "Only Ghidra-defined string Data is observed; packed or undefined string bytes may be absent. Completeness applies to that inventory, and an empty search does not establish that text is absent from the artifact. If an address is known, use read_bytes and xrefs to inspect bytes and references.",
  "Charset is reported, while a non-missing terminator cannot distinguish a present terminator from a fixed or Pascal layout.",
  …
],
```

桥接层遍历程序每个已定义数据项，保留具有字符串值的项，为每项记录字符集、所需终止符是否缺失，以及字节长度。每项都是 Ghidra 加载器或分析器创建的 `Data` 对象。没有分析器转换为 `Data` 的可打印字节串不在列表中。第一条限制固定写在 rea 中，文档也有同样说明：

```rule
label: 空结果证明什么
source: ghidra §Admitted inventory semantics
---
压缩或未定义的字面量可能不会出现，Rust 字符串也包括在内。因此空结果不能证明二进制中没有文本。
```

`termination` 有两个值。`missing` 表示需要空字节的字符串类型缺少该字节。`present_or_not_required` 包含其他情况，因为 Ghidra 无法区分已有终止符与不需要终止符的布局。`byte_length` 计入终止符：`F` 是两字节。

## 六处位置，三十九个字符串

将 39 个地址排序，会分成六段。每段对应[第 3.2 节](#s-inspect-binary-layout-and-the-load-image)的一条加载命令。

| 位置 | 地址 | 数量 | 示例 |
|---|---|---|---|
| 头部加载命令字符串 | `0x100000404`、`0x100000490` | 2 | `/usr/lib/dyld`、`/usr/lib/libSystem.B.dylib` |
| `__TEXT,__cstring`，文件位置 1904 | `0x100000770` 到 `0x1000007cf` | 10 | `F`、`D`、`C`、`B`、`A`、`usage: ledger <before> <after> [score...]\n`、`change %d%%\n`、`total %d\n`、`score %d grade %s\n`，以及一个空字符串 |
| `LC_DYLD_CHAINED_FIXUPS` 导入名，文件位置 32768 | `0x100008069` 到 `0x1000080a7` | 6 | `___stack_chk_fail`、`_atoi`、`_printf` |
| `LC_DYLD_EXPORTS_TRIE` 边标签，文件位置 32944 | `0x1000080b2` 到 `0x100008111` | 7 | `_`、`_label`、`grade`、`main`、`percent_change`、`total` |
| `LC_SYMTAB` 字符串表，文件位置 33304 | `0x10000821a` 到 `0x1000082a5` | 13 | `__mh_execute_header`、`_grade_label`、`_labels` |
| `LC_CODE_SIGNATURE` 标识，文件位置 33456 | `0x10000831c` | 1 | `ledger-arm64-O1` |

`__cstring` 的十项是程序自身文本。该节为 95 字节，[第 3.4 节](#s-analyze-overview)中 Ghidra 对应块为 96 字节，一直延伸到 `0x1000007d0` 的 `__const` 起点。`0x1000007cf` 的额外字节是对齐填充，Ghidra 将其定义为长度 1 的空字符串。这项真实且无害，每个链接映像中都会看到类似填充。

导出 trie 是导出名称的前缀树，边只保存一次共享前缀。因此 Ghidra 字符串数据保存 `_`、`_label`、`_mh_execute_header`、`grade`、`main`、`percent_change`、`total` 七个片段，而非六个导出名称。`LC_SYMTAB` 字符串表保存十三个完整名称，与 `nsyms` 13 匹配。最后一个字符串是代码签名标识，即链接器嵌入的输出文件名。所以采集工具包警告：输出名不同，字节也会不同。

```figure
id: fig-4-7
kind: structure
title: 按加载命令分类的 ledger-arm64-O1 的 39 个字符串
claim: 39 个字符串中十个是程序文本，其余 29 个是加载器和链接器保存在文件中的名称与路径。
caption: 按地址从上向下读。每行给出加载命令、地址范围、数量和一个示例。依据 capture/out/10-mcp-08-list-strings.json 和 04-inspect-macho.json。
```

## 函数引用的字符串

`_grade_label` 档案的 `referenced_strings` 切面只有一项：`0x100000770` 的 `F`，来自 `0x1000005c8` 的加载。函数并不直接加载 `F`，而是从 `0x100004030` 的 `_labels` 加载指针；这是 `__DATA_CONST` 中的 40 字节 `__const`，保存指向五个标签的五个指针。Ghidra 跟随第一个指针，记录后方字符串，`referenced_names` 对同一条指令同时列出 `_labels` 与 `s_F_100000770`。应将引用字符串理解为函数可到达的字符串，而非唯一使用的字符串。

x86-64 对象中，相同五个标签位于 `.rodata.str1.1`，即[第 3.4 节](#s-analyze-overview)的十字节块，`string_count` 却为 20。[第 32 课](phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch)读取保存其余十项的 ELF 字符串表。

## 清单不能证明什么

限制就在规则的第一个词：`defined`。三类文本不是 `Data`：编译器可能把字符串打包进结构体；分析器可能跳过没有终止符的字符串；程序也可能运行时构建字符串。列表都不包含它们。

采集目标没有这些情况，因此 39 项覆盖整个文件。对非自己构建的目标，缺少字符串应视为未知。知道地址时，按限制说明用 `read_bytes` 读取字节，用 `xrefs` 查找使用者。[第 5.2 节](#s-residual-unknowns-and-coverage)展示 rea 如何记录这类未知项。

```takeaways
- 读取值前，先排序字符串地址，将每段映射到加载命令。
- 每个链接映像都可能包含符号名、库路径、trie 片段和填充。
- 缺少字符串时视为未知，再对已知地址使用 `read_bytes`。
- 将 `referenced_strings` 读作函数通过加载可到达的文本；函数可能还使用更多字符串。
```

Sources: capture/out/10-mcp-08-list-strings.json, capture/out/04-inspect-macho.json, capture/out/05-analyze-arm64-O1.json, capture/out/10-mcp-12-analyze-function-grade-label-O1.json, capture/fixtures/ledger-arm64-O1, capture/README.md; rea 6.7.0 at 27dc42d: bridge/ghidra/ReaGhidraBridge.java, src/ghidra/GhidraProviderCapabilities.ts; rea docs/ghidra-provider.md
