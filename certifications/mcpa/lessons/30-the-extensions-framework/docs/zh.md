# 扩展框架

> 扩展是一种双方都不必支持的能力：标识符必须带厂商前缀，每次请求都要在元数据中重新声明，即使对方忽略它也应安全无害。这样，核心协议无需为了某家厂商的想法不断膨胀。

**类型：** Reference
**语言：** Python
**前置要求：** 第 29 课
**预计时间：** 约 45 分钟

## 学习目标

- 根据强制厂商前缀判断扩展标识符是否规范，并说出一个真实的官方扩展和第三方扩展
- 说明客户端和服务器分别在哪里声明扩展支持，以及为什么双方都在每次请求的 `_meta` 中声明，而不是只握手一次
- 根据客户端请求启用的扩展与服务器实际支持的扩展，计算本次请求的活跃扩展集合
- 应用优雅降级：可选扩展不可用时回退到核心行为；必要扩展未被双方共同激活时拒绝请求
- 追踪扩展从 Extensions Track SEP、实验仓库到官方标识符的生命周期，并说明哪些变更会迫使扩展使用新标识符

## 问题背景

MCP 核心规范必须保持为每种实现都能完整支持的公共基础。正是这项保证，让任何客户端都能发现并驱动一个从未见过的服务器。但真实部署总会需要一些不适合为所有人写进核心规范的东西：让工具渲染交互图表，而不是吐出一堵文字墙；移交耗时任务，稍后再轮询；不经过浏览器的机器间身份验证；发布可复用的操作手册，而不是一个个临时工具。如果核心协议把这些需求全部吸收进来，规范就会无休止地增长。两年前构建的服务器，可能只因为规范加入了它从未要求、也根本不需要的功能，就悄悄失去“完整实现 MCP”的资格。

没有统一约定便自行发明这些能力，结果比没有能力更糟。假设两家厂商都想让服务器渲染 UI，却各自选择不同的 `_meta` 字段名；客户端无法可靠询问服务器是否理解某个字段，安全审查者也找不到一个统一入口来确认字段究竟代表什么。具体的失败场景是：服务器团队希望在调用方支持时返回更丰富的响应，但基础规范没有告诉他们如何公布这种能力，旧客户端可能被从未见过的字段弄崩；客户端团队读到某项功能并准备据此组织请求，却无法事先判断眼前这台服务器在这一次调用中是否真的实现了它。

## 核心概念

MCP 扩展是对规范的可选补充：它提供核心协议之外的能力，双方都可以实现，也可以不实现；它的命名方式能避免无关厂商发生冲突。标识符形式为 `{vendor-prefix}/{extension-name}`，前缀不能省略。其格式遵循 `_meta` 键的规则，但这里强制要求前缀。由 MCP 自身维护的官方扩展使用 `io.modelcontextprotocol` 前缀，例如 `io.modelcontextprotocol/oauth-client-credentials`。其他扩展应使用作者实际控制域名的反写形式，与 Java 包命名惯例相同。因此，拥有 example.com 的公司会发布 `com.example/my-extension`。不含斜杠的裸单词根本不是有效的扩展标识符；它缺少区分不同厂商的前缀，无法参与协商。

在这个协议版本中，双方公布扩展支持的方式与其他能力相同：把数据附在消息上，而不是只在初始化时设置一次。客户端在当前请求自己的元数据中声明本次调用想使用的扩展，位置是 `_meta["io.modelcontextprotocol/clientCapabilities"].extensions`。它是从标识符到设置对象的映射：

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {"location": "New York"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/ui": {"mimeTypes": ["text/html;profile=mcp-app"]}
        }
      }
    }
  }
}
```

服务器在 `server/discover` 结果的 `capabilities.extensions` 中声明自己实现的扩展，结构相同：

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "resultType": "complete",
    "supportedVersions": ["2026-07-28"],
    "capabilities": {
      "tools": {},
      "extensions": {"io.modelcontextprotocol/ui": {}}
    },
    "ttlMs": 3600000,
    "cacheScope": "public"
  }
}
```

空设置对象 `{}` 是完整且有效的声明，意思是“支持此扩展，无需配置”。非空对象则携带该扩展定义的细粒度配置，例如上面的 `mimeTypes` 列表。声明随 `_meta` 一起在每次调用中重新发送，因此一次请求的声明不会延续到下一次。这与协议版本和其他逐请求能力遵循同一种无状态原则，并非扩展特有的例外。

某项扩展只有在双方都点名时，才会对当前调用生效：客户端在本次请求中提出使用它，服务器自身的 capabilities 也表明已经实现它。活跃集合就是两份映射按标识符求交集。缺少强制前缀的畸形标识符，即使意外同时出现在两边，也绝不能进入结果。校验标识符形式是计算活跃集合的一部分，不能省略。

后续处理取决于该扩展对当前调用是可选还是必要。如果它只是叠加在原有可用行为上的增强项，就属于可选扩展；另一方不支持时，支持方应回退到核心行为。例如，能够渲染交互式仪表盘的工具，面对从未声明 UI 扩展的客户端，仍要返回有意义的文本内容。如果某项扩展对调用必不可少，且不存在有意义的纯核心协议行为，例如返回一个持久任务句柄，但客户端没有对应扩展就无法轮询，那么服务器应拒绝请求，而不是给出残缺响应。拒绝时复用第 07 课讲过的通用能力门禁：`MissingRequiredClientCapabilityError`，错误码 `-32021`，并在 `data.requiredCapabilities` 中准确列出调用所需扩展，结构为 `{"extensions": {"<identifier>": {}}}`。这不是扩展专属的错误机制，而是普通的逐请求能力门禁，只不过检查对象从核心能力换成了扩展标识符。双方也都必须显式启用扩展：SDK 即使一个扩展都不实现，也可以宣称完整符合核心协议；如果实现了扩展，默认也应保持关闭，直到开发者明确打开。

扩展进入规范的方式与核心功能不同。它首先要在 MCP 主仓库中以独立的 Extensions Track SEP 提出。与 Standards Track SEP 不同，在 Core Maintainers 开始评审前，它必须已经在官方 SDK 中有可工作的参考实现。通过后，规范会放入 modelcontextprotocol GitHub 组织下的扩展仓库，仓库名带 `ext-` 前缀，例如授权扩展所在的 `ext-auth`，以及 MCP Apps 所在的 `ext-apps`。Core Maintainers 对其中发布的内容保留最终决定权，但日常变更由各仓库自己的维护者负责，无需再次经过核心评审。Working Group 或 Interest Group 也可以在方案尚不足以提交 SEP 时，先放进以 `experimental-ext-` 开头的仓库孵化。此类仓库必须明确标记为非官方，避免有人把原型误当承诺；Core Maintainers 仍可自行决定归档或删除它们。

扩展的版本独立于核心协议，也彼此独立。发布新的扩展版本完全无需核心评审。唯一的硬规则针对破坏性变更：删除或重命名字段、改变字段类型、改变既有行为的含义，或新增必填字段。任何一种变更都不能沿用旧标识符。扩展必须改用新标识符，通常添加后缀，例如 `io.modelcontextprotocol/my-extension-v2`。这样，仍声明旧标识符的实现会继续得到旧有、未改变的行为，不会静默损坏。新增可选字段，或在设置对象中加入版本标记，都不属于破坏性变更，无需更换标识符。

目前有四类官方扩展。Tasks（`io.modelcontextprotocol/tasks`，SEP-2663）就是第 21 课讲过的持久任务句柄：服务器以任务响应请求，不再阻塞，客户端随后轮询。下一课介绍的 MCP Apps（`io.modelcontextprotocol/ui`，SEP-1865）允许工具指向可在沙箱中渲染的界面，而不再只能返回文本。Skills over MCP（`io.modelcontextprotocol/skills`，SEP-2640）允许服务器发布可复用的工作流说明，客户端可通过已有的 resources primitive 发现并读取它们。通过 `resources/read` 读取 skill 的 `SKILL.md` 只会取回文本：该扩展把 skill 内容视为不可信输入；是否把 skill 加载到模型上下文，必须由明确的用户策略决定；host 应允许用户在加载前检查 skill；除非用户批准扩大权限，否则应忽略 MCP 所提供 skill 中的 `allowed-tools` 等扩权 frontmatter。授权扩展发布在 `ext-auth` 仓库中，在核心授权模型之上增加 OAuth 客户端凭据流程和企业托管授权框架。由于每项扩展都由各客户端独立选择启用，扩展网站会持续维护客户端支持矩阵。设计依赖某项扩展前，先检查目标客户端是否支持。位于真实客户端与后端服务器之间的 gateway，对后端而言本身就是客户端，因此必须自行决定要声明哪些能力，不能照搬原调用方的声明。gateway 如果无法正确居中处理某项扩展，却仍对后端宣称支持，危害比不声明更大。

在此版本之前，扩展只需在 `initialize` 请求的 `capabilities.extensions` 中声明一次，并由 `initialize` 响应回显一次；随后默认该声明在整条连接的生命周期内有效。SEP-2133 保留下来的历史文本记录了当时发布的结构，现在仍能看到这种写法。2026-07-28 没有覆盖连接生命周期的握手，也没有保存跨调用声明的位置，因此旧假设不再适用。现在，声明必须随每个请求的 `_meta` 发送；服务器不得假定客户端在本次调用中支持的扩展，与它或任何其他客户端先前声明过的内容相同。

```figure
mcpa-30-extension-negotiation
```

## 交互实验

图中把客户端声明的扩展与服务器声明的扩展并排展示。标识符 `com.example/priority-routing` 同时出现在两个框中，并汇入中间的活跃扩展框：本次调用将获得增强行为。`io.modelcontextprotocol/ui` 只出现在客户端一侧，`io.modelcontextprotocol/tasks` 只出现在服务器一侧；它们都没有汇合，因为协商要求双方点名同一个标识符。下方三种结果与核心概念部分一致：双方都声明可选扩展时，扩展激活并丰富响应；只有一方声明可选扩展时，回退到核心行为；必要扩展始终未被共同激活时，以 `-32021` 拒绝请求，并准确指出缺少的能力。

## 实践实验

打开 `code/main.py`。`negotiate_extensions` 用一个函数实现了完整机制：遍历客户端声明的扩展，只保留格式规范且也在服务器 `extensions` 映射中出现的项目，然后返回这个交集及客户端的设置对象。其上有两个工具。`summarize_incidents` 把 `com.example/priority-routing` 视为可选扩展：没有任何声明时，返回朴素的“3 open incidents”；以空设置对象声明扩展时，扩展仍会激活，并默认使用“standard”层级，这正是 `{}` 表示“支持且无需设置”的实际效果；传入 `{"tier": "gold"}` 时，同一个工具会改为按该层级排序。`export_dataset` 把 `com.example/bulk-export` 视为必要扩展：调用时未声明它，服务器甚至不会查看参数，而是立即返回 `-32021`，并在 `data.requiredCapabilities` 中点名该扩展；声明后，同一个调用会正常完成。

```bash
python3 code/main.py
```

运行程序，按顺序观察八次交互。第七次在有效标识符旁声明了虚构标识符 `no-slash-here`；你会看到它被协商过程静默丢弃，而有效标识符照常激活。这正是 `is_well_formed_extension_id` 要保证的行为，即使请求的其他部分看起来都没有问题。试着再添加一个同时要求两个扩展的工具，看看 `_call` 会先报告缺少哪一个。

## 交付产物

`outputs/extension-negotiation-guide.md` 汇总了标识符格式、双方在线路上声明能力的位置、可选且活跃/可选并回退/必要但被拒绝三种情况的决策表、从 SEP 到 `ext-` 仓库的生命周期检查清单，以及各官方扩展的真实标识符，并注明了资料来源。

## 验证

在课程目录中运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课主张：真实的官方标识符和第三方标识符都能通过校验，不带前缀的裸单词不能；协商结果是客户端请求与服务器实际支持项的交集；可选扩展未激活时回退为普通结果；空设置对象仍表示支持，非空对象则配置具体行为；必要扩展未声明时以 `-32021` 拒绝，并在 `data.requiredCapabilities` 中点名，声明后同一调用可以完成；即使畸形标识符同时出现在双方声明中，也绝不会激活；`server/discover` 会连同真实缓存提示一起公布服务器扩展。仓库的线路检查器还会按照 2026-07-28 规则校验本课交互记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/30-the-extensions-framework
```

## 综合项目关联

综合项目的工具生态必须根据基础规范说明每项设计选择。扩展正是需要正确论证的一类选择：某种行为应放进工具的核心响应，还是置于调用方可能不支持的扩展之后？调用方不支持时又该怎样回退？当综合项目服务器提供三种核心 primitive 之外的能力时，使用本课的活跃集合计算与 `-32021` 拒绝机制；当项目需要解释某项行为为何不该直接加入核心规范时，则使用扩展生命周期规则。

## 关键术语

| 术语 | 含义 |
|------|---------|
| 扩展 | MCP 核心协议之外的可选补充，以 `{vendor-prefix}/{extension-name}` 标识 |
| 厂商前缀 | 扩展标识符中强制要求的命名空间；官方扩展使用 `io.modelcontextprotocol`，其他扩展使用反写域名 |
| 设置对象 | capabilities 声明中每项扩展的配置值；`{}` 表示支持扩展但无需配置 |
| 活跃扩展集合 | 当前请求实际协商成功的标识符，即同时出现在客户端声明能力与服务器能力中的项目 |
| 优雅降级 | 可选扩展未被双方共同激活时，回退到核心行为，而不是让请求失败 |
| `MissingRequiredClientCapabilityError` | 错误码 `-32021`；调用需要某项扩展或其他能力，但本次请求的 `clientCapabilities` 未声明时返回 |
| 扩展仓库 | modelcontextprotocol GitHub 组织下以 `ext-` 开头的仓库，保存一项或多项官方扩展 |
| 实验性扩展 | 在 `experimental-ext-` 仓库中孵化、隶属于 Working Group 或 Interest Group、尚未成为官方 SEP 的扩展 |

## 延伸阅读

- [MCP Extensions Overview](https://modelcontextprotocol.io/extensions/overview)
- [SEP-2133: Extensions](https://modelcontextprotocol.io/seps/2133-extensions)
- [Extension Negotiation, MCP versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning#extension-negotiation)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 14 节
- `phases/13-tools-and-protocols/17-mcp-gateways-and-registries`，从 gateway 角度讲解逐请求能力协商
