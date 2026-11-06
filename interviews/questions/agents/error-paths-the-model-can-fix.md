---
id: error-paths-the-model-can-fix
title: 阅读注册表：模型在错误调用时收到什么
card: agents
kind: code-reading
level: 2
roles: [agentic-ai-engineer, ai-developer-relations-engineer]
rounds: [coding, screen]
tags: [tool-registry, json-schema, validation, json-pointer, self-correction]
minutes: 10
lessons: [phases/19-capstone-projects/21-tool-registry-schema-validation]
manuals: []
practice: [tool-call-parser]
cheatsheet: [tool-calling]
related: [agents/five-parts-of-an-agent-loop]
updated: 2026-11-03
---

一个工具使用下方 Schema 完成注册，模型发送了以下四组参数。针对每一组参数，说明注册表返回什么内容，以及返回结果的格式为什么对模型至关重要。

```python
registry.register(
    name="db.get_user",
    schema={
        "type": "object",
        "required": ["id"],
        "properties": {
            "id": {"type": "integer"},
            "fields": {"type": "array", "items": {"type": "string", "enum": ["id", "name", "email"]}},
        },
    },
    handler=get_user,
)
cases = [
    {"id": 42, "fields": ["id", "name"]},
    {"id": "forty-two"},
    {"fields": ["id"]},
    {"id": 1, "fields": ["id", "phone"]},
]
```

## Short answer

第一组用例通过校验并返回 Ok 结果。第二组在 `/id` 处返回一条关键字为 `type` 的错误，因为字符串不是整数且校验器从不做类型强制转换。第三组在 `/id` 处返回一条关键字为 `required` 的错误，因为缺少必填属性。第四组在 `/fields/1` 处返回一条关键字为 `enum` 的错误，因为 `phone` 不是允许的枚举值，路径精确指向该元素，使模型在下一次调用中能够准确修正该值。

## Full answer

### 遍历过程

校验器按 `type` 分发。针对对象类型，它首先检查 `required`，然后遍历每个定义了 Schema 的属性。针对数组类型，它使用 `items` Schema 遍历每个元素，并将索引追加到路径末尾。一旦发生类型不匹配，校验器会立即停止继续遍历该节点并报告错误，因此错误的类型不会在其下方引发一连串层叠嵌套错误。

| 用例 | 结果 | 路径 | 关键字 |
|---|---|---|---|
| `{"id": 42, "fields": ["id", "name"]}` | `Ok` | | |
| `{"id": "forty-two"}` | 1 条错误 | `/id` | `type` |
| `{"fields": ["id"]}` | 1 条错误 | `/id` | `required` |
| `{"id": 1, "fields": ["id", "phone"]}` | 1 条错误 | `/fields/1` | `enum` |

### 为什么路径是指向结果的关键

相比普通句子，模型更容易理解指针。一条指出邮箱字段需要字符串并附带路径 `/user/email` 的错误，仅需一次往返就能被纠正。而一条仅说明参数非法的纯文本消息则需要花费整整一轮去猜测。路径遵循 JSON Pointer 规范：斜杠分隔的属性名与数组索引，段内的 `~` 和 `/` 均经过转义。

### 校验器拒绝做的事

- 它不做类型强制转换。字符串 `"42"` 在整数或数值 Schema 下直接失败。一旦模型发现字符串也能被接受，它就会在所有地方发送字符串。
- 它不调用处理函数。Schema 是数据，处理函数是代码，将两者混杂会把校验逻辑分散塞入各个处理函数中并导致漂移。
- 它不是安全边界。即使校验通过，处理函数依然可能产生异常行为。超时控制与沙箱化应当由分发器负责，注册表只负责形态校验。

### 注册规范

除非调用方显式传入 `override=True`，否则 `register` 会直接拒绝已存在于表中的同名工具。代码库的不同部分注册同一个名称属于严重 bug，在生产环境中往往需要耗费一周才能排查出来，因此默认行为是抛出异常。

## Follow-ups

- **Level 2:** 模型发送了 `{"id": true}`，会发生什么？ Expected: 在 `/id` 处返回类型错误，因为即使底层语言可能接受，校验器也判定布尔值不是整数。
- **Level 2:** 为什么类型不匹配时会停止遍历该节点？ Expected: 当父节点类型错误时子节点毫无意义，一个清晰的错误远胜过同一失误引发的错误列表。
- **Level 3:** Schema 中使用了 `oneOf`，`register` 会怎么处理？ Expected: 它会抛出异常，因为注册表仅支持八个关键字，在注册时会直接拒绝子集之外的任何内容。
- **Level 3:** 当工具目录超过五十个且 Schema 开始重复时，最先添加哪两项扩展？ Expected: 针对本地定义块的 `$ref` 支持，以及用于强制严格形态的 `additionalProperties: false`。

## Wrong answers

- "返回一条参数非法的通用消息，让模型自己重试。" 缺少路径的重试纯粹是瞎猜，而精确路径能让模型一次往返就纠正调用。
- "将字符串强制转换为数字，因为意图很明确。" 强制转换会让模型认为 Schema 只是建议，下一次调用就会在没有转换逻辑的地方发送字符串。
- "校验能保证工具可以安全调用。" 校验仅检查数据形态，处理函数依然可能行为异常，超时与沙箱应当由分发器提供保障。

## Taught in

[带 Schema 校验的工具注册表](../../../phases/19-capstone-projects/21-tool-registry-schema-validation/)课程构建了注册表、八关键字校验器以及指针路径。
