# MCP 工具契约与内容

> 只有发现、参数、结果、分页和传输元数据共用同一份契约，工具自动化才是安全的。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 13，第 07、09 和 10 课
**预计时间：** 约 120 分钟

## 学习目标

- 使用 JSON Schema 2020-12 定义工具输入和输出。
- 验证结构化结果，而不预设它们一定是 JSON 对象。
- 在文本、图像、音频、资源链接和嵌入式资源之间作出选择。
- 在工具暴露给模型前拒绝不安全的 `x-mcp-header` 定义。
- 编码参数头部值，并验证头部与正文完全一致。
- 遍历游标分页，而不解读游标值。
- 限制并授权 `completion/complete` 建议。

## 问题背景

调用一个 Python 函数很容易。通过 AI host 调用远程能力则是一个契约问题。

服务器发布描述符。客户端将描述符转换为模型上下文和用户界面。模型生成参数。网关可能根据镜像的头部路由请求。服务器执行工具。随后，客户端决定结果是否足够安全、有效，可以返回给模型。

任何一个薄弱边界都会破坏整条链路。

来看五种失败：

- 描述符说结果是对象，但服务器返回了数组。
- 当 `nextCursor` 为空字符串时，客户端停止分页。
- token 参数被镜像到 HTTP 头部，对中间方可见。
- Unicode 路由值作为原始头部发送，网关与源站解读出不同的字节。
- 补全端点向无权访问的调用者建议生产环境。

这些失败都不能靠更好的 prompt 修复。它们需要明确的协议和应用契约。

## 契约流水线

将每次工具调用视为五道关卡：

1. **发现。** 读取确定性的分页工具列表。
2. **准入。** 验证每个描述符并应用本地安全策略。
3. **调用。** 验证参数并构建传输元数据。
4. **执行。** 运行处理器并正确分类失败。
5. **消费。** 在模型使用前验证内容块和结构化输出。

```figure
mcp-contract-pipeline
```

主机拥有准入和消费这两道关卡。服务器不能强迫客户端信任其注解、schema 或输出。

## JSON Schema 是运行时边界

在 MCP `2026-07-28` 中，`inputSchema` 和 `outputSchema` 使用 JSON Schema。缺少 `$schema` 时，默认方言为 2020-12。

输入 schema 必须是 schema 对象。没有参数的工具也应准确说明它接受什么：

```json
{
  "type": "object",
  "additionalProperties": false
}
```

这比 `{ "type": "object" }` 更严格，后者接受任意属性。

输出 schema 是可选的。服务器一旦发布它，每个完整工具结果都承诺返回符合该 schema 的 `structuredContent`，包括 `isError: true` 的结果。错误标志用于分类执行结果；它并不会豁免已发布的输出契约。客户端应验证结果，而不是信任描述符。

### 结构化内容可以是任意 JSON 值

不要将 `structuredContent` 硬编码为字典。它可以是：

- 对象；
- 数组；
- 字符串；
- 数字；
- 布尔值；
- `null`。

该工具返回一个数组：

```json
{
  "name": "tag_catalog",
  "inputSchema": {
    "type": "object",
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "array",
    "items": {"type": "string"}
  }
}
```

它成功返回的结果有效：

```json
{
  "resultType": "complete",
  "content": [
    {
      "type": "text",
      "text": "[\"contracts\", \"mcp\", \"stateless\"]"
    }
  ],
  "structuredContent": ["contracts", "mcp", "stateless"],
  "isError": false
}
```

为兼容起见，结构化结果还应在文本块中包含序列化后的 JSON。文本不是验证来源，`structuredContent` 才是。

### 小型验证器仍能说明边界

本课刻意使用 JSON Schema 的一个子集，因为这样可以完全使用 Python 标准库。它检查示例工具所用的机制：

- object、array、string、integer、number、boolean 和 null 类型；
- 必填属性；
- `additionalProperties: false`；
- 数组元素；
- 枚举值；
- 最小字符串长度。

这不能替代完整的生产验证器。可复用的经验在于验证发生的位置：描述符在发现后验证，参数在执行前验证，结构化结果在消费前验证。

## 内容块有不同的成本

`content` 数组可以组合多种内容类型。

| 类型 | 适用场景 | 主要边界 |
|------|----------|----------|
| `text` | 人类和模型可读的摘要 | 将文本视为不可信输出 |
| `image` | 以 base64 编码的视觉证据 | 验证媒体类型和大小 |
| `audio` | 以 base64 编码的口述或录音输出 | 验证媒体类型和时长限制 |
| `resource_link` | 客户端稍后可获取的 URI | 稍后读取资源时重新授权 |
| `resource` | 直接嵌入结果的数据 | 现在就强制执行载荷和内容限制 |

资源链接并不能证明该资源出现在 `resources/list` 中。它只是本次工具调用返回的引用。客户端在跟随该 URI 时仍要应用其资源策略。

嵌入式资源省去一次往返，但会增加当前响应的大小。对于体积大或会独立变化的产物，请使用链接。对于必须与结果原子传输的小型证据，请使用嵌入式资源。

本课的 `evidence_bundle` 结果包含全部五种类型。客户端在接受结果前验证每个块。

## `x-mcp-header` 是路由元数据

`inputSchema` 内的一个属性可以声明 `x-mcp-header`。在 Streamable HTTP 上，客户端会将该参数镜像到 `Mcp-Param-{name}`。

```json
{
  "region": {
    "type": "string",
    "x-mcp-header": "Region"
  }
}
```

当 `region: "eu-west"` 时，传输层可以发送：

```http
Mcp-Param-Region: eu-west
```

该注解的存在，是为了让负载均衡器、网关或策略引擎无需解析 JSON 正文也能路由。它不是放置凭据的地方。

协议限制此注解：

- 头部名非空，并遵循 HTTP field-name 的 token 语法；
- 头部名忽略大小写后必须唯一；
- 属性类型为 string、integer 或 boolean；
- 不允许 `number`；
- 注解只能出现于 `inputSchema.properties` 的直接成员上；
- integer 值必须处于 `-9007199254740991` 至 `9007199254740991` 之间。

位置规则是语法性的，并采用失败即拒绝的策略。要遍历整个 schema 树，而不能只看验证器恰好能理解的属性。应拒绝嵌套对象的 `properties`、`oneOf` 分支、`items`、经 `$ref` 到达的定义，或任何输出 schema 下的注解。解析引用不会让被引用节点变成直接的顶层属性。

本课增加了一项部署策略：拒绝镜像名为 `password`、`secret`、`token`、`api_key` 或 `authorization` 等字段的描述符。官方规范建议服务器作者不要镜像敏感参数。客户端可以将这项建议变成强制准入规则。

审计头部名，而不是其值。示例代码记录 `Mcp-Param-Region`，同时不让 `eu-west` 进入审计事件。

### 构建 HTTP 头部前先编码值

参数值只有同时满足以下条件时才可以作为纯文本传输：它是由 `!` 到 `~` 的可见 ASCII 字符组成的非空字符串，且不像编码哨兵。其他所有情况都使用以下精确形式：

```text
=?base64?{Base64UTF8}?=
```

`Base64UTF8` 是对精确 UTF-8 字节使用标准 base64 得到的结果。不要先裁剪、规范化或替换该值。应编码 Unicode、空字符串、空格、制表符、控制字符、CR 或 LF、前导或尾随空白，以及所有以 `=?base64?` 开头的值。再次编码看起来像哨兵的值，才能让接收方还原文字原样，而不是把它解码为传输语法。

布尔值渲染为小写 `true` 或 `false`。整数以十进制渲染，并且必须处在 JavaScript 安全整数范围内。范围外的值应被拒绝，而不是让中间方四舍五入。

### 服务器检查镜像副本

生成头部只是客户端的一半工作。在 Streamable HTTP 边界，服务器必须：

1. 忽略头部名大小写，找到已识别的 `Mcp-Param-*` 名称；
2. 存在时解码精确的 base64 哨兵形式；
3. 将解码文本与相应 JSON 正文参数逐字比较；
4. 在分派前拒绝缺失、重复、意外、格式错误或不匹配的已识别头部。

拒绝时返回 HTTP `400`，并使用 JSON-RPC 错误码 `-32020`。正文值及其编码后的头部形式都不应进入审计记录。只记录已识别头部名和拒绝类别。

`code/main.py` 直接建模了这个边界。[第 09 课](../../09-mcp-transports/) 介绍了更广泛的 Streamable HTTP 验证顺序，包括方法与协议版本的一致性。

## 分页游标是不透明的

MCP 列表操作使用游标分页。服务器选择页面大小和游标格式。客户端只需作出一个判断：

```python
if result.get("nextCursor") is None:
    break
cursor = result["nextCursor"]
```

不要这样写：

```python
if not result.get("nextCursor"):
    break
```

空字符串是有效游标。按真值判断会过早停止。

客户端不得解码游标、递增游标、与之前的游标比较以确定顺序，或推断页码。服务器可以对游标进行签名、将其绑定到目录版本，或将其映射到私有状态。这是服务器的实现细节。

示例服务器刻意在第一页后返回 `""`。客户端必须在第二个请求中发送完全相同的值。其轨迹为：

```text
<first request with no cursor>
<second request with cursor "">
```

无效游标会产生 JSON-RPC 无效参数错误，代码为 `-32602`。

## 补全是授权面

`completion/complete` 为 prompt 参数和资源模板参数提供建议。它适用于交互式表单，但也可能泄露常规列表方法会保护的名称。

补全请求会指定一个引用和正在补全的参数：

```json
{
  "method": "completion/complete",
  "params": {
    "ref": {
      "type": "ref/prompt",
      "name": "deployment_review"
    },
    "argument": {
      "name": "environment",
      "value": "st"
    }
  }
}
```

结果最多返回 100 个值，也可能报告 `total` 和 `hasMore`。

应用与所引用 prompt 或资源相同的授权边界。示例中的分析师得到 `development` 和 `staging`。只有操作员能得到 `production`。

生产级补全还需要：

- 输入验证；
- 感知调用者的过滤；
- 客户端请求防抖；
- 服务端限流；
- 有界的结果数量；
- 不暴露敏感建议值的日志。

补全是辅助，不是绕过发现的通道。

## 两层错误

将协议错误与工具执行错误分开。

当 MCP 请求无法正确分派时，使用 JSON-RPC 错误：

- 未知工具名；
- 格式错误的请求形状；
- 缺少请求元数据；
- 无效游标。

当调用已到达工具、工具报告可处理的失败时，使用带有 `isError: true` 的完整工具结果：

- 报告数据源不可用；
- 日期超出支持范围；
- 业务规则拒绝请求的操作。

模型通常可以修复工具执行错误。它们无法修复违反自身输出 schema 的服务器。

若工具声明了输出 schema，就在该 schema 内建模可处理的失败。示例 `route_report` 失败会返回其请求的区域和 `accepted: false`，以及人类可读的错误文本和 `isError: true`。

## 动手构建

`code/main.py` 使用 Python 标准库构建边界的两侧。

服务器实现：

- 每个请求的 MCP 元数据验证；
- 具备工具和补全能力的 `server/discover`；
- 确定性的 `tools/list` 分页；
- 四个工具描述符，其中一个必须被拒绝；
- 数组结构化输出；
- 当前所有工具内容块类型；
- 一个 Streamable HTTP 一致性关卡，它会解码已识别参数头部，并在不匹配时返回 HTTP `400` 加 JSON-RPC `-32020`；
- 经授权且限流的补全。

客户端实现：

- 描述符准入；
- 全树 `x-mcp-header` 位置验证和敏感字段策略；
- 精确的纯可见 ASCII 或 base64 UTF-8 值编码；
- 跟随空字符串的不透明游标循环；
- 参数和结果验证；
- 内容块验证；
- 只包含名称、不包含值的头部审计事件。

刻意不安全的描述符是教学数据。它证明一个被拒绝的工具不会阻止有效工具加载。

## 实际使用

从仓库根目录执行：

```bash
cd phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content/code
python3 main.py
python3 -m unittest discover tests -v
```

演示会打印获准的工具、被拒绝的描述符、两次分页请求、结构化数组内容、内容块类型、镜像头部名、值是否需要编码、HTTP 一致性状态，以及按调用者过滤的补全值。

## 交互实验

打开 `code/main.py` 并找到 `TOOLS`。

1. 将 `tag_catalog.outputSchema.type` 从 `array` 改为 `object`。
2. 运行演示。客户端应拒绝返回的数组。
3. 恢复 schema。
4. 保持第一页的 `nextCursor` 为 `""`，然后让最终页返回 `nextCursor: None`，而不是省略该字段。
5. 运行测试并比较游标轨迹。
6. 为一个字符串属性添加 `x-mcp-header: "Authorization"`。
7. 确认描述符准入会在调用前拒绝它。
8. 尝试包含 Unicode、换行、前后空格及文本 `=?base64?SGVsbG8=?=` 的 `region` 值。解码每个发送的头部，并证明原始值被精确保留。
9. 将该注解移至 `oneOf`、`items` 或 `$ref` 定义下。确认每个描述符都会被拒绝，即使演示从未使用该分支。
10. 移除已识别头部或改变其解码后的值。确认 HTTP 边界返回状态 `400` 和 JSON-RPC 代码 `-32020`。

重点不是记住某种 JSON 形状，而是观察每道关卡在自己负责的边界失败。

## 实践实验

使用一个 `search_evidence` 工具扩展契约实验。

要求：

1. 其输入 schema 接受 `query`、`limit` 和安全的 `region` 路由字段。
2. 其输出 schema 是一个对象数组，每个对象包含 `uri`、`title` 和 `score`。
3. 结果包含兼容性文本，并为每个条目提供资源链接。
4. 参数拒绝未知属性。
5. `limit` 受应用验证约束。
6. 无权访问某个 URI 的调用者，绝不会通过补全或工具输出看到该 URI。
7. 测试包含不符合要求的 score、无效头部注解和两页列表。
8. 头部值测试覆盖可见 ASCII、Unicode、控制字符、空白、看起来像哨兵的文本，以及 JavaScript 安全整数的两个边界。
9. HTTP fixture 接受大小写不敏感的头部名，但会以状态 `400` 和代码 `-32020` 拒绝缺失或不匹配的已识别值。

## 交付产物

`outputs/skill-mcp-contract-reviewer.md` 是一项扁平、可复用的审查技能。向它提供工具描述符、示例结果、分页行为和补全策略。它会返回准入决策、结果验证计划、头部策略和具体的失败测试。

## 验证

满足以下陈述时，本课即告完成：

- 重复调用时，`tools/list` 返回相同的逻辑顺序。
- 当 `nextCursor` 为 `""` 时，客户端发出第二次请求。
- 不安全的敏感头部描述符被排除，其他工具仍然可用。
- 数组通过其数组输出 schema。
- 对象无法通过同一个数组 schema。
- 错误结果不能省略或违反已发布的输出 schema。
- 文本、图像、音频、资源链接和嵌入式资源块都能通过验证。
- 头部审计事件包含名称但不包含值。
- 纯可见 ASCII 保持原样；Unicode、控制字符、带填充的、空的及看起来像哨兵的值，可通过精确 base64 UTF-8 编码往返还原。
- 被镜像的整数若超出 JavaScript 安全范围会被拒绝。
- `oneOf`、`items`、嵌套对象、`$ref` 定义或输出 schema 下的注解，会在准入时被拒绝。
- 已识别的头部名仅在忽略大小写且解码值与正文完全一致时通过；缺失或不匹配的副本会产生 HTTP `400` 和 JSON-RPC `-32020`。
- 分析师补全永远不会返回 `production`。
- 工具失败使用 `isError: true`；格式错误的协议调用使用 JSON-RPC `error`。

## 生产失败模式

| 失败 | 学习者看到什么 | 正确响应 |
|------|----------------|----------|
| 客户端假设输出是对象 | 有效数组失败或被静默包装 | 按已发布 schema 验证，不采用仅对象类型 |
| 将空游标视为假 | 最后一页消失 | 只要 `nextCursor` 存在且非 null 就继续 |
| 镜像敏感值 | secret 出现在代理、WAF 或追踪数据中 | 拒绝描述符，并将 secret 保留在受保护的请求数据中 |
| 镜像原始 Unicode 或空白 | 网关与源站不一致，或值被规范化 | 使用精确 base64 UTF-8 哨兵编码，并在解码后比较 |
| 注解藏在 schema 分支中 | 客户端在准入时漏掉路由元数据 | 遍历整个 schema 树，只允许直接顶层属性 |
| 镜像大整数 | JavaScript 中间方对路由值取整 | 拒绝超出 JavaScript 安全整数范围的值 |
| 头部与正文不一致 | 网关路由至一个目标，源站却执行另一个 | 在分派前以 HTTP `400` 和 JSON-RPC `-32020` 拒绝 |
| 忽略输出 schema | 下游代码消费损坏的结构 | 在模型或应用使用前验证 |
| 自动信任资源链接 | 调用者跟随未经授权的 URI | 对每次资源读取重新授权 |
| 补全共享全局建议 | 隐藏的租户名称泄露 | 按调用者、引用和授权过滤 |
| 将工具注解视为策略 | 破坏性操作绕过确认 | 在注解之外强制授权和审批 |
| 一个畸形工具破坏发现 | 整个服务器不可用 | 拒绝坏描述符，独立准入有效工具 |

## 综合项目关联

阶段 13 的综合项目需要一个能合并多个服务器工具的网关。本课提供其准入核心。

使用该产物评估四类综合项目证据：

- 确定且完整的分页发现；
- 向模型暴露前的描述符验证；
- 已验证的结构化输出与有界内容块；
- 维护授权边界的补全和路由元数据。

不要仅凭一次成功的 `tools/call` 就声称网关兼容。应捕获描述符、页面轨迹、获准工具集、被拒绝工具集和一个已验证的结果。

## 关键术语

| 术语 | 含义 |
|------|------|
| `inputSchema` | 定义可接受工具参数的 JSON Schema 对象 |
| `outputSchema` | 定义 `structuredContent` 的可选 JSON Schema |
| `structuredContent` | 工具结果生成的任意 JSON 值 |
| 内容块 | 有类型的文本、图像、音频、资源链接或嵌入式资源 |
| `x-mcp-header` | 将原始参数镜像到 Streamable HTTP 元数据的 schema 注解 |
| 不透明游标 | 由服务器发出的分页 token，客户端不解读其值 |
| 补全引用 | 正在补全其参数的 prompt 名称或资源 URI/模板 |
| 准入 | 客户端决定暴露或拒绝已发现描述符的过程 |

## 延伸阅读

- [MCP Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP Completion](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/completion)
- [MCP Pagination](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination)
- [MCP Streamable HTTP Parameter Headers](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#custom-headers-from-tool-parameters)
