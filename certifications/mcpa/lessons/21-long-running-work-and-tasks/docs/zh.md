# 长时间运行的工作与 Tasks Extension

> 阻塞连接，直到持续数分钟或数小时的工作结束，会把无状态性带来的好处全部丢掉：其他 replica 无法接手，连接中断也会丢失 job。tasks extension 用 durable handle 取代这种阻塞调用。

**类型：** Reference
**语言：** Python
**前置要求：** 第 20 课
**预计时间：** 约 45 分钟

## 学习目标

- 解释为何长时间运行的工作不能阻塞请求：request 与传输 timeout、执行中没有输入通道、崩溃后无法恢复
- 逐请求协商 `io.modelcontextprotocol/tasks` extension：在 `clientCapabilities.extensions` 中声明，并在 `server/discover` 中确认
- 读取服务器决定返回的 `CreateTaskResult`（`resultType: "task"`）并轮询 `tasks/get`，区分 RPC 自身的 `resultType` 与 task 内嵌的 `status`
- 使用 `tasks/update` 提供执行中输入，使用 `tasks/cancel` 请求协作式取消，并解释为何两者只返回 acknowledgement
- 区分当前 extension 与已移除的 2025-11-25 实验版 tasks 功能，包括 `tasks/result` 和 `tasks/list` 分别由什么取代
- 为具体工作选择普通调用、Multi Round-Trip Request、task 或服务器生成的 handle

## 问题背景

有些工具调用无法在一次请求内完成。CI pipeline、批量导入、执行中途需要人工批准的报告：这类操作会持续数秒、数分钟甚至更久，其耗时并不是必须消除的缺陷。一直保持连接打开，等到最后一个字节处理完，会同时遇到三类失败。

第一类是服务器无权配置的 timeout。客户端、proxy、load balancer 各自限制单次请求能保持多久，这些限制通常针对普通查询，而非运行二十分钟的 deploy pipeline。第二类是阻塞请求没有剩余通道让服务器询问客户端。工具若执行到一半才发现需要人工批准，便无处提交请求：MRTR 会先以 `input_required` 结束当前请求，再由客户端用新请求补充答案；它不能把一个连接保持数小时来处理长期任务。第三类是持久性。客户端进程重启或连接中断后，阻塞调用不会留下任何痕迹。客户端无法查询工作是否完成，只能永远等待，或重新提交一个可能已经在运行、甚至已产生真实副作用（如实际部署）的任务。

无状态核心让问题更加尖锐，而非缓和。第 04 课解释过为何没有 session 可以兜底：请求之间不会记住任何内容，所以服务器不能暗中把 job 绑定到某条连接，再在之后从那里恢复。长时间运行的工作必须明确回答无状态性对一切事物提出的同一个问题：如何跨请求、重启和 replica 标识这项工作，使任何实例都能继续处理？

## 核心概念

MCP 使用官方 extension `io.modelcontextprotocol/tasks`（SEP-2663）回答这个问题。支持它的服务器可以针对符合条件的请求返回 durable handle（即 task），而非最终答案；客户端则通过三个以该 handle 为目标的方法进行轮询、提供输入和取消。

协商按请求进行，与协议其他能力完全一样。客户端在当前请求的 `io.modelcontextprotocol/clientCapabilities.extensions` 中声明 extension，服务器则通过 `server/discover` 返回的 `capabilities.extensions` 宣告同一标识符。在一次调用中声明 extension 不会延续到下一次：没有 session 可以记住它。因此，客户端若希望之后的 `tasks/get` 也支持 task，必须在该请求上再次声明 extension。

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "run_build_pipeline",
    "arguments": {"project": "web-storefront", "environment": "production"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {"io.modelcontextprotocol/tasks": {}}
      }
    }
  }
}
```

是否创建 task 由服务器决定。声明 extension 只表示客户端准备好接收任一响应结构；服务器独自针对每个请求决定本次调用是否转为 task。即使是同一个工具，声明 extension 的客户端也必须能处理普通 `CallToolResult` 或 `CreateTaskResult`，不同调用可能返回不同结构。当前版本只有 `tools/call` 支持 task augmentation。

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "resultType": "task",
    "taskId": "tsk_786512e29e0d",
    "status": "working",
    "statusMessage": "Installing dependencies and running tests.",
    "createdAt": "2026-09-24T10:30:00Z",
    "lastUpdatedAt": "2026-09-24T10:30:00Z",
    "ttlMs": 900000,
    "pollIntervalMs": 2000
  }
}
```

在服务器发出 handle 前，使用该 handle 的 `tasks/get` 必须已经能够解析成功。若存储系统是最终一致的，服务器就应等待写入可见后再回答；跳过这一步会给客户端一个立即报告不存在的 `taskId`，还不如多阻塞片刻。

客户端使用 `tasks/get` 轮询，只发送收到的 `taskId`。该高熵 id 只负责定位，不能替代授权：服务器必须将 task 绑定到创建时的认证主体，并在每次 `tasks/get`、`tasks/update`、`tasks/cancel` 上检查调用方是否有权访问。考试喜欢考一个细节：`tasks/get` 本身是会完成的普通请求，所以它自身的 `resultType` 始终是 `"complete"`。底层 job 的状态——`working`、`input_required`、`completed`、`failed`、`cancelled`——位于同一 result 内另一个内嵌 `status` 字段，而不是 `resultType`。混淆两者看似无害，但客户端一看到 `resultType: "complete"` 就停止轮询时便会出错，因为无论 job 是否仍在运行，每次 poll 都是这个值。

不存在 `tasks/result`。task 达到 `completed` 后，紧接着的 `tasks/get` 响应会在 `result` 下内联原始结果，其结构与同步请求原本返回的完全相同。task 达到 `failed` 时，同一响应会在 `error` 下携带 JSON-RPC 错误。以 `isError: true` 结束的工具调用仍属于 `completed`，因为调用在协议层正常成功；`failed` 只保留给执行期间的 JSON-RPC 错误，不能用于普通工具层失败。

同样不存在 `tasks/list`。2025-11-25 实验版曾包含该方法，但无 session 服务器没有安全的 task 列表 scope：既没有 session 也没有可绑定列表的连接，朴素实现要么把每个调用方的 task 泄露给其他人，要么不得不发明基础协议未定义的授权模型。需要 task 历史记录的产品应暴露自己的、经过授权和过滤的工具；通用列表调用因默认不安全而被删除。

task 可在执行中暂停，请求创建时尚不需要的输入。其 status 变为 `input_required`，同一次 `tasks/get` 响应增加 `inputRequests` map，其中每项结构类似一条 MRTR request：`elicitation/create`、`sampling/createMessage` 或 `roots/list`。客户端使用 `tasks/update` 回答，发送以相同 key 组织的 `inputResponses`，只得到空 acknowledgement；更新后的 status 要到下一次 poll 才会出现，而不在该响应中。虽然结构相似，这与核心 MRTR 是不同的 continuation：MRTR 使用新 id 重试原请求，而 `tasks/update` 是以 `taskId` 为目标的独立方法，客户端绝不重发原始 `tools/call`。每个 `inputRequests` key 在 task 生命周期内保持唯一，因此服务器会忽略从未签发或已经满足的 key；客户端则应在重复 poll 时去重已向用户展示的 key。

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tasks/update",
  "params": {
    "taskId": "tsk_786512e29e0d",
    "inputResponses": {
      "approve_deploy": {"action": "accept", "content": {"approved": true}}
    },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {"io.modelcontextprotocol/tasks": {}}
      }
    }
  }
}
```

取消的工作方式相同：`tasks/cancel` 只发送 `taskId`，返回空 acknowledgement。它是协作式请求，而非保证；服务器记录取消意图，但仍可能完成工作，因为中途停止未必安全或可行。这里不要使用 `notifications/cancelled`。该 notification 用于终止某条传输 stream 上仍未结束的请求，而 task 的初始请求在返回 `resultType: "task"` 时就已完成，根本没有未结束请求可以这样取消。durable job 一旦存在，`tasks/cancel` 是唯一取消入口。

客户端若在具体 task 方法请求中没有声明 extension，会收到 `-32021` Missing Required Client Capability，并在 `data.requiredCapabilities` 中列出该 extension。未知、过期或调用方无权访问的 `taskId` 在本实验中均返回 `-32602`，不向其他主体暴露 task 是否存在；高熵 `taskId` 与逐请求授权是两道独立控制。该错误码与第 18 课中畸形请求的错误码相同，因为 `tasks/get`、`tasks/update`、`tasks/cancel` 都是普通 JSON-RPC request，受协议通用规则约束，包括逐请求元数据。

四种模式的选择取决于什么需要在当前请求之后继续存在。工作快速且确定时，普通调用足够。服务器只需一个简短答案就能完成当前请求时，MRTR 往返（第 14 课）足够。工作可能超过 timeout、执行中途可能暂停等待输入，或需要跨客户端重启与主动取消存活时，task 的额外复杂度才值得。服务器生成的 handle（第 04 课模式）解决的是完全不同的问题：它把购物车或打开的 session 等跨调用应用状态作为普通工具参数向前传递。`taskId` 恰好是这一思想的一个实例，专用于轮询单个延期工作单元，而不是无限期保持状态。

```figure
mcpa-21-task-states
```

## 交互实验

图中列出 task 能到达的所有 status，以及推动每次转移的调用。沿 `working` 向上到 `input_required`，注意这条边由服务器自身决定，而不是由客户端请求触发；再沿返回边向下，标签正是客户端实际发送的 `tasks/update`。右侧有三个从 `working` 分出的终态：工作完成进入 completed，客户端请求后进入 cancelled，协议错误中断执行后进入 failed。三者都用虚线边框标识终态：task 一旦进入其中之一，`tasks/get` 会持续返回同一 snapshot。

## 实践实验

打开 `code/main.py`。`run_build_pipeline` 始终是同一个工具，input schema 和 job 也相同：安装、测试，并在批准后把项目部署到指定 environment。唯一变化是调用方是否声明 `io.modelcontextprotocol/tasks`。

```bash
python3 code/main.py
```

结合概念章节阅读输出交互。未声明 extension 的部署调用会返回 `-32021`，说明完成部署必须取得 task 能力和明确批准；声明 extension 的调用则立即得到 `resultType: "task"`。实验在 poll 之间显式推进 task，模拟真实 worker 在独立请求间推进，而不是让后台 thread sleep，因此 transcript 中每次状态转移都确定且可重复。沿一个 `taskId` 追踪：从第一次 `working` poll，到 `input_required`，再经过提供 `{"approved": true}` 的 `tasks/update`，最后到 `completed` poll；将其中内嵌的 `result` 与未声明 extension 时返回的能力错误比较。随后找到两个错误：对从未创建的 `taskId` 调用 `tasks/get` 返回 `-32602`；使用相同有效 `taskId`，但客户端本次 poll 未声明 extension，则返回 `-32021`。

## 交付产物

`outputs/long-running-work-patterns.md` 是一份决策参考：何时选择普通调用、MRTR 往返、task 或服务器生成的 handle；能力协商检查清单；`CreateTaskResult` 字段；轮询与状态规则（包括区分 `tasks/get` 和内嵌 `status`）；以及 2025-11-25 实验方法替代项表格。若工具可能无法在调用方耐心耗尽或传输 timeout 前返回，可把它放在服务器工具描述旁查阅。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课结论：没有 extension 的部署调用返回 `-32021`；声明后返回 task handle；轮询中的 status 确实从 `working` 进入 `input_required`；`input_required` snapshot 暴露结构正确的 `inputRequests`；`tasks/update` 使 task 恢复；`completed` snapshot 内联原始结果结构；`tasks/cancel` 将 working task 转为 `cancelled`；未知 `taskId` 属于协议错误；同一个 task 方法若未声明所需能力则返回 `-32021`。仓库 wire checker 也会按 2026-07-28 规则验证 transcript：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/21-long-running-work-and-tasks
```

## 综合项目关联

综合项目中经过审计的工具调用可能运行足够久，或需要足够多的执行中批准，因此适合成为 task，而非普通调用。一旦如此，本课的四个问题会直接适用：客户端是否在本次请求中声明 extension，服务器是否宣告支持，handle 返回前是否 durable，以及每次 poll 是否区分 wrapper 自身的 `resultType` 与 job 内嵌的 `status`。

## 关键术语

| 术语 | 含义 |
|------|------|
| `io.modelcontextprotocol/tasks` | 用于 durable、由服务器决定的异步工作的官方 extension 标识符 |
| `CreateTaskResult` | 服务器可用来代替普通结果的 `resultType: "task"` 响应 |
| `tasks/get` | 按 `taskId` 轮询单个 task 的完整当前 snapshot |
| `tasks/update` | 为 task 尚未完成的 `inputRequests` 提交 `inputResponses` |
| `tasks/cancel` | 发出单个 task 的协作式取消意图 |
| `input_required` | 表示服务器需要客户端输入后才能继续的 task status |
| `pollIntervalMs` | 服务器当前建议的最短 poll 间隔 |
| `ttlMs` | 从 task 创建时开始计算的过期时长 |
| 返回前持久化 | `taskId` 交给客户端前必须已经可以解析的规则 |
| 协作式取消 | `tasks/cancel` 记录意图；服务器不保证停止工作 |

## 延伸阅读

- [MCP 扩展：Tasks](https://modelcontextprotocol.io/extensions/tasks/overview)
- [SEP-2663：Tasks 扩展](https://modelcontextprotocol.io/seps/2663-tasks-extension)
- [SEP-1686：Tasks（2025-11-25 实验版，历史记录）](https://modelcontextprotocol.io/seps/1686-tasks)
- [Stateful Tools，MCP 2026-07-28 规范](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#stateful-tools)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 4、14 节
- `phases/13-tools-and-protocols/13-mcp-async-tasks`，构建支持重启恢复和共享 durable store 的 task worker
