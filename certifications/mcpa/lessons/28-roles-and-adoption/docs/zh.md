# 每个 MUST 都需要负责人

> 规范把 MUST 交给 host、client 和 server；真实部署则把它们交给人。没人同意负责的那个 MUST，往往最先失守。

**类型：** Reference
**语言：** Python
**前置要求：** 第 27 课
**预计时间：** 约 45 分钟

## 学习目标

- 为真实 MCP 部署背后的六种角色分配各自实际负责的规范要求：服务器作者、host 与 client 开发者、平台或网关运维方、安全与治理负责人、注册表发布者、终端用户
- 追踪同一要求的负责人如何在三种采用路径中变化：本地 stdio、使用 OAuth 的远程 Streamable HTTP、网关前置的企业部署
- 解释 MCP 治理结构：Agentic AI Foundation 旗下的管理方式、Lead Maintainer、Core Maintainer 与 Maintainer 层级，以及 Working Group 和 Interest Group 的区别
- 跟随一项提议从想法进入 SEP 工作流并达到 Final 状态，再把该流程与要求发布后的功能生命周期联系起来
- 阅读分级体系的合规与响应时间承诺，把 SDK tier 选择视为角色作出的采用决策，而不是勾选项

## 问题背景

从头到尾阅读规范，会看到三个参与方：host、client、server。从头到尾审视一次真实 MCP 上线，则至少会涉及六类人，组织架构图里没有谁的职位叫“host”。有人编写并维护服务器；其他人构建或配置 host 应用及其中的 client；第三个职能负责在生产中运行进程，无论是在共享机器上启动 stdio 子进程，还是运营终止远程连接的反向代理；第四个职能审核部署可如何使用 token、scope 和日志；第五个职能发布服务器，让其他团队可以发现它；第六个是终端用户，在工具即将运行时真正授予同意。

规范中的每个 MUST 和 SHOULD 最终都落在这六类职能之一，但规范不会也无法指明具体是哪一类。同一协议既支持个人开发者通过 stdio 运行本地工具，也支持平台团队通过网关承载数十台内部服务器。对“验证 Origin 标头”这类要求而言，两种场景中的正确负责人并非同一人。团队若把“规范说服务器 MUST 做 X”视为自动落实，通常会在安全审核时才发现：没有具体姓名负责的 MUST，就是没人真正完成的 MUST。Use Cases and Ecosystem 领域的考试会用场景题而非背诵题考这一点：给定部署形态，指出角色，而不只是复述要求。

## 核心概念

给六类职能命名后，考试里的角色题就不再抽象。服务器作者依据 2026-07-28 版规范编写和维护一个实现：有哪些工具、每个 input schema 要求什么、`server/discover` 如何响应。Host 与 client 开发者构建用户运行的应用及其中负责线路协议的 client：capability 声明、远程传输时的 OAuth client、调用发出前呈现给用户的同意界面。平台或网关运维方运行进程：使用正确环境启动 stdio 子进程，或终止 Streamable HTTP 连接、应用网络策略，并决定请求抵达服务器实现前网关要检查什么。安全与治理负责人对横跨上述各方的要求负责，包括 token 处理、`requestState` 保护、同意策略，以及无法自然归属单个实现者的跨领域 MUST。注册表发布者负责 `server.json`、所声明的命名空间，以及注册表提供条目的准确性。终端用户则对 host 代表自己执行的操作承担责任；每当规范说人应能拒绝调用时，保护的正是这一角色。

这些职能不会取代架构课中的 host、client、server 角色，而是叠加在其上。小团队里，一个人可以兼任其中两三项职能。考试的关键在于：部署扩展时，同一要求可以在不同职能之间转移。沿该领域要求掌握的三种采用路径追踪一项要求：本地 stdio、使用 OAuth 的远程 Streamable HTTP，以及使用扩展、由网关前置的企业部署。Streamable HTTP 传输明确规定，为防止 DNS 重绑定攻击，服务器 MUST 验证所有入站连接的 Origin 标头。若把服务器直接暴露在公网，这个 MUST 落到服务器作者身上，因为套接字与请求处理器之间只有服务器自己的代码。若在同一服务器前放置企业网关，这个 MUST 不会消失，而会转移：平台或网关运维方的边缘层现在最先看到 Origin 标头，所以运维方必须正确处理；服务器作者的职责则缩小为信任由他人执行的网络边界。由精选要求记录构建的责任矩阵必须反映这一点：要求不变、部署形态改变、负责人随之改变。

同样的纪律也适用于 stdio。使用 STDIO 传输的实现 SHOULD NOT 执行 OAuth 授权流程，而应从环境获取凭据。因此，stdio 部署不会要求 host 与 client 开发者构建 OAuth client，而是要求平台或网关运维方——在个人笔记本上就是启动进程的人——在子进程启动前，把正确凭据放进环境。跳过负责人问题，stdio 工具要么在首次需要凭据的调用时失败，要么更糟，有人把凭据硬编码进无人审核的配置文件。

治理回答的是另一个相关但独立的问题：谁决定一个 MUST 接下来会变成什么。MCP 是 Agentic AI Foundation 旗下项目，技术方向由一个小型层级体系推动。Lead Maintainers 拥有最终否决权；Core Maintainers 掌舵规范和项目整体方向；Maintainers 各自管理某个领域，例如 SDK、文档或 Working Group。Contributors 是任何提出 issue 或 pull request 的人；持续贡献者会成为 Members；成为 Member 至少六个月后，经推荐人提名和 Core Maintainer 批准，可以成为 Maintainer。这些时长只是最低门槛，不是保证。两类小组在各层之间开展协作。Interest Group 讨论问题，产出无约束力的建议、用例和要求；在人们承诺某种设计前，“MCP 是否应支持这个问题”应在此提出。Working Group 则在想法获得足够支持、值得投入工程时间后，构建具体交付物，通常是 Specification Enhancement Proposal（SEP）及其参考实现。SEP 依次经历 `draft`、`in-review`，再进入 `accepted` 或 `rejected`。获接受的 Standards Track SEP 只有在参考实现落地，并且任何具有可观察协议行为的功能也有合规测试后，才会成为 `final`。这与规范阅读课中的功能生命周期相同，只是应用于要求诞生而非退役的时刻：功能先是 Active，可选进入 Deprecated（必须提供迁移路径和最短窗口），最终才是 Removed。

SDK tier 是本课交给具体角色作出的最后一项采用决策，通常由选择构建基础的 host 与 client 开发者或服务器作者负责。Tier 1 SDK 通过 100% 合规测试，在规范发布前或同时交付新协议功能，在两个工作日内分诊 issue，并在七天内修复严重 bug。Tier 2 目标相同，但时钟更宽：80% 合规，新功能可在六个月内交付。Tier 3 明确属于实验性质，没有时间承诺。为生产网关选择 Tier 3 SDK 不是技术捷径，而是决定继承该 SDK 的维护风险。能明确说出这一点，才是在回答该领域真正考查的场景题。

```figure
mcpa-28-roles-map
```

## 交互实验

图中并排放置三个面板：本地 stdio 部署、不带网关的普通远程 HTTP 部署，以及同一服务器前置网关后的部署。每个面板都标出了负责该部署形态示例要求的角色。观察标记行如何移动。在普通 HTTP 下，服务器作者同时负责 Origin 验证和 Protected Resource Metadata。添加网关后，标记行跳到平台或网关运维方，因为请求首先触及网关。第二、第三个面板之间，底层 MUST 没有任何变化；变化的是哪个面板、哪种部署形态获得了这项责任。

## 实践实验

打开 `code/main.py`。`REQUIREMENTS` 是由精选 `Requirement` 记录组成的 tuple，每条都是简报或规范中逐字引用的 MUST 或 SHOULD，并标注适用的部署形态和默认负责人。`build_responsibility_matrix(shape)` 会把目录过滤到一种形态，为每项适用要求分配负责人，并把负责人为 `None` 的 MUST 收集到 `gaps` 列表。运行：

```bash
python3 code/main.py
```

并排阅读三种形态打印出的矩阵。确认 `stdio-env-credentials` 落在平台或网关运维方；`prm-implemented` 在 `http` 和 `gateway` 下都落在服务器作者；`origin-validation` 是唯一会在两种形态间改变负责人的行：`http` 下是 `server_author`，`gateway` 下是 `platform_gateway_operator`。然后查看 `error-code-allocation`。它的 `default_role` 有意设为 `None`：这是简报第 5 节的一项 MUST NOT，无法清晰映射到六种角色中的任何单一角色，因此矩阵会在每种形态下都把它报告为缺口。自行添加第十三条 `Requirement`，内容可取自已经读过的课程；决定六种角色中的谁应该负责，标注适用形态，再次运行脚本，观察新要求进入矩阵。

## 交付产物

`outputs/roles-responsibility-matrix.md` 是一页式现场参考资料：用一行解释每种角色，列出三条采用路径及每一步新增责任的角色，手工推导同一 Origin 验证示例，并附治理与 SDK tier 速查表，覆盖 maintainer 层级、Working Group 与 Interest Group、SEP 状态列表和三档 SDK tier。把它放在 hosts、clients、servers 课程的架构角色图旁：后者绘制线路拓扑，本课矩阵指出谁为其负责。

## 验证

从课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试会验证本课主张：每种部署形态都会生成非空矩阵；stdio 会把环境凭据交给平台或网关运维方；普通 HTTP 部署把 Protected Resource Metadata 交给服务器作者；网关前置部署把 Origin 验证转移给平台或网关运维方，而普通 HTTP 仍由服务器作者负责；有意不设负责人的 MUST 会报告为缺口，而无负责人的 SHOULD 不会；每项适用要求在每种形态下恰好分配一次，没有遗漏或重复；六种角色都会在目录某处出现；无法识别的部署形态会被拒绝；示例交互绝不会把凭据放在线路上。仓库线路检查器也会依据 2026-07-28 规则验证本课交互记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/28-roles-and-adoption
```

## 综合项目关联

综合项目的集成场景要求你为完整部署进行辩护，而不只是描述消息形态。本课提供了辩护所需的词汇：当审核者问“你的设计里谁负责验证 Origin 标头”时，答案必须指出角色和部署形态，不能只复述服务器 MUST 验证。带上责任矩阵，并养成习惯：场景每提到一个 MUST，都要追问这个具体团队里谁刚刚同意负责。

## 关键术语

| 术语 | 含义 |
|------|---------|
| 服务器作者 | 依据规范编写并维护一个 MCP 服务器实现 |
| Host 与 client 开发者 | 构建应用及其中声明 capabilities、执行线路协议的 client |
| 平台或网关运维方 | 运行进程：带环境启动 stdio 子进程，或终止并管控远程连接 |
| 安全与治理负责人 | 对 token 处理、同意策略等无法自然归属单一实现者的跨领域要求负责 |
| 注册表发布者 | 负责服务器的 `server.json`、命名空间和注册表所提供信息的准确性 |
| 终端用户 | 授予同意，并对 host 代表自己执行的操作承担责任 |
| Working Group | 构建具体交付物的小组，通常包括 SEP 及其参考实现 |
| Interest Group | 讨论问题并提出无约束力建议的小组，不负责具体设计 |
| SEP | Specification Enhancement Proposal，以 PR 为基础处理新功能或破坏性变更的工作流 |
| SDK tier | SDK 维护者承诺的合规与响应时间级别，从 Tier 1 到 Tier 3 |

## 延伸阅读

- [MCP governance and stewardship](https://modelcontextprotocol.io/community/governance)
- [Working and Interest Groups](https://modelcontextprotocol.io/community/working-interest-groups)
- [SEP guidelines](https://modelcontextprotocol.io/community/sep-guidelines)
- [SDK tiering system](https://modelcontextprotocol.io/community/sdk-tiers)
- [Design principles](https://modelcontextprotocol.io/community/design-principles)
- [Contributor ladder](https://modelcontextprotocol.io/community/contributor-ladder)
- [MCP specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)，尤其是 Authorization 和 Streamable HTTP transport，其中包含本课要求目录逐字引用的 MUST 陈述
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 4、5、6、9、10、12、15 节
