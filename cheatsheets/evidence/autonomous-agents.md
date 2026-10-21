# Evidence: cheatsheets/autonomous-agents.md
upstream_revision: 45fa4084de6ba2f88fa96a41e69efa2166f868b3

# 证据对照：自主 Agent 与权限

中文主题：[自主 Agent 与权限](../autonomous-agents.md)。下列逐条英文记录保留冻结上游版本的路径、行号与数值；标题对应中文主题。

原始记录中的 docs/en.md 和行号只在上述 upstream 版本有效，不代表当前 docs/zh.md 的行号，也不表示本次重新运行了命令、GPU 测量或外部模型。当前中文主题的 from 路径另由构建器校验。

Abbreviations: L01 = phases/15-autonomous-systems/01-long-horizon-agents, L10 = phases/15-autonomous-systems/10-claude-code-permission-modes, L12 = phases/15-autonomous-systems/12-durable-execution, L13 = phases/15-autonomous-systems/13-cost-governors, L14 = phases/15-autonomous-systems/14-kill-switches-canaries, L15 = phases/15-autonomous-systems/15-propose-then-commit, L16 = phases/15-autonomous-systems/16-checkpoints-rollback, D = docs/en.md, C = code/main.py.

## 操作员任务 (task-table)

原始区块：Operator tasks (task-table, 8)
- plan mode reviews first: L10/D:24
- acceptEdits auto-approves writes: L10/D:26
- max_budget_usd, max_turns: L13/D:48-49
- allowed_tools / disallowed_tools: L13/D:50
- kubectl delete pod container kill: L14/D:31
- CircuitBreaker(threshold=5): L14/C:72
- replay with EventLog(path) and workflow(log, query): L12/C:91, 147-151
- k = p.key() idempotency key: L15/C:34-37, 79

## 控制层 (architecture)

原始区块：Control layers (architecture, 8 nodes, 7 edges)
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

## 提案、提交、验证 (flow)

原始区块：Propose, commit, verify (flow, 7)
1. propose record metadata, status waiting: L15/D:22-28, L15/C:85
2. reviewer is a person: L15/D:29
3. checklist_approve all three checks, approved: L15/C:110-119
4. precondition, aborted-precondition: L16/C:94-97, L16/D:39
5. persist intent before side effect: L16/C:102-120, L16/D:83
6. verify by re-read, rollback: L16/C:122-128, L16/D:43-50
7. terminal status returns stored result: L16/C:80-92

## 持久执行的 activity (annotated-code)

原始区块：Durable activity (annotated-code, 14 lines)
- L12/C:51-66 (print lines 57 and 63 left out)

## 成本治理与熔断器 (annotated-code)

原始区块：Governor and breaker (annotated-code, 12 lines)
- Governor fields max_turns 200, max_budget_usd 50.0: L13/C:37-38
- iteration, session, velocity checks: L13/C:96-103
- kill switch check: L14/C:79-82
- breaker.record and break: L14/C:85-90, 37-46

## 权限模式 (concepts)

原始区块：Permission modes (concepts, 6)
- plan mode, user approves the plan: L10/D:24
- default mode, prompts for risky actions: L10/D:25
- acceptEdits, writes auto-approve: L10/D:26
- auto mode, classifier reviews each action: L10/D:27
- dontAsk, unapproved actions denied: L10/D:28
- bypassPermissions, throwaway containers only: L10/D:29

## 模拟器默认值 (defaults)

原始区块：Defaults in the simulators (defaults, 8)
- max_tokens_per_request 10_000: L13/C:36
- max_turns 200: L13/C:37
- max_budget_usd 50.0: L13/C:38, aborts on breach L13/D:49
- velocity_usd_per_min 5.0: L13/C:39
- velocity_window_min 10.0: L13/C:40
- monthly_cap_usd 500.0: L13/C:41
- threshold 5: L14/C:33
- half-open probes default 1, 1 to 3: L14/D:46

## 各层上限捕获什么 (concepts)

原始区块：Which cap catches what (concepts, 6)
- runaway loop, velocity limit: L13/D:39
- slow leak, daily cap: L13/D:40
- bad release, weekly or monthly cap: L13/D:41
- legitimate surge, hour or day cap: L13/D:42
- slow adversarial drift beats statistical detectors: L14/D:70
- hard limits catch the drift: L14/D:72
- composed safe actions, no detector catches them: L14/D:80

## 故障排查 (troubleshooting)

原始区块：Troubleshooting (8)
- naive while True loop re-runs everything: L12/D:14-15
- replay divergence, register side effect: L12/D:108, 91
- double execute without idempotency key: L15/D:35
- overdraft without precondition: L16/D:34-39
- committed without side effect, verify: L16/C:107-115, L16/D:43-50
- rubber-stamp, challenge-and-response: L15/D:45-51
- bill tripled, per-tool cap and daily-growth alert: L13/D:61
- detector in agent reach: L14/D:81

## 术语表 (glossary)

原始区块：Glossary (7)
- HITL: L15/D:1, L13/D:98
- METR horizon 50% reliability: L01/D:16
- Denial of Wallet: L13/D:12, 91
- thread_id: L12/D:106
- Lease: L16/D:30
- Blast radius: L15/D:100
- SAGA: L16/D:57, 118

## 问答 (qa)

原始区块：Q&A (5)
- 99% per step fails half on 70 steps: L01/D:72
- stack of caps: L13/D:37
- persist every transition: L16/D:26
- when durable execution is wrong: L12/D:63-64
- auto misses: L10/D:54-55

## 提示 (tips)

原始区块：Tips (6)
- no auto without max_budget_usd: L13/D:53
- check kill switch on every consequential action: L14/D:36
- explicit human re-enable: L14/D:38
- every new tool its own cap and alert: L13/D:61
- always HITL irreversible, never reads: L15/D:57, 59
- rehearse rollback at least once: L16/D:67
