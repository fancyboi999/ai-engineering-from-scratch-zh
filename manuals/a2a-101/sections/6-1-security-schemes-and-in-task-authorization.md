# 安全方案与任务内授权

> 卡片声明 agent 接受哪些凭据，HTTP 在每次请求检查它们，运行中的任务仍可停下来请求批准。

planner 最后一次委派发给 `deployer`，它是套件中唯一保护端点的 agent。无 token 请求在 A2A 方法运行前得到 HTTP 401。带 token 的请求启动部署，却又在 `TASK_STATE_AUTH_REQUIRED` 停下，直到操作员批准。

[此图](#fig-credential-path)跟踪从卡片到批准的凭据路径。读完本节后，你可以读取卡片安全字段，发送所需内容，并将任务限定在拥有者范围内。

```figure
id: fig-credential-path
kind: flow
title: 从卡片到任务内批准的一份凭据
claim: 卡片指定方案，HTTP 在 A2A 运行前拒绝无 token 请求，运行中的任务仍可停下来等待批准。
caption: 分五步从上到下读。从步骤 2 起，左框是 planner 发送内容，右框是 deployer 回答。灰框在 A2A 之外。任务 ID 缩短至 8 个字符。来自 capture/out/01-agent-cards.http、18-extended-card.http 和 07-auth-required.http。
```

## 卡片声明什么 {#s-security-schemes-and-in-task-authorization-what-the-card-declares}

只有 deployer 卡片带安全字段，因此 `test-runner` 和 `code-reviewer` 接受任何调用者。

```listing
title: deployer 卡片上的安全字段
source: capture/out/01-agent-cards.http
lang: json
note: 截自 deployer 卡片。两字段位于 capabilities 与 defaultInputModes 之间。
---
  "securitySchemes": {
    "bearer": {
      "httpAuthSecurityScheme": {
        "description": "A token issued by the platform team.",
        "scheme": "Bearer"
      }
    }
  },
  "securityRequirements": [
    {
      "schemes": {
        "bearer": {
          "list": []
        }
      }
    }
  ],
```

**安全方案：** 卡片 `securitySchemes` 映射中的条目。键由 agent 自选，此处为 `bearer`。值恰好包含五种变体之一：`apiKeySecurityScheme`、`httpAuthSecurityScheme`、`oauth2SecurityScheme`、`openIdConnectSecurityScheme`、`mtlsSecurityScheme`。 {{proto SecurityScheme}}

**安全要求：** `securityRequirements` 中的条目。其 `schemes` 映射引用 `securitySchemes` 中的方案名，每个名称映射到所需 scope，以仅含 `list` 字段的 `StringList` 保存。deployer 用空 `list` 指定 `bearer`，只需 token 即可。 {{proto SecurityRequirement}}

§8.5 示例卡片仍写 `security`，proto 则写 `securityRequirements`（[冲突 D6](#s-ref-sources)）。迁移指南称 implicit 和 password 流程已删除，proto 则保留并标为弃用（[冲突 D11](#s-ref-sources)），因此两者都不要提供。 {{spec §8.5}} {{docs whats-new-v1}} {{proto OAuthFlows}}

## 凭据如何传输 {#s-security-schemes-and-in-task-authorization-how-credentials-travel}

客户端在 A2A 之外获取凭据，每次请求通过适合协议的头或 metadata 发送。头包含秘密，生产部署 `MUST` 使用加密通信：HTTP 绑定用 HTTPS，gRPC 用 TLS。规范建议 TLS 1.3 或更高，企业指南却写 TLS 1.2 或更高（[冲突 D18](#s-ref-sources)）。 {{spec §7.3}} {{spec §7.1}} {{docs enterprise-ready}}

没有凭据时，`deployer` 在 A2A 方法运行前返回 HTTP 401 和 `WWW-Authenticate` challenge，见[扩展卡片与签名](#s-extended-cards-and-signatures)。

```rule
label: 每次请求对照卡片检查
source: spec §7.4
---
服务端必须根据随请求提供的凭据和声明的认证要求验证每个请求。
```

## 授权范围：看不到的任务就不存在 {#s-security-schemes-and-in-task-authorization-authorization-scope-a-task-you-cannot-see-does-not-exist}

授权逻辑由实现决定。规范固定拒绝形式：服务器 `MUST NOT` 暴露客户端无权访问的资源是否存在。因此其他调用者的任务与从未存在的任务都返回 `TaskNotFoundError`。同一节又将访问另一用户创建的任务列为授权错误的情形，这反而确认任务存在（[冲突 D36](#s-ref-sources)）。应返回未找到错误。 {{spec §7.5}} {{spec §3.3.2}}

检查须先行：授权检查 `MUST` 在任何数据库查询或可能泄露信息的操作之前发生。`ListTasks` 即使没有过滤条件也必须将结果限定为调用者可见范围。SDK 对拥有者的定义不同： {{spec §13.1}}

| 实现 | 拥有者范围 | 另一调用者的任务 |
|---|---|---|
| 套件 | 无，deployer 只要求一个共享 bearer token | 返回 |
| a2a-python 1.2.2 | 任务存储以调用上下文 `user_name` 为键，所有未认证调用者都是空名称 | `TaskNotFoundError`  {{sdk src/a2a/server/owner_resolver.py}}  {{sdk src/a2a/auth/user.py}} |
| a2a-js 1.3.0 | 每个存储都包含 tenant 和 owner，匿名调用者为 `unknown` | `TaskNotFoundError`  {{sdk-js src/server/owner_resolver.ts at v1.3.0}} |
| a2a-java 1.4.0.Final | 有 `TaskAuthorizationProvider` 接口，此发布版没有实现，未提供实现时所有任务操作默认拒绝 | `TaskNotFoundError`  {{sdk-java server-common/src/main/java/org/a2aproject/sdk/server/auth/TaskAuthorizationProvider.java at v1.4.0.Final}} |
| a2a-go 2.6.0 | 内存存储记录调用用户名，空名称使 `ListTasks` 以 `ErrUnauthenticated` 失败 | 名称设置后为 `ErrTaskNotFound`  {{sdk-go a2asrv/taskstore/inmemory.go at v2.6.0}} |
| a2a-dotnet 1.0.0-preview2 | 无，存储和处理器不带 principal | 返回  {{sdk-dotnet src/A2A/Server/ITaskStore.cs at v1.0.0-preview2}} |
| a2a-rs a2a-server-lf-v0.5.1 | 存储中没有，可选 `RequestAuthorizer` 只看到头和任务 ID | 返回  {{sdk-rust a2a-server/src/handler.rs at a2a-server-lf-v0.5.1}} |

没有填入用户的认证中间件时，每个任务对每个调用者都可见。

## 任务内授权 {#s-security-schemes-and-in-task-authorization-in-task-authorization}

**任务内授权：** agent 在任务中途通过 `TASK_STATE_AUTH_REQUIRED` 请求权限，[中断态](#s-input-required-and-auth-required)逐帧跟踪。套件 `POST /approve/<task id>` 不检查凭据，获知任务 ID 的任何人都能批准。真实批准渠道认证操作员并记录批准者。 {{spec §7.6}}

客户端自身是 agent 时，可沿一串任务将请求向上传递，均设为 `TASK_STATE_AUTH_REQUIRED`。通过链内传递的凭据会经过每个 agent，因此将其绑定到请求它的 agent，使只有该 agent 能使用。 {{spec §7.6.2}} {{spec §7.6.3}}

[PR #2081](https://github.com/a2aproject/A2A/pull/2081)于 2026-07-30 在 v1.0.1 之后给 main 添加 §7.6.4，尚无发布版包含。它要求 agent `MUST NOT` 把进入 TASK_STATE_AUTH_REQUIRED 本身视为任何具体操作的授权。除非实现、签发者或扩展另有规定，此处获得的凭据不授权后续消息。套件按任务 ID 记录每次批准，一次批准只恢复一次部署，后续每次请求仍检查 bearer。 {{spec-main §7.6.4}}

```takeaways
- 每次请求在 HTTP 头发送 `securityRequirements` 指定的凭据。
- 对调用者无权查看的每个任务返回 `TaskNotFoundError`。
- 将 `TASK_STATE_AUTH_REQUIRED` 的每次批准送入认证操作员的渠道。
- 将批准限定为一个任务，后续每条消息重新检查授权。
```

Sources: spec §3.3.2, §7.1, §7.3, §7.4, §7.5, §7.6, §7.6.2, §7.6.3, §8.5, §13.1 (research/sources/specification.md); spec-main §7.6.4 (research/sources/specification-main.md, main 679ab3a, unreleased); proto SecurityScheme, SecurityRequirement, StringList, OAuthFlows (research/sources/a2a.proto); docs/topics/enterprise-ready.md and docs/whats-new-v1.md at v1.0.1; sdk src/a2a/server/owner_resolver.py, src/a2a/auth/user.py, src/a2a/server/tasks/inmemory_task_store.py at a2a-python 1.2.2; sdk-js src/server/owner_resolver.ts at v1.3.0; sdk-java server-common/src/main/java/org/a2aproject/sdk/server/auth/TaskAuthorizationProvider.java at v1.4.0.Final; sdk-go a2asrv/taskstore/inmemory.go at v2.6.0; sdk-dotnet src/A2A/Server/ITaskStore.cs at v1.0.0-preview2; sdk-rust a2a-server/src/handler.rs at a2a-server-lf-v0.5.1; a2aproject/A2A PR #2081 (unreleased, on main); capture/out/01-agent-cards.http, 07-auth-required.http, 18-extended-card.http; capture/planner.py, capture/a2a_ref.py, capture/README.md
