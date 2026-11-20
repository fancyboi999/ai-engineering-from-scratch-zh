# 持久性模式，以及两步之间的崩溃

> 没有任何持久性模式能保护刚刚返回的任务，而且模型可能要求两次扣款，所以要给每个副作用加键，并先查你自己的记录。

你的 agent 在工具里给一张银行卡扣款，进程随后不久就挂了。你重新启动它，并恢复线程。你当时运行的是 `durability="sync"`，因为文档把它列为最持久的模式。账本里这个订单仍然有两笔扣款。

读完本节，你能说清每种持久性模式保存什么、等待什么。你还能预测崩溃之后一次恢复会运行什么，并让一个副作用只运行一次。

## 三种模式 {#s-durability-modes-and-a-crash-between-two-steps-three-modes}

**持久性模式（durability mode）：** `invoke` 和 `stream` 的 `durability` 参数，决定一次运行的检查点何时写入：`sync`、`async` 或 `exit`。

checkpointers 页面把这些模式按从弱到强的持久性排序 {{docs oss/python/langgraph/checkpointers}}。代码只给了 `sync` 一处额外的等待，仅此一处。[第 2.3 节](#s-the-checkpoint-write-path-and-durability)追踪了一次运行中 saver 的每一次调用。无论哪种模式，循环都在后台用 `put_writes` 保存每个已完成任务的输出。`sync` 随后会在每一步结束时，先等检查点的 `put` 完成，再规划下一步。

| 模式 | 运行期间循环保存什么 | 它等待什么 | 在我们的运行里，崩溃后重复了什么 |
|---|---|---|---|
| `exit` | 运行结束、失败或停在中断之前什么都不保存 | 什么都不等 | 整次运行，从输入重新开始 |
| `async` | 每个检查点和每个任务的写入，在后台保存 | 什么都不等 | 刚刚返回的任务，以及最后一个已保存检查点之后的一步 |
| `sync` | 与 `async` 相同 | 下一步之前，等每个检查点的 `put` | 刚刚返回的任务 |

代码里的默认值是 `async` {{code libs/langgraph/langgraph/pregel/main.py}}。checkpointers 页面没有说默认是哪种模式，Agent Server 的页面说是 `async` {{docs langsmith/agent-server}}。本手册把这处缺口记为冲突 D119。

录制工具包在 `InMemorySaver` 上，对每种模式运行一个两节点的图，并数出检查点的数量：

```listing
title: 每种模式保存的检查点
source: capture/out/31-durability.txt
lang: text
---
durability=sync: result {'n': 2}, 4 checkpoints, steps [2, 1, 0, -1]

durability=async: result {'n': 2}, 4 checkpoints, steps [2, 1, 0, -1]

durability=exit: result {'n': 2}, 1 checkpoints, steps [2]
```

`exit` 只保存最后一个检查点，所以以 `exit` 模式运行的线程没有可回退的历史。

## 没有 checkpointer 的 sync {#s-durability-modes-and-a-crash-between-two-steps-sync-with-no-checkpointer}

没有 checkpointer 时，每种模式都会警告它没有效果。`async` 和 `exit` 随后照常运行。`sync` 则会抛出错误，`invoke` 和 `stream` 都是如此：

```listing
title: 没有 checkpointer 的 durability="sync"
source: capture/out/31-durability.txt
lang: text
---
durability=sync invoke: raised AttributeError: 'SyncPregelLoop' object has no attribute '_put_checkpoint_fut'
  warning: `durability` has no effect when no checkpointer is present.
```

循环在等一个它从未启动的检查点写入 {{code libs/langgraph/langgraph/pregel/main.py}}。这是 issue #9267，在锁定版本上仍然开着，本手册把它记为冲突 D6。只对有 checkpointer 的图传 `durability="sync"`。旧的 `checkpoint_during` 参数仍然可用，并会给出 `LangGraphDeprecatedSinceV10` 警告。

## 刚刚返回的任务 {#s-durability-modes-and-a-crash-between-two-steps-a-task-that-just-returned}

**副作用（side effect）：** 节点或工具在图状态之外做出的改变，例如一次扣款或一封邮件。检查点无法撤销它。

运行时部分运行了 `sync` 本该覆盖的情况。三个节点在 `SqliteSaver` 上并行运行。`a` 让 Qwen3 4B 说出一种水果，`b` 调用一个天气工具。`c` 等两者都返回后，再等一段设定的时间，然后退出进程。一个新进程用 `invoke(None)` 恢复线程。

**我们测得**这一点，环境是 x86 服务器客户机，每个单元格 50 次试验，共两轮运行。区间是 Wilson 95% 区间：

| 模式 | 崩溃前的等待 | `a` 重新运行，第 1 轮和第 2 轮 | 合并 |
|---|---|---|---|
| `sync` | 0 秒 | 50 次中 49 次，50 次中 48 次 | 100 次中 97 次，0.915 到 0.990 |
| `async` | 0 秒 | 50 次中 45 次，50 次中 50 次 | 100 次中 95 次，0.888 到 0.978 |
| `sync` 和 `async` | 0.2 秒 | 每轮 50 次中 0 次 | 200 次中 0 次 |
| `exit` | 0 秒和 0.2 秒 | 没有检查点，100 次中 100 次 | |

区间有重叠，所以在这里 `sync` 没有比 `async` 提供更多保护。`a` 在崩溃前几毫秒才返回，它的 `put_writes` 调用还没有完成。两种模式都只在一步结束时等待，而崩溃先到了。等待 0.2 秒之后，每次试验里写入都已保存。每次 `exit` 试验都没有留下检查点，`invoke(None)` 抛出了 `EmptyInputError`。

## agent 里五个点上的崩溃 {#s-durability-modes-and-a-crash-between-two-steps-a-crash-at-five-points-in-an-agent}

实验记录里的 agent 是 `create_agent`，用 Ollama 上的 Qwen3 4B，带一个工具 `charge(order_id, amount_usd)`。这个工具以自动提交的方式，向 PostgreSQL 账本表插入一行。驱动程序在一个新进程里启动 agent，并在五个点之一用 SIGKILL 杀掉它。另一个新进程随后用 `invoke(None)` 恢复线程；没有检查点时，则重新运行输入。[图](#fig-5-3b)在一步里画出这五个点。

```figure
id: fig-5-3b
kind: sequence
title: 工具那一步里的五个杀进程点
claim: 从第二个杀进程点起，扣款就已经在账本里了，而一步只有在 put 返回之后才持久。
caption: 从上到下读各行。每条玫红色的线是测试的一个杀进程点，也就是这一步中进程死掉的位置。来源：capture/lab/T02-crash-resume-x86/t02r_child.py。
```

1. `before_tool`：工具已启动，扣款还没有运行。
2. `inside_tool`：扣款已提交，工具还没有返回。
3. `before_put_writes`：工具已返回，它的写入还没有保存。
4. `before_put`：写入已交给 saver，这一步的检查点还没有保存。
5. `after_tool`：下一次模型调用即将开始。

**我们测得**这一点，环境是 x86 服务器客户机，使用 `SqliteSaver` 和 PostgreSQL 16.15 上的 `PostgresSaver`。模式、saver 和杀进程点的每个单元格各有 20 次不带键的试验。560 次被杀的试验里，有 331 次对订单扣了两次款。所有试验的最终状态都是正确的。下表是每种模式的次数，两种 saver 合计：

| 杀进程点 | `sync` | `async` | `exit` |
|---|---|---|---|
| `before_tool` | 40 次中 0 次 | 40 次中 0 次 | 40 次中 0 次 |
| `inside_tool` | 40 次中 40 次 | 40 次中 40 次 | 40 次中 40 次 |
| `before_put_writes` | 40 次中 24 次 | 40 次中 38 次 | 没有到达，10 次试验 |
| `before_put` | 40 次中 20 次 | 40 次中 11 次 | 40 次中 40 次 |
| `after_tool` | 40 次中 0 次 | 40 次中 38 次 | 40 次中 40 次 |

```figure
id: fig-5-3
kind: chart
title: 对订单扣了两次款的崩溃试验
claim: 没有键时，在工具内部杀进程会让每种模式都重复扣款，而在工具返回之后，只有 sync 到下一步时才是安全的。
caption: 左图是 Mac 上没有模型的图，每个点是一次试验。玫红色的点写了两次，青色的点写了一次，空心点从未被杀。右图是 x86 服务器客户机上的 Qwen3 4B agent，没有键。每根柱子是 20 次试验，颜色相同，数字是扣款两次的试验数。来源：capture/lab/summary/crash-resume-mac.json 和 capture/lab/summary/crash-resume-x86.json。
```

按杀进程点来读这张表：

- `inside_tool` 在全部 120 次试验里重复了扣款。工具没有已保存的结果，所以恢复时又运行了一次。没有任何持久性模式能改变这一点。
- `before_put_writes` 就是刚刚返回的任务。`sync` 在 40 次试验里重复了 24 次，其中 SQLite 是 20 次中的 8 次，Postgres 是 20 次中的 16 次。`async` 在 40 次里重复了 38 次。
- `sync` 下的 `before_put` 在两种 saver 上都重复了，SQLite 是 20 次中的 12 次，Postgres 是 20 次中的 8 次。工具的 `put_writes` 在后台运行，`put` 开始时它可能还没结束（[第 2.3 节](#s-the-checkpoint-write-path-and-durability)）。
- `after_tool` 是 `sync` 起作用的地方：40 次中 0 次，而 `async` 是 40 次中 38 次。工具那一步的检查点在下一步开始前已经保存。
- `exit` 在运行期间不写待写入项，所以 `before_put_writes` 的杀进程从未发生。扣款之后的其他每个杀进程点都没有留下检查点，重新运行时又扣了一次。

issue #8039 报告说，`sync` 没有修正 `put_writes` 与 `put` 的顺序，所以不同宿主上的恢复结果不同 {{issue 8039}}。它在锁定版本上仍然开着。文档对 `sync` 的承诺在步骤边界上成立，我们的 `after_tool` 单元格证实了这一点。这个承诺对一步内部的崩溃没有说任何话。

Mac 在一个没有模型的图上运行了同样的五个点，节点往文件里追加一行。150 次试验里有 80 次把这一行写了两次，按杀进程点的分布形状相同。这些行仍然有效。那个矩阵里的 agent 行用的是脚本化的模型，上面的 x86 行取代了它们。

恢复还会重复模型调用。一次运行需要两次。在 `sync` 下，每次试验总共调用了 2 次模型。在 `async` 下，450 次试验里有 77 次调用了 3 次，因为在 `before_tool` 杀进程之后，第一次模型调用又运行了一遍。在 `exit` 下，390 次试验里有 270 次是 3 次，90 次是 4 次。

## next 为空，但运行并没有结束 {#s-durability-modes-and-a-crash-between-two-steps-next-is-empty-and-the-run-is-not-done}

崩溃之后，你读取线程，并判断它是否需要恢复。一个自然的检查是 `get_state(config).next`：空元组表示运行已经结束。在锁定版本上，崩溃之后这个检查是错的。

**我们测得**这一点，用的是 x86 服务器客户机上同一个 agent 矩阵。杀进程之后，在 1,260 次被杀的试验中，有 217 次 `next` 是 `()`，而这些运行没有一个已经完成。在每一次里，`invoke(None, config)` 都运行了剩下的部分，并给出正确的最终状态。其中 177 次在 `async` 下，另外 40 次在 `sync` 下的 `before_put`。没有模型的 Mac 图矩阵，在 140 次被杀的试验中有 31 次出现了这种情况。

不要只凭 `next` 做决定。在你自己的 store 里记录一次运行已经开始、已经结束，并恢复每一个开始了但没有结束的线程。没有检查点的线程没有可恢复的东西，所以把原始输入保存在那个 store 里，然后重新开始这次运行。

在 `before_tool` 杀进程之后的历史，也因模式而异。`sync` 下 90 次试验全部有 3 个检查点，`async` 下 90 次全部有 2 个。`exit` 下什么都没有，所以驱动程序只能从输入重新开始运行。checkpointers 页面警告说，没有持久检查点的线程，看起来像一个从未运行过的线程 {{docs oss/python/langgraph/checkpointers}}。

## 修正：给副作用加键，并检查你的记录 {#s-durability-modes-and-a-crash-between-two-steps-the-fix-a-key-on-the-effect-and-a-check-of-your-records}

**幂等键（idempotency key）：** 命名一个副作用的值，让这个副作用能检查自己是否已经发生，并跳过自己。

fault tolerance 页面说，键必须在副作用运行之前就已持久化 {{docs oss/python/langgraph/fault-tolerance}}。实验记录里的工具会构造两种键之一，并和扣款写在同一条语句里。键上的唯一列会拒绝第二行：

```listing
title: 带幂等键的扣款工具
source: capture/lab/T02-crash-resume-x86/t02r_child.py
lang: python
note: 向 attempts 表的插入，以及不带键的分支被截掉了。
---
    @tool
    def charge(order_id: str, amount_usd: int, runtime: ToolRuntime) -> str:
        """Charge an order. Returns a receipt."""
        signal("before_tool")
        call_id = runtime.tool_call_id
        if A.key == "call_id":
            key = f"{A.thread}:{call_id}"
        elif A.key == "order":
            key = f"{A.thread}:{order_id}"
        else:
            key = None
…
            conn.execute("insert into t02r_ledger(trial, phase, call_id, order_id, amount, t, idem_key) values (%s,%s,%s,%s,%s,%s,%s) on conflict (idem_key) do nothing",
                         (A.trial, A.phase, call_id, str(order_id), amount_usd, time.time(), key))
```

**我们测得**两种键，用的是 x86 服务器客户机上同一个矩阵：

| 键 | 被杀的试验里扣了两次款的 | 出现在哪里 |
|---|---|---|
| 无 | 560 次中 331 次 | 每种模式，见上表 |
| 线程和 `tool_call_id` | 560 次中 120 次 | 全在 `exit` 里，`sync` 和 `async` 里 400 次中 0 次 |
| 线程和订单 id | 140 次中 0 次 | 没有，每个单元格 5 次试验 |

`tool_call_id` 键只在 `exit` 下失败。那里没有检查点，所以重新运行时又调用了一次模型，而 `ChatOllama` 给新的调用分配了新的 id。一位维护者在 issue #9185 里建议使用 `tool_call_id` 键 {{issue 9185}}。只要带着这个 id 的 AI 消息进了检查点，它就管用，而 `sync` 和 `async` 在这里每次试验都做到了。在没有模型的 Mac 图上，用线程和节点名做键，150 次试验里重复 0 次。

对图里的节点，任务命名空间起同样的作用。节点把它作为 `checkpoint_ns` 读出来，形式是 `<node>:<task id>`：

```listing
title: 在节点里读取任务命名空间
source: capture/lab/internals/03-checkpoint/crash.py
lang: python
---
        rec["ns"] = get_config()["configurable"]["checkpoint_ns"]
```

在运行时部分的崩溃运行里，`sync` 和 `async` 下每个重新运行的节点，都带着它第一次运行时的命名空间。基于它构造的键，本可以跳过 `a` 的全部 98 次重复。在 `exit` 下，崩溃没有留下可恢复的东西，所以 id 也是新的。

## 会要求两次的模型 {#s-durability-modes-and-a-crash-between-two-steps-a-model-that-asks-twice}

针对调用的键，能阻止检查点里已保存的调用被重新运行。它拦不住模型另外要求的第二次调用。[第 8.7 节](#s-a-failure-drill)的故障演练让 Qwen3 4B 只扣一次款，运行在 `SqliteSaver` 和 `durability="sync"` 上，并在工具内部杀掉进程：

```listing
title: 故障演练的崩溃用例，三次运行中的第一次
source: capture/lab/failure-drill-x86/drill-run1.log
lang: text
---
  symptom   the first process exited with -9 inside charge_card, the resume ran charge_card again: 4 charges
  state     after the resume: next [], 5 messages, charges ['start', 'start', 'resume', 'resume'], last 'Charged'
  fix       check runtime.tool_call_id against the charges before the charge, with durability sync
  after     exit -9, then the resume: 2 charge, next [], last 'Charged'
```

**我们测得**三次，环境是 x86 服务器客户机。在三次运行里，模型在第一条回复里都为这一次扣款发出了两个 `charge_card` 调用。不带键时，三次运行分别扣了 4、4 和 3 次款。带 `tool_call_id` 键时，三次都扣了 2 次。键拦住了每一次对已保存调用的重新运行，却放过了第二个调用。

在 agent 矩阵里，系统提示词说只调用一次工具。在那里，1,290 次试验里模型都只要求了一次调用。提示词会降低这个比率，但副作用仍然需要检查。

所以要按含义给副作用加键。用订单 id，或者副作用所改变的业务记录的 id，并且键里不要放线程 id。同一个订单在第二个线程里，必须得到同一个键。在副作用之前，先在你的记录里查这个键，已有时就返回保存的结果。对外部服务，则把键随请求一起发出，让服务拒绝带同一个键的第二个请求。

`AsyncSqliteSaver`、崩溃下的 `AsyncPostgresSaver`，以及崩溃下的 Agent Server，会在下一版出现，见[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)。

```takeaways
- 预期崩溃前刚返回的节点或工具会再次运行，sync 和 async 下都一样。
- 预期 sync 只保护步骤边界，并且只在有 checkpointer 时才传它。
- 按业务记录给每个副作用加键，例如订单 id，并且不要把线程 id 放进键里。
- checkpoint_ns 或 tool_call_id 只用来识别被重放的调用，不要用它们拦截重复的请求。
- 在副作用之前检查你自己的记录，因为模型可能要求两次扣款。
- 崩溃之后，不要把空的 next 当作运行已经结束。
- 在你自己的 store 里记录运行的开始和结束，并恢复每一个没有结束记录的运行。
```

来源：capture/s_persist.py, capture/out/31-durability.txt; capture/lab/internals/03-checkpoint/crash.py, capture/lab/internals/03-checkpoint/crash.txt, capture/lab/internals/03-checkpoint/crash.json, capture/lab/internals/03-checkpoint/taskns.txt, capture/lab/internals/03-checkpoint/taskns.json; capture/lab/summary/crash-resume-x86.json, capture/lab/T02-crash-resume-x86/01-agent-matrix.jsonl, capture/lab/T02-crash-resume-x86/02-agent-matrix-rep5-19.jsonl, capture/lab/T02-crash-resume-x86/09-summary-table.txt, capture/lab/T02-crash-resume-x86/10-summary.txt, capture/lab/T02-crash-resume-x86/t02r_child.py, capture/lab/T02-crash-resume-x86/t02r_drive.py; capture/lab/summary/failure-drill-x86.json, capture/lab/failure-drill-x86/drill-run1.log, capture/lab/failure-drill-x86/drill-run2.log, capture/lab/failure-drill-x86/drill-run3.log, capture/lab/failure-drill-x86/drill_real.py; capture/lab/summary/crash-resume-mac.json, capture/lab/summary/crash-next-mac.json, capture/lab/T02-crash-resume-mac/01-graph-matrix.jsonl, capture/lab/T02-crash-resume-mac/03-graph-idempotent.jsonl, capture/lab/T02-crash-resume-mac/t02_child.py; libs/langgraph/langgraph/pregel/main.py, libs/langgraph/langgraph/pregel/_loop.py, and libs/langgraph/langgraph/types.py at langgraph 1.2.22; docs.langchain.com at docs commit 04d4d4a (oss/python/langgraph/checkpointers, oss/python/langgraph/fault-tolerance, langsmith/agent-server); GitHub issues langchain-ai/langgraph#9267, #8039, #9185.
