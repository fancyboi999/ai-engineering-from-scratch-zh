---
name: skill-structured-outputs
description: 按供应商、可靠性和复杂度选择结构化输出策略的决策框架
version: 1.0.0
phase: 11
lesson: 03
tags: [structured-output, json, schema, constrained-decoding, pydantic, function-calling]
---

# 结构化输出策略

构建需要结构化数据的 LLM 应用时，套用下面这套决策框架。

## 各方案的适用场景

**基于 prompt（"Return JSON"）：** 只用于原型。偶尔解析失败也能接受的内部工具可以用。加上 try/except 和重试。生产流水线里绝不要用。

**JSON 模式（API 开关）：** 你需要保证 JSON 合法，但 schema 简单或比较灵活。适合在应用侧自己校验结构的情况。支持方：OpenAI、Anthropic（通过 tool use）、Google。

**Schema 模式（约束解码）：** 每条输出都必须匹配特定 schema 的生产系统。零解析失败，零 schema 违规。任何生产环境的提取或分类任务默认用它。支持方：OpenAI structured outputs、Outlines、Guidance。

**Function calling / tool use：** 模型需要选择调用哪个函数，而不只是填参数。你有多个 schema，由模型挑选合适的那个。和现有工具/函数基础设施集成时也用它。

**Instructor 库：** 你想在任何供应商上都获得 Pydantic 校验和自动重试。Python 项目里开发体验最好。它封装了 OpenAI、Anthropic、Google 和开源模型。

## 各供应商使用建议

**OpenAI：** 用 `response_format` 配合 `json_schema` 类型。内置约束解码，Pydantic 模型可以直接用。是最可靠的结构化输出实现。

**Anthropic：** 用 tool use 实现结构化输出。定义一个带目标 schema 的工具，模型返回的工具调用参数会匹配该 schema。可靠，但需要走 tool use API 的模式。

**开源模型（vLLM、Ollama）：** 用 Outlines 或 Guidance 做约束解码。这些库把 JSON Schema 编译成有限状态机，在生成时屏蔽非法 token。需要在本地跑推理。

## Schema 设计准则

1. 尽量让 schema 保持扁平。嵌套超过 2 层，提取错误会增加。
2. 分类字段用 enum。别指望模型自己编出正确的字符串。
3. 有歧义的字段设为必填并显式支持 null，而不是设为可选。这样能逼模型做出判断。
4. 给 schema 属性加 description。模型会把它们当指令读。
5. 非必要不用联合类型（oneOf/anyOf）。它们会增加解码复杂度。
6. 给数字设置 minimum/maximum，能拦住幻觉出来的极端值。
7. 给数组设置 minItems/maxItems，防止输出为空或无限增长。

## 常见失败模式与修复

- **模型把 JSON 包在 markdown 围栏里**：从基于 prompt 切换到 JSON 模式或 schema 模式
- **符合 schema 但事实错误**：提取后加一步 LLM-as-judge 校验
- **enum 值不一致**：切换到约束解码，或加后处理归一化
- **缺少可选字段**：改成必填，或在应用代码里补默认值
- **提取非常慢**：约束解码会增加 5-15% 延迟，对延迟敏感就降低 schema 复杂度
- **大数组且元素差异大**：把输入分块，逐块提取，再合并结果

## 可靠性阶梯

| 方案 | 解析成功率 | Schema 匹配率 | 搭建成本 |
|----------|-------------|-------------|-------------|
| 基于 prompt | ~90% | ~80% | 1 分钟 |
| JSON 模式 | 100% | ~90% | 5 分钟 |
| Schema 模式 | 100% | ~99% | 15 分钟 |
| 约束解码 | 100% | 100% | 30 分钟 |
| Instructor + 重试 | 100% | ~99.5% | 10 分钟 |
