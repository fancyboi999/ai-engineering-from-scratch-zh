# 发现、路由并信任服务器

> registry 中的名称只证明谁发布了服务器，不保证服务器会做什么。gateway 决定请求是否有资格到达服务器。SDK tier 表明该实现究竟覆盖了多少协议。三个独立问题，三份独立答案。

**类型：** Reference
**语言：** Python
**前置要求：** 第 31 课
**预计时间：** 约 45 分钟

## 学习目标

- 说明 MCP Registry 保存什么、刻意不保存什么，为什么只接收公开可访问的服务器，以及为什么它目前仍是 preview 服务
- 像 registry 一样通过 GitHub 或域名身份验证来核验服务器的反向 DNS 命名空间，并将其与包 registry 检查的所有权证明区分开
- 读取 server.json 条目中的 packages 与 remotes，并说明其 schema version 为什么独立于服务器运行时实际使用的 protocol version
- 说明无状态 gateway 的职责：根据请求体校验 Mcp-Method 和 Mcp-Name、按这组 header 路由，并遵守 cacheScope，而不是自行创造缓存权限
- 把 SDK conformance tier 用作可移植性和信任信号，并说明 tier 如何获得、又如何失去

## 问题背景

某团队决定在内部助手中加入第三方 MCP 服务器，马上会遇到三个不同问题，而且它们没有共同答案。团队去哪里寻找候选服务器？如何确认服务器使用的发布名称确实属于它所声称的公司，而不是先在表单里输下名称的人？服务器获批后，如何让所有内部客户端都通过同一个入口访问，并在一处执行“谁能调用什么”的规则，同时又不让这个入口变成第二套解析器，为了路由而完整理解每个请求体？团队准备自行构建服务器、不再只做消费者时，面对两年内变化四次的协议，又该选择哪个 SDK？

这三个问题分别对应协议外围的三类基础设施，而不是协议自身：MCP Registry、gateway 和 SDK tiering system。人们很容易把它们看成一条连续供应链——发布到 registry，经 gateway 路由，然后信任 SDK——但每层只证明一件狭窄且不同的事。考试要考的，正是某层保证在何处结束，下一层又从哪里开始。registry 证明谁发布了某个名称。它不扫描该名称背后的代码是否存在漏洞，也不会运行服务器检查行为。gateway 证明请求格式正确且获准继续，但不知道后端最初是谁发布的，更不会为发布者背书。SDK tier 是关于某个实现的维护与完整性信号，与使用该 SDK 构建的具体服务器、具体发布条目都无关。混淆三者，正是“用例与生态系统”领域常见的场景题。

## 核心概念

### Registry：存元数据，不存代码

MCP Registry 是官方集中托管的公开 MCP 服务器元数据索引，并明确处于 preview 阶段：维护者警告，在正式可用前可能发生破坏性变更或数据重置。它为每个发布版本保存一份 `server.json` 文档，包含反向 DNS 名称、标题与描述、版本字符串，以及 `packages` 数组、`remotes` 数组或两者。registry 从不托管服务器本身。`packages` 条目会指定 `registryType`（`npm`、`pypi`、`nuget`、`cargo` 或 `oci`，以及用于预构建二进制发布的 `mcpb`）和 `identifier`，实际产物由 npm、PyPI 或 Docker Hub 等包 registry 提供。`remotes` 条目指定传输方式——`streamable-http` 或已弃用的 `sse`——以及服务器直接响应的 URL；还可包含用于多租户 URL 模板的 `variables`，以及客户端必须发送的 `headers`。同一条目可同时包含两类位置，由 host 选择偏好的安装方式。

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.acme/weather-mcp",
  "title": "Weather",
  "version": "1.0.0",
  "packages": [
    {"registryType": "npm", "identifier": "@acme/weather-mcp", "version": "1.0.0", "transport": {"type": "stdio"}}
  ],
  "remotes": [
    {"type": "streamable-http", "url": "https://weather.acme.example/mcp"}
  ]
}
```

注意 `$schema` 字段：示例中的 `2025-12-11` 是 schema revision，描述 `server.json` 自身的结构。它与运行中服务器通过客户端调用 `server/discover` 在线路上协商的 MCP protocol version `2026-07-28` 毫无关系。registry 条目可以按照更新或更旧的 schema revision 通过校验，而背后的服务器可以使用它选择的任意 protocol version；两个日期完全独立地跟踪和版本化。把它们当成同一事实，正是场景题常设的陷阱。

名称本身就是 registry 的信任机制。名称采用反向 DNS 格式：通过 GitHub 验证的发布者使用 `io.github.username/server` 或 `io.github.orgname/server`；证明自己控制 `example.com` 域名的发布者使用 `com.example/server`，证明方式可以是 DNS TXT 记录，也可以是 well-known 路径下的 HTTP 文件。这种命名空间身份验证会阻止无关方冒用公司名称发布服务器：每次发布时，registry 只接受已经证明拥有对应 authority 的发布者使用该名称。这项检查独立于包 registry 对底层产物执行的所有权检查：npm 检查 `package.json` 中的 `mcpName` 字段；PyPI、NuGet 和 Cargo 检查渲染后 README 中的 `mcp-name: name` 字符串（Cargo 要求它是可见文本，因为 crates.io 会移除 PyPI 和 NuGet 能保留的 HTML 注释）；Docker 或 OCI image 检查 `io.modelcontextprotocol.server.name` label。两份证明缺一不可：一份证明 registry 中名称的所有权，一份证明名称所指产物的所有权，而且两者必须都与 `server.json` 一致，条目才值得信任。

版本也有一套值得熟记的窄规则。每次发布的版本字符串必须唯一，发布后不可更改；推荐使用 semantic versioning，registry 可据此自动把条目标记为“latest”。看起来像版本范围而非单一精确版本的字符串——`^1.2.3`、`~1.2.3`、`>=1.2.3` 或 `1.x`——一律禁止，因为 registry 无法把范围解析为唯一产物。registry 对收录对象也刻意设限：只接收公开可访问的服务器，也就是包位于公开包 registry，或 remote URL 可从公网访问。只能在私有网络或私有包 feed 中访问的服务器不能发布在这里；有此需求的团队应自行运行实现相同公开 OpenAPI interface 的 registry。安全扫描被委托给底层包 registry 与下游 aggregator，registry 自身采取相对宽松的管理策略：删除非法内容、恶意软件、垃圾信息和无法工作的服务器，但明确不会仅因服务器质量低、存在 bug、存在漏洞或与其他服务器重复而下架。host 应用也不应直接查询官方 registry，而应使用下游 aggregator 或 marketplace。后者按较低频率轮询 registry 的只读 REST API，保存自己的副本，并可在其上增加策展、评分或安全扫描。

### Gateway：按线路路由，不为信任背书

Gateway 位于一个或多个后端 MCP 服务器之前，为其后的所有客户端提供单一 MCP endpoint。无状态核心移除了 session，gateway 不再需要像 session-aware 设计那样把客户端固定到某个后端 replica；任何健康实例都可以处理任何自包含请求，这与第 04 课中 replica 自由交换请求的保证相同。gateway 真正需要的是快速判断请求应前往何处，以及是否允许前往。第 19 课介绍的 Streamable HTTP header mirror 正是为此设计。每个 POST 都携带 `MCP-Protocol-Version` 和 `Mcp-Method`；对于 `tools/call`、`resources/read` 和 `prompts/get`，还会带 `Mcp-Name`。gateway 可读取这些 header 来选择路由并执行策略，无需在快速路径上先反序列化并完整理解 JSON-RPC body。

Header 是路由捷径，绝不是第二份事实来源。在 gateway（或其后的后端）把请求视为有效之前，必须确认 header 值与相应 body 字段一致：`Mcp-Method` 对应 `method`，`Mcp-Name` 对应 `params.name` 或 `params.uri`，`MCP-Protocol-Version` 对应 `params._meta["io.modelcontextprotocol/protocolVersion"]`。任何不一致都必须在查询后端前，以 `HeaderMismatch`、错误码 `-32020`、HTTP `400` 拒绝。跳过检查绝非无伤大雅的捷径：如果 gateway 按 header 路由，却按 body 执行，攻击者就能让系统记录并限流一个工具，实际却运行完全不同、更敏感的工具。

```http
POST /mcp HTTP/1.1
MCP-Protocol-Version: 2026-07-28
Mcp-Method: prompts/get
Mcp-Name: lookup_account

{"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {"name": "lookup_account", "arguments": {"accountId": "acct-1"}, "_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {}}}}
```

```json
{"jsonrpc": "2.0", "id": 7, "error": {"code": -32020, "message": "Header mismatch: Mcp-Method", "data": {"headers": ["Mcp-Method"]}}}
```

gateway 的其他职责也遵循同一纪律：添加策略，但不创造协议从未授予的权限。它执行“哪个 principal 能访问哪个后端和工具”，且不会重新发出旧式 `-32000` 至 `-32019` 错误码，也不会在规范已定义内容之上，擅自在 `-32020` 至 `-32099` 保留区间内发明新错误码。转发可缓存结果——`server/discover`、`tools/list`、`prompts/list`、`resources/list`、`resources/templates/list` 或 `resources/read`——时，必须原样传递 `ttlMs` 与 `cacheScope`，因为调用客户端依赖这些提示。考试最爱考的细节就在 `cacheScope`：`"private"` 结果即使请求看起来完全相同，也绝不能跨调用方复用；`"public"` 结果则可以自由共享。gateway 自己的缓存只是叠加在源服务器提示之上的优化，不能因为共享方便就擅自把 private 提升为 shared。每个 private 缓存条目必须按已认证调用方分区，不能只按请求结构分区。最后，gateway 不能终止某个调用方的 token，再在调用上游时签发或复用另一个 token；协议禁止 token passthrough，原因与其他位置相同，第 23 课已有完整介绍。gateway 可以按调用方身份记录日志或划分缓存，但仍不得把该身份放入转发给后端的 JSON-RPC message。

### SDK tier：可移植性信号，不是安全扫描

本课程中的每个服务器或客户端都基于某个 SDK 编写。SDK Tiering System 用来衡量某个 SDK build 是否适合承载长期基础设施。Tier 1 要求：自动化 conformance test suite 通过率 100%；在下一版规范发布前或同步交付新 protocol feature；两个工作日内完成 issue triage（确认并加标签，不一定立即修复）；七天内修复 critical severity bug；至少有一个稳定、非 prerelease 版本，并记录 breaking change policy；提供全面文档、公开的依赖更新策略与 roadmap。Tier 2 要求：80% conformance；六个月内支持新功能；一个月内完成 triage；两周内修复 critical bug；至少一个稳定版本；基础文档；以及迈向 Tier 1 的计划，或明确说明为何停留 Tier 2。Tier 3 对这些指标均无最低要求：实验性、部分实现或高度专用的 SDK 都可处于此级别，无需承诺时间表。Tasks 或 MCP Apps 等扩展从不属于任何 tier 的必需项；扩展本就按设计选择启用，因此 SDK 即使不实现某项扩展，也可以是完整符合核心协议的 Tier 1 实现。

Tier 不是一次性证书。conformance 会持续针对当前 stable release 衡量：某 SDK 连续四周在任一 conformance test 上失败，会从 Tier 1 降至 Tier 2；连续四周超过 20% 的测试失败，会从 Tier 2 降至 Tier 3；issue 两个月未解决也可能触发降级。升级则反向进行：维护者依据公开要求自评，提交带证明材料的 issue，通过自动化 conformance suite，并获得 SDK Working Group 批准。这又连接回第 02 课的 N+M 可移植性论证。线路格式声称合规，不代表 SDK 已正确实现所有必需行为；Tier 2 或 Tier 3 SDK 可能静默错误处理 `_meta`、漏掉必需 header，或在第 14 课介绍的 MRTR retry 中行为异常。跨客户端可移植性不是一张预先背诵的固定表，而是需要在运行时和构建时共同检查的两件事：第 07 课中客户端在 `server/discover` 上做出的逐请求能力声明，以及你依赖的客户端或服务器背后实际 SDK 的 tier。

```figure
mcpa-32-registry-flow
```

## 交互实验

图中追踪一台服务器从发布到实际调用的过程。左侧，已经证明命名空间所有权的发布者提交 `server.json`；只有命名空间检查与仅限公开服务器检查都通过，registry 才会接收。aggregator 按自己的时间表轮询 registry，再向 host 应用重新发布，方向绝不相反。右侧，客户端发往 gateway 的请求同时在 body 外携带 `Mcp-Method` 与 `Mcp-Name`；gateway 的 header—body 检查分成两路：一致时进入正确后端，不一致时在触碰任何后端前变成 `-32020`。下方三个 tier badge 展示本课代码编码为数据的相同 conformance 百分比。从左到右跟随同一个名称，你会看到：正确注册并不会让请求在 gateway 获得特殊待遇。两者是独立门禁。

## 实践实验

打开 `code/main.py`。`admit_to_registry` 用一个小型纯函数模拟 registry 自身的接收检查：使用 `split_namespace` 把声明名称拆成 authority 与 slug；调用发布者从未验证命名空间时拒绝；`visibility` 为 `"private"` 时拒绝；版本字符串被 `looks_like_version_range` 判定为范围时拒绝。分别让发布者针对自己已验证的命名空间运行一次，再让另一个发布者针对同一声明名称运行一次，比较两次的 `reason` 字符串。`resolve_install_target` 按 host 决定如何安装服务器的方式读取 `packages` 或 `remotes` 条目。`schema_version_from_url` 从 `$schema` URL 中提取 schema 日期，让它与 `PROTOCOL_VERSION` 并排展示，同时保持彼此独立。

`Gateway` 类负责真正的 MCP 通信。`call_tool` 和 `read_resource` 构建普通请求，使用 `_headers_for` 计算 Streamable HTTP 客户端会发送的 header，并通过 `self.routes.get(headers["Mcp-Name"])` 路由——使用 header 值本身，而不是再次读取 body。这正是把名称镜像到 header 的全部意义。阅读 `_validate_headers`，确认它会在请求到达后端前检查全部三个字段。再看 `call_tool_with_mismatched_method_header`：它在构建完全有效的 request body 后，只修改 `Mcp-Method` header，并将该日志条目包装在 `"violation"` 下。你会看到 gateway 操作员在线路上看到的内容，紧接着就是真实的 `-32020` 响应。运行场景：`token-alice` 两次读取 private 资源，`token-bob` 再读取相同 URI 后，观察 `accounts.read_count`。结果是二而不是三，因为 alice 第二次命中缓存，bob 没有命中，证明 private 缓存从未跨调用方。再与同样两个调用方读取 public 资源后的 `status.read_count` 比较，结果仍为一。最后，使用该 token 调用 `call_tool` 后，在 `gateway.log` 每项记录中搜索字面量 `"secret-token-value"`；它从不出现，因为 token 只存在于 gateway 自身的缓存分区逻辑中，从未进入转发消息。

```bash
python3 code/main.py
```

## 交付产物

`outputs/registry-and-gateway-guide.md` 是一页式参考资料：registry 接收检查清单、packages 与 remotes 的选择、gateway 路由前必须执行的 header 校验顺序、一句可在考试中直接复述的 cacheScope 规则，以及带降级阈值的 SDK tier 要求表。

## 验证

在课程目录中运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课主张：发布者只有在已经验证的命名空间下才能获准；冒用他人命名空间的声明会被拒绝；即使命名空间已验证，private visibility 服务器也无法进入公开 registry；看起来像范围的版本字符串被禁止；server.json schema version 与 protocol version 是独立事实；`resolve_install_target` 优先使用 remote，没有时回退到 package；gateway 调用会到达 `Mcp-Name` header 指定的后端；header—body 不一致返回 `-32020` 且绝不到达后端；private 资源缓存不会跨两个不同调用方，public 资源缓存则会共享；调用方 token 从不出现在 gateway 转发的 JSON-RPC message 内；SDK tier 表严格按规范作答；降级规则只有在连续四周失败后才触发。仓库线路检查器还会按照 2026-07-28 规则校验本课交互记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/32-registry-gateways-and-sdk-tiers
```

## 综合项目关联

综合项目的端到端交互假定：候选人在发送第一个请求之前，已经找到并合理信任目标服务器。本课把这种信任拆成可检查的部分，而不是模糊感受。综合项目场景要求说明为什么请求到达正确后端时，应指出本课手动构建的同一种 header—body 检查；要求解释为什么缓存结果被复用或没有被复用时，应引用同一条 `cacheScope` 规则；要求判断某实现能否可靠支持完整的 2026-07-28 能力面时，诚实答案取决于其背后 SDK 的 tier，而不是希望。

## 关键术语

| 术语 | 含义 |
|------|---------|
| MCP Registry | 官方、处于 preview 阶段的公开 server.json 条目元数据索引 |
| server.json | registry 条目保存的元数据文档：名称、版本，以及 packages 或 remotes |
| 命名空间验证 | 通过 GitHub 或域名 challenge，证明发布者控制声明名称中的 authority |
| Aggregator | 轮询 registry REST API，并向 host 应用重新发布的下游消费者 |
| Subregistry | 同时为 host 应用实现 registry 自身 OpenAPI interface 的 aggregator |
| Gateway | 位于一个或多个后端之前，逐请求执行路由与策略的单一 MCP endpoint |
| HeaderMismatch | 镜像 header 与 request body 不一致时，gateway 或服务器返回的 `-32020` 错误 |
| cacheScope | 可缓存结果上的 `public` 或 `private` 提示；private 条目绝不能跨调用方 |
| SDK tier | 根据测试结果持续衡量的 conformance 与维护等级（Tier 1、2 或 3） |
| 降级 | SDK 连续四周发生 conformance failure 后降低 tier 的规则 |

## 延伸阅读

- [The MCP Registry](https://modelcontextprotocol.io/registry/about)
- [Registry package types](https://modelcontextprotocol.io/registry/package-types)
- [Registry authentication](https://modelcontextprotocol.io/registry/authentication)
- [Registry aggregators](https://modelcontextprotocol.io/registry/registry-aggregators)
- [SDK tiering system](https://modelcontextprotocol.io/community/sdk-tiers)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 9、10 和 15 节
- `phases/13-tools-and-protocols/17-mcp-gateways-and-registries`，更深入地构建完整 gateway policy engine
