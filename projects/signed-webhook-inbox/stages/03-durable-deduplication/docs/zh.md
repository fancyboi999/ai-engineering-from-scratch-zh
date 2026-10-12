# 用持久化收件箱去重重试

> 确认交付前，持久化接受的身份和正文。

**类型：** Build
**语言：** Go
**阶段：** 第 3 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的此前阶段。
**预计时间：** 约 2 小时

## 构建内容

写权限 0600 临时文件，同步内容，通过不覆盖的原子硬链接发布。确认成功前同步目录。交付文件名是 ID 的 SHA-256 摘要，防止路径遍历。相同 ID 与原始字节是传输重试；字节改变是冲突。

## 示例推演

首次签名交付返回 HTTP 202。同 ID 和字节返回 200，不替换原 acceptedAt。同 ID、有效新签名、不同正文返回 409。旧签名下更改正文，在存储前返回 401。

```figure
pj-signed-webhook-inbox-3
```

## 实现契约

`Accept(dir,id,body,now)(Entry,created,error)`；`LoadEntry(dir,id)(Entry,error)`。Entry 存 schemaVersion、deliveryId、base64 body、sha256、acceptedAt。`ErrConflict` 标识复用交付 ID。损坏存储记录按拒绝原则失败。

在生成部分产物前拒绝格式错误的输入。测试包含独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py signed-webhook-inbox --init /tmp/signed-webhook-inbox-work
python3 scripts/project_test.py signed-webhook-inbox --stage 3 --path /tmp/signed-webhook-inbox-work --strict
```

初始化复制累积脚手架，不替换你的工作。实现第一阶段 starter 的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学员工作区。阶段通过后，用自己的输入运行 README 中的命令。

## 检查与扩展

在写入与链接间终止进程。未链接 .pending 文件可能留下，但绝不是接受交付。此本地文件系统设计需硬链接和 fsync 支持；不要声称任意网络文件系统有等价行为。

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
