---
id: post-training-pipeline-take-home
title: 规划智能客服助手的后训练全流程
card: post-training
kind: take-home
level: 4
roles: [applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [take-home, system-design]
tags: [sft, dpo, qlora, pipeline, evaluation]
minutes: 45
lessons: [phases/10-llms-from-scratch/06-instruction-tuning-sft, phases/11-llm-engineering/08-fine-tuning-lora, phases/10-llms-from-scratch/08-dpo, phases/09-reinforcement-learning/09-reward-modeling-rlhf, phases/19-capstone-projects/39-instruction-tuning-sft, phases/19-capstone-projects/40-dpo-from-scratch]
manuals: []
practice: [dpo-loss, lora-forward]
cheatsheet: [llm-pipeline-capstone, rlhf-dpo, lora-fine-tuning]
related: [post-training/dpo-or-rlhf, post-training/qlora-on-one-gpu, post-training/sft-learning-rate-gap]
updated: 2026-11-03
---

课后作业题：一家公司希望基于一个开源的 8B 基座模型构建专属的客服助手。他们拥有大约 50,000 条历史客服对话记录及对应的客户评分，拥有两张 24 GB 显存的 GPU，工期为三周。请在一页纸内编写完整的后训练实施方案：包括执行阶段划分、每个阶段所需的数据形态、起始推荐配置、各阶段完成后的度量准则，以及必须严格设防的三大典型失效模式。

## Short answer

划分为三个核心阶段：第一阶段，在统一聊天模板下，使用 QLoRA 在高评分对话数据上做有监督微调，损失函数严格遮蔽为仅对 assistant 轮次计算，采用较小学习率训练 1 到 3 个 epoch，并在批次中混合百分之几的预训练原始文本；评估准则包括保留集指令损失、原始文本上的漂移以及生成样本阅读检查。第二阶段，以 SFT 产出的检查点作为冻结参考模型，在同一 prompt 对应的高低评分对比对上运行 DPO，采用保守的 beta 参数；评估准则包括盲测成对胜率评估以及选定项的绝对对数概率，而非训练边际指标。第三阶段，发布门禁：固定 prompt 集合的人工盲测打分、拒答安全测试集，以及在客服数据从未覆盖的通用能力上与基座模型做遗忘比对。三大防范的失效模式是：灾难性遗忘、客户评分中对长度与奉承的偏好利用，以及直接偏好代理度量的过度优化。

## Full answer

### 阶段 0：数据工程

- 将所有对话统一转换为规范的聊天模板格式，并配置固定的系统 prompt。
- **SFT 数据集**：筛选最高评分的优质回答，清洗过滤极端文本长度、控制词汇多样性，确保指令与回答比例合理。数万条纯净样本已足够；课程基准 SFT 阶段使用了约 27,000 条数据。
- **偏好数据集**：针对同一用户 prompt 既有高分又有低分回答的场景，构建“prompt、chosen、rejected”三元组。在数据稀疏的地方，直接让 SFT 模型针对该 prompt 采样生成 rejected 负例候选，确保数据对处于参考模型的分布之内；标注者或 judge 必须先确认采样回答确实比选定回答差，才能将它加入数据对，因为 SFT 模型在高评分回答上训练，其采样回答可能同样好。目标构建 DPO 最适宜处理的 5,000 到 20,000 条高质量数据对。
- **盲测评估集**：从未参与训练的真实 prompt 测试集，外加用于检测遗忘的非客服任务集，例如简短代码和算术。

### 阶段 1：基于 QLoRA 的 SFT 微调

两张 24 GB 显卡无法容纳该模型的全量微调更新；7B 模型全量微调在纳入梯度和优化器状态后需要约 56 GB 显存。QLoRA 将基座模型量化冻结为 4-bit，并在注意力投影层挂载秩为 16 的适配器，单卡显存仅需约 6 GB，因此两张卡各自都能独立运行一项实验。

**配置基准**：参考全量微调的 2e-5 学习率并按 LoRA 规律适当调大适配器学习率；训练 1 到 3 个 epoch；在训练批次中动态混合 2% 到 5% 的预训练无监督原始文本。
**度量指标**：保留集指令损失、训练前后的原始文本损失（允许涨幅预算控制在 10% 到 15% 以内）、适用的模板化任务的精确匹配率，以及人工仔细阅读抽查 50 个生成样本。

### 阶段 2：直接偏好优化

**模型配置**：参考模型为完成 SFT 后的合并权重，保持完全冻结。策略模型为其克隆副本，挂载新的适配器。超参数 beta 设在 0.1 到 0.3 的保守区间，训练若干 epoch，仅在回答 token 上计算 4 个对数概率。
**度量指标**：在保留 prompt 集合上针对 SFT 基线做盲测成对胜率评估、隐式奖励边际、选定项绝对对数概率、各检查点的生成长度走势，以及再次跑遗忘测试集。严格依据盲测生成胜率决定早停，绝不依据训练边际指标。

### 阶段 3：正式上线发布门禁

- 在固定 prompt 集合上组织人工盲评，同时对比 SFT 检查点与原始基座模型。
- 拒答与安全测试集，并写明预期行为。
- 防遗忘通用能力测试集。
- 保持适配器独立，以便回滚；仅在最终固化交付时才执行权重合并。

### 必须设防的三大失效模式

1. **灾难性遗忘**：采用较小学习率、控制训练步数、混合预训练语料，并设定原始文本损失的恶化预算上限。
2. **评分信号的偏好作弊**：人工评分天然偏爱长篇大论与阿谀奉承，需严密监控生成长度以及是否附和问题前提，剔除仅凭长度区分胜负的数据对。
3. **代理目标的过度优化**：DPO 的概率比极易漂移到分布外，必须依据盲测保留集严格早停，并坚守保守的 beta 设置。

### 三周时间排期表

第一周：数据和 SFT。第二周：DPO 和首次盲评。第三周：发布门禁、最优配置的第二个随机种子，以及回滚计划。

## Follow-ups

- **Level 3:** 为什么本案选用 DPO 而非“奖励模型加 PPO”的全套方案？ Expected: 数万条回答对、两张小显存 GPU 和三周工期适合 DPO；奖励模型和 PPO 需要三个训练循环与更多显存。
- **Level 4:** 历史数据是针对单个回答给出的 1 到 5 星绝对打分，而非成对比较，方案如何调整？ Expected: 仅对同一 prompt 下有评分两端回答的情况构建回答对；或者选用支持单样本正负评分标签的非成对损失函数，将真正的成对样本留作评测集。
- **Level 4:** 你如何严密证明 DPO 阶段没有破坏上一阶段辛苦建立的 SFT 遵循能力？ Expected: 组织针对 SFT 检查点的成对盲测胜率、跑防遗忘测试集，并紧盯选定回答的绝对对数概率；若边际上升的同时这些指标下滑，即为叫停信号。
- **Level 4:** 在什么情况下你会考虑追加带确定性验证器的强化学习阶段？ Expected: 当部分任务有可检查的答案，例如正确的订单号或能通过测试的代码片段时，二元奖励和组相对优势能提供评分所没有的信号。

## Wrong answers

- "跳过 SFT，直接从基座模型上运行 DPO。" DPO 依赖一个已经能够听懂并遵循指令的参考策略；单阶段算法属于不同的新型损失，直接在基座上跑偏好会导致输入严重偏离分布。
- "在两张 24 GB 显卡上对 8B 模型执行全量参数微调。" 8B 模型全量微调在计算图与优化器状态下需要约 56 GB 显存；两张 24 GB 显卡只有采用 4-bit 量化基座配合适配器才能装下。
- "把 1 到 5 星评分直接作为奖励值运行 PPO。" 对绝对分数的回归拟合极易被极差主观标准污染，属于课程明确警告的劣质标签，且全套 PPO 算力与排期根本无法承受。

## Taught in

[SFT 课程](../../../phases/10-llms-from-scratch/06-instruction-tuning-sft/)确立了 SFT 数据工程与超参数，[LoRA 课程](../../../phases/11-llm-engineering/08-fine-tuning-lora/)核算了 QLoRA 显存预算，[DPO 课程](../../../phases/10-llms-from-scratch/08-dpo/)给出了 beta 范围与评测方法，而[奖励建模课程](../../../phases/09-reinforcement-learning/09-reward-modeling-rlhf/)列出了过度优化防范清单。
