# sbx settings list

> 每项设置有默认值、来源、用户覆盖值和重启标志，部分还有环境变量别名；`sbx settings list --json` 是唯一完整清单。

公司所有连接都走代理，你首次 `sbx run` 却拉不到模板。修复点是 `proxy` 设置。问题是在哪里设置、守护进程是否需重启、环境变量冲突时哪个值优先。读完后，你能解读一条 `sbx settings list --json` 记录、修改设置，并知道何时需要 `sbx daemon restart`。

## 一条记录 {#s-sbx-settings-list-one-record}

**设置：** 如 `proxy` 这样的键，有类型、默认值、求值结果和来源。录制 Mac 上 `sbx settings list --json` 输出31条记录，各含 `key`、`type`、`default`、`value`、`source` 和 `description`，部分有 `env_var` 或 `requires_restart`。来源有三种：“The SOURCE column shows where the value came from (default, envvar, or override)” {{help-sbx sbx settings list}}，即默认、环境变量或覆盖值。类型为 `bool`、`int`、`float`、`string` 或 `json`，`sbx settings set KEY VALUE` 按类型解析 {{help-sbx sbx settings set}}。31个键中13个没有 `env_var`，包括 `proxy`、`mcp.forceLocalGateway` 和 `skills.defaultMode`，它们不能由环境变量设置，只能用覆盖值。

```listing
title: 31条记录中的五条
source: capture/out/02-settings.json
lang: json
note: 按文件顺序仅保留 kit.trustedSigners、proxy、proxy.sandbox、skills.defaultMode 和 ssh.defaultAgent。
---
[
  …
  {
    "default": [
      {
        "identityRegexp": "^.*@docker\\.com$",
        "issuer": "https://accounts.google.com"
      }
    ],
    "description": "JSON array of trusted signer policies (key-based {\"key\":path} or keyless {\"issuer\":...,\"identity\":...}). Defaults to Docker employee identities (*@docker.com via https://accounts.google.com).",
    "env_var": "DOCKER_SANDBOXES_KIT_TRUSTED_SIGNERS",
    "key": "kit.trustedSigners",
    "source": "default",
    "type": "json",
    …
  },
  …
  {
    "default": "",
    "description": "Upstream proxy for sandbox, daemon, and supported CLI host egress (URL, PAC source, \"system\", or \"direct\"; empty = automatic: HTTP(S)_PROXY if set, otherwise the host OS proxy).",
    "key": "proxy",
    "requires_restart": true,
    "source": "default",
    "type": "string",
    "value": ""
  },
  …
  {
    "default": "",
    "description": "Upstream proxy for sandbox egress only (overrides proxy).",
    "env_var": "DOCKER_SANDBOXES_PROXY",
    "key": "proxy.sandbox",
    "requires_restart": true,
    "source": "default",
    "type": "string",
    "value": ""
  },
  …
  {
    "default": "readonly",
    "description": "Default for an omitted --skills flag or sbx.yaml `skills:` key: \"off\", \"readonly\", or \"readwrite\". Applies to sandboxes created after the change; existing sandboxes' mounts are never retroactively changed.",
    "key": "skills.defaultMode",
    "source": "default",
    "type": "string",
    "value": "readonly"
  },
  …
  {
    "default": "shell",
    "description": "Built-in agent used for SSH auto-created sandboxes.",
    "env_var": "DOCKER_SANDBOXES_SSH_DEFAULT_AGENT",
    "key": "ssh.defaultAgent",
    "requires_restart": true,
    "source": "default",
    "type": "string",
    "value": "shell"
  },
  …
]
```

`proxy` 记录展示值的形态。它接受 URL、PAC 来源、`system` 或 `direct`；空字符串表示自动：已设置则用 `HTTP(S)_PROXY`，否则用宿主操作系统代理。`proxy.sandbox` 只针对沙箱出站流量，且有环境变量别名 `DOCKER_SANDBOXES_PROXY`。

## 优先级与重启 {#s-sbx-settings-list-precedence-and-restart}

“Environment variables take precedence over user overrides” {{help-sbx sbx settings set}}，环境变量高于用户覆盖值，所以导出的 `DOCKER_SANDBOXES_PROXY` 优先于 `sbx settings set proxy.sandbox`。组织约束又高于两者：“Administrator constraints apply to saved overrides. A conflicting value is rejected” {{help-sbx sbx settings set}}，保存覆盖值须符合管理员约束，冲突值被拒绝。`sbx settings unset KEY` 移除覆盖值，但“Administrator policy remains in effect” {{help-sbx sbx settings unset}}，管理员策略仍有效。随后“the setting evaluates from its environment variable, remote default, or built-in default” {{help-sbx sbx settings unset}}，从环境变量、远程默认值或内置默认值求值；远程默认值是 SOURCE 列未列出的第四种来源。

“Most changes take effect within about five seconds” {{help-sbx sbx settings}}，多数变更约五秒内生效，其余需 `sbx daemon restart`。表格的 RESTART 列标出这些项，页脚说明谁需要重启。

```listing
title: 设置表下的两条说明
source: capture/out/02-settings.txt
lang: text
note: 仅保留表格后的两行。
---
Some fields were truncated; use --no-trunc or --json to see them in full.

RESTART=yes: existing daemon-side consumers require `sbx daemon restart`. Supported CLI clients and new sandboxes use their current proxy settings immediately.
```

录制 Mac 上15个键带有 `"requires_restart": true`：四个 `proxy*`、三个 `no_proxy*`、六个 `ssh.*`、`tls.allowNegativeSerial` 和 `mcp.forceLocalGateway`。另外16个在五秒内生效。部分如 `skills.defaultMode` 与 `sandbox.disk.dockerVolume` 的说明指出，只有变更后新建的沙箱才使用新值。

## CLI 与文档的分歧 {#s-sbx-settings-list-where-the-cli-and-the-docs-disagree}

文档设置页与 CLI 列出的键不同，[设置表](#s-ref-settings-keys-environment-variables-and-paths) 只列 CLI 返回的键。四个键在 CLI 中却不在文档：`ssh.autoCreate`、默认 `shell` 的 `ssh.defaultAgent`、`ssh.defaultTemplate` 和 `ssh.workspaceRoot`，见[冲突 C20](#s-ref-sources-and-the-conflicts-register)。另四个在文档却不在 CLI 输出：`feature.model`、`feature.sandbox-gpu`、`feature.udp-egress` 和 `diagnostics.autoUploadErrorCooldownInDays`，见[冲突 C19](#s-ref-sources-and-the-conflicts-register)。最后一个文档默认值是1 {{docs-sbx diagnostics.autoUploadErrorCooldownInDays}}。录制只对 `skills.defaultMode` 和 `kit.allowedSources` 执行 `sbx settings get`，所以 `get` 对 `feature.*` 的响应仍未知。

还有一个默认值冲突。文档要求使用 `feature.model` 前先执行 `sbx settings set platform.allowExperimentalFeatures true` {{docs-sbx Enable model selection}}，暗示默认 `false`。录制却显示 `true`，来源为 `default`，见[冲突 C18](#s-ref-sources-and-the-conflicts-register)。

```listing
title: CLI 报告的实验标志
source: capture/out/02-settings-experimental.json
lang: json
note: 未截去任何内容。
---
{
  "default": true,
  "description": "Allow experimental features.",
  "env_var": "DOCKER_SANDBOXES_ALLOW_EXPERIMENTAL_FEATURES",
  "key": "platform.allowExperimentalFeatures",
  "source": "default",
  "type": "bool",
  "value": true
}
```

命令也有同样缺口。`model.providers` 说明提到 `sbx run --model <model> --provider <id>`，文档展示 `sbx run --name <SANDBOX_NAME> --model <MODEL_NAME> --provider <PROVIDER_ID>` {{docs-sbx configuration/models}}，但 v0.47.0 的 `sbx run --help` 没有这两个 flags。secret 帮助提到“mounts added later with sbx mount” {{help-sbx sbx secret set}}，即后来用 sbx mount 加入的挂载，帮助树却没有 `sbx mount` 页。[冲突 C16](#s-ref-sources-and-the-conflicts-register) 所列来源提到 `sbx ssh proxy`、`sbx policy approval` 和 `--usb`，它们也没有帮助页。本手册只记录 `--help` 输出的内容，[命令表](#s-ref-sbx-commands) 即此清单。

## kit 默认值 {#s-sbx-settings-list-the-kit-defaults}

六个 `kit.*` 键决定沙箱接受哪些 kit，来源都显示 `default`。`kit.allowedSources` 为 `["docker.io/"]`；`kit.allowLocalKits` 与 `kit.allowExtractedAgents` 为 `true`。`kit.requireSignature` 和 `kit.ignoreTransparencyLog` 为 `false`；`kit.trustedSigners` 通过 `https://accounts.google.com` 信任任何 `@docker.com` 身份。[kit 签名](#s-sbx-kit-pack-push-sign-and-verify) 展示签名检查如何使用这些值。

```takeaways
- 读 `sbx settings list --json`；表格会截断值，文档列出的键也不同。
- 只有需要优先于每次 `sbx settings set` 时，才导出环境变量别名。
- 改动任何 `proxy*`、`no_proxy*`、`ssh.*`、`tls.*` 或 `mcp.forceLocalGateway` 后运行 `sbx daemon restart`。
- 相信文档默认值之前，先查 `sbx settings get --json KEY`。
```

Sources: help-sbx sbx settings, sbx settings list, sbx settings set, sbx settings unset, sbx secret set (research/sources/help-sbx.md); docs-sbx configuration/settings, configuration/models (research/sources/docs-sandboxes.md); conflicts C16, C18, C19, C20 (research/conflicts-register.md); research/sources/probes/sbx-settings-list.txt; capture/out/02-settings.json, 02-settings.txt, 02-settings-get.txt, 02-settings-experimental.json
