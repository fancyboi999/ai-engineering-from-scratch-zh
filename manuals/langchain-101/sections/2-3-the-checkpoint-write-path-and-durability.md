# 检查点写入路径：put、put_writes 与持久性

> 节点刚返回就崩溃，会让它在 100 次 sync 试验里重跑 97 次、在 100 次 async 试验里重跑 95 次，所以要把节点的副作用键在任务命名空间上。

三个节点并行运行。一个向模型提问，一个调用天气工具，还有一个在进程死掉时仍在工作。你用 `durability="sync"`，因为文档称它是安全模式。你恢复这个线程，模型节点又运行了一遍。它的答案本来已经回来了，而它的副作用，假如有的话，现在会发生两次。

读完本节，你能说出超步的每一部分分别由哪个 saver 调用变得持久，以及崩溃会重复什么。你还能用任务命名空间构造一个幂等键。

## 每个超步两次写入 {#s-the-checkpoint-write-path-and-durability-two-writes-for-every-superstep}

**put_writes：** 把一个已完成任务的写入存成 `writes` 表中若干行的 saver 调用。这些行挂在该超步所起始的检查点之下。

**put：** 把一个检查点，即一个超步之后的状态，存成 `checkpoints` 表中一行的 saver 调用。

一个任务完成时，循环在内存里记录它的写入，并把 `put_writes` 提交给后台执行器 {{code libs/langgraph/langgraph/pregel/_loop.py:523-551}}。默认情况下，没有任何东西等待那个 future。`DeltaChannel` 的写入是例外：`_checkpointer_put_after_previous` 会等待待定的写入 future 和前一次 put {{code libs/langgraph/langgraph/pregel/_loop.py:1748-1760}}。更新阶段之后，`_put_checkpoint` 构建检查点并提交 `put` {{code libs/langgraph/langgraph/pregel/_loop.py:1275-1420}}。用 `durability="sync"` 时，循环在规划下一个超步之前，会等待那一个 future {{code libs/langgraph/langgraph/pregel/main.py:3103-3105}}。`sync` 等的就只有这一个。

用 `durability="exit"` 时，运行期间从不调用 `put_writes`，中间的 `_put_checkpoint` 调用也跳过 saver {{code libs/langgraph/langgraph/pregel/_loop.py:1325-1351}}。那唯一的检查点在运行退出时保存 {{code libs/langgraph/langgraph/pregel/_loop.py:1543-1553}}。

## 录下调用的顺序 {#s-the-checkpoint-write-path-and-durability-the-order-of-the-calls-captured}

我们记录了一次 `create_agent` 运行在 `SqliteSaver` 上的每个 saver 调用，在 x86 服务器客户机上用 Qwen3 4B。模型要求了两次工具调用，然后作答。这是 `sync` 运行，从工具步骤到结束：

```listing
title: 工具步骤和最后的模型步骤的 saver 调用，持久性为 sync
source: capture/lab/internals/03-checkpoint/trace.txt
lang: text
---
  [ 21] tick step=2 run=['tools', 'tools']
  [ 22]   task done  tools      -> loop.put_writes ['messages', 'branch:to:model']
  [ 23]   task done  tools      -> loop.put_writes ['messages', 'branch:to:model']
  [ 25]   loop._put_checkpoint source=loop exiting=False
  [ 27]     SAVER.put_writes ckpt=..3a2745cf3dd2 task=9360c94c channels=['messages', 'branch:to:model']
  [ 28]     SAVER.put_writes ckpt=..3a2745cf3dd2 task=b0bb9318 channels=['messages', 'branch:to:model']
  [ 29]     SAVER.put id=..0f5fddfed5a3 parent=..3a2745cf3dd2 step=2 source=loop
  [ 31] tick step=3 run=['model']
  [ 32]   task done  model      -> loop.put_writes ['messages']
  [ 34]   loop._put_checkpoint source=loop exiting=False
  [ 36]     SAVER.put id=..930ea1dbdfc0 parent=..0f5fddfed5a3 step=3 source=loop
  [ 39]     SAVER.put_writes ckpt=..0f5fddfed5a3 task=7f67758b channels=['messages']
```

读第 34 到 39 行。步骤 3 的检查点在第 36 行存储，循环就继续往前走了。该步骤的模型任务 `7f67758b` 的写入，在第 39 行才到达 saver，晚于已经包含它们的那个检查点。这里的顺序没有造成伤害，因为检查点覆盖了这一步。它表明，循环不会等待 `put_writes`，`sync` 也是如此。

伤害出现在超步更早的位置。一个任务在它的兄弟任务还在运行时就返回了，它的输出只靠它的 `put_writes` 来保存。在一台负载较高的客户机上的一次运行里，五个任务各自等待那个调用完成，用了 3.0 到 4.4 毫秒。[图](#fig-2-3)放大到每个超步的结尾。

```figure
id: fig-2-3
kind: timeline
title: 一次 sync 运行里，每个已完成任务等待它的 put_writes 多久
claim: 在一次高负载运行里，已完成的任务有 3.0 到 4.4 毫秒不持久，而 sync 只等检查点的 put。
caption: 每个面板是一个超步的结尾，放大到最后一个任务返回之后的毫秒。上方的泳道是循环，下方的泳道是后台 saver。实心青色块是 put，空心块是 put_writes 调用，玫红色条带是任务变得持久之前的区间。面板之间的标签写出下一个任务及其耗时。来源：capture/lab/internals/03-checkpoint/a_sync.trace.jsonl。
```

同一份追踪在开头也显示出一个间隙。输入检查点，即步骤 -1，在第 9 行才到达 saver，晚于第 5 行 `__start__` 任务的返回。所以 `sync` 在第一个任务之前并不等待输入检查点。它是在你的图的第一个节点之前才等。

## 在已完成任务与检查点之间崩溃 {#s-the-checkpoint-write-path-and-durability-a-crash-between-finished-tasks-and-the-checkpoint}

测试图在 `SqliteSaver` 上并行运行 `a`、`b` 和 `c`，然后运行 `d`。`a` 让 Qwen3 4B 说出一种水果，`b` 调用 `get_weather` 工具。`c` 等到两者都返回，再等一个设定的时间，然后调用 `os._exit(17)`。随后一个新进程用 `invoke(None)` 恢复这个线程，并记录每个运行的节点。

**我们测得**这一点，在 x86 服务器客户机上，每个单元格 50 次试验，两次运行。运行 1 是崩溃矩阵。运行 2 重复了等待为零和 0.2 秒的单元格，并且还记录了任务命名空间。区间是 Wilson 95% 区间：

| 模式 | 崩溃前的等待 | 运行 1：重跑了 `a` | 运行 2：重跑了 `a` | 合并，Wilson 95% |
|---|---|---|---|---|
| `sync` | 0 秒 | 50 次中的 49 次 | 50 次中的 48 次 | 100 次中的 97 次，0.915 到 0.990 |
| `async` | 0 秒 | 50 次中的 45 次 | 50 次中的 50 次 | 100 次中的 95 次，0.888 到 0.978 |
| `sync` | 0.2 秒 | 50 次中的 0 次 | 50 次中的 0 次 | 100 次中的 0 次 |
| `async` | 0.2 秒 | 50 次中的 0 次 | 50 次中的 0 次 | 100 次中的 0 次 |
| `exit` | 0 秒和 0.2 秒 | 没有检查点，100 次中的 100 次 | 未运行 | |

`b` 在任何一次试验里都没有再运行。工具在几毫秒内返回，所以它的 `put_writes` 在崩溃之前早就完成了。`a` 最后返回，比 `c` 退出早几毫秒，所以它的写入还在路上。每次 `exit` 试验都没有留下检查点，恢复抛出了 `EmptyInputError: Received no input for __start__`。[图](#fig-2-3b)画出每一次试验。

```figure
id: fig-2-3b
kind: chart
title: 在超步中间崩溃之后，恢复运行了什么
claim: 没有等待时，最后返回的模型节点在 100 次 sync 试验里重跑了 97 次，在 100 次 async 试验里重跑了 95 次，等待 0.2 秒时一次也没有。
caption: 每个点是一次试验，每个单元格 50 次，共两次运行。玫红色的点重跑了模型节点 a 和崩溃的节点 c，青色的点只重跑了 c，灰色的点没有可恢复的东西。来源：capture/lab/internals/03-checkpoint/crash.json 和 capture/lab/internals/03-checkpoint/taskns.json。
```

等待为零时，持久性模式没有造成差别。区间重叠，运行 2 在 `async` 下的重复甚至更多。两种模式都在步骤结束时等待，而崩溃发生在结束之前。风险在于每个任务之后那一次 `put_writes` 调用的窗口。在 `SqliteSaver` 上，该调用在 `sync` 下平均 4.6 毫秒，在 `async` 下平均 4.2 毫秒，是在负载较高的客户机上测得（[第 2.6 节](#s-checkpoint-growth-and-the-cost-of-a-superstep)）。在 agent 里，模型节点常常在一个更慢的兄弟节点仍在运行时就返回，这就是那个窗口。

## 为什么恢复能找到正确的任务 {#s-the-checkpoint-write-path-and-durability-why-a-resume-finds-the-right-tasks}

**任务 id：** 一个超步里某个任务的 id。循环把它算成一个 `xxh3` 哈希 {{code libs/langgraph/langgraph/pregel/_algo.py:616-623}} {{code libs/langgraph/langgraph/pregel/_algo.py:990-997}}。PUSH 任务对六个值求哈希，PULL 任务对五个固定值加上它的触发器求哈希。这些值是检查点 id、命名空间、步骤、节点名、PULL 或 PUSH，以及触发器或 `Send` 的下标。

任务的写入，连同任务 id，保存在它所属超步起始的那个检查点之下 {{code libs/langgraph/langgraph/pregel/_loop.py:523-531}}。恢复会加载那个检查点，规划出同样的任务，得到同样的 id。每个有已保存写入的任务拿回它们 {{code libs/langgraph/langgraph/pregel/_loop.py:841-854}}，运行器只运行没有写入的任务 {{code libs/langgraph/langgraph/pregel/main.py:3085}}。失败的任务，或停在中断处的任务，没有已保存的输出，所以会再次运行 {{code libs/langgraph/langgraph/pregel/_task_status.py:99-129}}。

检查点 id 本身每次都是新的 `uuid6` {{code libs/langgraph/langgraph/pregel/_checkpoint.py:334}}。所以只有起始检查点已被保存时，任务 id 才会重复。它丢失时，恢复会从更早的检查点开始，并生成新的 id。运行 2 的 200 次试验里没有一次出现这种情况。在那些试验里，`a` 里的模型调用比它之前那个检查点的 `put` 花的时间更长。

## 把任务命名空间用作幂等键 {#s-the-checkpoint-write-path-and-durability-the-task-namespace-as-an-idempotency-key}

节点可以从它的配置里读到它的任务命名空间 `<node>:<task id>`。崩溃矩阵的运行 2 在每个节点的第一行记录了它：

```listing
title: 在节点里读取任务命名空间
source: capture/lab/internals/03-checkpoint/crash.py
lang: python
---
        rec["ns"] = get_config()["configurable"]["checkpoint_ns"]
```

```listing
title: 崩溃的运行与恢复中的命名空间对照
source: capture/lab/internals/03-checkpoint/taskns.txt
lang: text
note: 截取每个单元格的命名空间计数。
---
  durability=sync  wait=0.0s: {"n": 50, "categories": {"a and c": 48, "only c": 2}, … "ns": {"c ns same": 50, "a ns same when a rerun": 48, "a rerun": 48, "b ns same when b rerun": 0, "b rerun": 0}}
  durability=async wait=0.0s: {"n": 50, "categories": {"a and c": 50}, … "ns": {"c ns same": 50, "a ns same when a rerun": 50, "a rerun": 50, "b ns same when b rerun": 0, "b rerun": 0}}
```

每个再次运行的节点，都带着它首次运行时的命名空间：`c` 在 200 次试验里 200 次如此，`a` 在 98 次重复里 98 次如此。以命名空间为键的副作用，本可以跳过 `a` 的全部 98 次重复。这在 `sync` 和 `async` 下都成立。

所以，把节点的副作用键在它的命名空间上。把键和副作用一起保存，如[第 5.3 节](#s-durability-modes-and-a-crash-between-two-steps)所示，键已存在时就跳过这个副作用。新的一轮会规划出带新 id 的新任务，所以新一轮里的同一个请求是一个新的副作用。在 `exit` 下，崩溃什么也没留下可恢复，所以那里要用你自己的数据构造键。

命名空间只在起始检查点已保存时成立。那个检查点丢失时，重放得到的是新的任务 id。到那时，只有你保存的业务键，例如订单 id，才能阻止重复的副作用。

```takeaways
- 预期在崩溃前刚返回的节点会再次运行，sync 和 async 都一样。
- 把节点的每个副作用，键在 get_config 里的 checkpoint_ns 上，并把键和副作用一起保存。
- 选 sync 还是 async 要出于别的理由，因为两者都保护不了在最后几毫秒返回的任务。
- 崩溃的 exit 模式线程要从它的输入重新开始，因为 invoke(None) 会抛出 EmptyInputError。
```

来源：capture/lab/internals/03-checkpoint/trace.txt, capture/lab/internals/03-checkpoint/run.py, capture/lab/internals/03-checkpoint/a_sync.trace.jsonl, capture/lab/internals/03-checkpoint/a_async.trace.jsonl, capture/lab/internals/03-checkpoint/a_exit.trace.jsonl, capture/lab/internals/03-checkpoint/crash.py, capture/lab/internals/03-checkpoint/crash.txt, capture/lab/internals/03-checkpoint/crash.json, capture/lab/internals/03-checkpoint/taskns.txt, capture/lab/internals/03-checkpoint/taskns.json, capture/lab/internals/08-costs/trace.txt; libs/langgraph/langgraph/pregel/_loop.py, libs/langgraph/langgraph/pregel/main.py, libs/langgraph/langgraph/pregel/_algo.py, libs/langgraph/langgraph/pregel/_task_status.py, and libs/langgraph/langgraph/pregel/_checkpoint.py at langgraph 1.2.22.
