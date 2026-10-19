# 捕获中出现的错误

> 捕获包含三种错误信封、两个不可用代码、一次 setup 拒绝和两个拒绝结论的结果，而每个 rea 错误具有相同的五个字段。

捕获工具记录了三次失败调用，并完整保留响应。它们都来自 rea 自己的错误投影，其中两个来自 CLI，一个来自 MCP 服务。其他文件还包含不属于错误的代码，表示未安装的提供器、需要人工处理的 setup 计划，以及没有结论的比较。本节先列出这些情况，再介绍共同 schema。

## 三种错误信封

macOS 上 `inspect-binary-layout` 遇到 Mach-O 文件时，CLI 向 stdout 打印信封并以状态码 1 退出：

```listing
title: CLI 的 capability_unavailable
source: capture/out/04-inspect-binary-layout.json
lang: json
note: 无省略。退出状态 1 记录在 capture/out/00-commands.txt。
---
{
  "code": "capability_unavailable",
  "category": "unsupported_provider",
  "message": "The initial real-verified pwntools artifact profile supports Linux x64 only.",
  "retryable": false,
  "remediation": {
    "action": "The initial real-verified pwntools artifact profile supports Linux x64 only."
  },
  "details": {
    "provider_id": "pwntools-elf",
    "operation": "inspect_binary_layout",
    "reason": "The initial real-verified pwntools artifact profile supports Linux x64 only."
  }
}
```

通过 MCP 时，同一投影以文本传输。失败的 `tools/call` 返回 `isError: true`，将 `{ "error":... }` 对象作为 JSON 放入 `content[0].text`，没有 `structuredContent`，因为公开的输出 schema 只描述成功结果 {{mcp Tool results}}。捕获工具将该文本解码为原始响应旁的 `decoded_text`：

```listing
title: 过程不存在时的 invalid_request
source: capture/out/10-mcp-13-analyze-function-missing.json
lang: json
note: 省略了请求、原始响应以及 details.diagnostics 的大部分字段。原始响应以一个 JSON 字符串包含相同对象。被省略的诊断包含 Ghidra 运行标识、桥接端点、启动输出和远端失败消息。
---
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
        "diagnostics": {
          …
          "configured_jvm_max_heap": "2G",
          …
          "output_incomplete": false,
          …
          "failure_output": {
            …
            "complete": true
          },
          …
          "remote_code": "not_found",
          …
```

桥接层以 `issues[0].message` 中的消息抛出 `not_found`，rea 将远端 `not_found` 映射为 `AnalysisInputError`，对应代码 `invalid_request`。服务日志记录失败两次，分别来自桥接层与服务层，级别均为 40（capture/out/10-mcp-server.log）。

诊断可以说明 Ghidra 一侧是否能解释失败。`configured_jvm_max_heap` 是 rea 分配给 JVM 的堆大小，未设置 `GHIDRA_HEADLESS_MAXMEM`、`GHIDRA_MAXMEM` 时为 `2G`。`failure_output` 保存失败请求期间 Ghidra 写出的 stdout 与 stderr，这里为空，`complete: true` 表示没有丢失内容。`output_incomplete: false` 对整个进程输出表达相同含义。输出为空且有远端错误码，说明问题在输入，不在引擎。

CLI 在将任何记录读入会话前，就拒绝了 rea 6.5.0 写出的证据包：

```listing
title: 旧版证据包的 evidence_integrity_mismatch
source: capture/out/13-evidence-import-rea-6.5.0.json
lang: json
note: 仅保留信封头部。remediation 重复 message，省略了 details。
---
{
  "error": "Analysis failed",
  "code": "evidence_integrity_mismatch",
  "category": "integrity_mismatch",
  "message": "Evidence bundle does not match the bundle schema at records.3.evidence_id: Evidence semantic identifier does not match its record. Supply an unmodified bundle written by export_evidence_bundle or rea evidence-export.",
  "retryable": false,
…
```

证据包没有被修改，变化的是标识规则：现在 `relationship_coverage` 为 `null` 时也计入 hash。记录 0 至 2 是带 coverage 对象的 `analyze_function` 档案；记录 3 是 coverage 为 `null` 的 `list_procedures`，因此它的标识最先失败（[R.2](#s-ref-evidence-fields)）。CLI 退出 1。保存的 Evidence 不会自动迁移，应使用当前运行版本重新生成。

调用服务端不存在的工具不会进入 rea 的投影。MCP SDK 直接返回 JSON-RPC 错误 `-32602`，消息为 `Tool <name> not found`，没有工具结果。6.7.0 捕获没有这种调用。

拼错 CLI 命令会收到解析器信封 `COMMAND_NOT_FOUND`，其中 `cta` 对象建议最接近的命令。`analysisErrorProjectionSchema` 不定义这些字段。读取 rea 错误的脚本应在读取 `category` 前，单独处理命令拼错或缺失。6.7.0 捕获也没有这种调用。

## 不属于错误的代码

`rea capabilities` 为每个提供器列出 `availability` 对象。捕获宿主机上缺少三个提供器，代码说明原因，但不会使命令失败：

```listing
title: 两个不可用的提供器
source: capture/out/02-capabilities.json
lang: json
note: hopper 与 ida 的 availability 对象。省略了各自后续诊断，也省略了与 ida 代码相同的 kuna 对象。
---
      "availability": {
        "status": "unavailable",
        "code": "executable_missing",
        "reason": "Hopper launcher is missing or not executable: /Applications/Hopper Disassembler.app/Contents/MacOS/hopper",
…
      "availability": {
        "status": "unavailable",
        "code": "not_configured",
        "reason": "Set REA_IDA_MCP_CONFIG to an upstream IDA MCP JSON registration; see docs/ida-provider.md.",
```

对带注释的 Claude Code 文件运行 `rea setup`，返回 `status: "needs_human"` 并退出 1（capture/out/18-setup-claude-jsonc.json，[第 8.1 节](#s-the-rea-mcp-server)）。它没有计划动作，注册状态为 `invalid`。这是 setup 结果，不是错误信封，因此脚本读取 `status` 与 `remediation`，不读取 `code`。

捕获中的两个结果拒绝给出肯定结论，但退出码为 0。对两个包执行 `rea compare`，返回 `status: "unknown"` 与十条未决记录（capture/out/14-compare-bundles.json，[第 5.5 节](#s-compare-and-compare-functions)）。没有记录同时属于两个包，证据包也没有完整性覆盖标记。`verify_reconstruction` 返回 `status: "fail"` 与两个失败声明（capture/out/10-mcp-22-verify-reconstruction.json，[第 7.1 节](#s-verify-reconstruction)）。两者都不是错误信封，而是说明问题未决或声明不成立的结果。若脚本只将非零退出码视为失败信号，就会漏掉它们。

## rea 错误的共同结构

| 字段 | 含义 |
| --- | --- |
| `code` | 判别字段，为下列 20 个代码之一 |
| `category` | 十种之一：`invalid_input`、`unsupported_provider`、`unsupported_target`、`integrity_mismatch`、`truncated`、`cancelled`、`timeout`、`resource_constraint`、`unavailable`、`execution_failure` |
| `message` | 面向人的一句清晰说明，移除提供器名称与内部原因 |
| `retryable` | `artifact_changed`、`invalid_request`、`provider_timeout`、`cancelled`、`revision_conflict`、`provider_unavailable` 为 true；提供器标记可重试的 `capability_unavailable` 也为 true；`resource_constraint` 被标记可重试，或未标记且属于容量问题时，同样为 true |
| `remediation.action` | 一句话说明应采取的动作 |
| `details` | 可选；通用错误码可携带任意 JSON；`artifact_integrity_mismatch` 使用固定对象，包含 `logical_path`、`declared_sha256`、`calculated_sha256`、`unpacked` |

20 个代码为 `invalid_request`、`access_denied`、`artifact_changed`、`unreadable_output`、`capability_unavailable`、`unsupported_target`、`provider_unavailable`、`provider_timeout`、`resource_constraint`、`cancelled`、`artifact_integrity_mismatch`、`artifact_operation_failed`、`evidence_integrity_mismatch`、`truncated`、`process_capture_failed`、`cleanup_incomplete`、`revision_conflict`、`configuration_invalid`、`target_unavailable`、`execution_failure`。每种内部错误类映射到一个代码：`AnalysisInputError` 对应 `invalid_request`，`AnalysisCapabilityUnavailableError` 对应 `capability_unavailable`，`AnalysisTimeoutError` 对应 `provider_timeout`，`ConfigurationError` 对应 `configuration_invalid`，`NoBinaryOpenError` 对应 `target_unavailable`，`ProviderAdapterError` 对应 `execution_failure`。若失败后的清理留下自有资源，不论底层错误码是什么，都会改用 `cleanup_incomplete`，并在 `details` 列出资源。rea 文档以 JSON Schema `error-contract.schema.json` 发布同一联合类型。

对于 Ghidra 提供器，两个代码需要说明。首次依赖 Ghidra 的调用超过[第 8.1 节](#s-the-rea-mcp-server)启动期限时，返回 `provider_timeout`。在 `open_binary` 之前调用任何提供器工具，则返回 `target_unavailable`，消息为 "No app is open. Ask the user which app to investigate, then call open_binary with its local path."。两者都未出现在捕获中，因为捕获工具设置了较长客户端期限，并先打开目标。

Sources: capture/out/04-inspect-binary-layout.json, 10-mcp-13-analyze-function-missing.json, 13-evidence-import-rea-6.5.0.json, 18-setup-claude-jsonc.json, 02-capabilities.json, 14-compare-bundles.json, 10-mcp-22-verify-reconstruction.json, 10-mcp-server.log, 00-commands.txt; rea docs/mcp-contracts.md (Tool results); rea at 27dc42d: src/contracts/errorSchemas.ts, src/domain/analysisErrorProjection.ts, src/domain/analysisErrorPresentation.ts, src/domain/configurationErrors.ts, src/ghidra/GhidraProviderClient.ts, src/ghidra/GhidraDiagnostics.ts, src/ghidra/GhidraClient.ts, src/ghidra/GhidraJavaLaunch.ts, src/domain/evidence.ts, bridge/ghidra/ReaGhidraBridge.java, docs/user-visible-errors.csv, docs/error-contract.schema.json
