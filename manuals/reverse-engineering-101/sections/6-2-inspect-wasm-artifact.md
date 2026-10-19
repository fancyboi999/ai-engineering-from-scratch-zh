# inspect-wasm-artifact 与 WABT provider

> rea 6.7.0 在模块私有副本上运行三个 WABT 1.0.42 程序，返回一条 observed Evidence，含节、带类型接口与解码 WAT。

你手写了 `capture/fixtures/wasm/ledger.wat`，包含与 `ledger.c` 相同四个函数，用 `wat2wasm` 汇编为 `ledger.wasm`。通过 CLI 和 MCP 请求 rea 6.7.0 检查，两个入口都返回相同 Evidence。读完本节，你能配置 WABT provider、阅读记录，并说明记录没有证明什么。

## 配置

WebAssembly 不是原生目标。对模块执行 `open_binary` 会返回 `target_unavailable`，约束为 `wasm_requires_static_inspection`，错误指出应调用 `inspect_wasm_artifact`。工具需要自行安装三个 WABT 程序。将 `REA_WABT_BIN_DIRECTORY` 设为包含 `wasm-validate`、`wasm-objdump`、`wasm2wat` 的绝对目录。变量为绝对路径时工具才可用，`binary_session` 会报告可用性。

```listing
title: 版本记录的 WABT 块
source: capture/out/00-versions.txt
lang: text
note: 第四个程序 wat2wasm 用于构建夹具，rea 不运行它。
---
REA_WABT_BIN_DIRECTORY=/opt/homebrew/bin
$ /opt/homebrew/bin/wasm-validate --version
1.0.42
[exit 0]
$ /opt/homebrew/bin/wasm-objdump --version
1.0.42
[exit 0]
$ /opt/homebrew/bin/wasm2wat --version
1.0.42
[exit 0]
```

## 命令与记录

CLI 命令为 `rea inspect-wasm-artifact PATH`。采集中约两秒后以 0 退出，输出一条 Evidence。

```listing
title: CLI 调用
source: capture/out/00-commands.txt
lang: text
note: 每次采集时间都不同，已省略。
---
$ rea inspect-wasm-artifact fixtures/wasm/ledger.wasm --format json
[exit 0] (… s) -> 16-inspect-wasm-artifact.json
```

```listing
title: inspect_wasm_artifact 记录开头
source: capture/out/16-inspect-wasm-artifact.json
lang: json
note: id 与摘要截为八字符，随后是 normalized_result。
---
{
  "evidence_id": "ev_3a09e4b0…",
  "subject": {
    "name": "ledger.wasm",
    "digest": {
      "sha256": "699f6ff7…"
    },
    "local_path": "$CAPTURE/fixtures/wasm/ledger.wasm",
    "format": "file",
    "architecture": null
  },
  "provider": {
    "id": "wabt-artifact",
    "name": "REA WABT artifact adapter",
    "version": "wabt@1.0.42"
  },
  "analysis_profile": null,
  "predicate_type": "rea.analysis",
  "operation": "inspect_wasm_artifact",
  "parameters": {
    "path": "$CAPTURE/fixtures/wasm/ledger.wasm",
    "glue_paths": [],
    "candidate_paths": []
  },
```

主体格式为 `file`，架构为 `null`，因为没有适用的原生格式。provider 版本标明 WABT 发布。记录为 `observed`，权威来源是 `shipped-artifact`，因为磁盘字节是来源。两个空数组是可选输入：`glue_paths` 指定 JavaScript 文件，rea 将其中 `.wasm` 字符串字面量链接到候选模块；`candidate_paths` 指定这些模块。

## rea 运行了什么

rea 将模块复制到私有工作区，命名为只读 `module.wasm`，再运行 `REA_WABT_BIN_DIRECTORY` 目录中的三个程序。每个程序的版本输出都必须精确为 `1.0.42`，否则 rea 不运行。`tool_profile` 记录实际运行内容。

```listing
title: 工具配置的第一条命令
source: capture/out/16-inspect-wasm-artifact.json
lang: json
note: 源提交、摘要、wasm-objdump 与 wasm2wat 条目已省略，后二者参数分别为 -h -x 和 --enable-all。
---
"tool_profile": {
  "source": "https://github.com/WebAssembly/wabt",
  "release": "1.0.42",
  …
  "commands": [
    {
      "tool": "wasm-validate",
      "path": "/opt/homebrew/Cellar/wabt/1.0.42_1/bin/wasm-validate",
      "sha256": "99a52c78…",
      "version_banner": "1.0.42\n",
      "arguments": [
        "--enable-all",
        "module.wasm"
      ]
    },
    …
  ],
  "timeout_ms": 30000,
  "output_budget_bytes": 33554432
},
```

限制为输入 8 MiB、每个程序 30 秒、输出 32 MiB。

rea 在每个程序运行前后检查副本摘要，命令后也再次检查程序自身摘要。摘要标识程序字节，不证明由谁发布。

## 节

`sections` 数组保存七个节的字节范围与各节条目数。

```listing
title: ledger.wasm 的七个节
source: capture/out/16-inspect-wasm-artifact.json
lang: json
note: Function、Memory、Export、Code 条目已省略，分别从 41、48、53、113 开始。
---
"artifact": {
  "path": "$CAPTURE/fixtures/wasm/ledger.wasm",
  "sha256": "699f6ff7…",
  "bytes": 290
},
"validation": "valid",
"sections": [
  {
    "kind": "Type",
    "start": 10,
    "end": 26,
    "bytes": 16,
    "description": "count: 3"
  },
  {
    "kind": "Import",
    "start": 28,
    "end": 39,
    "bytes": 11,
    "description": "count: 1"
  },
  …
  {
    "kind": "Data",
    "start": 273,
    "end": 290,
    "bytes": 17,
    "description": "count: 1"
  }
],
```

文件为 290 字节，前八字节是魔数和版本。每节以一字节 id 和长度开始，再跟载荷。因此 Type 载荷从偏移 `0x0a`，即 10 开始。数据段在地址 1024 保存五个等级标签，间隔两字节。

## 带类型接口

记录保存两次导入和导出。`imports`、`exports` 数组保留精确 WAT 形式，`interface` 条目为每项补充方向、索引和解析后的签名。

```listing
title: 两个接口条目
source: capture/out/16-inspect-wasm-artifact.json
lang: json
note: 内存导出与三个函数导出已省略。
---
"interface": {
  "state": "complete",
  "entries": [
    {
      "direction": "import",
      "module": "env",
      "name": "log",
      "kind": "func",
      "index": 0,
      "signature": {
        "kind": "func",
        "params": [
          "i32"
        ],
        "results": []
      },
      "wat_form": "(import \"env\" \"log\" (func (;0;) (type 0)))",
      "issue": null
    },
    …
    {
      "direction": "export",
      "module": null,
      "name": "percent_change",
      "kind": "func",
      "index": 1,
      "signature": {
        "kind": "func",
        "params": [
          "i32",
          "i32"
        ],
        "results": [
          "i32"
        ]
      },
      "wat_form": "(export \"percent_change\" (func 1))",
      "issue": null
    },
    …
```

`percent_change` 接收两个 `i32`，返回一个，与 C 函数形状相同。导入 `env.log` 是函数 0，因此模块的四个函数编号 1 到 4。另一个工具 `compare_wasm_interfaces` 读取两条这类记录，将每项导入导出报告为 added、removed、changed、unchanged。它不读文件，也不运行 WABT 程序。

## WAT

`wat` 保存 `wasm2wat` 输出文本、其 SHA-256 `37eab56a…`，以及表示形式 `decoded-wat`。`percent_change` 函数体是 C 函数的栈形式：先测试第一个参数是否为零，再压入 0，或计算减法、乘以 100、有符号除法。

```listing
title: 文本形式的 percent_change
source: capture/out/16-inspect-wasm-artifact.json
lang: text
note: 从 normalized_result.wat.text 截取，其他三个函数体省略。
---
  (func (;1;) (type 1) (param i32 i32) (result i32)
    local.get 0
    i32.eqz
    if (result i32)  ;; label = @1
      i32.const 0
    else
      local.get 1
      local.get 0
      i32.sub
      i32.const 100
      i32.mul
      local.get 0
      i32.div_s
    end)
```

文本形式有两点呼应第 4 部分。`grade` 函数体的 `br_table` 有十二个目标，这是第 33 课 `ledger-x86_64-O0.o` 中同一 `switch` 跳转表的 WebAssembly 形式。`grade_label` 调用函数 2，再调用导入的 `env.log`，即函数 0。然后把两倍等级加到数据段地址 1024，每个标签两字节。无需反编译器就能从 WAT 读出这些，因为模块没有剥离符号，也没有重定位。

## 限制

记录具备[第 5 部分](#s-the-evidence-record)描述的内容：`evidence_id`、`confidence`、`authority` 和五项 `limitations`。它不反编译函数，只给出 WAT，解读由你完成。

```listing
title: 记录的五项限制
source: capture/out/16-inspect-wasm-artifact.json
lang: json
note: 无省略。
---
"limitations": [
  "WAT is a decoded representation, not original source or proof of runtime behavior. Custom annotations may retain payloads, but WAT does not establish original binary layout or round-trip byte identity. Original bytes and objdump output remain authoritative.",
  "Imports and exports retain exact top-level WABT WAT forms. Names remain escaped producer text; unescaped objdump display names are not parsed as unambiguous identifiers.",
  "JavaScript references are AST-observed static literals only. Candidate matches are associations, not proven data flow, URL-to-file identity or runtime loading. Computed references and aliases are not resolved.",
  "No target execution or implicit fetch. WABT tools are trusted caller-supplied executables; SHA-256 identifies their bytes, not publisher authenticity. No OS memory sandbox is claimed.",
  "Each subprocess has a 30-second deadline and 32 MiB combined output budget. Oversized output fails instead of producing truncated success."
],
```

第一条限制说明 WAT 是解码表示，不展示原始源码，也不证明运行时行为。`observed` 只针对字节和工具输出。`runtime_execution`、`network_fetch` 均为 `not-performed`，因为 rea 从不运行模块。

## 通过 MCP

MCP 工具是接收相同 `path` 的 `inspect_wasm_artifact`。会话第 24 步在 404 毫秒后返回 `ok`。回复是工具结果，`structuredContent` 是相同 Evidence，id 同为 `ev_3a09e4b0…`。`_meta` 带有[第 8.1 节](#s-the-rea-mcp-server)的不可信内容标记。

```listing
title: MCP 结果开头
source: capture/out/10-mcp-24-inspect-wasm-artifact.json
lang: json
note: 文本副本和记录其余部分已省略。
---
"result": {
  "_meta": {
    "provenance": {
      "untrusted_content": true,
      "source": "analysis_target"
    }
  },
  …
  "structuredContent": {
    "evidence_id": "ev_3a09e4b0…",
```

会话保留记录，因此 `export_evidence_bundle` 会将它与其他记录一起写入 bundle。对大模块，首次调用传 `detail: "summary"`。rea 保留完整记录，只返回计数、验证结果和 WAT 标识，不返回 WAT 文本，再用 `inspect_analysis_view` 分页读取完整记录。

## 用 wabt 交叉检查

采集还绕过 rea 对模块运行 `wasm-objdump -h -x`，输出在 `16-wabt.txt`。其中节表与记录 `headers` 文本有相同七行。Type 从 `0x0000000a` 开始，Data 在 `0x00000122` 结束，即 290，与 `sections` 偏移一致。[图](#fig-6-2)展示两个入口到同一记录的路径。

```figure
id: fig-6-2
kind: flow
title: 对 ledger.wasm 调用 inspect_wasm_artifact
claim: rea 复制模块、检查版本后运行三个 WABT 程序，返回 CLI 与 MCP 共享的一条 observed 记录。
caption: 从上向下读。实线箭头为调用，虚线箭头为 rea 解析的程序输出，灰框为 rea 外部的 WABT 程序。依据 capture/out/16-inspect-wasm-artifact.json 与 10-mcp-24-inspect-wasm-artifact.json。
```

```takeaways
- 调用前将 `REA_WABT_BIN_DIRECTORY` 设为包含 WABT 1.0.42 的绝对目录。
- 运行 `rea inspect-wasm-artifact PATH --format json`，或通过 MCP 调用 `inspect_wasm_artifact`。
- 依次读 `sections`、`interface`，再读 `wat.text` 中一个函数体。
- 报告任何 WAT 内容前，先读五项限制。
```

Sources: src/cliCommandNames.ts, src/contracts/wasm/wasmToolContracts.ts, src/wasm/WabtArtifactProvider.ts, src/wasm/WabtRelease.ts, src/server/createServer.ts, src/application/BinaryTargetResolver.ts at rea-agents-6.7.0 (27dc42d); rea docs/wasm-artifacts.md (Offline WebAssembly artifacts, Compare core-module interfaces); capture/fixtures/wasm/ledger.wat, capture/fixtures/ledger.c; capture/out/16-inspect-wasm-artifact.json, 10-mcp-24-inspect-wasm-artifact.json, 10-mcp-session.txt, 16-wabt.txt, 00-commands.txt, 00-fixtures.txt, 00-versions.txt
