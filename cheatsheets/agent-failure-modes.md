---
id: agent-failure-modes
title: agent 为什么失败
code: WA
subtitle: 识别失败类型，在轨迹中定位并设置门禁。检测器、MAST、重试风暴、PVE 与轨迹调试器。
hue: 0
sources: phases/14-agent-engineering/25-multi-agent-debate, phases/14-agent-engineering/26-failure-modes-agentic, phases/14-agent-engineering/27-prompt-injection-defense, phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink, projects/agent-trace-debugger
source_hash: c22910c596016417
---

## 现象、原因与修正
type: troubleshooting
span: 2
from: phases/14-agent-engineering/26-failure-modes-agentic/docs/zh.md, phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md, phases/14-agent-engineering/27-prompt-injection-defense/docs/zh.md, phases/14-agent-engineering/25-multi-agent-debate/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 返回 400 错误却报告成功 | 成功幻觉 | 重新探查状态。文件真的创建了吗？ |
| 一次错误调用引发四次 API 调用 | 级联错误 | 在每一步设置自动验证门禁 |
| 下游负载升至 10x | 重试风暴 | 熔断器与每请求重试次数上限 |
| 准确率逐渐下降，却没有崩溃 | 记忆投毒 | 仅追加日志、来源追溯、不可写入的验证器 |
| 三个 agent 给出同一个错误答案 | 同质化崩溃 | 使用多样的 prompt 和/或模型 |
| 两个 agent 都认为自己是审核者 | 角色模糊 | 为每项任务明确角色契约与验收测试 |
| agent A 认为已完成，agent B 仍在运行 | 状态漂移 | 版本化共享状态、状态同步检查点 |
| 检索页面覆盖开发者 prompt | 间接 prompt 注入 | 将全部检索内容视为不可信。加入 PVE |

## 五类常见模式及检测器
type: command-table
from: phases/14-agent-engineering/26-failure-modes-agentic/code/main.py, phases/14-agent-engineering/26-failure-modes-agentic/docs/zh.md

| 命令 | 作用 |
|---|---|
| `detect_hallucinated_action` | 工具名不在 `KNOWN_TOOLS` 中 |
| `detect_scope_creep` | 请求没有写入用语，却调用 `write_file` |
| `detect_cascading_errors` | 出错后又执行了 2 次或更多工具调用 |
| `detect_context_loss` | 工具参数中出现“do not” token |
| `detect_tool_misuse` | 缺少工具 schema 要求的参数 |
| `detect_success_hallucination` | 声称成功、有写入意图，但状态未变 |
| `tag(trace)` | 运行所有 `DETECTORS`，返回标签 |
| `python3 code/main.py` | 每条轨迹的标签及汇总分布 |

## MAST 根因分类
type: concepts
from: phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md, phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/code/main.py, phases/14-agent-engineering/26-failure-modes-agentic/docs/zh.md

- **来源**：1642 条执行轨迹、7 个开源多 agent 系统，失败率 41-86.7%。
- **规格问题（41.77%）**：角色模糊、任务不清、成功标准隐含。
- **协调失败（36.94%）**：消息丢失、共享状态不同步、状态漂移。
- **验证缺口（21.30%）**：一个 agent 声称成功，无人验证。
- **成本**：验证缺口的单次失败成本最高。它们悄无声息地失败。
- **代码**：`categorize_incident(symptoms)` 返回 `spec`、`coord`、`verify` 或 `unknown`。

## 群体思维问题族
type: glossary
from: phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md, phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/code/main.py

- **同质化崩溃**：相同基础模型产生相关错误。信号为 `correlated_errors`。
- **从众偏差**：agent 向声音最大的同伴靠拢。信号为 `agreement_rate_spike`。
- **心智理论不足**：agent 无法建模彼此。信号为 `coordination_drop_long_horizon`。
- **混合动机动态**：折中结果让所有人都不满意。信号为 `compromise_outputs`。
- **级联可靠性故障**：一种错误模式触发其他模式。信号为 `retry_amplification`。
- **STRATUS**：检测、诊断和验证 agent。缓解成功率为 1.5x。

## 重试风暴
type: flow
from: phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md

1. **支付服务**：10% 的请求失败。
2. **订单 agent**：每次重试都会重新检查订单库存。
3. **库存服务**：承受正常负载的 2x，开始超时。
4. **每个订单**：都在重试。库存负载达到 10x，集群宕机。
5. **修正**：熔断器通过缓存或默认结果短路返回。

## 熔断器与风暴模拟器
type: annotated-code
lang: python
from: phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/code/main.py

```python
breaker = CircuitBreaker()           # 初始为 BreakerState.CLOSED
breaker.allow()                      # OPEN 且处于冷却期时返回 False
breaker.record(ok)                   # 错误率 > threshold 时熔断
# HALF_OPEN：一次成功即关闭，一次失败即再次打开
service = DownstreamService()        # base_failure_rate 为 0.1
effective_rate = self.base_failure_rate + (self.load * 0.02)
while attempts_for_req < 4:          # 每个请求的重试预算
    ...
simulate_retry_storm(200, use_breaker=True, seed=0)
# 返回 total_calls、successes、short_circuits
```

## 默认值与数字
type: defaults
span: 1
from: phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/code/main.py, phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md, phases/14-agent-engineering/26-failure-modes-agentic/docs/zh.md, phases/14-agent-engineering/25-multi-agent-debate/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `failure_threshold` | 0.5 | 触发熔断的错误率 |
| `window_size` | 20 | 用于计算错误率的近期结果数 |
| `open_cooldown_s` | 0.5 | 进入 HALF_OPEN 前的等待时间 |
| 生产环境熔断阈值 | 5-10% | 每种出站调用的错误率 |
| CI 轨迹门禁 | >=5% | 课程练习。轨迹标记出失败模式时令构建失败 |
| 审计轨迹样本 | 约 1000 | 每次失败模式审计使用的真实轨迹数 |
| 辩论 N、R | N=3、R=2 | 原始实验因成本采用此配置 |

## PVE：prompt、验证器、执行器
type: architecture
from: phases/14-agent-engineering/27-prompt-injection-defense/docs/zh.md, phases/14-agent-engineering/27-prompt-injection-defense/code/main.py

```arch
node | user | 1,1 | 用户消息 | 来源 user_message | client
node | ret | 1,2 | 检索内容 | 网页、记忆、工具输出 | store
node | main | 2,1 | 主模型 | 提出 ToolCall | model
node | val | 3,1 | 验证器 | 允许列表 + 标记扫描 | process
node | exec | 4,1 | 执行器 | 运行获准调用 | process
node | ref | 3,2 | 拒绝 | 尝试其他方法 |
edge | user | main | 意图
edge | ret | val | 扫描
edge | main | val | 候选调用
edge | val | exec | 允许
edge | val | ref | 拒绝
edge | ref | main | 重试
```

## 辩论拓扑
type: comparison
from: phases/14-agent-engineering/25-multi-agent-debate/docs/zh.md, phases/14-agent-engineering/25-multi-agent-debate/code/main.py

| 因素 | 全连接网状 | 稀疏星状 |
|---|---|---|
| 谁读取谁 | 每个辩论者读取全部同伴 | 辐射节点只读取中心节点 |
| N=5, R=3 提案数 | 15 | 15 |
| N=5, R=3 批评操作数 | 60 | 12 |
| 失败风险 | 收敛崩溃 | 中心节点故障 |
| 缓解方法 | 强制设置异议轮次 | 轮换或使用多个中心节点 |
| 代码 | `full_mesh_round` | `sparse_star_round` |

## agent 轨迹调试器
type: task-table
span: 2
from: projects/agent-trace-debugger/README.md, projects/agent-trace-debugger/API.md, projects/agent-trace-debugger/solution/cli.ts

| 任务 | 代码 |
|---|---|
| 初始化工作区 | `python3 scripts/project_test.py agent-trace-debugger --init learning-artifacts/agent-trace-debugger` |
| 评测一个阶段 | `python3 scripts/project_test.py agent-trace-debugger --stage 1 --path learning-artifacts/agent-trace-debugger --strict` |
| 与基线比较 | `node cli.ts --input samples/trace.jsonl --baseline samples/before.jsonl --output trace.html --json trace.json` |
| 导入 OTLP JSON | `node cli.ts --format otlp --input samples/otlp.json --output otlp-trace.html --json otlp-trace.json` |
| 公共 API | `parseTrace`, `validateTree`, `unionDuration`, `analyze`, `render` |
| 回归字段 | `wall_time_delta_ms`, `token_delta`, `error_delta` |

## 轨迹调试器错误
type: troubleshooting
span: 1
from: projects/agent-trace-debugger/solution/main.ts, projects/agent-trace-debugger/solution/cli.ts, projects/agent-trace-debugger/stages/01-parse/docs/zh.md, projects/agent-trace-debugger/README.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `invalid JSON line <n>` | 该行不是 JSON | 修正第 n 行。空行也计数 |
| `invalid span line <n>` | 字段错误、`end < start` 或 token 为负 | 输出 `ok` 或 `error`，并使用有限时间值 |
| `duplicate span id` | 两个 span 共用标识 | 使标识唯一 |
| `span cycle` | 祖先链形成环 | 修正父标识 |
| `missing parent` | 轨迹中没有父标识 | 导出父 span |
| `child outside parent` | 子区间超出父区间 | 统一跨机器时钟 |
| `format must be jsonl or otlp` | `--format` 值错误 | 使用 `jsonl` 或 `otlp` |

## 问答
type: qa
from: phases/14-agent-engineering/26-failure-modes-agentic/docs/zh.md, phases/14-agent-engineering/27-prompt-injection-defense/docs/zh.md, phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/docs/zh.md, projects/agent-trace-debugger/project.json, projects/agent-trace-debugger/README.md

- **为何只标记崩溃还不够？** 大多数 agent 失败会产生看似有效的输出。
- **为何不能只在最后加护栏？** 模型此时已经影响了外部世界。
- **哪些指标有助于发现缓慢失败？** 一致率、重试率、输出长度分布。
- **为何减去子区间的并集？** 并行子区间会重叠。直接求和会重复计数。
- **为何除了墙钟时间还要比较 token 和错误？** 示例仍耗时 100 ms，token 却增加了 200。
