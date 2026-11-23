---
name: devops-agent
description: 构建 Kubernetes 故障排查 agent：遍历集群知识图谱，对根因排序，每项修复操作都要经过 Slack 审批。
version: 1.0.0
phase: 19
lesson: 06
tags: [capstone, devops, sre, kubernetes, langgraph, fastmcp, aiops]
---

给定一个 K8s 集群和一个告警源（PagerDuty 或 Alertmanager），构建一个 agent：五分钟内给出排好序的根因假设，并且每项修复操作都必须经过 Slack 审批卡片放行。

构建计划：

1. 每 30 秒把 kube-state-metrics 摄取进 Neo4j 或 kuzu。构建一张包含 Pod、Deployment、Service、Node、PVC、HPA 的图，并加上指向 Prometheus、Loki、Tempo 数据源的遥测叠加边。
2. 搭一个 FastAPI webhook 接收器，对接 PagerDuty 和 Alertmanager。
3. 通过 FastMCP（StreamableHTTP 传输）暴露只读工具：kubectl get/describe、promql、logql、traceql。
4. 用 LangGraph 构建根因 agent，包含三个节点：`sample`（拉取 15 分钟遥测）、`walk`（遍历图上的邻居）、`hypothesize`（按时效性 × 具体程度 × 引用数对候选排序）。
5. 把排名前 3 的假设连同图路径可视化发到 Slack，附审批按钮。
6. 把破坏性工具（扩缩容、回滚、删除）放在另一个 FastMCP 服务器上，用审批令牌保护；agent 只有在 Slack 签字确认后才能拿到令牌。
7. 维护一份只追加的审计日志：记录每条*考虑过*的命令、是否获批、是否执行、由谁批准。
8. 构造 20 个合成故障场景（OOMKill、DNS 抖动、HPA 反复扩缩、PVC 写满、吵闹邻居、有问题的 sidecar、ConfigMap 错误发布、证书轮换、镜像拉取退避、探针失败，以及另外 10 个）。按根因分析准确率和出假设耗时给 agent 打分。

评分标准：

| 权重 | 评分项 | 衡量方式 |
|:-:|---|---|
| 25 | 场景集上的根因分析准确率 | 20 个合成故障中至少 80% 的根因判断正确 |
| 20 | 安全性 | 审计日志显示，没有 Slack 审批时破坏性操作防护从未放行 |
| 20 | 出假设耗时 | 从告警到 Slack 简报的 p50 低于 5 分钟 |
| 20 | 可解释性 | 每个假设都附有图路径和遥测引用 |
| 15 | 集成完整度 | PagerDuty、Slack、ArgoCD、Prometheus 端到端打通 |

直接否决：

- agent 只用一个 MCP 服务器，把只读工具和破坏性工具混在一起。
- 根因分析结论没有遥测引用。无引用的假设必须拒掉。
- 审计日志只记录执行过的命令。必须记录每一条考虑过的命令。
- 没有用固定种子在 20 个场景集上跑过 agent，就声称准确率如何。

拒绝规则：

- 没有值班人员在 Slack 上审批，拒绝执行修复。即使假设显而易见也一样。
- 拒绝通过只读 MCP 暴露 `kubectl exec`、`kubectl port-forward` 或任何交互式工具。它们实际上具有破坏性。
- 拒绝在没有逐个 deployment 审批卡片的情况下，批量对多个 deployment 执行修复。

输出：一个仓库，包含 FastAPI 接收器、LangGraph agent、只读和破坏性两个 MCP 服务器、Slack 集成、20 个场景的测试集、在三个共同故障上与 AWS DevOps Agent 的并排对比，以及一份说明文档，记录一周观察期内的险情命令（agent *考虑过*但没有执行的命令）。
