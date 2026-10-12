# 重试风暴实验

帮助 SDK 作者在大量客户端同时失败时选择重试行为。用确定性服务模型回放并发客户端，对比有界退避、抖动和共享重试预算，再对本地 HTTP fixture 运行同一策略。导出放大效应与恢复时间线，以及可复用客户端策略。

仅使用标准库。四个阶段，约八小时。评分器会测试 Go 和 TypeScript 实现。

## 动手构建

1. [用确定性时钟建模并发故障](stages/01-deterministic-service/docs/zh.md)
2. [比较有界退避与抖动](stages/02-bounded-jitter/docs/zh.md)
3. [实施共享重试预算和服务端延迟](stages/03-shared-budget/docs/zh.md)
4. [对本地 HTTP 服务回放](stages/04-local-http-replay/docs/zh.md)

```bash
python3 scripts/project_test.py retry-storm-lab --init /tmp/retry-storm-lab-work
python3 scripts/project_test.py retry-storm-lab --stage 1 --path /tmp/retry-storm-lab-work --strict
python3 scripts/project_test.py retry-storm-lab --all --solution --strict
```

全新的 starter 在实现前会失败。运行参考方案绝不会授予学习者完成证书。

## 运行受控比较

```bash
cd projects/retry-storm-lab/solution
go run . --clients 20 --budget 60 --jitter=false --out /tmp/synchronized.json
go run . --clients 20 --budget 60 --jitter=true --seed 7 --out /tmp/jittered.json
go run . --clients 20 --budget 12 --seed 7 --out /tmp/retry.json
node --experimental-strip-types cli.ts /tmp/retry.json /tmp/amplification.json
go run . --local-http --clients 20 --budget 12 --out /tmp/retry-wire.json
node --experimental-strip-types cli.ts /tmp/retry-wire.json
python3 demo.py
```

用 --base-ms、--max-ms 和 --attempts 设置策略边界。模拟输入 --fail-until-ms 和 --capacity 改变故障窗口和每毫秒容量。--jitter=false 保留同步的指数等待；--jitter=true 使用种子来分散请求。

模拟器是离散、精确到毫秒的容量模型。真实回环 fixture 对每个客户端先返回一次 503，随后返回 200；它不建模外部服务容量。JSON 的 mode 区分两者。TypeScript 消费 Go 回执，验证所有计数器并导出放大效应时间线。

使用你自己的 context、有界 http.Client 和 URL 复用 Go `Fetch` 客户端。它只执行 GET，返回每个观察到的尝试，不重试传输错误或未列出的状态。服务端 Retry-After 超过策略上限时结束请求。重定向行为和连接限制由提供的 HTTP 客户端决定。取消限制等待，但不能证明上游工作已停止。默认 Local 适配器为每个客户端设置两秒截止时间。

预算在进程内，由 fixture 的客户端共享。它绝不声称支持事务回滚或跨进程协调。实时峰值对齐各客户端的经过时间，模拟峰值则共享同一精确时钟。[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after)规定了 Retry-After。

## 完成证据

```bash
python3 scripts/project_test.py retry-storm-lab --all --path /tmp/retry-storm-lab-work --strict --report /tmp/retry-storm-lab-result.json
```

本地报告未经签名，是自行报告的证据。可编辑图表计算示例值；CLI 运行实际实现。
