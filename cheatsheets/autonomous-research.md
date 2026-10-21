---
id: autonomous-research
title: 自我改进与研究 Agent
code: SI
subtitle: 生成器与评估器循环、自修改 agent、研究循环、RSI 差距及各自的控制措施。
hue: 280
sources: phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding, phases/15-autonomous-systems/04-darwin-godel-machine, phases/15-autonomous-systems/05-ai-scientist-v2, phases/15-autonomous-systems/06-automated-alignment-research, phases/15-autonomous-systems/07-recursive-self-improvement, phases/19-capstone-projects/05-autonomous-research-agent
source_hash: 5a3a99bf1a826604
---

## 生成器与评估器循环
type: flow
from: phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/docs/zh.md

1. **种子**：从种子程序 `P_0` 开始。它正确，但不是最优。
2. **数据库**：保存程序变体。评估器为每个变体评分。
3. **采样器**：从 MAP-elites 网格或岛屿种群中选择父代。
4. **LLM**：提出针对性修改。prompt 包含最佳变体和评估器签名。
5. **评估器**：编译、运行，并用留出输入为变体评分。
6. **数据库**：按分数和特征向量插入变体。
7. **循环**：重复数小时至数周。

## 四种系统对比
type: comparison
span: 2
from: phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/docs/zh.md, phases/15-autonomous-systems/04-darwin-godel-machine/docs/zh.md, phases/15-autonomous-systems/05-ai-scientist-v2/docs/zh.md, phases/15-autonomous-systems/06-automated-alignment-research/docs/zh.md

| 比较项 | AlphaEvolve | DGM | AI Scientist v2 | AAR |
|---|---|---|---|---|
| 修改目标 | 算法、内核、调度器 | Agent 框架 | 研究论文 | 有明确范围的对齐任务 |
| 评估器 | 正确性与基准 | SWE-bench 或 Polyglot | 同行评审，较弱 | 人工评审 |
| 结果 | 4x4 矩阵乘法需 48 次乘法 | SWE-bench 从 20% 到 50% | ICLR 2025 研讨会论文 | 弱到强泛化上胜过人类 |
| 已知故障 | 受评估器严谨程度限制 | 奖励投机 | 42% 的实验失败 | 预设流程降低表现 |
| 主要控制 | 留出评估器 | 评估器防火墙 | Docker 隔离、人工评审 | 沙箱外论坛日志 |

## 运行课程模拟器
type: command-table
from: phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/code/main.py, phases/15-autonomous-systems/04-darwin-godel-machine/code/main.py, phases/15-autonomous-systems/05-ai-scientist-v2/docs/zh.md, phases/15-autonomous-systems/05-ai-scientist-v2/code/main.py, phases/15-autonomous-systems/06-automated-alignment-research/code/main.py, phases/15-autonomous-systems/07-recursive-self-improvement/code/main.py, phases/19-capstone-projects/05-autonomous-research-agent/code/main.py

| 命令 | 作用 |
|---|---|
| `code/main.py` (L03) | 先运行带留出集的 A，再运行无留出集的 B |
| `code/main.py --no-holdout` | 只运行 B；评估器仅看训练集 |
| `code/main.py --reward-hack-allowed` | 打开分数旁路 |
| `--experiment-failure 0.20 --novelty-mislabel 0.10` | 降低失败率的 L05 基线 |
| `code/main.py` (L06) | 固定与自由模式对比、篡改演示 |
| `code/main.py --threshold 2.0` | L07 在差距 `C - A` 达 2.0 时暂停 |
| `--seed <n>` | 随机数种子；L05 用 42，L07 用 11 |
| `python main.py` | 综合项目树搜索，预算 $30 |

## 关键数值
type: concepts
from: phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/docs/zh.md, phases/15-autonomous-systems/04-darwin-godel-machine/docs/zh.md, phases/15-autonomous-systems/05-ai-scientist-v2/docs/zh.md, phases/15-autonomous-systems/07-recursive-self-improvement/docs/zh.md, phases/19-capstone-projects/05-autonomous-research-agent/docs/zh.md

- **AlphaEvolve 矩阵乘法**：4x4 复数矩阵需 48 次标量乘法。Strassen 1969 年算法需 49 次。
- **AlphaEvolve 生产应用**：Borg 启发式回收约 0.7% 的集群算力。
- **DGM**：SWE-bench 从 20.0% 到 50.0%，Polyglot 从 14.2% 到 30.7%。
- **SWE-bench**：来自真实 GitHub 问题的 2,294 个 Python 测试修复任务。
- **AI Scientist v2**：42% 的实验因编码错误失败。
- **伪装对齐**：基础测试中为 12%；尝试重新训练后最高 78%。
- **综合项目预算**：每篇论文硬上限 $30。演示运行花费 $28.40。
- **评审门槛**：5 名评委。平均分低于 4.0/5 则退回写作者。重写 3 次后停止。

## 代码中的公式
type: concepts
from: phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/code/main.py, phases/15-autonomous-systems/04-darwin-godel-machine/code/main.py, phases/15-autonomous-systems/07-recursive-self-improvement/docs/zh.md, phases/15-autonomous-systems/07-recursive-self-improvement/code/main.py

- **失配差距**：$M(t) = C(t) - A(t)$。当 $r_c > r_a$ 时增长。
- **一次 RSI 循环**：`c *= max(0.9, nc)`，其中 `nc = cfg.r_c + random.gauss(0, cfg.noise_c)`。
- **场景 A**：`r_c=1.15`、`r_a=1.08`。场景 B 均设为 1.10。
- **留出信号**：`0.5 * (c.train_score + c.test_score)`。无留出集时只用训练分数。
- **MAP-elites 单元格**：`min(depth(e), 6)` 和 `min(int(max_const(e) / 2), 4)`。
- **DGM 旁路**：允许投机时为 `min(1.0, base + agent.hack_bonus)`。

## 综合项目研究 agent
type: architecture
from: phases/19-capstone-projects/05-autonomous-research-agent/docs/zh.md

```arch
node | seed | 1,1 | 初始想法 | 加上领域 | client
node | lit | 2,1 | 文献搜索 | 50 篇论文，FAISS 缓存 | store
node | tree | 3,1 | 树搜索 | 规划、执行、验证 | process
node | box | 4,1 | 每节点一个沙箱 | 禁止网络出口 | process
node | score | 4,2 | 节点评分 | 新颖性、质量、预算 | process
node | writer | 3,2 | LaTeX 写作者 | 最佳分支 | model
node | vision | 2,2 | 视觉评议 | 编译后的 PDF | model
node | review | 1,2 | 评审集成 | 5 个 LLM 评委 | model
node | out | 1,3 | 产物 | paper.pdf、评审、轨迹 | store
edge | seed | lit |
edge | lit | tree |
edge | tree | box | 运行
edge | box | score | 指标
edge | score | writer | 最佳分支
edge | writer | vision | PDF
edge | vision | review | 草稿
edge | review | out | 均分 4.0+
```

## 最佳优先树搜索
type: annotated-code
lang: python
from: phases/19-capstone-projects/05-autonomous-research-agent/code/main.py

```python
budget_weight = min(1.0, remaining_budget / 10.0)  # 剩余超过 $10 时权重取满
return self.novelty * 0.4 + self.quality * 0.5 + budget_weight * 0.1
heapq.heappush(self.frontier, (-node.score(remaining), self.counter, node.node_id))
if tree.spent >= tree.budget:  # 预算耗尽，停止
run_experiment(cur, rng)  # 沙箱运行，设置 cost_usd
ok = verify(cur)  # 损失超过 4.0 即 loss_diverged
children = expand(cur, next_id)  # 每个子节点改一项配置
best = max(done, key=lambda n: n.quality)  # 再沿路径回到根
```

## 沙箱与运行（综合项目）
type: annotated-code
lang: bash
from: phases/19-capstone-projects/05-autonomous-research-agent/docs/zh.md

```bash
docker run --network=none \  # 禁止网络出口
  --memory=8g --cpus=2 \  # 固定资源上限
  --pids-limit=256 \  # 进程数上限
  --read-only  # 只读文件系统
ai-scientist run --seed "<seed idea>" --budget 30  # 每篇论文 $30
```

## 可检测篡改的论坛（L06）
type: annotated-code
lang: python
from: phases/15-autonomous-systems/06-automated-alignment-research/code/main.py

```python
rec.prev_hash = self.head()  # 链接上一条记录
payload = (f"{rec.author}|{rec.task}|{rec.regime}|"
           f"{rec.result:.3f}|{rec.prev_hash}")
rec.my_hash = hashlib.sha256(payload.encode()).hexdigest()[:16]
bad = tampered.verify()  # 被修改记录的索引
```

## 故障排查
type: troubleshooting
from: phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/docs/zh.md, phases/15-autonomous-systems/04-darwin-godel-machine/docs/zh.md, phases/15-autonomous-systems/05-ai-scientist-v2/docs/zh.md, phases/15-autonomous-systems/06-automated-alignment-research/docs/zh.md, phases/15-autonomous-systems/06-automated-alignment-research/code/main.py, phases/15-autonomous-systems/07-recursive-self-improvement/code/main.py

| 现象 | 原因 | 修正 |
|---|---|---|
| 训练 MSE 低、测试 MSE 高 | 评估器只看训练集 | 评估时生成留出输入 |
| 报告分数高于真实分数 | Agent 能修改自身评分 | 使用 agent 无法修改的评估器 |
| Agent 删除幻觉标记 | 评估器位于 agent 仓库中 | 使用 agent 无法修改的独立检查 |
| 论文漂亮，实验损坏 | 润色掩盖弱点 | 评估论点，设置人工评审门槛 |
| 已知方法被判为新方法 | 文献检索误标 | 提交前人工评审 |
| Agent 重写自己的分数 | 日志在沙箱内 | 在沙箱外使用只追加论坛 |
| `verify()` 标记记录 | 链在被修改记录处断裂 | 与沙箱外备份交叉核对 |
| 差距 `C - A` 达到阈值 | 能力增长率或突增超过对齐 | 暂停并交由人工评审 |

## 术语表
type: glossary
from: phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/docs/zh.md, phases/15-autonomous-systems/04-darwin-godel-machine/docs/zh.md, phases/15-autonomous-systems/05-ai-scientist-v2/docs/zh.md, phases/15-autonomous-systems/06-automated-alignment-research/docs/zh.md, phases/15-autonomous-systems/07-recursive-self-improvement/docs/zh.md

- **MAP-elites**：以特征向量为键的网格。每格保存最佳变体。
- **岛屿模型**：独立种群定期迁移。
- **DGM**：Darwin Godel Machine。保存档案与实测分数，不提供证明。
- **AAR**：Automated Alignment Researcher。自主解决对齐问题的模型。
- **RSI**：递归自我改进。系统每轮提出对自身的修改。
- **VLM 评议**：视觉语言模型读取图表并重写它们。
- **评估器防火墙**：评估器位于 agent 无法修改的命名空间中。
- **奖励投机**：循环提高分数，却未完成预期任务。

## 问答
type: qa
from: phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/docs/zh.md, phases/15-autonomous-systems/04-darwin-godel-machine/docs/zh.md, phases/15-autonomous-systems/06-automated-alignment-research/docs/zh.md, phases/15-autonomous-systems/06-automated-alignment-research/code/main.py, phases/15-autonomous-systems/07-recursive-self-improvement/code/main.py

- **AlphaEvolve 为何擅长矩阵乘法？** 评估器快速、确定且难以钻空子。
- **DGM 为何放弃证明？** 没人完成过非平凡 agent 的证明。DGM 使用分数差。
- **固定流程还是自由分解？** 自由分解上限更高。固定流程方差更低、更易审计。
- **更高的平均对齐增长率能解决问题吗？** 不能。场景 C 在能力突增时仍会越线。
- **谁提交 AAR 结果？** 人类。AAR 提议，人类提交。
