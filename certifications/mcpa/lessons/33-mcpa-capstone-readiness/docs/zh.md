# 端到端读懂一次 MCP 交互

> 生产事故不会告诉你它属于哪个 MCPA 领域。它只会扔给你一份交互记录。逐阶段正确读懂这份记录，就是认证真正考查的完整能力。

**类型：** Build
**语言：** Python
**前置要求：** 第 00 至 32 课
**预计时间：** 约 60 分钟

## 学习目标

- 组装一次 2026-07-28 交互，包含带缓存提示的发现、schema 检查、MRTR 同意往返、task、进度通知、OAuth audience 检查与哈希链审计日志，并说明每个阶段防御什么风险
- 一眼区分协议错误、工具执行错误和缺少能力错误，并说出各自正确的 JSON-RPC 错误码
- 在多步骤交互的每一跳中追踪同一个 W3C trace id，包括唯一一次跨入 HTTP 并经过 OAuth 的调用
- 验证哈希链审计日志，并准确说明篡改单条记录会对之后每条记录造成什么影响
- 使用 outputs/ 中的就绪检查清单，按 objective 确认考试所覆盖的每个领域都映射到本课交互记录中的具体操作

## 问题背景

值班工程师打开控制台，看到两条互相矛盾的记录：工单声称 `checkout-api` 已在生产环境重启，事故频道却说没有。这个矛盾不会主动标注自己是“MRTR 问题”或“安全与治理问题”。理清事实必须端到端阅读一次交互：重启请求格式是否正确？服务器是否要求确认？确认是否真的签名并原样返回？调用方是否声明了足以看到该问题的能力？审计日志是否与这些事实一致？每项检查都属于 MCPA blueprint 上的不同领域：MCP Fundamentals、Architecture and Components、Interactions and Execution、Security and Governance，以及 Use Cases and Ecosystem。考试最难的题目正是这种结构：给你症状而非定义，答案藏在一次交互时间线的某个具体节点。

本课不引入新的协议能力面，而是把第 00 至 32 课逐项讲过的内容，重新组合成真实系统会产生的单一产物：针对一台 MCP 服务器的一次事故响应工作流。该成功的地方正确成功，该拒绝的地方明确拒绝，每次拒绝都有理由，所有经过都有持久记录。把它当作同类考题的彩排，也当作认证所对应实际工作的彩排：运维一个默认不信任任何工具调用的系统；在线路上由对端明确声明之前，绝不假设它具备任何能力。

## 核心概念

`code/main.py` 围绕 `incident-console` 服务器演示一次事故。每个阶段都映射到本路线已经讲过的事实，只是这次它们协同工作，而不再彼此孤立。

交互从协议版本开始，这是第 04 和第 05 课的范围。一个误配置为 `2025-11-25` 的客户端调用 `server/discover`，收到 `UnsupportedProtocolVersionError`，错误码 `-32022`，其中 `data.supported` 列出服务器实际支持的全部版本。没有握手可归咎，也没有 session 会记住先前调用的版本：每个请求都在 `params._meta` 中声明自己的 protocol version，因此修复方式只是改用正确版本再次请求。修正后的 `server/discover` 返回可缓存的 `DiscoverResult`：`supportedVersions`、`capabilities`（包括预先声明的 `extensions: {"io.modelcontextprotocol/tasks": {}}`，让客户端尝试 task 前就知道服务器是否支持）、`ttlMs` 和 `cacheScope: "public"`。这与第 20 课深入构建的 freshness contract 相同。

```json
{
  "jsonrpc": "2.0", "id": 2,
  "result": {
    "resultType": "complete",
    "supportedVersions": ["2026-07-28"],
    "capabilities": {"tools": {"listChanged": false}, "extensions": {"io.modelcontextprotocol/tasks": {}}},
    "ttlMs": 600000, "cacheScope": "public"
  }
}
```

`tools/list` 与第一次真实调用——只读 fleet scan——同时体现架构和交互流程：每个工具公布的 schema 是客户端唯一拥有的契约；请求服务器从未注册的工具会返回 `-32602`，而不是 `-32601`。这是整个错误分类中考试最常考的区别。`-32601` 只保留给服务器真正从未听说过的 JSON-RPC method；本课也会故意触发一次，把 `tools/call` 拼错成 `tools/execute`。由于 scan 请求设置了 `_meta.progressToken`，服务器会在最终结果前发送一小段 `notifications/progress`。它与任何 subscription 都无关，并在请求完成时消失，正是第 16 课将逐请求通道与 `subscriptions/listen` 区分开的方式。

`restart_service` 流程让三个领域在一个工具中汇合。缺少 `environment` 的调用会收到带 `isError: true` 的普通结果，也就是模型可读取并修正的工具执行错误，而非协议错误；因为即使参数不合规，请求本身仍是合法 JSON-RPC（第 08、18 课）。修正参数后，如果只读控制台在当前请求中从未声明 `elicitation` 能力，就会以 `-32021`、`MissingRequiredClientCapability` 拒绝，并准确指出缺少的能力；服务器绝不能假设某个请求未声明的能力（第 07 课）。只有两项检查都通过，服务器才会开启 MRTR 往返：返回 `resultType: "input_required"`，用 `inputRequests` 映射列出一项 `elicitation/create` 调用，并提供 `requestState`。它不是方便匹配用的普通字符串，而是带 HMAC 签名、绑定 principal、只能使用一次的 token（第 14、22 课）。重试必须使用全新的 JSON-RPC id，并逐字节回显 `requestState`：

```json
{
  "jsonrpc": "2.0", "id": 10, "method": "tools/call",
  "params": {
    "name": "restart_service",
    "arguments": {"service": "checkout-api", "environment": "production"},
    "inputResponses": {"confirm": {"action": "accept", "content": {"confirmed": true}}},
    "requestState": "eyJwcmluY2lwYWwiOiJhbGljZS1vbmNhbGwi...9f1c2a"
  }
}
```

本课还会发送同一次重试的故意破坏版本：服务器签发后，签名中有一个字符被翻转；交互记录用 `violation` 包裹它，让线路检查器知道这是用于讲解的反例，而非真实流量。服务器自己的 HMAC 校验会以工具执行错误拒绝，并准确说明失败项。“受保护”在实践中必须达到这个标准：不能只是字段存在，而要能够显露篡改。

`run_full_diagnostics` 展示第 21 课介绍的 tasks extension 何时真正有用。完全相同的工具调用会因一件事而表现不同：当前请求是否在 `clientCapabilities.extensions` 中声明 `io.modelcontextprotocol/tasks`。未声明时，调用同步运行到完成，并像普通工具一样返回 `resultType: "complete"`。声明后——且服务器已在 `server/discover` 中公布支持——调用会立即返回 `resultType: "task"` 和 `taskId`，客户端再通过 `tasks/get` 轮询。轮询未知 id 返回 `-32602`；轮询请求自身忘记声明扩展则返回 `-32021`，只是把相同能力规则应用到了另一个 method。对第二个 task 调用 `tasks/cancel` 是协作式取消：现在先确认，下一次轮询再看到 `cancelled` 状态，绝不会发出 `notifications/cancelled`。该通知在此版本中只用于终止 `subscriptions/listen` stream，或在 stdio 上取消一个仍未结束的请求。

交互记录中的 `acknowledge_incident` 调用被刻意设计为不同：它通过 Streamable HTTP 传输，携带必须与底层 JSON-RPC body 一致的 `MCP-Protocol-Version`、`Mcp-Method` 与 `Mcp-Name` header，并由 OAuth 2.1 保护，而不是依赖第 12 课 stdio 示例中的环境凭据（第 19、23 课）。为另一个 resource server 签发的 bearer token 会在请求进入 JSON-RPC 处理前以 `401` 拒绝，因为 audience validation 不是可选项，服务器绝不能接受并非为自己签发的 token。使用正确 scope token 的相同调用会成功。这也是本课唯一没有把 OAuth 强行套在所有请求上的地方：stdio 根本不应运行 OAuth 流程，把该模型混进其余交互只会错误讲解授权真正所在的位置。

所有阶段下方都运行着同一个 W3C `traceparent`：每个请求通过 `_meta` 传递同一个、不间断的 trace id，并在每一跳生成新 span。同时还有同一条哈希链审计日志，每项决策对应一个 entry，每个 entry 的 hash 都覆盖前一个 entry（第 27 课）。事后修改任一 entry——无论 version、outcome 或其他字段——都会让 `verify()` 从该精确索引开始失败，因为后续 entry 依赖的前序 hash 已不再匹配。这才让日志成为可验证记录，而不只是格式化的 print statement。

```figure
mcpa-33-capstone-flow
```

## 交互实验

图中追踪同一种结构：discovery 进入 schema 检查，schema 检查进入 MRTR consent，consent 进入被轮询的 task，最后到达结果。下方虚线代表贯穿每一跳的同一个 trace id，小型链式方框代表最终接受验证的审计日志。运行实验，按顺序对照输出与图示。

```bash
python3 code/main.py
```

留意四个会在任何业务逻辑运行前决定调用结果的时刻：最顶部版本修正前的 `-32022`；缺少 `environment` 参数时的 `isError: true`；控制台从未声明 `elicitation` 时的 `-32021`；以及只有前两项检查都通过后才出现的 `input_required`。然后观察末尾打印的审计日志，随后 `verify()` 返回 `True`，再修改一个 entry，看到 `verify()` 在同一索引失败。修改 `alice` 的 `run_full_diagnostics` 调用所声明的 capabilities，重新运行前先预测会看到 `resultType: "task"`，还是普通同步结果。

## 实践实验

在 `code/` 中打开 Python shell 并执行 `import main`。使用 `server = main.build_server()` 构建新服务器，再用 `client = main.Client("alice-oncall", server)` 构建客户端。以 `capabilities={}` 调用 `restart_service`，确认返回 `-32021`；然后改为 `capabilities=main.ELICIT_CAPS`，确认同一调用现在返回 `input_required`。从结果中取出 `requestState`，像交互记录一样翻转最后一个字符，再手动用它重试：你应看到文本点明签名失败的 `isError` 结果，而不是静默成功。最后，创建 task 并轮询一次，然后进入 `server.audit.entries` 修改一个已经记录的 entry 字段。在修改前后分别调用 `server.audit.verify()`。它报告的索引必须恰好是你触碰的 entry，既不是前一个，也不是列表末尾，因为编辑后的每个后续 entry 都是基于一个已经不存在的值完成 hash。

## 交付产物

`outputs/mcpa-readiness-checklist.md` 是本路线的考前文档：列出 `certifications/mcpa/tracks/mcpa-f.json` 中按五个加权领域分组的全部 18 项 objective，并把每项变成可明确指出的实际操作——要么位于本课交互记录中，要么位于首次讲解它的前序课程。趁交互仍记忆清晰，在本课结束后完成一次；考试前一晚再完成一次，届时需要的是快速回忆，而不是重新学习。

## 验证

在课程目录中运行测试：

```bash
python3 -m unittest discover code/tests
```

测试直接覆盖以上主张：交互记录中每个请求的 `_meta` 都带 protocol version 和 capabilities；未知工具始终返回 `-32602`，未知 method 始终返回 `-32601`；schema 不合法的 `restart_service` 调用是工具执行错误，修正后重试会到达 `input_required`；未声明 `elicitation` 的调用方收到 `-32021`；获接受的 MRTR 重试使用新 id，并精确回显 `requestState`；被篡改的 `requestState` 会被拒绝；只有当前请求声明扩展时，`run_full_diagnostics` 才变为 task；task 可通过轮询完成，并协作式取消；`tasks/get` 自身也执行能力规则；foreign audience token 被拒绝，scope 正确的 token 成功；所有携带 `traceparent` 的 hop 都延续同一个 trace id；审计日志可通过验证，篡改会在被改索引处检测到；交互记录从不使用 legacy method 或已退役错误码。仓库线路检查器会直接按照 2026-07-28 规则校验同一份记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/33-mcpa-capstone-readiness
```

## 综合项目关联

blueprint 上每个领域都以这一次交互的阶段出现，而不是独立练习。MCP Fundamentals 是顶部的版本协商，以及支撑所有后续步骤的无状态假设：任何请求都不能依赖先前请求建立的状态。Architecture and Components 是 `restart_service` 接受检查时依据的 tool schema，以及用于发现 `scan_fleet_health` 的 `tools/list` 响应。Interactions and Execution 是交互记录故意覆盖的整套错误分类：未知工具返回 `-32602`，未知 method 返回 `-32601`，缺少能力返回 `-32021`，参数错误返回 `isError: true`，consent 使用 `input_required`，可能超出单次请求寿命的工作使用 `task`，进度通知只属于请求它的调用。Security and Governance 是带 HMAC 签名的 `requestState`、在进入 JSON-RPC 前拒绝 foreign token 的 OAuth audience 检查，以及把“我们记录一切”变成真正可验证事实的哈希链审计日志。Use Cases and Ecosystem 解释这些内容为何在课本之外也重要：值班控制台、具有 blast radius 的重启工具、长到需要 task handle 的诊断工作，以及受真实授权保护的事故确认。这正是团队在 MCP 服务器越过 demo 阶段后真正构建的系统。

本课之后不再有下一课。接下来是就绪检查清单，然后是考试，再然后是一个需要你负责正确运行的系统——在那里，这份交互不再是供学习的图，而是你必须守住的依赖。

## 关键术语

| 术语 | 含义 |
|------|---------|
| 协议错误 | 针对畸形或无法解析请求的 JSON-RPC 错误，例如未知工具（`-32602`）或未知 method（`-32601`） |
| 工具执行错误 | 带 `isError: true` 的普通结果，报告模型可读取并修正的问题，例如缺少参数 |
| MissingRequiredClientCapability | 错误码 `-32021`；请求需要某项能力（如 `elicitation`），但当前请求未声明时返回 |
| MRTR | Multi Round-Trip Request：先返回 `input_required`，再用新 id、`inputResponses` 和回显的 `requestState` 重试 |
| requestState | 在 `input_required` 结果中返回、攻击者可触及的输入；用于授权时必须签名、绑定 principal 且只能使用一次 |
| Tasks extension | `io.modelcontextprotocol/tasks`；只有双方在当前请求中声明时，才把 `tools/call` 转换为持久、可轮询的 `taskId` |
| Canonical resource URI | 服务器在接受 OAuth access token 前检查的精确 audience；为其他 audience 签发的 token 必须拒绝 |
| traceparent | 在 `_meta` 中携带的 W3C trace context 字段；一次交互使用一个 trace id，每一跳使用新 span id |
| 哈希链审计日志 | append-only 记录，每个 entry 的 hash 都覆盖前一个 entry，因此可通过重新计算链检测编辑、插入或删除 |

## 延伸阅读

- [MCP 2026-07-28 规范](https://modelcontextprotocol.io/specification/2026-07-28)，本次交互所依据的完整规范
- [MCP 架构概览](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)，介绍本交互所演示的角色
- [MCP 自 2025-11-25 以来的变更记录](https://modelcontextprotocol.io/specification/2026-07-28/changelog)，说明无状态核心替代了什么
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 全部章节，本路线使用的协议事实唯一来源
- `phases/13-tools-and-protocols/23-capstone-tool-ecosystem`，以另一种范围构建完整工具生态
- MCPA 认证页面 training.linuxfoundation.org/certification/model-context-protocol-associate-mcpa，提供官方考试形式、时间与领域权重
