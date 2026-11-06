---
id: why-the-gate-has-no-model
title: 为什么验证关卡中不包含模型
card: agents
kind: concept
level: 3
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [design-review, ml-depth]
tags: [verification-gate, deterministic, llm-judge, override-log, defense-in-depth]
minutes: 10
lessons: [phases/14-agent-engineering/38-verification-gates]
manuals: []
practice: []
cheatsheet: [agent-workbench-ops, eval-driven-agents]
related: [agents/tests-passed-but-nothing-ran, agents/rules-the-workbench-can-check]
updated: 2026-11-03
---

有人提议用模型 judge 替代判定 agent 任务是否完成的脚本。其理由是 judge 能阅读 diff、理解意图，并且比脚本捕获更多问题。请论证赞同或反对，并说明 judge 真正属于什么位置。

## Short answer

反对。关卡只回答一个问题：该任务是否完成；在版本控制和 CI 中，面对相同的产物，这一裁决每次都必须完全相同，且不给 agent 争辩的余地。模型 judge 在不同时间可能给出不同答案，还可能被说服而判定通过。Judge 属于审查环节，那里的问题是定性的：代码是否易读、安全且符合风格规范。

## Full answer

### 关卡所读取的内容与做出的裁决

| 具体检查项 | 数据来源 | 严重级别 |
|---|---|---|
| 所有验收命令均已实际运行 | 反馈日志记录 | block |
| 所有验收命令退出状态码均为零 | 反馈日志记录 | block |
| 绝无针对禁止路径的任何写入 | 范围契约报告 | block |
| 绝无越界的未授权路径写入 | 范围契约报告 | block 或 warn |
| 所有 block 严重级别的规则均顺利通过 | 规则合规报告 | block |
| 没有任何命令的退出状态码为 null | 反馈日志记录 | block |
| 触碰的文件完全匹配允许的 glob 模式 | 双方数据比对 | warn |

警告仅标注裁决结果。阻断会直接杜绝输出 `passed: true`。其中的每一项检查，都是在 agent 已经真实落盘的结构化产物之间做严格比对。这里不需要判断，因此不需要 judge。

### 为什么确定性是不可妥协的核心

Agent 工作中常见三类失败形态：“看着挺好”、没有记录的“测试已通过”，以及宽泛到失去约束的验收条件。模型 judge 会同时受这三者影响。它读了 diff 觉得看着挺好；读了运行记录就相信其说法；对验收条件宽大处理。脚本绝不会这样，因为它从不阅读散文。课程将两类信号配对：诸如测试、Schema 检查和退出码等可验证检查回答代码是否解决了问题；而基于 rubric 的 judge 回答代码是否易读且符合风格。混淆两者会破坏信号体系。

### 人工覆盖必须显式签名

Agent 没有权限自行绕过 block 级别的阻断。唯有人类工程师能够执行覆盖，且该操作必须在 git 跟踪的审计日志中追加包含判定代码、覆盖理由、签名用户以及当前提交的记录。运行时在遇到未经签名的条目时直接拒绝执行。这是严谨的例外管理策略与流于形式的虚伪审批之间的分水岭。

### 单一报告，多层防御

关卡为每个任务在固定路径下生成唯一的 `verification_report.json`，CI 流水线也直接读取该文件。围绕它构建了多层确定性防御：pre-commit 钩子、CI 状态检查、工具执行前的授权拦截，以及代码合并前的硬性门禁。前一层的漏网之鱼必将被后一层精准捕获。Pre-commit 钩子不依赖 agent 的自觉，但它可能被 `git commit --no-verify` 绕过，因此 CI 状态检查与合并门禁牢牢掌握着最终的准入裁决权。

### Judge 的位置

审查者是拥有不同角色的另一道检查，在关卡通过后读取 diff 和报告。它对易读性、安全性和风格评分。其输出交给人工或写入交接包，绝不计入关卡的裁决。

## Follow-ups

- **Level 3:** Agent 删除了报错的测试用例导致关卡依然呈绿色通过，缺少了哪项检查？ Expected: 从覆盖率报告中读取的覆盖率底线，当覆盖率低于底线或相比前次合并下降超一个百分点时直接阻断。
- **Level 3:** 什么时候将所有警告一律升级为阻断才是正确的默认策略？ Expected: 在发布分支以及事故后的分诊排查期间通过严格标志启用，而不是全局默认，以免破坏日常开发流畅度。
- **Level 4:** 依赖什么机制防止人工覆盖日志沦为形同虚设的橡皮图章？ Expected: 运行时直接拒绝未经签名的覆盖记录，日志受 git 版本控制追踪，且审查流程强制核查，使每次覆盖权责分明。
- **Level 4:** 如果关卡与代码审查者的结论发生冲突，以谁为准？ Expected: 关卡裁定任务是否完成，审查者裁定代码是否优秀，关卡失败无条件阻断，审查失败则重新打开任务但不篡改裁决。

## Wrong answers

- "Judge 能理解意图，因此能捕获更多问题。" 关卡不需要意图，推断意图的 judge 可能会被说服，将未完成的任务判定为已完成。
- "同时运行 judge 和脚本，任一通过即可。" 这样 judge 就成了绕过脚本的途径；必须由确定性检查决定是否完成，judge 仅作标注。
- "让 agent 解释为什么某项阻断不适用。" Agent 本身就是受检对象，覆盖需要人工附带理由签名。

## Taught in

[验证关卡](../../../phases/14-agent-engineering/38-verification-gates/)课程构建了该确定性关卡、带签名的审计覆盖日志以及覆盖率底线防线。
