# 顶点项目 16 —— GitHub Issue 到 PR 的自主 agent

> 给一个 issue 打标签，拿到一个 PR，这是 2026 年自主编码 agent 的产品形态：在云沙箱里运行 agent，验证测试通过，再发布一个附带理由、可供评审的 PR。AWS Remote SWE Agents、Cursor Background Agents、OpenAI Codex cloud 和 Google Jules 都提供了这种能力。难点是自动复现仓库构建环境、防止凭证泄漏、执行逐仓库预算，以及确保 agent 不能 force-push。本顶点项目要搭出自托管版本，并在成本与通过率上和托管替代品对比。

**类型：** Capstone
**语言：** Python（agent）、TypeScript（GitHub App）、YAML（Actions）
**前置要求：** 第 11 阶段（LLM 工程）、第 13 阶段（工具）、第 14 阶段（agent）、第 15 阶段（自主系统）、第 17 阶段（基础设施）
**涉及阶段：** P11 · P13 · P14 · P15 · P17
**预计时间：** 30 小时

## 问题背景

异步云编码 agent 跟交互式编码 agent（顶点项目 01）是两个不同的产品品类。它的体验是一个 GitHub 标签。你给一个 issue 打上 `@agent fix this`，一个 worker 在云沙箱里起来，克隆仓库、跑测试、改文件、验证，再开一个正文里带着 agent 理由的 PR。没有交互循环，没有终端。AWS Remote SWE Agents、Cursor Background Agents、OpenAI Codex cloud、Google Jules、Factory Droids 全都收敛到了这个上面。

工程挑战很具体：环境复现（agent 得在没有缓存开发镜像的情况下从零构建仓库）、抖动的测试（必须重跑或隔离）、凭证圈定（一个带最小细粒度权限的 GitHub App）、每仓库每天的预算强制，以及不许 force-push 的策略。这个顶点项目衡量通过率、成本，以及对比托管替代品的安全性。

## 核心概念

触发是一个 GitHub webhook（issue 标签或 PR 评论）。一个调度器把活儿入队到 ECS Fargate 或 Lambda。worker 用一个从仓库推断出来（语言、框架）的通用 Dockerfile，把仓库拉进一个 Daytona 或 E2B 沙箱。agent 针对 Claude Opus 4.7 或 GPT-5.4-Codex 跑一个 mini-swe-agent 或 SWE-agent v2 循环。它迭代：读代码、提出修复、应用补丁、跑测试。

验证是那个把关步骤。PR 打开之前，完整 CI 必须在沙箱里通过。计算覆盖率差值；若超出阈值地为负，PR 仍打开但被打上 `needs-review` 标签。agent 把理由作为 PR 描述发出来，外加一个 `@agent` 串，评审者可以 @ 它做后续追问。

安全通过两个不同的 GitHub 面来圈定：App 提供一个带 `workflows: read` 和窄的仓库 contents/PR scope 的短时安装 token；分支保护（不是 app 权限）强制“不直接写 `main`”和“不许 force-push”——app 从不加进 bypass 列表。对 `.github/workflows` 的路径级只读访问不是 GitHub App 的真实原语，所以 agent 在文件编辑上的白名单得在 worker 处强制这一点。每仓库每天的预算上限在调度器处强制（如每仓库每天最多 5 个 PR、每个 PR 20 美元）。

## 架构

```
GitHub issue labeled `@agent fix` or PR comment
            |
            v
    GitHub App webhook -> AWS Lambda dispatcher
            |
            v
    ECS Fargate task (or GitHub Actions self-hosted runner)
       - pull repo
       - infer Dockerfile (language, package manager)
       - Daytona / E2B sandbox with target runtime
       - clone -> git worktree -> agent branch
            |
            v
    mini-swe-agent / SWE-agent v2 loop
       Claude Opus 4.7 or GPT-5.4-Codex
       tools: ripgrep, tree-sitter, read/edit, run_tests, git
            |
            v
    verify CI passes in-sandbox + coverage delta check
            |
            v (verified)
    git push + open PR via GitHub App
       PR body = rationale + diff summary + trace URL
       label: needs-review
            |
            v
    operator reviews; can @-mention agent for follow-ups
```

## 技术栈

- 触发：带细粒度 token 的 GitHub App；webhook receiver 经 Lambda 或 Fly.io
- worker：ECS Fargate 任务（或 GitHub Actions 自托管 runner）
- 沙箱：每任务一个 Daytona devcontainer 或 E2B 沙箱
- agent 循环：mini-swe-agent 基线或基于 Claude Opus 4.7 / GPT-5.4-Codex 的 SWE-agent v2
- 检索：tree-sitter repo-map + ripgrep
- 验证：沙箱内完整 CI + 覆盖率差值闸门
- 可观测性：Langfuse，每 PR 一份 trace 归档，从 PR 正文链过去
- 预算：每仓库每天的美元上限；每仓库每天最大 PR 数

```figure
cf-issue-to-pr
```

## 动手构建

1. **GitHub App。** 细粒度安装 token：issues 读+写、pull_requests 写、contents 读+写、workflows 读。分支保护（唯一能干这事的面）强制“不直接推 `main`”和“不许 force-push”；app 不在 bypass 列表里。worker 把“不写 `.github/workflows` 下的文件”作为对提议 diff 的白名单检查来强制，因为 GitHub App 权限不是路径级的。

2. **webhook receiver。** Lambda 函数接收 issue 标签 / PR 评论 webhook。按标签 `@agent fix this` 过滤。入队到 SQS。

3. **调度器。** 从 SQS 弹出任务。强制每仓库每天预算。用仓库 URL、issue 正文，以及一个全新的 Daytona 沙箱起一个 ECS Fargate 任务。

4. **环境推断。** 检测语言（Python、Node、Go、Rust）和包管理器（uv、pnpm、go mod、cargo）。如果没有 Dockerfile 就当场生成一个。

5. **agent 循环。** 带 Claude Opus 4.7 的 mini-swe-agent 或 SWE-agent v2。工具：ripgrep、tree-sitter repo-map、read_file、edit_file、run_tests、git。硬限制：成本 20 美元、墙钟 30 分钟、30 个 agent 轮次。

6. **验证。** 循环结束后，在沙箱内跑完整测试套件。经 jacoco / coverage.py 算覆盖率差值。若 CI 红：停下，不开 PR。若覆盖率掉超过 2%：开 PR 并打 `needs-review` 标签。

7. **PR 发布。** 推 agent 分支。经 GitHub API 开 PR，带：标题、理由、diff 摘要、trace URL、成本、轮数。

8. **凭证卫生。** worker 用一个短时 GitHub App 安装 token 运行。日志在归档前擦掉密钥。

9. **评测。** 30 个难度不一的内部 seed issue。衡量通过率、PR 质量（diff 大小、风格、覆盖率）、成本、延迟。在同样的 issue 上跟 Cursor Background Agents 和 AWS Remote SWE Agents 对比。

## 实际使用

```
# on github.com
  - user labels issue #842 with `@agent fix this`
  - PR #1903 appears 14 minutes later
  - body:
    > Fixed NPE in widget.dedupe() caused by null comparator entry.
    > Added regression test widget_test.go::TestDedupeNullComparator.
    > Coverage delta: +0.12%
    > Turns: 7  Cost: $1.80  Trace: langfuse:...
    > Label: needs-review
```

## 拿去用

`outputs/skill-issue-to-pr.md` 是交付物。一个 GitHub App + 异步云 worker，把打了标签的 issue 变成可供评审的 PR，成本有界、凭证受圈定。

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | 30 个 issue 上的通过率 | 端到端成功（CI 绿 + 覆盖率 OK） |
| 20 | PR 质量 | diff 大小、覆盖率差值、风格一致性 |
| 20 | 每解决 issue 的成本与延迟 | 每个 PR 的美元和墙钟 |
| 20 | 安全性 | 圈定的 token、逐仓库预算、不许 force-push、凭证卫生 |
| 15 | 运维者体验 | 理由评论、重试可操作性、@ 提及做后续 |
| **100** | | |

## 练习

1. 加一个“修抖动测试”模式：标签 `@agent stabilize-flake TestX` 在沙箱里把那个测试跑 50 遍，并提出一个让它稳定下来的最小改动。

2. 在三个共享 issue 上对比成本 vs Cursor Background Agents。报告哪种工具在哪里赢。

3. 实现一个预算看板：每仓库每天成本、每用户成本。异常时告警。

4. 做一个“dry-run”模式，不跑 CI 就开一个 draft PR，让评审者廉价地查看计划。

5. 加一个保留策略：超过 7 天未合并的 PR 分支自动删除。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| GitHub App | “圈定的 bot 身份” | 带细粒度权限 + 短时安装 token 的 App |
| Async cloud agent（异步云 agent） | “后台 agent” | 跑在云沙箱里、而非终端里的非交互 worker |
| Environment inference（环境推断） | “Dockerfile 合成” | 检测语言 + 包管理器，没有就生成一个 Dockerfile |
| Verification（验证） | “沙箱内 CI” | 开 PR 之前在 worker 内跑完整测试套件 |
| Coverage delta（覆盖率差值） | “覆盖率保持” | 从基线到 agent 分支的测试覆盖率百分比变化 |
| Per-repo budget（逐仓库预算） | “每天上限” | 在调度器处强制的美元和 PR 数上限 |
| Rationale（理由） | “PR 正文说明” | agent 对改了什么、为什么的总结；PR 正文里必备 |

## 延伸阅读

- [AWS Remote SWE Agents](https://github.com/aws-samples/remote-swe-agents) —— 标准异步云 agent 参考
- [SWE-agent](https://github.com/SWE-agent/SWE-agent) —— CLI 参考
- [Cursor Background Agents](https://docs.cursor.com/background-agent) —— 商业替代
- [OpenAI Codex (cloud)](https://openai.com/codex) —— 托管竞品
- [Google Jules](https://jules.google) —— Google 的托管版本
- [Factory Droids](https://www.factory.ai) —— 备选商业参考
- [GitHub App documentation](https://docs.github.com/en/apps) —— 圈定的 bot 身份
- [Daytona cloud sandboxes](https://daytona.io) —— 参考沙箱
