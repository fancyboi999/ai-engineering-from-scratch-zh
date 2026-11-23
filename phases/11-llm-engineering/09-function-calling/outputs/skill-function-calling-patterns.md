---
name: skill-function-calling-patterns
description: 在生产环境实现 function calling 的决策框架：工具设计、错误处理、安全与各供应商模式
version: 1.0.0
phase: 11
lesson: 09
tags: [function-calling, tool-use, agents, mcp, security, openai, anthropic]
---

# Function Calling 模式

构建使用工具的 LLM 应用时，套用下面这套决策框架。

## 什么时候用 function calling

**以下情况用 function calling：**
- 模型需要实时数据（天气、股价、数据库查询）
- 任务需要产生副作用（发邮件、建记录、部署代码）
- 模型必须根据用户意图在多个动作中做选择
- 你在构建一个与外部系统交互的 agent

**以下情况改用结构化输出：**
- 你需要从文本中提取数据（不需要外部调用）
- 输出就是最终产品，而不是中间步骤
- 你只有一个 schema，没有多个工具可选

**以下情况两者都用：**
- 模型先调用工具，再把工具结果整理成特定输出格式

## 工具设计准则

1. **一个工具，一个动作。** 一个叫 `manage_database`、同时负责查询、插入、更新和删除的工具范围太大。拆成 `query_records`、`insert_record`、`update_record`。工具越具体，模型选得越准。

2. **description 就是 prompt。** 模型读工具描述来决定选哪个。像给初级开发者写说明那样写，写清工具返回什么，而不只是它做什么。

3. **用 enum 做约束。** 如果参数有 3-10 个合法值，就用 enum。不加约束，模型会自己编字符串："celsius"、"Celsius"、"C"、"metric"。

4. **工具越少越好。** GPT-4o 能很好地处理 5-10 个工具。到 20+ 个时，选择准确率下降。到 50+ 个时，预计有 10-15% 会选错工具。把相关功能归组，或加一层路由。

5. **必填就是必填。** 只有工具离了它就真的无法工作时，才把参数标为 required。带合理默认值的可选参数能减少工具调用失败。

## 各供应商模式

### OpenAI（GPT-4o、o3、GPT-4o-mini）

```python
tools=[{"type": "function", "function": {"name": ..., "parameters": ...}}]
tool_choice="auto"       # 由模型决定
tool_choice="required"   # 至少调用一个工具
tool_choice={"type": "function", "function": {"name": "specific_tool"}}
```

- 支持并行工具调用（一次响应里有多个 `tool_calls`）
- 回传结果时必须带上工具调用 ID
- `gpt-4o-mini` 便宜 10 倍，简单的工具路由也处理得很好
- Structured outputs 模式可用于工具参数，保证符合 schema

### Anthropic（Claude 3.5 Sonnet、Claude 4 Opus）

```python
tools=[{"name": ..., "description": ..., "input_schema": ...}]
tool_choice={"type": "auto"}     # 由模型决定
tool_choice={"type": "any"}      # 至少调用一个工具
tool_choice={"type": "tool", "name": "specific_tool"}
```

- 工具调用以 `type: "tool_use"` 的内容块形式出现
- 结果放在 user 消息里，类型为 `type: "tool_result"`
- 字段名是 `input_schema`，不是 `parameters`（迁移时常见 bug）
- 支持一次响应中多个工具调用

### Google（Gemini 2.0 Flash、Gemini 2.0 Pro）

```python
function_declarations=[{"name": ..., "description": ..., "parameters": ...}]
function_calling_config={"mode": "AUTO"}   # 或 "ANY"、"NONE"
```

- 在顶层使用 `function_declarations`
- 结果通过 `function_response` part 返回
- 支持并行函数调用

### 开源模型（Llama 3、Hermes、Qwen）

- 没有统一格式，因模型和推理服务框架而异
- Hermes 格式（NousResearch）是最常见的微调约定
- vLLM 为支持的模型提供兼容 OpenAI 的工具调用
- Ollama 在兼容模型上支持基础的工具调用
- 上生产前先测工具选择准确率：在 Berkeley Function Calling Leaderboard 上，开源模型比 GPT-4o 低 15-30%

## 错误处理模式

### 返回结构化错误

```json
{"error": true, "message": "City 'Toky' not found. Did you mean 'Tokyo'?", "code": "NOT_FOUND", "suggestions": ["Tokyo"]}
```

包含可以据此行动的信息。"Not found" 不好，"Not found, did you mean X?" 才好。模型会利用错误信息自我纠正。

### 重试策略

1. 工具调用因可纠正的错误失败（拼写错误、enum 值不对）
2. 把错误作为工具结果发回给模型
3. 模型调整后重试
4. 每个工具调用最多重试 3 次
5. 失败 3 次后，把错误返回给用户

### 超时处理

所有工具执行都要设超时。30 秒是合理的默认值。工具超时时，返回结构化的超时错误，让模型能告知用户，而不是一直挂着。

## 安全检查清单

| 检查项 | 原因 | 做法 |
|-------|-----|-----|
| 函数白名单 | 防止任意代码执行 | 只注册用户需要的工具 |
| 校验参数类型 | 防止类型混淆攻击 | 执行前检查类型 |
| 清洗字符串参数 | 防止注入 | 拒绝或转义特殊字符 |
| 数据库查询参数化 | 防止 SQL 注入 | 绝不直接执行模型生成的 SQL |
| 过滤工具结果 | 防止数据泄露 | 去掉 API key、PII、内部错误 |
| 工具调用限流 | 防止失控循环 | 每次对话最多 10-20 次调用 |
| 记录所有工具调用 | 审计追踪 | 存下工具名、参数、结果、时间戳 |
| 阻止路径穿越 | 防止访问文件系统 | 文件类工具拒绝 `..` 和绝对路径 |
| 代码执行沙箱化 | 防止访问系统 | 使用容器或受限的 builtins |
| 校验返回大小 | 防止上下文被塞爆 | 超过 10KB 的结果要截断 |

## 性能优化

- **并行调用：** 模型请求多个相互独立的工具时，用 `asyncio.gather()` 或 `concurrent.futures` 并发执行
- **缓存：** 同一会话内参数相同的工具结果直接缓存（天气 60 秒内不会变）
- **流式输出：** 在获取工具结果的同时流式输出模型的最终回答
- **工具裁剪：** 上下文紧张时，只带与当前查询相关的工具定义（用分类器过滤）
- **用小模型做路由：** 用 `gpt-4o-mini` 或 `claude-haiku-4-5` 选工具，再把结果交给更强的模型做综合

## 常见失败模式

| 失败 | 原因 | 修复 |
|---------|-------|-----|
| 选错工具 | 描述有歧义 | 用具体的触发词重写描述 |
| 缺少必填参数 | 模型漏了某个参数 | 在参数描述里加上清晰的示例 |
| 工具调用死循环 | 模型反复调用同一个工具 | 设置最大迭代次数（5-10），并检测重复调用 |
| 幻觉参数 | 模型编出看似合理但错误的值 | 用 enum，按已知值校验 |
| 工具结果太大 | API 返回了 100KB 数据 | 回传前截断或摘要 |
| 模型无视工具结果 | 结果格式让人困惑 | 返回字段名清晰的干净 JSON |
