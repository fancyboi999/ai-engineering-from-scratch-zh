# 合规测试

> a2a-tck 在三种绑定上按 v1.0.0 评估服务器，对采集套件的运行能区分服务器失败与 TCK 自身问题。

2026-10-06，套件 `test-runner` 在端口 41251 接受两次 a2a-tck 1.0.0.alpha2 测试。第一次使用发布原版 TCK，得分 32.3%。第二次修改 TCK JSON-RPC 客户端两行后得分 66.7%。读完本节后，你可以对自己的服务器运行 TCK，区分真实失败与测试缺陷。

## 运行 a2a-tck {#s-conformance-testing-running-a2a-tck}

TCK 是 pytest 项目，读取 `{sut-host}/.well-known/agent-card.json`，为每个 `supportedInterfaces` 条目构建客户端，在卡片声明的每种绑定上运行每项测试。它检查 `v1.0.0` 分支，不是本手册锁定的 1.0.1 补丁版。

```bash
git clone --filter=blob:none https://github.com/a2aproject/a2a-tck.git
cd a2a-tck
git checkout 1.0.0.alpha2
uv venv && source .venv/bin/activate
uv pip install -e .
./run_tck.py --sut-host http://localhost:9999
```

`run_tck.py` 构建一个 pytest 命令，`--transport`、`--level`、`--webhook-host` 收窄范围。`MUST` 测试是硬失败，`SHOULD` 为 `xfail`，`MAY` 在卡片未声明能力时跳过。`compatibility.json` 为每个要求保存一个判定，百分比只统计 PASS 和 FAIL。

## 套件运行说明了什么 {#s-conformance-testing-what-the-kit-s-run-showed}

第一次运行，85 条 JSON-RPC 记录中 63 条因同一原因失败：TCK 客户端向卡片 `url` 加尾随斜杠后 POST，套件对此路径返回 HTTP 404。第二次向精确 `url` POST，129 项要求得到 62 PASS、31 FAIL、11 SKIPPED、25 NOT TESTED。全部 72 条 gRPC 记录因套件无 gRPC 接口跳过。

31 项失败中 21 项是测试体内跳过，标签版记录为 FAIL，`main` 记录为 SKIPPED。多数要求任务停在 `TASK_STATE_INPUT_REQUIRED`，`test-runner` 从不如此。按 `main` 规则则为 62 PASS、10 FAIL、32 SKIPPED，即 86.1%。

十项中一项属于套件：`Handler.rest` 没有 `tasks/{id}/pushNotificationConfigs` 下的路由，但卡片在两种 JSON 绑定都声明 `pushNotifications`。所有声明绑定必须提供相同操作。套件现在提供四条路由，六条 HTTP+JSON 推送记录通过。各要求的 JSON-RPC 部分仍失败，因为 TCK 发送 `task_id` 而非 `taskId`。 {{spec §5.1}}

两项 `SHOULD` 失败是卡片缺少 `Cache-Control` 和 `ETag`。其余属于 TCK 自身或示例输入问题。 {{spec §8.6}}

```listing
title: 套件修复后的六项推送要求
source: research/tck-summary.txt
lang: text
note: 每行一项要求：ID、级别、各绑定判定及 TCK 记录的判定。六条 HTTP+JSON 记录通过，JSON-RPC 因 TCK 的 snake_case 参数失败，因此 TCK 将各要求记为 FAIL。
---
PUSH-CREATE-001 MUST grpc=SKIPPED,http_json=PASS,jsonrpc=FAIL FAIL
PUSH-CREATE-002 MUST grpc=SKIPPED,http_json=PASS,jsonrpc=FAIL FAIL
PUSH-DEL-001 MUST grpc=SKIPPED,http_json=PASS,jsonrpc=FAIL FAIL
PUSH-DEL-002 MUST grpc=SKIPPED,http_json=PASS,jsonrpc=FAIL FAIL
PUSH-GET-001 MUST grpc=SKIPPED,http_json=PASS,jsonrpc=FAIL FAIL
PUSH-GET-002 MUST grpc=SKIPPED,http_json=PASS,jsonrpc=PASS PASS
PUSH-LIST-001 MUST grpc=SKIPPED,http_json=PASS,jsonrpc=FAIL FAIL
```

`research/tck-run.md` 对运行中的每行分类。

## TCK 偏离 v1.0.1 的地方 {#s-conformance-testing-where-the-tck-departs-from-v1-0-1}

| TCK 预期 | 规范规定 | 对套件的影响 |
|---|---|---|
| JSON-RPC 请求发到 `<url>/` | 接口在 `url` | 第一次运行的 63 条记录  {{spec §8.3.1}} |
| JSON-RPC 使用 `task_id`、`history_length` 等 snake_case 参数 | JSON 字段名 `MUST` 为 camelCase | JSON-RPC 的 `PUSH-CREATE-001` 失败，`GetTask` 忽略 `history_length`  {{spec §5.5}} |
| REST 的 `Content-Type` 含 `application/json` | `SHOULD` 使用 `application/a2a+json` | `HTTP_JSON-SVC-001` 和 `HTTP_JSON-ERR-001` 失败  {{spec §11.1}} |
| `CORE-SEND-003` 任何错误都算失败 | 不支持的 part 返回 `ContentTypeNotSupportedError` | 两种绑定都失败  {{spec §3.3.2}} |
| `TaskNotCancelableError` 为 HTTP 409，`ContentTypeNotSupportedError` 为 415，`InvalidAgentResponseError` 为 502，三种错误为 gRPC `UNIMPLEMENTED` | 400、400、500 和 `FAILED_PRECONDITION` | 本次运行未触及  {{spec §5.4}} |
| `SHOULD`、`MAY` 缓存测试使用硬断言 | TCK 自身 README 将 `SHOULD` 定为 `xfail` | 三项卡片缓存失败 |

[错误](#s-errors)给出完整映射。

## TCK 不测试什么 {#s-conformance-testing-what-the-tck-does-not-test}

五种导致 SDK 分歧的行为从未测试：REST 订阅动词（B1），客户端总发送 POST；分页（B5），只有一次 `ListTasks` 且只查 schema；未知产物上的 `append`（B11），无测试发送产物更新；另一调用者的任务（B12），`AUTH-SCOPE-001` 至 `003` 无测试；重复 `messageId`（B14），每个测试都生成新 ID。

25 项 NOT TESTED 还包括任务内授权、TLS、卡片签名、绑定等价性和客户端版本头。[安全要求](#s-security-requirements)与[签名卡片](#s-extended-cards-and-signatures)给出规则。

## 另外三个工具 {#s-conformance-testing-three-more-tools}

a2a-inspector 是浏览器调试器：取卡片、检查结构、发送消息、显示事件。唯一发布版 `v0.1.0` 早于 1.0，要求顶层 `url`。使用接受 0.3、1.0 负载并从首个接口构建客户端的 `main`。运行 `uv sync`，在 `frontend` 运行 `npm install`，再运行 `bash scripts/run.sh`，打开 `http://127.0.0.1:5001`。它不判断合规。

a2a-cli 是基于 a2a-go 的官方命令行客户端，版本 `v0.3.0`。`a2a card get <url>` 读卡片，`a2a send -a <url> "text"` 发消息，可用 `--stream` 或 `--async`。`a2a task get`、`list`、`cancel`、`subscribe` 覆盖其他操作，`--svc-param A2A-Version=0.3` 手动设头。它是客户端，不是评分器。

a2a-itk 尚无发布版，是跨 SDK 测试框架：每个 agent 通过场景绑定将嵌套指令转发给下个 peer。`uv run run_tests.py` 运行内置集合。`known_failures.yaml` 记录 B1 分歧：Rust 客户端发 `GET`，.NET 服务器只接受 `POST`。

```takeaways
- 按要求逐项读 `compatibility.json`，不要只看百分比。
- 预期 TCK 向卡片 URL 加尾随斜杠后发送 JSON-RPC 请求。
- 测试变更前，将内容类型或 snake_case 失败视为 TCK 问题。
- 自行测试拥有者范围、重复消息和产物追加。
```

Sources: spec §3.3.2, §5.1, §5.4, §5.5, §8.3.1, §8.6, §11.1 (research/sources/specification.md); the TCK run of 2026-10-06 (research/tck-run.md, research/tck-summary.txt); a2a-tck at tag 1.0.0.alpha2 (README.md, run_tck.py, tck/requirements/base.py, tck/transport/jsonrpc_client.py, tests/compatibility/conftest.py) and main 263b9cf; a2a-inspector main 8aa0646 (README.md, backend/validators.py, backend/app.py); a2a-cli v0.3.0 (README.md, internal/README.md, specification/SPEC.md); a2a-itk main b57c533 (README.md, matrix.yaml, known_failures.yaml); capture/a2a_ref.py, capture/agents.py, capture/README.md
