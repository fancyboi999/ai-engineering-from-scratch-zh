---
id: eval-failed-with-zero-cost
title: 两个评测全部失败，可一个也没运行
card: scenarios
kind: incident
level: 3
roles: [ai-evaluation-reliability-engineer, agentic-ai-engineer]
rounds: [debugging, design-review]
tags: [agents, evals, judge-model, containers, model-runner]
minutes: 25
lessons: []
manuals: [docker-sandboxes-101#s-session-db-sessions-diff-and-eval, docker-sandboxes-101#s-dmr-compose-models-and-the-mcp-gateway-service]
practice: []
cheatsheet: []
related: [scenarios/first-divergence-at-turn-zero]
updated: 2026-11-03
system:
  version: docker-agent v1.149.0 and sbx v0.47.0
  model: ai/qwen3:4b through the local model runner, as the subject and as the judge
  hardware: one Mac, no GPU
source:
  - manuals/docker-sandboxes-101/capture/out/22-eval.txt
  - manuals/docker-sandboxes-101/capture/out/22-eval-run.json
  - manuals/docker-sandboxes-101/capture/out/22-eval-gateway.txt
  - manuals/docker-sandboxes-101/capture/out/22-eval-container-env.txt
  - manuals/docker-sandboxes-101/capture/out/22-eval-run-container-env.json
  - manuals/docker-sandboxes-101/capture/fixtures/evals/list-files.json
  - manuals/docker-sandboxes-101/sections/5-6-session-db-sessions-diff-and-eval.md
  - manuals/docker-sandboxes-101/sections/6-5-dmr-compose-models-and-the-mcp-gateway-service.md
---

## Situation

一个每晚运行的作业用两个保存好的评测会话给文件 agent 打分，judge 是一个本地模型。昨晚这个作业打印了 `Errors: 2/2 evaluations failed`，总成本为零，并挡住了一个 pull request。PR 作者被告知 agent 退步了。作者回复说改动只是指令里的一个词，并要求看会话，结果一个会话也没有。

值班工程师又试了一次，在命令上加了模型网关参数，指向容器访问模型运行器时用的地址。这次在运行任何东西之前就以 1 退出，最后一行是 HTTP 403。第三次尝试把同一个地址设到评测容器的环境里，两个评测都跑了。你来复查这三次运行，以及第三次跑出来的两个分数。

## Evidence

- [挡住 PR 的那次评测运行](evidence/the-first-run.txt)
- [第一次运行的摘要块](evidence/the-first-run-summary.txt)
- [第二次尝试，在命令上加模型网关](evidence/the-gateway-flag.txt)
- [第三次尝试，把网关传给容器](evidence/the-container-variable.txt)
- [list-files 评测期望的工具调用](evidence/the-expected-tool-calls.txt)
- [agent 在 list-files 评测中发起的第二次工具调用](evidence/the-extra-call.txt)
- [每种调用方访问模型运行器的 base URL](evidence/five-base-urls.txt)

## Questions

1. 第一次运行说有两个评测失败。它输出里的什么能告诉你有没有评测真正运行过？
2. 第二次尝试为什么在第一个评测之前就停了？403 指向的是谁？
3. 第三次尝试把参数换成了环境变量。谁读这个变量，谁不读？
4. 第三次运行里，哪个数字是关于 agent 的发现？agent 做了什么得到这个分数？
5. 改写关卡，让一个没有运行的评测不能以退步的名义挡住 PR。

## Walkthrough

1. **读每个判定下面那一行。** 两个评测给出的原因相同：agent 容器以退出状态 1 失败，它的 stderr 说拿不到模型，因为在 path 里找不到 `docker` 可执行文件。评测镜像里的 agent 通过 docker 命令行寻找模型运行器，而锁定版本的发布镜像里没有 docker 命令行。agent 从没回答过一个 prompt。什么也没被打分。
2. **读摘要块。** `failed_evals` 是 2，其他计数全是 0：`total_cost`、`sizes_total`、`tools_count`、`relevance_total`。`sessions` 是 null。一个失败的判定，配上全零的总计、没有会话，说明评测从没开始，而不是 agent 表现差。
3. **读网关那次尝试。** 这个参数改变了整条命令的模型地址。judge 最先被校验，而 judge 跑在宿主机上，不在容器里。宿主机访问不到只在容器里有效的名字，所以 judge 检查以 HTTP 403 失败，命令在建任何容器之前就以 1 退出。403 指向的是 judge 的请求，不是 agent。
4. **读容器变量那次尝试。** `-e DOCKER_AGENT_MODELS_GATEWAY=...` 只在评测容器里设置这个变量。judge 保留它在宿主机上的地址。两个评测都跑了。sizes 2 个中通过 2 个，relevance 2 个中通过 2 个，工具调用的平均 F1 为 83.3%。仍有一个评测失败，原因是 `tool calls score 0.67`。
5. **读期望的调用和多出来的调用。** list-files 评测期望一个 assistant 轮次，里面有一次 `list_directory` 调用。agent 做了这次调用，然后又调用了一次 `shell`，执行 `wc -l README.md`。期望一次调用，实际两次，F1 为 0.67。这是三次运行里唯一说明了 agent 的数字：它比保存的会话多做了一步。
6. **读 base URL 表。** 同一个模型运行器，每种调用方用不同的 base URL：宿主机进程用 `localhost:12434`，容器用 `model-runner.docker.internal`，沙箱里的 agent 经过沙箱代理。judge 和被测对象跑在两个地方，所以需要两个地址。

## Resolution

被挡住的 PR 是一次基础设施故障。评测容器没有办法找到模型运行器，第一次运行什么也没打分。修复就是第三条命令：用 `-e` 把网关传给容器，让 judge 留在宿主机上用自己的地址。证据就在那次运行里：两个评测都跑了，sizes 2 个中通过 2 个，relevance 2 个中通过 2 个，工具调用 F1 为 83.3%，成本仍然是零，因为本地模型没有价格。在本地运行器上，成本分不出跑了还是没跑，所以要读总计和会话。

关卡有两处改动。错误数大于 0 时，它把作业判为“坏了”，并且只根据真正运行了的评测报告退步。剩下的 0.67 交给人决定：agent 在列出目录之后，又用 `shell` 数了行数。如果想要这次额外调用，就给保存的会话加上第二个期望调用；如果不想要，就改指令。无论哪种，评测都尽了它的职责：抓住一次保存的会话没有要求的调用。

## Wrong turns

- "agent 退步了，回滚这个 PR。" 没有评测运行过。两个失败都是容器错误，摘要里的每个总计都是 0，`sessions` 是 null。
- "把网关参数加到命令上，让容器找到运行器。" 这个参数也会改掉 judge 的地址，而 judge 跑在宿主机上，访问不到只在容器里有效的名字。运行会在任何评测开始之前以 403 失败。
- "重新构建评测镜像，把 docker 命令行装进去。" 发布镜像是锁定版本的，容器缺的是地址，不是二进制文件。评测命令有 `-e`，可以把地址交给它们。
- "把 `shell` 调用加进期望列表，然后继续。" 先决定这次额外调用要不要。评测存在的意义，就是抓住保存的会话没有要求的调用。

## Generalize

评测结果有两层：评测跑没跑，以及它打了多少分。全零的总计和没有会话说明第一层失败了，所以先读判定下面的错误，再读判定。在关卡里把错误和失败分开。还要记住，judge 和被测对象可能跑在不同的地方，同一个服务要用不同的地址。

## Taught in

[评测一节](../../../manuals/docker-sandboxes-101/sections/5-6-session-db-sessions-diff-and-eval.md#eval)记录了这三次尝试，[模型运行器一节](../../../manuals/docker-sandboxes-101/sections/6-5-dmr-compose-models-and-the-mcp-gateway-service.md#docker-model-runner-on-port-12434)列出了每种调用方的 base URL。
