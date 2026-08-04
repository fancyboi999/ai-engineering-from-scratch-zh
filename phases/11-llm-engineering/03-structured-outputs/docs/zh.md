# 结构化输出：JSON、Schema 校验、约束解码

> 你的 LLM 返回一个字符串。你的应用需要 JSON。这道鸿沟搞崩的生产系统，比任何模型幻觉都多。结构化输出是自然语言和有类型数据之间的桥梁。做对了，你的 LLM 就成了一个可靠的 API。做错了，你就得在凌晨三点用正则去解析自由文本。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 10，第 01-05 课（从零构建 LLM）
**预计时间：** ~90 分钟
**相关：** 阶段 5 · 20（结构化输出与约束解码）讲解码器层面的理论（FSM/CFG logit 处理器、Outlines、XGrammar）。本课聚焦生产 SDK 这一层（OpenAI `response_format`、Anthropic tool use、Instructor）——如果你想搞懂 API 之下发生了什么，先读阶段 5 · 20。

## 学习目标

- 用 OpenAI 和 Anthropic 的 API 参数实现 JSON 模式和 schema 约束的输出
- 构建一个 Pydantic 校验层，拒绝畸形的 LLM 输出，并带着错误反馈重试
- 解释约束解码如何在 token 层面强制产出合法 JSON，无需后处理
- 设计稳健的抽取 prompt，可靠地把非结构化文本转成有类型的数据结构

## 问题背景

你问一个 LLM："从这段文本里抽取产品名、价格和库存状态。"它回复：

```
The product is the Sony WH-1000XM5 headphones, which cost $348.00 and are currently in stock.
```

这是一个完全正确的答案。它对你的应用也完全没用。你的库存系统需要的是 `{"product": "Sony WH-1000XM5", "price": 348.00, "in_stock": true}`。你需要一个有特定 key、特定类型、特定取值约束的 JSON 对象。你不需要一句话。

幼稚的解法：在 prompt 里加一句"用 JSON 回答"。这有 90% 的时候管用。剩下 10% 里，模型会把 JSON 裹进 markdown 代码围栏，或者加一句"Here's the JSON:"开场白，或者因为提前收了个括号而产出语法非法的 JSON。你的 JSON 解析器崩了。你的流水线断了。你加上 try/except 和重试循环。重试有时产出不一样的数据。现在你在解析问题之上又多了一个一致性问题。

这不是 prompt engineering 的问题，是解码的问题。模型从左到右生成 token。在每个位置，它从 10 万多个选项的词表里挑最可能的下一个 token。在任意给定位置，这些选项里大部分都会产出非法 JSON。如果模型刚刚吐出 `{"price":`，下一个 token 必须是数字、引号（字符串用）、`null`、`true`、`false` 或负号。其他任何东西都会产出非法 JSON。没有约束，模型可能挑一个语义上完全合理、但语法上灾难性错误的英文单词。

## 核心概念

### 结构化输出的光谱

结构化输出的控制有四个层级，一个比一个可靠。

```mermaid
graph LR
    subgraph Spectrum["结构化输出光谱"]
        direction LR
        A["基于 prompt\n'返回 JSON'\n~90% 合法"] --> B["JSON 模式\n保证合法 JSON\n不保证 schema"]
        B --> C["Schema 模式\nJSON + 匹配 schema\n保证合规"]
        C --> D["受限解码\nToken 级别强制\n100% 合规"]
    end

    style A fill:#1a1a2e,stroke:#ff6b6b,color:#fff
    style B fill:#1a1a2e,stroke:#ffa500,color:#fff
    style C fill:#1a1a2e,stroke:#51cf66,color:#fff
    style D fill:#1a1a2e,stroke:#0f3460,color:#fff
```

**基于 prompt**（"用合法 JSON 回答"）：没有强制。模型通常会照做，但有时不会。可靠性：约 90%。失败方式：markdown 围栏、开场白文字、输出被截断、结构错误。

**JSON 模式**：API 保证输出是合法 JSON。OpenAI 的 `response_format: { type: "json_object" }` 开启这个。输出能无错解析。但它不一定匹配你期望的 schema——多余的 key、错误的类型、缺失的字段。

**Schema 模式**：API 接收一个 JSON Schema，并保证输出与之匹配。到 2026 年，每家主流 provider 都原生支持这个：OpenAI 的 `response_format: { type: "json_schema", json_schema: {...} }`（也可以用 `tool_choice="required"`）、Anthropic 带 `input_schema` 的 tool use，以及 Gemini 的 `response_schema` + `response_mime_type: "application/json"`。输出会有你指定的确切 key、类型和约束。

**约束解码**：生成过程中的每个 token 位置，解码器把所有会产出非法输出的 token 都屏蔽掉。如果 schema 要求一个数字，而模型正要吐出一个字母，那个 token 的概率就被置零。模型只能产出通向合法输出的 token。这正是 OpenAI 的结构化输出模式，以及 Outlines、Guidance 这类库底层所实现的东西。

### JSON Schema：契约语言

JSON Schema 是你告诉模型（或校验层）输出必须是什么形状的方式。每个主流的结构化输出系统都用它。

```json
{
  "type": "object",
  "properties": {
    "product": { "type": "string" },
    "price": { "type": "number", "minimum": 0 },
    "in_stock": { "type": "boolean" },
    "categories": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["product", "price", "in_stock"]
}
```

这个 schema 说：输出必须是一个对象，含一个字符串 `product`、一个非负数 `price`、一个布尔 `in_stock`，以及一个可选的字符串数组 `categories`。任何不匹配的输出都会被拒绝。

Schema 能搞定那些棘手的情况：嵌套对象、带类型元素的数组、enum（把字符串约束到特定取值）、模式匹配（对字符串做正则），以及组合子（oneOf、anyOf、allOf，用于多态输出）。

### Pydantic 模式

在 Python 里，你不用手写 JSON Schema。你定义一个 Pydantic 模型，它替你生成 schema。

```python
from pydantic import BaseModel

class Product(BaseModel):
    product: str
    price: float
    in_stock: bool
    categories: list[str] = []
```

这产出的 JSON Schema 和上面那个一样。Instructor 库（以及 OpenAI 的 SDK）直接接受 Pydantic 模型：传进模型类，拿回一个已校验的实例。如果 LLM 输出不匹配，Instructor 会自动重试。

### Function Calling / Tool Use

针对同一个问题的另一种接口。你不再让模型直接产出 JSON，而是定义带类型参数的"工具"（函数）。模型输出一个带结构化参数的函数调用。OpenAI 管这叫"function calling"，Anthropic 管这叫"tool use"。结果一样：结构化数据。

```mermaid
graph TD
    subgraph ToolUse["Tool Use 流程"]
        U["用户：从这条评论中\n提取产品信息"] --> M["模型处理输入"]
        M --> TC["工具调用：\nextract_product(\n  product='Sony WH-1000XM5',\n  price=348.00,\n  in_stock=true\n)"]
        TC --> V["根据函数 schema\n校验"]
        V --> R["结构化结果：\n{product, price, in_stock}"]
    end

    style U fill:#1a1a2e,stroke:#0f3460,color:#fff
    style TC fill:#1a1a2e,stroke:#e94560,color:#fff
    style V fill:#1a1a2e,stroke:#ffa500,color:#fff
    style R fill:#1a1a2e,stroke:#51cf66,color:#fff
```

当模型需要选择调用哪个函数、而不只是填参数时，tool use 是首选。如果你有 10 个不同的抽取 schema，模型必须根据输入挑对的那个，tool use 同时给你 schema 选择和结构化输出。

### 常见失败方式

即便有了 schema 强制，结构化输出也可能以微妙的方式失败。

**幻觉值**：输出匹配 schema，但含有编造的数据。文本说 $348，模型却产出 `{"price": 299.99}`。Schema 校验抓不住这个——类型对，值错。

**Enum 混淆**：你把一个字段约束到 `["in_stock", "out_of_stock", "preorder"]`。模型输出 `"available"`——语义上对，但不在允许集合里。好的约束解码能挡住这个，基于 prompt 的方法不能。

**嵌套对象深度**：深度嵌套的 schema（4 层以上）会产出更多错误。每多一层嵌套，就多一个模型可能跟丢结构的地方。

**数组长度**：模型可能在数组里产出过多或过少的元素。Schema 支持 `minItems` 和 `maxItems`，但并非所有 provider 都在解码层面强制它们。

**遗漏可选字段**：模型遗漏那些技术上可选、但对你的用例语义重要的字段。即便数据有时缺失，也把它们在 schema 里设为必填——逼模型显式产出 `null`。

```figure
mx-schema-funnel
```

## 动手构建

### 第 1 步：JSON Schema 校验器

从零构建一个校验器，检查一个 Python 对象是否匹配某个 JSON Schema。这就是在输出侧运行、用来核验合规性的东西。

```python
import json

def validate_schema(data, schema):
    errors = []
    _validate(data, schema, "", errors)
    return errors

def _validate(data, schema, path, errors):
    schema_type = schema.get("type")

    if schema_type == "object":
        if not isinstance(data, dict):
            errors.append(f"{path}: expected object, got {type(data).__name__}")
            return
        for key in schema.get("required", []):
            if key not in data:
                errors.append(f"{path}.{key}: required field missing")
        properties = schema.get("properties", {})
        for key, value in data.items():
            if key in properties:
                _validate(value, properties[key], f"{path}.{key}", errors)

    elif schema_type == "array":
        if not isinstance(data, list):
            errors.append(f"{path}: expected array, got {type(data).__name__}")
            return
        min_items = schema.get("minItems", 0)
        max_items = schema.get("maxItems", float("inf"))
        if len(data) < min_items:
            errors.append(f"{path}: array has {len(data)} items, minimum is {min_items}")
        if len(data) > max_items:
            errors.append(f"{path}: array has {len(data)} items, maximum is {max_items}")
        items_schema = schema.get("items", {})
        for i, item in enumerate(data):
            _validate(item, items_schema, f"{path}[{i}]", errors)

    elif schema_type == "string":
        if not isinstance(data, str):
            errors.append(f"{path}: expected string, got {type(data).__name__}")
            return
        enum_values = schema.get("enum")
        if enum_values and data not in enum_values:
            errors.append(f"{path}: '{data}' not in allowed values {enum_values}")

    elif schema_type == "number":
        if not isinstance(data, (int, float)):
            errors.append(f"{path}: expected number, got {type(data).__name__}")
            return
        minimum = schema.get("minimum")
        maximum = schema.get("maximum")
        if minimum is not None and data < minimum:
            errors.append(f"{path}: {data} is less than minimum {minimum}")
        if maximum is not None and data > maximum:
            errors.append(f"{path}: {data} is greater than maximum {maximum}")

    elif schema_type == "boolean":
        if not isinstance(data, bool):
            errors.append(f"{path}: expected boolean, got {type(data).__name__}")

    elif schema_type == "integer":
        if not isinstance(data, int) or isinstance(data, bool):
            errors.append(f"{path}: expected integer, got {type(data).__name__}")
```

### 第 2 步：Pydantic 风格的模型转 schema

构建一个极简的类转 schema 转换器。定义一个 Python 类，自动生成它的 JSON Schema。

```python
class SchemaField:
    def __init__(self, field_type, required=True, default=None, enum=None, minimum=None, maximum=None):
        self.field_type = field_type
        self.required = required
        self.default = default
        self.enum = enum
        self.minimum = minimum
        self.maximum = maximum

def python_type_to_schema(field):
    type_map = {
        str: "string",
        int: "integer",
        float: "number",
        bool: "boolean",
    }

    schema = {}

    if field.field_type in type_map:
        schema["type"] = type_map[field.field_type]
    elif field.field_type == list:
        schema["type"] = "array"
        schema["items"] = {"type": "string"}
    elif isinstance(field.field_type, dict):
        schema = field.field_type

    if field.enum:
        schema["enum"] = field.enum
    if field.minimum is not None:
        schema["minimum"] = field.minimum
    if field.maximum is not None:
        schema["maximum"] = field.maximum

    return schema

def model_to_schema(name, fields):
    properties = {}
    required = []

    for field_name, field in fields.items():
        properties[field_name] = python_type_to_schema(field)
        if field.required:
            required.append(field_name)

    return {
        "type": "object",
        "properties": properties,
        "required": required,
    }
```

### 第 3 步：约束 token 过滤器

模拟约束解码。给定一个不完整的 JSON 字符串和一个 schema，判断当前位置哪些 token 类别是合法的。

```python
def next_valid_tokens(partial_json, schema):
    stripped = partial_json.strip()

    if not stripped:
        return ["{"]

    try:
        json.loads(stripped)
        return ["<EOS>"]
    except json.JSONDecodeError:
        pass

    last_char = stripped[-1] if stripped else ""

    if last_char == "{":
        return ['"', "}"]
    elif last_char == '"':
        if stripped.endswith('":'):
            return ['"', "0-9", "true", "false", "null", "[", "{"]
        return ["a-z", '"']
    elif last_char == ":":
        return [" ", '"', "0-9", "true", "false", "null", "[", "{"]
    elif last_char == ",":
        return [" ", '"', "{", "["]
    elif last_char in "0123456789":
        return ["0-9", ".", ",", "}", "]"]
    elif last_char == "}":
        return [",", "}", "]", "<EOS>"]
    elif last_char == "]":
        return [",", "}", "<EOS>"]
    elif last_char == "[":
        return ['"', "0-9", "true", "false", "null", "{", "[", "]"]
    else:
        return ["any"]

def demonstrate_constrained_decoding():
    partial_states = [
        '',
        '{',
        '{"product"',
        '{"product":',
        '{"product": "Sony"',
        '{"product": "Sony",',
        '{"product": "Sony", "price":',
        '{"product": "Sony", "price": 348',
        '{"product": "Sony", "price": 348}',
    ]

    print(f"{'Partial JSON':<45} {'Valid Next Tokens'}")
    print("-" * 80)
    for state in partial_states:
        valid = next_valid_tokens(state, {})
        display = state if state else "(empty)"
        print(f"{display:<45} {valid}")
```

### 第 4 步：抽取流水线

把一切组合成一条抽取流水线：定义一个 schema，模拟 LLM 产出结构化输出，校验输出，并处理重试。

```python
def simulate_llm_extraction(text, schema, attempt=0):
    if "headphones" in text.lower() or "sony" in text.lower():
        if attempt == 0:
            return '{"product": "Sony WH-1000XM5", "price": 348.00, "in_stock": true, "categories": ["audio", "headphones"]}'
        return '{"product": "Sony WH-1000XM5", "price": 348.00, "in_stock": true}'

    if "laptop" in text.lower():
        return '{"product": "MacBook Pro 16", "price": 2499.00, "in_stock": false, "categories": ["computers"]}'

    return '{"product": "Unknown", "price": 0, "in_stock": false}'

def extract_with_retry(text, schema, max_retries=3):
    for attempt in range(max_retries):
        raw = simulate_llm_extraction(text, schema, attempt)

        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            print(f"  Attempt {attempt + 1}: JSON parse error -- {e}")
            continue

        errors = validate_schema(data, schema)
        if not errors:
            return data

        print(f"  Attempt {attempt + 1}: Schema validation errors -- {errors}")

    return None

product_schema = {
    "type": "object",
    "properties": {
        "product": {"type": "string"},
        "price": {"type": "number", "minimum": 0},
        "in_stock": {"type": "boolean"},
        "categories": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["product", "price", "in_stock"],
}
```

### 第 5 步：运行完整流水线

```python
def run_demo():
    print("=" * 60)
    print("  Structured Output Pipeline Demo")
    print("=" * 60)

    print("\n--- Schema Definition ---")
    product_fields = {
        "product": SchemaField(str),
        "price": SchemaField(float, minimum=0),
        "in_stock": SchemaField(bool),
        "categories": SchemaField(list, required=False),
    }
    generated_schema = model_to_schema("Product", product_fields)
    print(json.dumps(generated_schema, indent=2))

    print("\n--- Schema Validation ---")
    test_cases = [
        ({"product": "Test", "price": 10.0, "in_stock": True}, "Valid object"),
        ({"product": "Test", "price": -5.0, "in_stock": True}, "Negative price"),
        ({"product": "Test", "in_stock": True}, "Missing price"),
        ({"product": "Test", "price": "ten", "in_stock": True}, "String as price"),
        ("not an object", "String instead of object"),
    ]

    for data, label in test_cases:
        errors = validate_schema(data, product_schema)
        status = "PASS" if not errors else f"FAIL: {errors}"
        print(f"  {label}: {status}")

    print("\n--- Constrained Decoding Simulation ---")
    demonstrate_constrained_decoding()

    print("\n--- Extraction Pipeline ---")
    texts = [
        "The Sony WH-1000XM5 headphones are priced at $348 and currently available.",
        "The new MacBook Pro 16-inch laptop costs $2499 but is sold out.",
        "This is a random sentence with no product info.",
    ]

    for text in texts:
        print(f"\n  Input: {text[:60]}...")
        result = extract_with_retry(text, product_schema)
        if result:
            print(f"  Output: {json.dumps(result)}")
        else:
            print(f"  Output: FAILED after retries")
```

## 实际使用

### OpenAI 结构化输出

```python
# from openai import OpenAI
# from pydantic import BaseModel
#
# client = OpenAI()
#
# class Product(BaseModel):
#     product: str
#     price: float
#     in_stock: bool
#
# response = client.beta.chat.completions.parse(
#     model="gpt-5-mini",
#     messages=[
#         {"role": "system", "content": "Extract product information."},
#         {"role": "user", "content": "Sony WH-1000XM5, $348, in stock"},
#     ],
#     response_format=Product,
# )
#
# product = response.choices[0].message.parsed
# print(product.product, product.price, product.in_stock)
```

OpenAI 的结构化输出模式内部用的是约束解码。模型生成的每个 token 都保证产出匹配 Pydantic schema 的输出。不用重试，不用校验。约束被烤进了解码过程里。

### Anthropic Tool Use

```python
# import anthropic
#
# client = anthropic.Anthropic()
#
# response = client.messages.create(
#     model="claude-opus-4-7",
#     max_tokens=1024,
#     tools=[{
#         "name": "extract_product",
#         "description": "Extract product information from text",
#         "input_schema": {
#             "type": "object",
#             "properties": {
#                 "product": {"type": "string"},
#                 "price": {"type": "number"},
#                 "in_stock": {"type": "boolean"},
#             },
#             "required": ["product", "price", "in_stock"],
#         },
#     }],
#     messages=[{"role": "user", "content": "Extract: Sony WH-1000XM5, $348, in stock"}],
# )
```

Anthropic 通过 tool use 来实现结构化输出。模型吐出一个带结构化参数的 tool call，参数匹配 input_schema。结果一样，API 这层不一样。

### Instructor 库

```python
# pip install instructor
# import instructor
# from openai import OpenAI
# from pydantic import BaseModel
#
# client = instructor.from_openai(OpenAI())
#
# class Product(BaseModel):
#     product: str
#     price: float
#     in_stock: bool
#
# product = client.chat.completions.create(
#     model="gpt-5-mini",
#     response_model=Product,
#     messages=[{"role": "user", "content": "Sony WH-1000XM5, $348, in stock"}],
# )
```

Instructor 包裹任意 LLM 客户端，并加上带校验的自动重试。如果第一次尝试没通过校验，它会把错误作为上下文发回给模型，让它修正输出。这适用于任何 provider，不只是 OpenAI。

## 拿去用

本节课产出 `outputs/prompt-structured-extractor.md`——一个可复用的 prompt 模板，给定一份 schema 定义，就能从任意文本里抽取结构化数据。喂给它一个 JSON Schema 和非结构化文本，它返回已校验的 JSON。

它还产出 `outputs/skill-structured-outputs.md`——一套决策框架，根据你的 provider、可靠性要求和 schema 复杂度来挑选正确的结构化输出策略。

## 练习

1. 扩展 schema 校验器以支持 `oneOf`（数据必须恰好匹配几个 schema 中的一个）。这处理多态输出——例如，一个既可以是 `Product` 也可以是形状不同的 `Service` 对象的字段。

2. 做一个"schema diff"工具，对比两个 schema，识别破坏性改动（删了必填字段、改了类型）与非破坏性改动（加了可选字段、放松了约束）。这对在生产中给你的抽取 schema 做版本管理至关重要。

3. 实现一个更真实的约束解码模拟器。给定一个 JSON Schema 和一个 100 个 token 的词表（字母、数字、标点、关键字），逐步走一遍生成过程，在每个位置屏蔽非法 token。测量每一步词表里有多大比例是合法的。

4. 做一个抽取评测套件。创建 50 条产品描述，配上手工标注的 JSON 输出。在全部 50 条上跑你的抽取流水线，测量精确匹配、字段级准确率和类型合规性。找出哪些字段最难正确抽取。

5. 给你的抽取流水线加上"置信度分数"。对每个抽取出的字段，估计模型有多确信（基于 token 概率，或者把抽取跑 3 次再测一致性）。把低置信度字段标记出来交人工复核。

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|----------------------|
| JSON 模式 | "返回 JSON" | 一个 API 标志，保证输出是语法合法的 JSON，但不强制任何特定 schema |
| 结构化输出 | "有类型的 JSON" | 匹配特定 JSON Schema、有正确 key、类型和约束的输出 |
| 约束解码 | "引导式生成" | 在每个 token 位置屏蔽掉会产出非法输出的 token——保证 100% 的 schema 合规 |
| JSON Schema | "一个 JSON 模板" | 一种声明式语言，描述 JSON 数据的结构、类型和约束（OpenAPI、JSON Forms 等都用它） |
| Pydantic | "增强版 Python dataclass" | 一个用类型校验来定义数据模型的 Python 库，FastAPI 和 Instructor 用它来生成 JSON Schema |
| Function calling | "Tool use" | LLM 输出一个结构化的函数调用（名称 + 有类型的参数），而不是自由文本——OpenAI 和 Anthropic 都支持 |
| Instructor | "给 LLM 用的 Pydantic" | 一个包裹 LLM 客户端、返回已校验 Pydantic 实例的 Python 库，校验失败时自动重试 |
| Token 屏蔽 | "过滤词表" | 在生成时把特定 token 的概率置零，使模型无法产出它们 |
| Schema 合规 | "匹配形状" | 输出有每个必填字段、正确的类型、在约束内的取值，且没有多余的不允许字段 |
| 重试循环 | "重试到成功为止" | 把校验错误发回给模型让它修正输出——Instructor 会自动做这件事，最多到一个可配置的上限 |

## 延伸阅读

- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)——OpenAI API 里基于 JSON Schema 的约束解码官方文档
- [Willard & Louf, 2023 -- "Efficient Guided Generation for Large Language Models"](https://arxiv.org/abs/2307.09702)——Outlines 论文，讲如何把 JSON Schema 编译成有限状态机来做 token 级约束
- [Instructor documentation](https://python.useinstructor.com/)——从任意 LLM 拿结构化输出的标准库，带 Pydantic 校验和重试
- [Anthropic Tool Use Guide](https://docs.anthropic.com/en/docs/tool-use)——Claude 如何通过带 JSON Schema input_schema 的 tool use 实现结构化输出
- [JSON Schema specification](https://json-schema.org/)——每个主流结构化输出系统都在用的 schema 语言完整规范
- [Outlines library](https://github.com/outlines-dev/outlines)——开源的约束生成，用正则和编译成有限状态机的 JSON Schema
- [Dong et al., "XGrammar: Flexible and Efficient Structured Generation Engine for Large Language Models" (MLSys 2025)](https://arxiv.org/abs/2411.15100)——当前最先进的语法引擎；下推自动机编译，以约 100 ns/token 的速度屏蔽 token。
- [Beurer-Kellner et al., "Prompting Is Programming: A Query Language for Large Language Models" (LMQL)](https://arxiv.org/abs/2212.06094)——LMQL 论文，把约束解码刻画成一种带类型和取值约束的查询语言。
- [Microsoft Guidance (framework docs)](https://github.com/guidance-ai/guidance)——模板驱动的约束生成；与 Outlines 和 XGrammar 互补、与厂商无关。
