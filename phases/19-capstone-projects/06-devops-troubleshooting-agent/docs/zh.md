# 顶点项目 06 —— 面向 Kubernetes 的 DevOps 排障 agent

> AWS 的 DevOps Agent 正式 GA，Resolve AI 公开了它的 K8s 排查手册，NeuBird 演示了语义监控，Metoro 把 AI SRE 跟每个服务的 SLO 绑在了一起。生产形态已经定型：一个告警 webhook 触发，一个 agent 读遥测、走一遍 K8s 对象的图、给根因假设排序，再发一条带审批按钮的 Slack 简报。默认只读。每一次修复都要过人类这一关。这个顶点项目就是这样一个 agent，在 20 个合成事故上评测，并在三个共享案例上跟 AWS 的 Agent 对比。

**类型：** Capstone
**语言：** Python（agent）、TypeScript（Slack 集成）
**前置要求：** 第 11 阶段（LLM 工程）、第 13 阶段（工具与 MCP）、第 14 阶段（agent）、第 15 阶段（自主系统）、第 17 阶段（基础设施）、第 18 阶段（安全）
**涉及阶段：** P11 · P13 · P14 · P15 · P17 · P18
**预计时间：** 30 小时

## 问题背景

2025-2026 年的 SRE 叙事变成了：“AI agent 分诊事故，人类批准修复。”AWS DevOps Agent、Resolve AI、NeuBird、Metoro、PagerDuty AIOps 都在生产里出了这套形态。agent 读 Prometheus 指标、Loki 日志、Tempo trace、kube-state-metrics，以及一张 K8s 对象的知识图。它在五分钟内产出一个带遥测引用的、排好序的根因假设。它从不在没有通过 Slack 拿到明确人类批准的情况下执行破坏性命令。

大部分硬活儿是圈定范围和安全，不是推理。agent 需要一个默认只读的 RBAC 面、一个加固过的 MCP 工具服务器，以及对每条“考虑过 vs 执行了”的命令的审计日志。它需要知道自己什么时候超出能力范围并升级上报。而且它得跑得足够便宜，免得一次 OOM-kill 级联生成一张 5000 美元的 agent 账单。

## 核心概念

agent 在一张知识图上运作。节点是 K8s 对象（Pod、Deployment、Service、Node、HPA、PVC）加遥测来源（Prometheus 时序、Loki 流、Tempo trace）。边编码归属（Pod -> ReplicaSet -> Deployment）、调度（Pod -> Node）和观测（Pod -> Prometheus 时序）。这张图由一个 kube-state-metrics 同步保持新鲜，并在每次告警时重新采样。

告警触发时，agent 从受影响的对象开始定位根因。它走边、拉相关的遥测切片（最近 15 分钟），起草一个假设。假设按证据排序：有多少遥测引用支持它、有多新、有多具体。前三个假设带着图路径可视化和修复动作的审批按钮发到 Slack。

修复是有闸门的。默认允许的动作是只读的。破坏性动作（缩容、回滚、删 Pod）需要 Slack 批准；ArgoCD 回滚 hook 需要一个 agent 从不持有的鉴权 token。审计日志记录 agent *考虑过* 的每条命令——不只是执行了的——这样评审流程能抓到那些险些发生的事。

## 架构

```
PagerDuty / Alertmanager webhook
           |
           v
     FastAPI receiver
           |
           v
   LangGraph root-cause agent
           |
           +---- read-only MCP tools ----+
           |                             |
           v                             v
   K8s knowledge graph              telemetry slices
     (Neo4j / kuzu)              Prometheus, Loki, Tempo
   ownership + scheduling          last 15m, scoped
           |
           v
   hypothesis ranking (evidence weight)
           |
           v
   Slack brief + approval buttons
           |
           v (approved)
   ArgoCD rollback hook / PagerDuty escalate
           |
           v
   audit log: considered vs executed, every command
```

## 技术栈

- 可观测性来源：Prometheus、Loki、Tempo、kube-state-metrics
- 知识图：K8s 对象 + 遥测边的 Neo4j（托管）或 kuzu（嵌入式）
- agent：带逐工具白名单的 LangGraph，默认只读
- 工具传输：FastMCP over StreamableHTTP；破坏性工具放在单独的服务器上，置于审批闸门之后
- 模型：根因推理用 Claude Sonnet 4.7，日志摘要用 Gemini 2.5 Flash
- 修复：ArgoCD 回滚 webhook、PagerDuty 升级上报、Slack 审批卡片
- 审计：仅追加的结构化日志（考虑过、执行了、被批准、结果）
- 部署：用自己专属的窄 RBAC 角色做 K8s 部署；独立 namespace

```figure
ce-rootcause-walk
```

## 动手构建

1. **图摄入。** 每 30s 把 kube-state-metrics 同步进 Neo4j/kuzu。节点：Pod、Deployment、Node、Service、PVC、HPA。边：OWNED_BY、SCHEDULED_ON、EXPOSES、MOUNTS、SCALES。遥测叠加边：OBSERVED_BY（一个 Pod 被一个 Prometheus 时序观测）。

2. **告警接收器。** 一个接收 PagerDuty 或 Alertmanager webhook 的 FastAPI 端点。抽出受影响的对象和 SLO 违例。

3. **只读工具面。** 通过 FastMCP 封装 kubectl、Prometheus query、Loki logql、Tempo traceql。每个工具只有一个窄的 RBAC 动词（“get”、“list”、“describe”）。默认服务器里没有 “delete”、“exec”、“scale”。

4. **根因 agent。** 带三个节点的 LangGraph：`sample` 拉最近 15 分钟的遥测切片，`walk` 向图查询相邻对象，`hypothesize` 起草带遥测引用的、排好序的根因候选。

5. **证据评分。** 每个假设有一个分 = 时效性 * 具体度 * 图路径长度的倒数 * 引用数。返回前三。

6. **Slack 简报。** 发一条附件，带上假设、图路径可视化（服务端渲染的子图图像），以及至多一个修复动作的审批按钮。

7. **修复闸门。** 破坏性工具（缩容、回滚、删除）住在第二个 MCP 服务器上，置于一个审批 token 之后。只有 Slack 卡片被人类批准后，agent 才能调用它们。

8. **审计日志。** 仅追加的 JSONL：对每个候选命令，记录它是否被考虑过、是否被执行、谁批准的。每天发到 S3。

9. **合成事故套件。** 搭 20 个场景：OOMKill 级联、DNS 抖动、HPA 抖动、PVC 写满、吵闹邻居、故障 sidecar、坏 ConfigMap 上线、证书轮换、镜像拉取退避等。在根因准确率和到达假设的时间上给 agent 打分。

## 实际使用

```
webhook: alert.pagerduty.com -> checkout-api SLO breach, error rate 14%
[graph]   affected: Deployment checkout-api (3 Pods, Node ip-10-2-3-4)
[walk]    neighbors: ReplicaSet checkout-api-abc, Service checkout-api,
           recent rollout 14m ago
[sample]  prometheus error_rate 14%, up-trend; loki 500s on /api/v2/pay
[hypo]    #1 bad rollout: latest image checkout-api:v2.41 fails /healthz
          citations: deploy.yaml (rev 42), prometheus errorRate, loki 500 stack
[slack]   [ROLL BACK to v2.40]  [ESCALATE]  [IGNORE]
          (approval required; agent does not roll back unilaterally)
```

## 拿去用

`outputs/skill-devops-agent.md` 是交付物。给定一个 K8s 集群和告警来源，agent 产出排好序的根因假设和一个由 Slack 设闸门的修复流程。

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | 场景套件上的 RCA 准确率 | 在 20 个合成事故上根因正确 ≥80% |
| 20 | 安全性 | 审计日志里破坏性动作守卫从不在没有 Slack 批准的情况下触发 |
| 20 | 到达假设的时间 | 从告警到 Slack 简报 p50 低于 5 分钟 |
| 20 | 可解释性 | 每个假设都有图路径和遥测引用 |
| 15 | 集成完整度 | PagerDuty、Slack、ArgoCD、Prometheus 端到端跑通 |
| **100** | | |

## 练习

1. 在 AWS DevOps Agent 演示用的同样三个事故上跑你的 agent。发出并排对比。报告 agent 在哪里出现分歧。

2. 加一个“险些出事”审计，标出 agent *考虑过* 的、若没有批准本会是破坏性的任何命令。衡量一周内的险些出事率。

3. 把假设模型从 Claude Sonnet 4.7 换成自托管的 Llama 3.3 70B。衡量 RCA 准确率差值和每事故美元成本。

4. 做一个因果过滤器：把相关联的遥测尖峰跟真正的根因区分开。在 20 个场景的标签上训一个小分类器。

5. 加一个回滚演练：对一个用相同 manifest 的预发集群做 ArgoCD 回滚。在 Slack 审批按钮之前，在一个真实集群里验证回滚计划。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| K8s knowledge graph（K8s 知识图） | “集群图” | 节点 = K8s 对象 + 遥测时序；边 = 归属、调度、观测 |
| Read-only-by-default（默认只读） | “圈定的 RBAC” | agent 的 service account 只有 get/list/describe 动词；破坏性动词住在审批之后的独立服务器里 |
| Audit log（审计日志） | “考虑过 vs 执行了” | 对每个候选命令的仅追加记录，它是否运行了、谁批准的 |
| Hypothesis ranking（假设排序） | “证据分” | 时效性 × 具体度 × 图路径长度倒数 × 引用数 |
| Slack approval card（Slack 审批卡片） | “HITL 闸门” | 带修复按钮的交互式 Slack 消息；人类不点，agent 不能继续 |
| Telemetry citation（遥测引用） | “证据指针” | 支撑某条断言的一个 Prometheus 查询、Loki 选择器或 Tempo trace URL |
| MTTR | “解决耗时” | 从告警触发到 SLO 恢复的墙钟时间 |

## 延伸阅读

- [AWS DevOps Agent GA](https://aws.amazon.com/blogs/aws/aws-devops-agent-helps-you-accelerate-incident-response-and-improve-system-reliability-preview/) —— 2026 年的标准参考
- [Resolve AI K8s troubleshooting](https://resolve.ai/blog/kubernetes-troubleshooting-in-resolve-ai) —— 竞品参考
- [NeuBird semantic monitoring](https://www.neubird.ai) —— 语义图方法
- [Metoro AI SRE](https://metoro.io) —— SLO 优先的生产视角
- [kube-state-metrics](https://github.com/kubernetes/kube-state-metrics) —— 集群状态来源
- [LangGraph](https://langchain-ai.github.io/langgraph/) —— 参考 agent 编排器
- [FastMCP](https://github.com/jlowin/fastmcp) —— Python MCP 服务器框架
- [ArgoCD rollback](https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/) —— 设了闸门的修复目标
