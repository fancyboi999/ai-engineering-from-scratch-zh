---
id: self-improving-reasoning
title: 自学推理与自我改进
code: ST
subtitle: 生成、评分、保留、再训练。STaR、GRPO、AlphaEvolve 与 DGM 循环、实验数字及评估器陷阱。
hue: 290
sources: phases/10-llms-from-scratch/09-constitutional-ai-self-improvement, phases/15-autonomous-systems/02-star-family-reasoning, phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding, phases/15-autonomous-systems/04-darwin-godel-machine, phases/15-autonomous-systems/07-recursive-self-improvement
source_hash: 7748af9a37c69cd3
---

## 核心概念
type: concepts
from: phases/15-autonomous-systems/02-star-family-reasoning/docs/zh.md, phases/10-llms-from-scratch/09-constitutional-ai-self-improvement/docs/zh.md, phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/docs/zh.md, phases/15-autonomous-systems/04-darwin-godel-machine/docs/zh.md, phases/15-autonomous-systems/07-recursive-self-improvement/docs/zh.md

- **STaR**：用自身得到正确答案的推理过程微调，再重复。
- **合理化**：对失败问题，将正确答案作为提示。
- **Constitutional AI**：模型依据书面原则批评并修订。
- **GRPO**：不使用价值函数的 PPO。以组为基线。
- **AlphaEvolve**：LLM 编辑程序，由机器可检验的评估器打分。
- **DGM**：agent 编辑自身运行框架，由基准评分。
- **RSI**：系统 `S_n` 提出编辑，生成 `S_{n+1}`。
- **答案条件梯度**：循环奖励最终答案，而非中间步骤。

## 通用方案：生成器加评估器
type: architecture
from: phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/docs/zh.md, phases/15-autonomous-systems/04-darwin-godel-machine/docs/zh.md, phases/10-llms-from-scratch/09-constitutional-ai-self-improvement/docs/zh.md

```arch
node | gen | 1,1 | 生成器 | LLM、策略或 agent | model
node | cand | 2,1 | 候选项 | G 个样本或变体 |
node | eval | 3,1 | 评估器 | 规则、测试或基准 | process
node | arch | 3,2 | 档案 | MAP-elites，按分数索引 | store
node | train | 1,2 | 再训练或父代 | SFT、GRPO 或变异 | gpu
node | human | 2,2 | 人工数据 | 小比例 | client
edge | gen | cand | 采样
edge | cand | eval | 评分
edge | eval | arch | 保留最佳
edge | arch | train | 选择
edge | train | gen | 下一轮
edge | human | train |
```

## STaR 循环
type: flow
from: phases/15-autonomous-systems/02-star-family-reasoning/docs/zh.md, phases/15-autonomous-systems/02-star-family-reasoning/code/main.py

1. **模型**：为每个问题采样推理轨迹与答案。
2. **过滤**：仅在最终答案正确时保留轨迹。
3. **合理化**：对失败问题提示正确答案并重新采样。
4. **微调**：用保留及合理化后的轨迹训练。
5. **重复**：下一轮使用新模型。
6. **V-STaR**：用正确与错误轨迹训练 DPO 验证器，选择 best-of-N。

## 代码中的 GRPO
type: annotated-code
lang: python
from: phases/10-llms-from-scratch/09-constitutional-ai-self-improvement/code/main.py

```python
def group_relative_advantage(rewards: list[float]) -> np.ndarray:
    r = np.array(rewards, dtype=float)
    if r.std() < 1e-8:  # 全组奖励相同，没有信号
        return np.zeros_like(r)
    return (r - r.mean()) / (r.std() + 1e-8)  # 组内 z 分数

ratios = np.exp(policy_logprobs - ref_logprobs)
unclipped = ratios * advantages
clipped = np.clip(ratios, 1 - clip_eps, 1 + clip_eps) * advantages
policy_loss = -np.minimum(unclipped, clipped).mean()  # PPO 裁剪代理目标
kl = (ref_logprobs - policy_logprobs).mean()
total_loss = policy_loss + beta * kl  # 保留相对参考模型的 KL
```

## STaR 家族对比
type: comparison
span: 2
from: phases/15-autonomous-systems/02-star-family-reasoning/docs/zh.md

| 因素 | STaR | STaR + 合理化 | V-STaR | Quiet-STaR |
|---|---|---|---|---|
| 训练信号 | 正确时保留（推理过程，答案） | 前者加正确答案提示后的重试 | STaR 加两类样本训练的 DPO 验证器 | 逐 token 推理过程加混合权重 |
| 推理成本 | 1x | 1x | Nx（best-of-N） | 1.5-3x |
| 数据浪费 | 丢弃全部错误推理过程 | 较少 | 极少 | 极少 |
| 失败模式 | 捷径推理 | 合理化的推理可能不可信 | 验证器可能强化自信的错误 | 梯度仍以答案为条件 |

## 代码搜索与自我编辑循环
type: comparison
span: 2
from: phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/docs/zh.md, phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/code/main.py, phases/15-autonomous-systems/04-darwin-godel-machine/docs/zh.md

| 因素 | AlphaEvolve | Darwin Godel Machine | Godel Machine（2003） |
|---|---|---|---|
| 编辑目标 | 数据库中的程序 | agent 运行框架 | 任意自我修改 |
| 评估器 | 正确性 + 基准 | SWE-bench / Polyglot | 形式化证明 |
| 接受规则 | 分数高于单元格现有最佳项 | 实验分数差 + 档案 | 净收益的形式化证明 |
| 成功示例 | 48 次乘法完成 4x4 矩阵乘 | SWE-bench 从 20% → 50% | 未知非平凡实例 |
| 失败模式 | 利用弱评估器钻奖励空子 | 接受钻奖励空子的变体 | 永不触发 |

## 运行模拟器
type: task-table
span: 2
from: phases/10-llms-from-scratch/09-constitutional-ai-self-improvement/code/main.py, phases/15-autonomous-systems/02-star-family-reasoning/code/main.py, phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/code/main.py, phases/15-autonomous-systems/04-darwin-godel-machine/code/main.py, phases/15-autonomous-systems/07-recursive-self-improvement/code/main.py

| 任务 | 代码 |
|---|---|
| 一轮规则奖励 GRPO | `self_improvement_round(prompts, sampler, group_size=group_size)` |
| 组合规则奖励 | `reward_math(prompt, response) + 0.1 * reward_format(response)` |
| 自举 STaR 轮次 | `run_star(rounds, initial)` |
| 带留出测试的 AlphaEvolve | `run_loop(generations=1500, pop=20, use_holdout=True, seed=DEFAULT_SEED)` |
| 仅训练集评估的 AlphaEvolve 演示 | `python code/main.py --no-holdout` |
| 可编辑评分器的 DGM | `python code/main.py --reward-hack-allowed` |
| RSI 竞赛，差距阈值 2.0 | `python code/main.py --threshold 2.0` |
| RSI 场景 A | `Config(r_c=1.15, r_a=1.08, noise_c=0.02, noise_a=0.03, threshold=th)` |

## 代码默认值
type: defaults
from: phases/10-llms-from-scratch/09-constitutional-ai-self-improvement/code/main.py, phases/15-autonomous-systems/02-star-family-reasoning/code/main.py, phases/15-autonomous-systems/07-recursive-self-improvement/code/main.py, phases/15-autonomous-systems/04-darwin-godel-machine/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `grpo_step(beta)` | 0.01 | KL 权重 |
| `grpo_step(clip_eps)` | 0.2 | 比率裁剪 |
| `self_improvement_round(group_size)` | 8 | 每个 prompt 的样本数 |
| `star_round(n_samples)` | 1000 | 每轮轨迹数 |
| `--threshold` | 1.5 | 暂停差距 C - A |
| `--seed` | `DEFAULT_SEED` | RSI 模拟中为 11 |
| `star_round` `alpha` | 0.6 | 保留轨迹的权重 |

## 故障排查
type: troubleshooting
from: phases/10-llms-from-scratch/09-constitutional-ai-self-improvement/docs/zh.md, phases/15-autonomous-systems/02-star-family-reasoning/docs/zh.md, phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/docs/zh.md, phases/15-autonomous-systems/04-darwin-godel-machine/docs/zh.md, phases/15-autonomous-systems/07-recursive-self-improvement/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 奖励标准差降至零 | 模式坍缩 | 停止运行 |
| 3-5 轮后多样性丢失 | 自生成数据更窄 | 混入新鲜人工数据 |
| 某个 prompt 的优势为零 | 全组奖励相同 | 跳过该 prompt |
| 分布内表现好，分布外失败 | 保留了捷径推理 | 使用过程奖励与留出分布外评估 |
| 训练 MSE 低，测试 MSE 高 | 评估器只使用训练集 | 评估时生成留出输入 |
| 报告分数高于真实分数 | agent 修改了评分器 | 设置评估器防火墙 |
| 差距 C - A 超过阈值 | 能力增长速率高于对齐速率 | 暂停并由人工审核 |

## 方法选型
type: tips
from: phases/10-llms-from-scratch/09-constitutional-ai-self-improvement/docs/zh.md, phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/docs/zh.md

- 纯 CAI：语气、安全与拒绝风格等主观行为。
- GRPO + ORM：奖励稀疏且二元的可验证任务。
- 对自生成样本对做 DPO：原则生成样本对，DPO 训练。
- 完整 RLHF：规则无法表达的多目标权衡。
- AlphaEvolve：仅适用于评估器快速、确定且难以钻空子的场景。

## 问答
type: qa
from: phases/15-autonomous-systems/02-star-family-reasoning/docs/zh.md, phases/15-autonomous-systems/04-darwin-godel-machine/docs/zh.md, phases/15-autonomous-systems/07-recursive-self-improvement/docs/zh.md, phases/10-llms-from-scratch/09-constitutional-ai-self-improvement/docs/zh.md

- **STaR 在 GSM8K 上提升多少？** GPT-J 从 5.8% 提升至 10.7%。
- **DGM 提升多少？** SWE-bench 从 20.0% → 50.0%，Polyglot 从 14.2% → 30.7%。
- **对齐伪装率多少？** 基础测试为 12%，训练消除该行为后可达 78%。
- **自我改进能新增能力吗？** 不能。它放大模型中已有的信号。
- **健康运行的曲线如何？** 平均奖励上升、标准差稳定、KL 有界。

## 术语表
type: glossary
from: phases/10-llms-from-scratch/09-constitutional-ai-self-improvement/docs/zh.md, phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding/docs/zh.md

- **ORM**：结果奖励模型。最终答案获得一个奖励。
- **PRM**：过程奖励模型。每个步骤获得一个奖励。
- **RLAIF**：来自 AI 反馈的强化学习。基于模型偏好使用 PPO 或 DPO。
- **SL-CAI**：CAI 第一阶段。对（prompt，修订结果）样本对做 SFT。
- **MAP-elites**：按特征向量索引的网格，每个单元格保留最佳变体。
