# MRTR 实现检查清单

这是一份在服务器或客户端中实现多轮请求与信息征询的单页参考，与 MCP 2026-07-28 对齐。

## 服务器端：以 input_required 结束调用

- 只有 `tools/call`、`prompts/get` 或 `resources/read` 请求可以用 `resultType input_required` 结束。其他客户端请求均不得收到该结果。
- 每个 `InputRequiredResult` 至少包含 `inputRequests` 或 `requestState` 之一。
- 每个 `inputRequests` 项使用服务器选择的键，值只能是 `elicitation/create`、`sampling/createMessage` 或 `roots/list` 请求对象。
- 绝不能加入请求客户端未在本次请求的 `clientCapabilities` 中声明的 `inputRequests` 类型。若 tool 始终需要 elicitation，但请求缺少该 capability，应以 `-32021`（`data.requiredCapabilities`）拒绝，而不是猜测。
- 不要假定客户端一定会重试。等待答案时，不得在内存中或其他地方保持任何资源打开。

## 保护 requestState

- `requestState` 一旦经过客户端，就应视为攻击者可控输入，即使这些字节最初由自己的服务器生成。
- 若 `requestState` 影响授权、资源访问或业务逻辑，应使用 HMAC 或 AEAD cipher 保护其完整性。验证失败的 state 必须拒绝。
- Payload 应绑定三项内容，并在每次重试时全部检查：经过认证的 principal（不能使用由调用方自报的 `clientInfo`）、较短的有效期，以及原请求关键参数（method、tool 名称、arguments）的摘要。
- Token 最多只能兑换一次时，应在服务端强制单次使用。仅检查签名和有效期无法阻止仍有效 token 的重放。
- 即便 `requestState` 已加密，也绝不能把 secret、凭据或个人数据直接编码进去；应假定中间层会记录、缓存和复制它。

## 客户端：处理重试

- 把 `requestState` 视为完全不透明：不要解析、检查、解码，也不要根据其内容做决定。
- 若 `InputRequiredResult` 携带 `inputRequests`，应在重试前构造所有请求的输入。若未携带，客户端可立即重试。
- 若 `InputRequiredResult` 携带 `requestState`，重试时回传完全相同的字符串。若未携带，则不要自行添加。
- 重试始终使用新的 JSON-RPC id。它是独立请求，不是原 id 的延续。
- `inputRequests` 和 `requestState` 只适用于客户端对那一个原请求的下一次重试；绝不能在并行运行的无关调用中复用。

## 选择 form 模式或 URL 模式信息征询

| 场景 | 模式 | 原因 |
|---|---|---|
| 确认破坏性操作、从短列表选择、填写简短表单 | form | 客户端可依据 `requestedSchema` 验证并向用户展示结构化数据 |
| 收集密码、API key、access token 或支付详情 | url | Form 模式绝不能携带这些内容；URL 模式让它们完全避开 MCP 客户端 |
| 代表用户运行第三方 OAuth 流程 | url | 服务器作为自己的 OAuth client 与第三方交互；客户端访问 MCP 服务器的 bearer token 与此无关且保持不变 |

- Form 模式的 `requestedSchema` 只能是包含基本类型属性的扁平对象：string、number、integer、boolean，以及单选或多选枚举。不能有嵌套对象，也不能有对象数组。
- `ElicitResult.action` 为 `accept`、`decline` 或 `cancel`。Form 模式下 `accept` 携带 `content`，URL 模式下不携带。三种 action 都要处理；不要把 `decline` 或 `cancel` 当作错误。
- 在 2026-07-28 中，URL 模式只携带 `mode`、`message` 和 `url`。不再有 `elicitationId` 和 `notifications/elicitation/complete`；二者与旧版 `-32042` 错误码一起被移除。只有当客户端带着此前收到的 `requestState` 重试原请求时，服务器才能得知结果。

## 快速陷阱检查

- 重试复用原 id 是错误的；必须使用新 id。
- 重试修改或省略服务器发送的 `requestState` 是错误的；必须原样回传。
- 规范要求服务器拒绝验证失败的 `requestState`，但没有规定响应通道。本实验像处理过期 handle 一样，用模型可读取的 tool 执行错误（`isError true`）响应被篡改或过期的 `requestState`，模型可据此重新调用 tool；重新返回新的 `input_required` 结果再次询问也同样有效。
- 若服务器保持原调用打开，并沿流推送 `elicitation/create`，它实现的是 SEP-2322 所取代的 2026-07-28 之前模式。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 7 节和第 11 节。
