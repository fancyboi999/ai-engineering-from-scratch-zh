# 时间旅行：重放、update_state 与分叉

> 从过去的检查点重放会把之后的每个节点再运行一遍，`update_state` 则在旧分支旁边添加新分支，所以两者既不读取已保存的结果，也不会抹掉历史。

一个 agent 刷了一次卡，你想看看换一条指令它会怎么做。你从历史里选了一个更早的检查点，从那里开始运行。卡被刷了第二次，因为重放不读取旧的工具结果，它会再次调用工具。

读完本节，你能列出线程（thread）的历史，从任意检查点重放，并用 `update_state` 分叉。你还能说出哪些节点会再次运行。

## 线程的历史 {#s-time-travel-replay-update-state-and-forks-the-history-of-a-thread}

**状态历史：** 一个线程的检查点列表，最新的在前，来自 `get_state_history(config)`。

录制工具包里的 agent 只有一个工具 `charge`，它会记录每次刷卡的金额。一轮 `Charge 10.` 保存了五个检查点。每个检查点都写明它的父检查点，最新的那个没有下一个节点：

```listing
title: 一轮对话的历史
source: capture/out/30-state-history-forks.txt
lang: json
note: 只保留前两个检查点的 step、source、下一个节点和 id。消息已截掉。
---
  "step": 3,
  "source": "loop",
  "next": [],
  "checkpoint_id": "<uuid-1>",
  "parent_checkpoint_id": "<uuid-2>",
…
  "step": 2,
  "source": "loop",
  "next": [
    "model"
  ],
  "checkpoint_id": "<uuid-2>",
  "parent_checkpoint_id": "<uuid-3>",
```

每个条目的 `config` 包含 `thread_id`、`checkpoint_ns` 和 `checkpoint_id`。下面每个调用都用这个 config 作为检查点的地址。

## 重放 {#s-time-travel-replay-update-state-and-forks-replay}

**重放：** 一次 `invoke(None, config)`，其中 `config` 指向过去的某个检查点。运行从该检查点开始，并把它的 `next` 里的节点再运行一遍。

录制工具包从 `next` 为 `tools` 的检查点重放。工具第二次运行，线程的检查点从 5 个增加到 8 个：

```listing
title: 从 tools 之前的检查点重放
source: capture/out/30-state-history-forks.txt
lang: text
---
charge calls so far (the tool ran again on replay):
[
  10,
  10
]

checkpoints on the thread now: 8
```

模型收到的消息与第一次运行相同。在 temperature 0 下它给出了同样的回答 `The card has been successfully charged with 10 units.`，而这张卡被刷了两次。开启采样的模型在重放时可能给出不同的回答。时间旅行页面说的也一样：重放会再次运行这些节点，包括其中的模型调用、API 请求和中断 {{docs oss/python/langgraph/use-time-travel}}。

## update_state 产生分叉 {#s-time-travel-replay-update-state-and-forks-update-state-makes-a-fork}

**分叉：** 一个新的检查点，它的父检查点是过去的某个检查点。从它开始的运行会形成一条与旧分支并列的新分支，旧检查点都保留。

`update_state(config, values)` 把 `values` 写入一个新检查点，位置在 `config` 所指检查点之后。更新要经过 reducer，就像某个节点返回了它一样。录制工具包往第一个 `model` 检查点上添加了一条人类消息：

```listing
title: 多一条人类消息的分叉
source: capture/s_persist.py
lang: python
---
    first_model = next(s for s in reversed(states) if s.next == ("model",))
    forked = agent.update_state(first_model.config, {"messages": [{"role": "user", "content": "Actually, charge 99."}]})
```

新检查点的 source 是 `update`，step 是 1，它的父检查点是 step 0 的检查点。它的 `next` 仍然是 `model`。从它开始运行，刷了 99，第一条分支的刷卡记录仍留在列表里：

```listing
title: 分叉以及从它开始的运行
source: capture/out/30-state-history-forks.txt
lang: json
note: 分叉只保留 step、source、next 和父检查点，然后是运行之后的刷卡记录。
---
  "step": 1,
  "source": "update",
  "next": [
    "model"
  ],
  "checkpoint_id": "<uuid-6>",
  "parent_checkpoint_id": "<uuid-4>",
…
charge calls:
[
  10,
  10,
  99
]
```

时间旅行页面警告，`update_state` 不会把线程回滚 {{docs oss/python/langgraph/use-time-travel}}。这个线程现在有三条分支：第一次运行、重放和分叉。

## 用 as_node 以节点身份写入 {#s-time-travel-replay-update-state-and-forks-write-as-a-node-with-as-node}

`update_state` 接受 `as_node`，也就是这次更新被算作哪个节点写的。LangGraph 随后会像那个节点刚运行过一样选出下一个节点。录制工具包里的 agent 用 `interrupt_before=["tools"]` 在 `tools` 之前停下。它以节点 `tools` 的身份手工写入工具结果，运行接着进入 `model`：

```listing
title: 手工写入的工具结果
source: capture/out/30-state-history-forks.txt
lang: json
---
[
  "human: Charge 5.",
  "ai: ",
  "tool: charged 5 by hand",
  "ai: It seems there was a misunderstanding. I cannot perform actions like charging a card manually. If you'd like, I can assist you with other tasks or help guide you through the correct process. Let me know how I can assist!"
]

charge calls (unchanged):
[
  10,
  10,
  99
]
```

工具没有运行。随后模型回答说它不能手工刷卡，也就是误读了手工写入的结果。写这类结果时，要用工具本来会用的措辞，例如 `charged 5`。当有人在 agent 之外完成了工具的工作时，才用这个办法。`ToolMessage` 必须带有那个等待中调用的 `tool_call_id`。

## 地址必须完整 {#s-time-travel-replay-update-state-and-forks-the-address-must-be-complete}

`update_state` 需要检查点的完整地址。实验记录里有一次调用只给了含 `thread_id` 和 `checkpoint_id` 的 config，结果抛出 `KeyError: 'checkpoint_ns'`。要传入 `get_state_history` 里某个条目的 `config`，或者对没有子图的图补上 `"checkpoint_ns": ""`。

## 实验记录的计数 {#s-time-travel-replay-update-state-and-forks-what-the-lab-counted}

**我们测得** Mac 上的重放和分叉，每个用例运行一次，使用 `InMemorySaver`。一个图依次运行三个节点 `a`、`b` 和 `c`，每个节点给 `x` 加一。第一次运行保存了 5 个检查点。从 `b` 之前的检查点重放，`b` 运行一次，`c` 运行一次，`a` 运行零次，并增加了 3 个检查点。这三个里有一个的 source 是 `fork`。

在同一个检查点上调用 `update_state`，把 `x` 设为 100。它没有运行任何节点，只增加了一个 source 为 `update` 的检查点，并保留了所有旧检查点。从它开始运行，`b` 和 `c` 各运行一次，最终 `x` 为 102。此时线程在三条分支里共有 11 个检查点。[图](#fig-6-6)画出了它们。

```figure
id: fig-6-6
kind: tree
title: 一个线程的三条分支
claim: 从 b 之前的检查点重放和调用 update_state，各自在第一次运行旁边开出一条分支，而且所有旧检查点都保留。
caption: 请从顶部的输入检查点开始读。每个方框是一个检查点，带有 step 和 x 的值。琥珀色方框是重放的分叉，紫色方框是更新。来源：capture/lab/summary/replay-fork-mac.json。
```

在 x86 服务器客户机上，用 Qwen3 4B 和一个工具的 agent 运行了 3 次，每次的计数都相同。从 step 0（`next` 是 `model`）重放，发起 2 次模型调用和 1 次工具调用。从 step 1（`next` 是 `tools`）重放，发起 1 次模型调用和 1 次工具调用。所以重放的成本等于原始运行从该点往后的成本。重放之前，先让检查点之后的每个节点都能安全地运行两次。

文档说，你不能时间旅行到默认子图的节点之间的某个点 {{docs oss/python/langgraph/use-time-travel}}。实验记录没有在子图内部运行时间旅行。它留到下一版，与[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)里的其他未决项放在一起。

```takeaways
- 按从新到旧的顺序读 get_state_history，并用条目的 config 作为它的地址。
- 预期重放会把之后的每个节点再运行一遍，包括其中的模型调用和工具调用。
- 用 update_state 分叉线程，并预期旧检查点会保留。
- 传入 as_node="tools"，记录由人产生的工具结果。
- 把历史里完整的 config（含 checkpoint_ns）传给 update_state。
```

来源：capture/s_persist.py, capture/out/30-state-history-forks.txt; capture/lab/summary/replay-fork-mac.json, capture/lab/T17-claims-mac/02-replay-and-fork.jsonl, capture/lab/summary/replay-fork-x86.json, capture/lab/T17-claims-x86/01-claims.jsonl; libs/langgraph/langgraph/pregel/main.py and libs/checkpoint/langgraph/checkpoint/memory/__init__.py at langgraph 1.2.22; docs.langchain.com at docs commit 04d4d4a (oss/python/langgraph/use-time-travel).
