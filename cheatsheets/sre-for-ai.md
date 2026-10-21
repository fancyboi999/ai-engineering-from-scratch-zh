---
id: sre-for-ai
title: AI 的 SRE、事故处理与复盘
code: IP
subtitle: 用 agent 分诊 LLM 事故，对每项修正设置门禁，编写有证据约束的复盘，并为助手压缩日志。
hue: 352
sources: phases/17-infrastructure-and-production/23-sre-for-ai, phases/17-infrastructure-and-production/24-chaos-engineering-llm, phases/19-capstone-projects/06-devops-troubleshooting-agent, projects/postmortem-writer, projects/log-volume-reduction-lab
source_hash: b856bed1b692339c
---

## 事故现象
type: troubleshooting
from: phases/17-infrastructure-and-production/23-sre-for-ai/code/main.py, phases/17-infrastructure-and-production/23-sre-for-ai/docs/zh.md, phases/19-capstone-projects/06-devops-troubleshooting-agent/code/ts/src/agent.ts, phases/19-capstone-projects/06-devops-troubleshooting-agent/docs/zh.md, phases/19-capstone-projects/06-devops-troubleshooting-agent/code/main.py, projects/log-volume-reduction-lab/README.md

| 现象 | 原因 | 修正 |
|---|---|---|
| checkout 错误率高 | KV 缓存突增导致 vLLM OOM | 重启 pod，将 `--gpu-memory-utilization` 降至 0.85 |
| 突增前 GPU 内存已到 98% | 突发并发导致 KV 缓存 OOM | 执行运行手册 RB-017 |
| 两个模型对根因有分歧 | 可能存在虚构根因 | 升级处理，同时展示两个假设 |
| Pod 在 10m 内 OOMKilled 两次 | 256Mi 内存请求过低 | 请求 512Mi，限制 1Gi |
| auth-svc 出现 CrashLoopBackOff | 探针路径改为 /ready | 将探针路径恢复为 /healthz |
| 镜像 `checkout-api:v2.41` 的 /healthz 失败 | 14m 前发布有误 | 批准后回滚至 v2.40 |
| `blocked: no slack approval` | 破坏性工具缺少批准者 | 获取 Slack 卡片批准 |
| 罕见的磁盘满日志从上下文丢失 | 预算 8 的均匀采样 | 使用 `rarity` 策略 |

## 多 agent 分诊
type: flow
from: phases/17-infrastructure-and-production/23-sre-for-ai/docs/zh.md, phases/17-infrastructure-and-production/23-sre-for-ai/code/main.py

1. **监督者**：将事故拆为子查询。
2. **日志 agent**：搜索日志，找到最常见错误模式。
3. **指标 agent**：使用 PromQL，找到错误前的 GPU 内存突增。
4. **运行手册 agent**：检索文档，匹配已知运行手册。
5. **监督者**：对根因分组。两个或更多 agent 一致表示有信心。
6. **人工**：批准或调整假设与证据。
7. **操作**：只执行范围小的安全操作，如重启 pod。

## K8s 故障排查 agent
type: architecture
from: phases/19-capstone-projects/06-devops-troubleshooting-agent/docs/zh.md

```arch
node | hook | 1,1 | 告警 webhook | PagerDuty 或 Alertmanager | client
node | recv | 2,1 | FastAPI 接收端 | 受影响对象、SLO 违约 | process
node | agent | 3,1 | 根因 agent | 采样、遍历、提出假设 | model
node | graph | 2,2 | K8s 知识图谱 | 所有权、调度 | store
node | tele | 3,2 | 遥测切片 | Prometheus、Loki、Tempo | store
node | slack | 4,1 | Slack 简报 | 前 3 个假设、批准按钮 | client
node | argo | 4,2 | ArgoCD 回滚钩子 | 批准后执行 | process
node | audit | 4,3 | 审计日志 | 已考虑与已执行 | store
edge | hook | recv | webhook
edge | recv | agent | 告警
edge | agent | graph | 遍历
edge | agent | tele | 最近 15m
edge | agent | slack | 排序后的假设
edge | slack | argo | 已批准
edge | argo | audit | 追加
```

## 修复范围
type: comparison
from: phases/17-infrastructure-and-production/23-sre-for-ai/docs/zh.md, phases/19-capstone-projects/06-devops-troubleshooting-agent/code/main.py, phases/19-capstone-projects/06-devops-troubleshooting-agent/docs/zh.md

| 维度 | 安全、范围小 | 不安全、范围大 |
|---|---|---|
| Pod 与代码 | 重启 pod | 部署新代码 |
| 部署 | 回滚某次部署 | 改变服务拓扑 |
| 容量 | 在预先批准的边界内扩缩容 | 修改资源限制 |
| 配置与访问 | 启用预先批准的功能开关 | 改变 IAM、修改数据库 |
| RBAC 动词 | get、list、describe | delete、exec、scale |
| 综合项目工具 | `kubectl_get`、`promql`、`logql` | `kubectl_delete`、`argocd_rollback` |
| 门禁 | 立即运行 | 需要 Slack 批准 |

## 假设评分
type: annotated-code
lang: python
from: phases/19-capstone-projects/06-devops-troubleshooting-agent/code/main.py

```python
def score(self) -> float:
    recency_w = max(0.0, 1.0 - self.recency_mins / 60.0)  # 60 min 后为 0
    path_w = 1.0 / (1 + self.path_len)  # 图路径越短越好
    return (recency_w * 0.35 +
            self.specificity * 0.35 +  # 0..1
            min(len(self.citations), 5) / 5 * 0.2 +  # 引用上限为 5
            path_w * 0.1)
```

## 运行实验
type: task-table
span: 2
from: phases/17-infrastructure-and-production/23-sre-for-ai/docs/zh.md, phases/19-capstone-projects/06-devops-troubleshooting-agent/code/main.py, phases/19-capstone-projects/06-devops-troubleshooting-agent/code/ts/README.md, projects/postmortem-writer/README.md, projects/log-volume-reduction-lab/README.md

| 任务 | 代码 |
|---|---|
| 多 agent 分诊模拟器，第 23 课 | `code/main.py` |
| 带审批门禁的 K8s 图 agent | `python main.py` |
| Slack 骨架自检后测试 | `npm start` 和 `npm test` |
| Slack 交互服务 | `npm run serve` |
| 从示例生成复盘包 | `go run . --events ../examples/events.jsonl --review ../examples/review.json --out /tmp/incident-packet` |
| 构建日志上下文工具 | `rustc --edition 2021 main.rs -o /tmp/log-context` |
| 压缩日志，预算 8，按稀有度 | `/tmp/log-context fixtures/burst.log 8 rarity /tmp/context.jsonl` |
| 罕见模板覆盖报告 | `python3 main.py fixtures/burst.log /tmp/context.jsonl --out /tmp/coverage.json` |

## 代码中的限制
type: defaults
from: phases/19-capstone-projects/06-devops-troubleshooting-agent/code/ts/src/slack_verify.ts, projects/log-volume-reduction-lab/solution/main.rs, projects/log-volume-reduction-lab/solution/main.py, projects/postmortem-writer/solution/integration.go

| 设置 | 默认值 | 说明 |
|---|---|---|
| `REPLAY_WINDOW_SECONDS` | 60 * 5 | 更旧的 Slack 请求视为过期 |
| `SIGNATURE_VERSION` | v0 | 对 v0:ts:body 计算 HMAC sha256 |
| `rare_max` | 2 | 罕见模板频次 |
| 日志输入大小 | 1_048_576 | 字节，即一 MiB |
| 日志记录 | 10_000 | 每次输入的行数 |
| 日志行长 | 4096 | 每行字节数 |
| 事件 JSONL 大小 | 2<<20 | 复盘事件 |
| 主张与操作 | 100 | 每次评审中两者各自的上限 |

## 复盘包规则
type: concepts
from: projects/postmortem-writer/solution/stage1.go, projects/postmortem-writer/solution/stage2.go, projects/postmortem-writer/solution/stage3.go, projects/postmortem-writer/solution/integration.go, projects/postmortem-writer/solution/main.go, projects/postmortem-writer/README.md

- **事件**：一行 JSONL，含 `id`、`second`、`kind` 和 `message`。
- **时间线**：按秒排序，相同时按 ID 排序。
- **主张**：文本非空，至少包含一个不同的已知事件 ID。
- **引用**：每个证据 ID 都需要其消息的精确子串。
- **批准**：`approved` 需要匹配的 `sourceSHA256` 和评审者。
- **操作**：状态为 `open`、`doing` 或 `done`。只有 `open` 可以没有负责人。
- **输出**：index.html、packet.json 和 packet.txt，写入权限为 `0600`。

## 错误字符串
type: command-table
from: projects/postmortem-writer/solution/integration.go, projects/postmortem-writer/solution/types.go, projects/log-volume-reduction-lab/solution/main.rs, projects/log-volume-reduction-lab/solution/main.py

| 命令 | 作用 |
|---|---|
| `review source changed` | 评审 hash 与事件文件不同 |
| `approval requires matching source and reviewer` | 主张获批但无 hash 或评审者 |
| `quote for <id>` | 引用为空或不在消息中 |
| `budget exceeded` | 事件、主张或字节过多 |
| `conflict` | 事件 ID 或证据 ID 重复 |
| `expected LEVEL<TAB>message` | 日志行无制表符 |
| `group count mismatch` | 上下文计数与来源不符 |
| `invalid locator` | firstLine 或 lastLine 超出范围 |

## 问答
type: qa
from: phases/17-infrastructure-and-production/23-sre-for-ai/docs/zh.md, phases/19-capstone-projects/06-devops-troubleshooting-agent/docs/zh.md, projects/postmortem-writer/solution/stage4.go, projects/log-volume-reduction-lab/README.md

- **审计日志记录什么？** 所有考虑过、执行过或批准过的命令，以及批准者。
- **综合项目标准是什么？** 在 20 个合成事故上至少 80% 根因正确。
- **提出假设有多快？** 从告警到 Slack 简报 p50 低于 5 分钟。
- **仅预测有帮助吗？** 没有执行的预测只是仪表盘。
- **复盘包能证明根因吗？** 不能。它检查来源，因果关系需评审。
- **均匀还是稀有度采样？** 稀有度。预算 8 的均匀采样会遗漏第 138 行。

## 提示
type: tips
from: phases/17-infrastructure-and-production/23-sre-for-ai/docs/zh.md, phases/17-infrastructure-and-production/24-chaos-engineering-llm/docs/zh.md, projects/log-volume-reduction-lab/README.md

- 编写运行手册时包含现象、假设、验证和操作章节。
- 将运行手册和复盘存入向量数据库供检索。
- 混沌实验前备齐 SLI/SLO、可观测性、自动回滚、运行手册和值班安排。
- 每月开展一次演练，结束时做复盘。
- 将上下文发送给助手前先对日志脱敏。
