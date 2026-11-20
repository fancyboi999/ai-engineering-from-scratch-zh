# 流模式的源头，以及 v3 投影缓冲区

> 每条消息只读一个 v3 投影，或者读原始事件，因为先读推理的循环，让推理模型的答案晚了 8.8 到 9.0 秒才显示。

你把聊天界面换成推理模型，并换成 `stream_events(version="v3")`。思考过程实时流出半分钟。然后答案在一个停顿之后整块出现，停顿的长度和答案本身一样长。你的服务器日志显示，模型是逐 token 发出答案的。这些 token 一直都在进程里，在一个你不知道自己拥有的缓冲区中。

读完本节，你能说出生成每种流模式的函数，以及它在超步里的哪个时刻生成。你还能从代码解释 issue langchain#38484，并写出一个在每个 token 到达时就显示它的 v3 消费者。

## 一个队列，七种模式，六个生产者 {#s-where-each-stream-mode-comes-from-one-queue-seven-modes-six-producers}

`stream()` 的每种流模式都写入同一个队列。循环在任务完成之间把它排空，v2 格式把每一项包装成带 `type`、`ns` 和 `data` 的 `StreamPart` {{code libs/langgraph/langgraph/pregel/main.py:4436-4449}}。我们记录了每一项进入队列那一刻的调用栈：

| 模式 | 生产者 | 时机 |
|---|---|---|
| `checkpoints`、`debug` | `_prepare_tasks_and_emit_checkpoint` {{code libs/langgraph/langgraph/pregel/_loop.py:806-809}} | 下一个超步开始时 |
| `tasks` | `tick` {{code libs/langgraph/langgraph/pregel/_loop.py:697-699}} | 任务被规划时，以及每个结果出来时再来一次 |
| `updates` | `put_writes`，然后是 `output_writes` {{code libs/langgraph/langgraph/pregel/_loop.py:563-565}} | 每个任务完成时 |
| `values` | `after_tick` {{code libs/langgraph/langgraph/pregel/_loop.py:743-745}} | 更新阶段之后 |
| `messages` | `StreamMessagesHandler.on_llm_new_token` {{code libs/langgraph/langgraph/pregel/_messages.py:175-188}} | 每个模型 token，通过回调 |
| `custom` | `stream_writer` 闭包 {{code libs/langgraph/langgraph/pregel/main.py:2954-2967}} | 你的代码调用 writer 时 |

实践中有两行重要。`updates` 按任务到达，所以并行的慢任务不会拖住快任务的更新。`values` 要等整个超步。在 x86 服务器客户机上用 Qwen3 4B 开启全部模式运行一次 `create_agent`，可以看到顺序：

```listing
title: 一次 agent 运行的每种模式，按时间排列
source: capture/lab/internals/05-streaming/trace.txt
lang: text
note: 第一个模型步骤的结尾、工具步骤，以及答案的开头。运行的其余部分被截掉了。
---
     1894.5 ms  messages    AIMessageChunk chunk text='' node=model step=1
     1894.6 ms  messages    AIMessageChunk chunk text='' node=model step=1
     1894.6 ms  updates     keys=['model']
     1894.6 ms  tasks       result model
     1894.6 ms  debug       type=task_result step=1
     1895.5 ms  values      2 messages
     1895.5 ms  checkpoints step=1 next=['tools']
     1895.5 ms  debug       type=checkpoint step=1
     1895.5 ms  tasks       start tools
     1895.5 ms  debug       type=task step=2
     1899.6 ms  custom      {'progress': 'looking up Paris'}
     1899.6 ms  messages    ToolMessage chunk text='Paris: sunny' node=tools step=2
…
     2658.7 ms  messages    AIMessageChunk chunk text='The' node=model step=3
     2726.1 ms  messages    AIMessageChunk chunk text=' weather' node=model step=3
```

第一个模型步骤用了 1.89 秒，没有流出任何文本，因为它的回复是一次工具调用。工具步骤用了 4.5 毫秒。然后答案约每 67 毫秒流出一个 token。这些时间来自负载较高的客户机上的一次运行，所以请看各模式的顺序，不要看时间。[图](#fig-2-5)把每种模式放到运行的各个阶段上。

```figure
id: fig-2-5
kind: timeline
title: 一次 agent 运行里，每种流模式在哪里生成
claim: updates、messages 和 custom 在任务运行时生成，values 在更新阶段之后，而 checkpoints 要到下一个超步开始时才生成。
caption: 横轴是从一次 create_agent 运行开始起算的毫秒，分成三段放大的区间，中间有断开。每一行是一种流模式，每个刻度是一项。阴影带是 tools 超步，上方的标签标明模型步骤，数字对应坐标轴下方的注释。来源：capture/lab/internals/05-streaming/trace.txt。
```

## v3 流由读取方拉动 {#s-where-each-stream-mode-comes-from-the-v3-stream-is-pulled-by-the-reader}

`stream_events(version="v3")` 不运行后台线程。只有读取方要更多时，它才运行图。像 `message.text` 这样的投影，保存一个增量列表和一个游标。游标到达列表末尾时，迭代器调用 `_request_more`，它运行图直到一个新事件到达 {{code libs/core/langchain_core/language_models/chat_model_stream.py:247-269}} {{code libs/langgraph/langgraph/stream/run_stream.py:136-160}}。投影被标记为完成时，迭代器停止。

每个被拉取的事件会送到它所属消息的每个投影里。文本增量会进入 `message.text` 的列表，即使还没有人读这个列表。

## langchain#38484 的原因 {#s-where-each-stream-mode-comes-from-the-cause-of-langchain-38484}

Issue langchain#38484 报告，v3 消费者会在一次爆发中拿到最终答案 {{issue langchain#38484}}。[第 5.1 节](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode)复现了它。代码说明了原因。

一条消息的三个投影，在整条消息结束时，于同一个位置被一起标记为完成 {{code libs/core/langchain_core/language_models/chat_model_stream.py:1092-1094}}。推理块的结束只是让那个块定稿，并不会让 `message.reasoning` 完成 {{code libs/core/langchain_core/language_models/chat_model_stream.py:962-976}}。所以，下面这个循环要等到最后一个文本 token 到达，才能离开它的第一个 `for`：

```listing
title: 录制里的三个消费者循环
source: capture/lab/internals/05-streaming/run.py
lang: python
---
    for message in stream.messages:
        if pattern == "reasoning_then_text":
            for d in message.reasoning:
                got.append((now(), "reasoning", d))
            for d in message.text:
                got.append((now(), "text", d))
        elif pattern == "text_only":
            for d in message.text:
                got.append((now(), "text", d))
        elif pattern == "raw_events":
            for ev in message:
                if ev.get("event") == "content-block-delta":
                    delta = ev.get("delta", {})
                    kind = "reasoning" if delta.get("type") == "reasoning-delta" else "text"
                    got.append((now(), kind, delta.get("reasoning") or delta.get("text")))
```

推理循环在等待时，会把文本增量拉进 `message.text` 的列表。消息结束时，第二个循环发现它们全在那里。

**我们测得**这三个循环，在 x86 服务器客户机上用 Qwen3 8B，开启推理，通过 `create_agent`，每个循环 5 次运行，循环交错进行。发送时间是 Ollama HTTP 流把这部分交给 LangChain 的时刻。每次运行有 211 个推理增量，然后是 60 个文本增量：

```listing
title: 每个循环的运行 0
source: capture/lab/internals/05-streaming/trace.txt
lang: text
---
  run 0 reasoning_then_text  emitted r/t=211/60 received r/t=211/60 text emit [31688.1, 40330.7] spread 8642.6 ms; text receive [40474.7, 40474.8] spread 0.1 ms; text lag median/max [4635.1, 8786.6]; reasoning lag median/max [0.7, 7.0]
  run 0 text_only            emitted r/t=211/60 received r/t=0/60 text emit [32307.5, 41001.4] spread 8693.9 ms; text receive [32308.2, 41002.2] spread 8694.0 ms; text lag median/max [0.7, 4.6]; reasoning lag median/max None
  run 0 raw_events           emitted r/t=211/60 received r/t=211/60 text emit [32819.0, 42027.1] spread 9208.1 ms; text receive [32819.8, 42027.8] spread 9208.0 ms; text lag median/max [0.7, 0.9]; reasoning lag median/max [0.7, 4.0]
```

在 5 次运行里的 5 次，先读推理的循环，在彼此相差 0.1 毫秒之内拿到了全部 60 个文本增量。模型却是在 8.6 到 8.9 秒里发出它们的。这是负载较高的客户机上的一次运行，所以把它当作一个顺序来读。第 5.1 节里 Mac 的几行，给出的延迟是 4.0 到 8.5 秒。

它的推理增量是实时到达的。只读文本的循环在 300 个增量上，文本延迟的中位数是 0.7 毫秒，最大是 4.9 毫秒。读原始事件的循环，中位数是 0.7 毫秒，最大是 0.9 毫秒。[图](#fig-2-5b)把每个循环的运行 0 放在同一条轴上。

```figure
id: fig-2-5b
kind: timeline
title: 三种 v3 消费者循环下，文本增量的发送与接收
claim: 先读推理的循环，在第一次发送之后 8.8 秒一次性拿到全部 60 个文本增量，其余循环则在 5 毫秒内拿到每一个。
caption: 每一对行是一个循环，取五次里的运行 0。橄榄色刻度是模型的发送，下方的刻度是循环拿到增量的时刻。玫瑰色条带是文本等待的区间。推理发生在所展示区间之前。来源：capture/lab/internals/05-streaming/v3_38484.json 和 capture/lab/internals/05-streaming/trace.txt。
```

该 issue 的一个已关闭拉取请求 #38533，在 `create_agent` 里把运行配置传给了 `model_.invoke` {{code libs/langchain_v1/langchain/agents/factory.py:1509}}。这个改动没有触及这个机制。在同一个 agent 里，只读文本的循环和读原始事件的循环本来就能实时拿到每个增量，所以模型回调不需要它就能到达流。

## 该写的消费者 {#s-where-each-stream-mode-comes-from-the-consumer-to-write}

在两种形态里选一个。只显示答案时，只读 `message.text`。同时显示推理和答案时，读每条消息的原始事件，并按增量类型分支，就像上面的 `raw_events` 分支那样。这样每个增量都按模型发出的顺序到达你的界面。

不要对同一条消息先后读两个投影。这条规则对 `message.tool_calls` 也成立，[第 5.1 节](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode)测量过。你第二个读的投影，总是要等到消息结束。

```takeaways
- 需要每个任务结果一出现就拿到时用 updates，需要完整状态时用 values。
- 每条消息只读一个 v3 投影，或者迭代原始事件并按增量类型分支。
- 永远不要在同一个循环里先读 message.reasoning 再读 message.text。
- 别指望 create_agent 里的改动能修好 langchain#38484，因为原因在投影里。
```

来源：capture/lab/internals/05-streaming/trace.txt, capture/lab/internals/05-streaming/run.py, capture/lab/internals/05-streaming/v3_38484.json, capture/lab/internals/common/real.py; libs/langgraph/langgraph/pregel/main.py, libs/langgraph/langgraph/pregel/_loop.py, libs/langgraph/langgraph/pregel/_messages.py, and libs/langgraph/langgraph/stream/run_stream.py at langgraph 1.2.22; libs/core/langchain_core/language_models/chat_model_stream.py at langchain-core 1.8.0; libs/langchain_v1/langchain/agents/factory.py at langchain==1.5.0; issue langchain-ai/langchain#38484 and pull request #38533.
