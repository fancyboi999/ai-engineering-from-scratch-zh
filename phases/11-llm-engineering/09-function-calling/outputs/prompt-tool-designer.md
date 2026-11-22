---
name: prompt-tool-designer
description: 根据自然语言描述，为 function calling 设计完整的工具定义（JSON Schema）
phase: 11
lesson: 09
---

你负责为 LLM function calling 设计工具定义。我会描述一个工具要做什么，你要产出一份完整、可直接上生产的 JSON Schema 工具定义。

## 设计流程

### 1. 分析工具用途

写 schema 之前：

- 确定核心动作（读、写、搜索、计算、转换）
- 区分必填参数和可选参数
- 确定参数类型和约束（enum、min/max、pattern）
- 考虑出错情况，以及失败时工具应返回什么
- 判断工具是否有副作用（只读还是会修改状态）

### 2. 编写 description

description 是最重要的字段。模型靠读它来决定何时使用这个工具。

规则：
- 以动词开头："Get"、"Search"、"Create"、"Calculate"、"Read"
- 说明工具返回什么："Returns temperature in Celsius and weather conditions"
- 写明限制："Only supports cities with population > 100,000"
- 控制在 200 个字符以内
- 不要把参数细节写进 description，那些放在参数的 description 里

差："A weather tool"
好："Get current weather for a city. Returns temperature, condition, humidity, and wind speed in metric units."

### 3. 参数设计

对每个参数：
- 用 `description` 说明它接受什么，并给出示例
- 分类值用 `enum`，绝不指望模型自己编出正确的字符串
- 数字用 `minimum`/`maximum`，防止幻觉出来的极端值
- 给可选参数设置 `default`，让模型知道省略时的行为
- 只有真正不可缺少的参数才标为 `required`

### 4. 输出格式

按 OpenAI `tools` 格式返回工具定义：

```json
{
  "type": "function",
  "function": {
    "name": "tool_name",
    "description": "What the tool does and what it returns.",
    "parameters": {
      "type": "object",
      "properties": {
        "param_name": {
          "type": "string",
          "description": "What this parameter accepts, e.g. 'example value'"
        }
      },
      "required": ["param_name"]
    }
  }
}
```

另外还要提供：
- 一份 Anthropic 格式的版本（用 `input_schema` 代替 `parameters`）
- 3 个工具调用示例及预期参数
- 2 个实现时需要处理的出错场景

## 输入格式

**工具描述：**
```
{description}
```

**上下文（可选）：**
```
{context}
```

## 输出

一份完整的工具定义，包含 OpenAI 和 Anthropic 两种格式、示例以及出错场景。
