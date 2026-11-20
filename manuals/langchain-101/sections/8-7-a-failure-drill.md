# 故障演练

> 一个脚本用本地 Ollama 上的 Qwen3 4B 制造七种故障，并为每种打印症状、状态、修法和耗时，全程约 100 秒。

你的 agent 在生产环境里出了故障，症状却是日志解释不了的。一次模型调用花了六秒，什么都没抛。一位客户被扣了两次款。一封没人批准的邮件发了出去。这些故障在本手册里各有一节，而你事先见过，修起来就容易些。

读完本节，你能在自己的机器上运行七种有文档记录的故障。你还能读懂每种故障的症状，并用上它的修法。

## 演练做什么 {#s-a-failure-drill-what-the-drill-does}

**故障演练：** 一个脚本，在你丢得起的机器上，故意制造每一种已知故障，并打印你会看到的现象。

Ollama 上的 Qwen3 4B 扮演模型。Ollama 前面的一个中继，在重试用例里丢掉每一个连接。没有请求离开这台机器。有两个用例会启动子进程，一个用来杀掉，一个用来在退出时观察。

```bash
cd capture/demos/failure-drill
./run.sh
```

每个用例，演练都打印五行：症状、状态、修法、修复后的结果和耗时。这七个用例来自以下章节：

| 用例 | 故障 | 章节 |
|---|---|---|
| 1 | 重试层叠加在一次模型调用上 | [4.7](#s-retries-backup-models-rate-limits-and-caching) |
| 2 | 副作用与它的检查点之间发生崩溃 | [5.3](#s-durability-modes-and-a-crash-between-two-steps) |
| 3 | 一个跳转到 tools 的中间件跳过了审批 | [6.5](#s-human-in-the-loop-batched-and-per-call) |
| 4 | 一次运行结束时没有结构化响应 | [4.2](#s-structured-output-autostrategy-providerstrategy-toolstrategy) |
| 5 | 追踪端点宕机 | [7.6](#s-langsmith-tracing) |
| 6 | 两个同名的工具 | [3.4](#s-tools-toolruntime-and-tool-errors) |
| 7 | 模型无休止地调用一个工具 | [6.8](#s-error-handlers-node-timeouts-and-the-recursion-limit) |

每个用例都是一个短函数。下面是用例 3 的中间件。它在任何带工具调用的模型消息之后返回 `jump_to="tools"`：

```listing
title: 跳过审核的中间件
source: capture/demos/failure-drill/drill.py
lang: python
---
class JumpToTools(AgentMiddleware):
    @hook_config(can_jump_to=["tools"])
    def after_model(self, state, runtime):
        if getattr(state["messages"][-1], "tool_calls", None):
            return {"jump_to": "tools"}
        return None
```

用例 2 在子进程里，基于 `SqliteSaver` 运行这个工具。第一个进程写入扣款，同步文件，然后杀掉自己。第二个进程用 `invoke(None)` 恢复线程。开启 `keyed` 时，工具先检查自己的 `tool_call_id`：

```listing
title: 用例 2 的扣款工具
source: capture/demos/failure-drill/drill.py
lang: python
---
    def charge_card(amount: int, runtime: ToolRuntime) -> str:
        """Charge the card of the customer."""
        key = runtime.tool_call_id
        lines = Path(sink).read_text().splitlines() if Path(sink).exists() else []
        if keyed and any(line.startswith(f"{key}\t") for line in lines):
            return f"already charged under key {key}"
        with open(sink, "a") as handle:
            handle.write(f"{key}\t{amount}\t{phase}\n")
            handle.flush()
            os.fsync(handle.fileno())
        if phase == "start":
            os.kill(os.getpid(), signal.SIGKILL)
        return f"charged {amount}"
```

## 记录下来的运行 {#s-a-failure-drill-the-recorded-run}

**我们测得**：在 x86 服务器客户机上跑了三次，每个用例 n=3。每次运行用了 101 到 103 秒，大部分花在 CPU 上的模型调用。追踪用例耗时最长，约 27 秒，因为它要等退出。

演练打印的是本手册旧版结构里的章节号。把它输出里的 3.5、4.3、5.5、3.2、6.4、2.4 和 5.8 节，分别读作 4.7、5.3、6.5、4.2、7.6、3.4 和 6.8 节。

前两个用例是无声的。什么都没抛，损害体现在一个计数上：

```listing
title: 重试层，以及副作用之后的崩溃
source: capture/lab/failure-drill-x86/drill-run1.log
lang: text
note: 三次运行中的第一次。
---
== 1 retry layers stack on one model call (section 3.5)
  symptom   one model call sent 9 requests to a relay in front of Ollama that drops every connection, in 6.8 s
  state     the run ended without an exception, last AIMessage: Model call failed after 3 attempts with OpenAIConnectionError: Connection error.
  fix       ChatOpenAI(max_retries=0), so ModelRetryMiddleware is the only retry layer
  after     3 requests in 2.3 s
  time      9.59 s

== 2 a crash between a side effect and its checkpoint (section 4.3)
  symptom   the first process exited with -9 inside charge_card, the resume ran charge_card again: 4 charges
  state     after the resume: next [], 5 messages, charges ['start', 'start', 'resume', 'resume'], last 'Charged'
  fix       check runtime.tool_call_id against the charges before the charge, with durability sync
  after     exit -9, then the resume: 2 charge, next [], last 'Charged'
  time      14.32 s
```

在用例 1 里，`ChatOpenAI` 在 `ModelRetryMiddleware` 的 3 次尝试里，每次又做了 3 次尝试。运行随后以错误作为一条 `AIMessage` 的文本结束，所以只读最后一条消息的调用方会以为得到了一个答案。在用例 2 里，退出码 `-9` 是 SIGKILL。模型在一次回复里要求了两次扣款，而这个键拦不住第二个调用。扣款之前先查订单。

没有这个键时，三次运行分别留下 4、4 和 3 笔扣款。有这个键时，每次运行都留下 2 笔：每个调用 id 一笔。保存下来的 AI 消息保留了它的调用 id，所以恢复时这个键匹配上了每个调用。

接下来的两个用例，会在没有错误的情况下改变一次运行做的事：

```listing
title: 被跳过的审批，以及缺失的结构化响应
source: capture/lab/failure-drill-x86/drill-run1.log
lang: text
note: 三次运行中的第一次。三次 None 运行的最后几条消息在标记处截断。
---
== 3 an approval skipped by a middleware that jumps to tools (section 5.5)
  symptom   send_email ran 1 time before any decision, with 0 interrupts, to ['all-staff@example.org']
  state     batched mode, middleware=[HumanInTheLoopMiddleware, JumpToTools], next []
  fix       interrupt_mode="per_call", which pauses inside the tool call
  after     send_email ran 0 times, 1 interrupt waits, next ['tools']
  time      7.06 s

== 4 a run that ends with no structured response (section 3.2)
  symptom   3 of 5 prompts ended with no exception and structured_response None: ['Hello! How are you today?', 'Tell me a one-line joke.', 'What is the total of an empty order?']
  state     bound tools ['add', 'Answer']; last messages of the None runs: …
  fix       check structured_response for None after each run, and treat None as a failure
  after     the check raised on 3 of 5 runs
  time      15.56 s
```

在用例 4 里，两个算术提示词给出了结构化响应。另外三个以纯文本结束，没有异常，3 次运行都是这样。对空订单，模型把 `Answer(total=0)` 写成了文本，而没有调用 `Answer` 工具。

最后三个用例是退出缓慢、丢失工具和无休止的循环：

```listing
title: 宕机的追踪端点、重复的工具名，以及递归上限
source: capture/lab/failure-drill-x86/drill-run1.log
lang: text
note: 三次运行中的第一次。GraphRecursionError 消息的其余部分在标记处截断。
---
== 5 a tracing endpoint that is down (section 6.4)
  symptom   the agent run took 4436.9 ms, and the process exited 16.9 s after it (22.0 s in all)
  state     LANGSMITH_TRACING=true, nothing listens on the endpoint port, 3 lines of upload errors on stderr
  fix       probe GET /info with a 1 s timeout at start, and run inside tracing_context(enabled=False) when it fails
  after     tracing False, exit 0.3 s after the run (5.0 s in all), 0 lines of upload errors
  time      26.97 s

== 6 two tools with the same name (section 2.4)
  symptom   create_agent raised nothing, the model saw 1 tool named ['lookup']
  state     the call to lookup ran: ['from the refunds table']; final answer "I'm sorry, but I couldn't find any information about order 7 in the refunds tabl"
  fix       check that tool names are unique before create_agent
  after     the check found duplicate names ['lookup']
  time      5.92 s

== 7 a model that calls a tool forever (section 5.8)
  symptom   GraphRecursionError: Recursion limit of 10 reached without hitting a stop condition. …
  state     the model was called 5 times before the limit
  fix       ModelCallLimitMiddleware(run_limit=3, exit_behavior="end"), first with the same recursion_limit of 10
  after     recursion_limit 10: 3 model calls, GraphRecursionError: Recursion limit of 10 reached without hi …
  after     recursion_limit 25: 3 model calls, no exception, last message 'Model call limits exceeded: run limit (3/3)'
  time      23.61 s
```

用例 6 是前面各节没有展示的一种故障。`create_agent` 的工具节点把工具放在一个以名称为键的字典里，所以第二个 `lookup` 替换了第一个 {{code libs/prebuilt/langgraph/prebuilt/tool_node.py}}。模型只看到一个工具，agent 什么都没抛，每次调用都进了退款函数。所以答案说它在退款表里找不到订单 7 的任何信息。同一个中间件的两个实例会抛 `AssertionError`，见[第 4.5 节](#s-middleware-hooks-and-their-order)。两个同名工具却什么都不抛。

用例 7 展示了一个需要再做一处改动的修法。`ModelCallLimitMiddleware` 给 agent 的每个循环加了自己的节点，所以三次模型调用需要超过 10 步。`recursion_limit` 为 10 时，运行仍然抛出。设为 25 时，它在第三次调用之后自己结束了。[图](#fig-8-7)把每个症状和修复后的结果并排放在一起。

```figure
id: fig-8-7
kind: comparison
title: 演练里七种故障，每种修复前后
claim: 七种故障里有六种什么都没抛，右栏里的每个修法，都来自记录这种故障的那一节。
caption: 每行从左边的症状读到右边修复后的结果。玫红色格子是故障，青绿色格子是用了修法之后的结果。来源：capture/lab/summary/failure-drill-x86.json。
```

## 演练对前面各节的补充 {#s-a-failure-drill-what-the-drill-adds-to-the-earlier-sections}

有三个用例，以更小的规模重复了前面某部分测得的结果。比较计数，不要比较秒数，因为这些运行的规模和机器都不同。

| 用例 | 前面的结果 | 演练 |
|---|---|---|
| 重试层 | 每次调用都丢连接时，9 次模型请求，3 次运行，第 3.2 节 | 9 次请求，3 次运行 |
| 副作用之后崩溃 | 150 次图试验中有 80 次副作用运行了两次，第 5.3 节 | 没有键时 3 或 4 笔扣款，有键时 2 笔，3 次试验 |
| 追踪端点宕机 | 50 次运行之后，退出等了 9.9 秒，第 7.6 节 | 1 次运行之后，退出等了 16.9 到 17.3 秒 |

追踪的数字来自规模不同的进程，350 次被追踪的运行对 7 次，所以不要比较它们的秒数。两者显示的是同一个症状：开着追踪的进程，在退出时等一个不应答的端点。用例 5 里的探测是我们自己的修法。第 7.6 节给出另外两种：在你选定的位置调用 `wait_for_all_tracers()`，以及给任务设超时。

## 演练的局限 {#s-a-failure-drill-limits-of-the-drill}

- 保存下来的 AI 消息保留了它的调用 id，所以恢复时键能匹配上。真实的模型仍可能在一次回复里要求同一笔扣款两次。
- 重试用例通过一个丢连接的中继使用 `ChatOpenAI`。其他提供方的包有各自的客户端重试。`ChatOllama` 只尝试 1 次。
- 演练涵盖只需要 Ollama 的故障。第 7 和第 8 部分的 MCP、Postgres 和 Agent Server 故障需要它们的服务。[第 9 部分](#p-9)在一个服务里运行 Postgres 故障：退款之后的崩溃、一次 SIGTERM 和一个挂起的工具。
- 三次运行说明这些用例会重复出现，不说明它们在其他模型上出现的频率。

```takeaways
- 每次升级技术栈之后运行演练，并把它的日志与记录的日志对比。
- 数请求数、扣款数和工具运行数，因为七种故障里有六种什么都不抛。
- 在 create_agent 之前检查工具名有没有重复。
- 添加调用上限时同时提高 recursion_limit，因为这个中间件会增加步数。
- 启动时探测追踪端点，它不应答时就关闭追踪。
```

来源：capture/demos/failure-drill/drill.py, capture/demos/failure-drill/real.py, capture/demos/failure-drill/run.sh, capture/demos/failure-drill/README.md; capture/lab/failure-drill-x86/drill-run1.log, capture/lab/failure-drill-x86/drill-run1.jsonl, capture/lab/failure-drill-x86/drill-run2.jsonl, capture/lab/failure-drill-x86/drill-run3.jsonl, capture/lab/summary/failure-drill-x86.json, capture/lab/summary/retries-x86.json, capture/lab/summary/crash-resume-mac.json, capture/lab/summary/tracing-mac-real.json; libs/prebuilt/langgraph/prebuilt/tool_node.py at langgraph 1.2.22; libs/langchain_v1/langchain/agents/factory.py at langchain==1.5.0.
