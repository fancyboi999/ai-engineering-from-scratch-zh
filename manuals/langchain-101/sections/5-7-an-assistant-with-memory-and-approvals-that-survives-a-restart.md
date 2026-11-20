# 一个带记忆和审批、能熬过重启的助手

> 要熬过重启的助手，需要持久的 checkpointer、store、逐个调用的审核、摘要触发条件和幂等键，而崩溃仍然会让审核人被问两次。

你的助手在发送邮件之前请求审批。审核人点了批准，服务器随后不久就重启了。邮件发出去了吗？助手会再问一次，还是再发一次？用户还希望助手下周在一场新对话里，仍然记得他们的经理。

读完本节，你能构建一个助手，让它的线程、记忆和待处理的审批在多个进程之间保留下来。你还能预测一次在已批准的副作用之后发生的崩溃会怎样，并让这个副作用只运行一次。

## 演示构建了什么 {#s-an-assistant-with-memory-and-approvals-that-survives-a-restart-what-the-demo-builds}

演示是一个 `create_agent` 助手，带三个工具：用于用户事实的 `remember` 和 `recall`，以及 `send_email`。运行的每一步是一个新的 Python 进程，所以每次恢复都是一次重启。模型是 Ollama 上的 Qwen3 4B。

演示用到了这些章节：

- [Checkpointer 与线程](#s-checkpointers-and-threads)：`SqliteSaver` 把每个线程保存在一个文件里。
- [持久性模式，以及两步之间的崩溃](#s-durability-modes-and-a-crash-between-two-steps)：崩溃，以及幂等键。
- [Store 与长期记忆](#s-stores-and-long-term-memory)：`SqliteStore`，用户 id 来自 `context`。
- [上下文工程与摘要](#s-context-engineering-and-summarization)：带触发条件的 `SummarizationMiddleware`。
- [人在回路，批量与逐个调用](#s-human-in-the-loop-batched-and-per-call)：对 `send_email` 做 `per_call` 审核。

## 代码 {#s-an-assistant-with-memory-and-approvals-that-survives-a-restart-the-code}

agent 接收两个持久化对象和两个中间件。摘要触发条件是 10 条消息，摘要保留最后 4 条：

```listing
title: 助手
source: capture/demos/assistant/assistant.py
lang: python
---
def build(saver, store):
    return create_agent(
        model(),
        tools=[remember, recall, send_email],
        system_prompt=SYSTEM_PROMPT,
        middleware=[
            SummarizationMiddleware(model(), trigger=("messages", 10), keep=("messages", 4)),
            HumanInTheLoopMiddleware(interrupt_on={"send_email": {"allowed_decisions": ["approve", "reject"]}}, interrupt_mode="per_call"),
        ],
        checkpointer=saver,
        store=store,
        context_schema=Context,
    )
```

工具从 `runtime.context` 读取用户 id，这个上下文由你的代码设置。模型无法指定别的用户，而 `context_schema` 把上下文类型定为 dataclass。

`send_email` 用它的 `tool_call_id` 作幂等键。这个键是 `sent` 表的主键，所以用同一个键再插入一次不会改变任何东西。工具的每次运行还会往 `attempts` 里写一行，这样运行结束后可以数出工具运行了多少次：

```listing
title: 带键的副作用
source: capture/demos/assistant/assistant.py
lang: python
note: 演示里的 print 行和崩溃开关被截掉了。
---
@tool
def send_email(to: str, subject: str, body: str, runtime: ToolRuntime[Context]) -> str:
    """Send an email. A person approves each email before it is sent."""
    key = runtime.tool_call_id
    conn = outbox()
    cur = conn.execute("INSERT OR IGNORE INTO sent VALUES (?, ?, ?, ?)", (key, to, subject, body))
    outcome = "sent" if cur.rowcount == 1 else "skipped, key already sent"
    conn.execute("INSERT INTO attempts (idempotency_key, pid, outcome) VALUES (?, ?, ?)", (key, os.getpid(), outcome))
    conn.commit()
    conn.close()
…
    return f"email {outcome}: to {to}, subject {subject!r}"
```

真实的邮件服务在它那一侧需要同样的检查。把键随请求一起发出，让服务拒绝带着它已见过的键的第二个请求。

## 录制的运行 {#s-an-assistant-with-memory-and-approvals-that-survives-a-restart-the-recorded-run}

`run.sh` 运行七步。第 1 步，用户给出两个事实，助手保存它们。第 2 步，用户要求发邮件。助手调用 `recall`，然后调用 `send_email`，运行停在审批处：

```listing
title: 第 2 步，审批在检查点里等待
source: capture/lab/assistant/run.log
lang: text
---
== 2-ask-to-send: process 88002, thread t1, durability default, say: Email my manager that the quarterly report is ready.
  call       recall({})
  result     - my manager's email address is lead@example.org - I prefer short replies
  call       send_email({"to": "lead@example.org", "subject": "Quarterly Report Ready", "body": "The quarterly report is ready for review."})
  interrupt  send_email({"to": "lead@example.org", "subject": "Quarterly Report Ready", "body": "The quarterly report is ready for review."}), tool_call_id 3c72b9ba-6b66-47cc-af7a-d11e3338822c
  state      next ['tools'], 9 messages, 18 checkpoints, 1 pending interrupts
  store      2 memories for reader-1
  outbox     0 sent, 0 attempts of send_email
  exit       0
```

第 3 步是一个新进程。它从文件里读出待处理的中断，批准它，并发出邮件。然后在 LangGraph 保存这一步之前杀掉自己。第 4 步在另一个新进程里恢复线程：

```listing
title: 第 3 步和第 4 步，发送之后的崩溃与一次恢复
source: capture/lab/assistant/run.log
lang: text
---
== 3-approve-then-crash: process 88024, thread t1, durability default, approve
  reviewer   approve send_email({"to": "lead@example.org", "subject": "Quarterly Report Ready", "body": "The quarterly report is ready for review."})
  tool       send_email ran in this process: sent (key 3c72b9ba-6b66-47cc-af7a-d11e3338822c)
  crash      SIGKILL after the email and before the checkpoint of the tools step
  exit       137

== 4-resume-after-crash: process 88029, thread t1, durability default, resume
  resume     invoke(None) on the thread, next was ['tools']
  interrupt  send_email({"to": "lead@example.org", "subject": "Quarterly Report Ready", "body": "The quarterly report is ready for review."}), tool_call_id 3c72b9ba-6b66-47cc-af7a-d11e3338822c
  state      next ['tools'], 9 messages, 18 checkpoints, 1 pending interrupts
  store      2 memories for reader-1
  outbox     1 sent, 1 attempts of send_email
  exit       0
```

审批没了。线程在第 3 步之前有 18 个检查点，之后仍是 18 个，同一个中断带着同一个 `tool_call_id` 再次等在那里。审核人看到的，是一个邮件已经在发件箱里的请求。第 5 步再次批准。工具第二次运行，找到它的键，跳过了发送：

```listing
title: 第 5 步，第二次审批
source: capture/lab/assistant/run.log
lang: text
note: 摘要行在标记处被截断。
---
== 5-approve-again: process 88037, thread t1, durability default, approve
  reviewer   approve send_email({"to": "lead@example.org", "subject": "Quarterly Report Ready", "body": "The quarterly report is ready for review."})
  tool       send_email ran in this process: skipped, key already sent (key 3c72b9ba-6b66-47cc-af7a-d11e3338822c)
  result     email skipped, key already sent: to lead@example.org, subject 'Quarterly Report Ready'
  answer     The email was already sent. Let me know if you'd like to take any further action.
  state      next [], 6 messages, 22 checkpoints, 0 pending interrupts
  summary    Here is a summary of the conversation to date: ## SESSION INTENT Send an email to the manager to notify them that the quarterly report is ready. ## SUMMARY - The user’s primary request is to email their manager about the readiness of the quarterly report. - The user has specified a preference for  …
  store      2 memories for reader-1
  outbox     1 sent, 2 attempts of send_email
  exit       0
```

同一步里还能看到摘要。线程已经超过 10 条消息，所以 `SummarizationMiddleware` 在模型调用之前，用一条摘要消息替换了旧消息。这一步之后，状态里有 6 条消息。第 6 步，助手从摘要里回答了经理的地址，没有调用工具。第 7 步，一个新线程 `t2` 调用了 `recall`，并在 store 里找到了两个事实。[图](#fig-5-7)显示了每个进程。

```figure
id: fig-5-7
kind: timeline
title: 助手的七个进程，以及每个进程留下了什么
claim: 崩溃丢掉了已批准的那一步，所以审核人批准了两次，send_email 运行了两次，而键让发件箱里只有一封邮件。
caption: 每个进程一行，从上到下读。计数是在进程结束时读到的。玫红色的一行是被杀掉、没有留下状态的进程。来源：capture/lab/summary/demos-mac.json。
```

运行结束时，三个文件里有这些行：

```listing
title: 运行之后的发件箱、检查点和 store
source: capture/lab/assistant/run.log
lang: text
---
== files after the run
sent|3c72b9ba-6b66-47cc-af7a-d11e3338822c|lead@example.org|Quarterly Report Ready
attempt|1|3c72b9ba-6b66-47cc-af7a-d11e3338822c|sent
attempt|2|3c72b9ba-6b66-47cc-af7a-d11e3338822c|skipped, key already sent
checkpoints|t1|27
checkpoints|t2|9
```

## 这次运行说明了什么 {#s-an-assistant-with-memory-and-approvals-that-survives-a-restart-what-the-run-shows}

**我们测得**七步的两次运行，环境是 Mac，Apple M1 Max，10 核，64 GiB。一次用默认持久性，一次用 `durability="sync"`。每次运行是一次试验，所以把计数当作一个例子，不要当作比率。

两次运行在每一步给出相同的计数。两次里，审批都没有熬过崩溃。第 3 步里检查点数量没有变，恢复后又抛出了同一个中断。两次里，`send_email` 都运行了两次，发件箱里都只有一封邮件。[第 5.3 节](#s-durability-modes-and-a-crash-between-two-steps)在没有键的情况下运行了它的 agent 矩阵，而这两次运行是带键的 agent 的第一次试验。

摘要那一步在默认运行里用了 10.2 秒，第 2 步是 1.4 秒。`SummarizationMiddleware` 用自己的一次模型调用来写摘要，这次运行没有单独给那次调用计时。待处理的审批、store 和摘要都放在两个 SQLite 文件里，所以每个新进程都找得到它们。

有两个结果来自模型。Qwen3 4B 遵守了先调用 `recall` 再写入的规则，并且在第 6 步根据摘要回答。跳过 `recall` 的模型只能猜地址，审核正是拦住这种情况的地方。

## 上生产要改什么 {#s-an-assistant-with-memory-and-approvals-that-survives-a-restart-what-to-change-for-production}

- 给审核人显示发件箱里这次调用的键对应的内容，这样崩溃之后的第二次请求就一目了然。
- 把键检查放在发送的服务里，而不只放在你的工具里。
- 把 store 和 checkpointer 放在你的其他进程能访问到的数据库里，例如 Postgres。
- 预期摘要的模型调用，会给触发条件满足的那一轮增加耗时。

```takeaways
- 用 tool_call_id 阻止同一个调用被重新运行。
- 再加一个业务动作的键，因为模型可能在两个调用里发出同一封邮件。
- 预期在已批准的副作用之后发生崩溃，会再次询问审核人。
- 每个接触 store 的工具，都从 context 读取用户 id。
- 给 SummarizationMiddleware 设置触发条件，并预期它触发时会有一轮变慢。
- 测试的每一步都在新进程里运行，这样每次恢复都是一次重启。
```

来源：capture/demos/assistant/assistant.py, capture/demos/assistant/run.sh, capture/demos/assistant/README.md; capture/lab/assistant/run.log, capture/lab/assistant/run-sync.log, capture/lab/assistant/run.jsonl, capture/lab/assistant/run-sync.jsonl, capture/lab/summary/demos-mac.json; libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py and summarization.py at langchain==1.5.0; libs/checkpoint-sqlite/langgraph/checkpoint/sqlite/__init__.py and libs/checkpoint-sqlite/langgraph/store/sqlite/base.py at langgraph 1.2.22.
