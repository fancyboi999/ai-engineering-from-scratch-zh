# compare_functions 之外的证明框架

> compare_functions 逐行比较 Ghidra 文本，因此证明重建函数等价还需要在输入网格上运行两个版本，并在遮蔽重定位后比较字节。

你已根据[第 4.6 节](#s-analyze-function-and-pseudocode)的伪代码重建 `percent_change`，保留反编译器给出的 `long`，十个手写测试全部通过。[第 7.1 节](#s-verify-reconstruction)说明 rea 只能判断两份 Ghidra 文本是否匹配。重建版本与原始版本等价的证明，必须来自自行运行的验证框架。[第 36 课](phases/13-tools-and-protocols/36-rebuild-and-prove-equal)用 Python 标准库构建了这样的框架。

捕获工具在 `ledger-x86_64-O1.o` 上运行该框架，记录了四个以 `17-` 开头的文件。读完本节，你可以在重建版本上运行验证框架的两部分，阅读不匹配行与字节报告，并指出每次失败对应的风险类别或重定位项。

## compare_functions 能看到什么

`compare_functions` 从八个维度比较两条 `analyze_function` 记录：`identity`、`pseudocode`、`assembly`、`comments`、`calls`、`references`、`strings_names`、`cfg`（capture/out/10-mcp-20-compare-functions-percent-change.json）。伪代码与汇编维度是有界的字符串逐行比较。耗时超过 100 ms 或编辑次数超过 10,000 时，状态为 `unknown`。汇编维度附带两条固定限制：

```listing
title: percent_change 比较的汇编维度
source: capture/out/10-mcp-20-compare-functions-percent-change.json
lang: json
note: 八个维度对象之一。计数表示提供器文本的字符数，省略了摘要与文本差异。
---
              "dimension": "assembly",
              "left_count": 161,
              "right_count": 161,
              "evidence_links": [
                "ev_b492c85e…",
                "ev_142cc943…"
              ],
              "limitations": [
                "Exact provider text is compared without address or generated-name normalization; layout-only differences do not establish a behavior change.",
                "Assembly is opaque provider text; relocation normalization is unavailable."
              ],
              "status": "unchanged",
```

同一比较对 `total` 报告五个维度为 `changed`（capture/out/10-mcp-21-compare-functions-total.json）。伪代码从 300 增至 2,904 字符，汇编从 336 增至 1,866 字符。两条记录来自同一行源码在 `-O1`、`-O2` 下的编译结果。因此，文本比较既不能证明行为相同，也不能证明行为不同。同一函数可以打印为不同文本，错误函数也可以打印为相同文本。

rea 6.7.0 不支持编译器重放，也没有理解重定位的字节比较。下面两部分工作需要你自行完成。

## 第一部分：执行并比较

**输入网格：** 验证框架同时送入原始函数和重建函数的一组输入单元。每类单元对应反汇编中可见的一种风险。课程的 `input_grid()` 为 `percent_change` 取十个 `before` 值与七个 `after` 值的所有组合，再为 `grade` 取 22 个分数，共 92 个单元。每个单元都带有说明其用途的类别。

```listing
title: 按风险类别划分的 92 个单元
source: capture/out/17-harness-grid.json
lang: json
note: 省略了输入值和十个朴素用例。
---
{
  "cells": 92,
  "classes": {
    "overflow": 32,
    "negative": 17,
    "boundary": 14,
    "plain": 12,
    "zero guard": 7,
    "negative truncation": 5,
    "beyond the switch": 2,
    "rounding": 2,
    "trap": 1
  },
  …
}
```

零值保护单元进入 `before == 0` 分支。负数单元检查除法是否向零截断，即 `-9 / 10` 为 0、`-10 / 10` 为 -1。舍入单元检查乘法是否在除法之前发生。溢出单元使 `(after - before) * 100` 超出 32 位。唯一的陷阱单元让回绕后的乘积等于 `INT_MIN`，同时 `before` 为 -1。

对于 `grade`，边界单元位于 60、70、80、90、100 的两侧。超出 switch 范围的两个单元为 110 和 `INT_MAX`。

验证框架将 `ledger.c`、每个函数的一个候选实现以及课程的 `driver.c` 编译为同一个程序。候选通过 `-Dpercent_change=cand_percent_change -Dgrade=cand_grade` 重命名，使两个版本以不同名称链接。驱动逐行读取输入单元，打印两个结果，并将 `SIGFPE` 转为值 `trap`。

ELF 目标文件不能在记录捕获的 Mac 上运行。那里的判定基准是以 `-O1` 本机编译的 `ledger.c`，报告用 `original_kind: fixture-source` 明确记录。捕获运行测试了两对实现。第一对看似合理：采用伪代码 `long` 的 `percent_change_wide.c`，搭配使用 90、80、70、60 四个 `if` 判断的 `grade_thresholds.c`：

```c
int percent_change(int before, int after) {
    if (before == 0) return 0;
    return (int)(((long)after - before) * 100 / before);
}
```

```listing
title: 看似合理的实现对在网格上的结果
source: capture/out/17-harness-execute-plausible.json
lang: json
note: 省略了 28 个不匹配行中的 26 个，以及全部 92 个结果行。
---
  "candidates": {
    "percent_change": "phases/13-tools-and-protocols/36-rebuild-and-prove-equal/code/fixtures/candidates/percent_change_wide.c",
    "grade": "phases/13-tools-and-protocols/36-rebuild-and-prove-equal/code/fixtures/candidates/grade_thresholds.c"
  },
  "original": "fixtures/ledger.c compiled with the host clang at -O1",
  "original_kind": "fixture-source",
  "host": "aarch64 Darwin",
  "arch": "aarch64",
  "naive_passed": true,
  "cells": 92,
  "mismatches": [
    {
      "function": "percent_change",
      "args": [
        3,
        2147483647
      ],
      "kind": "overflow",
      "original": -133,
      "candidate": -1431655899,
      "match": false
    },
    …
    {
      "function": "grade",
      "args": [
        110
      ],
      "kind": "beyond the switch",
      "original": 0,
      "candidate": 4,
      "match": false
    },
    …
  ],
```

十个朴素用例全部通过，92 个单元却有 28 个失败。`percent_change` 的 26 个失败都属于 `|before| > 1` 的溢出单元。原始实现先将乘积回绕为 32 位，再做除法；`long` 重建版本则直接除未回绕的乘积。`before` 为 1 或 -1 时两者偶然一致，因为 64 位商最终截断后又变为回绕值。`grade` 的两个失败为 110 与 `INT_MAX`。原始 switch 对十位数为 11 或更高的值没有 case，返回 0；阈值重建版本返回 4。

相等的一对是使用 `100 * (after - before) / before` 的 `percent_change_mul_first.c` 与原始源码 `grade_switch.c`。它们在全部 92 个单元上相符，反汇编模型与观测到的原始结果也没有分歧（capture/out/17-harness-execute-equal.json）。其中一行值得单独查看：

```listing
title: arm64 宿主机上的陷阱单元
source: capture/out/17-harness-execute-equal.json
lang: json
note: 92 行中的一行。
---
    {
      "function": "percent_change",
      "args": [
        -1,
        536870911
      ],
      "kind": "trap",
      "original": -2147483648,
      "candidate": -2147483648,
      "match": true
    },
```

差值为 536870912，32 位乘积回绕为 -2147483648，除数为 -1。x86-64 的 `IDIV` 会触发除法错误异常，因为商无法用 32 位表示 {{spec Intel SDM Vol. 2, IDIV}}。AArch64 的 `SDIV` 不触发陷阱，返回 -2147483648 {{spec Arm DDI 0487, SDIV}}。报告随结果记录 `"arch": "aarch64"`，同一网格若在 Linux x86-64 上运行，则记录字符串 `trap`。判定基准依赖架构，因此证明必须注明执行它的宿主机。

## 第二部分：重新编译并比较字节

**重定位掩码：** 比较前，将两个函数中每个重定位字段的字节清零。之后两步依次按偏移、类型、目标节区比较重定位记录，再读取各重定位指向的字节。课程的 `ElfObject` 使用 `struct.unpack_from` 读取 ELF64 目标文件，`mask_relocations()`、`prove_bytes()`、`read_table()` 分别执行这三步。缺少第一步时，表位于不同偏移的正确重建也会被字节比较拒绝。缺少第三步时，错误重建则可能被接受。

```listing
title: 原始目标文件中的 grade
source: capture/out/17-harness-bytes.json
lang: json
note: 四个函数条目之一。start 是相对 .text 的偏移。
---
      "grade": {
        "section": ".text",
        "start": 16,
        "size": 46,
        "bytes": "4863c74869c0676666664889c148c1f92248c1e83f01c183c1fa31c083f904770c89c8488d0d000000008b0481c3",
        "relocations": [
          {
            "offset": 38,
            "type": "R_X86_64_PC32",
            "symbol": ".rodata",
            "addend": 16
          }
        ]
      },
```

`grade` 长 46 字节，在偏移 38 有一条 `R_X86_64_PC32` 重定位，对应加载表地址的 `lea` 位移。RELA 目标文件将加数放在记录中，字段的四个字节为零。上面的十六进制在 `8b0481c3` 前显示了 `00000000`。目标为 `.rodata+0x10`，由于该字段位于指令末尾，CPU 再加 4，因此表从 `.rodata+0x14` 开始。每个候选都使用样例命令 `clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c` 编译，再与此条目比较。

```listing
title: 错误常量通过了掩码比较
source: capture/out/17-harness-bytes.json
lang: json
note: 八个候选条目之一。省略了源码路径、差异偏移、掩码范围与两张表，reasons 行打印了两张表。
---
      "candidate": "grade_case10_wrong",
      …
      "original_size": 46,
      "candidate_size": 46,
      "masked_equal": true,
      …
      "relocations_match": true,
      "relocations": [
        {
          "offset": 38,
          "type": "R_X86_64_PC32",
          "original_target": ".rodata+0x10",
          "candidate_target": ".rodata-0x4",
          "same_shape": true
        }
      ],
      …
      "status": "fail",
      "reasons": [
        "referenced constants differ: [1, 2, 3, 4, 4] vs [1, 2, 3, 4, 3]"
      ]
```

`grade_case10_wrong.c` 在 `case 10` 返回 3。遮蔽后它的 46 个代码字节与原始版本相同，唯一重定位的偏移、类型、节区也相同。只有五个表项不同。

每个 `grade` 候选的加数都不同：原始为 `+0x10`，候选为 `-0x4`。原始目标文件在 switch 表之前的 `.rodata` 中还有 `grade_label` 的 `labels` 表，候选目标文件没有。不同加数表示不同偏移，因此验证框架先比较记录形状，再通过记录读取表。两个正确重建在两侧读出的表都是 `1, 2, 3, 4, 4`。

| 候选 | 源码 | 大小 | 掩码后字节 | 重定位记录 | 表 | 状态 |
|---|---|---|---|---|---|---|
| `percent_change_mul_first` | `100 * (after - before) / before` | 16 与 16 | 相同 | 无 | 无 | pass |
| `percent_change_split` | `(after * 100 - before * 100) / before` | 16 与 16 | 相同 | 无 | 无 | pass |
| `percent_change_wide` | 伪代码中的 `long` | 16 与 26 | 大小不同 | 无 | 无 | fail |
| `percent_change_div_first` | `(after - before) / before * 100` | 16 与 18 | 大小不同 | 无 | 无 | fail |
| `grade_switch` | 原始 `switch` | 46 与 46 | 相同 | 形状相同 | 两侧均为 `1, 2, 3, 4, 4` | pass |
| `grade_table` | 带边界检查的 `points[slot]` | 46 与 46 | 相同 | 形状相同 | 两侧均为 `1, 2, 3, 4, 4` | pass |
| `grade_thresholds` | 四个 `if` 语句 | 46 与 39 | 大小不同 | 1 对 0 | 无 | fail |
| `grade_case10_wrong` | `case 10: return 3;` | 46 与 46 | 相同 | 形状相同 | `1, 2, 3, 4, 4` 对 `1, 2, 3, 4, 3` | fail |

其中两行说明字节匹配究竟意味着什么。`percent_change_split.c` 源码不同，字节却相同，因为 clang 将有符号溢出视为未定义行为，并把两次乘法折叠为一次。`grade_table.c` 用数组索引访问同一张表，原始版本则用 `switch`。匹配仅证明这个编译器在这些选项下从候选生成了相同代码，不能证明候选就是原始文本。

大小只能用于诊断，不能作为验收。`percent_change_wide` 为 26 字节，因为 `movslq`、`imulq`、`cqto`、`idivq` 替换了 32 位形式。编译之前，反汇编就已显示这些宽度。

```figure
id: fig-7-2
kind: flow
title: 一个证明的两部分
claim: 第一部分在 92 个单元上运行原始实现与候选，第二部分比较 46 个掩码字节、一条重定位记录和五个表项。
caption: 每列自上而下阅读。灰框为在 rea 之外运行的验证框架和编译器，绿框为样例字节。青色表示通过，玫红色表示失败。来源：capture/out/17-harness-execute-plausible.json、17-harness-execute-equal.json、17-harness-bytes.json。
```

```figure
id: fig-7-3
kind: decision
title: 八个候选分别停在哪里
claim: 三个候选在大小检查处停止，一个通过全部字节检查后因所指向的表失败，四个最终通过。
caption: 自上而下阅读。每个灰框对应第二部分的一项检查。右侧玫红色虚线框列出在此失败的候选，以及报告打印的原因。底部青框通过了全部检查。来源：capture/out/17-harness-bytes.json。
```

## 2026 年测量补充了什么

输入网格中的风险并非此样例特有。Liu、Raff、Micinski 在 2026 年测量了八种反编译系统的九种配置（[arXiv 2609.05370](https://arxiv.org/abs/2609.05370)）。即使通过基准全部测试，候选在模糊测试输入上仍可能出现分歧。总体比例为 4.9%，单个系统最高为 13%。测试集包含 300 个库函数和 287 个已披露漏洞函数。其中最强的精修模型将 Ghidra 的构建率从 75% 提升至 90%，行为匹配率却从 74% 降至 62%。

研究将原因追溯到虚构的字段、类型、被调用函数和保护条件，它们替代了反编译器留下的可见未知项。`percent_change_wide.c` 虚构了类型，`grade_thresholds.c` 虚构了保护条件。两者都能编译，都通过十个朴素用例；若基准只重新编译并运行内置断言，两者都会被算作可重新执行。作者建议为每个函数合成驱动，并从参考实现开展模糊测试，相当于使用生成网格的第一部分。

课程还为常量检查提供第三个来源。rea 证据页介绍了一个重建项目：比较指令字节，却信任重定位目标。源码字面量 `0.0` 曾通过目标字面量 `128.0` 的检查，直到项目审计了 1,548 个浮点引用才发现。`grade_case10_wrong.c` 是本手册对该缺陷的复现，`read_table()` 就是对应审计。

```takeaways
- 按反汇编中的宽度编写重建，并在每个中间结果都按位宽回绕的网格上运行。
- 使用原始编译选项编译候选，遮蔽重定位字段后再比较字节。
- 读取每个重定位指向的字节，因为错误常量也能通过掩码比较。
- 每份证明记录宿主机与编译器，因为陷阱单元和字节都依赖它们。
```

Sources: capture/out/17-harness-grid.json, 17-harness-execute-plausible.json, 17-harness-execute-equal.json, 17-harness-bytes.json, 17-harness.txt, 10-mcp-20-compare-functions-percent-change.json, 10-mcp-21-compare-functions-total.json, 00-versions.txt; capture/README.md; phases/13-tools-and-protocols/36-rebuild-and-prove-equal/code/main.py, driver.c, fixtures/candidates/; rea at rea-agents-6.7.0 (27dc42d): src/domain/functionComparisonDimensions.ts (Liu, Raff, Micinski, arXiv 2609.05370, 2026); Intel 64 and IA-32 Architectures Software Developer's Manual, Volume 2, IDIV; Arm Architecture Reference Manual for A-profile, DDI 0487, SDIV
