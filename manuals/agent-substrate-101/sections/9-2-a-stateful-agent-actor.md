# 有状态 agent actor

> 一个把每个轮次写入持久目录的 agent，在两种快照保真度下都能保留对话，而保真度决定了它还能保留什么以及返回有多快。

你有一个与模型对话并保留对话记录的 agent。你想为每个用户运行一个副本，又不想在用户阅读回复时为 pod 付费。决定你设计的核心问题很简单：挂起之后，agent 到底还记得什么？

读完本节，你能构建一个在经历挂起后仍能保留对话记录的 agent actor。你还能依据实测成本选择快照保真度，并为 agent 提供它从未直接持有的模型密钥。

## agent {#s-a-stateful-agent-actor-the-agent}

示例 agent 是一个 100 行的 Python 文件，没有任何依赖。它提供三个路径，一次处理一个对话轮次。

- `POST /chat` 把你的消息加入对话，调用模型，并存储这两条消息。
- `POST /note` 把一段文本保存在一个 Python 变量以及 `/tmp` 下的一个文件中。没有任何持久化存储保存它。
- `GET /history` 返回对话记录以及关于进程状态的五个事实。

该 agent 将对话保存在两个地方。一处是进程内存中的一个列表。另一处是 `/data` 中的一个 SQLite 文件，模板将该位置挂载为持久目录。当进程启动时，它会从该文件加载这个列表。

```python
def stored_turns():
    with database() as connection:
        return [{"role": role, "content": content}
                for role, content in connection.execute("select role, content from turns order by n")]


memory = stored_turns()
rehydrated = len(memory)
```

启动时的那一次加载就是整个设计的核心。一个带着空内存重启的进程，会从持久目录中读出自己的过去。完整文件在[有状态 agent 目录](manuals/agent-substrate-101/capture/demos/stateful-agent)。

```figure
id: fig-9-2
kind: comparison
title: 每次挂起后 agent 在各保真度下保留的内容
claim: 在两种保真度下对话都得以恢复，而便签、/tmp 下的文件以及进程本身仅在内存保真度下得以保留。
caption: 两列分别对应同一个 agent 在经历第一次挂起后的状态。绿色行表示恢复的内容，玫瑰色行表示丢失的内容。数值来自两次录制的会话。来源：capture/lab/N-demos/stateful-agent/session-memory.tsv、session-volumes.tsv。
```

## 模型密钥 {#s-a-stateful-agent-actor-the-model-key}

agent 在其 `Authorization` 头中发送文本 `Bearer placeholder`。它没有其他密钥。真正的密钥是某个命名空间中的 Kubernetes Secret，而该 actor 无法读取该命名空间。出站网关在请求出站时替换该请求头。

```listing
title: agent actor 的出站策略（API 存储的格式）
source: capture/lab/N-demos/stateful-agent/egress-policy-memory-live.yaml
lang: yaml
note: 规则部分。上方的元数据行已省略。
---
…
rules:
- http:
    effects:
      replaceHeaders:
      - credentialUri: ate-secret://k8s.io/default/demo-agent-secrets/model-key/token
        header: Authorization
        prefix: 'Bearer '
    hostnames:
    - mock-llm.demo-agent.svc.cluster.local
    ports:
      numbers:
      - 80
```

本示例中的模型是集群内的一个模拟服务器，并非真实模型。它根据收到的消息作答，并报告收到了哪个密钥。在我们两个会话的全部 16 次模型调用中，它报告的都是真正的密钥。[凭据注入](#s-credential-injection)解释了该机制及其局限。

## 两个会话，两种保真度各一 {#s-a-stateful-agent-actor-two-sessions-one-for-each-fidelity}

我们将同一个模板创建了两份。一份申请 `SNAPSHOT_FIDELITY_MEMORY`，另一份申请 `SNAPSHOT_FIDELITY_VOLUMES`。每个会话包含两个轮次和一个便签，随后是三轮挂起、一个轮次，再加一个轮次。

```listing
title: 内存保真度下的会话
source: capture/lab/N-demos/stateful-agent/session-memory.tsv
lang: text
note: 表头、前三个步骤，以及第一次挂起后的两个轮次。回复文本在标记处被截断。
---
step	http	seconds	reply
turn 1, new actor	200	0.584397	{"reply": "turn 1: you said 'my name is Ada'. Your first message was 'my name is Ada'. Gateway sent the real key.", "memory_turns": 2, "db_turns": 2, "rehydrated_from_db": 0, "note": null, "scratch_file": false, "proces …
note, memory only	200	0.072225	{"memory_turns": 2, "db_turns": 2, "rehydrated_from_db": 0, "note": "remember the number 42", "scratch_file": true, "process_age_s": 10.8}
turn 2, warm	200	0.112794	{"reply": "turn 2: you said 'what is my name'. Your first message was 'my name is Ada'. Gateway sent the real key.", "memory_turns": 4, "db_turns": 4, "rehydrated_from_db": 0, "note": "remember the number 42", "scratch_file" …
turn 3, after suspend 1	200	0.297402	{"reply": "turn 3: you said 'message after suspend 1'. Your first message was 'my name is Ada'. Gateway sent the real key.", "memory_turns": 6, "db_turns": 6, "rehydrated_from_db": 0, "note": "remember the number …
turn 3b, warm	200	0.101483	{"reply": "turn 4: you said 'warm message 1'. Your first message was 'my name is Ada'. Gateway sent the real key.", "memory_turns": 8, "db_turns": 8, "rehydrated_from_db": 0, "note": "remember the number 42", "scratch_file" …
```

在内存保真度下，挂起后的 agent 仍是同一个进程。便签还在，`/tmp` 下的文件还在，`process_age_s` 也一直在增长。agent 没有从 SQLite 加载任何内容，因为它根本没有重新启动。

```listing
title: 卷保真度下的会话
source: capture/lab/N-demos/stateful-agent/session-volumes.tsv
lang: text
note: 表头、前三个步骤，以及第一次挂起后的两个轮次。回复文本在标记处被截断。
---
step	http	seconds	reply
turn 1, new actor	200	5.083124	{"reply": "turn 1: you said 'my name is Ada'. Your first message was 'my name is Ada'. Gateway sent the real key.", "memory_turns": 2, "db_turns": 2, "rehydrated_from_db": 0, "note": null, "scratch_file": false, "proces …
note, memory only	200	0.068069	{"memory_turns": 2, "db_turns": 2, "rehydrated_from_db": 0, "note": "remember the number 42", "scratch_file": true, "process_age_s": 0.4}
turn 2, warm	200	0.096986	{"reply": "turn 2: you said 'what is my name'. Your first message was 'my name is Ada'. Gateway sent the real key.", "memory_turns": 4, "db_turns": 4, "rehydrated_from_db": 0, "note": "remember the number 42", "scratch_file" …
turn 3, after suspend 1	200	5.059144	{"reply": "turn 3: you said 'message after suspend 1'. Your first message was 'my name is Ada'. Gateway sent the real key.", "memory_turns": 6, "db_turns": 6, "rehydrated_from_db": 4, "note": null, "scratch_file": …
turn 3b, warm	200	0.093130	{"reply": "turn 4: you said 'warm message 1'. Your first message was 'my name is Ada'. Gateway sent the real key.", "memory_turns": 8, "db_turns": 8, "rehydrated_from_db": 4, "note": null, "scratch_file": false, "process_ag …
```

在卷保真度下，每次挂起后 agent 都是一个全新的进程。当它作答时，它的存活时间只有 0.3 秒。便签和文件都不见了。对话记录是完整的，因为新进程从 SQLite 加载了四个轮次。模型在每次调用中仍然收到了会话的第一条消息。

## 两种保真度各自的代价 {#s-a-stateful-agent-actor-what-each-fidelity-costs}

**我们测得**每个轮次在客户端的耗时，环境是第二台 x86 服务器客户机（16 vCPU、31 GB），经由 `kubectl ate proxy` 发起。每个会话有三个跟在挂起之后的轮次，以及四个在运行中 actor 上的轮次。模拟模型会立即应答，因此这些耗时不包含模型时间。

```figure
id: fig-9-2b
kind: chart
title: 单个轮次的耗时（按保真度和 actor 状态区分）
claim: 恢复 actor 的轮次在内存保真度下耗时 0.30 秒，在卷保真度下耗时 4.5 到 5.1 秒。
caption: 每个圆点代表一个轮次。左侧一组是在运行中 actor 上的轮次，右侧一组是必须先恢复 actor 的轮次。来源：capture/lab/summary/demos-x86.json。
```

| 轮次 | 内存保真度 | 卷保真度 |
|---|---|---|
| 在运行中的 actor 上 | 0.09 到 0.11 秒 | 0.09 到 0.10 秒 |
| 挂起之后 | 0.30 到 0.32 秒 | 4.49 到 5.06 秒 |
| 新 actor 的首个轮次 | 0.58 秒 | 5.08 秒 |

actor 的生命周期日志揭示了时间花在哪里。在内存保真度下，恢复耗时 0.15 到 0.17 秒。在卷保真度下耗时 4.3 到 4.8 秒，因为沙箱每次都要引导镜像并启动 Python。我们没有测量该引导过程中哪一部分占比最大。

这个结果与 [Substrate 上的 kagent 1.0](#s-kagent-on-substrate) 中的 kagent 运行不同，后者在卷保真度下的恢复耗时为 0.38 秒。kagent harness 是另一个镜像中的已编译程序。你自己使用的镜像决定了这个数字，因此在选型前请务必实测。

## 示例的局限 {#s-a-stateful-agent-actor-limits-of-the-demo}

- 模型是模拟的。真实模型会给每个轮次增加它自己的耗时。
- 每个会话只运行了一个 actor。我们没有测量多个 agent 同时恢复的情况。[为 pool 规划容量](#s-sizing-a-pool)中包含了多达 300 个计数器 actor 的并发突发。
- SQLite 在模型作答之后保存每个轮次。若在作答与写入之间发生崩溃，将丢失该轮次。
- agent 没有身份认证。能触达 router 的每个调用方都可以读取对话记录。

## 上生产前要改什么 {#s-a-stateful-agent-actor-what-to-change-for-production}

即使选择内存保真度，也要保留写入持久目录的逻辑。崩溃的 actor 会退回它最近一次持久快照，而回退可能会丢弃最新的内存状态。持久目录是该快照的一部分，因此文件会随之一同回退。轮次只有在下一次同步挂起之后，或者保存在 actor 外部的存储中时，才是安全的。

当用户在停顿后等待第一次回答，且你的 agent 占用的内存较小时，选择内存保真度。当 agent 占用大量内存，或者你希望在每次挂起后得到一个干净的进程时，选择卷保真度。若要每个轮次都有一个干净的进程，harness 必须在轮次之间挂起 actor。然后让镜像的启动尽可能变快。

```takeaways
- 把每个轮次写入持久目录，并在进程启动时加载它。
- 给 agent 一个占位密钥，让出站策略注入真正的密钥。
- 在选择之前，用你自己的镜像在两种保真度下分别测量恢复耗时。
- 使用卷保真度时，把进程内存和 /tmp 下的文件视为会丢失的状态。
```

来源：capture/lab/N-demos/stateful-agent/session-memory.tsv, capture/lab/N-demos/stateful-agent/session-volumes.tsv, capture/lab/N-demos/stateful-agent/egress-policy-memory-live.yaml, capture/lab/N-demos/stateful-agent/lifecycle-memory.log, capture/lab/N-demos/stateful-agent/lifecycle-volumes.log, capture/lab/N-demos/stateful-agent/mock-llm.log, capture/lab/summary/demos-x86.json, capture/demos/stateful-agent/agent.py, capture/demos/stateful-agent/template.yaml
