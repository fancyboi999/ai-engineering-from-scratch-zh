# 阅读 MCP 规范

> 规范是具有约束力的文本，不是教程：MUST 决定实现必须怎么做，SHOULD 留出判断空间，而功能的 Deprecated 状态会准确告诉你还能依赖它多久。

**类型：** Reference
**语言：** Python
**前置要求：** 第 00 课
**预计时间：** 约 45 分钟

## 学习目标

- 熟悉规范结构：哪些部分是所有实现都 MUST 支持的，哪些部分按需添加
- 正确理解 RFC 2119 和 RFC 8174 关键字的约束强度，包括小写单词不具备规范约束力这条规则
- 解释 schema.ts 与 schema.json 的关系，以及为什么 TypeScript 文件才是事实来源
- 区分规范修订版的 Draft、Current、Final 状态与功能自身的 Active、Deprecated、Removed 状态
- 从变更日志条目追溯产生该变更的 SEP，并根据弃用窗口计算功能最早可被移除的时间

## 问题背景

本课程里的每一项事实都可以追溯到同一份文档：modelcontextprotocol.io 上由 TypeScript schema 构建的规范。团队如果通过博客、训练数据早于当前修订版的模型，或对旧版本的记忆来学习 MCP，就会逐渐偏离规范的真实要求。考试依据的是规范，而不是过去的规则。即使一个实现正确记住了 2025-06-18 修订版，只要不重新阅读当前文本，仍然会答错 2026-07-28 的内容：旧修订版中的 MUST 可能被新规则取代；曾处于协议核心的功能也可能转为 Deprecated，并附带迁移路径，尽管它暂时仍与从前一样可用。

阅读规范本身就是一项技能：你需要知道规范性文本在哪里，关键字究竟要求实现做到什么，整份文档的成熟度与单项功能状态有何不同，以及如何把一项说法追溯到产生它的提案，而不是轻信摘要。

## 核心概念

规范由少量部分组成：架构、基础协议、版本与兼容性、消息模式、授权、服务端功能、客户端功能和实用工具，其上还可以叠加可选扩展。概览页明确说明了哪些部分是强制的：所有实现 MUST 支持基础协议、版本控制和消息模式。其余部分，包括授权、服务端功能、客户端功能与实用工具，都 MAY 根据应用的实际需要实现。这句话值得单独记住，因为它划定了最低门槛：一个不提供资源和 prompt、只通过 stdio 提供工具且完全不做授权的服务端，仍然可以符合 MCP，只要它正确实现基础协议、版本控制和消息模式。

本课程乃至考试可能涉及的每一种消息形状，最终都来自一个文件：规范仓库中的 TypeScript schema——schema.ts。正文页面只是对该 schema 的易读说明，不是独立的事实来源；如果正文和 schema 看起来冲突，以 schema.ts 为准。schema.json 是从 schema.ts 自动生成的，供无法解析 TypeScript 的工具使用，本身不具备权威性。当问题取决于结果或错误的精确形状时，真正的答案在 schema 中。

规范性语言遵循 BCP 14，即 RFC 2119 与 RFC 8174 的组合：MUST、MUST NOT、REQUIRED、SHALL、SHALL NOT、SHOULD、SHOULD NOT、RECOMMENDED、NOT RECOMMENDED、MAY 和 OPTIONAL 只有在像这里一样全部大写时，才具有各自定义的约束强度。一句话若用小写写着客户端 must not 批处理请求，那只是普通叙述，没有任何规范约束力；相同词语写成 MUST NOT，才是硬性禁止。正确判断约束强度，关键是留意大小写，而不只是词语本身。MUST 和 MUST NOT 划定实现不可突破的底线。SHOULD 和 SHOULD NOT 表示强烈默认做法，但在有明确、充分理由时可以偏离。MAY 和 OPTIONAL 表示真正可选，两边都没有默认倾向。

整份带日期的规范修订版有三种状态。Draft 表示仍在编写，尚不适合采用。Current 是当前实际使用的唯一修订版；目前是 2026-07-28，它仍可能接收向后兼容的修改。Final 表示过去且已经定稿的修订版，不会再变化。修订版标识本身采用 YYYY-MM-DD 日期格式，表示最后一次发生向后不兼容变更的日期，因此 Current 修订版可以吸收兼容性修复而不改名。由于协议是无状态的，客户端不必根据文档猜测服务端实际使用哪个修订版：它可以调用规范入口 `server/discover`，直接从线上响应读取答案。

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "server/discover",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "complete",
    "supportedVersions": ["2026-07-28"],
    "capabilities": {"tools": {"listChanged": false}},
    "ttlMs": 300000,
    "cacheScope": "public"
  }
}
```

Current 修订版中的某项功能——一条消息、一项能力或一种传输方式——有自己的状态，与修订版的 Draft、Current、Final 标签相互独立。Active 表示按现行文本实现，没有移除计划。Deprecated 表示该功能仍有完整规范、仍可正常工作，但已经提供迁移路径并计划移除；新实现不应再采用它。Removed 表示它已从规范草案中删除，不会出现在下一个 Current 修订版中。Roots、Sampling、Logging 和 Dynamic Client Registration 在 2026-07-28 中都是 Deprecated，而不是 Removed：它们仍严格按规范工作，今天支持它们的服务端或客户端明天仍能继续运行。弃用功能注册表是列出所有当前处于 Deprecated 或 Removed 状态功能的唯一页面，读者无需从分散的变更日志条目自行拼凑全貌。

弃用策略规定的是下限，而不是固定日程。功能必须保持 Deprecated 至少十二个月，之后才具备被移除的资格。这个窗口从首次把它标记为 Deprecated 的修订版发布之日算起，而不是从负责弃用它的提案进入 Final 的时间算起。窗口结束日期是该功能的最早移除时间，也就是在该日期当天或之后发布的第一个 Current 修订版；它究竟在那个修订版中移除、在更晚的版本中移除，还是继续保持 Deprecated 很久，由 Core Maintainer 在准备发布时决定。Roots、Sampling、Logging 和 Dynamic Client Registration 都在 2026-07-28 发布时被标记为 Deprecated，因此它们共同的最早移除时间，是 2027-07-28 当天或之后发布的第一个修订版。计算锚点是该修订版的发布日期，而不是任何单个提案自身的时间线。

规范的每项重大变更——新功能、破坏性变更、治理变更——都要经过 Specification Enhancement Proposal（SEP）。它是 seps 目录中的 Markdown 文件，说明动机、确切规范文本、设计理由、向后兼容性和安全影响。SEP 会经历 draft 和 in-review 状态，最终被接受或拒绝；只有存在参考实现，并且对于具有可观察行为的标准轨变更还存在一致性场景时，它才会进入 final。Extensions Track SEP 遵循相同流程，但描述的是可选扩展，而不是核心协议新增内容。规范中的每条变更日志都会注明产生它的 SEP。谨慎的实现者或考生应阅读该 SEP 来核实说法，而不是只相信一行摘要。本课依赖的功能生命周期与弃用策略，即 Active、Deprecated、Removed 机制，来自 SEP-2596。这是一项 Process SEP，它通过准确记录上述机制进入了 Final 状态。

JSON-RPC 批处理是制定生命周期策略时力图避免的反面案例：它在 2025-03-26 发布的修订版中加入，却在紧接着的 2025-06-18 修订版中移除，完全没有弃用期。按照 2026-07-28 的规则，今后不应再出现这种变更；功能必须先经历至少十二个月的 Deprecated 状态，并提供清晰的迁移路径。

```figure
mcpa-01-spec-map
```

## 交互实验

图中以一个根节点组织规范：三个标有 MUST support 的方框分别是基础协议、版本控制和消息模式；四个标有 MAY support 的方框分别是授权、服务端功能、客户端功能和实用工具。下方三个标签展示功能自身的生命周期：Active 到 Deprecated，再到 Removed。这个状态跟随功能，而不是跟随修订版。某个方框可以是 MUST，但其下具体内容——包括某个服务端选择暴露哪些工具或资源——仍完全由实现决定。

## 实践实验

打开 `code/main.py`。它不发起网络请求，而是把规范建模为数据：一份弃用功能注册表、按 SEP 编号索引的小型变更日志，以及关键字分类器。

```bash
python3 code/main.py
```

对照上面的核心概念阅读打印结果。`classify_requirement` 读取句子并返回约束强度，还会演示相同单词改为小写后返回 `unspecified`，而不是 `forbidden`。`feature_state` 判断截至给定修订版，roots、sampling 或 JSON-RPC batching 属于 active、deprecated 还是 removed；`earliest_removal` 根据弃用窗口直接计算 2027-07-28，而不是在任何地方硬编码该日期。`changelog_lookup` 接收 SEP 编号并返回引用它的条目。演示最后会发送 `server/discover` 请求并打印交互，同时故意制造一个错误：请求缺少必需的 `_meta` 块，符合规范的服务端必须拒绝，而不是自行猜测。你可以向 `DEPRECATED_REGISTRY` 添加一项具有独立窗口的新条目，或修改 `include-context-this-server-all-servers` 跟随的功能，然后重新运行，观察 `earliest_removal` 与 `feature_state` 在其他代码不变的情况下自动采用变更。

## 交付产物

`outputs/spec-reading-guide.md` 是一页式参考，可在阅读真实规范时放在手边：其中包含 MUST 支持列表、关键字强度表、修订版状态与功能状态的区别，以及具有精确时间锚点的弃用规则。在告诉队友某项功能是否仍属当前规则，或回答相关考题之前，用它做一次检查。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课中的主张：MUST 和 MUST NOT 分别归类为 required 和 forbidden；相同的小写单词归类为 unspecified；SHOULD 和 MAY 分别归类为 recommended 和 optional；SHOULD NOT 与 NOT RECOMMENDED 都归类为 not recommended；功能在自身弃用修订版之前为 active，在该修订版及之后为 deprecated；只有移除日期、从未处于 Deprecated 状态的功能绝不会被报告为 current；最早移除时间从十二个月窗口计算，而非硬编码；跟随其他功能日程的功能共享最早移除时间；无法识别的功能名不会引发异常；可以按 SEP 编号找到变更日志条目，未知 SEP 则返回空；查询修订版时能正确报告 Current、Final 或 unknown。仓库的 wire checker 还会按照 2026-07-28 规则验证本课 transcript：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/01-reading-the-specification
```

## 综合项目关联

综合项目会从头到尾组装一套完整的 2026-07-28 交互，并假设你无需查询就能判断其中使用的消息形状、错误码或功能是否仍是当前规则。后续每课都会像本课一样引用具体页面或 SEP：按关键字强度、功能状态，以及真正产生规则的 SEP 来阅读。当综合项目或考题取决于某项要求是 MUST 还是 SHOULD，或某项功能是 Deprecated 而非 Removed 时，你使用的正是本课建模为数据的注册表和关键字。

## 关键术语

| 术语 | 含义 |
|------|---------|
| 基础协议 | 每个实现都 MUST 支持的 JSON-RPC 消息形状 |
| BCP 14 | RFC 2119 与 RFC 8174 的规则：MUST、SHOULD、MAY 只有全部大写时才有规范约束力 |
| schema.ts | 所有 MCP 消息与结构的事实来源 TypeScript 文件 |
| Current 修订版 | 当前实际使用的唯一规范修订版；目前为 2026-07-28 |
| Draft、Current、Final | 规范修订版经历的三种状态 |
| Active | 功能按规范要求实现且没有移除计划时的状态 |
| Deprecated | 功能仍有规范且可用，但已计划移除并提供迁移路径时的状态 |
| Removed | 功能从规范草案中删除后的状态 |
| 最早移除时间 | Deprecated 功能的最短窗口结束当天或之后发布的第一个 Current 修订版 |
| SEP | Specification Enhancement Proposal，即提出并记录规范变更的 Markdown 文档 |

## 延伸阅读

- [MCP 2026-07-28 规范](https://modelcontextprotocol.io/specification/2026-07-28)
- [MCP 2026-07-28 规范：基础协议](https://modelcontextprotocol.io/specification/2026-07-28/basic)
- [MCP 2026-07-28 规范：变更记录](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [MCP 2026-07-28 规范：已弃用功能](https://modelcontextprotocol.io/specification/2026-07-28/deprecated)
- [功能生命周期与弃用政策](https://modelcontextprotocol.io/community/feature-lifecycle)
- [SEP 编写指南](https://modelcontextprotocol.io/community/sep-guidelines)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 的第 1、15 节
- `phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations`，基于这些版本时代规则构建一致性测试工具
