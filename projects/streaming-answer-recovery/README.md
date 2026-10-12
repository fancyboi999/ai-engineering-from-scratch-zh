# 流式回答恢复

为集成助手输出的开发者构建浏览器回答视图和本地事件流。处理拆分的 UTF-8 字节、事件 ID、重连、取消和部分引用。区分中断的草稿与完成的回答，并提供可下载的事件轨迹来复现渲染故障。

仅使用标准库。四个阶段，约八小时。评分器会测试 TypeScript 和 Go 实现。

## 动手构建

1. [将分块字节解码为完整事件](stages/01-decode-sse/docs/zh.md)
2. [按稳定身份渲染文本和引用](stages/02-stable-answer-state/docs/zh.md)
3. [处理重连与取消](stages/03-reconnect-and-cancel/docs/zh.md)
4. [导出并回放中断回答的轨迹](stages/04-trace-and-component/docs/zh.md)

```bash
python3 scripts/project_test.py streaming-answer-recovery --init /tmp/streaming-answer-recovery-work
python3 scripts/project_test.py streaming-answer-recovery --stage 1 --path /tmp/streaming-answer-recovery-work --strict
python3 scripts/project_test.py streaming-answer-recovery --all --solution --strict
```

全新的 starter 在实现前会失败。运行参考方案绝不会授予学习者完成证书。

## 运行实际的中断流

```bash
cd projects/streaming-answer-recovery/solution
python3 demo.py
node --experimental-strip-types build-browser.ts /tmp/stream-browser
```

演示构建 Go fixture，启动有有限生命周期的回环服务，读取其 URL，然后运行 TypeScript 客户端两次。第一次输出在事件 1 中断，为 Caf。恢复发送 Last-Event-ID:1，将其完成为 Café，不重复文本。已接受事件的轨迹写入 /tmp/aiefs-answer-trace.json，由实际状态归约器回放。

使用你自己的 SSE 端点：`node --experimental-strip-types cli.ts URL /tmp/trace.json`。CLI 最多建立两次连接。浏览器集成时，从生成的 answer.js 导入 `mount`，使用同源 SSE URL 挂载；或者在自己的服务上配置 CORS。完整本地浏览器运行使用 `go run . --listen 127.0.0.1:8137 --seconds 120 --web /tmp/stream-browser`，打开 localhost:8137。Go fixture 在同一来源提供生成的页面和 /events，不授予跨源访问。有限生命周期服务在指定时间后退出。

SSE 解析器支持 UTF-8、CR/LF 分帧、注释、data 字段、事件类型及持久的最后 ID。它忽略 retry 字段；重连策略归调用者。教学回答协议要求连续的正数事件 ID，以及 text/citation/complete 载荷类型。这是教学协议，不是任何特定 LLM provider 的适配器。

轨迹 schema version 1 包含已接受事件和状态。它复现渲染状态，包括中断或取消的回答，不保留部分传输字节。completed 状态需要明确的 complete 事件。[WHATWG SSE](https://html.spec.whatwg.org/multipage/server-sent-events.html)定义了分帧和恢复字段。

## 完成证据

```bash
python3 scripts/project_test.py streaming-answer-recovery --all --path /tmp/streaming-answer-recovery-work --strict --report /tmp/streaming-answer-recovery-result.json
```

本地报告未经签名，是自行报告的证据。可编辑图表计算示例值；CLI 运行实际实现。
