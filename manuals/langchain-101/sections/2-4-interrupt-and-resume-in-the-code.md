# interrupt() 与 Command(resume)：恢复下标与中断 id

> 恢复会从第一行重跑节点，模型调用也一并重跑，并按位置匹配答案，所以别把模型调用放在会中断的节点里，并用 id 映射来恢复。

你的图同时询问两个人：一个分支里问旅行者，另一个分支里问审批人。每个节点先让模型写出它的问题。两个问题都送到了你的界面。审批人先回答，你的服务器发出 `Command(resume="OK")`。LangGraph 抛出 `RuntimeError`，什么也没有恢复。当你把两个答案作为一个映射发送时，它就好了，而你的账单显示模型把同样的问题又写了一遍。

读完本节，你能逐行跟踪一次经过 `interrupt()` 的恢复，并预测每次调用得到哪个答案。你还能在一次调用里恢复两个等待中的节点，并数出恢复重复的模型调用。

## interrupt() 每次调用做什么 {#s-interrupt-and-resume-in-the-code-what-interrupt-does-on-each-call}

**恢复列表：** 一个任务到目前为止收到的答案列表，作为对 `__resume__` 通道的一次写入保存。

`interrupt()` 在它任务的 scratchpad 里保存一个计数器。每次调用时，它取下一个下标，并按顺序尝试三个来源 {{code libs/langgraph/langgraph/types.py:1029-1058}}：

1. 如果该任务的恢复列表在这个下标上有答案，它就返回这个答案。这是对先前问题的重放。
2. 否则，如果恢复命令为整张图带来了一个答案，它把这个答案追加到列表里，保存列表，并返回它。
3. 否则，它抛出带有新 `Interrupt` 的 `GraphInterrupt`，节点随之停止。

**中断 id：** 一个问题的 id。它是任务命名空间的 `xxh3` 哈希，对该任务第 n 个未回答的问题再加上 `|n` {{code libs/langgraph/langgraph/types.py:583-589}}。

任务抛出 `GraphInterrupt` 时，运行器把问题和恢复列表作为该任务的写入保存 {{code libs/langgraph/langgraph/pregel/_runner.py:594-600}}。id 不需要存储。循环根据命名空间和已有答案的数量重新计算它。saver 把问题作为 `__interrupt__` 上下标为 -3 的写入存储，把每个答案作为 `__resume__` 上下标为 -4 的写入存储 {{code libs/checkpoint/langgraph/checkpoint/base/__init__.py:824}}。

## 一个线程上的三次调用，录下来 {#s-interrupt-and-resume-in-the-code-three-calls-on-one-thread-captured}

录制用的图在 `START` 之后并行运行 `ask`、`approve` 和 `other`，然后运行 `after`。它在 x86 服务器客户机上用 Qwen3 4B，temperature 为 0。`ask` 向模型要一个问题，调用 `interrupt()`，再向模型要第二个问题，再调用 `interrupt()`。`approve` 向模型要一个问题，调用一次 `interrupt()`。`other` 调用天气工具和模型，从不中断。每个节点在它的第一行记录它的命名空间和它的恢复列表，并记录每次模型调用。

第一次 `invoke` 返回了两个中断。`other` 运行并完成，它的写入被保存：

```listing
title: 运行 1，两个中断以及重新计算出的 id
source: capture/lab/internals/04-interrupt/trace.txt
lang: text
---
  returned interrupt id=462dc352bc169ed50a32e43c579712fb value={'q': 'Which city would you like to visit?'}
  returned interrupt id=11314d20c136a4a3ec3a8a26c24243c9 value={'q': 'Could you please approve a travel budget of 900 EUR for the upcoming business trip to Berlin?'}
…
  recompute id for ask: xxh3_128(task_checkpoint_ns='ask:db8df5fb-7f77-0ac1-61de-e4a38b97c8a0') = 462dc352bc16... matches=True
  recompute id for approve: xxh3_128(task_checkpoint_ns='approve:56f9f439-6fe7-44ef-ec89-762fd2b36cf4') = 11314d20c136... matches=True
```

用一个普通值恢复，抛出了异常，没有任何节点和模型调用运行。循环会数有多少待定的中断，多于一个时，它要求一个从 id 到答案的映射 {{code libs/langgraph/langgraph/pregel/_loop.py:1066-1075}}：

```listing
title: 运行 2a，两个问题只给一个答案
source: capture/lab/internals/04-interrupt/trace.txt
lang: text
---
## run 2a: Command(resume='yes') without an id while 2 interrupts are pending
  raises RuntimeError: When there are multiple pending interrupts, you must specify the interrupt id when resuming. Docs: https://docs.langchain.com/oss/python/lan
```

映射形式管用。两个节点都从第一行重新运行，并且在到达 `interrupt()` 之前都又调用了一次模型。`approve` 拿到 `OK` 并完成。`ask` 为它的第一个问题拿到 `A1`，向模型要它的第二个问题，然后带着新的 id 停在那里。`other` 没有再次运行。循环重新应用了它已保存的写入：

```listing
title: 运行 2b，按 id 给出的答案映射
source: capture/lab/internals/04-interrupt/trace.txt
lang: text
---
## run 2b: Command(resume={ask_id: 'A1', approve_id: 'OK'})
…
    {"node": "ask", "event": "enter (first line)", "ns": "ask:db8df5fb-7f77-0ac1-61de-e4a38b97c8a0", "scratchpad.resume": ["A1"], "null_resume": null}
    {"node": "ask", "event": "model call -> 'Which city would you like to visit?'", "model_s": 1.16}
    {"node": "ask", "event": "interrupt #0 returned 'A1'"}
…
  tick step=1 returns=True to_run=['approve', 'ask'] reapplied(no rerun)=['other']
  returned interrupt id=177b6fc6979f90e1a13103fec68d96fb value={'q': 'How many nights will the traveller stay at A1?'}
  second interrupt id expected = xxh3_128(ns + '|1') = 177b6fc6979f... matches=True
```

第三次调用 `Command(resume='A2')` 不需要 id，因为只剩一个问题。`ask` 运行了第三次。它又一次向模型要它的第一个问题，并从列表里重放了 `A1`。然后它又要它的第二个问题，并从命令里拿到 `A2`。[图](#fig-2-4)画出这三次调用。

```figure
id: fig-2-4
kind: timeline
title: 三次调用回答两个并行节点里的三个问题
claim: 每次调用都从第一行重新运行等待中的节点及其模型调用，按下标重放已保存的答案，并且从不再运行已完成的节点 other。
caption: 列是按顺序排列的调用，行是四个节点。琥珀色单元格停在一个中断处，带着它的 id，青色单元格完成，虚线单元格重新应用了已保存的写入。每个单元格里的列表是该节点在第一行看到的恢复列表。底部几行统计模型调用，并写出每次调用保存的检查点。来源：capture/lab/internals/04-interrupt/trace.txt。
```

## 重放的代价 {#s-interrupt-and-resume-in-the-code-what-the-replay-costs}

这张图有五个模型 prompt：`ask` 里两个，`approve`、`other` 和 `after` 里各一个。三次调用做了 9 次模型调用：

```listing
title: 图的每次调用的模型调用数
source: capture/lab/internals/04-interrupt/trace.txt
lang: text
---
## model calls per invocation: {'run 1': 3, 'run 2a': 0, 'run 2b': 3, 'run 3': 3}
```

`ask` 的第一个问题去了模型三次，它的第二个问题和 `approve` 的问题各去了两次。在 temperature 0 下，重放的问题逐字回来了。会采样的模型，在重放时可能写出不同的问题。答案仍然进入同一个下标，所以你的用户可能回答了一个问题，而节点接下来看到的是另一个。

## 超步内部没有新检查点 {#s-interrupt-and-resume-in-the-code-no-new-checkpoint-inside-a-superstep}

线程上的三次调用生成了四个检查点，而不是六个：

```listing
title: 三次调用之后的检查点历史
source: capture/lab/internals/04-interrupt/trace.txt
lang: text
---
## checkpoint history (newest first)
  step=2 source=loop next=() id=..bc1c0b7b902f
  step=1 source=loop next=('after',) id=..9a14716dbcea
  step=0 source=loop next=('ask', 'approve', 'other') id=..1ca1bd022200
  step=-1 source=input next=('__start__',) id=..88027e62558c
```

运行 2b 结束时 `ask` 仍在等待，所以步骤 1 的超步没有完成。答案和新问题作为写入保存在检查点 `1ca1bd022200` 上，挨着 `other` 的写入。只有超步的每个任务都完成之后，才会出现一个检查点。所以列出检查点的时间旅行工具，在对同一节点的两个答案之间不会显示任何点。

## 该怎么做 {#s-interrupt-and-resume-in-the-code-what-to-do}

从 `get_state(config).tasks` 读取待定的中断，并用 `Command(resume={id: value})` 回答。当每个键都是 `xxh3` 十六进制 id 时，循环把字典当作映射来读，不论待定中断有多少个 {{code libs/langgraph/langgraph/pregel/_loop.py:1045-1064}}。我们没有对只有一个中断的情况运行映射形式。始终使用它，这样第二个带问题的分支就不会弄坏你的服务器。

把每个写问题的模型调用移进它自己的节点，放在调用 `interrupt()` 的节点之前。那个节点完成后，它的写入被保存，恢复时不会再运行它，`other` 就是例子。这样问题在每次重放里保持不变，你也只为它付一次钱。

让一个节点的 `interrupt()` 调用在每次运行里保持同样的顺序，不要因为一个可能变化的条件而跳过其中一个。答案进入的是下标，不是问题。

中断 id 是问题的稳定名字。它只取决于任务命名空间，而[第 2.3 节](#s-the-checkpoint-write-path-and-durability)在一次崩溃和一个新进程前后测量过这个命名空间。把 id 用作你的界面和数据库里该问题的键。

```takeaways
- 即使只有一个问题，也用 Command(resume={interrupt_id: value}) 恢复。
- 把写问题的模型调用放进一个节点，放在会中断的节点之前。
- 让 interrupt() 调用保持固定顺序，因为答案是按下标匹配的。
- 在你自己的数据库里，把中断 id 存为每个问题的键。
```

来源：capture/lab/internals/04-interrupt/trace.txt, capture/lab/internals/04-interrupt/run.py, capture/lab/internals/04-interrupt/run1.trace.jsonl, capture/lab/internals/04-interrupt/run2b.trace.jsonl, capture/lab/internals/common/real.py; libs/langgraph/langgraph/types.py, libs/langgraph/langgraph/pregel/_loop.py, libs/langgraph/langgraph/pregel/_algo.py, and libs/langgraph/langgraph/pregel/_runner.py at langgraph 1.2.22; libs/checkpoint/langgraph/checkpoint/base/__init__.py at langgraph-checkpoint 4.3.2.
