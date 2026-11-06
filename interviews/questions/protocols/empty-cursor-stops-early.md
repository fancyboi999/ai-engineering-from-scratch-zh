---
id: empty-cursor-stops-early
title: 提前两页结束的翻页循环
card: protocols
kind: code-reading
level: 2
roles: [agentic-ai-engineer, ai-developer-relations-engineer]
rounds: [coding, debugging]
tags: [mcp, pagination, cursor, tools-list, code-reading]
minutes: 7
lessons: [phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content]
manuals: []
practice: []
cheatsheet: [mcp-client-transports]
related: [protocols/two-error-layers]
updated: 2026-11-03
---

某客户端使用下方循环收集 MCP 服务端的完整工具列表：

```python
tools = []
cursor = None
while True:
    result = call("tools/list", cursor=cursor)
    tools.extend(result["tools"])
    if not result.get("nextCursor"):
        break
    cursor = result["nextCursor"]
```

面对某款服务端时，该客户端只能拿到第一页数据，且跟踪记录显示只有一次请求。请阅读上述代码找出 bug。随后列出客户端绝不能对游标执行的另外两件事。

## Short answer

循环对游标做真值测试，而空字符串是有效的游标。服务端在第一页之后返回了 `""`，测试将其读取为 false，循环在第二次请求之前停止了。仅当 `nextCursor` 缺失或为 `null` 时才停止，并将接收到的值原样发回。客户端还绝不能解码游标或比较两个游标的顺序。

## Full answer

### 客户端唯一需要做的判断

```python
if result.get("nextCursor") is None:
    break
cursor = result["nextCursor"]
```

服务端选择分页大小和游标格式。课程中的示例服务端在其第一页之后特意返回 `""`，正确的跟踪记录是一次不带游标的请求，后跟一次游标为 `""` 的请求。

### 游标是不透明的

不要解码游标、递增游标、将其与先前的游标比较，或从中推断页码。服务端可以对游标签名、将其绑定到目录版本，或将其映射到私有状态。那是服务端的细节，可能会在不另行通知的情况下更改。无效的游标返回 JSON-RPC 无效参数（`-32602`）。

### 为什么这个 bug 很重要

工具列表是契约流水线的第一道门槛：发现、准入、调用、执行、消费。丢弃最后几页的客户端会向模型暴露不完整的目录，并可能漏掉要求准入或拒绝的描述符。在准入开始之前，服务发现必须是确定且完整的。

## Follow-ups

- **Level 2:** 到达的一页带有 `nextCursor` 且 `tools` 数组为空。你是否继续？ Expected: 是；只要 `nextCursor` 存在且非 `null`，就继续。
- **Level 2:** 游标看起来像 base64。客户端能否解码以跳过一些页面？ Expected: 否；该值是不透明的，且服务端可能对其签名或将其绑定到目录版本。
- **Level 3:** 服务端应该在游标中放入什么以防止客户端滥用？ Expected: 带有签名或服务端映射的 token，必要时绑定到目录版本，并将无效或陈旧的值拒绝为 `-32602`。
- **Level 4:** 什么证据可以证明网关的完整分页发现？ Expected: 页面跟踪记录、准入和拒绝的描述符集，以及重复调用产生相同逻辑顺序的检查。

## Wrong answers

- "空字符串意味着没有更多页面了。" 它是有效的游标。只有缺失或 `null` 才会结束循环。
- "解析游标以计算页码。" 格式属于服务端，可能是签名或私有状态。
- "比较新游标与旧游标以检测循环。" 客户端绝不能比较游标的顺序。

## Taught in

[工具契约课程](../../../phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content/)展示了双请求游标跟踪记录和不透明游标规则。
