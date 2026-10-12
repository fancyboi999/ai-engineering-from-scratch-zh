# 用确定性时钟建模并发故障

> 在离散事件回放中呈现整体重试负载。

**类型：** Build
**语言：** Go, TypeScript
**阶段：** 1 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

回放全部从时间零开始的客户端。服务在 failUntil 前或同一精确毫秒的计数超过 capacity 时返回 503。计划尝试按时间、再按客户端 ID 排序。成功结束该客户端。提供的固定 Delay 脚手架支持本阶段；下一阶段引入更丰富的退避。

## 示例推演

三个客户端、容量 2、failUntil=0，产生两个初始成功和一个 503。只允许一次尝试时，报告有三次调用和两次成功。初始调用绝不计作重试。

```figure
pj-retry-storm-lab-1
```

## 实现契约

`Replay(clients,failUntil,capacity int,p Policy,budget int)(Report,error)`。Policy 字段为 BaseMS、MaxMS、Attempts、Jitter、Seed。Version-1 报告包含 mode、clients、calls、successes、retries 和 timeline。限制：0..1000 个客户端、1..10 次尝试、正容量、非负时间和预算。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py retry-storm-lab --init /tmp/retry-storm-lab-work
python3 scripts/project_test.py retry-storm-lab --stage 1 --path /tmp/retry-storm-lab-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

比较最繁忙的精确毫秒桶与总放大效应。它们回答的是关于负载的不同问题。

[Go 标准库](https://pkg.go.dev/std) 和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
