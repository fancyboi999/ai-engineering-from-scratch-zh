# 验证胜出响应并核算迟到工作

> 快速错误不能胜出；取消是观测，不是费用保证。

**类型：** Build
**语言：** Go
**阶段：** 第 3 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的此前阶段。
**预计时间：** 约 2 小时

## 构建内容

只有 HTTP 200 且 JSON value 非空才能胜出。最多读取 64KiB。胜出后请求取消，最多用 100ms 收集未完成客户端观测。宽限期结束则记录未观测尝试。胜出后到达的尝试标记 late，即使以取消结束。

## 示例推演

主端点在 1ms 返回 HTTP 500，不能胜过次端点在 15ms 返回的有效 JSON。胜出索引为 1。客户端取消后，fixture 仍可能完成主服务工作。

```figure
pj-hedged-request-lab-3
```

## 实现契约

`ValidBody(status int,body []byte)(string,error)`；`Read(ctx,client,endpoint,index) Attempt`。Attempt 记录 status、valid、cancelled、late、elapsedMs 和可选 value/error。Receipt 区分 cancelRequested 和 unobserved。客户端结果不能证明服务计算已停止。

在生成部分产物前拒绝格式错误的输入。测试包含独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py hedged-request-lab --init /tmp/hedged-request-lab-work
python3 scripts/project_test.py hedged-request-lab --stage 3 --path /tmp/hedged-request-lab-work --strict
```

初始化复制累积脚手架，不替换你的工作。实现第一阶段 starter 的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学员工作区。阶段通过后，用自己的输入运行 README 中的命令。

## 检查与扩展

使用刻意忽略请求取消的端点。比较客户端 cancelled 与 fixture 完成工作计数。

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
