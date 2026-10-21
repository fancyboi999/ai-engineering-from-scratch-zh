---
id: alignment-training
title: 对齐训练：指令、DPO 家族与 RLAIF
code: AI
subtitle: 选择并调优 RLHF、DPO、IPO、KTO、SimPO、ORPO、BPO 与 Constitutional AI。涵盖损失、默认值与故障。
hue: 290
sources: phases/18-ethics-safety-alignment/01-instruction-following-alignment-signal, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family, phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif, phases/10-llms-from-scratch/07-rlhf, phases/10-llms-from-scratch/08-dpo
source_hash: 93ce231e3fc3a6c5
---

## RLHF、RLAIF 与 DPO 对比
type: comparison
span: 2
from: phases/10-llms-from-scratch/08-dpo/docs/zh.md, phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/docs/zh.md, phases/18-ethics-safety-alignment/01-instruction-following-alignment-signal/docs/zh.md, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/docs/zh.md

| 比较项 | RLHF (PPO) | RLAIF (CAI) | DPO |
|---|---|---|---|
| 偏好信号 | 人工标注者对成对答案排序 | 反馈模型读取原则 | 人类或 AI 偏好 |
| 奖励模型 | 必需，单独训练 | 使用 AI 偏好训练 | 隐含在模型概率中 |
| 强化学习算法 | PPO，复杂且不稳定 | 针对奖励模型执行 PPO | 监督学习，稳定 |
| 需训练的模型 | 3 个：SFT、奖励、策略 | 同 RLHF | 1 个：仅策略 |
| 内存中的模型 | 3-4 个 | 同 RLHF | 2 个：当前与参考 |
| 超参数 | lr、KL 系数、裁剪比率、RM lr，三套训练轮数 | 同 RLHF | lr、beta、训练轮数 |
| 在线循环 | 有，用新评分重新训练 RM | 有，使用迭代循环 | 无，固定偏好对数据集 |
| 主要故障 | 奖励投机 | 古德哈特效应仍在，谄媚减少 | 过度优化参考概率比 |

## DPO 家族的损失
type: comparison
span: 2
from: phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/docs/zh.md, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/code/main.py, phases/10-llms-from-scratch/08-dpo/docs/zh.md

| 比较项 | IPO | KTO | SimPO | ORPO |
|---|---|---|---|---|
| 数据 | 成对数据 | 不成对的好坏标签 | 成对数据 | 成对数据 |
| 参考策略 | 需要 | 需要 | 不需要 | 不需要 |
| 修复的 DPO 问题 | 奖励差无界 | 需要成对数据 | 长度偏差 | 需要单独 SFT 阶段 |
| 损失形式 | 平方误差，目标为 1/(2 beta) | 前景理论、损失厌恶 | 长度归一化对数概率，间隔 gamma | NLL 加 lambda 乘赔率比 |
| 简化函数 | `train_dpo(pairs, variant="ipo")` | `train_kto(labels)` | `train_simpo(pairs)` | `train_orpo(pairs)` |
| 简化实现默认值 | `beta: float = 0.1` | `beta: float = 0.1` | `beta: float = 1.5`, `gamma: float = 0.5` | `lam: float = 0.1` |

## 按场景选择
type: tips
from: phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/docs/zh.md, phases/10-llms-from-scratch/08-dpo/docs/zh.md, phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/docs/zh.md

- DPO：有 5,000-20,000 个偏好对，或算力有限。算力需求约为 RLHF 的三分之一。
- SimPO：DPO 存在明显长度偏差。
- KTO：有不成对的二元反馈。
- ORPO：希望从基础模型开始使用单阶段流水线。
- BPO：DPO 日志显示优选回答的对数概率下降。
- IPO：偏好强度差异很大，且 DPO 已饱和。
- RLHF：“更好”包含多个维度，或需在在线循环中给新样本评分。
- RLAIF：用读取明确原则的模型替代人工标注者。

## InstructGPT 流水线
type: architecture
from: phases/18-ethics-safety-alignment/01-instruction-following-alignment-signal/docs/zh.md, phases/10-llms-from-scratch/07-rlhf/docs/zh.md

```arch
node | base | 1,1 | 基础模型 | 补全文本 | model
node | sft | 2,1 | SFT 模型 | 偏好对上的交叉熵 | model
node | prefs | 3,1 | 偏好对 | prompt、胜者、败者 | store
node | rm | 4,1 | 奖励模型 | 标量头、Bradley-Terry | model
node | ref | 1,2 | 参考模型 | 冻结的 SFT | model
node | pol | 2,2 | 策略模型 | 正在优化 | model
node | ppo | 3,2 | PPO 更新 | reward - beta * KL | process
node | lab | 4,2 | 人工标注者 | 为 K 个补全排序 | client
edge | base | sft | SFT
edge | sft | prefs | 生成
edge | lab | prefs | 排序
edge | prefs | rm | 训练
edge | sft | ref | 冻结
edge | sft | pol | 初始化
edge | pol | rm | 回答
edge | rm | ppo | 奖励
edge | ref | ppo | KL 惩罚
edge | ppo | pol | 更新
```

## Constitutional AI 流水线
type: flow
from: phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/docs/zh.md

1. **SFT 模型**：有帮助但尚未达到无害要求。回答红队 prompt。
2. **批评模型**：读取抽样原则，批评回答。
3. **修订步骤**：修订回答。修订后的回答作为 SFT 目标。
4. **反馈模型**：按抽样原则为成对补全排序。
5. **奖励模型**：使用 AI 生成的偏好训练。
6. **PPO**：与 InstructGPT 一样，针对 RM 优化策略。
7. **Constitutional Classifier**：把关输出。v1 的算力开销为 23.7%，v2 约 1%。

## 损失公式
type: concepts
from: phases/18-ethics-safety-alignment/01-instruction-following-alignment-signal/docs/zh.md, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/docs/zh.md, phases/10-llms-from-scratch/07-rlhf/docs/zh.md, phases/10-llms-from-scratch/08-dpo/docs/zh.md

- **Bradley-Terry 奖励模型**：$L_{\text{RM}} = -\log \sigma(r(x, y_w) - r(x, y_l))$
- **RLHF 目标**：$\mathbb{E}[r(x, y)] - \beta \, \mathrm{KL}(\pi \,\|\, \pi_{\text{SFT}})$
- **PPO-ptx**: $J(\pi) + \gamma \, \mathbb{E}_{x \sim D_{\text{pretrain}}}[\log \pi(x)]$
- **隐式奖励**：$\beta \log \frac{\pi(y \mid x)}{\pi_{\text{ref}}(y \mid x)}$
- **DPO**: $-\log \sigma(\beta (\log \frac{\pi(y_w)}{\pi_{\text{ref}}(y_w)} - \log \frac{\pi(y_l)}{\pi_{\text{ref}}(y_l)}))$
- **IPO**：(对数比差 $- \frac{1}{2\beta}$) 的平方。间隔保持有界。
- **SimPO**: $-\log \sigma(\frac{\beta}{|y_w|} \log \pi(y_w) - \frac{\beta}{|y_l|} \log \pi(y_l) - \gamma)$
- **ORPO**：$L_{\text{NLL}}(y_w) + \lambda L_{\text{OR}}$，无需参考策略。

## 两种成对损失的代码
type: annotated-code
lang: python
from: phases/10-llms-from-scratch/07-rlhf/code/main.py, phases/10-llms-from-scratch/08-dpo/code/main.py

```python
def bradley_terry_loss(reward_preferred, reward_rejected):
    diff = reward_preferred - reward_rejected        # RM 分数差
    loss = -np.log(sigmoid(diff) + 1e-8)             # 第 2 阶段的 RM 损失

def dpo_loss(policy_logprob_preferred, policy_logprob_rejected,
             ref_logprob_preferred, ref_logprob_rejected, beta=0.1):
    preferred_ratio = policy_logprob_preferred - ref_logprob_preferred
    rejected_ratio = policy_logprob_rejected - ref_logprob_rejected
    logit = beta * (preferred_ratio - rejected_ratio)  # 输入 4 个对数概率
    loss = -np.log(sigmoid(logit) + 1e-8)            # 无奖励模型
    preferred_reward = beta * preferred_ratio        # 隐式奖励
    rejected_reward = beta * rejected_ratio
    "reward_margin": float(preferred_reward - rejected_reward)  # 必须增长
```

## 简化流水线代码
type: task-table
from: phases/18-ethics-safety-alignment/01-instruction-following-alignment-signal/code/main.py, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/code/main.py, phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/code/main.py, phases/10-llms-from-scratch/07-rlhf/code/main.py, phases/10-llms-from-scratch/08-dpo/code/main.py

| 任务 | 代码 |
|---|---|
| 运行课程演示 | `python3 code/main.py` |
| 标准简化 RLHF | `stage3_ppo(sft, rm, beta=0.1)` |
| 展示奖励投机 | `stage3_ppo(sft, rm, beta=0.0)` |
| 注入奖励模型缺陷 | `stage2_reward_model(bias=[0.5, 0.0, 0.0])` |
| 训练 DPO、IPO 或 BPO | `train_dpo(pairs, variant="bpo")` |
| 构建 CAI SFT 语料 | `build_cai_sft_corpus(500)` |
| AI 标注者为偏好对排序 | `ai_feedback_rank(a, b)` |
| 扫描 DPO beta | `betas=[0.01, 0.1, 0.3, 1.0]` |

## 故障排查
type: troubleshooting
from: phases/18-ethics-safety-alignment/01-instruction-following-alignment-signal/docs/zh.md, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/docs/zh.md, phases/10-llms-from-scratch/07-rlhf/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 奖励上升，输出退化 | beta 过低，RM 有盲点 | 提高 KL 惩罚 |
| 相比 SFT 没有收益 | beta 过高 | 降低 beta |
| RLHF 后基准下降 | 对齐代价 | PPO-ptx：混入预训练梯度 |
| 回答越来越长 | RM 按长度评分 | 使用对抗 RM 数据或 SimPO |
| 模型凡事赞同 | 标注者导致谄媚 | 使用多个奖励模型和对抗数据 |
| DPO 中优选回答的对数概率下降 | 优选回答退化 | 改用 BPO |
| DPO 奖励差爆炸 | 隐式差值无界 | 使用 IPO，将差值约束在 1/(2 beta) |
| 标准奖励达到峰值后崩溃 | DAA 也会过度优化 | 更好的数据、集成、提前停止 |

## 默认值
type: defaults
span: 1
from: phases/10-llms-from-scratch/07-rlhf/docs/zh.md, phases/10-llms-from-scratch/07-rlhf/code/main.py, phases/10-llms-from-scratch/08-dpo/docs/zh.md, phases/10-llms-from-scratch/08-dpo/code/main.py, phases/18-ethics-safety-alignment/01-instruction-following-alignment-signal/code/main.py, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| PPO `kl_coeff` | 0.02 | InstructGPT；Llama 2 Chat 使用 0.01 |
| PPO `lr` | 1.5e-5 | InstructGPT：256K 个回合，每批 4 轮 PPO |
| PPO 裁剪 epsilon | 0.2 | 典型值 |
| DPO `beta` | 0.1 | 合适范围为 0.1 至 0.3 |
| DPO `lr` | 5e-6 | `dpo_train` 中 `num_epochs=5` |
| RM `lr` | 1e-4 | `train_reward_model` 中 `num_epochs=10` |
| 简化 `stage3_ppo` | `steps: int = 300` | `batch: int = 32`, `lr: float = 0.1` |
| KTO 损失厌恶 | 2.0 | 简化实现中坏标签的权重；第 08 课写为 1.5 倍 |

## 问答
type: qa
from: phases/18-ethics-safety-alignment/01-instruction-following-alignment-signal/docs/zh.md, phases/10-llms-from-scratch/07-rlhf/docs/zh.md, phases/10-llms-from-scratch/08-dpo/docs/zh.md, phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/docs/zh.md, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/docs/zh.md

- **为何 1.3B InstructGPT 胜过 175B GPT-3？** 标注者约 70% 的时候更喜欢它。对齐与能力是不同维度。
- **RLHF 能补充事实吗？** 不能。基础模型决定能力下限。
- **为何用成对标签？** 人类善于比较两条回答，不善于给绝对分数。
- **RM 准确率多少算好？** 留出偏好对上约 72%。标注者间一致率约 73%。
- **RLAIF 只是更便宜的 RLHF 吗？** 不是。信号可读：能看到原则、批评和修订。
- **DAA 能避开古德哈特效应吗？** 不能。过度优化转移到了参考策略比率上。
