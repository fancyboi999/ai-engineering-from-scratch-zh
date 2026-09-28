# 威胁控制矩阵

这是一份面向 MCPA“安全与治理”领域、与 MCP 2026-07-28 对齐的一页式参考资料。它列出了授权正确、无状态的部署仍会面对的十种威胁、各自的应对控制，以及查找实现机制的位置。

## 十种威胁

| 威胁 | 表现形式 | 控制 | 查阅位置 |
|---|---|---|---|
| 元数据投毒 | 工具描述或注解嵌入了与工具实际功能无关的指令 | 把描述和注解当作不可信输入；注册时和每次变更时扫描 | 本课，`scan_for_injection` |
| 通过结果进行 prompt 注入 | 成功的 CallToolResult 携带用于重定向模型的文本 | 像对待描述一样把结果视为不可信；不要给予服务器输出高于其元数据的信任 | Security best practices，tool results |
| Rug pull | 此前批准的名称、描述、schema 或注解发生变化，通常保持名称不变 | 对完整描述符进行哈希固定；任何变化都要隔离并等待复审，不能只检查名称 | 本课，`RiskGateway.observe` 和 `approve` |
| 工具遮蔽 | 两台服务器暴露相同的非限定工具名，发现顺序静默选中其中之一 | 用稳定的服务器标识符为聚合名称加前缀；绝不按到达顺序解决冲突 | 第 06 课（hosts、clients、servers），第 09 课（清单审核） |
| 混淆代理 | 代理服务器受骗，替攻击者使用自身受委托的权限 | 转发到第三方授权服务器前取得各客户端的同意；绝不单独信任静态 client id | Authorization security considerations，Confused Deputy Problem |
| Token 透传 | 处理器把客户端限定给 MCP 的 bearer token 转发给无关的上游 API | 验证 token 受众；签发单独限定给上游的凭据；绝不转发入站 token | 本课，`RiskGateway.call` 上游检查；authorization 第 12 节 |
| `requestState` 篡改 | 客户端本应原样返回的不透明 MRTR 状态遭到修改，从而改变服务器行为 | 使用 HMAC 或 AEAD 保证完整性，绑定主体、短有效期和原请求摘要，并由服务器强制单次使用 | 第 14 课（MRTR），MRTR Security Considerations |
| SSRF（CIMD 获取、网络 `$ref`） | 盲目获取服务器提供的 URL，例如 Client ID Metadata Document 或 schema `$ref` | 默认绝不自动解引用网络 URI；选择加入的获取必须经过允许列表、私有地址拦截、HTTPS 和超时 | 本课，`find_network_ref`；security best practices，SSRF |
| DNS 重绑定 | 主机名在验证时解析到安全地址，在请求时却解析到内部地址 | 验证 Origin；把本地 HTTP 服务器绑定到回环地址，而不是信任 Host 标头 | 第 19 课（transports 和 HTTP headers），Streamable HTTP security |
| 供应链漂移 | 注册表条目、软件包版本或运行端点在准入后各自独立变化 | 根据已认证所有者验证命名空间，按摘要固定，准入后重新观察实时服务器 | 第 30 课（`phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift`） |

## 三种拒绝通道

| 情况 | 通道 | 示例 |
|---|---|---|
| 请求本身格式错误 | JSON-RPC 协议错误 | 未知工具：`-32602` |
| 拒绝原因是策略，而非请求结构 | 带 `isError: true` 的正常结果 | 触发速率限制、工具因 rug pull 暂扣、token 透传尝试 |
| 确实需要应用自定义代码 | 位于 `-32768` 到 `-32000` 范围之外的应用自定义代码 | 很少需要；优先使用 `isError` |

绝不发送 `-32000` 到 `-32019`（旧式区段）、`-32002` 或 `-32042`（已退役），也不能使用 `-32020` 到 `-32099` 中未定义的代码（该区段留给规范）。模型应读取的策略拒绝属于 `isError`，而不是杜撰的协议错误码。

## 工作清单

- 批准时按哈希固定每个工具的完整描述符（名称、描述、inputSchema、注解），不能只固定描述。
- 每条描述和每个结果进入模型前，都要扫描其中嵌入的指令；命中只触发审核，不能直接当作自动裁决。
- 用稳定的服务器标识符为聚合工具名加前缀，防止服务器之间相互遮蔽。
- 验证每个入站 token 的受众；绝不原样转发到上游；签发单独限定给上游的凭据。
- 把 `requestState` 当作攻击者可控数据：签名或加密，绑定主体、有效期和请求摘要，并在服务器端强制单次使用。
- 没有显式允许列表和私有、链路本地地址拦截时，绝不自动解引用网络 URI（CIMD 获取、schema `$ref`、重定向目标）。
- 验证 `Origin`，并把本地 HTTP 服务器绑定到回环地址，从而封堵 DNS 重绑定。
- 只接受来自服务器自身 origin 的 `https:` 或 `data:` 图标 URI，并把 SVG 当作可执行内容。
- 根据已认证所有者验证注册表命名空间，按摘要固定软件包和远程来源，并在准入后重新观察实时服务器。
- 为每次自动拒绝选择正确通道：格式错误请求用 `-32602`，策略拒绝用 `isError: true`，绝不杜撰 `-32000` 到 `-32099` 中的代码。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 13 节。
