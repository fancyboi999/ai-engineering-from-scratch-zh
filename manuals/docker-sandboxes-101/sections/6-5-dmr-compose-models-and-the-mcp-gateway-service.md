# DMR、Compose models 与 docker/mcp-gateway 服务

> 本地模型是12434端口上无认证的 OpenAI 兼容端点；Compose 用两个变量绑定到服务；四种 gateway 必须区分。

第5部分及本部分所有模型调用都没有 API key 或云账户，模型是与 agent 同一 Mac 上 Docker Model Runner 的 `ai/qwen3:4b`。

读完本节，你能从宿主、容器与沙箱访问 runner，并提供给 Compose 服务。

## 12434端口的 Docker Model Runner {#s-dmr-compose-models-and-the-mcp-gateway-service-docker-model-runner-on-port-12434}

**Docker Model Runner（DMR）：** 从 Docker Hub、OCI registry 或 Hugging Face 拉模型的 Docker 组件 {{docs-dmr Docker Model Runner}}，经 OpenAI、Anthropic 和 Ollama 兼容 API 服务 {{docs-dmr DMR REST API}}。自 Desktop 4.71.0，“Docker Model Runner is now disabled by default and must be explicitly enabled in Settings” {{docs-desktop 4.71.0}}，默认关闭，须在设置中开启。`docker desktop enable model-runner --tcp <port>` 开启宿主 TCP {{docs-dmr DMR REST API}}，录制用12434。

```listing
title: docker model status --json 报告的 runner
source: capture/out/25-model-status.json
lang: json
note: 其他后端已截去。
---
{
  "running": true,
  "backends": {
…
    "llama.cpp": "Running: llama.cpp b9879-metal (sha256:<digest>) 72874f5",
…
  },
  "kind": "Docker Desktop",
  "endpoint": "http://model-runner.docker.internal/v1/",
  "endpointHost": "http://localhost/exp/vDD4.40/v1/"
}
```

“The Model Runner API is not authenticated” {{docs-dmr Docker Model Runner}}，API 无认证。能访问端口的任何客户端都可拉取、加载和运行模型。base URL 取决于调用位置，[图](#fig-6-5) 映射本手册遇到的五种：

| 调用者 | Base URL | 证据 |
|---|---|---|
| 宿主进程 | `http://localhost:12434` | capture/out/25-models.json |
| Docker Desktop 容器 | `http://model-runner.docker.internal` | capture/out/26-compose-up.txt |
| Docker Engine 容器 | `http://172.17.0.1:12434` | {{docs-dmr DMR REST API}}，未录制 |
| 经 Docker socket 的宿主进程 | `http://localhost/exp/vDD4.40` | capture/out/25-model-status.json，`endpointHost` |
| 沙箱内经代理的 `docker-agent` | `http://host.docker.internal:12434` | capture/out/27-inside-run.txt |

base URL 后是路径前缀与完整端点。OpenAI 路径在 `/engines/v1/` 下，`/engines/llama.cpp/v1/` 指定引擎 {{docs-dmr DMR REST API}}。Anthropic 表列 `/anthropic/v1/messages`，示例却调用 `/v1/messages`（[冲突 C79](#s-ref-sources-and-the-conflicts-register)），两者均未测试。Ollama 客户端用 `/api/`。录制还遇到 `/v1/` 根，`status` 将它报告为 `endpoint`。

```figure
id: fig-6-5
kind: structure
title: 一个 Docker Model Runner 的五种 base URL
claim: 五种调用者以五个 base URL 访问同一 runner，之后每条路径对能到端口的任何客户端开放。
caption: 每行从调用者向 runner、从左到右读。虚线调用者来自文档，未录制。右侧路径接在任意 base URL 后。来源为 capture/out/25-model-status.json、25-models.json、26-compose-up.txt、capture/fixtures/agents/files-sandbox.yaml 和 research/sources/docs-model-runner.md。
```

8B tag `ai/qwen3:latest` 在录制 Mac 拉取失败，见 [docker-agent run、new 与 doctor](#s-docker-agent-run-new-and-doctor)（capture/out/25-model-pull-latest.txt）。只有4B tag 时，`doctor` 将 `auto` 解析为 `dmr/docker.io/ai/qwen3:4b`（capture/out/25-doctor.txt）。“By default model-runner unloads idle models after a few minutes” {{docs-agent Docker Model Runner}}，空闲几分钟后默认卸载，`provider_opts.keep_alive` 可改变时间。`provider_opts.context_size` 通过 `_configure` 端点设置上下文窗口 {{docs-agent Docker Model Runner}}。没有运行 `docker model configure`，所以[冲突 C77](#s-ref-sources-and-the-conflicts-register) 未解决。

agent 文件也可在 `providers:` 命名 runner。`fixtures/agents/dmr.yaml` 设置 `base_url: http://localhost:12434/engines/llama.cpp/v1`，运行回答 `Hello`（capture/out/25-run-dmr.txt）。显式 URL 绕过 `--record` 代理，所以每次录制都实时调用（capture/README.md）。

## Compose models {#s-dmr-compose-models-and-the-mcp-gateway-service-compose-models}

```listing
title: 录制的 Compose 文件
source: capture/fixtures/compose/compose.yaml
lang: yaml
note: printer 的 command 已截去。
---
name: m101

models:
  llm:
    model: ai/qwen3:4b

services:
  mcp-gateway:
    image: docker/mcp-gateway
    use_api_socket: true
    command: ["--transport=streaming", "--port=8811"]

  printer:
    image: alpine:3.22
    depends_on: [mcp-gateway]
    models:
      llm:
        endpoint_var: LLM_URL
        model_var: LLM_MODEL
…
```

**models：** 顶层 Compose 元素声明模型，服务按名称绑定。短语法由 `llm` 派生 `LLM_URL` 和 `LLM_MODEL`，`endpoint_var`、`model_var` 可指定名称。要求 Compose v2.38 以上（research/sources/docs-compose-models.md）。`docker compose up` 在启动容器前拉取并配置模型：

```listing
title: 模型步骤及 printer 看到的内容
source: capture/out/26-compose-up.txt
lang: text
note: 容器步骤、网关日志及退出行已截去。
---
 llm Pulling
 llm Pulled
 llm Configuring
 llm Configured
…
printer-1 | LLM_MODEL=ai/qwen3:4b
printer-1 | LLM_URL=http://model-runner.docker.internal/v1/
printer-1 | {"object":"list","data":[{"id":"docker.io/ai/qwen3:4b","object":"model","created":0,"owned_by":"docker","dmr":{}}]}
printer-1 | wget: server returned error: HTTP/1.1 401 Unauthorized
```

Compose 注入 `/v1/` 根，研究计划依据 model-runner 源码预期 `/engines/v1/`。容器内 `GET ${LLM_URL}models` 仍正常回答。Compose 不能启动沙箱（[冲突 C96](#s-ref-sources-and-the-conflicts-register)），也未在沙箱私有引擎上运行 `models:`（[冲突 C95](#s-ref-sources-and-the-conflicts-register)）。

## docker/mcp-gateway 服务 {#s-dmr-compose-models-and-the-mcp-gateway-service-the-docker-mcp-gateway-service}

`mcp-gateway` 服务带宿主 Docker API socket 运行开源 MCP 网关，以便启动 MCP 服务器容器。录制中没有 profile 或服务器，列出0工具，再添加 `mcp-find`、`mcp-add` 等管理工具。输出 `Gateway URL: http://localhost:8811/mcp` 和 bearer token；`printer` 无 token 请求返回401（capture/out/26-compose-up.txt）。[图](#fig-6-6) 展示栈。

```figure
id: fig-6-6
kind: flow
title: 带模型与网关的录制 compose.yaml
claim: Compose 拉取模型，向 printer 注入两个变量，并带 API socket 运行网关；无 bearer token 的请求被拒绝。
caption: 从左上 models 元素开始。墨色实线是调用，玫红虚线为被拒绝请求。来源为 capture/fixtures/compose/compose.yaml、capture/out/26-compose-config.txt 与 26-compose-up.txt。
```

## 四种 gateway {#s-dmr-compose-models-and-the-mcp-gateway-service-four-things-named-gateway}

| 本手册名称 | 含义 | 录制地址 |
|---|---|---|
| models gateway | `--models-gateway` 或 `DOCKER_AGENT_MODELS_GATEWAY` 设置的地址，用于“Route all provider traffic through a models gateway URL” {{docs-agent A2A Protocol}}，路由全部 provider 流量 | `http://localhost:12434/engines`，dmr 的 --record 需要它（capture/README.md） |
| sbx MCP gateway | 每沙箱一个宿主网关，由 `sbx mcp` 设置，与 MCP Toolkit 分开 {{docs-sbx MCP gateway}} | VM 内 `http://mcp-gateway.docker.internal/mcp` |
| MCP gateway service | `docker mcp gateway run` 或 `docker/mcp-gateway` 镜像，录制宿主 mcp v0.44.1 | 服务内 `http://localhost:8811/mcp` |
| hosted MCP gateway | Docker AI Governance 的网关，“an invite-only feature” {{docs-mcp MCP Gateway}}，仅受邀可用 | 未录制 |

Toolkit 网关为各 MCP 服务器运行独立容器。“Containers for MCP tools are limited to 2 GB” {{docs-mcp MCP Toolkit}}，每个限制2 GB、1 CPU。`ref: docker:<name>` 的 docker-agent 工具集走这条路径：“Run MCP servers as secure Docker containers via the MCP Gateway” {{docs-agent MCP Tool}}。sbx 网关见 [sbx mcp add、sbx mcp load 与 --static-mcp](#s-sbx-mcp-add-load-and-static-mcp)，模式见 [MCP 网关课程](phases/13-tools-and-protocols/17-mcp-gateways-and-registries)。

```takeaways
- 宿主 agent 调 `dmr` 前，为 Model Runner 开启宿主 TCP。
- 不要向不可信网络暴露12434，因为 runner 不检查凭据。
- 读服务内 `LLM_URL`，不要靠手写路径猜。
- 说清 gateway 类型：models、sbx MCP、MCP 服务或托管。
```

Sources: docs-dmr Docker Model Runner, DMR REST API, Get started (research/sources/docs-model-runner.md); docs-desktop 4.71.0 (research/sources/docs-desktop-release-notes.md); docs-agent Docker Model Runner, A2A Protocol, MCP Tool (research/sources/docs-docker-agent.md); docs-mcp MCP Gateway, MCP Toolkit (research/sources/docs-mcp.md); docs-sbx MCP gateway (research/sources/docs-sandboxes.md); research/sources/docs-compose-models.md; research/sources/mcp-gateway-README.md; research/conflicts-register.md rows C77, C79, C82, C84, C88, C91, C94, C95, C96; research/plan.md, Part 6; capture/README.md; capture/fixtures/agents/dmr.yaml, files-sandbox.yaml; capture/fixtures/compose/compose.yaml; capture/out/25-model-status.json, 25-models.json, 25-model-ls.txt, 25-model-pull-latest.txt, 25-doctor.txt, 25-run-dmr.txt, 26-compose-config.txt, 26-compose-up.txt, 26-compose-down.txt, 27-inside-run.txt, 11-static-inside.txt
