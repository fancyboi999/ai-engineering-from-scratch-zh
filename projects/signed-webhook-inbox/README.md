# 签名 webhook 收件箱

帮助开发者将外部事件送进 agent 工作流，不丢重试，也不接受被改载荷。按原创签名方案验证原始正文，执行时间戳限制，分派前存储稳定交付身份。导出 HTTP 接收器与重放 CLI，区分传输重试和新业务事件。

仅用标准库。四个阶段，约八小时。评分器运行 Go 实现。

## 动手构建

1. [保留原始字节与交付身份](stages/01-preserve-delivery/docs/zh.md)
2. [验证签名与时间戳边界](stages/02-verify-authenticity/docs/zh.md)
3. [用持久化收件箱去重重试](stages/03-durable-deduplication/docs/zh.md)
4. [用处理回执重放已接受交付](stages/04-replay-receipts/docs/zh.md)

```bash
python3 scripts/project_test.py signed-webhook-inbox --init /tmp/signed-webhook-inbox-work
python3 scripts/project_test.py signed-webhook-inbox --stage 1 --path /tmp/signed-webhook-inbox-work --strict
python3 scripts/project_test.py signed-webhook-inbox --all --solution --strict
```

新的 starter 会失败，直到你完成实现。运行参考方案从不授予学员完成证书。

## 运行并检查实际接收器

```bash
cd projects/signed-webhook-inbox/solution
go run . --mode demo
```

自动结束的演示向回环接收器发送真实 HTTP 交付：原始、传输重试、一个原始字节更改。预期状态为 202,200,401，重新打开持久化交付，以同一运行 ID 显式重放接受正文两次。第二次复用处理回执。

自己的持久化收件箱需通过环境管理器用 WEBHOOK_SECRET 提供至少 16 字节共享秘密。不要将真实密钥写入命令历史或源文件。

```bash
go build -o /tmp/webhook-inbox .
/tmp/webhook-inbox --mode serve --dir /tmp/my-webhook-inbox --listen 127.0.0.1:8141 --seconds 120
/tmp/webhook-inbox --mode sign --id delivery-1 --timestamp 1770000000 --body fixtures/event.json
/tmp/webhook-inbox --mode inspect --dir /tmp/my-webhook-inbox --id delivery-1
/tmp/webhook-inbox --mode replay --dir /tmp/my-webhook-inbox --id delivery-1 --run review-1
```

为真实交付签名时使用当前 Unix 时间戳；上方固定时间戳示意头格式。用返回的 X-Delivery-ID、X-Timestamp、X-Signature 头发送精确文件字节。接收器输出监听 URL，有限生命周期后停止。成功 202 表示认证字节已持久接受，不表示业务动作已执行。

原创 v1 方案以 HMAC-SHA256 认证时间戳、交付身份和原始正文，不是 provider 兼容签名格式。磁盘条目用 base64 保留原始载荷；文件是私有证据，不是脱敏助手上下文。新文件仅所有者有权限。

本地持久化用 fsync 和原子硬链接，不覆盖已有身份记录。文件系统缺这些能力则失败。崩溃后可能留待处理临时文件，但不是已接受条目。处理回执是本地 JSON 产物，不证明外部恰好一次副作用。业务事件 ID 和传输交付 ID 保持分离。

[Go HMAC](https://pkg.go.dev/crypto/hmac)、[Go 文件操作](https://pkg.go.dev/os) 和 [Go HTTP](https://pkg.go.dev/net/http) 说明这里使用的原语。

## 完成证据

```bash
python3 scripts/project_test.py signed-webhook-inbox --all --path /tmp/signed-webhook-inbox-work --strict --report /tmp/signed-webhook-inbox-result.json
```

本地报告是未签名、自行报告的证据。可编辑图表计算示意值；CLI 才运行实际实现。
