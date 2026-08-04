# 奖励建模与 RLHF

> 人类写不出"好的助手回复"的奖励函数，但他们能比较两个回复、挑出更好的那个。把奖励模型拟合到这些比较上，然后让语言模型对着它做 RL。Christiano 2017。InstructGPT 2022。把 GPT-3 变成 ChatGPT 的配方。到了 2026 年它大半被 DPO 取代了——但心智模型还在。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 05（情感分析）、Phase 9 · 08（PPO）
**预计时间：** ~45 分钟

## 问题背景

你用 next-token 预测目标训了一个语言模型。它能写出语法正确的英语。它也会撒谎、絮叨、该拒绝时不拒绝。你没法靠更多预训练修这个——网页文本是病因，不是解药。

你想要一个*标量奖励*，能说"对指令 X，回复 A 比回复 B 更好"。手写这个奖励函数是不可能的。"有帮助"不是 token 上的一个闭式表达式。但人类能比较两个输出、标出一个偏好。这在规模上收集起来很便宜。

RLHF（Christiano 等人 2017；Ouyang 等人 2022）把偏好转成一个奖励模型，再让 LM 对着那个奖励通过 PPO 优化。分三步：SFT → RM → PPO。这就是 2023–2025 年间出货了 ChatGPT、Claude、Gemini 以及其他每个对齐 LLM 的配方。

到了 2026 年，PPO 那步大半被 DPO（Phase 10 · 08）取代，因为它更便宜，而且在对齐调优上几乎一样好。但*奖励模型*那块仍是每个 Best-of-N 采样器、每条从可验证奖励做 RL 的流水线、以及每个用过程奖励模型的推理模型的底座。理解了 RLHF，你就理解了整个对齐技术栈。

## 核心概念

![Three-stage RLHF: SFT, RM training on pairwise prefs, PPO with KL penalty](../assets/rlhf.svg)

**第 1 阶段：监督微调（SFT）。** 从一个预训练基座模型开始。在目标行为的人写示范（遵循指令的回复、有帮助的答复等）上微调。结果：一个*偏向好行为*但动作空间仍无界的模型 `π_SFT`。

**第 2 阶段：奖励模型训练。**

- 对 prompt `x`，收集成对回复 `(y_+, y_-)`，由人类标注为"y_+ 优于 y_-"。
- 训练一个奖励模型 `R_φ(x, y)`，给 `y_+` 打更高分。
- 损失：**Bradley-Terry 成对逻辑斯蒂**：

  `L(φ) = -E[ log σ(R_φ(x, y_+) - R_φ(x, y_-)) ]`

  σ 是 sigmoid。奖励之差蕴含了偏好的对数几率。BT 自 1952 年（Bradley-Terry）起就是标准，也是现代 RLHF 里占主导的选择。

- `R_φ` 通常从 SFT 模型初始化，上面加一个标量头。同样的 transformer 主干；一个线性层输出奖励。

**第 3 阶段：带 KL 惩罚地对 RM 做 PPO。**

- 从 `π_SFT` 初始化可训练策略 `π_θ`。保留一个冻结的*参考* `π_ref = π_SFT`。
- 回复 `y` 末尾的奖励：

  `r_total(x, y) = R_φ(x, y) - β · KL(π_θ(·|x) || π_ref(·|x))`

  KL 惩罚阻止 `π_θ` 从 `π_SFT` 任意漂移——它是*正则项*，不是硬性信任域。`β` 通常 `0.01`-`0.05`。
- 用这个奖励跑 PPO（第 08 课）。优势在 token 级轨迹上计算，但 RM 只给完整回复打分。

**为什么要 KL？** 没有它，PPO 会乐呵呵地找到奖励 hacking 策略——RM 只在分布内补全上训过。一个分布外的回复可能比任何人写的都打分更高。KL 让 `π_θ` 待在 RM 训练所在的流形附近。它是 RLHF 里最重要的那一个旋钮。

**2026 现状：**

- **DPO**（Rafailov 2023）：闭式代数把第 2、3 阶段塌缩成偏好数据上的单一监督损失。无 RM，无 PPO。在对齐 benchmark 上质量相当，算力只用零头。在 Phase 10 · 08 讲。
- **GRPO**（DeepSeek 2024–2025）：用组相对基线代替 critic 的 PPO，奖励来自一个*验证器*（代码能跑 / 数学答案对上）而非人训的 RM。在推理模型上占主导。在 Phase 9 · 12 讲。
- **过程奖励模型（PRM）：** 给部分解（每个推理步）打分，在 RLHF 和推理用的 GRPO 变体里都有用。
- **Constitutional AI / RLAIF：** 用一个对齐 LLM 而非人类来生成偏好。扩展偏好预算。

```figure
reward-model
```

## 动手构建

这一课用极小的合成"prompt"和"回复"，表示成字符串。RM 是一个在 bag-of-tokens 表示上的线性打分器。没有真 LLM——重要的是流水线的*形状*，不是规模。见 `code/main.py`。

### 第 1 步：合成偏好数据

```python
PROMPTS = ["help me", "answer me", "explain this"]
GOOD_WORDS = {"clear", "specific", "kind", "thorough"}
BAD_WORDS = {"vague", "rude", "wrong", "short"}

def make_pair(rng):
    x = rng.choice(PROMPTS)
    y_good = rng.choice(list(GOOD_WORDS)) + " " + rng.choice(list(GOOD_WORDS))
    y_bad = rng.choice(list(BAD_WORDS)) + " " + rng.choice(list(BAD_WORDS))
    return (x, y_good, y_bad)
```

真 RLHF 里这被人类标注员取代。形状——`(prompt, preferred_response, rejected_response)`——一模一样。

### 第 2 步：Bradley-Terry 奖励模型

线性打分：`R(x, y) = w · bag(y)`。训练目标是最小化 BT 成对对数损失：

```python
def rm_train_step(w, x, y_pos, y_neg, lr):
    r_pos = dot(w, bag(y_pos))
    r_neg = dot(w, bag(y_neg))
    p = sigmoid(r_pos - r_neg)
    for tok, cnt in bag(y_pos).items():
        w[tok] += lr * (1 - p) * cnt
    for tok, cnt in bag(y_neg).items():
        w[tok] -= lr * (1 - p) * cnt
```

几百次更新后，`w` 给好词 token 赋正权重，给坏词赋负权重。

### 第 3 步：在 RM 之上跑类 PPO 策略

我们的玩具策略从词表里产出单个 token。我们在 RM 下给这个 token 打分，算 `log π_θ(token | prompt)`，加上一个到参考的 KL 惩罚，再套用裁剪的 PPO 代理。

```python
def rlhf_step(theta, ref, w, prompt, rng, eps=0.2, beta=0.1, lr=0.05):
    logits_theta = policy_logits(theta, prompt)
    probs = softmax(logits_theta)
    token = sample(probs, rng)
    logits_ref = policy_logits(ref, prompt)
    probs_ref = softmax(logits_ref)
    reward = dot(w, bag([token])) - beta * kl(probs, probs_ref)
    # ppo-style update on theta, treating reward as the return
    ...
```

### 第 4 步：盯住 KL

每次更新都跟踪平均 `KL(π_θ || π_ref)`。如果它爬过 `~5-10`，策略就漂得离 `π_SFT` 太远了——要么 `β` 调低过头了，要么奖励 hacking 开始了。这是真 RLHF 里头号诊断量。

### 第 5 步：用 TRL 的生产配方

理解了玩具流水线后，这里是同一个循环，写成真实库用户会写的样子。Hugging Face 的 [TRL](https://huggingface.co/docs/trl) 是参考实现——第 2 阶段用 `RewardTrainer`，第 3 阶段用 `PPOTrainer`（内置到参考的 KL）。

```python
# Stage 2: reward model from pairwise preferences
from trl import RewardTrainer, RewardConfig
from transformers import AutoModelForSequenceClassification, AutoTokenizer

tok = AutoTokenizer.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")
rm = AutoModelForSequenceClassification.from_pretrained(
    "meta-llama/Llama-3.1-8B-Instruct", num_labels=1
)

# dataset rows: {"prompt", "chosen", "rejected"} — Bradley-Terry format
trainer = RewardTrainer(
    model=rm,
    tokenizer=tok,
    train_dataset=preference_data,
    args=RewardConfig(output_dir="./rm", num_train_epochs=1, learning_rate=1e-5),
)
trainer.train()
```

```python
# Stage 3: PPO against the RM with KL penalty to the SFT reference
from trl import PPOTrainer, PPOConfig, AutoModelForCausalLMWithValueHead

policy = AutoModelForCausalLMWithValueHead.from_pretrained("./sft-checkpoint")
ref    = AutoModelForCausalLMWithValueHead.from_pretrained("./sft-checkpoint")  # frozen

ppo = PPOTrainer(
    config=PPOConfig(learning_rate=1.41e-5, batch_size=64, init_kl_coef=0.05,
                     target_kl=6.0, adap_kl_ctrl=True),
    model=policy, ref_model=ref, tokenizer=tok,
)

for batch in dataloader:
    responses = ppo.generate(batch["query_ids"], max_new_tokens=128)
    rewards   = rm(torch.cat([batch["query_ids"], responses], dim=-1)).logits[:, 0]
    stats     = ppo.step(batch["query_ids"], responses, rewards)
    # stats includes: mean_kl, clip_frac, value_loss — the three PPO diagnostics
```

库帮你做了三件事。`adap_kl_ctrl=True` 实现自适应 β 调度：若观测 KL 超过 `target_kl`，β 翻倍；若低于一半，β 减半。参考模型按惯例冻结——你绝不能不小心和 `policy` 共享参数。价值头跟策略住在同一个主干上（`AutoModelForCausalLMWithValueHead` 挂了一个标量 MLP 头），这也是为什么 TRL 分开报告 `policy/kl` 和 `value/loss`。

## 注意事项

- **过度优化 / 奖励 hacking。** RM 不完美；`π_θ` 找到了打分高但其实很糟的对抗性补全。症状：奖励无限攀升而人评分平台期或下跌。修法：早停、调高 `β`、拓宽 RM 训练数据。
- **长度 hacking。** 在有帮助回复上训的 RM 常常隐式地奖励长度。策略学会给回复灌水。补救：长度归一化奖励，或用长度感知 RM 的 RLAIF。
- **RM 太小。** RM 至少要和策略一样大。一个小 RM 没法忠实地给策略的输出打分。
- **KL 调参。** β 太低 → 漂移和奖励 hacking。β 太高 → 策略几乎不变。标准技巧是用*自适应* β，把每步的 KL 钉在一个固定值上。
- **偏好数据噪声。** 约 30% 的人类标签有噪声或歧义。用一致性过滤后的数据训 RM 来校准，或在 BT 上用一个温度。
- **离策略问题。** 第一轮之后 PPO 数据就略微离策略了。像第 08 课那样盯住裁剪比例。

## 实际使用

2026 年的 RLHF 是分层的：

| 层 | 目标 | 方法 |
|-------|--------|--------|
| 遵循指令、有帮助、无害 | 对齐 | DPO（Phase 10 · 08）优先于 RLHF-PPO。 |
| 推理正确性（数学、代码） | 能力 | 带验证器奖励的 GRPO（Phase 9 · 12）。 |
| 长视野多步任务 | agent 化 | 在步上带过程奖励模型的 PPO / GRPO。 |
| 安全 / 拒绝行为 | 安全 | 带单独安全 RM 的 RLHF-PPO，或 Constitutional AI。 |
| 推理时 Best-of-N | 快速对齐 | 在解码时用 RM；无需训练策略。 |
| 奖励蒸馏 | 推理算力 | 在冻结的 LM 上训一个小"奖励头"。 |

RLHF 是 2022–2024 年的*那个*方法。到了 2026 年，生产对齐流水线 DPO 优先，只在 RM 密集或安全攸关的步骤上才用 PPO。

## 拿去用

存为 `outputs/skill-rlhf-architect.md`：

```markdown
---
name: rlhf-architect
description: Design an RLHF / DPO / GRPO alignment pipeline for a language model, including RM, KL, and data strategy.
version: 1.0.0
phase: 9
lesson: 9
tags: [rl, rlhf, alignment, llm]
---

Given a base LM, a target behavior (alignment / reasoning / refusal / agent), and a preference or verifier budget, output:

1. Stage. SFT? RM? DPO? GRPO? With justification.
2. Preference or verifier source. Humans, AI feedback, rule-based, unit-test-pass, or reward distillation.
3. KL strategy. Fixed β, adaptive β, or DPO (implicit KL).
4. Diagnostics. Mean KL, reward stability, over-optimization guard (holdout human eval).
5. Safety gate. Red-team set, refusal rate, safety RM separate from helpfulness RM.

Refuse to ship RLHF-PPO without a KL monitor. Refuse to use an RM smaller than the target policy. Refuse length-only rewards. Flag any pipeline that does not hold back a blind human-eval set as lacking over-optimization protection.
```

## 练习

1. **简单。** 在 `code/main.py` 里用 500 对合成偏好训练 Bradley-Terry 奖励模型。在留出的 100 对上测成对准确率。应超过 90%。
2. **中等。** 用 `β ∈ {0.0, 0.1, 1.0}` 跑玩具 PPO-RLHF 循环。对每个，画出随更新变化的 RM 分数对到参考的 KL。哪个跑出了奖励 hacking？
3. **困难。** 在同一份偏好数据上实现 DPO（闭式偏好似然损失），和 RLHF-PPO 流水线对比所用算力和达到的最终 RM 分数。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| RLHF | "对齐 RL" | 三阶段 SFT + RM + PPO 流水线（Christiano 2017，Ouyang 2022）。 |
| 奖励模型（RM） | "打分网络" | 通过 Bradley-Terry 拟合到成对偏好上的学习式标量函数。 |
| Bradley-Terry | "成对逻辑斯蒂损失" | `P(y_+ ≻ y_-) = σ(R(y_+) - R(y_-))`；标准 RM 目标。 |
| KL 惩罚 | "待在参考附近" | 奖励里的 `β · KL(π_θ || π_ref)`；反奖励 hacking 的正则项。 |
| 奖励 hacking | "Goodhart 定律" | 策略利用 RM 缺陷；症状：奖励涨、人评分平。 |
| RLAIF | "AI 标注的偏好" | 标签来自另一个 LM 而非人类的 RLHF。 |
| PRM | "过程奖励模型" | 给部分推理步打分；用在推理流水线里。 |
| Constitutional AI | "Anthropic 的方法" | 由明确规则引导的 AI 生成偏好。 |

## 延伸阅读

- [Christiano et al. (2017). Deep Reinforcement Learning from Human Preferences](https://arxiv.org/abs/1706.03741) —— 开启 RLHF 的论文。
- [Ouyang et al. (2022). InstructGPT — Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155) —— ChatGPT 背后的配方。
- [Stiennon et al. (2020). Learning to summarize with human feedback](https://arxiv.org/abs/2009.01325) —— 更早的用于摘要的 RLHF。
- [Rafailov et al. (2023). Direct Preference Optimization](https://arxiv.org/abs/2305.18290) —— DPO；2026 年后 RLHF 时代的默认。
- [Bai et al. (2022). Constitutional AI: Harmlessness from AI Feedback](https://arxiv.org/abs/2212.08073) —— RLAIF 与自我批评循环。
- [Anthropic RLHF paper (Bai et al. 2022). Training a Helpful and Harmless Assistant](https://arxiv.org/abs/2204.05862) —— HH 论文。
- [Hugging Face TRL library](https://huggingface.co/docs/trl) —— 生产级 `RewardTrainer` 和 `PPOTrainer`。读 trainer 源码看自适应 KL 和价值头的细节。
- [Hugging Face — Illustrating Reinforcement Learning from Human Feedback](https://huggingface.co/blog/rlhf) by Lambert, Castricato, von Werra, Havrilla —— 三阶段流水线的经典图解走读。
- [von Werra et al. (2020). TRL: Transformer Reinforcement Learning](https://github.com/huggingface/trl) —— 这个库；`examples/` 里有 Llama、Mistral、Qwen 的端到端 RLHF 脚本。
- [Sutton & Barto (2018). Ch. 17.4 — Designing Reward Signals](http://incompleteideas.net/book/RLbook2020.pdf) —— 奖励假设视角；思考奖励 hacking 的必备前置。
