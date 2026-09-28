# MCP 的无状态核心

> 每个请求都携带服务端回答它所需的全部信息；前一个请求不会留下任何东西，即使两个请求走的是同一条连接。

**类型：** Reference
**语言：** Python
**前置要求：** 第 03 课
**预计时间：** 约 45 分钟

## 学习目标

- 把无状态性解释为协议不变量：每个请求都自描述，服务端不得从同一连接上此前的任何请求推断能力、版本或身份
- 解释无状态性的运维价值：任意 replica 都能处理任意请求，重试可以安全地路由到任意位置，负载均衡器无需粘性会话
- 区分连接或 stdio 进程与 session 或对话，并说明列表结果如何与连接身份无关、又如何取决于请求携带的授权
- 按 SEP-2567 模式设计跨请求状态：使用服务端签发的显式、不透明 handle，由客户端作为普通工具参数传回
- 识别 2026-07-28 为默认实现无状态性而移除了什么，以及各项被什么取代

## 问题背景

在 2026-07-28 之前，打开到 MCP 服务端的连接意味着先发送 `initialize` 请求。该请求协商协议版本、交换能力，并记录客户端和服务端身份；结果在连接存续期间一直作为 session state 保存。此后该连接上的每个请求都依赖握手建立的信息。服务端无需反复询问“我们使用哪个版本”或“这个客户端能做什么”，只要它一直记得就行。

问题正出在这份记忆上。绑定到一条连接的 session，也绑定到恰好维持该连接的进程。把一组服务端放在普通负载均衡器后面，客户端第二个请求可能落到与第一个不同的 replica 上；这个 replica 从未见过握手，不知道双方协商过什么版本和能力。常见补救方式是粘性路由：在 session 存续期间把客户端固定到一个后端。它在后端重启、部署新版本，或自身过载而相邻节点闲置之前都能工作；一旦出现这些情况，客户端的 session state 就消失，只能重新连接并从头执行握手。每个服务端作者还必须编写代码来创建、跟踪并最终垃圾回收逐客户端 session state；每个客户端作者也要编写相应代码，从连接中断中恢复。这些复杂度都与服务端真正执行的工作无关。它们只是 session 制造出来、继而强制所有人承担的开销。

## 核心概念

MCP 2026-07-28 是无状态协议：处理请求所需的全部信息都包含在请求自身。服务端独立处理每个请求，不得从此前到达的任何请求推断能力、协议版本或客户端身份，即使两者通过同一连接或 stream 发送。第 03 课已经展示了这一点依赖的机制：每个请求都在 `params._meta` 中携带 `io.modelcontextprotocol/protocolVersion` 和 `io.modelcontextprotocol/clientCapabilities`，因此无需跨请求记住调用方是谁、支持什么。

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "add_item",
    "arguments": {"basket_id": "bsk_3f2a9c11", "sku": "tent"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

即使服务端从未见过这个客户端，处理它的进程此前已经处理过一千个不相关请求，也能给出完全相同的答案。这正是关键：请求本身就是一份完整、独立的操作说明。

由此直接得到一个结论：开放连接不是对话。stdio 进程或 HTTP 连接只是传输通道，传输通道不构成 session 边界。客户端可以在同一传输通道上交错发送属于不同任务、不同用户或不同对话的请求；服务端不能仅因为它们到达同一条连接或同一个进程，就把连接或进程身份当作对话连续性的替代。单个 stdio 进程完全可以先承载一个用户的请求，紧接着承载另一个用户毫不相关的请求；服务端必须正确处理二者，不能假设它们属于同一上下文。

同一规则也约束列表结果。`tools/list`、`resources/list` 与 `prompts/list` 不能因为请求来自哪条连接而变化；服务端也不能像旧时代实现那样，把其他请求的副作用反映到列表中，例如只有同一连接先调用过 `connect_database`，才让 `query` 出现在 `tools/list`。列表可以因为真实原因而变化：当前请求携带的授权。服务端向低权限 token 返回更少工具，是读取当前请求中的 scope，完全符合无状态性的要求。它绝不能从对同一连接早先请求的记忆中读取 scope。

无状态性的纪律之所以值得，是因为它带来直接的运维收益。既然请求不依赖进程内存中的任何东西，负载均衡器后的任意 replica 都能回答任意请求；普通 round robin 路由即可工作，不再需要粘性会话。请求中途失败后，可以安全地重试到另一个 replica，因为重试不必找到记得先前状态的那个进程。replica 崩溃或重启也不会丢失协议所需信息，因为这些信息从一开始就不存放在进程里。

这并不表示服务端永远不能记住任何东西。购物篮、开放的浏览器上下文或长时任务都需要跨越多次工具调用。MCP 使用显式、由服务端签发的 handle，而不是隐式 session 来处理这种状态。创建工具生成不透明标识符，并通过 `structuredContent` 返回；模型将其向后传递，在每个需要该状态的后续调用中作为普通参数传回。

```json
// tools/call: create_basket
{"name": "create_basket", "arguments": {}}

// result
{
  "content": [{"type": "text", "text": "Created basket bsk_3f2a9c11"}],
  "structuredContent": {"basket_id": "bsk_3f2a9c11"},
  "resultType": "complete"
}
```

`basket_id` 本身不是协议功能。它只是工具结果中的普通字符串，也是工具参数中的普通字符串，从线上看与工具返回的其他数据没有区别。协议不会强制执行优秀的 handle 设计，因此责任落在服务端作者身上：handle 应保持不透明，不能编码可供客户端解析或猜测的结构；每次调用都要针对 handle 授权调用方，因为知道一个名称不等于获准使用它；还要在创建工具的描述中写明 handle 生命周期，让模型在决定创建状态前就能看到策略。调用使用已过期、不存在或属于其他调用方的 handle 时，正确响应是工具执行错误，即 `isError: true` 且说明问题的普通结果，而不是 JSON-RPC 协议错误。已过期或外来的 handle 是模型可以通过新建购物篮恢复的业务结果，不是格式错误的请求。

这也回答了运行多个 subagent 的 orchestrator 会遇到的问题：列表结果不能依赖请求来自哪条连接，因此属于同一已认证 principal 的第二条连接——例如 orchestrator 启动的 subagent——会看到与 orchestrator 完全相同的 `tools/list` 结果，可以安全复用缓存，无需重新请求。session 作用域的列表结果无法提供这种保证，因为 session 的定义就是绑定到某一条特定连接。

让无状态性成为默认行为，意味着移除有状态机制依赖的基础设施。协议不再有开场握手：`initialize` 请求与 `notifications/initialized` 都已删除，由逐请求 `_meta` 和第 03 课中的可选 `server/discover` 调用取代。协议也不再有 `Mcp-Session-Id` header，因为根本没有 session 可供它命名。能力不再限定在连接范围内；每个请求都会重新声明能力，因此服务端无需猜测三个请求之前记住的能力是否仍然有效。

```figure
mcpa-04-stateless-requests
```

## 交互实验

图中两个客户端 alice 与 bob 通过 round robin router 向两个 replica A、B 发送请求。两个 replica 都不在内存中保存购物篮状态，而是读写同一个 shared store，并以创建工具返回的不透明 handle 为键。因此无论 router 下一次恰好选择哪个 replica，都能正确回答，与前一次调用由谁处理无关。沿着一个购物篮观察：它在一个 replica 上创建，下一次调用落到另一个 replica，答案仍不改变；整套交互不会暴露背后实际有两个不同进程。

## 实践实验

打开 `code/main.py`。它构建两个共享同一 `SharedStore` 的 replica，以及一个以 round robin 方式分发请求的 `Router`，然后让三个调用方使用这套部署：alice、使用相同 principal 的 alice 第二条连接，以及完全不同的 principal bob。

```bash
python3 code/main.py
```

对照核心概念阅读打印的交互。alice 的第一条连接和第二条连接分别调用 `tools/list`，得到完全相同的工具列表，尽管 round robin router 让两个不同 replica 回答：查看各结果 `_meta` 中的 `serverInfo.name`，可以看到它在 `basket-replica-A` 与 `basket-replica-B` 之间变化，而 `tools` 数组逐字节相同。观察 alice 在一个 replica 上创建购物篮，再通过恰好路由到另一个 replica 的调用添加商品；由于购物篮位于 shared store 而不是任一 replica 内存中，商品添加成功。然后找出两个故意制造的失败。bob 尝试向 alice 的购物篮添加商品，收到 `isError: true` 的普通结果，说明购物篮属于另一个 principal。之后场景中的时钟推进到购物篮生命周期之后，alice 的第二条连接尝试结算同一购物篮，再次收到 `isError: true`，这次说明购物篮已经过期。二者都不是 JSON-RPC error，因为模型可以对这些结果采取行动：创建新购物篮并继续。

## 交付产物

`outputs/stateless-design-checklist.md` 是服务端上线前可执行的一页式检查表：包括无状态不变量、哪些内容可以随连接变化与哪些内容可以随授权变化的区别、设计基于 handle 的有状态工具的五个步骤、发布前检查项，以及 2026-07-28 为默认无状态性移除的三个组成部分。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课中的主张：共享同一 store 的两个 replica 返回相同 `tools/list`；在一个 replica 上签发的 handle 可在另一个 replica 上使用；不同 principal 使用 handle 时会收到工具执行错误；handle 过期后使用也会收到工具执行错误；属于同一 principal 的两条连接看到相同、可缓存的列表结果；缺少 `_meta` 协议字段的请求会以 `-32602` 拒绝；来自两个 principal 的交错请求不会把一方的商品泄漏到另一方购物篮；场景 transcript 中每个请求都携带协议版本和能力。仓库的 wire checker 还会按照 2026-07-28 规则验证本课 transcript：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/04-the-stateless-core
```

## 综合项目关联

综合项目的端到端交互必须不受各请求由哪个 replica 回答的影响；其中的长时任务与 consent flow 都需要跨越多次往返。二者都依赖本课：服务端拥有的状态要么完全不存在于协议层，要么通过显式 handle 引用，并由客户端在线程化的请求中逐次传递。综合项目要求你论证设计为什么可以安全水平扩展时，应回到无状态核心，以及让状态脱离 session 仍可存在的 handle 模式。

## 关键术语

| 术语 | 含义 |
|------|---------|
| 无状态性 | 每个请求都自描述且独立于此前请求的协议不变量 |
| 连接 | 传输层通道（stdio 进程或 HTTP 连接），不是 session 或对话 |
| Replica | 可回答任意请求的多个可互换服务端进程之一，因为没有进程持有私有状态 |
| 服务端签发的 handle | 创建工具返回的不透明标识符，作为普通参数传回以跨调用引用状态 |
| Shared store | 所有 replica 共同读写的持久存储，使状态不驻留于任何单个进程 |
| 工具执行错误 | `isError: true` 的普通结果，是处理已过期、未知或外来 handle 的正确通道 |
| `Mcp-Session-Id` | 曾用于命名协议级 session 的旧 header；已在 2026-07-28 中移除 |

## 延伸阅读

- [MCP 2026-07-28 规范：无状态性](https://modelcontextprotocol.io/specification/2026-07-28/basic#statelessness)
- [MCP 2026-07-28 规范：有状态工具](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#stateful-tools)
- [SEP-2575：让 MCP 无状态化](https://modelcontextprotocol.io/seps/2575-stateless-mcp)
- [SEP-2567：通过显式状态句柄实现无会话 MCP](https://modelcontextprotocol.io/seps/2567-sessionless-mcp)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 4 节
- `phases/13-tools-and-protocols/06-mcp-fundamentals`，构建本课所依赖的逐请求 JSON-RPC 模型
