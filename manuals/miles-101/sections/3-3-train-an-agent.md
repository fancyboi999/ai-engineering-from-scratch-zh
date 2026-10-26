# 用工具调用和多轮对话训练 agent

> agent rollout 包含多轮对话和工具调用，Miles 会通过你按名称指定的 generate function 来运行它。

数学任务的 rollout 由一个 prompt 和一个答案组成。agent rollout 则是一段对话：模型生成内容、调用工具、读取结果，然后继续生成。每轮都会增加 token，trainer 必须严格按照 engine 生成的内容计算分数。

读完本节后，你可以选择一个 agent 配置作为起点，并了解如何设置才能让各轮内容保持一致。

我们没有在 GB10 上运行 agent 配置。本节内容来自 Miles 源码和示例。

## 从示例开始 {#s-train-an-agent-start-from-an-example}

Miles 提供了多种 agent 配置，其中两个位于 experimental 目录。选择最符合任务的一种，再修改工具和数据：

| 示例 | agent 的行为 |
|---|---|
| `retool_v2` | 编写 Python，在 sandbox 中运行，并在推理时使用输出 |
| `search-r1`，实验性 | 多轮调用搜索工具 |
| `swe-agent-harbor-docker` | 在本地 Docker sandbox 中处理代码和终端任务 |
| `tau-bench`，实验性 | 通过工具调用模拟服务客户 |

`retool_v2` 还支持用 `--fully-async --num-gpus-per-node 1` 在一张 GPU 上运行。这最适合作为单 GPU 实验的起点。

## 选择 generate function {#s-train-an-agent-choose-the-generate-function}

每个样本的 rollout 都由 generate function 生成。Miles 内置了三种：单轮、多轮和 agent 工具调用。你可以通过 `--custom-generate-function-path` 指定自己的函数，该参数接收 Python import path。

generate function 接收一个样本、采样设置和 router 地址。它会填充样本字段，包括 token、engine 计算的 log probability 和 loss mask。loss mask 标记模型生成的 token，只有这些 token 会计入 loss。工具输出属于上下文，不是模型输出。

## 保持每轮 token 完全一致 {#s-train-an-agent-keep-the-tokens-of-each-turn-exact}

agent loop 经常会在轮次之间把 token 转成文本，再转回 token。这个往返过程可能改变 token，导致 trainer 计算的序列并非 engine 实际生成的序列。

Miles 使用 session server，在每轮之间直接传递输入和输出 token，以避免这种问题。启用 `--use-session-server` 后，router 还会让同一段对话的所有轮次使用同一个 engine。因此每轮都能复用之前轮次的 cache。

这些配置不支持[第 4.2 节](#s-handle-long-responses)介绍的 partial rollout。session server、多轮 generate function 和 agent generate function 都会拒绝该设置。

## 需要观察什么 {#s-train-an-agent-what-to-watch}

- 比较模型生成的 token 占比和工具生成的 token 占比。如果大部分 token 来自工具，每一步能教给模型的内容就很少。
- 检查 trainer 和 engine 之间的差距，参见[第 5.2 节](#s-check-the-first-step)。如果差距远高于单轮任务的范围，可能是轮次之间的 token 不匹配。
- 观察步骤耗时。工具会增加实际耗时，其中 GPU 可能一直在等待。

```takeaways
- 从 Miles 中最符合任务的 agent 示例开始。
- 对工具输出应用 mask，让 loss 只统计模型生成的 token。
- 使用 session server，确保每轮保留原始 token 和 cache。
```

来源：Miles main 08752a12 中的示例 (retool_v2、search-r1、swe-agent-harbor-docker、tau-bench)、generate hub、session server 和 router 参数；Miles fully async 文档。
