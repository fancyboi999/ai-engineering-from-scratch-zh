# list_procedures 与函数体

> list_procedures 返回 Ghidra 定义的所有内部与外部函数，单独保留 thunk；档案中的函数体则说明各函数拥有多少字节。

你写了四个函数和一个 `main`，Ghidra 却列出 13 个过程，其中四个位于 `EXTERNAL:0x1` 之类地址，`main` 则叫 `entry`。每项事实在文件中都有原因，清单就是了解它们的入口。

读完本节，你能解释全部 13 个过程，区分 thunk 与其外部目标，也能将函数体读作端点包含在内的地址范围。

## 清单

```listing
title: 十三个过程中的五个
source: capture/out/10-mcp-05-list-procedures.json
lang: json
note: 从 normalized_result 截取：一个外部函数、两个内部函数、一个 thunk。其余九项结构相同。
---
"normalized_result": [
  {
    "address": "EXTERNAL:0x1",
    "value": "/usr/lib/libSystem.B.dylib::___stack_chk_fail",
    "procedure": {
      "external": true,
      "thunk": false,
      "thunk_target": null
    }
  },
  …
  {
    "address": "0x100000518",
    "value": "_grade",
    "procedure": {
      "external": false,
      "thunk": false,
      "thunk_target": null
    }
  },
  …
  {
    "address": "0x1000005d0",
    "value": "entry",
    "procedure": {
      "external": false,
      "thunk": false,
      "thunk_target": null
    }
  },
  {
    "address": "0x100000740",
    "value": "___stack_chk_fail",
    "procedure": {
      "external": false,
      "thunk": true,
      "thunk_target": "EXTERNAL:0x1"
    }
  },
  …
],
```

桥接层对每个程序只构建一次列表，使用 Ghidra 的内部函数和外部函数两个迭代器，按入口地址去重。为每个函数记录 `external`、`thunk`，以及可解析时的 `thunk_target`。值是限定符号名，因此外部条目带有库路径。记录的限制说明规则："External functions and local thunks are distinct; procedure metadata identifies both and preserves a thunk target when Ghidra resolves one."。

| 地址 | 名称 | 类别 | 来源 |
|---|---|---|---|
| `EXTERNAL:0x1` 到 `EXTERNAL:0x4` | `___stack_chk_fail`、`_atoi`、`_fwrite`、`_printf` | 外部 | 第 3.2 节六项 `libSystem` 导入中的四项 |
| `0x100000500` | `_percent_change` | 内部，24 字节 | `ledger.c` |
| `0x100000518` | `_grade` | 内部，60 字节 | `ledger.c` |
| `0x100000554` | `_total` | 内部，52 字节 | `ledger.c` |
| `0x100000588` | `_grade_label` | 内部，72 字节 | `ledger.c` |
| `0x1000005d0` | `entry` | 内部，368 字节 | `ledger-main.c` 的 `main`，由 `LC_MAIN` 命名 |
| `0x100000740` 到 `0x100000764` | 相同四个名称 | thunk，各 12 字节 | `__stubs` 节，48 字节 |

**Thunk：** 唯一职责是将控制权转交另一个函数的小函数。四个 thunk 位于[第 3.2 节](#s-inspect-binary-layout-and-the-load-image)中 `0x100000740` 的 48 字节 `__stubs` 节。每个都是 12 字节的桩，到达真正的 `libSystem` 函数。Ghidra 将真实函数表示为 `EXTERNAL` 块中的条目，即[第 3.4 节](#s-analyze-overview)的最后一个段。不是函数的两个导入 `___stack_chk_guard` 和 `___stderrp` 不在这里，因为它们是数据。

`entry` 就是 `_main`。`inspect-macho` 在 `0x1000005d0` 导出 `_main`，`LC_MAIN` 通过 `entryoff` 1488 指向这里。Ghidra 将入口点命名为 `entry`，在同址将 `_main` 保留为第二个符号。文档说明，函数入口的次要符号，例如导入的 `_main` 标签，也能作为选择器 {{native §Exact CLI selectors}}，因此 `rea function fixtures/ledger-arm64-O1 _main` 有效。

```figure
id: fig-4-3
kind: structure
title: ledger-arm64-O1 的十三个过程
claim: 五个内部函数无间隙地填满 __text 的 576 字节，四个 thunk 填满 __stubs，四个外部函数位于 Ghidra 创建的块中。
caption: 按地址从上向下读。灰行位于文件外，绿行是 __text 中代码，紫行是 Ghidra 解析的 thunk。依据 capture/out/10-mcp-05-list-procedures.json 和五份档案。
```

## 函数体

清单没有大小。函数大小位于 `analyze_function` 档案的 `procedure.body` 中，[第 4.6 节](#s-analyze-function-and-pseudocode)读取该记录的其余部分。

```listing
title: _grade 档案的 procedure 块
source: capture/out/06-function-grade.json
lang: json
note: 从 normalized_result 截取。伪代码及其后所有切面已省略。
---
"procedure": {
  "address": "0x100000518",
  "name": "_grade",
  "classification": {
    "external": false,
    "thunk": false,
    "thunk_target": null,
    "provenance": "ghidra-function-manager"
  },
  "body": {
    "available": true,
    "provenance": "ghidra-function-body-address-set",
    "ranges": [
      {
        "start": "0x100000518",
        "end": "0x100000553"
      }
    ],
    "total_bytes": 60,
    "span_bytes": 60,
    "non_contiguous": false,
    "contains_entry": true
  },
  "signature": "undefined _grade()",
  "locals": []
},
```

**函数体：** Ghidra 分配给一个函数的地址集合，以包含结束地址的范围报告。`_grade` 拥有 `0x100000518` 到 `0x100000553`，共 60 字节，`_total` 从 `0x100000554` 开始。配置将此契约命名为 `function_body_evidence: "complete-inclusive-ranges-v1"`。记录中另三个字段使用不包含结束地址的范围：`binary_overview` 的段、档案的 `basic_blocks` 和 `list_segments` 的内存块。加一之前先看字段名。

五个内部函数体相加：24 + 60 + 52 + 72 + 368 = 576，正好是 `__text` 大小。代码节没有字节属于两个函数，也没有字节不属于任何函数。五个函数的 `span_bytes` 都等于 `total_bytes`，`non_contiguous` 都为 false。两者不同时，函数存在间隙，间隙内字节不归该函数所有。调研记录了一个 16 位案例，函数体 503 字节却跨越 517 字节。

## 选择过程

每个函数操作都接收 `procedure` 字符串。读取规则如下：

```rule
label: 先按名称，再按地址
source: native §Exact CLI selectors
---
"an exact database symbol name takes precedence over a bare hexadecimal address"
```

以 `0x` 或地址空间前缀开头的字符串是地址。其他字符串先作为符号名尝试。名称匹配多个函数时，返回 `ambiguous` 和入口地址列表；没有匹配时返回 `not_found`，[第 4.6 节](#s-analyze-function-and-pseudocode)将其展示为 MCP 错误 `invalid_request`。

```takeaways
- 比较两个构建前，先按内部、thunk 和外部分类统计过程。
- 用 `__stubs` 大小除以 thunk 数量，求出桩大小。
- 累加内部函数体的 `total_bytes`，与代码节大小比较。
- `body.ranges` 的 `end` 包含端点，其他 `end` 不包含端点。
```

Sources: capture/out/10-mcp-05-list-procedures.json, capture/out/06-function-grade.json, capture/out/10-mcp-09-analyze-function-percent-change-O1.json, capture/out/10-mcp-11-analyze-function-total-O1.json, capture/out/10-mcp-12-analyze-function-grade-label-O1.json, capture/out/04-inspect-macho.json; rea 6.7.0 at 27dc42d: bridge/ghidra/ReaGhidraBridge.java, src/ghidra/GhidraProviderCapabilities.ts; rea docs/native-investigation.md
