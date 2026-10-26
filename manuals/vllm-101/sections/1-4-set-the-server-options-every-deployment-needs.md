# 设置每个部署都需要的服务器选项

> 少数几个服务器选项决定谁能访问服务、客户端使用哪个模型名，以及日志会保留什么内容。

你的第一个服务器已经运行，现在要让其他程序也能调用它。读完本节，你可以设置监听地址、模型名称、API key、chat template 和日志。

我们没有测量这些选项对速度的影响。我们在 L4 上用小模型 Qwen3-0.6B 检查了监听地址、模型名称、API key、YAML 文件和已移除的日志参数。其他结论来自 vLLM 0.31.0 文档和源码。

## 选择地址和端口 {#s-set-the-server-options-every-deployment-needs-pick-the-address-and-the-port}

| 选项 | 0.31.0 默认值 | 适用场景 |
|---|---|---|
| `--host` | 未设置，因此服务器监听所有网络接口 | 服务器只应通过某个接口响应，例如本地测试使用 `127.0.0.1` |
| `--port` | 8000 | 其他程序占用了 8000 端口，或你要在一台机器上运行两个服务器 |

默认值会监听所有接口，因此同一网络中的其他机器可以访问。只在本机测试时，设置 `--host 127.0.0.1`。

## 给模型设置稳定的名称 {#s-set-the-server-options-every-deployment-needs-give-the-model-a-stable-name}

默认情况下，API 使用传给 `vllm serve` 的模型名，例如 `Qwen/Qwen3-8B`。客户端必须发送完全相同的名称。`--served-model-name` 可以另设客户端使用的名称：

```bash
vllm serve Qwen/Qwen3-8B --served-model-name chat
```

现在客户端发送 `"model": "chat"`。以后更换 checkpoint 时，无须修改客户端。这个名称也会作为 `model_name` 标签出现在指标中。如果提供多个名称，服务器都会接受。

## 要求客户端提供 API key {#s-set-the-server-options-every-deployment-needs-require-an-api-key}

`--api-key` 会要求客户端在 `Authorization` 头中提供密钥。也可以通过 `VLLM_API_KEY` 环境变量设置密钥，避免密钥出现在进程列表中。

先停止当前占用 8000 端口的服务器，再在第一个终端中设置密钥并启动服务：

```bash
VLLM_API_KEY=change-me vllm serve Qwen/Qwen3-8B --host 127.0.0.1 2>&1 | tee server.log
```

服务器就绪后，在第二个终端中用密钥发送请求：

```bash
curl http://localhost:8000/v1/models -H "Authorization: Bearer change-me"
```

密钥只保护 `/v1`、`/v2`、`/inference` 和 `/cohere` 路由。同一端口上的其他路由仍然开放，例如 `/invocations`、`/metrics` 和 `/health`。我们在 L4 上检查了这一点：不带密钥访问 `/v1/models` 会返回 401；`/health` 和 `/metrics` 返回 200；发送到 `/invocations` 的 chat 请求也返回 200。

所以，API key 不能单独保护公网上的服务。应在服务前部署网关，详见[生产运行](#s-run-vllm-in-production)。

## 修正 chat template {#s-set-the-server-options-every-deployment-needs-fix-the-chat-template}

vLLM 使用模型仓库中的 chat template 格式化消息。有些仓库没有模板，或者模板有误。这样模型会收到格式错误的提示词，回答质量也会变差。

`--chat-template` 接受文件路径或模板文本。`--default-chat-template-kwargs` 为所有请求设置模板选项，例如为 Qwen3 设置 `'{"enable_thinking": false}'`。请求仍可通过自己的 `chat_template_kwargs` 覆盖选项。[推理模型](#s-serve-reasoning-models)一节会用这个选项配置 Qwen3。

## 控制日志保留内容 {#s-set-the-server-options-every-deployment-needs-control-what-the-log-keeps}

| 选项 | 默认值 | 作用 |
|---|---|---|
| `--enable-log-requests` | 关闭 | 为每个请求写一行日志，其中包含请求 ID 和参数 |
| `--max-log-len` | 不限制 | 将这些日志行中的提示词截断到指定字符数 |
| `VLLM_LOGGING_LEVEL` | `INFO` | 设置 vLLM 日志级别。排查疑难问题时可以使用 `DEBUG` |
| `--uvicorn-log-level` | `info` | 设置 HTTP 服务器的日志级别 |
| `--disable-uvicorn-access-log` | 关闭 | 不再记录每个 HTTP 请求，例如每次 `/health` 探测 |

在 `DEBUG` 级别启用 `--enable-log-requests` 后，请求日志会包含提示词。处理私人数据的服务器不要使用这个设置。

旧版本有 `--disable-log-requests` 参数。0.31.0 已移除它，默认不会记录请求内容，除非你主动启用。

## 关闭使用统计 {#s-set-the-server-options-every-deployment-needs-turn-off-usage-statistics}

vLLM 默认发送关于硬件和模型配置的匿名使用数据。要关闭统计，请在服务器进程的环境中设置 `VLLM_NO_USAGE_STATS=1` 或 `DO_NOT_TRACK=1`。

## 将选项保存到文件 {#s-set-the-server-options-every-deployment-needs-keep-the-options-in-a-file}

`vllm serve --config config.yaml` 会从 YAML 文件读取选项。每个键都使用去掉两个连字符的长参数名，例如 `served-model-name: chat`。如果命令行和配置文件设置了同一个选项，以命令行为准。

## 检查选项 {#s-set-the-server-options-every-deployment-needs-check-the-options}

查看日志开头附近的 `non-default args` 行。它会列出所有被改成非默认值的选项：

```bash
grep "non-default args" server.log
```

接着分别带密钥和不带密钥请求 `/v1/models`。不带密钥时，服务器应返回 HTTP 401。

```takeaways
- 本机测试时将 `--host` 设为 127.0.0.1，因为默认值会监听所有接口。
- 设置 `--served-model-name`，让客户端在切换 checkpoint 后仍使用同一个名称。
- 同时使用 API key 和网关，因为 key 只保护部分路由。
```

来源：vLLM 0.31.0 文档（docs/configuration/serve_args.md、docs/usage/usage_stats.md、docs/usage/security.md、docs/usage/troubleshooting.md），vLLM 0.31.0 源码（vllm/entrypoints/launchers/cli_args.py、vllm/entrypoints/launchers/launcher.py、vllm/engine/arg_utils.py、vllm/config/model.py、vllm/envs.py），capture/gpu/out-gb10/server-load-vllm.log、capture/gpu/out-l4/livecheck-2026-10-22.txt。
