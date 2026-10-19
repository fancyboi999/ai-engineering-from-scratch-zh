# address-to-file-offset

> address-to-file-offset 将虚拟地址映射到 Ghidra 加载于该处的文件字节，段加载命令允许手工核对结果。

`inspect-macho` 报告 `_grade` 导出于 `0x100000518`。你想用十六进制查看器打开 `ledger-arm64-O1` 阅读字节，需要该地址的文件偏移。一条 rea 命令即可回答，Mach-O 加载命令也能让你脱离 rea 算出同样数字。

读完本节，你能用 `rea address-to-file-offset` 将地址转换为文件偏移，也能根据 `LC_SEGMENT_64` 字段手算，并说明何时两者可能不同。

## 命令

```listing
title: 命令及退出状态
source: capture/out/00-commands.txt
lang: text
note: 取自命令索引的两行。括号内耗时每次变化，故省略。
---
$ rea address-to-file-offset fixtures/ledger-arm64-O1 0x100000518 --provider ghidra --format json
[exit 0] (…) -> 08-address-to-file-offset.json
```

录制 Mac 的调用耗时 7 到 9 秒。每次需要 Ghidra 的独立 CLI 调用都会把目标导入新无界面项目。[第 4.1 节](#s-open-binary-and-the-headless-bridge)详述成本；已打开的 MCP 会话内，相同问题低于 100 毫秒。

```listing
title: 答案及其规则
source: capture/out/08-address-to-file-offset.json
lang: json
note: 截自记录。省略 subject、provider、analysis_profile 块及六条限制中的五条。
---
"operation": "address_to_file_offset",
"parameters": {
  "address": "0x100000518"
},
"raw_result": {
  "address": "0x100000518",
  "file_offset": 1304
},
"normalized_result": {
  "address": "0x100000518",
  "file_offset": 1304
},
"confidence": "observed",
"authority": "shipped-artifact",
…
"limitations": [
  …
  "Offsets come from Ghidra source-byte mappings, not virtual-address arithmetic. Uninitialized memory, missing mappings and ambiguous mappings fail explicitly.",
  …
],
```

答案是 1304。记录为 `observed`：Ghidra 报告它在该地址加载的是哪个文件字节，rea 原样传递数字。

## 根据加载命令计算

**文件偏移：** 字节在文件中的位置，从零计数。**虚拟地址：** 加载器映射所属段之后，同一字节在内存的位置。段将从 `fileoff` 开始的 `filesize` 字节映射到从 `vmaddr` 开始的 `vmsize` 字节，因此同段内二者相差常量。

[上一节](#s-inspect-binary-layout-and-the-load-image)的 `__TEXT` 具有 `vmaddr` `0x100000000`、`fileoff` 0。段内任意字节适用 `offset = address - vmaddr + fileoff`。对 `_grade` 即 `0x100000518 - 0x100000000 + 0`，结果 `0x518`，即 1304。

节提供第二次核对。`__text` 的 `address` 为 `0x100000500`，`file_offset` 为 1280。函数在节起点后 `0x18`（24）字节，因此偏移为 `1280 + 24`，仍为 1304。打开固件第 1304 字节，可见 `e8 cc 8c 52`，是 `mov w8, #0x6667` 的小端编码，即[第 4.3 节](#s-procedure-assembly)中 `_grade` 的首条指令。

| 方法 | 输入 | 结果 |
|---|---|---|
| 段规则 | `vmaddr` `0x100000000`、`fileoff` 0 | `0x100000518 - 0x100000000 + 0` = 1304 |
| 节规则 | `address` `0x100000500`、`file_offset` 1280 | `1280 + (0x518 - 0x500)` = 1304 |
| rea 与 Ghidra | 地址 | `file_offset: 1304` |

```figure
id: fig-3-4
kind: structure
title: 从 0x100000518 到文件偏移 1304
claim: 段规则、节规则、Ghidra 来源映射均得到字节 1304，正是 _grade 首条指令的起点。
caption: 各行从左向右读。绿色框为加载命令事实，灰色框为手算，紫色框为 Ghidra 回答。来自 capture/out/04-inspect-macho.json、08-address-to-file-offset.json 和固件字节。
```

ELF 规则形式相同。可加载段为 `offset = address - p_vaddr + p_offset`，节则使用 `sh_offset`。[第 32 课](phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch)对 `ledger-x86_64-O1.o` 手算。可重定位目标没有程序头表，也没有段安排内存位置。[第 3.4 节](#s-analyze-overview)将其 `.text` 显示于 `0x100000` 时，该数字是 Ghidra 选择的放置位置，不是文件中的事实。

## Ghidra 实际如何处理

桥接不直接计算。`addressToFileOffset` 向 Ghidra 查询该地址的内存块，并要求块已初始化。否则以 `invalid_request` 失败，消息为 “Address has no initialized file-backed memory”。随后遍历块的来源映射，仅保留 `FileBytes` 从文件偏移 0 开始，且原始字节 SHA-256 与接纳目标一致的映射。必须恰有一个映射，偏移大于 2^53 - 1 也拒绝。

回复仅带 `address`、`file_offset`。rea 输出 schema 还允许 `provider_file_offset`、`image_base_file_offset`、`source_path`，6.7.0 的 Ghidra provider 省略它们。

三个地址展示三种结果。捕获只运行第一行，其他两行来自上述桥接代码。

| 地址 | 所在位置 | 结果 |
|---|---|---|
| `0x100000518` | `__text`，已初始化，一个 `FileBytes` 映射 | `file_offset` 1304 |
| `0x0` | `__PAGEZERO`，`filesize` 0，无文件字节 | `invalid_request`，没有已初始化且有文件后备的内存 |
| `EXTERNAL:0x1` | Ghidra 为导入函数建立的外部空间 | `invalid_request`，完全没有文件字节 |

因此限制说明偏移并非虚拟地址算术。你的算式与 Ghidra 对 `__TEXT`、`__DATA_CONST`、`__LINKEDIT` 已用 1104 字节的映射一致。算式仍能给出数字而 Ghidra 拒绝时，两者不同：包括 `__PAGEZERO` 的 4 GiB、字节 33872 之后的填充，以及[第 4.2 节](#s-list-procedures-and-function-bodies)的 `EXTERNAL` 块。

```takeaways
- 提问 Ghidra 前，先根据段计算 `address - vmaddr + fileoff`，再比较。
- 用节的 `file_offset` 再核对：`1280 + 0x18` 为 1304。
- `__PAGEZERO`、`EXTERNAL` 和存在两份映射的地址，预期返回 `invalid_request`。
- 向他人指出十六进制查看器的字节时，给出文件偏移。
```

Sources: capture/out/00-commands.txt, capture/out/04-inspect-macho.json, capture/out/08-address-to-file-offset.json, capture/fixtures/ledger-arm64-O1; rea 6.7.0 at 27dc42d: bridge/ghidra/ReaGhidraBridge.java, src/contracts/toolOutputSchemaGroups.ts
