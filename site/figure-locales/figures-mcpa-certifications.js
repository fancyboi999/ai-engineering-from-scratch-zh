(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-mcpa-certifications.js"] = {
  "mcpa-00-blueprint-weights": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "MCPA Blueprint": "MCPA 考试蓝图",
      "five domains weighted by percent of exam content": "五个领域按考试内容占比加权",
      "Fundamentals": "基础",
      "Architecture": "架构",
      "Interactions": "交互",
      "Security": "安全",
      "Use Cases": "应用场景",
      "Bar chart of the five MCPA domain weights: MCP Fundamentals 16 percent, Architecture and Components 14 percent, Interactions and Execution 26 percent, Security and Governance 24 percent, Use Cases and Ecosystem 20 percent": "五个 MCPA 领域权重的柱形图：MCP 基础 16%，架构与组件 14%，交互与执行 26%，安全与治理 24%，应用场景与生态 20%。",
      "Interactions and Execution and Security and Governance together carry half the blueprint. Study hours split evenly across five domains would starve the two tallest bars.": "交互与执行、安全与治理合计占考试蓝图的一半。若将学习时间平均分给五个领域，就会让最高的两根柱子对应的领域投入不足。"
    },
    "patterns": [],
    "preserve": []
  },
  "mcpa-01-spec-map": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Reading the Specification": "阅读规范",
      "what every implementation MUST support, what it MAY add, and how a feature ages": "每个实现必须支持什么、可以添加什么，以及功能如何演进",
      "Specification": "规范",
      "2026-07-28, Current": "2026-07-28，当前版",
      "MUST support": "必须支持",
      "Base Protocol": "基础协议",
      "Versioning": "版本管理",
      "Message Patterns": "消息模式",
      "MAY support": "可以支持",
      "Authorization": "授权",
      "Server Features": "服务器功能",
      "Client Features": "客户端功能",
      "Utilities": "实用功能",
      "Active": "活跃",
      "Deprecated": "已弃用",
      "Removed": "已移除",
      "feature lifecycle, independent of the revision state": "功能生命周期，独立于文档版本状态",
      "A map of the MCP specification: a root node for the 2026-07-28 Current revision branches to three MUST-support components, base protocol, versioning, and message patterns, and four MAY components, authorization, server features, client features, and utilities. Below, three chips show a feature moving from Active to Deprecated to Removed, a lifecycle independent of the revision.": "MCP 规范结构图：以 2026-07-28 当前修订版为根，分出三个必须支持的组件——基础协议、版本管理、消息模式，以及四个可选组件——授权、服务器功能、客户端功能与实用功能。下方三个标签展示功能从活跃到弃用、再到移除的独立生命周期。",
      "Every implementation MUST support the base protocol, versioning, and message patterns. Authorization, server features, client features, and utilities are added as needed. A feature also carries its own Active, Deprecated, or Removed state, tracked separately from whether the document itself is Draft, Current, or Final.": "每个实现都必须支持基础协议、版本管理与消息模式。授权、服务器功能、客户端功能和实用功能按需添加。每项功能还拥有独立的活跃、弃用或移除状态，与文档本身是草案、当前版还是最终版分开跟踪。"
    },
    "patterns": [],
    "preserve": []
  },
  "mcpa-02-n-by-m": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "The Integration Problem": "集成问题",
      "24 custom links versus 10 protocol implementations": "24 条定制连接与 10 个协议实现",
      "chat": "聊天",
      "editor": "编辑器",
      "portal": "门户",
      "files": "文件",
      "tickets": "工单",
      "crm": "CRM 系统",
      "docs": "文档",
      "N x M = 24 integrations": "N x M = 24 项集成",
      "N + M = 10 implementations": "N + M = 10 个实现",
      "Left: four applications wired to six systems with twenty-four links. Right: the same applications and systems each connect once to one shared protocol, ten connections.": "左侧：四个应用与六个系统之间有二十四条连接。右侧：同样的应用与系统各自仅连接一次共享协议，总共十条连接。",
      "Bespoke glue grows with every application-system pair. With one protocol, each application implements a client once and each system implements a server once, and any client can discover any server at runtime.": "每增加一个应用与系统的配对，定制胶水代码就会增长。有统一协议后，每个应用只实现一次客户端，每个系统只实现一次服务器，任意客户端都能在运行时发现任意服务器。"
    },
    "patterns": [],
    "preserve": []
  },
  "mcpa-03-envelope": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "The JSON-RPC Envelope": "JSON-RPC 信封",
      "four message shapes and the _meta key anatomy": "四种消息形式与 _meta 键结构",
      "four message shapes share one envelope": "四种消息形式共享一个信封",
      "request": "请求",
      "id required": "必须有 id",
      "not null": "不得为 null",
      "notification": "通知",
      "no id field": "无 id 字段",
      "no reply sent": "不发送回复",
      "result": "结果",
      "id matches call": "id 与调用匹配",
      "has resultType": "包含 resultType",
      "error": "错误",
      "id if readable": "id 可解析时保留",
      "is a _meta key reserved for MCP?": "_meta 键是否为 MCP 保留？",
      "second label is modelcontextprotocol: reserved": "第二段为 modelcontextprotocol：保留",
      "second label is example, not mcp: not reserved": "第二段为 example，而非 mcp：不保留",
      "Top row: four message shape cards, request, notification, result, and error, each with the field that defines it. Bottom: two _meta keys split into prefix labels and a name, with the second label highlighted. io dot modelcontextprotocol is reserved because its second label is modelcontextprotocol. com dot example dot mcp is not reserved because its second label is example.": "上排展示请求、通知、结果与错误四张消息形式卡片，每张标出定义该形式的字段。下排将两个 _meta 键拆成前缀标签与名称，并突出第二段标签。io.modelcontextprotocol 的第二段是 modelcontextprotocol，因此属于保留命名空间；com.example.mcp 的第二段是 example，因此不保留。",
      "A request always carries a non-null id, a notification never carries one, and a result or error echoes the id it answers. A _meta key is reserved for MCP only when its second dot-separated label is modelcontextprotocol or mcp, wherever mcp itself might also appear.": "请求始终携带非 null 的 id；通知从不携带 id；结果或错误回传所响应的 id。只有当 _meta 键按点分隔后的第二段是 modelcontextprotocol 或 mcp 时，才属于 MCP 保留键；mcp 出现在其他位置不影响这一规则。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "modelcontextprotocol",
        "reason": "用于判断保留命名空间的 _meta 键片段，必须逐字保留"
      },
      {
        "text": "/protocolVersion",
        "reason": "用于判断保留命名空间的 _meta 键片段，必须逐字保留"
      },
      {
        "text": "com.",
        "reason": "用于判断保留命名空间的 _meta 键片段，必须逐字保留"
      },
      {
        "text": "example",
        "reason": "用于判断保留命名空间的 _meta 键片段，必须逐字保留"
      },
      {
        "text": ".mcp/scanId",
        "reason": "用于判断保留命名空间的 _meta 键片段，必须逐字保留"
      },
      {
        "text": "code + message",
        "reason": "原样的协议、代码、产品名或公式标识，不属于人读散文"
      }
    ]
  },
  "mcpa-04-stateless-requests": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "The Stateless Core": "无状态核心",
      "any replica answers, because state lives off the process": "状态在进程外，任意副本都能应答",
      "router": "路由器",
      "round robin": "轮询",
      "replica A": "副本 A",
      "replica B": "副本 B",
      "shared": "共享",
      "store": "存储",
      "same handle, either replica": "同一个句柄，任意副本",
      "state lives in the store": "状态保存在存储中",
      "Two clients, alice and bob, send requests through a round robin router to two interchangeable server replicas, A and B. Both replicas read and write the same shared handle store, so whichever replica gets the next request answers it correctly.": "alice 与 bob 两个客户端通过轮询路由器，向可互换的服务器副本 A 和 B 发送请求。两个副本读写同一个共享句柄存储，因此下一个请求交给任一副本，都能正确应答。",
      "Alice's and bob's requests are routed round robin, with no stickiness to either replica. Neither replica keeps basket state in memory; both read and write the same shared store keyed by the opaque handle a tool call returned, so whichever replica answers the next request answers it correctly.": "alice 与 bob 的请求按轮询路由，不固定绑定任何副本。副本都不在内存中保留购物篮状态，而是使用工具调用返回的不透明句柄作为键，读写同一个共享存储，因此下次由哪个副本应答都能正确处理。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "alice",
        "reason": "请求主体的示例用户标识"
      },
      {
        "text": "bob",
        "reason": "请求主体的示例用户标识"
      }
    ]
  },
  "mcpa-05-era-matrix": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Protocol Era Probe": "协议代际探测",
      "one server/discover probe, three outcomes, no handshake required to ask": "一次 server/discover 探测，三种结果，询问前无需握手",
      "server/discover probe": "server/discover 探测",
      "Modern: use it": "现代协议：直接使用",
      "-32022 (recognized)": "-32022（已识别）",
      "Modern: retry version": "现代协议：换版本重试",
      "other error / timeout": "其他错误 / 超时",
      "Legacy: use initialize": "旧协议：使用 initialize",
      "Era is a property of the server: cache the decision per": "代际是服务器属性：按以下范围缓存判定",
      "process (stdio) or origin (HTTP).": "进程（stdio）或源站（HTTP）。",
      "A server/discover probe fans out to three outcomes: a DiscoverResult means the server is modern, a recognized -32022 UnsupportedProtocolVersion error means modern with a different version to retry, and any other error or a timeout means legacy, falling back to the initialize handshake.": "server/discover 探测有三种结果：DiscoverResult 表示现代服务器；已识别的 -32022 UnsupportedProtocolVersion 错误表示现代服务器，但需换版本重试；其他错误或超时表示旧服务器，回退到 initialize 握手。",
      "The same probe sorts every stdio server into modern, modern with a different version, or legacy. A recognized modern error never falls back; only an unrecognized error or a timeout does.": "同一次探测将各 stdio 服务器分为现代协议、需换版本的现代协议或旧协议。已识别的现代错误从不回退，只有无法识别的错误或超时才回退。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "DiscoverResult",
        "reason": "协议结果类型名称"
      }
    ]
  },
  "mcpa-06-topology": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Hosts, Clients, and Servers": "宿主、客户端与服务器",
      "one client per server, one registry behind the host": "每个服务器对应一个客户端，宿主后方使用统一注册表",
      "host process": "宿主进程",
      "client: files": "客户端：files",
      "server: files": "服务器：files",
      "local . stdio . tools": "本地 · stdio · 工具",
      "reports: \"primary\"": "自报名称：“primary”",
      "client: notes": "客户端：notes",
      "server: notes": "服务器：notes",
      "client: metrics": "客户端：metrics",
      "server: metrics": "服务器：metrics",
      "remote . http . resources": "远程 · HTTP · 资源",
      "reports: \"metrics-svc\"": "自报名称：“metrics-svc”",
      "registry keys are host-assigned ids, never serverInfo.name": "注册表以宿主分配的 id 为键，不使用 serverInfo.name",
      "search -> files (first to declare the name keeps it)": "search -> files（先声明者保留名称）",
      "notes/search -> notes (the collision gets a server-id prefix)": "notes/search -> notes（重名项添加服务器 id 前缀）",
      "One host embeds three clients, each bound to one server. Files and notes run locally over stdio and both self-report the name primary. Metrics runs remotely over Streamable HTTP. The registry keeps search for files and prefixes the colliding notes tool as notes slash search.": "一个宿主内嵌三个客户端，各绑定一个服务器。files 与 notes 在本地通过 stdio 运行，且都自报名称 primary；metrics 通过 Streamable HTTP 远程运行。注册表让 files 保留 search 名称，并将重名的 notes 工具加前缀为 notes/search。",
      "The host embeds one client per server. Files and notes are local stdio subprocesses that both self-report the name \"primary\", so the host keys its registry on the connection id it assigned, files and notes, never on that self-reported name. Metrics is a remote Streamable HTTP server with no tools capability, so its tools are never listed. Both files and notes declare a tool named search; the aggregator keeps the first as the canonical name and exposes the second as notes/search.": "宿主为每个服务器内嵌一个客户端。files 与 notes 是本地 stdio 子进程，均自报名称“primary”，因此宿主用自己分配的连接 id——files 和 notes——作为注册表键，而非服务器自报名称。metrics 是不具备 tools 能力的远程 Streamable HTTP 服务器，因而从不列出其工具。files 与 notes 都声明 search 工具；聚合器让第一个保留规范名，将第二个暴露为 notes/search。"
    },
    "patterns": [],
    "preserve": []
  },
  "mcpa-07-discover": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Discovery and Capability Negotiation": "发现与能力协商",
      "discover once; declare capabilities on every call": "发现一次；每次调用都声明能力",
      "discover: optional, once": "发现：可选，仅一次",
      "every tools/call: declare capabilities again": "每次 tools/call：重新声明能力",
      "client": "客户端",
      "server": "服务器",
      "-32021 missing elicitation": "-32021：缺少 elicitation",
      "result: complete": "结果：complete",
      "Top lane: a client calls server/discover once, optionally, and gets back supported versions, capabilities, instructions, and cache hints. Bottom lane: every tools/call still declares its own client capabilities in that request; without elicitation declared the server returns -32021, and with it declared the call completes.": "上方：客户端可选地调用一次 server/discover，获取支持的版本、能力、指令和缓存提示。下方：每次 tools/call 仍在当前请求中声明自身客户端能力；未声明 elicitation 时，服务器返回 -32021，声明后调用完成。",
      "server/discover is optional and cacheable, a one-time summary of what a server can do. Every tools/call still carries its own clientCapabilities in _meta, checked fresh: missing elicitation gets -32021 naming it, declaring it lets the call complete.": "server/discover 是可选且可缓存的一次性摘要，说明服务器能做什么。每次 tools/call 仍在 _meta 中携带本次的 clientCapabilities，并重新检查：缺少 elicitation 会得到指明该项的 -32021；声明它后，调用才会完成。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "server/discover",
        "reason": "MCP 方法名与能力声明的协议字面量"
      },
      {
        "text": "supportedVersions + capabilities + ttlMs",
        "reason": "MCP 方法名与能力声明的协议字面量"
      },
      {
        "text": "clientCapabilities: {}",
        "reason": "MCP 方法名与能力声明的协议字面量"
      },
      {
        "text": "clientCapabilities: {elicitation:{form:{}}}",
        "reason": "MCP 方法名与能力声明的协议字面量"
      }
    ]
  },
  "mcpa-08-schema-contract": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "The Schema Contract": "模式契约",
      "one gate, two ways out": "一个关卡，两条出口",
      "tool: lookup_product": "工具：lookup_product",
      "inputSchema: sku required": "inputSchema：必须提供 sku",
      "outputSchema: 4 fields": "outputSchema：4 个字段",
      "extra properties: refused": "额外属性：拒绝",
      "content[0].text: same JSON": "content[0].text：同一份 JSON",
      "not in tools/list": "未在 tools/list 中声明",
      "A tool definition with inputSchema and outputSchema. Arguments enter a validate gate. A schema failure returns a result with isError true. A pass runs the handler and returns structuredContent plus a text mirror conforming to outputSchema. A tool name the server never advertised takes a separate path to a protocol error, -32602, off to the side of the gate.": "工具定义包含 inputSchema 与 outputSchema。参数进入校验关卡；模式失败返回 isError 为 true 的结果。通过则运行处理器，返回符合 outputSchema 的 structuredContent 与同内容文本。未声明过的工具名称走另一条路径，直接返回协议错误 -32602，不经过关卡。",
      "A schema failure inside a known tool comes back as a normal result with isError true, content the model can read and correct. A tool name the server never advertised comes back as a JSON-RPC protocol error instead, on a separate path that never reaches the handler.": "已知工具内部的模式校验失败，会作为普通结果返回 isError 为 true，模型可阅读并修正其内容。服务器未声明过的工具名称则返回 JSON-RPC 协议错误，走一条从不到达处理器的独立路径。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "validate()",
        "reason": "工具处理与 JSON-RPC 错误的原始协议/代码示例"
      },
      {
        "text": "arguments: {\"sku\": \"X\"}",
        "reason": "工具处理与 JSON-RPC 错误的原始协议/代码示例"
      },
      {
        "text": "result isError: true",
        "reason": "工具处理与 JSON-RPC 错误的原始协议/代码示例"
      },
      {
        "text": "handler(arguments)",
        "reason": "工具处理与 JSON-RPC 错误的原始协议/代码示例"
      },
      {
        "text": "structuredContent: {...}",
        "reason": "工具处理与 JSON-RPC 错误的原始协议/代码示例"
      },
      {
        "text": "name: \"delete_catalog\"",
        "reason": "工具处理与 JSON-RPC 错误的原始协议/代码示例"
      },
      {
        "text": "error -32602 Invalid params",
        "reason": "工具处理与 JSON-RPC 错误的原始协议/代码示例"
      }
    ]
  },
  "mcpa-09-manifest-anatomy": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Manifest Anatomy": "清单结构",
      "three documents, read before the first call": "三份文档，首次调用前阅读",
      "annotations: none": "annotations：无",
      "circle marks a field; the exclamation is one a reviewer should not skip": "圆圈标记字段；感叹号表示审查者不可跳过的项",
      "Three panels: a server/discover result with capabilities and instructions, a tools/list result with a tool's annotations and x-mcp-header, and a registry server.json with its namespaced name. Flagged fields mark what a reviewer checks first: steering instructions, a tool with no annotations, a header exposing a secret-looking parameter, and a name with no namespace.": "三个面板分别展示：包含能力与指令的 server/discover 结果，包含工具注解与 x-mcp-header 的 tools/list 结果，以及注册表中使用命名空间名称的 server.json。标记字段指出应优先审查的内容：行为引导指令、缺少注解的工具、暴露疑似密钥参数的请求头，以及未带命名空间的名称。",
      "A manifest is three documents: what a server claims to support, what it currently offers, and how the registry names it. Marked fields, steering instructions, a tool with no annotations, a header exposing a secret-looking parameter, and a namespace-free name, are the ones a reviewer checks before the first real call.": "清单由三份文档组成：服务器声称支持什么、当前提供什么，以及注册表如何命名它。标记字段、行为引导指令、缺少注解的工具、暴露疑似密钥参数的请求头，以及无命名空间的名称，都应在首次真实调用前检查。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "server/discover",
        "reason": "清单原始字段、协议方法与其示例取值，需与可复制内容一致"
      },
      {
        "text": "capabilities",
        "reason": "清单原始字段、协议方法与其示例取值，需与可复制内容一致"
      },
      {
        "text": "instructions",
        "reason": "清单原始字段、协议方法与其示例取值，需与可复制内容一致"
      },
      {
        "text": "cacheScope, ttlMs",
        "reason": "清单原始字段、协议方法与其示例取值，需与可复制内容一致"
      },
      {
        "text": "tools/list",
        "reason": "清单原始字段、协议方法与其示例取值，需与可复制内容一致"
      },
      {
        "text": "x-mcp-header",
        "reason": "清单原始字段、协议方法与其示例取值，需与可复制内容一致"
      },
      {
        "text": "cacheScope: public",
        "reason": "清单原始字段、协议方法与其示例取值，需与可复制内容一致"
      },
      {
        "text": "name: acme-tools",
        "reason": "清单原始字段、协议方法与其示例取值，需与可复制内容一致"
      },
      {
        "text": "packages: npm",
        "reason": "清单原始字段、协议方法与其示例取值，需与可复制内容一致"
      },
      {
        "text": "remotes: http",
        "reason": "清单原始字段、协议方法与其示例取值，需与可复制内容一致"
      }
    ]
  },
  "mcpa-10-interaction-flow": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Model Interaction Flow": "模型交互流程",
      "context, selection, confirmation, call, and back": "上下文、选择、确认、调用与返回",
      "user asks": "用户提问",
      "host: context": "宿主：上下文",
      "model selects": "模型选择",
      "confirm gate": "确认关卡",
      "server": "服务器",
      "approved": "已批准",
      "held (denied)": "暂停（已拒绝）",
      "denied, never sent": "已拒绝，不发送",
      "retry, corrected args": "重试，修正参数",
      "retry, new id, requestState echoed": "重试，新 id，原样回传 requestState",
      "answer to user": "回答用户",
      "A user request flows through a host that builds model context, a model that selects a tool and drafts arguments, and a confirmation gate. An approved call reaches the server; a denied one is held and never sent. The server can return a complete result that becomes the answer, a tool execution error that sends the model back to correct its arguments, or an input required result that sends the host to gather an answer and retry with a new id and the same requestState.": "用户请求依次经过构建模型上下文的宿主、选择工具并拟定参数的模型，以及确认关卡。批准后调用才到达服务器；拒绝则暂停，永不发送。服务器可返回完整结果形成回答，或返回工具执行错误让模型修正参数；也可返回 input_required，让宿主收集答案，再使用新 id 与相同 requestState 重试。",
      "The loop has one branch the wire never sees: a denied confirmation stops before the client sends anything. Of the branches that reach the server, a tool execution error and an input required result both return control to the model, but only the input required branch is a retry with a new id and an echoed requestState; a protocol error also returns control to the model, with nothing to correct, so the loop does not send it again.": "循环有一条分支从不到达线路：确认被拒绝时，客户端不会发送任何内容。到达服务器的分支中，工具执行错误和 input_required 都把控制权交还模型，但只有 input_required 分支要用新 id 并原样回传 requestState；协议错误也会交还控制权，但没有可修正内容，因此循环不会再次发送。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "complete",
        "reason": "工具结果的协议状态与字段字面量"
      },
      {
        "text": "isError: true",
        "reason": "工具结果的协议状态与字段字面量"
      }
    ]
  },
  "mcpa-11-tool-call": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "The Tools Primitive": "工具原语",
      "one call, five kinds of content, two error channels": "一次调用，五种内容，两条错误通道",
      "Client": "客户端",
      "Server": "服务器",
      "content can hold:": "content 可包含：",
      "and reports:": "并报告：",
      "isError omitted": "省略 isError",
      "A client sends tools/call to a server and gets back a CallToolResult. The result content list can hold text, image, audio, resource_link, or resource blocks. The same result also reports isError, omitted or false on success, true when the tool itself failed.": "客户端向服务器发送 tools/call，收到 CallToolResult。结果的 content 列表可包含 text、image、audio、resource_link 或 resource 内容块。同一结果还报告 isError：成功时省略或为 false，工具自身失败时为 true。",
      "A tools/call request names one tool and its arguments; the CallToolResult that comes back carries a content list built from any mix of the five block types, an optional structuredContent value, and isError. Omitted or false means the call succeeded; true means the tool ran into a problem the model can read and correct.": "tools/call 请求指定一个工具及其参数；返回的 CallToolResult 包含由五种块类型任意组合的 content 列表、可选 structuredContent 值，以及 isError。isError 省略或为 false 表示调用成功；为 true 表示工具遇到模型可阅读并修正的问题。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "tools/call",
        "reason": "MCP 方法、结果类型和内容块判别值，必须与协议示例一致"
      },
      {
        "text": "CallToolResult",
        "reason": "MCP 方法、结果类型和内容块判别值，必须与协议示例一致"
      },
      {
        "text": "text",
        "reason": "MCP 方法、结果类型和内容块判别值，必须与协议示例一致"
      },
      {
        "text": "image",
        "reason": "MCP 方法、结果类型和内容块判别值，必须与协议示例一致"
      },
      {
        "text": "audio",
        "reason": "MCP 方法、结果类型和内容块判别值，必须与协议示例一致"
      },
      {
        "text": "resource",
        "reason": "MCP 方法、结果类型和内容块判别值，必须与协议示例一致"
      },
      {
        "text": "isError: true",
        "reason": "MCP 方法、结果类型和内容块判别值，必须与协议示例一致"
      }
    ]
  },
  "mcpa-12-resource-read": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Reading a Resource": "读取资源",
      "one URI, two lawful outcomes": "一个 URI，两种合法结果",
      "sanitize against root": "按根目录清理路径",
      "then look up the uri": "再查找 URI",
      "expand": "展开",
      "template": "模板",
      "found": "已找到",
      "missing": "不存在",
      "never empty contents[]": "不会返回空 contents[]",
      "sanitize before lookup: a path segment can never resolve outside the project root": "查找前先清理：路径段不可解析到项目根目录之外",
      "A URI template, file colon slash slash slash project slash plus path, expands into a concrete URI, which resources read resolves against the project root. A resource that exists returns a complete result carrying contents, ttlMs, and cacheScope. A resource that is missing, or a path that tries to climb outside the root, returns JSON-RPC error -32602 naming the requested URI in data.uri, never a result with an empty contents array.": "URI 模板 file:///project/{+path} 展开为具体 URI，resources/read 根据项目根目录解析它。存在的资源返回携带 contents、ttlMs 与 cacheScope 的完整结果。资源不存在或路径试图越出根目录时，返回 JSON-RPC 错误 -32602，并在 data.uri 中指明所请求 URI，绝不返回 contents 为空数组的结果。",
      "A URI template expands into a concrete URI, and resources/read sanitizes it against the server's root before any lookup. A resource that exists returns a complete result carrying contents, ttlMs, and cacheScope. A resource that does not exist, or a path that tries to climb outside the root, returns JSON-RPC error -32602 naming the requested URI in data.uri, never a successful result with an empty contents array.": "URI 模板先展开为具体 URI，resources/read 在查找前按服务器根目录清理它。存在的资源返回携带 contents、ttlMs 与 cacheScope 的完整结果。不存在的资源或试图越出根目录的路径，返回 JSON-RPC 错误 -32602，并通过 data.uri 指明所请求 URI，而非返回 contents 为空数组的成功结果。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "resources/read",
        "reason": "资源 URI、路径与资源读取协议字段字面量"
      },
      {
        "text": "file:///project/{+path}",
        "reason": "资源 URI、路径与资源读取协议字段字面量"
      },
      {
        "text": "path = src/app.py",
        "reason": "资源 URI、路径与资源读取协议字段字面量"
      },
      {
        "text": "complete",
        "reason": "资源 URI、路径与资源读取协议字段字面量"
      },
      {
        "text": "contents[]",
        "reason": "资源 URI、路径与资源读取协议字段字面量"
      },
      {
        "text": "ttlMs + cacheScope",
        "reason": "资源 URI、路径与资源读取协议字段字面量"
      },
      {
        "text": "data.uri",
        "reason": "资源 URI、路径与资源读取协议字段字面量"
      }
    ]
  },
  "mcpa-13-prompt-template": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Prompt Template and Completion": "Prompt 模板与补全",
      "arguments fill a template; context narrows suggestions": "参数填入模板；上下文缩小建议范围",
      "prompts/get renders a template": "prompts/get 渲染模板",
      "completion narrows with context": "上下文缩小补全范围",
      "text: {language} snippet,": "text：{language} 代码片段，",
      "follow {framework} style": "遵循 {framework} 风格",
      "rendered: python snippet,": "渲染后：Python 代码片段，",
      "follow flask style": "遵循 Flask 风格",
      "framework \"fa\", no context:": "framework 为“fa”，无上下文：",
      "+ context": "+ 上下文",
      "narrows to: falcon, fastapi": "缩小为：falcon、fastapi",
      "3 matches narrow to 2": "3 个匹配缩小为 2 个",
      "Left: a code_review prompt template fills language and framework placeholders to render its text. Right: completion for the framework argument returns three matches with no context, narrowing to two once context.arguments supplies the chosen language.": "左侧：code_review prompt 模板填入 language 与 framework 占位符后渲染文本。右侧：framework 参数补全在无上下文时返回三个匹配；context.arguments 提供已选 language 后缩小为两个。",
      "A prompt argument fills its placeholder to render PromptMessage content. completion/complete ranks suggestions for one argument, and narrows them further once context.arguments carries an answer already given, such as the chosen language.": "prompt 参数填入占位符，渲染出 PromptMessage 内容。completion/complete 为某个参数排列补全建议；context.arguments 携带已给出的答案（例如选定语言）后，会进一步缩小建议范围。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "language: python",
        "reason": "补全演示中的参数取值与框架名称，保留匹配关系"
      },
      {
        "text": "framework: flask",
        "reason": "补全演示中的参数取值与框架名称，保留匹配关系"
      },
      {
        "text": "falcon, fastapi, fastify",
        "reason": "补全演示中的参数取值与框架名称，保留匹配关系"
      }
    ]
  },
  "mcpa-14-mrtr": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Multi Round-Trip Requests": "多轮往返请求",
      "one call, an input_required pause, a fresh retry that echoes requestState": "一次调用、input_required 暂停，再用原样 requestState 发起新重试",
      "Client": "客户端",
      "Server": "服务器",
      "tools/call (id 1): deploy_release": "工具调用 tools/call（id 1）：deploy_release",
      "input_required: confirm + requestState": "input_required：确认 + requestState",
      "tools/call (id 2): new id, inputResponses": "tools/call（id 2）：新 id、inputResponses",
      "complete: deployed = true": "完成状态 complete：deployed = true",
      "client gathers confirmation from the user": "客户端收集用户确认",
      "A client sends tools/call with id 1. The server ends that request with an input_required result carrying inputRequests and requestState instead of holding a stream open. The client gathers the confirmation from the user, then sends an independent tools/call with a new id 2 that carries inputResponses and echoes requestState exactly. The server replies complete.": "客户端发送 id 为 1 的 tools/call。服务器用携带 inputRequests 与 requestState 的 input_required 结果结束此请求，而非保持流开启。客户端收集用户确认，再发起独立的 tools/call，使用新 id 2，携带 inputResponses，并逐字原样回传 requestState。服务器回复 complete。",
      "The server never pushes a request to the client. It ends the first call with input_required, and the client starts an independent second call, with a new JSON-RPC id, that echoes requestState byte for byte and supplies inputResponses.": "服务器从不向客户端推送请求。它用 input_required 结束首次调用，由客户端发起独立的第二次调用，使用新的 JSON-RPC id，逐字节回传 requestState，并提供 inputResponses。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "requestState",
        "reason": "多轮请求的完整性保护状态字段名"
      }
    ]
  },
  "mcpa-15-deprecation-timeline": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Deprecated, Not Removed": "已弃用，未移除",
      "roots, sampling, and logging keep answering through the removal window": "roots、sampling 与 logging 在移除窗口期间继续响应",
      "Roots": "根目录",
      "Sampling": "采样",
      "Logging": "日志",
      "Deprecated, still on the wire": "已弃用，线路上仍有效",
      "Fully removed": "已完全移除",
      "Deprecated": "已弃用",
      "Eligible for removal": "最早可移除",
      "roots/list (MRTR input request)": "roots/list（MRTR 输入请求）",
      "Timeline from the 2026-07-28 deprecation of roots, sampling, and logging to their earliest possible removal on or after 2027-07-28, each lane solid then dashed to show the feature keeps working past the marker. Below, one column lists roots/list, sampling/createMessage, and per-request logLevel with notifications/message as still valid on the wire, and a second column lists logging/setLevel and notifications/roots/list_changed as already removed.": "时间线从 2026-07-28 宣布弃用 roots、sampling 与 logging，延伸到不早于 2027-07-28 的最早可移除日期。各轨道先为实线、再为虚线，表示功能在标记日期之后仍继续工作。下方左列列出线路上仍有效的 roots/list、sampling/createMessage、逐请求 logLevel 与 notifications/message；右列列出已移除的 logging/setLevel 与 notifications/roots/list_changed。",
      "Deprecated in 2026-07-28 starts a twelve month clock, not a deletion: roots, sampling, and logging keep their exact wire shape past the earliest-removal marker, while logging/setLevel and notifications/roots/list_changed are already gone, replaced by MRTR input requests and a per-request logLevel key.": "2026-07-28 弃用只启动十二个月倒计时，并不等于删除。roots、sampling 与 logging 在最早可移除日期之后仍保留完全相同的线路形式；logging/setLevel 与 notifications/roots/list_changed 则已移除，改用 MRTR 输入请求与逐请求 logLevel 键。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "sampling/createMessage (MRTR)",
        "reason": "弃用窗口内外的真实 MCP 方法与字段名称"
      },
      {
        "text": "logLevel + notifications/message",
        "reason": "弃用窗口内外的真实 MCP 方法与字段名称"
      },
      {
        "text": "logging/setLevel",
        "reason": "弃用窗口内外的真实 MCP 方法与字段名称"
      },
      {
        "text": "notifications/roots/list_changed",
        "reason": "弃用窗口内外的真实 MCP 方法与字段名称"
      }
    ]
  },
  "mcpa-16-subscription-stream": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Notification Streams, Progress, and Cancellation": "通知流、进度与取消",
      "the listen stream tags every message with a subscriptionId; a request’s own progress never does": "listen 流的每条消息都带 subscriptionId；请求自身的进度不带",
      "client": "客户端",
      "server": "服务器",
      "listen id=1: toolsListChanged, config.json": "监听 listen id=1：toolsListChanged、config.json",
      "ack: _meta.subscriptionId=1": "确认：_meta.subscriptionId=1",
      "listen id=2: resourcesListChanged": "监听 listen id=2：resourcesListChanged",
      "ack: _meta.subscriptionId=2": "确认：_meta.subscriptionId=2",
      "progress 0.2, 0.6, 1.0: no subscriptionId": "进度 0.2、0.6、1.0：无 subscriptionId",
      "result id=3: resultType complete": "结果 id=3：resultType complete",
      "late update for sub=2: dropped locally": "sub=2 的迟到更新：本地丢弃",
      "Sequence between a client and a server. The client opens two subscriptions/listen requests, id 1 and id 2; each is acknowledged first with the matching subscriptionId in _meta, then resources/updated and list_changed notifications arrive tagged with that same id so the client can tell them apart. A separate tools/call request runs on its own response channel: its progress notifications carry only a progressToken, never a subscriptionId, and its result arrives on that same request, not on the listen stream. The client then cancels subscription 2 with notifications/cancelled, and a stray update for subscription 2 that arrives afterward is dropped rather than delivered.": "客户端与服务器的时序图。客户端开启 id 为 1 与 2 的两个 subscriptions/listen 请求；服务器先分别确认，在 _meta 中带上匹配的 subscriptionId，再发送带同一 id 的 resources/updated 与 list_changed 通知，供客户端区分。独立的 tools/call 使用自己的响应通道，进度通知只带 progressToken，从不带 subscriptionId，最终结果也经原请求返回，而非 listen 流。客户端随后用 notifications/cancelled 取消订阅 2；取消后到达的订阅 2 更新会被丢弃，而非交付。",
      "Two subscriptions share one channel and are told apart only by the subscriptionId every acknowledgment and notification carries in _meta, matching the id of the subscriptions/listen request that opened it. Progress and the final result for an ordinary call travel on that call’s own response, never on the listen stream, so they never carry a subscriptionId. Cancelling a subscription stops new messages for it; a message already in flight when the cancel lands still arrives and must be dropped, not delivered.": "两个订阅共用一个通道，仅靠每条确认与通知在 _meta 中携带的 subscriptionId 区分；其值等于开启订阅的 subscriptions/listen 请求 id。普通调用的进度与最终结果走该调用自身的响应通道，不走 listen 流，因此从不携带 subscriptionId。取消订阅会停止发送新消息；取消时已经在途的消息仍会到达，客户端必须丢弃而非交付。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "resources/updated, subscriptionId=1",
        "reason": "订阅、进度与取消演示的协议方法和标识值"
      },
      {
        "text": "resources/list_changed, subscriptionId=2",
        "reason": "订阅、进度与取消演示的协议方法和标识值"
      },
      {
        "text": "tools/call id=3, _meta.progressToken=job-42",
        "reason": "订阅、进度与取消演示的协议方法和标识值"
      },
      {
        "text": "notifications/cancelled requestId=2",
        "reason": "订阅、进度与取消演示的协议方法和标识值"
      }
    ]
  },
  "mcpa-17-lifecycle": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "The Tool Invocation Lifecycle": "工具调用生命周期",
      "eight checkpoints, two error channels, one loop back for input_required": "八个检查点、两条错误通道，input_required 触发一次回环",
      "DISCOVER: server/discover": "发现：server/discover",
      "LIST: tools/list, cached": "列举：tools/list，可缓存",
      "SELECT: model picks a tool": "选择：模型选工具",
      "CONFIRM: host approval gate": "确认：宿主批准关卡",
      "CALL: tools/call sent": "调用：发送 tools/call",
      "VALIDATE: is the tool known": "校验：工具是否已知",
      "EXECUTE: validate args, run": "执行：校验参数并运行",
      "RESULT: resultType": "结果：resultType",
      "unknown tool: -32602": "未知工具：-32602",
      "isError (actionable)": "isError（可修正）",
      "complete: final": "complete：最终结果",
      "input_required: retry": "input_required：重试",
      "A vertical chain of eight checkpoints: discover, list, select, confirm, call, validate, execute, result. Validate branches right to an unknown tool -32602 protocol error. Execute branches right to an isError tool execution result. Result branches right to two outcomes: complete, which is final, and input_required, which loops back up to call with a new request id.": "八个检查点纵向排列：发现、列举、选择、确认、调用、校验、执行、结果。校验向右分出未知工具的 -32602 协议错误；执行向右分出 isError 工具执行结果；结果向右分为最终 complete，以及使用新请求 id 回到调用环节的 input_required。",
      "Validate only asks whether the tool exists; failing there is always a protocol error, -32602, with no execute or result stage after it. Everything discovered once execute has started, a bad argument or a business rule, comes back isError inside a normal complete result so the model can read it and retry. A result of input_required is not the end: the client answers it and calls again with a new id, running validate, execute, and result a second time.": "校验只检查工具是否存在；此处失败始终是 -32602 协议错误，之后不会执行工具，也没有结果阶段。执行开始后发现的任何问题，包括参数错误或业务规则，都在普通 complete 结果中用 isError 返回，让模型阅读并修正后重试。input_required 并非结束：客户端回答后，用新 id 再次调用，重新走过校验、执行和结果。"
    },
    "patterns": [],
    "preserve": []
  },
  "mcpa-18-error-taxonomy": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Two Ways for a Request to Fail": "请求失败的两种方式",
      "a protocol error travels as a JSON-RPC error object; a tool problem travels as a normal result with isError true": "协议错误使用 JSON-RPC error 对象；工具问题使用 isError 为 true 的普通结果",
      "two channels answer a failed request; only one of them is content the model reads": "两条通道响应失败请求；其中只有一条提供模型可读内容",
      "protocol error -> JSON-RPC error": "协议错误 -> JSON-RPC error",
      "tool problem -> isError: true": "工具问题 -> isError: true",
      "Method not found": "方法不存在",
      "Invalid params (unknown tool)": "参数无效（未知工具）",
      "API failures": "API 失败",
      "input validation errors": "输入校验错误",
      "business logic refusals": "业务逻辑拒绝",
      "expired server-minted handles": "服务器签发的句柄已过期",
      "content the model reads,": "模型可以阅读的内容，",
      "then retries with a fix": "随后修正并重试",
      "forbidden: -32000 to -32019 legacy, -32002 and -32042 retired": "禁用：旧版 -32000 至 -32019，已停用的 -32002 与 -32042",
      "a 2026-07-28 server must refuse to put any of these on the wire": "2026-07-28 版服务器不得在线路上发送其中任何一个错误码",
      "Left column: five JSON-RPC protocol error codes, -32601 method not found, -32602 invalid params, -32020 header mismatch, -32021 missing required client capability, -32022 unsupported protocol version. Right column: a tool problem card showing API failures, input validation errors, business logic refusals, and expired handles all reported as a result with isError true, which is content the model reads and then retries with a fix. Bottom band: the forbidden zone, -32000 to -32019 legacy and -32002 and -32042 retired, labeled as codes a 2026-07-28 server must refuse to put on the wire.": "左列列出五个 JSON-RPC 协议错误码：-32601 方法不存在、-32602 参数无效、-32020 请求头不匹配、-32021 缺少必要客户端能力、-32022 不支持的协议版本。右列工具问题卡片列出 API 失败、输入校验错误、业务逻辑拒绝与过期句柄，均作为 isError 为 true 的结果返回，供模型阅读并修正后重试。底部禁用区域列出旧版 -32000 至 -32019，以及已停用的 -32002、-32042；2026-07-28 版服务器不得在线路上使用这些错误码。",
      "A protocol error is a JSON-RPC error object the client handles itself. A tool problem is a normal result with isError true, content the model can read and act on. Both are legitimate channels; a code from the forbidden band below is never legitimate, whichever channel would carry it.": "协议错误是由客户端自行处理的 JSON-RPC error 对象。工具问题是 isError 为 true 的普通结果，模型可以阅读并采取行动。这两条通道都合法；下方禁用区中的错误码，无论通过哪条通道传送，都不合法。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "HeaderMismatch",
        "reason": "协议错误类型名称与错误结果的真实字段"
      },
      {
        "text": "MissingRequiredClientCapability",
        "reason": "协议错误类型名称与错误结果的真实字段"
      },
      {
        "text": "UnsupportedProtocolVersion",
        "reason": "协议错误类型名称与错误结果的真实字段"
      },
      {
        "text": "isError: true",
        "reason": "协议错误类型名称与错误结果的真实字段"
      }
    ]
  },
  "mcpa-19-transports": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Transports and Headers": "传输与请求头",
      "the same message, two bindings": "同一消息，两种绑定",
      "STDIO (SUBPROCESS)": "stdio（子进程）",
      "client process": "客户端进程",
      "server (child process)": "服务器（子进程）",
      "STREAMABLE HTTP (POST /mcp)": "Streamable HTTP 传输（POST /mcp）",
      "client (any HTTP peer)": "客户端（任意 HTTP 对端）",
      "server (validate + dispatch)": "服务器（校验 + 分派）",
      "response": "响应",
      "mismatch: 400 + -32020": "不匹配：400 + -32020",
      "protocol semantics are identical on every transport; only the binding differs": "各种传输的协议语义相同，仅绑定方式不同",
      "stdio has no header layer: version and capabilities travel only in _meta": "stdio 没有请求头层：版本与能力仅在 _meta 中传送",
      "HTTP mirrors method, name, and x-mcp-header params; a mismatch is 400 + -32020": "HTTP 镜像 method、name 与 x-mcp-header 参数；不匹配则返回 400 + -32020",
      "Left: stdio transport between a client and a child server process, connected by a stdin line down, a stdout line up, and a dashed stderr line up, with no header layer at all. Right: Streamable HTTP, where a client posts to the server and the server posts back a response; a checkpoint on the request arrow marks where mismatched headers are rejected with HTTP 400 and error code -32020.": "左侧：客户端与子进程服务器通过 stdio 通信，stdin 向下、stdout 向上、stderr 用虚线单独向上，完全没有请求头层。右侧：Streamable HTTP 中客户端向服务器发送 POST，服务器返回响应；请求箭头上的检查点表示请求头不匹配时，以 HTTP 400 与错误码 -32020 拒绝。",
      "stdio carries every message inline over stdin and stdout, with logs on a separate stderr line and no header layer at all. Streamable HTTP mirrors the method, the tool or resource name, and any x-mcp-header argument into headers so a gateway can route without parsing the body, but the body stays the source of truth: a header that disagrees with it is rejected with HTTP 400 and a HeaderMismatch (-32020) error before the tool ever runs.": "stdio 在 stdin 与 stdout 中逐行承载消息，日志独走 stderr，完全没有请求头层。Streamable HTTP 将方法、工具或资源名称，以及 x-mcp-header 参数镜像到请求头，让网关无需解析正文即可路由；但正文始终是唯一事实来源。请求头若与正文不一致，会在工具运行前以 HTTP 400 与 HeaderMismatch（-32020）拒绝。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "stdin",
        "reason": "标准流名称与 HTTP 传输绑定的请求方法/路径"
      },
      {
        "text": "stdout",
        "reason": "标准流名称与 HTTP 传输绑定的请求方法/路径"
      },
      {
        "text": "stderr",
        "reason": "标准流名称与 HTTP 传输绑定的请求方法/路径"
      },
      {
        "text": "POST /mcp",
        "reason": "标准流名称与 HTTP 传输绑定的请求方法/路径"
      }
    ]
  },
  "mcpa-20-cache-freshness": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Cache Freshness": "缓存新鲜度",
      "a TTL window ends on the clock, unless a notification ends it first": "TTL 窗口按时钟到期，也可能被通知提前结束",
      "A. TTL alone: fresh until t_received + ttlMs": "A. 仅 TTL：到 t_received + ttlMs 前保持有效",
      "B. Notification during the window: stale immediately": "B. 窗口内收到通知：立即失效",
      "fresh": "有效",
      "stale": "失效",
      "list_changed notification": "list_changed 通知",
      "ttl would end here": "TTL 原本在此到期",
      "Two timelines that share the same t_received. In scenario A the cached response stays fresh until t_received plus ttlMs, then goes stale. In scenario B a list_changed notification arrives before the TTL would have expired, and the response goes stale immediately at the notification, leaving the remaining TTL unused.": "两条时间线共用同一个 t_received。场景 A 中，缓存响应一直有效，直到 t_received 加 ttlMs 时失效。场景 B 中，list_changed 通知在 TTL 到期前到达，响应立即失效，剩余 TTL 不再使用。",
      "A cached response stays fresh until its ttlMs runs out, but a relevant list_changed notification invalidates it immediately on arrival, even with time left on the clock. TTL and notifications are complementary, not competing.": "缓存响应在 ttlMs 到期前保持有效，但相关 list_changed 通知一到达就立即使其失效，即使 TTL 尚未用完。TTL 与通知是互补机制，而非竞争关系。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "t_received + ttlMs",
        "reason": "缓存到期时间的原始计算表达式"
      }
    ]
  },
  "mcpa-21-task-states": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Task Status Lifecycle": "任务状态生命周期",
      "working pauses at input_required until tasks/update resumes it, then ends in one terminal status": "working 在 input_required 暂停，直到 tasks/update 恢复，最终进入一个终态",
      "needs input": "需要输入",
      "work finishes": "工作结束",
      "protocol error": "协议错误",
      "State diagram of an MCP task. Working moves to input_required when the server needs client input, and back to working after a tasks/update call. Working moves to completed when the work finishes, to cancelled after tasks/cancel, or to failed on a protocol error. Completed, cancelled, and failed are terminal and shown with a dashed border.": "MCP 任务状态图。服务器需要客户端输入时，working 转为 input_required；tasks/update 调用后返回 working。工作结束转为 completed，tasks/cancel 后转为 cancelled，协议错误则转为 failed。completed、cancelled 与 failed 是终态，用虚线边框展示。",
      "Every tasks/get poll repeats a working snapshot until a terminal status arrives; that self-loop is not drawn. A cancel or a protocol error can also end a task directly from input_required. SEP-2663 inlines the completed result and the failed error into this same tasks/get response; there is no separate tasks/result call.": "每次 tasks/get 轮询都会重复 working 快照，直到终态到达；图中未画出该自环。取消或协议错误也可直接从 input_required 结束任务。SEP-2663 将完成结果与失败错误直接内嵌在同一 tasks/get 响应中，不存在独立 tasks/result 调用。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "working",
        "reason": "官方任务扩展的状态枚举与方法名，需与线路内容一致"
      },
      {
        "text": "completed",
        "reason": "官方任务扩展的状态枚举与方法名，需与线路内容一致"
      },
      {
        "text": "cancelled",
        "reason": "官方任务扩展的状态枚举与方法名，需与线路内容一致"
      },
      {
        "text": "failed",
        "reason": "官方任务扩展的状态枚举与方法名，需与线路内容一致"
      },
      {
        "text": "tasks/update",
        "reason": "官方任务扩展的状态枚举与方法名，需与线路内容一致"
      },
      {
        "text": "tasks/cancel",
        "reason": "官方任务扩展的状态枚举与方法名，需与线路内容一致"
      }
    ]
  },
  "mcpa-22-trust-zones": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Trust Zones in an MCP Exchange": "MCP 交换中的信任域",
      "host and client trusted, server and upstream untrusted, the model reads only labeled content": "宿主与客户端可信，服务器与上游不可信，模型仅读取已标记内容",
      "trusted zone": "可信域",
      "untrusted zone": "不可信域",
      "trust boundary": "信任边界",
      "host": "宿主",
      "the user's app": "用户的应用",
      "client": "客户端",
      "one per server": "每个服务器对应一个",
      "server": "服务器",
      "third party": "第三方",
      "upstream systems": "上游系统",
      "once removed": "再隔一层",
      "model": "模型",
      "sees labeled data": "读取已标记数据",
      "trust filter": "信任过滤器",
      "Host, client, and model sit inside a trusted zone on the left, connected by short arrows. A dashed trust boundary separates them from the server zone on the right. A request crosses the boundary to the server. Content returning from the server crosses back through a trust filter marked untrusted before the model reads it. The server connects onward to upstream systems that the client never sees directly.": "宿主、客户端与模型位于左侧可信域，之间用短箭头连接。虚线信任边界将它们与右侧服务器域分开。请求跨边界发送到服务器，返回内容在模型读取前经过信任过滤器，被标记为不可信。服务器还可连接客户端从不直接接触的上游系统。",
      "The host and the client it owns sit with the model inside one trust domain. A request crosses the dashed boundary to reach the server; whatever the server returns crosses back through the trust filter, marked untrusted, before the model reads it. The server may reach further upstream systems that the client never observes directly.": "宿主、它拥有的客户端及模型位于同一个信任域。请求跨越虚线边界到达服务器；无论服务器返回什么，都先穿过信任过滤器并标记为不可信，再交给模型读取。服务器还可能访问客户端从未直接观察到的更上游系统。"
    },
    "patterns": [],
    "preserve": []
  },
  "mcpa-23-oauth-flow": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Authorizing an MCP Request": "授权 MCP 请求",
      "a 401, a round trip to the authorization server, then a bearer-authenticated retry": "先收到 401，再往返授权服务器，最后携带 Bearer 认证重试",
      "1. tools/call with no token": "1. 不带 token 的 tools/call",
      "client": "客户端",
      "mcp server": "MCP 服务器",
      "tools/call, no Authorization header": "tools/call，无 Authorization 请求头",
      "2. discover, PKCE, authorize": "2. 发现、PKCE、授权",
      "auth server": "授权服务器",
      "PRM + AS metadata + S256 challenge + resource + state": "PRM + AS 元数据 + S256 挑战 + resource + state",
      "code + iss checked against the recorded issuer": "code + iss，与记录的签发者核对",
      "3. retry with a bearer token": "3. 携带 Bearer token 重试",
      "200, resultType complete (audience validated)": "200，resultType complete（已校验受众）",
      "Three lanes. Top: the client calls tools/call with no token and the server replies HTTP 401 with a WWW-Authenticate header naming the Protected Resource Metadata URL, no JSON-RPC body. Middle: the client discovers Protected Resource Metadata and authorization server metadata, generates a PKCE S256 pair, and the authorization server returns a code and an iss value the client checks against what it recorded. Bottom: the client retries the same tools/call with an Authorization Bearer header and the server returns a complete result after validating the token audience.": "三条轨道。上方：客户端不带 token 调用 tools/call，服务器返回 HTTP 401，WWW-Authenticate 请求头指定受保护资源元数据 URL，无 JSON-RPC 正文。中间：客户端发现受保护资源与授权服务器元数据，生成 PKCE S256 配对；授权服务器返回 code 与 iss，客户端将 iss 与此前记录核对。下方：客户端用 Authorization Bearer 请求头重试同一次 tools/call，服务器校验 token 受众后返回 complete 结果。",
      "Rejection happens at the HTTP layer with no JSON-RPC body. The middle lane resolves entirely outside the MCP wire: Protected Resource Metadata, authorization server metadata, PKCE, and an iss check the client applies itself. Only the retried tools/call, now carrying a bearer token whose audience matches this server, reaches the tool.": "拒绝发生在 HTTP 层，没有 JSON-RPC 正文。中间轨道完全位于 MCP 线路之外，包括受保护资源元数据、授权服务器元数据、PKCE，以及客户端自行执行的 iss 检查。只有重试的 tools/call，携带受众与当前服务器匹配的 Bearer token，才会到达工具。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "401 + WWW-Authenticate: resource_metadata=...",
        "reason": "OAuth 质询与 Bearer 认证的原始 HTTP 请求头字面量"
      },
      {
        "text": "tools/call, Authorization: Bearer <token>",
        "reason": "OAuth 质询与 Bearer 认证的原始 HTTP 请求头字面量"
      }
    ]
  },
  "mcpa-24-registration-paths": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Client Registration Paths": "客户端注册路径",
      "priority order for a client an authorization server has never met": "授权服务器从未见过的客户端所用的优先顺序",
      "Pre-registered credentials": "预先注册的凭证",
      "client id already on file": "已登记客户端 id",
      "if unavailable": "若不可用",
      "Client ID Metadata Document": "客户端 ID 元数据文档",
      "AS advertises CIMD support": "AS 声明支持 CIMD",
      "Dynamic Client Registration": "动态客户端注册",
      "deprecated fallback via DCR": "经已弃用的 DCR 回退",
      "Ask the user": "询问用户",
      "no automated path available": "没有可用自动路径",
      "a CIMD checked like this": "CIMD 检查如下",
      "client_id equals the URL": "client_id 等于 URL",
      "https scheme with a path": "使用 HTTPS 且包含路径",
      "redirect_uris validated": "已校验 redirect_uris",
      "kept keyed by issuer": "按签发者分别保存",
      "A four step priority ladder: pre-registered credentials, Client ID Metadata Document, Dynamic Client Registration marked deprecated, and asking the user, each tried in order when the one above is unavailable. Beside it, a checklist of what an authorization server verifies in a Client ID Metadata Document and why credentials are kept per issuer.": "四级优先阶梯：预先注册凭证、客户端 ID 元数据文档、已弃用的动态客户端注册，以及询问用户。上一级不可用时才尝试下一级。旁边的检查表展示授权服务器应如何验证客户端 ID 元数据文档，以及为何要按签发者分别保存凭证。",
      "A client tries each path in order and stops at the first one available: pre-registered credentials, then a Client ID Metadata Document if the authorization server advertises it, then Dynamic Client Registration as a deprecated fallback, then asking the user. Credentials from any path are kept keyed by the issuing authorization server and are never reused against a different one.": "客户端依次尝试各条路径，在第一条可用路径处停止：预先注册凭证；若授权服务器声明支持，则使用客户端 ID 元数据文档；再以已弃用的动态客户端注册作后备；最后询问用户。任何路径获得的凭证都按签发它的授权服务器保存，绝不跨签发者复用。"
    },
    "patterns": [],
    "preserve": []
  },
  "mcpa-25-consent-gates": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Consent and Least Privilege": "用户同意与最小权限",
      "one tools/call, two independent gates before it runs": "一次 tools/call，运行前经过两道独立关卡",
      "client sends": "客户端发送",
      "scope check": "作用域检查",
      "403 if short": "不足则返回 403",
      "consent check": "同意检查",
      "403: union + retry": "403：取并集后重试",
      "scope ok": "作用域满足",
      "no consent: elicit, retry": "未同意：征询后重试",
      "consent ok": "已获同意",
      "tool runs": "工具运行",
      "A client tools/call first meets a scope check. Insufficient scope returns HTTP 403 and the client retries with the union of its old and challenged scopes. Once scope is sufficient the call meets a consent check. If consent is required the server returns input_required and the client retries after an elicitation round trip. Only then does the tool run.": "客户端 tools/call 首先遇到作用域检查。作用域不足返回 HTTP 403，客户端用原有作用域与新质询作用域的并集重试。作用域满足后再检查同意；若需要用户同意，服务器返回 input_required，客户端完成一轮征询后重试。工具直到此时才运行。",
      "A tools/call meets the scope gate first: insufficient scope comes back as HTTP 403, and the client retries with the union of its old and newly challenged scopes, capped at a few attempts. Only once scope clears does the call meet the consent gate: a tool needing approval comes back input_required, and the client retries after an elicitation round trip. Either gate can turn a call away on its own.": "tools/call 先过作用域关卡：不足时得到 HTTP 403，客户端将原作用域与新质询作用域取并集，进行次数受限的重试。作用域满足后才过同意关卡：需要批准的工具返回 input_required，客户端完成一轮征询后重试。任何一条关卡都可以独立拒绝调用。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "tools/call",
        "reason": "工具调用方法和成功结果字段字面量"
      },
      {
        "text": "isError: false",
        "reason": "工具调用方法和成功结果字段字面量"
      }
    ]
  },
  "mcpa-26-attack-surface": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Attack Surface Around a Tool Call": "工具调用周围的攻击面",
      "eight threats a gateway still faces after consent and OAuth are both correct": "同意与 OAuth 均正确后，网关仍面临八类威胁",
      "gateway": "网关",
      "pin . scan . limit": "固定版本 · 扫描 · 限制",
      "poisoned description": "描述投毒",
      "rug pull": "定义突变",
      "tool shadowing": "工具名称遮蔽",
      "token passthrough": "token 透传",
      "requestState tamper": "requestState 篡改",
      "network $ref (SSRF)": "网络 $ref（SSRF）",
      "DNS rebinding": "DNS 重绑定",
      "supply chain drift": "供应链漂移",
      "A central gateway node surrounded by eight labeled threats: poisoned description, rug pull, tool shadowing, token passthrough, requestState tamper, network dollar-ref SSRF, DNS rebinding, and supply chain drift, each connected to the gateway by a spoke.": "中央网关节点周围分布八类标记威胁：描述投毒、定义突变、工具名称遮蔽、token 透传、requestState 篡改、网络 $ref 导致的 SSRF、DNS 重绑定和供应链漂移。每类威胁通过辐条连接到网关。",
      "Each spoke names one threat this lesson covers. The gateway at the center holds the controls that answer them: definition pinning and quarantine for rug pulls, an injection scanner for poisoned descriptions, server-qualified names against shadowing, audience validation against passthrough, integrity-protected state, a refusal to auto-dereference network references, and admission pinning against supply chain drift, so no single control has to catch everything alone.": "每条辐条表示本课涉及的一类威胁。中央网关持有对应控制措施：固定定义与隔离应对定义突变，注入扫描应对描述投毒，服务器限定名称防止遮蔽，受众校验阻止 token 透传，完整性保护状态，拒绝自动解析网络引用，以及通过准入版本固定防止供应链漂移。无需让任何一个控制措施独自捕获所有问题。"
    },
    "patterns": [],
    "preserve": []
  },
  "mcpa-27-trace-propagation": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Trace Propagation and the Audit Chain": "轨迹传播与审计链",
      "one trace id, three programs, two independent logs": "一个 trace id、三个程序、两份独立日志",
      "client": "客户端",
      "own audit log": "自己的审计日志",
      "same trace id above, its own hash chain below": "上方共享 trace id，下方各有独立哈希链",
      "A client calls ops-desk, which calls credential-vault. Both arrows carry the same trace id and a different span id per hop. Below ops-desk and credential-vault, two separate three-entry hash chains represent each server keeping its own independent audit log.": "客户端调用 ops-desk，后者调用 credential-vault。两条箭头携带相同 trace id，各跳使用不同 span id。ops-desk 与 credential-vault 下方各有独立的三条目哈希链，表示每个服务器保存自己的审计日志。",
      "The trace id stays constant across both hops while each arrow mints its own span id. ops-desk and credential-vault each keep an independent, hash-chained audit log: neither log reads or writes the other’s entries, so the only thing that ties one server’s entry to the other’s is a shared trace id, never a shared request id.": "两跳保持相同 trace id，每条箭头单独创建 span id。ops-desk 与 credential-vault 各自保存独立、哈希链式的审计日志：任一日志都不读写另一日志的条目。因此，关联两个服务器条目的只能是共享 trace id，从不会是共享 request id。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "ops-desk",
        "reason": "示例服务名称、trace id 与 span id 字面量，需保持跨跳关联"
      },
      {
        "text": "cred-vault",
        "reason": "示例服务名称、trace id 与 span id 字面量，需保持跨跳关联"
      },
      {
        "text": "trace a1e4c9d0",
        "reason": "示例服务名称、trace id 与 span id 字面量，需保持跨跳关联"
      },
      {
        "text": "span 5f2b8e13",
        "reason": "示例服务名称、trace id 与 span id 字面量，需保持跨跳关联"
      },
      {
        "text": "span d40a7c66",
        "reason": "示例服务名称、trace id 与 span id 字面量，需保持跨跳关联"
      }
    ]
  },
  "mcpa-28-roles-map": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Roles Map": "职责映射",
      "the same MUST, three deployments, two different owners": "相同的必须要求，三种部署，两类责任主体",
      "author: discover": "作者：发现接口",
      "operator: env creds": "运维者：环境凭证",
      "user: can deny call": "用户：可拒绝调用",
      "http, no gateway": "HTTP，无网关",
      "author: PRM, origin": "作者：PRM、Origin",
      "client: RFC 8707": "客户端：RFC 8707",
      "governance: tokens": "治理方：token",
      "gateway-fronted": "网关前置",
      "operator: origin": "运维者：Origin",
      "author: keeps PRM": "作者：仍负责 PRM",
      "circle marks the owner; the flagged row is the requirement that changes owner": "圆圈标记责任主体；标记行表示责任归属会变化的要求",
      "Three panels: stdio, plain HTTP with no gateway, and a gateway-fronted deployment. Each panel names which role owns a sample of that shape's MUST and SHOULD requirements. The origin validation requirement is flagged in both HTTP panels: the server author owns it under plain HTTP, but ownership moves to the platform or gateway operator once a gateway sits in front of the server.": "三个面板分别为 stdio、无网关的普通 HTTP，以及网关前置部署。各面板列出相应形态下部分必须与建议要求的责任主体。两个 HTTP 面板都标记了 Origin 校验要求：普通 HTTP 中由服务器作者负责；服务器前有网关时，责任转移给平台或网关运维者。",
      "Adoption changes who signs up for a MUST, not whether it still applies. Origin validation is a server MUST in every HTTP-reachable deployment; plain HTTP leaves it with the server author, and a gateway-fronted deployment moves it to the platform or gateway operator who terminates the connection first.": "部署形态改变的是由谁承担必须要求，而非要求是否仍适用。所有 HTTP 可达部署中，Origin 校验都是服务器的必须要求；普通 HTTP 由服务器作者负责，网关前置部署则由首先终止连接的平台或网关运维者负责。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "stdio",
        "reason": "MCP 传输绑定名称"
      }
    ]
  },
  "mcpa-29-use-case-matrix": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Operational Use Case Matrix": "运维应用场景矩阵",
      "six scenarios, four questions each": "六种场景，每种回答四个问题",
      "use case": "应用场景",
      "primitive": "原语",
      "transport": "传输",
      "extension": "扩展",
      "developer tools": "开发工具",
      "tool": "工具",
      "none": "无",
      "data access": "数据访问",
      "resource": "资源",
      "long job": "长任务",
      "interactive UI": "交互界面",
      "reusable flow": "可复用流程",
      "M2M sync": "机器间同步",
      "http stands for streamable-http;": "http 表示 streamable-http；",
      "auth-cc stands for the OAuth client credentials extension": "auth-cc 表示 OAuth 客户端凭证扩展",
      "A table of six operational use cases (developer tools, data access, long job, interactive UI, reusable flow, machine to machine sync) against the MCP primitive, transport, and extension each one recommends. Developer tools takes a tool over stdio with no extension. Data access takes a resource over HTTP. A long job takes a tool with the tasks extension. An interactive UI takes a tool with the MCP Apps ui extension. A reusable flow takes a prompt with the skills extension. Machine to machine sync takes a tool with the OAuth client credentials extension.": "表格将六种运维场景——开发工具、数据访问、长任务、交互界面、可复用流程与机器间同步——与推荐的 MCP 原语、传输及扩展对应。开发工具使用 stdio 工具，无扩展；数据访问用 HTTP 资源；长任务用带 tasks 扩展的工具；交互界面用带 MCP Apps ui 扩展的工具；可复用流程用带 skills 扩展的 prompt；机器间同步用带 OAuth 客户端凭证扩展的工具。",
      "Four questions, who initiates the call, how sensitive is the data, how long does it run, and does it need an interactive surface, pick the primitive, the transport, the auth path, and the extension for each use case in this lesson's catalog.": "本课目录中的每种应用场景，都根据四个问题选择原语、传输、授权路径与扩展：谁发起调用，数据有多敏感，运行多久，以及是否需要交互界面。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "stdio",
        "reason": "场景矩阵使用的官方传输与扩展标识"
      },
      {
        "text": "tasks",
        "reason": "场景矩阵使用的官方传输与扩展标识"
      },
      {
        "text": "skills",
        "reason": "场景矩阵使用的官方传输与扩展标识"
      },
      {
        "text": "auth-cc",
        "reason": "场景矩阵使用的官方传输与扩展标识"
      }
    ]
  },
  "mcpa-30-extension-negotiation": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "The Extensions Framework": "扩展框架",
      "per-request negotiation, then activate, fall back, or reject": "逐请求协商，然后启用、回退或拒绝",
      "client _meta declares": "客户端在 _meta 中声明",
      "server capabilities declares": "服务器在 capabilities 中声明",
      "active: com.example/priority-routing": "已启用：com.example/priority-routing",
      "both sides declare an optional extension: it activates, response is enhanced": "双方都声明可选扩展：启用扩展，增强响应",
      "only one side declares it: the call falls back to core behavior": "只有一方声明：调用回退到核心行为",
      "required but not mutually active: the call is rejected, -32021": "必需扩展未被双方共同启用：调用被拒绝，-32021",
      "Two boxes show what the client declares in its per-request clientCapabilities.extensions and what the server declares in its server/discover capabilities.extensions. A solid line converges the identifier present in both into an active box; dashed lines show identifiers only one side declared. Below, three outcomes: both sides declaring an optional extension gives an enhanced response, only one side declaring it gives a core fallback, and a required extension that is not mutually active is rejected with -32021.": "两个方框分别展示客户端在每次请求的 clientCapabilities.extensions 中声明什么，以及服务器在 server/discover 的 capabilities.extensions 中声明什么。实线将双方共同声明的标识汇入启用框；虚线表示仅一方声明的标识。下方有三种结果：双方声明可选扩展则增强响应；仅一方声明则回退到核心行为；必需扩展未共同启用则以 -32021 拒绝。",
      "The client declares extensions in _meta['io.modelcontextprotocol/clientCapabilities'].extensions on every request; the server declares its own in server/discover capabilities.extensions. Only an identifier both sides name becomes active. An unmatched optional extension falls back to core behavior; an unmatched mandatory extension gets MissingRequiredClientCapability, -32021, naming what was needed.": "客户端在每次请求的 _meta['io.modelcontextprotocol/clientCapabilities'].extensions 中声明扩展，服务器在 server/discover 的 capabilities.extensions 中声明自身扩展。只有双方都列出的标识才启用。不匹配的可选扩展回退到核心行为；不匹配的必需扩展返回 MissingRequiredClientCapability（-32021），指明所需能力。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "io.modelcontextprotocol/ui",
        "reason": "扩展命名空间标识，双方协商时必须逐字相等"
      },
      {
        "text": "com.example/priority-routing",
        "reason": "扩展命名空间标识，双方协商时必须逐字相等"
      },
      {
        "text": "io.modelcontextprotocol/tasks",
        "reason": "扩展命名空间标识，双方协商时必须逐字相等"
      }
    ]
  },
  "mcpa-31-app-sandbox": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Rendering an Interactive Interface": "渲染交互界面",
      "negotiate, review, then render or fall back": "协商、审查，然后渲染或回退",
      "negotiate the ui extension per request, then review before rendering": "每次请求协商 ui 扩展，渲染前先审查",
      "server": "服务器",
      "tool + ui": "工具 + ui",
      "review": "审查",
      "mime + csp": "MIME 类型 + CSP 策略",
      "consent": "用户同意",
      "tool call": "工具调用",
      "review passes": "审查通过",
      "app view": "应用视图",
      "in sandbox": "位于沙箱内",
      "app requests call": "应用请求调用",
      "tools/call, new id": "tools/call，新 id",
      "reject": "拒绝",
      "fallback": "回退",
      "no ui ext": "无 ui 扩展",
      "A tool's ui resource flows from the server through a host review of its mime type and CSP origins, either rendering inside a sandboxed iframe that requests further tool calls through a consent gate back to the server, or falling back to plain text when the extension is not declared or the review fails.": "工具的 ui 资源从服务器流入宿主，宿主审查其 MIME 类型与 CSP 源站；通过则在沙箱 iframe 中渲染，后续工具调用仍须经同意关卡送回服务器；若未声明扩展或审查失败，则回退到纯文本。",
      "A tool's ui:// resource only becomes a sandboxed app after the host checks its mime type and CSP origins against its own allowlist; failing either check, or never declaring the extension at all, routes to the same text fallback every tool already returns. An app-initiated tool call still crosses the host's consent gate before it reaches the server as an ordinary tools/call.": "工具的 ui:// 资源只有在宿主按自身允许列表检查 MIME 类型与 CSP 源站后，才会成为沙箱应用；任何一项失败，或根本未声明该扩展，都会走向每个工具原本就返回的文本回退路径。应用发起的工具调用在作为普通 tools/call 到达服务器前，仍须经过宿主的同意关卡。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "resources/read",
        "reason": "获取界面资源的 MCP 方法名"
      }
    ]
  },
  "mcpa-32-registry-flow": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Finding, Routing To, and Trusting a Server": "发现、路由与信任服务器",
      "registry admission, gateway header checks, and SDK tiers as three separate gates": "注册表准入、网关请求头检查与 SDK 分级是三道独立关卡",
      "Publisher": "发布者",
      "proves owner": "证明所有权",
      "Registry": "注册表",
      "Aggregator": "聚合器",
      "polls hourly": "每小时轮询",
      "Client": "客户端",
      "the caller": "调用方",
      "Gateway": "网关",
      "header = body?": "请求头 = 正文？",
      "Backend": "后端",
      "Tier 1 SDK": "第 1 级 SDK",
      "public listings only; the registry is a preview": "仅公开条目；注册表处于预览阶段",
      "SDK conformance tiers, checked continuously": "SDK 一致性分级，持续检查",
      "verified": "已验证",
      "polled": "已轮询",
      "match": "匹配",
      "mismatch": "不匹配",
      "header != body": "请求头 != 正文",
      "Tier 1": "第 1 级",
      "100% conformance": "100% 一致性",
      "Tier 2": "第 2 级",
      "80% conformance": "80% 一致性",
      "Tier 3": "第 3 级",
      "experimental": "实验性",
      "A publisher proves namespace ownership before the registry admits a server.json entry, which an aggregator polls on its own schedule. Separately, a client request to a gateway is routed only after its Mcp-Method and Mcp-Name headers are checked against the request body: a match reaches a Tier 1 backend, a mismatch is rejected as error -32020 before any backend is touched. Below, three SDK conformance tier badges show the pass rate each tier requires, checked continuously rather than once.": "发布者先证明命名空间所有权，注册表才接纳 server.json 条目，聚合器按自己的时间表轮询它。独立地，客户端到网关的请求只有在 Mcp-Method 与 Mcp-Name 请求头与正文核对后才会路由：匹配则到达第 1 级后端，不匹配在接触任何后端前就以 -32020 拒绝。下方三个 SDK 一致性等级标记各级所需通过率；检查持续进行，而非仅执行一次。",
      "A verified namespace gets a server.json into the registry, where only an aggregator reads it on its own schedule. That is unrelated to whether any one request later reaches a backend: a gateway checks Mcp-Method and Mcp-Name against the request body first, routes a match to the backend, and rejects a mismatch as -32020 before it goes further. An SDK tier badge is a third, independent fact, re-measured continuously rather than granted once.": "验证过的命名空间才能将 server.json 放入注册表，聚合器按自己的时间表读取它。某个请求后来是否到达后端，与此是独立问题：网关先核对 Mcp-Method、Mcp-Name 与正文，匹配才路由，不匹配先返回 -32020。SDK 等级标记则是第三个独立事实，需要持续复测，而非授予一次后永久有效。"
    },
    "patterns": [],
    "preserve": []
  },
  "mcpa-33-capstone-flow": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "Capstone Exchange": "综合项目交换流程",
      "discovery through consent, a task, and an audited result": "从发现、同意、任务到已审计结果",
      "traceparent: one trace id end to end": "traceparent：端到端共用 trace id",
      "discover": "发现",
      "schema check": "模式检查",
      "MRTR consent": "MRTR 同意",
      "task poll": "任务轮询",
      "audited result": "已审计结果",
      "audit log:": "审计日志：",
      "verify: ok": "验证：成功",
      "OAuth: audience checked": "OAuth：已校验受众",
      "A capstone exchange: server discover feeds a schema check, an MRTR consent round trip, a task that is polled to completion, and an audited result. A dashed line beneath the pipeline shows one trace id propagated across every stage. Below that, a four entry hash chained audit log verifies, and a separate OAuth audience check gates one HTTP call.": "综合项目交换流程：服务器发现依次进入模式检查、MRTR 同意往返、轮询直至完成的任务，以及已审计结果。流水线下方虚线表示同一 trace id 跨越全部阶段。再下方展示可通过验证的四条目哈希链审计日志，独立的 OAuth 受众检查则控制一次 HTTP 调用。",
      "One incident response exchange touches every domain at once: discovery with cache hints, a schema check that returns isError before it ever asks for consent, an MRTR round trip protected by an HMAC signed requestState, a task polled to completion, and a result. The same trace id threads every hop, an OAuth audience check gates the one HTTP call, and a hash chained audit log records the outcome of each step and still verifies at the end.": "一次事件响应交换同时涉及所有领域：带缓存提示的发现、在征求同意前就能返回 isError 的模式检查、由 HMAC 签名 requestState 保护的 MRTR 往返、轮询直至完成的任务，以及结果。同一个 trace id 串起每一跳，OAuth 受众检查控制其中一次 HTTP 调用，哈希链审计日志记录每步结果，并在最终仍能通过验证。"
    },
    "patterns": [],
    "preserve": []
  }
};
