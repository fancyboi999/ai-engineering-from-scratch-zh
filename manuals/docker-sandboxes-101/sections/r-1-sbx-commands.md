# sbx 命令

> sbx 0.47.0 在 `sbx --help` 四组中的全部动词，以及用途、关键 flags、作用域与详解章节。

根帮助列31命令，分 Sandbox、Management、Experimental、Other 四组 {{help-sbx sbx}}。随仓库保存的帮助树有115页，每个响应 --help 的命令/子命令一页。下表保留根帮助顺序。作用域指出经 `sandboxd` 运行的本地沙箱、经 `sbx --cloud` 运行的云沙箱或两者。`sbx --cloud --help` 隐藏 `daemon`、`prune`、`settings`、`skills`；`attach`、`ttl`、`volume` 仅云端（[冲突 C47](#s-ref-sources-and-the-conflicts-register)）。

三个 flags 适用于所有命令 {{help-sbx sbx}}。

| 全局 flag | 含义 |
|---|---|
| `--cloud` | 调用 Docker Cloud Sandboxes API 而非本地 `sandboxd` |
| `-D, --debug` | 开启调试日志 |
| `-h, --help` | 打印命令帮助 |

## 沙箱命令 {#s-ref-sbx-commands-sandbox-commands}

| 命令 | 用途 | 关键 flags | 作用域 | 章节 |
|---|---|---|---|---|
| `attach SANDBOX` | 连接终端到云沙箱；已停止时先启动 {{help-sbx sbx attach}} | `--detach-keys`（默认 `Ctrl-\`） | 仅云 | [§7.1](#s-sbx-cloud-run-move-and-ttl) |
| `cp SRC DST` | 宿主与沙箱之间复制文件或目录，一端写成 `SANDBOX:PATH` {{help-sbx sbx cp}} | `-L, --follow-link` | 本地与云 | [§2.2](#s-sbx-exec-cp-and-ports) |
| `create AGENT\|SANDBOX_KIT [PATH...]` | 为11种 agent 之一或 kit 引用创建沙箱，不连接 {{help-sbx sbx create}} | `--name`（默认 `<agent>-<workdir>`）、`--clone`、`--cpus`（0为自动）、`-m, --memory`（默认宿主50%，512 MiB至32 GiB）、`-e, --env`、`--env-file`、`--deny-network`、`-p, --publish`、`--pull always\|missing\|never`（默认 `always`）、`--skills off\|readonly\|readwrite`（默认 `readonly`）、`--static-mcp`、`-t, --template`、`--profile`、`--kit`（实验性）、`--kit-arg`、`--kit-args-file`、`-q` | 本地与云 | [§2.1](#s-sbx-run-create-stop-and-rm) |
| `create <agent> [PATH...]` | 八个同 flags 子命令 `claude`、`codex`、`cursor`、`devin`、`docker-agent`、`gemini`、`opencode`、`shell`；`cagent` 是 `docker-agent` 别名 {{help-sbx sbx create docker-agent}} | `create` 的 flags | 本地与云 | [§2.1](#s-sbx-run-create-stop-and-rm) |
| 带 `--cloud` 的 `create` | 创建无宿主工作区的云沙箱，未指定规格时2 CPU、4 GiB {{help-sbx sbx create}} | `--allow-network`、`--image-ref`、`--on-timeout stop\|restart\|delete`、`--platform`、`--ttl`、`-v, --volume`（实验性） | 仅云 | [§7.1](#s-sbx-cloud-run-move-and-ttl) |
| `exec SANDBOX COMMAND` | 在沙箱内执行命令，已停止时先启动 {{help-sbx sbx exec}} | `-i`、`-t`、`-u, --user`、`-w, --workdir`、`-e`、`--env-file`、`--privileged`、`--detach-keys`。不支持 `-d`；`--cloud` 拒绝 `-d`、`--user` 和 `--privileged` | 本地与云 | [§2.2](#s-sbx-exec-cp-and-ports) |
| `ls` | 列沙箱及 agent、状态、发布端口与工作区 {{help-sbx sbx ls}} | `--json`, `-q` | 本地与云 | [§2.1](#s-sbx-run-create-stop-and-rm) |
| `move SANDBOX` | 以文件系统镜像在宿主与云间迁移沙箱 {{help-sbx sbx move}} | `--to local\|cloud`、`--name`（默认 `moved-` 加源名称）、`--ttl`（15s至24h）、`--on-timeout stop\|delete`、`-f` | 本地与云 | [§7.1](#s-sbx-cloud-run-move-and-ttl) |
| `ports SANDBOX` | 列出、发布或取消发布端口 {{help-sbx sbx ports}} | `--publish`、`--unpublish`、`--json`；无协议端口绑定 `tcp4` | 本地与云 | [§2.2](#s-sbx-exec-cp-and-ports) |
| `prune` | 移除全部已停止沙箱及沙箱作用域密钥 {{help-sbx sbx prune}} | `--dry-run`, `--filter until=TIMESTAMP`, `-f`, `--json` | 仅本地 | [§2.1](#s-sbx-run-create-stop-and-rm) |
| `rm [SANDBOX...]` | 移除沙箱、容器、git worktree、状态与作用域密钥 {{help-sbx sbx rm}} | `--all`（`--cloud` 禁用）、`-f` | 本地与云 | [§2.1](#s-sbx-run-create-stop-and-rm) |
| `run [AGENT\|SANDBOX_KIT] [PATH...] [-- AGENT_ARGS...]` | 运行 agent，不存在时创建沙箱 {{help-sbx sbx run}} | `create` flags 加 `-d, --detached`、`--rm`、重连的 `--name`、`--new`（云）、`--detach-keys`（云）；`--clone` 仅创建时有效 | 本地与云 | [§2.1](#s-sbx-run-create-stop-and-rm) |
| `stop SANDBOX...` | 停止沙箱并保留状态 {{help-sbx sbx stop}} | 无 | 本地与云 | [§2.1](#s-sbx-run-create-stop-and-rm) |
| `ttl [+DURATION] SANDBOX` | 打印或延长云沙箱 TTL，不超过24小时上限 {{help-sbx sbx ttl}} | `--json` | 仅云 | [§7.1](#s-sbx-cloud-run-move-and-ttl) |

`run`、`create` 接受11种名称：claude、codex、copilot、cursor、devin、docker-agent、droid、gemini、kiro、opencode、shell {{help-sbx sbx run}}。只有八个 create 子命令，因为 copilot、droid、kiro 是公共 kit（[冲突 C9](#s-ref-sources-and-the-conflicts-register)）。

## 管理命令 {#s-ref-sbx-commands-management-commands}

| 命令 | 用途 | 关键 flags | 作用域 | 章节 |
|---|---|---|---|---|
| `daemon start` | 启动 `sandboxd` {{help-sbx sbx daemon start}} | `-d, --detach`, `--policy allow-all\|balanced\|deny-all` | 仅本地 | [§2.4](#s-sandboxd-diagnose-and-reset) |
| `daemon stop`, `daemon restart` | 停止或重启 `sandboxd` {{help-sbx sbx daemon}} | 无 | 仅本地 | [§2.4](#s-sandboxd-diagnose-and-reset) |
| `daemon status` | 打印守护进程状态、socket 与日志路径 {{help-sbx sbx daemon status}} | `--json` | 仅本地 | [§2.4](#s-sandboxd-diagnose-and-reset) |
| `daemon log-level set <target> <level>` | 设置 `proxy`、`general` 或 `all` 日志级别 {{help-sbx sbx daemon log-level set}} | 无 | 仅本地 | [§2.4](#s-sandboxd-diagnose-and-reset) |
| `diagnose` | 执行13项安装检查 {{help-sbx sbx diagnose}} | `--json`, `-o json\|github-issue`, `--upload` | 本地与云 | [§2.4](#s-sandboxd-diagnose-and-reset) 与 [§7.4](#s-kit-tck-diagnose-and-the-claims-this-manual-checked) |
| `mcp add <name> (--url \| --command)` | 从远程端点、registry URL、manifest URL、`dhi.io` 镜像或宿主命令注册 MCP 服务器 {{help-sbx sbx mcp add}} | `--url`, `--command`, `--args`, `--dir`, `--local`, `--header`, `--client-id`, `--oauth-authorization-server`, `--scope`, `--no-scope`, `--resource`, `--callback-port`, `--skip-auth`, `--skip-ssrf-check`, `--disable-http2` | 本地与云 | [§3.6](#s-sbx-mcp-add-load-and-static-mcp) |
| `mcp auth [server-name]` | 通过托管控制平面授权或重新授权远程服务器 {{help-sbx sbx mcp auth}} | `--all`, `--scope`, `--no-scope`, `--verbose`, `--format text\|json`, `--json` | 本地与云 | [§3.6](#s-sbx-mcp-add-load-and-static-mcp) |
| `mcp auth rm`, `mcp auth status` | 移除托管 OAuth 凭据，或不启动 OAuth 只显示状态 {{help-sbx sbx mcp auth status}} | `--all`、`-f`（仅 rm）、`--format`、`--json` | 本地与云 | [§3.6](#s-sbx-mcp-add-load-and-static-mcp) |
| `mcp inspect <name>` | 显示注册、headers 及有效 `resource` 值 {{help-sbx sbx mcp inspect}} | `--json` | 本地与云 | [§3.6](#s-sbx-mcp-add-load-and-static-mcp) |
| `mcp load <name> --sandbox S` | 向运行中沙箱添加注册服务器，向 agent 发 `tools/list_changed` {{help-sbx sbx mcp load}} | `--sandbox`（必需） | 本地与云 | [§3.6](#s-sbx-mcp-add-load-and-static-mcp) |
| `mcp ls` | 按网关列出注册服务器 {{help-sbx sbx mcp ls}} | `--json`, `-q` | 本地与云 | [§3.6](#s-sbx-mcp-add-load-and-static-mcp) |
| `mcp rm <name>` | 移除注册 {{help-sbx sbx mcp rm}} | `-f` | 本地与云 | [§3.6](#s-sbx-mcp-add-load-and-static-mcp) |
| `policy init <allow-all\|balanced\|deny-all>` | 首次沙箱前设置一次全局网络策略 {{help-sbx sbx policy init}} | `--sandbox`（仅云） | 本地与云 | [§3.3](#s-sbx-policy-init-allow-deny-and-check-network) |
| `policy allow network RESOURCES` | 为主机、域名、IP 或 CIDR 添加允许，默认 TCP {{help-sbx sbx policy allow network}} | `--sandbox`, `--protocol tcp\|udp` | 本地与云 | [§3.3](#s-sbx-policy-init-allow-deny-and-check-network) |
| `policy deny network RESOURCES` | 添加拒绝，默认 TCP/UDP，优先于允许 {{help-sbx sbx policy deny network}} | `--sandbox`, `--protocol tcp\|udp` | 本地与云 | [§3.3](#s-sbx-policy-init-allow-deny-and-check-network) |
| `policy check network TARGET` | 向守护进程授权器查询主机/端口是否允许，不发请求 {{help-sbx sbx policy check network}} | `--sandbox`, `--protocol`, `--verbose`, `--json` | 本地与云 | [§3.3](#s-sbx-policy-init-allow-deny-and-check-network) |
| `policy inspect <policy-or-rule>` | 显示一个策略或规则及 `RULE_ID`、移除命令 {{help-sbx sbx policy inspect}} | `--json` | 本地与云 | [§3.3](#s-sbx-policy-init-allow-deny-and-check-network) |
| `policy log [SANDBOX]` | 显示代理放行/阻止主机、规则、代理类型与计数 {{help-sbx sbx policy log}} | `--json`、`--limit`、`-q`、`--type all\|network\|filesystem`（尚不支持 filesystem 日志） | 本地与云 | [§3.4](#s-sbx-policy-log-and-the-proxy) |
| `policy ls [SANDBOX]` | 按策略列概览行，或列单沙箱规则 {{help-sbx sbx policy ls}} | `--wide`, `--json`, `--source local\|org\|kit`, `--decision allow\|deny`, `--type`, `--created-via default\|added\|provisioned\|approval`, `--profile`, `--protocol`, `--include-inactive` | 本地与云 | [§3.3](#s-sbx-policy-init-allow-deny-and-check-network) 与 [§7.2](#s-org-policies-profiles-and-the-audit-log) |
| `policy profile ls` | 列远程治理提供的 profiles {{help-sbx sbx policy profile ls}} | `--json`, `-q` | 本地与云 | [§7.2](#s-org-policies-profiles-and-the-audit-log) |
| `policy reset` | 删除本地策略存储并停止守护进程，或删除云账户策略 {{help-sbx sbx policy reset}} | `-f` | 本地与云 | [§3.3](#s-sbx-policy-init-allow-deny-and-check-network) |
| `policy rm network` | 按 `RULE_ID` 或资源移除规则 {{help-sbx sbx policy rm network}} | `--id`, `--resource`, `--sandbox`, `-f` | 本地与云 | [§3.3](#s-sbx-policy-init-allow-deny-and-check-network) |
| `reset` | 恢复全新安装状态，包括密钥和登录 {{help-sbx sbx reset}} | `-f`, `--preserve-secrets` | 仅本地 | [§2.4](#s-sandboxd-diagnose-and-reset) |
| `secret set [SERVICE]` | 存储13种服务之一的密钥、动态来源或 registry 凭据 {{help-sbx sbx secret set}} | `-t`、stdin、`--ref`、`--command`、`--refresh`（默认 `55m`）、`--no-verify`、`--show-error`、`--oauth`（本地仅 openai）、`--sandbox`、`-f`、`--registry`、`--username`、`--password-stdin`、`--registry-auth-endpoint`、`--all-sandboxes` | 本地与云 | [§3.5](#s-sbx-secret-set-import-and-set-custom) |
| `secret import [SERVICE]` | 导入宿主环境密钥，预览末四字符 {{help-sbx sbx secret import}} | `--all`, `--force`, `--dry-run` | 本地与云 | [§3.5](#s-sbx-secret-set-import-and-set-custom) |
| `secret ls` | 列全局与沙箱作用域存储的密钥 {{help-sbx sbx secret ls}} | `-g`, `--sandbox`, `--service`, `--json`, `-q` | 本地与云 | [§3.5](#s-sbx-secret-set-import-and-set-custom) |
| `secret rm [SERVICE]` | 移除密钥、registry 凭据或全部密钥 {{help-sbx sbx secret rm}} | `--sandbox`、`--all`、`--all-sandboxes`、`--registry`、`-f`；示例还有 flags 清单遗漏的 `--placeholder` | 本地与云 | [§3.5](#s-sbx-secret-set-import-and-set-custom) |
| `secret set-custom` | 为 sbx 未知服务存密钥，由代理替换占位值 {{help-sbx sbx secret set-custom}} | `--host`（可重复）、`--env`、`--value`、`-t`、`--command`、`--ref`、`--placeholder`（`{rand}` 后缀）、`--refresh`、`--sandbox`；仅云：`--header`、`--format`、`--name` | 本地与云，实验性 | [§3.5](#s-sbx-secret-set-import-and-set-custom) |
| `settings get <key>` | 打印一个求值结果 {{help-sbx sbx settings get}} | `--json` | 仅本地 | [§2.5](#s-sbx-settings-list) |
| `settings list` | 列全部设置的值、类型、来源、重启标志和说明 {{help-sbx sbx settings list}} | `--json`, `--no-trunc` | 仅本地 | [§2.5](#s-sbx-settings-list) 与 [R.3](#s-ref-settings-keys-environment-variables-and-paths) |
| `settings set <key> <value>`, `settings unset <key>` | 写入或移除用户覆盖值 {{help-sbx sbx settings set}} | 无 | 仅本地 | [§2.5](#s-sbx-settings-list) |
| `template save SANDBOX TAG` | 将快照保存到沙箱运行时镜像存储 {{help-sbx sbx template save}} | `-o, --output`（也导出 tar）、`--capture-mode disk\|all`（云）、`-d, --description`（云） | 本地与云 | [§2.3](#s-sbx-template-save-and-load) |
| `template load FILE [NAME]` | 将 tar 加载到镜像存储，或上传为云模板 {{help-sbx sbx template load}} | `--cpus` 与 `--memory-mib`（云必需，须匹配计费规格）、`--capture-mode`、`--description` | 本地与云 | [§2.3](#s-sbx-template-save-and-load) |
| `template ls`, `template rm TAG\|ID\|NAME` | 列出或移除模板镜像 {{help-sbx sbx template ls}} | `--json`, `-q`, `-f` | 本地与云 | [§2.3](#s-sbx-template-save-and-load) |
| `template inspect NAME\|ID` | 显示一个云模板的完整元数据 {{help-sbx sbx template inspect}} | `--json` | v1仅云 | [§2.3](#s-sbx-template-save-and-load) |
| `tui` | 打开交互仪表盘 {{help-sbx sbx tui}} | 无 | 本地与云 | [§1.1](#s-sbx-and-docker-agent) |
| `volume create\|inspect\|ls\|rm` | 管理持久云卷，沙箱退出时存为快照 {{help-sbx sbx volume}} | `--json`, `-q`, `-f` | 仅云 | [§7.1](#s-sbx-cloud-run-move-and-ttl) |

不带命令的 `sbx` 打开交互模式，`sbx tui` 按名称打开仪表盘（[冲突 C44](#s-ref-sources-and-the-conflicts-register)）{{help-sbx sbx}}。

## 实验性命令 {#s-ref-sbx-commands-experimental-commands}

下列命令帮助顶部均输出 `EXPERIMENTAL: this command may change or be removed in future releases.`，表示未来可能更改或移除 {{help-sbx sbx kit}}。

| 命令 | 用途 | 关键 flags | 作用域 | 章节 |
|---|---|---|---|---|
| `env create [PATH...]` | 配置 `sbxenv.yaml` 密钥与绑定并创建沙箱 {{help-sbx sbx env create}} | `-y, --auto-approve`, `--clone`, `--env-arg`, `--env-args-file`, `--kit-arg`, `--kit-args-file`, `--name`, `--skip-host-commands` | 本地与云，实验性 | [§4.4](#s-sbxenv-yaml-and-sbx-env-plan) |
| `env run [PATH...]` | 必要时创建，然后连接环境沙箱 {{help-sbx sbx env run}} | `env create` flags 加 `-d, --detached` | 本地与云，实验性 | [§4.4](#s-sbxenv-yaml-and-sbx-env-plan) |
| `env plan [PATH...]` | 打印应用文件的变化，不改变任何内容 {{help-sbx sbx env plan}} | `--clone`, `--env-arg`, `--kit-arg`, `--name`, `--skip-host-commands` | 本地与云，实验性 | [§4.4](#s-sbxenv-yaml-and-sbx-env-plan) |
| `env exec [PATH...] -- COMMAND` | 在环境沙箱运行命令 {{help-sbx sbx env exec}} | `exec` flags 加 `--env-arg`、`--env-args-file`、`--name` | 本地与云，实验性 | [§4.4](#s-sbxenv-yaml-and-sbx-env-plan) |
| `env rm [PATH...]` | 移除环境沙箱及其配置密钥 {{help-sbx sbx env rm}} | `-f`, `--prune-bindings`, `--env-arg`, `--name`, `--skip-host-commands` | 本地与云，实验性 | [§4.4](#s-sbxenv-yaml-and-sbx-env-plan) |
| `kit add SANDBOX REFERENCE` | 重建沙箱，在 kit 列表追加 mixin {{help-sbx sbx kit add}} | `--kit-arg`, `--kit-args-file` | 本地与云，实验性 | [§4.3](#s-sbx-kit-pack-push-sign-and-verify) |
| `kit builder status\|rm` | 显示或移除 `sbx-kit-builder` 沙箱及构建缓存 {{help-sbx sbx kit builder}} | `-f` (rm) | 本地，实验性 | [§4.3](#s-sbx-kit-pack-push-sign-and-verify) |
| `kit builder history export\|inspect\|logs\|ls\|rm\|trace` | 在 builder 内运行对应 `docker buildx history` {{help-sbx sbx kit builder history}} | 透传 | 本地，实验性 | [§4.3](#s-sbx-kit-pack-push-sign-and-verify) |
| `kit inspect REFERENCE` | 从目录、ZIP、OCI 引用或 git 仓库加载并显示 kit {{help-sbx sbx kit inspect}} | `--json`, `--kit-arg`, `--kit-args-file` | 本地与云，实验性 | [§4.2](#s-com-docker-sandbox-capabilities) |
| `kit pack DIRECTORY` | 验证 `spec.yaml` 目录并打包为 ZIP {{help-sbx sbx kit pack}} | `-o, --output`（默认 `<name>.zip`） | 本地与云，实验性 | [§4.3](#s-sbx-kit-pack-push-sign-and-verify) |
| `kit provenance REFERENCE` | 打印 OCI kit 的 SLSA 溯源，标为 `UNSIGNED` 或 `VERIFIED` {{help-sbx sbx kit provenance}} | `--key`, `--certificate-identity`, `--certificate-identity-regexp`, `--certificate-oidc-issuer`, `--certificate-oidc-issuer-regexp`, `--insecure-ignore-tlog`, `--json` | 本地与云，实验性 | [§4.3](#s-sbx-kit-pack-push-sign-and-verify) |
| `kit pull REFERENCE` | 从 HTTPS registry 拉取 v1 ZIP 或 v2 tar.gz kit {{help-sbx sbx kit pull}} | `-o, --output` | 本地与云，实验性 | [§4.3](#s-sbx-kit-pack-push-sign-and-verify) |
| `kit push DIRECTORY REFERENCE` | 打包并推送 `spec.yaml` kit，以 OCI referrer 附加 SLSA 溯源 {{help-sbx sbx kit push}} | `--sign`、`--key`、`--identity-token`、`--identity-token-file`、`--tlog-upload`（默认 `true`） | 本地与云，实验性 | [§4.3](#s-sbx-kit-pack-push-sign-and-verify) |
| `kit sign REFERENCE` | 以 cosign 兼容 Sigstore 签名签 kit，默认无密钥 {{help-sbx sbx kit sign}} | `--key`, `--identity-token`, `--identity-token-file`, `--tlog-upload` | 本地与云，实验性 | [§4.3](#s-sbx-kit-pack-push-sign-and-verify) |
| `kit validate REFERENCE` | 检查目录、ZIP 或 git 引用是否有效 kit {{help-sbx sbx kit validate}} | `--json`, `--kit-arg`, `--kit-args-file` | 本地与云，实验性 | [§4.3](#s-sbx-kit-pack-push-sign-and-verify) |
| `kit verify REFERENCE` | 验证目录、git 引用或 OCI kit 签名 {{help-sbx sbx kit verify}} | `--key`、四个 `--certificate-*` flags、`--insecure-ignore-tlog`、`--json` | 本地与云，实验性 | [§4.3](#s-sbx-kit-pack-push-sign-and-verify) |
| `setup` | 检测宿主环境 agent 密钥并导入接受项 {{help-sbx sbx setup}} | 无 | 本地，实验性 | [§3.5](#s-sbx-secret-set-import-and-set-custom) |
| `setup ssh`, `setup ssh remove` | 写入或移除让 `ssh <name>.sbx` 工作的 SSH 客户端配置 {{help-sbx sbx setup ssh}} | `--alias`（默认 `*.sbx`） | 本地，实验性 | [§2.4](#s-sandboxd-diagnose-and-reset) |
| `skills add <repository>` | 从 git 仓库或 `owner/repo` 简写安装 skills 到共享存储 {{help-sbx sbx skills add}} | `-s, --skill`, `-f` | 本地，实验性 | [§4.5](#s-sbx-skills-add-and-skills-true) |
| `skills import` | 从宿主六个 agent 目录导入 skills {{help-sbx sbx skills import}} | `--dry-run`, `-f` | 本地，实验性 | [§4.5](#s-sbx-skills-add-and-skills-true) |
| `skills ls`, `skills rm <skill>...`, `skills update [skill]...` | 列出、移除或刷新已安装 skills {{help-sbx sbx skills ls}} | `--json`, `-q`, `-f` | 本地，实验性 | [§4.5](#s-sbx-skills-add-and-skills-true) |

`sbx kit ls` 不是命令，探测报 `unknown command`（[冲突 C46](#s-ref-sources-and-the-conflicts-register)）。保存的六个 `kit builder history` 页是错误而非帮助：守护进程无法在录制沙箱下绑定 socket {{help-sbx sbx kit builder history ls}}。

## 其他命令 {#s-ref-sbx-commands-other-commands}

| 命令 | 用途 | 关键 flags | 作用域 | 章节 |
|---|---|---|---|---|
| `completion` | 生成 shell 自动补全脚本 {{help-sbx sbx}} | 帮助页未保存在树中 | 本地与云 | 无 |
| `help` | 任意命令的帮助 {{help-sbx sbx}} | 帮助页未保存在树中 | 本地与云 | 无 |
| `login` | 登录 Docker {{help-sbx sbx login}} | `--username`, `--password-stdin` | 本地与云 | [§1.1](#s-sbx-and-docker-agent) |
| `logout` | 停止运行中的本地沙箱并退出登录 {{help-sbx sbx logout}} | `-y, --yes` | 仅本地 | [§1.1](#s-sbx-and-docker-agent) |
| `version` | 打印 CLI 版本；--json 还打印服务器与运行时组件版本 {{help-sbx sbx version}} | `--json` | 本地与云 | [§2.4](#s-sandboxd-diagnose-and-reset) |

## 文本提到但树中没有的名称 {#s-ref-sbx-commands-names-that-appear-in-text-but-not-in-the-tree}

`secret set` 帮助提到 `sbx mount`；文档提到 `sbx ssh proxy`、`sbx policy approval`、`--model`、`--provider`、`--usb`（[冲突 C16](#s-ref-sources-and-the-conflicts-register)）。保存的树中都无页面。本手册仅记录 --help 打印内容，[§2.4](#s-sandboxd-diagnose-and-reset) 集中提到隐藏命令。每次 `sbx ... --help` 录制还尝试向 `login.docker.com:443` 建 TLS 连接，录制沙箱拒绝它，但打印文本未变（research/sources/help-sbx-cloud.md）。

Sources: research/sources/help-sbx.md (every `sbx` help page, 115 pages, sbx v0.47.0 0411f50ee4700fe7bd37e6e7e3aced563e850ca9); research/sources/help-sbx-cloud.md (`sbx --cloud --help` and the network note); research/sources/probes/sbx-kit-ls.txt, sbx-version.txt; research/conflicts-register.md rows C9, C16, C44, C46, C47; manual.json (section files and ids)
