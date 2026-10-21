---
id: debate-and-roles
title: 辩论、角色与评审小组
code: DR
subtitle: 让 N 个 agent 运行 R 轮，划分规划、执行、批评和验证角色，并用法定票数控制评审门禁。
hue: 285
sources: phases/16-multi-agent-and-swarms/07-society-of-mind-debate, phases/16-multi-agent-and-swarms/08-role-specialization, phases/14-agent-engineering/25-multi-agent-debate, phases/19-capstone-projects/10-multi-agent-software-team, projects/multi-agent-code-review-panel
source_hash: 8759159cddb8a986
---

## 辩论协议
type: flow
from: phases/16-multi-agent-and-swarms/07-society-of-mind-debate/docs/zh.md, phases/14-agent-engineering/25-multi-agent-debate/docs/zh.md

1. **N 个 agent 各自**：生成问题的初始答案。
2. **第 r = 2..R 轮**：每个 agent 阅读其他 agent 在 r-1 轮的答案。
3. **每个 agent**：批评同伴并更新答案。
4. **每轮**：重新注入问题，防止偏题。
5. **R 轮后**：对最终答案进行多数投票。
6. **成本**：N 个 agent × R 轮 = N·R 次 LLM 调用，上下文持续增长。

## 辩论拓扑
type: comparison
from: phases/14-agent-engineering/25-multi-agent-debate/docs/zh.md, phases/14-agent-engineering/25-multi-agent-debate/code/main.py

| 维度 | 全连接网状 | 稀疏星形 |
|---|---|---|
| 谁读谁 | 每个辩论者阅读所有同伴 | 辐射节点只读中心节点 |
| 运行器 | `full_mesh_round` | `sparse_star_round` |
| 每轮操作 | 每个辩论者 `ops += len(peers)` | 辐射节点只读中心节点 |
| N=5、R=3 | 60 次批评操作 | 12 次批评操作 |
| N=5、R=3 时的提案数 | 15 | 15 |
| 主要风险 | 收敛坍塌 | 中心节点故障 |
| 风险修正 | 强制设置分歧轮次 | 轮换或使用多个中心节点 |

## 四种标准角色
type: concepts
from: phases/16-multi-agent-and-swarms/08-role-specialization/docs/zh.md

- **规划者**：读取目标，输出结构化计划或规格。
- **执行者**：每次读取一个计划步骤，输出产物。
- **批评者**：对照计划阅读产物，输出接受或拒绝及理由。
- **验证者**：执行确定性检查，输出通过或失败及证据。
- **批评者与验证者**：批评者基于 LLM，具有主观性。验证者是代码。两者不是同一角色。
- **沟通式消除幻觉**：细节缺失时，执行者指名向相关角色提问。
- **SOP 模式**：`Code = SOP(Team)`。每个角色都有严格的输入输出 schema。

## 代码中的角色流水线
type: annotated-code
lang: python
from: phases/16-multi-agent-and-swarms/08-role-specialization/code/main.py

```python
spec = planner(user_wish)            # Spec 包含签名和 3 个测试
art = executor(spec)                 # Artifact 保存代码字符串
crep = critic(spec, art)             # 检查 def、return、任务名
vrep = verifier(spec, art)           # 运行测试
exec(art.code, ns, ns)               # 验证者的沙箱命名空间
fn = ns.get(spec.task_name)          # 无可调用对象时失败
got = fn(*args)                      # 与预期结果比较
if crep.approved and vrep.passed:    # 两者都通过才交付
```

## 软件团队架构
type: architecture
from: phases/19-capstone-projects/10-multi-agent-software-team/docs/zh.md

```arch
node | issue | 1,1 | GitHub issue URL | | client
node | arch | 2,1 | 架构师 | 含子任务和接口的计划 | model
node | board | 3,1 | 任务看板 | 文件 / Redis | queue
node | coders | 4,1 | 编码者 A 至 D | 各自使用 worktree + Daytona | process
node | merge | 4,2 | 合并协调者 | 三方合并 | process
node | rev | 3,2 | 评审者 | 批准或要求修改 | model
node | test | 2,2 | 测试者 | 干净沙箱 | process
node | pr | 1,2 | 创建 PR | | client
edge | issue | arch |
edge | arch | board | plan_request
edge | board | coders | subtask
edge | coders | merge | diff_ready
edge | merge | rev | review_needed
edge | rev | test | approved
edge | test | pr | test_passed
```

## 任务看板消息
type: command-table
from: phases/19-capstone-projects/10-multi-agent-software-team/code/main.py, phases/19-capstone-projects/10-multi-agent-software-team/docs/zh.md

| 命令 | 作用 |
|---|---|
| `plan_request` | 架构师发布计划，包含子任务 DAG |
| `subtask` | 架构师向编码者发送一个子任务及其文件 |
| `diff_ready` | 编码者将补丁提交给 `merge_coord` |
| `review_needed` | 合并协调者将合并差异发给评审者 |
| `review_feedback` | 评审者将修改要求发回编码者 |
| `approved` | 评审者将差异交给测试者 |
| `test_passed` | 测试者通知 `pr_opener` 创建 PR |
| `test_failed` | 测试者将堆栈追踪发回编码者 |

## 评审小组 API
type: task-table
from: projects/multi-agent-code-review-panel/API.md, projects/multi-agent-code-review-panel/solution/main.ts, projects/multi-agent-code-review-panel/solution/cli.ts, projects/multi-agent-code-review-panel/README.md

| 任务 | 代码 |
|---|---|
| 拒绝虚构位置 | `validateFinding(raw, files)` |
| 按文件、行、规则分组 | `aggregate(reviews, files, quorum = 2)` |
| 在限制内运行评审者 | `runPanel(reviewers, budget, timeoutMs = 1000)` |
| 对照标签评分 | `evaluate(predicted, expected)` |
| 分组键 | `JSON.stringify([f.file, f.line, f.rule])` |
| 运行演示 | `node cli.ts --input samples/review.json` |
| 导入 PR 报告 | `--pr-report /path/review.json` |

## 法定票数与预算代码
type: annotated-code
lang: typescript
from: projects/multi-agent-code-review-panel/solution/main.ts

```typescript
if (ids.has(review.reviewer)) throw new Error("duplicate reviewer");
if (seen.has(key)) continue;       // 每个评审者在每组中只计一票
status: g.supporters.length >= quorum ? "consensus" : "needs-review",
disagreement: new Set(g.severities).size > 1,
if (spent + r.cost > budget) {     // 追踪状态为 "budget-skipped"
controller.abort();                // 达到截止时间，状态为 "timeout"
precision: p.size ? hits / p.size : 0,  // 无预测时为 0
```

## 默认值与数值
type: defaults
from: phases/16-multi-agent-and-swarms/07-society-of-mind-debate/docs/zh.md, phases/16-multi-agent-and-swarms/08-role-specialization/docs/zh.md, phases/14-agent-engineering/25-multi-agent-debate/docs/zh.md, projects/multi-agent-code-review-panel/solution/cli.ts, phases/19-capstone-projects/10-multi-agent-software-team/code/ts/src/coordinator.ts

| 设置 | 默认值 | 说明 |
|---|---|---|
| 辩论轮数上限 | 3 | 3 轮已获得大部分收益 |
| 辩论 agent 数上限 | 5 | 超过 5 个时上下文膨胀和成本占主导 |
| Du 等人的原始设置 | N=3、R=2 | 基于成本选择 |
| 批评者修订轮数 | 2 | 此后升级人工处理 |
| CLI `quorum` | 2 | 达成共识所需支持者数 |
| CLI `budget` | 3 | 评审者成本单位 |
| CLI `timeout` | 1000 | 每位评审者的毫秒数 |
| `maxTurns` | 12 | 协调者轮次上限 |

## 失败模式
type: troubleshooting
from: phases/16-multi-agent-and-swarms/07-society-of-mind-debate/docs/zh.md, phases/14-agent-engineering/25-multi-agent-debate/docs/zh.md, phases/16-multi-agent-and-swarms/08-role-specialization/docs/zh.md, phases/19-capstone-projects/10-multi-agent-software-team/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 所有 agent 附和最强势者 | 迎合级联 | 要求一个 agent 持反方立场 |
| 答案偏离问题 | 多轮导致主题漂移 | 每轮重新注入问题 |
| 成本超过单次 CoT 调用的 10× | N·R 次调用导致计算量暴涨 | 限制为 3 轮、5 个 agent |
| 全体认同同一错误答案 | 使用相同 prompt 和模型 | 使用不同 prompt 和模型 |
| 一个坏 agent 影响所有人 | 星形拓扑中心节点不佳 | 轮换或使用多个中心节点 |
| 看似合理的代码带 bug 发布 | 全 LLM 流水线，无验证者 | 添加基于代码的通过或失败检查 |
| 评审者批准已知 bug | 误批准 | 注入 bug 探测，将比例调至 5% 以下 |

## 需记住的数值
type: concepts
from: phases/16-multi-agent-and-swarms/07-society-of-mind-debate/docs/zh.md, phases/16-multi-agent-and-swarms/08-role-specialization/docs/zh.md, phases/19-capstone-projects/10-multi-agent-software-team/docs/zh.md

- **5 个 agent、5 轮**：25 次调用，上下文持续增长。
- **NLSOM**：129 个成员的群体。
- **MAST**：追踪了 1642 次失败，21.3% 存在验证缺口。
- **验证循环**：准确率从 10% 到 70%。一个角色带来 7× 收益。
- **token 放大**：40 轮单 agent 运行变成四种角色合计 160 轮。
- **评分标准**：pass@1 占 25，速度提升占 20，评审质量占 20，token 效率占 20，协作占 15。

## 问答
type: qa
from: phases/16-multi-agent-and-swarms/07-society-of-mind-debate/docs/zh.md, phases/14-agent-engineering/25-multi-agent-debate/docs/zh.md, projects/multi-agent-code-review-panel/README.md, projects/multi-agent-code-review-panel/stages/02-agreement/docs/zh.md

- **为何用辩论而不是自一致性？** 同一模型的采样共享错误，辩论降低其相关性。
- **加 agent 还是加轮数？** 单独增加都会进入平台期，两者结合才有明显跃升。
- **何时辩论有害？** 对延迟敏感的交互、大规模成本敏感场景和简单查询。
- **共识就是真相吗？** 不是。共识衡量支持度，不代表真相。
- **同一评审者提供五份报告？** 支持数统计不同评审者标识，不统计报告数。

## 交付清单
type: tips
from: phases/16-multi-agent-and-swarms/07-society-of-mind-debate/docs/zh.md, phases/16-multi-agent-and-swarms/08-role-specialization/docs/zh.md, phases/19-capstone-projects/10-multi-agent-software-team/docs/zh.md

- 辩论池至少使用两种不同基础模型。
- 记录每轮。隐藏轮次无法调试或审计。
- 至少保留一个确定性验证者。不要全部交给 LLM。
- 先运行批评者，再运行验证者。
- 编码者启动后冻结计划。重新规划应作为独立事件。
- 评审者不能批准自己的改动。
