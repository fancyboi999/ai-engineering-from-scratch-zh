# Resources：无状态服务器中的可寻址内容

> 工具通过执行某件事来回答问题。resource 则通过成为 host 已经可以指给模型的内容来回答；它由 URI 寻址，而不是按名称调用。

**类型：** Reference
**语言：** Python
**前置要求：** 第 11 课
**预计时间：** 约 45 分钟

## 学习目标

- 将 `resources/list`、`resources/templates/list` 和 `resources/read` 理解为三个不同的方法，并区分三种不同结果
- 把 RFC 6570 URI template 展开成具体 URI，再像读取其他 resource 一样读取它
- 解释为什么缺失 resource 必须返回带 `data.uri` 的 JSON-RPC error `-32602`，绝不能返回 `contents` 数组为空的 result
- 根据读取内容是共享信息还是只属于某个调用方，选择 `ttlMs` 与 `cacheScope`
- 在 URI 抵达存储层前先进行清理，防止 template 被用来读取服务器自身 root 之外的内容

## 问题背景

host 想把项目 README、工单正文或用户保存的笔记放入模型上下文时，并不是在要求模型执行操作，而是在选择模型回答前应该已经知道什么。如果把这种选择包装成工具，就会继承并不需要的工具语义：由模型决定是否调用，调用可能因参数验证失败，而且 transcript 中每次普通读取看起来都像一次操作。如果完全绕开 MCP，直接在 host 内从磁盘读取文件，又会失去 MCP 最重要的价值：服务器可以迁移到另一台机器、位于不同 transport 之后，或归属另一个团队，而 host 无需改一行代码。

Resources 正好填补这处空白。它们是内容，不是操作；通过 URI 寻址，而非按名称调用；由应用决定何时进入上下文，而不是模型。暴露 `notes://alice/welcome` 的笔记服务器，无论 host 把它渲染到侧边栏、自动交给模型，还是某一轮完全不用它，行为都相同。协议的职责止于描述内容并正确响应读取；host 读到 resource 后如何处理，仍由应用决定，就像工具把 prompt 和界面留给应用一样。

## 核心概念

在 MCP 的控制权划分中，resources 位于应用驱动的一侧：tools 由模型控制，prompts 由用户控制，resources 由 host 选择。客户端按 host 的方式发现并请求可用内容，无论方式是自动启发式规则、界面中的选择器，还是 host 始终包含的固定集合。

三个方法覆盖全部能力面。`resources/list` 返回当前调用方可见的 resources：`uri`、`name`，以及可选的 `description`、`mimeType` 和 `icons`。集合可以为空，也可以随时间变化，但不能按连接变化，只能根据请求携带的授权变化；第 04 课讲过的无状态核心禁止服务器记住上次是哪条连接发起请求。`resources/templates/list` 返回用 RFC 6570 template 描述的参数化 URI，例如 `file:///project/{+path}`，适合规模太大或动态性太强、无法逐一枚举的 resource family。`resources/read` 接收 `uri`，在 `contents` 中返回一个或多个 content item。

content item 有两种形态。文本内容是 `{uri, mimeType, text}`。二进制内容是 `{uri, mimeType, blob}`，其中 `blob` 是 base64 编码的字节。单次读取可以返回多个 content item：表示目录的 resource 可以在一个 `contents` 数组中返回其下所有文件，每一项都携带自己的 `uri` 和 `mimeType`。

URI scheme 是设计决策，不是走过场。只有当具备能力的客户端无需经过服务器、就能直接从 Web 获取相同内容时，才使用 `https://`；如果服务器是访问内容的唯一途径，则应依照 RFC 3986，优先选择 `file://`、`git://` 或自定义 scheme。`file://` URI 不一定对应真实文件系统中的真实路径。它只需成为服务器能够理解的稳定、带命名空间标识符。因此，服务器完全可以用内存树提供 `file:///project/{+path}`，同时仍像遍历真实目录那样清理每次展开：查询存储前，先相对一个合成 root 规范化 path segment，使任何 `..` 序列都无法把查询带出该 root。

这里的错误处理与 tools 不同。如果请求的 URI 不存在，服务器返回 JSON-RPC error，代码为 `-32602`（Invalid params），并在 `data.uri` 中写明请求目标。SEP-2164 特意把错误定义在这里：`-32602` 通常就表示参数无效，而不存在的 URI 正是客户端提供、却不对应服务器任何内容的参数。旧服务器曾使用 `-32002`，它来自 JSON-RPC server-error 范围，规范从未正式保留该含义；2026-07-28 服务器不得再发出它，但行为良好的客户端仍应识别旧 peer 返回的这个代码。无论使用哪个代码，服务器绝不能返回 `contents` 为空数组的正常 result。空数组无法区分“resource 存在但恰好为空”和“resource 根本不存在”，所以协议用独立的 error 形态消除歧义。

`resources/read` 是六个 complete 结果必须携带缓存提示的方法之一：`ttlMs` 表示客户端可以把答案视为新鲜内容的毫秒数；`cacheScope` 取 `public` 或 `private`。每个调用方读到的内容都相同——比如公共 changelog——可以使用 `public` 和较长的 `ttlMs`。只属于某个用户的 resource 必须使用 `private`，防止缓存用一个调用方的读取结果满足另一个调用方的请求。`cacheScope` 只描述谁可以共享缓存副本，并不执行访问控制；无论最终报告什么 scope，服务器仍须对每次读取进行授权。

Resources 还可携带可选 annotations：`audience`、`priority` 和 `lastModified`，供 host 判断优先展示哪些内容。能力标志 `subscribe` 则允许客户端通过 `subscriptions/listen` 监控 URI 变化，并使用 `resourceSubscriptions` filter，而不是已经废弃的独立 subscribe 调用。该 stream 的完整机制——确认、分流和取消——会在后续课程单独讲解，但请求形态与 envelope 课程以来使用的一样：无状态，并在每次请求中携带 `_meta`。

```figure
mcpa-12-resource-read
```

## 交互实验

图中追踪一个 URI 从 template 到 result 的过程。左侧 template `file:///project/{+path}` 将 path segment 展开为具体 URI；其中的 `+` 会保留嵌套路径中的斜杠，而普通 `{path}` 展开会对斜杠进行转义。中间框是 `resources/read` 本身，它在查询前先根据服务器 root 清理展开后的 URI。随后图分为两条路径：解析到真实内容的 URI 返回 complete result，携带 `contents`、`ttlMs` 和 `cacheScope`；解析不到内容的 URI——无论从未注册，还是通过 `..` segment 试图越出 root——都返回 `-32602`，并在 `data.uri` 中指出 URI，绝不会悄悄返回空 `contents` 数组。进入代码前先走完两条路径：每个 resource 服务器都必须正确实现这两种结果。

## 实践实验

打开 `code/main.py`。它构建了一个内存 workspace 服务器：一个 `README.md`、`src/` 下包含两个文件的目录、二进制 `logo.png`、`git://` URI 下受版本控制的 changelog，以及 `user://` URI 下的一条私有笔记。在课程目录运行：

```bash
python3 code/main.py
```

对照核心概念阅读 transcript。`resources/list` 返回按 URI 排序的目录，每个条目都携带 `cacheScope: public` 和 `ttlMs`。`resources/templates/list` 返回一个 template：`file:///project/{+path}`；demo 使用 `path=src/utils.py` 展开后直接读取结果。读取目录条目 `file:///project/src` 时，一个 `contents` 数组中会返回两个 content item，对应该目录下的两个文件。读取 `logo.png` 时，返回的是 `blob` 字段而非 `text`；将其解码，并把字节与源数据对比。读取 `user://alice/notes/welcome` 时，返回较短的 `ttlMs` 和 `cacheScope: private`，因为内容属于一个用户，而不是所有能够访问服务器的人。最后两次读取是刻意安排的失败：从未注册的 URI 返回 `-32602` 并设置 `data.uri`；通过 `..` segment 越出项目 root 构造的 URI 同样解析不到任何内容，以同样方式失败，绝不会落到 sandbox root 之外的文件。修改 template 展开的文件、添加自己的 resource，再次运行；目录和读取结果会自动纳入它，客户端无需改变。

## 交付产物

`outputs/resource-design-guide.md` 是设计与审查 resources 的一页参考：scheme 选择表、三个方法及其返回值、两种 content 形态、围绕 `-32602` 与 `data.uri` 的错误处理检查表、cache scope 决策表，以及 URI 清理安全检查表。编写或审查服务器 resource handler 时，把它放在手边。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课的结论：目录按顺序排列并携带缓存提示；template 能展开并读取正确文件；二进制读取携带 base64 `blob`；缺失 URI 以 `-32602` 和 `data.uri` 失败；`..` segment 永远无法解析到项目 root 之外；目录读取返回多个 content item；私有笔记携带 `cacheScope: private`；缺少正确协议元数据的请求会像其他方法一样遭到拒绝。仓库的 wire 检查器会按 2026-07-28 规则验证同一 transcript：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/12-the-resources-primitive
```

## 综合项目关联

综合项目的单次端到端 transcript 至少需要在工具调用和同意流程之外执行一次 resource read，而且必须按照本课测试的规则正确处理读取错误：缺失 resource 返回带 `data.uri` 的 `-32602`，绝不能返回空 `contents` 数组；每个 complete read 都携带 `ttlMs` 和 `cacheScope`。也要延续“先清理、后查询”的习惯；综合项目的授权检查依赖同样的纪律。

## 关键术语

| 术语 | 含义 |
|------|---------|
| Resource | 由 URI 标识、由应用驱动的内容 |
| `resources/list` | 返回调用方可见的 resource 目录，并携带缓存提示 |
| `resources/templates/list` | 返回 resource family 使用的 RFC 6570 URI template |
| `resources/read` | 根据 URI 在 `contents` 中返回一个或多个 content item |
| Text content | `{uri, mimeType, text}` |
| Binary content | `{uri, mimeType, blob}`，使用 base64 编码 |
| `-32602` | Invalid params；缺失或无效 resource URI 的代码，并携带 `data.uri` |
| `ttlMs` | 客户端可把缓存读取视为新鲜内容的毫秒数 |
| `cacheScope` | `public`（可共享）或 `private`（绑定到一个授权上下文） |
| `subscriptions/listen` | 监控 resource 变化的现代方式，替代已废弃的 `resources/subscribe` |

## 延伸阅读

- [MCP specification 2026-07-28: Resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)
- [MCP specification 2026-07-28: Caching](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/caching)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 10 节
- `phases/13-tools-and-protocols/10-mcp-resources-and-prompts`：深入构建 resources 与 prompts 服务器
