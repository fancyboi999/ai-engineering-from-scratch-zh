---
name: mcp-contract-reviewer
description: Review MCP tool descriptors, results, pagination, completions, and parameter-header policy before exposing tools to a model.
version: 1.0.0
phase: 13
lesson: 28
tags: [mcp, tools, json-schema, pagination, completion, security]
---

依据协议版本 `2026-07-28` 审查所提供的 MCP 工具面。

若缺失，请索取以下输入：

1. 完整的 `tools/list` 描述符页面，包括每个 `nextCursor` 字段。
2. 每个工具至少一个成功结果和一个失败结果。
3. 如果使用了 Streamable HTTP 参数头部，请提供其映射。
4. 补全引用、调用者类别和示例建议。
5. 能改变可见工具集的授权上下文。

输出一份包含以下章节的紧凑报告。

## 描述符准入

针对每个工具：

- 验证名称非空且稳定；
- 要求 `inputSchema` 为对象；
- 确认 JSON Schema 方言；省略时默认使用 2020-12；
- 存在时验证 `outputSchema`；
- 将注解列为不可信的提示，而不是策略；
- 返回 `ADMIT`、`REJECT` 或 `CONDITIONAL`，并附上一个精确原因。

拒绝一个格式错误的描述符，但不要拒绝无关的有效工具。

## 结果契约

针对每个完整结果，包括 `isError: true` 的结果：

- 要求 `resultType: complete`；
- 按类型验证每个内容块；
- 将 `structuredContent` 视为任意 JSON 值，而非仅对象；
- 存在 `outputSchema` 时，要求 `structuredContent` 存在且与其一致；
- 对结构化结果要求兼容性文本块；
- 区分资源链接与嵌入式资源；
- 说明大小和媒体类型限制。

将格式错误的请求归类为 JSON-RPC 错误。将可处理的执行失败归类为带有 `isError: true` 的完整结果，且不得绕过已发布的输出契约。

## 参数头部

针对每个 `x-mcp-header`：

- 要求有效、非空的 HTTP field-name token；
- 要求忽略大小写后唯一；
- 要求类型为 string、integer 或 boolean；
- 遍历完整输入 schema，包括嵌套属性、组合器、数组元素和由 `$ref` 使用的定义；
- 只允许注解位于 `inputSchema.properties` 的直接成员上，并拒绝在其他位置或 `outputSchema` 中发现的每个注解；
- 拒绝 `number` 以及范围不在 `-9007199254740991` 至 `9007199254740991` 内的 integer 值；
- 按部署策略拒绝 credential、token、secret、password、authorization 和 PII 字段；
- 仅在值为非空可见 ASCII 且不以 `=?base64?` 开头时明文传输；
- 否则，严格发出 `=?base64?{Base64UTF8}?=`，不裁剪或规范化原始值；
- 对 Unicode、空值、空白、控制字符、CR 或 LF、带填充及看起来像哨兵的字符串进行编码，并将布尔值渲染为小写文本；
- 在 HTTP 边界，解码已识别的 `Mcp-Param-*` 值，忽略大小写比较头部名，并将解码值与 JSON 正文精确比较；缺失、重复、意外、格式错误或不匹配的副本都以 HTTP `400` 加 JSON-RPC `-32020` 拒绝；
- 记录最终头部名与拒绝类别，绝不记录参数值或编码载荷。

## 分页

追踪每次列表请求。只要 `nextCursor` 存在且非 null 就继续，即使它是空字符串。绝不解码、修改、递增、排序或从游标派生含义。报告重复工具、缺失页面和不稳定顺序。

## 补全

针对每个 prompt 或资源引用：

- 验证引用和参数；
- 按调用者的授权过滤建议；
- 将结果限制为最多 100 个值；
- 定义客户端防抖和服务端限流；
- 测试隐藏的租户、资源和环境名称不会泄露。

## 验证矩阵

至少返回以下检查：

| 检查 | Fixture | 预期结果 |
|------|---------|----------|
| 非对象结构化输出 | 有效的数组、标量或 null schema | 符合要求时接受 |
| 输出不匹配 | 错误的 JSON 类型或缺失属性 | 在模型使用前拒绝 |
| 错误输出不匹配 | `isError: true` 且结构化内容缺失或无效 | 在模型使用前拒绝 |
| 空游标 | `nextCursor: ""` | 后续请求发送完全相同的游标 |
| 不安全头部 | Token 或无效字段名 | 描述符被拒绝 |
| 嵌套头部注解 | `oneOf`、`items`、嵌套对象或 `$ref` 定义 | 在完整树准入期间拒绝描述符 |
| 编码的头部值 | Unicode、换行、填充或看起来像哨兵的文本 | 精确 base64 UTF-8 哨兵将原始值往返还原 |
| 整数头部值 | 两个安全边界和每边一个越界值 | 安全边界通过；不安全值被拒绝 |
| 头部与正文一致性 | 大小写变体、缺失副本和解码不匹配 | 大小写变体通过；缺失或不匹配返回 HTTP 400 和 JSON-RPC -32020 |
| 混合内容 | 文本、媒体、链接、嵌入式资源 | 每个块独立验证 |
| 补全隔离 | 低权限调用者 | 不返回特权建议 |
| 错误分层 | 未知工具和业务失败 | JSON-RPC 错误与 `isError: true` 保持区分 |

当证据只包含一次成功的工具调用时，拒绝批准。要求提供发现页面、准入决策和已验证的结果 fixture。
