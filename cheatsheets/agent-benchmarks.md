---
id: agent-benchmarks
title: Agent 基准：从 SWE-bench 到 OSWorld
code: AB
subtitle: 选择基准，用对应测试把关，检查数据污染，并按相同分母比较运行结果。
hue: 28
sources: phases/14-agent-engineering/19-benchmarks-swebench-gaia, phases/14-agent-engineering/20-benchmarks-webarena-osworld, phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks, projects/harness-bench
source_hash: 17702b3b48e6edbc
---

## 单 agent 基准对比
type: comparison
span: 2
from: phases/14-agent-engineering/19-benchmarks-swebench-gaia/docs/zh.md, phases/14-agent-engineering/20-benchmarks-webarena-osworld/docs/zh.md

| 比较项 | SWE-bench | GAIA | WebArena | OSWorld |
|---|---|---|---|---|
| 测试内容 | 代码修补 | 通用工具使用 | 长程网页任务 | 真实电脑任务 |
| 规模 | 2,294 个问题，12 个 Python 仓库 | 466 道题，300 道私有题 | 812 个任务，4 个应用 | 369 个任务，3 种操作系统 |
| Agent 输入 | 修复前提交的代码库和问题 | 问题，网页与多模态输入 | 自托管应用和工具 | 1920×1080 截图 |
| 评估器 | FAIL_TO_PASS 和 PASS_TO_PASS 测试 | 未提供 | 基于执行，使用 gym API | 未提供 |
| 发布时最佳成绩 | SWE-agent 12.5% | 带插件的 GPT-4 15% | GPT-4 agent 14.41% | 最佳模型 12.24% |
| 人类成绩 | 未提供 | 92% | 78.24% | 72.36% |
| 主要陷阱 | 数据污染 | 与代码基准混淆 | 固定的应用版本过时 | GUI 元素定位 |

## 多 agent 基准对比
type: comparison
span: 2
from: phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks/docs/zh.md

| 比较项 | MARBLE | COMMA | MedAgentBoard | SWE-bench Pro |
|---|---|---|---|---|
| 测量内容 | 星形、链形、树形、图形拓扑 | 多模态非对称信息 | 4 类医疗任务 | 无污染，时间截点更晚 |
| 评分 | 里程碑 KPI、部分进展 | agent 间协作 | 多 agent 对比单 LLM 和规则 | 1865 个问题，41 个仓库 |
| 主要结果 | 图形最适合研究 | 前沿模型难以胜过随机基线 | 多 agent 并不占优 | Pro 约 23%，Verified 超过 70% |
| 启示 | 认知规划增加约 3% | 先测量再下结论 | 许多系统设计过度 | 只有 Verified 成绩不够 |

## 按场景选择
type: tips
from: phases/14-agent-engineering/19-benchmarks-swebench-gaia/docs/zh.md, phases/14-agent-engineering/20-benchmarks-webarena-osworld/docs/zh.md, phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks/docs/zh.md

- SWE-bench Verified：代码 agent。始终报告 Verified 分数。
- SWE-bench Pro：检验污染影响。Pro 是当前的把关测试。
- GAIA：通用 agent。使用私有排行榜划分。
- AgentBench：比较 8 个环境中的表现。
- WebArena Verified：网页 agent。自托管以持续评估。
- OSWorld：桌面 agent。在虚拟机集群中运行。
- MARBLE：在相同条件下比较协作拓扑。
- AgentArch：论证企业技术栈每一层的必要性。
- 自定义评估：覆盖产品流程。为最重要的 20 个任务记录标准轨迹。

## SWE-bench 把关：run_task
type: flow
from: phases/14-agent-engineering/19-benchmarks-swebench-gaia/code/main.py, phases/14-agent-engineering/19-benchmarks-swebench-gaia/docs/zh.md

1. **测试框架**：复制 `state_before`。统计通过的 FAIL_TO_PASS 和 PASS_TO_PASS 检查。
2. **Agent**：将补丁应用到状态副本。
3. **测试框架**：在新状态上再次统计通过的检查。
4. **修复门槛**：补丁后所有 FAIL_TO_PASS 测试必须通过。
5. **无回归门槛**：`ptp_broke` 必须为 0。
6. **结果**：两项门槛都通过时，`resolved` 才为 true。
7. **报告**：解决率为已解决任务数除以全部任务数。

## Harness Bench 流水线
type: architecture
from: projects/harness-bench/solution, projects/harness-bench/README.md

```arch
node | cases | 1,1 | 用例 JSON | ID、Prompt、Expected | store
node | load | 2,1 | Cases() | 严格解码，最多 1000 个
node | eval | 3,1 | EvaluatePolicy() | 3 种策略，调用预算 | process
node | board | 4,1 | Leaderboard() | 相同分母
node | rec | 2,2 | 录制记录 | authored_fixture | store
node | http | 3,2 | HTTPModel() | chat-completions | model
node | score | 4,2 | Correct() | 精确答案契约
edge | cases | load |
edge | load | eval | 用例
edge | rec | eval | NewModel
edge | http | eval | ContextModel
edge | eval | score | 答案
edge | eval | board | Result
```

## 运行课程与项目
type: command-table
span: 2
from: phases/14-agent-engineering/19-benchmarks-swebench-gaia/docs/zh.md, phases/14-agent-engineering/20-benchmarks-webarena-osworld/docs/zh.md, phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks/docs/zh.md, projects/harness-bench/README.md, projects/harness-bench/stages

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` | 运行第 14.19、14.20、16.24 课的简化测试框架 |
| `python3 scripts/project_test.py harness-bench --init /tmp/harness-bench-work` | 创建学习者工作区 |
| `python3 scripts/project_test.py harness-bench --stage 1 --path /tmp/harness-bench-work --strict` | 评测一个阶段 |
| `python3 scripts/project_test.py harness-bench --all --solution --strict` | 评测参考实现 |
| `go run . --budget 2 --out /tmp/orchard-budget.json` | 重放 Orchard，每种策略调用 2 次 |
| `go run . --cases <cases.json> --endpoint <url> --model <model>` | 调用真实 chat-completions 模型 |
| `--key-env <VAR>` | 指定存放密钥的环境变量名 |

## Python 简化框架的指标
type: annotated-code
lang: python
from: phases/14-agent-engineering/19-benchmarks-swebench-gaia/code/main.py, phases/14-agent-engineering/20-benchmarks-webarena-osworld/code/main.py, phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks/code/main.py

```python
resolved = (ftp_post == len(task.fail_to_pass)) and (ptp_broke == 0)
score = steps + modalities + tools    # GAIA 级别：<=2 为 1，<=5 为 2，否则为 3
efficiency = steps / task.gold_steps  # 轨迹效率，1.0 为标准轨迹
delta = r["accuracy_seen"] - r["accuracy_held"]
contam_flag = "*" if delta > 0.1 else " "  # 以留出集准确率为准
vs_random = r["accuracy_held"] - rand_baseline  # 基线为 0.15
r = run_bench(sys, n_seen=40, n_held=160, seed=17)
```

## CLI 默认值
type: defaults
from: projects/harness-bench/solution/main.go, projects/harness-bench/README.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `--cases` | fixtures/orchard-cases.json | 用例 JSON 数组 |
| `--recording` | fixtures/orchard-recording.json | 设置 `--endpoint` 时忽略 |
| `--budget` | 4 | 每种策略的模型调用数，最多 10000 |
| `--timeout` | 30s | 每种策略的截止时间，最长 5 分钟 |
| `--temperature` | 0 | HTTP 采样温度 |
| `--max-tokens` | 128 | HTTP 输出 token 上限 |
| 用例上限 | 1000 | 文件上限为 1 MiB |
| HTTP 请求时限 | 10 秒 | 拒绝重定向和带查询参数的端点 |

## 故障排查
type: troubleshooting
span: 2
from: projects/harness-bench/stages, projects/harness-bench/solution, projects/harness-bench/README.md, phases/14-agent-engineering/19-benchmarks-swebench-gaia/docs/zh.md, phases/14-agent-engineering/20-benchmarks-webarena-osworld/docs/zh.md, phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks/code/main.py

| 现象 | 原因 | 修正 |
|---|---|---|
| `Cases` 返回 `ErrConflict` | 两个用例使用相同 ID | 为每个用例分配唯一 ID |
| `Cases` 对有效答案返回错误 | `Expected` 键拼错 | 修正键名；未知字段会被拒绝 |
| `Leaderboard` 返回 `ErrConflict` | 数据集摘要、模型摘要或预算不同 | 使用同一配置重新运行所有策略 |
| `15 min` 无法匹配 `15 minutes` | 答案契约要求精确匹配 | 在单独契约中声明变体 |
| 状态为 `budget-exhausted` | 重试耗尽预算 | 后续用例仍计入 `Total`；提高 `--budget` |
| `recording exhausted for requested prompt` | 缺少 prompt 或数组已用完 | 将精确的策略 prompt 加入 `responses` |
| SWE-bench 50% 在 SWE-bench+ 上降至 35% | 问题正文泄露解法 | 报告 Verified 和 SWE-bench+ 分数 |
| 差值超过 0.1，标记为 `*` | 已见任务得分高于留出任务 | 只引用留出集准确率 |

## 关键数值
type: concepts
from: phases/14-agent-engineering/19-benchmarks-swebench-gaia/docs/zh.md, phases/14-agent-engineering/20-benchmarks-webarena-osworld/docs/zh.md, phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks/docs/zh.md, projects/harness-bench/README.md

- **SWE-bench+**：32.67% 的成功补丁存在解法泄漏。31.08% 的测试较弱。
- **时间截点**：超过 94% 的 SWE-bench 问题早于多数模型的训练截点。
- **OSWorld-Human**：顶尖 agent 使用的步骤是标准轨迹的 1.4-2.7 倍。
- **OSWorld-G**：564 个仅测定位的样本。将定位与规划分开。
- **Agent 团队增益**：SWE-bench Pro 上约增加 30-40 个百分点。
- **协作开销**：图形拓扑中超过约 4 个 agent 后出现。
- **Orchard 重放**：基线 3 次调用答对 1/3，错误重试 4 次答对 2/3，证据策略 3 次答对 3/3。
- **未测量**：成本、对抗安全、你的业务领域和最差的 1% 尾部情况。

## 结论核对清单
type: qa
from: phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks/docs/zh.md, phases/14-agent-engineering/19-benchmarks-swebench-gaia/docs/zh.md, projects/harness-bench/README.md

- **哪个基准与划分？** Verified 与 Pro 差距很大。错误划分上的数字没有价值。
- **检查污染了吗？** 基准是否在训练截点之后发布？否则应谨慎解读。
- **使用什么基线？** 单 LLM、随机策略与已有多 agent 研究。不能只用同一系统未经调优的副本。
- **有显著性吗？** 报告 N 次试验、p 值和置信区间。单次运行会误导。
- **披露成本了吗？** 报告每任务 token 和实际耗时，以及 P50/P75/P95，而非单个数字。
- **记录可比吗？** 数据集 SHA-256、模型配置 SHA-256 和调用预算相同。
- **答错后重试吗？** 不会。错误重试从不查看预期答案。
