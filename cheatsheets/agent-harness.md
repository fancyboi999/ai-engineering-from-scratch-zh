---
id: agent-harness
title: Agent 运行框架工程
subtitle: 模型外围的工程代码：循环契约、钩子、预算、工具、门控、沙箱、追踪与工作台文件。
hue: 248
sources: phases/14-agent-engineering/01-the-agent-loop, phases/14-agent-engineering/31-agent-workbench-why-models-fail, phases/14-agent-engineering/32-minimal-agent-workbench, phases/14-agent-engineering/33-instructions-as-executable-constraints, phases/14-agent-engineering/36-scope-contracts, phases/14-agent-engineering/37-runtime-feedback-loops, phases/14-agent-engineering/38-verification-gates, phases/14-agent-engineering/40-multi-session-handoff, phases/14-agent-engineering/42-agent-workbench-capstone, phases/15-autonomous-systems/10-claude-code-permission-modes, phases/19-capstone-projects/20-agent-harness-loop-contract, phases/19-capstone-projects/21-tool-registry-schema-validation, phases/19-capstone-projects/23-function-call-dispatcher, phases/19-capstone-projects/25-verification-gates-observation-budget, phases/19-capstone-projects/26-sandbox-runner-denylist, phases/19-capstone-projects/27-eval-harness-fixture-tasks, phases/19-capstone-projects/28-observability-otel-traces, phases/19-capstone-projects/29-end-to-end-coding-task-demo
code: AH
source_hash: ed4a366e9a07d55c
---

## 运行框架架构
type: architecture
from: phases/19-capstone-projects/20-agent-harness-loop-contract/docs/zh.md, phases/19-capstone-projects/20-agent-harness-loop-contract/code/main.py, phases/19-capstone-projects/23-function-call-dispatcher/docs/zh.md, phases/19-capstone-projects/25-verification-gates-observation-budget/docs/zh.md, phases/19-capstone-projects/26-sandbox-runner-denylist/docs/zh.md, phases/19-capstone-projects/28-observability-otel-traces/docs/zh.md

```arch
node | caller | 1,1 | 调用方 | run, resume | client
node | loop | 2,1 | HarnessLoop | 6 种状态 | process
node | hooks | 3,1 | HookRegistry | 10 个主题 | queue
node | budget | 4,1 | Budget | turns, tool_calls | store
node | policy | 1,2 | 规划器 | 计划步骤 | model
node | gates | 2,2 | GateChain | 首次拒绝即停止 | process
node | tools | 3,2 | 分发器与沙箱 | 注册、重试、隔离 | process
node | trace | 4,2 | 事件与 span | traces.jsonl | store
edge | caller | loop | run
edge | loop | hooks | 触发
edge | hooks | budget |
edge | loop | policy | 规划
edge | loop | gates | 工具调用
edge | gates | tools | ALLOW
edge | tools | trace | span
```

## 循环的一步
type: flow
from: phases/19-capstone-projects/20-agent-harness-loop-contract/code/main.py, phases/19-capstone-projects/20-agent-harness-loop-contract/docs/zh.md

1. **IDLE**：`run(goal)` 发出 `session.start`。这是唯一合法入口。
2. **PLANNING**：规划器起草步骤，循环发出 `plan.draft` 和 `plan.commit`。
3. **预算检查**：每步调用 `_check_budget()`，触及上限时暂停并回到 IDLE。
4. **EXECUTING**：循环触发 `before_step`，无工具步骤进入 REFLECTING。
5. **工具步骤**：循环发出 `tool.call`，向调用方返回 `PullRequest`。
6. **AWAITING_TOOL**：调用方运行工具并调用 `resume(payload)`。
7. **REFLECTING**：进入下一步，最后一步完成后以 `goal_met` 进入 DONE。

## 核心循环：HarnessLoop._step
type: annotated-code
lang: python
from: phases/19-capstone-projects/20-agent-harness-loop-contract/code/main.py

```python
def _step(self) -> PullRequest | SessionResult:
    budget_hit = self._check_budget()        # 每步都检查
    if budget_hit is not None:
        return budget_hit                    # 暂停，回到 IDLE
    if self.state == State.REFLECTING:
        self._cursor += 1                    # 同时 turns += 1
        if self._cursor >= len(self._plan):
            return self._complete("goal_met")
    step = self._plan[self._cursor]
    if step.requires_tool:
        self.hooks.fire("before_tool_call", {"step": step})
        self.budget.tool_calls += 1          # 让出控制前计数
        self._transition(State.AWAITING_TOOL)
        return PullRequest(reason="tool_call", ...)  # 拉取点
```

## 驱动循环
type: task-table
from: phases/19-capstone-projects/20-agent-harness-loop-contract/code/main.py

| 任务 | 代码 |
|---|---|
| 启动会话 | `out = loop.run("<goal>")` |
| 订阅钩子 | `loop.hooks.on("<topic>", <fn>)` |
| 阻止工具调用 | `raise HookAbort("<reason>")` |
| 返回工具结果 | `loop.resume({"result": <value>})` |
| 从预算暂停中恢复 | `loop.resume()` |
| 设置预算 | `Budget(max_turns=<n>, max_tool_calls=<n>)` |

## 工具、门控与追踪
type: task-table
from: phases/19-capstone-projects/21-tool-registry-schema-validation/code/main.py, phases/19-capstone-projects/23-function-call-dispatcher/code/main.py, phases/19-capstone-projects/25-verification-gates-observation-budget/code/main.py, phases/19-capstone-projects/26-sandbox-runner-denylist/code/main.py, phases/19-capstone-projects/28-observability-otel-traces/code/main.py

| 任务 | 代码 |
|---|---|
| 注册工具 | `registry.register(<name>, <schema>, <fn>)` |
| 替换工具 | `registry.register(..., override=True)` |
| 分发调用 | `await disp.dispatch("<name>", <args>)` |
| 合并重复调用 | `disp.dispatch(..., idempotency_key="<key>")` |
| 门控调用 | `chain.evaluate(<call>, <ctx>)` |
| 在沙箱中运行 | `sandbox.run([<exe>, "<arg>"])` |
| 追踪工具调用 | `builder.span("gen_ai.tool.execution")` |

## 先经过门控链，再进入沙箱
type: annotated-code
lang: python
from: phases/19-capstone-projects/25-verification-gates-observation-budget/code/main.py, phases/19-capstone-projects/26-sandbox-runner-denylist/code/main.py

```python
chain = GateChain(gates=(
    WhitelistGate(allowed=frozenset({"read_file"})),  # 允许集合
    RegexGate.from_strings(patterns=(r"\bsudo\b",)),  # argv 模式
    RecencyGate(window=3),                  # 观察结果是否过期
    BudgetGate(max_tokens=200),             # 台账总量
))
outcome = chain.evaluate(call, ctx)         # 首次拒绝即停止
if not outcome.allow:
    refused += 1                            # 见 outcome.deny_reason
ledger.record(obs)                          # 供 BudgetGate 读取
config = SandboxConfig(project_root=root)
result = Sandbox(config=config).run(["rm", "-rf", "."])
result.denied                               # True：rm 位于拒绝列表
```

## 工作台脚本
type: command-table
from: phases/14-agent-engineering/42-agent-workbench-capstone/outputs/agent-workbench-pack/bin/install.sh, phases/14-agent-engineering/42-agent-workbench-capstone/outputs/agent-workbench-pack/scripts/init_agent.py, phases/14-agent-engineering/42-agent-workbench-capstone/outputs/agent-workbench-pack/scripts/run_with_feedback.py, phases/14-agent-engineering/42-agent-workbench-capstone/outputs/agent-workbench-pack/scripts/verify_agent.py, phases/14-agent-engineering/42-agent-workbench-capstone/outputs/agent-workbench-pack/scripts/generate_handoff.py, phases/14-agent-engineering/42-agent-workbench-capstone/docs/zh.md

| 命令 | 作用 |
|---|---|
| `bin/install.sh` | 将工具包复制到仓库。 |
| `bin/install.sh --force` | 覆盖已有 `AGENTS.md`。 |
| `python3 scripts/init_agent.py` | 检查运行时、依赖、环境和状态时效。 |
| `python3 scripts/run_with_feedback.py <cmd>` | 向 `feedback_record.jsonl` 写入一条记录。 |
| `python3 scripts/verify_agent.py <task_id>` | 门控裁决，阻止时以状态码 1 退出。 |
| `python3 scripts/generate_handoff.py <task_id>` | 写入 `handoff.json` 和 `handoff.md`。 |

## 工作台的七个方面
type: concepts
from: phases/14-agent-engineering/31-agent-workbench-why-models-fail/docs/zh.md

- **指令**：启动规则、禁止操作、完成定义。
- **状态**：当前任务、改动文件、阻塞、下一步操作。
- **范围**：允许文件、禁止文件、验收标准。
- **反馈**：将真实命令输出带回循环。
- **验证**：测试、lint、冒烟运行、范围检查。
- **评审**：换一个角色做第二遍检查。
- **交接**：改了什么、原因、剩余事项。

## 默认值
type: defaults
from: phases/19-capstone-projects/20-agent-harness-loop-contract/code/main.py, phases/19-capstone-projects/21-tool-registry-schema-validation/code/main.py, phases/19-capstone-projects/23-function-call-dispatcher/code/main.py, phases/19-capstone-projects/26-sandbox-runner-denylist/code/main.py, phases/19-capstone-projects/29-end-to-end-coding-task-demo/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `max_turns` | 8 | 预算，暂停前的轮数 |
| `max_tool_calls` | 16 | 预算，每个会话的工具调用数 |
| `max_wall_seconds` | 30.0 | 预算，墙钟秒数 |
| `timeout_ms` | 30_000 | 单个工具的超时，每次调用的覆盖值优先 |
| `max_attempts` | 3 | 分发器，仅重试超时与暂时性错误 |
| `concurrency` | 8 | 分发器扇出的信号量 |
| `DEFAULT_MAX_OUTPUT_BYTES` | 64 * 1024 | 沙箱每个输出流的上限 |
| `observation_budget` | 4000 | token 数，第 29 课端到端运行 |

## 故障排查
type: troubleshooting
from: phases/19-capstone-projects/20-agent-harness-loop-contract/code/main.py, phases/19-capstone-projects/21-tool-registry-schema-validation/code/main.py, phases/19-capstone-projects/23-function-call-dispatcher/docs/zh.md, phases/19-capstone-projects/26-sandbox-runner-denylist/code/main.py, phases/14-agent-engineering/42-agent-workbench-capstone/outputs/agent-workbench-pack/scripts/verify_agent.py

| 现象 | 原因 | 修正 |
|---|---|---|
| `illegal transition` | 转移边不在合法映射中 | 仅在 `_transition` 中改变状态 |
| `requires a payload` | 在工具拉取点调用了 `resume()` | 传入结果或错误 |
| `budget_exceeded:turns` | 已达到预算上限 | 检查后调用 `resume()` |
| `kind="schema"` 从不重试 | schema 错误是确定性的 | 修正参数 |
| 写操作执行两次 | 重试与进行中的调用竞争 | 传入 `idempotency_key` |
| 被 `feedback.null_exit` 阻止 | 未捕获退出码 | 重新运行，不要推进 |

## 术语表
type: glossary
from: phases/14-agent-engineering/01-the-agent-loop/docs/zh.md, phases/14-agent-engineering/01-the-agent-loop/outputs/skill-agent-loop.md, phases/19-capstone-projects/23-function-call-dispatcher/code/main.py, phases/19-capstone-projects/27-eval-harness-fixture-tasks/docs/zh.md, phases/19-capstone-projects/28-observability-otel-traces/docs/zh.md, phases/15-autonomous-systems/10-claude-code-permission-modes/code/main.py

- **ReAct**：Reason + Act，在同一流中表达思考、行动和观察。
- **OTel**：OpenTelemetry，GenAI 语义约定规定 `gen_ai.*` 键。
- **JSON-RPC**：错误码 -32601、-32602、-32603。
- **pass@k**：k 次采样上的 `1 - (1 - p)^k`。
- **HITL**：人工介入，低置信度操作交由人处理。

## 问答
type: qa
from: phases/19-capstone-projects/20-agent-harness-loop-contract/docs/zh.md, phases/19-capstone-projects/23-function-call-dispatcher/docs/zh.md, phases/19-capstone-projects/25-verification-gates-observation-budget/docs/zh.md, phases/19-capstone-projects/26-sandbox-runner-denylist/docs/zh.md, phases/14-agent-engineering/38-verification-gates/docs/zh.md

- **预算为何要让出控制？** 由调用方决定增加预算并恢复，还是关闭会话。
- **非幂等操作超时后为何不重试？** 写入可能已经提交，重试会重复写入。
- **为何先运行低成本门控？** 拒绝会在昂贵检查前终止整个链。
- **为何不用 LLM 裁判做门控？** 相同产物必须得到相同裁决。

## 提示
type: tips
from: phases/19-capstone-projects/20-agent-harness-loop-contract/docs/zh.md, phases/19-capstone-projects/23-function-call-dispatcher/docs/zh.md, phases/14-agent-engineering/01-the-agent-loop/docs/zh.md, phases/14-agent-engineering/33-instructions-as-executable-constraints/docs/zh.md, phases/14-agent-engineering/36-scope-contracts/docs/zh.md

- 仅在一个函数中改变状态，使不变量集中在一处。
- 在规划器中生成键：`f"{step_id}:{tool_name}:{hash(args)}"`。
- 将工具错误作为观察字符串返回，不要让程序崩溃。
- 钩子可修改或中止操作，事件只负责记录。
- `AGENTS.md` 控制在 50 行以内，按需加载主题文档。
- 每份范围契约都包含 `forbidden_files`。
