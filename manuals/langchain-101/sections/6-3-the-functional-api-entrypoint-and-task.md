# 函数式 API：@entrypoint 与 @task

> `@entrypoint` 函数在每次恢复时都从头再运行，而在暂停之前已经完成的每个 `@task`，返回的是保存的结果，不再运行。

你有一个普通的 Python 函数，依次调用三个服务。你希望它能为一个人暂停，并熬过重启。把它改写成节点和边，会改动本来能用的代码。函数式 API 保留这个函数，只在它的调用周围加上检查点。

读完本节，你能用 `@task` 调用把一个函数变成 `@entrypoint`。你还能预测恢复时哪些调用会再次运行，并在两次运行之间保留一个值。

## entrypoint 与它的任务 {#s-the-functional-api-entrypoint-and-task-the-entrypoint-and-its-tasks}

**Entrypoint：** 用 `@entrypoint` 装饰的函数。LangGraph 把它当作只有一个节点的图来运行，传入 checkpointer 时，它在自己的线程上保存检查点。

**任务（task）：** 用 `@task` 装饰的函数。调用时立刻返回一个 future，任务完成时，LangGraph 保存它的结果。

录制工具包里的工作流在三个任务里把三个数字各翻倍，再相加，然后请一个人决定是否保留总数。这个问题是任务里的一个 `interrupt`：

```listing
title: 带三个任务和一个问题的 entrypoint
source: capture/s_graph.py
lang: python
---
    @task
    def double(x: int) -> int:
        runs.append(f"double({x})")
        return x * 2

    @task
    def ask_human(total: int) -> str:
        return interrupt({"total": total, "question": "Keep it?"})

    @entrypoint(checkpointer=InMemorySaver())
    def workflow(numbers: list[int]) -> dict:
        futures = [double(n) for n in numbers]
        total = sum(f.result() for f in futures)
        answer = ask_human(total).result()
        return {"total": total, "answer": answer}
```

对 `double` 的三次调用在第一个 `result()` 之前就启动了全部三个任务，每个 `result()` 等其中一个。

functional API 页面为这段代码定了三条规则 {{docs oss/python/langgraph/functional-api}}。entrypoint 接受一个位置参数。设置了 checkpointer 时，它的输入和输出，以及每个任务的输出，都必须能被 JSON 序列化。任务只能在 entrypoint、另一个任务或图的节点里调用。

## 第一次运行停在任务里 {#s-the-functional-api-entrypoint-and-task-the-first-run-stops-inside-a-task}

第一次运行把 1、2、3 翻倍，加出 12，并停在这个问题上。带 `version="v2"` 的 `invoke`，把值和中断分开返回：

```listing
title: 工作流的第一次运行
source: capture/out/35-functional-api.txt
lang: json
---
{
  "value": {},
  "interrupts": [
    {
      "value": {
        "total": 12,
        "question": "Keep it?"
      },
      "id": "<hex-1>",
      "response_schema": null
    }
  ]
}

task runs:
[
  "double(1)",
  "double(2)",
  "double(3)"
]
```

值是空的，因为函数没有返回。

## 恢复会还原已完成的任务 {#s-the-functional-api-entrypoint-and-task-the-resume-restores-finished-tasks}

在同一个线程上用 `Command(resume="yes")`，会让 `workflow` 从第一行开始再运行。对 `double` 的三次调用返回它们保存的结果，`double` 的函数体不运行。`ask_human` 从 `interrupt` 拿到 `"yes"`，函数返回：

```listing
title: 工作流的恢复
source: capture/out/35-functional-api.txt
lang: json
---
{
  "total": 12,
  "answer": "yes"
}

task runs:
[
  "double(1)",
  "double(2)",
  "double(3)"
]
```

任务运行列表里仍然是三项。文档也这么说：恢复从 entrypoint 的顶部开始，checkpointer 给回已完成任务的结果 {{docs oss/python/langgraph/functional-api}}。[图](#fig-6-3)画出了两次运行。

```figure
id: fig-6-3
kind: sequence
title: 一个 entrypoint 的两次运行
claim: 恢复让 workflow 从顶部运行，三个 double 任务不运行就返回保存的结果，只有 ask_human 再次运行。
caption: 顶部是第 1 次运行，下面是第 2 次运行。青色箭头是保存的结果，琥珀色的行是中断。右列是运行过的任务函数体的日志。来源：capture/out/35-functional-api.txt。
```

entrypoint 自己的代码不是任务，所以每次恢复都会再次运行，文档也是这么说的。录制工具包里的求和就是这样的代码，工具包只记录任务的运行。把每个副作用放进任务里，这样恢复就从保存的结果开始。在副作用之后、保存之前发生的崩溃，可能让任务再次运行。也要让副作用具备幂等性，见[第 5.3 节](#s-durability-modes-and-a-crash-between-two-steps)。

新运行的 `updates` 流，为每个已完成的任务产出一个块，以任务名为键。输入为 `[5]` 的运行产出了 `{"double": 10}`，然后是 `__interrupt__` 块。

## 保留在线程上的值 {#s-the-functional-api-entrypoint-and-task-a-value-that-stays-on-the-thread}

**entrypoint.final：** entrypoint 的一种返回值，把调用方拿到的内容，和线程保存的内容分开。保存的值会作为下一次运行的 `previous` 参数回来。

录制工具包的计数器把每个输入加到保存的总数上。它返回一句话，保存数字：

```listing
title: 保留总数的计数器
source: capture/s_graph.py
lang: python
---
    @entrypoint(checkpointer=InMemorySaver())
    def counter(n: int, *, previous: int | None = None) -> entrypoint.final[int, int]:
        total = (previous or 0) + n
        return entrypoint.final(value=f"added {n} to {previous}, saved {total}", save=total)
```

在同一个线程上用 3、4、5 调用三次，返回了这些值：

```listing
title: 计数器的三次调用
source: capture/out/35-functional-api.txt
lang: json
---
three calls:
[
  "added 3 to None, saved 3",
  "added 4 to 3, saved 7",
  "added 5 to 7, saved 12"
]
```

第一次调用拿到的 `previous` 是 `None`。之后每次调用，拿到的是它前一次调用保存的数字。工具包里的返回类型 `entrypoint.final[int, int]` 与字符串值不一致，运行仍然正常，因为 LangGraph 不检查它。

## 一个节点，而不是一张节点图 {#s-the-functional-api-entrypoint-and-task-one-node-not-a-graph-of-nodes}

工作流的图有三个节点：`__start__`、`workflow` 和 `__end__`。任务不是节点，所以图的绘制里看不到它们。functional API 页面说，新的 agent 和工作流用 graph API。它建议把函数式 API 用于已经存在于其他代码里、并且必须在 Agent Server 上运行的 agent {{docs oss/python/langgraph/functional-api}}。

[图](#fig-6-3b)根据图的 Mermaid 文本画出了这个图。

```figure
id: fig-6-3b
kind: structure
title: entrypoint 的图
claim: entrypoint 编译成 __start__ 和 __end__ 之间的一个节点，它的任务在这个节点内部运行，没有自己的节点。
caption: 从顶部开始读。workflow 节点运行整个函数，每个任务调用都在它内部运行。来源：capture/out/51-draw-functional.txt。
```

任务还可以带 `retry_policy`、`cache_policy` 和 `timeout` {{code libs/langgraph/langgraph/func/__init__.py}}。`timeout` 只对异步任务有效，对同步任务会抛出 `ValueError`。录制工具包还没有在任务上运行它们。它们的录制会在下一版出现，与[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)里的其他待办项一起。

```takeaways
- 把每个副作用放进任务里，因为 entrypoint 的代码在每次恢复时都会再次运行。
- 预期 entrypoint 的图只显示一个节点，看不到它的任务。
- 设置了 checkpointer 时，让 entrypoint 和任务的值都能被 JSON 序列化。
- 用 entrypoint.final 和 previous，在同一个线程的多次运行之间保留一个值。
- 新 agent 选 graph API，要包装现有代码时选函数式 API。
```

来源：capture/s_graph.py, capture/out/35-functional-api.txt, capture/out/51-draw-functional.txt; libs/langgraph/langgraph/func/__init__.py at langgraph 1.2.22; docs.langchain.com at docs commit 04d4d4a (oss/python/langgraph/functional-api).
