---
id: rlhf-dpo
title: RLHF、DPO 与偏好调优
code: RD
subtitle: 奖励模型加 PPO 对比 DPO 及其变体。包含损失、beta 与 KL 设置、失败模式及修正。
hue: 20
sources: phases/09-reinforcement-learning/09-reward-modeling-rlhf, phases/10-llms-from-scratch/07-rlhf, phases/10-llms-from-scratch/08-dpo, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family, phases/19-capstone-projects/40-dpo-from-scratch
source_hash: 6835121ce6f90851
---

## RLHF 与 DPO 对比
type: comparison
from: phases/10-llms-from-scratch/08-dpo/docs/zh.md

| 维度 | RLHF（PPO） | DPO |
|---|---|---|
| 待训练模型 | 3 个：SFT、奖励、策略 | 1 个：仅策略 |
| 训练循环 | 3 个：SFT、RM、PPO | 2 个：SFT、DPO |
| 超参数 | lr、KL 系数、裁剪比率、RM lr、epoch | lr、beta、epoch |
| 奖励模型 | 单独训练 | 隐含在模型概率中 |
| 算法 | PPO，复杂且不稳定 | 监督学习，稳定 |
| 内存中的模型 | PPO 期间 3-4 个 | 2 个：当前模型和参考模型 |
| 计算量 | 三个循环 | 约为 RLHF 的三分之一 |
| 数据 | 带新评分的在线循环 | 固定偏好数据集 |

## 选择条件
type: tips
from: phases/10-llms-from-scratch/08-dpo/docs/zh.md, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/docs/zh.md, phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md

- DPO：5,000-20,000 对数据、计算有限，或需大量数据集实验。
- RLHF：大规模、多目标奖励，或迭代在线评分循环。
- SimPO：长度偏差明显。它也移除了参考模型。
- KTO：只有未配对的好或坏标签。
- ORPO：希望从基础模型单阶段训练，不使用 SFT 检查点。
- BPO：DPO 日志显示选中回复的对数概率下降。
- IPO：偏好强度差异很大且 DPO 饱和。

## RLHF 流水线
type: architecture
from: phases/10-llms-from-scratch/07-rlhf/docs/zh.md, phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md

```arch
node | sft | 1,1 | SFT 模型 | 阶段 1 | model
node | pairs | 1,2 | 偏好对 | prompt、chosen、rejected | store
node | policy | 2,1 | 策略 | 从 SFT 初始化 | model
node | rm | 2,2 | 奖励模型 | 标量头、Bradley-Terry | model
node | ref | 3,1 | 参考模型 | 冻结的 SFT 副本 | model
node | ppo | 3,2 | PPO 更新 | 奖励减 beta KL | process
edge | sft | policy | 初始化
edge | sft | ref | 冻结
edge | pairs | rm | 训练
edge | policy | rm | 回复
edge | rm | ppo | 奖励
edge | ref | ppo | KL 惩罚
edge | ppo | policy | 更新
```

## 一个 DPO epoch（综合项目）
type: flow
from: phases/19-capstone-projects/40-dpo-from-scratch/code/main.py, phases/19-capstone-projects/40-dpo-from-scratch/docs/zh.md

1. **参考模型**：在 `torch.no_grad()` 下，一次性存储选中和拒绝回复的对数概率。
2. **策略**：`sequence_log_prob` 累加回复对数概率，prompt token 不贡献分数。
3. **分数差**：`diff_w - diff_l`，即选中对数比减去拒绝对数比。
4. **损失**：对每个三元组计算 `-F.logsigmoid(beta * margin)`。
5. **更新**：对 Adam 执行 `opt.zero_grad()`、`loss.backward()`、`opt.step()`。
6. **检查**：分数差未上升或损失未下降时，`run_demo` 返回 1。

## DPO 损失与冻结参考模型
type: annotated-code
lang: python
from: phases/19-capstone-projects/40-dpo-from-scratch/code/main.py

```python
diff_w = logp_w_pol - logp_w_ref            # 选中回复的对数比
diff_l = logp_l_pol - logp_l_ref            # 拒绝回复的对数比
margin = diff_w - diff_l                    # 隐式奖励差除以 beta
z = beta * margin
loss = -F.logsigmoid(z)                     # 稳定的 -log sigmoid
policy.load_state_dict(reference.state_dict())  # 从相同权重开始
for p in reference.parameters():
    p.requires_grad = False                 # 参考模型始终不变
target = 1.0 / (2.0 * beta) if beta > 0 else 0.0
loss = (margin - target) ** 2               # IPO 变体
```

## 奖励模型与 KL 奖励（微型示例）
type: annotated-code
lang: python
from: phases/09-reinforcement-learning/09-reward-modeling-rlhf/code/main.py

```python
p = sigmoid(r_pos - r_neg)                  # Bradley-Terry P(选中回复胜出)
grad_scale = 1 - p
w[t] += lr * grad_scale * c                 # 选中 token 权重上升，拒绝 token 下降
kl_term = kl(probs_new, probs_ref)
reward = rm_score - beta * kl_term          # 含 KL 惩罚的奖励
advs = [(r - mean_r) / sd_r for r in rewards]  # 归一化优势
ratio = math.exp(logp - log_pi_old)
clipped = (adv > 0 and ratio > 1 + eps) or (adv < 0 and ratio < 1 - eps)
```

## 代码任务
type: task-table
from: phases/09-reinforcement-learning/09-reward-modeling-rlhf/code/main.py, phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md, phases/10-llms-from-scratch/08-dpo/code/main.py, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/code/main.py, phases/19-capstone-projects/40-dpo-from-scratch/code/main.py

| 任务 | 代码 |
|---|---|
| 训练 Bradley-Terry 奖励模型 | `train_rm(n_pairs=500, lr=0.1)` |
| 微型 PPO-RLHF 循环 | `rlhf_loop(w, updates=300, beta=0.1)` |
| 带自适应 KL 的 TRL PPO | `PPOConfig(init_kl_coef=0.05, target_kl=6.0)` |
| 训练 DPO，第 10.08 课 | `dpo_train(..., lr=5e-6, beta=0.1)` |
| 扫描 beta | `betas=[0.01, 0.1, 0.3, 1.0]` |
| 回复对数概率 | `sequence_log_prob(policy, prompt, chosen)` |
| 比较六种损失 | `python3 code/main.py` |
| 端到端综合项目 | `sys.exit(run_demo())` |

## 损失
type: concepts
from: phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md, phases/10-llms-from-scratch/08-dpo/docs/zh.md, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/docs/zh.md, phases/19-capstone-projects/40-dpo-from-scratch/docs/zh.md

- **奖励模型损失**：$-\log \sigma(R_\phi(x, y_+) - R_\phi(x, y_-))$，即 Bradley-Terry 成对逻辑损失。
- **隐式奖励**：$r = \beta \log \frac{\pi^*(y \mid x)}{\pi_{\text{ref}}(y \mid x)} + \beta \log Z(x)$。$Z(x)$ 会消掉。
- **DPO**：$-\log \sigma(\beta (\log \frac{\pi(y_w)}{\pi_{\text{ref}}(y_w)} - \log \frac{\pi(y_l)}{\pi_{\text{ref}}(y_l)}))$
- **IPO**：对数比之差与 $\frac{1}{2\beta}$ 的平方误差。分数差保持有界。
- **SimPO**：长度归一化的 $\frac{\beta}{|y|} \log \pi(y \mid x)$，带有间隔 $\gamma$。无需参考模型。
- **梯度符号**：$\partial L / \partial \log \pi_\theta(y_w) = -\beta (1 - \sigma(z))$。选中回复概率上升。

## 默认值
type: defaults
from: phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md, phases/10-llms-from-scratch/07-rlhf/docs/zh.md, phases/10-llms-from-scratch/08-dpo/docs/zh.md, phases/19-capstone-projects/40-dpo-from-scratch/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| RLHF KL β | 0.01-0.05 | 常见范围 |
| InstructGPT KL β | 0.02 | lr=1.5e-5，4 个 PPO epoch |
| PPO 裁剪 ε | 0.2 | 将比率裁剪到 1 ± ε |
| TRL `init_kl_coef` | 0.05 | 配合 `target_kl=6.0` |
| DPO β，第 10.08 课 | 0.1 | 合适区间为 0.1 至 0.3 |
| DPO lr，第 10.08 课 | 5e-6 | 5 epoch |
| 综合项目 `DPOConfig` beta | 0.2 | lr 1e-3，30 epoch |
| 综合项目 `warmup_epochs` | 8 | 先预训练参考模型 |

## 故障排查
type: troubleshooting
from: phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md, phases/10-llms-from-scratch/07-rlhf/docs/zh.md, phases/10-llms-from-scratch/08-dpo/docs/zh.md, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 奖励上升，人工评估不变 | 奖励投机 | 提前停止，提高 β，扩充 RM 数据 |
| 回复越来越长 | 长度投机 | 长度归一化奖励，或 SimPO |
| 平均 KL 超过约 5-10 | 策略偏离 SFT | 使用以固定 KL 为目标的自适应 β |
| 策略几乎不变 | β 过高 | 降低 β |
| DPO 中选中回复对数概率下降 | 选中回复退化 | 对选中回复施加 BPO 惩罚 |
| DPO 分数差暴涨 | 隐式奖励差无界 | 使用 IPO，将差值限制在 1/(2 beta) |
| RM 评分不可靠 | RM 小于策略模型 | RM 至少与策略模型同样大 |
| 约 30% 噪声标签 | 偏好含糊 | 按一致性过滤数据，使用 BT 温度 |

## 问答
type: qa
from: phases/10-llms-from-scratch/07-rlhf/docs/zh.md, phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md, phases/10-llms-from-scratch/08-dpo/docs/zh.md, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/docs/zh.md

- **为何用配对而非绝对评分？** 人擅长比较两个答案，不擅长给单个答案打分。
- **为何需要 KL 项？** 让策略接近奖励模型训练数据的分布。
- **RM 为何读取最后一个 token？** 因果掩码让它看到整个序列。
- **每个 DPO 对需要多少次前向传播？** 四次：两个模型各处理两个回复。
- **直接对齐算法能避免过度优化吗？** 不能，它们改为过度优化参考概率比。
