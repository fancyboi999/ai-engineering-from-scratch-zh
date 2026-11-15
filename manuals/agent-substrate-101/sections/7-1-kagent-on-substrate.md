# Substrate 上的 kagent 1.0

> kagent 让每个会话对应一个 actor，每一轮都恢复它，结束后再挂起，所以一轮在模型耗时之外只多花半秒，并且只保留文件。

你安装 kagent 1.0，给 agent 发一条消息，大约一秒后答案就回来了。接着你运行 `kubectl get pods`，只看到一个 worker pod，没有 agent 自己的 pod。agent 是一个 actor，而 kagent 在你查看之前已经把它再次挂起了。

读完本节，你能安装 kagent 1.0，写出构成一个 agent 的三个对象，并预测一轮调用的开销。你还能说出 kagent 快照保留什么，以及 agent 能访问哪些主机。

我们运行的是 kagent v1.0.0。kagent v1.0.1 在我们运行当天（2026-11-12）发布，我们没有测试它。我们运行了两次。第一次的模型是集群内的模拟模型服务器，那组时间不含模型耗时，只反映 Substrate 自身的开销。第二次的模型是 CPU 上的一个小型开源模型，“真实模型的一轮”一小节会报告它，本节其余数字都来自第一次运行。

## 我们的安装过程 {#s-kagent-on-substrate-the-install-as-we-ran-it}

文档里的 CLI 路径无需任何修补就能跑通。我们用了一个 kind 集群（Kubernetes 1.37）和一条命令。我们没有找到任何 kagent v1.0.0 文档要求这个 Kubernetes 版本，也没有测试其他版本。

| 步骤 | 秒数 |
|---|---|
| `kind create cluster --name kagent --image kindest/node:v1.37.0` | 26.1 |
| 下载 kagent CLI v1.0.0 | 5.5 |
| `kagent --config kagent-config.yaml install --namespace kagent` | 216.1 |

**我们测得**每个步骤各一次，环境是第二台 x86 服务器虚拟机（16 vCPU，31 GB）。安装命令用了 216 秒，退出码为 0。

安装命令只读取一个很小的文件。

```listing
title: 我们使用的安装器配置
source: capture/lab/K-kagent/install/kagent-config.yaml
lang: yaml
note: 完整文件。它引用的 values 文件只含一项设置：config.server 下的 grpcReflection true。
---
install:
  kagent:
    valuesFiles: [kagent-values.yaml]
```

kagent 不使用你之前装好的 Substrate。它从名为 `ghcr.io/kagent-dev/substrate/*:v1.0.0` 的镜像安装自己的 Substrate 发行版。安装产生了六个 Helm release：`kagent-crds`、`substrate-crds`、`substrate-podcert`、`substrate-atelet`、`substrate` 和 `kagent`。在这个发行版里，`atenet-router` 和 `atenet-egress` 各运行一个 agentgateway v1.7.0 容器，没有 Envoy。

Substrate 的 chart 不在 kagent 仓库里。安装器从 kagent 项目的 chart 仓库拉取它们。kagent 代码针对 kagent 自己维护的 Substrate 仓库副本（v1.0.0）构建 {{kagent}}。安装器还会设置四个 Substrate 值，它们改变安装的行为 {{kagent}}。

| kagent 安装器的设置 | 效果 |
|---|---|
| 预览功能 `PerTemplateSnapshotLocation` 和 `GoldenEgressPolicy` | 两者都开启。普通的 `ate-setup` 安装把它们关闭。 |
| 两个引导所有者：kagent 控制器的身份，以及 `ate-client` | kagent 控制器拥有整个安装，与 `kubectl ate` 一样。 |
| router 的入站允许列表：kagent 控制器的 SPIFFE ID | 只有 kagent 控制器能向 actor 发送请求。`ate-setup` 安装使用的 `atenet-client` 身份不在列表中。 |
| 凭据提供方的命名空间策略：atespace `kagent` 对应命名空间 `kagent` | atespace `kagent` 中的 actor 可以读取命名空间 `kagent` 的 Secret。 |

安装创建了一个 `WorkerPool`，名为 `kagent-default`，带一个 worker pod。它没有创建默认的 Harness。有些建议让你选择名为 `kagent-default` 的 Harness，那描述的是更晚的版本。在 v1.0.0 里，Harness 要你自己写。

## 你要写的三个对象 {#s-kagent-on-substrate-the-three-objects-you-write}

v1.0.0 中的一个 agent 是 `api.kagent.dev/v1alpha3` 组里的三个 Kubernetes 对象。组为 `kagent.dev` 的 YAML 早于 1.0，不再适用。

```listing
title: 我们这次运行的 Harness、AgentTemplate 和 Agent
source: capture/lab/K-kagent/agent/lab-agent.yaml
lang: yaml
note: 这三个对象之上的 ModelConfig 已截去。它指向模拟模型服务器。
---
…
apiVersion: api.kagent.dev/v1alpha3
kind: Harness
metadata:
  name: lab-harness
  namespace: kagent
spec:
  kagent: {}
  substrate:
    workerPoolRef:
      name: kagent-default
    snapshotPolicy:
      location: s3://ate-snapshots/kagent/
---
apiVersion: api.kagent.dev/v1alpha3
kind: AgentTemplate
metadata:
  name: lab-template
  namespace: kagent
spec:
  description: Lab agent that runs shell commands for the Substrate manual experiments
  modelConfig:
    name: mock-model
  systemPrompt: You are a lab agent. Use the bash tool when the user asks you to run a command.
---
apiVersion: api.kagent.dev/v1alpha3
kind: Agent
metadata:
  name: lab-agent
  namespace: kagent
spec:
  template:
    ref:
      name: lab-template
  harnessRef:
    name: lab-harness
```

**Harness：** 执行 agent 的运行时，指明它使用的 `WorkerPool` 和快照位置。`kagent: {}` 选择 kagent 自己的引擎。其他类型有 `codex`、`claude` 和 `byo`。`codex` 和 `claude` harness 计划在下一版补充。

**AgentTemplate：** 模型、提示词和工具。它没有任何 Substrate 字段。

**Agent：** 一个 AgentTemplate 与一个 Harness 的配对。kagent 通过 Substrate API 把这个配对的每个修订版编译成一个 `ActorTemplate` {{kagent}}。我们的是 `lab-agent-7f643ac37f02`。

Agent 在我们应用后约 24 秒变为 `Ready`，其中黄金快照构建用了 9.84 秒。Substrate 没有 Actor CRD，也没有 ActorTemplate CRD，所以 `kubectl get` 看不到这两种对象。请使用 `kubectl ate`。

## 一个会话就是一个 actor {#s-kagent-on-substrate-one-session-is-one-actor}

**会话（Session）：** 与一个 Agent 的一次对话。kagent 为它创建一个 actor，名为 `session-<uuid>`，位于 atespace `kagent`。这个 atespace 取自该 Agent 所在 Kubernetes 命名空间的名字。

actor 创建时处于 `ACTOR_STATE_SUSPENDED`，kagent 不会恢复它，第一条消息才会恢复。在 20 次创建中，创建一个会话的耗时中位数为 0.39 秒。

```figure
id: fig-7-1
kind: sequence
title: 一次录制的 kagent 调用，从消息到答案
claim: 每一轮都通过 router 恢复会话 actor，任务一完成 kagent 就调用 SuspendActor。
caption: 从上到下阅读。每条生命线上方的图标是该参与方，带有所属项目的标记。左列是一次录制调用中每一步的耗时，从消息发出时算起。琥珀色箭头是状态变化。模型是模拟服务器。来源：capture/lab/K-kagent/latency/timings.tsv、capture/lab/K-kagent/latency/server-times.tsv、capture/lab/K-kagent/logs/actor-state-changes.tsv、capture/lab/summary/kagent-turns-x86.json。
```

`ate-api-server` 的日志展示了这个循环。下面几行属于同一个会话：一次创建，随后两轮调用，相隔 4 秒。

```listing
title: 状态日志中的一个会话：创建与两轮调用
source: capture/lab/K-kagent/logs/actor-state-changes.tsv
lang: text
note: 各列依次是时间、actor、操作和新状态。
---
2026-11-12T10:20:35.633350007Z	session-01a1cf46-0786-748f-ad16-cc3bb0e1f2e1	create	suspended
2026-11-12T10:20:36.067645235Z	session-01a1cf46-0786-748f-ad16-cc3bb0e1f2e1	resume	resuming
2026-11-12T10:20:36.485975028Z	session-01a1cf46-0786-748f-ad16-cc3bb0e1f2e1	resume	running
2026-11-12T10:20:36.862693911Z	session-01a1cf46-0786-748f-ad16-cc3bb0e1f2e1	suspend	suspending
2026-11-12T10:20:36.995534634Z	session-01a1cf46-0786-748f-ad16-cc3bb0e1f2e1	suspend	suspended
2026-11-12T10:20:41.387075902Z	session-01a1cf46-0786-748f-ad16-cc3bb0e1f2e1	resume	resuming
2026-11-12T10:20:41.796382831Z	session-01a1cf46-0786-748f-ad16-cc3bb0e1f2e1	resume	running
2026-11-12T10:20:42.143125306Z	session-01a1cf46-0786-748f-ad16-cc3bb0e1f2e1	suspend	suspending
2026-11-12T10:20:42.270402046Z	session-01a1cf46-0786-748f-ad16-cc3bb0e1f2e1	suspend	suspended
```

我们这次运行的 98 轮都是这个形状：恢复、运行、挂起。Substrate 不会挂起空闲的 actor，[SuspendActor 与 ResumeActor](#s-suspendactor-and-resumeactor) 一节已经说明。kagent 在每一轮之后替你完成这项工作。

## 一轮调用的开销 {#s-kagent-on-substrate-what-one-turn-costs}

```figure
id: fig-7-1b
kind: chart
title: kagent 运行中的每一次恢复、挂起与调用
claim: 紧接上一轮、没有停顿的一轮，与相隔 4 秒的一轮开销相同，因为每一轮都会恢复 actor。
caption: 每个点是一次运行，每一列按从最快到最慢排序。黑线是中位数。琥珀色的列是一轮内部的两次状态变化。梅红色的列是 kagent 报告的整轮耗时。来源：capture/lab/summary/kagent-turns-x86.json。
```

**我们测得**98 轮，环境是同一台 x86 服务器虚拟机（16 vCPU，31 GB），使用模拟模型。恢复耗时的中位数为 0.380 秒，范围 0.216 到 0.542 秒。在 99 次挂起中，挂起耗时的中位数为 0.142 秒，范围 0.120 到 0.398 秒。在相隔 4 秒的 20 轮里，整轮在集群内耗时 0.726 秒，在客户端耗时 1.224 秒。

不存在“热轮次”。无停顿的 20 轮耗时中位数为 0.738 秒，相隔的各轮是 0.726 秒。沙箱内的 uptime 在每一轮都读到 0.6 到 0.9 秒。所以每一轮你要付出约 0.52 秒的恢复与挂起开销，真实模型会在此之上再加它自己的时间。下一小节会测量两者。

仅文件的恢复之所以这么快，只是因为 kagent 的 harness 启动很快。每一次这样的恢复都是镜像的一次全新启动。我们在同一台虚拟机上，用第 9 部分示例所用的集群，以相同保真度运行了一个 Python agent。它在每次挂起之后的每一轮需要 4.5 到 5.1 秒。[快照保真度](#s-snapshot-fidelity-and-where-a-snapshot-lives)比较了这几种情况。

98 轮中有一轮，即第一个会话的第 3 轮，耗时 6.56 秒，恢复之前有 5.5 秒的间隔。我们没有找到原因。

## 真实模型的一轮 {#s-kagent-on-substrate-a-turn-with-a-real-model}

模拟模型立即作答，所以它掩盖了真实一轮里最大的那部分耗时。我们用真实模型把同一个集群又跑了一遍。模型是开源的 `qwen2.5`，有两种尺寸。模型服务器是虚拟机上容器里的 Ollama 0.40.16，12 个 CPU，一次一个请求，没有 GPU。

| 模型 | 大小 | 每秒 token 数，5 次请求 | 正确的工具调用，10 次请求 |
|---|---|---|---|
| `qwen2.5:3b` | 1.9 GB | 中位数 7.1，范围 6.9 到 7.3 | 10 次中 10 次 |
| `qwen2.5:1.5b` | 986 MB | 中位数 13.9，范围 13.1 到 14.3 | 10 次中 9 次 |

这是慢硬件上的小模型，我们选它是因为服务器的两块显卡都被另一个团队占用。GPU 上的模型或托管模型会给出别的模型耗时。请把下面的模型秒数当作我们这台机器的时间。Substrate 的秒数与模型无关。

每一轮都让 agent 用它的 `bash` 工具运行一条命令并报告一个数字。所以一轮是两次模型请求：一次返回工具调用，一次读取结果。

```figure
id: fig-7-1d
kind: chart
title: 小型真实模型在 CPU 上的每一轮 kagent 调用
claim: 在每个正常的轮次里，模型约占九成时间，50 轮中有一轮没有结束。
caption: 每根柱子是一轮，按运行顺序排列。梅红色部分是该轮模型请求的耗时。琥珀色部分是其余耗时，包含恢复与挂起。玫瑰色柱子是没有结束的一轮，或排在它后面等待的一轮。两者都在图表顶部截断。来源：capture/lab/summary/kagent-model-x86.json。
```

**我们测得**50 轮，环境是同一台 x86 服务器虚拟机（16 vCPU，31 GB）。每个模型在一个会话里跑 20 轮，另外在 5 个新会话里各跑第一轮。

| 系列 | 轮数 | 完成数 | 客户端一轮耗时 | 模型请求 | 恢复 | 挂起 | 模型占比 |
|---|---|---|---|---|---|---|---|
| 3b，同一会话 | 20 | 20 | 中位数 17.1 秒，范围 11.8 到 19.2 | 15.9 秒 | 0.46 秒 | 0.24 秒 | 0.93 |
| 3b，新会话的第一轮 | 5 | 5 | 中位数 14.4 秒，范围 13.4 到 16.4 | 13.0 秒 | 0.45 秒 | 0.17 秒 | 0.92 |
| 1.5b，同一会话 | 20 | 20 | 中位数 11.0 秒，范围 10.0 到 19.7 | 9.8 秒 | 0.47 秒 | 0.23 秒 | 0.89 |
| 1.5b，新会话的第一轮 | 5 | 4 | 三个正常轮次分别为 12.2、13.2 和 13.4 秒 | 7.2 到 12.3 秒 | 0.46 秒 | 0.16 秒 | 见下文 |

完成的 49 轮再次都是恢复、运行、挂起的形状。与模拟模型一样，恢复和挂起合计约 0.7 秒。一轮在客户端的耗时从 1.2 秒增长到 11 到 17 秒，差值来自模型。恢复和挂起两列取自 `ate-api-server` 的日志。每个长系列的最后一轮，保存下来的日志里没有恢复记录，所以这两个中位数只有 19 个值。

1.5b 系列中有三轮发出了三次模型请求，而不是两次。该系列另有两轮多出约 5 秒，既不能归因于模型，也不能归因于 Substrate。我们没有找到原因。

### 有一轮没有结束 {#s-kagent-on-substrate-one-turn-did-not-end}

在 1.5b 系列的第三个新会话里，模型没有停下来。请求开始 7 分 40 秒后我们重启了模型服务器，此时它已经生成了 2,800 个 token。kagent CLI 在 300.13 秒后放弃，报 `context deadline exceeded`，退出码为 1。

在客户端放弃之前，没有任何东西结束这一轮。会话 actor 在这一轮开始后 193 秒仍处于 `ACTOR_STATE_RUNNING`，这段时间里它一直占着 worker 的 CPU。下一轮排在同一个模型请求后面，因为服务器一次只处理一个请求。那一轮在 189.8 秒后完成。

这是一个小模型上的一次事件，更大的模型不太容易失控。但这次事件的代价与模型无关。等待模型的 actor 处于 `RUNNING`，kagent 只会在这一轮完成后才挂起它。默认情况下，没有任何设置限制一轮的时长。ModelConfig 的两项设置可以限制，我们在后来的一次运行里测试了两者。

### 限制一轮的两项设置 {#s-kagent-on-substrate-two-settings-that-bound-a-turn}

kagent v1.0.0 的 ModelConfig 在 `spec.openAI` 下有三个相关字段：`maxTokens`、`maxCompletionTokens` 和 `timeout` {{kagent}}。`timeout` 的单位是秒，它是调用模型的 HTTP 客户端的超时。两个 token 字段互斥。Agent、AgentTemplate 和 Harness 都没有用于限制一轮秒数或模型调用次数的字段。kagent CLI 有 `--timeout`，默认值是 5 分钟。

```listing
title: 两个 ModelConfig 对象，各带一种限制
source: capture/lab/W-ax-kagent-2/10-kagent-bound/01-bounded.yaml
lang: yaml
note: 使用每个 ModelConfig 的 AgentTemplate 和 Agent 对象已截去。
---
apiVersion: api.kagent.dev/v1alpha3
kind: ModelConfig
metadata: {name: w-tok, namespace: kagent}
spec:
  provider: OpenAI
  model: qwen2.5:1.5b
  apiKeySecret: kagent-openai
  apiKeySecretKey: OPENAI_API_KEY
  stream: true
  openAI:
    baseUrl: http://ollama.kagent.svc.cluster.local:11434/v1
    maxTokens: 128
…
apiVersion: api.kagent.dev/v1alpha3
kind: ModelConfig
metadata: {name: w-time, namespace: kagent}
spec:
  provider: OpenAI
  model: qwen2.5:1.5b
  apiKeySecret: kagent-openai
  apiKeySecretKey: OPENAI_API_KEY
  stream: true
  openAI:
    baseUrl: http://ollama.kagent.svc.cluster.local:11434/v1
    timeout: 20
```

我们先试着让失控重现，但没有成功。在没有任何限制的 1.5b agent 上，10 个新会话的第一轮全部完成，耗时 5.9 到 11.5 秒。所以我们用一个提示词强制生成长答案，要求每行写一个数字，从 1 写到 3000。直接发给模型服务器时，这个提示词在我们的请求于 75 秒结束时仍在生成文本。更早的一个提示词要求把一个词写 5000 遍，模型在 7 轮里有 7 轮自己停了下来。

**我们测得**下面每一行，环境是同一台 x86 服务器虚拟机（16 vCPU，31 GB），在虚拟机重启之后。每一轮都是新会话的第一轮，使用计数提示词和 1.5b 模型。

| 设置 | 轮数 | 结果 | 客户端一轮耗时 | 之后 actor 与模型的状态 |
|---|---|---|---|---|
| `maxTokens: 128` | 3 | `TASK_STATE_COMPLETED`，输出 128 个 token，答案停在 46 | 15.6、19.0 和 19.4 秒 | 每轮结束时 `ACTOR_STATE_SUSPENDED` |
| `timeout: 20` | 3 | `TASK_STATE_FAILED`，CLI 以退出码 1 结束 | 20.8、20.9 和 21.2 秒 | 5 秒后 `ACTOR_STATE_SUSPENDED`，模型服务器 CPU 为 0% |
| 无限制，CLI 使用 `--timeout 60s` | 1 | CLI 在 60.12 秒结束，报 `context deadline exceeded` | 未结束 | 240 秒内的 8 次采样全部是 `ACTOR_STATE_RUNNING`，模型服务器 CPU 约 1,200% |

设置 `timeout: 20` 后，任务失败，文本是：`llm error response (code STREAM_ERROR): "context deadline exceeded (Client.Timeout or context cancellation while reading body)"`。模型服务器把这三个请求都记录为 19.9 秒。会话仍然可用。其中一个会话的下一轮在 17.1 秒内一次完成。

两种限制都没有破坏正常的工具调用轮次。设置 `maxTokens: 128` 时，5 次工具调用有 5 次完成，耗时 5.5 到 8.0 秒。设置 `timeout: 20` 时，5 次全部完成，耗时 5.8 到 12.1 秒。在我们这台慢模型服务器上，12.1 秒的工具调用轮次已经接近 20 秒的上限。请按你的模型速度选择秒数。

无限制那一行显示了客户端超时做不到什么。CLI 放弃之后，模型请求又运行了 10 分 10 秒，直到我们重启模型服务器。新会话上的一轮排在它后面，在 300.13 秒到达 CLI 的默认超时。第一个会话上的第二轮在 0.13 秒后返回 `resource conflict`。客户端的超时只会停止客户端，它不会停止模型调用，也不会挂起 actor。

在设置了限制的情况下，我们没有见到失控自行发生。这种情况和 `maxCompletionTokens` 计划在下一版补充。

**我们的判断：** 给每个 ModelConfig 都设置 `timeout`，因为它也能结束停滞的模型调用。当被截断的答案对用户比失败的一轮更好时，再加上 `maxTokens`。不要把客户端超时算作限制。然后数一数同一时刻有多少个会话会等待模型，因为每个会话都占着 worker 的 1 个 CPU。下面“单个 worker 上的并行轮次”一小节给出了这笔算术。

## 快照保留什么 {#s-kagent-on-substrate-what-the-snapshot-keeps}

kagent 向 Substrate 请求仅文件保真度 `SNAPSHOT_FIDELITY_VOLUMES`，并以同步模式挂起 {{kagent}}。快照在这一轮结束前就进入对象存储。它保存目录 `/data`，别无其他。

在第 1 轮里，我们的 agent 在 `/data` 下写了一个文件，在 `/tmp` 下写了一个文件，并启动了一个后台 `sleep`。第 2 轮查找这三样东西。

```listing
title: 一次挂起和一次恢复之后，第 2 轮找到了什么
source: capture/lab/K-kagent/session1/turn2.out
lang: text
note: 输出的其余部分，即环境和挂载，已截去。
---
note=hello-from-turn1
scratch=cat: can't open '/tmp/scratch.txt': No such file or directory
bg=
uptime=0.74
PID   ELAPSED COMMAND
    1  0:01   /app
…
```

`/data` 下的文件保留了下来。`/tmp` 下的文件和后台进程都没有保留，PID 1 是一个新进程。请把下一轮需要的一切都写进 `/data`。[快照保真度](#s-snapshot-fidelity-and-where-a-snapshot-lives)把这种模式与内存快照做了比较。

## kagent 写入的三条出站规则 {#s-kagent-on-substrate-the-three-egress-rules-that-kagent-writes}

kagent 通过 Substrate API 为每个 actor 写一条出站策略。我们的集群里根本没有 Kubernetes 的 `EgressPolicy` 对象。

```listing
title: 一个会话 actor 的出站策略
source: capture/lab/K-kagent/session1/egress-policy-actor.yaml
lang: yaml
note: CLI 警告和规则之上的元数据已截去。
---
…
rules:
- http:
    effects:
      replaceHeaders:
      - actorJwt:
          audiences:
          - kagent-runtime
          expirationSeconds: "300"
        header: authorization
        prefix: 'Bearer '
    hostnames:
    - kagent-controller.kagent.svc.cluster.local
    ports:
      numbers:
      - 8083
- http:
    effects:
      replaceHeaders:
      - credentialUri: ate-secret://k8s.io/default/kagent/kagent-openai/OPENAI_API_KEY
        header: authorization
        prefix: 'Bearer '
    hostnames:
    - mock-llm.kagent.svc.cluster.local
    ports:
      numbers:
      - 8080
- https:
    hostnames:
    - api.openai.com
    ports:
      numbers:
      - 443
```

1. 8083 端口上的 kagent 控制器。网关把 `authorization` 头替换为受众是 `kagent-runtime` 的 [actor JWT](#s-actor-jwts)。
2. ModelConfig 的模型主机。网关把 `authorization` 头替换为一个 Kubernetes Secret 的值。[凭据注入](#s-credential-injection)解释了这个机制。
3. 443 端口上的 `api.openai.com`。kagent 为每个 OpenAI ModelConfig 都加这条规则，即使模型在别的主机上 {{kagent}}。

actor 从未拿到密钥。它的环境里是 `OPENAI_API_KEY=kagent-credential-injected`，而模拟模型在全部 10 次调用中收到的是真实值。

在这里，轮换密钥比在 Envoy 上更慢。网关 agentgateway v1.7.0 把每个取到的凭据保留 300 秒。所以 Secret 的新值最多要 5 分钟才能到达模型调用 {{agentgateway}}。我们测量这个延迟用的是上游 Substrate 的 agentgateway 数据平面，不是 kagent 集群。Secret 的三次变更分别在 280.5、200.9 和 100.6 秒后到达上游，没有请求失败。[凭据注入](#s-credential-injection)里有那次运行。

其余一切都被拒绝。对 `example.com` 的请求在 DNS 阶段失败。对 IP 地址 `1.1.1.1` 的请求返回 403。短名 `mock-llm.kagent` 也返回 403，只有完整名称 `mock-llm.kagent.svc.cluster.local` 返回 200。请给 kagent 的模型主机和工具主机使用完整 DNS 名称。

## 单个 worker 上的并行轮次 {#s-kagent-on-substrate-parallel-turns-on-one-worker}

安装得到的 worker pod 没有资源限制，所以它报告整个节点：16,000 毫核。每个 actor 预留 1 个 CPU。因此这个 worker 同一时刻最多运行 16 个 actor。

**我们测得**这一点，环境是同一台 x86 服务器虚拟机，一个 worker。同时开始的 8 轮全部完成，耗时 2.47 到 3.57 秒。同时开始的 24 轮全部完成，耗时 4.25 到 7.85 秒。worker 显示有 16 个运行中的 actor，另外 8 轮在等待。[确定 worker 池的规模](#s-sizing-a-pool)给出了算术。

```figure
id: fig-7-1c
kind: chart
title: 一个 worker 上同时进行的 8 轮与 24 轮 kagent 调用
claim: 24 个并行轮次中有 16 个在 5.45 秒内结束，另外 8 个等待空闲 CPU，最多晚 2.4 秒结束。
caption: 每个点是一轮，按客户端耗时排序。紫罗兰色带是 worker 运行 16 个 actor 时等待的那些轮次。虚线是单独一轮的耗时。来源：capture/lab/summary/kagent-turns-x86.json、capture/lab/K-kagent/parallel/workers-during.txt。
```

## CLI 端口转发冲突 {#s-kagent-on-substrate-the-cli-port-forward-collision}

kagent CLI 每次调用都会自己打开一个到 8083 端口的端口转发。我们同时启动的 8 次 CLI 调用里，有 5 次失败。

```listing
title: 一次抢不到端口的 kagent CLI 调用
source: capture/lab/K-kagent/latency/D-par-2.err
lang: text
note: 第二条监听器错误和另外两行已截去。
---
Error: connect to kagent gateway: kubectl port-forward exited before the server became ready (kubectl: Unable to listen on port 8083: … bind: address already in use …
```

请自己启动一个到控制器的 `kubectl port-forward`，让每次 CLI 调用都指向它。使用常驻端口转发后，创建会话的耗时中位数是 0.17 秒，而不是 0.39 秒。

```takeaways
- 在新集群上安装 kagent，因为它会安装自己的 Substrate 发行版。
- 在 v1.0.0 中自己编写 Harness。
- 把下一轮需要的每个文件都写到 /data 下。
- 在每一轮的模型耗时之上加约 0.5 秒的恢复与挂起开销。
- 给 ModelConfig 设置 timeout 和 maxTokens，因为默认没有任何东西限制一轮。
- 给模型主机和工具主机使用完整 DNS 名称。
- 并行 CLI 调用时，保持一个常驻端口转发。
```

来源： capture/lab/summary/demos-x86.json, capture/lab/K-kagent/install/steps.tsv, capture/lab/K-kagent/install/commands.log, capture/lab/K-kagent/install/40-kagent-install.log, capture/lab/K-kagent/inventory/images.tsv, capture/lab/K-kagent/inventory/helm-list.yaml, capture/lab/K-kagent/inventory/workerpools.yaml, capture/lab/K-kagent/agent/lab-agent.yaml, capture/lab/K-kagent/agent/objects.txt, capture/lab/K-kagent/agent/agent-conditions.trace, capture/lab/K-kagent/logs/actor-state-changes.tsv, capture/lab/summary/kagent-turns-x86.json, capture/lab/summary/install-steps.json, capture/lab/K-kagent/latency/timings.tsv, capture/lab/K-kagent/latency/server-times.tsv, capture/lab/K-kagent/latency/D-par-2.err, capture/lab/K-kagent/session1/turn2.out, capture/lab/K-kagent/session1/timings.tsv, capture/lab/K-kagent/session1/egress-policy-actor.yaml, capture/lab/K-kagent/session1/k8s-egresspolicies.yaml, capture/lab/K-kagent/session1/turn5-egress.out, capture/lab/K-kagent/session1/mock.log, capture/lab/K-kagent/parallel/timings.tsv, capture/lab/K-kagent/parallel/workers-during.txt; capture/lab/summary/kagent-model-x86.json; capture/lab/S-ax-model/10-model/10-bench.tsv, 06-list.txt, 02-image.txt, 12-ollama-ps.txt; capture/lab/S-ax-model/20-kagent/01-real-model.yaml, 04-ready.txt; capture/lab/S-ax-model/20-kagent/loop/per-turn.tsv, summary.txt, timings.tsv, events.log, prompt.txt, ollama.excerpt.log, ate-api.log, C-1p5b-first-3.err, stuck-turn-01-time.txt, stuck-turn-02-actor.yaml, stuck-turn-05-ollama-runaway.log, stuck-turn-06-restart-note.txt; capture/lab/S-ax-model/_scripts/s01-model.sh, s11-kagent-loop.sh, s12-kagent-analyze.py; capture/lab/summary/kagent-bound-x86.json; capture/lab/W-ax-kagent-2/10-kagent-bound/01-bounded.yaml, 00-explain-maxTokens.txt, 00-explain-maxCompletionTokens.txt, 00-explain-timeout.txt, 00-explain-agent-spec.txt, 00-explain-agenttemplate-spec.txt, events.log; capture/lab/W-ax-kagent-2/11-long-prompt/results.tsv; capture/lab/W-ax-kagent-2/12-kagent-bound-long/events.log, timings.tsv, ollama-gin.log, T-tok-count-1.json, U-time-count-1.json, U-time-count-1.after.log, F-free-count-1.after.log, prompt-count.txt; capture/lab/W-ax-kagent-2/_scripts/w10-kagent-bound.sh, w12-kagent-bound2.sh; kagent v1.0.0 source: go/api/v1alpha3 (Harness, AgentTemplate, Agent, and modelconfig_types.go for maxTokens, maxCompletionTokens, and timeout), go/core/internal/substrate (client.go, actor_template.go), go/core/internal/controller/translator, go/core/pkg/install/charts.go, go/core/pkg/install/plan.go (the Substrate values), go/core/pkg/config/defaults.go (the chart registry), go/go.mod; kagent docs/architecture/runtime-and-lifecycle.md at v1.0.0; agentgateway v1.7.0 crates/agentgateway/src/http/substrate/egress.rs (the credential cache).
