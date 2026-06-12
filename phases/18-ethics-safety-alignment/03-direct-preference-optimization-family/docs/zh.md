# 直接偏好优化家族

> Rafailov et al.（2023）证明 RLHF 的最优解能用偏好数据写成闭式，于是你可以跳过显式的奖励模型，直接优化策略。这个洞见催生了一个家族——IPO、KTO、SimPO、ORPO、BPO——每一个都修掉 DPO 的一个失败模式。到 2026 年，直接对齐算法承载的前沿后训练运行比 PPO 还多。但第 2 课那条过度优化曲线照样适用：DAA 没逃出古德哈特，它们只是挪了挪它咬人的地方。

**类型：** Learn
**语言：** Python（标准库，六变体偏好损失对比器）
**前置要求：** 阶段 18 · 01（InstructGPT）、阶段 18 · 02（奖励作弊）、阶段 10 · 08（DPO 基础）
**预计时间：** ~75 分钟

## 学习目标

- 从「带 KL 的 RLHF」最优解推导出 DPO 闭式。
- 说出 IPO、KTO、SimPO、ORPO、BPO 各自修掉了 DPO 的哪个失败模式。
- 区分「隐式奖励缝隙」和「偏好强度」，并解释为什么 IPO 的恒等映射很重要。
- 解释为什么 Rafailov et al.（NeurIPS 2024）证明了 DAA 即便没有显式 RM 也会过度优化。

## 问题背景

RLHF 目标（第 1 课）：

```
max_pi E_{x,y~pi} [ r(x, y) ] - beta * KL(pi || pi_ref)
```

有一个已知的最优解：

```
pi*(y|x) = (1/Z(x)) * pi_ref(y|x) * exp(r(x, y) / beta)
```

于是奖励被隐式地定义为最优策略与参考策略之比：

```
r(x, y) = beta * log(pi*(y|x) / pi_ref(y|x)) + beta * log Z(x)
```

把它代进 Bradley-Terry 偏好似然，配分函数 `Z(x)` 因为只依赖 `x` 而被消掉。剩下的是一个只含策略参数的损失——不需要奖励模型。这就是 DPO。

那道褶皱：这个推导假设最优解可达、偏好数据在分布内、参考策略是真正的众数锚点。这些没一个是精确成立的。家族里的每个成员都修一条被违反的不同假设。

## 核心概念

### DPO（Rafailov et al., 2023）

```
L_DPO = -log sigmoid(
  beta * log(pi(y_w | x) / pi_ref(y_w | x))
  - beta * log(pi(y_l | x) / pi_ref(y_l | x))
)
```

会出什么岔子：

- 隐式奖励缝隙 `beta * (log(pi/pi_ref)_w - log(pi/pi_ref)_l)` 无界。一点点偏好就能造出任意大的缝隙。
- 损失把选中和拒绝的对数概率往相反方向推。只要拒绝的掉得更快，它能把选中的绝对对数概率也往下压。这就是「选中回复退化」（Degraded Chosen Response）现象。
- 分布外的偏好（罕见罕见对 vs 罕见罕见对）会产生任意的隐式奖励。

### IPO（Azar et al., 2024）

恒等偏好优化（Identity Preference Optimization）把 log-sigmoid 换成对偏好概率的恒等映射。损失变成对一个有界目标的平方误差：

```
L_IPO = (log(pi(y_w | x) / pi_ref(y_w | x)) - log(pi(y_l | x) / pi_ref(y_l | x)) - 1/(2 beta))^2
```

边距被 `1/(2 beta)` 限住。偏好强度与隐式奖励缝隙成正比。不爆炸。

### KTO（Ethayarajh et al., 2024）

卡尼曼-特沃斯基优化（Kahneman-Tversky Optimization）整个丢掉成对结构。给定单个带标签的输出和一个「可取」或「不可取」的二元信号，它映射到一个前景理论效用：

```
v(x, y) = sigma(beta * log(pi(y|x) / pi_ref(y|x)) - z_ref)
```

收益和损失用不同的权重（损失厌恶）。好处：你可以用非成对数据，这种数据多得多。

### SimPO（Meng et al., 2024）

简单偏好优化（Simple Preference Optimization）让训练信号跟生成对齐。整个去掉参考策略，并按长度归一化对数似然：

```
L_SimPO = -log sigmoid(
  (beta / |y_w|) * log pi(y_w | x)
  - (beta / |y_l|) * log pi(y_l | x)
  - gamma
)
```

带一个边距 `gamma` 来稳住。长度归一化去掉了钻 DPO 长度偏置失败模式的动机（按构造，更长的 `y_w` 会给出更大的对数概率缝隙）。

### ORPO（Hong et al., 2024）

胜率比偏好优化（Odds-Ratio Preference Optimization）在标准 SFT 负对数似然上加一个偏好项：

```
L_ORPO = L_NLL(y_w) + lambda * L_OR
L_OR = -log sigmoid(log(odds(y_w) / odds(y_l)))
```

没有参考策略——SFT 项就是正则项。从基座模型到对齐模型单阶段训练。没有单独的 SFT 检查点。

### BPO（ICLR 2026 投稿, OpenReview id=b97EwMUWu7）

它指出选中回复退化问题：DPO 保住了 `y_w > y_l` 的排序，但 `y_w` 的绝对对数概率可能往下掉。BPO 加了一行修正，惩罚在选中回复上往下挪的动作。报告在 Llama-3.1-8B-Instruct 上的数学推理任务上，相比 DPO 准确率 +10.1%。

### 普适结论：DAA 照样过度优化

Rafailov et al. "Scaling Laws for Reward Model Overoptimization in Direct Alignment Algorithms"（NeurIPS 2024）用 DPO、IPO、SLiC 在多个数据集、跨多个 KL 预算训练策略。金标准奖励对 KL 的曲线，有着跟 Gao et al. 一样的「达峰后塌缩」形状。隐式奖励在训练期查询分布外样本；KL 正则化稳不住这件事。

DAA 没逃出古德哈特。它们把它咬人的那个面，从「奖励模型被过度优化」换成了「参考策略之比被过度优化」。那个普适修法——更好的数据、集成、早停——对两者都适用。

### 在它们之间做选择（2026）

- 如果你有大量成对偏好数据：用保守 beta 的 DPO；若长度偏置明显则用 SimPO。
- 如果你有非成对的二元反馈：KTO。
- 如果你想从基座模型走单阶段流水线：ORPO。
- 如果你在 DPO 日志里看到选中对数概率退化：BPO。
- 如果偏好强度差异很大、DPO 在饱和：IPO。

每家实验室都把这五个一起跑一个测试组，按任务挑赢家。没有理由认为数学推理和安全任务的最优解会是同一个。

```figure
dpo-margin
```

## 实际使用

`code/main.py` 在一个玩具偏好数据集上对比六种损失（DPO、IPO、KTO、SimPO、ORPO、BPO），其中真实偏好强度逐对变化。每种损失都用一个小 softmax 策略针对同样的 500 对样本优化。它把每种方法的最终胜率、选中对数概率漂移、隐式奖励离散度都画出来。

## 拿去用

本课产出 `outputs/skill-preference-loss-selector.md`。给定数据集统计量（成对 vs 非成对、偏好强度可变 vs 均匀、长度分布）和一个目标（单阶段 还是 先 SFT 再偏好），推荐一种偏好损失，并报告它防护的是哪个失败模式。

## 练习

1. 运行 `code/main.py`。报告 DPO 和 BPO 的最终选中对数概率掉幅。BPO 应当保住更高的选中绝对概率——验证这一点。

2. 改偏好数据，让所有对的强度相等。六种方法里哪个最鲁棒？哪个退化？解释 IPO 在这里的优势。

3. 让拒绝回复平均比选中的长 2 倍。在其它都不变的情况下，用数值展示 DPO 的长度钻空子，以及 SimPO 的修法。

4. Rafailov et al.（NeurIPS 2024）声称 DAA 会过度优化。复现一个单点版本：画出「选中减拒绝」的 KL 散度，观察 DPO 在大 beta 下的过度优化。

5. 读 BPO 论文摘要（OpenReview b97EwMUWu7）。写下 BPO 给 DPO 加的那一行修正。对照 `code/main.py` 里的实现确认。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| DPO | 「没有奖励模型的 RLHF」 | 从 RLHF 闭式最优解推出的损失；只含策略参数 |
| 隐式奖励 | 「那个对数比」 | `beta * log(pi(y|x) / pi_ref(y|x))`——DPO 蕴含的奖励 |
| IPO | 「有界的 DPO」 | 把 log-sigmoid 换成恒等映射；隐式奖励缝隙被 `1/(2 beta)` 封顶 |
| KTO | 「非成对的 DPO」 | 单标签上带损失厌恶的前景理论效用 |
| SimPO | 「无参考的 DPO」 | 长度归一化对数似然 + 边距；无参考策略 |
| ORPO | 「单阶段的 DPO」 | NLL + 胜率比偏好项；从基座模型一遍训完 |
| BPO | 「保选中的 DPO」 | DPO 加一项惩罚，防止选中回复的绝对对数概率下降 |
| 选中退化 | 「选中往下掉」 | 只要拒绝掉得更快，DPO 就会把选中对数概率往下压 |
| DAA | 「直接对齐算法」 | 任何跳过显式 RM 的偏好损失方法 |

## 延伸阅读

- [Rafailov et al. — Direct Preference Optimization (NeurIPS 2023, arXiv:2305.18290)](https://arxiv.org/abs/2305.18290)
- [Azar et al. — A General Theoretical Paradigm to Understand Learning from Human Preferences (AISTATS 2024, arXiv:2310.12036)](https://arxiv.org/abs/2310.12036) —— IPO
- [Ethayarajh et al. — KTO: Model Alignment as Prospect Theoretic Optimization (arXiv:2402.01306)](https://arxiv.org/abs/2402.01306)
- [Meng, Xia, Chen — SimPO (NeurIPS 2024, arXiv:2405.14734)](https://arxiv.org/abs/2405.14734)
- [Hong, Lee, Thorne — ORPO (EMNLP 2024, arXiv:2403.07691)](https://arxiv.org/abs/2403.07691)
- [BPO — Behavior Preservation Optimization (ICLR 2026 OpenReview b97EwMUWu7)](https://openreview.net/forum?id=b97EwMUWu7)
- [Rafailov et al. — Scaling Laws for RM Overoptimization in DAAs (NeurIPS 2024, arXiv:2406.02900)](https://arxiv.org/abs/2406.02900)
