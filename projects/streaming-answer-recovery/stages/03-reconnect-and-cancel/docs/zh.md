# 处理重连与取消

> 从最后接受的事件恢复，不从最后一段字节恢复。

**类型：** Build
**语言：** TypeScript, Go
**阶段：** 3 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

Go 以每次三字节写入提供教学 SSE 流，并故意在 é 的中间关闭第一次请求。TypeScript connect 在下一次请求中发送 Last-Event-ID，创建新解码器，保留已接受的回答状态，并处理 AbortSignal 取消。

## 示例推演

第一次连接接受事件 1，随后以 UTF-8 截断错误结束：文本 Caf、状态 interrupted、lastID 1。重连发送 Last-Event-ID:1。Go 从事件 2 起发送完整事件，最终只生成一次 Café、一个引用及 completed 状态。

```figure
pj-streaming-answer-recovery-3
```

## 实现契约

TypeScript `connect(url,state,onState,signal?):Promise<Answer>` 将每次连接限制为一 MiB，失败时标记 interrupted。数据格式错误、取消或应用完成后，应取消并释放响应读取器，避免失败的流保持打开。Go `Encode(StreamEvent)([]byte,error)`、`After(events,last)([]StreamEvent,error)`、`Handler(events)http.Handler`。没有隐藏的自动重连循环；每次连接由调用者选择。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py streaming-answer-recovery --init /tmp/streaming-answer-recovery-work
python3 scripts/project_test.py streaming-answer-recovery --stage 3 --path /tmp/streaming-answer-recovery-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

在两个事件之间中止。取消的回答必须保留草稿文本，用户点击恢复时不得重连。

[Go 标准库](https://pkg.go.dev/std) 和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
