---
id: mcp-security-auth
title: MCP 安全与授权
code: SA
subtitle: 排查 token 拒绝、工具元数据投毒与内容注入。速查 CIMD、PKCE、iss、受众和 PVE 检查。
hue: 350
sources: phases/13-tools-and-protocols/15-mcp-security-tool-poisoning, phases/13-tools-and-protocols/16-mcp-security-oauth-2-1, phases/13-tools-and-protocols/18-mcp-auth-production, phases/14-agent-engineering/27-prompt-injection-defense
source_hash: 75631233397b1ed8
---

## token 拒绝
type: troubleshooting
from: phases/13-tools-and-protocols/18-mcp-auth-production/code/main.py, phases/13-tools-and-protocols/18-mcp-auth-production/docs/zh.md, phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 401 `malformed` | token 无法解码 | 在 `Authorization` 中发送有效 JWT |
| 401 `iss not allowed` | 签发方不在 `allowed_issuers` 中 | 仅信任 `authorization_servers` 中的签发方 |
| 401 `unknown kid` | 重新获取一次后仍缺少密钥 | 修复 JWKS 刷新任务 |
| 401 `bad signature` | 签名验证失败 | 拒绝，不设兜底 |
| 401 `audience mismatch` | token 面向其他资源 | 请求时携带本资源的 `resource` |
| 401 `expired` | `exp` 已过期 | 获取新 token |
| 403 `insufficient_scope` | 工具需要更大权限范围 | 合并 scope 后升级授权，使用新标识 |
| 换密钥后有效 token 失败 | JWKS 缓存过期 | 定时刷新，未命中时额外获取一次 |

## 网关与内容检查发现
type: troubleshooting
from: phases/13-tools-and-protocols/15-mcp-security-tool-poisoning/code/main.py, phases/13-tools-and-protocols/15-mcp-security-tool-poisoning/docs/zh.md, phases/14-agent-engineering/27-prompt-injection-defense/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `metadata_poisoning` 发现 | 描述命中扫描规则 | 阻止并审查完整描述符 |
| `rug_pull` 发现 | 已批准描述符发生变化 | 隔离，直到重新批准 |
| `unapproved` 发现 | 该键没有批准过的摘要 | 隔离，直到审查 |
| `shadowing` 发现 | 两台服务器暴露同名工具 | 加命名空间，如 `notes.search` |
| `-32020` | `Mcp-Method` 或 `Mcp-Name` 与正文不符 | 在路由、RBAC 和限流前拒绝 |
| 表单请求返回 `-32021` | 客户端只声明 URL 引导支持 | 声明 `elicitation` 表单支持 |
| 确认后重试被拒 | `requestState` 绑定了其他参数 | 请求新确认 |
| Agent 服从网页指令 | 检索内容没有来源标签 | 标记内容并校验每次工具调用 |

## 资源服务器的校验顺序
type: flow
from: phases/13-tools-and-protocols/18-mcp-auth-production/code/main.py

1. **解码**：`jwt_decode` 失败，返回 401 malformed。
2. **签发方**：`iss` 不在 `allowed_issuers` 中，在获取 JWKS 前返回 401。
3. **密钥**：在 `jwks_cache` 中查找 `kid`，未命中则调用一次 `refresh_jwks`。
4. **签名**：`jwt_verify` 失败，返回 401 bad signature。
5. **受众**：`aud` 不是本资源，返回 401 audience mismatch。
6. **有效期**：`exp` 已过期，返回 401 expired。
7. **权限范围**：缺少所需 scope，返回 403 `insufficient_scope` 并附带 scope。

## 使用 PKCE 的授权码流程
type: flow
from: phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/docs/zh.md, phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/code/main.py

1. **客户端**：获取受保护资源元数据，选择声明的签发方。
2. **客户端**：用 `pkce_pair` 生成 `code_verifier` 及其 S256 `code_challenge`。
3. **客户端**：发送 `client_id`、`redirect_uri`、`scope`、`code_challenge` 和 `resource`。
4. **授权服务器**：返回 `code` 和 `iss`。
5. **客户端**：精确比较 `iss` 与记录的签发方，不匹配则丢弃响应。
6. **客户端**：使用 `code_verifier`、相同重定向 URI 与 `resource` 交换授权码。
7. **客户端**：在 `tokens_by_issuer_resource` 中按 `(issuer, resource)` 存储 token。

## 代码任务
type: task-table
from: phases/13-tools-and-protocols/15-mcp-security-tool-poisoning/code/main.py, phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/code/main.py, phases/13-tools-and-protocols/18-mcp-auth-production/code/main.py, phases/13-tools-and-protocols/18-mcp-auth-production/docs/zh.md

| 任务 | 代码 |
|---|---|
| 固定完整描述符 | `descriptor_digest(tool)` |
| 对照固定摘要扫描目录 | `scan_catalog(catalog, approved)` |
| 扫描一个描述 | `scan_description(description)` |
| 生成 PKCE 对 | `verifier, challenge = pkce_pair()` |
| 403 时升级权限范围 | `client.call_with_step_up(tool, server, auth)` |
| 校验 bearer token | `server.validate(bearer_token, required_scope=<s>)` |
| 重新获取密钥集 | `server.refresh_jwks()` |
| 运行课程测试 | `python3 -m unittest discover code/tests -v` |

## PVE：先校验后执行
type: annotated-code
lang: python
from: phases/14-agent-engineering/27-prompt-injection-defense/code/main.py

```python
validator = Validator(
    allowed_tools=("search", "send_message", "read_memory"),
    sensitive_tools=("send_message",))
call = ToolCall("search", {"query": "<query>"}, intent="research")
contents = [Content("<text>", "user_message")]  # 不扫描用户文本
ok, reason = validator.assess(call, contents)   # 允许列表、参数、检索文本
if ok:
    executor.run(call)                          # 仅批准后运行
looks_like_directive("<text>")                  # 首个命中标记或 None
memory_write_guard(MemoryWrite("<text>"))       # 拒绝指令形态的写入
```

## 客户端注册路径
type: comparison
from: phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/docs/zh.md, phases/13-tools-and-protocols/18-mcp-auth-production/docs/zh.md

| 因素 | 预注册 | CIMD | DCR |
|---|---|---|---|
| 状态 | 存在时优先用 | 推荐 | 已弃用的兜底 |
| 客户端标识 | 由运营方提供 | 带路径的 HTTPS URL | 由 `POST /register` 生成 |
| AS 信号 | 已知关系 | `client_id_metadata_document_supported` | `registration_endpoint` |
| `application_type` | 非必需 | 可选 | 必需：`native` 或 `web` |
| 新签发方 | 新凭证 | URL 可继续使用 | 重新注册 |
| 主要风险 | 在新签发方处复用 | 获取时 SSRF | 注册滥用、token 窃取 |

## 七个攻击面
type: concepts
from: phases/13-tools-and-protocols/15-mcp-security-tool-poisoning/docs/zh.md

- **元数据投毒**：描述中包含与工具无关的指令。
- **描述符暗改**：已批准的名称、描述、模式或注解发生变化。
- **跨服务器遮蔽**：两个后端暴露相同的非限定名称。
- **请求头与正文混淆**：`Mcp-Method` 或 `Mcp-Name` 与正文不符。
- **能力提权**：把声明的功能当成授权。
- **MRTR 状态篡改**：更改 `requestState` 或复用确认。
- **身份混淆**：把熟悉的显示名当成发布者证明。

## 规则
type: tips
from: phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/docs/zh.md, phases/13-tools-and-protocols/18-mcp-auth-production/docs/zh.md, phases/13-tools-and-protocols/15-mcp-security-tool-poisoning/docs/zh.md

- 每次请求都在 `Authorization` 请求头中发送 bearer token，绝不放在 URL 中。
- 不为本地 stdio 服务器添加 OAuth 流程。
- 不把 MCP token 转发给下游 API，应获取独立 token。
- 精确比较 `iss`，不改变大小写、斜杠或端口。
- 资源服务器刷新 JWKS；只有授权服务器轮换密钥。
- 内省服务不可用时默认拒绝，网络故障绝不等于 `active: true`。
- 二选三规则：同一步不得同时包含不可信输入、敏感数据和外部操作。

## 问答
type: qa
from: phases/13-tools-and-protocols/15-mcp-security-tool-poisoning/docs/zh.md, phases/13-tools-and-protocols/18-mcp-auth-production/docs/zh.md, phases/14-agent-engineering/27-prompt-injection-defense/docs/zh.md

- **`clientInfo` 是身份吗？** 不是，它是自报信息。
- **固定哈希能证明工具安全吗？** 不能，只证明稳定性。
- **PKCE 能阻止混淆攻击吗？** 不能，客户端必须校验 `iss`。
- **客户端能力授予访问权吗？** 不，只声明兼容性。
- **prompt 中写“忽略不可信指令”够吗？** 不够，这不属于强制执行。

## 缩写
type: glossary
from: phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/docs/zh.md, phases/13-tools-and-protocols/18-mcp-auth-production/docs/zh.md, phases/14-agent-engineering/27-prompt-injection-defense/docs/zh.md

- **CIMD**：客户端 ID 元数据文档，其 HTTPS URL 即客户端标识。
- **DCR**：动态客户端注册，RFC 7591，已弃用。
- **PKCE**：通过 verifier 与 S256 challenge 保护授权码。
- **JWKS**：JSON Web 密钥集，从 `jwks_uri` 获取，以 `kid` 索引。
- **RFC 9728**：受保护资源元数据，列出授权服务器。
- **RFC 8707**：资源指示符，将 token 绑定到一个 MCP 资源。
- **RFC 9207**：授权响应中的 `iss`，阻止混淆攻击。
- **PVE**：Prompt-Validator-Executor，在主模型前放置低成本校验器。
