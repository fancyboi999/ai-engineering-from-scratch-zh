# rea function 的完整调用链

> 一次 `rea function` 调用打开文件、绑定 Ghidra、导入私有副本、通过 socket 提问，约八秒后打印一条 Evidence 记录。

你输入 `rea function fixtures/ledger-arm64-O1 _percent_change --provider ghidra --format json`。约八秒后，stdout 出现 1881 行 JSON，退出状态为 0。其中有 `before == 0` 问题的答案，也有源码中从未出现的反编译器产物。

读完本节，你能解读记录的每个顶层字段，说明由系统哪个部分写入，并指出 Ghidra 伪代码与原始 C 的一处差异。

## 命令

```listing
title: 录制的命令
source: capture/out/00-commands.txt
lang: text
note: 耗时每次录制变化，保持在 7 到 9 秒之间，故省略（capture/README.md）。
---
$ rea function fixtures/ledger-arm64-O1 _percent_change --provider ghidra --format json
[exit 0] (… s) -> 06-function-percent-change.json
```

`function` 接收路径和过程名，以 `{ procedure }` 为参数运行 MCP 操作 `analyze_function`。`--provider ghidra` 指定引擎，`--format json` 和 `--filter-output` 在命令运行前、可执行程序边界处读取。不带 `--format` 时，终端输出为 TOON；退出状态 `0` 只表示操作已完成；结果仍可能包含部分证据、警告或未解决问题 {{cli Output and exit status}}。[此图](#fig-1-2)追踪调用如何经过系统。

```figure
id: fig-1-2
kind: sequence
title: 一次 rea function 运行的逐步过程
claim: 一条命令打开文件、绑定 Ghidra、针对私有副本启动无界面 JVM、通过 socket 提问，返回一条 Evidence 记录。
caption: 自上向下阅读，每个编号行一步。第 1、12 行来自 capture/out/00-commands.txt，名称和摘要来自 06-function-percent-change.json，副本名来自 05-analyze-arm64-O1.json，期限来自固定标签源码。
```

## 从命令到桥接

1. 会话解析 Mach-O 头，读取架构并计算文件 hash。记录的 `subject` 携带结果：`mach-o`、`arm64`，以及 `00-fixtures.txt` 为 `ledger-arm64-O1` 列出的 SHA-256。
2. 命令明确要求 `ghidra`，注册表选择它，记录 `selection_source: "request"`。
3. provider 构建分析配置，其中有 `function_body_evidence: "complete-inclusive-ranges-v1"` 等带版本的契约名，并计算 hash。记录中的摘要 `3fc72c9b…` 就是它。
4. 客户端建立私有运行时根目录并分配 `bridge.sock`，复制文件为 `target-<sha256[0:12]>.bin`，同时再次计算 hash。随后用 `ghidra.Ghidra ghidra.app.util.headless.AnalyzeHeadless`、`-import`、`-readOnly`、`-deleteProject` 启动 `java`。副本名为 `target-01b5d08b08fb.bin`，概览记录的 `document` 显示该名（capture/out/05-analyze-arm64-O1.json）。启动期限为 330,000 毫秒。
5. 客户端发送 `ping`，仅在 `run_id`、token、配置摘要、目标 SHA-256、`analysis_complete` 全部匹配时接受会话。
6. 客户端写一行 JSON 请求 `analyze_function`。Ghidra 运行分析，再写回一行 JSON。
7. rea 将该操作的限制说明加入回答，保存为一条 Evidence 记录。
8. 客户端发送 `shutdown`，期限 10 秒，Ghidra 删除项目。

## 逐字段阅读记录

```listing
title: 记录开头
source: capture/out/06-function-percent-change.json
lang: json
note: 在 provider 后截断。分析配置和结果见后续清单。
---
{
  "evidence_id": "ev_b492c85e…",
  "subject": {
    "name": "ledger-arm64-O1",
    "digest": {
      "sha256": "01b5d08b…"
    },
    "local_path": "$CAPTURE/fixtures/ledger-arm64-O1",
    "format": "mach-o",
    "architecture": "arm64"
  },
  "provider": {
    "id": "ghidra",
    "name": "Ghidra",
    "version": "12.1.4"
  },
…
```

`evidence_id` 对语义内容计算 hash，不含 `subject.name` 与 `subject.local_path`，因此同样字节换个路径仍得到同一 id。`provider` 标明引擎及版本。下一字段将回答绑定到引擎设置：

```listing
title: 分析配置
source: capture/out/06-function-percent-change.json
lang: json
note: 仅保留 25 个参数中的五个及摘要。
---
  "analysis_profile": {
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
      "loader": "auto-from-header",
      …
    },
    "digest": "3fc72c9b…"
  },
  "predicate_type": "rea.analysis",
  "operation": "analyze_function",
  "parameters": {
    "procedure": "_percent_change"
  },
```

**分析配置：** provider 固定下来的设置，按 RFC 8785 规范 JSON 计算 hash。改变一个契约版本就会改变摘要，rea 据此拒绝旧快照（[第 5.3 节](#s-snapshots-and-the-answer-cache)）。`predicate_type` 默认标签为 `rea.analysis`，`operation` 是 MCP 名称。`parameters` 是调用者输入，也属于身份的一部分。

`raw_result` 在 `value` 下保存 provider 原生档案，并有自己的空 `limitations`；`normalized_result` 将相同档案保存为规范结果。`confidence` 为 `observed`，`authority` 为 `shipped-artifact`，这是静态读取磁盘文件的默认值。没有执行任何目标，故 `environment` 为 `null`。

`limitations` 有十条字符串：所有 Ghidra 操作都携带的四条、`analyze_function` 的五条，以及 macOS 上关于原生反编译器的一条（capture/out/02-capabilities.json、06-function-percent-change.json）。`locations`、`evidence_links` 为空。`relationship_coverage` 状态为 `complete`，唯一诊断说明仅返回 Ghidra 已解析的调用引用。[此图](#fig-1-3)展开 16 个字段。

```figure
id: fig-1-3
kind: structure
title: 一条 Evidence 记录的 16 个字段
claim: 各字段分别描述身份、来源、回答或回答边界；除显示名称外，id 覆盖全部字段。
caption: 依次阅读字段、本记录取值及说明。数据来自 capture/out/06-function-percent-change.json，字段列表来自固定标签的 src/domain/evidence.ts。
```

## normalized_result 内部

**过程：** 函数身份。`_percent_change` 位于 `0x100000500`，函数体为从 `0x100000500` 到 `0x100000517` 的闭区间，24 字节，`contains_entry` 为真。Ghidra 符号不带类型，因此 FunctionManager 签名为 `undefined _percent_change()`。`native_api` 下的反编译器视图为 `ulong _percent_change(ulong param_1,int param_2)`，各参数均为 `confidence: "low"`。源码则为 `int percent_change(int before, int after)`。两者都是观察，限制说明：“类型与调用约定是 Ghidra 反编译器的观察，不是源码声明。”

```listing
title: 六条指令
source: capture/out/06-function-percent-change.json
lang: json
note: assembly 数组完整保留。
---
    "assembly": [
      "0x100000500: cbz w0, 0x100000514",
      "0x100000504: sub w8, w1, w0",
      "0x100000508: mov w9, #0x64",
      "0x10000050c: mul w8, w8, w9",
      "0x100000510: sdiv w0, w8, w0",
      "0x100000514: ret"
    ],
```

六条指令，每条四字节，共 24 字节。`cbz w0` 对应 `if (before == 0) return 0;`，`before` 位于 `w0`，`mov w9, #0x64` 则是 100。伪代码讲得更长：

```listing
title: 展开换行的伪代码
source: capture/out/06-function-percent-change.json
lang: text
note: pseudocode 字段是一个 JSON 字符串。此处逐行展示，每行都是该字符串的子串。
---
ulong _percent_change(ulong param_1,int param_2)
{
  uint uVar1;
  int iVar2;
  iVar2 = (int)param_1;
  if (iVar2 != 0) {
    uVar1 = 0;
    if (iVar2 != 0) {
      uVar1 = ((param_2 - iVar2) * 100) / iVar2;
    }
    param_1 = (ulong)uVar1;
  }
  return param_1;
}
```

外层 `if` 是你写的守卫，内层 `if` 不在源码中。`native_value_flow` 展示其来源。操作 `0x100000510#7`、`#8`、`#9`、`#10` 分别为常量 0 的 `COPY`、`INT_NOTEQUAL`、`CBRANCH`、`INT_SDIV`，都携带 `sdiv` 地址。Ghidra 的 `sdiv` 模型在除数为 0 时返回 0，反编译器将该模型打印成第二次检查。

两次检查都正确，其中一次冗余；只有源码能告诉你是哪次。[第 4.6 节](#s-analyze-function-and-pseudocode)和[提升课](phases/13-tools-and-protocols/34-lifting-to-pseudocode)深入讨论。

**引用：** 档案列出两个传入引用。一个是 `0x1000006a0` 的 `UNCONDITIONAL_CALL`，位于 Ghidra 命名为 `entry` 的函数内；该函数起于 `0x1000005d0`，长 368 字节。另一个是 `0x100008118` 的 `DATA` 引用，不属于任何过程，位于概览记录从 `0x100008000` 开始的 `__LINKEDIT` 段中（capture/out/05-analyze-arm64-O1.json）。唯一传出引用是 `cbz` 的 `CONDITIONAL_JUMP`。`callers` 为 `entry`；函数没有调用其他函数，因此 `callees` 为空。`unresolved_calls` 为空，`facet_availability` 将档案八个侧面全部标为可用。

**基本块：** 共三个，位于 `0x100000500`、`0x100000504`、`0x100000514`，`end` 不包含末端地址。函数体范围则包含末端，契约名 `complete-inclusive-ranges-v1` 已说明。比较地址时区分两种约定。

`native_value_flow` 包含 13 个 p-code 操作、13 条定义使用边，`truncated: false`。各操作都带 `is_dead: true`，限制说明该标志映射 Java AST，真正归属由 `block_membership` 报告。每次都先读限制，再读数字。

```takeaways
- 运行 `rea function PATH NAME --provider ghidra --format json`，保存完整记录。
- 信任其他信息前，先用自己的 `shasum -a 256` 核对 `subject.digest.sha256`。
- 阅读 `normalized_result` 前先读 `confidence`、`authority`、`limitations`。
- 将伪代码与汇编比较，注意反编译器可能生成源码没有的检查。
```

Sources: cli Output and exit status (rea docs/cli.md); rea at 27dc42d: src/cli/coreBinaryCommands.ts, src/cliCommandNames.ts, src/cliOutput.ts, src/domain/binaryTarget.ts, src/application/BinaryTargetResolver.ts, src/application/binary/AnalysisProviderRegistry.ts, src/ghidra/GhidraAnalysisProfile.ts, src/ghidra/GhidraClient.ts, src/ghidra/GhidraTargetSnapshot.ts, src/ghidra/GhidraJavaLaunch.ts, src/ghidra/GhidraLauncher.ts, src/config/providerStartupTimeout.ts, src/ghidra/GhidraClientStartup.ts, src/ghidra/GhidraSessionValues.ts, src/ghidra/GhidraClientWire.ts, bridge/ghidra/ReaGhidraBridge.java, src/ghidra/GhidraProviderClient.ts, src/server/registerEvidenceTools.ts, src/domain/evidence.ts, src/domain/analysisProfile.ts, src/domain/relationshipCoverage.ts; capture/README.md; capture/fixtures/ledger.c; capture/out/00-commands.txt, 00-fixtures.txt, 02-capabilities.json, 05-analyze-arm64-O1.json, 06-function-percent-change.json
