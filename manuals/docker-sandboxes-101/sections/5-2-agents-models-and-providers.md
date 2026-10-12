# agents、models 与 providers

> 只有 `agents` 块必需；模型引用是 `provider/model` 或 `models` 中的名称；`providers` 设置 Docker Model Runner 等可复用端点。

打开 `capture/fixtures/agents/files.yaml`，agent 有 `model: local`，`models` 有 `local` 条目，其中写 `provider: dmr`。另一个文件 `dmr.yaml` 增加带 URL 的 `providers` 块，其运行从不到达录制器。

读完本节，你能沿 agent 的 `model` 值追踪实际端点，并预测 `auto` 选择。

## 文件与 schema {#s-agents-models-and-providers-the-file-and-its-schema}

**agent 文件：** 匹配 `agent-schema.json` 的 YAML 或 HCL 文档，即 Docker Agent v16 schema。根允许16个键，只有一个必需：“Map of agent configurations. At least one agent is required” {{schema agents}}，agent 配置映射至少含一个 agent。顶层键拼错会加载失败，因为“the parser rejects unknown top-level keys” {{docs-agent Configuration Overview}}，解析器拒绝未知顶层键。

`version` 是 schema enum 中 `"0"` 到 `"16"` 的字符串。同一文档页仍写“The current version is `15`” {{docs-agent Configuration Overview}}。录制文件声明 `"16"` 并成功加载，所以本手册遵循 schema。“When you load an older config, Docker Agent automatically migrates it to the latest schema” {{docs-agent Configuration Overview}}，旧配置加载时自动迁移。`share pull` 从 `agentcatalog/pirate` 拉取的文件声明 `version: "2"`，内联指定 `openai/gpt-4.1`（`16-share-pull-agent.yaml`）。

```listing
title: 单 agent 运行的文件
source: capture/fixtures/agents/files.yaml
lang: yaml
note: 未截去任何内容。会话、eval 和分享各节都使用此文件。
---
version: "16"

agents:
  root:
    model: local
    description: Lists the files of a small repository and counts lines.
    instruction: |
      You answer questions about the files in the working directory.
      Use the tools to look; never guess. Answer in one sentence that
      names the files and gives the line count.
    max_iterations: 8
    toolsets:
      - type: filesystem
      - type: shell

models:
  local:
    provider: dmr
    model: ai/qwen3:4b
    temperature: 0
```

## agent 键 {#s-agents-models-and-providers-agent-keys}

**agent：** `agents` 下以键命名的条目。默认运行团队第一个 agent，除非 `--agent` 指定其他 {{help-agent docker-agent run}}。schema `AgentConfig` 列出各键，下面是录制文件使用或依赖的项。

| 键 | 录制中的值 | schema 规则 |
|---|---|---|
| `model` | `local`、`qwen`、`dmr/ai/qwen3`、`openai/gpt-4.1` | 模型名称或 `provider/model` {{schema AgentConfig}} |
| `instruction` | 每个文件的块字符串 | 系统 prompt：字符串或以空行连接的列表 |
| `max_iterations` | `files.yaml` 为 `8`，`writer` 为 `3` | 不小于0的整数 |
| `max_consecutive_tool_calls` | 未设置 | 停止前相同调用次数，0表示默认5 |
| `redact_secrets` | 未设置 | 默认 `true`，内置在三种 hook 事件清除密钥 |
| `toolsets`、`sub_agents`、`handoffs`、`hooks` | `files.yaml`、`team.yaml`、`guarded.yaml` | [工具集](#s-toolsets-and-mcps)、[委派](#s-sub-agents-transfer-task-and-background-agents)、[权限](#s-permissions-safety-and-hooks) |

## 模型引用 {#s-agents-models-and-providers-model-references}

**模型引用：** agent 的 `model` 值，有五种形式：

- 内联 `provider/model`，如 `greeter.yaml` 的 `dmr/ai/qwen3` {{docs-agent Models}}。
- `models` 下的名称，如 `local`，含 `provider`、`model` 和 `temperature: 0` 等参数。
- `first_available` 列表：“At load time, Docker Agent selects the first candidate whose credentials are configured” {{docs-agent Models}}，加载时选首个已配置凭据的候选。
- alloy：逗号分隔两个引用，运行时在同一对话中交替使用。
- `auto`：先选“the first cloud provider with a configured credential” {{docs-agent Set Up a Model}}，即首个已配凭据的云 provider，再选已拉取的 Model Runner 模型。

`run --model [agent=]provider/model` 为一次运行替换引用 {{help-agent docker-agent run}}。录制 Mac 只拉4B tag 时，`doctor` 将 `auto` 解析为 `dmr/docker.io/ai/qwen3:4b`（`25-doctor.txt`）；无 Model Runner 时指定 `dmr/ai/qwen3:latest`，报告无可用模型（`16-doctor.txt`）。

## providers 与 Model Runner 端点 {#s-agents-models-and-providers-providers-and-the-model-runner-endpoint}

**provider 定义：** `providers` 下条目，含底层 `provider`（默认 `openai`）、`base_url`、`token_key` 及模型继承的默认值 {{docs-agent Provider Definitions}}。

```listing
title: Docker Model Runner 的命名 provider
source: capture/fixtures/agents/dmr.yaml
lang: yaml
note: agents 块已截去。
---
version: "16"

providers:
  runner:
    provider: dmr
    base_url: http://localhost:12434/engines/llama.cpp/v1

models:
  qwen:
    provider: runner
    model: ai/qwen3:4b
    temperature: 0
…
```

`files.yaml` 指定 `provider: dmr`，没有 `base_url`；随后“Docker Agent auto-discovers the DMR endpoint” {{docs-agent Docker Model Runner}}，自动发现端点。它执行 `docker model status --json`，无 Docker 守护进程响应时，`16-dry-run.txt` 将该命令打印在错误里。eval 容器没有 `docker` CLI，发现因此失败，见 [eval](#s-session-db-sessions-diff-and-eval)。

显式 `base_url` 下，`dmr.yaml` 回答 `Hello`（`25-run-dmr.txt`）。每次录制此运行都是实时的，因为显式 URL 绕过 `--record` 代理，cassette 为空（`capture/README.md`）。无法发现时设置 `base_url`，需要 cassette 时省略它。

provider id 也变了。`doctor` 输出 `fireworks-ai`、`togetherai`、`moonshotai`，文档 Models 表却是 `fireworks`、`together`、`moonshot`。本手册用 `doctor` 的 id（[冲突 C58](#s-ref-sources-and-the-conflicts-register)），其余见 [provider 表](#s-ref-providers-and-models)。`flavors` 下命名补丁可用 `--flavor` 在运行时修改任意这些块 {{help-agent docker-agent run}}，录制未运行它们。

```figure
id: fig-5-2
kind: structure
title: 模型引用到达 Model Runner 的两条路径
claim: `files.yaml` 将 `local` 解析为 `dmr` 并自行找端点；`dmr.yaml` 将 `qwen` 经 `providers.runner` 解析为固定 URL。
caption: 每列从上向下、从 agent 到端点读。紫色块是 agent，梅紫块是模型与 provider。底行是 doctor 打印的 auto 决定。来源为 capture/fixtures/agents/files.yaml、capture/fixtures/agents/dmr.yaml、capture/out/16-doctor.txt、16-dry-run.txt 和 25-doctor.txt。
```

```takeaways
- 每个文件给出 `version` 字符串，顶层键只用 schema 定义的项。
- 在 `models` 下命名模型，让 `temperature` 等参数集中一处。
- 仅发现不可用时设 `base_url`，因为它绕过 `--record`。
- 依赖 `auto` 前读 `docker-agent doctor` 的 `auto` 行。
```

Sources: schema agents, AgentConfig (research/sources/agent-schema.json); docs-agent Configuration Overview, Models, Set Up a Model, Provider Definitions, Docker Model Runner (research/sources/docs-docker-agent.md, pages configuration/overview, concepts/models, getting-started/set-up-a-model, providers/custom, providers/dmr); help-agent docker-agent run (research/sources/help-docker-agent.md); conflict C58 (research/conflicts-register.md); capture/README.md; capture/fixtures/agents/files.yaml, dmr.yaml, greeter.yaml; capture/out/16-doctor.txt, 16-dry-run.txt, 16-share-pull-agent.yaml, 25-doctor.txt, 25-run-dmr.txt
