# 术语表与图索引

> 每个术语在手册中只有一个含义，并指向定义章节；索引按断言列全部图。

每个术语在最后一列章节中定义一次，依据该节引用来源。下述含义来自帮助、schema、kit 规范及来源行所列文档。

## 术语表 {#s-ref-glossary-and-index-of-figures-glossary}

| 术语 | 本手册含义 | 定义章节 |
|---|---|---|
| Agent | agents 条目，含模型、指令、工具集及可选子 agent | [5.2](#s-agents-models-and-providers) |
| agent 文件 | docker-agent run 加载的 YAML/HCL，schema 标题 Docker Agent Configuration；含 agents、models、providers、toolsets 与彼此规则 | [5.2](#s-agents-models-and-providers) |
| Alloy | 两个模型逗号分隔的引用 a,b，运行时在同对话交替 | [5.2](#s-agents-models-and-providers) |
| 证明 | 附加到产物的签名声明：kit 的 SLSA 溯源，或共享 agent 的 DSSE 发布声明 | [4.3](#s-sbx-kit-pack-push-sign-and-verify) 与 [6.4](#s-share-push-and-share-pull) |
| 审计记录 | 守护进程逐决定写 auditkit 的 JSONL 行，按时间、数量、大小轮转 | [7.2](#s-org-policies-profiles-and-the-audit-log) |
| 后台 agent | run_background_agent 启动的子 agent，父 agent 继续时它也运行 | [sub_agents、transfer_task 与 background_agents](#s-sub-agents-transfer-task-and-background-agents) |
| 绑定 | credentials.yaml 中服务凭据机制及获准域名记录 | [3.5](#s-sbx-secret-set-import-and-set-custom) |
| 能力 | kit 向宿主发的类型化、版本化请求 com.docker.sandbox/<name>@N；结果为授予、拒绝或询问 | [4.2](#s-com-docker-sandbox-capabilities) |
| Cassette | --record 写入模型 API 交互、--fake 重放的文件 | [5.1](#s-docker-agent-run-new-and-doctor) |
| 克隆模式 | --clone：宿主仓库只读挂载 /run/sandbox/source，agent 操作私有克隆，经 sandbox-<name> remote 返回提交 | [3.2](#s-clone-and-run-sandbox-source) |
| 云沙箱 | sbx --cloud 在 Docker 计算资源运行的沙箱，无宿主工作区，有规格与 TTL | [7.1](#s-sbx-cloud-run-move-and-ttl) |
| 委派 | transfer_task：父 agent 发任务，子 agent 在子会话运行并返回结果 | [sub_agents、transfer_task 与 background_agents](#s-sub-agents-transfer-task-and-background-agents) |
| 环境文件 | sbxenv.yaml，声明一个沙箱的 agent、kit、工作区、密钥、端口、MCP 服务器与宿主命令 | [4.4](#s-sbxenv-yaml-and-sbx-env-plan) |
| 环境计划 | sbx env plan 打印应用文件将配置的全部内容，create/run 前批准 | [4.4](#s-sbxenv-yaml-and-sbx-env-plan) |
| Eval | docker-agent eval 在容器重放并评分的已保存会话 | [5.6](#s-session-db-sessions-diff-and-eval) |
| Flavor | flavors 下的 YAML 命名补丁，文件解析前用 --flavor 应用 | [5.2](#s-agents-models-and-providers) |
| 正向代理 | 沙箱 HTTP/HTTPS 经宿主代理，执行策略并注入凭据 | [3.4](#s-sbx-policy-log-and-the-proxy) |
| 网关 | 沙箱看到的唯一 MCP 端点，宿主提供，经它访问全部注册服务器；Toolkit/托管网关是独立同名产品 | [3.6](#s-sbx-mcp-add-load-and-static-mcp) |
| 治理 profile | 远程治理策略的命名 profile，用 --profile 分配给沙箱 | [7.2](#s-org-policies-profiles-and-the-audit-log) |
| `handoff` | handoffs: 注入工具，在同会话把完整对话交另一 agent，前者离开循环 | [sub_agents、transfer_task 与 background_agents](#s-sub-agents-transfer-task-and-background-agents) |
| Harness | 代替模型 provider 运行 agent 的外部编程 CLI：claude-code、codex、pi、opencode | [5.1](#s-docker-agent-run-new-and-doctor) |
| Hook | agent 33种生命周期事件之一运行的命令、内置、模型或 evaluator | [5.5](#s-permissions-safety-and-hooks) |
| Kit | manifest 注解 vnd.docker.sandbox.kit.descriptor 携带声明的 OCI 镜像；sbx kit 命令则指含 spec.yaml 的 v1/v2 产物 | [4.1](#s-syntax-docker-sandbox-kit-3-and-kit-yaml) |
| kit 参数 | kit 声明的参数值，用 --kit-arg name=value 给出 | [4.1](#s-syntax-docker-sandbox-kit-3-and-kit-yaml) |
| kit 集合 | 列出 kit、从不发布的 kind: set 描述文件 | [4.1](#s-syntax-docker-sandbox-kit-3-and-kit-yaml) |
| Mixin | kind: mixin 的 kit，覆盖 workload 文件系统；每组合零或多个 | [4.1](#s-syntax-docker-sandbox-kit-3-and-kit-yaml) |
| 模型引用 | provider/model、models 名称、auto、alloy 或 first_available 列表 | [5.2](#s-agents-models-and-providers) |
| 模型网关 | --models-gateway 设置、带 Docker token 路由模型流量的地址 | [R.6](#s-ref-providers-and-models) |
| 权限规则 | 工具名与参数的 allow/ask/deny 模式，顺序 deny、allow、ask | [5.5](#s-permissions-safety-and-hooks) |
| 策略 | 控制沙箱可访问对象的规则集；本地规则可对全部或单个沙箱 | [3.3](#s-sbx-policy-init-allow-deny-and-check-network) |
| 策略作用域 | global 为全部沙箱，local 为 --sandbox 指定单沙箱 | [3.3](#s-sbx-policy-init-allow-deny-and-check-network) |
| 预设 | sbx policy init 一次选择的 allow-all、balanced 或 deny-all | [3.3](#s-sbx-policy-init-allow-deny-and-check-network) |
| Provider | docker-agent 按 id 已知的模型 API，如 anthropic/dmr，或 providers 下带自身 base URL 的条目 | [5.2](#s-agents-models-and-providers) |
| 代理类型 | sbx policy log 的 PROXY 列：forward、forward-bypass、transparent、network、browser-open | [3.4](#s-sbx-policy-log-and-the-proxy) |
| Proxy-managed | 真实值留宿主、代理替换出站哨兵值的凭据；也指字面哨兵 proxy-managed | [3.5](#s-sbx-secret-set-import-and-set-custom) |
| 规则 | 策略的一条允许/拒绝，含 RULE_ID、资源模式与协议 | [3.3](#s-sbx-policy-init-allow-deny-and-check-network) |
| 安全模式 | strict、balanced、restricted、autonomous：无权限规则匹配时处理工具调用的方式 | [5.5](#s-permissions-safety-and-hooks) |
| 沙箱 | 独立内核和私有 Docker Engine 的 microVM，agent 作为容器运行；有名称、工作区、模板与生命周期 | [2.1](#s-sbx-run-create-stop-and-rm) |
| `sandboxd` | 拥有全部本地沙箱、通过 Unix socket 访问的宿主守护进程 | [2.4](#s-sandboxd-diagnose-and-reset) |
| 密钥 | sbx secret set 为13种服务、自定义主机或 registry 存宿主钥匙串的值，不进入沙箱 | [3.5](#s-sbx-secret-set-import-and-set-custom) |
| 哨兵值 | agent 看到的密钥占位值，如 proxy-managed | [3.5](#s-sbx-secret-set-import-and-set-custom) |
| 会话 | session.db 中对话记录，含每消息、工具调用、子 agent 运行与成本 | [5.6](#s-session-db-sessions-diff-and-eval) |
| 规格 | 云计费大小 micro/small/medium/large/xl，从1 vCPU、2048 MiB至16 vCPU、32768 MiB | [7.1](#s-sbx-cloud-run-move-and-ttl) |
| skills 存储 | sbx 链接到各沙箱的共享 SKILL.md 目录，默认只读 | [4.5](#s-sbx-skills-add-and-skills-true) |
| 静态集合 | --static-mcp 创建时固定的服务器，与后来 sbx mcp load 添加的不同 | [3.6](#s-sbx-mcp-add-load-and-static-mcp) |
| 子 agent | sub_agents 中父 agent 用 transfer_task 委派的 agent | [sub_agents、transfer_task 与 background_agents](#s-sub-agents-transfer-task-and-background-agents) |
| 模板 | 沙箱启动容器镜像：默认 docker/sandbox-templates:<agent>、保存快照或加载 tar | [2.3](#s-sbx-template-save-and-load) |
| 工具集 | toolsets 下含27种内置 type 之一的条目，提供一组工具 | [5.3](#s-toolsets-and-mcps) |
| 透明代理 | 宿主拦截非 HTTP/HTTPS TCP 的代理，执行策略，不注入凭据 | [3.4](#s-sbx-policy-log-and-the-proxy) |
| TTL | 云沙箱存活时间，默认一小时，创建起最多24小时 | [7.1](#s-sbx-cloud-run-move-and-ttl) |
| Workload | kind: workload 的 kit，根文件系统带 entrypoint、cmd、env、user、workdir；每组合恰一个 | [4.1](#s-syntax-docker-sandbox-kit-3-and-kit-yaml) |
| 工作区 | 沙箱以相同绝对路径挂载的宿主目录，默认读写，额外路径可标 :ro | [2.1](#s-sbx-run-create-stop-and-rm) |

## 图索引 {#s-ref-glossary-and-index-of-figures-index-of-figures}

每编号链接对应图，断言是图注开头的加粗句。

```figure-index
```

Sources: the definition paragraphs of sections 2.1 to 7.2 as research/plan.md plans them; research/sources/help-sbx.md (`sbx create claude`, `sbx template`, `sbx kit`, `sbx policy`, `sbx policy init`, `sbx policy allow network`, `sbx policy log`, `sbx secret`, `sbx secret set-custom`, `sbx mcp ls`, `sbx run`, `sbx template load`, `sbx ttl`, `sbx policy profile`, `sbx daemon status`, `sbx skills`); research/sources/help-docker-agent.md (`run`, `eval`, `serve`); research/sources/agent-schema.json (`AgentConfig`, `HooksConfig`, `HarnessConfig`, `Toolset`); research/sources/SPEC-v3-at-v3.0.0-m.8.md §1, §3.4, §7; research/sources/docs-sandboxes.md (pages architecture, configuration/credentials, governance/audit); research/sources/docs-docker-agent.md (pages concepts/models, concepts/agents, configuration/flavors, configuration/permissions, features/sessions, features/cli); the figure blocks of front.md and every file under sections/
