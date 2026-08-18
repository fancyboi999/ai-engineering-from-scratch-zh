# Session 恢复数据包：客户端迁移

## Goal and Scope（目标与范围）

迁移 HTTP client，同时不改变公开行为。范围是 `src/client.py` 和 `tests/test_client.py`；deploy 与外部写入均被阻止。

## Durable State（持久状态）

manifest `migration-v2` 记录当前分支、依赖版本、任务状态、文件 hash `4cc0-demo`、12 项通过的测试、一个 blocked 的超时案例和产物 ID。对话历史不是权威来源。

## Revalidation（重新验证）

下一次编辑前，重新验证（revalidate）分支、依赖行为、文件 hash、聚焦测试和当前批准。依赖变更会使旧计划失效。

## Side Effect Reconciliation（副作用对账）

Tool 调用 `write-018` 的结果 unknown outcome。重试前先比对已持久化的 hash。复用 idempotency 键 `migration-client-v2-write-018`；对账完成前绝不签发新的写入标识。

## Context Budget（上下文预算）

20% 用于目标和约束，20% 用于当前 manifest 状态，45% 用于与决策相关的证据，15% 用于输出合约。原始日志留在产物引用之后。

## Independent Review（独立审查）

isolated reviewer 接收 diff、需求、测试和 rubric。它返回 complete、partial 或 blocked，并附带证据，但不接收实施 transcript。
