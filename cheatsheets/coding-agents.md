---
id: coding-agents
title: 编程 agent：技术全景与综合项目
code: CL
subtitle: 选择运行框架，设置预算与闸门，运行综合项目 agent 和三个编程 agent 项目。
hue: 25
sources: phases/15-autonomous-systems/09-coding-agent-landscape, phases/19-capstone-projects/01-terminal-native-coding-agent, phases/19-capstone-projects/09-code-migration-agent, phases/19-capstone-projects/16-github-issue-to-pr-agent, phases/19-capstone-projects/29-end-to-end-coding-task-demo, projects/tiny-coding-agent, projects/rust-agent-shell, projects/pr-review-reporter
source_hash: 97b21f2730bb3d95
---

## JSON 工具调用与 CodeAct
type: comparison
from: phases/15-autonomous-systems/09-coding-agent-landscape/docs/zh.md, phases/15-autonomous-systems/09-coding-agent-landscape/code/main.py

| 维度 | JSON 工具调用 | CodeAct |
|---|---|---|
| 一次行动 | 一个结构化 JSON 载荷 | 一整段 Python 程序 |
| 审计 | 容易，每轮一个行动 | 更难，影响范围广 |
| 组合能力 | 有限 | 支持循环、串联工具和捕获错误 |
| 安全 | 每次调用都由验证器检查 | 需要加固的沙箱 |
| 玩具示例影响范围 | 每次行动一个文件 | 一次处理所有失败文件 |
| 主要用于 | 托管服务 | 开放平台 |

## 三个综合项目 agent
type: comparison
span: 2
from: phases/19-capstone-projects/01-terminal-native-coding-agent/docs/zh.md, phases/19-capstone-projects/16-github-issue-to-pr-agent/docs/zh.md, phases/19-capstone-projects/09-code-migration-agent/docs/zh.md

| 维度 | 终端 agent（01） | Issue 到 PR（16） | 迁移（09） |
|---|---|---|---|
| 触发方式 | `agent run <repo> "<task>"` | Issue 标签 `@agent fix this` | `migrate <repo> --target java17` |
| 沙箱 | E2B 或 Daytona，git worktree | 每个任务一个 Daytona 或 E2B | 每个分支一个 Daytona |
| 轮次上限 | 50 轮 | 30 个 agent 轮次 | 20 个 agent 轮次 |
| 成本上限 | 每任务 $5 | 每 PR $20，每仓每天 5 个 PR | 每仓 $8 |
| 其他上限 | 200k 上下文 | 实际耗时 30 min | 每仓 30 min |
| PR 前闸门 | 测试通过 | 沙箱内完整 CI、覆盖率变化 | 测试通过，覆盖率下降不超过 2% |
| 失败处理 | `Stop` 钩子写入轨迹包 | CI 失败即停止，不建 PR | 记录失败类别与复现步骤 |

## 选择条件
type: concepts
from: phases/15-autonomous-systems/09-coding-agent-landscape/docs/zh.md, phases/19-capstone-projects/01-terminal-native-coding-agent/docs/zh.md, phases/19-capstone-projects/16-github-issue-to-pr-agent/docs/zh.md, phases/19-capstone-projects/09-code-migration-agent/docs/zh.md

- **使用 JSON 工具调用**：每个行动都需要显式验证器和便于审计的记录。
- **使用 CodeAct**：一次行动需要跨多个文件串联工具。先加固沙箱。
- **使用终端 agent**：从 CLI 输入工作，以 PR 交付，并持续维护计划。
- **使用 Issue 到 PR**：交互入口是 GitHub 标签，没有交互循环和终端。
- **使用迁移 agent**：跨多个仓库，以测试套件为事实基准。
- **先用确定性规则**：可处理 70 至 80% 的机械性迁移修复。

## 关键数字
type: concepts
from: phases/15-autonomous-systems/09-coding-agent-landscape/docs/zh.md, phases/19-capstone-projects/01-terminal-native-coding-agent/docs/zh.md

- **SWE-bench Verified**：不到三年从 4% 提高到 80.9%，包含 500 个人工筛选任务。
- **运行框架差异**：Claude Sonnet 4.5 在 SWE-agent v1 上为 43.2%，在 Cline 上为 59.8%。
- **简单任务尾部**：500 个 Verified 任务中，161 个只需修改 1 或 2 行。
- **SWE-bench Pro**：修改超过 10 行，前沿系统得分为 23 至 59%。
- **验证器循环**：在 SWE-bench 上带来超过 10 个百分点的差距。
- **Live-SWE-agent**：搭配 Opus 4.5，在 SWE-bench Verified 上为 79.2%。

## 终端 agent 运行框架（01）
type: architecture
from: phases/19-capstone-projects/01-terminal-native-coding-agent/docs/zh.md

```arch
node | cli | 1,1 | 用户 CLI | agent run | client
node | harness | 2,1 | 运行框架 | Bun + Ink TUI | process
node | loop | 3,1 | 规划、行动、观察 | TodoWrite 计划状态 | process
node | model | 4,1 | 模型 | 经 OpenRouter | model
node | tools | 3,2 | 工具分发器 | MCP StreamableHTTP | process
node | box | 2,2 | 沙箱 | E2B 或 Daytona、worktree | process
node | hooks | 1,2 | 钩子 | 8 个生命周期事件 | queue
node | otel | 1,3 | OpenTelemetry | Langfuse：跨度、token、$ | store
node | pr | 2,3 | PR | 经 GitHub app | client
edge | cli | harness |
edge | harness | loop |
edge | loop | model | 调用
edge | loop | tools | 工具调用
edge | tools | box | 执行
edge | box | hooks |
edge | hooks | otel |
edge | otel | pr |
```

## 运行课程
type: task-table
span: 2
from: phases/15-autonomous-systems/09-coding-agent-landscape/docs/zh.md, phases/19-capstone-projects/01-terminal-native-coding-agent/code, phases/19-capstone-projects/09-code-migration-agent/code/main.py, phases/19-capstone-projects/16-github-issue-to-pr-agent/code/main.py, phases/19-capstone-projects/29-end-to-end-coding-task-demo/docs/zh.md

| 任务 | 代码 |
|---|---|
| 对比玩具运行框架（L09） | `code/main.py` |
| 规划、行动、观察循环（01） | `python main.py` |
| TS 运行框架演示与离线评估 | `npm start` |
| 模拟 50 次迁移（09） | `python main.py` |
| 向 3 个仓库分发 20 个 Issue（16） | `python main.py` |
| 修复 fizz 测试样例（29） | `python3 code/main.py` |
| 测试端到端演示 | `python3 -m pytest code/tests/ -v` |

## 三个项目
type: comparison
span: 2
col: 1
from: projects/tiny-coding-agent, projects/rust-agent-shell, projects/pr-review-reporter

| 维度 | tiny-coding-agent | rust-agent-shell | pr-review-reporter |
|---|---|---|---|
| 构建产物 | 使用精确补丁的有界修复循环 | Rust 标准输入/输出行动循环 | 带补丁位置锚点的评审报告 |
| 语言 | Python 3.10+ | Rust 加 Python 适配器 | Node 22.18+ 上的 TypeScript、Python |
| 输入 | 工作区加 `proposals.json` | 工作区加 `requests.jsonl` | Unified diff，经 stdin 或 `--repo` 输入 |
| 输出 | `repair-trace.json` | 按请求 id 输出 JSONL 事件 | `review.json`、`review.html`、SARIF |
| 预算 | `--max-steps` 默认 6 | `--limit` 默认 50 | diff 最多一兆字节 |
| 安全 | 路径限制、单一测试命令 | 不使用系统 shell，读取上限 16 KiB | HTML 转义、精确引文闸门 |
| 结束状态 | `completed`、`failed`、`budget_exhausted` | `ok`、`error`、`rejected` | 接受或拒绝发现项 |

## 项目命令
type: command-table
span: 2
col: 3
from: projects/tiny-coding-agent/README.md, projects/rust-agent-shell/README.md, projects/pr-review-reporter/README.md

| 命令 | 作用 |
|---|---|
| `project_test.py <project> --init learning-artifacts/<project>` | 创建学习者工作区 |
| `project_test.py <project> --stage 1 --path <workspace>` | 评测一个阶段 |
| `project_test.py <project> --all --solution --strict` | 检查参考实现 |
| `cli.py <workspace> <proposals> --copy-to <dir> --out <trace>` | 修复可丢弃副本 |
| `client.py <workspace> <requests> --limit 8 --out <file>` | 通过适配器运行 Rust shell |
| `node cli.ts --diff samples/change.diff --sarif review.sarif` | 写入 JSON、HTML 和 SARIF |
| `--repo /path --base REF --head REF` | 只读 Git diff 模式 |
| `--candidates recorded-findings.json` | 验证另一位评审者的发现 |

## 代码中的预算
type: defaults
col: 1
from: phases/19-capstone-projects/01-terminal-native-coding-agent/code/main.py, phases/19-capstone-projects/09-code-migration-agent/code/main.py, phases/19-capstone-projects/29-end-to-end-coding-task-demo/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `max_turns` | 50 | 综合项目 01 的 `Budget` |
| `max_tokens` | 200_000 | 综合项目 01 的上下文上限 |
| `max_dollars` | 5.00 | 综合项目 01，每任务 |
| `TRUNCATE_BYTES` | 4096 | 01 中的工具输出上限 |
| `BUDGET_TURNS` | 20 | 迁移，同时设置 `BUDGET_USD` 为 8.0 |
| `step_budget` | 12 | L29 的 `AgentRun` |

## 闸门链与沙箱（29）
type: annotated-code
col: 1
lang: python
from: phases/19-capstone-projects/29-end-to-end-coding-task-demo/code/main.py

```python
chain = GateChain(gates=(
    WhitelistGate(allowed=frozenset({"read_file", "write_file", "run_tests"})),  # 允许集合
    RegexGate.from_strings(items=(r"\brm\s+-rf\b", r"\bsudo\b", r"^/etc/")),  # 拒绝的模式
    BudgetGate(max_tokens=budget),  # 观察预算
))
outcome = self.chain.evaluate(call, ctx)  # 遇到第一个拒绝即停止
sandbox = Sandbox(project_root=repo, timeout_seconds=10.0)  # 拒绝列表加路径限制
```

## 故障排查
type: troubleshooting
col: 3
from: phases/15-autonomous-systems/09-coding-agent-landscape/docs/zh.md, phases/19-capstone-projects/01-terminal-native-coding-agent/docs/zh.md, phases/19-capstone-projects/01-terminal-native-coding-agent/code/main.py, phases/19-capstone-projects/09-code-migration-agent/docs/zh.md, phases/19-capstone-projects/16-github-issue-to-pr-agent/docs/zh.md, phases/19-capstone-projects/16-github-issue-to-pr-agent/code/main.py, projects/tiny-coding-agent/solution/main.py, projects/rust-agent-shell/solution/main.rs

| 现象 | 原因 | 修正 |
|---|---|---|
| 8MB 的 ripgrep 匹配让循环崩溃 | 工具输出未截断 | 每次调用限制为 4k token |
| `rm -rf` 到达沙箱 | 没有 `PreToolUse` 护栏 | 由 `destructive_guard` 设置 `blocked` |
| Verified 得分高，真实效果弱 | 简单任务尾部占 500 题中的 161 题 | 用待办中类似 Pro 的子集评分 |
| `budget_exhausted` | 已用完 30 min、$8 或 20 轮 | 将仓库连同当前 diff 归档 |
| `coverage_regression` | 覆盖率下降超过 2% | 按该类别归档，不建 PR |
| `policy_denied` | `can("force_push")` 返回 False | 分支保护生效，app 不在绕过列表 |
| `patch must match exactly once` | 原文本不存在或不唯一 | 使用唯一且精确匹配的原字符串 |
| `path escapes root` | 路径超出规范根目录 | 传入根目录内的相对路径 |

## 问答
type: qa
span: 2
col: 3
from: phases/15-autonomous-systems/09-coding-agent-landscape/docs/zh.md, phases/15-autonomous-systems/09-coding-agent-landscape/code/main.py, phases/19-capstone-projects/16-github-issue-to-pr-agent/code/main.py

- **哪个编程 agent 最好？** 问题不对。应在自己的任务分布上衡量可靠性。
- **玩具 CodeAct 为什么轮次更少？** 一段代码同时改写所有失败文件。
- **安全闸门为什么不用 `assert`？** `python -O` 会移除断言。
