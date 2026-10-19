# open_binary 与无界面桥接层

> open_binary 将一个目标绑定到一个 provider，不导入 Ghidra；第一次依赖 Ghidra 的调用才承担无界面导入、自动分析和私有 socket 的成本。

agent 通过 MCP 在不到两秒内打开 `ledger-arm64-O1`，接着却等待 `list_procedures` 数秒。这没有异常。打开调用没有把文件导入 Ghidra，第一个问题才触发导入，之后每个问题都在毫秒内返回。

读完本节，你能阅读会话服务日志，指出第一次查询启动了哪个进程，也能预测哪些调用会慢。

## open_binary

```listing
title: open_binary 的请求与响应
source: capture/out/10-mcp-03-open-binary-O1.json
lang: json
note: 请求与结果。采集工具包截短了结果的文本副本。
---
"method": "tools/call",
"params": {
  "name": "open_binary",
  "arguments": {
    "path": "$CAPTURE/fixtures/ledger-arm64-O1",
    "provider_id": "ghidra"
  }
}
…
"structuredContent": {
  "result": {
    "path": "$CAPTURE/fixtures/ledger-arm64-O1",
    "format": "mach-o",
    "kind": "executable",
    "sha256": "01b5d08b…",
    "architecture": "arm64"
  }
}
```

处理器以路径和 provider id 调用 `session.open`，返回五个字段：`path`、`format`、`kind`、`sha256`、`architecture`。为填充它们，rea 读取魔数字节：ELF 的 `7f 45 4c 46`、DOS 与 PE 的 `MZ`，以及四种 Mach-O 值。它以 64 KiB 块对整个文件求哈希。没有头部的文件需要显式指定 `format`。使用 `format: "raw-binary"` 时，还要提供 `architecture` 和 `entry_point`，结果也会增加 `entry_point`。

rea 在这里拒绝 WebAssembly 模块，转交 `inspect_wasm_artifact`。对其他目标，rea 选择请求的 provider，由 `binary_session` 记录选择。

选择过程会等待 provider 就绪检查。在采集用的 Mac 上，服务日志显示第一次 `open_binary` 约 1.6 秒，第二次约 0.4 秒。设计文档允许这种等待："Readiness observations may await owned prerequisite commands." 6.5.0 版回答相同调用分别用了 36 毫秒和 1 毫秒。两个版本都不会在这一步导入目标。

```listing
title: binary_session 报告的绑定
source: capture/out/10-mcp-04-binary-session.json
lang: json
note: 仅保留 provider 绑定与服务身份。已省略能力、候选和工具可用性列表。
---
"open": true,
…
"analysis_provider_binding": {
  "provider": {
    "id": "ghidra",
    "name": "Ghidra",
    "version": "12.1.4"
  },
  "selection_source": "request",
  "analysis_profile": {
    …
    "digest": "3fc72c9b…"
  }
},
…
"server_identity": {
  "package": {
    "name": "rea-agents",
    "version": "6.7.0",
    …
  },
  …
  "sdk": {
    "server": "2.3.1",
    …
  },
  "negotiated_protocol_version": "2025-06-18",
  …
```

`selection_source: "request"` 表示 agent 选择了 Ghidra。配置摘要会由此目标的每条 Ghidra 记录携带。文档用一句话界定打开调用的限制：

```rule
label: open_binary 不做什么
source: mcp §Ghidra first-query deadlines and recovery
---
"open_binary then selects a target and provider binding; it does not establish that Ghidra has finished importing the target."
```

## 第一次依赖 Ghidra 的调用

```listing
title: 会话索引中的六次调用
source: capture/out/10-mcp-session.txt
lang: text
note: 索引第 03 到 08 行。括号内时间由采集客户端围绕每次调用测量，每次运行都变，此处已省略。
---
03  tools/call open_binary              ok     -> 10-mcp-03-open-binary-O1.json  (…)
04  tools/call binary_session           ok     -> 10-mcp-04-binary-session.json  (…)
05  tools/call list_procedures          ok     -> 10-mcp-05-list-procedures.json  (…)
06  tools/call procedure_assembly       ok     -> 10-mcp-06-procedure-assembly-grade.json  (…)
07  tools/call xrefs                    ok     -> 10-mcp-07-xrefs-grade.json  (…)
08  tools/call list_strings             ok     -> 10-mcp-08-list-strings.json  (…)
```

```listing
title: 服务日志中的相同调用
source: capture/out/10-mcp-server.log
lang: jsonl
note: rea mcp 标准错误的前五行。durationMs 在服务内部测量。time 和 durationMs 每次运行都变，此处已省略。
---
{"level":30,"time":…,"application":"rea","mode":"mcp","layer":"server","tool":"open_binary","durationMs":…,"status":"ok","msg":"MCP tool execution completed"}
{"level":30,"time":…,"application":"rea","mode":"mcp","layer":"server","tool":"list_procedures","durationMs":…,"status":"ok","msg":"MCP tool execution completed"}
{"level":30,"time":…,"application":"rea","mode":"mcp","layer":"server","tool":"procedure_assembly","durationMs":…,"status":"ok","msg":"MCP tool execution completed"}
{"level":30,"time":…,"application":"rea","mode":"mcp","layer":"server","tool":"xrefs","durationMs":…,"status":"ok","msg":"MCP tool execution completed"}
{"level":30,"time":…,"application":"rea","mode":"mcp","layer":"server","tool":"list_strings","durationMs":…,"status":"ok","msg":"MCP tool execution completed"}
```

采集工具包的 README 记录了规律。`open_binary` 后第一次依赖 Ghidra 的调用耗时 5 到 7 秒，之后对同一目标的每次调用都不到 100 毫秒。差别在于 Ghidra 启动。`GhidraClient.callTool` 在将请求入队前等待 `start()`，因此第一次调用承担 `#startWithin` 的整个序列：

1. 在会话根目录下创建私有运行时根目录，名称为 `rea-ghidra-` 加随机后缀。
2. 分配端点，在 macOS 与 Linux 上是 Unix socket。
3. 将目标复制为根目录中的 `target-01b5d08b08fb.bin`，边复制边求哈希，摘要不一致则拒绝。
4. 生成 32 字节随机 token 和运行 id。
5. 写入 `session.json`，包含 `transport`、`endpoint_path`、`token`、`run_id`、`target_sha256`、`provider_version`、`profile_digest`。
6. 启动 Java，等待桥接层接受连接。

**无界面导入：** 不打开窗口运行 Ghidra，将一个文件导入项目并运行默认分析器。在 macOS 与 Linux 上，rea 不运行 `analyzeHeadless` shell 脚本，而是向 Ghidra 的 `LaunchSupport.jar` 获取环境与 JVM 参数，再自行运行 `java`。除非设置 `GHIDRA_HEADLESS_MAXMEM` 或 `GHIDRA_MAXMEM`，堆大小为 `-Xmx2G`。命令加入 `-Djava.awt.headless=true`，指定 `ghidra.Ghidra` 类与 `ghidra.app.util.headless.AnalyzeHeadless`。文档解释原因："Apple platform shell wrappers hide their environments from ownership inspection, so retaining those wrappers would prevent verified process-group cancellation during startup." {{install §Ghidra}}

无界面参数按固定顺序排列：

- 项目根目录和项目名 `rea-project`
- `-import` 及已复制目标
- `-readOnly` 和 `-deleteProject`
- 指向运行时根目录的 `-log`、`-scriptlog`，以及指向桥接目录的 `-scriptPath`
- `-postScript ReaGhidraNoReturnFix.java`
- 最后是 `-postScript ReaGhidraBridge.java` 及 `session.json` 路径

某些目标和设置需要更多参数。原始二进制、DOS 文件或语言覆盖设置会加入加载器和处理器。种子与禁用分析器会增加预处理脚本。本手册夹具均不需要。

```figure
id: fig-4-1
kind: sequence
title: 通过 MCP 打开一次并提问三次
claim: 打开调用完成就绪检查后返回，不导入；第一个问题等待数秒完成无界面导入，下一个不到 100 毫秒。
caption: 时间向下推进。实线箭头是调用，虚线箭头是回复。紫色泳道是 rea 的 Ghidra 客户端与 analyzeHeadless 内的 Java 桥接层。时间范围来自 capture/README.md。依据 capture/out/10-mcp-server.log 和 10-mcp-session.txt。
```

## Java 一侧的桥接层

`ReaGhidraBridge.java` 是在导入和分析器之后运行的 Ghidra 脚本。其 `run()` 读取并删除 `session.json`，然后要求存在已导入程序。它检查 Ghidra 版本等于 `provider_version`，以常量时间比较程序自身 SHA-256 与 `target_sha256`。再结束脚本事务、初始化反编译器并提供服务。使用 Unix socket 时，它绑定路径，设置模式为 `rw-------`，接受一个客户端。

每个请求是一行 JSON：`{ id, token, method, params }`。回复是 `{ id, ok: true, result }` 或 `{ id, ok: false, error: { code, message } }`，rea 用严格模式解析。`list_procedures` 是该 socket 上握手 `ping` 之后的第 2 个请求，Java 一侧只用几毫秒。之前的数秒花在导入与分析器上。

```figure
id: fig-4-2
kind: tree
title: 一个会话的私有运行时根目录
claim: 一个会话拥有一个目录，包含项目、带哈希的目标副本、描述文件、socket 和日志，close_binary 会删除它。
caption: 从上向下读。每项给出文件或目录名及写入者。依据 rea 6.7.0 的 src/ghidra/GhidraLauncher.ts、src/ghidra/GhidraClient.ts；文档名依据 capture/out/05-analyze-arm64-O1.json。
```

## 截止时间与关闭

rea 允许启动耗时 330,000 毫秒，由 `REA_GHIDRA_STARTUP_TIMEOUT_MS` 设置。采集 Mac 的启动用了 5 到 7 秒，需要留意的是客户端限制："The pinned client SDK 2.3.1 defaults to 60,000 ms and can cancel earlier than REA's startup deadline." {{mcp §Ghidra first-query deadlines and recovery}}

文档记录 Linux 夹具约 64 秒，Windows 约 163 秒。用自己机器上第一次运行的实测值设置客户端截止时间。

日志中 `close_binary` 只耗时不到一秒。客户端以 10 秒上限向桥接层发送 `shutdown`，桥接层释放反编译器，`-deleteProject` 删除项目。之后对 `ledger-arm64-O2` 的 `open_binary` 约 0.4 秒，首次 `analyze_function` 又耗时数秒，因为 "Each new provider session still imports the target into a fresh temporary project." {{mcp §Ghidra first-query deadlines and recovery}}

```takeaways
- 预期 `open_binary` 后第一次依赖 Ghidra 的调用耗时数秒，其余为毫秒。
- 用自己机器的冷启动实测设置 MCP 客户端截止时间。
- 在 `close_binary` 前问完所有问题，因为项目会被删除。
- 阅读服务日志的 `durationMs`，区分 rea 耗时和 Ghidra 耗时。
```

Sources: capture/out/10-mcp-03-open-binary-O1.json, capture/out/10-mcp-04-binary-session.json, capture/out/10-mcp-session.txt, capture/out/10-mcp-server.log, capture/out/05-analyze-arm64-O1.json, capture/README.md; rea 6.7.0 at 27dc42d: src/server/registerSessionTools.ts, src/contracts/sessionLifecycleInputs.ts, src/domain/binaryTarget.ts, src/application/BinaryTargetResolver.ts, src/ghidra/GhidraClient.ts, src/ghidra/GhidraTransport.ts, src/ghidra/GhidraTargetSnapshot.ts, src/ghidra/GhidraLauncher.ts, src/ghidra/GhidraJavaLaunch.ts, src/ghidra/GhidraClientWire.ts, src/ghidra/protocol.ts, src/config/providerStartupTimeout.ts, src/application/binary/AnalysisProviderRegistry.ts, bridge/ghidra/ReaGhidraBridge.java; rea docs/mcp-contracts.md, rea docs/installation.md, rea docs/tool-design.md; the 6.5.0 recording of capture/out/10-mcp-server.log in commit 99d70723c of this repository
