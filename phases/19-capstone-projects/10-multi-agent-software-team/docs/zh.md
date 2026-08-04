# 顶点项目 10 —— 多 agent 软件工程团队

> 2026 年的多 agent 工程团队已经收敛到同一种形态：一个架构师规划，N 个程序员在并行 worktree 里干活，一个评审者把关，一个测试者验证。SWE-AF 的工厂架构、MetaGPT 的角色化 prompt、AutoGen 0.4 的类型化 actor 图、Cognition 的 Devin 和 Factory 的 Droids 都独立走到了这里。并行 worktree 把墙钟时间换成吞吐，共享状态与交接协议则成为失败面。本顶点项目要搭出这个团队，在 SWE-bench Pro 上评测，并报告哪些交接会断、多久断一次。

**类型：** Capstone
**语言：** Python / TypeScript（agent）、Shell（worktree 脚本）
**前置要求：** 第 11 阶段（LLM 工程）、第 13 阶段（工具）、第 14 阶段（agent）、第 15 阶段（自主系统）、第 16 阶段（多 agent）、第 17 阶段（基础设施）
**涉及阶段：** P11 · P13 · P14 · P15 · P16 · P17
**预计时间：** 40 小时

## 问题背景

单 agent 编码外壳在大任务上撞到天花板。不是因为哪个 agent 弱，而是因为一个 200k token 的上下文装不下一份架构计划加四片并行的代码库切片加评审者评语加测试输出。多 agent 工厂把问题拆开：架构师拥有计划，程序员在并行 worktree 里拥有实现，评审者把关，测试者验证。SWE-AF 的“工厂”架构、MetaGPT 的角色、AutoGen 的带类型 actor 图——这三种框架描述的是同一套形态。

失败面在交接上。架构师规划了一个程序员实现不了的东西。程序员产出了冲突的 diff。评审者批准了一个臆想出来的修复。测试者跟一个还在写的程序员抢跑了。你将搭出这样一个团队，在 50 个 SWE-bench Pro issue 上跑它，追踪每一次交接，并发出复盘报告。

## 核心概念

角色是带类型的 agent。**Architect（架构师）**（Claude Opus 4.7）读 issue、写计划，把它拆成带明确接口的子任务。**Coders（程序员）**（Claude Sonnet 4.7，N 个并行实例，每个在一个 `git worktree` + Daytona 沙箱里）独立实现子任务。**Reviewer（评审者）**（GPT-5.4）读合并后的 diff，要么批准要么请求具体改动。**Tester（测试者）**（Gemini 2.5 Pro）在隔离环境里跑测试套件，带产物报告通过/失败。

通信经由一块共享任务板（文件支撑或 Redis）。每个角色消费它被允许处理的任务。交接是 A2A 协议带类型的消息。协调上的关注点：合并冲突解决（协调者角色或自动三方合并）、共享状态同步（程序员一开工计划就冻结；重新规划是单独的事件）、以及评审者把关（评审者不能批准自己的改动或自己提议的改动）。

token 放大是隐藏成本。每个角色边界都加上摘要 prompt 和交接上下文。一次 40 轮的单 agent 运行，跨四个角色变成总共 160 轮。评分标准专门衡量 token 效率对比单 agent 基线，因为问题不是“多 agent 行不行”，而是“它每美元赢不赢”。

## 架构

```
GitHub issue URL
      |
      v
Architect (Opus 4.7)
   reads issue, produces plan with subtasks + interfaces
      |
      v
Task board (file / Redis)
      |
   +-- subtask 1 ---+-- subtask 2 ---+-- subtask 3 ---+-- subtask 4 ---+
   v                v                v                v                v
Coder A          Coder B          Coder C          Coder D          (4 parallel)
 (Sonnet)         (Sonnet)         (Sonnet)         (Sonnet)
 worktree A       worktree B       worktree C       worktree D
 Daytona          Daytona          Daytona          Daytona
      |                |                |                |
      +--------+-------+-------+--------+
               v
           merge coordinator  (three-way merge + conflict resolution)
               |
               v
           Reviewer (GPT-5.4)
               |
               v
           Tester  (Gemini 2.5 Pro)  -> passes? -> open PR
                                     -> fails?  -> route back to coder
```

## 技术栈

- 编排：带共享状态 + 各 agent 子图的 LangGraph
- 消息：A2A 协议（Google 2025），用于带类型的 agent 间消息
- 模型：Opus 4.7（架构师）、Sonnet 4.7（程序员）、GPT-5.4（评审者）、Gemini 2.5 Pro（测试者）
- worktree 隔离：每程序员一个 `git worktree add` + Daytona 沙箱
- 合并协调者：自定义三方合并 + LLM 中介的冲突解决
- 评测：SWE-bench Pro（50 issue）、SWE-AF 场景、单测用 HumanEval++
- 可观测性：带角色标签 span 的 Langfuse、逐 agent 的 token 计账
- 部署：K8s，每个角色一个独立 Deployment + 按积压做 HPA

```figure
ce-team-handoff
```

## 动手构建

1. **任务板。** 文件支撑的 JSONL，带类型消息：`plan_request`、`subtask`、`diff_ready`、`review_needed`、`test_needed`、`approved`、`rejected`、`replan_needed`。agent 按标签订阅。

2. **架构师。** 读 GitHub issue，用一个要求明确子任务接口（触及的文件、公开函数、测试影响）的计划模板跑 Opus 4.7。产出一个带子任务 DAG 的 `plan_request`。

3. **程序员。** N 个并行 worker，每个从板上认领一个子任务。每个起一个全新的 `git worktree add` 分支加一个 Daytona 沙箱。实现子任务。产出带补丁 + 测试差值的 `diff_ready`。

4. **合并协调者。** 所有程序员完工后，把这 N 个分支三方合并进一个 staging 分支。仅在存在文件级重叠时才做 LLM 中介的冲突解决。

5. **评审者。** GPT-5.4 读合并后的 diff。不能批准它自己写的 diff。产出 `approved`（空操作）或带具体改动请求的 `review_feedback`，路由回相关程序员。

6. **测试者。** Gemini 2.5 Pro 在一个干净沙箱里跑测试套件。捕获产物。产出 `test_passed` 或带栈追踪的 `test_failed`。失败的测试回环到拥有那个失败子任务的程序员。

7. **交接计账。** 每条跨越角色边界的消息都在 Langfuse 里拿到一个 span，带 payload 大小和所用模型。计算每子任务的 token 放大（(coder_tokens + reviewer_tokens + tester_tokens + architect_share) / coder_tokens）。

8. **评测。** 在 50 个 SWE-bench Pro issue 上跑。把 pass@1 和每解决 issue 的美元成本跟单 agent 基线（单个 Sonnet 4.7 在单个 worktree 里）对比。

9. **复盘。** 对每个失败的 issue，找出断掉的那次交接（计划太含糊、合并冲突、评审者误批、测试者抖动）。产出一张交接失败直方图。

## 实际使用

```
$ team run --issue https://github.com/acme/widget/issues/842
[architect] plan: 4 subtasks (parser, cache, api, migration)
[board]     dispatched to 4 coders in parallel worktrees
[coder-A]   subtask parser  -> 42 lines, tests pass locally
[coder-B]   subtask cache   -> 88 lines, tests pass locally
[coder-C]   subtask api     -> 31 lines, tests pass locally
[coder-D]   subtask migration -> 19 lines, tests pass locally
[merge]     3-way merge: 0 conflicts
[reviewer]  comments on cache (thread pool sizing); routed to coder-B
[coder-B]   revision: 92 lines; submits
[reviewer]  approved
[tester]    all 412 tests pass
[pr]        opened #3382   4 coders, 1 revision, $4.90, 18m
```

## 拿去用

`outputs/skill-multi-agent-team.md` 是交付物。给定一个 issue URL 和并行度，团队产出一个可合并的 PR，带逐角色的 token 计账。

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | SWE-bench Pro pass@1 | 匹配的 50 issue 子集，pass@1 |
| 20 | 并行加速 | 墙钟 vs 单 agent 基线 |
| 20 | 评审质量 | 注入 bug 探针上的误批率 |
| 20 | token 效率 | 每解决 issue 的总 token vs 单 agent |
| 15 | 协调工程 | 合并冲突解决、交接失败直方图 |
| **100** | | |

## 练习

1. 在运行中途往一个 diff 里注入一个明显的 bug（主体之前多塞一个 `return None`）。衡量评审者的误批率。调评审者 prompt，直到误批低于 5%。

2. 减到两个程序员（架构师 + 程序员 + 评审者 + 测试者，程序员顺序跑两个子任务）。比较墙钟和通过率。

3. 把合并协调者换成单写者约束（子任务触及不相交的文件集）。衡量架构师身上的规划负担。

4. 把评审者从 GPT-5.4 换成 Claude Opus 4.7。衡量误批率和 token 成本差值。

5. 加第五个角色：文档者（Haiku 4.5）。评审之后，它产出一条 changelog 条目。衡量文档质量是否对得起多花的 token。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| Parallel worktree（并行 worktree） | “隔离的分支” | `git worktree add` 给每个程序员产出一份全新的工作树 |
| Task board（任务板） | “共享消息总线” | agent 订阅的、装带类型消息的文件或 Redis 存储 |
| Handoff（交接） | “角色边界” | 任何从一个角色上下文跨到另一个角色上下文的消息 |
| Token amplification（token 放大） | “多 agent 开销” | 同一任务上跨角色总 token / 单 agent token |
| A2A protocol（A2A 协议） | “agent 对 agent” | Google 2025 年的带类型 agent 间消息规范 |
| Merge coordinator（合并协调者） | “集成者” | 跑三方合并并中介冲突的组件 |
| False approval（误批） | “评审者幻觉” | 评审者批准了一个带已知 bug 的 diff |

## 延伸阅读

- [SWE-AF factory architecture](https://github.com/Agent-Field/SWE-AF) —— 参考级的 2026 多 agent 工厂
- [MetaGPT](https://github.com/FoundationAgents/MetaGPT) —— 角色化的多 agent 框架
- [AutoGen v0.4](https://github.com/microsoft/autogen) —— 微软的带类型 actor 框架
- [Cognition AI (Devin)](https://cognition.ai) —— 参考产品
- [Factory Droids](https://www.factory.ai) —— 备选参考产品
- [Google A2A protocol](https://a2a-protocol.org/latest/) —— agent 间消息规范
- [git worktree documentation](https://git-scm.com/docs/git-worktree) —— 隔离底座
- [SWE-bench Pro](https://www.swebench.com) —— 评测目标
