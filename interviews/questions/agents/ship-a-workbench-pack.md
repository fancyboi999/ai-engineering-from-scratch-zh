---
id: ship-a-workbench-pack
title: 打包工作台以便通过单条命令在任意仓库安装
card: agents
kind: take-home
level: 3
roles: [agentic-ai-engineer, ai-developer-relations-engineer, forward-deployed-ai-engineer]
rounds: [take-home, design-review]
tags: [workbench-pack, installer, versioning, schemas, idempotent]
minutes: 45
lessons: [phases/14-agent-engineering/42-agent-workbench-capstone]
manuals: []
practice: []
cheatsheet: [agent-workbench-ops, agent-harness]
related: [agents/seven-surfaces-one-symptom-each, agents/rules-the-workbench-can-check]
updated: 2026-11-03
---

带回作业（Take-home）。你的团队目前将工作台各个表面零散地实现为各自独立的脚本、一份共享文档以及部分口头记忆。请将它们打包为一个统一的目录，使得任何新代码库都能通过单条命令完成安装，并为你主动排除的内容辩护。提交目录结构、安装程序、版本控制规则以及卸载规则。我们对第二次重复执行安装的检验与第一次同样严格。

## Short answer

交付一个包含四个组成部分的版本化目录：承载规则与评审准则的说明文档、构成契约定义的 Schema 文件、作为运行时的自动化脚本，以及一个精简的安装程序。安装程序在未显式传递 force 标志时拒绝覆盖已有的包，拷贝安装包内容，在存在 workflows 目录时自动挂接 CI，并打印后续操作步骤。连续运行两次会产生完全相同的结果。具体项目的专属任务、供应商 SDK 的直接调用以及新人入职说明应坚决排除在外，因为该包是一套通用配方，而每次安装则是按配方做出的一份成品。

## Full answer

### 目录结构

```text
agent-workbench-pack/
  AGENTS.md
  docs/        agent-rules.md  reliability-policy.md  handoff-protocol.md  reviewer-rubric.md
  schemas/     agent_state.schema.json  task_board.schema.json  scope_contract.schema.json
  scripts/     init_agent.py  run_with_feedback.py  verify_agent.py  generate_handoff.py
  bin/         install.sh
  README.md
  VERSION
```

### 包含与排除的边界

包含的内容：Schema，因为它们定义了系统的权威契约；四个核心脚本，因为它们构成了底层运行时；四份核心文档，因为它们规定了规则底线与评审准则。

排除的内容：特定项目的具体任务，它们属于目标代码库的专属任务看板；供应商专属的 SDK 调用代码，因为安装包应当独立于具体框架；通用新人入职文案，因为安装包应当与团队培训文档并列存在而非嵌在其中。

### 安装程序的设计

1. 除非显式传入 `--force` 参数，否则拒绝覆盖现有已安装的包。
2. 将工具包完整复制到目标代码库中。
3. 若存在 `.github/workflows/` 目录，则自动挂接 CI 检查配置。
4. 打印后续执行步骤：填充看板、设定验收命令、执行初始化脚本。

安装程序还会将当前包的版本号写入目标代码库，并生成软链接，确保每款编码 agent 工具都能读取相同的根目录规范文件。为某一款特定工具单独 fork 出一个定制版本属于典型反模式。

### 版本控制契约

`VERSION` 就是硬性契约。涉及数据迁移的 Schema 变更或脚本逻辑变更必须升级主版本号（major）。纯文档层面的修改仅升级修订号（patch）。目标仓库的状态文件中记录了其初始化时所基于的安装包版本，当目标仓库记录的版本与当前包的版本不一致时，lint 检查会直接阻断发布。这是包管理器在长达十年的技术更迭中稳定存续的核心机制，agent 领域的软件工程同样不例外。

### 卸载规则

卸载程序负责清理 Schema、脚本、文档和根配置文件，且在状态文件存在未提交的变更时拒绝执行。它绝不删除状态文件、任务看板或 outputs 产物目录。任务状态数据归用户所有，工具包本身并不拥有这些业务资产。

### 评审评分标准

- 第二次重复执行安装脚本不会引起任何文件变更。
- 当工具包内容与 `VERSION` 发生漂移时，lint 检查能够精准报错。
- 卸载程序在面对非平凡业务状态时主动拒绝执行，并完好保留用户的文件。
- 针对每一项主动排除的内容均附有一段清晰有力的书面辩护。

## Follow-ups

- **Level 3:** 你会选择将哪一份可选的第五份文档纳入工具包中，为什么？ Expected: 给出有理有据的清晰论证，例如版本迁移操作手册，因为每次大版本升级都需要它，且它不属于具体项目。
- **Level 3:** 对卸载程序而言，什么才算作不可删除的非平凡状态？ Expected: 状态文件、任务看板或产物目录中任何未提交的改动，因为那些属于用户的业务成果而非工具包本身。
- **Level 4:** 如何以最短的停机时间将手工搭建的旧工作台迁移到该标准化安装包？ Expected: 先在旁侧并存安装，将现有文件映射到对应 Schema，在一次任务上并行跑关卡，再切换指针归档旧文件。
- **Level 4:** 如果两个代码仓库锁定了安装包的不同主版本，会产生什么问题？ Expected: 没有任何破坏，只要各自记录版本且 lint 按各自工具包校验即可，共享 CI 流水线必须针对各仓库运行对应版本。

## Wrong answers

- "把团队当前的 backlog 任务打包塞进工具包，让新仓库开箱就有真实任务。" 任务归属于具体的业务仓库，包含业务任务的安装包除了一个仓库外对其余所有代码库都是错误的。
- "在脚本中直接调用供应商 SDK 以节省开发时间。" 工具包必须能够在框架技术换代中存续，硬编码 SDK 会将所有安装绑定在单一运行时上。
- "让安装程序默认执行覆盖操作以简化版本更新。" 缺少明确标志的静默覆盖会直接摧毁团队的本地配置修改，force 标志让每次更新都成为深思熟虑的显式决策。

## Taught in

[综合项目：交付一个可复用的 Agent 工作台包](../../../phases/14-agent-engineering/42-agent-workbench-capstone/)课程组装了该工具包、安装程序以及严格的版本控制规范。
