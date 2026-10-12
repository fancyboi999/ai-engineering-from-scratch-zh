# 实施共享重试预算和服务端延迟

> 限制跨客户端的总尝试次数，而不只是单个请求。

**类型：** Build
**语言：** Go, TypeScript
**阶段：** 3 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

在 Replay 中加入计划重试的共享上限。互斥锁保护的 Budget 用 Take 限制实时 goroutine 的总准入数量。将 Retry-After 解析为非负整数秒或 HTTP 日期。过去的 HTTP 日期得到零延迟。

## 示例推演

二十个客户端各自可能允许四次尝试，但共享预算 12 将模拟总调用限制在 32 次。模拟中的准入由计划顺序确定，实时模式则依赖 goroutine 顺序。

```figure
pj-retry-storm-lab-3
```

## 实现契约

`NewBudget(n int)*Budget`；`(*Budget).Take()bool`；`ServerDelay(value string,now time.Time)(time.Duration,error)`。无效值失败。实时服务端延迟超过 MaxMS 时停止请求，而不是比指示时间更早重试。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py retry-storm-lab --init /tmp/retry-storm-lab-work
python3 scripts/project_test.py retry-storm-lab --stage 3 --path /tmp/retry-storm-lab-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

进程内互斥锁不是整个客户端集群的分布式预算。跨进程共享此策略前，先定义集中式准入协议。

[Go 标准库](https://pkg.go.dev/std) 和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
