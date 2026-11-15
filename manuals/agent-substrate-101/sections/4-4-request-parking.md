# 请求暂存

> 当没有 worker 有空闲时，router 会将请求最多暂存 5 秒并重试恢复，之后才回复 503。

二十位用户在同一秒打开会话，而你的 pool 只能容纳十六个 actor。四个请求没有 worker 可用。你需要知道这四位用户是会立刻看到错误、经历延迟，还是在延迟后才看到错误。答案是三种都会发生，由 router 决定是哪一种。

读完本节，你能预测 pool 满载时客户端会看到什么。你还能区分两种容量不足的 503 文案，并合理设定客户端超时。

## 当 pool 满载时 router 会做什么 {#s-request-parking-what-the-router-does-when-a-pool-is-full}

发给 actor 的每个请求都会经过 `atenet-router`，router 会为它调用 `ResumeActor`。如果 actor 处于挂起状态，`ate-api-server` 必须找到一个有空位的 worker。当没有 worker 有空位时，调用失败，返回 gRPC 状态码 `ResourceExhausted` 和文本 `no worker has room for the actor`。

**暂存的请求（parked request）：** router 在重试恢复 actor 期间保持打开状态的请求。

router 不会立刻返回该失败。它会暂存（park）该请求并再次尝试。五条规则决定接下来的动作 {{code}}：

- **重试。** 第一次重试在 100 ms 后发生。之后的每次延迟是前一次的 1.1 倍，并加上少许随机抖动。
- **预算。** router 在 5 秒后停止重试，该时间由 `--parked-request-budget` 控制。之后客户端会收到 503。
- **每个 actor 一个预算。** 发往同一个 actor 的请求共享一次恢复调用和一个预算时钟。较晚加入的请求可能在不足 5 秒后就失败。
- **上限。** 最多同时暂存 1,024 个请求，由 `--parked-request-max` 控制。请求只有在首次恢复尝试失败并开始等待时才占位。当没有空位时，router 在那一次尝试后就以 503 丢弃该请求，响应体为 `actor "<atespace/name>" unavailable: router at capacity`。
- **不取消。** 预算耗尽时已经发起的恢复不会被取消。router 会等待其结果，所以请求可能在超过 5 秒后才得到响应。

设置 `--parked-request-max=0` 可以关闭请求暂存。此时满载的 pool 会立即返回 503。

安装过程没有设置这些标志，因此使用默认值。我们 router 的启动参数印证了这一点。

```listing
title: 我们安装环境中的 router 参数
source: capture/lab/I-capacity/17-router-args.txt
lang: text
note: 模式与排空延迟之间的参数已省略。不存在以 --parked-request 开头的标志。
---
atenet-router router --mode=ingress --namespace=ate-system … --drain-delay=13s --ingress-allowed-spiffe-ids=spiffe://cluster.local/ns/ate-system/sa/atenet-client --preview=
```

## router 暂存什么，不暂存什么 {#s-request-parking-what-the-router-parks-and-what-it-does-not}

暂存是针对能够自行恢复的状况。对于其他所有错误，router 都会立刻返回 {{docs}}。

| 恢复的结果 | router 的动作 | 客户端看到的结果 |
|---|---|---|
| actor 正在运行 | 路由该请求 | actor 的回复 |
| 没有 worker 有空位 | 暂存并重试 | 回复，或预算耗尽后的 503 |
| `ate-api-server` 不可用 | 暂存并重试 | 回复，或预算耗尽后的 503 |
| 同一 actor 的另一次恢复正在进行 | 重试 | 回复 |
| actor 处于 `ACTOR_STATE_CRASHED` | 返回错误 | 立刻返回 503 |
| actor 不存在 | 返回错误 | 立刻返回 404 |

第三行在 `ate-api-server` 滚动更新期间很有价值。控制平面的短暂重启对客户端表现为延迟，而不是错误。[当依赖项宕机时](#s-when-a-dependency-is-down)展示了这种保护的局限。

第五行解释了为什么 5 秒后的 503 和 60 ms 后的 503 是不同的问题。带有 `no worker has room` 文本的慢速 503 说明 pool 太小。只带 `unavailable` 字样的慢速 503 说明 router 没有收到 `ate-api-server` 的回复。带有 `AssignWorker prerequisite not met` 文本的快速 503 说明 actor 已崩溃，[CRASHED 与 RevertActor](#s-crashed-and-revertactor) 给出了解决方法。

## 一个请求，三种结果 {#s-request-parking-one-request-three-outcomes}

Substrate 的暂存演示创建了一个有两个 worker 的 pool，每个 worker 容纳一个 actor，以及四个名为 `p1` 到 `p4` 的 actor。我们分别向 `p1` 和 `p2` 发送了一个请求，因此两个 worker 都处于繁忙状态。随后我们向 `p3` 发送了两次请求。

```figure
id: fig-4-4
kind: timeline
title: 针对满载 pool 的请求与 5 秒暂存预算的关系
claim: 在 5 秒预算内有 worker 变空闲时暂存请求得到处理，无空闲时则得到 503。
caption: 每个条形表示从请求开始到回复的时间，每个点代表一个请求。绿色是 200，粉红色是 503。紫色标记是挂起 p1 释放 worker 的时刻。虚线条是负载测试运行，标有平均值和最慢处理的请求。来源：capture/lab/summary/parking-x86.json、capture/lab/I-capacity/01-unplanned-full-pool-503.tsv。
```

```listing
title: p3 失败，随后 p3 在等待后得到服务
source: capture/lab/I-capacity/13-parking-trace.tsv
lang: text
note: 表头和前两行已省略。列依次为时间、事件、HTTP 状态码、秒数和响应体。最后一行记录了其请求的开始时间，因此排在挂起之前。
---
2026-11-12T11:32:40.522Z	p3-no-free-worker	503	5.059628	actor ate-demo-parking/p3 unavailable: no worker has room for the actor
2026-11-12T11:32:45.600Z	p3-request-start	parked while pool is full
2026-11-12T11:32:47.970Z	suspend-p1-done	freed a worker 2 s after p3 request started
2026-11-12T11:32:45.603Z	p3-served-after-park	200	2.647469	preserved memory count: 1 | preserved file counter: -1 | preserved rootfs counter: 1
```

发往 `p3` 的第一个请求在整个预算时间内都没找到 worker。第二个请求以同样的方式开始。在它等待两秒后，我们挂起了 `p1`，从而释放了一个 worker。router 的下一次重试找到了这个 worker，`p3` 在那里恢复，客户端拿到了回复。

**我们测得**在 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM、Envoy 数据平面）上满载 pool 的等待时间。九个未找到 worker 的请求各自在 5.05 到 5.06 秒后返回 503。我们为其释放了 worker 的那个请求在 2.65 秒后返回 200。`p1` 的挂起在该等待进行了 2.37 秒时完成。router 随后需要约 0.3 秒来重试、恢复 actor 并路由请求。最后这个数字来自一次运行。

慢速 503 的响应体总是同样的文字，里面包含 actor 的 atespace 和名字：

```listing
title: 满载 pool 的 503
source: capture/lab/I-capacity/01-unplanned-full-pool-503.tsv
lang: text
note: 第一个失败行的一个单元格。
---
actor lab-c/b0-5 unavailable: no worker has room for the actor
```

## 两个 worker 承载四个 actor 的三十秒 {#s-request-parking-thirty-seconds-with-four-actors-on-two-workers}

演示包含一个负载脚本。它向所有四个 actor 持续发送请求 30 秒，并在收到每次回复后挂起该 actor。两个 worker 服务四个 actor，因此半数请求必须等待挂起完成。

```listing
title: 负载脚本的结果
source: capture/lab/I-capacity/16-load-30s.log
lang: text
note: 结果前面的行已省略。
---
==> results
    total requests : 92
    200 OK         : 90
    503 unavailable: 2
    other          : 0
    200 latency    : avg 0.847s, slowest 4.269406s  <- parked requests sit here
```

**我们测得**在同一台 x86 服务器客户机上的这次负载运行，单次运行 30 秒，共 92 个请求。router 成功处理了 90 个请求，对 2 个请求返回 503。成功处理的请求平均耗时 0.85 秒，最慢的耗时 4.27 秒。同一 pool 中发往空闲 worker 的请求耗时约 0.35 秒。

把这些数字放在一起看。暂存机制把一个容量小了一倍的 pool 变成了一个回复了 98% 请求的服务。它是靠延迟做到这一点的。平均请求耗时是发往空闲 worker 的两倍以上。最慢的慢了十二倍。在专为展现暂存最佳效果而设计的演示里，仍有两个请求失败了。

## 突发恢复 {#s-request-parking-a-burst-of-resumes}

演示脚本是一个接一个地发送请求。真实的突发是在同一瞬间到达的，因此我们对此做了测试。pool 有两个 worker，能容纳 16 个单 CPU 的 actor。我们挂起 n 个各占 50 MiB 的 actor，并在同一瞬间向每个 actor 发送一个请求，每个 n 运行五轮。

```figure
id: fig-4-4b
kind: chart
title: 恢复时间与同一瞬间恢复数量的关系
claim: 同一瞬间 16 个恢复的中位数耗时为每个 0.37 秒，而单个恢复独自运行时为 0.23 秒。
caption: 每个点是一个发往已挂起 actor 的请求，折线连接各层级的中位数。横轴在每一步翻倍。灰色数字是返回 200 的请求数。虚线标出 0.5 秒。在 x86 服务器客户机上测得。来源：capture/lab/summary/validation-parallel-x86.json。
```

| 同一瞬间的恢复数 | 请求数 | 返回 200 | 中位数 | 最慢 |
|---|---|---|---|---|
| 1 | 5 | 5 | 0.23 s | 0.24 s |
| 2 | 10 | 10 | 0.23 s | 0.24 s |
| 4 | 20 | 20 | 0.26 s | 0.31 s |
| 8 | 40 | 40 | 0.29 s | 0.33 s |
| 16 | 80 | 80 | 0.37 s | 0.45 s |

**我们测得**这 155 个请求在 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上完成，使用 gVisor 和 Envoy 数据平面。每个请求走自己的 `kubectl ate proxy`，时间在客户端测量。全部 155 个请求均返回 200。一次并发 16 个恢复，每个请求的成本比单独恢复高出 64%。突发期间 `ate-api-server` 没有记录任何错误行。

因此控制平面在 16 个并发恢复下没有发生排队。能被 pool 容纳的突发只需多花零点几秒，没有请求会耗尽预算。

不能被容纳的突发则被 pool 截断，不存在中间状态。我们在同一瞬间向 32 个挂起的 actor 发送了 32 个请求，当时 pool 还有 14 个空位。

**我们测得**在同一台客户机上测试了一次该突发。14 个请求返回 200，中位数耗时 0.37 秒。另外 18 个请求在 5.11 到 5.15 秒后返回 503，文案为 `no worker has room for the actor`。在第二次 32 个请求的突发中，我们在等待进行到 1.5 秒时挂起了 16 个 actor。随后 32 个请求中有 21 个返回 200，最慢的一个耗时 2.69 秒，11 个返回 503。

pool 当时有 14 个空位而不是 16 个，原因在 [第 3.5 节](#s-crashed-and-revertactor) 中有解释。两个进程已经退出的 actor 仍然处于 `ACTOR_STATE_RUNNING`，各占着一个 CPU。

## 耗时超过 10 秒的恢复 {#s-request-parking-a-resume-that-takes-more-than-10-seconds}

暂存预算不是唯一的时钟。Envoy 会等待固定的时间，让 router 决定请求去往何处。**代码**将该时间设定为暂存预算加上 5 秒 {{code}}。在默认预算下，这是 10 秒。耗时更久的恢复会从 Envoy 收到 504，而恢复过程本身不会被取消。

**我们测得**这组数据，环境是第二台 x86 服务器客户机（16 vCPU、23 GB），出自 [第 8.1 节](#s-postgres-and-the-object-store) 的 bucket 测试。在 61 个周期中的 32 个周期里，恢复必须从远端或慢速 bucket 读取大型快照。在这 32 次中，第一次请求都在 10.05 秒后返回 504，响应体为空。客户端每秒重发一次请求，未发送其他命令。随后这 32 次都返回了 200 并给出了正确的计数。在最慢的周期里，第一个 200 在 213 秒和 19 次请求后返回。

这个限制针对的是 router 的决策过程，而不是整个请求。在更早的一次运行中，三个请求在 10.09 到 10.87 秒后返回了 200。

10 秒后的 504 还有第二个原因，可以通过 actor 的状态来区分两者。在缓慢恢复期间，actor 状态显示为 `ACTOR_STATE_RESUMING`。在数据库故障之后，一个状态显示为 `ACTOR_STATE_RUNNING` 的 actor 对每个请求都返回同样的 504。[第 8.2 节](#s-when-a-dependency-is-down) 记录了这种情况。

## 我们的判断 {#s-request-parking-our-position}

暂存掩盖了短暂的短缺。它不会增加容量。成天都在暂存请求的 pool 说明容量太小，你的用户要为每个请求多付好几秒代价。

以下几点关系到你的客户端和告警：

- **客户端超时。** 对可能被挂起的 actor，请求超时至少预留 10 秒。预算是 5 秒，较晚启动的恢复仍会完成，Envoy 数据平面在预算结束 5 秒后终止等待 {{docs}}。
- **对 504 也要重试。** 对已挂起 actor 的请求在 10 秒后返回 504，意味着恢复仍在进行中。稍作停顿后重新发送请求，不要发送 `revert`。正如 [第 8.2 节](#s-when-a-dependency-is-down) 所述，对处于 `ACTOR_STATE_RESUMING` 的 actor 执行 revert 会被拒绝。
- **重试。** 收到带有 `no worker has room` 的 503 时，稍等片刻后再重试。不要在紧凑循环中重试，因为每次重试都会占用暂存请求的名额。
- **告警。** router 在指标 `atenet.router.parking.active` 中统计暂存请求数，在 `atenet.router.parking.rejected` 中统计超出上限的请求数 {{docs}}。当第一个指标持续大于零时触发告警。

本节所有内容都基于 Envoy 数据平面，由 Substrate 的 router 进程处理每个请求。我们在 agentgateway 数据平面上没有看到过因 pool 满载而产生的 503。kagent 运行使用的是 agentgateway，而且确实占满了它的单个 worker：运行了 16 个 actor，24 个并行轮次中有 8 个经历了等待并最终完成。[pool 定容](#s-sizing-a-pool) 记录了那次运行。

我们没有测试超过 1,024 个暂存请求的情形。我们向满载 pool 发起的突发止步于 32 个请求，每个请求都有自己的 `kubectl ate proxy`。后续高达 300 的突发通过 router 的入站网关发往空闲 worker。没有请求收到满载 pool 的 503。[pool 定容](#s-sizing-a-pool) 记录了这些测试。

项目网站宣称每秒 `500+` 次挂起和恢复激活。我们的一个节点在并发最高 300 的情况下，每秒完成了 32 到 39 次恢复。在并发 300 时成功处理了 600 个请求中的 600 个。[pool 定容](#s-sizing-a-pool) 记录了这些运行。

```takeaways
- 5 秒后出现带有 no worker has room 的 503，说明 pool 容量太小。
- 行动前先看快速 503 的文本：它会指明是崩溃状态还是 router 满载。
- 对可能挂起的 actor，客户端超时应设为 10 秒或更长。
- 对 atenet.router.parking.active 设置告警，当其持续大于零时增加 worker。
- 对容量 503 稍作停顿后再重试，绝不要在紧凑循环中重试。
- 恢复时若在 10 秒收到 504，请重新发送请求，因为恢复仍在进行。
```

来源：capture/lab/summary/bursts-one-node-x86.json, capture/lab/summary/scale-x86.json, capture/lab/I-capacity/13-parking-trace.tsv, capture/lab/I-capacity/16-load-30s.log, capture/lab/I-capacity/17-router-args.txt, capture/lab/I-capacity/01-unplanned-full-pool-503.tsv, capture/lab/I-capacity/12-pool-spec.yaml, capture/lab/I-capacity/14-workers-full.txt, capture/lab/I-capacity/15-actors-after.txt, capture/lab/summary/parking-x86.json, capture/lab/summary/validation-parallel-x86.json, capture/lab/V-validation/03-parallel-resume/20-parallel.tsv, capture/lab/V-validation/03-parallel-resume/24-summary.tsv, capture/lab/V-validation/03-parallel-resume/10-parallel-first-run-n16-n32.tsv, capture/lab/V-validation/03-parallel-resume/11-workers-before-32.txt, capture/lab/V-validation/03-parallel-resume/12-ateapi-error-lines-during-bursts.txt, capture/lab/B-lifecycle/20-trace-ops.tsv, capture/lab/summary/kagent-turns-x86.json; cmd/atenet/internal/router/ingress/parking.go, cmd/atenet/internal/router/ingress/resumer.go, cmd/atenet/internal/router/cmd.go at v1.0.0; docs/concepts/request-parking.md and site/layouts/_shortcodes/home.html at v1.0.0., capture/lab/summary/remote-store-x86.json, capture/lab/X-remote-store-pg/22-store-cycles.tsv, capture/lab/summary/object-store-x86.json
