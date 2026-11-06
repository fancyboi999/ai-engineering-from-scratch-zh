---
id: stream-fails-after-200
title: 答案输出一半后就没了动静
card: production-mlops
kind: debug
level: 2
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, inference-engineer]
rounds: [debugging, coding]
tags: [sse, streaming, error-handling, demo]
minutes: 8
lessons: [phases/17-infrastructure-and-production/29-model-demo-interfaces]
manuals: []
practice: []
cheatsheet: [production-llm-app]
related: [production-mlops/checks-in-order-of-cost]
updated: 2026-11-03
---

演示通过服务器发送事件向页面流式传输 token。用户反馈页面有时显示半个答案就停止，没有提示。服务器日志显示，这些请求恰好都出现了模型异常。为什么用户看不到提示，如何修正协议？

## Short answer

服务器在首个 token 前发送状态为 200 的状态行。此后模型失败，状态无法改变，客户端只看到流提前结束。应在流内发送一个 `error` 事件，让页面将其显示为错误。客户端断开时也要停止生成器，让关闭标签页能停止模型。

## Full answer

### 协议问题

流式响应只有一个状态行，先发出去。之后每个 token 都是响应体的数据块。首个 token 之后生成器抛出异常，无法将 200 改成 500。连接关闭，页面无法区分简短答案和失败。

### 课程中的修复

流生成器捕获异常，再产出一个事件：

```text
event: error
data: {"code":"model_error","message":"...","hint":"...","request_id":"..."}
```

然后返回。页面读取每帧，处理三种事件名：`token` 追加文本，`done` 结束请求并显示统计总数，`error` 显示消息和建议。错误携带请求 ID，让用户反馈能对应到一条日志，无需保存任何输入。

### 两个关键细节

- 页面缓冲收到的字节，在空行处分帧，因为网络数据块可能在事件中途结束。把每个数据块当作一个事件的解析器，处理长答案时会出错。
- `json.dumps` 会转义字符串内的换行，使每个事件只有一条 data 行。data 中未转义的换行会提前结束事件。

### 用户离开时停止模型

用户关闭标签页后，下一次写入会因管道断开而失败。处理器捕获错误并关闭生成器，模型随之停止，请求不再产生成本。课程还在处理器类中设置 socket 超时，防止停止发送数据的客户端占住服务器线程。

### 记录失败

请求处理器在 `finally` 块中为每个请求记录一行日志，包含路由、状态、错误码、延迟和输入长度。因错误事件失败的流会在日志中留下错误码，便于统计。

## Follow-ups

- **Level 2:** 为什么模型中途失败时，服务器不能发送 500？ Expected: 状态行在首个 token 前已发出，一个响应只有一个状态。
- **Level 2:** 用户中途关闭标签页，服务器应该做什么？ Expected: 写入因管道断开而失败，处理器关闭生成器，模型停止。
- **Level 3:** 页面为什么缓冲字节，而不将每个数据块直接解析为事件？ Expected: 数据块可能在事件中途结束，读取器要保留未完整的文本，直到空行到达。
- **Level 3:** 除了消息，错误事件还应包含什么？ Expected: 测试可比对的稳定错误码、包含一个操作的建议，以及将反馈对应到日志记录的请求 ID。

## Wrong answers

- "缓冲完整答案，改为返回 JSON。" 这会取消流式输出，用户每次都要等到最后一个 token。
- "将错误文本作为另一个 token 发送。" 页面无法区分错误和模型输出，done 事件也不会到达。
- "模型失败时，在服务器上重试请求。" 用户已有半个答案，重试会重复输出，并使成本翻倍。

## Taught in

[模型演示界面课程](../../../phases/17-infrastructure-and-production/29-model-demo-interfaces/)手写事件流，在状态行发送后用错误事件报错。
