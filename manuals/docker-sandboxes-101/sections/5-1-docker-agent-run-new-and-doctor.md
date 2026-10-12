# docker-agent run、new 与 doctor

> `docker-agent run` 加载 agent 文件，有无终端都能驱动循环；`doctor` 说明 `auto` 会选哪个模型，`new` 则需要终端。

同事给你一个 agent 文件和运行命令。你没有 API key，只有带 Model Runner 的 Docker Desktop；打开聊天窗口前，你想先证明文件能运行。

读完本节，你能无终端运行 agent 文件、读取事件流，并用 `doctor` 查询 `auto` 的模型选择。

## run 接受什么 {#s-docker-agent-run-new-and-doctor-what-run-takes}

**agent 引用：** `docker-agent run` 的首个参数，可以是 `.yaml`、`.yml` 或 `.hcl` 文件、registry 引用、别名，也可省略 {{help-agent docker-agent run}}。省略时，`run` 使用当前目录的 `docker-agent.yaml`、`docker-agent.yml` 或 `docker-agent.hcl`，否则使用内置默认 agent {{docs-agent CLI Reference}}。`coder` 是第二个内置 agent；`alias add` 保存文件或引用的名称及 `--safety` 等运行选项 {{help-agent docker-agent alias add}}。

registry 引用像文件一样使用。`24-run-ref.txt` 运行 `localhost:15000/m101/agent:v1`，输出与本地文件相同，见 [share push 与 share pull](#s-share-push-and-share-pull)。后续每个参数是一条用户消息，按顺序逐轮运行。`-` 从 stdin 读取消息 {{help-agent docker-agent run}}。

## --exec、--json 与 --last {#s-docker-agent-run-new-and-doctor-exec-json-and-last}

**无界面运行：** `run --exec` 写 stdout，不打开 TUI。`--json` 每行写一个 JSON 事件；`--last` 只输出最终答案 {{help-agent docker-agent run}}。录制对 `capture/fixtures/agents/files.yaml` 用这几种形式发送相同的两条消息。

```listing
title: run --exec --last 的两条消息
source: capture/out/18-run-last.txt
lang: text
note: 未截去任何内容。--fake 重放已录制模型回答，会话一节解释其机制。
---
$ docker-agent run --exec --working-dir fixtures/repo --last --fake work/cassettes/18-files fixtures/agents/files.yaml 'List the files in the working directory.' 'How many lines does README.md have? Count them with a shell command.'
README.md has 1 line.
[exit 0]
```

```listing
title: 同一 --json 运行的67个事件中的三个
source: capture/out/18-run-json.ndjson
lang: jsonl
note: 文件第5、13、24行。tool_call 事件在 call 后、tool_definition 前截断。
---
{"message": "List the files in the working directory.", "session_id": "<uuid>", "session_position": 0, "timestamp": "<ts>", "type": "user_message"}
{"agent_name": "root", "timestamp": "<ts>", "tool_call": {"function": {"arguments": "{\"path\": \".\"}", "name": "list_directory"}, "id": "<call-id>", "type": "function"}, "tool_definition": …
{"agent_name": "root", "content": "The working directory contains 1 file: README.md (1 line).", "message_id": "<uuid>", "session_id": "<uuid>", "timestamp": "<ts>", "type": "agent_choice"}
```

文件还含 `team_info`、`toolset_info`、`tool_call_response`、`token_usage` 和 `stream_stopped` 事件。第二轮展示无界面运行的限制：模型请求 `shell` 执行 `wc -l README.md`，运行时发出 `tool_call_confirmation`。没有终端回答，工具结果为“The user rejected the tool call.”，用户拒绝调用。模型随后用 `read_file`（`18-transcript.txt`）。[权限、--safety 与 hooks](#s-permissions-safety-and-hooks) 解释为何询问。

## 每次录制的模型 {#s-docker-agent-run-new-and-doctor-the-model-in-every-recording}

文档称 `ai/qwen3` 为“the model Docker Agent reaches for by default” {{docs-agent Set Up a Model}}，默认模型。无 Model Runner 时，`doctor` 将 `auto` 解析为8B tag `ai/qwen3:latest`（`16-doctor.txt`）。录制 Mac 两次拉取均在最后5.03 GB blob 后出现 digest 不匹配（`25-model-pull-latest.txt`）。所以每个套件 agent 文件指定同仓库4B tag `ai/qwen3:4b`。它是思考模型，每次回答前流式输出数千推理 token。`--exec` 打印它们，套件压成一行，如 `[... 299 lines of model reasoning cut by run.py ...]`（`18-run-exec.txt`）。

## doctor 与 models {#s-docker-agent-run-new-and-doctor-doctor-and-models}

`doctor` 报告 provider 凭据、Docker Model Runner 是否响应、`auto` 选择，以及指定文件时所需变量。发现问题时退出码非零 {{help-agent docker-agent doctor}}。套件分别在无 Docker 守护进程及 Model Runner 已启动时运行它。

```listing
title: 无 Docker 守护进程时的 doctor
source: capture/out/16-doctor.txt
lang: text
note: 20条均为 "not set" 的 provider 行及 runner 检查完整错误已截去。
---
$ docker-agent doctor
…
Docker Model Runner
  Status: unreachable: docker --config=$HOME/.docker --context=m101-no-daemon model status --json: …
…
Model auto-selection
  auto -> dmr/ai/qwen3:latest

Issues
  - no usable model: no provider credential was found and Docker Model Runner is unreachable; …
Error: 1 issue(s) found
[exit 1]
```

```listing
title: Model Runner 已启动且拉取一个模型时的 doctor
source: capture/out/25-doctor.txt
lang: text
note: 用户配置行及20条 provider 行已截去。
---
$ docker-agent doctor
…
Docker Model Runner
  Status: reachable, 1 model(s) pulled:
    - docker.io/ai/qwen3:4b

Model auto-selection
  auto -> dmr/docker.io/ai/qwen3:4b

No issues found.
[exit 0]
```

没有 runner，`auto` 仍指定 `dmr/ai/qwen3:latest`，issue 行说明为何无法运行。runner 启动后，`auto` 选择唯一已拉取模型，符合 provider 页所说 auto-selection “prefers a locally-installed model” {{docs-agent Docker Model Runner}}，优先本地模型。即使无守护进程，`models list` 也输出 `dmr ai/qwen3:latest` 一行（`16-models.txt`）。交互式修复用 `setup`，有四条路径：`~/.config/cagent/.env` 的 provider key、Model Runner 拉取、自定义 OpenAI 兼容端点及 Claude Code harness {{help-agent docker-agent setup}}。

## new {#s-docker-agent-run-new-and-doctor-new}

`new` 询问后写 agent 文件，描述参数跳过“the initial prompt” {{help-agent docker-agent new}}，即初始提示。`--model` 接受 anthropic、openai、google、dmr 或自定义 provider；DMR 的 `--max-iterations` 默认20（[冲突 C66](#s-ref-sources-and-the-conflicts-register)）。录制中，带描述但无控制终端的 `new` 停在 `/dev/tty`，没有写文件（`17-new-agent.yaml`）。

```listing
title: 有描述、无终端的 new
source: capture/out/17-new.txt
lang: text
note: 欢迎横幅与遥测通知已截去。
---
$ docker-agent new --model dmr/ai/qwen3:4b 'an agent that greets the user and names one fact about Docker sandboxes'  (in work/, without a controlling terminal)
…
Error: bubbletea: error opening TTY: bubbletea: could not open TTY: open /dev/tty: device not configured
[exit 1]
```

[图](#fig-5-1) 将一次运行的组件放在同一页。

```figure
id: fig-5-1
kind: flow
title: docker-agent run 从文件到输出
claim: `run` 加载文件，在循环中交替调用模型与工具，写出答案、事件、会话；`--record` 还写 cassette。
caption: 从左上读。梅紫实线是模型调用，橄榄虚线是工具副作用，靛蓝点线是事件流，青绿色实线是存储记录。--fake 时 cassette 代替 Model Runner 回答。来源为 capture/fixtures/agents/files.yaml、capture/out/18-run-json.ndjson 和 capture/out/18-cassette-head.txt。
```

```takeaways
- 先运行 `docker-agent doctor`，读 `auto` 行和退出码。
- 脚本用 `--exec --json`；需要批准的工具调用会失败。
- CI 的 agent 文件手写，因为 `docker-agent new` 会打开 `/dev/tty`。
- 文件中指定模型 tag，不要在共享机器上信任 `auto`。
```

Sources: help-agent docker-agent run, setup, doctor, new, alias add (research/sources/help-docker-agent.md); docs-agent CLI Reference, Set Up a Model, Docker Model Runner (research/sources/docs-docker-agent.md, pages features/cli, getting-started/set-up-a-model, providers/dmr); conflict C66 (research/conflicts-register.md); capture/README.md; capture/fixtures/agents/files.yaml; capture/out/16-doctor.txt, 16-models.txt, 17-new.txt, 17-new-agent.yaml, 18-run-exec.txt, 18-run-last.txt, 18-run-json.ndjson, 18-transcript.txt, 18-cassette-head.txt, 24-run-ref.txt, 25-doctor.txt, 25-model-pull-latest.txt
