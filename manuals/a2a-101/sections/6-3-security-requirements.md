# 安全要求

> 第 13、14 节列出服务器与客户端 `MUST` 和 `SHOULD` 检查的内容，多数检查针对其他 agent 发来的数据。

planner 从 `code-reviewer` 读取 `review.json`，从 `test-runner` 读取 `test-log.txt` 分块，在 `localhost:41250` 注册 webhook，并向 `deployer` 发送 bearer token。每步跨越双方边界，A2A 没有字段将跨界内容标为安全。规范第 13、14 节规定双方在边界上必须检查什么。

读完本节后，你可以说出各边界适用的规则，以及套件和 SDK 是否满足。[此图](#fig-trust-boundaries)标出套件的六个边界和各自检查。

```figure
id: fig-trust-boundaries
kind: layers
title: 套件的信任边界、威胁与检查
claim: 数据跨越套件系统的六个边界，每个边界都需独立检查，因为 A2A 不将任何承载内容标为安全。
caption: 各行从左到右读：数据在哪里跨界、可能出什么问题、规范要求的检查。行按 planner 遇到的顺序出现。紫色检查属于 planner，蓝色属于远程 agent。来自 capture/out/15-push.http、06-input-required.http、11-errors.http 和 17-signed-card.txt。
```

## 要求及满足情况 {#s-security-requirements-the-requirements-and-who-meets-them}

下表列出 §13、§14 中用 `MUST` 或 `SHOULD` 约束服务器或客户端的每条规则。套件列说明满足或不满足之处。SDK 列在已比较之处给出六个官方 SDK 的对比，并链接到详细讨论章节。

| 规则 | 套件 | SDK |
|---|---|---|
| 服务器 `MUST` 在每个 A2A 协议操作请求上检查授权 | 没有按调用者检查：deployer 用共享 token，另两个接受任何人 | 都不包含认证，拥有者范围不同，见[安全方案](#s-security-schemes-and-in-task-authorization)  {{spec §13.1}} |
| `GetExtendedAgentCard` `MUST` 要求认证 | deployer 每个方法前检查 bearer token | 核心处理器没有检查，见[扩展卡片](#s-extended-cards-and-signatures)  {{spec §13.3}} |
| agent `MUST` 在 webhook 请求中包含认证凭据 | 每次 POST 带 `Authorization: Bearer hook_secret_91d2` | 所有支持推送的 SDK 都有。a2a-go、a2a-rs 只发送 `Bearer` 和 `Basic` 方案，a2a-dotnet 没有发送器  {{spec §13.2}}  {{sdk-go a2asrv/push/sender.go at v2.6.0}}  {{sdk-rust a2a-server/src/push/sender.rs at a2a-server-lf-v0.5.1}}  {{sdk-dotnet src/A2A/Server/A2AServer.cs at v1.0.0-preview2}} |
| agent `SHOULD` 验证 webhook URL 防止 SSRF | 接受 `http://localhost:41250/a2a-events`，因为进程都在同机 | a2a-go、a2a-rs、a2a-java 默认拒绝私有主机。a2a-python 有可选验证器，研究笔记未记录 a2a-js 有检查  {{spec §13.2}}  {{sdk-java server-common/src/main/resources/META-INF/a2a-defaults.properties at v1.4.0.Final}}  {{sdk src/a2a/utils/push_url_validator.py}} |
| agent `SHOULD` 给 webhook 请求合理超时，`SHOULD` 实施重试 | 10 s，不重试 | a2a-js 5 s，a2a-go、a2a-rs 30 s，a2a-python、a2a-java 用 HTTP 客户端默认值，均不重试  {{spec §13.2}} |
| 客户端 `MUST` 用提供的认证凭据验证 webhook 真实性 | planner 接收器只记录头，不检查 | 未比较，[推送通知](#s-push-notification-configs)列出接收器职责  {{spec §13.2}} |
| 客户端 `SHOULD` 对每个推送配置使用唯一、单用途 token | 每次运行一个 token，读取以明文返回 | 参考 SDK 也明文返回存储凭据，见[推送通知](#s-push-notification-configs)  {{spec §13.2}} |
| agent `MUST` 在处理前验证全部输入参数，`SHOULD` 清理或验证文件内容类型，拒绝意外媒体类型 | 缺失字段返回 `-32602` 和 `BadRequest` 详情，`code-reviewer` 拒绝 `image/png` 的 `url` part | 参考 SDK 媒体类型检查默认关闭，见套件 README  {{spec §13.4}} |
| 实现 `MUST` 清理用户提供的内容以防注入攻击 | planner 只根据有类型的数据字段决策 | 未比较  {{spec §14.1.1}} |
| A2A 消息中的文件引用 `MUST` 验证以防 SSRF | `code-reviewer` 不获取 URL | 未比较  {{spec §14.1.1}} |
| 日志 `MUST NOT` 包含凭据、个人数据等敏感信息，除非必需且受妥善保护 | 采集文件保存测试值 `dpl_test_7c1e4b` 和 `hook_secret_91d2` | 未比较  {{spec §13.4}} |
| 实现 `SHOULD` 支持 HTTPS 保证 Agent Card 真实性和完整性，客户端 `SHOULD` 验证已有签名 | planner 用普通 HTTP 取卡片，不验证，`17-signed-card.txt` 展示检查 | 未比较，[扩展卡片与签名](#s-extended-cards-and-signatures)介绍验证  {{spec §14.3}} |
| agent `SHOULD` 对所有操作限流，`SHOULD` 记录安全事件 | 无 | 未比较  {{spec §13.4}} |

其中三条值得展开，因为它们保护的数据在每个任务中都会到达。

## 文本是数据，即使像命令 {#s-security-requirements-text-is-data-even-when-it-reads-like-an-order}

**prompt 注入：** 文本以数据到达，接收侧模型却当作指令执行。part 没有字段说明内容可被信任到何种程度，`review.json` 来自他人写的 diff。 {{proto Part}}

```rule
label: 读取输入前检查
source: spec §14.1.1
---
"Content MUST be validated against the A2A protocol schema before processing"
```

套件 planner 根据 data part 决策：从 `summary.json` 读 `failed`，从 `review.json` 每项发现读 `severity`，忽略旁边自由文本。它唯一使用远程文本之处，是对 reviewer 问题做子串检查。基于模型的 planner 会读更多。因此只按检查过的有类型字段行动。副作用操作必须经过人或策略控制的批准，如 deployer 所做。

## URL 决定接收者自己的请求去向 {#s-security-requirements-urls-aim-the-receiver-s-own-requests}

**服务器端请求伪造（SSRF）：** 服务器向外部调用者选择的地址发送请求，如内部服务。`url` part 会引发它，webhook URL 也会，agent 对任务每个后续事件都调用该 URL。

套件 `code-reviewer` 因输入模式未列 `image/png` 而拒绝该媒体类型的 `url` part，不下载任何内容。webhook 规范要求拒绝私有 IP 范围 `127.0.0.0/8`、`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`，并拒绝 localhost 和链路本地地址。套件仅因所有进程同机运行而接受 `http://localhost:41250/a2a-events`。参考 SDK 验证器拒绝解析为回环、私有、链路本地、保留、多播或未指定地址的主机，只有宿主开启才运行。[推送通知](#s-push-notification-configs)介绍接收器检查。 {{spec §13.2}} {{sdk src/a2a/utils/push_url_validator.py}}

## 比任务活得更久的记录 {#s-security-requirements-records-that-outlive-the-task}

读取存储配置会明文返回秘密：

```listing
title: 读回的配置包含明文秘密
source: capture/out/15-push.http
lang: json
note: ListTaskPushNotificationConfigs 回复，只保留一个配置。
---
    "configs": [
      {
        "id": "92c697ef-4abc-4e86-82ba-dc6bce4077af",
        "taskId": "d7d3dceb-7333-4676-90ce-36542116a45c",
        "url": "http://localhost:41250/a2a-events",
        "token": "planner-run-0006",
        "authentication": {
          "scheme": "Bearer",
          "credentials": "hook_secret_91d2"
```

这些读取需要任务自身的访问检查，[安全方案](#s-security-schemes-and-in-task-authorization)介绍范围。采集文件明文保存 `dpl_test_7c1e4b`、`hook_secret_91d2`，只有因为它们是测试值才安全。`refunds.diff` part 留在审查任务 `history` 中，任务历史和产物的敏感信息 `MUST` 按适用的数据保护法规保护。按 §13.4 建议为所有记录设置保留期。 {{spec §13.1}} {{spec §14.1.1}} {{spec §13.4}}

```takeaways
- 只根据已验证 data part 中的有类型字段决策。
- 拒绝解析到回环、私有或链路本地地址的 webhook 和文件 URL。
- 每次通知检查 `Authorization` 值和任务 ID。
- 不让凭据进入日志或其他调用者可读取的记录。
```

Sources: spec §13.1, §13.2, §13.3, §13.4, §14.1.1, §14.3 (research/sources/specification.md); proto Part (research/sources/a2a.proto); sdk src/a2a/utils/push_url_validator.py at a2a-python 1.2.2; sdk-go a2asrv/push/sender.go at v2.6.0; sdk-rust a2a-server/src/push/sender.rs at a2a-server-lf-v0.5.1; sdk-java server-common/src/main/resources/META-INF/a2a-defaults.properties at v1.4.0.Final; sdk-dotnet src/A2A/Server/A2AServer.cs at v1.0.0-preview2; capture/out/06-input-required.http, 11-errors.http, 15-push.http, 17-signed-card.txt; capture/planner.py, capture/a2a_ref.py, capture/README.md
