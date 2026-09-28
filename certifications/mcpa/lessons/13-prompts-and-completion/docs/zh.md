# Prompt 模板与参数补全

> Prompt 是由服务器编写、用户选择运行的模板。用户既然选了它，内容就不该带来任何意外。

**类型：** Reference
**语言：** Python
**前置要求：** 第 12 课
**预计时间：** 约 45 分钟

## 学习目标

- 解释 prompt 为何由用户控制，以及它与模型控制的 tools 原语、应用驱动的 resources 原语有何不同
- 解读 `prompts/list` 和 `prompts/get` 的请求与结果，包括参数、分页游标和缓存提示
- 用文本与资源链接构建 `PromptMessage` 内容，并把调用方提供的参数代入模板
- 对未知 prompt 名称、缺失必填参数和无法识别的分页游标返回 `-32602`
- 使用带 `ref/prompt`、`ref/resource` 引用及 `context.arguments` 的 `completion/complete`，并正确处理 100 个值的上限与 `hasMore`

## 问题背景

允许用户输入斜杠命令的 host，需要有地方保存这些命令展开后的文本。它可以把少量模板硬编码进客户端，但每新增一个模板都要发布新版客户端，而且各个 host 支持的模板集合也不一致。它也可以让模型每次临时组织措辞，但团队精心编写、审核过并希望所有人统一复用的 prompt，就会在每次运行时发生细微漂移。

MCP 把这类文本放到服务器上，并提供了专门的原语：用户主动选择内容，host 可根据具名参数生成表单。掌握业务领域的服务器——无论是代码审查策略、事故运行手册还是发布公告——也负责措辞。任何支持 MCP 的客户端都能列出可用内容、展示给用户、收集参数，并以同样方式渲染同一个模板。用户通常通过菜单或斜杠命令输入，但协议不规定具体界面。协议固定的是契约：由用户决定何时运行 prompt；prompt 内容是服务器提供的数据，不是客户端预先打包的内容。

旁边还有一个较小的问题：模板参数一多，手动填写既慢又容易出错。`completion/complete` 允许服务器随用户输入推荐值，还能根据之前填写的答案调整后续建议。

## 核心概念

先看控制模型，因为它决定了这个原语的其他一切。Tools 由模型控制：模型决定何时调用。Resources 由应用驱动：host 决定哪些资源内容进入上下文。Prompts 由用户控制：用户明确选择某个 prompt，常见方式是从 host 渲染成斜杠命令的菜单中选择。服务器仍负责 prompt 的措辞、参数以及最终渲染出的消息。所谓控制，指的是谁决定何时运行，而不是谁编写内容。

支持该原语的服务器会在 `server/discover` 结果的 `capabilities` 对象中声明 `prompts: {"listChanged": true}`，随后必须响应 `prompts/list`。结果包含 `resultType: "complete"`、一个 `prompts` 数组；由于 `prompts/list` 是六个可缓存操作之一，还包含整数 `ttlMs`，以及值为 `"public"` 或 `"private"` 的 `cacheScope`。列表支持分页：请求中传入不透明的 `cursor`，还有更多页面时，结果中返回不透明的 `nextCursor`。服务器从未签发的游标不是可忽略的小问题，而是 `-32602` Invalid params；无效或缺失的 prompt 名称同样使用该错误码。

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "prompts/list",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

`prompts` 中的每一项都给出 prompt 名称及其 `arguments`。每个参数都包含 `name`、`description` 和 `required` 标记。用户尚未输入任何内容前，客户端就能直接根据该列表生成表单。为解析模板，客户端发送 `prompts/get`，其中包含 `name` 和由字符串组成的 `arguments` 映射。这里有两种失败情形，考试会考它与 tools 原语的区别：这里没有 `isError` 通道，因为 prompt 不执行任何操作，只渲染文本。未知 prompt 名称和缺失必填参数都属于普通 JSON-RPC 错误，即 `-32602`；它们不是让模型尝试补救的部分结果。2026-07-28 修订版还允许 `prompts/get` 返回 `InputRequiredResult`，而不是最终结果。它采用与多轮无状态 `tools/call` 相同的结构：服务器还需要一个答案才能完成渲染。该机制会在本路线的后续课程中单独讲解。

成功的 `prompts/get` 结果包含 `messages`。每条消息的 `role` 是 `"user"` 或 `"assistant"`，并带一个内容块。最常见的是 `text` 块，参数值已经代入措辞。消息也可以携带 `resource_link`，通过 `uri`、`name` 和 `mimeType` 指向某项资源，而不内联其字节。比如代码审查需要引用但不应复制一遍的风格指南或运行手册。消息还可以携带嵌入式 `resource` 块，其中直接包含资源的 `uri`、`mimeType`，以及 `text` 或 base64 `blob`，适合内联发送的小型内容。这三种内容类型都接受 resources 使用的 `audience` 和 `priority` 注解。

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "resultType": "complete",
    "description": "Code review request template",
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "Review this python snippet for style and correctness. Follow flask community conventions where they apply."
        }
      },
      {
        "role": "user",
        "content": {
          "type": "resource_link",
          "uri": "file:///styleguides/python.md",
          "name": "python-style-guide.md",
          "mimeType": "text/markdown"
        }
      }
    ]
  }
}
```

手动填写多个参数很麻烦，因此声明 `completions: {}` capability 的服务器会响应 `completion/complete`。请求通过 `ref` 指明正在补全的对象：prompt 参数使用 `{"type": "ref/prompt", "name": "code_review"}`，资源模板变量使用 `{"type": "ref/resource", "uri": "file:///src/{path}"}`。请求还包含当前正在输入的 `argument`，形如 `{"name": ..., "value": ...}`，以及可选的 `context.arguments` 映射，保存用户在同一表单中此前已经填写的名称和值。补全结果最多列出 100 个 `values`；实际匹配数更多时，它会报告完整的 `total`，并将 `hasMore` 设为 true，让客户端知道列表只是被截断，而不是已经列完。`prompts/get` 和 `completion/complete` 都不属于六个可缓存操作，因此结果中没有 `ttlMs` 或 `cacheScope`。这是很容易踩中的考试陷阱：缓存针对稳定列表，而不是单次参数回答。

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "resultType": "complete",
    "completion": {
      "values": ["falcon", "fastapi"],
      "total": 2,
      "hasMore": false
    }
  }
}
```

让第一个参数缩小第二个参数的范围，正是 `context.arguments` 的意义。没有它，服务器只能依据当前输入的前缀猜测；只要字母匹配，无论用户之前选择了哪种语言，所有候选项都可能出现。若 `context.arguments` 带有 `{"language": "python"}`，提供框架建议的服务器就能去掉 JavaScript 和 Java 项，只返回真正适用的框架。补全候选与 tool 注解一样，只是建议，不是访问控制。客户端仍需依据 prompt 自身规则验证用户最终提交的内容。

在 2026-07-28 之前，`prompts/list` 等列表结果完全不要求提供缓存字段。兼容两个时代的客户端若收到既没有 `ttlMs` 也没有 `cacheScope` 的 `prompts/list` 结果，应把它视为不缓存、仅使用一次的回答，而不是擅自假定默认有效期。

```figure
mcpa-13-prompt-template
```

## 交互实验

图的左栏完整展示一次 `prompts/get` 调用：模板中的 `{language}` 和 `{framework}` 占位符、本次调用提供的参数，以及返回的渲染文本。右栏针对 `framework` 参数，以相同输入前缀运行两次 `completion/complete`：第一次没有 `context.arguments`，第二次客户端已经告诉服务器用户选择的语言。第二次调用的候选列表更短，因为服务器可以排除不属于该语言的框架。两栏都没有缓存提示，因为 `prompts/get` 和 `completion/complete` 都不携带缓存提示。

## 实践实验

打开 `code/main.py`。这是一个只用标准库实现的 prompt 服务器，包含 `code_review` 和 `bug_triage` 两个 prompt。列表每页只显示一个，因此 `prompts/list` 会用 `cursor` 和 `nextCursor` 演示真正的分页。一个包含 144 个源文件路径的合成目录为 `ref/resource` 补全提供数据，所以 100 个值的上限和 `hasMore` 不是模拟出来的，而是实际计数超过限制后的结果。

```bash
python3 code/main.py
```

对照核心概念阅读输出的交互记录。找到两次 `prompts/list` 调用：第二次使用第一次返回的 `nextCursor`，返回剩余 prompt，且不再带自己的 `nextCursor`，表示列表已经到底。再找到第三次 `prompts/list`，它发送了服务器从未签发的游标，因此收到 `-32602`。找到针对 `code_review` 的 `prompts/get`：结果有两条消息，一条 `text` 块已代入 `python` 和 `flask`，另一条 `resource_link` 指向代码审查应引用的风格指南。接着找到两次失败调用：一次 `prompts/get` 完全没有参数，另一次指定不存在的 prompt；两者都返回 `-32602`。最后比较两次 `framework` 补全：第一次没有 `context`，返回三个匹配项，其中一个属于 JavaScript；第二次把 `context.arguments` 设为 `{"language": "python"}`，只返回属于 Python 的两个框架。最后两次调用补全 `ref/resource` 的路径参数：第一次前缀为空，144 个可能路径中返回 100 个，`hasMore` 为 true；第二次前缀为 `auth/`，18 个结果全部返回，`hasMore` 为 false。修改前缀或增加第三个 prompt 后再次运行，观察分页和补全如何响应。

## 交付产物

`outputs/prompt-and-completion-reference.md` 是 prompts 与 completion 接口的单页参考，涵盖请求和结果结构、`PromptMessage` 可携带的内容类型、错误表，以及补全引用类型和数量上限。审查服务器时把它放在手边，就能快速检查 `prompts/get` 错误，以及 `completion/complete` 的数量上限和 `hasMore` 行为。

## 验证

在课程目录中运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课的各项结论：`prompts/list` 会分页并携带缓存提示；无法识别的游标会被拒绝；`prompts/get` 会把参数代入文本块并附加资源链接；缺失必填参数和未知 prompt 名称都返回 `-32602`；补全结果最多返回 100 个值，存在更多结果时设置 `hasMore`；更窄的前缀会让结果数降回上限以下；`context.arguments` 会显著缩小候选集；场景中的每个请求都携带协议元数据。仓库的 wire 检查器还会依据 2026-07-28 规则验证本课交互记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/13-prompts-and-completion
```

## 综合项目关联

综合项目的端到端交互会发现服务器、调用 tool 并完成用户同意流程；现实中的 host 还会让用户选择审核过的模板，而不是每次输入自由文本，并在填写时提供补全。如果综合项目要求解释某次交互为何使用 prompt 而不是 tool，就从控制权回答：用户主动选择了它，服务器编写了它的措辞，而且渲染本身不会像 tool 调用那样改变状态。

## 关键术语

| 术语 | 含义 |
|------|---------|
| Prompt | 由用户控制、服务器编写，并带具名参数的消息模板 |
| `prompts/list` | 可缓存、可分页的请求，返回调用方当前可见的 prompts |
| `prompts/get` | 代入参数并渲染某个 prompt 消息的请求 |
| `PromptMessage` | 一个 `role` 加一个内容块：文本、图像、音频、资源链接或嵌入式资源 |
| `resource_link` | 通过 URI 指向资源而不内联其字节的内容块 |
| `completion/complete` | 为某个 prompt 或资源模板参数返回排序建议的请求 |
| `ref/prompt` | 指明待补全参数所属 prompt 的补全引用 |
| `ref/resource` | 指明待补全资源 URI 或模板的补全引用 |
| `context.arguments` | 客户端发送的已解析参数值，用于缩小后续补全范围 |
| `hasMore` | 当 `total` 超过 100 个值的上限时为 true 的补全标记 |

## 延伸阅读

- [MCP specification 2026-07-28: Prompts](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts)
- [MCP specification 2026-07-28: Completion](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/completion)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 10 节
- `phases/13-tools-and-protocols/10-mcp-resources-and-prompts`，深入构建 resources 与 prompts 原语
