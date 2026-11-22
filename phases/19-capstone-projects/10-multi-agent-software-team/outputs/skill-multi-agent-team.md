---
name: multi-agent-team
description: 构建一支多 agent 软件团队，包含架构师、并行编码者、评审者和测试者；在 SWE-bench Pro 上评估，并产出交接环节的复盘报告。
version: 1.0.0
phase: 19
lesson: 10
tags: [capstone, multi-agent, swe-bench, langgraph, a2a, worktree, roles]
---

给定一个 GitHub issue URL 和并行度，部署一支多 agent 软件团队，产出可直接合并的 PR。在 50 个 SWE-bench Pro issue 上评估，并发布交接失败直方图。

构建计划：

1. 任务看板：基于文件（或 Redis）的 JSONL 存储，存放带类型的消息。消息类型：plan_request、subtask、diff_ready、review_needed、review_feedback、approved、test_needed、test_passed、test_failed、replan_needed。
2. 架构师（Opus 4.7）：阅读 issue，写出计划，产出一张子任务 DAG，每个子任务写明接口（涉及的文件、公开函数、对测试的影响）。
3. N 个编码者（Sonnet 4.7）：各自认领一个子任务，新建一个 `git worktree add` + Daytona 沙箱，独立实现。
4. 合并协调者：三方合并；只有在文件级重叠时才用 LLM 调解冲突。
5. 评审者（GPT-5.4）：阅读合并后的 diff；不能批准自己写的 diff；产出 approved，或把 review_feedback 发回相应的编码者。
6. 测试者（Gemini 2.5 Pro）：在干净的沙箱里跑测试套件；产出 test_passed 或 test_failed，并附上产物。
7. 交接核算：每条跨角色消息都记为一个 Langfuse span，带载荷大小和模型。计算 token 放大倍数 = total_tokens / single_agent_baseline_tokens。
8. 注入明显 bug 的探针（10% 的运行），测量评审者的误批准率。
9. 在 50 个 SWE-bench Pro issue 上运行；发布 pass@1、相对单 agent 基线的墙钟时间、各角色的 token 拆分、交接失败直方图。

评分标准：

| 权重 | 评分项 | 衡量方式 |
|:-:|---|---|
| 25 | SWE-bench Pro pass@1 | 50 个 issue 子集上的 pass@1 |
| 20 | 并行加速比 | 相对单 agent 基线的墙钟时间 |
| 20 | 评审质量 | 在注入 bug 探针上的误批准率 |
| 20 | token 效率 | 每个解决的 issue 的总 token 数，对比单 agent |
| 15 | 协调工程 | 合并冲突的解决、交接失败直方图 |

直接否决：

- 评审者能批准自己写的或自己提议的 diff。这是硬约束。
- 报告没有对照的单 agent 基线运行。多 agent 必须在*每一美元*上胜出，而不只是 pass@1。
- 任务看板里的消息是自由格式字符串，而不是带类型的 A2A 消息。
- 合并协调者悄悄丢弃有冲突的 diff，而不是发回去重新规划。

拒绝规则：

- 没有按角色设置预算上限（token + 美元）时，拒绝运行。
- 测试者还没在干净沙箱里验证过时，拒绝开 PR。
- 单次运行中拒绝把编码者扩到 8 个以上。超过这个数，协调开销会占主导。

输出：一个仓库，包含任务看板 + 各角色 worker、50 个 issue 的 SWE-bench Pro 运行日志、一次对照的单 agent 基线运行、一个带角色标签 span 和各角色 token 拆分的 Langfuse 看板、一份注入 bug 探针报告，以及一份复盘报告，写出最常出问题的三个交接环节，以及缓解每个问题的消息 schema 或 prompt 改动。
