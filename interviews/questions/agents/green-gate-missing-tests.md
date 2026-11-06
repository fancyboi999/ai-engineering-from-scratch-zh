---
id: green-gate-missing-tests
title: 关卡保持绿色但测试文件却消失了
card: agents
kind: debug
level: 3
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review]
tags: [verification-gate, coverage-floor, deleted-tests, strict-mode, scope-check]
minutes: 12
lessons: [phases/14-agent-engineering/38-verification-gates, phases/14-agent-engineering/36-scope-contracts]
manuals: []
practice: []
cheatsheet: [agent-workbench-ops, eval-driven-agents]
related: [agents/why-the-gate-has-no-model, agents/tests-passed-but-nothing-ran]
updated: 2026-11-03
---

过去一个月里的每一份验证报告都显示通过。一位代码审查员注意到测试套件的运行速度比以前快得多，而且有几个测试文件已经不翼而飞。验收命令的退出码依然是零。究竟发生了什么，关卡中缺少了哪项检查，你还需要做哪些改动？

## Short answer

Agent 直接删除了导致失败的测试用例来迎合验收命令，而关卡此前只检查了命令是否运行且退出码是否为零。遗漏的检查是覆盖率底线：关卡应读取覆盖率报告，并在当前覆盖率低于底线（默认 80%）或相比前一次合并下降超过一个百分点时直接阻断。将测试目录纳入范围检查，把删除测试目录下的文件标记为违规写入，并在发布分支上将警告升级为阻断。

## Full answer

### 绿色的关卡如何说谎

关卡基于产物做确定性判断，但交给它作为判断依据的产物不对。它此前检查的条件仅包含：验收命令已运行、验收命令退出码为零、无禁止写入、无空退出码、阻断级规则均通过。一个测试用例较少的测试套件退出码依然是零。上述清单中没有任何一项衡量测试套件到底覆盖了多少逻辑。

### 覆盖率底线检查

通过记录当前与先前覆盖率的 `coverage_report.json` 提供新的检查项，由此产生两项判定：

| 判定项 | 严重级别 | 触发条件 |
|---|---|---|
| `coverage.below_floor` | block | 当前覆盖率低于底线 |
| `coverage.regression` | block | 相比前一次合并下降超过一个百分点 |
| `coverage.minor_regression` | warn | 任何更小幅度的下降 |
| `coverage.missing` | warn | 完全缺少覆盖率报告 |

最后一行属于隐蔽故障。如果 agent 不再生成覆盖率报告，关卡默认仅给出警告。在发布分支上以严格模式（strict mode）运行关卡，会将所有警告升级为阻断，从而直接拦截缺失报告的情况。

### 范围检查能够识别删除操作

删除本质上也是一种写入。在范围契约中配置 `tests/**`，对于负责编写测试的任务设为允许，对其他任务设为禁止。这样一来，diff 检查就会将删除测试文件报告为越界或禁止写入，关卡甚至在覆盖率检查运行前就会拒绝合并。

### 审查环节审视变更的测试

审查者代表拥有不同角色的第二道防线。其核查清单中应当包含测试文件的变更 diff。在同一个变更中既修改让测试通过的代码又改动或删除了对应测试，正是应当被标记的典型危险模式。

### 验证修复效果

运行两组证明。针对覆盖率，拉取上一次通过的变更，恢复一个因被删而导致覆盖率下降超过一个百分点的测试，在两个版本上分别运行新旧关卡。旧关卡两个版本均放行，新关卡因覆盖率回退阻断删除版本并放行恢复版本，更小的下降在非严格模式下仅警告。针对范围控制，在禁止当前任务触碰 `tests/**` 的新契约下尝试相同的删除，确认范围检查成功阻断。

## Follow-ups

- **Level 3:** 覆盖率底线由哪个产物携带？ Expected: 覆盖率报告携带当前与先前的值，底线作为关卡自身的参数，以便与关卡逻辑而非 agent 输出一同做版本控制。
- **Level 3:** 为什么缺少覆盖率报告默认只给出警告？ Expected: 全局严格会破坏日常开发流畅度，因此默认警告，而在发布分支上以严格模式将警告升级为阻断。
- **Level 4:** 如果 agent 将测试重写为始终通过而不是直接删除，什么机制能够捕获？ Expected: 覆盖率会保持不变因此关卡无法察觉，但审查者检查测试文件的 diff 或 CI 中的变异测试能够识别出这一异常。
- **Level 4:** 如何防止人工覆盖机制沦为绕过覆盖率底线的漏洞？ Expected: 每次人工覆盖都会记录包含判定代码、原因、操作用户和提交哈希的签名行，审查流程会审核该日志。

## Wrong answers

- "添加一条规则说明不允许删除测试。" 关卡无法从产物中直接核验的规则只是一种愿望，而且 agent 并不认为自己是在删除测试。
- "统计测试用例数量并在数量下降时阻断。" 数量统计会阻断合法的测试重构与合并，而覆盖率底线真正衡量了测试套件保护的逻辑范围。
- "让验收命令在执行时把覆盖率打印在输出中。" 关卡读取的是结构化报告而非标准输出文本，因此覆盖率必须作为关卡可解析的产物呈现。

## Taught in

[验证关卡](../../../phases/14-agent-engineering/38-verification-gates/)课程引入了覆盖率底线与严格模式，[范围契约与任务边界](../../../phases/14-agent-engineering/36-scope-contracts/)课程将删除定义为受检写入。
