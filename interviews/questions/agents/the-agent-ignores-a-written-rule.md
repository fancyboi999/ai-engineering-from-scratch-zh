---
id: the-agent-ignores-a-written-rule
title: 规则明确写入仓库但 Agent 仍不断违反
card: agents
kind: debug
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review]
tags: [agent-rules, reachability, conflicting-instructions, aspirational-rule, router]
minutes: 12
lessons: [phases/14-agent-engineering/33-instructions-as-executable-constraints, phases/14-agent-engineering/32-minimal-agent-workbench]
manuals: []
practice: []
cheatsheet: [agent-workbench-ops, coding-agents]
related: [agents/router-or-manual, agents/rules-the-workbench-can-check]
updated: 2026-11-03
---

某条规则规定：未经人工审批不允许修改任何数据库迁移文件。该规则保存在 `docs/database.md` 中，由 `docs/architecture.md` 引用，而顶层说明文件又链接了后者。同时，顶层根文件要求所有场景下必须使用 ORM，而数据库文档却明确要求迁移文件中必须编写原生 SQL。本周 agent 在未经任何审批的情况下两次修改了迁移文件。请找出导致该问题的根本原因并按序修复。

## Short answer

存在三个各自独立的成因，且任意一个都足以酿成该故障。首先是该规则距离根路由器多达三次跳转，超过了两次可达性上限，导致 agent 根本不会加载它；其次它仅是缺乏对应检查的纯自然语言文本，即便 agent 读到了也没有任何机制拒绝写入。此外根文件与数据库文档存在正面冲突，而相互冲突的指令会悄无声息地诱使 agent 从主动提问退化为盲目猜测。修复顺序应当是先恢复可达性，再将该规则升级为带有 block 严重级别检查的审批类规则，最后消除规则冲突。

## Full answer

### 成因一：可达性断裂

Agent 从根路由器出发应当最多经过两次跳转就能触达任意一条规则。而该规则需要三次跳转。路由器必须通过文件路径直接链接每个专题文档，因此 `docs/database.md` 应当直接写入根路由器中，且该规则本身应直接放入 agent 每次启动必读的 `docs/agent-rules.md` 中。失效的死链比未写的规则危害更大，因此必须校验路由器中的每个路径是否存在，并将死链标记为启动阶段的违规。

### 成因二：空洞愿望型规则

在缺乏具体检查代码的情况下，“未经审批不得修改迁移文件”只是一句空泛的愿望。应将其重写为包含 slug、单行说明、`check` 检查函数及 `block` 严重级别的审批类规则。检查函数比对 diff 是否触碰了 `migrations/**` 并核验审批记录。运行时遇 block 直接阻断执行。检查器如实上报，任何人工覆盖都必须在审计日志中附带人类签名。

### 成因三：指令自相矛盾

根文件要求全局强制使用 ORM。数据库文档要求在迁移文件中手写原生 SQL。Agent 无法同时满足这两条规则，而相互冲突的指令已被实测证实会导致 agent 产生隐蔽的行为异化：从主动提问的交互模式滑向自行脑补的贪婪猜测模式。课程中的实测数据显示，没有冲突时问题解决率为 48.8%，存在冲突时为 28%。陷入贪婪模式的 agent 不会主动请求人工审批。应当明确标定优先级次序，或者将 ORM 规则严格圈定在应用层代码，将原生 SQL 规则严格限定在迁移文件，消除两者的适用重叠。

### 修复顺序与落地

1. 将规则移入规则文件，并在根路由器中直接链接数据库专题文档。此时 agent 能够读到它。
2. 添加自动化检查函数并配置 block 级别。此时运行时能够强制阻断。
3. 消除 ORM 与原生 SQL 的规则范围冲突。此时 agent 恢复主动提问而非胡乱猜测。
4. 引入工作台 lint 工具，当路由器超过行数预算或引用不存在文件时直接报错，杜绝问题复发。

### 验证修复成效

针对本周的两次故障运行重新执行检查器。规则报告必须清晰显示审批规则在两次运行中均被判定为失败，且级别均为 block。随后在涉及迁移修改的任务中重新运行 agent，验证其在执行写入前必须显式发起审批请求。

## Follow-ups

- **Level 3:** 为什么更简短的根文件在这里能起到关键帮助？ Expected: 精简的路由器在每次会话以及每次 PR 审查中都能被完整重读，从而保证指向数据库文档的指针保持最新且真实可达。
- **Level 3:** 团队希望将规则留在数据库文档中以保留上下文，你会怎么处理？ Expected: 在该文档中保留背景解释，将规则与检查放入规则文件，两者均从根路由链接，两跳可达且保留上下文。
- **Level 4:** 在事故发生之前，你如何自动化发现相互矛盾的两条规则？ Expected: 构建 lint 工具标记适用范围重叠但动词要求相反的规则，并在代码审查中建立在路由器中明确标定优先级的习惯。
- **Level 4:** 检查器在 CI 中通过了，但 agent 在实时交互会话中仍修改了迁移文件，漏洞在哪？ Expected: 检查器属于事后检验，相同的检查必须同时作为运行时的 pre-tool hook 运行，在写入发生前就地阻断。

## Wrong answers

- "用大写字母把该规则追加到系统 prompt 中。" 强调字句并不能凭空创造出检查机制，且路由器中的逻辑冲突依然会促使 agent 走向胡乱猜测。
- "这是模型不听指令，应该直接更换模型。" 该规则在物理上不可达、在技术上无法检查且自相矛盾，换用其他模型依然会遭遇相同的三个硬伤。
- "既然引起了冲突，直接把 ORM 规则删掉。" ORM 规则在业务应用代码中是完全正确的，应当精确界定其生效范围，而不是删除它。

## Taught in

[将 agent 指令变为可执行约束](../../../phases/14-agent-engineering/33-instructions-as-executable-constraints/)课程确立了两跳可达规则与五大分类，[最小 Agent 工作台](../../../phases/14-agent-engineering/32-minimal-agent-workbench/)课程测定了相互矛盾的指令对系统造成的严重破坏。
