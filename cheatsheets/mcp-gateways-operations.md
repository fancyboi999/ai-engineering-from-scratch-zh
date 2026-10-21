---
id: mcp-gateways-operations
title: MCP 网关、注册表与一致性
code: GR
subtitle: 通过无状态网关路由，准入注册表版本，检测漂移，测试线上协议，并设置发布门禁。
hue: 30
sources: phases/13-tools-and-protocols/17-mcp-gateways-and-registries, phases/13-tools-and-protocols/23-capstone-tool-ecosystem, phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift, phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations
source_hash: 3aa98ebe481a6c23
---

## 网关请求路径
type: architecture
from: phases/13-tools-and-protocols/17-mcp-gateways-and-registries/docs/zh.md, phases/13-tools-and-protocols/17-mcp-gateways-and-registries/code/main.py

```arch
node | client | 1,1 | 客户端 | bearer 与 _meta | client
node | wire | 2,1 | validate_wire | 请求头与请求体一致 | process
node | policy | 3,1 | RBAC 与 TokenBucket | 按主体区分 | process
node | pin | 4,1 | 描述符固定 | descriptor_digest | process
node | reg | 1,2 | 注册表记录 | 仅表示已发布 | store
node | adm | 2,2 | 准入状态 | 已验证发布者 | store
node | notes | 3,2 | notes 后端 | 新请求标识 | process
node | issues | 4,2 | issues 后端 | 新请求标识 | process
edge | client | wire | POST
edge | wire | policy | 优先 -32020
edge | policy | pin | 允许
edge | pin | notes | notes.search
edge | pin | issues | issues.list
edge | reg | adm | 关联
edge | adm | pin | 准入
```

## 运行与验证
type: command-table
from: phases/13-tools-and-protocols/17-mcp-gateways-and-registries/docs/zh.md, phases/13-tools-and-protocols/23-capstone-tool-ecosystem/docs/zh.md, phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift/docs/zh.md, phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` | 在课程目录运行演示 |
| `python3 -m unittest discover code/tests -v` | 运行网关测试（第 17 课） |
| `python3 -m unittest discover -s code/tests -v` | 运行注册表和一致性测试套件 |
| `python3 -q` | 在 `code/` 中打开实验用 shell |
| `from main import *` | 在该 shell 中加载实验函数 |

## 网关代码任务
type: task-table
from: phases/13-tools-and-protocols/17-mcp-gateways-and-registries/code/main.py, phases/13-tools-and-protocols/23-capstone-tool-ecosystem/code/main.py

| 任务 | 代码 |
|---|---|
| 构建请求和请求头 | `make_request(method, request_id, params)` |
| 以某主体发送请求 | `gateway.handle("bearer-alice", body, headers)` |
| 先检查传输协议 | `validate_wire(body, headers)` |
| 固定一个描述符 | `descriptor_digest(tool)` |
| 对主体限速 | `TokenBucket().consume()` |
| 准入注册表记录 | `registry_record_is_admissible` |
| 综合项目中的作用域检查 | `gateway_call(token, tool_name, args, ...)` |

## 注册表准入、漂移与回滚
type: annotated-code
lang: python
from: phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift/code/main.py, phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift/docs/zh.md

```python
controller = RegistryAdmissionController(clock=lambda: next(ticks))
active_meta = {OFFICIAL_META_KEY: {"status": "active"}}
controller.admit(sample_record("1.1.0"), active_meta,
    namespace_for_domain("example.com"),         # 得到 com.example
    evidence_for("1.1.0"), sample_live("1.1.0"))  # 同样准入 1.0.0
drift = controller.check_live("com.example/inventory", "1.1.0",
    sample_live("1.1.0", True))                  # 多出工具：隔离
controller.observe_registry_status("com.example/inventory", "1.1.0", "deprecated")
controller.rollback("com.example/inventory", "1.0.0", "unexpected delete tool")
controller.ledger.verify()                       # 任何编辑后返回 False
namespace_matches("com.exampleevil/inventory", "com.example")  # False
```

## 一致性测试工具
type: annotated-code
lang: python
from: phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations/code/main.py, phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations/docs/zh.md

```python
validate_result({"tools": []}, "legacy")      # 推断为 complete
validate_result({"tools": []}, "modern")      # 抛出 ProtocolViolation
select_era({"kind": "timeout"}, "fallback")   # 失败时拒绝放行
select_era({"kind": "jsonrpc_error", "code": -32021}, "fallback")  # modern
cases = [run_transcript(case) for case in transcript_suite()]  # 15 个用例
compare_sdk_view(raw_result, {"tools": []})   # droppedFields 包含 futureHint
inspect_proxy(exchange)                       # 发现 400 被改为 500
redact(value)                                 # hash 或上传前脱敏
evaluate_health(healthy_window())             # 样本数、错误率、p95
ReleaseGate(signers).evaluate(cases, [sdk_report], [proxy_report],
                              healthy_window(), rollback)  # 晋级或回滚
```

## 七项准入控制
type: flow
from: phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift/docs/zh.md

1. **命名空间**：严格比较 `/` 前的片段与已验证命名空间。
2. **来源**：关联注册表类型、标识、版本、所有权与产物摘要。
3. **固定**：保存记录、源、工具集和来源摘要。绝不使用 `^1.4` 或 latest。
4. **实时漂移**：调用 `server/discover`。任一描述符摘要变化都隔离固定版本。
5. **状态**：读取官方 `_meta` 状态。弃用或删除时隔离。
6. **回滚**：路由到已准入、活跃且未隔离的固定版本。
7. **账本**：每次决策追加前一条 hash 与自身 hash。

## 网关错误
type: troubleshooting
from: phases/13-tools-and-protocols/17-mcp-gateways-and-registries/code/main.py, phases/13-tools-and-protocols/17-mcp-gateways-and-registries/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 401 `-32001` | Bearer 未知 | 对主体进行认证 |
| 403 `-32003` | 工具不在用户的 `RBAC` 中 | 授予角色或保持拒绝 |
| 429 `-32029` | `TokenBucket` 为空 | 等待补充 |
| 409 `-32010` | 实时描述符与固定版本不同 | 评审后重新批准固定版本 |
| 400 `-32020` | 请求头与请求体不一致 | 对齐 `Mcp-Method` 和 `Mcp-Name` |
| 400 `-32022` | 不支持匹配到的版本 | 发送 `supported` 中的版本 |
| `subscriptions/listen` 返回 406 | Accept 缺少 `text/event-stream` | 接受 SSE |
| 405 | 对端点使用 GET 或 DELETE | 每条消息使用 POST |

## 默认值与数值
type: defaults
from: phases/13-tools-and-protocols/17-mcp-gateways-and-registries/code/main.py, phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations/code/main.py, phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 网关 discover `ttlMs` | 30_000 | `cacheScope` 为 private |
| 网关 tools/list `ttlMs` | 10_000 | RBAC 会过滤，因此为私有 |
| `TokenBucket` `capacity` | 5 | `refill_per_second` 为 1.0 |
| `maxErrorRate` | 0.01 | 健康门禁默认值 |
| `maxP95Ms` | 500 | 健康门禁默认值 |
| `MODERN_VERSION` | 2026-07-28 | 需要 `resultType` |
| `LEGACY_VERSION` | 2025-11-25 | 仅限允许列表且 `initialize` 有效 |
| 注册表 schema | 2025-12-11 | 独立于协议版本 |

## 发布故障
type: troubleshooting
from: phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations/docs/zh.md, phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 客户端收到 `-32021` 后改用旧版 | 将已识别的新版错误当成旧版 | 新版错误后绝不回退 |
| SDK 显示传输体中没有的 `resultType` | SDK 合成了判别字段 | 校验原始请求体 |
| 源站 400 到达时变成 500 | 代理合并了错误 | 比较入口、源站和出口 |
| 金丝雀零错误但没有流量 | 无最低样本数要求 | 强制 `sampleCount` 大于 0 |
| 批准后出现新工具 | 运行时漂移 | 隔离路由 |
| 回滚目标从未准入 | 路由与批准状态脱节 | 拒绝并重新执行准入 |

## 规则
type: tips
from: phases/13-tools-and-protocols/17-mcp-gateways-and-registries/docs/zh.md, phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift/docs/zh.md, phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations/docs/zh.md

- 不要将外层网关 token 传给后端。
- 不要向后端复制外层客户端能力。网关才是后端的客户端。
- 按主体、签发者、资源、工具、成本类别和时间窗口设置限速键。
- 逐字节保留 `requestState`。每次 MRTR 重试都重新授权。
- 根据 `Mcp-Name` 中的 `params.taskId` 路由 `tasks/get`、`tasks/update`、`tasks/cancel`。
- 服务出现在 `tools/list` 前先执行准入。
- 序列化、hash、记录日志或上传前先脱敏。

## 问答
type: qa
from: phases/13-tools-and-protocols/17-mcp-gateways-and-registries/docs/zh.md, phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift/docs/zh.md, phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations/docs/zh.md, phases/13-tools-and-protocols/23-capstone-tool-ecosystem/docs/zh.md

- **进入注册表就表示服务获准使用吗？** 不是，由准入策略决定。
- **`serverInfo` 能证明发布者身份吗？** 不能，它只是诊断数据。
- **未知字段等于未知结果吗？** 不是。保留字段，拒绝未知 `resultType`。
- **回滚会编辑旧记录吗？** 不会，它改变活跃路由。
- **综合项目运行通过能证明真实协议吗？** 不能，它只验证模拟。
