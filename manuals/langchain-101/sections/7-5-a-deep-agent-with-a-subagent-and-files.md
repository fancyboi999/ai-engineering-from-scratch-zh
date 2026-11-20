# 带子 agent 和文件的 deep agent

> 本地模型上的 deep agent 用七次模型调用完成计划、写作和委派审阅，对一个简短任务，它的第一次调用就发送了 3,651 个 prompt token。

你想要一个 agent 起草文档，请第二个 agent 审阅，再套用修改。Deep Agents 一次调用就给了你文件工具、`task` 工具和子 agent。你仍然需要知道每次调用花费多少，以及一个糟糕的结果里哪一部分来自模型。

读完本节，你能在本地模型上构建带一个子 agent 的 deep agent。你还能记录每次模型调用的 token，并逐次调用地读懂一次运行。

## 演示构建了什么 {#s-a-deep-agent-with-a-subagent-and-files-what-the-demo-builds}

代码是我们自己写的。它使用 `deepagents` 0.7.38 和 `ChatOllama` 上的 Qwen3 8B，temperature 为 0，seed 为 42，关闭推理。

演示保留了默认后端，它把文件保存在 agent 的状态里，所以你可以读到每一次调用。在[第 1.2 节](#s-do-you-need-langchain)的任务集上，这个配置在文件和检索任务上输给了 Qwen3 4B 和 8B 上的朴素循环。当工作在真实文件上时，请传入 `FilesystemBackend`，[第 7.4 节](#s-deep-agents-0-7)展示了这一点。

演示用到了这几节：

- [Deep Agents：harness 在什么时候有帮助](#s-deep-agents-0-7)：工具、虚拟文件系统，以及 0.7 去掉的 `TodoListMiddleware`。
- [子图与多 agent 模式](#s-subgraphs-and-multi-agent-patterns)：`task` 工具把子 agent 作为独立的 agent 运行。
- [成本：框架对比朴素 SDK 循环](#s-cost-the-framework-against-a-plain-sdk-loop)：每次调用的 token，读自 `usage_metadata`。

这个 agent 有一个子 agent `editor`。子 agent 是一个 dict，包含名称、主 agent 会读的描述，以及它自己的系统 prompt：

```listing
title: deep agent 和它的 editor
source: capture/demos/deep-agent/deep_agent.py
lang: python
---
    agent = create_deep_agent(
        model=model,
        system_prompt="You write clear technical documents. Keep the files you write in /notes/.",
        subagents=[{**EDITOR, "model": model}],
        middleware=[TodoListMiddleware()],
        checkpointer=InMemorySaver(),
    )
```

任务要求写出三项改动的发布说明，由 editor 审阅，套用修改，并给出最终文本。editor 的系统 prompt 要求找出超过 25 个词的句子和被动语态的句子。editor 只返回修改建议，自己不改任何东西。

一个回调记录每次模型调用。它从回复里读 `usage_metadata`，从调用的元数据里读 `lc_agent_name`。Deep Agents 把子 agent 的这个名字设为 `editor`，所以回调能分辨这两个 agent。

## 录制的运行 {#s-a-deep-agent-with-a-subagent-and-files-the-recorded-run}

这次运行用 62.0 秒发起了七次模型调用。第一次调用用了 22.6 秒，其中包括把模型加载进 Ollama 的时间：

```listing
title: 七次模型调用
source: capture/lab/deep-agent/run.log
lang: text
---
  call  1  main    in  3651  out  120   22.6 s  -> write_todos
  call  2  main    in  3872  out  124    6.7 s  -> write_file
  call  3  main    in  4016  out   58    3.2 s  -> task
  call  4  editor  in  1977  out   27    8.4 s  -> read_file
  call  5  editor  in  2113  out  143    7.4 s  -> answer
  call  6  main    in  4225  out  104    6.3 s  -> write_todos
  call  7  main    in  4446  out  111    7.4 s  -> answer
```

主 agent 写了待办列表，写了 `/notes/release-2.0.md`，并调用了 `task`。editor 读了文件并作了回答。随后主 agent 标记了它的待办，并用文件的文本作了回复。它从未调用 `edit_file`，因为 editor 没有返回修改建议：

```listing
title: editor 返回了什么
source: capture/lab/deep-agent/run.log
lang: text
note: 回复里文件的副本在标记处截断。
---
  result    task: The file `/notes/release-2.0.md` has been read successfully. Here is the content: ``` ## Version 2.0 Release Notes The sync command now resumes an interrupted upload from the last finished part, ensuring seamless continuity for large file transfers. … ``` No sentences in this file exceed 25 words, and there are no sentences in passive voice. Therefore, no fixes or improvements are needed.
```

这次运行写出的文件里有两个被动语态的句子：

```listing
title: 最终文件里的两个句子
source: capture/lab/deep-agent/run.log
lang: text
---
The config file has been moved from ~/.tool.toml to the XDG config folder. The old path still works for one release, ensuring backward compatibility during the transition.

The --verbose flag has been removed. Use --log-level debug in its place for detailed logging and debugging information.
```

## 这次运行说明了什么 {#s-a-deep-agent-with-a-subagent-and-files-what-the-run-shows}

**我们测得** Mac 上的一次运行，机器是 Apple M1 Max，10 核，64 GiB，使用 Ollama 0.31.1。主 agent 发起了 5 次模型调用，共 20,210 个 prompt token。editor 发起了 2 次调用，共 4,090 个 prompt token。两者一共发送了 24,300 个 prompt token，得到 687 个输出 token，产出一个 458 个字符的文件。[图](#fig-7-5)展示了每次调用。

```figure
id: fig-7-5
kind: chart
title: deep agent 每次模型调用的 prompt token
claim: 主 agent 的每次调用都发送了超过 3,600 个 prompt token，editor 的调用只发送大约一半，少了两个工具。
caption: 每个点是 Mac 上 Qwen3 8B 一次运行里的一次模型调用。蓝点是主 agent，靛蓝点是 editor。坐标轴上的标签是这次调用所请求的工具。来源：capture/lab/summary/demos-mac.json。
```

主 agent 的第一次调用，为一个约 100 词的任务发送了 3,651 个 token。其中大部分是 harness：Deep Agents 的系统 prompt 和 9 个工具的 schema。[第 7.4 节](#s-deep-agents-0-7)测得 harness 的额外成本是在 Qwen3 8B 上每次调用 2,075 到 2,251 个 token。之后每次调用还要在上面叠加这次运行的消息。

editor 有 7 个工具：文件工具，没有 `task` 和 `write_todos`。它的消息里有它自己的系统 prompt，以及来自主 agent 的任务描述。所以它的调用大约小一半。子 agent 是把冗长的支线任务挡在主 agent 上下文之外的一种办法。

审阅的失败是模型造成的。editor 漏掉了两个被动语态的句子，而主 agent 相信了审阅结果。LangChain 执行了模型要求的每一步：写文件、`task` 调用、读取，以及待办的更新。换一个更强的模型，或者用代码来检查被动语态，可能改变结果。前一个是选择模型，后一个是你自己写的工具。

```takeaways
- 对 deep agent 的每次模型调用，都记录 usage_metadata 和 lc_agent_name。
- 在这个锁定版本上，预期主 agent 的每次调用都超过 3,600 个 prompt token。
- 给子 agent 一个范围很窄的系统 prompt，因为它只能看到它那个任务的描述。
- 规则是机械的时候，用代码检查审阅子 agent 的工作。
- 在 0.7 里想要 write_todos，就传入 TodoListMiddleware。
- 8B 或更小的本地模型处理真实文件时，传入 FilesystemBackend。
```

来源：capture/demos/deep-agent/deep_agent.py, capture/demos/deep-agent/run.sh, capture/demos/deep-agent/README.md; capture/lab/deep-agent/run.log, capture/lab/deep-agent/run.jsonl, capture/lab/summary/demos-mac.json; libs/deepagents/deepagents/graph.py and libs/deepagents/deepagents/middleware/subagents.py at deepagents 0.7.38; libs/langchain_v1/langchain/agents/factory.py at langchain==1.5.0.
