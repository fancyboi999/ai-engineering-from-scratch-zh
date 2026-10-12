# 如何阅读本手册

> 本手册每段命令输出来自上游在一台 Mac 上录制的 sbx 与 docker-agent 运行，每条规则可追溯到按优先级排序的来源。

本手册介绍 Docker Sandboxes（`sbx` CLI v0.47.0）与 Docker Agent（`docker-agent` CLI v1.149.0）。围绕一个任务从头走到尾：让不可信 agent 操作你信任的文件。

## 适合谁读 {#s-front-who-this-manual-is-for}

你在真实仓库运行 Claude Code、Codex 等编程 agent，熟悉 Docker、git 和 YAML，但还没用过 Docker Sandboxes 或 Docker Agent。

读完最后一部分，你能：

- 在沙箱运行编程 agent，只给所需文件，不给凭据，也能取回提交。
- 读一行 `sbx policy log`，指出哪条规则允许或阻止连接，该改什么。
- 写文件让 agent 团队使用本地工具与模型，录制并从 cassette 重放。
- 用同一文件提供 HTTP API、MCP、ACP、A2A 服务，并分享签名 OCI 产物。
- 将2025年 Docker Sandboxes 插件或 cagent 材料中的命令映射到当前形式。

[沙箱课程](phases/13-tools-and-protocols/26-skill-permissions-sandboxes-and-trust) 解释何时需要进程、容器或 microVM 边界。本手册接着介绍构建 microVM 边界的两个产品。

## 编写方法 {#s-front-how-it-was-made}

手册固定 `sbx` v0.47.0、commit `0411f50e`（2026-10-05发布），以及 `docker-agent` v1.149.0、tag commit `bf4169c`（2026-10-07发布）。事实由上游于2026-10-08核验。`sbx` 是无公开源码的专有程序，所以帮助文本优先级最高。

事实来自七类来源，按权威性排序。冲突时高位优先，正文注明。

| 排名 | 来源 | 手册采用内容 | 引用形式 |
|---|---|---|---|
| 1 | sbx 0.47.0、docker-agent 1.149.0 程序实际打印的帮助 | 全部命令、flag、默认值与路径 | help-sbx 或 help-agent 加命令 |
| 2 | v1.149.0 的 agent-schema.json | 全部文件键、类型与默认值 | schema 加定义 |
| 3 | v3.0.0-m.8 tag 的 Sandbox Kit Spec v3 | 描述文件与能力 | kitspec 或 kitcap 加章节或能力 |
| 4 | 2026-10-08获取的 Docker 文档 | 帮助未说的规则和限制 | docs-sbx、docs-agent、docs-dmr、docs-mcp 或 docs-desktop 加页面 |
| 5 | sbx 发布说明与 docker-agent changelog | 行为何时出现、改变或移除 | rel-sbx 或 rel-agent 加版本 |
| 6 | Docker 博客与演讲 | 历史和定位，不作规则依据 | blog 或 talk 加日期 |
| 7 | capture/ 录制套件 | 展示的全部命令输出、文件与记录 | 录制文件名 |

来源1至5保存在 research/sources/，审计逐字核对引文。博客与演讲未保存，不检查其引文。

来源多处冲突，最大的是 kit 代际（[C13](#s-ref-sources-and-the-conflicts-register)）与各启动路径的 agent 名称和模板镜像（[C9、C61](#s-ref-sources-and-the-conflicts-register)）。另有 sbx 从不注入的宿主密钥（[C7](#s-ref-sources-and-the-conflicts-register)），以及同 Mac 两个 agent 程序（[C48](#s-ref-sources-and-the-conflicts-register)）。[来源参考](#s-ref-sources-and-the-conflicts-register) 列出各冲突及手册裁定。

## 录制套件 {#s-front-the-capture-kit}

套件驱动真实 `sbx`、`docker-agent`、`docker`，输出写 capture/out/，遮蔽每次变化的值，仅用 Python 标准库，已录制三个级别：

| 级别 | 要求 | 录制内容 |
|---|---|---|
| A | 安装 sbx、docker-agent、docker 客户端，不需守护进程、网络、模型或 key | 版本、根帮助、doctor、toolsets、models list、试运行及旧 Desktop 命令（00、01、16、29） |
| B | sbx 已登录、sandboxd、Docker Hub 镜像拉取、example.com 与 mcp.deepwiki.com HTTPS | 生命周期、端口、cp、模板、--clone、策略、密钥、MCP、kit、env plan、skills（02至15） |
| M | Desktop 4.94.0、12434端口 Model Runner、已拉 ai/qwen3:4b、容器、Compose、buildx、本地 registry | agent、团队、权限、会话、eval、五种服务、share、Model Runner、Compose、run --sandbox、v3 kit 构建（17至28、98） |

上游在 Apple silicon、macOS 26.2 的一台 Mac 录制，使用 sbx v0.47.0、docker-agent v1.149.0、Desktop 4.94.0、Model Runner 的 ai/qwen3:4b。文档默认 ai/qwen3:latest 两次因 digest 不匹配拉取失败（capture/out/25-model-pull-latest.txt），所以全部文件指定同仓库4B tag。

套件不能离线 CI 运行。sbx 登录 Docker 后从 Hub 镜像启动真实 microVM，agent 需要模型。工具缺失时 `python3 capture/run.py --check` 输出 skipped 与原因，退出0。C 级需要 Cloud Sandboxes、GitHub token 或修改 ~/.ssh/config，未录制，相关章节引用文档。

M 级多数用 --fake 重放 cassette，便于同条件比较。eval、三种服务、显式 base_url 的一次运行及 run --sandbox 以 temperature: 0 实时调用模型。[套件 README](manuals/docker-sandboxes-101/capture/README.md) 列出录制展示但文档没说的行为。

## 约定 {#s-front-conventions}

每条命令 `docker-agent` 指 Homebrew v1.149.0；`docker agent` 指 Desktop 插件，录制 Mac 为 v1.144.0，仅在程序输出中出现。

$CAPTURE 为录制目录，$HOME 为家目录；变化值用 <uuid>、<hash>、<ts>、<port> 等标记。M 级命令省略指向 capture/work/ 的 --config-dir、--data-dir、--cache-dir。

引用标出位置：{{help-sbx sbx run}} 是帮助命令，{{schema AgentConfig}} 是 schema 定义，{{kitspec §3.4}} 是 kit 规范章节。{{docs-sbx Network access policies}} 指页面或标题，{{rel-sbx v0.43.0}} 指发布版。listing 原样复制录制行，… 表示截去内容，note 解释截取范围。

网页图有动画，重放按钮再次执行步骤；打印与减少动态效果显示最终帧。

## 首次运行 {#s-front-a-first-run}

需要 sbx v0.47.0、sbx login 登录 Docker，以及一次设置的全局网络策略。录制使用 balanced：

```listing
title: 一次设置的全局策略
source: capture/out/03-policy-init.txt
lang: text
note: 未截去任何内容。
---
$ sbx policy init balanced
Global network policy initialized to "balanced".
[exit 0]
```

创建临时练习目录并打开 shell 沙箱：

```bash
mkdir -p ~/sbx-scratch
sbx run shell ~/sbx-scratch
```

`sbx run shell` 提供新沙箱 Bash 登录 shell，按默认 `<agent>-<workdir>` 命名 `shell-sbx-scratch` {{help-sbx sbx run}}。内部 pwd 与宿主路径相同。退出 shell，再列出并移除沙箱：

```bash
sbx ls
sbx rm --force shell-sbx-scratch
```

录制用 sbx create 创建自己的 shell 沙箱，输出以下摘要：

```listing
title: 新 shell 沙箱摘要
source: capture/out/04-create.txt
lang: text
note: 镜像层遮蔽为 <layers>，结尾提示已截去。
---
$ sbx create shell $CAPTURE/fixtures/repo --name m101-demo

sandbox    m101-demo
agent      shell
workspace  $CAPTURE/fixtures/repo (rw)
image      docker/sandbox-templates:shell-docker
cpu        10
memory     32 GiB

Pulling image
  <layers>
✓ Image ready
✓ Created sandbox m101-demo
…
```

agent 侧开启 Model Runner 宿主 TCP 12434，再用 `docker model pull ai/qwen3:4b` 拉模型。以下文件保存为 dmr.yaml：

```listing
title: 使用本地模型的 agent
source: capture/fixtures/agents/dmr.yaml
lang: yaml
note: 未截去任何内容。
---
version: "16"

providers:
  runner:
    provider: dmr
    base_url: http://localhost:12434/engines/llama.cpp/v1

models:
  qwen:
    provider: runner
    model: ai/qwen3:4b
    temperature: 0

agents:
  root:
    model: qwen
    description: Answers with one word.
    instruction: Reply with exactly one word.
```

先运行 docker-agent doctor，它找到 runner 与模型：

```listing
title: Model Runner 可达时的 doctor
source: capture/out/25-doctor.txt
lang: text
note: 仅保留 Model Runner 与模型选择块。
---
…
Docker Model Runner
  Status: reachable, 1 model(s) pulled:
    - docker.io/ai/qwen3:4b

Model auto-selection
  auto -> dmr/docker.io/ai/qwen3:4b
…
```

再不带终端界面运行 agent：

```listing
title: 本地模型的一次回答
source: capture/out/25-run-dmr.txt
lang: text
note: 未截去任何内容。录制按 fixtures/agents 下的路径传文件。
---
$ docker-agent run --exec --last fixtures/agents/dmr.yaml 'Say hello.'
Hello
[exit 0]
```

接着打开 capture/out/27-sandbox-run.txt，它是同类沙箱内运行，[完整运行一节](#s-docker-agent-run-sandbox-end-to-end) 逐行解读。

## 章节顺序 {#s-front-how-the-parts-are-ordered}

第1部分把两产品放在一页；第2至4部分拆解 sbx：沙箱及守护进程、隔离层、kit 与环境文件。第5、6部分拆解 docker-agent：文件与运行，再到服务与分享。第7部分介绍运维，参考部分是查询表：

```parts
```

## 图中颜色 {#s-front-colour-in-figures}

每种颜色在所有图中含义一致：

```palette
```

[图](#fig-0-1) 用录制交互讲解八种箭头。

```figure
id: fig-0-1
kind: sequence
title: 如何读本手册时序图
claim: 八种箭头各表示一种交互；每标签都是真实录制中的命令、规则、状态或事件名。
caption: 各编号行从箭尾读到箭头，下方说明标箭头类型。第1至7行来自 capture/out/09-blocked.txt、09-allow.txt、09-allowed.txt；第8、9行来自 27-inside-run.txt 与 cassette 18-files；第10行来自 04-auto-stop.txt。
```

第8行模型调用经过代理，[图](#fig-1-3) 将代理画为独立跳转。

Sources: help-sbx sbx run (research/sources/help-sbx.md); manual.json; research/sources/README.md; research/plan.md; research/conflicts-register.md rows C7, C9, C13, C48, C61; capture/README.md, capture/run.py; capture/fixtures/agents/dmr.yaml; capture/cassettes/18-files.yaml.gz; capture/out/README.md, 00-versions.txt, 03-policy-init.txt, 04-auto-stop.txt, 04-create.txt, 04-workspace.txt, 09-allow.txt, 09-allowed.txt, 09-blocked.txt, 25-doctor.txt, 25-model-ls.txt, 25-model-pull-latest.txt, 25-run-dmr.txt, 27-inside-run.txt, 27-sandbox-run.txt, 29-docker-agent-plugin.txt
