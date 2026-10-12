# 设置键、环境变量与路径

> 2026-10-08 sbx settings list 输出的全部键、两个工具读取的全部环境变量及 macOS 路径，逐项附来源。

录制机器 `sbx settings list` 输出31键，SOURCE 全为 `default`（research/sources/probes/sbx-settings-list.txt）。值依次来自环境变量、`sbx settings set` 用户覆盖、内置默认 {{docs-sbx Settings}}。RESTART yes 表示已有守护进程消费者需 `sbx daemon restart`，新沙箱与受支持 CLI 立即用新值 {{help-sbx sbx settings list}}。CLI 表截断长说明；含义列在文档有条目时补全文档说明，无条目则注明并给 `sbx settings list --json` 完整含义（capture/out/02-settings.json）。

## 设置键 {#s-ref-settings-keys-environment-variables-and-paths-the-settings-keys}

| 键 | 类型 | 默认值 | 重启 | 含义 |
|---|---|---|---|---|
| `claude.remoteControl` | bool | `false` | 否 | 允许 Claude Code `/remote-control` 用自己的会话 token 认证，而非代理替换为宿主凭据（文档） |
| `clipboard.imagePaste` | bool | `false` | 否 | 允许沙箱 agent 读宿主剪贴板图像，用 Ctrl+V 粘贴截图（文档） |
| `diagnostics.autoUpload` | string | 空 | 否 | 守护进程错误后自动上传诊断的许可：`yes`、`no`，空值表示尚未决定（文档） |
| `env.rememberHostCommands` | bool | `false` | 否 | 首次批准后，仅环境文件宿主命令变化时询问（文档） |
| `kit.allowExtractedAgents` | bool | `true` | 否 | 接受从 sbx 移出的 agent 固定 kit 引用，即使在 kit.allowedSources 外，并豁免 kit.requireSignature（文档） |
| `kit.allowLocalKits` | bool | `true` | 否 | 允许本地目录及 ZIP kit（文档） |
| `kit.allowedSources` | json | `["docker.io/"]` | 否 | 允许远程 kit 来源前缀 JSON 数组，按路径段边界匹配；`["*"]` 允许任意来源（文档） |
| `kit.ignoreTransparencyLog` | bool | `false` | 否 | 不检查 Rekor 条目验证无密钥签名，用于 --tlog-upload=false 的 kit（文档） |
| `kit.requireSignature` | bool | `false` | 否 | 拒绝未签名或不可信签名者的 kit；ZIP 无法带签名，因此也拒绝（文档） |
| `kit.trustedSigners` | json | 经 Google issuer 证明、以 `@docker.com` 结尾的身份 | 否 | 签名者策略 JSON 数组：身份加 issuer 的无密钥签名，或公钥文件（文档） |
| `mcp.forceLocalGateway` | bool | `false` | 是 | 账户本会用托管网关时改用本地 MCP 网关（文档） |
| `model.providers` | json | `{}` | 否 | sbx run --model 的推理端点 JSON 对象，各含 `url`、`wire`、`apiKeyEnv`（文档） |
| `no_proxy` | string | 空 | 是 | 沙箱、守护进程及受支持 CLI 流量的共享代理例外列表（文档） |
| `no_proxy.daemon` | string | 空 | 是 | 仅守护进程与 CLI 请求的例外；非空替换该作用域共享列表（文档） |
| `no_proxy.sandbox` | string | 空 | 是 | 仅沙箱出站例外；非空替换沙箱共享列表（文档） |
| `platform.allowExperimentalFeatures` | bool | `true` | 否 | 允许实验特性。CLI 文本完整；文档默认 false（[冲突 C18](#s-ref-sources-and-the-conflicts-register)） |
| `platform.images.registryMirror` | string | 空 | 否 | 解析到 Docker Hub 的模板/kit 镜像主机，不带 URL scheme（文档） |
| `platform.images.useDHI` | bool | `false` | 否 | 默认 agent 模板使用 Docker Hardened Image 变体 `dhi/sbx-templates:<tag>`（文档） |
| `proxy` | string | 空 | 是 | 沙箱、守护进程及 CLI 上游代理：HTTP/HTTPS/SOCKS5 URL、PAC 来源、`system` 或 `direct`（文档） |
| `proxy.daemon` | string | 空 | 是 | 仅守护进程与受支持 CLI 请求的上游代理（文档） |
| `proxy.integratedAuth` | bool | `false` | 是 | 用 Windows 登录身份执行 NTLM/Kerberos 认证；macOS/Linux 无影响（文档） |
| `proxy.sandbox` | string | 空 | 是 | 仅沙箱出站上游代理，覆盖此作用域 proxy（文档） |
| `sandbox.disk.dockerVolume` | string | `10g` | 否 | 新沙箱 /var/lib/docker 卷大小，至少512 MiB；已有卷保留大小（文档） |
| `skills.defaultMode` | string | `readonly` | 否 | 省略 --skills 时共享存储模式：`readonly`、`readwrite` 或 `off`（文档） |
| `ssh.agentForwardingEnabled` | bool | `true` | 是 | 允许客户端向沙箱转发 SSH agent，私钥留宿主（文档） |
| `ssh.agentSocketPath` | string | 空 | 是 | 固定宿主 SSH agent socket；空值使用各客户端提供的 socket（文档） |
| `ssh.autoCreate` | bool | `false` | 是 | SSH 连接时若不存在则创建沙箱；文档无条目（[冲突 C20](#s-ref-sources-and-the-conflicts-register)） |
| `ssh.defaultAgent` | string | `shell` | 是 | SSH 自动创建沙箱的内置 agent；文档无条目 |
| `ssh.defaultTemplate` | string | 空 | 是 | SSH 自动创建的模板覆盖，空值使用 agent 默认；文档无条目 |
| `ssh.workspaceRoot` | string | 空 | 是 | SSH 自动创建工作区的宿主目录，空值为无挂载、容器内部；文档无条目 |
| `tls.allowNegativeSerial` | bool | `false` | 是 | 接受某些 TLS 检查代理签发的负序列号服务器证书（文档） |

值类型为 `bool`、`int`、`float`、`string`、`json`；与管理员约束冲突的覆盖值被拒绝 {{help-sbx sbx settings set}}。多数变更约五秒内生效 {{help-sbx sbx settings}}。

## 文档提到但 CLI 未打印的键 {#s-ref-settings-keys-environment-variables-and-paths-keys-the-docs-name-that-the-cli-did-not-print}

文档设置页、三个指南及一项发布说明列出 sbx settings list 未返回的键（[冲突 C19](#s-ref-sources-and-the-conflicts-register)）。本手册仅在此处列出。

| 键 | 文档使用位置 | 文档说法 |
|---|---|---|
| `feature.model` | 本地模型指南 | 在 platform.allowExperimentalFeatures true 后执行 `sbx settings set feature.model true` 开启 sbx run --model {{docs-sbx Run a local model}} |
| `feature.sandbox-gpu` | GPU 指南 | 相同两条命令显示隐藏 --gpu {{docs-sbx Turn on the feature}} |
| `feature.udp-egress` | 网络策略页 | 相同两条命令允许 sbx policy allow network --protocol udp {{docs-sbx Allow outbound UDP}} |
| `diagnostics.autoUploadErrorCooldownInDays` | 设置页 | 整数，默认1，自动上传间隔天数，仅 diagnostics.autoUpload 为 yes 时应用 {{docs-sbx Settings}} |
| `feature.ssh` | v0.34.0 发布说明 | `sbx settings set feature.ssh true` 开启实验性原生 SSH 端点 {{rel-sbx v0.34.0}} |

## sbx 读取的环境变量 {#s-ref-settings-keys-environment-variables-and-paths-environment-variables-that-sbx-reads}

这些变量配置宿主侧，不会设置沙箱内变量；守护进程只在启动时读取 {{docs-sbx Settings}}。

| 变量 | 设置内容 | 来源 |
|---|---|---|
| `DOCKER_SANDBOXES_CLIPBOARD_IMAGE_PASTE` | `clipboard.imagePaste` | {{docs-sbx Settings}} |
| `DOCKER_SANDBOXES_CLAUDE_REMOTE_CONTROL` | `claude.remoteControl` | {{docs-sbx Settings}} |
| `DOCKER_SANDBOXES_USE_DHI` | `platform.images.useDHI` | {{docs-sbx Settings}} |
| `DOCKER_SANDBOXES_KIT_ALLOWED_SOURCES` | `kit.allowedSources` | {{docs-sbx Settings}} |
| `DOCKER_SANDBOXES_KIT_ALLOW_LOCAL` | `kit.allowLocalKits` | {{docs-sbx Settings}} |
| `DOCKER_SANDBOXES_KIT_ALLOW_EXTRACTED_AGENTS` | `kit.allowExtractedAgents` | {{docs-sbx Settings}} |
| `DOCKER_SANDBOXES_KIT_REQUIRE_SIGNATURE` | `kit.requireSignature` | {{docs-sbx Settings}} |
| `DOCKER_SANDBOXES_KIT_TRUSTED_SIGNERS` | `kit.trustedSigners` | {{docs-sbx Settings}} |
| `DOCKER_SANDBOXES_KIT_IGNORE_TLOG` | `kit.ignoreTransparencyLog` | {{docs-sbx Settings}} |
| `DOCKER_SANDBOXES_PROXY` | `proxy.sandbox`，仅沙箱流量 | {{docs-sbx Settings}} |
| `DOCKER_SANDBOXES_NO_PROXY` | `no_proxy.sandbox`，仅沙箱流量 | {{docs-sbx Settings}} |
| `DOCKER_SANDBOXES_SSH_AUTO_CREATE` | `ssh.autoCreate` | capture/out/02-settings.json，文档无条目 |
| `DOCKER_SANDBOXES_SSH_DEFAULT_AGENT` | `ssh.defaultAgent` | capture/out/02-settings.json，文档无条目 |
| `DOCKER_SANDBOXES_SSH_DEFAULT_TEMPLATE` | `ssh.defaultTemplate` | capture/out/02-settings.json，文档无条目 |
| `DOCKER_SANDBOXES_SSH_WORKSPACE_ROOT` | `ssh.workspaceRoot` | capture/out/02-settings.json，文档无条目 |
| `DOCKER_SANDBOXES_MODEL_PROVIDERS` | `model.providers` | capture/out/02-settings.json，文档无条目 |
| `DOCKER_SANDBOXES_ALLOW_EXPERIMENTAL_FEATURES` | `platform.allowExperimentalFeatures` | capture/out/02-settings.json，文档无条目 |
| `DOCKER_SANDBOXES_TLS_ALLOW_NEGATIVE_SERIAL` | `tls.allowNegativeSerial` | {{docs-sbx Settings}} |
| `HTTP_PROXY`、`HTTPS_PROXY`、`NO_PROXY` 及小写形式 | 未设 proxy/no_proxy 时的上游代理 | {{docs-sbx Upstream proxies}} |
| `DOCKER_SANDBOXES_DOCKER_SIZE` | 单次创建的 Docker 数据盘大小，如 `30g` | {{docs-sbx Settings}} |
| `DOCKER_SANDBOXES_ROOT_SIZE` | 单次创建的根文件系统大小，如 `40g` | {{docs-sbx Troubleshooting}} |
| `DOCKER_SANDBOXES_CLONED_WORKSPACE_SIZE` | --clone 沙箱私有克隆大小 | {{docs-sbx Troubleshooting}} |
| `DOCKER_SANDBOXES_ENABLE_VIRTIOFS_CACHE` | `0` 关闭工作区挂载 virtiofs 缓存 | {{docs-sbx Troubleshooting}} |
| `SBX_NO_TELEMETRY` | `1` 关闭 CLI 使用分析 | {{docs-sbx Troubleshooting}} |
| `DOCKER_ACCESS_TOKEN` | sbx env 命令的 Docker 身份，每 token 独立状态作用域 | {{help-sbx sbx env}} |
| `SBX_MCP_URL` | `none` 选择本地 MCP 数据平面而非托管网关 | {{help-sbx sbx mcp add}} |
| `SANDBOXES_STORAGE_ROOT` | 保存来源未记录；研究笔记从 v0.29.0 发布说明提到它，但保存发布列表没保留正文 | 无 |

环境文件宿主生命周期命令收到 `SBX_LIFECYCLE_PHASE`、`SBX_ENV_FILE`、`SBX_ENV_FILES`、`SBX_ENV_DIR`、`SBX_SANDBOX_NAME`、`SBX_AGENT`、`SBX_WORKSPACE` {{docs-sbx Environment files}}；云创建后还收到 `SBX_SANDBOX_ID` {{help-sbx sbx env}}。

## docker-agent 读取的环境变量 {#s-ref-settings-keys-environment-variables-and-paths-environment-variables-that-docker-agent-reads}

v1.30.0 将前缀 CAGENT_ 改为 DOCKER_AGENT_，旧名仍接受（[冲突 C53](#s-ref-sources-and-the-conflicts-register)）{{rel-agent v1.30.0}}。

| 变量 | 旧名 | 含义 | 来源 |
|---|---|---|---|
| `DOCKER_AGENT_DATA_DIR` | 无 | 数据目录，等同 --data-dir | {{help-agent docker-agent}}，v1.147.0 新增 {{rel-agent v1.147.0}} |
| `DOCKER_AGENT_CONFIG_DIR` | `CAGENT_CONFIG_DIR` | 配置目录，等同 --config-dir | {{docs-agent Hooks}}，v1.100.0 新增 {{rel-agent v1.100.0}} |
| `DOCKER_AGENT_MODELS_GATEWAY` | `CAGENT_MODELS_GATEWAY` | 经网关路由模型流量，等同 --models-gateway | {{docs-agent User settings}} |
| `DOCKER_AGENT_DEFAULT_MODEL` | `CAGENT_DEFAULT_MODEL` | 未给模型时的 provider/model 默认模型 | {{docs-agent User settings}} |
| `DOCKER_AGENT_HIDE_TELEMETRY_BANNER` | `CAGENT_HIDE_TELEMETRY_BANNER` | `1` 仅隐藏首次遥测通知 | {{docs-agent User settings}} |
| `TELEMETRY_ENABLED` | 无，无前缀 | `false` 关闭遥测（[冲突 C67](#s-ref-sources-and-the-conflicts-register)） | {{docs-agent Telemetry}} |
| `DOCKER_AGENT_AUTO_UPDATE` | 无 | `1`、`true`、`yes`、`on` 允许独立发布程序自更新 | {{docs-agent User settings}}，v1.74.0 新增 {{rel-agent v1.74.0}} |
| `DOCKER_AGENT_NO_TOKEN_EXCHANGE` | 无 | `1` 停止将 docker login access token 换成 Docker token | {{docs-agent Secrets}} |
| `DOCKER_AGENT_HUB_LOGIN_URL` | 无 | 将 token 交换指向 Docker staging，仅 HTTPS docker.com URL | {{docs-agent User settings}} |
| `DOCKER_AGENT_AUTO_INSTALL` | 无 | `false` 关闭 aqua registry 自动安装工具 | {{docs-agent Tools}} |
| `DOCKER_AGENT_TOOLS_DIR` | 无 | 已安装工具目录，默认 ~/.cagent/tools/ | {{docs-agent Tools}} |
| `DOCKER_AGENT_NO_SETUP` | 无 | `1` 阻止无可用模型时提供 setup 向导 | {{docs-agent features/cli}} |
| `DOCKER_AGENT_BOARD_EDITOR` | `BOARD_EDITOR`，保留一个版本 | board 打开 worktree 的编辑器，默认 code | {{docs-agent Board}}，v1.102.0 改名 {{rel-agent v1.102.0}} |
| `DOCKER_AGENT_PPROF_ADDR` | `CAGENT_PPROF_ADDR` | Go pprof 服务器回环地址；文档仍用旧名 | {{rel-agent v1.139.0}}, {{docs-agent features/cli}} |
| `DOCKER_AGENT_ENCRYPT_KEY` | 无 | share push --key 与 share pull --key 的密钥 | {{help-agent docker-agent share push}} |
| `GITHUB_TOKEN` | 无 | 提高自动安装器的 GitHub API 限额 | {{docs-agent Tools}} |
| `CAGENT_ASKPASS_SOCKET`, `CAGENT_ASKPASS_TOKEN` | 无，仍带 CAGENT_ 前缀 | shell 工具集 sudo 桥接，仅在调用 sudo 的命令设置 | {{docs-agent Shell}} |
| `CAGENT_EXP_DEBUG_LAYOUT`, `CAGENT_HIDE_TELEMETRY` | v1.30.0 改名 | 保存来源未记录新名 | {{rel-agent v1.30.0}} |

`ANTHROPIC_API_KEY` 等 provider 凭据变量见 [R.6](#s-ref-providers-and-models)。

## macOS 路径 {#s-ref-settings-keys-environment-variables-and-paths-paths-on-macos}

录制机器是 macOS，所以先列 macOS 路径，文档说明时也列 Linux/Windows。请将 `rohitghumare` 换为你的用户名。

| 路径 | 内容 | 工具 | 来源 |
|---|---|---|---|
| `~/Library/Application Support/com.docker.sandboxes/` | sbx 状态目录，sbx reset 后最后手段才删除 | sbx | {{docs-sbx Removing all state}} |
| `.../com.docker.sandboxes/sandboxes/sandboxd/sandboxd.sock` | sandboxd 的 Unix socket | sbx | research/sources/probes/sbx-daemon-status.txt |
| `.../com.docker.sandboxes/sandboxes/sandboxd/daemon.log` | 守护进程日志 | sbx | research/sources/probes/sbx-daemon-status.txt |
| `.../com.docker.sandboxes/sandboxes/agent-skills` | 共享 skills 存储；Linux `~/.local/state/sandboxes/sandboxes/agent-skills`，Windows `%LOCALAPPDATA%\DockerSandboxes\sandboxes\state\agent-skills` | sbx | {{docs-sbx Share agent skills}} |
| `~/Library/Logs/com.docker.sandboxes/sandboxes/auditkit/` | 守护进程审计记录；Linux `${XDG_STATE_HOME:-~/.local/state}/sandboxes/sandboxes/auditkit/`，Windows `%LOCALAPPDATA%\DockerSandboxes\sandboxes\logs\auditkit\` | sbx | {{docs-sbx Where records are stored}} |
| `~/.config/sbx/credentials.yaml` | 凭据绑定文件；Windows `%APPDATA%\sbx\credentials.yaml` | sbx | {{docs-sbx Credential bindings}} |
| macOS 钥匙串 | sbx secret set 的密钥存储；Windows Credential Manager，Linux Secret Service，无服务时用 ~/.config/com.docker.sandboxes 文件 | sbx | {{docs-sbx Credentials}} |
| `~/.sbx/run/d/containerd/containerd.sock.ttrpc` | 守护进程启动绑定的 containerd ttrpc socket，录制错误提到此路径 | sbx | {{help-sbx sbx kit builder history ls}} |
| `~/.sbxenv.yaml` | 合入每个项目文件底层的基础环境文件 | sbx | {{help-sbx sbx env create}} |
| `/opt/homebrew/Caskroom/sbx/0.47.0/Sbx.app/Contents/MacOS/sbx` | Homebrew cask 的 CLI 程序；mkfs.erofs 在 Contents/libexec 下 | sbx | research/sources/probes/sbx-diagnose.txt |
| `~/.local/state/sandboxes/`, `~/.cache/sandboxes/`, `~/.config/sandboxes/` | Linux 三个状态目录，设 XDG_* 时使用它；Windows 用 `%LOCALAPPDATA%\DockerSandboxes` | sbx | {{docs-sbx Removing all state}} |
| `~/.config/cagent/config.yaml` | 用户设置、别名、全局权限/hooks、board 项目 | docker-agent | {{help-agent docker-agent board}} |
| `~/.config/cagent/.env` | docker agent setup 写 provider key 的 env 文件 | docker-agent | {{help-agent docker-agent setup}} |
| `~/.config/cagent/hooks.d/` | hook drop-in 文件，按字典序加载 | docker-agent | {{docs-agent Hooks}} |
| `~/.cagent/` | 数据目录，含 session.db、worktree、计划 | docker-agent | {{help-agent docker-agent}}, {{docs-agent features/cli}} |
| `~/.cagent/session.db` | 全部会话，SQLite 格式 | docker-agent | {{docs-agent Sessions}} |
| `~/.cagent/cagent.debug.log` | --debug 调试日志 | docker-agent | {{help-agent docker-agent}} |
| `~/.cagent/tools/bin/` | aqua 自动安装器下载的程序 | docker-agent | {{docs-agent Tools}} |
| `~/.cagent/plans/`, `~/.cagent/session_plans/` | 共享及每会话计划 | docker-agent | {{docs-agent features/cli}} |
| `~/.cagent/memory/<config-name>/memory.db` | memory 工具集默认数据库 | docker-agent | {{docs-agent Memory}} |
| `~/.cagent/themes/<name>.yaml` | 自定义 TUI 主题 | docker-agent | {{docs-agent User settings}} |
| `<data-dir>/runs/<pid>.json` | --listen 启动运行的发现记录 | docker-agent | {{docs-agent features/cli}} |
| `~/Library/Caches/cagent/` | macOS 缓存目录 | docker-agent | {{help-agent docker-agent}} |
| `~/Library/Caches/cagent/sandbox-kits/<hash>` | run --sandbox 暂存 kit，以 agent 引用为键 | docker-agent | {{docs-agent Sandbox}} |
| 缓存目录下私有文件 | 缓存 Docker bearer token，文件名未记录 | docker-agent | {{docs-agent Secrets}} |
| `~/.codex/skills/`、`~/.claude/skills/`、`~/.agents/skills/`，及项目 `.claude/skills/`、`.github/skills/`、`.agents/skills/` | docker-agent 发现 SKILL.md 的目录 | docker-agent | {{docs-agent Sandbox}} |

改名后 docker-agent 目录仍叫 cagent（[冲突 C54](#s-ref-sources-and-the-conflicts-register)）。不会从插件时期 `~/.docker/sandboxes/`、`~/.sandboxd/` 迁移到 sbx 状态目录（[冲突 C17](#s-ref-sources-and-the-conflicts-register)）。

Sources: research/sources/probes/sbx-settings-list.txt, sbx-daemon-status.txt, sbx-diagnose.txt; capture/out/02-settings.json (the full descriptions of the four `ssh.*` keys, and the environment variables of the `ssh.*`, `model.providers`, and `platform.allowExperimentalFeatures` keys); research/sources/help-sbx.md (`sbx settings`, `sbx settings list`, `sbx settings set`, `sbx env`, `sbx env create`, `sbx mcp add`, `sbx kit builder history ls`); research/sources/docs-sandboxes.md (pages configuration/settings, configuration/environment-files, troubleshooting, governance/audit, workflows/agent-skills, the credentials and local model and GPU and network policy guides); research/sources/sbx-releases.md (v0.34.0); research/sources/help-docker-agent.md (root, `board`, `setup`, `share push`); research/sources/docs-docker-agent.md (pages features/cli, configuration/user-settings, configuration/hooks, configuration/tools, configuration/sandbox, features/sessions, guides/secrets, tools/memory, tools/shell); research/sources/docker-agent-CHANGELOG.md (v1.30.0, v1.74.0, v1.100.0, v1.102.0, v1.139.0, v1.147.0); research/conflicts-register.md rows C17, C18, C19, C20, C53, C54, C67
