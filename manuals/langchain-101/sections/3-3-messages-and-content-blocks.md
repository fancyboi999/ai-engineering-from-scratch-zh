# 消息与内容块

> 模型的每个输入和输出都是由四种消息类型组成的列表，而 `content_blocks` 把任何提供方的内容读成同样的带类型块。

你把 agent 从一个模型提供方换到另一个，读取模型推理文本的代码就坏了。一家把它放在 `thinking` 块里，另一家放在 `reasoning` 块里。两者都还是 `AIMessage` 的 `content`，只是形状不同。

读完本节，你能构造每一种消息类型，并从 `AIMessage` 读出工具调用。你还能通过标准块读取内容，这些块在各个提供方之间保持不变。

## 四种消息类型 {#s-messages-and-content-blocks-the-four-message-types}

**消息（message）：** 对话中的一个条目，有类型、`content` 和可选的 `id`。

`SystemMessage` 放指令，`HumanMessage` 放用户的一轮，`AIMessage` 放模型输出，`ToolMessage` 放工具结果。下面是一段对话的 dict 形式：

```listing
title: 一段对话，以消息对象表示
source: capture/out/02-messages.txt
lang: json
note: 文件的第一段。SystemMessage 已截去。
---
  {
    "type": "HumanMessage",
    "content": "What is 2 + 3?"
  },
  {
    "type": "AIMessage",
    "content": "",
    "tool_calls": [
      {
        "name": "add",
        "args": {
          "a": 2,
          "b": 3
        },
        "id": "call_1",
        "type": "tool_call"
      }
    ]
  },
  {
    "type": "ToolMessage",
    "content": "5",
    "name": "add",
    "tool_call_id": "call_1",
    "status": "success"
  },
  {
    "type": "AIMessage",
    "content": "The sum is 5.",
    "usage_metadata": {
      "input_tokens": 12,
      "output_tokens": 6,
      "total_tokens": 18
    }
  }
```

**工具调用（tool call）：** `AIMessage.tool_calls` 里的一个条目，有 `name`、解析好的 `args` 和一个 `id`。回答它的 `ToolMessage` 在 `tool_call_id` 里带着同一个 id。

请求工具的那条 `AIMessage` 的 `content` 为空。它的请求在 `tool_calls` 里，已经从提供方的 JSON 文本中解析出来。提供方给出 token 计数时，`usage_metadata` 保存它们。[图](#fig-3-3)显示每个字段的位置。

```figure
id: fig-3-3
kind: structure
title: AIMessage 与它的 ToolMessage 的字段
claim: 工具调用位于 AIMessage.tool_calls 而不是 content，回答它的 ToolMessage 在 tool_call_id 里重复同一个 id。
caption: 左边的卡片是请求 add 的 AIMessage，右边的卡片是回答它的 ToolMessage。连线连接两个都保存 call_1 的字段。来自 capture/out/02-messages.txt 和 capture/out/06-agent-run.txt。
```

你也可以传入普通的 dict 和元组。`create_agent` 和每个聊天模型都会把 `{"role": "user", "content": "hi"}` 转成 `HumanMessage`，把 `("assistant", "hello")` 转成 `AIMessage`：

```listing
title: convert_to_messages 之后的 dict 和元组
source: capture/out/02-messages.txt
lang: json
---
  {
    "type": "HumanMessage",
    "content": "hi"
  },
  {
    "type": "AIMessage",
    "content": "hello"
  },
  {
    "type": "SystemMessage",
    "content": "be brief"
  }
```

## 内容块 {#s-messages-and-content-blocks-content-blocks}

**内容块（content block）：** 消息中一个带类型的部分，是带有 `type` 的 dict，`type` 可以是 `text`、`reasoning`、`image`、`file` 或 `tool_call`。

文档说，每条消息都有 `content_blocks` 属性，读取时它把 `content` 解析成标准的带类型块 {{docs oss/python/langchain/messages}}。同一页还说，内容块是对 `content` 的补充，不是替代 {{docs oss/python/langchain/messages}}。所以 `content` 保持提供方的形状，`content_blocks` 给你标准形状。

工具包构造了一条 `AIMessage`，内容是 Anthropic 的形状：一个带签名的 `thinking` 块，后面是一个文本块。`content_blocks` 把它读成标准块：

```listing
title: 读成标准块的提供方内容
source: capture/out/02-messages.txt
lang: json
---
  {
    "type": "reasoning",
    "reasoning": "Add the numbers.",
    "extras": {
      "signature": "sig"
    }
  },
  {
    "type": "text",
    "text": "The sum is 5."
  }
]

.text -> 'The sum is 5.'
```

`thinking` 块变成了 `reasoning`，提供方那个没有标准名称的字段进入了 `extras`。`.text` 把各个文本块拼成一个字符串。在锁定版本上它是属性。调用 `.text()` 的代码仍然能用，但会发出警告。

在带工具调用且内容为空的 `AIMessage` 上，每个调用在 `content_blocks` 里对应一个 `tool_call` 块。因此，对 `content_blocks` 做一次循环，就能按顺序读出文本、推理和工具调用。

## 多模态输入 {#s-messages-and-content-blocks-multimodal-input}

`HumanMessage` 的 `content` 里可以放一个标准块列表。工具包发送了一个文本块、一个 URL 形式的图片和一个 base64 形式的 PDF：

```listing
title: 一条多模态的用户消息
source: capture/out/02-messages.txt
lang: json
note: 这条消息的 content 列表。
---
      {
        "type": "text",
        "text": "Describe this image."
      },
      {
        "type": "image",
        "url": "https://example.com/cat.png"
      },
      {
        "type": "file",
        "base64": "JVBERi0=",
        "mime_type": "application/pdf"
      }
```

每个提供方包会把这些块转换成自己的请求格式。模型档案说明一个模型接受哪些输入，例如 `image_inputs` 和 `pdf_inputs`。[第 3.2 节](#s-init-chat-model-and-model-profiles)展示了一份档案。

## 块（chunk） {#s-messages-and-content-blocks-chunks}

**块（chunk）：** 模型流式输出的消息片段，例如 `AIMessageChunk`。块之间用 `+` 相加，合成一条消息。

工具调用也是分段流式到达的。每个 `tool_call_chunk` 以文本形式保存参数的一段。块相加时各段拼接起来，解析好的调用出现在 `tool_calls` 里：

```listing
title: 相加之后的工具调用块
source: capture/out/02-messages.txt
lang: json
---
{
  "tool_call_chunks": [
    {
      "name": "add",
      "args": "{\"a\": 2, \"b\": 3}",
      "id": "call_1",
      "index": 0,
      "type": "tool_call_chunk"
    }
  ],
  "tool_calls": [
    {
      "name": "add",
      "args": {
        "a": 2,
        "b": 3
      },
      "id": "call_1",
      "type": "tool_call"
    }
  ]
}
```

`langchain-core` 1.7.0 改变了流在工具调用参数到达期间的上报方式。第 5 部分展示锁定版本的流事件。

## 裁剪 {#s-messages-and-content-blocks-trimming}

`trim_messages` 保留能放进 token 预算的最后几条消息。设 `max_tokens=3`，计数器每条消息计一个，它保留了系统消息和最后两条消息。设 `start_on="human"` 时，它只保留了系统消息，因为保留下来的任何一段都不是从用户消息开始的：

```listing
title: start_on 为 human 的 trim_messages
source: capture/out/02-messages.txt
lang: json
---
the same with start_on='human':
[
  {
    "type": "SystemMessage",
    "content": "You are terse."
  }
]
```

第一个结果以一条 `ToolMessage` 开头，它对应的 `AIMessage` 被裁掉了。多数提供方会拒绝没有调用的工具结果。所以请在轮次边界上裁剪，并测试你的裁剪返回了什么。

```takeaways
- 从 AIMessage.tool_calls 读取工具调用，不要从 content 读。
- 代码要同时适用于多个提供方时，通过 content_blocks 读取内容。
- 让每条 ToolMessage 和它所回答的那条 AIMessage 待在一起。
- 把 .text 当作属性使用，不要加括号。
- 发送图片或文件之前，先查看模型档案。
```

来源：capture/out/02-messages.txt, capture/out/06-agent-run.txt; docs.langchain.com at docs commit 04d4d4a (oss/python/langchain/messages, oss/python/releases/changelog); libs/core/langchain_core/messages at langchain==1.5.0.
