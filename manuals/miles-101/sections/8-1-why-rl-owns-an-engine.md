# 为什么 RL 框架要自带 inference engine

> RL 需要快速生成文本，并基于同一组权重精确计算概率；由 trainer 控制的 engine 可以同时满足这两点。

语言模型的强化学习会把大部分时间花在生成文本上。训练库也能生成文本，但速度较慢：一次只处理一个序列，无法共享 cache。inference engine 生成速度更快，但它是为服务用户而构建，并非为了与 trainer 保持一致。

读完本节后，你可以解释 Miles 为什么运行自己的 inference engine，并说出两端可能出现差异的五种原因。

Miles 把 SGLang engine 置于 trainer 控制之下。本节解释这样做的原因，以及控制范围需要覆盖哪些方面。Inside Miles 指南会逐步讲解一次训练步骤，因此本节只讨论背后的理由。

## RL 对 engine 的要求 {#s-why-rl-owns-an-engine-what-rl-asks-of-the-engine}

GRPO 的每一步都会为每个 prompt 生成多个答案。我们的训练每步处理 32 个 prompt，每个生成 8 个答案，共 256 个答案。以下三项机制可以加快生成：

- **Batching：**engine 一次处理数百个序列。
- **共享 prompt cache：**同一个 prompt 的 8 个答案可以共用 prompt 计算结果，engine 无需重复计算。
- **短答案提前结束：**答案完成后会离开 batch，其内存可以分配给下一个答案。

训练库并不是为这些机制构建的。因此，注重速度的 RL 框架需要使用真正的 engine。

## engine 必须为 RL 提供什么 {#s-why-rl-owns-an-engine-what-the-engine-must-do-for-rl}

serving engine 运行期间不会更改权重。RL engine 必须能够：

- 每个训练步骤完成后，在数秒内接收新权重。
- trainer 在同一 GPU 上运行时释放内存，随后再恢复占用。
- 权重更新时暂停或停止仍在运行的请求。
- 返回每个采样 token 的 log probability。

每项功能都需要在 engine 内部提供接口。这就是 Miles 使用经过修改的 SGLang 构建版本的原因，也解释了为什么镜像中的 SGLang 不是原版发行版。

## 两端产生差异的五种原因 {#s-why-rl-owns-an-engine-five-ways-the-two-sides-disagree}

GRPO 假设 trainer 和 engine 对每个采样 token 的概率计算一致。两端可能通过以下五种方式产生差异：

| 来源 | 发生情况 | Miles 提供的功能 |
|---|---|---|
| Token | 两端以不同方式把文本转换为 token，差异常出现在 agent 轮次之间 | 传递 token 而非文本的 session server |
| Routing | 两端的 MoE router 为同一 token 选择了不同 expert | routing replay |
| Sampling | top-p 或 top-k 下，engine 从裁剪后的 token 集合采样，而 trainer 在完整词表上评分 | sampling replay |
| 数值 | kernel 使用不同运算顺序，或一端使用了较低精度 | importance-sampling 校正、true on-policy 模式 |
| 样本陈旧 | 样本来自 trainer 当前权重之前的旧权重 | 限制样本年龄并进行校正 |

我们的多数 GB10 训练只有数值差异。一项运行使用了 top-p 和 top-k 采样，因此也存在采样差异。在 Qwen3-0.6B 训练中，每个 token 的差距保持在 0.013 至 0.016 之间。[第 8.2 节](#s-the-correction-methods)将各类校正方法与对应原因进行了匹配。

我们的观点是：RL 框架最困难的部分通常不是 loss function，而是在 engine 全速运行时控制这五类差异，并对它们进行测量。

```takeaways
- RL 需要真正的 inference engine 来提高速度；engine 也需要为权重、内存和概率计算提供 RL 接口。
- trainer 和 engine 之间可能在 token、routing、sampling、数值计算和样本新旧程度上产生差异。
- 先测量差距，再根据差距来源选择校正方法。
```

来源：Miles main 08752a12 中的架构文档、inference controller 和 session server；capture/gpu/summary/miles-gb10-lab.json；capture/gpu/miles_grpo.py。
