# HumanInTheLoopMiddleware 与幂等键

> 在副作用之后崩溃，审批在 20 次试验中有 20 次又变成待处理，所以只有工具处的键，才能拦住第二次退款。

一位客服人员点了退款的“批准”。worker 写入了退款行，随后进程在运行结束前死掉。新的 worker 启动，agent 打开这个线程，同一个审批请求又在等待。如果客服再点一次“批准”，客户就可能拿到两次钱。

读完本节，你能说清，从审批恢复运行时，LangGraph 保存了什么、没有保存什么。你能给一个转移资金的工具加上幂等键，并让审批人看到自己批准的是什么。

## 审批是工具调用内部的一个中断 {#s-approvals-and-the-idempotency-key-the-approval-is-an-interrupt-inside-the-tool-call}

服务用 `per_call` 模式的 `HumanInTheLoopMiddleware` 守着 `refund_order`。在这种模式下，中间件在 `tools` 节点内部，就在调用工具之前，从 `wrap_tool_call` 里抛出中断 {{code libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py:751}}。运行停下，流发出一个带工具名和参数的 `interrupt` 事件。

```listing
title: 审批人看到的中断，来自一次 Qwen3 14B 运行
source: capture/lab/prodapp-mac/runs/suite/qwen3-14b/rep-1/cases/19-new_message_while_waiting_for_approval.json
lang: json
note: 流中的一个事件，从用例记录中截取。
---
     "interrupt",
     {
      "id": "515c4354e30817f8f987572b7a06c1bb",
      "type": "tool_approval",
      "tool_call_id": "804ec90d-84f1-406c-88a0-d51eb05e480c",
      "name": "refund_order",
      "args": {
       "order_id": "ORD-e19-3",
       "amount_cents": 0,
       "reason": "Customer requested a refund."
      },
```

批准路由按 id 回答这个中断。它发送一个恢复映射，每个待处理的中断一项。路由从请求里读一个决定，并把它交给每一项。所以一次批准覆盖每个待处理的退款，批准人在点击之前必须看到每一笔。要分别决定每笔退款，就为每个中断 id 取一个决定。

```listing
title: 批准路由，带两种恢复形式
source: capture/lab/prodapp-mac/code/app/server.py
lang: python
---
        state = await s.agent.aget_state(config(thread_id))
        decision = {"type": body.decision} | ({"message": body.message} if body.message else {})
        if state.interrupts and os.environ.get("RESUME_FORM") == "plain" and len(state.interrupts) == 1:
            payload = Command(resume=decision)
        elif state.interrupts:
            payload = Command(resume={item.id: decision for item in state.interrupts})
        elif state.next:
            payload = None
        else:
            raise HTTPException(409, "nothing to resume")
```

## 恢复保存了什么 {#s-approvals-and-the-idempotency-key-what-the-resume-saves}

**恢复映射：** 一个 `Command(resume=...)`，其值是以中断 id 为键的字典。LangGraph 1.2.22 对两种形式的处理不同。普通的恢复值会作为检查点的一个待处理写入，发给 `put_writes`。恢复映射只进入运行 config，它的写入被跳过 {{code libs/langgraph/langgraph/pregel/_loop.py:1064-1091}}。

所以用恢复映射时，决定只存在于内存里，直到 `tools` 任务结束、它的写入被保存。工具就在那个任务里运行。工具写下它的行之后发生崩溃，决定就丢了。下一个读取线程的人会发现同一个中断仍然待处理。

## 退款行之后的崩溃 {#s-approvals-and-the-idempotency-key-a-crash-after-the-refund-row}

**我们测得**：在 Mac 上用 Qwen3 4B，每种恢复形式做了十次试验。每次试验都完整地请求 `ORD-crash-2`，消息里带着金额和原因，所以模型没有什么可选择的。工具在提交之后睡眠 3 秒。脚本等待退款行出现，给 worker 发送 SIGKILL，并启动一个新的。它读取线程，再发一次批准，并读取 `refunds` 表。

用恢复映射的 10 次试验中，有 10 次新 worker 报告 `next` 是 `["tools"]`，审批待处理。第二次批准让工具又运行了一次，键匹配上了，工具返回 `"replayed": true`。每次试验结束时都留下一条 8900 美分的退款行。

普通形式在 10 次试验中有 10 次给出同样的结果：重启后审批待处理，只留下一行。所以无论哪种形式，客户端都无法从状态判断崩溃之前是否给过批准。我们没有检查普通形式的决定是否留存在 `checkpoint_writes` 里，也没有测试不带新决定的恢复。

```figure
id: fig-9-3
kind: timeline
title: 退款行之后被杀掉的 worker，以及重启
claim: 杀掉之后审批又变成待处理，而工具处的键把第二次批准变成了一次重放，只有一条退款行。
caption: 上面的面板是一次试验，单位是第一次批准之后的秒数。下面的面板是所有试验。青绿色方块表示有一条 8900 美分的退款行，琥珀色边框表示审批又待处理了。来源：capture/lab/prodapp-mac/summary/crash-mac.json。
```

在下面几小节的金额检查加进去之后，我们用 Qwen3 4B 把崩溃又运行了一遍，三次试验。结果没有变。3 次试验中有 3 次，重启后审批待处理，第二次批准重放了这个键，只留下一条 8900 美分的行。用 Qwen3 14B 的同样试验没有运行。另一个任务占着内存时，Ollama 九分半钟都没有加载那个模型，所以我们停掉了它们。

## 工具处的键 {#s-approvals-and-the-idempotency-key-the-key-at-the-tool}

退款之所以安全，是因为 `refund_order` 在写入之前先检查一个键。

```listing
title: refund_order 里的幂等键和金额检查
source: capture/lab/prodapp-mac/code/app/tools.py
lang: python
note: 检查之后的插入和更新被截去。
---
    key = f"{ctx.thread_id}:{order_id}:{amount_cents}"
    async with ctx.pool.connection() as conn, conn.transaction():
        cur = await conn.execute(
            "select total_cents, refunded_cents from orders where id = %s and user_id = %s for update",
            (order_id, ctx.user_id),
        )
        order = await cur.fetchone()
        if order is None:
            return json.dumps({"error": f"no order {order_id} on this account"})
        remaining = order["total_cents"] - order["refunded_cents"]
        if amount_cents <= 0:
            return json.dumps({"error": f"amount_cents must be positive; {remaining} cents can be refunded"})
        cur = await conn.execute(
            "select refund_id, order_id, amount_cents from refunds where idempotency_key = %s", (key,)
        )
        if existing := await cur.fetchone():
            return json.dumps({**existing, "replayed": True})
        if amount_cents > remaining:
            return json.dumps({"error": f"refund exceeds the {remaining} cents that can still be refunded"})
…
```

这个键有三部分：线程、订单和金额。它不指明任何单个请求。在新线程里重试同一个请求，会得到不同的键，所以会重试的客户端必须保留线程。

`SELECT ... FOR UPDATE` 锁住订单行，所以两个 worker 不可能都通过检查。`refunds` 表还在这个键上有唯一索引。重放返回第一笔退款，带 `"replayed": true`，模型会告诉客户这笔退款已经存在。

在同一线程里对同一订单退同样的金额，也会重放第一笔退款，即使余额允许再退一笔。我们没有测试这种情况。客户可能要求两笔相同的退款。那就把保存下来的 `tool_call_id` 加进键里。恢复会重复这个 id，新的请求不会。

键之所以成立，是因为重放发送的参数相同。重启之后，`tools` 节点运行检查点保存下来的工具调用，它来自模型在中断之前写下的 AI 消息。模型不会被再次询问。如果被再次询问，它可能选另一个金额，键就会不同。[运行时部分](#s-the-checkpoint-write-path-and-durability)对任何节点都展示了同一条规则：按检查点保存的内容给副作用定键。在 Agent Chat UI 里输入消息，是通往一个从未运行的“成功”的第二条路径，见[聊天 UI 一节](#s-agent-chat-ui-in-front-of-langgraph-dev)。

## 审批人批准的是你展示给他的东西 {#s-approvals-and-the-idempotency-key-the-approver-approves-what-you-show}

幂等键拦得住第二次退款，拦不住错误的第一次。在最初的评估运行里，Qwen3 4B 和 Qwen3 14B 对 `Refund ORD-e19-3` 都提出了 `amount_cents` 为 0，而测试批准了它。两个模型各 3 次运行中，工具都写入了 0 美分的退款行。模型随后告诉客户退款已处理。Qwen3 14B 还对 12900 和 8900 美分的订单提出过 10000 美分，却一个订单也没读过。

所以服务现在多做了两件事。工具读取订单，拒绝 0 或更小的金额，也拒绝超过仍可退金额的数目，如上面的 listing 所示。它的错误文本里给出可退金额，让模型能自我纠正。并且审批请求带着一段由中间件根据订单构建的描述。

```listing
title: 审批描述，根据订单构建
source: capture/lab/prodapp-mac/code/app/tools.py
lang: python
---
def refund_description(tool_call, state, runtime):
    args = tool_call["args"]
    with psycopg.connect(runtime.context.pool.conninfo, row_factory=dict_row) as conn:
        order = conn.execute(
            "select item, total_cents, refunded_cents from orders where id = %s and user_id = %s",
            (args.get("order_id"), runtime.context.user_id),
        ).fetchone()
…
    remaining = order["total_cents"] - order["refunded_cents"]
    return (f"Refund {args.get('amount_cents')} cents on {args.get('order_id')} ({order['item']}). "
            f"Order total {order['total_cents']} cents, refunded so far {order['refunded_cents']}, "
            f"refundable now {remaining}. Reason: {args.get('reason')}")
```

`HumanInTheLoopMiddleware` 为每个工具接收一个 `description`，可以是字符串，也可以是接收工具调用、状态和运行时的可调用对象 {{code libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py:613-620}}。这个可调用对象是同步的，所以它为一次查询开一个短暂的同步连接。

**我们测得**：在 Mac 上，用同样的提示词和种子，对每个模型各三次运行，把六个退款评估又测了一遍。[图 9.3b](#fig-9-3b)展示了 0 美分的用例。

| 模型 | 通过的退款评估，之前与之后 | 有 0 美分行的运行，之前与之后 | 审批人对 0 美分提案读到的内容 |
|---|---|---|---|
| Qwen3 4B | 3 次运行中每次都是 1/6，两次相同 | 3/3，然后 0/3 | `Refund 0 cents on ORD-e19-3 (Water bottle). Order total 2400 cents, refunded so far 0, refundable now 2400.` |
| Qwen3 14B | 3 次运行中每次都是 3/6，两次相同 | 3/3，然后 0/3 | 同样的文本 |

```figure
id: fig-9-3b
kind: comparison
title: 工具检查金额之前与之后的 0 美分退款
claim: 获得批准的 0 美分提案，在检查之前 6 次运行中有 6 次写入了退款行，检查之后 6 次中有 0 次。
caption: 每个方框是评估的一次运行，它会批准模型对 ORD-e19-3 提出的任何退款。玫红色表示写入了 0 美分的行，青绿色表示没有写入。下面的文本是修复之后的审批请求。来源：capture/lab/prodapp-mac/summary/fix-mac.json。
```

通过数没有变，因为失败来自模型的选择。被拒绝之后，Qwen3 14B 在 3 次运行中有 3 次提出全额 2400 美分，并请客户确认。这个回复是对的，而评估仍然失败，因为它期望立即退款。在 8900 美分的订单上，工具以 `refund exceeds the 8900 cents that can still be refunded` 拒绝了 10000 美分。客户发来下一条消息时，Qwen3 14B 读取了订单，并请求确认全额，3 次运行中有 3 次如此。

有一个错误仍然存在。在 12900 美分的订单上，Qwen3 14B 提出 10000 美分，审批人读到 `Refund 10000 cents on ORD-e06-1 (Trail running shoes). Order total 12900 cents, refunded so far 0, refundable now 12900`。这个金额有效，所以工具会接受它。只有读了数字的人，才能拦住一笔没人要求的部分退款。

```takeaways
- 预期待处理的审批会在崩溃之后回来，并把第二次批准设计成安全的。
- 给每个转移资金的工具一个由检查点所保存内容构建的幂等键。
- 用 SELECT FOR UPDATE 锁住你检查的那一行，并用唯一索引支撑这个键。
- 在工具里对照订单校验金额，并把可退金额放进错误文本。
- 让审批人在提议的金额旁边看到订单总额。
- 记住，一次批准会回答该线程所有待处理的退款。
```

来源：capture/lab/prodapp-mac/summary/crash-mac.json, capture/lab/prodapp-mac/runs/crash-map/crash-trials.json, capture/lab/prodapp-mac/runs/crash-plain/crash-trials.json, capture/lab/prodapp-mac/runs/crash-map/t01-before-kill.log.jsonl, capture/lab/prodapp-mac/runs/crash-map/t01-after-restart.log.jsonl, capture/lab/prodapp-mac/code/scripts/crash_real.py, capture/lab/prodapp-mac/code/app/server.py, capture/lab/prodapp-mac/code/app/tools.py, capture/lab/prodapp-mac/code/app/db.py, capture/lab/prodapp-mac/runs/suite/qwen3-14b/rep-1/cases/19-new_message_while_waiting_for_approval.json, capture/lab/prodapp-mac/summary/evals-mac.json, capture/lab/prodapp-mac/summary/fix-mac.json, capture/lab/prodapp-mac/runs/fix/crash-qwen3-4b/crash-trials.json, capture/lab/prodapp-mac/runs/fix/INVALID.txt, capture/lab/prodapp-mac/runs/fix/suite/qwen3-4b/rep-1/cases/19-new_message_while_waiting_for_approval.json, capture/lab/prodapp-mac/runs/fix/suite/qwen3-14b/rep-1/cases/06-refund_approved_once.json, capture/lab/prodapp-mac/code/app/agent.py; libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py at langchain==1.5.0; libs/langgraph/langgraph/pregel/_loop.py at langgraph 1.2.22.
