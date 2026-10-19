---
id: autonomous-agents
title: 自主 Agent 与权限
subtitle: 在限制下无人值守运行 agent：权限模式、预算、紧急停止、持久执行、审批与回滚。
hue: 330
sources: phases/15-autonomous-systems/01-long-horizon-agents, phases/15-autonomous-systems/08-bounded-self-improvement, phases/15-autonomous-systems/10-claude-code-permission-modes, phases/15-autonomous-systems/12-durable-execution, phases/15-autonomous-systems/13-cost-governors, phases/15-autonomous-systems/14-kill-switches-canaries, phases/15-autonomous-systems/15-propose-then-commit, phases/15-autonomous-systems/16-checkpoints-rollback
code: AA
---

## 操作员任务
type: task-table
from: phases/15-autonomous-systems/10-claude-code-permission-modes/docs/zh.md, phases/15-autonomous-systems/13-cost-governors/docs/zh.md, phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md, phases/15-autonomous-systems/14-kill-switches-canaries/code/main.py, phases/15-autonomous-systems/12-durable-execution/code/main.py, phases/15-autonomous-systems/15-propose-then-commit/code/main.py

| 任务 | 代码 |
|---|---|
| 先评审计划 | 权限模式 `plan` |
| 仅自动批准文件编辑 | 权限模式 `acceptEdits` |
| 限制花费与循环轮数 | `max_budget_usd`、`max_turns` |
| 限制工具集合 | `allowed_tools` / `disallowed_tools` |
| 终止 agent 容器 | `kubectl delete pod` |
| 重复调用时熔断 | `CircuitBreaker(threshold=5)` |
| 崩溃后重放 | `workflow(EventLog(<path>), <query>)` |
| 让审批支持安全重试 | `k = p.key()` |

## 控制层
type: architecture
from: phases/15-autonomous-systems/10-claude-code-permission-modes/docs/zh.md, phases/15-autonomous-systems/13-cost-governors/docs/zh.md, phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md, phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md, phases/15-autonomous-systems/12-durable-execution/docs/zh.md

```arch
node | loop | 1,1 | Agent 循环 | 轮数、工具调用
node | perm | 2,1 | 权限模式 | plan 至 bypassPermissions
node | gov | 3,1 | 成本治理 | 多层上限
node | kill | 4,1 | 紧急停止 | agent 不可写
node | breaker | 1,2 | 熔断器 | 关闭、打开、半开
node | canary | 2,2 | 金丝雀 token | 访问即报警
node | prop | 3,2 | 提案存储 | 提案、提交、验证
node | log | 4,2 | 事件日志 | 以 thread_id 为键
edge | loop | perm | 动作
edge | perm | gov | 花费
edge | gov | kill | 超限
edge | loop | breaker | 调用
edge | loop | canary | 读取
edge | perm | prop | 批准
edge | prop | log | 持久化
```

## 提案、提交、验证
type: flow
from: phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md, phases/15-autonomous-systems/15-propose-then-commit/code/main.py, phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md, phases/15-autonomous-systems/16-checkpoints-rollback/code/main.py

1. **提案**：存储意图、沿袭信息、影响范围和回滚方案。状态为 `waiting`。
2. **呈现**：由人评审元数据，不能由 agent 自行评审。
3. **批准**：`checklist_approve` 要求三项检查全部通过。状态为 `approved`。
4. **前置条件**：状态必须仍符合批准时条件，否则进入 `aborted-precondition`。
5. **提交**：先持久化意图，再执行副作用。
6. **验证**：重新读取目标，失败时执行回滚。
7. **重试**：终态返回已存储结果，不再执行一次。

## 持久执行的 activity
type: annotated-code
lang: python
from: phases/15-autonomous-systems/12-durable-execution/code/main.py

```python
def activity(name: str):
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(log: EventLog, *args):
            hit = log.lookup(name, args)  # 日志中是否已有 done 事件？
            if hit:
                return hit["result"]  # 重放，不重新执行
            log.append({"name": name, "args": list(args), "status": "started"})
            result = fn(*args)  # 真实副作用
            log.append({"name": name, "args": list(args),
                        "status": "done", "result": result})  # 记录输出
            return result
        return wrapper
    return deco
```

## 成本治理与熔断器
type: annotated-code
lang: python
from: phases/15-autonomous-systems/13-cost-governors/code/main.py, phases/15-autonomous-systems/14-kill-switches-canaries/code/main.py

```python
gov = Governor(max_turns=200, max_budget_usd=50.0)  # 会话上限
if gov.enable_iter_cap and turn >= gov.max_turns:
    run.stopped_by = "max_turns"  # 迭代次数上限
if gov.enable_session_cap and run.dollars >= gov.max_budget_usd:
    run.stopped_by = "max_budget_usd"  # 金额上限
if gov.enable_velocity and velocity_exceeded(run, gov, now_min):
    run.stopped_by = "velocity_limit"  # 滚动花费速率
if kill_switch["enabled"]:
    break  # 外部停止按钮
allowed = breaker.record(f"{a.kind}:{a.payload}")
if not allowed:
    break  # 5 次相同调用触发熔断
```

## 权限模式
type: concepts
from: phases/15-autonomous-systems/10-claude-code-permission-modes/docs/zh.md

- **`plan`**：用户批准计划，每项动作先经过评审。
- **`default`**：手动模式，shell、破坏性操作和网络操作均需询问。
- **`acceptEdits`**：自动批准文件写入，shell 与网络操作仍需询问。
- **`auto`**：分类模型评审每项动作，阻止权限升级。
- **`dontAsk`**：从不询问，拒绝未经批准的动作。
- **`bypassPermissions`**：批准所有动作，仅用于一次性容器。

## 模拟器默认值
type: defaults
from: phases/15-autonomous-systems/13-cost-governors/code/main.py, phases/15-autonomous-systems/14-kill-switches-canaries/code/main.py, phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `max_tokens_per_request` | 10_000 | 单次调用的生成上限 |
| `max_turns` | 200 | 每个会话的循环次数 |
| `max_budget_usd` | 50.0 | 会话美元预算，超限时中止 |
| `velocity_usd_per_min` | 5.0 | 滚动花费速率上限 |
| `velocity_window_min` | 10.0 | 速率窗口 |
| `monthly_cap_usd` | 500.0 | 较晚发现缓慢泄漏 |
| `threshold` | 5 | 触发熔断的相同调用次数 |
| 半开探测 | 默认 1 | 冷却后执行 1 至 3 次 |

## 各层上限捕获什么
type: concepts
from: phases/15-autonomous-systems/13-cost-governors/docs/zh.md, phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md

- **失控循环**：由速率上限捕获。
- **缓慢泄漏**：约为预期工作量的 2 倍，由每日上限捕获。
- **有问题的发布**：新版本使用 5 倍 token，由每周或每月上限捕获。
- **正常突增**：由每小时或每日上限捕获，并留下清晰日志。
- **缓慢对抗漂移**：可绕过统计检测器，由硬上限捕获。
- **安全动作的有害组合**：没有检测器能全部捕获。

## 故障排查
type: troubleshooting
from: phases/15-autonomous-systems/12-durable-execution/docs/zh.md, phases/15-autonomous-systems/13-cost-governors/docs/zh.md, phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md, phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md, phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 崩溃后重跑全部工具调用 | 简单的 `while True` 循环 | 使用 activity 与事件日志 |
| 重放发生分歧 | 工作流中使用墙钟或随机数 | 将其注册为副作用 |
| 已批准的动作运行两次 | 缺少幂等键 | 每个提案使用一个键 |
| 恢复后透支 | 只有幂等检查 | 增加前置条件检查 |
| 已提交却没有副作用 | 状态已保存，动作丢失 | 重新读取验证，再回滚 |
| 审批没有实质评审 | 只有批准按钮 | 使用问答式检查清单 |
| 新增工具后账单增至三倍 | 缺少工具级上限 | 工具级上限与每日增长告警 |
| Agent 关闭金丝雀检测 | 检测器在 agent 可触及范围 | 放在 agent 不可写的位置 |

## 术语表
type: glossary
from: phases/15-autonomous-systems/01-long-horizon-agents/docs/zh.md, phases/15-autonomous-systems/12-durable-execution/docs/zh.md, phases/15-autonomous-systems/13-cost-governors/docs/zh.md, phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md, phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md

- **HITL**：人工介入，动作执行前由人批准。
- **METR 时间跨度**：模型以 50% 可靠性完成的任务长度。
- **Denial of Wallet**：没有上限约束、持续花钱的 agent 循环。
- **thread_id**：限定单个会话持久状态的键。
- **租约**：工作进程执行任务的短期声明，崩溃后过期。
- **影响范围**：动作出错时波及的范围。
- **SAGA**：通过补偿事务抵消原动作。

## 问答
type: qa
from: phases/15-autonomous-systems/01-long-horizon-agents/docs/zh.md, phases/15-autonomous-systems/13-cost-governors/docs/zh.md, phases/15-autonomous-systems/12-durable-execution/docs/zh.md, phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md, phases/15-autonomous-systems/10-claude-code-permission-modes/docs/zh.md

- **每步成功率 99%，执行 70 步呢？** Agent 仍有约一半概率失败。
- **为何使用多层上限？** 只有月度上限时，触发前钱包已被耗尽。
- **为何持久化每次状态转移？** 可从任意点重放，并精确恢复租约。
- **何时可跳过持久执行？** 无需人工输入的短任务，或只读工作。
- **`auto` 会漏掉什么？** 隐蔽注入，以及安全动作构成的有害序列。

## 提示
type: tips
from: phases/15-autonomous-systems/13-cost-governors/docs/zh.md, phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md, phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md, phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md, phases/15-autonomous-systems/12-durable-execution/docs/zh.md

- 使用 `auto` 时必须设置 `max_budget_usd`。
- 每次有实质影响的操作前都检查紧急停止开关。
- 只能由人的明确操作重新启用已触发的停止开关。
- 每个新工具都配置独立上限与告警。
- 不可逆写入始终由人审批，读取则无需审批。
- 每条回滚路径至少完整演练一次。
