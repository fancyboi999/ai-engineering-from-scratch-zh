# langgraph dev 前面的 Agent Chat UI

> Agent Chat UI 只能回答批量审批，而用户输入一条消息就会关掉待处理的审批，于是模型在 2 次试验中都说工具已经运行了。

你用 `langgraph dev` 提供 agent 服务，想今天就在前面放一个聊天窗口。Agent Chat UI 是 LangGraph 文档指向的客户端。你填入服务器地址和图 id，就能聊天。然后一位审阅者没有点 Approve，而是输入了“你发出去了吗？”。模型回答发了，可实际没有任何邮件离开。

读完本节，你能把 Agent Chat UI 连到本地服务器。你能说出它发出哪些请求、请求哪些流模式。你还能说出它能回答哪些审批载荷，以及用户在审批待处理时直接打字会发生什么。

## UI 对你的图有什么要求 {#s-agent-chat-ui-in-front-of-langgraph-dev-what-the-ui-needs-from-your-graph}

**Agent Chat UI：** 一个开源的 Next.js 应用，通过 LangGraph JavaScript SDK 与 Agent Server 上的图聊天。文档介绍了托管版和本地克隆两种用法 {{docs oss/python/langgraph/ui}}。

这个仓库没有发布版本，也没有标签。我们运行的是 `main` 上的提交 `0d21f7f`，Next.js 16.4.3，`@langchain/langgraph-sdk` 1.12.8。服务器是 `langgraph-cli` 0.4.43 加 `langgraph-api` 0.18.0。

设置表单要三个值。**部署 URL** 是服务器的地址。**assistant 或图 id** 是 `langgraph.json` 里 `graphs` 下的一个键。**LangSmith API 密钥**可选，本地服务器不需要。UI 把这个密钥存在浏览器的 local storage 里 {{code src/lib/api-key.tsx:15-32}}。

图必须把对话放在 `messages` 键下，每个 `create_agent` 图都是这样。我们的图是用 Qwen3 4B 的 `create_agent`，带两个工具。`get_weather` 直接运行，`HumanInTheLoopMiddleware` 把 `send_email` 拦下来等审批。

```listing
title: langgraph dev 提供服务的两张图
source: capture/lab/chat-ui-mac/code/graphs.py
lang: python
---
GATE = {"send_email": {"allowed_decisions": ["approve", "edit", "reject"]}}

agent = create_agent(model(), tools=[get_weather, send_email], system_prompt=SYSTEM,
                     middleware=[HumanInTheLoopMiddleware(GATE)])

agent_percall = create_agent(model(), tools=[get_weather, send_email], system_prompt=SYSTEM,
                             middleware=[HumanInTheLoopMiddleware(GATE, interrupt_mode="per_call")])
```

## 一次审批的请求 {#s-agent-chat-ui-in-front-of-langgraph-dev-the-requests-of-one-approval}

**我们测得**：在 Mac 上，用一个录制代理夹在浏览器和服务器之间。浏览器是无头 Chromium，会话共有 15 次运行。[图](#fig-8-2) 根据这份记录画出一次审批的请求。

加载时，UI 调用 `GET /info` 和 `POST /threads/search`，后者以图 id 为元数据、上限 100。这次搜索填充线程历史列表。一个线程的第一条消息先用 `POST /threads` 创建线程，再启动运行。

```listing
title: 新消息的 POST runs/stream 请求体
source: capture/lab/chat-ui-mac/summary/extracts.json
lang: json
note: 截取到 input 之后的选项。
---
   "stream_mode": [
    "values",
    "messages-tuple",
    "custom"
   ],
   "stream_subgraphs": true,
   "stream_resumable": true,
   "assistant_id": "agent",
   "checkpoint": {
    "checkpoint_id": "1f1e0efc-1319-6874-8005-0625969a5466",
    "checkpoint_ns": ""
   },
   "on_disconnect": "continue"
```

UI 代码只请求 `values`。SDK 额外加上用于 token 的 `messages-tuple` 和用于 UI 事件的 `custom` {{code @langchain/langgraph-sdk/dist/react/stream.lgp.js:545-557}} {{code @langchain/langgraph-sdk/dist/react/stream.lgp.js:148}}。图 id 放在 `assistant_id` 里，由服务器解析。每次运行结束后，UI 都会调用上限为 10 的 `POST /history`。

审批以 `values` 事件的形式到达 UI，位于键 `__interrupt__` 之下。流里没有 `updates` 事件。[第 5.1 节](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode)解释了每种流模式。

```figure
id: fig-8-2
kind: sequence
title: Agent Chat UI 为一次审批发出的请求
claim: 一条消息就是一次带三种流模式的 POST runs/stream；审批在 values 事件里返回；Approve 是第二次带 command.resume 的 POST。
caption: 从上往下读。实线箭头是请求，虚线箭头是 SSE 事件，琥珀色箭头携带中断。时间来自 Mac 上的录制代理。来源：capture/lab/chat-ui-mac/summary/chatui-mac.json。
```

## 批准、编辑和拒绝 {#s-agent-chat-ui-in-front-of-langgraph-dev-approve-edit-and-reject}

批量载荷里有 `action_requests` 和 `review_configs`。UI 检查这两个列表是否都在，并画出一个表单，每个参数一个文本框 {{code src/lib/agent-inbox-interrupt.ts}}。批准、编辑、拒绝各成功了一次，每种 n=1。

决定以一个带 `decisions` 列表的普通恢复值回传。请求里还指明了要从哪个检查点恢复。

```listing
title: 编辑时 POST runs/stream 的请求体
source: capture/lab/chat-ui-mac/summary/extracts.json
lang: json
note: 截取到 command 和流选项。
---
   "command": {
    "resume": {
     "decisions": [
      {
       "type": "edit",
       "edited_action": {
        "name": "send_email",
        "args": {
         "to": "lee@example.com",
         "subject": "Report",
         "body": "The report is ready. Edited by the reviewer."
        }
       }
      }
     ]
    }
   },
   "stream_mode": [
    "values",
    "messages-tuple",
    "custom"
   ],
   "stream_resumable": false,
```

恢复请求把 `on_disconnect` 设为 `cancel`，而新消息设的是 `continue`。调用没有请求可恢复的流时，SDK 就选 `cancel` {{code @langchain/langgraph-sdk/dist/react/stream.lgp.js:357}}。所以审阅者在恢复期间关掉标签页，就会取消那次运行。

图的工具日志显示了实际运行了什么。批准的调用用模型给的参数运行。编辑的调用用审阅者写的正文运行。被拒绝的调用没有运行，模型回答“I won't send an invoice.”

编辑有一处显示缺口。工具调用卡片仍显示模型写的正文，而不是编辑后的。中间件把模型的调用保留在 AI 消息里，只在工具运行时才替换参数。只有工具结果里的一条中间件备注，说明了实际运行的参数。[第 6.5 节](#s-human-in-the-loop-batched-and-per-call)展示了这条备注。

## 逐调用审批没有按钮 {#s-agent-chat-ui-in-front-of-langgraph-dev-a-per-call-approval-has-no-buttons}

在 per-call 模式下，中断值是带 `response_schema` 的 `tool_approval` 对象。它没有 `action_requests`，所以 UI 的检查不通过。UI 画出一张名为“Human Interrupt”的只读卡片，里面有字段，却没有决定控件（n=1）。

```listing
title: UI 回答不了的 per-call 中断
source: capture/lab/chat-ui-mac/summary/extracts.json
lang: json
note: 截取到响应 schema 之前。
---
  "per_call, request 50": [
   {
    "value": {
     "type": "tool_approval",
     "tool_call_id": "1e1f026b-628e-4c7f-87d1-5a31a5bf9810",
     "name": "send_email",
     "args": {
      "to": "pat@example.com",
      "subject": "Hello",
      "body": "Hi Pat."
     },
```

UI 的恢复请求本来也回答不了它。per-call 模式要的是按中断 id 为键的单个决定，而 UI 发送的是 `decisions` 列表。[生产部分](#s-approvals-and-the-idempotency-key)的服务使用 per-call 模式和自己的路由，所以这个 UI 原样驱动不了它。

## 在待处理审批上打字 {#s-agent-chat-ui-in-front-of-langgraph-dev-typing-over-a-pending-approval}

审批在等待时，UI 允许用户打字。发送消息之前，它会查找工具调用没有工具结果的 AI 消息。对每一条，它补上一条工具消息，内容是“Successfully handled tool call.”，id 以 `do-not-render-` 开头 {{code src/lib/ensure-tool-responses.ts:6-34}}。聊天视图会隐藏所有带这个前缀的消息。

**我们测得**：每种模式各测一次。我们要求发一封邮件，让审批保持等待，然后输入“Did you send the email to Max?”

```listing
title: 输入消息之后的线程，批量模式
source: capture/lab/chat-ui-mac/summary/extracts.json
lang: json
note: 截取到最后三条消息。
---
   {
    "type": "tool",
    "id": "do-not-render-ffe0b0fe-312b-470a-9b50-a18c7b7ac6b5",
    "content": "Successfully handled tool call.",
    "tool_calls": null
   },
   {
    "type": "human",
    "id": "89f41e3f-5d09-4143-8ed2-b2430d9c4c03",
    "content": [
     {
      "type": "text",
      "text": "Did you send the email to Max?"
     }
    ],
    "tool_calls": null
   },
   {
    "type": "ai",
    "id": "lc_run--01a1df36-eb02-75cb-b5cb-1d9aa2fb8800",
    "content": "Yes, I sent the email to max@example.com.",
    "tool_calls": null
   }
```

两次试验中 `send_email` 都没有运行。线程是 `idle`，没有中断，所以审批消失了。两种模式下，模型都说它发了邮件。用户看到了这个回答，看不到占位结果的任何痕迹。

所以，UI 替用户做了审批的决定。要在工具里保证副作用安全，[生产部分](#s-approvals-and-the-idempotency-key)就是用一个键来做的。在你自己的 fork 里，`thread.interrupt` 有值期间要禁用输入框。

## 流式输出、工具调用与屏幕上的时间 {#s-agent-chat-ui-in-front-of-langgraph-dev-streaming-tool-calls-and-time-on-screen}

文本逐 token 流式输出。每个 token 是一个 `messages` 事件，UI 就地把回复写长。`ChatOllama` 把工具调用整个发出，放在带最终元数据的一个块上。所以工具调用卡片一下子完整出现，没有残缺的参数。

**我们测得**：用页面里的 DOM 观察器测量从代理到屏幕的延迟。浏览器和代理共用 Mac 的时钟。第一次可见变化出现在它的 SSE 事件到达代理之后 0.037 到 0.158 秒，中位数 0.094 秒，n=9。

对新线程里的一个普通问题，第一个 token 在 POST 之后 0.87 到 1.23 秒到达代理，n=3。它在 0.04 到 0.07 秒后出现在屏幕上。审批表单出现在工具调用卡片之后 0.145 秒和 0.204 秒，n=2。

第一次运行在发出工具调用之前，在同一个 Ollama 的另一个客户端后面排了队。别把它的时间当成 UI 时间。

## 线程、历史，以及离开这台机器的数据 {#s-agent-chat-ui-in-front-of-langgraph-dev-threads-history-and-what-leaves-the-machine}

历史面板按第一条人类消息列出每个线程。点击一个线程会发出一次上限为 10 的 `POST /history`。对一个四轮的线程，这次调用返回了 85,940 字节，整个线程都回来了。重新加载一个带待处理审批的线程，会用同一次调用重新画出审批表单（n=1）。

追踪是关闭的，也没有设 LangSmith 密钥。我们挂在 `httpx` 和 `requests` 上的钩子记录了服务器的 16 个请求，全是发往本地 Ollama 的 `POST /api/chat`。浏览器发了 97 个请求，全部发往 UI 和代理。我们设了 `NEXT_TELEMETRY_DISABLED=1`，所以没有测 Next.js 默认的遥测。开启追踪时服务器会发送什么，见[第 8.1 节](#s-agent-server-langgraph-dev-up-and-deploy)。

这个仓库还有一条透传路由，会给每个请求加上你的 LangSmith 密钥。它的 README 警告说，这条路由不检查调用方。原样部署的话，任何人都能读取你的线程，并在你的账户上启动运行。

```takeaways
- 要让 Agent Chat UI 能回答审批，就用批量模式的 HumanInTheLoopMiddleware。
- 预期 per-call 审批显示为没有决定控件的只读卡片。
- 让工具自身保证安全，因为输入消息会把审批当作成功关掉。
- 编辑之后要读工具结果，因为工具调用卡片保留的是模型的参数。
- 预期标签页关闭时恢复会被取消，因为 UI 发送 on_disconnect cancel。
- 部署透传路由之前，先在它前面放上你自己的认证。
```

来源：capture/lab/chat-ui-mac/summary/chatui-mac.json, capture/lab/chat-ui-mac/summary/extracts.json, capture/lab/chat-ui-mac/summary/timing-summary.json, capture/lab/chat-ui-mac/runs/requests.jsonl, capture/lab/chat-ui-mac/runs/sse/, capture/lab/chat-ui-mac/runs/graph-events.jsonl, capture/lab/chat-ui-mac/runs/server-netlog.jsonl, capture/lab/chat-ui-mac/runs/browser-network.txt, capture/lab/chat-ui-mac/runs/state-batched-after-new-message.json, capture/lab/chat-ui-mac/runs/state-percall-after-new-message.json, capture/lab/chat-ui-mac/code/graphs.py, capture/lab/chat-ui-mac/code/recproxy.py, capture/lab/chat-ui-mac/code/ui_observer.js, capture/lab/chat-ui-mac/VERSIONS.txt; src/lib/api-key.tsx, src/lib/agent-inbox-interrupt.ts, src/lib/ensure-tool-responses.ts, and README.md at agent-chat-ui commit 0d21f7ff4c45287797e876dc6d8b150b6f277b1e; dist/react/stream.lgp.js at @langchain/langgraph-sdk 1.12.8; oss/python/langgraph/ui in the LangChain docs, read on 2026-11-15.
