# 将分块字节解码为完整事件

> 让 UTF-8 和 SSE 分帧跨越任意传输边界。

**类型：** Build
**语言：** TypeScript, Go
**阶段：** 1 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

构建增量 UTF-8 解码器和行解析器。处理 LF、CRLF 和 CR，即使分隔符或多字节字符跨越分块。空行分派数据；EOF 本身不分派。忽略注释。多个 data 字段用换行连接。

## 示例推演

将 é 的两个字节分到不同 push 中。不应出现替换字符。`id: 1`、`data: Caf` 和空行分派一个事件。没有新 id 的事件继承上一个 id；空 id 重置它。

```figure
pj-streaming-answer-recovery-1
```

## 实现契约

`new SSEDecoder().push(bytes:Uint8Array,final=false):Event[]`，Event 为 `{id,event,data}`。默认事件类型是 message。忽略含 NUL 的 id 值。最终刷新拒绝截断的 UTF-8，丢弃未分派的数据。此子集忽略 retry 字段。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py streaming-answer-recovery --init /tmp/streaming-answer-recovery-work
python3 scripts/project_test.py streaming-answer-recovery --stage 1 --path /tmp/streaming-answer-recovery-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

尝试末尾只有 data 行、没有空行的输入。解释为什么过早分派可能显示不完整的 JSON。

[WHATWG 服务端发送事件](https://html.spec.whatwg.org/multipage/server-sent-events.html)。
