# 保留原始字节与交付身份

> 解码业务数据前，读取被认证的精确正文。

**类型：** Build
**语言：** Go
**阶段：** 第 1 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的此前阶段。
**预计时间：** 约 2 小时

## 构建内容

读取带 X-Delivery-ID、X-Timestamp、X-Signature 的 POST 请求。精确保留原始字节。JSON 空白属于签名内容；解码后重新序列化会改变认证消息。

## 示例推演

磁盘 fixture 正文末尾有换行。为文件签名包含换行。删除末字节会改变签名，即使 JSON 对象表示同样数据。传输交付 ID 不同于正文内业务 eventId。

```figure
pj-signed-webhook-inbox-1
```

## 实现契约

`ReadDelivery(*http.Request)(Delivery,error)` 返回 ID、Timestamp、Signature、Body。要求 POST、规范 int64 十进制时间戳、匹配 [A-Za-z0-9][A-Za-z0-9._-]{0,127} 的 ID，以及 1..65536 原始字节。JSON 有效性是处理阶段的责任。

在生成部分产物前拒绝格式错误的输入。测试包含独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py signed-webhook-inbox --init /tmp/signed-webhook-inbox-work
python3 scripts/project_test.py signed-webhook-inbox --stage 1 --path /tmp/signed-webhook-inbox-work --strict
```

初始化复制累积脚手架，不替换你的工作。实现第一阶段 starter 的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学员工作区。阶段通过后，用自己的输入运行 README 中的命令。

## 检查与扩展

发送空白不同的相同 JSON，比较原始 SHA-256 摘要。签名边界不使用语义 JSON 相等性。

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
