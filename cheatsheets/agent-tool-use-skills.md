---
id: agent-tool-use-skills
title: agent 工具使用与技能库
code: AT
subtitle: 定义、验证、分派和保护工具调用。将技能保存为代码，检索、组合并改进它们。
hue: 160
sources: phases/14-agent-engineering/06-tool-use-and-function-calling, phases/14-agent-engineering/10-skill-libraries-voyager, phases/11-llm-engineering/09-function-calling
source_hash: a2f1468c51d65ff7
---

## 函数调用循环
type: architecture
from: phases/11-llm-engineering/09-function-calling/docs/zh.md

```arch
node | user | 1,1 | 用户 | 发送消息 | client
node | app | 2,1 | 应用 | 执行工具 | process
node | model | 3,1 | 模型 | 决定调用 | model
node | tool | 2,2 | 工具 | get_weather("Tokyo") | process
node | reg | 3,2 | 工具定义 | JSON Schema | store
edge | user | app | 消息
edge | app | model | 消息 + 工具定义
edge | model | app | tool_call
edge | app | tool | 执行
edge | tool | app | 结果
edge | reg | model | schema
```

## 工具 schema
type: annotated-code
lang: json
from: phases/11-llm-engineering/09-function-calling/docs/zh.md

```json
{"type": "function", "function": {
  "name": "get_weather",
  "description": "Get current weather for a city.",  # 用于工具选择的 prompt
  "parameters": {"type": "object",  # Anthropic: input_schema
    "properties": {"city": {"type": "string"},
      "units": {"enum": ["celsius", "fahrenheit"]}},
    "required": ["city"]}}}  # 缺少字段时返回错误观测
```

## 服务商对比
type: comparison
span: 2
from: phases/11-llm-engineering/09-function-calling/docs/zh.md, phases/14-agent-engineering/06-tool-use-and-function-calling/docs/zh.md

| 因素 | OpenAI | Anthropic | Google |
|---|---|---|---|
| 工具参数 | `tools` | `tools` | `function_declarations` |
| 调用格式 | `tool_calls[].function` | `content[].type="tool_use"` | `functionCall` |
| Schema 字段 | `function.parameters` | `input_schema` | JSON Schema |
| 强制调用 | `tool_choice="required"` | `tool_choice={"type":"any"}` | `function_calling_config` |
| 结果回传格式 | `{"role": "tool", "tool_call_id": ...}` | 用户消息中的 `type: "tool_result"` | 课程表格未列出 |

## 代码任务
type: task-table
from: phases/14-agent-engineering/06-tool-use-and-function-calling/code/main.py, phases/14-agent-engineering/10-skill-libraries-voyager/code/main.py, phases/11-llm-engineering/09-function-calling/code/function_calling.py, phases/14-agent-engineering/06-tool-use-and-function-calling/docs/zh.md, phases/14-agent-engineering/10-skill-libraries-voyager/docs/zh.md

| 任务 | 代码 |
|---|---|
| 注册工具 | `reg.register(ToolDef(...))` |
| 向模型展示目录 | `reg.catalog()` |
| 执行一轮中的调用 | `reg.dispatch_many(calls)` |
| 按 schema 检查参数 | `validate(args, schema)` |
| 运行有次数上限的循环 | `run_function_calling_loop(user_message, max_iterations=5)` |
| 为任务查找技能 | `lib.search("I need a pickaxe")` |
| 连同依赖执行技能 | `lib.execute("craft_iron_pickaxe")` |
| 运行演示 | `python3 code/main.py` |

## 返回结构化错误的注册表
type: annotated-code
lang: python
from: phases/14-agent-engineering/06-tool-use-and-function-calling/code/main.py

```python
reg = ToolRegistry()
reg.register(ToolDef(name="classify", description="<when to use>",
    input_schema={"type": "object", "required": ["status"],
        "properties": {"status": {"type": "string",
            "enum": ["open", "closed", "pending"]}}},
    executor=classify))   # timeout_s 默认为 5.0
calls = [ToolCall("u02", "multiply", {"a": "4", "b": 5}),  # "4" 会被强制转换
         ToolCall("u03", "classify", {"status": "in_progress"})]  # 不在枚举中
for result in reg.dispatch_many(calls):
    result.ok, result.content  # 错误以字符串返回，绝不抛出
```

## 技能库循环
type: annotated-code
lang: python
from: phases/14-agent-engineering/10-skill-libraries-voyager/code/main.py

```python
lib = SkillLibrary()
lib.register(Skill(name="craft_iron_pickaxe", description="<what it does>",
    code="mine_ore(); place_table(); craft('iron_pickaxe')",
    fn=_craft_iron_pick_v1, tags=("craft", "tool"),
    depends_on=("mine_ore", "place_crafting_table")))  # v1
lib.search("I need a pickaxe")           # 按 token 重合度检索，top_k=3
ctx = lib.execute("craft_iron_pickaxe")  # 按 topo_order 先执行依赖
ctx["failed"]                            # True：需要 2 根木棍，现有 0 根
lib.register(Skill(..., fn=_craft_iron_pick_v2))  # 同名技能更新为 v2
```

## Voyager 改进循环
type: flow
from: phases/14-agent-engineering/10-skill-libraries-voyager/docs/zh.md

1. **课程规划器**：提出略高于当前能力的任务。
2. **技能库**：按查询与描述的相似度返回 top-k 技能。
3. **Agent**：编写或组合可执行代码形式的技能。
4. **环境**：运行技能，返回 `success`、`error` 或 `self-verification failure`。
5. **Agent**：将反馈信号作为上下文，重写技能。
6. **技能库**：保存新版本。成功或达到最大轮数时结束循环。

## 验证失败与修正
type: troubleshooting
from: phases/14-agent-engineering/06-tool-use-and-function-calling/code/main.py, phases/14-agent-engineering/06-tool-use-and-function-calling/docs/zh.md, phases/14-agent-engineering/10-skill-libraries-voyager/docs/zh.md, phases/11-llm-engineering/09-function-calling/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `error: unknown tool 'subtract'` | 模型调用不存在的工具 | 返回错误。加入用于拒绝的不执行操作工具 |
| `missing required: <name>` | 缺少必填字段 | 回传错误，让模型重试 |
| `'in_progress' not in [...]` | 值超出枚举范围 | 返回说明性错误并拒绝 |
| 选错工具 | 工具描述不清 | 说明工具做什么及何时使用 |
| 结果路由到错误调用 | `tool_use_id` 值颠倒 | 按标识关联每个结果 |
| 检索效果下降 | 技能库超过数百项 | 加入标签过滤和硬约束 |

## 课程代码默认值
type: defaults
from: phases/14-agent-engineering/06-tool-use-and-function-calling/code/main.py, phases/14-agent-engineering/10-skill-libraries-voyager/code/main.py, phases/11-llm-engineering/09-function-calling/code/function_calling.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `timeout_s` | `5.0` | `ToolDef` 中每个工具的超时 |
| `version` | `1` | 新建 `Skill` 的版本 |
| `dedup` | `True` | 同名时改进已有技能 |
| `top_k` | `3` | 技能搜索结果数 |
| `tag_filter` | `None` | 设置后仅搜索一个标签 |
| `max_iterations` | `5` | `run_function_calling_loop` |

## 关键数字
type: concepts
from: phases/14-agent-engineering/06-tool-use-and-function-calling/docs/zh.md, phases/14-agent-engineering/10-skill-libraries-voyager/docs/zh.md, phases/11-llm-engineering/09-function-calling/docs/zh.md

- **BFCL V4**：40% agent 任务、30% 多轮、10% 在线、10% 非在线、10% 幻觉。
- **并行调用**：往返次数从 2 降至 1。
- **并行延迟**：每次查询调用 5-10 个工具时，延迟降低 60-80%。
- **调用预算**：每次对话 10-20 次调用较为合理。
- **Voyager**：独特物品数为 3.3x，石制工具获取速度为 8.5x，铁制工具为 6.4x。
- **Toolformer**：仅当工具结果降低下一 token 损失时才保留调用。

## 安全规则
type: tips
from: phases/11-llm-engineering/09-function-calling/docs/zh.md, phases/11-llm-engineering/09-function-calling/code/function_calling.py, phases/14-agent-engineering/06-tool-use-and-function-calling/docs/zh.md

- 绝不将模型生成的 SQL 直接传给数据库。使用参数化查询。
- 为函数设置允许列表。只暴露用户需要的工具。
- 验证每个参数的类型、范围与格式。
- 清理工具结果。移除 API key、个人身份信息和内部错误。
- `run_code` 用 `ast.parse` 解析代码，阻止导入和双下划线属性访问。
- 在独立进程或容器中运行不可信代码。

## 问答
type: qa
from: phases/11-llm-engineering/09-function-calling/docs/zh.md, phases/14-agent-engineering/06-tool-use-and-function-calling/docs/zh.md, phases/14-agent-engineering/10-skill-libraries-voyager/docs/zh.md

- **谁执行工具？** 你的代码。模型只决定调用什么。
- **结构化输出还是函数调用？** 数据提取用结构化输出。操作外部系统用函数调用。
- **为何将错误作为结果返回？** 模型能根据结构化错误自我修正。空白或泛化错误会使它失败。
- **什么是技能？** 一段有名字和描述的代码，可以按相似度检索。
- **为何技能要版本化？** 固定依赖 v1 的父技能不会自动使用子技能的 v3。
