# docker-agent run --sandbox：一次完整运行

> 一次录制的 `docker-agent run --sandbox` 展示了 kit、沙箱与允许列表；进入同一 VM 的 `sbx exec` 则展示模型调用如何经过代理。

你的 agent 文件使用 `filesystem` 和 `shell` 工具集，模型是 Mac 上 Docker Model Runner 中的 `ai/qwen3:4b`。在宿主上，`shell` 使用你的权限。`--sandbox` 把工具移入 microVM，模型仍留在宿主。

本节逐步跟踪 capture/out/27-* 的录制，[图](#fig-1-3) 画出流程。读完后，你能看懂沙箱运行的启动摘要，解释这次运行遇到的两个失败。

```figure
id: fig-1-3
kind: sequence
title: 一次 docker-agent run --sandbox 的逐步流程
claim: docker-agent 暂存 kit，让 sbx 创建 VM，在代理中放行两个主机；随后 VM 内的模型调用通过该代理发出。
caption: 从上向下读，每个编号行是一项步骤，第8行是结束此次运行的失败。第1至8行来自 capture/out/27-sandbox-allow.txt、27-sandbox-run.txt 和 27-kit-cache.txt；第9至15行来自 27-inside-run.txt 与 27-sbx-rm.txt；第12行的 chunk 名称来自 cassette 18-files 的流格式。
```

## agent 文件 {#s-docker-agent-run-sandbox-end-to-end-the-agent-file}

这个文件与宿主版本只差 provider。宿主的 `127.0.0.1` “not reachable from inside the sandbox” {{docs-sbx Accessing host services from a sandbox}}，即在沙箱内不可达，所以 provider 指向 `host.docker.internal`：

```listing
title: 沙箱 agent 文件的 provider 块
source: capture/fixtures/agents/files-sandbox.yaml
lang: yaml
note: 仅保留版本、provider 和模型；agent、指令及两个工具集已截去。
---
version: "16"

providers:
  host-runner:
    provider: dmr
    base_url: http://host.docker.internal:12434/engines/llama.cpp/v1

models:
  local:
    provider: host-runner
    model: ai/qwen3:4b
    temperature: 0
…
```

## 第1步：放行模型主机 {#s-docker-agent-run-sandbox-end-to-end-step-1-allow-the-model-host}

**持久允许列表：** `docker-agent sandbox allow` 存储的主机，“are added to the sandbox proxy's allow rules on every subsequent --sandbox run” {{help-agent docker-agent sandbox allow}}，会在此后每次 `--sandbox` 运行时加入沙箱代理的允许规则。帮助文本说这是 `Blocked by network policy` 403 的解决方法。代理把 `host.docker.internal` 转为 `localhost`，因此录制在运行前放行 `localhost:12434`：

```listing
title: 向持久允许列表加入一个主机
source: capture/out/27-sandbox-allow.txt
lang: text
note: 首次运行的欢迎横幅、遥测通知以及第二条命令已截去。
---
$ docker-agent sandbox allow localhost:12434  (--config-dir, --data-dir, --cache-dir under fixtures/repo-sandbox/.m101, inside the workspace)
…
Added 1 host(s) to the persistent sandbox allowlist:
  + localhost:12434
[exit 0]
…
```

## 第2步：把状态目录留在工作区 {#s-docker-agent-run-sandbox-end-to-end-step-2-keep-the-state-directories-in-the-workspace}

录制套件用 `--data-dir`、`--cache-dir` 和 `--config-dir` 避开 docker-agent 的 `~/.cagent`。使用 `--sandbox` 时，工作区外的数据目录会被拒绝，但帮助文本只给出了默认值 `~/.cagent` {{help-agent docker-agent run}}。因此录制套件将三个目录都放在工作区的 `.m101/` 下：

```listing
title: 位于工作区外的数据目录
source: capture/out/27-data-dir-outside.txt
lang: text
note: 命令行已截去。
---
…
Error: --data-dir must be inside the sandbox's writable workspace $CAPTURE/fixtures/repo-sandbox
[exit 1]
```

## 第3步：启动摘要 {#s-docker-agent-run-sandbox-end-to-end-step-3-the-launch-summary}

```listing
title: docker-agent run --sandbox 的启动摘要
source: capture/out/27-sandbox-run.txt
lang: text
note: 命令行与镜像拉取进度已截去；剩余输出在第5步展示。
---
…
Models gateway: none configured
Models catalog: allowlisting models.dev in the sandbox proxy
User sandbox allowlist: allowlisting 1 host(s) from `docker agent sandbox allow`:
  - localhost:12434

sandbox    docker-agent-<hash>
agent      docker-agent
workspace  $CAPTURE/fixtures/repo-sandbox (rw)
           $CAPTURE/fixtures/agents (ro)
           $CAPTURE/fixtures/repo-sandbox/.m101/cache/sandbox-kits/<hash> (ro)
           $CAPTURE/fixtures/repo-sandbox/.m101/cfg (ro)
image      docker/docker-agent-sbx-templates:latest
cpu        10
memory     32 GiB
…
✓ Created sandbox docker-agent-<hash>
```

此次运行未设置 `--models-gateway`。它放行 `models.dev`，因为“without it the first catalog lookup fails with a `403 Blocked by network policy` error” {{docs-agent Auto-Kit}}，不放行则首次目录查询会遇到该错误。下一行重复第1步中的主机。

**Auto-kit：** docker-agent 在宿主暂存的目录，“bind-mounted read-only into the VM at the same path” {{docs-agent Auto-Kit}}，以相同路径只读绑定挂载进 VM。此处为 `.m101/cache/sandbox-kits/<hash>`，其 `manifest.json` 只有 `agent_ref` 与 `built_at`（capture/out/27-kit-cache.txt）。工作区可读写，agent 文件目录、kit 和配置目录均只读。

## 第4步：一个普通沙箱 {#s-docker-agent-run-sandbox-end-to-end-step-4-an-ordinary-sandbox}

运行期间，`sbx ls` 列出 `docker-agent-<hash>`，agent 为 `docker-agent`、状态为 `running`，工作区仍是这四个，其中三个带 `:ro`（capture/out/27-sbx-ls.txt）。它就是普通沙箱，`sbx` 像对待其他沙箱一样列出和移除它。

## 第5步：会话存储失败 {#s-docker-agent-run-sandbox-end-to-end-step-5-the-session-store-fails}

VM 内的运行在任何模型调用之前就停止了：

```listing
title: 沙箱运行的结尾
source: capture/out/27-sandbox-run.txt
lang: text
note: 错误前的两条自更新 warning 已截去。
---
…
Error: creating session store: migration failed even after database reset: failed to create migrations table: attempt to write a readonly database (1032)
Error: 
[exit 1]
```

数据目录位于 `virtiofs` 工作区挂载上，`mount` 显示它为 `rw`。Python `sqlite3` 向同一挂载写入也以相同方式失败（capture/out/27-sqlite-probe.txt），因此在这台宿主上，SQLite 无法通过这个挂载写入。此次运行未输出安全模式，所以[冲突 C62](#s-ref-sources-and-the-conflicts-register) 仍未解决。Docker Agent “exits but does not stop or remove the sandbox VM” {{docs-agent Sandbox Mode}}，退出却不停止或移除沙箱 VM，因此 VM 仍为 `running`。

## 第6步：从内部调用模型 {#s-docker-agent-run-sandbox-end-to-end-step-6-the-model-call-from-inside}

```listing
title: VM 内的 agent 程序与代理设置
source: capture/out/27-inside.txt
lang: text
note: 仅保留版本、四行环境变量及 VM 内的允许列表；其他变量与自更新 warning 已截去。
---
docker-agent version main
Commit: 154b78f2d517dae1397866dfb7586c4a302a3151
…
ANTHROPIC_API_KEY=proxy-managed
…
HTTP_PROXY=http://gateway.docker.internal:3128
…
NO_PROXY=localhost,127.0.0.1,::1,gateway.docker.internal
OPENAI_API_KEY=proxy-managed
…
Persistent sandbox allowlist is empty.
```

模板运行的是 `docker-agent version main`，而非 v1.149.0，尽管文档说 `:latest` 基于“The most recent `v*` release” {{docs-agent Sandbox Mode}}，即最新 `v*` 发布版本构建。provider 密钥显示为 `proxy-managed`。VM 内允许列表为空，因为获准主机以宿主代理规则的形式传入。

随后录制手动在 VM 内启动同一 agent 文件，把状态存入 `/tmp/m101`。这次运行展示的是 VM 内的模型路径，不是成功的 `--sandbox` 启动：

```listing
title: VM 内发出的模型调用
source: capture/out/27-inside-run.txt
lang: text
note: 命令行在状态 flags 后截断，两条自更新 warning 已截去。
---
$ sbx exec docker-agent-<hash> sh -c 'docker-agent --config-dir /tmp/m101 --data-dir /tmp/m101 --cache-dir /tmp/m101 run --exec --last …
…
The working directory contains README.md with 1 line.
[exit 0]
```

发往 `host.docker.internal:12434` 的请求通过 `HTTP_PROXY` 离开，因为该主机不在 `NO_PROXY` 中。“The sandbox proxy translates `host.docker.internal` to `localhost` before forwarding the request” {{docs-sbx Accessing host services from a sandbox}}，代理转发前将它转换为 `localhost`，第1步的规则允许通行。答案正确：录制套件向每个工作区复制同一 README，它只有一行 `hello`（capture/out/04-workspace.txt）。

## 第7步：移除沙箱 {#s-docker-agent-run-sandbox-end-to-end-step-7-remove-the-sandbox}

```listing
title: 移除沙箱
source: capture/out/27-sbx-rm.txt
lang: text
note: 未截去任何内容。
---
$ sbx rm --force docker-agent-<hash>
Deleting sandbox docker-agent-<hash>...
Sandbox 'docker-agent-<hash>' removed
[exit 0]
```

以后从同一工作区运行会复用 VM，“only when the mount set has changed” {{docs-agent Sandbox Mode}}，即只有挂载集合改变时才创建新 VM。

```takeaways
- 首次沙箱运行前，用 `docker-agent sandbox allow localhost:PORT` 放行每个宿主服务。
- `--sandbox` 会拒绝工作区外的 `--data-dir`；先测试 SQLite 能否在目录内写入。
- 从启动摘要核对每项挂载模式、镜像及获准主机。
- 不再需要沙箱时用 `sbx rm` 移除，因为 docker-agent 会让它继续运行。
```

Sources: help-agent docker-agent run, docker-agent sandbox allow (research/sources/help-docker-agent.md); docs-agent Sandbox Mode, Auto-Kit (research/sources/docs-docker-agent.md); docs-sbx Accessing host services from a sandbox (research/sources/docs-sandboxes.md); research/conflicts-register.md rows C61, C62; capture/README.md; capture/fixtures/agents/files-sandbox.yaml; capture/out/27-sandbox-allow.txt, 27-data-dir-outside.txt, 27-sandbox-run.txt, 27-kit-cache.txt, 27-sbx-ls.txt, 27-sqlite-probe.txt, 27-inside.txt, 27-inside-run.txt, 27-sbx-rm.txt, 04-workspace.txt; capture/cassettes/18-files.yaml.gz
