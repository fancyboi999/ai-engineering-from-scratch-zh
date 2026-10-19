# xrefs 与跳转表

> xrefs 列出引用某个地址的地址；指向 _grade 的唯一引用，展示了优化器对 switch 和调用者做了什么。

`main` 调用 `grade_label`，`grade_label` 调用 `grade`。你问 `xrefs` 谁引用 `0x100000518` 的 `_grade`，只得到不在任何函数中的 `0x10000811a`。答案正确，它说明了构建的两件事。

读完本节，你能阅读 `xrefs` 结果，在档案中找到各引用类别，也能区分两种 `grade` 构建里的跳转表与值表。

## 调用

```listing
title: _grade 入口的 xrefs
source: capture/out/10-mcp-07-xrefs-grade.json
lang: json
note: 请求参数、结果，以及七项限制中的两项。
---
"name": "xrefs",
"arguments": {
  "address": "0x100000518"
}
…
"normalized_result": [
  "0x10000811a"
],
…
"limitations": [
  …
  "The direct address list projects exact Ghidra references to one address but does not expose their kinds; procedure_references and analyze_function preserve available kind metadata.",
  "Synthetic Ghidra entry-point references without actionable memory sources are omitted.",
  …
],
```

桥接层向 Ghidra 的 `ReferenceManager` 请求指向该地址的全部引用，跳过合成的入口点引用，收集不同来源地址并排序。结果只有地址。档案的 `incoming_references` 切面保留每项引用的类别：调用、跳转或数据。

## 0x10000811a 处是什么

该地址位于 `__LINKEDIT`，后者从 `0x100008000` 开始，映射文件偏移 32768。差值 `0x11a` 为 282，因此该字节位于文件偏移 33050。[第 3.2 节](#s-inspect-binary-layout-and-the-load-image)列出偏移 33048、大小 8 字节的 `LC_FUNCTION_STARTS`。引用指向函数起点表内部。

**函数起点：** 无符号 LEB128 增量表，每个函数一项，dyld 和调试器用它在去除符号的映像中寻找函数入口。夹具的八个字节是 `80 0a 18 3c 34 48 00 00`。首个增量是 `0x500`，得到 `0x100000500`，即 `_percent_change`。第二个在偏移 33050，值为 `0x18`，得到 `0x100000518`，即 `_grade`。之后 `0x3c` 给出 `_total`，`0x34` 给出 `_grade_label`，`0x48` 给出 `entry`。Ghidra 的 Mach-O 加载器将每项标为指向对应函数的数据引用，档案也正如此。

```listing
title: _grade 的唯一入引用
source: capture/out/06-function-grade.json
lang: json
note: 从 incoming_references 截取。target_procedure 块重复第 4.2 节的 procedure 块，已省略。
---
"incoming_references": [
  {
    "source_address": "0x10000811a",
    "target_address": "0x100000518",
    "source_procedure": null,
    …
    "kind": {
      "available": true,
      "provenance": "ghidra-reference-manager",
      "type": "DATA",
      "flow": false,
      "call": false,
      "jump": false,
      "data": true,
      …
    }
  }
],
```

`source_procedure` 为 `null`，因为没有函数拥有这个表。类别为 `DATA`，`call` 为 false，因此没有代码调用 `_grade`。比较 `_grade_label`，其档案列出两个入引用：一个来自 `entry` 内 `0x1000006ec` 的 `UNCONDITIONAL_CALL`；另一个来自 `0x10000811c` 的 `DATA` 引用，即同一表的第四项。

```listing
title: _grade_label 的两个入引用
source: capture/out/10-mcp-12-analyze-function-grade-label-O1.json
lang: json
note: 从 incoming_references 仅截取地址和引用类型。
---
"source_address": "0x1000006ec",
"target_address": "0x100000588",
…
"type": "UNCONDITIONAL_CALL",
…
"source_address": "0x10000811c",
"target_address": "0x100000588",
"source_procedure": null,
…
"type": "DATA",
```

源码中从 `grade_label` 到 `grade` 的调用消失了。`-O1` 下 clang 将 `grade` 内联到 `grade_label`。`_grade_label` 的汇编在 `0x100000588` 到 `0x1000005a4` 重复[第 4.3 节](#s-procedure-assembly)整段乘法与比较。`_grade` 档案从另一侧说明同一事实：`callers` 为空，`relationship_coverage.status` 为 `complete`。Ghidra 返回全部已解析调用引用，没有一个指向 `_grade`。`_grade` 仍作为函数存在，因为它被导出；唯一引用它的是链接器写入的表。

```figure
id: fig-4-6
kind: tree
title: 四个 ledger 函数的全部引用
claim: entry 调用四个函数中的三个，函数起点表引用全部四个；_grade 被内联，没有任何调用者。
caption: 横向阅读每行。左侧绿色框是 entry 中的调用点，紫框是函数，右侧绿色框是 LC_FUNCTION_STARTS 条目。依据四份 analyze_function 档案及 capture/fixtures/ledger-arm64-O1。
```

## 并不存在的跳转表

采集中的每份档案，其 `native_api` 切面都有 `"jump_tables": []`，配置将契约命名为 `jump_table_evidence: "typed-case-default-blocks-v1"`。发现跳转表时 Ghidra 会填充该字段。这里没有发现，因为 `-O1` 下两个编译器都没有为 `grade` 的 switch 生成跳转表，而是把五个 case 转为包含五个返回值的表，加一次边界检查。

| 构建 | 控制转移 | 表 | `grade` 中的块 |
|---|---|---|---|
| `ledger-x86_64-O0.o`，第 33 课夹具 | `jmpq *%rax` | `.rodata+0x0`，五项 `R_X86_64_PC32` 重定位，目标 `0x91`、`0x88`、`0x7f`、`0x76`、`0x76` | 有表为 8，无表为 3 |
| `ledger-x86_64-O1.o`，本次采集 | 无，一条 `JA` | `DAT_001000b4`、`.rodata+0x14`，值 `1, 2, 3, 4, 4` | 3 |
| `ledger-arm64-O1`，本次采集 | 无，一条 `b.hi` | `__TEXT,__const` 中的 `0x1000007d0`，值 `1, 2, 3, 4, 4` | 3 |

**跳转表：** 由间接跳转索引的代码地址表，让一条指令到达多个块之一。**值表：** 由加载指令索引的数据表，让一条指令返回多个值之一。前者改变控制流图，后者改变一次加载。`-O0` 的 x86-64 对象有前者；在对象文件中，其五项是零字节，配有 `.rela.rodata` 的五项重定位。`-O1` 的两个构建都有后者。

`_grade` 的 `outgoing_references` 给出档案实际看到的两条边：一条从 `0x100000538` 到 `0x10000054c` 的 `CONDITIONAL_JUMP`，一条从 `0x100000544` 到 `0x1000007d0` 的 `DATA` 读取。`referenced_names` 将目标标为 `LAB_10000054c` 和 `DAT_1000007d0`。[第 4.6 节](#s-analyze-function-and-pseudocode)的反编译器将后者保留为字节地址，没有列出五个值。

```figure
id: fig-4-5
kind: comparison
title: -O0 的跳转表与 -O1 的值表
claim: -O0 下间接跳转通过五项重定位条目到达五个 case 块；-O1 下从五个值中加载一次，替代了全部块。
caption: 每列从上向下读。左列来自第 33 课夹具 ledger-x86_64-O0.o，右列来自 arm64 档案。绿框是文件数据，紫框是 Ghidra 所见。依据 phases/13-tools-and-protocols/33-disassembly-and-control-flow/code/fixtures 及 capture/out/06-function-grade.json。
```

[第 33 课](phases/13-tools-and-protocols/33-disassembly-and-control-flow)按 `S + A - P` 规则从重定位恢复 `-O0` 表，展示有表与无表时的控制流图：8 块 11 边，对比 3 块和一个未解析跳转。

Ghidra 未解析跳转表时，case 块不会出现在 `callers`、`callees`、`basic_blocks` 中。档案限制说明：未解析的计算流不表示为边。`unresolved_calls` 切面列出目标没有已知过程的调用点。通过表的未解析间接跳转不是调用，因此不出现在该切面。`jump_tables` 为空不能证明函数没有 switch。像这里一样，读取转移指令和表字节。

```takeaways
- 称某个 `xrefs` 地址为调用者之前，先解析它所属的段和加载命令。
- 用档案的 `incoming_references` 判断引用是调用还是数据。
- 导出函数的 `callers: []` 可能提示内联，再检查调用者函数体。
- 按字节所示命名：跳转表改变图，值表改变加载。
```

Sources: capture/out/10-mcp-07-xrefs-grade.json, capture/out/06-function-grade.json, capture/out/10-mcp-12-analyze-function-grade-label-O1.json, capture/out/10-mcp-09-analyze-function-percent-change-O1.json, capture/out/10-mcp-11-analyze-function-total-O1.json, capture/out/06-function-grade-x86_64-O1.json, capture/out/04-inspect-macho.json, capture/fixtures/ledger-arm64-O1; phases/13-tools-and-protocols/33-disassembly-and-control-flow/code/fixtures/ledger-x86_64-O0.objdump.txt; rea 6.7.0 at 27dc42d: bridge/ghidra/ReaGhidraBridge.java, src/ghidra/GhidraProviderCapabilities.ts
