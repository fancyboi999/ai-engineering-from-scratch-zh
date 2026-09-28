# 发现服务端并协商其能力

> 服务端通过 `server/discover` 描述自己一次，但每个请求仍要声明自己的能力：客户端曾经询问过可用功能，不代表服务端便能假设请求具备它需要的一切。

**类型：** Reference
**语言：** Python
**前置要求：** 第 06 课
**预计时间：** 约 45 分钟

## 学习目标

- 读懂 `server/discover` 请求及其 `DiscoverResult`：`supportedVersions`、`capabilities`、`instructions`、`serverInfo`、`ttlMs`、`cacheScope`
- 解释为什么服务端必须实现 `server/discover`，而客户端可以选择是否调用
- 读懂 `ServerCapabilities` 和 `ClientCapabilities` 的形状，并说明每个标志承诺了什么
- 解释为什么服务端绝不能依赖客户端未在当前请求中声明的能力，以及 `MissingRequiredClientCapabilityError`（`-32021`）携带哪些内容
- 走完一次版本协商重试：从 `UnsupportedProtocolVersionError`（`-32022`）到客户端选择双方共同支持的版本

## 问题背景

第 06 课让 host 为每个服务端配备一个客户端，并清楚划分了职责，但留下一个问题：客户端首次与陌生服务端通信时，没有准备阶段可供询问，它如何得知服务端是谁、能做什么？第 04 课的无状态核心已经排除了 `initialize` 握手，也没有会话替它记住答案。每个请求仍必须自我描述。

这条规则对双方都有影响。客户端需要快速获知服务端身份、支持的协议版本和所提供功能的形状，最好一次往返完成，而不是为了拼出全貌分别探测 `tools/list`、`resources/list` 和 `prompts/list`。另一方面，正因为服务端不能依赖连接状态，所以即使客户端五个请求前询问过 elicitation 或 sampling 支持情况，服务端也不能假设当前这次调用仍愿意且能够处理 elicitation 请求。了解服务端提供什么，与证明客户端当前能接受什么，听起来相似，方向却恰好相反。2026-07-28 使用两套不同机制解决它们；只粗看字段名，很容易混为一谈。

## 核心概念

第一套机制是 `server/discover`。服务端**必须（MUST）**实现它；客户端**可以（MAY）**调用，也可以直接发送实际需要的请求，并在收到版本不匹配错误时处理。请求除标准 `_meta` 外不携带其他内容：

```json
{
  "jsonrpc": "2.0",
  "id": "discover-1",
  "method": "server/discover",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

返回结果 `DiscoverResult` 属于 `CacheableResult`，所以除了自身字段外，始终带有 `ttlMs` 和 `cacheScope`。自身字段包括：`supportedVersions`，即客户端后续请求应从中选择的版本列表；`capabilities`，一个 `ServerCapabilities` 对象；以及可选的 `instructions` 字符串，它是给模型的自然语言指导，不是工具描述的副本。服务端自身身份位于 `result._meta["io.modelcontextprotocol/serverInfo"]`，包含服务端自报的名称和版本。该字段只是一项便利信息，不是凭据：可用于显示、日志和调试，绝不能驱动授权或信任决策，因为协议不会验证它。

`ServerCapabilities` 通过一组标志列出服务端提供的功能：`tools {listChanged}`、`resources {listChanged, subscribe}`、`prompts {listChanged}`、`completions {}`、`logging {}`（已弃用，第 15 课会深入讲解），以及 `extensions {}`（扩展标识符到设置对象的映射，第 30 课主题）。`completions` 这类能力使用空对象表示“支持，但没有额外设置需要报告”。缺少某个键，则表示服务端完全不提供该原语。`ClientCapabilities` 是镜像结构，描述客户端能够接受什么：`elicitation {form, url}` 对应第 14 课介绍的两种模式；`sampling` 和 `roots` 均已弃用，迁移路径见第 15 课；还有 `extensions {}`。两种形状遵循相同命名规则，但传递方向相反。

只扫过字段名称的读者最容易在这里出错：`DiscoverResult.capabilities` 描述的是*服务端*能做什么，只报告一次，可以缓存，并可安全复用到 `ttlMs` 提示过期为止。它完全没有说明*客户端*当前能接受什么。后者是另一项逐请求事实，存在每个请求的 `_meta["io.modelcontextprotocol/clientCapabilities"]` 中，无论是否为 discover 请求都一样。服务端若要使用某项客户端能力，例如在处理工具调用时发起表单模式 elicitation 问题，就必须检查*当前请求*中的 `clientCapabilities`，绝不能读取之前 discover 调用或之前 `tools/call` 中记住的值。这正是第 04 课的无状态原则直接作用于能力：永远不得根据先前请求推断，即使它们来自同一条连接。

当服务端需要当前请求未声明的能力时，会返回 `MissingRequiredClientCapabilityError`：

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "error": {
    "code": -32021,
    "message": "notify_oncall requires a capability this request did not declare",
    "data": {
      "requiredCapabilities": {
        "elicitation": {}
      }
    }
  }
}
```

`data.requiredCapabilities` 的形状与 `ClientCapabilities` 完全相同，会明确指出缺少哪些类别，让客户端声明后重试，而不是靠猜。在 HTTP 上，该错误的状态码是 `400 Bad Request`。

版本选择是协商的另一半，而且完全不依赖发现流程：任何请求都可能触发它。如果请求指定了服务端未实现的协议版本，服务端必须使用 `UnsupportedProtocolVersionError` 拒绝：

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "error": {
    "code": -32022,
    "message": "Unsupported protocol version",
    "data": {
      "supported": ["2026-07-28"],
      "requested": "2025-11-25"
    }
  }
}
```

客户端应从 `data.supported` 中选择一个版本，使用新的 id 重试同一请求。注意这不是什么：通过现代 `_meta` 形状请求一个真实存在的旧修订版，并不等同于旧版客户端。旧版客户端会发送 `initialize` 请求，而不是逐请求元数据；时代由消息形状定义，不由版本号定义。现代专用服务端若收到旧版客户端真正发来的 `initialize` 请求，仍应在错误中列出自己支持的版本。这是旧版客户端唯一能向用户展示的诊断信息，也符合第 05 课时代模型的一贯要求。

```figure
mcpa-07-discover
```

## 交互实验

图中直观分开了两套机制。上方泳道是 `server/discover`：客户端可选择调用，通过一次往返同时取得支持版本、能力、instructions 和缓存提示。下方泳道展示每次 `tools/call` 都会发生的事情，无论发现流程是否运行过：请求自身的 `clientCapabilities` 都要重新检查。什么都不声明时，需要 elicitation 的工具返回 `-32021`，明确指出缺失内容；在当前请求中声明后，同一调用便可完成。第一次成功的 discover 调用不会把任何内容自动带入第二条泳道。

## 实践实验

打开 `code/main.py`。`DeployServer` 实现了 `server/discover` 和一个受能力门控的工具 `notify_oncall`。该工具定义要求客户端先具备 `elicitation` 能力才会运行；另一个不受门控的工具 `list_incidents` 则不需要额外能力。

```bash
python3 code/main.py
```

按顺序阅读打印出的交互。第一对是普通 `server/discover`，返回 `supportedVersions`、`capabilities`、`instructions` 和缓存提示。第二对调用 `notify_oncall`，其中 `clientCapabilities: {}`，因此返回 `-32021`，并在 `data.requiredCapabilities` 中列出 `elicitation`。第三对重复同一调用，但这次在当前请求的 `_meta` 中声明 `elicitation`，于是正常完成。第四对调用服务端不存在的工具 `close_all_incidents`，它是协议错误 `-32602`，而不是能力问题。最后两对展示版本协商：请求 `2025-11-25` 的 `server/discover` 返回 `-32022`，在 `data.supported` 中列出 `["2026-07-28"]`；客户端下一次调用选择该版本并成功，同时使用新的请求 id。试着声明一次 `elicitation`，再在后续调用中删除它；服务端会再次拒绝，因为它从未记住之前的声明。

## 交付产物

`outputs/capability-negotiation-cheatsheet.md` 汇总了 `DiscoverResult` 字段表、并列展示的 `ServerCapabilities` 与 `ClientCapabilities` 形状、`-32021` 和 `-32022` 的 data 形状，以及一份简短的重试检查清单，所有内容均引用研究简报。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试会检查：`server/discover` 返回 `supportedVersions`、完整的 `capabilities` 对象、`instructions` 和缓存提示；缺少必需能力的调用返回 `-32021` 并列出该能力；重试请求声明能力后可以完成调用；不需要额外能力的工具无须声明任何内容；未知工具返回 `-32602`，未知方法返回 `-32601`；版本不匹配时同时列出 `supported` 和 `requested`；客户端重试使用新的 id；完全缺少 `_meta` 的请求会被拒绝。仓库的线协议检查器还会直接按照 2026-07-28 规则验证同一份交互记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/07-discovery-and-capability-negotiation
```

## 综合项目关联

综合项目的第一步是调用 `server/discover`，返回的缓存提示会在后续交互中得到遵守；随后发起一次工具调用，它之所以成功，只因为客户端在当前请求中声明了正确能力；再之后是由同一声明门控的 MRTR elicitation 交互。每一步都建立在本课划分之上：发现以可缓存的方式一次描述服务端；能力声明则在每个请求中重新描述客户端。

## 关键术语

| 术语 | 含义 |
|------|------|
| `server/discover` | 服务端必须实现的请求，用于公布版本、能力和身份 |
| `DiscoverResult` | 可缓存的发现结果：`supportedVersions`、`capabilities`、可选 `instructions`、`ttlMs`、`cacheScope` |
| `ServerCapabilities` | 服务端提供的内容：tools、resources、prompts、completions、logging、extensions |
| `ClientCapabilities` | 客户端在当前请求中能接受的内容：elicitation、sampling、roots、extensions |
| `serverInfo` | 服务端自报的名称和版本，仅用于显示和日志，绝不能用于安全决策 |
| `MissingRequiredClientCapabilityError` | `-32021`；请求需要某项能力，但自身 `clientCapabilities` 未声明时返回 |
| `UnsupportedProtocolVersionError` | `-32022`；请求指定服务端未实现的版本时返回，并携带 `data.supported` 和 `data.requested` |
| 逐请求协商 | 只从当前请求读取能力和版本事实，绝不根据之前请求推断的规则 |

## 延伸阅读

- [发现：server/discover](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [版本控制与兼容性](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [基础协议概览与 _meta 规则](https://modelcontextprotocol.io/specification/2026-07-28/basic/index)
- [Schema 参考：DiscoverResult、ClientCapabilities、ServerCapabilities](https://modelcontextprotocol.io/specification/2026-07-28/schema#discoverresult)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 6 节
