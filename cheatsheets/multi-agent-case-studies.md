---
id: multi-agent-case-studies
title: 多 agent 案例与评估集群
code: MF
subtitle: 三个 2026 年参考系统、软件团队综合项目，以及用 Go 实现、带租约隔离且可恢复的评估集群。
hue: 210
sources: phases/16-multi-agent-and-swarms/25-case-studies-2026-sota, phases/19-capstone-projects/10-multi-agent-software-team, projects/distributed-eval-farm
source_hash: 4f23171f0a8a05c9
---

## 三个参考案例
type: comparison
from: phases/16-multi-agent-and-swarms/25-case-studies-2026-sota/docs/zh.md, phases/16-multi-agent-and-swarms/25-case-studies-2026-sota/code/main.py

| 维度 | Anthropic Research | MetaGPT / ChatDev | OpenClaw / Moltbook |
|---|---|---|---|
| 拓扑 | 主管与工作器 | 按 SOP 拆分角色 | 群体规模的底层平台 |
| 关键结果 | 比单 agent Opus 4 提高 90.2% | MacNet：通过 DAG 组织超过 1000 个 agent | 数天内约 2.3M 个 agent 账号 |
| 成本信号 | 每查询 15 倍 token | 按角色分配预算 | 按交互定价 |
| 可借鉴模式 | 全新上下文的子 agent | 结构化产物交接 | prompt 注入威胁模型 |
| 验证 | 显式验证者角色 | QA 工程师 | 网络内验证器 |
| 框架 | Claude Agent SDK 或 LangGraph | CrewAI 或 MetaGPT | 自定义底层平台 + MCP + A2A |
| 适用场景 | 研究与知识任务 | 工程工具链 | 依靠网络效应的社交产品 |

## 共通模式
type: concepts
from: phases/16-multi-agent-and-swarms/25-case-studies-2026-sota/docs/zh.md

- **编排器 + 工作器**：各案例都具有主管或网络效应。
- **交接契约**：角色间产物遵循模式定义。
- **验证**：在各案例中都是一等角色。
- **扩展**：依靠拓扑和底层平台，而非单纯增加 agent 数量。
- **投入扩展**：简单任务用 1 个 agent、3-10 次工具调用；复杂任务用 10 个以上子 agent。
- **彩虹部署**：为运行中的 agent 保留旧运行时版本。
- **prompt 注入**：将 agent 资料和跨 agent 消息视为不可信输入。

## 将设计映射到案例
type: annotated-code
lang: python
from: phases/16-multi-agent-and-swarms/25-case-studies-2026-sota/code/main.py

```python
def map_to_case(d: Design) -> str:
    if d.task_type == "population" or d.user_facing_network:
        return "openclaw_moltbook"
    if d.task_type == "engineering" or d.roles_distinct:
        return "metagpt_chatdev"
    return "anthropic_research"        # 研究任务，也是默认选择
print_case(case_key)                   # 模式、框架、引用
print_landscape()                      # FRAMEWORK_LANDSCAPE 各行
```

## 软件团队构建步骤
type: flow
from: phases/19-capstone-projects/10-multi-agent-software-team/docs/zh.md

1. **任务板**：以文件保存带类型消息的 JSONL，agent 按标签订阅。
2. **架构师**：发出一个 `plan_request`，包含子任务 DAG 与接口。
3. **编程者**：各自认领一个子任务，使用新的 `git worktree add` 分支。
4. **合并协调者**：将 N 个分支以三路合并方式汇入暂存分支。
5. **评审者**：不能批准自己编写的 diff，将 `review_feedback` 发回编程者。
6. **测试者**：在干净沙箱中运行套件，失败后返回负责人处理。
7. **记账**：每条跨角色消息记录一个 span，带载荷大小与模型。
8. **复盘**：为每个失败 Issue 生成交接失败直方图。

## 评估集群架构
type: architecture
from: projects/distributed-eval-farm/README.md, projects/distributed-eval-farm/API.md, projects/distributed-eval-farm/stages/02-fence-each-shard-lease/docs/zh.md

```arch
node | cases | 1,1 | cases.json | id、prompt、expected、response | client
node | part | 2,1 | 分区 | FNV-1a 分片 |
node | store | 3,1 | farm.json | 受 ledger.lock 保护 | store
node | run | 4,1 | run | 并行池、有界批次 | process
node | claim | 4,2 | ClaimShard | 加锁、加载、获取、持久化 | process
node | work | 3,2 | WorkShard | 锁外执行精确匹配 | process
node | done | 2,2 | CompleteShard | 重载、持锁 Submit | process
node | rep | 1,2 | 报告 | 覆盖率与回执 | client
edge | cases | part |
edge | part | store | InitFarm
edge | store | run |
edge | run | claim | 工作进程
edge | claim | work | 样例
edge | work | done | 结果
edge | done | rep |
```

## 评估集群命令
type: command-table
from: projects/distributed-eval-farm/README.md, projects/distributed-eval-farm/API.md, projects/distributed-eval-farm/stages/02-fence-each-shard-lease/docs/zh.md

| 命令 | 作用 |
|---|---|
| `go build -o /tmp/eval-farm .` | 在 `solution` 内构建参考二进制 |
| `init --store DIR --input FILE --shards N` | 绑定数据集 hash 与分片数 |
| `run ... --shards N --workers W` | 启动有界的进程批次 |
| `worker --store DIR --worker-id NAME` | 认领、评估并提交一个分片 |
| `status --store DIR` | 验证并报告快照 |
| `demo --input FILE` | 打印崩溃和恢复快照 |
| `--crash-after-claim` | 持久化认领后以 86 退出 |
| `--all --solution --strict` | 使用 `project_test.py` 评测参考实现 |

## 评估集群契约
type: task-table
from: projects/distributed-eval-farm/solution/stage1.go, projects/distributed-eval-farm/solution/stage2.go, projects/distributed-eval-farm/solution/stage3.go, projects/distributed-eval-farm/solution/stage4.go, projects/distributed-eval-farm/solution/types.go

| 任务 | 代码 |
|---|---|
| 阶段 1：按 ID 稳定分片 | `Partition(ids []string, shards int)` |
| 对 ID 计算 hash | `h := fnv.New32a()` |
| 阶段 2：用版本隔离租约 | `Acquire(l, worker, now, ttl)` |
| 阶段 3：接受一个结果 | `Submit(l, worker, version, now, result)` |
| 阶段 4：有界进程池 | `Parallel(ctx, ids, workers, run)` |
| 租约字段 | `Shard, Worker, Version, Until, Result, Done` |
| 错误 | `ErrInvalid`、`ErrConflict`、`ErrLimit` |

## 租约与回执规则
type: annotated-code
lang: go
from: projects/distributed-eval-farm/solution/stage2.go, projects/distributed-eval-farm/solution/stage3.go

```go
// Acquire：已完成或仍有效的租约构成冲突
if l.Done || (l.Worker != "" && now < l.Until) {
l.Until = now + ttl
l.Version++
// Submit：先检查所有者与版本
if l.Worker != worker || l.Version != version {
// 已完成租约只接受重复提交相同结果
if l.Result == result {
// 首次完成必须早于到期时间
if now >= l.Until {
```

## 默认值与限制
type: defaults
from: projects/distributed-eval-farm/solution/main.go, projects/distributed-eval-farm/API.md, projects/distributed-eval-farm/README.md, projects/distributed-eval-farm/stages/03-accept-idempotent-completion-receipts/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `--shards` | 4 | 固定分片数，范围 1..1024 |
| `--workers` | 2 | 并发进程数，范围 1..64 |
| `--lease-ms` | 30000 | 认领时长 |
| `--now-ms` | -1 | 使用实际时钟 |
| `--delay-ms` | 0 | 范围 0..60000 |
| `--store` | farm-data | 同一主机上的目录 |
| 快照大小 | 4 MiB | 整轮运行的快照 |
| 结果大小 | 1 MiB | 可接受的最大结果 |

## 失败模式
type: troubleshooting
from: projects/distributed-eval-farm/README.md, projects/distributed-eval-farm/API.md, projects/distributed-eval-farm/stages/04-run-a-bounded-local-worker-pool/docs/zh.md, phases/19-capstone-projects/10-multi-agent-software-team/docs/zh.md, phases/16-multi-agent-and-swarms/25-case-studies-2026-sota/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 工作器以 86 退出 | 认领后故意崩溃 | 在到期边界重新运行 |
| 运行以 1 退出，complete:false | 剩余租约仍被占用 | 到期后再次执行 run |
| 旧工作器遇到版本隔离错误 | 替代工作器先提交 | 符合预期，快照保持不变 |
| 数据集变化后运行以 1 退出 | 数据集 hash 不同 | 使用另一存储目录 |
| 无法实现子任务 | 计划太模糊 | 使用带显式接口的计划模板 |
| 评审者批准了缺陷 | 评审者误批准 | 用注入缺陷的探针调整 prompt |
| 病毒式 prompt 在 agent 间传播 | 大规模 prompt 注入 | 将跨 agent 消息视为不可信 |
| 研究 agent 产生幻觉 | 没有显式验证者角色 | 增加验证者，分配约 20-30% 的 token |

## 关键数字
type: concepts
from: phases/16-multi-agent-and-swarms/25-case-studies-2026-sota/docs/zh.md, phases/19-capstone-projects/10-multi-agent-software-team/docs/zh.md, projects/distributed-eval-farm/README.md

- **token 用量**：解释 BrowseComp 中 80% 的方差。
- **MAST**：真实多 agent 系统的失败率为 41-86.7%。
- **OpenClaw**：约 4 个月获得 247k 个 GitHub star。
- **综合项目评估**：50 个 SWE-bench Pro Issue，对照单个 Sonnet 4.7 基线。
- **评分标准**：pass@1 占 25、加速比占 20、评审质量占 20、token 占 20、协作占 15。
- **集群样例**：四条记录得分 3/4，两批启动四个进程。

## 问答
type: qa
from: phases/16-multi-agent-and-swarms/25-case-studies-2026-sota/docs/zh.md, phases/19-capstone-projects/10-multi-agent-software-team/docs/zh.md, projects/distributed-eval-farm/README.md, projects/distributed-eval-farm/stages/03-accept-idempotent-completion-receipts/docs/zh.md

- **多 agent 研究为什么胜出？** 每个子 agent 都有全新的上下文窗口。
- **用哪个基准？** SWE-bench Pro，Verified 已受污染。
- **综合项目衡量什么？** 多 agent 是否提高每美元产出，而不只看能否运行。
- **迟到但正确的工作器能覆盖结果吗？** 不能。new/v2 已完成分片时，old/v1 会失败。
- **在 109 恢复会抢走租约吗？** 不会。它报告仍有待处理运行，并以 1 退出。
