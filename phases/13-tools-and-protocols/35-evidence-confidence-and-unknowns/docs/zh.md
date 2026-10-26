# 二进制分析中的证据、置信度与未知项

> 关于编译程序的每项发现，都应是带哈希、置信度、权威来源及能力边界的记录。

**类型：** Build
**语言：** Python、C
**前置要求：** 阶段 13 · 32（从零读取 ELF）、阶段 13 · 33（反汇编与控制流）、阶段 13 · 34（提升为伪代码）
**预计时间：** 约 105 分钟

## 学习目标

- 仿照 rea 的 `Evidence` 构建证据记录，区分 observed、derived、inferred 置信度。
- 计算内容哈希 ID，使文件移到其他目录后仍保持一致。
- 将各 provider 无法展示的内容记为随记录传递的限制。
- 没有实际观察到的函数执行支持，就不将结果表述为已证实。
- 将残留未知项保存为由哈希链连接的版本记录。
- 以精确键缓存 provider 答案，拒绝过期重放。

## 问题背景

你问 agent：`ledger-x86_64-O1.o` 的 `grade` 对分数 55 返回什么？它调用 rea、阅读 Ghidra 伪代码，回答 0。评审者追问依据，agent 只有 Ghidra 打印的文本。默认路径写着 `uVar1 = -(param_1 >> 0x1f) ^ (uint)((ulong)((long)param_1 * 0x66666667) >> 0x3f);`，对应字节却是 `xor eax, eax`。

表达式和指令对所有输入都产生 0，但 agent 并不知道这一点。它只是因为文本来自工具便相信了。2026 年一项研究让三个 agent 完成 24 项逆向工程任务（[NDSS BAR 2026](https://www.ndss-symposium.org/wp-content/uploads/bar2026-58.pdf)），归纳出训练偏差、过度信任观察、上下文限制、计划固执四种反复出现的弱点。另一项 2026 年研究向二进制植入文本，40 次中有 35 次模型提出了植入的不安全操作（[arXiv 2607.12507](https://arxiv.org/abs/2607.12507)）。

rea 6.5.0 为此提供一套术语。每次成功工具调用生成一条 `Evidence`，带 `observed`、`derived` 或 `inferred` 的 `confidence`、`authority` 和 `limitations`。随附技能要求：每项结论区分观察、推导和未知项，引用 Evidence ID，保留限制与未覆盖范围，绝不能暗示静态分析观察到了执行。

rea 留给你三件事：快照缓存的是精确查询结果，并非分析；验证在比较维度未变化时通过某主张，其注释明确说这不证明全局实现等价；义务账本只从 JavaScript 和托管图中接收候选，原生函数无法经它进入 `verified`。

本课用纯 Python 补上这一环：将夹具的每个事实存成带内容哈希的记录。对 `percent_change`、`grade` 做预测，标为 inferred，再用自己编译的测试程序运行核验。还会导入两条真实 rea 记录及对应快照，重新计算 rea 写入的每个哈希。

```figure
re-evidence-ledger
```

## 三种置信度，五种权威来源

`confidence` 是三值枚举，不是数字。`authority` 有五个值。生产者没有说明时，rea 默认使用 `observed` 和 `shipped-artifact`。

| 值 | 在夹具中的含义 | 本课记录 |
|---|---|---|
| `observed` | 从字节或执行中读取的事实 | ELF 节和符号读取、两条 Ghidra 记录、17 次本机执行 |
| `derived` | 从观察记录计算的事实 | switch 表模型、除法模型、各未知项变更 |
| `inferred` | 尚无观察支持的预期 | 18 项预测 |
| `shipped-artifact` | 来源是磁盘文件 | 对 `ledger-x86_64-O1.o` 的各次读取 |
| `controlled-replay` | 事实来自受控执行 | `harness.c` 的本机执行 |
| `analyst-inference` | 分析者判断 | 预测和未知项变更 |
| `historical-reference` | 较早源码树或文档 | 本课无 |
| `external-service` | 文件和本机之外的服务 | 本课无 |

两种混淆最浪费时间。第一，将伪代码当成行为观察；它实际只观察到 Ghidra 打印了什么。第二，将空列表当成不存在的证明。rea 设计说明明确规定：缺失覆盖意味着未知，并非不存在。`code/main.py` 将两条规则编码到证据账本。

## 记录

记录恰好有十六个字段，rea 6.5.0 拒绝其他字段。`code/main.py` 与 rea 使用相同名称，双方记录可互相校验。第十六字段 `relationship_coverage` 表示调用者或被调用者列表的完整性，可为 `complete`、`partial`、`unknown`；操作不报告调用关系时为 `null`。

| 字段 | 内容 |
| --- | --- |
| `evidence_id` | `ev_` 加 64 位十六进制内容哈希 |
| `subject` | `name`、`digest.sha256`、`format`、`architecture`、`local_path`，或 `null` |
| `provider` | `id`、`name`、`version`，或 `null` |
| `analysis_profile` | provider 设置及摘要，或 `null`，字段始终存在 |
| `predicate_type` | 标签，默认 `rea.analysis` |
| `operation`、`parameters` | 工具及输入 |
| `raw_result`、`normalized_result` | provider 输出及规范结果 |
| `confidence`、`authority` | 上述枚举 |
| `environment` | `id`、`platform`、`architecture`、`isolation`，或 `null` |
| `limitations` | 自然语言限制 |
| `relationship_coverage` | `status` 为 `complete`、`partial`、`unknown`，附诊断；或 `null` |
| `locations` | `address`、`address-range`、`artifact-path`、`file-offset`、`file-offset-range` |
| `evidence_links` | 本记录依赖的 `ev_` ID |

以下是 rea 对 `grade` 写出的真实记录，仅保留本课相关字段。完整文件为 `code/fixtures/rea-evidence-grade.json`，共 37,573 字节。

```json
{
  "evidence_id": "ev_67b6d3f992eaf49a2e16de084b6ebfdd9884e8c5c7f75e175b7bb20f4f748ce1",
  "subject": {
    "name": "ledger-x86_64-O1.o",
    "digest": { "sha256": "9a4a8082ba5e285a732552981a6935e0c5255725664f380e37c44ebfb04d803f" },
    "format": "elf",
    "architecture": "x86_64",
    "local_path": "/private/tmp/aiefs-re/phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns/code/fixtures/ledger-x86_64-O1.o"
  },
  "provider": { "id": "ghidra", "name": "Ghidra", "version": "12.1.4" },
  "analysis_profile": {
    "provider": { "id": "ghidra", "name": "Ghidra", "version": "12.1.4" },
    "parameters": { "jump_table_evidence": "typed-case-default-blocks-v1", "import_mode": "ephemeral-source-immutable" },
    "digest": "9c7f6b24be69294e61da046e4583e3856cb9e40433b149c1bf8bb534d2fe03ef"
  },
  "operation": "analyze_function",
  "parameters": { "procedure": "grade" },
  "confidence": "observed",
  "authority": "shipped-artifact",
  "environment": null,
  "limitations": [
    "Default-space addresses use lowercase 0x-prefixed hexadecimal; other address spaces use <percent-encoded-space>:0x<hex>.",
    "Resolved reference metadata identifies computed, indirect, external, call, jump, and data edges; unresolved targetless flows remain unknown, and function classifications distinguish thunks and externals."
  ],
  "relationship_coverage": {
    "status": "complete",
    "diagnostics": [
      "Only resolved Ghidra call references are returned; unresolved computed or indirect calls remain unknown, while function classifications distinguish thunks and externals."
    ]
  },
  "locations": [],
  "evidence_links": []
}
```

真实 profile 的 `parameters` 有 25 个键，`limitations` 有十句。必须保留。限制属于内容，删除会改变 ID，账本将拒绝记录。

还要看记录没说什么。`environment` 为 `null`，因为 Ghidra 只读文件，未运行程序。`locations` 为空，因为该操作在 `normalized_result` 内报告地址。`relationship_coverage` 为 `complete`，但诊断说明只返回已解析的 Ghidra 调用引用，未解析计算或间接调用仍未知。因此列表只对已解析调用完整。

## ID 哈希内容，不包含路径

rea 将记录投影为 RFC 8785 规范 JSON，对其计算 SHA-256，再加 `ev_` 前缀。投影保留 subject 的 `digest`、`format`、`architecture`，去掉 `name`、`local_path`。`relationship_coverage` 为 `null` 时也去掉，以便无调用关系的旧记录保持原 ID。其余内容全部参与哈希，包括 `raw_result` 和每项限制。

RFC 8785 排序对象键、去除空白并固定数字与字符串表示。若记录只有整数，Python 标准库能生成同样字节：

```python
def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
```

`code/main.py` 在哈希前拒绝浮点数，因为 RFC 8785 与 Python 对部分浮点数输出不同。两条 rea 记录和快照都无浮点数，所以可重现所有哈希：

| rea 值 | `code/main.py` 重算 |
|---|---|
| `grade` 的 `ev_67b6d3f992eaf49a…` | 相等 |
| `percent_change` 的 `ev_e88b10dc0c6400e5…` | 相等 |
| 对 `{provider, parameters}` 的 profile 摘要 `9c7f6b24be69294e…` | 相等 |
| `grade` 快照项 `query_26122aebe9d8abae…` | 相等 |
| `percent_change` 项 `query_0f95ef38038d3666…` | 相等 |

为何排除路径？相同字节的相同观察，无论机器和目录都应具有相同 ID。上方 `local_path` 指向某台 Mac 的目录，复制夹具到 `/home/you/re` 后 ID 不变。`rebind_subject_path()` 可在新路径下展示记录，但 `sha256`、`format`、`architecture` 任一不同就拒绝。rea 6.5.0 重放新路径目标的快照时，`rebindEvidenceToTargetPath` 也这样处理。

`validate_evidence()` 重算 ID，若不符则报 rea 同样的错误：证据语义标识与记录不匹配。它也拒绝 `analysis_profile.provider` 与 `provider` 不同的记录。测试 `test_tampered_id_and_mismatched_profile_are_rejected` 修改真实 `grade` 记录的一行伪代码，验证账本拒绝导入。

## 先自己观察目标文件

调用 provider 前先读文件。`observe_object()` 用 `struct.unpack_from` 解析 ELF64 节头、`.symtab`、`.strtab`、`.rela.text`，写一条 `inspect_object`，并为每个函数符号写一条 `read_function_bytes`。五条均为 `observed`、`shipped-artifact`，因为来源是磁盘文件。

| 记录 | 内容 | ID |
|---|---|---|
| `inspect_object` | 五节的偏移、大小、哈希，四函数，三项重定位 | `ev_645e0a145f28bd5c…` |
| `read_function_bytes percent_change` | `.text+0x00` 的 16 字节 | `ev_2572a7d254ad15cb…` |
| `read_function_bytes grade` | `.text+0x10` 的 46 字节，SHA-256 `ffcb75c2a7bb1104…` | `ev_a467c2427bfc0c56…` |
| `read_function_bytes total` | `.text+0x40` 的 31 字节 | `ev_b1e845cea2543073…` |
| `read_function_bytes grade_label` | `.text+0x60` 的 63 字节 | `ev_c50041be26e6b7f4…` |

`llvm-objdump -t` 与之相符：`grade` 的值 `0000000000000010`、大小 `2e`。`.rela.text` 的三项重定位均为指向 `.rodata` 的 `R_X86_64_PC32`，偏移 `0x36`、`0x84`、`0x93`，加数 `0x10`、`0x24`、`-0x4`。每条记录带 `file-offset-range`，并说明：节字节来自磁盘文件，读取器不应用重定位，也不执行代码。

第 32 课完整构建此读取器；这里只用 60 行，因为重点是如何记录读取所得事实。

## 推导表，并明确标注为推导

`grade` 的 46 字节中有第 33 课解码过的四种模式：

| 字节 | 指令 | 在 `grade` 中的偏移 |
|---|---|---|
| `48 69 c0 67 66 66 66` | `imul rax, rax, 0x66666667` | 3 |
| `48 c1 f9 22` | `sar rcx, 34` | 13 |
| `83 c1 fa` | `add ecx, -6` | 23 |
| `83 f9 04 77 0c` | `cmp ecx, 4`，随后 `ja` | 28 |

乘 `0x66666667` 后右移 34 位表示有符号除以 10，但文件里没有 10。`derive_grade_model()` 将其写入限制：除数 10 是由乘数 `0x66666667` 和移位 34 推导，文件不直接保存 10。

`add ecx, -6` 将首分支设为 6，`cmp ecx, 4` 配无符号跳转允许 6 至 10 五种情况。

`.text+0x33` 的 `lea` 带加数 `0x10` 的重定位。PC32 相对于四字节位移的末尾计算，因此表从 `.rodata+0x14` 开始。该处五个小端字为 `1, 2, 3, 4, 4`。`ledger.c` 的 switch 对 60–69 返回 1、70 多返回 2、80 多返回 3、90–100 返回 4，编译器把 switch 转成返回值查表。

产生的 `ev_605106bff2d9998f…` 标为 `derived`，`evidence_links` 指向依赖的两条观察记录。若从账本删除字节记录，推导记录就有悬空链接。在上图关闭 `ev_a467c242…` 即可看到。

同一字节的 Ghidra 伪代码：

```c
uint grade(int param_1)
{
  uint uVar1;
  uint uVar2;

  uVar2 = param_1 / 10 - 6;
  uVar1 = -(param_1 >> 0x1f) ^ (uint)((ulong)((long)param_1 * 0x66666667) >> 0x3f);
  if (uVar2 < 5) {
    uVar1 = *(uint *)(&DAT_001000b4 + (ulong)uVar2 * 4);
  }
  return uVar1;
}
```

Ghidra 应用重定位，将表命名为 `DAT_001000b4`；当 `.text` 放在 `0x100000` 时，它正是 `.rodata+0x14`。Ghidra 恢复了除以 10 和五个分支，但默认值表达式始终为 0，却不直接写 0。`native_value_flow` 的 p-code 将这些操作标为 `is_dead: true`。记录忠实观察了 Ghidra；你读出的含义是 derived，预期执行值则是 inferred。

`percent_change` 展示另一种故障。Ghidra 签名为 `undefined1 [16] percent_change(int param_1,int param_2,ulong param_3)`，源码是 `int percent_change(int before, int after)`。`idiv` 写 `EDX:EAX`，零路径不改 `EDX`，反编译器因而推断 16 字节返回及第三参数。其自身对 `grade` 的 `native_api.return_type.confidence` 是 `"low"`。恢复签名属于 provider 推断，应据此记录。

## 预测属于 inferred 记录

预测是尚无观察支持的行为主张。`claim_suite()` 根据推导模型和源码生成十八项，`record_prediction()` 将其存为 `inferred`、`analyst-inference`，链接依赖记录。

| 主张 | 预测值 | 依赖 |
|---|---|---|
| `percent_change(12400, 15500)` | 25，来自 310000 / 12400 | 除法模型 `ev_076a9167…` |
| `percent_change(0, 5)` | 0，零值保护 | 除法模型 |
| `percent_change(100, 50)` | -50 | 除法模型 |
| `percent_change(-7, 3)` | -142，因为 `idiv` 向零截断 | 除法模型 |
| `grade(55)` | 0，索引 -1 未通过无符号比较 | 表模型 `ev_605106bf…` |
| `grade(60)`、`grade(69)` | 1、1 | 表模型 |
| `grade(70)`、`grade(85)` | 2、3 | 表模型 |
| `grade(95)`、`grade(100)`、`grade(105)` | 4、4、4 | 表模型 |
| `grade(110)`、`grade(-5)` | 0、0 | 表模型 |
| `total(1, 2, 3)`、`total()` | 6、0 | 源码记录 `ev_2f1e6d25…` |
| `grade_label(85)` | `"B"` | 源码记录与表模型 |
| 分数 90 至 100 的 `grade(score)` | 十一个输入全部为 4 | 表模型 |

`predict()` 用 C 而非 Python 语义。`c_div()` 向零截断，`wrap32()` 将每个中间值折叠到 32 位。Python 的 `//` 向负无穷取整，因此 `(3 - -7) * 100 // -7` 得 -143，C 得 -142。第 36 课将扩大网格。

每项预测开启一个残留未知项，要求 `observed`、`controlled-replay` 证据，并推荐在本机构建上用 `execute_function` 探测。下一节产生证据。首个 grade 问题是：“编译函数实际运行时，grade(95) == 4 是否成立？”

## 用执行核验

`code/fixtures/harness.c` 包含 `ledger.c`，每次调用打印一个结果。`observe_runs()` 使用 PATH 上首先找到的 `clang`、`cc` 或 `gcc` 编译，对网格每个输入运行一次。每次运行成为一条记录：

```json
{
  "operation": "execute_function",
  "parameters": { "function": "grade", "args": [95] },
  "normalized_result": { "result": 4, "stdout": "4\n", "exit_code": 0 },
  "confidence": "observed",
  "authority": "controlled-replay",
  "environment": { "id": "host-process", "platform": "darwin", "architecture": "arm64", "isolation": "process" },
  "limitations": [
    "The run executed a host build of ledger.c, not the x86-64 object. The claim about the object rests on the shared source and on the compiler.",
    "One run observes one input. It proves nothing about other inputs."
  ]
}
```

运行记录的 subject 是测试程序二进制；本课原始 Mac 上为有独立 SHA-256 的 Mach-O arm64。provider 是 `course-harness`，带编译器版本行，此处为 `Apple clang version 17.0.0 (clang-1700.6.3.2)`。`evidence_links` 指向源码 `ev_2f1e6d251543d017…`，因为运行程序和目标文件只共享 `ledger.c`。

第一项限制应读两遍：x86-64 目标文件没有在这台机器运行，运行的是相同源码为另一架构生成的第二份构建。它仍是观察，也是不用模拟器时能得到的最强观察，所以主张通过时附带此限制。省略它就丢失了读者所需信息。

17 个单输入运行全部符合预测。`code/fixtures/run-evidence.json` 保存这 17 条及源码记录，由 `--record` 在 2026-10-13 导出。若无编译器，`build_ledger()` 导入该包而不执行，报告的 `runs` 字段会说明。

## 证据晋级规则

主张只能通过观察执行从 inferred 进入有支持状态。`check_claim()` 寻找函数与参数相同的 `execute_function`，比较结果并统计覆盖输入：

| 状态 | 条件 | rea 完成账本 |
|---|---|---|
| `pass` | 每个输入都有一致运行，且无分歧 | `pass` |
| `fail` | 任一次运行不一致 | `fail` |
| `unknown` | 部分输入有运行，部分没有 | `unknown` |
| `unsupported` | 无输入有运行 | `unsupported` |

`promote_claim()` 更严格：ID 指向 inferred 或 derived 时抛出 `ClaimError`；指向其他函数或参数的运行也抛错；列表为空、覆盖输入不足同样抛错。`grade(55)` 的 Ghidra 记录和表模型都存在，但都不能使它晋级。图中关闭 `ev_7be90c0c…`，虽然仍有两条 grade 记录，主张也会降为 `unsupported`。

范围主张展示部分覆盖：十一个输入中，运行网格只有 95 和 100。`check_claim()` 返回 `unknown`，`covered` 为 2/11；`promote_claim()` 拒绝并说明只有 2/11 有观察执行。账本不向上凑整。

`completion_ledger()` 仿照 rea 的 `EvidenceCompletionLedger`，ID 是 `ecl_` 加记录哈希。只有 `pass` 等于 `total`，`complete` 才为真。演示打印 `ecl_da64933ea13befed…`、`complete: false`，原因就是该范围主张。

## 未知项是带哈希链的记录

rea 将残留未知项保存为严格记录，`code/main.py` 保留相同字段与不变量。

ID 是 `unk_` 加 `{domain, question, scope_digest}` 的 SHA-256，问题中的连续空白压成单空格。两位分析者对同一文件问同一问题，会得到同一 ID。`scope_digest` 为目标文件 SHA-256。

每次变更产生新版本。版本 1 的 `previous_revision_digest` 为 `null`；后续版本引用前版 `revision_digest`。摘要覆盖除自身之外所有字段。`verify_unknown_chain()` 逐版重算摘要，检查前序链接，并检查每版引用的变更证据确实存在于账本。

每次变更本身也是证据记录，类似 rea 的 `rea-unknown-registry`。本文记录为 `derived`、`analyst-inference`，无 subject，限制说明：登记变更只记录分析者的决定，不是答案证明。

因此演示的 81 条记录中，有 36 条推导变更记录：18 次开启和 18 次更新。

每个版本强制三项不变量：

- 只有 `resolved` 未知项可带 `resolution`，且只有版本 1 没有前序。
- `contradicted` 至少引用一个反证 ID，同一 ID 不得同时出现在支持和反证列表。
- `verified` 解决至少引用一条满足所需置信度与权威来源的证据。

第三条最常触发拒绝。rea 工作流规定，只有合格的观察证据才能验证解决。`resolve_unknown()` 因而拒绝表模型，也拒绝 `observed` 但来源为 `shipped-artifact` 的记录，接受运行 `ev_f4ffbe8f922ec7fe…`。`grade(95)` 的解决版为版本 2，`previous_revision_digest` 为版本 1 摘要 `ffca840b55a8a188…`。

`update_unknown()` 接收 `expected_revision`，过期时像 rea 工具一样抛出 `revision-conflict`。正确做法是重新读取当前版本，再做决定。

演示后仍有一个未知项未关闭：`unk_f2eb0d7f84c80a19…`，问题是“编译函数实际运行时，90 到 100 每个分数的 grade(score) 是否都为 4？”状态为 `investigating`，支持 ID 包含两次运行，探测建议仍列出缺失的九个输入。

## 答案缓存不是分析数据库

rea 有三种类似缓存的东西。Ghidra 目标快照是输入的私有副本，以 `-readOnly -deleteProject` 导入，关闭后删除；内存 `AnalysisSnapshotCache` 为一个二进制身份最多保存 10,000 项；快照文件包含 `target`、`binding`、`entries`、`workflow_entries`、`evidence_bundle`。

缓存键是 `query_` 加 `{target, binding, operation, parameters}` 的 SHA-256。`target` 包含 `{sha256, kind, format, architecture}`，`raw-binary` 还带 `entry_point`。`binding` 是 provider 和完整分析配置，含摘要。25 个配置参数任一变化，例如 `jump_table_evidence` 从 `typed-case-default-blocks-v1` 改为 v2，摘要和所有键都会变。

`code/fixtures/rea-snapshot.json` 是 rea 两次查询写出的 142,690 字节文件。原文件仅所有者可读，提交副本可公开读取。它有两个条目，证据包也含相同两条记录。`AnswerCache.import_snapshot()` 重算各 `query_id`，任一不符则拒绝。`target` 或 `binding` 与当前不同时，以 `profile_mismatch` 拒绝；`format_version` 不是 `course-answer-cache-1` 也拒绝。

原始机器的三次测量：首次 grade 查询全新导入 Ghidra，耗时 8.6 秒；对同快照的 percent_change 查询耗时 8.5 秒，因为不同查询未命中；第三次 grade 耗时 2.1 秒，返回相同记录和相同 `evidence_id`。rea 内存重放附带限制：来自本地 REA 分析快照，本次未重跑 provider。本文 `lookup()` 添加同类说明，让读者区分重放与新答案。

变更会终止缓存。rea 6.5.0 在向 provider 发送重命名或注释调用前，就清空快照缓存。失败回复不能证明写入回滚，因此失败写入也停止重放。改变数据库的元数据导入同样如此。

## agent 为什么需要它

通过 MCP 使用 rea 的 agent 每次调用都能看到完整记录，并在报告中引用 `evidence_id`。2026 年研究指出失效位置：NDSS BAR 的四项弱点之一是过信工具输出；植入文本研究即使将二进制内容只展示为数据，40 次仍有 15 次不安全提议，来源检查加工具授权才消除它们。另一研究观察 agent 经 MCP 操作 Ghidra（[arXiv 2606.06838](https://arxiv.org/abs/2606.06838)），在数百函数的二进制中，真正分析仅覆盖 10%–15%，随后便产出桩代码。

账本用记录应对各类问题，agent 只报告账本已有内容。无观察执行的主张是 `unsupported`，仅有部分运行是 `unknown`，provider 文本只能作为关于 provider 的 `observed`。给 agent 使用 `outputs/` 技能，让账本成为唯一写结论的地方。这适用于 Claude、Cursor、Codex、OpenClaw、Hermes 及任何读取 SKILL.md 的 agent。

## 动手构建

运行标准库演示：

```bash
cd phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns
python3 code/main.py
```

演示读取目标文件，导入两条 rea 记录，验证快照并推导两个模型。随后记录 18 项预测、开启 18 个未知项、编译运行测试程序、检查全部主张并解决 17 个未知项。预期结构：

```json
{
  "records": 81,
  "by_confidence": { "observed": 25, "derived": 38, "inferred": 18 },
  "rea_snapshot": { "entries": 2, "replay_hit": true, "stale_profile_refused": true },
  "grade_table": [1, 2, 3, 4, 4],
  "runs": "live: Apple clang version 17.0.0 (clang-1700.6.3.2)",
  "claims": [ { "claim_id": "grade(95)", "status": "pass", "covered": "1/1" }, { "claim_id": "grade(90..100)", "status": "unknown", "covered": "2/11" } ],
  "completion_ledger_id": "ecl_da64933ea13befed9483f8b00447bb3f4ceb74324c01e2515eff03f3af3ca750",
  "complete": false,
  "unknowns": { "resolved": 17, "investigating": 1 }
}
```

没有 C 编译器时，`runs` 显示 `imported 17 recorded run records from run-evidence.json`，其余相同。

按以下顺序阅读 `code/main.py`：

1. `canonical_json()`、`compute_evidence_id()`：哈希方法和语义投影。
2. `create_evidence()`、`validate_evidence()`：构建和检查记录。
3. `EvidenceLedger.record()`、`import_bundle()`：存储记录并拒绝冲突。
4. `open_unknown()`、`update_unknown()`、`resolve_unknown()`：维护版本链。
5. `observe_object()` 读取 ELF，`derive_grade_model()` 读取表。
6. `claim_suite()`、`predict()`、`record_prediction()`：写入 inferred 层。
7. `observe_runs()`：每次运行变成观察记录。
8. `check_claim()`、`promote_claim()`、`completion_ledger()`：应用晋级规则。
9. `AnswerCache`：像 rea 快照一样按键存答案，拒绝过期内容。

## 实际使用

每个目标、每次调查单独维护账本。每个 subject 写入目标 SHA-256，每个未知项写问题范围摘要。更换工具就更换 `provider`，让 ID 自然分开；重建夹具会改变 subject 摘要，所有旧记录便属于另一个文件的证据。

知道限制时立即记录。不应用重定位的读取器应说明；运行本机构建应说明；推导除数的模型也应说明。缺失限制的记录看起来强于事实，后来的读者无法修复。

所有 provider 文本都当作数据。目标中的字符串和伪代码受目标控制，绝不能变成指令，也不能变成行为观察。rea 6.5.0 用 `_meta.provenance.untrusted_content: true` 标记这类结果。服务端指令要求模型把目标内容作为数据，并将其中要求运行、安装、下载、发送的内容报告为 prompt 注入尝试。标记有帮助，但账本仍必须将目标文本隔离于指令。

## 交互实验

### 实验 A：重算 rea ID

在 `code` 目录启动 Python：

```bash
cd phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns/code
python3 -q
```

运行：

```python
from main import *
record = load_evidence_file(FIXTURES / "rea-evidence-grade.json")
record["evidence_id"] == compute_evidence_id(record)
record["subject"]["local_path"] = "/home/you/re/ledger-x86_64-O1.o"
record["evidence_id"] == compute_evidence_id(record)
record["limitations"].pop()
record["evidence_id"] == compute_evidence_id(record)
```

前两项比较为真，因为路径不进入哈希；第三项为假，因为限制是内容。

### 实验 B：拒绝晋级

```python
ledger, report = build_ledger(live_runs=False)
claim = [c for c in claim_suite(ledger.find(operation="derive_switch_model")[0], ledger.find(operation="derive_arithmetic_model")[0], ledger.find(operation="read_source")[0]) if c.claim_id == "grade(55)"][0]
promote_claim(ledger, claim, [ledger.find(operation="derive_switch_model")[0]["evidence_id"]])
```

调用抛出 `ClaimError`，指出 derived ID。改传运行 ID：

```python
run = run_records_for(ledger, "grade", [55])[0]
promote_claim(ledger, claim, [run["evidence_id"]])["status"]
```

状态为 `pass`，返回 `limitations` 保留本机构建说明。

### 实验 C：拒绝过期快照

```python
import json
snapshot = json.loads(REA_SNAPSHOT_PATH.read_text())
target, binding = rea_snapshot_binding(snapshot)
AnswerCache(target, binding).import_snapshot(snapshot)
stale = dict(binding["analysis_profile"]["parameters"], jump_table_evidence="typed-case-default-blocks-v2")
AnswerCache(target, {"provider": binding["provider"], "analysis_profile": make_profile(binding["provider"], stale)}).import_snapshot(snapshot)
```

首次导入返回 2，第二次抛出 `CacheError`、`profile_mismatch`。只改一个版本字符串，整个快照即被拒绝。

### 实验 D：破坏链

```python
unknown_id = [u for u, r in ledger.unknowns.items() if r[-1]["status"] == "investigating"][0]
ledger.verify_unknown_chain(unknown_id)
ledger.unknowns[unknown_id][0]["severity"] = "critical"
ledger.verify_unknown_chain(unknown_id)
```

第一次返回 2，第二次抛出 `EvidenceIntegrityError`：版本 1 已不匹配自身摘要，版本 2 指向的摘要也不再存在。

## 实践实验

关闭未解决未知项，并添加第二个 provider。

要求：

- 扩展 `run_grid()`，运行范围主张缺失的九个输入，确认未知项在版本 3 进入 `resolved`。
- 用独立 `provider` 对象添加 `llvm-objdump -d`，将 `grade` 列表记录为 `observed`。
- 写一条 `derived`，声明 Ghidra 与 llvm-objdump 两份列表解码相同 14 条指令，并链接两者。
- 为 `grade_label(105)` 开启严重度 `high` 的未知项，因为表索引 4 读取 `labels[4]`，再以执行解决。
- 用 `export_bundle()` 导出，导入全新账本，证明每条链仍可验证。

验收标准：报告每句话都引用包内 ID，唯一 `unknown` 主张已消除。

## 编程练习

本课的夹具包含五个问题。用你构建的代码找出答案，并写入 `code/lab_answers.json`。数值可直接写数字，或写成 `"0x40"` 这样的十六进制字符串；列表使用 JSON 数组。

1. `t1`：`compute_evidence_id` 为 `rea-evidence-grade.json` 得出的证据 ID。
2. `t2`：grade 记录中的限制数量。
3. `t3`：grade 记录的 `relationship_coverage` 状态。
4. `t4`：grade 记录的置信度与权威性，按两个字符串组成的列表填写。
5. `t5`：grade 记录 subject 的 SHA-256。

检查答案：

```bash
cd phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns
python3 code/lab.py
```

检查器会用 `code/main.py` 和已提交夹具计算答案，并为每项输出 `PASS`、`FAIL` 或 `TODO` 及总分。只有五项全部通过时，命令才以状态码 0 退出。可运行 `python3 code/lab.py my-answers.json` 检查另一份答案。`code/tests/test_lab.py` 会验证检查器既接受正确答案，也拒绝错误答案。

### 交互图解

[Inside a Decompiler](https://aieng-zh.cn/inside-a-decompiler?symbols=off) 展示含有“观察、推导、推断、未知”四个托盘的证据账本。链接会关闭符号表，因此函数名和终点会归为未知项，起始文件则归为推断。

## 交付产物

本课生成 `outputs/skill-evidence-ledger.md`，指导 agent 将每个发现写成带置信度、权威来源、限制和链接的记录，维护未知项版本，并判断主张何时为 `pass`、`fail`、`unknown`、`unsupported`。

## 验证

运行演示及确定性测试套件：

```bash
cd phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

28 项测试证明：

- 两个 rea `evidence_id`、profile 摘要、两个快照 `query_id` 可从内容重算。
- 改路径保留 ID，改限制改变 ID。
- 篡改记录、profile provider 不匹配、浮点数、未知枚举值均被拒绝。
- 重复记录返回 `duplicate`，冲突抛错，包导入具有原子性。
- 记录运行包导入 18 条且无悬空链接。
- 未知项从版本 1 开启，拒绝过期 `expected_revision`，只以 observed、controlled-replay 解决。
- 编辑版本会破坏链。
- 晋级拒绝 inferred、derived、空证据和无关证据，接受一致执行。
- 部分覆盖为 `unknown`，不一致执行为 `fail`。
- 缓存精确键命中，其他参数未命中。
- profile 版本提升、目标错误、格式版本错误、键篡改均导致缓存拒绝。
- ELF 读取器的偏移、大小、字节、重定位与 `llvm-objdump` 相符，表读出 `1, 2, 3, 4, 4`。
- 预测采用 C 除法，记录执行符合全部 17 项单输入主张。
- 存在编译器时，实时执行也符合。

## 生产故障模式

| 故障 | 粗略报告 | 账本要求 |
|---|---|---|
| 将伪代码视为行为 | “不及格分数的 grade 返回 0” | 对该输入有 `execute_function`，否则 `unsupported` |
| 信任反编译签名 | “percent_change 返回 16 字节” | 将签名标为 provider 推断，保留 `low` 置信度 |
| 将空列表视为不存在 | “函数无调用者” | `unknown`，或工具提供的覆盖字段 |
| 路径进入 ID 哈希 | 复制后“记录改变” | 语义投影不含 `name`、`local_path` |
| 副本丢限制 | 记录看起来比来源更强 | ID 不匹配，导入拒绝 |
| 向上夸大部分网格 | “90 起所有分数通过” | `unknown`，`covered` 2/11 |
| 将本机执行说成目标文件执行 | “x86-64 目标返回 25” | 主张保留本机构建限制 |
| 用一句话关闭未知项 | “已解决，见上文” | `verified` 解决引用所需来源的 observed ID |
| 覆盖过期版本 | 两分析者修改冲突 | `revision-conflict`，重新读取 |
| 版本发布后重放旧快照 | 变更契约下的旧答案 | 导入时 `profile_mismatch` |
| 重命名后保留缓存 | 重放隐藏元数据写入 | 分派前失效，拒绝导出 |

## 操作规则

用三个词、三类记录区分读取的事实、计算的事实和预期。关闭未知项要用 ID，不能只用一句话。只有精确键不变才能重放答案，任一版本字符串变化就拒绝。

## 延伸阅读

- [rea 6.5.0 源码：`src/domain/evidence.ts` 与 `src/domain/residualUnknown.ts`](https://github.com/morluto/rea)
- [RFC 8785：JSON 规范化方案](https://www.rfc-editor.org/rfc/rfc8785)
- [Ghidra 12.1.4 发布](https://github.com/NationalSecurityAgency/ghidra/releases)
- [Agent Failure Patterns in CTF Reverse Engineering，NDSS BAR 2026](https://www.ndss-symposium.org/wp-content/uploads/bar2026-58.pdf)
- [When Binaries Talk Back: Representation-Confusion Attacks on LLM-Assisted Reverse Engineering，arXiv 2607.12507](https://arxiv.org/abs/2607.12507)
- [agent 反编译研究，arXiv 2606.06838](https://arxiv.org/abs/2606.06838)
- [When LLM Decompilers Recompile More and Preserve Less，arXiv 2609.05370](https://arxiv.org/abs/2609.05370)
- 本课所述 rea 6.5.0 源码位于标签 `3b79af2`：`src/domain/evidence.ts`、`.agents/skills/reverse-engineer-anything/SKILL.md`、`docs/cli.md`、`src/domain/reconstructionVerification.ts`、`src/application/ReconstructionObligationCandidates.ts`、`docs/tool-design.md`、`src/domain/evidenceCompletionLedger.ts`、`src/domain/residualUnknown.ts`、`src/application/investigation/UnknownEvidence.ts`、`.agents/skills/reverse-engineer-anything/references/evidence-workflows.md`、`src/application/binary/AnalysisSnapshotCache.ts`、`src/domain/analysisSnapshot.ts`、`src/application/binary/BinarySession.ts`、`src/application/binary/BinarySessionRecords.ts`、`docs/mcp-contracts.md`。
