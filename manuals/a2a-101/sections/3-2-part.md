# Part

> A2A 中每份内容都是 `Part`，恰好包含 `text`、`raw`、`url`、`data` 中的一项，`mediaType` 说明如何读取。

planner 请 `code-reviewer` 审查 diff。请求包含指令及作为文件的 diff，回答包含 planner 自身代码要解析的发现。A2A 用同一种容器 part 承载这三项，并用媒体类型标识每项。

读完本节后，你可以构建四种 part，预测 agent 是否会接受。

## 一种容器，四种内容 {#s-part-one-container-four-contents}

**Part：** Message 或 Artifact 中最小的内容单元。在 proto 中，`Part` 用含四个成员的 `oneof` 声明内容： {{spec §2.2}} {{proto Part}}

- `text` 保存字符串。
- `raw` 保存文件字节，在 JSON 序列化中编码为 base64 字符串。 {{proto Part}}
- `url` 保存指向文件内容的 URL。 {{proto Part}}
- `data` 保存任意结构化 JSON 值，可以是对象、数组、字符串、数字、布尔值或 null。 {{proto Part}}

内容旁有三个可选字段：`mediaType`、`filename`、`metadata`，所有 part 类型都可用 `mediaType`。套件的审查请求在同一消息中发送两种 part： {{proto Part}}

```listing
title: 一条消息，两种 part
source: capture/out/06-input-required.http
lang: json
note: planner 发给 code-reviewer 的首条消息的 parts 数组。raw 的 base64 值共 236 个字符，只保留前 36 个。
---
      "parts": [
        {
          "text": "Review this diff of payments-api."
        },
        {
          "raw": "LS0tIGEvcGF5bWVudHMvcmVmdW5kcy5weQor…",
          "filename": "refunds.diff",
          "mediaType": "text/x-diff"
        }
      ]
```

base64 增加体积：`payments/refunds.py` 的 175 字节 diff 在 JSON 体中变成 236 个字符。`url` part 保持消息小巧，把下载及其风险交给接收者。

## 没有 kind，也不嵌套 {#s-part-no-kind-no-nesting}

0.3 版 part 用 `kind` 字段指定类型，文件包装在嵌套 `file` 对象中。1.0 删除了二者，`kind` 不再属于协议，不应输出。 {{spec §A.2.1}}

文件 part 是平铺的：`raw` 或 `url` 与 `filename`、`mediaType` 并列。规范自己的文件 part 示例结构如此，却不是有效 JSON（[冲突 D24](#s-ref-sources)）。从 proto 而非示例获取 part 结构。 {{spec §6.7}}

通过检查哪个内容成员存在来读取 part，绝不同时发送两个。参考 SDK 在运行 agent 代码之前，就以无效参数 `-32602` 拒绝双成员 part。它会忽略多余的 `kind`，遵循规范建议：实现 `SHOULD` 忽略消息中不认识的字段。 {{sdk src/a2a/server/routes/jsonrpc_dispatcher.py}} {{spec §5.7}}

```figure
id: fig-four-parts
kind: structure
title: 套件中的四种 part
claim: 套件采集使用四种 part，只有 `image/png` part 失败，因为 `code-reviewer` 不接受该媒体类型。
caption: 顶行是所有 part 的结构。下面每行是一个采集到的 part，按发送顺序排列。左侧是内容成员，绿色为媒体类型，下方为发送者。review.json 产物包含供人阅读的 text part 和供代码解析的 data part。来自 capture/out/06-input-required.http 和 capture/out/11-errors.http。
```

## 谁声明媒体类型 {#s-part-who-declares-media-types}

媒体类型有四处声明，技能模式覆盖卡片默认模式： {{proto AgentSkill}}

| 字段 | 所在位置 | 设置者 | 套件中的 `code-reviewer` |
|---|---|---|---|
| `defaultInputModes` | agent 卡片 | agent | `text/plain`、`text/x-diff` |
| `defaultOutputModes` | agent 卡片 | agent | `text/plain`、`application/json` |
| `inputModes`、`outputModes` | 卡片的各技能 | agent | `review-diff` 接受 `text/x-diff` 和 `text/plain` |
| `acceptedOutputModes` | 发送请求的 `configuration` | 客户端 | 套件中从未发送 |
| `mediaType` | 每个 part | part 发送者 | `refunds.diff` 上的 `text/x-diff` |

客户端只有 `acceptedOutputModes` 这一字段，对 agent 的规则是 `SHOULD`：应据此调整输出。SDK 请求处理器从不读取它，因此要检查收到的每个 part 的 `mediaType`。 {{proto SendMessageConfiguration}} {{sdk src/a2a/server/request_handlers/default_request_handler_v2.py}}

## 媒体类型不匹配时 {#s-part-when-the-media-type-does-not-fit}

**ContentTypeNotSupportedError：** 请求消息 part 提供的媒体类型，或产物隐含的媒体类型，不被 agent 或正在调用的具体技能支持。JSON-RPC 代码为 `-32005`，[错误](#s-errors)列出其他形式。 {{spec §3.3.2}} {{spec §5.4}}

套件中，planner 向 `code-reviewer` 发送标为 `image/png` 的截图 `url` part，agent 在创建任务之前拒绝：

```listing
title: agent 不接受的媒体类型
source: capture/out/11-errors.http
lang: json
note: 第 5 次交换，只保留发出的 part 和 HTTP 200 响应中的错误。
---
      "parts": [
        {
          "url": "https://example.com/screenshot.png",
          "mediaType": "image/png"
        }
      ]
…
  "error": {
    "code": -32005,
    "message": "Content type not supported",
    "data": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "reason": "CONTENT_TYPE_NOT_SUPPORTED",
        "domain": "a2a-protocol.org",
        "metadata": {
          "mediaType": "image/png"
        }
```

各服务器检查不同，因为规范没有给无标签 part 默认类型。SDK 只有服务器开启检查才检查，且跳过所有没有 `mediaType` 的 part。套件为它们赋默认类型，再对照卡片的 `defaultInputModes`，见[套件 README](manuals/a2a-101/capture/README.md)。同一个无标签 part 可能通过一台服务器，在另一台失败。 {{sdk src/a2a/utils/input_mode_validator.py}}

安全规则要求 agent 拒绝意外媒体类型，`url` part 必须防范服务器端请求伪造，见[安全要求](#s-security-requirements)。 {{spec §13.4}} {{spec §14.1.1}}

```takeaways
- 按所含内容成员读取 part，绝不发送两个成员或 `kind` 字段。
- 每个 part 都设置 `mediaType`，只使用卡片或技能列出的媒体类型。
- 将代码要解析的内容放入 `data` part。
- 将 `-32005` 视为内容问题：改变 part 或选择另一个 agent。
```

Sources: spec §2.2, §3.3.2, §5.4, §5.7, §6.7, §13.4, §14.1.1, §A.2.1 (research/sources/specification.md); proto Part, AgentCard, AgentSkill, SendMessageConfiguration (research/sources/a2a.proto); sdk src/a2a/server/routes/jsonrpc_dispatcher.py, src/a2a/server/request_handlers/default_request_handler_v2.py, src/a2a/utils/input_mode_validator.py at a2a-python 1.2.2; capture/out/01-agent-cards.http, 06-input-required.http, 11-errors.http; capture/a2a_ref.py, capture/README.md
