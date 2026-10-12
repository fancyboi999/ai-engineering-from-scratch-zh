# A2A 101 采集套件

A2A 101 的每个请求、响应和流帧都来自此套件。它只用 Python 标准库，在本机运行三个远程 agent 和录制客户端，无需外部网络或密钥。

```bash
python3 run.py          # 写入 out/
python3 run.py --check  # 再采集到临时目录并比较
```

输出是确定性的。ID 来自带种子的生成器，时钟从 2026-10-06T09:00:00Z 开始，每次为新任务或状态打时间戳前进 250 ms，每个场景按固定顺序执行。两次运行写出的文件逐字节一致，因此 `--check` 直接比较，不遮蔽任何字段。

`out/` 保存冻结上游的原始录制证据，不是中文同步的本机运行结果。以下行为差异也是上游研究记录。代码只模拟 agent 的工作，不执行真实测试基础设施、模型或云部署。

## agent

| agent | 端口 | 工作 | 展示的行为 |
|---|---|---|---|
| `test-runner` | 41241 | 运行测试套件并流式传输日志 | 流式传输、分块产物、轮询、取消、推送通知、两种 JSON 绑定 |
| `code-reviewer` | 41242 | 对照基准分支审查 diff | 直接消息回复、`TASK_STATE_INPUT_REQUIRED`、拒绝内容类型、不支持推送 |
| `deployer` | 41243 | 操作员批准后部署构建到 staging | bearer 认证、通过 A2A 外部批准进入 `TASK_STATE_AUTH_REQUIRED`、拒绝、扩展卡片与签名卡片 |

`planner.py` 是第 7.1 节的客户端 agent。它读取三张卡片，为各技能选择 agent，并处理任务到达的每种状态。

## 场景

| 文件 | 展示内容 |
|---|---|
| `01-agent-cards.http` | `/.well-known/agent-card.json` 的三张卡片 |
| `02-message-reply.http` | 以消息回答问题，没有任务 |
| `03-blocking-task.http` | 等待任务完成的 `SendMessage` |
| `04-polling.http` | `returnImmediately`，随后在工作中和完成后调用 `GetTask` |
| `05-streaming.http` | `SendStreamingMessage` 的每帧，日志分块传输 |
| `06-input-required.http` | reviewer 询问基准分支，客户端在同一任务回答 |
| `07-auth-required.http` | 部署等待操作员，流保持打开 |
| `08-rejected.http` | agent 拒绝的生产部署 |
| `09-failed.http` | 不存在的提交 |
| `10-cancel.http` | 取消运行任务、再次取消、结束后向其发消息 |
| `11-errors.http` | 任务未找到、缺少版本头、v0.3 方法名、无效参数、不支持的媒体类型、不支持推送、格式错误的体 |
| `12-list-tasks.http` | `ListTasks` 分页及状态过滤 |
| `13-history.http` | 有和没有 `historyLength` 的 `GetTask` |
| `14-resubscribe.http` | 四帧后断开，再用 `SubscribeToTask` 接续的流 |
| `15-push.http` | `SendMessage` 注册 webhook、接收到的通知及配置操作 |
| `16-rest-binding.http` | HTTP+JSON 上的同样操作，含错误结构 |
| `17-signed-card.txt` | deployer 卡片的规范化、签名和验证 |
| `18-extended-card.http` | 无 token 和带 token 的 `GetExtendedAgentCard` |
| `19-planner.http` 和 `19-planner.log` | planner 的运行及决策 |

`*.events.json` 文件保存格式化后的流帧。

## 套件与参考 SDK 的区别

上游将记录与 Python 参考实现 `a2a-sdk` 1.2.2 的流量对照。结构、字段名、对象内字段顺序、枚举值、错误代码和历史记账相同。以下选择不同，或补足规范未规定的部分：

- 套件 JSON-RPC 包装的顺序为 `jsonrpc`、`id`、`result`，SDK 为 `result`、`id`、`jsonrpc`。JSON 对象无序，两者是相同消息。
- 套件给首个 `TASK_STATE_SUBMITTED` 状态打时间戳，SDK 省略。该字段可选。
- 任务到终态或 `TASK_STATE_INPUT_REQUIRED` 时流关闭，在 `TASK_STATE_AUTH_REQUIRED` 保持打开，符合任务内授权一节要求。规范对中断态自相矛盾。SDK 默认请求处理器在 agent 的 `execute()` 返回时关闭流，因此由 agent 代码决定（`src/a2a/server/agent_execution/active_task.py`）。
- HTTP+JSON 错误和推送通知按规范用 `application/a2a+json`，SDK 两者都用 `application/json`。
- 推送 `token` 放在 SDK 的 `X-A2A-Notification-Token` 头中。规范不规定 token 的传输方式（`src/a2a/server/tasks/base_push_notification_sender.py`）。
- 无 `id` 创建的推送配置获得新 UUID，SDK 使用任务 ID。规范只说由服务器分配。
- JSON-RPC 的 `DeleteTaskPushNotificationConfig` 返回 `{}`，即空 protobuf 消息的 JSON 形式，SDK 返回 `null`。
- 错误详情含任务 ID 等 metadata，与规范示例一致。SDK 发送空 `metadata` 对象。
- 空闲流没有保活注释，SDK 服务器每 15 秒发送一条。
- 输入检查只读卡片的 `defaultInputModes`，把无 `mediaType` 的 `text` part 当作 `text/plain`，`data` part 当作 `application/json`。SDK 默认关闭检查，开启后还接受每个技能的 `inputModes`，并跳过无 `mediaType` 的 part。
- 未知 `artifactId` 上带 `append` 的 `artifactUpdate` 开始新产物，SDK 用 `InvalidAgentResponseError` 拒绝。
- 客户端回答中断任务时，套件服务器在 agent 代码恢复前自行设置 `TASK_STATE_WORKING`，不带消息。
- webhook 接收状态和产物更新，不接收首个 Task 快照。SDK 也推送该 Task。
- 版本检查按 §3.6.1 从 `A2A-Version` 头或 `A2A-Version` 查询参数接受精确的 `1.0`。SDK 只比较主版本，只读头。
- 认证先于协议运行。两种绑定中，缺少或错误的 bearer token 都在 A2A 方法前得到 HTTP 401 和 `WWW-Authenticate` challenge。
- deployer 用 HS256 签卡片，因为标准库没有 ECDSA。真实部署用 ES256 或 RS256，在 JWKS 发布公钥。
- 规范化形式对键排序并删除空格。对这些卡片的纯 ASCII 文本符合 RFC 8785，对 deployer 卡片等于 SDK 的规范化字节。
- 卡片响应没有 `Cache-Control` 或 `ETag`，SDK 发送弱 `ETag`，匹配请求返回 `304`。
- 客户端消息的角色不是 `ROLE_USER` 时返回 `-32602`。规范没有指定这种情况的错误。
- deployer 的 `POST /approve/<task id>` 代表操作员在 A2A 之外批准部署，不属于 A2A。
