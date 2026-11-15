# 空闲挂起器

> 一个小型代理记录每个 actor 最近一次请求，并在 30 秒无请求后调用 SuspendActor，让三个 actor 挤进只容得下两个的空间。

你安装 Substrate，是因为你的大多数 agent 大部分时间都在等待。可是一看 pool，每个收到过请求的 actor 仍在运行。没有谁去挂起它们，因为 Substrate v1.0.0 里没有任何组件做这件事。缺的这一块要你自己写，而且很小。

读完本节，你能运行一个挂起空闲 actor 的程序。你还能说清它用什么信号、每个客户端要为它付出什么代价，以及这个设计在哪里止步。

## 用哪个信号判断 actor 空闲 {#s-an-idle-suspender-which-signal-says-that-an-actor-is-idle}

**空闲挂起器（idle suspender）：** 一个运行在 Substrate 之外的程序，负责判断某个 actor 是否已经足够久没有工作，并为它调用 `SuspendActor`。

难点在信号。我们在服务端找过，没有找到合适的。

| 候选信号 | 所在位置 | 为什么不合适 |
|---|---|---|
| router 的请求指标 | `atenet.router.route.duration` | 指标标签不允许使用 actor 名称，所以它说不出哪个 actor 安静了 {{docs}} |
| 每个 actor 的用量事件 | `ate.actor.usage_sampled` | 它每分钟报告一次 CPU 时间和内存，衡量的是工作量，不是请求 {{docs}} |
| actor 记录 | `kubectl ate get actor` | 它有状态和更新时间，但没有最近一次请求的时间 |

所以挂起器必须自己看到请求。它位于流量的路径上，最近一次请求的时间就是它自己内存里的一个值。

```figure
id: fig-9-1
kind: flow
title: 请求路径上的空闲挂起器
claim: 挂起器转发每个请求，为每个 actor 记下最近一次请求的时间，并在 actor 安静下来时调用 SuspendActor。
caption: 请求从左向右读，挂起从上向下读。中间的表是挂起器唯一的状态。来源：capture/demos/idle-suspender/suspender.py。
```

## 程序 {#s-an-idle-suspender-the-program}

示例是一个 125 行的 Python 文件，没有任何依赖。它为你指定的每个 actor 启动一个 `kubectl ate proxy actor`。它监听一个端口，并把 `/<actor>/<path>` 转发给对应 actor 的代理。

```bash
python3 suspender.py --atespace demo-idle --idle 30 --listen 8080 busy bursty rare
curl http://127.0.0.1:8080/busy/
```

一个循环每秒做一次判断。当 actor 正在运行、没有未完成的请求，并且上一个请求至少在 `--idle` 秒前结束时，它就到期了。

```python
due = [name for name, actor in actors.items()
       if actor["running"] and actor["open"] == 0 and now - actor["last"] >= args.idle]
for name in due:
    done, seconds = cli("suspend", "actor", name)
```

在挂起期间到达的请求会等到挂起结束。挂起器从不恢复 actor。下一个请求照常交给 router，由 router 恢复 actor。完整文件在[空闲挂起器目录](manuals/agent-substrate-101/capture/demos/idle-suspender)。

## 十分钟，三个 actor，只有两个名额 {#s-an-idle-suspender-ten-minutes-with-three-actors-and-room-for-two}

录制所用的 pool 只有一个 worker，有两个 CPU，每个 actor 申请一个 CPU。所以同一时间只能运行两个 actor。我们创建了三个，并给每个发送不同模式的流量。

- `busy` 每 5 秒收到一个请求。
- `bursty` 在 5 秒内收到五个请求，然后 145 秒没有任何请求。
- `rare` 在 60 秒后收到一个请求，在 400 秒后再收到一个。

```listing
title: 挂起器日志的前两分钟
source: capture/lab/N-demos/idle-suspender/suspender.tsv
lang: text
note: 起点、第一次挂起、对第三个 actor 的第一次请求以及它的挂起。其间的热请求行已省略。
---
2026-11-12T12:50:05	watch	busy	port=18080	running=False
2026-11-12T12:50:05	watch	bursty	port=18081	running=False
2026-11-12T12:50:06	watch	rare	port=18082	running=False
2026-11-12T12:50:09	listen	http://127.0.0.1:8080/<actor>/<path>	idle=30s
2026-11-12T12:50:13	request	bursty	200	0.443	resumed
2026-11-12T12:50:13	request	busy	200	0.487	resumed
2026-11-12T12:50:14	request	bursty	200	0.063	warm
…
2026-11-12T12:50:44	request	busy	200	0.069	warm
2026-11-12T12:50:49	suspend	bursty	idle=31s	0.386	ok
2026-11-12T12:50:49	request	busy	200	0.063	warm
…
2026-11-12T12:51:09	request	busy	200	0.065	warm
2026-11-12T12:51:13	request	rare	200	0.242	resumed
2026-11-12T12:51:15	request	busy	200	0.062	warm
…
2026-11-12T12:51:40	request	busy	200	0.058	warm
2026-11-12T12:51:44	suspend	rare	idle=31s	0.349	ok
2026-11-12T12:51:45	request	busy	200	0.065	warm
```

看每条 request 行的第五个字段。`resumed` 一词表示这个请求发现 actor 处于挂起状态。12:50:49 时，挂起器在 31 秒无请求后挂起了 `bursty`，空出两个名额中的一个。12:51:13 时，`rare` 的第一个请求到达，router 在 0.24 秒内把它恢复到这个空名额里。

```figure
id: fig-9-1b
kind: timeline
title: 三个 actor 十分钟内共用两个名额
claim: 全部 140 个请求都返回 200，58 次采样中有 38 次 worker 只驻留了一个 actor，而不必让三个有流量的 actor 全都常驻。
caption: 每行是一个 actor。绿色条带是 actor 的运行时间，圆点是一个请求，琥珀色标记是挂起器做的一次挂起。最上面一行是 worker 已预订的 CPU。来源：capture/lab/summary/demos-x86.json。
```

**我们测得**这次运行，环境是第二台 x86 服务器客户机（16 vCPU、31 GB），挂起器与集群运行在同一台客户机上。10 分钟内三个 actor 共收到 140 个请求，全部返回 200。

| 结果 | 数值 |
|---|---|
| 发现 actor 处于挂起状态的请求 | 140 个中的 7 个 |
| 这些请求的耗时（前两个除外） | 0.24 到 0.26 秒 |
| 对运行中 actor 的请求耗时，中位数 | 0.06 秒 |
| 挂起器的挂起次数 | 7 次，CLI 端每次 0.33 到 0.39 秒。10 分钟内发生 6 次，第 7 次发生在启动后 10 分 34 秒 |
| worker 上已预订的 CPU，58 次采样的均值 | 2,000 millicores 中的 1,345 |

前两个恢复的请求分别用了 0.44 和 0.49 秒，因为两个 actor 在同一秒启动。对这个小 actor 来说，遇到挂起状态的客户端要比热请求多付出约 0.2 秒。这个代价如何随内存增长，见 [SuspendActor 与 ResumeActor](#s-suspendactor-and-resumeactor)。

## 没有挂起器时的同样流量 {#s-an-idle-suspender-the-same-traffic-without-the-suspender}

我们用 `--dry-run` 模式的挂起器把前两分钟又跑了一遍。它转发请求并记录每个决定，但什么也不挂起。

```listing
title: 没有挂起器时对第三个 actor 的请求
source: capture/lab/N-demos/idle-suspender/requests-without-suspender.tsv
lang: text
note: 表头，以及名为 rare 的 actor 的那一行。
---
ts	actor	http	seconds	body
…
2026-11-12T13:05:30.579Z	rare	503	5.054876	actor demo-idle/rare unavailable: no worker has room for the actor
```

60 秒后，两个名额仍被 `busy` 和 `bursty` 占着，而 `bursty` 已经安静了 55 秒。`rare` 的请求等满了 5 秒的暂存预算，然后返回 503。[请求暂存](#s-request-parking)解释了这段等待。

## 设计的局限 {#s-an-idle-suspender-limits-of-the-design}

- **它只看得到自己的流量。** 以其他方式到达 router 的请求不会重置计时器。请让所有流量都经过挂起器，否则挂起器会停掉一个正在使用的 actor。
- **空闲指没有请求，不是没有工作。** 一个在回答之后继续计算的 actor 看起来也是空闲的。用量事件可以覆盖这种情况，代价是一分钟的延迟。
- **状态只在一个进程里。** 重启会忘掉最近一次请求的时间。示例此时会读取每个 actor 的状态，并重新启动计时器。
- **挂起期间可能有请求到达。** 示例会把新请求扣住，等它的挂起调用结束后再转发。你自己的挂起器需要对每个 actor 遵守同样的规则。以其他方式到达 router 的请求仍然会得到 503。
- **示例使用 CLI。** 每次挂起都会启动一个进程，并使用 CLI 的共享身份。

## 上生产前要改什么 {#s-an-idle-suspender-what-to-change-for-production}

将挂起器部署在集群内部，紧邻 router。给它配置一张带有入站允许列表身份的客户端证书，并让它以自己的身份调用 `ate-api-server`。这样它就不必为每个请求去访问 Kubernetes API server。

空闲时间要根据 actor 的恢复代价来选。恢复只要 0.25 秒时，30 秒的空闲时间是安全的。恢复要 5 秒时，空闲时间太短会让许多用户等待，太长又会让 worker 一直占满。

挂起请使用默认的异步模式，就像示例那样。然后阅读[快照保真度，以及快照存放在哪里](#s-snapshot-fidelity-and-where-a-snapshot-lives)，了解节点丢失在最初 5 分钟内的代价。

```takeaways
- 在请求路径上放一个组件，记录每个 actor 最近一次请求的时间。
- 只在 actor 没有未完成请求，且已安静达到你设定的空闲时间后才挂起它。
- 让所有 actor 流量都经过这个组件，否则它会挂起正在使用的 actor。
- 根据你自己 actor 实测的恢复时间来选择空闲时间。
```

来源：capture/lab/N-demos/idle-suspender/suspender.tsv, capture/lab/N-demos/idle-suspender/requests-with-suspender.tsv, capture/lab/N-demos/idle-suspender/requests-without-suspender.tsv, capture/lab/N-demos/idle-suspender/capacity-requests-with-suspender.tsv, capture/lab/summary/demos-x86.json, capture/demos/idle-suspender/suspender.py, capture/demos/idle-suspender/run.sh, docs/metrics/registry/metrics.yaml at v1.0.0, docs/guides/observability.md at v1.0.0
