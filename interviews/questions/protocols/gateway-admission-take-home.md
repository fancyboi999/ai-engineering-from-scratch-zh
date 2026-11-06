---
id: gateway-admission-take-home
title: 构建 MCP 网关的准入关卡
card: protocols
kind: take-home
level: 4
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [take-home, coding]
tags: [mcp, gateway, admission, pagination, x-mcp-header, take-home]
minutes: 60
lessons: [phases/13-tools-and-protocols/15-mcp-security-tool-poisoning, phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content, phases/19-capstone-projects/13-mcp-server-with-registry]
manuals: []
practice: [tool-call-parser]
cheatsheet: [mcp-gateways-operations, mcp-security-auth]
related: [protocols/descriptor-pin-rug-pull, protocols/empty-cursor-stops-early, protocols/header-body-mismatch-order]
updated: 2026-11-03
---

带回完成的面试作业（Take-home）。构建一个 MCP 网关的准入模块。它接收多个服务端的 `tools/list` 结果，并产生准入集合、拒绝集合和审计追踪。它必须完整分页遍历每个列表，锁定每个描述符，在合并前限定名称，拒绝将敏感参数镜像到请求头或将 `x-mcp-header` 放在直接顶层属性之外任何位置的描述符，在调用路径上对照输出 schema 验证结构化结果，并发出包含名称且绝不包含值的请求头审计事件。描述你的设计、你随附的测试，以及审查者期望看到的证据。

## Short answer

按顺序运行五个关卡并保持它们相互分离。用不透明游标循环发现服务，该循环仅在 `nextCursor` 缺失或为 `null` 时停止；根据规范化的全描述符摘要、针对 `x-mcp-header` 的完整 schema 树遍历以及敏感名称策略来准入每个描述符；在合并之前将每个工具限定为 `<server>.<tool>`；并在任何内容到达模型之前对照公布的输出 schema 验证 `structuredContent`。测试证明单个被拒绝的描述符不会阻止有效的工具，空字符串游标会继续，`oneOf`、`items` 或 `$ref` 下的注解会被拒绝，且更改 `inputSchema` 会导致锁定失败。证据是页面跟踪记录、准入和拒绝集合、摘要账本以及脱敏的审计事件。

## Full answer

### 模块

| 模块 | 职责 |
|---|---|
| `discover` | 每个服务端的不透明游标循环；将每个请求记录为页面跟踪记录 |
| `admit` | 规范化摘要、schema 遍历、请求头策略、扫描器绊线 |
| `namespace` | 限定名称、后端映射、冲突策略 |
| `consume` | 调用前的参数验证，模型使用前的结果验证 |
| `audit` | 请求头名称、拒绝类别、摘要；不包含值 |

### 准入规则

1. 使用排序后的键和紧凑分隔符规范化描述符，计算其哈希值，并将摘要与发布者证据和审批时间一起存储在限定名称下。未知键被隔离。更改的摘要属于 rug pull，在重新审批前处于隔离状态。
2. 遍历整个 `inputSchema` 树。`x-mcp-header` 仅在 `inputSchema.properties` 的直接成员上合法，类型为 string、integer 或 boolean，请求头名称必须是非空的合法 token，且名称不区分大小写时也不能重复，且整数值在 JavaScript 安全范围内。在嵌套对象、`oneOf` 分支、`items`、`$ref` 目标或任何输出 schema 下拒绝它。
3. 拒绝镜像属性命名为 `password`、`secret`、`token`、`api_key` 或 `authorization` 的描述符。
4. 运行静态扫描器以查找角色标签、指令覆盖、隐瞒、机密访问和模糊目的地。将命中视为审查证据，而非裁决。
5. 拒绝没有输入 schema 对象的描述符；不带参数的工具声明 `{"type": "object", "additionalProperties": false}`。
6. 将验证过的发布者命名空间和实时的 `server/discover` 身份与审批记录一起存储。在随后的刷新中，即使每个描述符摘要仍匹配，只要服务端的命名空间或实时身份不同，就隔离该服务端。

### 命名空间与合并

限定名称是公开的网关名称。单独记录后端映射。在合并前排序，以便局部顺序不依赖于进程时序。绝不让发现顺序决定冲突。

### 调用路径

在调用之前验证参数。将镜像的请求头值编码为普通可见 ASCII 或确切的 base64 UTF-8 哨兵。对照输出 schema 验证 `structuredContent`，它可以是任意 JSON 值，包括带有 `isError: true` 的结果。审计请求头名称和编码决定，绝不审计值。

### 随附测试

- 第一页返回 `""` 作为游标的双页列表会产生两次请求。
- 一个不安全的描述符被拒绝，且同一服务端上的每个有效描述符都被准入。
- `oneOf`、`items`、嵌套 `properties` 或 `$ref` 定义下的注解即使从未被使用也会被拒绝。
- 在不更改描述的情况下更改 `inputSchema` 会导致锁定失败。
- 更改后的 `server/discover` 身份背后的未更改描述符会被隔离。
- 两个都暴露 `search` 的服务端会变成两个限定名称和两个摘要。
- 数组结果通过数组输出 schema，对象结果则失败。
- 请求头审计事件包含名称而不包含值，通过搜索该值的 grep 测试检查。

### 审查者的证据

综合项目评估准入证据：已验证的发布者命名空间和实时 `server/discover` 身份、确定且完整的分页发现、模型暴露前的描述符验证、验证后的结构化输出，以及保留授权边界的路由元数据。捕获描述符、页面跟踪记录、准入集合、每个描述符带有原因的拒绝集合、摘要账本和一个验证后的结果。不要仅凭成功的 `tools/call` 就声称网关兼容性。

## Follow-ups

- **Level 3:** 为什么当某一页的 `tools` 数组为空时不要停止分页？ Expected: 为空是服务端的选择；只要 `nextCursor` 存在且非 `null`，就继续。
- **Level 4:** 两个服务端在不同名称下返回逐字节相同的描述符。账本中保存什么？ Expected: 两个带有两个摘要的限定键；不同键下的相同摘要没有问题，同一键下的不同摘要才是 rug pull。
- **Level 4:** 扫描器标记了描述中合法的警告句子。会发生什么？ Expected: 审查，而不是自动拒绝；扫描器是绊线，由人工审批完整描述符。
- **Level 4:** 某个描述符通过了所有检查，且从第一天起就被投毒。什么能捕获它？ Expected: 没有自动化机制能捕获；该设计在首次锁定前需要审查队列，因为哈希一致证明稳定性而非安全性。

## Wrong answers

- "只哈希描述；schema 很少改变。" Schema 和注解的更改就是 rug pull；应锁定整个规范化描述符。
- "信任服务端的确定性顺序并跳过排序。" 本地注册表顺序绝不能取决于进程启动时序；合并前应排序。
- "记录请求头值以便更容易调试。" 镜像的值可以是路由数据，或者在不良描述符中是机密；仅审计名称和拒绝类别。

## Taught in

[工具投毒课程](../../../phases/13-tools-and-protocols/15-mcp-security-tool-poisoning/)提供了锁定和扫描器，[工具契约课程](../../../phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content/)给出了请求头和游标规则，[综合项目](../../../phases/19-capstone-projects/13-mcp-server-with-registry/)指明了准入证据。
