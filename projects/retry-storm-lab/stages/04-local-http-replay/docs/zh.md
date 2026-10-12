# 对本地 HTTP 服务回放

> 执行实际 HTTP 请求，独立验证导出的计数器。

**类型：** Build
**语言：** Go, TypeScript
**阶段：** 4 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

Fetch 执行有界 GET 尝试，支持 context 取消、可重试状态 429/502/503/504 和共享预算。Local 对回环服务运行并发客户端，该服务对每个客户端返回一次 503 后成功。TypeScript 从导出轨迹独立重建计数器和毫秒桶。

## 示例推演

用二十个客户端、预算 12 运行 local-http。fixture 收到二十个初始请求和最多十二个重试请求。报告将这个实测回环运行与确定性模拟分开。

```figure
pj-retry-storm-lab-4
```

## 实现契约

`Fetch(ctx,*http.Client,url,id,Policy,*Budget)([]Attempt,error)`；`Local(Policy,clients,budget)(Report,error)`。TypeScript `analyze(text)` 在计算放大效应前，检查尝试编号连续性、客户端边界、成功终止性和计数器一致性。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py retry-storm-lab --init /tmp/retry-storm-lab-work
python3 scripts/project_test.py retry-storm-lab --stage 4 --path /tmp/retry-storm-lab-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

实时模式的毫秒桶使用每个客户端启动后的经过时间，因此峰值应视为近似对齐的客户端证据。本地结果不能证明任何外部服务的容量。

[HTTP Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after) 和 [Go HTTP](https://pkg.go.dev/net/http)。
