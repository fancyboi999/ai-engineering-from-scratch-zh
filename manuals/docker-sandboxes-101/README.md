# Docker Sandboxes 与 Docker Agent 入门

Docker Sandboxes 固定 sbx v0.47.0，Docker Agent 固定 docker-agent v1.149.0，从首个沙箱走到可服务和分享的 agent。中文网页见 [aieng-zh.cn/manual-docker-sandboxes-101.html](https://aieng-zh.cn/manual-docker-sandboxes-101.html)；上游课程各 release 附 PDF `aiefs-manual-docker-sandboxes-101.pdf`。

## 内容

- 7部分33节，另有8节参考，共41节。第1至4部分介绍两产品、沙箱/守护进程、隔离层、kit/环境文件；第5至7部分介绍 agent 文件与运行、服务/分享及运维。
- 34幅图与一幅封面图，以录制文件及 figure kit 绘制；网页动画，打印显示最终帧。
- capture/ 下仅用 Python 标准库的录制套件，执行真实 sbx、docker-agent、docker，将输出写 capture/out/。
- 111个 listing：94个来自 capture/out/，11个来自 capture/fixtures/，1个来自 capture/run.py，5个来自随仓库保存的来源。
- 帮助、文档、仓库、发布说明、博客、演讲、社区讨论的122项冲突及裁定；另有30条过时建议，迁移节逐条给当前形式。
- Docker 页面及社区22项断言的台账，逐项给结论与录制证据。
- 录制展示但文档没说的21种行为，列于 capture/README.md。

## 文件

| 路径 | 内容 |
|---|---|
| manual.json | manifest：固定版本、章节、配色、来源 |
| front.md、sections/ | 正文，每节一个文件 |
| figures/src/ | 图源，构建为 figures/*.svg |
| capture/ | 套件、fixtures、模型 cassettes，以及 capture/out/ 原始录制 |
| research/sources/ | 保存的帮助、schema、kit 规范、文档、发布说明及许可 |
| research/*.md | 计划、录制计划及正文引用的冲突登记表 |

## 录制宿主

以下是上游在 Apple silicon、macOS 26.2 的一台 Mac 的录制，不是中文镜像维护者在本机复现：

| 项目 | 版本 |
|---|---|
| sbx | Homebrew cask v0.47.0，revision 0411f50e |
| docker-agent | Homebrew v1.149.0，tag commit bf4169c |
| Docker Desktop | 4.94.0，Engine 29.8.2、buildx v0.37.2、Compose v5.5.1 |
| Docker Model Runner | docker model v1.2.6，TCP12434，模型 ai/qwen3:4b |
| 沙箱模板 | docker/sandbox-templates:shell-docker，Ubuntu 26.04.1 |
| Python | 3.14 |

文档默认 ai/qwen3:latest 在该 Mac 两次 digest 不匹配拉取失败；因此每文件指定 ai/qwen3:4b。套件不用托管 provider 或 API key。

## 录制级别

sbx 从 Docker Hub 镜像启动真实 microVM，agent 需模型，不能离线 CI 运行。录制三级：

| 级别 | 要求 | 内容 |
|---|---|---|
| A | sbx、docker-agent、docker 客户端，无守护进程、网络、模型、key | 版本、根帮助、docker-agent doctor、toolsets、models list、试运行、旧 Desktop 命令（00、01、16、29） |
| B | sbx 已登录、sandboxd、Hub 拉镜像、example.com/mcp.deepwiki.com HTTPS | 生命周期、端口、cp、模板、--clone、策略、密钥、MCP、kit、env plan、skills（02至15） |
| M | Desktop4.94.0、TCP12434的 Model Runner、已拉 ai/qwen3:4b、容器、Compose、buildx、本地 registry | agent、团队、权限、会话、eval、五种服务、share、Model Runner、Compose、run --sandbox、v3构建（17至28、98） |

C级需 Cloud Sandboxes、GitHub token 或改 ~/.ssh/config，未录制，相关正文引用文档。

M级多数用 --fake 重放 capture/cassettes/；eval、三种服务、显式 base_url 的运行及 run --sandbox 用 temperature: 0 实时调用模型。

## 运行套件

```bash
cd manuals/docker-sandboxes-101
python3 capture/run.py --check
```

检查重新录制到临时目录，遮蔽变化值后逐文件比较 capture/out/。缺 sbx、docker-agent 或 docker 则打印 skipped 与原因、退出0。缺 Model Runner 或 ai/qwen3:4b，则运行 A/B 并打印 tier m skipped。

`python3 capture/run.py` 重新录制。全量前用 sbx login 登录、启动 Desktop、docker model pull ai/qwen3:4b 拉模型；套件不自行登录或拉模型。镜像已存在时 M系列笔记本全三级约17分钟。

套件移除自己创建的沙箱、模板、容器与密钥，全局策略与已拉镜像保留。前置要求、端口、遮蔽规则及 fixtures 见 capture/README.md。

## 构建与检查

从仓库根目录运行：

```bash
node manuals/_shared/figkit.js build manuals/docker-sandboxes-101
node site/build-manuals.js
node scripts/audit_manuals.js --manual docker-sandboxes-101
```

装有程序的宿主审计会执行需登录和模型的全量录制检查；设 AIEFS_CAPTURE_SKIP=1 跳过。审计应报告 TOTAL 0。契约见 [manuals/AUTHORING.md](../AUTHORING.md)。中文同步只做离线静态检查，不执行上述需权限/资源的录制任务；原始输出与规范引文保持原样，教学解释译为中文。
