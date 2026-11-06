---
id: prompts-in-span-attributes
title: 完整 prompt 应该放在 span 上吗
card: production-mlops
kind: tradeoff
level: 2
roles: [ai-evaluation-reliability-engineer, inference-engineer, ai-data-engineer]
rounds: [system-design, design-review]
tags: [tracing, pii, content-capture, genai-conventions]
minutes: 8
lessons: [phases/14-agent-engineering/23-otel-genai-conventions, phases/13-tools-and-protocols/20-opentelemetry-genai]
manuals: []
practice: []
cheatsheet: [genai-observability]
related: [production-mlops/read-this-span, production-mlops/renamed-token-attribute]
updated: 2026-11-03
---

trace 后端可以在每次模型调用的 span 上存储完整 prompt 和补全文本。支持团队希望开启，因为他们靠 trace 排查工单。安全团队希望关闭。你怎么决定，又如何满足支持团队的需求？

## Short answer

保持内容捕获关闭，这也是规范推荐的默认设置。将 prompt 和补全文本放在自己的存储中，设置访问控制和保留期限，在 span 上记录引用 ID。支持团队从 trace 沿 ID 找到内容，trace 后端不保存客户数据。

## Full answer

### 默认设置

span 默认携带耗时和指标，不携带 prompt 或补全文本。内容捕获需通过稳定性选择启用变量及独立的内容变量显式开启。开启后，内容会写入 `gen_ai.input.messages`、`gen_ai.output.messages` 和 `gen_ai.system_instructions`，或 span 的内容事件。

### 开启后有什么问题

prompt 包含个人数据、机密和客户文档。运维人员会查看 trace，trace 后端也有自己的保留期限。规范课程把“在 span 中捕获完整 prompt”列为这一模式的首个失败场景。trace 后端还因集中保存所有信息而成为有吸引力的攻击目标。

### 可行的模式

将内容存放在 trace 以外的日志或对象存储中，使用自己的访问控制、审计日志和保留期限。在 span 上放引用 ID。课程称之为外部引用模式，它也能防御内容投毒，因为投毒文本不会进入遥测存储。

### 支持团队能得到什么

排查路径相同，只多一步：trace、span、引用 ID、内容存储。存储可在写入时按已知模式脱敏，并记录每次读取。大多数工单根本不需要内容，因为 span 已显示模型、token 数、延迟、工具调用和状态。

### 付出的代价

无法在 trace UI 中一键查看 prompt。与 trace 后端存满客户数据相比，这点代价很小。

## Follow-ups

- **Level 2:** 开启捕获时，哪些 span 可以携带原始内容？ Expected: 生产环境中一个也不可以。统一只放引用，让人不必逐个 span 决定。
- **Level 3:** 开发者在预发环境开启一天的内容捕获，有什么风险？ Expected: 预发经常回放生产 prompt，后端会在整个保留期内保存它们。使用合成 prompt，或在导出前清洗。
- **Level 3:** 如何避免内容存储成为同样的泄露源？ Expected: 按角色控制访问、记录读取审计日志、设定保留期限，写入前按已知模式脱敏。

## Wrong answers

- "开启吧，trace 后端是内部的。" 内部运维人员会读取 trace，后端的保留期限也不是你的策略。
- "在 span 上保存 prompt 的哈希。" 哈希能识别重复，却没有可供支持团队阅读的内容。指向受控存储的引用 ID 能同时满足两者。
- "内容留在 span 上，用正则去掉个人数据。" 模式会漏检，span 仍是错误的存储位置，保留期限也不合适。

## Taught in

[语义规范课程](../../../phases/14-agent-engineering/23-otel-genai-conventions/)规定了显式启用规则和在 span 外存储内容的模式，[OpenTelemetry GenAI 课程](../../../phases/13-tools-and-protocols/20-opentelemetry-genai/)介绍了内容事件。
