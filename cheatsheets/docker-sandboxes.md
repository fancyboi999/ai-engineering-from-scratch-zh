---
id: docker-sandboxes
title: Agent 的 Docker 沙箱
subtitle: 在 microVM 中运行 agent，控制网络与密钥并取回提交。基于 sbx 0.47.0、docker-agent 1.149.0。
hue: 210
sources: manuals/docker-sandboxes-101
code: DS
source_hash: e44b4e9908d4e31b
---

## 各组件运行位置
type: architecture
from: manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md, manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md, manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md, manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md, manuals/docker-sandboxes-101/sections/2-4-sandboxd-diagnose-and-reset.md

```arch
node | cli | 1,1 | sbx CLI | 宿主机
node | daemon | 2,1 | sandboxd | sandboxd.sock, daemon.log
node | keys | 3,1 | 密钥存储 | macOS Keychain
node | vm | 1,2 | 沙箱 microVM | 独立内核与 Docker Engine
node | agent | 2,2 | Agent | 用户 agent，uid 1000
node | proxy | 3,2 | 正向代理 | gateway.docker.internal:3128
node | ws | 1,3 | 工作区 | virtiofs，相同绝对路径
node | net | 3,3 | 允许的主机 | 策略规则
edge | cli | daemon | socket
edge | daemon | vm | 启动
edge | vm | agent | 运行
edge | agent | proxy | HTTPS_PROXY
edge | keys | proxy | 替换
edge | proxy | net | 允许
edge | vm | ws | 挂载
```

## 请求离开沙箱的过程
type: flow
from: manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md, manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md, manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md, manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md

1. **sbx create**：sandboxd 拉取模板并启动 microVM。
2. **Agent**：向宿主机正向代理发送请求。
3. **授权器**：匹配的拒绝规则优先。未匹配允许规则则隐式拒绝。
4. **阻止**：代理在 TLS 内返回 403 与 "Approval required"。
5. **允许**：代理以 `forward-bypass` 隧道连接主机。
6. **绑定密钥**：代理将哨兵占位符替换为已存储密钥。
7. **policy log**：每个主机一行，包含代理类型与规则。

## 沙箱生命周期
type: task-table
from: manuals/docker-sandboxes-101/capture/out/04-create.txt, manuals/docker-sandboxes-101/capture/out/07-template-save.txt, manuals/docker-sandboxes-101/capture/out/06-cp.txt, manuals/docker-sandboxes-101/capture/out/05-ports.txt, manuals/docker-sandboxes-101/capture/out/04-stop.txt, manuals/docker-sandboxes-101/capture/out/04-prune.txt, manuals/docker-sandboxes-101/capture/out/04-ls.txt, manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md

| 任务 | 代码 |
|---|---|
| 基于仓库创建 | `sbx create shell <path> --name <name>` |
| 再次连接 | `sbx run --name <name>` |
| 以 root 运行命令 | `sbx exec -u root <name> sh -c '<cmd>'` |
| 复制文件进入沙箱 | `sbx cp <host-file> <name>:/tmp/in.txt` |
| 发布端口 | `sbx ports <name> --publish 18081:8080` |
| 停止并保留状态 | `sbx stop <name>` |
| 移除已停止的沙箱 | `sbx prune --force` |

## 密钥、MCP 与健康检查
type: task-table
from: manuals/docker-sandboxes-101/capture/out/10-set-custom.txt, manuals/docker-sandboxes-101/capture/out/10-import-dry-run.txt, manuals/docker-sandboxes-101/capture/out/11-mcp-add.txt, manuals/docker-sandboxes-101/capture/out/11-load.txt, manuals/docker-sandboxes-101/capture/out/02-daemon-status.txt, manuals/docker-sandboxes-101/capture/out/02-diagnose.txt, manuals/docker-sandboxes-101/capture/out/07-template-save.txt, manuals/docker-sandboxes-101/capture/out/27-sandbox-run.txt

| 任务 | 代码 |
|---|---|
| 将密钥绑定到主机 | `sbx secret set-custom --host <host> --env <VAR> --value <value>` |
| 查找宿主机环境中的密钥 | `sbx secret import --dry-run` |
| 注册 MCP 服务 | `sbx mcp add <name> --url <url>` |
| 将其加载到沙箱 | `sbx mcp load <name> --sandbox <sandbox>` |
| 运行 13 项检查 | `sbx diagnose` |
| 保存模板 | `sbx template save <name> <tag> --output <file>.tar` |
| 在沙箱中运行 agent 文件 | `docker-agent run --sandbox --exec <agent-file> '<prompt>'` |

## 克隆模式往返
type: annotated-code
lang: bash
from: manuals/docker-sandboxes-101/capture/out/08-clone-create.txt, manuals/docker-sandboxes-101/capture/out/08-clone-host.txt, manuals/docker-sandboxes-101/capture/out/08-clone-rm.txt, manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md, manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md

```bash
sbx create --clone shell <repo> \  # 私有克隆，宿主机仓库只读
  --name <name>  # 源码位于 /run/sandbox/source
sbx exec <name> sh -c '<edit and git commit>'  # agent 在克隆中提交
git -C <repo> remote -v  # sbx 已添加 sandbox-<name>
git -C <repo> fetch sandbox-<name>  # 取回提交
sbx rm --force <name>  # 删除 VM、状态与范围内密钥
```

## 排查被阻止的主机
type: annotated-code
lang: bash
from: manuals/docker-sandboxes-101/capture/out/03-policy-init.txt, manuals/docker-sandboxes-101/capture/out/09-create.txt, manuals/docker-sandboxes-101/capture/out/09-blocked-by-rule.txt, manuals/docker-sandboxes-101/capture/out/09-policy-log.txt, manuals/docker-sandboxes-101/capture/out/09-allow.txt, manuals/docker-sandboxes-101/capture/out/09-rm-allow.txt, manuals/docker-sandboxes-101/capture/run.py

```bash
sbx policy init balanced  # 首次创建沙箱前执行一次
sbx create shell --name m101-policy  # 不挂载工作区
sbx exec m101-policy sh -c \
  'curl -sS --max-time 10 https://example.com'  # Approval required
sbx policy log m101-policy  # forward，默认拒绝
sbx policy allow network \
  --sandbox m101-policy example.com  # 仅作用于一个沙箱的规则
sbx policy check network example.com \
  --sandbox m101-policy --verbose --json  # 读取 allowed 与 rule
```

## Agent 在内部看到什么
type: command-table
from: manuals/docker-sandboxes-101/capture/out/04-env.txt, manuals/docker-sandboxes-101/capture/out/10-env-sentinel.txt, manuals/docker-sandboxes-101/capture/out/09-policy-log.txt, manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md, manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md

| 命令 | 作用 |
|---|---|
| `HTTPS_PROXY=http://gateway.docker.internal:3128` | HTTP 与 HTTPS 的正向代理 |
| `ANTHROPIC_API_KEY=proxy-managed` | 哨兵占位符，真实密钥留在宿主机 |
| `M101_RECV_KEY=sbx-cs-<rand>` | 自定义密钥占位符 |
| `SSH_AUTH_SOCK=/run/ssh-agent.sock` | 宿主机 SSH agent，默认转发 |
| `forward-bypass` | 日志中的代理类型，隧道透传，不检查内容 |
| `transparent` | 日志中的代理类型，其他 TCP，不注入内容 |
| `"deny_kind": "explicit"` | 规则明确拒绝，`implicit` 表示缺少允许规则 |

## 默认值
type: defaults
from: manuals/docker-sandboxes-101/sections/r-1-sbx-commands.md, manuals/docker-sandboxes-101/sections/r-3-settings-keys-environment-variables-and-paths.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `--name` | `<agent>-<workdir>` | 显式设置以区分两个 agent |
| `-m, --memory` | 宿主机内存的 50% | 限制在 512 MiB 至 32 GiB |
| `--pull` | `always` | 也支持 `missing` 或 `never` |
| `--skills` | `readonly` | 也支持 `off` 或 `readwrite` |
| `secret set --refresh` | `55m` | 动态来源的刷新间隔 |
| `ssh.agentForwardingEnabled` | `true` | 对不信任的 agent 关闭 |
| `sandbox.disk.dockerVolume` | `10g` | `/var/lib/docker` 大小 |
| `kit.allowedSources` | `["docker.io/"]` | 允许的远程工具包来源 |

## 关键概念
type: concepts
from: manuals/docker-sandboxes-101/sections/r-8-glossary-and-index-of-figures.md, manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md

- **沙箱**：拥有独立内核和私有 Docker Engine 的 microVM。
- **克隆模式**：`--clone`，agent 在私有克隆中工作，通过 remote 取回提交。
- **预设**：`allow-all`、`balanced` 或 `deny-all`，通过 `sbx policy init` 设置一次。
- **策略范围**：`global` 作用于全部沙箱，`--sandbox` 仅作用于一个沙箱。
- **拒绝优先**：对于相同主机，拒绝规则优先于允许规则。
- **哨兵**：agent 看到的密钥占位符。

## 故障排查
type: troubleshooting
from: manuals/docker-sandboxes-101/capture/out/09-blocked.txt, manuals/docker-sandboxes-101/capture/out/05-ports-curl.txt, manuals/docker-sandboxes-101/capture/out/06-cp.txt, manuals/docker-sandboxes-101/capture/out/09-deny-conflict.txt, manuals/docker-sandboxes-101/capture/out/09-rm-allow.txt, manuals/docker-sandboxes-101/capture/out/07-template-save.txt, manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md, manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md, manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md, manuals/docker-sandboxes-101/sections/2-4-sandboxd-diagnose-and-reset.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `Approval required for example.com:443.` | 没有匹配的允许规则 | `sbx policy allow network --sandbox <name> <host>` |
| curl 访问 `::1` 以状态码 7 失败 | 端口按 `tcp4` 发布 | 用 `8080/tcp` 同时支持两个地址族 |
| `copying between sandboxes is not supported` | `cp` 要求一端是宿主机 | 通过宿主机中转 |
| 拒绝规则提示 `conflicts with existing allow rule` | 同范围内存在允许和拒绝 | 先执行 `sbx policy rm network --id <uuid>` |
| 未从 `~/.zshrc` 获取 API key | v0.35.0 起不再读取宿主机环境 | 使用 `sbx secret set` 或 `sbx secret import` |
| `ensure daemon: daemon exited unexpectedly` | sandboxd 问题 | 执行 `sbx daemon status --json`，读取 `daemon.log` |

## 问答
type: qa
from: manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md, manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md, manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md, manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md, manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md

- **需要 Docker Desktop 吗？** 不需要，但需要 `sbx login`。Agent 容器不会出现在宿主机的 `docker ps` 中。
- **用 stop 还是 rm？** `sbx stop` 保留状态，`sbx rm` 删除沙箱、状态与范围内密钥。
- **允许主机能阻止 gist 上传吗？** 不能，主机允许规则放行任意方法、路径和请求体。
- **Agent 能看到我的密钥吗？** 不能，它看到 `proxy-managed`，代理在 VM 外添加真实密钥。

## 提示
type: tips
from: manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md, manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md, manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md, manuals/docker-sandboxes-101/sections/2-4-sandboxd-diagnose-and-reset.md, manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md

- 创建时设置内存、端口、技能和静态 MCP 服务，重新连接时这些参数会被忽略。
- 清理前先执行 `sbx prune --dry-run`。
- 用 `--sandbox` 添加窄范围规则，全局规则仅用于所有 agent 都需要的主机。
- 使用 `sbx secret set` 存储密钥，不要使用 `-e KEY`。
- 自定义密钥绑定到精确主机，代理会替换内容中出现的所有占位符。
