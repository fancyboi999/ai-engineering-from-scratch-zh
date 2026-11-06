---
id: rollback-without-redeploy
title: 让下一次回滚只需几秒
card: production-mlops
kind: design
level: 2
roles: [ai-evaluation-reliability-engineer, inference-engineer, applied-ai-engineer]
rounds: [system-design, design-review]
tags: [rollback, feature-flags, model-registry, canary]
minutes: 10
lessons: [phases/17-infrastructure-and-production/20-shadow-canary-progressive]
manuals: []
practice: []
cheatsheet: [progressive-delivery]
related: [production-mlops/canary-gates-above-noise, production-mlops/shadow-mode-is-a-smoke-test]
updated: 2026-11-03
---

上季度一次失败的模型发布花了三个小时才撤回，因为唯一的回退方式是重新部署。现在你负责发布流程。设计一条能在下次几秒内回退的路径。说出各组件及其保存的内容。

## Short answer

将策略与模型分开。流量比例放在功能开关中，由配置变更切换；模型存放在注册中心，固定摘要，不会自行升级。这样回滚只需两步：恢复开关，将固定指针指回上一个摘要，同时恢复与该模型绑定的 prompt 和模板版本。无需重新构建，也无需重新部署。

## Full answer

### 发布时改变的两个对象

1. **策略。** 多少流量进入哪个模型。它存放在功能开关系统中，几秒就能切换。
2. **模型。** 即模型产物本身。它存放在注册中心，有内容摘要。出现新构建时，固定摘要不会变化。

部署会耦合两者：修改策略也要发布新构建。课程说得直接：技术栈若必须重新部署才能回滚，先解决这一点，再发布任何东西。

### 回滚

恢复开关，将固定摘要改为上一版本，并恢复配套的闸门阈值。课程认为整套操作只需几秒，重新部署则要数小时。开篇案例的重新部署花了三小时，而翻转开关只需 30 秒。

### 同一个开关也控制金丝雀

金丝雀流量比例放在同一个开关中：1%、10%、25%、50%、75%，最后到 100%。闸门越线就将比例归零。叫停与回滚由同一机制完成，每次发布演练的路径，就是事故时使用的路径。

### 工具组成

集群上的渐进式发布控制器在服务网格或入口层调整权重。模型服务平台也可以承载金丝雀分流。功能开关服务保存策略。每类各选一个，旧模型保持部署，直到新模型在 100% 流量下持续通过闸门检查。

### 演练

课程练习要求端到端回滚少于 60 秒。每次发布都在预发环境计时，超过目标就阻断发布。

## Follow-ups

- **Level 2:** 为什么按摘要固定模型，而不是按标签？ Expected: 标签可以指向新构建。摘要不可变，确保回滚目标就是之前运行过的模型。
- **Level 2:** 哪些东西必须随模型一起回退？ Expected: 闸门阈值，以及随模型发布的 prompt 或模板版本。
- **Level 3:** 真正需要之前，怎样知道回滚路径有效？ Expected: 每次发布都在预发演练并端到端计时，对照目标，例如课程中的 60 秒。
- **Level 3:** 新模型需要新引擎镜像，开关还有效吗？ Expected: 有效，前提是两个镜像并排运行，由开关选择。旧部署保持运行，直到新部署在 100% 流量下稳定。

## Wrong answers

- "重新部署之前的镜像来回滚。" 重新部署需要数小时，课程强调将回滚与部署分开。
- "发布一天后删除旧模型。" 旧模型必须保持可用，直到金丝雀在全量流量下持续通过所有闸门。
- "回滚够快就不需要闸门。" 闸门决定何时回滚，快速路径只在触发后限制损害。

## Taught in

[渐进式发布课程](../../../phases/17-infrastructure-and-production/20-shadow-canary-progressive/)将策略开关与固定模型版本分开，让回滚成为配置变更。
