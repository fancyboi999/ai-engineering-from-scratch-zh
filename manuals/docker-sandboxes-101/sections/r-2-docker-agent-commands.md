# docker-agent 命令

> docker-agent 1.149.0 根帮助四组中的全部命令、全局 flags，以及每个 serve 子命令的默认监听地址。

根帮助列19命令，分 Core、Diagnose、Advanced、Additional 四组 {{help-agent docker-agent}}。含子命令的保存树有47页。程序是 Homebrew 构建；Desktop 插件 `docker agent` 名称带空格，运行相同命令（[冲突 C48](#s-ref-sources-and-the-conflicts-register)）。文档 `features/cli` 是唯一其他参考，因为 `/reference/cli/docker/agent/` 不存在（[冲突 C68](#s-ref-sources-and-the-conflicts-register)）。

## 全局 flags {#s-ref-docker-agent-commands-global-flags}

所有命令接受以下 flags {{help-agent docker-agent}}。

| Flag | 默认值 | 含义 |
|---|---|---|
| `--cache-dir` | macOS 为 `~/Library/Caches/cagent` | 覆盖缓存目录 |
| `--config-dir` | `~/.config/cagent` | 覆盖配置目录；文档还说 `DOCKER_AGENT_CONFIG_DIR` 和旧 `CAGENT_CONFIG_DIR` 设置同一路径 {{docs-agent features/cli}} |
| `--data-dir` | `~/.cagent` 或 `DOCKER_AGENT_DATA_DIR` | 覆盖数据目录，其中存 `session.db`、worktree 和计划 {{docs-agent features/cli}} |
| `-d, --debug` | 关闭 | 开启调试日志 |
| `--log-file` | `~/.cagent/cagent.debug.log` | 调试日志路径，仅 --debug 使用 |
| `-o, --otel` | 关闭 | 开启 OpenTelemetry tracing |
| `-h, --help` | 无 | 打印命令帮助 |

## 核心命令 {#s-ref-docker-agent-commands-core-commands}

| 命令 | 用途 | 关键 flags | 要求 | 章节 |
|---|---|---|---|---|
| `getting-started` | 通过动手交互导览学习 docker agent {{help-agent docker-agent}} | 无。树中无此页（[冲突 C75](#s-ref-sources-and-the-conflicts-register)）。文档描述可跳过的两分钟导览，也可用 `docker agent tour` {{docs-agent features/cli}} | 交互终端 | [§5.1](#s-docker-agent-run-new-and-doctor) |
| `run [<agent-file>\|<registry-ref>] [message]...` | 从文件、registry 引用、别名或内置默认运行 agent {{help-agent docker-agent run}} | 见下表 | 带凭据模型、Docker Model Runner 或 `--fake` | [§5.1](#s-docker-agent-run-new-and-doctor) |
| `setup` | 经内置 provider、Model Runner、自定义 OpenAI 兼容端点或 Claude Code harness 四路径设置模型 {{help-agent docker-agent setup}} | 无 | 终端；provider 路径写 `~/.config/cagent/.env` | [§5.1](#s-docker-agent-run-new-and-doctor) |
| `share push <agent-file> <registry-ref>` | 明文推送文件到 OCI registry，可在注解带签名或 MAC {{help-agent docker-agent share push}} | `--key`（PEM、OpenSSH、16字节密钥，或 `DOCKER_AGENT_ENCRYPT_KEY`）、`--encrypt` | registry 访问 | [§6.4](#s-share-push-and-share-pull) |
| `share pull <registry-ref>` | 拉取 agent 文件，有 key 时验证或解密 {{help-agent docker-agent share pull}} | `--key`, `--force` | registry 访问 | [§6.4](#s-share-push-and-share-pull) |

## run 的 flags {#s-ref-docker-agent-commands-the-flags-of-run}

`run` 页列54 flags {{help-agent docker-agent run}}。下表分组列本手册所用项及默认值。

| 分组 | Flags |
|---|---|
| agent 与输入 | `-a, --agent`（团队首个）、`--agent-picker [refs]`、`--prompt-file`（可重复）、`--attach <image>`；`-` 从 stdin 读消息 |
| 输出 | `--exec`（无 TUI）、`--last`（仅最终答案，需 --exec）、`--json`（NDJSON 事件）、`--hide-tool-calls`、`--hide-tool-results`、`--on-event <type>=<cmd>` |
| 批准 | `--safety strict\|balanced\|restricted\|autonomous`、`--yolo`（等于 --safety autonomous，[冲突 C59](#s-ref-sources-and-the-conflicts-register)） |
| 模型 | `--model [agent=]provider/model`（可重复）、`--models-gateway`、`--dry-run` |
| 会话 | `--session <id or -1>`、`-s, --session-db`（默认 `<data-dir>/session.db`）、`--session-read-only`、`--working-dir` |
| 录制与重放 | `--record [path]`（cassette 加 TUI e2e 测试）、`--fake <path>`、`--fake-stream [15]`（chunk 间毫秒数） |
| 沙箱 | `--sandbox`、`--sbx`（默认 true，--sbx=false 强制已移除的 docker sandbox，[冲突 C60](#s-ref-sources-and-the-conflicts-register)）、`--template`（默认 `docker/docker-agent-sbx-templates:latest`）、`--sandbox-kit`、`--kit`（可重复）、`--kit-arg`、`--no-kit`、`--cloud`（隐含 --sandbox）、`--sandbox-ttl`（默认 `1h0m0s`） |
| Hooks | `--hook-pre-tool-use`、`--hook-post-tool-use`、`--hook-session-start`、`--hook-session-end`、`--hook-on-user-input`、`--hook-stop`，均可重复 |
| 配置 | `--flavor`（可重复，顺序应用）、`--env-from-file`、`--code-mode-tools`、`--mcp-oauth-redirect-uri`、`--remote <addr>` |
| Worktree | `-w, --worktree [name]`（默认 `auto`）、`--worktree-base <ref>`、`--worktree-pr <number or URL>`（需 GitHub CLI） |
| TUI | `--lean`、`--sidebar`（默认 true）、`--theme`、`--app-name`、`--disable-commands` |

## 诊断命令 {#s-ref-docker-agent-commands-diagnose-commands}

| 命令 | 用途 | 关键 flags | 要求 | 章节 |
|---|---|---|---|---|
| `doctor [agent-file]` | 报告 provider 凭据、runner 响应、auto 选择；发现问题非零退出 {{help-agent docker-agent doctor}} | `--json`, `--env-from-file`, `--models-gateway` | 无；用 `docker model status --json` 查 runner | [§5.1](#s-docker-agent-run-new-and-doctor) |
| `models [list\|ls]` | 列 --model 接受的模型，先网关 /v1/models，再有凭据 provider {{help-agent docker-agent models}} | `-a, --all`, `-p, --provider`, `--format table\|json`, `--models-gateway` | 无 | [§5.1](#s-docker-agent-run-new-and-doctor) |
| `toolsets` | 列27种内置工具集 {{help-agent docker-agent toolsets}} | `--format table\|json` | 无 | [§5.3](#s-toolsets-and-mcps) 与 [R.5](#s-ref-toolsets) |

## 高级命令 {#s-ref-docker-agent-commands-advanced-commands}

| 命令 | 用途 | 关键 flags | 要求 | 章节 |
|---|---|---|---|---|
| `alias add <alias-name> <agent-path>` | 为文件或 registry 引用保存名称及运行选项 {{help-agent docker-agent alias add}} | `--yolo`、`--safety`（优先于 --yolo）、`--model`、`--hide-tool-results`、`--sandbox` | 无 | [§5.1](#s-docker-agent-run-new-and-doctor) |
| `alias list\|ls`, `alias remove\|rm <alias-name>` | 列出或移除别名 {{help-agent docker-agent alias list}} | `--json` | 无 | [§5.1](#s-docker-agent-run-new-and-doctor) |
| `board` | 打开看板 TUI，各卡片在独立 git worktree 的 tmux 会话运行 agent {{help-agent docker-agent board}} | 无 | tmux、git，以及 `~/.config/cagent/config.yaml` 项目 | 无 |
| `debug auth` | 打印所用 Docker token 及来源 {{help-agent docker-agent debug auth}} | `--json` | 无 | [R.6](#s-ref-providers-and-models) |
| `debug config <agent-file> [flavor...]` | 打印应用 flavors 后的 agent 文件规范形式 {{help-agent docker-agent debug config}} | debug 分组 flags | 无 | [§5.2](#s-agents-models-and-providers) |
| `debug oauth list\|login\|remove` | 列存储 OAuth token、登录远程 MCP 服务器或移除 token {{help-agent docker-agent debug oauth}} | `--json`（list） | login 需浏览器 | [§5.3](#s-toolsets-and-mcps) |
| `debug skills <agent-file>` | 显示 agent 发现的 skills {{help-agent docker-agent debug skills}} | `--json` | 无 | [§4.5](#s-sbx-skills-add-and-skills-true) |
| `debug title <agent-file> <question>` | 从问题生成会话标题 {{help-agent docker-agent debug title}} | `--model` | 模型 | [§5.6](#s-session-db-sessions-diff-and-eval) |
| `debug tool <agent-file> <tool-name> [parameters-json]` | 直接调一个工具，有真实副作用，无模型轮次 {{help-agent docker-agent debug tool}} | `-a, --agent`, `--json`, `--no-hook` | 工具所需条件 | [§5.3](#s-toolsets-and-mcps) |
| `debug toolsets <agent-file>` | 列 agent 工具及参数 schema {{help-agent docker-agent debug toolsets}} | `--json` | 无 | [§5.3](#s-toolsets-and-mcps) |
| `eval <agent-file> [<eval-dir>]` | 在容器重放保存会话并评分 {{help-agent docker-agent eval}} | `-c, --concurrency`（默认10）、`--judge-model`（默认 `openai/gpt-5.6-terra`）、`--judge-type llm\|evaluator`（默认 llm）、`--agent-image`（默认固定 `docker/docker-agent:<version>`）、`--base-image`、`--container-runtime`（默认 docker）、`-e, --env`、`--keep-containers`、`--only`、`--output`（默认 `<eval-dir>/results`）、`--repeat`（默认1）、`--baseline`、`--regression-tolerance`（[冲突 C65](#s-ref-sources-and-the-conflicts-register)） | 容器运行时及 judge 模型 | [§5.6](#s-session-db-sessions-diff-and-eval) |
| `new [description]` | 从描述写新 agent 文件 {{help-agent docker-agent new}} | `--model`（anthropic、openai、google、dmr 或自定义 provider，[冲突 C66](#s-ref-sources-and-the-conflicts-register)）、`--max-iterations`（DMR 默认20，其他不限） | 模型 | [§5.1](#s-docker-agent-run-new-and-doctor) |
| `plans create\|delete\|export\|get\|list\|status\|update` | 宿主使用乐观锁编辑 plan 工具集共享计划 {{help-agent docker-agent plans}} | `--file`（- 为 stdin）、`--title`、`--author`、`--status`、`--expected-version`（冲突退出3）、`--force`、`--output`、`--json` | 无 | [sub_agents、transfer_task 与 background_agents](#s-sub-agents-transfer-task-and-background-agents) |
| `sandbox allow <host>...` | 为后续每次 --sandbox 添加持久允许主机 {{help-agent docker-agent sandbox allow}} | 无 | 无 | [§1.2](#s-docker-agent-run-sandbox-end-to-end) |
| `sandbox deny\|remove\|rm <host>`, `sandbox list\|ls` | 移除主机或列允许列表 {{help-agent docker-agent sandbox}} | 无 | 无 | [§1.2](#s-docker-agent-run-sandbox-end-to-end) |
| `serve a2a\|acp\|api\|chat\|mcp` | 将 agent 作为服务器启动 {{help-agent docker-agent serve}} | 见下表 | 模型 | [§6.1](#s-serve-api-and-serve-chat) 至 [§6.3](#s-serve-a2a) |
| `sessions diff <session-a> <session-b>` | 报告两个录制会话首个不同工具调用 {{help-agent docker-agent sessions diff}} | `--json`, `--fail-on-divergence`, `-s, --session-db` | 无 | [§5.6](#s-session-db-sessions-diff-and-eval) |

`debug` 共享 flags：`--code-mode-tools`、`--env-from-file`、`--flavor`、六个 `--hook-*`、`--mcp-oauth-redirect-uri`、`--models-gateway`、`--working-dir` {{help-agent docker-agent debug}}。`eval`、`new` 与每个 serve 子命令也有它们。

## serve 子命令 {#s-ref-docker-agent-commands-the-serve-subcommands}

| 子命令 | 传输 | 默认监听地址 | 会话数据库 | 认证与安全 flags | 章节 |
|---|---|---|---|---|---|
| `serve a2a <agent-file>` | HTTP，Agent-to-Agent 协议 {{help-agent docker-agent serve a2a}} | `127.0.0.1:8082` | `<data-dir>/session.db` | `--auth-token`、`--insecure-no-auth`、`--cors-origin`、`--safety`、`-a`（团队首个，[冲突 C64](#s-ref-sources-and-the-conflicts-register)） | [§6.3](#s-serve-a2a) |
| `serve acp <agent-file>` | stdio，Agent Client Protocol {{help-agent docker-agent serve acp}} | 无 | `<data-dir>/session.db` | 无 | [§6.2](#s-serve-mcp-and-serve-acp) |
| `serve api <agent-file>\|<agents-dir>` | HTTP，会话与 SSE {{help-agent docker-agent serve api}} | `127.0.0.1:8080` | 当前目录 `session.db`（[冲突 C63](#s-ref-sources-and-the-conflicts-register)） | `--auth-token`（空值关闭认证）、`--max-request-size`（默认1048576）、`--session-workingdir-root`、`--pull-interval`（0关闭）、`--fake`、`--record` | [§6.1](#s-serve-api-and-serve-chat) |
| `serve chat <agent-file>` | HTTP，`/v1/chat/completions` 和 `/v1/models` {{help-agent docker-agent serve chat}} | `127.0.0.1:8083` | 无 flag | `--api-key`、`--api-key-env`、`--insecure-no-auth`、`--cors-origin`、`--safety`、`--conversations-max`、`--conversation-ttl`（默认30m0s）、`--request-timeout`（默认5m0s）、`--max-idle-runtimes`（默认4）、`--max-request-size`、`-a`（未设则全部 agent） | [§6.1](#s-serve-api-and-serve-chat) |
| `serve mcp <agent-file>` | 默认 stdio，--http 为流式 HTTP {{help-agent docker-agent serve mcp}} | --http 时 `127.0.0.1:8081` | 无 flag | `--auth-token`、`--insecure-no-auth`、`--safety` 仅 --http；`--attach [latest]` 暴露运行中 TUI、`--tool-name`、`--mcp-keepalive`（仅 stdio）、`-a`（未设则全部 agent） | [§6.2](#s-serve-mcp-and-serve-acp) |

帮助列出 `serve a2a`、`serve chat`、`serve mcp --http` 的四种安全模式，没有默认值；因此各服务器内部默认值未在帮助记录。

## 附加命令 {#s-ref-docker-agent-commands-additional-commands}

| 命令 | 用途 | 关键 flags | 要求 | 章节 |
|---|---|---|---|---|
| `completion` | 生成 shell 自动补全脚本 {{help-agent docker-agent}} | 保存树中无此页 | 无 | 无 |
| `help` | 任意命令帮助 {{help-agent docker-agent}} | 保存树中无此页 | 无 | 无 |
| `version` | 打印版本与 commit hash {{help-agent docker-agent version}} | 无 | 无 | [§1.1](#s-sbx-and-docker-agent) |

录制机器 `docker-agent version` 输出 `v1.149.0` 和 `Commit: Homebrew`（research/sources/probes/docker-agent-version.txt）。

Sources: research/sources/help-docker-agent.md (every `docker-agent` help page, docker-agent v1.149.0, Commit: Homebrew); research/sources/docs-docker-agent.md (page features/cli for `getting-started`, `--config-dir`, and `--data-dir`); research/sources/probes/docker-agent-version.txt, docker-agent-toolsets.txt; research/conflicts-register.md rows C48, C59, C60, C63, C64, C65, C66, C68, C75; manual.json (section files and ids)
