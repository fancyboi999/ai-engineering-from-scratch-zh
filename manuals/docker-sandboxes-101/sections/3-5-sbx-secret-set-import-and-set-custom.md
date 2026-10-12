# sbx secret set、sbx secret import 与 sbx secret set-custom

> 密钥不进入 VM：agent 看到哨兵值，宿主钥匙串保存真实值，代理向绑定主机发请求时才替换。

你照着2026年的教程在 `~/.zshrc` 导出 `ANTHROPIC_API_KEY`，沙箱内 agent 仍没有密钥。自 v0.35.0 起不再读取宿主环境 {{rel-sbx v0.35.0}}（[冲突 C7](#s-ref-sources-and-the-conflicts-register)）。`-e KEY` 传入普通变量，不是密钥；三个 `sbx secret` 命令才是入口。

读完本节，你能存储服务密钥、将自定义密钥绑定主机，并读取代理实际发送的内容。

## 服务密钥 {#s-sbx-secret-set-import-and-set-custom-service-secrets}

**服务密钥：** 存在13个服务名称之一下的值：`anthropic, copilot, cursor, devin, droid, github, google, groq, mistral, nebius, openai, openrouter, xai` {{help-sbx sbx secret set}}，比文档表多两个（[冲突 C21](#s-ref-sources-and-the-conflicts-register)）。值来自 `-t`、stdin、`--command`，或 `--ref` 指定的 1Password `op://` 引用或 AWS Secrets Manager ARN。`--oauth` 是第五种来源，本地仅“openai/global only” {{help-sbx sbx secret set}}（[冲突 C22](#s-ref-sources-and-the-conflicts-register)）。Anthropic OAuth 来自 agent 自己登录。自 v0.46.0，命令 helper “from a fresh temporary directory on the host” {{help-sbx sbx secret set}}，从宿主新建临时目录运行，因此相对 helper 路径不再解析（[冲突 C38](#s-ref-sources-and-the-conflicts-register)）。`--refresh` 设置缓存时间，默认55分钟。

默认全局作用域，`--sandbox` 可收窄。`secret ls` 用 `-g`、`--sandbox`、`--service` 与 `--json` 过滤；`secret rm` 接受 `--all`、`--placeholder` 和 `--registry` {{help-sbx sbx secret rm}}。存储是 macOS Keychain、Windows Credential Manager 或 Linux Secret Service {{docs-sbx Where secrets are stored}}。没有 keyring 时，Linux 使用 `~/.config/com.docker.sandboxes` 下权限为 `0700` 的文件。kit 批准与真实值分开，存于 `~/.config/sbx/credentials.yaml` {{docs-sbx Credential bindings}}。

**secret import：** 一次读取宿主环境，逐变量展示末四位预览，接受 `--all`、`--force` 和 `--dry-run` {{help-sbx sbx secret import}}。已有 OAuth token 的服务会跳过。录制宿主没有导出任何值：

```listing
title: 无内容可导入的 import
source: capture/out/10-import-dry-run.txt
lang: text
---
$ sbx secret import --dry-run
No credential env vars detected on the host. Set e.g. OPENAI_API_KEY in your shell and re-run, or use `sbx secret set` to enter a value directly.
```

registry 凭据是第三种，默认“host-only by default”，仅宿主可用；只有 `--all-sandboxes` 或 `--sandbox` 才传到沙箱 {{help-sbx sbx secret set}}。

## agent 看到什么 {#s-sbx-secret-set-import-and-set-custom-what-the-agent-sees}

沙箱内每个服务变量都是哨兵值，GitHub 的外形像 token：

```listing
title: m101-demo 环境中的哨兵值
source: capture/out/04-env.txt
lang: text
note: 非哨兵值或凭据模式的行均已截去。
---
ANTHROPIC_API_KEY=proxy-managed
…
GH_TOKEN=gho_sbxproxymanaged000000000000000000000
…
OPENAI_API_KEY=proxy-managed
…
SBX_CRED_ANTHROPIC_MODE=none
SBX_CRED_GITHUB_MODE=none
```

v0.47.0 有三种格式（[冲突 C35](#s-ref-sources-and-the-conflicts-register)）：八个 provider 密钥用 `proxy-managed`，`GH_TOKEN` 用 `gho_sbxproxymanaged000000000000000000000`，自定义密钥用 `sbx-cs-<rand>`。GitHub 值是小写，而 2026-09-04 的演示为 `GHO_SBX_PROXY_MANAGED` {{talk 2026-09-04 T02}}。没有录制 GitHub 请求，因为需要真实 token。

## 自定义密钥与接收器 {#s-sbx-secret-set-import-and-set-custom-custom-secrets-and-the-receiver}

**set-custom：** 实验性密钥，以 `--host` 目标和 `--env` 名称为键，而非服务 {{help-sbx sbx secret set-custom}}。值来自 `--value`、`--command` 或 `--ref`，`--placeholder sk-{rand}` 设定前缀。`--header` 和 `--format` 仅适用于 `--cloud`，帮助逐项说明（[冲突 C34](#s-ref-sources-and-the-conflicts-register)）。录制将 `M101_RECV_KEY` 绑定 `host.docker.internal` 和 `localhost`，在宿主 `127.0.0.1:18080` 启动接收器，为 `m101-secret` 放行 `localhost:18080`，内部看到 `M101_RECV_KEY=sbx-cs-<rand>`（capture/out/10-env-sentinel.txt）。随后发送三个普通 HTTP 请求：

```listing
title: 宿主接收器记录的内容
source: capture/out/10-receiver.log
lang: text
note: 将占位值作为字面量输入的第二个请求已截去；结果与第一个相同。
---
GET /from-variable HTTP/1.1
Host: localhost:18080
User-Agent: curl/8.18.0
Accept: */*
Authorization: Bearer m101-dummy-receiver-0000
X-Demo: m101-dummy-receiver-0000
Accept-Encoding: gzip
…
GET /no-scheme HTTP/1.1
Host: localhost:18080
…
Authorization: m101-dummy-receiver-0000
```

占位值出现的每个位置，接收器都看到真实值：`Bearer` 内、`X-Demo` 内，以及完整 `Authorization` 值。`Host` 是 `localhost:18080`，因为代理把 `host.docker.internal` 映射到 `localhost` {{docs-sbx Accessing host services from a sandbox}}。因此普通 HTTP 也发生替换，且为子串替换。这解决了自定义密钥的[冲突 C34](#s-ref-sources-and-the-conflicts-register)。Hacker News 所说密钥必须占据整个 header，描述的是服务密钥，header 及格式由 kit 声明 {{docs-sbx Services declared by kits}}。

第四个请求发往 `NO_PROXY` 中的 `gateway.docker.internal:18080`，绕过正向代理。透明代理以 `Empty reply from server` 阻止它，没有替换（capture/out/10-swap-curl.txt）。[图](#fig-3-6) 动画展示四步。已有沙箱 `m101-demo` 没收到 `M101_RECV_KEY`（capture/out/10-env-existing.txt），所以自定义变量只到新沙箱。移除立即生效：`sbx secret rm --placeholder sbx-cs-<rand> -f` 输出 `Applied secret updates for <n> running sandbox(es)`（capture/out/10-secret-rm.txt）。

## SSH agent {#s-sbx-secret-set-import-and-set-custom-the-ssh-agent}

有一条凭据路径确实跨越边界：“SSH agent forwarding is enabled by default” {{docs-sbx Credential isolation}}，默认开启 SSH agent 转发；客户机显示 `SSH_AUTH_SOCK=/run/ssh-agent.sock` 与 `SSH_AUTH_SOCK_GATEWAY=gateway.docker.internal:3129`（capture/out/04-env.txt）。密钥留在宿主，内部任何进程可请求签名。在 `sbx settings list` 中关闭 `ssh.agentForwardingEnabled` 后执行 `sbx daemon restart` {{docs-sbx SSH agent}}。MCP 密钥也留在宿主，键为 `mcp:<server>:client_secret`，见 [sbx mcp add](#s-sbx-mcp-add-load-and-static-mcp)。

```figure
id: fig-3-6
kind: sequence
title: 自定义密钥从钥匙串到接收器
claim: 沙箱始终只有 sbx-cs-<rand>；正向代理对绑定主机替换为存储值，直连不会替换。
caption: 从上向下读。生命线依次是 sbx CLI、密钥存储、m101-secret、正向代理与 127.0.0.1:18080 接收器。青绿色实线是存储写入，玫红虚线是透明代理阻止的直连。来源为 capture/out/10-set-custom.txt、10-env-sentinel.txt、10-swap-curl.txt 和 10-receiver.log。
```

```takeaways
- 用 `sbx secret set` 或 `sbx secret import` 存密钥，不用 `-e KEY`。
- 内部应看到 `proxy-managed` 或 `sbx-cs-<rand>`；用宿主接收器测试绑定。
- 将自定义密钥绑定精确主机；代理会替换请求任意位置的占位值。
- 不允许 agent 用你的密钥签名时，关闭 `ssh.agentForwardingEnabled`。
```

Sources: help-sbx sbx secret, sbx secret set, sbx secret import, sbx secret ls, sbx secret rm, sbx secret set-custom (research/sources/help-sbx.md); docs-sbx Manage credentials, Isolation layers, Usage (research/sources/docs-sandboxes.md); rel-sbx v0.35.0, v0.46.0 (research/sources/sbx-releases.md); research/conflicts-register.md rows C7, C21, C22, C34, C35, C38; talk T02 (2026-09-04), HN01 (2026-08-10) from research/plan.md; capture/out/04-env.txt, 10-set-custom.txt, 10-secret-ls.json, 10-env-existing.txt, 10-secret-create.txt, 10-env-sentinel.txt, 10-swap-curl.txt, 10-receiver.log, 10-policy-log.json, 10-placeholder.txt, 10-import-dry-run.txt, 10-secret-rm.txt
