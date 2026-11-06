---
id: rules-the-workbench-can-check
title: 将小心谨慎转化为检查器可判分的具体规则
card: agents
kind: design
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [design-review, system-design]
tags: [agent-rules, executable-constraints, severity, rule-expiry, definition-of-done]
minutes: 12
lessons: [phases/14-agent-engineering/33-instructions-as-executable-constraints]
manuals: []
practice: []
cheatsheet: [agent-workbench-ops]
related: [agents/router-or-manual]
updated: 2026-11-03
---

某说明文件要求 agent 行事小心、充分测试，并在不确定时主动提问。三天后，该 agent 提交了一个毫无测试的变更，向不该触碰的目录写入了文件，且从未提出任何疑问。请重新设计这些说明，使得运行时能够强制执行，审查者也能够对其打分评估。

## Short answer

将每条主观愿望改写为包含 slug 标识、所属类别、单行描述和明确检查函数名的具体规则。五大类别足以覆盖绝大多数规则：启动检查（startup）、禁止操作（forbidden）、完成定义（definition of done）、不确定性处理（uncertainty）以及人工审批（approval）。为每条规则赋予 block、warn 或 info 的严重级别，使得运行时仅在遇到 block 时才拒绝执行。将规则集中维护在一个 markdown 文件中，每个标题对应一条规则，便于代码审查追踪每一次变更。

## Full answer

### 从愿望到可执行规则

| 主观愿望 | 所属类别 | 具体规则 | 对应检查手段 |
|---|---|---|---|
| 行事小心 | 禁止操作（Forbidden） | 从不编辑发布脚本或生产配置 | 针对禁止 glob 列表的 diff 检查 |
| 充分测试 | 完成定义（Definition of done） | 验收命令退出码为零，且反馈日志中存在对应执行记录 | 读取反馈记录日志 |
| 不确定时主动提问 | 不确定性处理（Uncertainty） | 当假设缺少具体文件支撑时，创建提问记录而非盲目猜测 | 当状态文件列出无来源假设时，检查是否存在提问记录 |
| 行事小心 | 人工审批（Approval） | 引入任何新依赖或向生产环境写入任何内容均需人工批准 | 检查操作前是否存在审批记录 |
| 行事小心 | 启动检查（Startup） | 在工作开始前，状态文件必须存在且保持最新 | 会话启动时的文件状态检查 |

任何无法直接归入这五个类别的规则，通常需要被拆分为两条独立的规则。请坚决执行拆分。

### 编写时标定严重级别

每条规则都携带 `block`、`warn` 或 `info` 标签。检查器会对三者全部上报。运行时仅在遇到 block 时阻断。在规则编写时标注严重级别能够提前完成标定，因为那些一开始将所有规则都定为硬性阻断的团队，后续往往会在上线压力下悄悄将其削弱且不留任何审计记录。对 block 规则的人工覆盖必须通过验证关卡写入带签名的审计日志。

### 设定失效期作为强制倒逼机制

每条规则都带有过期日期，从编写之日起默认 90 天有效。当一条规则连续 60 天出现零违规时，检查器会发出预警。在下一次团队审查中，团队决定是附带理由继续保留、降级为 info，还是彻底删除。课程中引用的某项大型审查落地数据显示，在 30 天内对 5,169 个代码库执行的 131,246 次审查运行中，具备显式过期机制的规则集能够将每个仓库的规则控制在 30 条以内；而缺少过期机制的规则集则膨胀到了 80 条以上，且绝大多数从未真正触发过。

### 源文件与缓存文件

Markdown 文件是人工编写的源文件。由 pre-commit 钩子重新生成的 JSON 锁文件则是检查器在热路径上读取的高性能缓存。Markdown diff 具备清晰的可审查性，解析开销也不会拖累每一轮对话。

### 规则与运行时护栏

框架层面的护栏负责在一轮对话中执行具体规则。规则文件是这些护栏所具体实现的、人类可读的统一契约，而 CI 中的检查器则负责证明运行时确实做出了正确的操作。两者缺一不可。

## Follow-ups

- **Level 2:** 为什么陈旧过期的规则应当直接删除而不是注释掉？ Expected: 工作台是单一事实来源，被注释的规则可能依然会被 agent 读取，而检查器却会忽略它。
- **Level 3:** 某条规则要求遵守公开发布的代码风格指南，为什么这种设计是不合格的？ Expected: 它没有对应的强制执行命令，使 agent 能够自行脑补合规标准，应配对具体的 lint 命令。
- **Level 3:** 不确定性检查从何处获取判定信号？ Expected: 来自列出各项假设的状态文件以及提问记录，缺少来源支撑且没有提问记录的假设即构成违规。
- **Level 4:** 这套规则集如何保持跨三款不同 agent 产品的可移植性？ Expected: 该文件由 markdown 和函数名组成，各运行时将其注册为各自的护栏或中断，而文件本身保持为通用契约。

## Wrong answers

- "将每条规则都设为硬性阻断，以便 agent 严肃对待。" 团队会在工期紧迫时悄悄削弱阻断规则，所有规则都阻断的规则集最终会导致没有任何规则被真正落实。
- "把规则保留在 prompt 中，模型能直接读取。" 模型读取了规则依然无法自我验证，而具体的命名检查函数能给运行时和审查者提供同一份裁决。
- "规则源于线上事故，因此应当永久有效。" 从不触发的规则依然会白白消耗注意力预算，设定过期时间能倒逼定期审查，并附带理由决定保留、降级或删除。

## Taught in

[将 agent 指令变为可执行约束](../../../phases/14-agent-engineering/33-instructions-as-executable-constraints/)课程将规则文件解析为可执行检查，并据此对一次运行评定合规分。
