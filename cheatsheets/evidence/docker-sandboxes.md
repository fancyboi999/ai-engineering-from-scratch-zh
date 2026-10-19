# 证据对照：Agent 的 Docker 沙箱

中文主题：[Agent 的 Docker 沙箱](../docker-sandboxes.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## 各组件运行位置

对应主题区块：**各组件运行位置**（`architecture`）。

来源文件：

- [`manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md`](../../manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md)
- [`manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md`](../../manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md)
- [`manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md`](../../manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md)
- [`manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md`](../../manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md)
- [`manuals/docker-sandboxes-101/sections/2-4-sandboxd-diagnose-and-reset.md`](../../manuals/docker-sandboxes-101/sections/2-4-sandboxd-diagnose-and-reset.md)

构建器核对的标识与数值：

- `sandboxd.sock`
- `gateway.docker.internal`

## 请求离开沙箱的过程

对应主题区块：**请求离开沙箱的过程**（`flow`）。

来源文件：

- [`manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md`](../../manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md)
- [`manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md`](../../manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md)
- [`manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md`](../../manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md)
- [`manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md`](../../manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 沙箱生命周期

对应主题区块：**沙箱生命周期**（`task-table`）。

来源文件：

- [`manuals/docker-sandboxes-101/capture/out/04-create.txt`](../../manuals/docker-sandboxes-101/capture/out/04-create.txt)
- [`manuals/docker-sandboxes-101/capture/out/07-template-save.txt`](../../manuals/docker-sandboxes-101/capture/out/07-template-save.txt)
- [`manuals/docker-sandboxes-101/capture/out/06-cp.txt`](../../manuals/docker-sandboxes-101/capture/out/06-cp.txt)
- [`manuals/docker-sandboxes-101/capture/out/05-ports.txt`](../../manuals/docker-sandboxes-101/capture/out/05-ports.txt)
- [`manuals/docker-sandboxes-101/capture/out/04-stop.txt`](../../manuals/docker-sandboxes-101/capture/out/04-stop.txt)
- [`manuals/docker-sandboxes-101/capture/out/04-prune.txt`](../../manuals/docker-sandboxes-101/capture/out/04-prune.txt)
- [`manuals/docker-sandboxes-101/capture/out/04-ls.txt`](../../manuals/docker-sandboxes-101/capture/out/04-ls.txt)
- [`manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md`](../../manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md)

构建器核对的标识与数值：

- `--name`
- `--publish`
- `--force`

## 密钥、MCP 与健康检查

对应主题区块：**密钥、MCP 与健康检查**（`task-table`）。

来源文件：

- [`manuals/docker-sandboxes-101/capture/out/10-set-custom.txt`](../../manuals/docker-sandboxes-101/capture/out/10-set-custom.txt)
- [`manuals/docker-sandboxes-101/capture/out/10-import-dry-run.txt`](../../manuals/docker-sandboxes-101/capture/out/10-import-dry-run.txt)
- [`manuals/docker-sandboxes-101/capture/out/11-mcp-add.txt`](../../manuals/docker-sandboxes-101/capture/out/11-mcp-add.txt)
- [`manuals/docker-sandboxes-101/capture/out/11-load.txt`](../../manuals/docker-sandboxes-101/capture/out/11-load.txt)
- [`manuals/docker-sandboxes-101/capture/out/02-daemon-status.txt`](../../manuals/docker-sandboxes-101/capture/out/02-daemon-status.txt)
- [`manuals/docker-sandboxes-101/capture/out/02-diagnose.txt`](../../manuals/docker-sandboxes-101/capture/out/02-diagnose.txt)
- [`manuals/docker-sandboxes-101/capture/out/07-template-save.txt`](../../manuals/docker-sandboxes-101/capture/out/07-template-save.txt)
- [`manuals/docker-sandboxes-101/capture/out/27-sandbox-run.txt`](../../manuals/docker-sandboxes-101/capture/out/27-sandbox-run.txt)

构建器核对的标识与数值：

- `--host`
- `--env`
- `--value`
- `--dry-run`
- `--url`
- `--sandbox`
- `--output`
- `--exec`

## 克隆模式往返

对应主题区块：**克隆模式往返**（`annotated-code`）。

来源文件：

- [`manuals/docker-sandboxes-101/capture/out/08-clone-create.txt`](../../manuals/docker-sandboxes-101/capture/out/08-clone-create.txt)
- [`manuals/docker-sandboxes-101/capture/out/08-clone-host.txt`](../../manuals/docker-sandboxes-101/capture/out/08-clone-host.txt)
- [`manuals/docker-sandboxes-101/capture/out/08-clone-rm.txt`](../../manuals/docker-sandboxes-101/capture/out/08-clone-rm.txt)
- [`manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md`](../../manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md)
- [`manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md`](../../manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md)

构建器核对的标识与数值：

- `--clone`
- `--name`
- `--force`

## 排查被阻止的主机

对应主题区块：**排查被阻止的主机**（`annotated-code`）。

来源文件：

- [`manuals/docker-sandboxes-101/capture/out/03-policy-init.txt`](../../manuals/docker-sandboxes-101/capture/out/03-policy-init.txt)
- [`manuals/docker-sandboxes-101/capture/out/09-create.txt`](../../manuals/docker-sandboxes-101/capture/out/09-create.txt)
- [`manuals/docker-sandboxes-101/capture/out/09-blocked-by-rule.txt`](../../manuals/docker-sandboxes-101/capture/out/09-blocked-by-rule.txt)
- [`manuals/docker-sandboxes-101/capture/out/09-policy-log.txt`](../../manuals/docker-sandboxes-101/capture/out/09-policy-log.txt)
- [`manuals/docker-sandboxes-101/capture/out/09-allow.txt`](../../manuals/docker-sandboxes-101/capture/out/09-allow.txt)
- [`manuals/docker-sandboxes-101/capture/out/09-rm-allow.txt`](../../manuals/docker-sandboxes-101/capture/out/09-rm-allow.txt)
- [`manuals/docker-sandboxes-101/capture/run.py`](../../manuals/docker-sandboxes-101/capture/run.py)

构建器核对的标识与数值：

- `--name`
- `--max-time`
- `example.com`
- `--sandbox`
- `--verbose`
- `--json`

## Agent 在内部看到什么

对应主题区块：**Agent 在内部看到什么**（`command-table`）。

来源文件：

- [`manuals/docker-sandboxes-101/capture/out/04-env.txt`](../../manuals/docker-sandboxes-101/capture/out/04-env.txt)
- [`manuals/docker-sandboxes-101/capture/out/10-env-sentinel.txt`](../../manuals/docker-sandboxes-101/capture/out/10-env-sentinel.txt)
- [`manuals/docker-sandboxes-101/capture/out/09-policy-log.txt`](../../manuals/docker-sandboxes-101/capture/out/09-policy-log.txt)
- [`manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md`](../../manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md)
- [`manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md`](../../manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md)

构建器核对的标识与数值：

- `gateway.docker.internal`
- `HTTPS_PROXY`
- `ANTHROPIC_API_KEY`
- `M101_RECV_KEY`
- `agent.sock`
- `SSH_AUTH_SOCK`
- `deny_kind`

## 默认值

对应主题区块：**默认值**（`defaults`）。

来源文件：

- [`manuals/docker-sandboxes-101/sections/r-1-sbx-commands.md`](../../manuals/docker-sandboxes-101/sections/r-1-sbx-commands.md)
- [`manuals/docker-sandboxes-101/sections/r-3-settings-keys-environment-variables-and-paths.md`](../../manuals/docker-sandboxes-101/sections/r-3-settings-keys-environment-variables-and-paths.md)

构建器核对的标识与数值：

- `--name`
- `<agent>-<workdir>`
- `--memory`
- `50%`
- `--pull`
- `always`
- `--skills`
- `readonly`
- `--refresh`
- `55m`
- `ssh.agentForwardingEnabled`
- `sandbox.disk.dockerVolume`
- `10g`
- `kit.allowedSources`
- `docker.io`
- `["docker.io/"]`

## 关键概念

对应主题区块：**关键概念**（`concepts`）。

来源文件：

- [`manuals/docker-sandboxes-101/sections/r-8-glossary-and-index-of-figures.md`](../../manuals/docker-sandboxes-101/sections/r-8-glossary-and-index-of-figures.md)
- [`manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md`](../../manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md)

构建器核对的标识与数值：

- `--clone`
- `--sandbox`

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`manuals/docker-sandboxes-101/capture/out/09-blocked.txt`](../../manuals/docker-sandboxes-101/capture/out/09-blocked.txt)
- [`manuals/docker-sandboxes-101/capture/out/05-ports-curl.txt`](../../manuals/docker-sandboxes-101/capture/out/05-ports-curl.txt)
- [`manuals/docker-sandboxes-101/capture/out/06-cp.txt`](../../manuals/docker-sandboxes-101/capture/out/06-cp.txt)
- [`manuals/docker-sandboxes-101/capture/out/09-deny-conflict.txt`](../../manuals/docker-sandboxes-101/capture/out/09-deny-conflict.txt)
- [`manuals/docker-sandboxes-101/capture/out/09-rm-allow.txt`](../../manuals/docker-sandboxes-101/capture/out/09-rm-allow.txt)
- [`manuals/docker-sandboxes-101/capture/out/07-template-save.txt`](../../manuals/docker-sandboxes-101/capture/out/07-template-save.txt)
- [`manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md`](../../manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md)
- [`manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md`](../../manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md)
- [`manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md`](../../manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md)
- [`manuals/docker-sandboxes-101/sections/2-4-sandboxd-diagnose-and-reset.md`](../../manuals/docker-sandboxes-101/sections/2-4-sandboxd-diagnose-and-reset.md)

构建器核对的标识与数值：

- `--sandbox`
- `example.com`
- `--id`
- `--json`

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md`](../../manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md)
- [`manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md`](../../manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md)
- [`manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md`](../../manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md)
- [`manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md`](../../manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md)
- [`manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md`](../../manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md`](../../manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md)
- [`manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md`](../../manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md)
- [`manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md`](../../manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md)
- [`manuals/docker-sandboxes-101/sections/2-4-sandboxd-diagnose-and-reset.md`](../../manuals/docker-sandboxes-101/sections/2-4-sandboxd-diagnose-and-reset.md)
- [`manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md`](../../manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md)

构建器核对的标识与数值：

- `--dry-run`
- `--sandbox`

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: cheatsheets/docker-sandboxes.md

Paths are relative to /private/tmp/aiefs-cheatsheets/manuals/docker-sandboxes-101/. S = sections/, O = capture/out/.

## Front matter
- pin sbx 0.47.0, docker-agent 1.149.0: manual.json lines 9-15

## What runs where (architecture, 8 nodes, 7 edges)
- sbx CLI talks to sandboxd over a socket: S/1-1:13, O/02-daemon-status.txt:3
- sandboxd.sock, daemon.log: O/02-daemon-status.txt:3-4, S/2-4:21-22
- Secret store, macOS Keychain: S/1-1:15, S/3-5:13
- microVM with own kernel and private Docker Engine: S/1-1:11, S/r-8:48 (concept only)
- agent user uid 1000: S/2-2:11
- forward proxy gateway.docker.internal:3128 via HTTPS_PROXY: S/3-4:19,33
- proxy swaps key after the request leaves the VM: S/1-1:15
- workspace virtiofs at same absolute path: S/2-1:11
- allowed hosts by policy rules: S/3-4:33 (both paths enforce policies)

## One request leaves the sandbox (flow, 7)
- 1: S/2-1 create listing lines 19-31 (image pull, created)
- 2: S/3-4:19,33
- 3: S/3-3:84 (deny wins), S/3-3:118 (implicit names no rule)
- 4: S/3-4:47-64 (403 inside TLS, approval body)
- 5: S/3-4:64-66 (forward-bypass after allow)
- 6: S/3-5:74 (swap of placeholder on bound host)
- 7: S/3-4:70,104 (one row per host, proxy_type, rule)

## Sandbox lifecycle (task-table, 7)
- create shell <path> --name: O/04-create.txt:1
- run --name re-attach: O/04-create.txt:34, S/2-1:58
- exec -u root sh -c: O/07-template-save.txt:1
- cp host to SANDBOX:PATH: O/06-cp.txt:1
- ports --publish 18081:8080: O/05-ports.txt:1
- stop keeps state: O/04-stop.txt:1-2
- prune --force: O/04-prune.txt:5

## Secrets, MCP and health (task-table, 7)
- secret set-custom --host --env --value: O/10-set-custom.txt:1
- secret import --dry-run: O/10-import-dry-run.txt:1
- mcp add --url: O/11-mcp-add.txt:1
- mcp load --sandbox: O/11-load.txt:1
- diagnose (13 checks): O/02-diagnose.txt:1, S/3-1:9 (13 checks, not in from; count also in O/02-diagnose.txt "13 passed")
- template save --output tar: O/07-template-save.txt:14
- docker-agent run --sandbox --exec: O/27-sandbox-run.txt:1

## Clone mode round trip (annotated-code, 6 lines)
- create --clone shell --name: O/08-clone-create.txt:1. source ro at /run/sandbox/source: O/08-clone-create.txt:17
- agent commits in clone: S/3-2:39, O/08-clone-commit.txt (via S/3-2)
- git -C remote -v shows sandbox-<name>: O/08-clone-host.txt:1
- git -C fetch sandbox-<name>: O/08-clone-host.txt:25, S/3-2:58-60
- rm --force removes VM, state, scoped secrets: O/08-clone-rm.txt:1, S/2-1:125

## Debug a blocked host (annotated-code, 9 lines)
- policy init balanced once: O/03-policy-init.txt:1
- create shell --name m101-policy, no mount: O/09-create.txt:1
- exec curl, Approval required: O/09-blocked-by-rule.txt:1 (command), Approval line in O/09-blocked.txt:12
- policy log: O/09-policy-log.txt:1,4 (forward, default deny)
- policy allow network --sandbox: O/09-allow.txt:1-2
- policy check network --sandbox --verbose --json: C/run.py:854

## What the agent sees inside (command-table, 7)
- HTTPS_PROXY: O/04-env.txt (proxy lines), S/3-4:19
- ANTHROPIC_API_KEY=proxy-managed: O/10-env-sentinel.txt:2
- M101_RECV_KEY=sbx-cs-<rand>: O/10-env-sentinel.txt:4
- SSH_AUTH_SOCK=/run/ssh-agent.sock, on by default: O/04-env.txt, S/3-5:80
- forward-bypass, no inspection: S/3-4:66,135
- transparent, no injection: S/3-4:135
- deny_kind explicit vs implicit: S/3-3:110,118

## Defaults (8)
- --name <agent>-<workdir>: S/r-1:21
- -m, --memory 50% of host memory, 512 MiB to 32 GiB: S/r-1:21
- --pull always: S/r-1:21
- --skills readonly: S/r-1:21
- secret set --refresh 55m: S/r-1:63
- ssh.agentForwardingEnabled true: S/r-3:35
- sandbox.disk.dockerVolume 10g: S/r-3:33
- kit.allowedSources ["docker.io/"]: S/r-3:17

## Key concepts (6)
- Sandbox: S/r-8:48. Clone mode: S/r-8:20. Preset: S/r-8:42. Policy scope: S/r-8:41. Sentinel: S/r-8:51
- Deny wins: S/3-3:84

## Troubleshooting (6)
- Approval required, no allow rule: O/09-blocked.txt:12, S/3-4:106
- ::1 exit 7, tcp4 default, publish /tcp: O/05-ports-curl.txt:5-8, S/2-2:72,115
- copying between sandboxes: O/06-cp.txt:62-65
- deny conflicts with allow, rm first: O/09-deny-conflict.txt:2, S/3-3:86, O/09-rm-allow.txt:1
- no key from ~/.zshrc, host env not read since v0.35.0: S/3-5:5,91
- ensure daemon error, daemon status, daemon.log: S/2-4:5,100

## Q&A (4)
- no Docker Desktop, sbx login, docker ps: S/1-1:11,13,126
- stop vs rm: S/2-1:110,125
- host allow passes any request, gist: S/3-4:112
- agent sees proxy-managed, proxy adds key after VM: S/1-1:15

## Tips (5)
- set at creation, re-attach ignores: S/2-1:94,182
- prune --dry-run first: S/2-1:183
- narrow rules with --sandbox: S/3-3:130
- secret set, never -e KEY: S/3-5:91
- bind custom secret to exact hosts: S/3-5:93
````
