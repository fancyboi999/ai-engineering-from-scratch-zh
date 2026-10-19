# 重建并证明等价：差分测试、字节比较与证据循环

> 测试通过只证明测试范围内一致。等价验证还需触及所有边界的输入网格，以及屏蔽重定位后的字节匹配。

**类型：** Build
**语言：** Python、C
**前置要求：** 阶段 13 · 34（提升为伪代码）、阶段 13 · 35（证据、置信度与未知项）
**预计时间：** 约 110 分钟

## 学习目标

- 根据指令列表编写重建，并注明来源证据记录。
- 构建输入网格，分别覆盖零值保护、负数、截断除法、32 位溢出和除法陷阱。
- 在同一程序运行原版与重建版，记录每个单元，包括陷阱。
- 用原始标志重新编译，屏蔽重定位字段后比较函数字节。
- 读取并比较重定位指向的常量，使错误字面量无法通过。
- 用小型 stdio 客户端操作 rea MCP 服务，逐步记录证据 ID。
- 生成默认拒绝未验证结论的证明记录，其 ID 哈希覆盖主张和证据链接。

## 问题背景

你向 rea 请求夹具 `ledger-x86_64-O1.o` 中 `percent_change` 的函数档案。Ghidra 12.1.4 返回伪代码，agent 据此写出：

```c
int percent_change(int before, int after) {
    if (before == 0) return 0;
    return (int)(((long)after - before) * 100 / before);
}
```

四个测试通过：`(100, 150)` 得 50，`(200, 100)` 得 -50，`(0, 5)` 得 0，`(50, 100)` 得 100。agent 又用针对 90、80、70、60 的四个 `if` 重建 `grade`，另六个测试通过。报告写着“已验证”。

但报告没回答：

- `(after - before) * 100` 超过 32 位时，原版返回什么？
- 分数为 110 时，原版返回什么？
- 重建会编译成与原版相同的 16 字节吗？
- 两函数的编译字节相同时，重定位是否指向相同常量？
- 重建来自哪条证据？agent 读的是列表还是伪代码？
- 主机没有 C 编译器时，证明状态是什么？

本课所有目标均为自己编写、编译的程序，第 32 课的范围和法律规则保持不变。

```figure
re-36-prove-equal
```

## 证据说明了什么

`code/main.py` 的 agent 循环经 stdio 向 rea 6.5.0 发出六次调用，记录在 `code/fixtures/runs/agent-run.json`。服务器对 `initialize` 返回协议版本 `2025-11-25`。其中三次返回 Evidence：

| 步骤 | 工具 | 时间 | 证据 ID |
|---|---|---|---|
| 2 | `analyze_function percent_change` | 6.31 秒 | `ev_e88b10dc0c6400e51bb6f7fdc3eaea8d2c97cc02463f0db3e6afeefc273197cd` |
| 3 | `analyze_function grade` | 0.02 秒 | `ev_67b6d3f992eaf49a2e16de084b6ebfdd9884e8c5c7f75e175b7bb20f4f748ce1` |
| 4 | `read_bytes 0x1000b4, 20` | 0.00 秒 | `ev_c26146cfedf4c1ee146d8ff00cfa9a5d3f5335bdd9c97ccf4e1af5f6ea3ed6bc` |

首次调用承担 Ghidra 导入与自动分析。每条记录都有 `confidence: "observed"`、`authority: "shipped-artifact"` 及目标 SHA-256 `9a4a8082ba5e285a732552981a6935e0c5255725664f380e37c44ebfb04d803f`。Ghidra 将可重定位目标的 `.text` 放在 `0x100000`，所以 `percent_change` 位于 `0x100000`，`grade` 位于 `0x100010`。

`percent_change` 伪代码正是 `long` 的来源：

```c
undefined1  [16] percent_change(int param_1,int param_2,ulong param_3)
{
  long lVar1;
  undefined1 auVar3 [16];
  if (param_1 != 0) {
    lVar1 = (long)((param_2 - param_1) * 100);
    auVar3._0_8_ = lVar1 / (long)param_1 & 0xffffffff;
    auVar3._8_8_ = lVar1 % (long)param_1 & 0xffffffff;
    return auVar3;
  }
  ...
}
```

反编译器看到 `cltd`、`idivl` 写 `edx` 与 `eax`，将其建模为带 64 位除法的 16 字节返回值。同条记录的列表说得更直接：

```
0x100000: TEST EDI, EDI
0x100002: JZ 0x0010000d
0x100004: SUB ESI, EDI
0x100006: IMUL EAX, ESI, 0x64
0x100009: CDQ
0x10000a: IDIV EDI
0x10000c: RET
0x10000d: XOR EAX, EAX
0x10000f: RET
```

每次操作宽度均为 32 位。`IMUL EAX, ESI, 0x64` 做 32 位乘法，仅保留低半部；`CDQ` 将 `eax` 符号扩展到 `edx`；`IDIV EDI` 将 64 位组合除以 32 位除数。忠于列表的重建是使用 `int` 的 `100 * (after - before) / before`。

`grade` 记录同样如此。伪代码用 `*(uint *)(&DAT_001000b4 + (ulong)uVar2 * 4)` 表示表，并给出基于 `0x66666667` 的难读默认值。列表显示除以 10：`IMUL RAX, RAX, 0x66666667`、`SAR RCX, 0x22`、`SHR RAX, 0x3f`、`ADD ECX, EAX`；随后 `ADD ECX, -0x6`、`CMP ECX, 0x4`、`JA` 只保留十位数 6 至 10。比较前 `XOR EAX, EAX` 将默认值设为 0。`LEA RCX, [0x1000b4]` 和 `MOV EAX, dword ptr [RCX + RAX*0x4]` 读取五项四字节表。

步骤 4 读取二十字节 `01000000 02000000 03000000 04000000 04000000`，即十位数 6、7、8、9、10 对应 `1, 2, 3, 4, 4`。这就是 `ledger.c` 的 switch，其中 `case 10` 和 `case 9` 共用 4。

rea 自有证据页的两项证明都从指令列表与 `read_bytes` 常量读取开始。DX-Ball 首次伪代码是没有栈输入的 `FUN_00406400(void)`，指令视图修正了它。先读列表，引用记录 ID，再写 C。

## 编写候选重建

`code/fixtures/candidates/` 有八份重建，每文件一个函数。四份忠于列表或编译成相同代码；另外四份看似合理却错误，或仅一个手写测试就能查错。

| 文件 | 源码 | 行为 |
|---|---|---|
| `percent_change_mul_first.c` | `100 * (after - before) / before` | 列表的 C 表达 |
| `percent_change_split.c` | `(after * 100 - before * 100) / before` | 文本不同，clang 折叠后字节相同 |
| `percent_change_wide.c` | `(int)(((long)after - before) * 100 / before)` | 保留伪代码的 long，回绕前先除 |
| `percent_change_div_first.c` | `(after - before) / before * 100` | 先除，舍入不同 |
| `grade_switch.c` | 五分支 `switch (score / 10)` | 原始源码 |
| `grade_table.c` | `unsigned slot = score / 10 - 6; slot < 5 ? points[slot] : 0` | 列表的 C 表达 |
| `grade_thresholds.c` | `if (score >= 90) return 4; ...` | 最高档没有上界 |
| `grade_case10_wrong.c` | `case 10: return 3;` | 一个表项错误 |

每文件均用夹具命令 `clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c` 编译。目标文件与源码一同提交，使无 clang 主机也能测试。

## 第一条验证路径：运行并比较

McKeeman（1998）将差分测试定义为：向两个或更多可比较系统输入机械生成用例，将结果不同、挂起或崩溃视为 bug 候选。他指出最难之处是判断测试结果。这里原始函数就是基准，无需预先知道正确答案，只需原版与重建在覆盖全部危险类别的网格上无分歧。

### 设计网格

`code/main.py` 的 `input_grid()` 构建 92 个单元。`percent_change` 取十个 before 和七个 after 的所有组合：

```
before: 0, 1, -1, 3, -3, 7, 100, -100, 2147483647, -2147483648
after:  0, 5, -5, 105, 536870911, 2147483647, -2147483648
```

`grade` 取 22 个分数，覆盖每档边界两侧、负数、0、110、两个 int 极值。`classify()` 标记各单元：溢出 32、负数 17、边界 14、普通 12、零值保护 7、负数截断 5、舍入 2、超出 switch 2、陷阱 1。

每类各有目的。零值保护检查 `TEST EDI, EDI` 分支；负数检查向零截断，C 与 `idiv` 的 `-9 / 10` 为 0、`-10 / 10` 为 -1；舍入检查先乘后除，`(105 - 100) * 100 / 100` 为 5 而非 0；溢出令 `(after - before) * 100` 超过 32 位；唯一陷阱输入让回绕乘积为 `INT_MIN`，before 为 -1。

Yang、Chen、Eide、Regehr 构建 Csmith 时只生成无未定义行为程序。未定义行为下的基准分歧是噪声，不能当 bug 报告。有符号溢出在 C 中未定义，但这里基准是具有固定行为的已编译目标文件，因此溢出属于范围。应明确哪些单元依据标准、哪些依据编译字节。

### 驱动与陷阱

`code/driver.c` 从 stdin 每行读取一个单元，打印输入、原始结果和重建结果。`build_harness()` 用 `-Dpercent_change=cand_percent_change -Dgrade=cand_grade` 编译候选，让两版以不同名称链接到同一程序。在 x86-64 Linux 上，原版直接是夹具目标文件；其他主机则本地编译 `ledger.c`，报告记录 `original_kind: fixture-source`。

驱动用 `sigsetjmp`、`siglongjmp` 安装 `SIGFPE` 处理器。`before = -1`、`after = 536870911` 时，差为 536870912，32 位乘积回绕为 -2147483648。x86-64 的 `idiv` 用该被除数除以 -1，会因商无法放入 32 位而触发除法错误异常（Intel SDM 第 2 卷 IDIV）。处理器将其记为 `trap`。

AArch64 的 `sdiv` 不触发陷阱，相同操作数返回 -2147483648。原始 arm64 Mac 运行正是如此。基准依赖架构，报告必须说明运行架构。

### 结果

`prove_behaviour(PLAUSIBLE)` 构建 long 版本和阈值版本。十个朴素用例通过，但网格 28 项失败：

| 函数 | 输入 | 类别 | 原版 | 重建 |
|---|---|---|---|---|
| `percent_change` | 3, 2147483647 | 溢出 | -133 | -1431655899 |
| `percent_change` | 100, 2147483647 | 溢出 | -101 | 2147483547 |
| `percent_change` | 2147483647, 5 | 溢出 | 0 | -99 |
| `grade` | 110 | 超出 switch | 0 | 4 |
| `grade` | 2147483647 | 超出 switch | 0 | 4 |

26 项 percent_change 失败全是 `|before| > 1` 的溢出单元。before 为 1 或 -1 时，64 位商截断后恰好得到回绕值，因而碰巧一致。阈值 grade 失败是因为原 switch 没有十位数 11 及以上分支，`110 / 10` 为 11。

`prove_behaviour(EQUAL)` 构建 `percent_change_mul_first.c` 和 `grade_switch.c`，92 项全部一致。`percent_change_div_first.c` 在四个朴素用例中失败两项，是手写测试能发现的那一种。

`oracle_disagreements()` 另做检查。`percent_change_model()`、`grade_model()` 是指令列表的 Python 模型，用 `wrap32()` 表达 32 位乘法，用 `idiv32()` 表达架构规则。报告逐单元比较模型与观察到的原版。零分歧表示网格内全部一致。模型是 derived，运行是 observed，二者分字段记录。

## 第二条验证路径：重编译并比较

网格行为是第一条路径，第二条问：重建用相同编译器和标志，能否产生相同字节？DX-Ball 报告辅助函数 63 字节匹配，TH04 报告 2,139 字节匹配，均使用各自时期的编译器。rea 本身无法做到，它的 `compare_functions` 只是 provider 文本行差异，并注明汇编为不透明文本、不支持重定位规范化。

### 读取目标文件

`code/main.py` 的 `ElfObject` 用 `struct.unpack_from` 读取 ELF64 可重定位目标，检查魔数、64 位类别、小端、`e_machine` 62、`e_type` 1，再遍历节头、字符串表、`.symtab` 和每个 `.rela` 节。夹具中 percent_change 位于 `.text` 偏移 0、大小 16；grade 在 `0x10`、大小 46；total 在 `0x40`、大小 31；grade_label 在 `0x60`、大小 63。

percent_change 的 16 字节是 `85 ff 74 09 29 fe 6b c6 64 99 f7 ff c3 31 c0 c3`，没有重定位。grade 有一项：函数内偏移 `0x26`、类型 `R_X86_64_PC32`、符号 `.rodata`、加数 `0x10`。它属于偏移 `0x23` 的七字节 `leaq`，最后四字节是位移字段。

### 先屏蔽，再比较记录

RELA 目标的加数存在重定位记录中，四个字段字节为零，候选 `grade_switch.o` 对应位置也为零。即使重定位指向不同位置，普通字节比较仍会通过。`mask_relocations()` 依然将两边字段清零，使同一方法也适用于字段内保存加数的 REL 与 Mach-O。

`prove_bytes()` 再按偏移、类型、目标节比较重定位。原版为 `.rodata+0x10`，候选为 `.rodata-0x4`，因为候选的 switch 表前没有 `labels.rel`。加数不同表示偏移不同，不代表函数不同。

### 读取重定位指向的常量

对位于指令末尾的 PC 相对字段，CPU 加上下一指令地址，因此目标为符号加加数加 4。原版是 `.rodata+0x14`，候选是 `.rodata+0x0`。`read_table()` 在各处读取五个四字节项，二者均为 `1, 2, 3, 4, 4`。

五项来自列表：`CMP ECX, 0x4` 配 `JA` 允许 0–4，`[RCX + RAX*0x4]` 每索引读取四字节。`code/main.py` 的 `CLAIMS` 记录 grade 的这一形状，并记录 percent_change 零重定位。

此步骤源于 TH08 记录过的 bug：旧比较将目标地址回填到指令重定位字段，再比较指令，却不检查该地址的浮点字面量数据。因此源码 0.0 可能看似与目标 128.0 精确匹配。修正审计了 1,548 处浮点引用，又发现十二处。本文 `grade_case10_wrong.c` 重现同类问题：46 字节代码与原版相同，重定位形状也同，但表为 `1, 2, 3, 4, 3`，只有常量检查能使其失败。

### 结果

| 候选 | 大小 | 屏蔽后字节 | 重定位记录 | 表 | 状态 |
|---|---|---|---|---|---|
| `percent_change_mul_first` | 16 对 16 | 相同 | 无 | 无 | pass |
| `percent_change_split` | 16 对 16 | 相同 | 无 | 无 | pass |
| `percent_change_wide` | 16 对 26 | 大小不同 | 无 | 无 | fail |
| `percent_change_div_first` | 16 对 18 | 大小不同 | 无 | 无 | fail |
| `grade_switch` | 46 对 46 | 相同 | 同形状 | 都为 `1,2,3,4,4` | pass |
| `grade_table` | 46 对 46 | 相同 | 同形状 | 都为 `1,2,3,4,4` | pass |
| `grade_thresholds` | 46 对 39 | 大小不同 | 1 对 0 | 无 | fail |
| `grade_case10_wrong` | 46 对 46 | 相同 | 同形状 | `1,2,3,4,4` 对 `1,2,3,4,3` | fail |

两项值得再看。`percent_change_split.c` 文本不同却字节相同，因为 clang 将有符号溢出视为未定义，能把 `after * 100 - before * 100` 折叠成一次乘法。`grade_table.c` 也逐字节匹配，说明编译器从数组索引与 switch 得到同一张表。字节匹配只证明该编译器与这些标志从候选产生相同代码，不证明候选就是原始源码。

大小是诊断，不是验收。rea 证据页有一个长度正确、1,825 字节的候选，内部仍有 467 字节不同。wide 重建为 26 字节，因为 `movslq`、`imulq`、`cqto`、`idivq` 取代了 32 位形式。编译之前列表已经告诉了宽度。

## 通过 rea 的 agent 循环

rea 有 65 个 MCP 工具没有 CLI 命令，`verify_reconstruction` 便是其一。`code/main.py` 的 `McpStdioClient` 是可触达它们的最小客户端。它启动 `npx -y rea-agents@6.5.0 mcp`，向 stdin 每行写一个 JSON-RPC 请求，在线程中从 stdout 每行读一个 JSON。依次发送协议 `2025-11-25` 的 `initialize`、`notifications/initialized`、`tools/call`。每调用默认截止时间 330 秒，与 rea 为 Ghidra 冷启动预留一致。

`agent_loop()` 执行六次调用，逐项记录：

```json
{
  "step": 2,
  "tool": "analyze_function",
  "arguments": {"procedure": "percent_change"},
  "seconds": 6.31,
  "is_error": false,
  "evidence_id": "ev_e88b10dc0c6400e51bb6f7fdc3eaea8d2c97cc02463f0db3e6afeefc273197cd",
  "confidence": "observed",
  "authority": "shipped-artifact",
  "limitations": ["Resolved reference metadata identifies computed, indirect, external, call, jump, and data edges; unresolved targetless flows remain unknown, and function classifications distinguish thunks and externals.", "..."],
  "result_sha256": "..."
}
```

完整 Evidence 以 ID 为键存于同一文件，重建来源的伪代码和列表也属于夹具。`table_address()` 从 grade 列表提取 LEA 操作数，传给 `read_bytes`。`open_binary`、`get_evidence_bundle`、`close_binary` 不返回 Evidence，故记录空 ID。

PATH 有 npx 且 `GHIDRA_INSTALL_DIR` 指向目录时，`run_agent(live=True)` 实际操作 rea；否则重放夹具，在 stderr 说明。测试更进一步：`code/tests/fake_rea_server.py` 按工具及参数返回对应记录，作为替身服务。每次测试都会实际运行客户端和循环，无需 rea、Ghidra 或 Java。

### rea 验证器能说什么、不能说什么

`verify_reconstruction` 接收指向比较 Evidence 的主张，为每项返回 pass、fail、unknown。固定限制说明：pass 只表示声明的每项主张通过，不代表全局实现等价。函数主张比较 `compare_functions` 的 provider 文本；行为主张比较 `compare_process_captures` 的两次已记录进程捕获。来源调用覆盖不完整时，调用相关主张为 unknown。rea 内部不会编译重建函数，也不会运行你的输入网格。这两条验证路径正是留给你的工作。

rea 义务账本要求证明记录具有 `predicate_type: "rea.reconstruction-proof"`、`operation: "verify_reconstruction_obligations"`、`confidence: "observed"`、`normalized_result.passed === true`。没有公开 rea 工具产生它，`code/main.py` 的 `build_proof()` 自行生成：

```json
{
  "predicate_type": "rea.reconstruction-proof",
  "operation": "verify_reconstruction_obligations",
  "confidence": "observed",
  "authority": "controlled-replay",
  "normalized_result": {
    "passed": true,
    "status": "pass",
    "claims": [
      {"claim_id": "percent_change.behaviour", "kind": "behavioral", "status": "pass", "evidence_ids": ["ev_e88b10dc..."]},
      {"claim_id": "grade.behaviour", "kind": "behavioral", "status": "pass", "evidence_ids": ["ev_67b6d3f9..."]},
      {"claim_id": "percent_change.bytes", "kind": "structural-function", "status": "pass", "evidence_ids": ["ev_e88b10dc..."]},
      {"claim_id": "grade.bytes", "kind": "structural-function", "status": "pass", "evidence_ids": ["ev_67b6d3f9..."]},
      {"claim_id": "grade.referenced-constants", "kind": "structural-function", "status": "pass", "evidence_ids": ["ev_67b6d3f9..."]}
    ]
  },
  "evidence_links": ["ev_e88b10dc...", "ev_67b6d3f9..."],
  "evidence_id": "ev_..."
}
```

ID 为去掉自身后记录的紧凑排序键 JSON 的 SHA-256，加 `ev_`。`aggregate()` 默认拒绝未经验证的结论：fail 优先，其次 unknown，空列表也为 unknown。无 C 编译器时，两项行为主张为 unknown，纵使两项字节主张通过，记录仍为 unknown。authority 为 controlled-replay，因为证明来自自有测试程序，而不只是目标文件。

## 研究结果

Liu、Raff、Micinski 在 2026 年测量八套反编译系统的九种配置。通过基准所有测试的候选仍会在模糊输入上偏离，总体 4.9%，某系统达 13%。在 300 个 GitHub 库函数和 287 个 CVE 相关函数上，最强改进模型将 Ghidra 构建率从 75% 提至 90%，行为匹配率却从 74% 降到 62%。原因是杜撰的字段、类型、被调用者和保护条件替换了传统反编译器保留的可见未知项。

`percent_change_wide.c` 就是这类杜撰类型：伪代码提供 long，重建保留它，结果能编译、过十个测试，却在 26 个溢出单元失败。grade 阈值重建则是杜撰保护条件。按 LLM4Decompile 的指标，两者都可能算可重执行，因为其只重新编译并运行基准断言。Ghidra 自有伪 C 在 HumanEval-Decompile 上通过率为 20.12%。

DecompileBench 测量 130 个真实程序的 23,400 个函数，发现 LLM 方法功能正确性比工业反编译器低 52.2%，可理解性得分更高。

领域中的三类证明，对应三条可实现路径：Phoenix、DREAM 重新编译并运行原程序测试；McKeeman、Csmith 在定义行为范围内生成输入，与原版比较；Ramos、Engler 用有界符号执行检查两份 C 函数，对输入规模限制内所有探索路径证明相等。本课实现前两类。网格不足以信任时，第三类可接入第 35 课证据账本实践。

## 动手构建

运行标准库测试程序：

```bash
cd phases/13-tools-and-protocols/36-rebuild-and-prove-equal
python3 code/main.py
```

PATH 有 clang 时，演示编译两组候选，各运行 92 单元；重编译八个候选，重放 agent 运行，生成证明记录。无 clang 时读取已提交目标文件，将行为主张报告为 unknown。

arm64 Mac 上预期结构：

```json
{
  "host": "aarch64 Darwin",
  "originalKind": "fixture-source",
  "gridCells": 92,
  "plausible": {"naivePassed": true, "gridMismatches": 28, "oracleDisagreements": 0},
  "equal": {"naivePassed": true, "gridMismatches": 0, "oracleDisagreements": 0},
  "legTwo": {
    "percent_change_mul_first": {"status": "pass", "reasons": []},
    "percent_change_wide": {"status": "fail", "reasons": ["size 16 vs 26 bytes"]},
    "grade_case10_wrong": {"status": "fail", "reasons": ["referenced constants differ: [1, 2, 3, 4, 4] vs [1, 2, 3, 4, 3]"]}
  },
  "agentRun": {"mode": "replayed fixture", "server": {"name": "rea", "version": "6.5.0", "protocolVersion": "2025-11-25"}},
  "proof": {"status": "pass", "evidence_id": "ev_..."}
}
```

按以下顺序阅读 `code/main.py`：

1. `wrap32()`、`c_div()`、`idiv32()` 及两个 `*_model()` 实现列表的整数语义。
2. `input_grid()`、`classify()` 构建并标记 92 单元。
3. `build_harness()`、`execute()` 将原版、重命名候选、`driver.c` 编为一个程序并运行单元。
4. `prove_behaviour()` 返回第一条路径报告，含不匹配及模型分歧。
5. `ElfObject` 读取头、符号、`.rela`；`mask_relocations()`、`read_table()` 准备比较。
6. `prove_bytes()` 返回第二条路径报告，含大小、屏蔽范围、重定位形状和表。
7. `McpStdioClient`、`agent_loop()` 操作 rea 并记录每步。
8. `build_proof()`、`aggregate()` 生成默认拒绝未验证结论的记录。

## 实际使用

验证新函数等价时：

1. 获取 `analyze_function` 并记录证据 ID，先读列表再读伪代码。
2. 按列表的运算宽度写候选，保留原函数名。
3. 列出每项乘、加、减、除，加入能在相应宽度发生回绕的输入。
4. 为每个比较常数加入两侧输入；grade 是减法后的 6 和 4。
5. 加入目标上可能触发陷阱的除数，记录运行架构。
6. 运行两条路径，先读原因再看状态。
7. 将证明记录放在候选旁，`evidence_links` 让读者知道主张依赖什么。

编译器更新后重跑两条路径。字节匹配只针对某编译器和某组标志。

## 交互实验

### 实验 A：模型与运行

在 `code` 目录启动 Python：

```bash
cd phases/13-tools-and-protocols/36-rebuild-and-prove-equal/code
python3 -q
```

运行：

```python
from main import *
percent_change_model(3, INT_MAX)
percent_change_model(-1, 536870911, "x86_64")
percent_change_model(-1, 536870911, "aarch64")
report = prove_behaviour(PLAUSIBLE)
report.naive_passed, len(report.mismatches), report.mismatches[0]
```

首次调用得 -133，即回绕乘积除以 3；第二次为 `'trap'`；第三次为 -2147483648。报告显示十个朴素用例通过、28 网格单元失败。检查 `report.oracle_disagreements` 是否为空列表。

### 实验 B：读取目标文件

```python
obj = ElfObject(ORIGINAL_OBJECT)
grade = obj.function("grade")
grade.size, grade.data[0x26:0x2a].hex(), grade.relocations
read_table(obj, grade.relocations[0], 5, 4)
```

字段字节为 `00000000`。重定位引用 `.rodata`，加数 `0x10`，表为 `[1, 2, 3, 4, 4]`。

### 实验 C：破坏一个常量

```python
report = prove_bytes("grade", CANDIDATES / "grade_case10_wrong.o")
report.masked_equal, report.relocations_match, report.tables_equal, report.reasons()
```

字节匹配，记录匹配，表不匹配。将 `grade_case10_wrong.c` 的 case 10 改回返回 4，用夹具命令重编译，观察状态变为 pass。

### 实验 D：操作 rea

已安装 rea 6.5.0、Ghidra 12.1.4 时：

```bash
GHIDRA_INSTALL_DIR=/opt/homebrew/Cellar/ghidra/12.1.4/libexec \
JAVA_HOME=/opt/homebrew/opt/openjdk@21 \
python3 code/main.py --live
```

首次 `analyze_function` 因 Ghidra 导入耗时数秒。比较新证据 ID 与提交记录。相同字节和分析配置得到相同 ID，因为内容哈希排除了路径。

## 实践实验

将两条验证路径扩展到同一目标中的 total、grade_label。

要求：

- total 的输入是数组和 count。覆盖 count 0、负数、单元素、32 位回绕总和。
- grade_label 内联 grade，读取 `labels.rel`，其中五个相对字符串偏移各有 `.rela.rodata` 重定位。
- 给 grade_label 添加 `CLAIMS`：两项重定位、五项四字节表，并比较表项指向的字符串。
- 记录模型与运行的分歧单元，按列表逐项解释。
- 证明记录中每函数每条路径添加一个主张，聚合仍默认拒绝未验证结论。

验收标准：证明记录列出四函数，每主张带证据 ID，任一标签字符串不同时 grade_label 失败。

## 交付产物

本课生成 `outputs/skill-rebuild-and-prove-equal.md`，将函数证据与候选重建转为两条路径的证明及证明记录。技能要求先读列表、覆盖每种危险类别、屏蔽重定位并检查常量，以及默认拒绝未验证结论的聚合。

## 验证

运行演示和测试：

```bash
cd phases/13-tools-and-protocols/36-rebuild-and-prove-equal
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

36 项测试证明：

- `c_div()` 向零截断，`wrap32()` 遵循补码。
- 模型对 `(3, INT_MAX)` 得 -133，陷阱单元在 x86-64 得 trap、AArch64 得 -2147483648。
- 网格含 92 单元及全部危险类别，朴素用例避开了全部困难类别。
- ELF 读取器在记录偏移和大小找到四函数。
- percent_change 为 16 字节且无重定位；grade 在 `0x26` 有一个 `R_X86_64_PC32`。
- 重定位字段为零，屏蔽不改变此 RELA 目标。
- 外部未定义符号和已定义代码目标都必须保留相同身份与加数；两个目标都在 `.text` 节不能替代这项检查。已定义表的布局变化仍通过读取并比较实际常量判断。
- 八个提交候选都达到预期状态并给出记录原因。
- grade_case10_wrong 通过屏蔽字节比较，只在常量检查失败。
- 已记录第一条路径有十个朴素通过、28 不匹配、零模型分歧。
- 存在编译器时，两组候选重建并重跑得到同样结论。
- agent 按顺序以 SHA-256 指向提交目标，每个 Evidence 步骤都有 `ev_`。
- read_bytes 记录等于 ELF 读取器找到的表。
- 客户端操作替身服务，记录与真实运行相同的证据 ID。
- 服务端错误结果进入运行记录。
- aggregate 默认拒绝未验证结论，证明 ID 可从内容重算。

## 生产故障模式

| 故障 | 粗略报告 | 测试程序必须证明 |
|---|---|---|
| 重建保留反编译 long | “十个测试通过” | 26 个溢出单元与原版不同 |
| 阈值替代 switch | “每档都通过” | 原版对 110 及更大值返回 0 |
| 先除后乘 | “代数等价” | 舍入单元不同，朴素用例失败 |
| 跳过陷阱单元 | “无崩溃” | x86-64 抛 `#DE`，AArch64 返回 INT_MIN，并注明主机 |
| 不屏蔽就比较字节 | “字节相同” | 重定位指向不同偏移 |
| 屏蔽但不读常量 | “屏蔽后相同” | `1,2,3,4,3` 不同于 `1,2,3,4,4` |
| 长度当验收 | “长度相同” | 相同长度内仍可能有差异 |
| 编译器或标志不同 | “字节不同，重建错了” | 同源码也可产生不同字节，比较无效 |
| 模型当观察 | “模型一致” | 运行是 observed，模型是 derived，列出分歧 |
| 主张无证据 ID | “已验证” | 每主张链接所覆盖函数的 ev_ 记录 |
| CI 无编译器 | “通过” | 行为和聚合为 unknown |
| 伪代码当源码 | “反编译器说 long” | 列表显示 IMUL EAX、CDQ、IDIV EDI |

## 操作规则

从列表编写重建并引用来源记录。在网格上与原版执行比较，覆盖每个中间值回绕及每个比较常数两侧。以原标志重编译，屏蔽字段，比较重定位并读取其常量。每个主张都记录证据 ID，未经验证的主张保持 unknown。

## 延伸阅读

- [McKeeman，Differential Testing for Software，Digital Technical Journal 10(1)，1998](https://www.cs.tufts.edu/comp/150FP/archive/bill-mckeeman/DifferentailTesting.pdf)
- [Yang、Chen、Eide、Regehr，Finding and Understanding Bugs in C Compilers，PLDI 2011](https://doi.org/10.1145/1993498.1993532)
- [Ramos、Engler，Practical, Low-Effort Equivalence Verification of Real Code，CAV 2011](https://doi.org/10.1007/978-3-642-22110-1_55)
- [Schwartz、Lee、Woo、Brumley，Native x86 Decompilation Using Semantics-Preserving Structural Analysis，USENIX Security 2013](https://www.usenix.org/conference/usenixsecurity13/technical-sessions/presentation/schwartz)
- [Liu、Raff、Micinski，When LLM Decompilers Recompile More and Preserve Less，arXiv 2609.05370，2026](https://arxiv.org/abs/2609.05370)
- [Gao 等，DecompileBench，Findings of ACL 2025](https://aclanthology.org/2025.findings-acl.1194/)
- [Tan 等，LLM4Decompile，arXiv 2403.05286，2024](https://arxiv.org/abs/2403.05286)
- [System V gABI 第 4 章：重定位](https://www.sco.com/developers/gabi/latest/ch4.reloc.html)
- [x86-64 psABI 仓库：重定位类型](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Intel 64 与 IA-32 架构软件开发手册，第 2 卷 IDIV](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [Arm A-profile 架构参考手册，DDI 0487，SDIV](https://developer.arm.com/documentation/ddi0487/latest)
- [rea 6.5.0 MCP 契约](https://github.com/morluto/rea/blob/rea-agents-6.5.0/docs/mcp-contracts.md)
- [rea 6.5.0 重建义务账本](https://github.com/morluto/rea/blob/rea-agents-6.5.0/docs/reconstruction-obligation-ledgers.md)
