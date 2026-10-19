# analyze_function 与伪代码

> analyze_function 返回包含十六个切面的档案；伪代码是反编译器的解读，要用同一记录中的汇编与字节核验。

你请求 `percent_change`，得到返回 `ulong`、两次测试 `iVar2 != 0` 的函数。源码返回 `int`，只测试一次。同一记录中的指令正确，周围文本则是对指令的解读。本节就是教你区分二者。

读完本节，你能阅读档案的十六个切面，标出哪些伪代码行可从指令推导、哪些是猜测，也能读懂名称不存在时的错误。

## 档案

`rea function` 是 `analyze_function` 的 CLI 名称。对 `_grade` 的 CLI 运行和同一会话的 MCP 调用产生相同 `evidence_id`：`ev_41e8ca1c` 加另外 56 位数字。id 是记录语义内容的哈希，不包含文件路径和显示名。[第 5.1 节](#s-the-evidence-record)读取记录每个字段。本节读取有十六个切面的 `normalized_result`。

```listing
title: _grade 的伪代码、基本块与签名事实
source: capture/out/06-function-grade.json
lang: json
note: 从 normalized_result 截取。已省略 procedure、assembly、引用和值流切面，以及 native_api 的参数条目。
---
"pseudocode": "\nundefined4 _grade(int param_1)\n\n{\n  uint uVar1;\n  \n  uVar1 = param_1 / 10 - 6;\n  if (uVar1 < 5) {\n    return *(undefined4 *)(&DAT_1000007d0 + (ulong)uVar1 * 4);\n  }\n  return 0;\n}\n\n",
…
"basic_blocks": [
  {
    "start": "0x100000518",
    "end": "0x10000053c",
    "successors": [
      "0x10000053c",
      "0x10000054c"
    ]
  },
  …
],
"native_api": {
  "available": true,
  "provenance": "ghidra-high-function",
  "signature_source": "default",
  "calling_convention": "__cdecl",
  …
      "data_type": "undefined4",
      "size_bytes": 4,
      "storage": "w0:4",
      "confidence": "low",
  …
  "jump_tables": [],
  "pseudocode": {
    "classification": "decompiler-generated-non-source",
    "compilable": false
  },
  …
  "limitations": [
    "Types and calling conventions are Ghidra decompiler observations, not source declarations.",
    "Register variables, compiler-generated blocks, and pointer arithmetic remain decompiler artifacts.",
    "Pseudocode is neither original source nor guaranteed to compile."
  ]
},
```

伪代码是一个 JSON 字符串，解码后如下：

```c
undefined4 _grade(int param_1)

{
  uint uVar1;
  
  uVar1 = param_1 / 10 - 6;
  if (uVar1 < 5) {
    return *(undefined4 *)(&DAT_1000007d0 + (ulong)uVar1 * 4);
  }
  return 0;
}
```

| 切面 | `_grade` 中的值 | 保存什么 |
|---|---|---|
| `procedure` | 入口 `0x100000518`，函数体 60 字节 | [第 4.2 节](#s-list-procedures-and-function-bodies)的标识与函数体 |
| `pseudocode` | 一个字符串 | 反编译器文本 |
| `assembly` | 15 行 | [第 4.3 节](#s-procedure-assembly)的 Listing 文本 |
| `comments` | 空 | 入口处数据库注释 |
| `callers`、`callees` | 空、空 | 仅已解析函数 |
| `incoming_references`、`outgoing_references` | 1、2 | [第 4.4 节](#s-xrefs-and-the-jump-table)中的带类型边 |
| `unresolved_calls` | 空 | 目标没有已知过程的调用点 |
| `referenced_strings`、`referenced_names` | 空、2 | `LAB_10000054c`、`DAT_1000007d0` |
| `basic_blocks` | 3 | 起点、不包含端点的终点、后继 |
| `native_api` | `__cdecl`，`signature_source` 为 default | 类型、存储、置信度、`jump_tables` |
| `native_value_flow` | 14 个操作、12 条定义使用边 | high p-code，`truncated: false` |
| `facet_availability` | 八个切面，全部 `available: true` | 是否观测到各切面 |
| `limitations` | 4 | 切面自身限制 |

**档案：** rea 对单个函数组合记录的称呼。桥接层从五个 Ghidra 来源构建它：FunctionManager、Listing、ReferenceManager、BasicBlockModel、反编译器。记录级限制说明列出了五者。记录携带十项限制，结果另有四项，`native_api` 三项，`native_value_flow` 五项。完整读一遍。它们用 rea 自身的措辞说明本节通过案例展示的内容。

首先应读签名事实。`signature_source` 为 `default`，表示没有分析器或用户设置原型，每个参数和返回值都带 `confidence: "low"`。只有来源为 `analysis` 时桥接层才给 `medium`。`native_api.pseudocode.compilable` 为 `false`，第三条 `native_api` 限制直接写在 Java 源码中。

```figure
id: fig-4-8
kind: structure
title: _grade 档案的十六个切面
claim: 一条记录保存一个函数的标识、文本、边、块、签名事实和值流，每项都有自身限制。
caption: 从上向下读。左列是切面名，中列是 _grade 的值，右列说明保存内容。依据 capture/out/06-function-grade.json。
```

## procedure_pseudo_code：只有文本

`rea decompile` 是 `procedure_pseudo_code` 的 CLI 名称，只返回文本。

```listing
title: _total 的伪代码
source: capture/out/07-decompile-total.json
lang: json
note: 仅保留操作、文本开头，以及七项限制中的两项反编译器限制。
---
"operation": "procedure_pseudo_code",
"parameters": {
  "procedure": "_total"
},
"raw_result": {
  "value": "\nint _total(int *param_1,uint param_2)\n\n{\n  int iVar1;\n  ulong uVar2;\n  \n  if (0 < (int)param_2) {\n…
  "limitations": []
},
…
"limitations": [
  …
  "Pseudocode is Ghidra decompiler output, not original source and not text-equivalent to Hopper output.",
  "External functions and functions without an analyzable body return null; other decompiler failures remain explicit.",
  …
],
```

```c
int _total(int *param_1,uint param_2)

{
  int iVar1;
  ulong uVar2;
  
  if (0 < (int)param_2) {
    iVar1 = 0;
    uVar2 = (ulong)param_2;
    do {
      iVar1 = *param_1 + iVar1;
      uVar2 = uVar2 - 1;
      param_1 = param_1 + 1;
    } while (uVar2 != 0);
    return iVar1;
  }
  return 0;
}
```

桥接层对每个程序打开一个 `DecompInterface`，启用 C 输出、语法树和跳转加载，不限指令数。每次调用为 `decompileFunction(function, 0, monitor)`，没有超时；外部函数或无函数体函数返回 `null`。文本来自结果的 `getC()` 输出。

`_total` 可读性不错。带 `uVar2 - 1` 的 `do` 循环是汇编 `subs x9, x9, #0x1` 与 `b.ne` 构成的旋转循环。指针类型 `int *param_1` 可由加载 `ldr w10, [x0], #0x4` 推导。唯一开放问题是 `uint param_2`，源码写的是 `int count`。指令先将 `w1` 作为有符号数比较一次，再在 `x9` 中递减，两种类型都能解释，Ghidra 选择了其中一种。

## 文本不完整或错误的地方

**反编译器产物：** 反编译器为表达机器码而需要、却没有任何源码行直接产生的伪代码行。`native_api` 限制列出三类：寄存器变量、编译器生成块、指针运算。采集中的三条记录展示了文本与指令间的三种差距。

```listing
title: _percent_change 的文本与指令
source: capture/out/10-mcp-09-analyze-function-percent-change-O1.json
lang: json
note: 档案的伪代码字符串与完整 assembly 数组。
---
"pseudocode": "\nulong _percent_change(ulong param_1,int param_2)\n\n{\n  uint uVar1;\n  int iVar2;\n  \n  iVar2 = (int)param_1;\n  if (iVar2 != 0) {\n    uVar1 = 0;\n    if (iVar2 != 0) {\n      uVar1 = ((param_2 - iVar2) * 100) / iVar2;\n    }\n    param_1 = (ulong)uVar1;\n  }\n  return param_1;\n}\n\n",
"assembly": [
  "0x100000500: cbz w0, 0x100000514",
  "0x100000504: sub w8, w1, w0",
  "0x100000508: mov w9, #0x64",
  "0x10000050c: mul w8, w8, w9",
  "0x100000510: sdiv w0, w8, w0",
  "0x100000514: ret"
],
```

六条指令。`before` 为零时，`cbz w0, 0x100000514` 跳到 `ret`，这条路径上 `w0` 为零，函数直接返回它。另一条路径计算 `(w1 - w0) * 100`，用 `sdiv w0, w8, w0` 相除。两条路径都通过 `w0` 返回 32 位。

伪代码却说函数返回八字节的 `ulong`，并返回整个 `x0` 的 `param_1`。ABI 和源码说四字节。文本没有标记差异，记录却有：`return_type.data_type` 为 `ulong`，`confidence` 为 `low`，`signature_source` 为 `default`。第二个 `if (iVar2 != 0)` 重复了指令只做一次的测试，不改变任何值，也不存在于指令中。

```figure
id: fig-4-9
kind: comparison
title: percent_change 的源码与反编译结果
claim: 四行源码变成十四行伪代码，标出的三行只描述寄存器。
caption: 先读源码，再读伪代码。玫红标记指出返回宽度、重复测试及返回整个寄存器。依据 capture/fixtures/ledger.c 与 capture/out/10-mcp-09-analyze-function-percent-change-O1.json。
```

`_grade` 展示第二类差距。反编译文本将表保留为 `*(undefined4 *)(&DAT_1000007d0 + (ulong)uVar1 * 4)`。地址正确，元素大小正确，五个值却没有出现。[第 3.3 节](#s-address-to-file-offset)将 `0x1000007d0` 转为文件偏移 2000，那里 20 字节为 `1, 2, 3, 4, 4`。返回类型为 `undefined4`，表示含义未知的四字节。文本不完整，需要从字节补全。

x86-64 的 `grade` 展示第三类。其伪代码用 `uVar1 = -(param_1 >> 0x1f) ^ (uint)((ulong)((long)param_1 * 0x66666667) >> 0x3f);` 表示默认返回值。

```listing
title: x86-64 的 grade：用表达式表示的默认值
source: capture/out/07-decompile-grade-x86_64-O1.json
lang: json
note: 伪代码字符串开头，在写入默认值的行后截断。
---
"value": "\nuint grade(int param_1)\n\n{\n  uint uVar1;\n  uint uVar2;\n  \n  uVar2 = param_1 / 10 - 6;\n  uVar1 = -(param_1 >> 0x1f) ^ (uint)((ulong)((long)param_1 * 0x66666667) >> 0x3f);\n…
```

对应指令是[第 4.3 节](#s-procedure-assembly)中 `0x10002a` 的 `XOR EAX, EAX`，寄存器为零。Ghidra 将它写为 `param_1` 的符号与乘积符号位的异或。这是同一位的两种写法，反编译器没有消去它们。对每个 `int`，结果都是 0，因此文本不算错误。但相信文本的读者会认为默认值依赖 score，这就错了。

[第 34 课](phases/13-tools-and-protocols/34-lifting-to-pseudocode)编译这段文本，在网格上与源码比较，再把自己的提升结果与 Ghidra 并排，解释 `percent_change`、`grade`、`total` 的每项差异。

三个案例的规则很短。assembly 切面是观测结果，伪代码是对派生解读的观测文本。复述文本前，先对照存储检查类型，对照字节检查常量，对照块检查分支。

## 不存在的名称

```listing
title: 对不存在过程调用 analyze_function
source: capture/out/10-mcp-13-analyze-function-missing.json
lang: json
note: 请求参数、错误标志和解码错误。文本内容是相同 JSON 的单行形式。已省略 details 中的 diagnostics 对象，其中包含运行 id、临时路径、进程 id、Ghidra 输出及 `remote_code: "not_found"`。
---
"name": "analyze_function",
"arguments": {
  "procedure": "_nothing"
}
…
"isError": true
…
"decoded_text": {
  "error": {
    "code": "invalid_request",
    "category": "invalid_input",
    "message": "Analysis input is invalid. Check the arguments and try again.",
    "retryable": true,
    "remediation": {
      "action": "Correct the listed arguments and retry."
    },
    "details": {
      "operation": "analyze_function",
      "issues": [
        {
          "path": [],
          "reason": "invalid_value",
          "message": "Unknown Ghidra procedure name or address: _nothing"
        }
      ],
      …
    }
  }
}
```

桥接层先将 `_nothing` 作为符号名尝试，再作为地址尝试，以 `not_found` 失败。错误中的 `diagnostics` 显示桥接层发送的远端代码 `not_found`。客户端将远端 `invalid_request`、`not_found`、`ambiguous` 映射为 `AnalysisInputError`，该错误对外投影为 `invalid_request`。MCP 客户端收到的错误是带 `isError: true`、没有结果的文本。服务日志显示时间花在哪里。

```listing
title: 服务日志中的失败调用
source: capture/out/10-mcp-server.log
lang: jsonl
note: 第 10 和 11 行，先是桥接层，再是服务层。time 和 durationMs 每次运行都变，已省略。
---
{"level":40,"time":…,"application":"rea","mode":"mcp","layer":"ghidra-bridge","method":"analyze_function","status":"error","msg":"Ghidra bridge request completed"}
{"level":40,"time":…,"application":"rea","mode":"mcp","layer":"server","tool":"analyze_function","durationMs":…,"status":"error","msg":"MCP tool execution completed"}
```

查询经 socket 往返 Ghidra，总计几毫秒。`retryable` 为 `true`：根据[第 4.2 节](#s-list-procedures-and-function-bodies)改正名称，再次调用。会话保持打开，Ghidra 项目保持已导入状态。

## 如何使用档案

按以下顺序阅读十六个切面。先用 `procedure` 看函数体，用 `assembly` 看处理器行为，再用 `basic_blocks` 看形状、用引用看边，最后才读 `pseudocode`。[第 5.5 节](#s-compare-and-compare-functions)比较同一函数两个构建的档案。[第 7.2 节](#s-a-proof-harness-outside-rea)展示判断根据文本重建的函数是否等于原始函数的测试。

```takeaways
- 相信伪代码类型前，先读 `signature_source` 和参数 `confidence`。
- 对照汇编与字节，检查文本中的每个常量和表地址。
- `compilable: false` 是伪代码文本的事实，不应报告为缺陷。
- 未知名称预期返回带 `retryable: true` 的 `invalid_request`，然后修正名称。
```

Sources: capture/out/06-function-grade.json, capture/out/10-mcp-10-analyze-function-grade-O1.json, capture/out/07-decompile-total.json, capture/out/07-decompile-grade-x86_64-O1.json, capture/out/10-mcp-09-analyze-function-percent-change-O1.json, capture/out/10-mcp-11-analyze-function-total-O1.json, capture/out/10-mcp-12-analyze-function-grade-label-O1.json, capture/out/10-mcp-13-analyze-function-missing.json, capture/out/10-mcp-server.log, capture/fixtures/ledger.c, capture/fixtures/ledger-arm64-O1; rea 6.7.0 at 27dc42d: src/cliCommandNames.ts, src/domain/evidence.ts, src/ghidra/GhidraProviderCapabilities.ts, src/ghidra/GhidraProviderClient.ts, src/domain/analysisErrorProjection.ts, src/server/toolResult.ts, bridge/ghidra/ReaGhidraBridge.java
