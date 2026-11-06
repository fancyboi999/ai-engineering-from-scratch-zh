---
id: cloud-sandbox-clock-and-bill
title: 耗时一天的构建运行在寿命一小时的沙箱上
card: sandboxes
kind: estimate
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer, applied-ai-engineer]
rounds: [system-design, screen]
tags: [sandbox, cloud, ttl, cost, capacity]
minutes: 8
lessons: []
manuals: [docker-sandboxes-101#s-sbx-cloud-run-move-and-ttl]
practice: []
cheatsheet: [docker-sandboxes]
related: [sandboxes/template-or-kit-for-the-toolchain]
updated: 2026-11-03
---

某项构建大约需要一天的耗时，你希望将其放在云端沙箱中运行，因为合上笔记本电脑会中断本地运行。估算若接受全部默认配置会发生什么，随后设置时钟与规格，并在展示推导过程的同时给出预计账单的数量级。

## Short answer

若使用全部默认配置，沙箱为 `small` 规格（2 vCPU 与 4096 MiB），自创建起的 TTL 为一小时且未设置 `--on-timeout`，因此服务端若能恢复则停止沙箱、否则将其删除，构建在一小时后就会终止。应将 `--ttl` 设置为自创建起最高 24 小时的上限并配置 `--on-timeout stop`，必要时通过 `sbx --cloud ttl +2h` 延长，并选用发布博客中定价每小时 1.12 美元的 `xl` 规格（16 vCPU 与 32768 MiB）。该规格下一天的费用略高于一天的小时数乘以约一美元，即不到三十美元，完全在 250 美元的促销赠金额度之内，且停止的沙箱不会被计收算力费用。

## Full answer

### 规格形态

| 规格名称 | vCPU | 内存 | 上线博客每小时定价 |
|---|---|---|---|
| `micro` | 1 | 2048 MiB | $0.07 |
| `small`（默认配置） | 2 | 4096 MiB | $0.14 |
| `medium` | 4 | 8192 MiB | $0.28 |
| `large` | 8 | 16384 MiB | $0.56 |
| `xl` | 16 | 32768 MiB | $1.12 |

`--cpus` 与 `--memory` 参数必须严格对应上述五种预设形态之一。定价数据源自发布博客，官方文档目录中未打印任何价格，因此预计账单只是一项工程估算而非最终财务报价。博客提到算力按秒计量，而官方文档仅明确证实处于停止（stopped）状态的沙箱不会产生算力计费。

### 时钟

默认 TTL 为一小时，自创建起最多 24 小时。`ttl +2h` 在该上限内延长，从不缩短。`--on-timeout` 可选 `stop`、`restart` 或 `delete`；`restart` 要求 `--ttl` 至少为一小时，而基于数据卷的沙箱必须使用 `delete`。停止的沙箱报告 `stopped`，恢复运行时时钟重新计时。因此长于该上限的任务需要设置检查点：保存模板或将产物写入数据卷（数据卷是沙箱退出时保存的快照，最后一个退出的沙箱会覆盖它）。

### 资源配额与资产迁移

新账户初始配额为 10 个并发沙箱、50 个存储沙箱、100 个数据卷、100 个机密凭据以及 3 个正在准备的镜像。执行 `sbx move NAME --to cloud` 会将本地文件系统打包为镜像，并在云端启动一个带有新 ID 的全新沙箱；运行中的构建进程本身不会被迁移，因此 agent 必须重新拉起构建。工具包网络规则与本地环境变量会随镜像一同迁移。机密凭据、宿主机挂载点、本地策略规则、宿主机端口映射以及运行中的进程均会留在本地，交互式登录所写入的凭据文件除非事先主动删除否则也会随镜像上传。云端拥有独立的凭据与策略存储，拒绝使用 HTTP 方法规则与治理配置文件，且映射的端口会变为需要独立鉴权的公开 HTTPS URL。你需要 `sbx` 0.45.1 或更高版本以及即用即付计费计划。

## Follow-ups

- **Level 3:** 若实际构建耗时超过了一天，你该怎么办？ Expected: 通过检查点将任务切分，使用模板保存或数据卷存盘，因为 TTL 从创建起算不能超过 24 小时。
- **Level 3:** 构建进行到一半时你将笔记本沙箱迁移到了云端，构建会在云端继续执行吗？ Expected: 不会；仅迁移了文件系统镜像，原进程遗留在本地，Agent 会在云端重新运行构建。
- **Level 4:** 在执行云端迁移前，你应当主动删除哪些敏感文件？ Expected: 交互式登录产生的本地凭据文件，因为快照会无差别复制普通文件，而本地凭据存储并未被迁移。
- **Level 4:** 为什么你的账单预估只能作为估算而不能作为对财务的正式报价？ Expected: 价格来自官方博客而非正式文档，按秒计费是博客宣称，正式文档仅保证了停止状态不计费规则。

## Wrong answers

- "默认的 TTL 是一天。" 它是一小时；一天是上限。
- "用负数延长缩短 TTL。" `ttl` 只能延长，从不缩短。
- "`sbx move` 会将正在运行的构建进程一同带走。" 它只迁移文件系统镜像，内存中的进程会直接丢失。

## Taught in

[云端章节](../../../manuals/docker-sandboxes-101/sections/7-1-sbx-cloud-run-move-and-ttl.md)列出了规格形态、TTL 规则、配额限制以及 `sbx move` 所遗留的组件。
