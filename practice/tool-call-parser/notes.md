## 参数为何是字符串

函数调用课程展示了一家提供商将 `arguments` 作为 JSON 字符串发送，其他提供商发送对象。字符串让提供商可以逐 token 流式发送参数。代价是需要再调用一次 `json.loads`，而模型生成无效 JSON 时，此调用会失败。解析器抛出 `ValueError`，agent 就能把错误反馈给模型。

## 为何需要路径和固定顺序

工具注册表课程返回 JSON pointer 路径，因为模型处理 `/lines/1/qty: expected integer, got number` 比处理一句文字说明更快。固定错误顺序使每次运行的输出一致，便于测试比较，也让重试循环能识别模型何时没有进展。

## 布尔值陷阱

在 Python 中，`bool` 是 `int` 的子类。不单独检查时，`true` 会通过整数和数值检查。JSON Schema 区分这些类型，校验器也必须区分。

## 后续关联

注册表课程增加了 `minLength`、`maxLength` 和 `pattern`，并建议下一步支持 `$ref`。MCP 课程在服务端运行工具前，也用同类 schema 校验工具输入。
