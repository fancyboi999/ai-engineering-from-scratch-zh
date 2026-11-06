---
id: read-this-span
title: 审查新埋点分支中的一条 span
card: production-mlops
kind: code-reading
level: 3
roles: [ai-evaluation-reliability-engineer, inference-engineer, ai-data-engineer]
rounds: [coding, design-review]
tags: [opentelemetry, genai-conventions, pii, tracing]
minutes: 12
lessons: [phases/13-tools-and-protocols/20-opentelemetry-genai, phases/14-agent-engineering/23-otel-genai-conventions, phases/19-capstone-projects/28-observability-otel-traces]
manuals: []
practice: []
cheatsheet: [genai-observability]
related: [production-mlops/span-kind-client-or-internal, production-mlops/prompts-in-span-attributes]
updated: 2026-11-03
---

同事提交了一项代码审查，为 agent 添加追踪。该分支为每次模型调用输出下面的 span。批准之前，列出你发现的所有问题。

```json
{
  "traceId": "abcdefabcdefabcdefabcdefabcdefab",
  "spanId": "abcdefabcdefabcd",
  "parentSpanId": "",
  "name": "chat",
  "kind": "INTERNAL",
  "attributes": {
    "gen_ai.operation.name": "chat",
    "gen_ai.request.model": "our_smart_model",
    "gen_ai.usage.prompt_tokens": 500,
    "gen_ai.content.prompt": "You are a support agent. The customer's card number is ..."
  }
}
```

## Short answer

这个 span 将模型调用标为 INTERNAL，没有父级，并使用旧属性名记录输入 token。它缺少服务商、输出 token、响应模型和响应 ID，还把包含银行卡号的 prompt 文本写入 trace。修正类型和父级关联，使用当前属性名，补齐缺失属性，并将内容移出 span。

## Full answer

### 按损害程度排列的问题

| 代码行 | 问题 | 修正 |
|---|---|---|
| `parentSpanId: ""` | 孤立 span，后端无法显示是哪个 agent 步骤发起调用 | 从 `invoke_agent` span 传递父级上下文 |
| `kind: INTERNAL` | 模型调用跨越进程边界 | `CLIENT` |
| `gen_ai.content.prompt` | 含客户数据的 prompt 文本进入运维人员可读的存储 | 默认关闭捕获，内容放在外部存储，span 上记录引用 ID |
| `gen_ai.usage.prompt_tokens` | 属性已改名，后端读取 `gen_ai.usage.input_tokens` | 使用当前名称，并补上 `gen_ai.usage.output_tokens` |
| 缺少 `gen_ai.provider.name` | 成本和错误看板无法按服务商细分 | 每个模型 span 都设置该属性 |
| 缺少 `gen_ai.response.model` | 启用路由时，实际服务模型可能不同于请求别名 | 记录服务商返回的模型 |
| 缺少 `gen_ai.response.id` | 无法将 span 与服务商自己的日志对应 | 记录响应 ID |

### 为什么内容这一行最值得坚持修改

规范要求埋点默认不捕获输入和输出。捕获需通过环境变量显式启用；生产环境采用的模式是将内容存入自己的日志存储，在 span 上记录指针。包含银行卡号的 prompt 进入 trace 后端就是数据泄露，而保留策略还不是你选的。

### 为什么改名问题会重现

GenAI 规范仍标记为开发中，以前也改过属性名。锁定输出的规范版本，设置稳定性选择启用开关，并测试输出 span 的属性名，否则下次 SDK 升级还会重现这些问题。

## Follow-ups

- **Level 3:** 为什么空父级比错误类型更要紧？ Expected: 没有父级时 span 是孤立的，trace 不再是一棵树，你无法看出哪个步骤发起了调用。
- **Level 3:** 团队需要 prompt 文本排查故障，你提供什么方案？ Expected: 将 prompt 放在有访问控制的独立存储中，span 上放引用 ID，这是规范推荐的生产模式。
- **Level 4:** 怎样避免升级后再次出现旧属性名？ Expected: 锁定规范版本，设置稳定性选择启用变量，并添加测试，断言输出 span 的属性名。

## Wrong answers

- "有 trace ID 和模型名称就行。" 单有 trace ID 无法把 span 连到父级，只有模型名而没有服务商也无法归属。
- "prompt 留在 span 里，很有用。" prompt 会把个人数据和机密带入运维人员可读的存储。默认捕获关闭，生产环境将内容放在 span 之外。
- "两个 token 属性名是同义词。" 后端读取当前名称。旧名称被当成未知属性，token 看板就没有数据。

## Taught in

[OpenTelemetry GenAI 课程](../../../phases/13-tools-and-protocols/20-opentelemetry-genai/)列出必需属性，[语义规范课程](../../../phases/14-agent-engineering/23-otel-genai-conventions/)给出内容捕获规则，[trace 综合项目课程](../../../phases/19-capstone-projects/28-observability-otel-traces/)说明 token 属性改名。
