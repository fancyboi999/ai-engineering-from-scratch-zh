# analyze-javascript-application 与应用图

> rea 不执行 ledger-desk 的六个文件，而是解析它们，返回一条派生记录；图有 42 个节点、59 条边，每条边有自身权威来源。

你有一个 Electron 风格小应用，六个文件位于 `capture/fixtures/js-app/`。读代码前先想看地图：哪个渲染器与哪个主进程处理器通信，什么内容离开机器。分析无需 Ghidra，也不运行应用任何一行，就能回答。读完本节，你能运行分析、阅读记录与图，并用 `inspect-analysis-view` 分页读取大结果。

## 命令与记录

CLI 命令为 `rea analyze-javascript-application PATH`。如果 `PATH` 是目录或 `.asar` 文件，且没有指定 `--provider` 或 `--snapshot`，通用命令 `rea analyze PATH` 也会选择此工作流 {{cli Run a command}}。

输入为 `input_path`、值为 `auto`、`asar` 或 `directory` 的 `format`，以及 `integrity_policy`。可选 `source_paths` 指定清单中的精确文件，rea 只分析这些文件，其他文件的关系保持未知。

四个资源限制均可选。`max_heap_mb` 默认 1024 MiB，`analysis_timeout_ms` 默认 300,000 毫秒，`max_semantic_nodes` 默认 100,000，`max_semantic_nodes_per_file` 默认 20,000。MCP 还可将 `detail` 设为 `complete` 或 `summary`。解析器是 `@babel/parser`，开启 `errorRecovery`，不附加注释。

```listing
title: analyze_javascript_application 记录的开头
source: capture/out/15-js-app.json
lang: json
note: 工具包使用 --filter-output 保留不含 graph 与 semantic_graph 的记录。随后是结果字段。
---
{
  "evidence_id": "ev_14bd1d1e…",
  "subject": {
    "name": "js-app",
    "digest": {
      "sha256": "bb9f726c…"
    },
    "local_path": "$CAPTURE/fixtures/js-app",
    "format": "directory",
    "architecture": null
  },
  "provider": {
    "id": "rea-javascript-application",
    "name": "REA JavaScript application analyzer",
    "version": "1"
  },
  "analysis_profile": null,
  "predicate_type": "rea.javascript-application-analysis",
  "operation": "analyze_javascript_application",
  "parameters": {
    "format": "auto",
    "integrity_policy": "fail"
  },
```

它与第 5 部分一样是 Evidence 记录，但有三点不同于 Ghidra 档案。provider 是 rea 自身，即 `rea-javascript-application` 版本 `1`。置信度为 `derived`，因为 rea 从语法计算关系；权威来源为 `shipped-artifact`，因为磁盘六个文件是来源。主体是目录，摘要为目录清单的 SHA-256 `bb9f726c…`。`normalized_result` 有十一个字段：`input_path`、`format`、`root_artifact_sha256`、`inventory_manifest_id`、`inventory_graph_sha256`、`integrity_contradictions`、`graph`、`summary`、`statistics`、`limitations`、`semantic_graph`。只有请求指定 `source_paths` 时，才有第十二个字段 `source_selection`。

```listing
title: ledger-desk 的摘要与统计
source: capture/out/15-js-app.json
lang: json
note: utility-process 与 native-addon 计数均为零，已省略。
---
"summary": {
  "browser_windows": 1,
  "explicit_web_preferences": 3,
  "preload_entrypoints": 1,
  "context_bridge_apis": 1,
  "exposed_api_members": 3,
  "ipc": {
    "operations": 6,
    "literal_channels": 3,
    "dynamic_channel_operations": 0,
    "renderer_transmissions": 3,
    "renderer_listeners": 0,
    "main_handlers": 3,
    "paired_renderer_transmissions": 3,
    "ambiguous_renderer_transmissions": 0,
    "unpaired_literal_renderer_transmissions": 0
  },
  …
},
"statistics": {
  "relevant_files": 6,
  "nested_asar_containers": 0,
  "text_bytes_read": 2888,
  "invalid_utf8_files": 0,
  "parsed_javascript_files": 4,
  "skipped_javascript_files": 0,
  "visited_ast_nodes": 424,
  "findings": 25,
  "modules": 0,
  "parse_failures": 0
},
```

对照 `capture/fixtures/js-app/` 源码检查数字。`main.js` 创建一个 `BrowserWindow`，显式设置三个 `webPreferences`：`preload`、`contextIsolation`、`nodeIntegration`。`preload.js` 暴露一个含三个成员的 `contextBridge` API `ledger`。六个 IPC 操作是 `preload.js` 的两次 `invoke`、一次 `send`，以及 `main.js` 的两次 `handle`、一次 `on`。它们使用三个字面量通道，每个通道都能配对。

六文件中四个是 JavaScript，共访问 424 个 AST 节点，没有文件解析失败。`skipped_javascript_files` 为 0，表示没有因大小或资源限制遗漏 JavaScript 文件。大于 0 时图不完整，数字指出缺少几个文件。`modules` 统计打包器模块，这个应用没有 bundle。命令运行期间，rea 向标准错误写入十九个进度事件，从清单盘点到记录最终哈希。事件也展示文件分工：`index.html`、`package.json` 只读元数据，四个 JavaScript 文件进行解析。

```listing
title: 十九个进度事件中的五个
source: capture/out/00-commands.txt
lang: text
note: 首次 analyze-javascript-application 调用的第 1、3、4、5、19 个事件，其余十四个省略。
---
[stderr] {"rea_progress":{"phase":"analyze_javascript_application","completed":0,"total":1,"message":"Inventorying and parsing application artifacts","sequence":1}}
…
[stderr] {"rea_progress":{"phase":"parse_javascript_sources","completed":0,"total":1,"message":"Processing 6 selected application files","sequence":3}}
[stderr] {"rea_progress":{"phase":"process_javascript_artifact_metadata","completed":0,"total":1,"message":"Processing metadata for index.html (1/6)","sequence":4}}
[stderr] {"rea_progress":{"phase":"parse_javascript_source","completed":0,"total":1,"message":"Parsing and projecting ledger.js (2/6)","sequence":5}}
…
[stderr] {"rea_progress":{"phase":"analyze_javascript_application","completed":1,"total":1,"message":"Application graph and Electron boundaries reconstructed","terminal":true,"sequence":19}}
```

## 图

**应用图：** 以节点和有向边表达应用的 provider 中立模型，每条边都有证据块。文档固定两条规则。图只根据语法构建。它不会访问文件系统或 CDP，不会执行 JavaScript，也不会定义应用专属节点类型 {{jsgraph JavaScript Application Graph}}。

有向关系只使用固定词汇：`contains`、`loads`、`imports`、`maps_to`、`exposes`、`sends`、`invokes`、`handles`、`calls`、`persists_to`、`observed_as` 和 `changed_from` {{jsgraph Entities and relationships}}。

`15-js-app-graph.json` 的 ledger-desk 图有 42 个节点、59 条边，自身覆盖为 `complete`，没有省略。四个源码模块各以 `source_sha256` 记录自身文件 SHA-256，与 `00-fixtures.txt` 对该文件列出的摘要相同，因此无需目录摘要也能将模块对应到字节。

| 节点类别 | 数量 | ledger-desk 中的内容 |
|---|---|---|
| `javascript-module` | 11 | 四文件作为模块，加上被 require 的 `electron`、`node:path`、`./ledger` |
| `javascript-expression` | 9 | `ledger.percentChange`、`ledger.gradeLabel`、`ledger.log` 三个桥接成员，各有暴露、闭包、最终调用三步 |
| `javascript-asset` | 4 | 按内容摘要标识的 `main.js`、`preload.js`、`renderer.js`、`ledger.js` |
| `artifact` | 3 | 根目录、`package.json`、`index.html` |
| `ipc-channel` | 3 | `ledger:percent-change`、`ledger:grade-label`、`ledger:log` |
| `ipc-handler` | 3 | `main.js` 的两次 `ipcMain.handle` 和一次 `ipcMain.on` |
| `electron-renderer` | 2 | 从 `loadFile` 与 HTML 引用两处看到的 `index.html` |
| `package`、`electron-main`、`browser-window`、`electron-preload`、`context-bridge-api`、`endpoint`、`storage` | 各 1 | `ledger-desk`、`main.js`、`BrowserWindow@8:17-16:4`、`preload.js`、`ledger`、`/api/ledger/latest`、`ledger:latest` |

| 关系 | 数量 | 边上的证据 |
|---|---|---|
| `contains` | 19 | 7 项观测自产物字节、8 项观测自 AST、4 项推断 |
| `imports` | 11 | 推断 |
| `maps_to` | 8 | 推断 |
| `loads` | 5 | 推断 |
| `calls` | 4 | 推断：一次向端点的 `fetch`，三个桥接调用路径各一条步骤边 |
| `invokes` | 4 | 推断 |
| `handles` | 3 | 推断 |
| `sends`、`exposes` | 各 2 | 推断 |
| `persists_to` | 1 | 推断，`localStorage.setItem` |

每条边都说明获取方法。AST 事实的权威来源为 `ast-static-analysis`、状态 `observed`、置信度 `exact`，并带源码范围。关系的权威来源为 `static-relationship-inference`、状态 `inferred`、默认置信度 `high`，始终带有限制 "Static syntax does not prove that this relationship executes at runtime."。对 Electron 应用，`loads`、`exposes`、`invokes`、`handles` 和 `imports` 关系始终是静态推断 {{jsgraph Entities and relationships}}。

```listing
title: 从 preload.js 到 main.js 处理器的一条 invokes 边
source: capture/out/15-js-app-graph.json
lang: json
note: 已省略边的产物引用、提取器、覆盖与限制。
---
{
  "source_node_id": "jag_node_c239425e…",
  "target_node_id": "jag_node_36721459…",
  "relation": "invokes",
  "properties": {
    "channel": "ledger:grade-label",
    "pairing_basis": "unique-exact-literal-channel",
    "handler_path": "main.js",
    "handler_operation": "handle"
  },
  "evidence": {
    "authority": "static-relationship-inference",
    "state": "inferred",
    "confidence": "high",
    …
    "location": {
      "available": true,
      "value": {
        "kind": "source-range",
        "source": "preload.js",
        "start": {
          "line": 7,
          "column": 25
        },
        "end": {
          "line": 7,
          "column": 72
        }
      }
    },
    …
```

`preload.js` 第 7 行第 25 到 72 列为 `ipcRenderer.invoke("ledger:grade-label", score)`。边将调用与 `main.js` 的 `ipcMain.handle` 配对，因为通道是两边各出现一次的精确字面量。它是 `inferred` 而非 `observed`，因为没有运行。若两个处理器使用同一通道，配对会是 `ambiguous`；动态通道名则完全不生成配对边。[图](#fig-6-1)使用采集中的文件名与通道名绘制图。

```figure
id: fig-6-1
kind: tree
title: ledger-desk 的应用图
claim: 图将包入口点连接到三个 IPC 处理器和一个网络端点，每条边说明属于观测还是推断。
caption: 从左上开始读。橄榄色框为应用自身代码，灰框是外部网络端点，青色框是浏览器存储。箭头标明关系名。未绘制三个桥接调用路径的九个 javascript-expression 步骤节点。依据 capture/out/15-js-app-graph.json。
```

## 大记录的视图

六文件产生约 200 KB 记录。REA 文档提醒，真实应用的完整 Evidence 可能达到数百 MB {{cli Run a command}}。

`inspect-analysis-view` 从已有记录读取视图，不重新分析。输入是 `source` 与 `view`。来源可以内联完整记录，或引用 MCP 会话保留的记录。视图可以是摘要、集合的一页或单个模块。采集请求了摘要，以及 `modules` 集合前 32 项。

每个视图本身也是 Evidence，provider 为 `rea-analysis-view`。父 id 同时位于 `parameters.parent_evidence_id` 和 `evidence_links`，因此视图到分析的链条明确可见。

```listing
title: 摘要视图的覆盖块
source: capture/out/15-js-app-view-summary.json
lang: json
note: 十二个均为 partial 的语义系列已省略。
---
"coverage": {
  "application": {
    "status": "complete",
    "truncated": false,
    "omitted_count": 0,
    "limits": []
  },
  …
  "application_unknowns": 0,
  "semantic_unknowns": 118
},
"limitation_count": 7
```

应用图完整，但记录中的第二张图，即语义图，不完整。其覆盖状态为 `unknown`，十二个系列各为 `partial`，剩余 118 个语义未知项。视图在 `unknowns` 中列出 `semantic_graph.coverage.status is unknown`。这是[剩余未知项](#s-residual-unknowns-and-coverage)规则的另一种形式。明确表示部分覆盖的图，比什么也不说的图更有用。

```listing
title: modules 分页、条目与覆盖
source: capture/out/15-js-app-view-modules.json
lang: json
note: 十五项中省略十三项。
---
"items": [
  {
    "node_id": "jag_node_0fc7e361…",
    "kind": "javascript-asset",
    "path": "main.js"
  },
  {
    "node_id": "jag_node_19e7e901…",
    "kind": "javascript-module",
    "path": "main.js"
  },
  …
"coverage": {
  "status": "page",
  "examined": 15,
  "total": 15,
  "next_offset": null,
  "exhausted": true
},
```

一页说明覆盖集合多少：这里 15 项中的 15 项，没有后续偏移。模块上千时，应读取 `next_offset` 并继续请求。最后一点关联[Evidence 记录](#s-the-evidence-record)：两个视图都在 `normalized_result` 和 `locations` 内携带应用路径，采集中屏蔽为 `$CAPTURE` 因而改变其 id。你运行相同视图，也会看到不同 id。

```takeaways
- 运行 `rea analyze-javascript-application PATH --format json`，将完整记录保存到文件。
- 打开源码前先读 `summary.ipc`、`invokes` 与 `handles` 边。
- 运行或测试确认前，将每条 `inferred` 边视为假设。
- 用 `inspect-analysis-view` 分页读大记录，不必一次读完。
```

Sources: src/cli/electronCommands.ts, src/domain/javascript/javascriptApplicationAnalysis.ts, src/domain/javascript/javascriptAnalysisResourceControls.ts, src/domain/javascript/javascriptSourceParser.ts, src/contracts/javascript/electronToolContracts.ts, src/contracts/analysisViewToolContracts.ts, src/application/javascript/JavaScriptArtifactGraphEvidence.ts, src/domain/javascript/javascriptSourceSelection.ts at rea-agents-6.7.0 (27dc42d); rea docs/cli.md, docs/javascript-application-graph.md, docs/javascript-artifact-reconstruction.md (Select sources before analysis, What is reconstructed), docs/mcp-contracts.md; capture/README.md; capture/fixtures/js-app/main.js, preload.js, renderer.js, ledger.js, index.html, package.json; capture/out/00-commands.txt, 15-js-app.json, 15-js-app-graph.json, 15-js-app-view-summary.json, 15-js-app-view-modules.json
