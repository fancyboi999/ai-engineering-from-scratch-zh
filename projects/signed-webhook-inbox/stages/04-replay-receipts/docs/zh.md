# 用处理回执重放已接受交付

> 明确新的处理运行，同时保持传输去重。

**类型：** Build
**语言：** Go
**阶段：** 第 4 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的此前阶段。
**预计时间：** 约 2 小时

## 构建内容

重放只读收件箱已接受条目。原创本地处理器从 JSON 提取 eventId 与 data，以交付 ID 加显式运行 ID 为键写处理回执。重复同运行返回既有回执；不同运行是有意重放。

## 示例推演

交付 delivery-1 携带 business-42。重放运行 review-1 创建一回执；重复 review-1 不创建。新 delivery-2 可携 business-42，是不同传输身份。业务去重是下游策略。

```figure
pj-signed-webhook-inbox-4
```

## 实现契约

`Replay(dir,id,run,now)(Processing,created,error)`；字段 schemaVersion、deliveryId、runId、businessEventId、bodySHA256、processedAt、payload。CLI 模式 demo、serve、sign、inspect、replay 组合契约。处理器写本地产物，不调用带副作用的外部服务。

在生成部分产物前拒绝格式错误的输入。测试包含独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py signed-webhook-inbox --init /tmp/signed-webhook-inbox-work
python3 scripts/project_test.py signed-webhook-inbox --stage 4 --path /tmp/signed-webhook-inbox-work --strict
```

初始化复制累积脚手架，不替换你的工作。实现第一阶段 starter 的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学员工作区。阶段通过后，用自己的输入运行 README 中的命令。

## 检查与扩展

以幂等键向下游队列提供 receipt.payload。外部恰好一次效果需要独立事务设计；本地处理回执无法建立该保证。

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
