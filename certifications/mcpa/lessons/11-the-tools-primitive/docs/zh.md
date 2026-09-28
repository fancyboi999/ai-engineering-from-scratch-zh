# Tools primitive：调用操作并读取结果

> 工具调用和其他请求一样。它值得单独用一课讲，是因为结果可以带回纯文本、图像、音频、资源链接，或完整嵌入的资源；每种内容还会标注面向谁，以及有多新。

**类型：** Reference
**语言：** Python
**前置要求：** 第 10 课
**预计时间：** 约 45 分钟

## 学习目标

- 读取 `tools/list` 页面的分页与缓存提示，并解释为什么客户端收到的工具列表不能取决于由哪条连接发起请求
- 调用工具，并把 `CallToolResult` 拆成三个字段理解：`content`、`structuredContent` 和 `isError`
- 识别工具结果可携带的每种 content block：文本、图像、音频、资源链接和嵌入资源，并理解各自的 annotations 描述什么
- 服务器省略 annotations 对象时，应用每个工具注解的默认值，并解释这些默认值为何偏向谨慎而非宽松
- 追踪服务器工具列表变化后，如何通知已经打开 `subscriptions/listen` stream 的客户端

## 问题背景

服务器可以公开一个工具，也可以公开几百个。如果 `tools/list` 每次都用一个不分页的大块返回完整集合，而且响应不承诺结果多久仍然有效，那么模型每一轮要么白白重新获取整份目录，要么继续使用可能已经过期的副本。请求和响应中没有任何信息能告诉客户端哪种选择安全。

调用工具时，同一问题会更加尖锐。工具可能说一句话、画一张图，也可能返回文件的真实字节；单一的“返回字符串”契约无法如实描述这些结果。如果强迫所有结果使用一种形态，客户端就只能猜：返回文本是给模型读、给用户看，还是表示需要另行获取的资源？它也无法明确区分“调用彻底失败”和“工具返回了模型仍需阅读并修正的内容”。

2026-07-28 修订版用同一种思路解决两类问题：让 wire 携带足够结构，使客户端无需猜测。列表带分页和缓存提示，content 按 block 逐项标注类型，调用失败方式也变成可直接检查的字段，不必再反向推断消息形态。

## 核心概念

客户端通过 `tools/list` 询问服务器能做什么。请求可以携带从上一页原样复制的不透明 `cursor`；第一次请求则省略它。`tools/list` 属于可缓存操作，所以 `"complete"` 结果始终携带整数 `ttlMs`，以及取值为 `"public"` 或 `"private"` 的 `cacheScope`。如果还有更多工具，还会携带 `nextCursor`，它同样是不透明字符串，客户端只需原样传回，不能解析。

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "resultType": "complete",
    "tools": [
      {"name": "get_readme_link", "description": "Point at the project README instead of inlining it.", "inputSchema": {"type": "object", "additionalProperties": false}}
    ],
    "nextCursor": "",
    "ttlMs": 300000,
    "cacheScope": "public"
  }
}
```

这里的 `nextCursor` 刻意设为空字符串：它是合法 cursor 值，不是“没有下一页”的哨兵。客户端如果用 `if result.get("nextCursor")` 判断是否继续分页，就会提前一页停止，因为大多数语言都把空字符串视为 falsy。唯一正确的检查方式是判断该键是否存在。分页从头到尾都是服务器实现细节；客户端如果解析、解码或递增 cursor，就依赖了下个服务器版本随时可以修改的内容。同样的纪律也适用于列表内容：当工具集合不变时，三条互不相关的连接分别调用 `tools/list`，必须得到内容与顺序都相同的结果。集合只能因为请求所带授权改变了调用方可见范围而不同，不能因为某条连接记住了什么而变化。

调用工具使用 `tools/call`，在 `params` 中放入 `name` 和 `arguments`。返回内容是 `CallToolResult`：绝不能省略的 `content` 列表、可选的 `structuredContent` 值，以及可选的 `isError`。结果中省略 `isError` 表示调用成功；只有 `true` 才表示工具在执行任务时遇到问题。如果工具还定义了 `outputSchema`，结构化答案要放在 `structuredContent` 中；为了让只读取文本的客户端也能获得数据，还要把相同值序列化后镜像到 `content` 内的 text block。

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "resultType": "complete",
    "content": [{"type": "text", "text": "{\"id\": \"TCK-9\", \"title\": \"VPN drops every hour\", \"status\": \"open\"}"}],
    "structuredContent": {"id": "TCK-9", "title": "VPN drops every hour", "status": "open"}
  }
}
```

`content` 是列表，因为一次调用可以同时返回多种内容。规范定义了五种 block type，覆盖所有情况。`text` block 携带 `text`。`image` block 携带 base64 `data` 和 `mimeType`。`audio` block 用相同的两个字段承载声音。`resource_link` block 不内联资源，而是通过 `uri` 和 `name` 指向资源，适合内容很大或模型可能根本不需要读取的情况。`resource` block 则把资源自身内容（`uri`、`mimeType`，以及 `text` 或 `blob`）直接嵌入结果。任一 block 都可以携带自己的 `annotations`：`audience` 指明内容面向谁（`user`、`assistant` 或两者），`priority` 位于 0 到 1 之间，`lastModified` 是时间戳。这些 content annotations 和 block 的其他字段并列，是 `data` 或 `resource` 的 sibling，绝不会再嵌套一层。这里值得再看一遍：embedded resource 的 annotations 不在 `resource` 对象内部，而是位于它旁边。

```json
{
  "type": "resource",
  "resource": {"uri": "config://release-desk/thresholds", "mimeType": "application/json", "text": "{\"maxOpenIncidents\": 5}"},
  "annotations": {"audience": ["user", "assistant"], "priority": 0.7, "lastModified": "2026-07-01T00:00:00Z"}
}
```

另有一组 annotations 描述工具本身，而不是某次结果中的 content：`readOnlyHint`、`destructiveHint`、`idempotentHint`、`openWorldHint`，以及用于展示的 `title`。这些都不是保证。除非服务器本身可信，否则客户端必须把它们视为不可信提示。即使服务器对工具只字未提，客户端仍有默认值可用：`readOnlyHint` 为 false，`destructiveHint` 为 true（仅在 `readOnlyHint` 为 false 时有意义），`idempotentHint` 为 false，`openWorldHint` 为 true。这些默认值有意偏向谨慎。完全没有 annotations 的工具，会被视为再次调用时可能产生不同效果；不是因为这种情况一定常见，而是因为没有任何声明告诉客户端并非如此。

服务器声明 `tools: {listChanged: true}` 后，就承诺工具集合变化时会发出通知，而且通知通过 stream 发送，而不是在整条连接上广播。客户端用 `subscriptions/listen` 打开 stream，并在 `params.notifications` 中指定 `toolsListChanged`。返回的第一条消息始终是 `notifications/subscriptions/acknowledged`，其中回显服务器同意支持的请求类型；其 `_meta` 带有 `io.modelcontextprotocol/subscriptionId`，值与 listen 请求自身的 `id` 相同。此后，该 stream 上的每条 `notifications/tools/list_changed` 都携带同一个 subscription id，方便同时管理多个开放 stream 的客户端识别消息来源。通知自身不携带列表，只表示旧列表已经过期；客户端需要用普通 `tools/list` 重新获取。

```figure
mcpa-11-tool-call
```

## 交互实验

图中展示一次 `tools/call` 往返：请求沿一个方向发送，`CallToolResult` 沿另一方向返回。箭头下方列出结果的 `content` 数组可以混合搭配的五种 content block。再往下，结果的 `isError` 字段分出两条路径：省略或 false 表示调用正常，true 表示工具遇到模型可以读取并处理的问题。图中的形态不属于某个特定服务器；无论工具说一句话、绘制徽章，还是只给出暂时无需读取的文件链接，都使用同一结构。

## 实践实验

打开 `code/main.py`。它构建了一个拥有六个工具的 `release-desk` 服务器：五种 content block 各对应一个工具，另有一个结构化工单摘要工具。列表以每页两个工具分成三页，中间页刻意以空字符串 cursor 结尾。

```bash
python3 code/main.py
```

对照核心概念阅读输出页面：前两页都以客户端从不解释的 `nextCursor` 结束，只有第三页完全没有 `nextCursor` 键；这才是分页真正结束的唯一信号。然后找到文件顶部附近的 `render_for_audience`：当为 `"assistant"` 渲染时，它会排除徽章图像；为 `"user"` 渲染时则保留，依据正是 `render_badge` 附在 block 上的 `annotations.audience` 列表。最后观察 transcript 末尾附近的 `subscriptions/listen` 交换：先发 acknowledgment；第七个工具 `triage_incident` 在 stream 中途注册时，立即收到 `notifications/tools/list_changed`；随后重新遍历 `tools/list`，这次需要第四页才能看到新工具。你可以在 `build_tool_server` 中添加第八个工具，再次运行，确认无需改动任何客户端代码，分页和 `effective_tool_annotations` 默认值就会自动调整。

## 交付产物

`outputs/tool-result-anatomy.md` 是本课考试范围的一页参考：`tools/list` 的分页与缓存字段、`CallToolResult` 结构、五种 content block 及其必填字段、工具注解默认值，以及 listChanged 流程的一句话版本。前几次审查真实服务器工具定义时，把它放在手边；每一行都能追溯到本课代码实际设置的字段。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课的结论：每种 content block 都结构正确；`resource_link` 始终携带 `uri` 和 `name`；嵌入资源的 `annotations` 位于 `resource` 对象旁边而非内部；按 audience 过滤确实会排除面向其他人的 block；正常成功时不出现 `isError`；`tools/list` 能正确经过空字符串 cursor 继续分页，不会提前停止；无法识别的 cursor 会被拒绝；缺少元数据的请求会被拒绝；来自两条独立连接的工具列表完全相同；省略的工具注解会解析为文档所述默认值；`subscriptions/listen` stream 总是在报告变化前先确认订阅。仓库的 wire 检查器还会按 2026-07-28 规则验证本课 transcript：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/11-the-tools-primitive
```

## 综合项目关联

综合项目的单次长交换会调用工具、根据 schema 验证参数，并读取 `isError` 结果后发起修正重试。这两步都使用本课的 `CallToolResult`。无论调用独立存在还是处于更长脚本中，读取方式都一样：`content` 是模型看到的内容，`structuredContent` 让程序无需重新解析文本即可信任结构，`isError` 则区分“请求本身错误”和“工具遇到了值得解释的问题”。

## 关键术语

| 术语 | 含义 |
|------|---------|
| Tool | 服务器按名称公开、由模型控制且通过 schema 定型的操作 |
| `tools/list` | 枚举服务器工具的可分页、可缓存请求 |
| `tools/call` | 按名称和参数调用一个工具的请求 |
| `CallToolResult` | 工具调用结果结构：`content`、可选 `structuredContent`、可选 `isError` |
| Content block | 工具结果 `content` 列表中的一项：文本、图像、音频、资源链接或嵌入资源 |
| `resource_link` | 通过 URI 指向资源而不内联内容的 content block |
| Content annotations | content block 上的 `audience`、`priority` 和 `lastModified`，描述面向谁以及内容有多新 |
| Tool annotations | `readOnlyHint`、`destructiveHint`、`idempotentHint`、`openWorldHint`：描述工具行为的不可信提示 |
| `nextCursor` | 还有更多工具时，分页结果携带的不透明 token；应判断是否存在，而非是否 truthy |
| `subscriptions/listen` | 打开 stream 的请求，服务器通过它发送 `notifications/tools/list_changed` |

## 延伸阅读

- [MCP 2026-07-28 规范：工具](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP 2026-07-28 规范：订阅](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions)
- [MCP 2026-07-28 规范：Schema 参考](https://modelcontextprotocol.io/specification/2026-07-28/schema)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 10 节
- `phases/13-tools-and-protocols/07-building-an-mcp-server` 和 `phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content`：深入构建工具契约和 content 处理
