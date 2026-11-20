# 护栏、PII 与决策中间件（beta）

> `PIIMiddleware` 按固定规则改写或拦截一种个人数据；两个 beta 中间件则请一个决策模型来选模型，或拦截一次调用。

用户把一个电子邮件地址和一个银行卡号贴进了你的客服 agent。模型提供方现在两样都拿到了。一天后，模型请求删除 `main` 分支，工具就运行了。这两件事，都需要在用户、模型和工具之间加一道检查。

读完本节，你能选择 PII 策略，说明 `PIIMiddleware` 在哪里起作用，并读懂它改了什么。你还能配置 `ModelRouterMiddleware` 和 `AutoModeMiddleware`，并说明它们的决策模型收到什么。

## 两种护栏 {#s-guardrails-pii-and-the-decision-middleware-beta-two-kinds-of-guardrail}

**护栏（guardrail）：** 在 agent 内部运行的检查，用来修改、拦截或停止一次请求、一条回复或一次工具调用。

护栏页点出两种 {{docs oss/python/langchain/guardrails}}。确定性护栏使用规则，例如正则表达式。它快而且可重复，但漏掉规则没有描述的东西。基于模型的护栏去问一个模型或分类器，要花一次调用。

`PIIMiddleware` 是 `langchain` 里的确定性护栏。`HumanInTheLoopMiddleware` 去问人，[第 6.5 节](#s-human-in-the-loop-batched-and-per-call)讲它。下面两个决策中间件是基于模型的。

## PIIMiddleware {#s-guardrails-pii-and-the-decision-middleware-beta-piimiddleware}

**PIIMiddleware：** 在消息里找出一种类型的个人数据，并对每个匹配应用一种策略的中间件。

每个实例处理一种类型：`email`、`credit_card`、`ip`、`mac_address`、`url`，或者你自己用 `detector` 定义的名称 {{code libs/langchain_v1/langchain/agents/middleware/pii.py}}。每种类型用一个实例。每个实例命名为 `PIIMiddleware[<type>]`，所以同一类型的两个实例会冲突。它的默认值决定它在哪里起作用：

| 选项 | 默认值 | 在哪里起作用 |
|---|---|---|
| `apply_to_input` | `True` | 最新的用户消息，在 `before_model` 里 |
| `apply_to_output` | `False` | 最新的 AI 消息，在 `after_model` 里 |
| `apply_to_tool_results` | `False` | 最新 AI 消息之后的工具消息，在 `before_model` 里 |
| `strategy` | `redact` | 对匹配项做什么 |

中间件修改的是状态里的消息，所以检查点和追踪里保存的也是改过的文本。工具包把带有四类数据的同一个输入，每次送过一个中间件。[图](#fig-4-8)把结果并排放在一起。

```figure
id: fig-4-8
kind: comparison
title: 同一输入上的四种 PII 策略
claim: redact 和 hash 替换匹配项，mask 保留银行卡的最后四位数字，block 在模型得到任何调用之前就抛出异常。
caption: 每一行是工具包用一个 PIIMiddleware 做的一次运行。左列是设置，右列是模型收到的文本，或者错误。来自 capture/out/14-mw-pii.txt。
```

```listing
title: PIIMiddleware('credit_card', strategy='mask') 之后的用户消息
source: capture/out/14-mw-pii.txt
lang: json
---
    "content": "Mail ada@example.com, card **** **** **** 1111, from 192.168.1.20, see https://example.com/x",
```

`hash` 写出类型和一段短哈希，这里是 `<ip_hash:55235459>`。同一个地址得到同一个哈希，所以模型能区分两个值，却看不到它们。`block` 在模型调用之前抛出异常：

```listing
title: PIIMiddleware('email', strategy='block')
source: capture/out/14-mw-pii.txt
lang: text
note: 出错之后的模型日志是空的。
---
raised langchain.agents.middleware._redaction.PIIDetectionError: Detected 1 instance(s) of email in text content

model calls, as the model received them:
[]
```

自定义检测器是正则表达式或函数。工具包对匹配 `sk-[a-z0-9]{8}` 的密钥做脱敏：

```listing
title: 一个自定义检测器
source: capture/s_middleware.py
lang: python
---
        middleware=[PIIMiddleware("api_key", detector=r"sk-[a-z0-9]{8}", strategy="redact")], inp=ask("my key is sk-abcd1234"), first=0)
```

模型收到的是 `my key is [REDACTED_API_KEY]`，它回答说密钥已被脱敏。设 `apply_to_output=True` 时，工具包要求模型回复 `Write to grace@example.org.`。这条回复在状态里变成了 `Write to [REDACTED_EMAIL].`。

输入方向的四次运行，Qwen3 4B 都给出了同样的答案：`I'm sorry, but I can't assist with that request.`。输入里仍然有银行卡号、地址或 URL，模型拒绝了。脱敏改变的是模型读到的内容，并不会让请求在模型看来变得安全。

护栏页描述了一个用于 `apply_to_output=True` 的流转换器。它扣下每个文本块的最后 128 个字符，这样跨块拆开的匹配就不会被发送出去 {{docs oss/python/langchain/guardrails}}。工具包没有通过 `PIIMiddleware` 做流式输出。这项测试会在下一版里补上，[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)列出了它。

## 决策模型 {#s-guardrails-pii-and-the-decision-middleware-beta-decision-models}

**决策模型（decision model）：** `langchain_core.decisions` 里的 `BaseDecisionModel`，在 `langchain-core` 1.8.0 中新增。它回答有类型的问题，例如在几个具名选项中做选择，或者判断某个陈述为真的概率。

按发布说明，两个决策中间件都是 `langchain` 1.5.0 新增的，并且都处于 beta。预置中间件页把两者都标为 beta {{docs oss/python/langchain/middleware/built-in}}。在代码里，`ModelRouterMiddleware` 带有 `beta` 装饰器，构建时会发出警告。`AutoModeMiddleware` 只在 docstring 里写了 beta，所以它不发警告 {{code libs/langchain_v1/langchain/agents/middleware/auto_mode.py}}。LangChain 只有 OpenAI 和 Google 的决策模型。

所以工具包用 `OllamaDecisionModel` 来回答，这是它自己写的约 34 行代码。它把每个问题和状态以 JSON 模式发给 Qwen3 4B，再把 JSON 回复变成有类型的答案。下面的问题是中间件发出的，答案是模型说的。

## ModelRouterMiddleware {#s-guardrails-pii-and-the-decision-middleware-beta-modelroutermiddleware}

`ModelRouterMiddleware` 在 `before_agent` 里问一个选择题，然后在这次运行的每次模型调用里使用选中的模型。工具包给它两个选择，`fast` 和 `deep`。它发出的问题是这样的：

```listing
title: ModelRouterMiddleware 发出的问题
source: capture/out/20-mw-decisions.txt
lang: json
---
    "questions": {
      "model_route": {
        "type": "choice",
        "criteria": {
          "fast": "arithmetic and short answers",
          "deep": "long reasoning"
        },
        "instructions": "Pick the cheapest model that can answer."
      }
    }
```

决策模型回答 `fast`，概率为 0.999，`deep` 为 0.001。`deep` 路线是 `qwen3:8b`，它没有得到调用。`fast` 模型得到唯一一次模型调用，传给 `create_agent` 的那个模型一次也没被调用，答案进入了 `state["model_route"]`。这次运行发出了警告：`LangChainBetaWarning: The middleware `ModelRouterMiddleware` is in beta.`。

## AutoModeMiddleware {#s-guardrails-pii-and-the-decision-middleware-beta-automodemiddleware}

**AutoModeMiddleware：** 在每次调用所列工具之前，问决策模型这次调用有风险的概率的中间件。概率达到 0.5 或更高时，它拦截这次调用。

中间件发送工具调用、工具描述和最多 30 条最近的消息 {{code libs/langchain_v1/langchain/agents/middleware/auto_mode.py}}。被拦截的调用得到一条错误的 `ToolMessage`，工具不会运行。没有列出的工具不经提问就运行。决策模型抛出异常时，错误向上传播，工具不运行。中间件只拦截，从不去问人。

工具包列出了 `delete_branch` 和 `add`，并让模型在一条回复里同时调用两者。决策模型对 `delete_branch` 回答 0.999，对 `add` 回答 0.0：

```listing
title: 一个被拦截的调用和一个被放行的调用
source: capture/out/20-mw-decisions.txt
lang: json
note: 两条 ToolMessage。id 已截去。
---
    "type": "ToolMessage",
    "content": "The tool call `delete_branch` was blocked because it was classified as risky (probability: 1.00). The tool was not executed.",
    "name": "delete_branch",
…
    "tool_call_id": "<uuid-3>",
    "status": "error"
  },
  {
    "type": "ToolMessage",
    "content": "5",
    "name": "add",
```

用户用平实的话要求了删除，调用仍然被拦截。中间件的指令把破坏性动作算作有风险。在同一场景的较早一次录制里，决策模型也给了 `add` 0.999 并拦截了它。小型决策模型可能拦截安全的调用，所以依赖它之前，先在你自己的调用上测量。

[图](#fig-4-8b)画出了这两条路径。决策模型收到的问题，`criteria` 设为 `null`：

```listing
title: AutoModeMiddleware 发出的问题
source: capture/out/20-mw-decisions.txt
lang: json
note: 指令在第一句之后截去。
---
    "is_risky": {
      "type": "noul",
…
      "criteria": null
    }
```

```figure
id: fig-4-8b
kind: decision
title: AutoModeMiddleware 对一次工具调用做了什么
claim: 所列工具的调用达到或超过 0.5 时，会得到一条错误的 ToolMessage 且从不运行；除非你传入 criteria，否则问题里带的 criteria 是 null。
caption: 从顶部的工具调用开始读。琥珀色框是发给决策模型的问题，附上它发送的字段。玫红色框是被拦截的 delete_branch 调用，绿色框是已运行的 add。来自 capture/out/20-mw-decisions.txt。
```

中间件的配置类有默认的 criteria：有风险指的是造成伤害、超出用户允许的范围、暴露数据，或有外部影响。构造函数的 `criteria` 默认为 `None` 并原样传下去，这个 `None` 会取代默认值 {{code libs/langchain_v1/langchain/agents/middleware/auto_mode.py}}。所以不传 `criteria` 参数时，决策模型拿到指令，却没有 criteria。当你的决策模型需要时，传入一个带 `true` 和 `false` 文本的 `NoulCriteria`。

```takeaways
- 对你必须去除的每一种个人数据，各加一个 PIIMiddleware。
- 模型可能在回复里重复个人数据时，设置 apply_to_output=True。
- 匹配项必须在模型看到之前就终止运行时，使用 block 策略。
- 不要指望 AutoModeMiddleware 给出警告，尽管它是 beta。
- 给 AutoModeMiddleware 传入 criteria，因为默认值发送的是 criteria null。
- 必须由人批准一次调用时，使用 HumanInTheLoopMiddleware，因为 auto mode 只会拦截。
```

来源：capture/out/14-mw-pii.txt, capture/out/20-mw-decisions.txt, capture/s_middleware.py, capture/README.md; docs.langchain.com at docs commit 04d4d4a (oss/python/langchain/guardrails, oss/python/langchain/middleware/built-in); libs/langchain_v1/langchain/agents/middleware/pii.py, auto_mode.py, and model_router.py at langchain==1.5.0; libs/core/langchain_core/decisions at langchain-core 1.8.0.
