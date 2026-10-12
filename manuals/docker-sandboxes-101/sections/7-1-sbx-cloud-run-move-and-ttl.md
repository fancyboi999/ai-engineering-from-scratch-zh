# sbx --cloud run、sbx move 与 sbx ttl

> 云沙箱是在 Docker 计算资源上的同类 microVM，五种规格按秒计费，TTL 上限24小时，密钥和策略独立。

`m101-demo` 的 agent 长构建进行一半，笔记本放进包里，沙箱随它停止。`sbx move m101-demo --to cloud` 捕获文件系统，在 Docker 计算资源上重新启动；在那里结束它的是时钟，不是合盖。构建进程不会一起迁移，agent 得重新构建。读完本节，你能启动云沙箱、双向迁移，并设置结束时钟。

本版未录制云运行，因为云沙箱收费，未获准执行。下述事实均来自帮助与文档。

## --cloud flag 与省略内容 {#s-sbx-cloud-run-move-and-ttl-the-cloud-flag-and-what-it-hides}

**云沙箱：** `sbx` 通过 Cloud Sandboxes API 而非本地 `sandboxd` 创建的沙箱，由全局 `--cloud` 选择 {{help-sbx sbx}}。

```listing
title: 接受 --cloud 的命令
source: research/sources/help-sbx-cloud.md
lang: text
note: 2026-10-08 的 sbx --cloud --help 输出，仅保留两个分组。无 daemon、prune、settings、skills；attach、ttl、volume 只在这里出现。
---
Sandbox Commands:
  attach      Attach to a cloud sandbox, starting it first if it is stopped
  cp          Copy files or directories between a sandbox and the host
  create      Create a sandbox for an agent
  exec        Execute a command inside a sandbox
  ls          List sandboxes
  move        Move a sandbox between local and cloud
  ports       Manage sandbox port publishing
  rm          Remove one or more sandboxes
  run         Run an agent in a sandbox
  stop        Stop one or more sandboxes without removing them
  ttl         Inspect or extend a cloud sandbox's TTL
…
  volume      Manage persistent volumes (cloud-only)
```

云命令树没有 `daemon`、`prune`、`settings` 和 `skills`，`--cloud` 拒绝 `rm --all` {{help-sbx sbx rm}}（[冲突 C47](#s-ref-sources-and-the-conflicts-register)）。沙箱、模板、密钥、卷与网络策略位于独立云存储 {{docs-sbx Compare local and cloud sandboxes}}。

需要 `sbx` 0.45.1 以上及 Personal 或 Pro 账户按量付费计划。文档说0.45.0，发布博客说0.45.1（[冲突 C36](#s-ref-sources-and-the-conflicts-register)）；未提 Team 和 Business（[冲突 C103](#s-ref-sources-and-the-conflicts-register)）。`sbx --cloud diagnose` 无本地守护进程也可检查登录、云 API 与账户访问 {{docs-sbx Use cloud sandboxes}}。Docker Offload 是 Docker Desktop 的远程守护进程，另一个产品，没有沙箱路径（[冲突 C98 与 C99](#s-ref-sources-and-the-conflicts-register)）。

## 规格、价格与配额 {#s-sbx-cloud-run-move-and-ttl-shapes-prices-and-quotas}

不传 `--cpus` 和 `--memory` 时，云沙箱为2 CPU、4 GiB {{help-sbx sbx create}}；两值必须匹配五个计费规格之一 {{help-sbx sbx template load}}。价格来自 2026-09-24 发布博客，文档树没有价格（[冲突 C101](#s-ref-sources-and-the-conflicts-register)）。

| 规格 | vCPU | 内存 | 每小时价格，2026-09-24 博客 |
|---|---|---|---|
| `micro` | 1 | 2048 MiB | $0.07 |
| `small`，默认 | 2 | 4096 MiB | $0.14 |
| `medium` | 4 | 8192 MiB | $0.28 |
| `large` | 8 | 16384 MiB | $0.56 |
| `xl` | 16 | 32768 MiB | $1.12 |

博客说按秒计量，文档只确认一半：“Compute isn't billed while it is stopped.” {{docs-sbx Use cloud sandboxes}}，停止时不收计算费用。该博客的250美元额度是促销。账户初始配额为10个并发沙箱、50个存储沙箱、100卷、100密钥及3个准备中镜像 {{docs-sbx-api Account quotas}}。

## sbx --cloud run 与 attach {#s-sbx-cloud-run-move-and-ttl-sbx-cloud-run-and-attach}

`sbx --cloud run claude --name cloud-project` 创建沙箱并连接 agent，名称已存在则重启 {{help-sbx sbx run}}。`Ctrl-\` 分离，`sbx --cloud attach cloud-project` 重新进入会话 {{help-sbx sbx attach}}。`sbx --cloud ports cloud-project --publish 8080` 返回公共 HTTPS URL，背后服务需自身认证 {{docs-sbx Use cloud sandboxes}}。密钥用 `sbx --cloud secret set anthropic`，规则用可再次运行的 `sbx --cloud policy init` {{help-sbx sbx policy init}}。云端拒绝 HTTP 方法规则、`--protocol` 和治理 profile {{docs-sbx Manage cloud network policy}}。

## sbx ttl 与 --on-timeout {#s-sbx-cloud-run-move-and-ttl-sbx-ttl-and-on-timeout}

**TTL：** 云沙箱触发超时操作前存活时间，默认一小时，最多自创建起24小时 {{help-sbx sbx ttl}}。

`sbx --cloud ttl +2h cloud-project` 在上限内延长到期时间，绝不缩短 {{help-sbx sbx ttl}}。`--on-timeout` 选 `stop`、`restart` 或 `delete` {{help-sbx sbx create}}。省略时，服务器停止可恢复沙箱，删除其余。`restart` 要求 `--ttl` 至少一小时；卷支持的沙箱必须用 `delete` {{docs-sbx Use cloud sandboxes}}。自 v0.47.0，停止沙箱报告 `stopped`，恢复时重启时钟 {{rel-sbx v0.47.0}}。卷是退出时快照，最后退出沙箱覆盖它 {{help-sbx sbx volume}}。

## sbx move {#s-sbx-cloud-run-move-and-ttl-sbx-move}

```figure
id: fig-7-1
kind: flow
title: sbx move 搬到云端的内容
claim: sbx move 仅将沙箱文件系统复制为镜像；密钥、挂载、本地规则和进程留下，目的地启动 TTL 时钟。
caption: 顶部从左到右，再向下读。绿色框随镜像搬走，灰色虚线框留在宿主，琥珀框是目的地时钟。依据 research/sources/help-sbx.md（sbx move）和 docs-sandboxes.md（Move a sandbox），未录制云运行。
```

`sbx move m101-demo --to cloud` 捕获文件系统为模板镜像，上传后创建新 id 的沙箱，名称为 `moved-m101-demo` 加后缀 {{help-sbx sbx move}}。kit 网络规则与本地环境随镜像迁移。宿主绑定挂载、存储密钥、本地策略、宿主端口绑定与运行进程留下 {{help-sbx sbx move}}。交互登录写入的凭据是普通文件，除非先删除，否则也迁移 {{docs-sbx Move a sandbox}}。

HTTP 方法规则迁移前会提示，因为云端不能应用；`--force` 回答提示但保留 warning。目的地默认一小时到期，除非 `--ttl` 与 `--on-timeout` 另设。迁回本地可能在宿主临时目录暂存最多32 GiB {{help-sbx sbx move}}。文档还警告云沙箱内 `docker exec` 可能读取 VM 而非容器文件系统（[冲突 C104](#s-ref-sources-and-the-conflicts-register)），本版未确认。

```takeaways
- 要取回工作的每次云 create 或 move 都设置 `--ttl` 与 `--on-timeout stop`。
- 首次云运行前配置 `sbx --cloud secret` 与 `sbx --cloud policy`，本地存储不适用。
- 云发布端口是公共端点，演示结束后取消发布。
- `sbx move` 或 `template save` 前删除沙箱内凭据文件，快照会复制它们。
```

Sources: help-sbx sbx, sbx create, sbx run, sbx attach, sbx rm, sbx move, sbx ttl, sbx volume, sbx policy init, sbx template load (research/sources/help-sbx.md); research/sources/help-sbx-cloud.md; docs-sbx Cloud sandboxes, Authenticate cloud agents, Compare local and cloud sandboxes, Move a sandbox, Manage cloud network policy, Use cloud sandboxes (research/sources/docs-sandboxes.md); docs-sbx-api Compute sizes and limits, Account quotas (research/sources/docs-sandboxes-api.md); rel-sbx v0.45.0, v0.45.1, v0.47.0 (research/sources/sbx-releases.md); blog 2026-09-24 and research/conflicts-register.md rows C36, C47, C98, C99, C101, C103, C104; capture/out/01-help-sbx.txt
