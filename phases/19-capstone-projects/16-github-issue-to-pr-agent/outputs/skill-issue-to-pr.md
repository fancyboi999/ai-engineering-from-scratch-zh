---
name: issue-to-pr
description: 构建异步的 GitHub issue 转 PR agent：在云端沙箱中运行，复现构建、验证测试，并在严格的单仓库预算内开出可供评审的 PR。
version: 1.0.0
phase: 19
lesson: 16
tags: [capstone, async-agent, github, fargate, daytona, swe-bench, budget, safety]
---

给定一个 GitHub 仓库，其中的 issue 打了 `@agent fix this` 标签，交付一个自托管的云端 agent，把每个带标签的 issue 变成可供评审的 PR，凭证权限受限，成本有上限。

构建计划：

1. GitHub App 使用细粒度 token：issues 读写、PR 写、contents 读写、workflows 只读。禁止强推。main 上的分支保护阻止直接写入。
2. webhook 接收器（Lambda 或 Fly.io）过滤标签 / PR 评论事件，并放入 SQS 队列。
3. 调度器按仓库、按天强制执行美元和 PR 数量上限；每个获准的任务启动一个 ECS Fargate task。
4. 环境推断：根据仓库内容识别语言、包管理器和运行时。如果没有 Dockerfile，就现场合成一个。
5. 每个任务一个 Daytona 或 E2B 沙箱。把仓库克隆进一个新的 `git worktree` + agent 分支。
6. agent 循环（基于 Claude Opus 4.7 或 GPT-5.4-Codex 的 mini-swe-agent 或 SWE-agent v2）。工具：ripgrep、tree-sitter 仓库地图、read_file、edit_file、run_tests、git。上限：$20、30 轮、30 分钟。
7. 验证：在沙箱内跑完整 CI；用 jacoco / coverage.py 计算覆盖率变化；变化 < -2% 时打上 `needs-review` 标签；CI 变红就停止。
8. 通过 GitHub API 开 PR，附上理由、diff 摘要、trace URL、成本和轮数。
9. 可观测性：每个 PR 一条 Langfuse trace；日志中清除密钥；单仓库预算看板。
10. 在 30 个预置的内部 issue 上评估；在三个共同 issue 的子集上与 Cursor Background Agents 和 AWS Remote SWE Agents 对比。

评分标准：

| 权重 | 评分项 | 衡量方式 |
|:-:|---|---|
| 25 | 30 个 issue 上的通过率 | 端到端成功（CI 全绿 + 覆盖率达标） |
| 20 | PR 质量 | diff 大小、覆盖率变化、风格一致性 |
| 20 | 每个解决的 issue 的成本与延迟 | $/PR 和每个 PR 的墙钟时间 |
| 20 | 安全性 | token 权限受限、单仓库预算、禁止强推、凭证卫生 |
| 15 | 运维者体验 | 理由说明评论、便捷重试、@-mention 追问 |

直接否决：

- agent 能够强推。硬性排除。
- 调度器跳过预算检查。失控循环是最典型的失败。
- 完整 CI 没有在沙箱内通过就开 PR。
- trace 归档中包含未脱敏的 token 或 PII。

拒绝规则：

- main 没有分支保护时拒绝安装。
- 没有单仓库每日预算（美元和 PR 数量）时拒绝运行。
- 拒绝自动重试失败的运行；所有重试都需要人工重新打标签。

输出：一个仓库，包含 GitHub App、webhook 接收器、调度器 + 预算台账、Fargate task 定义、沙箱生命周期管理器、mini-swe-agent 循环、30 个 issue 的评估运行、与 Cursor Background Agents 和 AWS Remote SWE Agents 的并排对比，以及一份说明文档，写出构建推断中最常见的三种失败，以及缓解每一种的 Dockerfile 合成改动。
