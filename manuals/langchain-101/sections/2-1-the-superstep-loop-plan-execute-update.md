# 超步循环：计划、执行、更新

> 把每个超步当作一个事务：并行写入一起变得可见，顺序按任务路径排列，所以别让你的状态依赖哪个节点先完成。

两个并行节点各自向模型要一个答案，并追加到同一个列表里。你的日志显示 `b` 在多数运行里先于 `a` 返回。而状态里每次都是 `a` 排在前面。你在状态里看到的顺序是一种排序顺序，运行时在节点运行之前就已经固定了它。

读完本节，你能逐行读懂一份超步追踪，并根据通道版本预测下一个运行的节点。你还能预测并行写入的合并顺序，并设置一个数对了东西的递归上限。

## 一个循环里的三个阶段 {#s-the-superstep-loop-plan-execute-update-three-phases-in-one-loop}

**超步：** LangGraph 循环的一次转动。它计划好已就绪的任务，运行它们，然后一次性应用它们全部的写入。

循环很短。`loop.tick()` 做计划，`runner.tick()` 运行每个还没有已保存写入的已计划任务，`loop.after_tick()` 应用写入并保存一个检查点 {{code libs/langgraph/langgraph/pregel/main.py:3081-3105}}。节点永远看不到来自它自己超步的写入。它读到的值，是上一个超步结束时的值。

**计划。** `prepare_next_tasks` 构建两种任务 {{code libs/langgraph/langgraph/pregel/_algo.py:392}}。PULL 任务是这样的节点：它的触发通道里有值，并且版本比该节点上次看到的更新 {{code libs/langgraph/langgraph/pregel/_algo.py:1260-1277}}。PUSH 任务是在 `__pregel_tasks` 通道里等待的一个 `Send` {{code libs/langgraph/langgraph/pregel/_algo.py:441-466}}。

**执行。** 运行器并行启动这些任务。每个任务完成时，循环记录它的写入，并在后台把它们交给 checkpointer。[第 2.3 节](#s-the-checkpoint-write-path-and-durability)跟踪这次写入。

**更新。** 最后一个任务之后，`apply_writes` 对任务排序，按通道把它们的写入分组，并对每个通道只调用一次，传入整组写入 {{code libs/langgraph/langgraph/pregel/_loop.py:732-738}}。然后 `_put_checkpoint` 保存结果 {{code libs/langgraph/langgraph/pregel/_loop.py:774}}。

## 录下一次 agent 运行 {#s-the-superstep-loop-plan-execute-update-one-agent-run-captured}

我们给 `langgraph` 1.2.22 的循环函数打了补丁，记录每次调用。然后在 x86 服务器客户机上，用 Ollama 上的 Qwen3 4B，在 temperature 0 下运行 `create_agent`。提示词是 `Weather in Paris and Oslo?`。模型在第一次回复里要求两次 `get_weather` 调用，用了 3.64 秒，在第二次回复里作答，用了 1.59 秒。这些时间来自负载较高的客户机上的一次运行，所以请看顺序和计数，不要看秒数。下面是追踪的步骤 1 和步骤 2：

```listing
title: 模型步骤和工具步骤的计划、执行与更新
source: capture/lab/internals/01-superstep/trace.txt
lang: text
note: 运行的步骤 1 和 2。模型的写入以及各阶段之间的 saver 行被截掉了。
---
[ 12] PLAN step=1 stop=9999 updated_channels=['branch:to:model', 'messages']
        task __pregel_pull model  id=c716c241 path=('__pregel_pull', 'model') triggers=['branch:to:model']
        versions_seen(before)={'__input__': {}, '__start__': {'__start__': 1}}
[ 13] TICK step=1 returns=True status=pending run=['model']
        channel_versions={'__start__': 2, 'branch:to:model': 2, 'messages': 2}
…
[ 15] UPDATE order=["model@('__pregel_pull', 'model')"]
…
        versions_changed={'__pregel_tasks': [None, 3], 'branch:to:model': [2, 3], 'messages': [2, 3]}
        versions_seen_updated={'model': {'branch:to:model': 2}}
        updated_channels=['__pregel_tasks', 'messages']
…
[ 18] PLAN step=2 stop=9999 updated_channels=['__pregel_tasks', 'messages']
        task __pregel_push tools  id=7bd87c87 path=('__pregel_push', 0, False) triggers=['__pregel_push']
        task __pregel_push tools  id=81e79e5c path=('__pregel_push', 1, False) triggers=['__pregel_push']
…
[ 25] UPDATE order=["tools@('__pregel_push', 0, False)", "tools@('__pregel_push', 1, False)"]
```

`create_agent` 把每个工具调用变成各自的 `Send`，所以两个工具调用变成 `tools` 节点的两个 PUSH 任务 {{code libs/langchain_v1/langchain/agents/factory.py:2031-2032}}。每个任务都有自己的任务 id，在路径里也有自己的下标。[图](#fig-2-1)画出这次运行的全部六个超步，以及每个通道的版本。

```figure
id: fig-2-1
kind: timeline
title: 一次 create_agent 运行的六个超步，及其通道版本
claim: 一个超步里的每次写入都得到同一个新版本，而节点只在它的触发通道比它上次看到的版本更新时才运行。
caption: 列是超步，从输入步骤到找不到任务的那一步。琥珀色标签是已计划的任务。在通道行里，实心单元格是带着新版本的写入，虚线单元格是被读取并清空的。琥珀色箭头从一个版本指向它触发的任务。来源：capture/lab/internals/01-superstep/trace.jsonl。
```

## 版本决定下一个运行什么 {#s-the-superstep-loop-plan-execute-update-versions-decide-what-runs-next}

**通道版本：** 循环在检查点里为每个通道保存的一个数。在一个超步里发生变化的通道会得到新版本。

规则很简单，而且是全局的。`apply_writes` 取所有通道里最高的版本再加一 {{code libs/langgraph/langgraph/pregel/_algo.py:271-282}}。在那个超步里发生变化的每个通道，都得到同一个数。在上面的步骤 1 里，`messages`、`__pregel_tasks` 和 `branch:to:model` 都移到了版本 3。

**versions_seen：** 检查点里的一张映射，从每个节点到该节点上次运行时每个触发通道的版本。

`apply_writes` 只为触发了任务的通道更新 `versions_seen` {{code libs/langgraph/langgraph/pregel/_algo.py:262-269}}。步骤 1 之后，`model` 看到的 `branch:to:model` 是版本 2。到步骤 3 时这个通道是 4，所以 `model` 再次运行。PUSH 任务的触发器是 `__pregel_push`，它不是任何通道，所以追踪里 `tools` 的 `versions_seen` 一直是 `{}`。

有一个细节解释了运行为什么会结束。`branch:to:model` 是一个 `EphemeralValue`。`model` 读取它时，循环会把它清空，但仍然给它一个新版本 {{code libs/langgraph/langgraph/pregel/_algo.py:284-292}}。在步骤 4，它的版本是 5，而 `model` 看到的是 4，但通道是空的。计划既要求更新的版本，也要求有值，所以没有任务运行，循环停止。

## 写入按任务路径顺序合并 {#s-the-superstep-loop-plan-execute-update-writes-merge-in-task-path-order}

`apply_writes` 在应用任何东西之前，先按路径给任务排序 {{code libs/langgraph/langgraph/pregel/_algo.py:256}}。无论任务以什么顺序完成，reducer 随后都按这个顺序拿到写入。

**我们测得**这一点，在 x86 服务器客户机上用 Qwen3 4B，每种情形 3 次运行。两个并行节点 `a` 和 `b`，各自向模型要一个答案，并用 `operator.add` 追加到同一个列表。一个节点要 60 个单词，另一个要一个单词：

```listing
title: 六次运行，两种完成顺序，一种合并顺序
source: capture/lab/internals/02-channels/trace.txt
lang: text
note: 每一对是节点和它的模型调用耗时（秒），按节点返回的顺序排列。
---
slow node=a: finish order (node, model seconds)=[('a', 5.58), ('b', 5.75)]  merged list=['a', 'b']
slow node=a: finish order (node, model seconds)=[('b', 0.6), ('a', 5.93)]  merged list=['a', 'b']
slow node=a: finish order (node, model seconds)=[('b', 0.6), ('a', 5.85)]  merged list=['a', 'b']
slow node=b: finish order (node, model seconds)=[('b', 5.48), ('a', 5.62)]  merged list=['a', 'b']
slow node=b: finish order (node, model seconds)=[('b', 5.7), ('a', 5.83)]  merged list=['a', 'b']
slow node=b: finish order (node, model seconds)=[('b', 5.67), ('a', 5.8)]  merged list=['a', 'b']
```

模型调用没有花我们要求的那么多时间。一台 CPU 上的 Ollama 服务器同时回答两个节点，所以短回答可能排在长回答后面等。`b` 在 6 次运行里有 5 次先返回，而列表在 6 次里 6 次都是 `['a', 'b']`。

PULL 路径排在 PUSH 路径之前。由 `Command(goto=...)` 按名字启动的节点，它的写入先于同一超步里 `Send` 任务的写入而应用。在这次录制里，节点 `a` 向模型要了一个城市，并发出 `c` 去查它的天气。计划器先列出了 `c`，而更新先应用了 `b`：

```listing
title: 一个超步里的一个 PULL 任务和一个 PUSH 任务
source: capture/lab/internals/06-send-command/trace.txt
lang: text
---
  PLAN step=2: push c path=('__pregel_push', 0, False) triggers=['__pregel_push'] id=5f91e09b; pull b path=('__pregel_pull', 'b') triggers=['branch:to:b'] id=5bbd9a1a
  UPDATE order=["b@('__pregel_pull', 'b')", "c@('__pregel_push', 0, False)"] -> updated=['results'] versions={'__pregel_tasks': [3, 4], 'branch:to:b': [3, 4], 'results': [3, 4]}
```

[图](#fig-2-1b)把两种顺序并排放置。所以合并列表的顺序在多次运行之间是稳定的，你可以测试它。这也意味着，只保留最后一个值的 reducer，保留的是路径排在最后的那个任务的值。最慢的任务没有发言权。

```figure
id: fig-2-1b
kind: comparison
title: 任务完成的顺序，与它们的写入被应用的顺序
claim: 在六次运行里节点以两种不同的顺序返回，而它们的写入在六次里都按先 a 后 b 应用，因为 apply_writes 按路径排序。
caption: 每一行是一次运行。左边是节点按返回顺序排列，带着它们模型调用的秒数。右边是 apply_writes 用的顺序。最后一行是一个同时有 PULL 任务和 PUSH 任务的超步，虚线方框是 PUSH 任务。来源：capture/lab/internals/02-channels/trace.txt 和 capture/lab/internals/06-send-command/trace.txt。
```

## 递归上限数的是什么 {#s-the-superstep-loop-plan-execute-update-what-the-recursion-limit-counts}

循环把 `stop` 设为当前步骤加上限再加一，当步骤超过 `stop` 时失败 {{code libs/langgraph/langgraph/pregel/_loop.py:1923}} {{code libs/langgraph/langgraph/pregel/_loop.py:666}}。所以这个上限数的是超步，而隐藏的 `__start__` 步骤也是其中之一。

**我们测得**这个计数，在 x86 服务器客户机上用 Qwen3 4B，每个上限一次运行。提示词让模型在每一轮都调用工具：

| `recursion_limit` | 运行的超步数 | 报错前的模型调用数 |
|---|---|---|
| 1 | 2 | 1 |
| 4 | 5 | 2 |
| 5 | 6 | 3 |
| 10 | 11 | 5 |
| 25 | 26 | 13 |

在新输入上，上限为 k 会运行 k 加一个超步，模型运行约 k 除以二次。对一个被中断的线程以上限 4 恢复，运行了 6 个超步，即步骤 2 到 7。`create_agent` 在它的图上把上限设为 9,999 {{code libs/langchain_v1/langchain/agents/factory.py:1902}}。普通的 `StateGraph` 得到 10,007 {{code libs/langgraph/langgraph/_internal/_config.py:42-44}}。

## 怎么用 {#s-the-superstep-loop-plan-execute-update-what-to-do-with-this}

当顺序没有意义时，写结果不依赖顺序的 reducer，例如求和或集合。当顺序有意义时，就依赖路径顺序并测试它，因为它是稳定的。永远不要把完成时间的日志当作状态的顺序。

给两个并行节点都会写的键加一个 reducer，即使你预期只有一个写入者。[第 2.2 节](#s-channels-and-colliding-writes)展示缺一个 reducer 会对线程造成什么后果。

给 agent 设上限时，数模型调用，不要数步骤。要给 n 次模型调用的预算，就把 `recursion_limit` 设为 n 的两倍。每个 `before_model` 或 `after_model` 钩子节点，会让每次模型调用多一个超步，所以也要加上。

```takeaways
- 用版本读追踪：当一个节点的触发器比它的 versions_seen 条目更新时，它就会运行。
- 预期并行写入按任务路径顺序合并，PULL 在 PUSH 之前，与完成顺序无关。
- 给并行节点写入的每个键都加一个 reducer。
- 把 recursion_limit 设为你允许的模型调用数的两倍，再给每次调用的每个钩子节点加一个超步。
```

来源： capture/lab/internals/01-superstep/trace.txt, capture/lab/internals/01-superstep/trace.jsonl, capture/lab/internals/01-superstep/run.py, capture/lab/internals/02-channels/trace.txt, capture/lab/internals/06-send-command/trace.txt, capture/lab/internals/07-create-agent/trace.txt, capture/lab/internals/common/instrument.py, capture/lab/internals/common/real.py; libs/langgraph/langgraph/pregel/main.py, libs/langgraph/langgraph/pregel/_loop.py, libs/langgraph/langgraph/pregel/_algo.py, and libs/langgraph/langgraph/_internal/_config.py at langgraph 1.2.22; libs/langchain_v1/langchain/agents/factory.py at langchain==1.5.0.
