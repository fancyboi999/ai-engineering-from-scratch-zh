---
id: renamed-token-attribute
title: SDK 升级后 token 看板显示零
card: production-mlops
kind: debug
level: 2
roles: [ai-evaluation-reliability-engineer, inference-engineer, ai-data-engineer]
rounds: [debugging, screen]
tags: [opentelemetry, genai-conventions, dashboards, upgrades]
minutes: 8
lessons: [phases/19-capstone-projects/28-observability-otel-traces, phases/14-agent-engineering/23-otel-genai-conventions]
manuals: []
practice: []
cheatsheet: [genai-observability]
related: [production-mlops/read-this-span, production-mlops/prompts-in-span-attributes]
updated: 2026-11-03
---

追踪 SDK 例行升级后，所有模型的 token 用量面板都显示零，请求数和延迟面板却正常。没有部署其他变更。你先查哪里？

## Short answer

先看服务现在输出的 span 属性名。GenAI 规范仍标记为开发中，以前也改过属性名：输入 token 计数从 `gen_ai.usage.prompt_tokens` 改成了 `gen_ai.usage.input_tokens`。SDK 输出新名称而看板查询旧名称时，所有 token 面板都会显示零，请求数和延迟却不受影响。锁定输出的规范版本，并设置稳定性选择启用开关，避免属性名悄然变化。

## Full answer

### 为什么只有 token 面板出问题

请求数来自 span 数量，延迟来自 span 起止时间。两者都不依赖属性名。token 面板按键名对某个属性求和。键名变了，求和结果就为零，而且不会报错。

### 一分钟内确认

分别取出升级后和升级前的一条原始 span，比较属性键。旧键消失了，新键携带着数值。

### 按顺序修复两处

1. 将看板查询改为新键。过渡期间对两个键求和，让新旧 span 都能显示。
2. 防止名称变化：在输出端锁定规范版本，设置 `OTEL_SEMCONV_STABILITY_OPT_IN`，并在每次 SDK 升级时核对名称。

### 防止复发

综合项目的测试断言输出 span 中存在规范属性。每次依赖升级都运行这些测试。为这种故障设告警：请求数大于零，而 token 总和为零。

## Follow-ups

- **Level 2:** 为什么请求数和延迟面板仍正常？ Expected: 它们使用 span 数量和耗时，不依赖属性名。
- **Level 3:** 怎样在上线前发现下一次改名？ Expected: 测试输出的 span，断言规范属性名，并在每次依赖升级时运行。
- **Level 3:** 看板应该同时读取新旧名称吗？ Expected: 过渡窗口内可以，对两者求和。之后移除旧名称，让未来的回退仍能暴露出来。
- **Level 4:** 后端会将属性映射到自己的模式，这能保护你吗？ Expected: 只有映射遵循同一规范版本时才行。按旧名称建立的映射也会显示零，所以要测试端到端路径。

## Wrong answers

- "模型不再上报用量了。" 服务商响应没变，span 输出端变了。
- "升级时后端丢失了数据。" 延迟面板证明 span 已到达。从查询角度看，只缺一个属性。
- "回滚 SDK，以后不再升级。" 锁定规范版本并配合测试，能让你有计划地升级，而非永不升级。

## Taught in

[trace 综合项目课程](../../../phases/19-capstone-projects/28-observability-otel-traces/)提醒规范曾改过属性名，并要求锁定版本，[语义规范课程](../../../phases/14-agent-engineering/23-otel-genai-conventions/)介绍稳定性选择启用配置。
