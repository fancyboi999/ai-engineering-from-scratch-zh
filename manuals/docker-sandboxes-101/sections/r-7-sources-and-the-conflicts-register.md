# 来源与冲突登记表

> 两棵帮助树、一个 schema、一份 kit 规范、随仓库保存的文档、发布说明与录制套件，为各节涉及的冲突给出裁定。

固定 sbx 0.47.0、docker-agent 1.149.0（manual.json），agent schema 16、Sandbox Kit Spec milestone v3.0.0-m.8。固定日期2026-10-07，事实核验日期2026-10-08。下列文件均在 research/sources/，README 记录来源、commit、行数与许可。

## 固定版本 {#s-ref-sources-and-the-conflicts-register-the-pin}

| 项目 | 值 |
|---|---|
| sbx | v0.47.0，commit `0411f50ee4700fe7bd37e6e7e3aced563e850ca9`，Homebrew cask，2026-10-05发布 |
| docker-agent | v1.149.0，Homebrew 构建，tag commit `bf4169cdd31229d52385410c52c3dcc59b497858`，2026-10-07发布 |
| agent 文件 schema | 版本16，v1.149.0 tag 的 agent-schema.json |
| Sandbox Kit Spec | v3.0.0-m.8，tag commit `129be2ff45e8f9463450eb3cf04ddcb52c2b76e5`，2026-10-02，预发布 |
| docs.docker.com | 2026-10-08提供的252页，docker/docs 源仓库 `2c8a358489b56cd24069cc9e3a3d9a7b376dcfe7` |
| 录制机器 | 一台 macOS Mac，探测录于2026-10-08的06:55Z至06:58Z |

## 来源优先级 {#s-ref-sources-and-the-conflicts-register-the-ranked-sources}

来源冲突时高位优先，正文注明。下表重述 manual.json 排名及 quoteSources 引用键。

| 排名 | 来源 | 引用形式 | 用途 |
|---|---|---|---|
| 1 | sbx 0.47.0、docker-agent 1.149.0 打印的帮助 | help-sbx、help-agent 加命令 | 全部命令、flag、默认值与路径 |
| 2 | v1.149.0 agent schema | schema 加定义 | 全部 agent 文件键、类型与默认值 |
| 3 | v3.0.0-m.8 tag 的 Sandbox Kit Spec v3 | kitspec 加章节，未发布变更用 kitspec-main，能力页用 kitcap | kit 描述文件与各能力 |
| 4 | 2026-10-08获取的 Docker 文档 | docs-sbx、docs-agent、docs-dmr、docs-mcp、docs-sbx-api、docs-desktop 加页面 | 帮助未说的规则和限制 |
| 5 | 发布说明 | rel-sbx、rel-agent 加版本 | 行为何时出现、改变或移除 |
| 6 | 研究文件中的 Docker 博客与演讲 | blog、talk 加日期，声明为 null | 仅历史与定位，不作规则依据 |
| 7 | 录制套件 | capture/out/ 下文件 | 展示的全部命令输出、文件与记录 |

## 随仓库保存的文件 {#s-ref-sources-and-the-conflicts-register-the-vendored-files}

| 文件 | 来源 | Commit、tag 或版本 |
|---|---|---|
| `help-sbx.md`, `help-sbx-cloud.md` | 完整 sbx --help 树与 sbx --cloud --help 程序输出 | sbx v0.47.0 `0411f50ee4700fe7bd37e6e7e3aced563e850ca9` |
| `help-docker-agent.md` | 完整 docker-agent --help 树 | docker-agent v1.149.0, Commit: Homebrew |
| `help-legacy-docker-sandbox.md`, `help-legacy-docker-agent.md` | docker sandbox 与 docker agent 插件树，留作对照 | plugin v0.12.0 `f13b3c1a96a8be40b06473bb3db0c26dbfe1878c`, plugin v1.32.4 `bd55840ec12b55874dd9fccf88912f9b6bb3e3f3` |
| `agent-schema.json` | docker/docker-agent `agent-schema.json` | tag v1.149.0 `bf4169cdd31229d52385410c52c3dcc59b497858` |
| `docker-agent-CHANGELOG.md` | docker/docker-agent CHANGELOG.md，最新 v1.149.0，无 v1.146.0 项 | tag v1.149.0 `bf4169cdd31229d52385410c52c3dcc59b497858` |
| `docker-agent-README.md` | docker/docker-agent `README.md` | main `7a69c316f03c635d8d1951bc4677c59b47beedc7` |
| `SPEC-v3-at-v3.0.0-m.8.md` | tag 中 docker/sandbox-kit-spec docs/spec/SPEC-v3.md | tag v3.0.0-m.8 `129be2ff45e8f9463450eb3cf04ddcb52c2b76e5` |
| `SPEC-v3.md`, `kit-capabilities.md`, `kit-spec-extras.md`, `kit.schema.json` | main 上同一规范、20能力页、README/治理文件及 kit schema | main `4be7f4dff4d647f10c51dcdb392ce3fa18dc3e96`, 2026-10-07 |
| `docs-sandboxes.md` | /ai/sandboxes/ 下79页 | docker/docs main `2c8a358489b56cd24069cc9e3a3d9a7b376dcfe7`，2026-10-08提供 |
| `docs-docker-agent.md` | /ai/docker-agent/ 下108页 | 同上 |
| `docs-model-runner.md`, `docs-mcp.md`, `docs-compose-models.md`, `docs-sandboxes-api.md`, `docs-desktop-release-notes.md` | 分别8、10、3、44页及至4.94.0的 Desktop 发布说明 | 同上 |
| `sbx-releases.md` | docker/sbx-releases GitHub releases，仅稳定 v0.21.0至v0.47.0，未保留正文 | 2026-10-08读取 API，仓库 main `2329d12106fee653c0890152947fdd827e00cfd0` |
| `mcp-gateway-README.md`, `model-runner-README.md`, `compose-for-agents-README.md` | 各仓库 README | main `a34df45d4ec0e941a9853ad768c4f6cd818966b3`, `ed3e67a8205b8d068b9c65b30d3708132a231bba`, `bfd4fe952591495af757a1a737c7eacc78c75c15` |
| `probes/` | 21次只读命令，带时间戳与退出码 | sbx v0.47.0, docker-agent v1.149.0, 2026-10-08 |

sbx 帮助及发布说明为 Docker Inc. 专有程序输出，以短引文引用。docker/docker-agent、docker/sandbox-kit-spec、docker/docs、docker/model-runner 为 Apache-2.0；docker/mcp-gateway 为 MIT；docker/compose-for-agents 为 Apache-2.0 或 MIT（research/sources/LICENSES.md）。

## 冲突登记表 {#s-ref-sources-and-the-conflicts-register-the-conflicts-register}

research/conflicts-register.md 分九组保存122冲突 C1至C122，以及30条过时建议 S1至S30。下表保留计划章节条目引用或裁定指向章节的全部 C 行，共94行，逐项给手册遵循的裁定。其余28行未用于正文，为缩短表格不列；下一表按组列 id，实质内容在 S 行或原登记表。类型沿用登记表标签。

| 分组 | 省略行 |
|---|---|
| A, sbx | C1, C2, C3, C5, C6, C8, C10, C11, C14, C22, C23, C24, C30 |
| B, docker-agent | C55, C57, C74 |
| C, Docker Model Runner | C78, C80, C81, C82, C85 |
| D，MCP 网关与 Toolkit | C86, C87 |
| E, Compose | C94, C95, C97 |
| F, Offload | C100 |
| G, Cloud Sandboxes | C102 |

| Id | 类型 | 分歧 | 裁定 |
|---|---|---|---|
| C4 | 演讲与文档冲突 | VMM 是 libkrun、Firecracker，还是 Docker 自写 | Docker 自写 VMM，使用 Hypervisor.framework、WHP、KVM；libkrun 未验证 |
| C7 | 已移除 | shell 导出 API key，与 v0.35.0 起密钥存储冲突 | 密钥来自存储；-e KEY 是普通变量 |
| C9 | 文档与CLI冲突 | 博客列五至九名称，sbx run --help 列11 | 帮助11名称、8个 create 子命令、cagent 别名 |
| C12 | 文档与仓库冲突 | 默认 kit 卷512 MB，与规范文档20 GiB冲突 | 并列数字与来源，不给单一默认 |
| C13 | 文档与CLI冲突 | v1/v2/v3 kit，而 sbx kit 只提 v1/v2 | sbx kit 产物命令仅 v1/v2；v3 是 Docker 工具构建的 OCI 镜像 |
| C15 | 社区与文档冲突 | 无需 Desktop，却要求登录 | 两者都对；无需 Desktop，需要 Docker 账户登录 |
| C16 | 未记录 | 文本提 sbx mount、sbx ssh proxy、sbx policy approval、--model、--provider、--usb，树中无 | 只记录 --help 输出，集中注明隐藏名称 |
| C17 | 未记录 | 插件时期目录与 sbx 状态目录不同 | 无状态迁移 |
| C18 | 文档与CLI冲突 | platform.allowExperimentalFeatures 文档 false，CLI true | 用录制值与 SOURCE |
| C19 | 文档与CLI冲突 | 文档 feature.* 不在 `sbx settings list` | 只列 CLI 返回键，另注已记录键 |
| C20 | 未记录 | CLI 有文档未列的 ssh.autoCreate、ssh.defaultAgent、ssh.defaultTemplate、ssh.workspaceRoot | 纳入，并用 `sbx settings list --json` 完整说明 |
| C21 | 文档与CLI冲突 | 文档11服务，CLI13 | 13服务 |
| C25 | 已改名 | 插件名称规则与 sbx 不同 | sbx：2至63字符，字母/数字/连字符/句点，default 保留 |
| C26 | 未记录 | host.docker.internal:3128 或 gateway.docker.internal:3128，文档无地址 | 用录制地址与变量 |
| C27 | 博客过时 | UDP/ICMP 永久阻止，与 feature.udp-egress 后 UDP 冲突 | 实验 flag 后有 UDP 规则；ICMP 阻止，DNS 受策略控制 |
| C28 | 实验性 | ls/审计有文件系统策略，policy log 不支持 | v0.47.0 可列文件系统规则但不记日志 |
| C29 | 演讲与文档冲突 | 近乎即时启动与数秒冲突 | 手册只采用自身单机计时，不用厂商数字 |
| C31 | 已移除 | docker sandbox exec -d 与 `sbx exec -d` 不支持 | 第2.2节说明 |
| C32 | 已改名 | docker sandbox save 存宿主，现为运行时镜像存储 | 第2.3节及迁移表说明 |
| C33 | 未记录 | Gordon 在宿主，`sbx reset` 却清 Gordon 会话 | 只引用帮助行 |
| C34 | 社区与文档冲突 | 自定义密钥 header 匹配，与 --header/--format 仅云冲突 | 用接收器录制请求，两个 flags 仅云 |
| C35 | 文档与CLI冲突 | proxy-managed 与 GHO_SBX_PROXY_MANAGED、docker-placeholder-value 不同 | 用录制值 |
| C36 | 文档互相冲突 | 云需0.45.0还是0.45.1 | 0.45.1 |
| C37 | 未记录 | 审计 JSONL 需0.39.0，未说订阅 | 用运行后目录实际内容 |
| C38 | 已移除 | 相对 --command helper 与 v0.46.0 新临时目录冲突 | 可写挂载外的绝对 helper 路径 |
| C39 | 已移除 | -p 绑定双回环，与 v0.42.0 tcp4 冲突 | tcp4 规则 |
| C40 | 已移除 | 任意 registry kit 与 v0.34.0 kit.allowedSources 冲突 | 本地 registry 需修改设置，并展示未修改错误 |
| C41 | 已移除 | 仅全局规则，与 v0.29.0 沙箱级策略冲突 | global、local 两作用域 |
| C42 | 文档与CLI冲突 | 受管理块的 ssh <name>.sbx 与 `sbx setup ssh` 细节 | 用帮助事实 |
| C43 | 文档与CLI冲突 | 模板与 kit 不同，但 kit 可为 agent 位置参数 | 第2.1节一次定义三个词 |
| C44 | 未记录 | 仪表盘 TUI 与无命令 sbx | 两个入口都列 |
| C45 | 社区与文档冲突 | 客户机16K页与 `sbx diagnose` 行 | 用 diagnose 行 |
| C46 | 文档与CLI冲突 | sbx kit ls 与 unknown command | 帮助所列十个 kit 子命令 |
| C47 | 文档与CLI冲突 | --cloud 相同动词与隐藏/仅云动词 | 逐项标本地、云或两者 |
| C48 | 文档与CLI冲突 | 插件 v1.32.4 与 Homebrew v1.149.0 | Homebrew v1.149.0，两者都录制 |
| C49 | 文档互相冲突 | Desktop 4.63 的 Agent，与4.64.0首项说明 | 文档4.63，首项说明4.64.0 |
| C50 | 未记录 | 每 Desktop 声明内置版本，但部分不说 | 第7.3节脚注 |
| C51 | 已改名 | cagent 命令/文档，与 docker agent、/ai/docker-agent/ | 迁移 S5至S9 |
| C52 | 已移除 | cagent config/feedback/build/catalog/exec 与 v1.23.4 重组 | 迁移 S6、S7 |
| C53 | 已改名 | CAGENT_* 与 v1.30.0 DOCKER_AGENT_* | 新名加旧别名 |
| C54 | 已改名 | 完整改名与目录仍为 cagent | 照列实际路径 |
| C56 | 文档与仓库冲突 | handoff、transfer_task 被列为类型，实际27类型无两者 | 不是类型，单独标隐式行 |
| C58 | 已改名 | fireworks、together、moonshot、opencode-zen 与规范 ids | 规范 ids 加别名列 |
| C59 | 已改名 | --yolo 与 --safety autonomous | 后者为主，前者为别名 |
| C60 | 文档与CLI冲突 | --sandbox 需 Desktop，与 --sbx 默认 true | Desktop 4.80.0后 --sbx=false 无可用目标 |
| C61 | 文档互相冲突 | docker/docker-agent-sbx-templates:latest 与 docker/sandbox-templates:docker-agent | 两启动路径用两镜像 |
| C62 | 未记录 | --sandbox 内 --yolo 与未说明默认 | 本版模式未知；打印前运行报 "attempt to write a readonly database (1032)"（27-sandbox-run.txt） |
| C63 | 文档与CLI冲突 | <data-dir>/session.db 与 serve api 当前目录 session.db | 两默认都列 |
| C64 | 已改名 | serve a2a -a 默认 root 与团队首个 | v1.149.0文本 |
| C65 | 文档与CLI冲突 | eval -c CPU数/Anthropic judge，与10/openai/gpt-5.6-terra | 10与 openai/gpt-5.6-terra |
| C66 | 文档与CLI冲突 | new --model 30 provider，与帮助四个 | new 在这些中自动选，run --model 接受任意 provider |
| C67 | 文档与仓库冲突 | DOCKER_AGENT_* 关闭遥测与 TELEMETRY_ENABLED=false | 两者都列 |
| C68 | 未记录 | /reference/cli/docker/agent/ 参考与404 | features 页与帮助树 |
| C69 | 未记录 | N 个内置 hook 与八个已确认名称 | 只列确认项 |
| C70 | 文档互相冲突 | serve a2a 完整支持与所列限制 | 录制 card 及录制展示的各限制 |
| C71 | 未记录 | /.well-known/agent-card.json 与未声明路径 | 实际响应路径及 protocolVersion |
| C72 | 未记录 | Gordon 独立，与 docker ai 调 Docker Agent | 第1.1节一句说明 |
| C73 | 未记录 | ref: docker:<name> 经网关，与未说 Toolkit | 并列两种结果 |
| C75 | 未记录 | 无参数 docker agent 运行 run，与 getting-started 列首位 | 按帮助说明 |
| C76 | 文档互相冲突 | 服务 agent 转发预算，与不转发 | 预算不适用于服务 agent |
| C77 | 文档与CLI冲突 | docker model configure 与命令缺失 | 以实际存在为准；Agent 经 _configure 设 context_size |
| C79 | 文档互相冲突 | /anthropic/v1/messages 与 /v1/messages | 实际返回200的一条 |
| C83 | 未记录 | context_size 生效与 issue #4522 | runner 实收请求正文 |
| C84 | 文档互相冲突 | 无需 key 与 API 无认证 | 同一事实，第6.5节说明 |
| C88 | 文档与仓库冲突 | 仅受邀网关与 MIT 网关 | 两个产品同名，第6.5节区分 |
| C89 | 文档与仓库冲突 | --verify-signatures 无默认与 true | 用帮助默认 |
| C90 | 文档与仓库冲突 | registry 引用支持与部分实现 | Toolkit 标部分实现 |
| C91 | 文档互相冲突 | 统一网关与独立沙箱网关 | 列三种网关 |
| C92 | 未记录 | 已知内置网关版本与最后只声明0.42.2 | 并列输出 |
| C93 | 文档过时 | Action 安装v0.22.0与v0.44.1 | 第7.3节一句说明 |
| C96 | 社区与文档冲突 | Compose 启动沙箱与无此功能 | 第6.5节一句说明 |
| C98 | 博客过时 | 300免费 GPU 分钟与无公开价格 | Offload 不在范围 |
| C99 | 文档互相冲突 | Offload 云路径与 sbx --cloud | 第7.1节说明 |
| C101 | 文档互相冲突 | 价格已记录，与仅博客/template load --help | 规格来自帮助，价格来自注明日期的博客 |
| C103 | 文档互相冲突 | Personal 按量付费与 Personal/Pro | Personal或Pro，其余未验证 |
| C104 | 文档互相冲突 | 云 docker exec/healthcheck 正常，与访问 VM 文件系统 | 文档限制 |
| C105 | 演讲与文档冲突 | Warp Oz 在 Docker 云沙箱与无确认 | 不纳入 |
| C106 | 博客过时 | Kubernetes 内沙箱原语与无其他提及 | 不纳入 |
| C107 | 已移除 | 插件仍在 Desktop 与4.80.0移除 | 录制错误文本 |
| C108 | 已移除 | --mount-docker-socket、--load-local-template、--pull-template 与 sbx 无 | 迁移 S1至S4 |
| C109 | 已改名 | network proxy flags 与无 bypass 的 policy | 迁移 S10/S11，未找到 bypass 替代 |
| C110 | 已移除 | 旧默认允许主机与三个预设 | 旧清单仅第7.3节 |
| C111 | 已移除 | Desktop cagent 与4.81.0移除 | 迁移 S8 |
| C112 | 已移除 | 守护进程环境密钥/~/.docker/sandboxes/ 状态与 sbx 存储 | 第7.3节一张表 |
| C113 | 文档与CLI冲突 | frontend 提升 index 注解（kitspec §9.3）与无注解、带 attestation 的 index | 第4.1节并列；注解在平台 manifest（28-index.json、28-manifest.json），index 无时消费者读取它 |
| C114 | 文档与CLI冲突 | 浮动 docker/sandbox-kit:3 不指 milestone 与解析3.0.0-m.8 | 第4.1节并列（28-buildx.txt）；需每次同 frontend 应指定精确 tag |
| C115 | 文档与CLI冲突 | `docker buildx build -f kit.yaml --push` 发布，与默认 docker driver 无注解 schema2 | 第4.1节要求 docker-container builder（28-manifest-docker-driver.json、28-manifest.json）；无注解不是 kit |
| C116 | 文档与CLI冲突 | 开发可传本地源目录，与 Desktop 4.94.0 `sbx kit inspect` 失败 | 第4.1节并列（13-kit-v3-inspect.txt、28-kit-inspect-source.txt）；未录制 run 目录 |
| C117 | 文档与CLI冲突 | 源构建在 sbx-kit-builder，与宿主构建、builder "not created" | 第4.1/4.3节列帮助与状态（13-kit-builder-status.txt）；成功源构建在哪仍未说明 |
| C118 | 文档与仓库冲突 | 当前配置15，与 schema enum16及可加载录制文件 | 用 schema "16"（5.2、R.4），文档仍写15 |
| C119 | 文档与CLI冲突 | 首消息生成标题，与五会话 Running agent | 第5.6节列五行（21-session-db.txt） |
| C120 | 文档与CLI冲突 | A2A1.0.1要求 skill 名/模式列表，与空名、两空列表 | 第6.3节对照 card 与规则（23-agent-card.json）；客户端兼容空值 |
| C121 | 文档与CLI冲突 | "A2A artifact support not yet integrated" 与答案在 artifacts | 第6.3节指出录制反驳限制（23-a2a.http） |
| C122 | 文档与CLI冲突 | 发布说明指 docker sbx，与通知指产品页、插件仍列 sandbox v0.13.0 | 第7.3节列通知（29-docker-sandbox.txt、29-docker-plugins.txt）；插件项仍在，命令只输出通知 |

## 过时建议 {#s-ref-sources-and-the-conflicts-register-stale-advice}

迁移一节打印每行；最后一列是登记表给出的当前做法。

| Id | 原建议 | 失效版本/时间 | 替代做法 |
|---|---|---|---|
| S1 | `docker sandbox run <agent>` | Desktop 4.80.0, 2026-06-29 | `sbx run <agent>` |
| S2 | `docker sandbox run --mount-docker-socket kiro` | Desktop 4.58.0, 2026-01-26 | 每沙箱有私有 Docker Engine |
| S3 | `--load-local-template` | Desktop 4.61, 2026-02-18 | `sbx template load FILE`，再 `--pull never -t TAG` |
| S4 | `--pull-template missing` | v0.21.0, 2026-03-31 | `--pull always`、`missing` 或 `never`，默认 always |
| S5 | `docker sandbox create cagent .` | Desktop 4.80.0 | `sbx create docker-agent .`，cagent 保留别名 |
| S6 | `cagent run agent.yaml`, `cagent new`, `cagent exec` | v1.23.4，2026-02-19及 Desktop 4.81.0 | `docker agent run`, `docker agent new`, `docker agent run --exec` |
| S7 | `cagent push`, `pull`, `acp`, `api`, `mcp`, `a2a` | v1.23.4 | `docker agent share push` 或 pull；`docker agent serve acp`、api、mcp、a2a |
| S8 | `cagent version`, `brew install cagent` | v1.30.0，2026-03-09及 Desktop 4.81.0 | `docker agent version`, `brew install docker-agent`, `winget install Docker.Agent` |
| S9 | `cagent config`, `feedback`, `build`, `catalog` | v1.23.4 | 已移除，catalog 是 Hub namespace agentcatalog/* |
| S10 | `docker sandbox network proxy S --allow-host api.example.com` | Desktop 4.80.0 | `sbx policy allow network api.example.com [--sandbox S]` |
| S11 | `docker sandbox network log --json` | Desktop 4.80.0 | `sbx policy log [S] --json` |
| S12 | `docker sandbox save S TAG` 存宿主 Docker | Desktop 4.80.0 | `sbx template save S TAG [-o FILE]` 存运行时 |
| S13 | 手动设代理 host.docker.internal:3128 | sbx，守护进程配置代理 | 无需操作，录制打印沙箱实际值 |
| S14 | ~/.zshrc API key，再重启 Desktop | v0.35.0, 2026-07-10 | `sbx secret set SERVICE` 或 `sbx secret import` |
| S15 | `sbx run claude --branch` | v0.31.0, 2026-05-28 | `sbx run claude --clone` |
| S16 | kit v1 语法，schemaVersion: "1" | 2026-09-09推荐v2，2026-09-24发布v3 | sbx kit 产物用 v2 spec.yaml，OCI kit 用带 # syntax=docker/sandbox-kit:3 的 v3 kit.yaml |
| S17 | `sbx mcp catalog` | v0.45.0, 2026-09-21 | `sbx mcp add --url <registry or manifest URL>` |
| S18 | `sbx mcp enable github-official --sandbox my-project` | 从未在帮助树 | `sbx mcp add`，再 --static-mcp 或 sbx mcp load |
| S19 | Docker Agent v2.x 改名 CLI | 从未正确 | 最新 v1.149.0 |
| S20 | `docs.docker.com/ai/cagent/` | v1.30.0 改名 | `docs.docker.com/ai/docker-agent/` |
| S21 | `CAGENT_MODELS_GATEWAY`, `CAGENT_CONFIG_DIR`, `CAGENT_PPROF_ADDR` | v1.30.0，仍接受 | `DOCKER_AGENT_MODELS_GATEWAY`, `DOCKER_AGENT_CONFIG_DIR`, `DOCKER_AGENT_PPROF_ADDR` |
| S22 | `docker/sandbox-templates:cagent` | 改名时 | `docker/sandbox-templates:docker-agent` |
| S23 | --command helper 写成 ./helper 或 cat token | v0.46.0, 2026-09-28 | 沙箱可写挂载外的绝对路径 |
| S24 | -p 3000:8080 绑定 IPv4/IPv6 | v0.42.0, 2026-09-07 | 默认 tcp4，双栈写 3000:8080/tcp |
| S25 | 任意 registry 的 kit | v0.34.0, 2026-06-26 | 将前缀加 kit.allowedSources |
| S26 | docker cp 程序，再内部 agent run dev-team.yaml | sbx 与 docker-agent 模板 | `sbx run docker-agent .` 或 `docker agent run --sandbox agent.yaml` |
| S27 | 每工作区一个沙箱 | 默认名称 <agent>-<workdir> | 用 --name 命名 |
| S28 | 支持 Windows 10 | v0.35.0, 2026-07-10 | Windows 11 加 Windows Hypervisor Platform |
| S29 | 五步配置 host.docker.internal:8811 Toolkit 网关 | v0.38.0, 2026-08-06 | `sbx mcp add` 与 `sbx mcp load`，Toolkit 网关独立 |
| S30 | eval 使用付费 Anthropic judge | v1.147.0, 2026-10-05 | 默认 openai/gpt-5.6-terra，任意 provider/model 可用 |

Sources: manual.json (pin, sources, quoteSources); research/sources/README.md (origins, commits, tags, versions, and the trim of 2026-10-08); research/sources/LICENSES.md; research/conflicts-register.md (rows C1 to C122 and S1 to S30, with the plan's citations in research/plan.md used to pick the rows); research/sources/probes/ (the probe timestamps); capture/out/13-kit-builder-status.txt, 13-kit-v3-inspect.txt, 21-session-db.txt, 23-a2a.http, 23-agent-card.json, 27-sandbox-run.txt, 28-buildx.txt, 28-index.json, 28-kit-inspect-source.txt, 28-manifest.json, 28-manifest-docker-driver.json, 29-docker-plugins.txt, 29-docker-sandbox.txt (the files that rows C62 and C113 to C122 name)
