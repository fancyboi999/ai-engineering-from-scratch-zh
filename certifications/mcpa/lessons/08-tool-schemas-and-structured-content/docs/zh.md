# 工具定义中的契约

> inputSchema 不是模型可以大致模仿的建议：服务端会在 handler 运行前验证参数，而错误参数仍会作为模型能够读取和修正的结果返回。

**类型：** Reference
**语言：** Python
**前置要求：** 第 07 课
**预计时间：** 约 45 分钟

## 学习目标

- 说出工具定义中除 name 和 description 外的字段，包括 outputSchema、icons 和 annotations，并说明 inputSchema 绝不能是什么
- 解释为什么 inputSchema 和 outputSchema 默认使用 JSON Schema 2020-12、schema 何时显式声明其他方言，以及 SEP-2106 放宽了 schema 可用关键字的哪些限制
- 追踪 structuredContent 如何符合 outputSchema，并解释为什么服务端还会把相同值序列化到 text 内容块中
- 说明工具命名规则，以及聚合多个服务端的 host 为什么要给名称加前缀，而不是相信 serverInfo 能保证唯一性
- 区分未知工具（协议错误）与不符合 schema 的参数（`isError: true` 的工具执行错误），并解释为何只有后者能可靠进入模型上下文

## 问题背景

第 07 课的发现步骤让客户端取得工具列表，每个工具都有模型可读的名称和描述。但描述是散文，程序无法用它检查参数对象。“按 SKU 查询产品”能告诉读者工具做什么，却没有说明字段拼作 sku 还是 productId、类型是字符串还是整数，也没有定义调用完全遗漏该字段时会怎样。

工具定义用第二个、更严格的部分弥合了这一差距：inputSchema。它是客户端和服务端都能以相同方式读取的 JSON Schema 对象，不是放在代码旁边的文档。参数对象必须符合该形状，handler 才能运行；符合规范的服务端会在每次调用时检查，无论客户端声称自己多么谨慎地构造了参数。

正确执行这项检查还有第二个原因，也是考试非常重视的内容。Schema 违规和凭空编造的工具名，远看都像“调用失败”，但 MCP 2026-07-28 在线协议上以完全不同的方式处理二者。混淆两者是实现中最常见的错误之一。本课要纠正一个看似自然却错误的直觉：并非所有无效的 tools/call 都应返回 JSON-RPC 错误。

## 核心概念

工具定义不只有 name、description 和 inputSchema。完整字段包括：name；用于显示的可选 title；description；可选 icons；必需的 inputSchema；可选 outputSchema；可选 annotations（例如 readOnlyHint 和 destructiveHint，这些提示在服务端本身不可信时也不可信，阅读完整 manifest 的课程会深入讲解）；以及可选 _meta。其中只有一条硬规则贯穿始终：inputSchema 必须是有效的 JSON Schema 对象，绝不能为 null。对于没有参数的工具，推荐使用 `{"type": "object", "additionalProperties": false}`，它只接受空对象；单独使用 `{"type": "object"}` 仍会接受带有无人要求属性的对象。

inputSchema 和 outputSchema 都是 JSON Schema。Schema 没有 $schema 字段时，默认采用 JSON Schema 2020-12。Schema 也可以显式声明其他方言：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {"a": {"type": "number"}},
  "required": ["a"]
}
```

SEP-2106 之前，inputSchema 仅限使用 type、properties 和 required，导致 oneOf 等组合关键字无法使用。SEP-2106 之后，inputSchema 仍保留 `type: object`（参数始终是对象），但可以使用其他任意 2020-12 关键字；outputSchema 则可以是任意有效 JSON Schema，不要求 `type: object`，因为工具输出可以是对象、数组或原始值：

```json
{
  "type": "object",
  "oneOf": [
    {"properties": {"id": {"type": "string"}}, "required": ["id"]},
    {"properties": {"name": {"type": "string"}}, "required": ["name"]}
  ]
}
```

Schema 能携带任意 JSON Schema 后，需要遵守两项约束。第一，如果 `$ref` 解析为网络 URI，即绝对 https 地址，而不是 `#/$defs/Sku` 这类同文档指针，则绝不能自动解引用。天真地获取遇到的每个 `$ref`，等于允许攻击者迫使服务端向任意主机发请求。实现可以提供主动开启的获取模式，但默认必须关闭，并设置 allowlist 和资源边界。第二，应限制组合关键字（anyOf、oneOf、allOf、if/then/else）和 `$defs`，可以限制深度、子 schema 数量或验证时间，避免恶意 schema 把验证本身变成拒绝服务攻击。

outputSchema 与 structuredContent 配合使用。structuredContent 可以是任意 JSON 值，不限于对象；只要 outputSchema 允许，记录数组或单独数字都合法。存在 outputSchema 时，服务端必须返回符合它的 structuredContent。为了兼容只读取 text 的客户端，服务端还应把相同值序列化到 text 内容块中：

```json
{
  "content": [{"type": "text", "text": "{\"sku\": \"SKU-100\", \"priceUsd\": 24.99}"}],
  "structuredContent": {"sku": "SKU-100", "priceUsd": 24.99}
}
```

名称也有规则：长度为 1 到 128 个字符，区分大小写，只能包含字母、数字、下划线、连字符和点，并且在单个服务端内唯一。Host 聚合多个服务端的工具时，`search` 这类名称仍可能冲突。因此，它会给名称添加服务端标识符前缀，而不是依赖 `serverInfo.name`；规范明确不保证后者唯一。

现在来纠正常见误区。当参数不符合 inputSchema——缺少必填字段、类型错误、值不在 enum 中、出现 schema 禁止的额外属性——它属于工具执行错误：返回一个普通结果，其中 `isError: true`，content 说明如何修复。它不是 JSON-RPC 错误，尤其不是 -32602。协议错误才使用 -32602，例如服务端从未公布过的工具名，或请求本身不符合 CallToolRequest schema。这类问题无法靠模型改进参数修复。实现不断把 schema 失败报告为协议错误后，SEP-1303 明确规定了这项区分：客户端只会可靠地把工具执行错误展示给模型；若把验证失败藏进协议错误，模型就无法得知原因，只会重复犯错。

```figure
mcpa-08-schema-contract
```

## 交互实验

图的左侧放置一个工具的 inputSchema 和 outputSchema，旁边是 validate 步骤：验证要么放行调用进入 handler，要么将其退回。沿两条结果路径观察：schema 失败会生成 `isError: true` 的结果，虚线路径从未到达 handler；验证通过则运行 handler，并生成 structuredContent 及其 text 镜像。右侧是另一条完全独立的路径：服务端从未公布过的名称直接进入协议错误 `-32602`，因为不存在可供检查的工具 schema。打开 `code/main.py` 并运行，然后将每条打印响应对应回产生它的路径。

```bash
python3 code/main.py
```

按顺序阅读交互记录：先是一次有效的 `lookup_product` 调用；接着以四种方式违反其 schema（缺少 sku、region 使用 enum 外的值、sku 类型错误，以及携带 schema 禁止的额外属性）；然后正确调用无参数的 `server_time` 工具，再带着它不接受的属性调用一次；最后调用服务端从未注册的工具。所有 schema 失败都作为 `isError: true` 的 content 返回。只有最后一个未知名称会作为 JSON-RPC 错误返回。

## 实践实验

在 `code/main.py` 的 `build_catalog_server` 中添加第三个工具 `list_regions`。其 outputSchema 应描述根节点为字符串数组，而不是对象，以符合 SEP-2106 对数组和原始值 structuredContent 的支持。使用推荐的无参数形式定义空 inputSchema，并让 handler 返回普通 Python 列表。使用 `validate_arguments` 确认返回数组针对新 schema 不存在必填字段或类型错误（本课验证器会检查 type、properties、required、enum 和 additionalProperties；生产 JSON Schema 库会在此基础上支持完整 2020-12 词汇）。然后尝试注册一个工具，其 inputSchema 含有指向其他网络主机的 `$ref`，与 `attempt_network_ref_registration` 中已被拒绝的地址不同；确认注册同样会在任何调用运行前被拒绝。

## 交付产物

`outputs/tool-schema-reference.md` 是一页式参考资料，包含工具定义的全部字段、JSON Schema 方言与 `$ref` 规则、outputSchema 与 structuredContent 契约、工具命名规则，以及用具体示例对照两种错误通道的表格。查看陌生服务端的 `tools/list` 结果时，可以把它放在旁边，快速判断准备发送的调用能否通过。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试会核对本课中的论断：有效参数产生 structuredContent，而且它本身通过 outputSchema 验证；缺少必填字段、类型错误、enum 违规和禁止的额外属性都返回 `isError: true`，而不是 JSON-RPC 错误；无参数 schema 接受空对象，但拒绝带额外属性的对象；未知工具名返回协议错误而非 isError；注册时拒绝网络 `$ref`；工具命名规则正确接受和拒绝相应名称。仓库的线协议检查器还会按照 2026-07-28 规则验证课程交互记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/08-tool-schemas-and-structured-content
```

## 综合项目关联

综合项目审查会要求你为生态中的每个工具辩护。“schema 会拦住它”只有在 schema 足够精确，而且服务端真正将违规作为工具执行错误处理时才成立；若将其变成客户端可能不向模型展示的协议错误，这句话就是空谈。如果综合项目中的工具接受用户塑造的输入，或引用共享 schema 片段，请重新检查命名规则和 `$ref` 拒绝策略；每当你决定 handler 如何报告内部发现的问题时，也要重新审视双通道错误划分。

## 关键术语

| 术语 | 含义 |
|------|------|
| inputSchema | 工具定义中必需的 JSON Schema 对象；有效参数对象必须符合它 |
| outputSchema | structuredContent 必须符合的可选 JSON Schema 对象 |
| structuredContent | 工具结果返回的任意 JSON 值；存在 outputSchema 时按其验证 |
| additionalProperties | Schema 关键字；设为 false 时拒绝带有未声明属性的参数对象 |
| $ref | 可指向其他位置的 schema 关键字；目标为网络 URI 时绝不能自动解引用 |
| 工具执行错误 | `isError: true` 的普通结果，用于报告 schema 失败等模型可读取并修正的问题 |
| 协议错误 | `-32602` 等 JSON-RPC 错误，用于报告模型无法通过调整参数修复的问题，例如未知工具名 |
| 工具命名规则 | 长度 1 到 128 个字符，区分大小写，仅限字母、数字、下划线、连字符和点，在服务端内唯一 |

## 延伸阅读

- [MCP 2026-07-28 规范：Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)：本课所述字段、schema 规则和错误处理的规范文本
- [MCP 2026-07-28 规范：JSON Schema Usage](https://modelcontextprotocol.io/specification/2026-07-28/basic/index#json-schema-usage)：方言与 `$ref` 解析规则
- [SEP-2106：tools inputSchema 和 outputSchema 遵循 JSON Schema 2020-12](https://modelcontextprotocol.io/seps/2106-json-schema-2020-12)
- [SEP-1303：将输入验证错误作为工具执行错误](https://modelcontextprotocol.io/seps/1303-input-validation-errors-as-tool-execution-errors)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 5、10 节
- `phases/13-tools-and-protocols/05-tool-schema-design`：面向模型选择的命名与参数设计
- `phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content`：JSON Schema 运行时边界与内容块
