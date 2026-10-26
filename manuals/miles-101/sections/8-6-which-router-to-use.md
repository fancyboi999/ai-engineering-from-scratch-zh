# 选择哪种 router

> router 会将 rollout 请求分发到多个 engine；当你运行多个 engine 或执行多轮对话时，选择哪种 router 就很重要。

每个 rollout 请求都会经过 router，再发送到 engine。单 GPU 单 engine 时，router 只有一个目标。使用多个 engine 或 agent session 时，请求路由方式会影响 engine 复用 cache 的效果。

读完本节后，你可以解释 router 在 Miles 训练中的作用，以及何时应该更换它。

## 两种 router {#s-which-router-to-use-the-two-routers}

| Router | 选择方式 | 路由依据 | 说明 |
|---|---|---|---|
| SGLang router，Rust 服务 | 默认设置 | token | 支持拆分 prefill 和 decode |
| Miles router，Python 服务 | `--use-miles-router` | 文本请求；每次发送给未完成请求最少的 engine | 不支持拆分 prefill 和 decode；默认连续检查失败 3 次后会标记 engine 不健康 |

Miles 会为运行中的每个模型启动一个 router，不需要为它单独分配 GPU。从 v0.1.1 起，Miles 总是启动自己的 router，训练无法连接你自行启动的 router。

默认 SGLang router 来自 Miles 团队维护的专用构建。该构建会在 router 和 engine 之间传递 RL 字段，例如 sampling replay 的采样 token 集合和 top log probability。

我们的运行使用默认 router。日志中的启动命令如下：

```listing
title: 我们的运行启动的 router
source: capture/gpu/out-gb10/router-launch.txt
lang: text
note: 摘录自 e6a-base 运行日志中的一行。
---
sglang_router.launch_router --log-level warn --prometheus-port 20036 --request-timeout-secs 14400 --host 172.17.0.3 --port 20034
```

## agent session 的路由 {#s-which-router-to-use-routing-for-agent-sessions}

启用 `--use-session-server` 后，router 会将同一对话的每一轮都发给同一个 engine。这样每轮都能复用前面轮次的 cache。Miles 会自动为这种情况设置路由策略。

engine 启用 attention data parallelism 后，Miles 会让 router 识别 data-parallel rank。router 随后可以选择 engine 内部的 rank。

## 何时更换 router {#s-which-router-to-use-when-to-change-the-router}

- 只有一个 engine 时，保留默认设置，无需负载均衡。
- 多个 engine 处理单轮 prompt 时，保留默认设置。
- 使用 agent session 时，启用 session server，并由 Miles 设置路由策略。
- 只有需要发送文本请求时才使用 Miles router。它不支持拆分 prefill 和 decode。

请求失败时，同时查看 router 和 engine 日志。在 router 处失败的请求不会到达任何 engine。

```takeaways
- 单 engine 和单轮 prompt 任务使用默认 SGLang router。
- agent 使用 session server，确保同一对话始终路由到一个 engine。
- 请求未到达 engine 就失败时，查看 router 日志。
```

来源：Miles main 08752a12 中的 router 参数、router specification 和 session server 设置；Miles v0.1.1 发行说明；Miles router 构建仓库；capture/gpu/out-gb10/router-launch.txt。
