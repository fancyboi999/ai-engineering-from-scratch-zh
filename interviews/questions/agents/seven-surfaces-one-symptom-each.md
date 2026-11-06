---
id: seven-surfaces-one-symptom-each
title: 七个交互表面及各自缺失时的典型症状
card: agents
kind: concept
level: 1
roles: [agentic-ai-engineer, ai-developer-relations-engineer, forward-deployed-ai-engineer]
rounds: [screen, ml-breadth]
tags: [workbench, surfaces, harness, definition-of-done, system-of-record]
minutes: 6
lessons: [phases/14-agent-engineering/31-agent-workbench-why-models-fail]
manuals: []
practice: []
cheatsheet: [agent-harness, agent-workbench-ops]
related: [agents/a-login-fix-touched-five-files]
updated: 2026-11-03
---

一个团队在一个小型仓库任务上运行了前沿模型。生成的结果包含看似合理的代码、两个失败标红的测试用例、对一个与任务完全无关文件的修改，并且没有任何关于模型做了哪些假设或遗留了哪些工作的说明记录。团队因此希望采购更强大的模型。你会对他们说什么？

## Short answer

模型在编程语言语法上表现正确，但在具体工作上却错了，而更大的模型根本无法解决这个问题。高可靠的 agent 需要在模型外围构建包含七个交互表面的工作台：指令、状态、范围、反馈、验证、审查与交接。运行中暴露出的每个具体症状，都精确对应着某个缺失的表面。你可以随意替换底层模型并保留这些表面，但不能丢弃这些表面却指望维持系统的可靠性。

## Full answer

### 七个核心表面

| 表面 | 承载的内容 | 缺失时的系统症状 |
|---|---|---|
| 指令（Instructions） | 启动规则、禁止操作、完成的定义 | Agent 只能盲目猜测何为完成 |
| 状态（State） | 当前任务、涉及文件、阻塞问题、下一步行动 | 每次会话都只能从零开始摸索 |
| 范围（Scope） | 允许文件、禁止文件、验收标准 | 代码修改随意扩散蔓延至无关文件 |
| 反馈（Feedback） | 捕获进循环内部的真实系统命令输出 | Agent 在命令报错时依然自封大功告成 |
| 验证（Verification） | 测试、lint 校验、冒烟运行、范围比对 | “看着挺好”的半成品长驱直入主分支 |
| 审查（Review） | 拥有独立角色的第二道检查防线 | 构建者自己给自己打分审查 |
| 交接（Handoff） | 做了什么修改、原因、遗留了什么 | 下一次会话又要把所有东西重新找一遍 |

### 将本次运行的症状映射至表格

- 两个测试标红依然宣称成功：缺失了反馈表面与验证表面。
- 修改了完全无关的文件：缺失了范围表面。
- 没有任何关于假设或遗留事项的记录：缺失了状态表面与交接表面。
- 除了构建者自身之外没有任何独立实体阅读 diff：缺失了审查表面。

### 为什么单纯换更大的模型行不通

控制闭环是建立在状态文件之上，而不是建立在脆弱的聊天历史之上。聊天记录容易丢失。代码仓库才是权威记录系统。课程列出了实测证据：在保持同一款模型不变的前提下，仅仅更换 harness，某款编码 agent 在终端基准测试中就从 30 名开外跃升至第 5 名；另一团队删除了其 agent 80 percent 的工具，任务成功率便从 80 percent 跃升至 100 percent。当下的核心工程负载是由模型外围的基础设施所承担的。

### 工作台（Workbench）到底是什么

它不是 prompt 工程，prompt 只能告诉模型当轮需要做什么。它也不是框架，框架只负责提供运行时环境。工作台是 agent 展开工作的具体操作场域，无论你选用何种运行时，agent 都在其中跨轮次、跨会话开展工作。

## Follow-ups

- **Level 1:** 拉取请求模板（PR Template）对应七个表面中的哪一个？ Expected: 交接表面，因为它记录了修改了什么、为什么修改以及遗留了哪些待办事项。
- **Level 2:** 哪个表面能够捕获 agent 偷偷写入了没人要求的多余文件？ Expected: 首先是范围表面，因为 diff 检查会比对修改文件与契约，其次是验证表面，它会拒绝越权写入。
- **Level 2:** 为什么课程强调循环是闭环在文件上而非闭环在聊天记录上？ Expected: 会话会终结且上下文会被裁剪，因此持久化文件是下一次会话唯一能够信任的权威凭证。
- **Level 3:** 课程将每个表面映射到一个分布式系统原语，验证表面对应什么？ Expected: 一个在输入上具备确定性的函数，在任务关闭时触发执行，且在失败时拒绝放行。

## Wrong answers

- "模型产生了幻觉，应该挑选一个幻觉更少的模型。" 模型不知道何为完成或允许在何处写入，缺少这些工程表面没有任何模型能够凭空知晓。
- "编写更长的系统 prompt 并写入所有规则。" Prompt 只能覆盖单轮交互，而工程表面在跨轮次与跨会话中承载系统的持久状态。
- "现有的开发框架已经涵盖了这些功能。" 框架为 agent 提供了底层的运行时，而工作台则是 agent 在该运行时内部具体读取和写入的数据层。

## Taught in

[Agent 工作台工程：能干的模型为什么还会失败](../../../phases/14-agent-engineering/31-agent-workbench-why-models-fail/)课程定义了这七个交互表面，并在启用与未启用表面两种情况下运行了相同的任务。
