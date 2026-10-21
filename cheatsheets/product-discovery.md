---
id: product-discovery
title: 成果、工作流、风险与规格
code: OW
subtitle: 定义成果、核实工作流、排列假设、选择切片、编写规格、设置指标，再选择阶段。
hue: 330
sources: phases/14-agent-engineering/47-outcomes-before-output, phases/14-agent-engineering/48-discover-the-real-workflow, phases/14-agent-engineering/49-map-assumptions-and-risk, phases/14-agent-engineering/50-choose-the-smallest-testable-slice, phases/14-agent-engineering/51-write-specifications-that-preserve-judgment, phases/14-agent-engineering/52-design-success-metrics, phases/14-agent-engineering/53-prototype-pilot-or-production
source_hash: 4ae0998fcbcce537
---

## 从请求到阶段
type: flow
from: phases/14-agent-engineering/47-outcomes-before-output/docs/zh.md, phases/14-agent-engineering/48-discover-the-real-workflow/docs/zh.md, phases/14-agent-engineering/49-map-assumptions-and-risk/docs/zh.md, phases/14-agent-engineering/50-choose-the-smallest-testable-slice/docs/zh.md, phases/14-agent-engineering/51-write-specifications-that-preserve-judgment/docs/zh.md, phases/14-agent-engineering/52-design-success-metrics/docs/zh.md, phases/14-agent-engineering/53-prototype-pilot-or-production/docs/zh.md

1. **成果**：描述结果，不指定解决方案。
2. **工作流**：记录人们执行的步骤，并附证据。
3. **假设**：为各项押注评分，先测试风险最高的未决项。
4. **切片**：选择能覆盖所需证明的最小切片。
5. **规格**：确定不变量，标注每项决策模式。
6. **指标**：结果出现前就设定阈值。
7. **阶段**：选择原型、试点或生产。

## 选择阶段
type: architecture
from: phases/14-agent-engineering/53-prototype-pilot-or-production/docs/zh.md, phases/14-agent-engineering/53-prototype-pilot-or-production/code/main.py

```arch
node | unk | 1,1 | 未知项 | 要回答的学习问题 | client
node | real | 2,1 | 需要真实用户或数据？ | choose_stage |
node | proto | 3,1 | 原型 | 可丢弃、隔离 | process
node | ready | 2,2 | 后果可控、运维就绪？ | consequence 低于 4 |
node | pilot | 3,2 | 试点 | 明确受众、可回滚 | process
node | prod | 4,2 | 生产 | 持续负责 | process
edge | unk | real |
edge | real | proto | 否
edge | real | ready | 是
edge | ready | pilot | 否
edge | ready | prod | 是
```

## 成果框架
type: concepts
from: phases/14-agent-engineering/47-outcomes-before-output/docs/zh.md, phases/14-agent-engineering/47-outcomes-before-output/code/main.py

- **用户**：谁直接经历这个问题？
- **情境**：问题在何时、何地发生？
- **当前行为**：现在实际发生什么，有哪些变通办法？
- **期望成果**：哪个可观察状态会改善？
- **约束**：固定的安全、策略、成本或兼容性限制。
- **非目标**：明确排除的诱人相邻工作。
- **方案渗入**：成果描述中提前出现产品形式、模型或框架。

## 实验公式
type: concepts
from: phases/14-agent-engineering/48-discover-the-real-workflow/code/main.py, phases/14-agent-engineering/49-map-assumptions-and-risk/code/main.py, phases/14-agent-engineering/50-choose-the-smallest-testable-slice/code/main.py, phases/14-agent-engineering/52-design-success-metrics/code/main.py

- **风险**：$\mathrm{impact} \times \mathrm{uncertainty} + \mathrm{irreversibility}$
- **切片得分**：$\frac{\mathrm{value} + \mathrm{uncertainty\ reduced}}{\mathrm{effort} + \mathrm{risk\ penalty}}$
- **风险惩罚**：不可逆时，后果乘 2；否则乘 0.5。
- **合格切片**：所需证明是 `proves` 的子集。
- **直接证据比例**：直接证据项数除以全部证据项数。
- **`at-most`**：值小于或等于阈值时通过。
- **`at-least`**：值大于或等于阈值时通过。

## 假设与证据
type: concepts
from: phases/14-agent-engineering/49-map-assumptions-and-risk/docs/zh.md, phases/14-agent-engineering/48-discover-the-real-workflow/docs/zh.md

- **价值**：成果是否足够重要？
- **可用性**：用户能否理解并采取行动？
- **可行性**：系统能否在现有数据和约束下产出结果？
- **可持续性**：组织能否持续承担成本、责任与运营？
- **安全性**：失败时能否避免不可接受的后果？
- **证据阶梯**：直接行为、产物、转述行为、推断。
- **当前行为证明**：只有前两级符合。

## 三种决策模式
type: comparison
from: phases/14-agent-engineering/51-write-specifications-that-preserve-judgment/docs/zh.md, phases/14-agent-engineering/51-write-specifications-that-preserve-judgment/code/main.py

| 维度 | 锁定 | 有界 | 委派 |
|---|---|---|---|
| agent 可以 | 不能自行选择 | 在限制内选择 | 负责选择并解释 |
| 适用场景 | 安全、权限、公共兼容性 | 搜索预算、重试次数 | 命名、可逆重构 |
| 下一步 | 人工检查点 | agent 在限制内提出方案 | agent 实现并证明 |
| 理由 | 必填 | 必填 | 可选 |
| 输出键 | `human_checkpoint` | `bounded_decisions` | `agent_may_decide` |

## 原型、试点与生产
type: comparison
span: 2
from: phases/14-agent-engineering/53-prototype-pilot-or-production/docs/zh.md, phases/14-agent-engineering/53-prototype-pilot-or-production/code/main.py

| 维度 | 原型 | 试点 | 生产 |
|---|---|---|---|
| 问题 | 机制能否产出所需证据？ | 在受限真实受众中能否安全运行？ | 能否对承诺的可靠性负责？ |
| 适用条件 | 不需要真实用户或数据 | 需要真实行为，后果控制尚未就绪 | 后果可控，运维就绪 |
| 控制措施 | 合成或录制输入、可丢弃 | 限定受众、回滚、人工负责人、审计记录 | SLO、值班负责人、安全评审、监控 |
| 退出方式 | 机制证明值得进入下一阶段 | 扩大、修订或停止 | 退役路径 |

## 指标契约
type: annotated-code
lang: python
from: phases/14-agent-engineering/52-design-success-metrics/code/main.py, phases/14-agent-engineering/52-design-success-metrics/docs/zh.md

```python
plan = MeasurementPlan(
    goal="Reduce time to identify the affected service without increasing unsafe actions",
    questions=["How quickly is the correct service identified?"],
    metrics=[
        Metric("median_identification_seconds", "at-most", 120,
               "ten incident replays", "replay log", "outcome"),
        Metric("correct_service_rate", "at-least", 0.9,
               "ten incident replays", "incident record", "outcome"),
        Metric("production_writes", "at-most", 0,
               "entire pilot", "audit log", "guardrail"),  # 必需的类型
    ])
report(plan, values)          # 缺失值的状态为 missing
```

## 实验函数
type: task-table
col: 4
from: phases/14-agent-engineering/47-outcomes-before-output/code/main.py, phases/14-agent-engineering/48-discover-the-real-workflow/code/main.py, phases/14-agent-engineering/49-map-assumptions-and-risk/code/main.py, phases/14-agent-engineering/50-choose-the-smallest-testable-slice/code/main.py, phases/14-agent-engineering/51-write-specifications-that-preserve-judgment/code/main.py, phases/14-agent-engineering/53-prototype-pilot-or-production/docs/zh.md, phases/14-agent-engineering/53-prototype-pilot-or-production/code/main.py

| 任务 | 代码 |
|---|---|
| 运行实验及测试 | `python3 -m unittest discover code/tests -v` |
| 成果框架状态 | `decision(frame)` |
| 审计工作流证据 | `audit(steps)` |
| 排列假设优先级 | `prioritize(items)` |
| 风险最高的未决项 | `next_experiment(items)` |
| 选择合格切片 | `choose(items, required_proof)` |
| 将规格转成契约 | `compile_contract(specification)` |
| 阶段及其控制措施 | `plan(decision)` |

## 实验常量
type: defaults
from: phases/14-agent-engineering/48-discover-the-real-workflow/code/main.py, phases/14-agent-engineering/49-map-assumptions-and-risk/code/main.py, phases/14-agent-engineering/51-write-specifications-that-preserve-judgment/code/main.py, phases/14-agent-engineering/53-prototype-pilot-or-production/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| 风险维度 | range(1, 6) | 影响、不确定性、不可逆性 |
| 证据 `confidence` | 0 <= item.confidence <= 1 | 否则报告问题 |
| 工作流 `order` | range(1, len(steps) + 1) | 从 1 开始连续编号 |
| `VALID_MODES` | {"locked", "bounded", "delegated"} | 其他模式无效 |
| 阶段 `consequence` | 1 <= decision.consequence <= 5 | 否则报错 |
| 进入试点的后果值 | 4 | 或不可逆，或尚未就绪 |

## 验证器消息
type: troubleshooting
span: 2
from: phases/14-agent-engineering/47-outcomes-before-output/code/main.py, phases/14-agent-engineering/50-choose-the-smallest-testable-slice/code/main.py, phases/14-agent-engineering/51-write-specifications-that-preserve-judgment/code/main.py, phases/14-agent-engineering/52-design-success-metrics/code/main.py

| 现象 | 原因 | 修正 |
|---|---|---|
| `desired outcome names the proposed output` | 成果描述中渗入方案 | 改为描述可观察结果 |
| `non-goals are empty` | 切片没有边界 | 增加能明确排除工作的非目标 |
| `no slice proves the required assumptions` | 候选切片跳过风险部分 | 设计覆盖证明集合的切片 |
| `constrained decision lacks rationale` | 锁定或有界决策没有原因 | 写明设置限制的原因 |
| `guardrail metric is missing` | 只有成果指标 | 增加 `production_writes` 护栏 |

## 问答
type: qa
from: phases/14-agent-engineering/50-choose-the-smallest-testable-slice/docs/zh.md, phases/14-agent-engineering/51-write-specifications-that-preserve-judgment/docs/zh.md, phases/14-agent-engineering/52-design-success-metrics/docs/zh.md, phases/14-agent-engineering/53-prototype-pilot-or-production/docs/zh.md, phases/14-agent-engineering/48-discover-the-real-workflow/docs/zh.md

- **切片便宜、得分高，却未覆盖证明？** 仍不符合资格。
- **每种结果都指向继续构建？** 这个切片不是实验。
- **低层证据能证明高层主张吗？** 不能。单元测试只能证明局部契约。
- **离线回放还是试点？** 二者不能互相替代。
- **生产何时开始？** 组织接受持续责任时。

## 提示
type: tips
from: phases/14-agent-engineering/50-choose-the-smallest-testable-slice/docs/zh.md, phases/14-agent-engineering/52-design-success-metrics/docs/zh.md, phases/14-agent-engineering/53-prototype-pilot-or-production/docs/zh.md, phases/14-agent-engineering/49-map-assumptions-and-risk/docs/zh.md

- 避免伪最小切片：只有 UI、只有基础设施、只有正常路径、演示或平台。
- 实现前写下停止规则。
- 看到结果前写下通过、失败与模糊结果的处理路径。
- 在配置、访问控制、遥测和文档中标注阶段。
