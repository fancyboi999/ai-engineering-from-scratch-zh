# 证据对照：自主 Agent 与权限

中文主题：[自主 Agent 与权限](../autonomous-agents.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## 操作员任务

对应主题区块：**操作员任务**（`task-table`）。

来源文件：

- [`phases/15-autonomous-systems/10-claude-code-permission-modes/docs/zh.md`](../../phases/15-autonomous-systems/10-claude-code-permission-modes/docs/zh.md)
- [`phases/15-autonomous-systems/13-cost-governors/docs/zh.md`](../../phases/15-autonomous-systems/13-cost-governors/docs/zh.md)
- [`phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md`](../../phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md)
- [`phases/15-autonomous-systems/14-kill-switches-canaries/code/main.py`](../../phases/15-autonomous-systems/14-kill-switches-canaries/code/main.py)
- [`phases/15-autonomous-systems/12-durable-execution/code/main.py`](../../phases/15-autonomous-systems/12-durable-execution/code/main.py)
- [`phases/15-autonomous-systems/15-propose-then-commit/code/main.py`](../../phases/15-autonomous-systems/15-propose-then-commit/code/main.py)

构建器核对的标识与数值：

- `max_budget_usd`
- `max_turns`
- `allowed_tools`
- `disallowed_tools`
- `CircuitBreaker`
- `workflow`
- `EventLog`
- `p.key`
- `key`

## 控制层

对应主题区块：**控制层**（`architecture`）。

来源文件：

- [`phases/15-autonomous-systems/10-claude-code-permission-modes/docs/zh.md`](../../phases/15-autonomous-systems/10-claude-code-permission-modes/docs/zh.md)
- [`phases/15-autonomous-systems/13-cost-governors/docs/zh.md`](../../phases/15-autonomous-systems/13-cost-governors/docs/zh.md)
- [`phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md`](../../phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md)
- [`phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md`](../../phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md)
- [`phases/15-autonomous-systems/12-durable-execution/docs/zh.md`](../../phases/15-autonomous-systems/12-durable-execution/docs/zh.md)

构建器核对的标识与数值：

- `thread_id`

## 提案、提交、验证

对应主题区块：**提案、提交、验证**（`flow`）。

来源文件：

- [`phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md`](../../phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md)
- [`phases/15-autonomous-systems/15-propose-then-commit/code/main.py`](../../phases/15-autonomous-systems/15-propose-then-commit/code/main.py)
- [`phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md`](../../phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md)
- [`phases/15-autonomous-systems/16-checkpoints-rollback/code/main.py`](../../phases/15-autonomous-systems/16-checkpoints-rollback/code/main.py)

构建器核对的标识与数值：

- `checklist_approve`

## 持久执行的 activity

对应主题区块：**持久执行的 activity**（`annotated-code`）。

来源文件：

- [`phases/15-autonomous-systems/12-durable-execution/code/main.py`](../../phases/15-autonomous-systems/12-durable-execution/code/main.py)

构建器核对的标识与数值：

- `activity`
- `deco`
- `functools.wraps`
- `wraps`
- `wrapper`
- `log.lookup`
- `lookup`
- `log.append`
- `append`
- `list`

## 成本治理与熔断器

对应主题区块：**成本治理与熔断器**（`annotated-code`）。

来源文件：

- [`phases/15-autonomous-systems/13-cost-governors/code/main.py`](../../phases/15-autonomous-systems/13-cost-governors/code/main.py)
- [`phases/15-autonomous-systems/14-kill-switches-canaries/code/main.py`](../../phases/15-autonomous-systems/14-kill-switches-canaries/code/main.py)

构建器核对的标识与数值：

- `max_turns`
- `max_budget_usd`
- `Governor`
- `gov.enable_iter_cap`
- `gov.max_turns`
- `enable_iter_cap`
- `run.stopped_by`
- `stopped_by`
- `gov.enable_session_cap`
- `run.dollars`
- `gov.max_budget_usd`
- `enable_session_cap`
- `gov.enable_velocity`
- `enable_velocity`
- `velocity_exceeded`
- `now_min`
- `velocity_limit`
- `kill_switch`
- `breaker.record`
- `a.kind`
- `a.payload`
- `record`

## 权限模式

对应主题区块：**权限模式**（`concepts`）。

来源文件：

- [`phases/15-autonomous-systems/10-claude-code-permission-modes/docs/zh.md`](../../phases/15-autonomous-systems/10-claude-code-permission-modes/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 模拟器默认值

对应主题区块：**模拟器默认值**（`defaults`）。

来源文件：

- [`phases/15-autonomous-systems/13-cost-governors/code/main.py`](../../phases/15-autonomous-systems/13-cost-governors/code/main.py)
- [`phases/15-autonomous-systems/14-kill-switches-canaries/code/main.py`](../../phases/15-autonomous-systems/14-kill-switches-canaries/code/main.py)
- [`phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md`](../../phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md)

构建器核对的标识与数值：

- `max_tokens_per_request`
- `10_000`
- `max_turns`
- `200`
- `max_budget_usd`
- `50.0`
- `velocity_usd_per_min`
- `5.0`
- `velocity_window_min`
- `10.0`
- `monthly_cap_usd`
- `500.0`
- `5`
- `1`

## 各层上限捕获什么

对应主题区块：**各层上限捕获什么**（`concepts`）。

来源文件：

- [`phases/15-autonomous-systems/13-cost-governors/docs/zh.md`](../../phases/15-autonomous-systems/13-cost-governors/docs/zh.md)
- [`phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md`](../../phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`phases/15-autonomous-systems/12-durable-execution/docs/zh.md`](../../phases/15-autonomous-systems/12-durable-execution/docs/zh.md)
- [`phases/15-autonomous-systems/13-cost-governors/docs/zh.md`](../../phases/15-autonomous-systems/13-cost-governors/docs/zh.md)
- [`phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md`](../../phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md)
- [`phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md`](../../phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md)
- [`phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md`](../../phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 术语表

对应主题区块：**术语表**（`glossary`）。

来源文件：

- [`phases/15-autonomous-systems/01-long-horizon-agents/docs/zh.md`](../../phases/15-autonomous-systems/01-long-horizon-agents/docs/zh.md)
- [`phases/15-autonomous-systems/12-durable-execution/docs/zh.md`](../../phases/15-autonomous-systems/12-durable-execution/docs/zh.md)
- [`phases/15-autonomous-systems/13-cost-governors/docs/zh.md`](../../phases/15-autonomous-systems/13-cost-governors/docs/zh.md)
- [`phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md`](../../phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md)
- [`phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md`](../../phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`phases/15-autonomous-systems/01-long-horizon-agents/docs/zh.md`](../../phases/15-autonomous-systems/01-long-horizon-agents/docs/zh.md)
- [`phases/15-autonomous-systems/13-cost-governors/docs/zh.md`](../../phases/15-autonomous-systems/13-cost-governors/docs/zh.md)
- [`phases/15-autonomous-systems/12-durable-execution/docs/zh.md`](../../phases/15-autonomous-systems/12-durable-execution/docs/zh.md)
- [`phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md`](../../phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md)
- [`phases/15-autonomous-systems/10-claude-code-permission-modes/docs/zh.md`](../../phases/15-autonomous-systems/10-claude-code-permission-modes/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`phases/15-autonomous-systems/13-cost-governors/docs/zh.md`](../../phases/15-autonomous-systems/13-cost-governors/docs/zh.md)
- [`phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md`](../../phases/15-autonomous-systems/14-kill-switches-canaries/docs/zh.md)
- [`phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md`](../../phases/15-autonomous-systems/15-propose-then-commit/docs/zh.md)
- [`phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md`](../../phases/15-autonomous-systems/16-checkpoints-rollback/docs/zh.md)
- [`phases/15-autonomous-systems/12-durable-execution/docs/zh.md`](../../phases/15-autonomous-systems/12-durable-execution/docs/zh.md)

构建器核对的标识与数值：

- `max_budget_usd`

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: cheatsheets/autonomous-agents.md

Paths are relative to /private/tmp/aiefs-cheatsheets/phases/15-autonomous-systems/. L01 = 01-long-horizon-agents, L10 = 10-claude-code-permission-modes, L12 = 12-durable-execution, L13 = 13-cost-governors, L14 = 14-kill-switches-canaries, L15 = 15-propose-then-commit, L16 = 16-checkpoints-rollback. D = docs/en.md, C = code/main.py.

## Operator tasks (task-table, 8)
- plan mode reviews first: L10/D:24
- acceptEdits auto-approves writes: L10/D:26
- max_budget_usd, max_turns: L13/D:48-49
- allowed_tools / disallowed_tools: L13/D:50
- kubectl delete pod container kill: L14/D:31
- CircuitBreaker(threshold=5): L14/C:72
- replay with EventLog(path) and workflow(log, query): L12/C:91, 147-151
- k = p.key() idempotency key: L15/C:34-37, 79

## Control layers (architecture, 8 nodes, 7 edges)
- Agent loop turns, tool calls: L13/D:22-26
- Permission mode ladder plan to bypassPermissions: L10/D:22-29
- Cost governor stack of caps: L13/D:20-33
- Kill switch the agent cannot write: L14/D:26, 35
- Circuit breaker closed, open, half-open: L14/D:44-46
- Canary token access is the alarm: L14/D:57
- Proposal store propose, commit, verify: L15/D:22-31
- Event log keyed by thread_id: L12/D:27, 44
- edge gov to kill on breach: L13/D:33
- edge perm to gov (auto needs budget): L13/D:53
- edge prop to log persist: L15/D:41

## Propose, commit, verify (flow, 7)
1. propose record metadata, status waiting: L15/D:22-28, L15/C:85
2. reviewer is a person: L15/D:29
3. checklist_approve all three checks, approved: L15/C:110-119
4. precondition, aborted-precondition: L16/C:94-97, L16/D:39
5. persist intent before side effect: L16/C:102-120, L16/D:83
6. verify by re-read, rollback: L16/C:122-128, L16/D:43-50
7. terminal status returns stored result: L16/C:80-92

## Durable activity (annotated-code, 14 lines)
- L12/C:51-66 (print lines 57 and 63 left out)

## Governor and breaker (annotated-code, 12 lines)
- Governor fields max_turns 200, max_budget_usd 50.0: L13/C:37-38
- iteration, session, velocity checks: L13/C:96-103
- kill switch check: L14/C:79-82
- breaker.record and break: L14/C:85-90, 37-46

## Permission modes (concepts, 6)
- six rows: L10/D:24-29

## Defaults in the simulators (defaults, 8)
- max_tokens_per_request 10_000: L13/C:36
- max_turns 200: L13/C:37
- max_budget_usd 50.0: L13/C:38, aborts on breach L13/D:49
- velocity_usd_per_min 5.0: L13/C:39
- velocity_window_min 10.0: L13/C:40
- monthly_cap_usd 500.0: L13/C:41
- threshold 5: L14/C:33
- half-open probes default 1, 1 to 3: L14/D:46

## Which cap catches what (concepts, 6)
- runaway loop, slow leak, bad release, surge: L13/D:39-42
- slow adversarial drift, hard limits: L14/D:70-72
- composed safe actions: L14/D:80

## Troubleshooting (8)
- naive while True loop re-runs everything: L12/D:14-15
- replay divergence, register side effect: L12/D:108, 91
- double execute without idempotency key: L15/D:35
- overdraft without precondition: L16/D:34-39
- committed without side effect, verify: L16/C:107-115, L16/D:43-50
- rubber-stamp, challenge-and-response: L15/D:45-51
- bill tripled, per-tool cap and daily-growth alert: L13/D:61
- detector in agent reach: L14/D:81

## Glossary (7)
- HITL: L15/D:1, L13/D:98
- METR horizon 50% reliability: L01/D:16
- Denial of Wallet: L13/D:12, 91
- thread_id: L12/D:106
- Lease: L16/D:30
- Blast radius: L15/D:100
- SAGA: L16/D:57, 118

## Q&A (5)
- 99% per step fails half on 70 steps: L01/D:72
- stack of caps: L13/D:37
- persist every transition: L16/D:26
- when durable execution is wrong: L12/D:63-64
- auto misses: L10/D:54-55

## Tips (6)
- no auto without max_budget_usd: L13/D:53
- check kill switch on every consequential action: L14/D:36
- explicit human re-enable: L14/D:38
- every new tool its own cap and alert: L13/D:61
- always HITL irreversible, never reads: L15/D:57, 59
- rehearse rollback at least once: L16/D:67
````
