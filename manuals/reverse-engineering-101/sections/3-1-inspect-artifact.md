# inspect-artifact

> inspect-artifact 将文件作为容器读取，计算 hash、识别格式，返回说明下一步应运行哪个工具的 Evidence 记录。

你用 clang 将 `ledger.c` 和 `ledger-main.c` 构建为 `ledger-arm64-O1`。agent 即将分析，希望第一次调用成本低、离线运行，并明确哪些工作未做。`inspect-artifact` 正适合：无需 Ghidra，约一秒返回，记录末尾给出下一工具名称。

读完本节，你能对自行构建的文件运行 `inspect-artifact`，阅读声明及唯一出现位置，并解释为何记录将 `open_binary` 列为下一探查。

## 一条命令，一条记录

```listing
title: 命令及退出状态
source: capture/out/00-commands.txt
lang: text
note: 取自命令索引的两行。括号内耗时每次变化，故省略。
---
$ rea inspect-artifact fixtures/ledger-arm64-O1 --format json
[exit 0] (…) -> 03-inspect-artifact.json
```

记录来自 `rea-artifact-graph` provider，名为 “REA safe artifact graph provider”，版本 1。不运行分析引擎。工具打开文件、计算 hash、根据头部识别格式，再以容器视角建立文件清单。

**产物图：** rea 为一个文件及其内部文件构建的清单。节点代表由 SHA-256 标识的一份独特内容；出现位置代表内容出现的一处，带逻辑路径；边连接容器与成员。

```listing
title: 记录开头
source: capture/out/03-inspect-artifact.json
lang: json
note: 省略 substeps 数组及其后内容。捕获工具屏蔽 local_path。
---
{
  "evidence_id": "ev_0e878985…",
  "subject": {
    "name": "ledger-arm64-O1",
    "digest": {
      "sha256": "01b5d08b…"
    },
    "local_path": "$CAPTURE/fixtures/ledger-arm64-O1",
    "format": "mach-o",
    "architecture": null
  },
  "provider": {
    "id": "rea-artifact-graph",
    "name": "REA safe artifact graph provider",
    "version": "1"
  },
  …
  "operation": "inspect_artifact",
  "parameters": {
    "integrity_policy": "fail"
  },
  …
}
```

SHA-256 与 `00-fixtures.txt` 所列相同，此文件的后续记录均携带同一摘要。`format` 根据魔数读为 `mach-o`，`architecture` 为 `null`。该 provider 不读取 `cputype`，[下一节](#s-inspect-binary-layout-and-the-load-image)展示能读取它的工具。唯一参数 `integrity_policy` 设为 `fail`。

## 声明与出现位置

记录包含一个子步骤 `inventory_artifact`，`status: "completed"`，内部嵌套自身 Evidence 记录。声明统计图的数量。

```listing
title: 声明、节点与出现位置
source: capture/out/03-inspect-artifact.json
lang: json
note: 从清单子步骤仅保留声明计数、唯一节点和唯一出现位置。
---
"manifest": {
  "manifest_id": "agm_8e2e5c4c…",
  …
  "graph_sha256": "b6c8ab6f…",
  "node_count": 1,
  "occurrence_count": 1,
  "edge_count": 0
},
"nodes": [
  {
    "artifact_id": "art_8906b5a7…",
    "format": "mach-o",
    "sha256": "01b5d08b…",
    "size": 33872,
    …
    "content_state": "materialized",
    "limitations": []
  }
],
"occurrences": [
  {
    "occurrence_id": "occ_35a9bb48…",
    …
    "logical_path": ".",
    "entry_kind": "file",
    "artifact_kind": "executable",
    "artifact_format": "mach-o",
    "declared_size": 33872,
    …
    "executable": true,
    "encrypted": false,
    "hash_status": "verified",
    …
  }
],
```

一个节点、一个出现位置、零条边。可执行文件本身就是容器，没有成员。限制 “Artifact has no child container entries.” 表达同一事实。节点报告 `size: 33872`，与 `00-fixtures.txt` 字节数一致，`content_state: "materialized"`。出现位置的 `logical_path: "."` 表示根，`artifact_kind: "executable"`。`.asar` 或 `.zip` 的各成员会在这里拥有独立节点与路径。

## 分支与下一探查

```listing
title: 检查没有做什么
source: capture/out/03-inspect-artifact.json
lang: json
note: hypotheses 与 contradictions 数组为空，与 coverage 块一起省略。
---
"unexplored_branches": [
  {
    "branch_id": "aib_ff20889e…",
    "reason": "format-specific-analysis-required",
    "detail": "open_binary was not run by provider-neutral artifact inspection.",
    "next_probe": {
      "operation": "open_binary",
      "rationale": "Bind one deep native provider before function-level analysis.",
      "authority": "native-analysis-provider"
    },
    …
  }
],
…
"confidence": "observed",
"authority": "shipped-artifact",
"environment": null,
"limitations": [
  "Artifact has no child container entries.",
  "Inspection derives bounded static hypotheses and next probes; it does not execute the artifact or claim format-specific semantics."
],
```

rea 为列出的各个后续探查建立一个未探索分支，原因为 `format-specific-analysis-required`。第二条限制是同文件中的常量。记录为 `observed`，权威来源为 `shipped-artifact`：rea 读取输入文件字节，没有从其他记录推导。`coverage` 报告 `complete-within-substeps`，含一个子步骤、一个观察、一个分支、一个探查，没有省略。

```figure
id: fig-3-1
kind: tree
title: ledger-arm64-O1 的 inspect-artifact 记录
claim: 一次低成本读取生成带 hash 的对象、单节点清单，以及明确将 open_binary 列为下一探查的分支。
caption: 从顶部阅读。蓝绿色框为记录，绿色框为观察内容，琥珀色框为留给后续工具的内容。来自 capture/out/03-inspect-artifact.json。
```

## 记录不包含什么

记录不是格式解析，不含加载命令、节、符号或入口点。[下一节](#s-inspect-binary-layout-and-the-load-image)用 `inspect-macho` 读取这些信息。函数分析则在[第 4 部分](#s-open-binary-and-the-headless-bridge)通过分支指定的 `open_binary` 绑定 Ghidra。完整记录有 198 行，大多重复对象摘要。这正是设计目的：各嵌套记录都可独立使用，仍能指向同样字节。

```takeaways
- 先运行 `inspect-artifact`：无需引擎，约一秒返回。
- 将容器当作平面文件前，先读 `node_count`、`occurrence_count`、`edge_count`。
- `unexplored_branches` 列出记录未运行的工具。
- 同文件后续所有记录都应携带对象的 `sha256`。
```

Sources: capture/out/00-commands.txt, capture/out/00-fixtures.txt, capture/out/03-inspect-artifact.json; rea 6.7.0 at 27dc42d: src/application/InvestigationProviders.ts, src/domain/artifactInspection.ts, src/artifacts/inventory/reader.ts
