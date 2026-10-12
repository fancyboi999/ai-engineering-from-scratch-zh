# 验证签名与时间戳边界

> 按明确教学方案认证身份、时间戳与原始字节。

**类型：** Build
**语言：** Go
**阶段：** 第 2 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的此前阶段。
**预计时间：** 约 2 小时

## 构建内容

原创签名为 v1= 后接小写 HMAC-SHA256 十六进制，输入是 decimalTimestamp + dot + deliveryID + dot + rawBody。共享秘密来自环境变量，从不写入收件箱。用 hmac.Equal 验证，并限制接受的时间戳。

## 示例推演

now=1770000000、窗口 300 秒时，now-300 与 now+300 接受，now-301 过期。即使在时间窗口内，改正文一字节或交付 ID 也认证失败。

```figure
pj-signed-webhook-inbox-2
```

## 实现契约

`Sign(key []byte,id string,timestamp int64,body []byte)string`；`Verify(Delivery,key,now,skew)error`。密钥至少 16 字节；skew 为 0..1 小时。接收器用五分钟。格式为原创，不兼容任何具名 webhook provider。

在生成部分产物前拒绝格式错误的输入。测试包含独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py signed-webhook-inbox --init /tmp/signed-webhook-inbox-work
python3 scripts/project_test.py signed-webhook-inbox --stage 2 --path /tmp/signed-webhook-inbox-work --strict
```

初始化复制累积脚手架，不替换你的工作。实现第一阶段 starter 的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学员工作区。阶段通过后，用自己的输入运行 README 中的命令。

## 检查与扩展

先实现、测试 provider 已发布的原始字节签名规则，再加适配器。不要假定其他服务使用相同拼接顺序。

[Go HMAC](https://pkg.go.dev/crypto/hmac) 和 [Go SHA-256](https://pkg.go.dev/crypto/sha256)。
