agent 将工具 schema 发给模型，再接收工具调用。回复中的参数可能类型错误、缺少字段或包含多余键。运行工具前，agent 必须解析每次调用并校验参数。精确的错误路径可以让模型在下一轮修正调用。

## 任务

编写三个函数。只用标准库中的 `json` 模块。

1. `parse_tool_calls(reply_text)` 解析聊天补全回复的原始 JSON 正文。调用位于 `body["choices"][0]["message"]["tool_calls"]`。每次调用含有 `id` 和 `function`，后者含有 `name`、`arguments` 字段。`arguments` 是 JSON 字符串，不是对象。按回复顺序为每次调用返回一个字典 `{"id": ..., "name": ..., "arguments": ...}`，其中 `arguments` 为解码后的字典。
   - 若 `tool_calls` 缺失或为 `null`，返回 `[]`。
   - 若 `arguments` 为空字符串或仅有空白，参数为 `{}`。
   - 若 `arguments` 不是有效 JSON，或解码结果不是 JSON 对象，抛出 `ValueError`。
2. `validate_args(schema, args)` 根据 JSON Schema 的一个子集检查值，并返回错误字符串列表。空列表表示有效。
3. `check_reply(reply_text, schemas)` 解析回复，按回复顺序为每次调用返回一对 `(id, errors)`。`schemas` 将工具名称映射到 schema。若名称不在 `schemas` 中，错误为 `["/: unknown tool <name>"]`。

schema 子集包含这些关键字：`type`、`properties`、`required`、`enum`、`additionalProperties` 和 `items`。类型为 `object`、`array`、`string`、`integer`、`number`、`boolean` 或 `null`。Python 值对应的 JSON 类型如下：

| Python 值 | JSON 类型 |
|---|---|
| `None` | `null` |
| `True`, `False` | `boolean` |
| `int` | `integer` |
| `float` | `number` |
| `str` | `string` |
| `list` | `array` |
| `dict` | `object` |

类型 `integer` 只匹配 JSON 类型 `integer`，因此不匹配 `1.0`。类型 `number` 匹配 `integer` 和 `number`。布尔值不能匹配 `integer` 或 `number`。

按以下顺序检查路径处的一个值：

1. 若 schema 有 `type` 且值不匹配，添加 `<path>: expected <type>, got <json type>`。立即停止，不检查子项。
2. 若 schema 有 `enum` 且值不在列表中（按 Python `==` 判断），添加 `<path>: value <json.dumps(value)> is not in <json.dumps(enum)>`。立即停止。
3. 若类型为 `object`：
   1. 按列表顺序遍历 `required` 中的名称。若名称不是该值的键，添加 `<path>/<name>: missing required property`。
   2. 再按输入顺序遍历该值的键：若键在 `properties` 中，检查 `<path>/<key>` 处的子值。否则，若 `additionalProperties` 为 `false`，添加 `<path>/<key>: unexpected property`。没有 `additionalProperties: false` 时，允许多余键。
4. 若类型为 `array` 且 schema 有 `items`，按索引顺序检查 `<path>/<index>` 处的每个元素。

路径是 JSON pointer。根值的路径为 `/`。子路径由父路径、斜杠和路径段组成。根路径 `/` 下键为 `city` 的子项路径为 `/city`。在每个路径段中，先将 `~` 替换为 `~0`，再将 `/` 替换为 `~1`。

## 输入和输出

| 名称 | 类型 | 含义 |
|---|---|---|
| `reply_text` | `str` | 一次回复的原始 JSON 正文 |
| `schema` | `dict` | 属于上述子集的 schema |
| `args` | 任意 JSON 值 | 要检查的值，通常为字典 |
| `schemas` | `dict` | 工具名称到 schema 的映射 |

- `parse_tool_calls` 返回由 `dict` 组成的 `list`。
- `validate_args` 返回由 `str` 组成的 `list`。
- `check_reply` 返回由 `(str, list of str)` 元组组成的 `list`。

## 约束

- schema 最多嵌套 5 层。
- 不得修改 schema 或参数。
- 只用标准库。

## 示例

```python
REPLY = '{"choices": [{"message": {"role": "assistant", "content": null, "tool_calls": [{"id": "call_abc123", "type": "function", "function": {"name": "get_weather", "arguments": "{\\"city\\":\\"Bengaluru\\",\\"units\\":\\"celsius\\"}"}}, {"id": "call_def456", "type": "function", "function": {"name": "get_weather", "arguments": "{\\"city\\":42,\\"units\\":\\"kelvin\\",\\"days\\":3}"}}]}, "finish_reason": "tool_calls"}]}'
WEATHER = {
    "type": "object",
    "properties": {
        "city": {"type": "string"},
        "units": {"type": "string", "enum": ["celsius", "fahrenheit"]},
    },
    "required": ["city", "units"],
    "additionalProperties": False,
}
parse_tool_calls(REPLY)
```

```text
[{'id': 'call_abc123', 'name': 'get_weather', 'arguments': {'city': 'Bengaluru', 'units': 'celsius'}}, {'id': 'call_def456', 'name': 'get_weather', 'arguments': {'city': 42, 'units': 'kelvin', 'days': 3}}]
```

```python
check_reply(REPLY, {"get_weather": WEATHER})
```

```text
[('call_abc123', []), ('call_def456', ['/city: expected string, got integer', '/units: value "kelvin" is not in ["celsius", "fahrenheit"]', '/days: unexpected property'])]
```

```python
USER = {
    "type": "object",
    "required": ["id", "tags"],
    "properties": {
        "id": {"type": "integer"},
        "tags": {"type": "array", "items": {"type": "string", "enum": ["a", "b"]}},
        "score": {"type": "number"},
        "active": {"type": "boolean"},
    },
    "additionalProperties": False,
}
validate_args(USER, {"id": True, "tags": ["a", "c", 3], "score": 1, "extra/x": 1, "active": 1})
```

```text
['/id: expected integer, got boolean', '/tags/1: value "c" is not in ["a", "b"]', '/tags/2: expected string, got integer', '/extra~1x: unexpected property', '/active: expected boolean, got integer']
```
