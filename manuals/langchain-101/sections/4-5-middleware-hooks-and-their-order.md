# 中间件：钩子及其顺序

> 中间件有六个钩子，其中四个节点钩子会变成图节点；`before_*` 钩子按列表顺序运行，`after_*` 钩子按相反顺序运行。

你给 agent 加了一个日志中间件和一个脱敏中间件。日志在输入方向上显示的是脱敏后的文本，在输出方向上显示的却是原始文本。这是 `middleware` 列表的顺序造成的，而且它向两个方向起作用。

读完本节，你能写出一个中间件，并说明它的每个钩子在哪里运行。你还能预测多个中间件的钩子顺序，以及改变顺序会破坏什么。

## 六个钩子 {#s-middleware-hooks-and-their-order-the-six-hooks}

**中间件（middleware）：** `AgentMiddleware` 子类的对象，`create_agent` 在 agent 循环的固定位置运行它。

**节点钩子（node hook）：** `create_agent` 把它变成图节点的钩子。它接收状态和运行时，返回状态更新或 `None`。

**包装钩子（wrap hook）：** 接收一个请求和一个 `handler` 的钩子，它调用 handler 来运行模型或工具。它可以修改请求、再次调用 handler，或不调用就返回。

| 钩子 | 种类 | 何时运行 | 返回 |
|---|---|---|---|
| `before_agent` | 节点 | 每次运行开始时一次 | 状态更新或 `None` |
| `before_model` | 节点 | 每次模型调用之前 | 状态更新或 `None` |
| `wrap_model_call` | 包装 | 包住每次模型调用，在 `model` 节点内部 | `ModelResponse`、`AIMessage` 或 `ExtendedModelResponse` |
| `after_model` | 节点 | 每次模型调用之后 | 状态更新或 `None` |
| `wrap_tool_call` | 包装 | 包住每次工具调用，在 `tools` 节点内部 | `ToolMessage` 或 `Command` |
| `after_agent` | 节点 | 每次运行结束时一次 | 状态更新或 `None` |

每个钩子都有一个前面加 `a` 的异步孪生版本，例如 `abefore_model`。只有同步 `wrap_model_call` 的中间件，在 agent 以 `ainvoke` 运行时会抛出 `NotImplementedError` {{code libs/langchain_v1/langchain/agents/middleware/types.py}}。中间件还可以声明 `tools` 和 `state_schema`，`create_agent` 会把两者都加到 agent 上。

工具包里的中间件 `Traced` 为它运行的每个钩子写一行。它的模型包装器展示了每个包装钩子的形状：

```listing
title: 一个 wrap_model_call 钩子
source: capture/s_agents.py
lang: python
note: Traced 中间件的一个方法。其他钩子各追加一行。
---
    def wrap_model_call(self, request, handler):
        self.log.append(f"{self.label}.wrap_model_call enter")
        response = handler(request)
        self.log.append(f"{self.label}.wrap_model_call exit")
        return response
```

只要一两个钩子时，装饰器 `before_model`、`after_model`、`before_agent`、`after_agent`、`wrap_model_call`、`wrap_tool_call` 和 `dynamic_prompt` 可以把一个函数变成中间件。

## 钩子变成节点 {#s-middleware-hooks-and-their-order-hooks-become-nodes}

工具包用 `middleware=[A, B, C]`，即三个 `Traced` 实例，构建了一个 agent。每个节点钩子是一个名为 `<middleware name>.<hook>` 的节点。进入方向上，边按列表顺序把它们串起来：

```listing
title: 通向 model 节点的边
source: capture/out/09-middleware-order.txt
lang: json
note: 只保留从 __start__ 到 model 的边。
---
  "A.before_agent -> B.before_agent",
  "A.before_model -> B.before_model",
…
  "B.before_agent -> C.before_agent",
  "B.before_model -> C.before_model",
…
  "C.before_agent -> A.before_model",
  "C.before_model -> model",
…
  "__start__ -> A.before_agent",
```

在输出方向上，从 `model` 出来的边先到最后一个中间件：

```listing
title: 从 model 节点出去的边
source: capture/out/09-middleware-order.txt
lang: json
note: 只保留 after_model 的边。
---
  "A.after_model -> A.before_model",
  "A.after_model -> C.after_agent",
  "A.after_model -> tools",
…
  "B.after_model -> A.after_model",
…
  "C.after_model -> B.after_model",
…
  "model -> C.after_model",
```

`A.after_model` 是模型之后的最后一个节点钩子。它的三条边分别去往 `tools`，经 `C.after_agent` 走向结束，或为了跳转回到 `A.before_model`。`tools` 之后，循环回到 `A.before_model`，所以 `before_agent` 钩子每次运行只运行一次。

[图](#fig-4-5b)根据它的 Mermaid 文本画出了同一张图。before 钩子一路向下运行到 `model`，after 钩子以相反的顺序一路向下运行到结束。

```figure
id: fig-4-5b
kind: structure
title: 中间件 A、B、C 的图
claim: before 钩子按列表顺序串联进入 model，after_model 钩子反向串联，A.after_model 在 tools、结束和 A.before_model 之间选择。
caption: 从顶部的 __start__ 开始读。蓝色框是钩子节点。两侧的琥珀色虚线通道回到上方的 A.before_model。来自 capture/out/49-draw-middleware.txt。
```

## 一次工具往返的顺序 {#s-middleware-hooks-and-their-order-the-order-of-one-tool-round-trip}

工具包对一个带一次工具调用的问题运行了一次，并记录了每个钩子：

```listing
title: 一次工具往返的钩子顺序
source: capture/out/09-middleware-order.txt
lang: json
note: 只保留第一次模型调用和工具调用。第二次模型调用重复模型部分，三个 after_agent 钩子结束这次运行。
---
  "A.before_agent",
  "B.before_agent",
  "C.before_agent",
  "A.before_model",
  "B.before_model",
  "C.before_model",
  "A.wrap_model_call enter",
  "B.wrap_model_call enter",
  "C.wrap_model_call enter",
  "  model called",
  "C.wrap_model_call exit",
  "B.wrap_model_call exit",
  "A.wrap_model_call exit",
  "C.after_model",
  "B.after_model",
  "A.after_model",
  "A.wrap_tool_call enter add",
  "B.wrap_tool_call enter add",
  "C.wrap_tool_call enter add",
  "C.wrap_tool_call exit",
  "B.wrap_tool_call exit",
  "A.wrap_tool_call exit",
…
  "C.after_agent",
  "B.after_agent",
  "A.after_agent"
```

三条规则给出这个顺序，[图](#fig-4-5)画出了它们：

1. `before_agent` 和 `before_model` 钩子按列表顺序运行，先 A，再 B，再 C。
2. `after_model` 和 `after_agent` 钩子按列表的相反顺序运行，先 C，再 B，再 A。
3. 包装钩子是嵌套的。列表中的第一个中间件是最外层，所以 A 最先进入，最后退出。

```figure
id: fig-4-5
kind: flow
title: 三个中间件的钩子顺序
claim: 节点钩子在模型之前按 A、B、C 运行，在模型之后按 C、B、A 运行，包装钩子嵌套，A 是外层。
caption: 把追踪从左往右读。每个点是 A、B 或 C 通道里的一个节点钩子，每个条是一个从进入到退出的包装钩子。带编号的阶段在追踪下方标注，最下面一行是 model 节点周围的边。来自 capture/out/09-middleware-order.txt。
```

自定义中间件页陈述了同样的三条规则 {{docs oss/python/langchain/middleware/custom}}。我们的录制在锁定版本上与它一致。

## 顺序改变了什么 {#s-middleware-hooks-and-their-order-what-the-order-changes}

当一个中间件必须看到原始请求和最终响应时，把它放在最前面。排在前面的包装钩子能看到后面所有钩子做的事。排在前面的节点钩子，在模型之前最先运行，在模型之后最后运行。

`after_model` 的反向顺序是有代价的。从 `after_model` 设置 `jump_to` 的中间件，会在排在它前面的所有中间件的 `after_model` 钩子之前运行。如果其中之一是 `HumanInTheLoopMiddleware`，这次跳转可以跳过审查。批量模式下，另一种顺序同样失败：被拒绝的调用仍然运行了。[第 6.5 节](#s-human-in-the-loop-batched-and-per-call)展示了这两种情形，如 langchain#40492 所报告的，逐个调用的模式在两种顺序下都是安全的 {{issue langchain#40492}}。人在回路（human-in-the-loop）页说，要把 `HumanInTheLoopMiddleware` 列在重试和错误中间件之前 {{docs oss/python/langchain/human-in-the-loop}}。

**jump_to：** 节点钩子返回的键，让运行转到 `model`、`tools` 或 `end`。钩子只有用 `hook_config(can_jump_to=...)` 或装饰器的 `can_jump_to` 选项声明了目标，才能使用它。

## 名称必须唯一 {#s-middleware-hooks-and-their-order-names-must-be-unique}

`create_agent` 用中间件的 `name` 属性给它命名，默认是类名。同一个类的两个实例名称相同，agent 会拒绝它们：

```listing
title: 两个同名的中间件
source: capture/out/09-middleware-order.txt
lang: text
---
create_agent(middleware=[A, A]):

raised builtins.AssertionError: Please remove duplicate middleware instances.
```

要使用同一个类的两个实例，就给每个实例各自的 `name`。工具包的 `Traced` 中间件把它的标签作为名称返回：

```listing
title: 一个 name 属性
source: capture/s_agents.py
lang: python
---
    @property
    def name(self):
        return self.label
```

[第 8.3 节](#s-cost-the-framework-against-a-plain-sdk-loop)给出每个钩子的实测成本。

```takeaways
- 中间件必须看到原始请求和最终响应时，把它放在最前面。
- 预期 after_model 钩子按列表的相反顺序运行。
- 另一个中间件从 after_model 设置 jump_to 时，使用逐个调用的审查。
- 给每个中间件实例一个唯一的名称。
- agent 以 ainvoke 运行时，为每个包装钩子写出它的异步孪生版本。
```

来源：capture/s_agents.py, capture/out/09-middleware-order.txt, capture/out/49-draw-middleware.txt; docs.langchain.com at docs commit 04d4d4a (oss/python/langchain/middleware/custom, oss/python/langchain/human-in-the-loop); issue langchain#40492; libs/langchain_v1/langchain/agents/middleware/types.py and libs/langchain_v1/langchain/agents/factory.py at langchain==1.5.0.
