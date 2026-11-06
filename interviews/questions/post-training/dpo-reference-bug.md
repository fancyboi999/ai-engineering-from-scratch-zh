---
id: dpo-reference-bug
title: 损失函数纹丝不动的 DPO 训练器
card: post-training
kind: code-reading
level: 2
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [coding, debugging]
tags: [dpo, reference-model, code-reading, gradient-sign]
minutes: 12
lessons: [phases/19-capstone-projects/40-dpo-from-scratch, phases/10-llms-from-scratch/08-dpo]
manuals: []
practice: [dpo-loss]
cheatsheet: [rlhf-dpo]
related: [post-training/dpo-implicit-reward]
updated: 2026-11-03
---

一位队友编写了一个 DPO 训练器的核心代码。在整个训练过程中，损失值一直死死停留在初始值，记录的边际也从未发生变化。阅读以下代码，找出其中的问题所在。

```python
policy = TinyGPT(config)
reference = policy


def sequence_log_prob(model, prompt_ids, completion_ids):
    ids = torch.cat([prompt_ids, completion_ids])
    logits = model(ids[:-1].unsqueeze(0))[0]
    log_probs = logits.log_softmax(-1)
    targets = ids[1:]
    return log_probs[torch.arange(len(targets)), targets].sum()


def dpo_loss(prompt, chosen, rejected, beta=0.1):
    pi_w = sequence_log_prob(policy, prompt, chosen)
    pi_l = sequence_log_prob(policy, prompt, rejected)
    ref_w = sequence_log_prob(reference, prompt, chosen)
    ref_l = sequence_log_prob(reference, prompt, rejected)
    z = beta * ((pi_l - ref_l) - (pi_w - ref_w))
    return -torch.nn.functional.logsigmoid(z)
```

## Short answer

存在三处问题。首先，参考模型与策略模型是同一个对象，因此两个概率比的对数在数学上恒等于零，损失函数退化为没有梯度的常数；必须将参考模型创建为独立的副本、冻结其全部参数，并在无梯度环境下运行。其次，边际计算公式的正负符号写反了，一旦对象引用别名修复，该训练器反而会去奖励负向拒绝回答。最后，对数概率计算函数把 prompt 本身位置的 token 也一并累加了进去，而综合项目将其作为无偏好信号的内容严格做了掩码遮蔽。

## Full answer

### 缺陷 1：参考模型与策略模型是同一个对象

`reference = policy` 只是给同一个模块绑定了第二个变量名。每次经由 `reference` 运行前向传播，实际使用的都是当前被更新的策略权重；因此 `pi_w - ref_w` 和 `pi_l - ref_l` 恒为 0，损失值变成固定常数。优化器接收到的梯度恒为零。仅做深拷贝也不够：参考模型的每个参数都必须显式设置 `requires_grad=False`，其前向计算应包裹在 `torch.no_grad()` 中，且策略必须从相同的权重起步，例如使用 `policy.load_state_dict(reference.state_dict())`。

### 缺陷 2：奖励边际的符号颠倒

DPO 损失的标准数学形式为负的对数 sigmoid，其输入为 beta 乘以“选定项对数比减去拒绝项对数比”。代码中的减法顺序完全颠倒了。损失对选定回答对数概率的梯度必须为负，这样推高选定项概率才能降低总损失。在符号写反的情况下，训练器不仅不会对齐偏好，反而会持续压制选定回答、推高拒绝回答。在单个样本对上检查梯度符号的单测能立即揪出该错误。

### 观察项 3：prompt 被一并算入了概率累加

`sequence_log_prob` 遍历了包括 prompt 在内的所有 token 位置。虽然在两回答共享同一个 prompt 的理想情况下，prompt 部分的对数概率在计算边际作差时理论上能够相互抵消，但在工程上，训练器平白无故在不携带任何偏好区分信号的前缀上执行了前向传播与反向传播；更严重的是，当超长序列在最大上下文处被截断时，这种严格相消就会被破坏。应像综合项目那样，将概率累加严格限定在回答部分的起始位置。

### 如何编写自动化测试验证修复

- 在单个数据对上手动调高选定回答的对数概率，断言损失值严格单调下降。
- 断言跨 epoch 运行时，参考模型计算出的对数概率完全恒定不变。
- 断言在整个训练过程中，策略模型下选定项减拒绝项的平均边际持续正向扩张。

## Follow-ups

- **Level 2:** 修复后，你如何验证参考模型在训练中确实从未发生改变？ Expected: 断言参考模型的参数都不需要梯度，并对比在同一个固定数据对上一个 epoch 前后的对数概率输出绝对一致。
- **Level 3:** 为什么在正式开始训练前，所有数据对的初始损失值都完全相同？ Expected: 初始时策略模型与参考模型权重完全一致，两个概率比的对数均为零，sigmoid 值为二分之一；随着训练推进边际才开始分化扩大。
- **Level 3:** 边际在持续扩大，但生成的回答却越来越差，下一步应该记录什么？ Expected: 记录选定回答的绝对对数概率；DPO 完全可以更狠地压制拒绝回答以扩大边际，同时顺带让选定回答的绝对概率持续下滑。
- **Level 4:** 如果两个候选回答来自不同的 prompt，你还会把 prompt 算入概率累加吗？ Expected: 不会，且这种情况下 DPO 损失公式本身就已经在数学上破损失效了；DPO 推导必须要求共享同一个 prompt，因为只有这样配分函数才能在作差时被消除。

## Wrong answers

- "调小学习率，损失不动是因为优化步长迈得太小了。" 当参考模型别名引用策略模型时，计算出的梯度严格为零；任何学习率都不可能推动参数更新。
- "正负符号无关紧要，优化器自己会找到收敛方向。" 符号直接决定了优化器奖励的是哪一个回答；符号颠倒会将模型训练成主动倾向输出被拒绝答案的系统。
- "把求和改成求平均值来稳定损失。" 这相当于把损失改造成了长度归一化的变体；这是目标函数的设计选择，不是常数损失的修复方法。

## Taught in

[DPO 从零构建综合项目](../../../phases/19-capstone-projects/40-dpo-from-scratch/)通过单元测试严格锁定了参考模型不变性与梯度符号，而 [DPO 课程](../../../phases/10-llms-from-scratch/08-dpo/)推导了单数据对所需的 4 个对数概率计算逻辑。
