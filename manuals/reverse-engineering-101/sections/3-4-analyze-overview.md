# analyze 与 binary_overview 记录

> rea analyze 是 binary_overview 的 CLI 名称，其派生记录逐构建统计 Ghidra 发现的段、过程和已定义字符串。

相同四个函数有两种构建：arm64 可执行文件 `ledger-arm64-O1` 和 x86-64 目标文件 `ledger-x86_64-O1.o`。阅读函数前，希望每个构建用一屏说明大小及 Ghidra 的识别结果。`rea analyze` 就是这一屏。

读完本节，你能对两种构建运行 `rea analyze`，阅读十二段和十段，并解释为何一份有 13 个过程、另一份只有 4 个。

## 一个 CLI 动词，一个组合操作

`analyze` 和 `inspect` 都是 MCP 操作 `binary_overview` 的别名。使用 Ghidra 时，操作向桥接提问 `read_binary_inventory_summary`，一次回复取得段及两项计数。不支持该问题的 provider 走旧路径：同时调用 `list_segments`、`list_procedures`、`list_strings`。两种路径均返回段及长度、两项计数。输出 schema 有六个字段：`document`、`image_base`、`segments`、`segment_count`、`procedure_count`、`string_count`，各段还可带 `image_base`、`address_space`。

```listing
title: 两条概览命令
source: capture/out/00-commands.txt
lang: text
note: 取自命令索引的四行。各调用将目标导入新的无界面项目，耗时 7 到 9 秒。耗时每次变化，故省略。
---
$ rea analyze fixtures/ledger-arm64-O1 --provider ghidra --format json
[exit 0] (…) -> 05-analyze-arm64-O1.json
$ rea analyze fixtures/ledger-x86_64-O1.o --provider ghidra --format json
[exit 0] (…) -> 05-analyze-x86_64-O1.json
```

**组合操作：** 从其他操作构建结果的 rea 操作。Evidence 的 provider 为 `rea-workflow`，将 Ghidra 配置放入 `upstream_analysis_profile`，`confidence: "derived"`。首条限制是 “Derived by an REA composed workflow.”，随后为 Ghidra 限制，每条以前置引擎、版本、来源操作开头，如 `Ghidra (ghidra 12.1.4) read_binary_inventory_summary:`。配置参数 `source_limitations: "provider-operation-caveats-v1"` 指定该规则。`list_procedures` 等原语操作为 `observed`。

```listing
title: 组合记录的 provider 块
source: capture/out/05-analyze-arm64-O1.json
lang: json
note: 保留 provider、分析配置开头及两个工作流参数。其余配置参数在本手册各 Ghidra 记录中相同。
---
"provider": {
  "id": "rea-workflow",
  "name": "REA composed investigation workflow",
  "version": "1"
},
"analysis_profile": {
  …
  "parameters": {
    "upstream_analysis_profile": {
      "provider": {
        "id": "ghidra",
        "name": "Ghidra",
        "version": "12.1.4"
      },
      "parameters": {
        "target_kind": "executable",
        "target_format": "mach-o",
        "architecture": "arm64",
        …
        "import_mode": "ephemeral-source-immutable",
        …
      },
      …
    },
    "source_limitations": "provider-operation-caveats-v1",
    "workflow_revision": 4
  },
  …
},
```

## arm64 可执行文件

```listing
title: ledger-arm64-O1 的 binary_overview
source: capture/out/05-analyze-arm64-O1.json
lang: json
note: 仅保留结果。省略十二个段中的九个、九条限制中的八条。
---
"normalized_result": {
  "document": "target-01b5d08b08fb.bin",
  "image_base": "0x100000000",
  "segments": [
    {
      "name": "__TEXT",
      "start": "0x100000000",
      "end": "0x100000500",
      "length": 1280,
      "image_base": "0x100000000",
      "address_space": "ram"
    },
    {
      "name": "__text",
      "start": "0x100000500",
      "end": "0x100000740",
      "length": 576,
      "image_base": "0x100000000",
      "address_space": "ram"
    },
    …
    {
      "name": "EXTERNAL",
      "start": "0x10000c000",
      "end": "0x10000c200",
      "length": 512,
      "image_base": "0x100000000",
      "address_space": "ram"
    }
  ],
  "segment_count": 12,
  "procedure_count": 13,
  "string_count": 39
},
"confidence": "derived",
"authority": "shipped-artifact",
"environment": null,
"limitations": [
  "Derived by an REA composed workflow.",
  …
],
```

`document` 不是输入路径，而是 rea 在运行时根目录创建的私有副本 `target-01b5d08b08fb.bin`。名称由 `target-` 加 SHA-256 前十二位十六进制组成。[第 4.1 节](#s-open-binary-and-the-headless-bridge)展示复制过程。

十二个段是 Ghidra 内存块，与[第 3.2 节](#s-inspect-binary-layout-and-the-load-image)的四条 `LC_SEGMENT_64` 不同。Ghidra 将 `__TEXT` 拆为 1280 字节头部及五个节，将 `__DATA_CONST` 拆为 `__got`、`__const` 及之后的 16296 字节，将 `__LINKEDIT` 拆为已用 1104 字节和到下一页的填充。

末端不包含在范围中：`__text` 从 `0x100000500` 到 `0x100000740`，下一块恰从 `0x100000740` 开始。最后的 `EXTERNAL` 完全不在文件内，是 Ghidra 为导入函数创建的，[第 4.2 节](#s-list-procedures-and-function-bodies)展示其中四个。

13 个过程包括 `ledger.c` 的四个函数、`LC_MAIN` 指向的 `entry`、四个 thunk、四个外部函数。thunk 位于 `__stubs`，外部函数位于 `EXTERNAL`。39 个字符串是 Ghidra 定义为字符串数据的全部内容，[第 4.5 节](#s-list-strings)逐一定位。

## x86-64 可重定位目标文件

```listing
title: ledger-x86_64-O1.o 的 binary_overview
source: capture/out/05-analyze-x86_64-O1.json
lang: json
note: 仅保留结果。省略 .comment、.rela.rodata、.rela.text、.strtab、.symtab、_elfHeader 条目。
---
"normalized_result": {
  "document": "target-9a4a8082ba5e.o",
  "image_base": "0x100000",
  "segments": [
    {
      "name": ".text",
      "start": "0x100000",
      "end": "0x10009f",
      "length": 159,
      "image_base": "0x100000",
      "address_space": "ram"
    },
    {
      "name": ".rodata",
      "start": "0x1000a0",
      "end": "0x1000f0",
      "length": 80,
      "image_base": "0x100000",
      "address_space": "ram"
    },
    {
      "name": ".rodata.str1.1",
      "start": "0x1000f0",
      "end": "0x1000fa",
      "length": 10,
      "image_base": "0x100000",
      "address_space": "ram"
    },
    …
    {
      "name": "_elfSectionHeaders",
      "start": "_elfSectionHeaders:0x0",
      "end": "_elfSectionHeaders:0x2c0",
      "length": 704,
      "image_base": "0x100000",
      "address_space": "_elfSectionHeaders"
    }
  ],
  "segment_count": 10,
  "procedure_count": 4,
  "string_count": 20
},
```

目标文件有三个已加载块和七个其他块。`.text` 含四个函数的 159 字节代码，`.rodata` 含 80 字节，其中有 `0x1000b4` 处的 `grade` 值表及 `grade_label` 偏移表。`.rodata.str1.1` 含十字节：`F`、`D`、`C`、`B`、`A` 五个标签，各带终止符。

其他七块位于各自地址空间。记录在 `address_space` 命名，地址写为 `.comment:0x0` 或 `_elfSectionHeaders:0x0`。写法来自每条 Ghidra 记录的限制：“默认空间地址使用小写 0x 前缀十六进制；其他空间使用 <percent-encoded-space>:0x<hex>。”

四个过程，而非 13。目标文件无 `main`、无桩、无导入，因此没有外部函数可列。`_elfSectionHeaders` 的 704 字节是十一个 64 字节节头，即[第 32 课](phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch)首先解析的表。

| | `ledger-arm64-O1` | `ledger-x86_64-O1.o` |
|---|---|---|
| `document` | `target-01b5d08b08fb.bin` | `target-9a4a8082ba5e.o` |
| `target_format`、`architecture` | `mach-o`、`arm64` | `elf`、`x86_64` |
| `segment_count` | 12 | 10 |
| 代码块 | `__text`，576 字节 | `.text`，159 字节 |
| `procedure_count` | 13 | 4 |
| `string_count` | 39 | 20 |
| 配置 `digest` | `3fc72c9b` 后接 56 位 | `769518a8` 后接 56 位 |

```figure
id: fig-3-5
kind: comparison
title: 并排比较两份概览
claim: 同样四个函数在已链接可执行文件中有 13 个过程，在可重定位目标中有 4 个，因为桩、外部函数和入口点仅在链接后存在。
caption: 各列自上向下读。绿色框命名 Ghidra 文档，列表列出各块及长度，紫色框为记录置信度。来自 capture/out/05-analyze-arm64-O1.json、05-analyze-x86_64-O1.json。
```

## 概览没有说明什么

记录没有函数大小或入口点。它报告映像基址：可执行文件为 `0x100000000`，目标文件为 `0x100000`。目标文件基址是 Ghidra 选择的放置位置。

计数也有边界，记录说明：“计数使用完整已定义字符串清单，以及与 list_strings、list_procedures 相同的本地/外部函数清单。不代表发现了未定义字符串或未识别函数。”13 个过程只是 Ghidra 已识别的数量，没被识别为函数的代码不在计数中。

函数大小见[第 4.2 节](#s-list-procedures-and-function-bodies)各函数 `body`；入口点见[第 3.2 节](#s-inspect-binary-layout-and-the-load-image)的 `LC_MAIN`。两配置摘要分别为 `3fc72c9b`、`769518a8`，因为 `target_format`、`architecture` 在配置参数内。[第 5.3 节](#s-snapshots-and-the-answer-cache)说明只有完整摘要匹配才能回放缓存回答。

```takeaways
- 每个构建运行一次 `rea analyze`，将 `document` 名称与记录一起保留。
- 分别统计 Ghidra 内存块、加载命令、ELF 节。
- 只有已链接可执行文件才预期存在 thunk、外部函数和 `entry`。
- `confidence: "derived"` 表示记录背后有三种原语记录提供支撑。
```

Sources: capture/out/00-commands.txt, capture/out/05-analyze-arm64-O1.json, capture/out/05-analyze-x86_64-O1.json; rea 6.7.0 at 27dc42d: src/cliCommandNames.ts, src/application/InvestigationProviders.ts, src/application/EnhancedTools.ts, src/application/WorkflowEvidence.ts, src/contracts/toolOutputSchemaGroups.ts, src/contracts/toolOutputSchemaPrimitives.ts, src/ghidra/GhidraTargetSnapshot.ts, src/ghidra/GhidraInventoryValues.ts, bridge/ghidra/ReaGhidraBridge.java
