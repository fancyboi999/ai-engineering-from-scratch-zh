# 后训练

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

监督微调、偏好微调、LoRA，以及在训练好的模型上做强化学习。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [仅训练分类头还是全量微调整个模型](classifier-head-or-full.md) | 权衡 | 1 基础 | 8 |
| [计算单个 LoRA 适配器的参数量](lora-parameter-count.md) | 估算 | 1 基础 | 6 |
| [百万抓取问答对还是小规模精选数据集](sft-data-quality-wins.md) | 权衡 | 1 基础 | 8 |
| [为什么 SFT 损失计算要跳过指令 token](sft-loss-mask.md) | 概念 | 1 基础 | 6 |
| [用遵循原则的模型替代人工标注者](constitutional-ai-not-cheaper.md) | 概念 | 2 应用 | 10 |
| [DPO 中的奖励模型到底去了哪里](dpo-implicit-reward.md) | 概念 | 2 应用 | 12 |
| [损失函数纹丝不动的 DPO 训练器](dpo-reference-bug.md) | 代码阅读 | 2 应用 | 12 |
| [GRPO 奖励停滞与不提供学习信号的组](grpo-groups-teach-nothing.md) | 排障 | 2 应用 | 12 |
| [RLHF 中 KL 散度惩罚守护的到底是什么](kl-penalty-purpose.md) | 概念 | 2 应用 | 10 |
| [在 24 GB 单卡 GPU 上微调 7B 模型](qlora-on-one-gpu.md) | 估算 | 2 应用 | 10 |
| [为什么奖励模型基于成对比较而非打分学习](reward-model-pairwise.md) | 概念 | 2 应用 | 10 |
| [GPU 闲置但强化学习训练日志却不断膨胀](rl-engine-died-silent.md) | 排障 | 2 应用 | 10 |
| [在 SFT 中直接复用预训练学习率的代价](sft-learning-rate-gap.md) | 概念 | 2 应用 | 8 |
| [DPO 训练中边际上升但选定回答概率下降](dpo-chosen-logprob-falls.md) | 排障 | 3 高级 | 12 |
| [小团队应该选 DPO 还是全套 RLHF](dpo-or-rlhf.md) | 权衡 | 3 高级 | 12 |
| [在重加权之前先消除差距的根因](gap-remove-before-reweight.md) | 权衡 | 3 高级 | 15 |
| [第 0 步概率差距数倍于正常健康区间](logprob-gap-at-step-zero.md) | 排障 | 3 高级 | 12 |
| [为四种数据形态选用专属偏好损失](preference-loss-picker.md) | 设计 | 3 高级 | 15 |
| [奖励曲线持续攀升但人工评测毫无起色](reward-up-humans-flat.md) | 排障 | 3 高级 | 12 |
| [编写并严密验证 GRPO 自定义奖励函数](rl-custom-reward-take-home.md) | 课后任务 | 3 高级 | 30 |
| [在将所谓强化学习加速设为默认前做严格评审](rl-report-a-change.md) | 设计 | 3 高级 | 12 |
| [设计异步 RL 采样并控制样本陈旧度](async-rl-sample-age.md) | 设计 | 4 架构与规模 | 15 |
| [去掉奖励模型就能终结奖励作弊吗](daa-still-overoptimize.md) | 概念 | 4 架构与规模 | 12 |
| [规划智能客服助手的后训练全流程](post-training-pipeline-take-home.md) | 课后任务 | 4 架构与规模 | 45 |

[全部主题](../../README.md)
