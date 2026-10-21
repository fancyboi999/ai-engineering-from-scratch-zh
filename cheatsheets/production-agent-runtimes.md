---
id: production-agent-runtimes
title: 生产 agent 运行时与队列
code: PA
subtitle: 选择运行时形态，创建检查点并重放，用租约与栅栏管理任务，重试有作用域的读取。使用 Python 与 Go。
hue: 30
sources: phases/14-agent-engineering/29-production-runtimes, phases/15-autonomous-systems/12-durable-execution, phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints, projects/durable-agent-jobs, projects/cloud-agent-with-aws-strands
source_hash: fbbc02c35bb8bf0a
---

## 选择运行时形态
type: concepts
from: phases/14-agent-engineering/29-production-runtimes/docs/zh.md, phases/15-autonomous-systems/12-durable-execution/docs/zh.md, phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/docs/zh.md

- **请求响应**：同步 HTTP，用户等待。只适合短任务（<30s）。
- **流式**：SSE 或 WebSocket。关注首个 token 延迟和尾延迟。
- **持久执行**：每步后为状态创建检查点，失败后自动恢复。
- **基于队列**：生产者、执行者池、DLQ。关注队列深度与 DLQ 大小。
- **事件驱动**：agent 订阅触发事件。关注从事件到启动的延迟。
- **定时调度**：类似 cron，与持久执行结合。
- **工作流与活动**：确定性编排代码。每次 LLM 或工具调用都是有日志的活动。
- **效果上的恰好一次**：至少一次投递，加上幂等消费者。

## 持久任务存储
type: architecture
from: projects/durable-agent-jobs/API.md, projects/durable-agent-jobs/README.md

```arch
node | enq | 1,1 | enqueue | --store, --input | client
node | lock | 2,1 | ledger.lock | 咨询锁 | store
node | jobs | 3,1 | jobs.json | ID, State, Version | store
node | wrk | 1,2 | worker | 认领、产生效果、完成 | process
node | inp | 2,2 | inputs/<id>.json | 不可变输入 | store
node | eff | 3,2 | effects/<id>.json | 不可变凭据 | store
edge | enq | lock | 读取、修改、写入
edge | lock | jobs | 快照
edge | enq | inp | 文本
edge | wrk | lock | ClaimNext
edge | wrk | eff | 凭据
```

## 各阶段的任务生命周期
type: flow
from: projects/durable-agent-jobs/solution/stage1.go, projects/durable-agent-jobs/solution/stage2.go, projects/durable-agent-jobs/solution/stage3.go, projects/durable-agent-jobs/solution/stage4.go

1. **NewJob**：ID 必须匹配 `^[a-z][a-z0-9-]{0,63}$`。状态为 queued，版本为 0。
2. **ClaimJob**：需要预期版本且状态为 queued，否则返回 `ErrConflict`。
3. **ClaimJob**：`Attempts >= maxAttempts` 时返回 `ErrLimit`。
4. **ClaimJob**：执行 `Version++`、`Attempts++`、`LeaseUntil = now + ttl`，状态变为 running。
5. **Finish**：需要当前版本、running 状态且 `now < LeaseUntil`，状态变为 completed。
6. **Reclaim**：running 且 `now >= LeaseUntil` 时，状态变为 queued，`Version++` 隔离旧执行者。
7. **Save**：依次执行 `ValidateJobs`、写临时文件、`f.Sync()`、`os.Rename`。上限为 4 MiB。

## 持久任务 CLI
type: command-table
from: projects/durable-agent-jobs/README.md, projects/durable-agent-jobs/API.md

| 命令 | 作用 |
|---|---|
| `go build -o /tmp/durable-jobs .` | 在 `solution` 中构建参考二进制 |
| `enqueue --store <dir> --input <file>` | 添加任务。相同内容重复投递是安全的 |
| `worker --store <dir> --max-jobs 100` | 认领并执行最多 100 个任务 |
| `status --store <dir>` | 显示任务、已有副作用结果和作用域 |
| `--crash-after effect` | 凭据存在后以 86 退出 |
| `--crash-after claim` | 输出存在前以 86 退出 |
| `--now-ms 111 --lease-ms 10` | 使用逻辑时钟。旧租约已过期 |
| `go run . demo` | 运行副作用发生后崩溃的序列 |

## 运行演示
type: task-table
from: phases/14-agent-engineering/29-production-runtimes/docs/zh.md, projects/durable-agent-jobs/README.md, projects/cloud-agent-with-aws-strands/README.md, projects/cloud-agent-with-aws-strands/requirements-framework.txt

| 任务 | 代码 |
|---|---|
| 运行课程演示 | `python3 code/main.py` |
| 为项目参考解答评分 | `--all --solution --strict` |
| 运行云读取器 | `python3 cli.py samples/input.json` |
| 改为实时读取 AWS | `python3 cli.py <input> --mode aws` |
| 固定可选 SDK 版本 | `strands-agents==1.57.1` |

## 从事件日志重放活动
type: annotated-code
lang: python
from: phases/15-autonomous-systems/12-durable-execution/code/main.py

```python
@activity("call_llm")                    # 每次 LLM 调用都是活动
def call_llm(doc_count: int) -> str:
    return f"summary({doc_count}_docs)"
hit = log.lookup(name, args)             # 相同参数的完成事件
if hit:
    return hit["result"]                 # 重放，不重新执行
log.append({"name": name, "args": list(args), "status": "started"})
result = fn(*args)                       # 仅日志中不存在时执行
log.append({"name": name, "args": list(args),
            "status": "done", "result": result})
```

## 每个超级步创建检查点
type: annotated-code
lang: python
from: phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/code/main.py

```python
store = CheckpointStore(db_path)         # SQLite checkpoints 表
store.write(thread_id, super_step, dict(state))  # 每步一行
restored = store.latest(thread_id)       # ORDER BY super_step DESC
super_step, state = restored
super_step += 1                          # 从上一步之后恢复
run_agent_with_checkpoint(store, "t-1", crash_at=3, goal=5)
final = run_agent_with_checkpoint(store, "t-1", goal=5)  # 执行者 2
await asyncio.gather(*(sim_llm_call_async() for _ in range(n)))
```

## 有作用域的云读取器契约
type: annotated-code
lang: python
from: projects/cloud-agent-with-aws-strands/API.md, projects/cloud-agent-with-aws-strands/solution/plan.py, projects/cloud-agent-with-aws-strands/solution/executor.py, projects/cloud-agent-with-aws-strands/solution/retry.py, projects/cloud-agent-with-aws-strands/solution/cli.py

```python
ALLOWED = {"inventory.list", "metrics.read", "logs.read"}
validate_plan(raw, scope)        # 一至十个动作，只读且在作用域内
execute(plan, provider, max_steps=5, max_chars=4000)
# 超出预算：状态为 budget_exhausted
request_key(operation, resource) # JSON 对的 sha256
cached_read(operation, resource, provider, cache, retries=2)
# 缓存命中：attempts 为 0。仅 TimeoutError 会重试
run(payload, provider)           # 添加带 cached、attempts 的凭据
parse_model_plan(text, scope)    # 模型计划交给 validate_plan
```

## 默认值
type: defaults
from: projects/durable-agent-jobs/API.md, projects/durable-agent-jobs/solution/main.go, projects/cloud-agent-with-aws-strands/solution/executor.py, projects/cloud-agent-with-aws-strands/solution/retry.py, projects/cloud-agent-with-aws-strands/solution/cli.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `--lease-ms` | 30000 | 认领租约，单位毫秒 |
| `--max-attempts` | 3 | 之后任务等待人工对账 |
| `--max-jobs` | 1 | 单次执行者调用处理的任务数 |
| `--delay-ms` | 0 | 范围 0..60000 |
| `--now-ms` | -1 | -1 表示当前实际时间 |
| `max_steps` | 5 | 步数预算。`max_chars` 为 4000 |
| `retries` | 2 | 用于 `cached_read`，CLI 的 `run` 传入 1 |

## 故障排查
type: troubleshooting
from: phases/14-agent-engineering/29-production-runtimes/docs/zh.md, phases/15-autonomous-systems/12-durable-execution/docs/zh.md, phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/docs/zh.md, projects/durable-agent-jobs/README.md, projects/durable-agent-jobs/API.md, projects/durable-agent-jobs/solution/stage3.go

| 现象 | 原因 | 修正 |
|---|---|---|
| 用户断开，重试叠加 | 5 分钟任务使用请求响应 | 使用队列或持久执行 |
| 失败任务消失 | 队列执行者没有死信机制 | 添加 DLQ 并展示其大小 |
| 用户报告前看不到故障 | 后台执行未导出 trace | 导出 OpenTelemetry GenAI span |
| 崩溃后重跑工具并重复计费 LLM | 朴素的 `while True` 循环 | 把每次调用记录为活动并重放 |
| 完成操作返回冲突 | 旧执行者的版本或租约已改变 | 让新认领者完成任务 |
| 任务停留在尝试次数上限 | 达到 `--max-attempts` | 对可见任务做人工对账 |
| 重放结果分歧 | 工作流决策中读取实际时钟 | 将其登记为副作用 |
| 10,000 次调用使用 10GB 栈内存 | 每次 LLM 调用一个线程 | I/O 层使用异步 |

## 问答
type: qa
from: phases/15-autonomous-systems/12-durable-execution/docs/zh.md, projects/durable-agent-jobs/README.md, projects/cloud-agent-with-aws-strands/README.md, phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/docs/zh.md

- **选择哪种检查点后端？** PostgreSQL 可跨部署保留数据。SQLite 仅用于本地开发。Redis 未配置 AOF 或快照时是临时存储。
- **何时不适合持久执行？** 没有人类输入且短于几分钟的运行，或严格只读的检索。
- **持久性会解决 35 分钟后的退化吗？** 不会。重新进入时添加新的 HITL 和预算熔断开关。
- **凭据是恰好一次吗？** 不是。执行至少一次，凭据只使这个本地副作用幂等。
- **三步为何只有两次提供方读取？** 重复的 metrics.read 使用请求内缓存。
- **恢复结果显示什么？** `incident-summary` 为 completed v4，尝试 2 次，且 `reused_effect: true`。

## 提示
type: tips
from: phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/docs/zh.md, projects/durable-agent-jobs/README.md, projects/durable-agent-jobs/API.md

- 从 FastAPI + Postgres 开始，测量发现不足后再升级。
- 每次有副作用的调用都加入去重键。
- 支付和外部 API 调用使用 outbox 模式。
- 使用彩虹部署，部署时绝不终止执行中的 agent。
- I/O 使用异步，线程只用于 CPU 密集型后处理。
- 任务存储放在同一个本地 POSIX 文件系统上，不放在 NFS。
- 执行者运行时不要编辑存储文件。
