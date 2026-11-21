# Agent Server：langgraph dev、up 与 deploy

> 在 `langgraph dev` 下，服务器一次只跑一个作业，每次运行还要多花 0.6 到 1 秒；而没有密钥，`langgraph up` 根本起不来。

你把一个 agent 从脚本迁到 `langgraph dev`，一次发出 16 个请求。运行时间的中位数是 71 秒，其中 66 秒花在模型启动之前的等待上。文档说一个 worker 同时跑 10 个作业，`--help` 的文字也这么说。可服务器实际只跑了一个。模型跑在 CPU 上时，一次跑十个并不会更快。

读完本节，你能启动 `langgraph dev`、设置每个 worker 的作业数，并预测它的递归上限和每次运行的耗时。你还能根据我们记录的效果选择双重发送策略，并说清 `langgraph up` 和 `langgraph deploy` 需要什么。

## 三条命令 {#s-agent-server-langgraph-dev-up-and-deploy-the-three-commands}

**Agent Server：** LangSmith 的服务器，在一个由 assistant、线程（thread）和 run 组成的 HTTP API 后面运行已编译的图。对应的包是 `langgraph-api`，我们读的是已安装包里的代码。

LangGraph CLI（锁定版本为 `langgraph-cli` 0.4.43）用三种方式启动服务器 {{docs langsmith/cli}}：

| 命令 | 它运行什么 | 它需要什么 |
|---|---|---|
| `langgraph dev` | 一个 Python 进程，使用内存运行时，监听 `127.0.0.1:2024` | `pip install -U "langgraph-cli[inmem]"`，以及 Python 3.11 或更高版本 |
| `langgraph up` | Docker 里的服务器镜像，外加 Postgres 和 Redis 容器 | Docker，以及本地使用的 LangSmith API 密钥，或生产使用的许可证密钥 |
| `langgraph deploy` | 构建并推送到 LangSmith，由它运行服务器 | LangSmith API 密钥；本地构建还要有 Docker |

三条命令都读取 `langgraph.json`。它把图 id 映射到已编译图所在的文件和变量 {{docs langsmith/cli}}。实验用的应用有三张图：

```listing
title: 实验应用的 langgraph.json
source: capture/lab/T15-agent-server-x86/t15app/langgraph.json
lang: json
---
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./graphs.py:agent",
    "slow": "./graphs.py:slow",
    "loop": "./graphs.py:loop"
  },
  "python_version": "3.13",
  "env": {}
}
```

`slow` 有两个节点，每个节点睡眠输入里 `seconds` 的一半。`loop` 只有一个节点，带一条指回自己的边。两者都不调用模型。这个应用里的 `agent` 用的是模型替身，本节不用它的任何数字。

模型运行用的是第二个应用 `t15rapp/`，里面有两张图。它的 `agent` 是一个 `create_agent` agent，用 Ollama 上的 Qwen3 4B，带一个 `add` 工具（`t15rapp/graphs.py`）。它的 `loopagent` 是一个 agent，其工具总是要求再调用它一次。Ollama 跑在 CPU 上，一次只处理一个模型调用。

在 Agent Server 上，你不用传 checkpointer。agents 页面说明，部署时 LangSmith 会提供一个，而在本地要自己传 {{docs oss/python/langchain/agents}}。所以脚本里要靠 `SqliteSaver` 才有的持久化，服务器自带。

## 服务器的递归上限 {#s-agent-server-langgraph-dev-up-and-deploy-the-recursion-limit-of-the-server}

Agent Server 的环境变量页面给出 `LANGGRAPH_DEFAULT_RECURSION_LIMIT` 的默认值是 `10011` {{docs langsmith/env-var-cloud}}。`langgraph-api` 0.18.0 的 config 模块设的是同一个数 {{code langgraph_api/utils/config.py}}。`StateGraph` 的库默认值是 10007，[第 6.8 节](#s-error-handlers-node-timeouts-and-the-recursion-limit)有说明。

**我们测得**：在 x86 服务器客户机（32 vCPU、48 GiB）上，用 `langgraph dev` 跑 `loop` 图，一次不带 config，一次把上限设为 50：

```listing
title: langgraph dev 下无 config 的循环图
source: capture/lab/T15-agent-server-x86/02-recursion.jsonl
lang: text
note: 第一行，截取到错误文本和步数。
---
{"exp": "T15", "part": "recursion_limit", "server": "dev-default", "config": null, …'Recursion limit of 10007 reached without hitting a stop condition. …"n_in_state": 10007, "run_status": "error"}
```

运行在 7.3 秒后停在 10007 步，状态为 `error`。config 里写 `{"recursion_limit": 50}` 时，它停在 50 步。所以你传入的上限优先，而在 `langgraph dev` 下默认拿到的是库默认值。我们没有追查为什么服务器的值没有生效。本手册把这三个数字记为冲突 D105。每次运行都传 `recursion_limit`，两个默认值你就都不用管。

**我们测得**：在 `langgraph dev` 下用 Qwen3 4B 跑 `loopagent`，config 为 `{"recursion_limit": 25}`，共三次。每次都以 `error` 状态和 `GraphRecursionError` 结束，用了 13 次模型调用、12 次工具调用，耗时 24 秒。不带 config 时，有一次运行在 120 秒和 58 次模型调用之后仍在继续，我们把它取消了。

## 每个 worker 的作业数 {#s-agent-server-langgraph-dev-up-and-deploy-jobs-per-worker}

**每个 worker 的作业数：** Agent Server 的一个队列 worker 同时执行的运行数量。设置项是 `N_JOBS_PER_WORKER`，对 `langgraph dev` 则是 `--n-jobs-per-worker`。

对 `langgraph dev`，各来源给出两个默认值。该选项的 `--help` 文字说默认是 10 {{code libs/cli/langgraph_cli/cli.py}}。可选项本身没有默认值，`langgraph-api` 0.18.0 此时用 1 {{code langgraph_api/cli.py}}。CLI 页面的 Python 标签页给 1，JS 标签页和扩展指南给 10 {{docs langsmith/cli}} {{docs langsmith/agent-server-scale}}。本手册把这处差异记为冲突 D123，并以代码为准。

**我们测得**：在 x86 服务器客户机上让 `slow` 图跑 20 个后台运行，每个 2 秒，每种设置各跑一次。不设置时，一次只执行一个运行，20 个运行用了 41.0 秒。设为 `--n-jobs-per-worker 10` 时，同时跑十个，用了 5.1 秒。设为 100 时，20 个同时运行，用了 3.5 秒。

换成 Qwen3 4B agent，10 个后台运行在每个 worker 一个作业时用了 47.1 秒，设为 10 时用了 44.4 秒。设置后 10 个运行同时启动，随后 Ollama 一次只回答一个模型调用。

```figure
id: fig-8-1
kind: chart
title: langgraph dev 下 Qwen3 4B 的每秒运行数，按并发客户端数
claim: Qwen3 4B 跑在 CPU 上时，从 4 个客户端起，无论每个 worker 设 1 个还是 10 个作业，吞吐都停在每秒 0.22 次运行。
caption: 每个点是在 x86 服务器客户机上的一次负载运行，1 个和 4 个客户端各 10 次运行，16 个客户端 32 次运行。每次运行都是 Qwen3 4B agent 在新线程上经 runs.wait 执行。来源：capture/lab/summary/agent-server-x86-real.json。
```

**我们测得**：在同一台客户机上，对 Qwen3 4B 的 `agent` 图施加负载。每个请求创建一个线程并等待一次运行。每个级别跑一次。[图](#fig-8-1) 展示了吞吐。全部 104 次运行（每种设置 10、10 和 32 次）都返回了正确答案，没有错误。

| 每个 worker 的作业数 | 1 个客户端 | 4 个客户端 | 16 个客户端 |
|---|---|---|---|
| 默认，1 | 0.185 次运行/秒，p50 5,420 ms | 0.222 次运行/秒，p50 17,635 ms | 0.223 次运行/秒，p50 70,680 ms |
| 10 | 0.191 次运行/秒，p50 5,129 ms | 0.224 次运行/秒，p50 17,188 ms | 0.226 次运行/秒，p50 56,033 ms |

每个 worker 一个作业时，队列在服务器里。16 个客户端时，一次运行在第一次模型调用前要等 66 秒。设为 10 后，队列移进了 Ollama，一次运行的模型时间从 4.4 秒涨到 43.8 秒。吞吐由模型决定，16 个客户端时约为每秒 0.45 次模型调用，这个设置改变不了它。模型能并行服务调用时，仍然把它设为 10。

## 每次运行多出约一秒 {#s-agent-server-langgraph-dev-up-and-deploy-about-one-second-added-to-each-run}

只有一个客户端时，一次运行用 5.1 到 5.5 秒，其中两次模型调用占 4.4 秒。**我们测得**：在 x86 服务器客户机上，用两种方式启动 Qwen3 4B agent 的运行。每种方式在每个作业设置下各跑 10 次，一次一个。最后一列是客户端耗时减去模型调用内部的耗时：

| 启动运行的方式 | 客户端耗时，p50 | 模型耗时，p50 | 服务器额外耗时，p50 |
|---|---|---|---|
| `runs.wait`，默认作业数 | 5,486 ms | 4,473 ms | 1,014 ms |
| `runs.create`，再 `runs.join`，默认作业数 | 5,443 ms | 4,429 ms | 1,015 ms |
| `runs.wait`，10 个作业 | 5,139 ms | 4,443 ms | 661 ms |
| `runs.create`，再 `runs.join`，10 个作业 | 5,087 ms | 4,385 ms | 651 ms |

几乎所有额外耗时都出现在第一次模型调用之前。默认设置下这段等待约 1,003 ms，设为 10 个作业时是 641 到 651 ms。其中一部分来自内存运行时的队列：它每次轮询没找到运行，就睡 0.5 秒 {{code langgraph_runtime_inmem/ops.py}}。其余部分我们没有追查。把它当作锁定版本下 `langgraph dev` 的固定开销来看待。带 Postgres 和 Redis 的 `langgraph up` 的固定开销，留到下一版。

## 双重发送（double texting） {#s-agent-server-langgraph-dev-up-and-deploy-double-texting}

**双重发送（double texting）：** 一个线程上的第一次运行尚未结束时，又在同一线程上发起第二次运行。Agent Server 提供四种 multitask 策略，默认是 `enqueue` {{docs langsmith/double-texting}}。

文档页说明，双重发送是服务器的功能，开源 LangGraph 没有 {{docs langsmith/double-texting}}。脚本里的线程见[第 5.2 节](#s-checkpointers-and-threads)。

实验脚本先启动 `slow` 图的运行 A，耗时 4 秒。1 秒后，它在同一线程上发出运行 B，耗时 2 秒，并指定一种策略：

```listing
title: 每种双重发送情形里的第二次运行
source: capture/lab/T15-agent-server-x86/t15_drive.py
lang: python
note: 截取到两次运行和它们之间的等待。
---
        r1 = await client.runs.create(tid, "slow", input={"seconds": 4, "label": f"{strategy}-A"})
        await asyncio.sleep(1.0)
…
            r2 = await client.runs.create(tid, "slow", input={"seconds": 2, "label": f"{strategy}-B"}, multitask_strategy=strategy)
```

**我们测得**：在 x86 服务器客户机上用 `langgraph dev` 把每种策略各跑一次。[图](#fig-8-1b) 把两次运行的每个节点放在同一条时间轴上。

```figure
id: fig-8-1b
kind: timeline
title: 每种 multitask 策略下运行 A 和运行 B 的节点
claim: reject 拒绝了运行 B；enqueue 在 A 结束后才运行 B；interrupt 停掉 A 并丢了它未完成的节点；rollback 删除了 A。
caption: 每条轨道是 x86 服务器客户机上的一个线程。实心条是运行 A 的节点，空心条是运行 B 的节点。玫红色线是发出运行 B 的时刻。来源：capture/lab/summary/agent-server-x86.json。
```

| 策略 | 运行 B | 运行 A | 结束时的状态和历史 |
|---|---|---|---|
| `reject` | 以 HTTP 409 拒绝 | 以 `success` 结束 | 只有 A 的写入，4 条历史 |
| `enqueue` | 等待，A 结束后开始 | 以 `success` 结束 | 先是 A 的写入，再是 B 的写入，8 条历史 |
| `interrupt` | 立即开始 | 状态为 `interrupted` | 只有 B 的写入，6 条历史 |
| `rollback` | 立即开始 | 被删除，读取它会抛出 `NotFoundError` | 只有 B 的写入，4 条历史 |

`reject` 的拒绝信息里点出了其他策略：

```listing
title: reject 的拒绝信息
source: capture/lab/T15-agent-server-x86/04-double-texting.jsonl
lang: text
note: 第一行，截取到第二次运行。
---
{"exp": "T15", "part": "double_texting", "server": "dev-default", "strategy": "reject", "second_run": {"accepted": false, "type": "ConflictError", "http_status": 409, "body": "{\"detail\":\"Thread is already running a task. Wait for it to finish or choose a different multitask strategy.\"}"}, …
```

文档说，`interrupt` 会保留第一次运行到中断那一刻为止的进度 {{docs langsmith/double-texting}}。在我们的实验里，运行 A 还在第一个节点内部，没有已完成的步骤可保留。它的节点从未写入，线程里只剩运行 B。在那个节点里已经开始的工具调用不会有结果，文档对此也有警告。聊天线程选 `enqueue`；第二条消息必须等用户重试时，选 `reject`。

## langgraph dev 向 LangSmith 发送什么 {#s-agent-server-langgraph-dev-up-and-deploy-what-langgraph-dev-sends-to-langsmith}

应用的环境打开追踪时，`langgraph dev` 会追踪每次运行。**我们测得**：在 Mac 上，用一个免费计划的 LangSmith 账户密钥，在临时环境里测试。版本是 `langgraph-cli` 0.4.43、`langgraph-api` 0.18.0 和 `langgraph-runtime-inmem` 0.38.0。通过服务器运行 Qwen3 4B agent 五次，答案都对。

- **运行记录。** 账户存了 35 条运行记录，每次服务器运行对应 7 条。每条追踪的根节点以图 id `agent` 命名，而不是 `LangGraph`。它的 id 就是服务器的运行 id。
- **根节点的元数据。** 里面有 `thread_id`、`assistant_id`、`graph_id` 和 `run_attempt`，还有 `langgraph_api_version` 0.18.0、值为 `self-hosted` 的 `langgraph_host`，以及值为 `enterprise` 的 `langgraph_plan`。`LANGSMITH_LANGGRAPH_API_VARIANT` 是 `local_dev`。
- **请求。** 进程只联系了一个主机 `api.smith.langchain.com`。它发出 2 个 `GET /info` 和 15 个 `POST /runs/multipart`，没有检查许可证的请求。

```listing
title: langgraph dev 为五次被追踪的运行发出的请求
source: capture/lab/summary/langsmith-account-mac.json
lang: json
---
  "hosts": [
   "https://api.smith.langchain.com"
  ],
  "requests": {
   "GET /info 200": 2,
   "POST /runs/multipart 202": 15
  },
```

`langgraph-api` 在导入时把 `truststore` 注入 SSL 层，所以服务器用操作系统的信任库检查证书 {{code langgraph_api/server.py:11-17}}。在封锁该信任库的沙箱里，没有追踪能到达 API。`DISABLE_TRUSTSTORE=true` 会关掉这个注入，我们记录的运行就用了它。[第 8.2 节](#s-agent-chat-ui-in-front-of-langgraph-dev)在这台服务器前面放一个聊天 UI，并关闭追踪。

## langgraph up 需要密钥 {#s-agent-server-langgraph-dev-up-and-deploy-langgraph-up-needs-a-key}

`langgraph up` 基于 `langchain/langgraph-api` 构建你的应用镜像，并连同 Postgres 和 Redis 一起启动。构建之前，它会打印自己需要什么：

```listing
title: langgraph up 的前几行
source: capture/lab/T15-agent-server-x86/08-up-start-excerpt.txt
lang: text
---
Starting Agent Server...
For local dev, requires env var LANGSMITH_API_KEY with access to LangSmith Agent Server.
For production use, requires a license key in env var LANGGRAPH_CLOUD_LICENSE_KEY.
```

在 x86 服务器客户机上，两个变量都没设：镜像构建成功，两个数据库都报告健康，API 容器以退出码 3 退出：

```listing
title: langgraph up 之后的容器
source: capture/lab/T15-agent-server-x86/09-up-containers.txt
lang: text
---
t15app-langgraph-api-1 t15app-langgraph-api Exited (3) Less than a second ago
t15app-langgraph-redis-1 redis:6 Up 11 seconds (healthy)
t15app-langgraph-postgres-1 pgvector/pgvector:pg16 Up 11 seconds (healthy)
```

```listing
title: API 容器的日志
source: capture/lab/T15-agent-server-x86/10-up-license-excerpt.txt
lang: text
---
ValueError: License verification failed. Please ensure proper configuration:
- For local development, set a valid LANGSMITH_API_KEY for an account with LangGraph Cloud access in the environment defined in your langgraph.json file.
- For production, configure the LANGGRAPH_CLOUD_LICENSE_KEY environment variable with your LangGraph Cloud license key.
Review your configuration settings and try again. If issues persist, contact support for assistance.
```

所以，带 Postgres 和 Redis 的服务器没有账户或许可证就起不来，哪怕在你自己的机器上。

后来我们拿到了一个免费计划 LangSmith 账户的密钥。Mac 上的 Docker 没有运行，所以 `langgraph up` 以 `Error: Docker not installed or not running` 和退出码 2 停止。它在检查密钥之前就停了。

`langgraph-api` 0.18.0 会安装 PyPI 上的 `langgraph_license` 包，它的每项检查都返回 true {{code langgraph_license/validation.py}}。上面失败的那项检查只在服务器镜像内部运行。所以我们仍不知道免费账户的密钥能否通过它。该组织报告 `can_use_langgraph_cloud` 为 false，免费部署数为 0。这是 API 给出的提示，不是测试。

对完整服务器栈的测试留到下一版，[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)列出了它们：worker 崩溃、Redis 或 Postgres 中断、任务队列的恰好一次，以及 Redis 里存了什么。

## langgraph deploy {#s-agent-server-langgraph-dev-up-and-deploy-langgraph-deploy}

这一部分只来自文档和代码。我们没有运行过 `langgraph deploy`。我们账户的免费计划报告没有免费部署额度。

`langgraph deploy` 一步完成构建镜像、推送到 LangSmith 管理的镜像仓库、创建或更新 Agent Server {{docs langsmith/cli}}。没有 Docker 时，它请 LangSmith 根据你上传的源码构建镜像。文档把这条命令标为 beta。

- **密钥。** 命令读取 `--api-key`，或 `LANGGRAPH_HOST_API_KEY`、`LANGSMITH_API_KEY`、`LANGCHAIN_API_KEY` {{code libs/cli/langgraph_cli/deploy.py}}。
- **类型。** 除非传 `--agent-server-type dedicated`，新服务器就是 `serverless` {{code libs/cli/langgraph_cli/deploy.py:116}}。这个默认值出自 langgraph 1.2.22 的仓库树，比 0.4.43 的 wheel 新。wheel 把默认值设在 click 选项里。仓库树还会在没有缩容到零的数据平面上选 `dev` {{code libs/cli/langgraph_cli/deploy.py:1568-1570}}。wheel 没有这条规则，只在 AWS 400 错误里建议用 `--agent-server-type dev`。该选项也接受旧名称 `dev` 和 `prod`。文档说 serverless 会缩容到零，并有冷启动 {{docs langsmith/cloud-platform-features}}。
- **你自己的镜像仓库。** 自托管的 LangSmith 需要用 `--push-to` 指定你管理的镜像仓库，或用带摘要的 `--image-uri` {{docs langsmith/cli}}。
- **其他命令。** `langgraph deploy list`、`deploy metrics` 和 `deploy listeners` 读取你部署的内容 {{code libs/cli/langgraph_cli/deploy.py}}。

安全公告 GHSA-8prr-f582-jqq3 说，在 `langgraph-cli` 0.4.15 到 0.4.31 中，`langgraph deploy --verbose` 会打印镜像仓库的推送令牌。锁定版本 0.4.43 不在这个范围内。不过仍要把 `--verbose` 挡在 CI 日志之外，因为它会打印 Docker 构建和推送的输出。

没有许可证时，你可以用自己的 FastAPI 应用提供同一个 agent。[第 9.1 节](#s-the-run-endpoint-and-its-stream)构建这个服务，[第 9.7 节](#s-workers-the-advisory-lock-and-cost)用多个 worker 和每个线程一把 Postgres 锁来运行它。

```takeaways
- 用 --n-jobs-per-worker 10 启动 langgraph dev；模型一次只服务一个调用时，别指望有收益。
- 每次运行都传 recursion_limit，因为 langgraph dev 下服务器默认值是 10007。
- 预期 langgraph dev 在第一次模型调用之前，给每次运行多加 0.6 到 1 秒。
- 聊天线程用 enqueue；第二条消息必须等待时用 reject。
- 选 interrupt 或 rollback 之前，先把节点写成能容忍丢失未完成写入的样子。
- 运行 langgraph up 之前，先设置 LANGSMITH_API_KEY 或 LANGGRAPH_CLOUD_LICENSE_KEY。
- 查找服务器运行的追踪时，搜图 id，不要搜 LangGraph。
```

来源：capture/lab/summary/langsmith-account-mac.json, capture/lab/T21-langsmith-account-mac/07-e5-dev-inspect.json, capture/lab/T21-langsmith-account-mac/07-e5-dev-netlog.jsonl, capture/lab/T21-langsmith-account-mac/07-e5-dev-runs.jsonl, capture/lab/T21-langsmith-account-mac/07-e5-up.txt, capture/lab/T21-langsmith-account-mac/07-e5-server-venv-freeze.txt, capture/lab/T21-langsmith-account-mac/01-account-probe.json, capture/lab/T21-langsmith-account-mac/_scripts/t21_e5_client.py, capture/lab/T21-langsmith-account-mac/_scripts/t21_e5_inspect.py; langgraph_api/server.py and langgraph_license/validation.py at langgraph-api 0.18.0; capture/lab/summary/agent-server-x86-real.json, capture/lab/T15-agent-server-x86-real/01-recursion.jsonl, capture/lab/T15-agent-server-x86-real/02-load.jsonl, capture/lab/T15-agent-server-x86-real/03-floor.jsonl, capture/lab/T15-agent-server-x86-real/04-workers.jsonl, capture/lab/T15-agent-server-x86-real/t15r_drive.py, capture/lab/T15-agent-server-x86-real/t15rapp/graphs.py, capture/lab/summary/agent-server-x86.json, capture/lab/T15-agent-server-x86/02-recursion.jsonl, capture/lab/T15-agent-server-x86/03-workers.jsonl, capture/lab/T15-agent-server-x86/04-double-texting.jsonl, capture/lab/T15-agent-server-x86/08-up-start-excerpt.txt, capture/lab/T15-agent-server-x86/09-up-containers.txt, capture/lab/T15-agent-server-x86/10-up-license-excerpt.txt, capture/lab/T15-agent-server-x86/t15_drive.py, capture/lab/T15-agent-server-x86/t15app/graphs.py, capture/lab/T15-agent-server-x86/t15app/langgraph.json; libs/cli/langgraph_cli/cli.py and libs/cli/langgraph_cli/deploy.py at langgraph-cli 0.4.43; langgraph_api/utils/config.py and langgraph_api/cli.py at langgraph-api 0.18.0; langgraph_runtime_inmem/ops.py at langgraph-runtime-inmem 0.38.0; docs.langchain.com at docs commit 04d4d4a (langsmith/cli, langsmith/env-var-cloud, langsmith/agent-server-scale, langsmith/double-texting, langsmith/cloud-platform-features, oss/python/langchain/agents); advisory GHSA-8prr-f582-jqq3.
