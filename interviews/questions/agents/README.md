# Agent

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

agent 循环、工具、范围契约、验证关卡，以及 agent 为什么会失败。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [交接包包含而状态报告不包含的内容](a-handoff-is-not-a-status-report.md) | 概念 | 1 基础 | 6 |
| [循环成为 Agent 而非聊天机器人的要素](five-parts-of-an-agent-loop.md) | 概念 | 1 基础 | 5 |
| [七个交互表面及各自缺失时的典型症状](seven-surfaces-one-symptom-each.md) | 概念 | 1 基础 | 6 |
| [单条反馈记录包含的内容](what-a-feedback-record-carries.md) | 概念 | 1 基础 | 5 |
| [修复一个登录问题却改了五个文件](a-login-fix-touched-five-files.md) | 排障 | 2 应用 | 10 |
| [为所有任务设定一个统一的轮数上限，你给什么数字](a-turn-cap-for-every-task.md) | 估算 | 2 应用 | 8 |
| [阅读循环：调用方在轮数耗尽时获得什么](budget-exhausted-looks-like-an-answer.md) | 代码阅读 | 2 应用 | 8 |
| [阅读注册表：模型在错误调用时收到什么](error-paths-the-model-can-fix.md) | 代码阅读 | 2 应用 | 10 |
| [显式 finish 工具还是无工具调用即停止](finish-tool-or-silence.md) | 权衡 | 2 应用 | 8 |
| [为眼前的任务选择权限模式](pick-the-permission-mode.md) | 权衡 | 2 应用 | 8 |
| [为 Agent 提供简短路由文件还是长篇手册](router-or-manual.md) | 权衡 | 2 应用 | 10 |
| [将小心谨慎转化为检查器可判分的具体规则](rules-the-workbench-can-check.md) | 设计 | 2 应用 | 12 |
| [Agent 宣称测试通过但实际未运行任何测试](tests-passed-but-nothing-ran.md) | 排障 | 2 应用 | 10 |
| [这个 Agent 陷入了无限死循环，找出原因](the-agent-loops-forever.md) | 排障 | 2 应用 | 10 |
| [阅读 harness：hook 在计划执行途中中止工具调用](a-hook-aborts-the-tool-call.md) | 代码阅读 | 3 高级 | 12 |
| [压缩上下文还是结束会话并交接](compact-or-hand-off.md) | 权衡 | 3 高级 | 10 |
| [关卡保持绿色但测试文件却消失了](green-gate-missing-tests.md) | 排障 | 3 高级 | 12 |
| [现在构建 Harness 还是等待更聪明的模型](harness-or-a-smarter-model.md) | 权衡 | 3 高级 | 10 |
| [每个操作都获批准但执行轨迹依然造成危害](safe-actions-harmful-trajectory.md) | 概念 | 3 高级 | 10 |
| [打包工作台以便通过单条命令在任意仓库安装](ship-a-workbench-pack.md) | 课后任务 | 3 高级 | 45 |
| [规则明确写入仓库但 Agent 仍不断违反](the-agent-ignores-a-written-rule.md) | 排障 | 3 高级 | 12 |
| [为什么验证关卡中不包含模型](why-the-gate-has-no-model.md) | 概念 | 3 高级 | 10 |
| [两个范围契约作用于同一个 diff 的合并定义](merge-two-scope-contracts.md) | 设计 | 4 架构与规模 | 15 |
| [为单次 Agent 辅助代码变更提供证据](prove-one-repository-change.md) | 课后任务 | 4 架构与规模 | 60 |
| [目录中两百个工具但每轮仅展示四十个](two-hundred-tools-in-the-catalog.md) | 设计 | 4 架构与规模 | 15 |
| [将八种 harness 模式还原为底层原语](vendor-patterns-to-primitives.md) | 概念 | 4 架构与规模 | 15 |

[全部主题](../../README.md)
