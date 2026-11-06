---
id: logprobs-after-top-p
title: 因切换推理引擎导致 logprob 差距跳变
card: scenarios
kind: incident
level: 3
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [rl, logprobs, top-p, importance-ratio, sampling-replay, miles]
minutes: 25
lessons: []
manuals: [miles-101#s-lower-the-logprob-gap, miles-101#s-check-the-first-step, vllm-101#s-use-vllm-as-an-rl-rollout-engine, sglang-101#s-deterministic-inference-and-logprobs]
practice: []
cheatsheet: []
related: [scenarios/rl-experiment-hygiene, scenarios/temperature-zero-two-answers]
updated: 2026-11-03
system:
  version: SGLang 0.5.22 and vLLM 0.31.0 as rollout engines, with Miles main 08752a12
  model: Qwen/Qwen3-0.6B in BF16
  hardware: the shared second L4 of a two-GPU node, with no clock lock
source:
  - manuals/miles-101/capture/gpu/out-l4/logprobs-top-p.txt
  - manuals/miles-101/capture/gpu/out-gb10/engine-settings.txt
  - manuals/miles-101/sections/4-4-lower-the-logprob-gap.md
---

## Situation

一个强化学习团队在温度为 1、top-p 为 0.9 的设置下采样生成。训练器针对全词表为每个采样出的 token 计算前向分数，并拿该分数与推理引擎返回的对数概率做对比。在所有健康的训练任务中，两者之间的绝对差距 `train/train_rollout_logprob_abs_diff` 在第 0 步始终稳定在 0.0148 到 0.0157 之间。

团队随后将采样工作迁移至另一款推理引擎。该引擎提供了一个控制返回哪种对数概率的参数开关，工程师选择了处理后的数值，理由是“那才是我们实际采样的分布”。新任务在第 0 步记录的差距比原先基准高出了约 0.053。一位同事认为新引擎的底层算子质量较差并提议迁回；另一位主张将新引擎切换为确定性推理模式；第三位认为该差距属于系统固定常数，直接在训练器内部将其减去即可。你拿到了一位同事在实验室 L4 上执行的探测验证记录。

## Evidence

- [探测实验环境：两套引擎、同一模型与 float32 理论基准](evidence/probe-setup.txt)
- [返回的 logprob 减去理论基准的差值统计（按引擎与模式分类）](evidence/four-rows.txt)
- [数学推导检验偏移数值具体构成的计算验证](evidence/formula-check.txt)
- [在这些 token 上 top-p 截断裁减概率质量的频次统计](evidence/how-often-the-cut-bites.txt)
- [五个 Miles 训练任务所采用的推理引擎参数配置](evidence/engine-settings.txt)
- [开启与未开启采样重放机制下 12 步训练的差距对比](evidence/replay-result.txt)

## Questions

1. 四行测试数据中有三行与理论基准高度吻合，唯独一行存在偏差。哪个数值属于底层算子误差，哪个数值属于其他定义范畴？
2. 推导发生偏移后的数学公式。相较于全词表数值，它朝哪个方向偏移，对于保留概率质量为 0.9 的 token 其偏移量是多少？
3. 同事将该差距称为可以简单扣除的固定常数。它在不同 token 之间是否恒定，它对重要性权重比会产生何种方向的推力？
4. 对于在全词表上打分的训练器，推理引擎必须返回何种取值；与在保留候选集上打分的训练器相匹配的又是何种配置？
5. 为什么配置了 top-p 0.95 与 top-k 64 的 Miles 任务最终得出的差距反而低于未配置两者的任务？
6. 确定性推理模式对该差距会带来什么改变，采样温度对第一款引擎返回的数值会带来何种影响？

## Walkthrough

1. **分析探测实验配置。** 两款引擎在同一张 GPU 上运行完全相同的 BF16 模型。客户端发送了 16 个提示词并在温度 1、top-p 0.9 下各自采样了 48 个 token。理论基准是对相同 token 使用 float32 精度在全词表上执行 `log_softmax` 前向计算得出的。该 GPU 为多任务共享且未锁定时钟，但这仅影响运算速率，对浮点计算数值结果毫无干扰。
2. **解读四行对比数据。** 第二款引擎在 raw 原始模式下返回了理论基准值，中位数差值为 0.0000，绝对差值中位数仅为 0.005。第一款引擎同样返回了理论基准值，绝对差值中位数为 0.0066（无论其环境变量设为 0 还是 1）。而第二款引擎在 processed 处理模式下返回的数值比理论基准中位数整整高出了 0.0527。这里的 0.005 和 0.0066 属于不同硬件实现带来的算子级精度浮动，而 0.0527 则完完全全属于数学定义不一致引发的阶跃。
3. **推导数学偏移公式。** top-p 算法提取累积概率达到 0.9 的最小候选 token 集合，并将保留概率重新归一化。在此缩放下，保留集合内部某 token 的对数概率等于其在全词表上的原始对数概率减去保留集合概率总质量的对数。探测脚本从 processed 数值中减去该数学推导值，得出的残差中位数仅为 8e-9。这确凿证实了 processed 数值代表的是在重新归一化后的核集合内部的对数概率，而 raw 才是面向全词表的真实对数概率。
4. **统计截断发生的频率。** 在采样的 token 中，有多达 74% 到 79% 的 token 其保留概率质量严格小于 0.99，且负对数保留质量的中位数落在 0.055 到 0.067 之间。这正是数值发生偏移的规模，且每个 token 的截断程度各不相同。由于保留概率质量绝不可能大于 1，因此该偏移量永远非负。它在每个 token 上都向同一个方向推挤训练器与引擎之间的重要性比率，因而这是一种系统性单向偏差，而非均值为零的随机噪声。
5. **对比 Miles 的实测任务。** 引擎参数表展示了一个配置了 `--rollout-top-p 0.95` 与 `--rollout-top-k 64` 的任务，以及一个两者皆未配置的基线任务。当 top-p 小于 1 或 top-k 大于 0 时，Miles 会自动启用采样重放：推理引擎返回每步实际可供采样的候选 token 集合，训练器随后仅对该受限集合打分归一化。在 12 步跨度内，重放任务的差距中位数仅为 0.0135（基线任务为 0.0153），且两者的步数区间完全不重叠。双方在数学上使用了完全相同的对数概率定义，使得采样器引发的结构性偏差彻底消除，剩下的仅是纯粹的底层算子微小误差。
6. **评估另外两项应对提议。** 确定性推理仅保证引擎自身多次运行结果的一致性，丝毫无法改变采样器输出数值的数学定义。第一款引擎除非显式配置了 original-logprob 变量，否则其返回的数值计算方式为 `log_softmax(logits / temperature)`；因此在非 1 的温度下它会返回经温度缩放后的值，而在温度为 1 时该变量不起作用。

## Resolution

差距指标跳变的根本原因在于推理引擎与训练器对“对数概率”的数学定义产生了分歧。训练器是在全词表空间上打分，而引擎返回的是经 top-p 重新归一化后的局域对数概率，后者相比前者系统性高出了负对数保留质量（在当前数据集中中位数达 0.0527）。底层算子本身没有任何质量缺陷：第二款引擎在 raw 模式下与理论基准的绝对差值中位数仅为 0.005。

应当采用两套自洽配置之一：要么将引擎设为 raw 原始模式，确保双侧均基于全词表评估；要么在 Miles 中通过 `--rollout-top-p` 和 `--rollout-top-k` 显式开启重放机制，确保双侧均基于截断候选集打分。第 0 步的实测指标给出了验证标准：raw 模式下恢复到 0.0148~0.0157 区间，开启重放时落在 0.0136 附近（这正是手册记录的 top-p 任务第 0 步基线）。在后续训练中保持对该差距的监控，若在训练后期差距发生扩大，则代表模型最新权重未能同步更新至推理引擎，那是完全不同的另一类故障。

## Wrong turns

- "新引擎的算子质量更差，应切回旧引擎。" 在 raw 模式下新引擎与 float32 理论基准的差距中位数仅为 0.005，与旧引擎的 0.0066 基本一致。指标跳变完全源于参数选错了输出数值的数学定义。
- "开启确定性推理模式。" 确定性推理能保证复现但无法改变返回数值的数学定义，系统性偏差依旧存在。
- "该差距属于固定常数，在训练器中直接减去即可。" 该偏差在每个 token 上都等于负对数保留质量，有 74% 到 79% 的 token 低于 0.99 且数值动态波动。常数扣除会在每个 token 上留下同方向的残留偏差。
- "调小 top-p 让采样更集中以稳定差距。" 更小的保留概率质量会使负对数保留质量的绝对值更大，反而会导致差距进一步急剧膨胀。
- "在第一款引擎上配置 original-logprob 环境变量就能彻底解决。" 在温度为 1 时该变量对探测数值毫无影响。它仅在非 1 温度采样而训练器在温度 1 打分时发挥作用，那是另一类不匹配问题。

## Generalize

在对比两套系统的计算数值之前，必须首先确保双方在数学定义上达成共识。截断与重新归一化的采样机制会彻底改变对数概率的数学内涵，且该变动构成了单向的系统性偏差而非无害的随机噪声。在比对双侧数值前，先用自行计算的标准基准分别校准两侧，并确保双方始终处于采样截断的同一侧，要么均在截断前，要么均在截断后。

## Taught in

Miles 手册在[降低 logprob 差距页面](../../../manuals/miles-101/sections/4-4-lower-the-logprob-gap.md)推导了该数学偏移并实测了重放效果，在[第一步核验页面](../../../manuals/miles-101/sections/5-2-check-the-first-step.md)给出了第 0 步的基准范围，vLLM 手册在[RL 采样页面](../../../manuals/vllm-101/sections/3-9-use-vllm-as-an-rl-rollout-engine.md)剖析了两种输出模式，而 SGLang 手册在[对数概率页面](../../../manuals/sglang-101/sections/4-6-deterministic-inference-and-logprobs.md)解释了温度缩放数值的形成机理。
