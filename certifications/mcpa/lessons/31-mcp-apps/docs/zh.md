# 对话中的交互界面

> 工具结果不必止于文本：服务器可以指向一个小型 HTML 界面，让 host 就在对话发生的位置，以沙箱方式渲染它。

**类型：** Reference
**语言：** Python
**前置要求：** 第 30 课
**预计时间：** 约 45 分钟

## 学习目标

- 说明交互界面在普通文本和结构化内容之外增加了什么，并识别值得采用它的使用场景
- 逐请求协商 `io.modelcontextprotocol/ui` 扩展，并追踪 `ui://` 资源如何从工具的 `_meta.ui.resourceUri` 进入普通 `resources/read` 调用
- 读取 UI 资源的 `_meta.ui.csp` 域名列表与 `_meta.ui.permissions` 标志，构造 host 必须执行的 Content Security Policy，包括限制严格的默认策略
- 执行工具的 `visibility` 规则，让 agent 工具列表和应用自己的 `tools/call` 请求都只能看到各自获准访问的工具
- 描述沙箱 iframe 安全模型、应用到 host 的桥接，以及为什么应用发起的工具调用仍必须跨越同意边界
- 设计回退方案，让支持 UI 的工具在 host 从未声明扩展时仍能工作

## 问题背景

仪表盘工具回答“按地区显示销售额”时，可以返回一段数字，也可以在 `structuredContent` 中放一张小表格。但用户无法点击某个地区继续下钻，不能悬停在柱形图上查看精确数值，也不能在多个指标间切换——除非每次点击都让模型重新运行工具。配置工具从另一个方向遇到相同上限：把“哪个地区、哪种实例规格、是否启用自动扩缩容”拆成一轮轮对话，比让用户一次填完带默认值和即时校验的表单更慢，也更容易出错。

对多数工具而言，文本和结构化内容依然是正确选择。但它们确实留下了一道窄缝：有些结果需要探索，而不只是阅读；有些选择需要一次看全，而不是逐题回答。MCP Apps 用可选扩展填补这道缝隙，而不是新增一种传输方式，或在 MCP 旁再造一套协议。它复用本路线已经介绍过的两个 primitive——工具与资源——只额外规定 host 如何渲染所取得的内容。

## 核心概念

扩展标识符是 `io.modelcontextprotocol/ui`。它与所有扩展采用完全相同的协商方式，也就是第 30 课介绍的逐请求声明：客户端在所发送请求的 `io.modelcontextprotocol/clientCapabilities.extensions` 中声明支持，服务器则通过 `server/discover` 的 `capabilities.extensions` 声明自身支持。扩展声明不依赖更早的请求。它逐请求生效，与协议版本和其他能力相同。

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "server/discover",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {"io.modelcontextprotocol/ui": {}}
      }
    }
  }
}
```

支持扩展的服务器会在响应的 `capabilities.extensions` 中列出同一个标识符，与原有的 `tools` 和 `resources` capabilities 并列。该响应同样不取决于调用方声明了什么：`server/discover` 报告服务器能做什么，客户端再把它与自身支持项求交集，判断真正可用的能力。从未声明扩展的 host 会收到完全相同的发现结果，只是不会处理其中自己未实现的扩展。

支持 UI 的工具会在定义中多一个字段 `_meta.ui.resourceUri`，指向 `ui://` 资源。这是每个工具固定的静态元数据，属于所有客户端都会收到的同一条 `tools/list` 记录，因此不会像调用方相关数据那样变化。绑定关系在工具调用前就已可见，host 可以预加载并提前审查资源，无需等到模型决定调用工具后才发现它。

工具的 `_meta.ui` 还可以包含 `visibility` 数组；字段缺失时默认为 `["model", "app"]`。对 `"model"` 可见，表示 agent 可以看到并决定调用该工具，也就是本路线从第 11 课起介绍的普通情况。对 `"app"` 可见，表示渲染后的应用可通过桥接直接调用工具，无需让模型先执行一轮。两者是 host 在两份不同列表上执行的独立门禁：移除 `"model"` 后，工具绝不能出现在 agent 自己的工具列表中；移除 `"app"` 后，模型仍可正常看到工具，但 host 必须拒绝应用针对它发起的 `tools/call`。对于仅限应用调用的工具，如果其服务器与应用所属服务器不一致，跨服务器调用无论 visibility 如何都必须直接阻止。

取得资源不需要特殊方法。host 像读取其他资源一样，通过 `resources/read` 读取它；结果的 `mimeType` 必须精确等于 `text/html;profile=mcp-app`。正是这个 profile 参数，把文档标记为可渲染应用，而不是浏览器碰巧能打开的任意 HTML 页面。返回普通 `text/html` 的资源无论标记写得多规范，都不是 MCP App。谨慎的 host 会在每次取得资源时检查 mime type，而不是只相信 `ui://` scheme。

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "resultType": "complete",
    "contents": [
      {
        "uri": "ui://dashboard/sales-by-region.html",
        "mimeType": "text/html;profile=mcp-app",
        "text": "<!doctype html>...",
        "_meta": {
          "ui": {
            "csp": {
              "connectDomains": ["https://api.sales-metrics.example"],
              "resourceDomains": ["https://cdn.trusted-charts.example"]
            },
            "permissions": {"camera": {}, "geolocation": {}},
            "prefersBorder": true
          }
        }
      }
    ],
    "ttlMs": 60000,
    "cacheScope": "public"
  }
}
```

同一个资源会在 `_meta.ui` 中携带约束 host 渲染方式的字段。`csp` 是对象，不是扁平列表：`connectDomains` 管理 fetch、XHR 和 WebSocket；`resourceDomains` 管理脚本、样式、图片和字体；`frameDomains` 管理嵌套 iframe；`baseUriDomains` 管理文档自身的 base URI。每个键都可省略。host 必须严格根据资源声明的域名构造 Content Security Policy，不得放行资源未声明的域名；但声明域名并不等于必定获准，因为 host 可以按自身策略进一步收紧实际放行范围，这属于 host 策略，不是线路故障。如果完全省略 `csp`，host 必须回退到限制严格的默认策略：除同源内容及内联样式和脚本外全部阻止，也不允许任何出站连接。无论 `csp` 的其他部分是否存在，缺少 `frameDomains` 都意味着 `frame-src 'none'`，缺少 `baseUriDomains` 都意味着 `base-uri 'self'`。host 应记录最终构造出的 CSP，供后续安全审查。

`permissions` 是另一个对象，每项能力使用一个可选的空对象标志：`camera`、`microphone`、`geolocation`、`clipboardWrite`。host 可以通过 iframe 的 `allow` 属性授予其中任意权限；应用不应假定请求的权限确实获批，权限提示被拒后应像普通网页一样降级。渲染不会像检查 mime type 那样等待权限：资源请求了 host 不愿授予的权限，仍应正常渲染，只是没有对应能力。

渲染后，应用与 host 使用自己的 JSON-RPC 方言通信，承载于 `postMessage`，而不是本课程其他部分介绍的客户端—服务器连接。其中一些消息与核心协议同名，例如 `tools/call`；多数消息是以 `ui/` 开头的新名称，例如 `ui/initialize`，用于在单个 iframe 与嵌入它的 host frame 之间建立通道。这个本地握手与核心 `initialize` 请求无关，后者在 2026-07-28 中并不存在：本地握手不协商协议版本，不创建 session，也不触及本路线从第 04 课起介绍的无状态客户端—服务器线路。如果 host 本身是网页，也绝不能直接与 view 通信：它必须用一个与 host 自身不同源的中间 sandbox proxy 包裹 view，由 proxy 在两个方向转发桥接消息。

应用可通过桥接要求 host 代为发起工具调用，但目标工具首先必须包含 `"app"` visibility。最终决定权仍在 host：只有经过用户对任意工具调用都会执行的同意流程后，host 才把请求作为普通 `tools/call` 转发到服务器，并使用新的 id 和完整 `_meta`；host 也可以直接拒绝。iframe 不能自行批准会产生后果的操作。它只能提出请求，由 host 作答。

这也是选择应用而非普通链接网页的安全依据。iframe 无法读取 host 页面的 cookie、local storage 或 DOM，不能导航父页面，也不能在父页面上下文中运行脚本；所有特权操作都必须通过受控桥接。这种隔离让 host 可以安全渲染来自未逐行审计服务器的应用，就像它能渲染不可信的工具结果和资源文本，却不允许这些内容决定模型或用户最终做什么一样。这正是第 22 课建立的信任边界纪律。

这些机制都不是工具保持可用的必要条件。支持 UI 的工具仍应在每次 `tools/call` 中返回有用的 `content` 文本答案。从未声明扩展的 host 只是不读取 `ui://` 资源，而是像处理普通工具一样使用文本。这符合扩展的一般规则：不支持的一方回退到核心行为，而不是让请求失败。

```figure
mcpa-31-app-sandbox
```

## 交互实验

图中同时追踪一次工具调用的两个分支。左侧，声明了扩展的 host 通过普通 `resources/read` 读取工具的 `_meta.ui.resourceUri`，检查 mime type，并基于声明域名构造 Content Security Policy，再按自身策略进一步收紧，最后才在沙箱 iframe 中渲染。虚线标出应用发起的工具调用仍须跨越的同意门禁；只有工具 visibility 允许且通过同意后，请求才能到达服务器。右侧，从未声明扩展的 host 在普通 `tools/call` 后便停止，直接渲染同一工具的文本内容，完全不接触资源。

## 实践实验

打开 `code/main.py`。一个服务器公开三个绑定到同一仪表盘 view 的工具：`sales_by_region`（默认 visibility，对 model 与 app 都可见）、`refresh_sales_view`（`visibility: ["app"]`，对 agent 隐藏），以及 `export_sales_report`（`visibility: ["model"]`，应用内部无法调用）。它还公开四个资源：工具真正使用的 `ui://` view；返回普通 `text/html` 而不是 app profile 的 `legacy-widget`；CSP 指定了 host 策略范围之外域名的 `scripts-widget`；以及完全省略 `csp` 的 `minimal-widget`。

```bash
python3 code/main.py
```

`HostAppLoader.load` 会使用相同工具和参数运行两次完整决策，一次声明扩展，一次不声明。因此，输出中的两个方案可以直接比较：一个是根据真实 `resources/read` 构建的 `{"mode": "app", ...}`，带有生成的 `csp` 字符串，以及严格小于资源请求范围的 `grantedPermissions` 列表；另一个是完全不会发出该读取调用的 `{"mode": "text", ...}`。`review_app_resource` 与 `build_csp` 会分别处理有缺陷和最小化资源，以普通文本解释每个资源在哪项检查失败，或采用了哪个默认值。靠近底部的 `request_tool_call_from_app` 展示两道独立门禁：对 `export_sales_report` 的调用会先因 visibility 中缺少 `"app"` 被拒，甚至不会询问用户是否同意；对 `refresh_sales_view` 的调用在用户拒绝时停止，在获批时使用新 id 转发。比较针对同一工具的两个 `tools/call` 记录，确认每个请求仍携带自己的完整 `_meta`，包括扩展声明，且不会记住前一次请求的状态。

## 交付产物

`outputs/mcp-apps-review-checklist.md` 是一页式审查清单：host 信任并渲染 `ui://` 资源前需要确认什么，支持 UI 的工具必须保留怎样的回退，以及一张把各项检查结果映射为渲染、回退或拒绝的简短决策表。当工具声明 `_meta.ui` 时，把这份清单放在服务器工具描述旁边使用。

## 验证

在课程目录中运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课主张：只有双方都声明扩展时才完成协商；无论调用方是谁，工具的 UI 绑定都会出现在 `tools/list` 中；省略 `visibility` 时默认对 `"model"` 和 `"app"` 都可见；agent 自己的工具列表会排除仅限应用的工具；支持应用的 host 通过且只通过一次 `resources/read` 解析资源；不支持扩展的 host 回退到文本，并完全跳过该调用；即使读取成功，mime type 错误的资源也会被拒绝；CSP 指定 host 策略之外域名的资源会被拒绝，并说明具体域名；`build_csp` 会根据声明域名构造正确指令，省略 `csp` 时使用限制严格的默认值；获准权限绝不会超过 host 自身策略；用户拒绝的应用工具调用不会进入线路；获批调用会使用新 id 转发；visibility 排除 `"app"` 的工具会在请求同意前被拒；未知资源属于协议错误；所有可缓存结果都带 `ttlMs` 与 `cacheScope`。仓库线路检查器还会按照 2026-07-28 规则校验本课交互记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/31-mcp-apps
```

## 综合项目关联

综合项目的端到端交互可以包含一个支持 UI 的工具。本课提出的每个问题都仍然适用：本次请求是否真的完成扩展协商？取得的资源是否在渲染前携带精确的 mime type？应用发起的调用是否仍跨越综合项目为其他所有工具调用执行的同一道同意门禁？

## 关键术语

| 术语 | 含义 |
|------|---------|
| MCP Apps | 允许工具指向交互式 HTML 界面、由 host 负责渲染的可选扩展 |
| `io.modelcontextprotocol/ui` | 客户端与服务器协商 MCP Apps 时共同声明的扩展标识符 |
| `ui://` | 为应用 UI 资源保留的 URI scheme |
| `_meta.ui.resourceUri` | 工具定义中指向其 `ui://` 资源的字段 |
| `text/html;profile=mcp-app` | 把取得的资源标记为可渲染应用的精确 mime type |
| `_meta.ui.csp` | 可选域名列表（`connectDomains`、`resourceDomains`、`frameDomains`、`baseUriDomains`）组成的对象，host 据此构建 Content Security Policy |
| `_meta.ui.permissions` | 可选空对象标志（`camera`、`microphone`、`geolocation`、`clipboardWrite`）组成的对象，host 可选择授予 |
| `visibility` | 工具 `_meta.ui` 中的数组，默认为 `["model", "app"]`，分别控制 agent 工具列表与应用自己的 `tools/call` 请求 |
| 沙箱 iframe | host 用于渲染应用的隔离 frame，不能直接访问 host 页面 |
| Sandbox proxy | web host 必须放在自身与所渲染 view 之间的不同源中介 |
| 应用到 host 的桥接 | 应用与 host 通过 `postMessage` 使用的 JSON-RPC 方言，独立于客户端—服务器线路 |
| 文本回退 | 支持 UI 的工具仍为不支持扩展的 host 返回的普通 `content` 结果 |

## 延伸阅读

- [MCP Apps 概览](https://modelcontextprotocol.io/extensions/apps/overview)
- [构建 MCP App](https://modelcontextprotocol.io/extensions/apps/build)
- [SEP-1865：MCP Apps 交互式用户界面](https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp)
- [MCP Apps 规范（2026-01-26）](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 14 节
- `phases/13-tools-and-protocols/14-mcp-apps`，围绕同一个扩展构建完整的请求与资源服务器，以及约束更严格的 Streamable HTTP adapter
