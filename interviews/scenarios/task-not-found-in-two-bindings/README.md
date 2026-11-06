---
id: task-not-found-in-two-bindings
title: 同一个错误，两种状态码
card: scenarios
kind: incident
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, system-design]
tags: [a2a, errors, json-rpc, retries, idempotency]
minutes: 20
lessons: [phases/14-agent-engineering/26-failure-modes-agentic]
manuals: []
practice: []
cheatsheet: [a2a, agent-failure-modes]
related: []
updated: 2026-11-03
system:
  version: A2A 1.0.1 with the manual's capture kit (the test-runner, code-reviewer and deployer agents)
  model: no model; the agents are deterministic fixtures
  hardware: one machine, localhost, no network
source:
  - manuals/a2a-101/capture/out/11-errors.http
  - manuals/a2a-101/capture/out/16-rest-binding.http
  - manuals/a2a-101/sections/5-5-errors.md
  - manuals/a2a-101/sections/5-1-json-rpc.md
  - manuals/a2a-101/sections/5-2-http-json.md
  - manuals/a2a-101/sections/r-4-errors.md
---


## Situation

一个规划器将测试运行任务委派给远程 `test-runner` agent。其底层传输层最初是为常规 REST 服务编写的：2xx 响应代表成功；404 代表记录尚未对外可见（客户端会等待并重新请求）；5xx 则触发带退避的重试机制。规划器最初通过 JSON-RPC 接口与 agent 通信。昨晚它查询了一个已被 agent 清除的任务 ID，将该查询记录为成功，随后因结果内容为空发生崩溃。

一位同事今早将规划器迁移到了 agent 的 HTTP+JSON 接口上，“这样我们就能拿到真正的 HTTP 状态码”。现在相同的查询返回了 404，规划器在整整一个小时内每两秒就发起一次重复查询。你需要让客户端在两种协议绑定下都能在正确的时机停止，且不为每种错误单独写特殊处理。

## Evidence

- [通过 JSON-RPC 查询未知 ID 的 GetTask 响应](evidence/jsonrpc-lookup.txt)
- [同一 JSON-RPC 错误的 data 字段中的详情](evidence/jsonrpc-reason.txt)
- [通过 HTTP+JSON 执行相同查询的响应头及响应体首部](evidence/rest-lookup.txt)
- [HTTP+JSON 错误中的详情](evidence/rest-reason.txt)
- [九种 A2A 协议错误在各绑定下的错误码映射对照表](evidence/error-table.txt)
- [客户端可以重试哪些错误](evidence/retry-rules.txt)

## Questions

1. JSON-RPC 响应在哪里表明查询失败？HTTP 状态码又说明了什么？
2. 哪个字段在两种响应中完全一致，哪些字段存在差异？
3. 九种 A2A 错误中有多少种映射到了同一个 HTTP 状态码，这对单纯依赖状态码的策略有何影响？
4. 客户端允许重试哪些错误，面对任务未找到应当如何处置？
5. 规划器在超时后同样会对 SendMessage 执行重试。它必须保持什么不变，为什么？

## Walkthrough

1. **读 JSON-RPC 响应。** 状态行是 `200 OK`，响应体没有 `result`，而是一个 `error` 成员，错误码为 -32001，消息为 `Task not found`。这个绑定的每条响应都是 200，所以状态码不提供信息。客户端必须先打开响应体、检查 `error`，再读取 `result`。
2. **读 `data` 中的详情。** 它是一个只含一个对象的列表。对象的 `reason` 为 `TASK_NOT_FOUND`，`domain` 为 `a2a-protocol.org`，`metadata` 中再次给出了任务 ID。reason 是去掉后缀的错误名称，客户端可以依据这个字段做决定。
3. **读 HTTP+JSON 响应。** 状态行是 `404 Not Found`。响应体是一个 Status 对象，`code` 为 404，`status` 为 `NOT_FOUND`，消息相同，JSON-RPC 的 `data` 在这里变成了 `details`。details 中的详情对象和 reason 都相同。外层包装变了，错误没变。
4. **读映射表。** 九种 A2A 错误中有七种映射为 HTTP 400，`InvalidParamsError` 也映射为 400。三种 JSON-RPC 解析与请求错误则没有 HTTP 状态码。只依赖状态码的规则无法区分任务不可取消与请求字段有误。只有 `TaskNotFoundError` 映射为 404，所以遇到 404 就等待的 REST 策略，等的恰好是那种永远不会消失的错误。
5. **套用重试规则。** `-32603`、HTTP 500 或 503，或连接中断：退避重试，并遵循 `Retry-After`；HTTP 401：获取新凭证；`-32600`、`-32602`、`-32005` 和 `-32009`：修正请求；`-32001`：停止，因为 ID 有误、已被清除，或对调用者不可见；`-32002`，或终态任务上的 `-32004`：开始新任务；`-32003` 或 `-32007`：重新读取卡片。服务器不得泄露调用者无权查看的任务，所以 not found 也可能表示“你无权查看”。
6. **检查另一种重试。** 超时的 SendMessage 可能已经创建了任务。按 `messageId` 检测重复是可选功能，所以使用新 ID 重发可能会创建第二个任务。规划器用相同的 `messageId` 重发相同字节，给服务器识别重复请求的机会。

## Resolution

客户端只解析了传输层，没有解析协议。修复是让两种绑定共用一个错误解析器。先读 HTTP 状态，再读 `error` 成员或 Status 响应体，最后读取首个详情对象的 `reason`。依据 reason 决定重试、重新鉴权、修正请求或停止。遇到 `TASK_NOT_FOUND` 时，规划器在两种绑定中都只接收一次响应就停止，采集记录也展示了这一点：针对未知 ID，JSON-RPC 和 HTTP+JSON 都各有一次请求和一次响应。重试发送时保持 `messageId` 不变。此后不再出现一小时的重复查询，因为决策不再依赖某种绑定根本不使用的状态码。

## Wrong turns

- "把所有客户端都切到 HTTP+JSON，状态码就是真实的了。" 九种 A2A 错误中有七种在这里返回 400，参数无效也一样。状态码仍然不能指出具体错误。
- "匹配消息文本。" 消息是给人看的。参考实现用其他措辞和字段名响应相同情况，所以换一个服务器，文本匹配就会失效。
- "把 404 当作最终一致性问题，继续轮询。" 规范要求服务器对已清除的 ID 和调用者无权查看的任务返回 not found。后续调用不会改变这个回答。
- "为保险起见，用新的 messageId 重发。" 重复检测是可选功能，新 ID 去掉了服务器仅有的线索。测试套件可能运行两次。

## Generalize

HTTP 承载的协议有两层状态。传输状态说明字节是否送达。协议自身的错误说明请求发生了什么，在某些绑定里，它藏在 200 后面。依据协议的判别字段做决定，明确列出少量可重试错误，并让服务器能看到每次重试的幂等键。

## Taught in

[A2A 101 的错误页面](../../../manuals/a2a-101/sections/5-5-errors.md)解读了这两类响应并给出了重试准则，[错误对照表](../../../manuals/a2a-101/sections/r-4-errors.md)将所有错误映射至三种协议绑定，而[失败模式课](../../../phases/14-agent-engineering/26-failure-modes-agentic/)指出了客户端无法区分失败与成功时会引发的级联故障。
