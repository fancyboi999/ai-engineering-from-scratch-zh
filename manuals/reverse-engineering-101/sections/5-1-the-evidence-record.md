# Evidence 记录

> 每次成功的 rea 观测都是包含十六个字段的严格记录，id 是语义内容的 SHA-256，不包含文件路径。

agent 告诉你，`before` 为 0 时 `_percent_change` 返回 0。你想知道 rea 观测了什么、由哪个引擎给出，以及另一台机器上的同一主张是否具有相同 id。采集文件 `capture/out/10-mcp-09-analyze-function-percent-change-O1.json` 用一条 Evidence 记录给出答案。读完本节，你能读懂全部十六个字段，指出其中哪三个决定信任，也能从采集记录重新计算 `ev_` id。

## 每次成功观测对应一条记录

**Evidence 记录：** rea 为成功观测返回的唯一记录类型。模式是包含十六个字段的严格对象，多字段或少字段都会被拒绝。没有调用者或被调用者集合的操作也写入 `relationship_coverage`，值为 `null`。MCP 服务同时以 `structuredContent` 和文本副本返回记录："Evidence-producing tools return the complete canonical Evidence record in both text and structured content." {{mcp Tool results}}

```listing
title: _percent_change 档案记录的十六个字段
source: capture/out/10-mcp-09-analyze-function-percent-change-O1.json
lang: json
note: 已省略配置参数、原始结果、规范结果、十项限制中的九项和覆盖诊断。工具包用标记替代记录的文本副本。
---
"evidence_id": "ev_b492c85eb9570bd5f8e866f94523122c8600ea0106603d90e9ea5445cf757b2a",
"subject": {
  "name": "ledger-arm64-O1",
  "digest": {
    "sha256": "01b5d08b08fb94678be5919d0e753d44b505a53107c95b94634f0e5d41c9e375"
  },
  "format": "mach-o",
  "architecture": "arm64",
  "local_path": "$CAPTURE/fixtures/ledger-arm64-O1"
},
"provider": {
  "id": "ghidra",
  "name": "Ghidra",
  "version": "12.1.4"
},
"analysis_profile": {
  …
  "digest": "3fc72c9b4b78498fb992b938f8f3389dc670244a293c1d40abf5e1d10162ed3b"
},
"predicate_type": "rea.analysis",
"operation": "analyze_function",
"parameters": {
  "procedure": "_percent_change"
},
"raw_result": {
  …
},
"normalized_result": {
  …
},
"confidence": "observed",
"authority": "shipped-artifact",
"environment": null,
"limitations": [
  "The session serves operations only after Ghidra reports default auto-analysis complete; incomplete analysis does not expose partial results.",
  …
],
"relationship_coverage": {
  "status": "complete",
  …
},
"locations": [],
"evidence_links": []
```

| 字段 | 本记录中的值 | 保存什么 |
|---|---|---|
| `evidence_id` | `ev_b492c85eb957` 加另外 52 个十六进制数字 | `ev_` 和 SHA-256 |
| `subject` | `ledger-arm64-O1`、sha256 `01b5d08b08fb`、`mach-o`、`arm64`、路径 | 分析文件，或 `null` |
| `provider` | `ghidra`、Ghidra、`12.1.4` | 产生事实的引擎 |
| `analysis_profile` | 摘要 `3fc72c9b4b7` | 已固定的引擎设置，或 `null` |
| `predicate_type` | `rea.analysis` | 主张类别 |
| `operation` | `analyze_function` | 产生记录的工具 |
| `parameters` | `{"procedure": "_percent_change"}` | 调用者提供的原始输入 |
| `raw_result` | Ghidra 报告 | provider 形式，或 `null` |
| `normalized_result` | 档案，16 个键 | agent 读取的规范结果 |
| `confidence` | `observed` | `observed`、`derived` 或 `inferred` |
| `authority` | `shipped-artifact` | 五种来源之一 |
| `environment` | `null` | 运行平台与隔离情况，或 `null` |
| `limitations` | 10 个字符串 | 事实不覆盖的内容 |
| `relationship_coverage` | `complete` | 调用者与被调用者集合完整、部分或未知，其他操作为 `null` |
| `locations` | `[]` | 地址、范围、路径或文件偏移 |
| `evidence_links` | `[]` | 本记录依赖的 `ev_` id |

主体的 `format` 是 28 个容器名之一，从 `mach-o`、`elf` 到 `javascript`、`directory`。架构是十个系列之一：`x86`、`x86_64`、`arm`、`arm64`、`mips`、`6502`、`riscv`、`powerpc`、`m68k`、`hexagon`。只有 `raw-binary` 格式可使用 `6502` 或 `m68k`。位置有五种形状：`address`、`address-range`、`artifact-path`、`file-offset`、`file-offset-range`。

MCP 处理器可以在引擎启动前执行预检，引擎回答后才构建记录。它以活动目标、provider 和操作调用 `createEvidence`，同时传入参数、结果、配置、原始结果、限制、位置和链接。

某些工具只向记录提供缩减的参数集。处理器先记录源记录，再记录本记录，最后返回它。在 Ghidra 会话内，二进制会话执行同样调用。

三个默认值补全生产者未提供的内容。未指定置信度或权威来源时，记录使用 `observed` 和 `shipped-artifact`。主体名是路径最后一段。完全没有目标时，记录附带限制 "Artifact identity is unavailable for this observation."。

## 置信度与权威来源

**置信度：** `observed`、`derived`、`inferred` 三个词之一，是类别，绝不是数字。**权威来源：** 事实背后的来源类别，取值为 `shipped-artifact`、`controlled-replay`、`historical-reference`、`external-service`、`analyst-inference`。两字段由生产者设置，采集展示四种生产者。

| 生产者 | `confidence` | `authority` | 记录 |
|---|---|---|---|
| `analyze_function`，provider `ghidra` | `observed` | `shipped-artifact` | `10-mcp-09-analyze-function-percent-change-O1.json` |
| `binary_overview`，provider `rea-workflow` | `derived` | `shipped-artifact` | `05-analyze-arm64-O1.json` |
| `compare_functions`，provider `rea-function-comparison` | `derived` | `analyst-inference` | `10-mcp-20-compare-functions-percent-change.json` |
| `inspect_analysis_view`，provider `rea-analysis-view` | `derived` | `shipped-artifact` | `15-js-app-view-summary.json` |
| `record_unknown`，provider `rea-unknown-registry` | `derived` | `analyst-inference` | 采集中没有 |

谨慎理解 `observed`。在档案里，它表示 rea 记录了 Ghidra 返回的内容，以磁盘字节为权威来源，不表示伪代码就是程序源码。provider 文档说明了这一点："Assembly is complete Ghidra Listing text; pseudocode is Ghidra decompiler output." {{ghidra Admitted function-analysis semantics}}

`binary_overview` 为 `derived`，因为 rea 工作流从 provider 调用计算它。首条限制直说："Derived by an REA composed workflow." 其他八条继承 Ghidra 限制，每条以 provider、版本和操作开头，例如 "Ghidra (ghidra 12.1.4) read_binary_inventory_summary:"（`05-analyze-arm64-O1.json`）。[第 35 课](phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns)用纯 Python 构建具有相同三个词和五种权威来源的账本。

## 限制、位置与链接

`limitations` 是普通字符串数组，生产者在继承的限制后追加自己的限制。比较记录展示两类。首项是没有主体时自动添加的说明；随后 26 项是两侧档案限制，每项以 `Left:` 或 `Right:` 为前缀。

```listing
title: compare_functions 记录的信任字段
source: capture/out/10-mcp-20-compare-functions-percent-change.json
lang: json
note: 显示 27 项限制的前两项。
---
"confidence": "derived",
"authority": "analyst-inference",
"environment": null,
"limitations": [
  "Artifact identity is unavailable for this observation.",
  "Left: Cancelling an active Ghidra request terminates its ephemeral database and discards session annotations. The selected target remains open; the next provider query imports the original artifact again.",
  …
],
"locations": [],
"evidence_links": [
  "ev_b492c85eb9570bd5f8e866f94523122c8600ea0106603d90e9ea5445cf757b2a",
  "ev_142cc943d8259d42ce5d62ad5eb0417fcde4de4ee9a20afbfe1fdbc51ed3d259"
]
```

`evidence_links` 指明计算派生记录所依据的记录。比较链接它比较的两份档案，视图链接父记录。`locations` 说明在产物何处看到了事实。`15-js-app.json` 的 JavaScript 记录携带一个 `artifact-path` 位置 `artifact-root`。Ghidra 档案没有位置，因为地址位于 `normalized_result` 内。

即使为空，`analysis_profile` 也是标识的一部分："`analysis_profile` is always present: a concrete profile object or `null`; either value participates in semantic identity." {{mcp Tool results}}

配置的 provider 与记录 `provider` 不同，会被拒绝并报 "Analysis profile provider does not match Evidence provider"。配置摘要是其 provider 与 parameters 的规范 JSON 的 SHA-256。[快照缓存](#s-snapshots-and-the-answer-cache)也用同一摘要作为键的一部分。

## id 是语义内容的哈希

**语义投影：** id 所哈希的记录视图。保留 `subject.digest`、`subject.format`、`subject.architecture`，丢弃 `subject.name` 和 `subject.local_path`。其他字段原样进入，即使 `relationship_coverage` 为 `null` 也一样。6.5.0 将值为 `null` 的覆盖字段排除在哈希外，因此 6.7.0 拒绝 6.5.0 bundle 中这类记录的 id（见[导出与导入](#s-evidence-bundles-export-and-import)）。

id 是 `ev_` 加该投影规范 JSON 的 SHA-256。对象键按 RFC 8785 排序。`parseEvidence` 为读取的每条记录重新计算哈希，不匹配时报 "Evidence semantic identifier does not match its record"。

用几行 Node 也能检查。以下脚本排序键、无空格序列化、丢弃两个显示字段并求哈希。传入 bundle 文件和记录索引，即可检查其中一条记录。

```javascript
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const canonical = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
};

const file = JSON.parse(readFileSync(process.argv[2], "utf8"));
const pick = (value, index) => {
  if (value.response) return value.response.result.structuredContent;
  if (value.records) return value.records[index];
  return value;
};
const record = pick(file, Number(process.argv[3] ?? 0));
const { evidence_id, subject, ...rest } = record;
const projection = {
  subject: subject === null ? null : { digest: subject.digest, format: subject.format, architecture: subject.architecture },
  ...rest,
};
const digest = createHash("sha256").update(canonical(projection)).digest("hex");
console.log(evidence_id, evidence_id === `ev_${digest}` ? "match" : "mismatch");
```

对 `05-analyze-arm64-O1.json` 运行，输出 `ev_91bddcdbd53ddd56996c6009458495bbd91fdc8c885238b33432e67691cf1f06 match`，就是文件第 2 行的 id。对 `10-mcp-09-analyze-function-percent-change-O1.json` 运行，匹配 `ev_b492c85eb9570bd5f8e866f94523122c8600ea0106603d90e9ea5445cf757b2a`。它也匹配 `10-mcp-20` 的比较记录，以及索引 0 时 `11-bundle-O1.json` 的首条记录。`subject.local_path` 中屏蔽为 `$CAPTURE` 的路径不影响结果，因为该字段不在哈希内。

采集有两个文件不匹配，两者说明相同规则。`15-js-app.json` 失败，因为工具包通过 `--filter-output` 从 `normalized_result` 剪掉 `graph` 和 `semantic_graph`。`15-js-app-view-summary.json` 失败，因为工具包在 `normalized_result.summary.input_path` 和 `locations` 中将采集目录屏蔽为 `$CAPTURE`。`subject` 的路径不在哈希内，其他任何位置的路径都在；带这种路径的记录在每台机器会得到不同 id。

```figure
id: fig-5-1
kind: structure
title: 一条 Evidence 记录的十六个字段
claim: id 对除 subject.name 与 subject.local_path 外的所有字段求哈希，因此相同字节的同一观测在任何位置得到同一 id。
caption: 从上向下读。实线行进入哈希，虚线行是显示字段。值来自 capture/out/10-mcp-09-analyze-function-percent-change-O1.json，摘要只显示开头几位十六进制数字。
```

```takeaways
- 在 normalized_result 前先读 `confidence`、`authority`、`limitations`，将三者都记入笔记。
- `observed` 表示“rea 记录了引擎输出”，绝不表示“恢复了源码”。
- 对从其他机器收到的每条记录重新计算 `ev_` id。
- 自己的记录不要在 `normalized_result` 和 `locations` 中放路径，否则 id 随机器变化。
```

Sources: capture/out/10-mcp-09-analyze-function-percent-change-O1.json, capture/out/10-mcp-20-compare-functions-percent-change.json, capture/out/05-analyze-arm64-O1.json, capture/out/15-js-app.json, capture/out/15-js-app-view-summary.json, capture/out/11-bundle-O1.json; phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns; rea 6.7.0 at 27dc42d: src/domain/evidence.ts, src/domain/relationshipCoverage.ts, src/domain/canonicalDigest.ts, src/domain/analysisProfile.ts, src/domain/binaryTargetTypes.ts, src/server/registerEvidenceTools.ts, src/application/binary/BinarySession.ts, src/application/investigation/UnknownEvidence.ts; rea docs/mcp-contracts.md, rea docs/ghidra-provider.md
