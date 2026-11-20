# 系统提示词

> `create_agent` 在每次模型请求里把系统提示词放在最前面，却从不把它存进状态，所以新的提示词会作用于每个线程的下一次调用。

你用 checkpointer 保存了一段对话，改了代码里的系统提示词，然后恢复这个线程。模型遵循的是新提示词。你去已保存的状态里找旧提示词，它不在那里。

读完本节，你能说出系统提示词在一次运行中存放在哪里，并用运行时上下文来设置它。你还能找到锁定版本上的 prompt hub。

## 字符串或 SystemMessage {#s-the-system-prompt-a-string-or-a-systemmessage}

**系统提示词（system 提示词）：** 放在 agent 每次模型请求最前面的指令。

agent 页说，这个参数接受字符串或 `SystemMessage`，而在运行时构建的提示词需要中间件 {{docs oss/python/langchain/agents}}。`create_agent` 在构建图时，把字符串转成一次 `SystemMessage` {{code libs/langchain_v1/langchain/agents/factory.py}}。

## 不在状态里 {#s-the-system-prompt-not-in-the-state}

模型节点在每次调用时把系统消息加进请求，不会把它写进 `messages`。[第 1.3 节](#s-one-create-agent-run)展示过这两方面。两次调用里，模型都先收到 `system: You add numbers.`，而最终状态里有四条消息，没有 `SystemMessage`：

```listing
title: 模型在第二次调用时收到了什么
source: capture/out/06-agent-run.txt
lang: json
note: 只保留第 2 次调用的消息列表。
---
    "call": 2,
    "messages": [
      "system: You add numbers.",
      "human: What is 2 + 3?",
      "ai: calls add",
      "tool: 5"
    ],
```

[图](#fig-3-5)画出了模型节点构建的请求。由此得到三点。

```figure
id: fig-3-5
kind: flow
title: 模型节点如何构建每一次请求
claim: 每次模型请求都是 agent 的系统提示词加上状态里的消息，只有模型的回复会回到状态里。
caption: 每一行从左往右读，每次模型调用一行。紫色虚线是系统提示词，最先发送，从不保存。青色线是已保存的状态。梅紫色箭头是模型调用，青色箭头只追加它的回复。来自 capture/out/06-agent-run.txt 和 capture/out/18-mw-selection-emulation.txt。
```

- 检查点里没有提示词。由新代码恢复的线程，从下一次模型调用起就使用新提示词。
- 两个 agent 可以用两个提示词共用一个线程。各自把自己的提示词连同共享的消息一起发出。
- 提示词每次都会发送，所以每次调用都花费输入 token。长提示词会随步数成倍增加。

你放进输入消息里的 `SystemMessage` 则不同。它是一条消息，所以 `add_messages` 把它存进状态，之后每次调用都会再次发送它。

## 来自运行时上下文的提示词 {#s-the-system-prompt-a-prompt-from-runtime-context}

`dynamic_prompt` 装饰器把一个以模型请求为参数的函数变成中间件，为每次调用设置系统提示词。工具包从运行时上下文读取用户名：

```listing
title: 一个动态提示词
source: capture/s_middleware.py
lang: python
note: 从场景中截取。模型是 Ollama 上的 Qwen3 4B。
---
    @dynamic_prompt
    def by_user(request):
        return f"You are helping {request.runtime.context['user']}."
…
    out = create_agent(m, middleware=[by_user]).invoke(ask("hi, who are you helping?"), context={"user": "Ada"})
```

模型收到的提示词里，名字已经填好：

```listing
title: 带动态提示词的请求
source: capture/out/18-mw-selection-emulation.txt
lang: json
note: 文件的最后一段，只保留消息。
---
    "messages": [
      "system: You are helping Ada.",
      "human: hi, who are you helping?"
    ]
```

模型没有用到这个名字。它回答了 `Hi! I'm here to help you with any questions or tasks you might have.` 等等。提示词决定模型读到什么，不决定它说什么。

想要更多控制，可以用 `wrap_model_call` 中间件读取并替换每次请求的提示词。自定义中间件页说，要通过 `ModelRequest` 的 `system_message` 字段读取和修改提示词 {{docs oss/python/langchain/middleware/custom}}。第 4 部分讲中间件钩子及其顺序。

## prompt hub {#s-the-system-prompt-the-prompt-hub}

提交 `04d4d4a` 处的 LangChain 文档里，没有关于 Python agent 提示词模板的页面。prompt hub 已迁到 LangSmith。它的页面说，hub 以前是 `langchainhub` 包，现已弃用 {{docs langsmith/manage-prompts-programmatically}}。同一页仍然写着 `from langchain_classic import hub`，这正是[第 3.1 节](#s-install-and-the-package-map)列出的旧路径。请用 `langsmith` 客户端推送和拉取提示词，并把文本以字符串形式传给 `create_agent`。

```takeaways
- 把系统提示词传给 create_agent，不要作为输入里的一条消息。
- 恢复的线程会使用恢复它的那份代码里的提示词。
- 一次运行里，每次模型调用都要计一遍提示词的 token。
- 用 dynamic_prompt，根据运行时上下文构建提示词。
- 用 langsmith 客户端拉取共享提示词，不要用旧的 hub 模块。
```

来源：capture/out/06-agent-run.txt, capture/out/18-mw-selection-emulation.txt, capture/s_middleware.py; docs.langchain.com at docs commit 04d4d4a (oss/python/langchain/agents, oss/python/langchain/middleware/custom, langsmith/manage-prompts-programmatically); libs/langchain_v1/langchain/agents/factory.py at langchain==1.5.0.
