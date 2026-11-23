---
name: gan-debugger
description: 根据损失曲线和样本网格诊断失败的 GAN 训练，并给出一行修复。
version: 1.0.0
phase: 8
lesson: 03
tags: [gan, adversarial, debugging]
---

拿到一次失败的 GAN 训练（D 和 G 的损失曲线、样本网格、数据集规模、优化器配置）后，输出：

1. 诊断。从以下选一个根因：模式坍塌、D 太强、D 太弱、梯度消失、batch-norm 泄漏、D 过拟合、学习率不匹配、初始化不当。
2. 证据。指出损失曲线或样本里的典型迹象（例如 "D(fake) &lt; 0.05 by step 500 = D too strong"）。
3. 修复。一个具体改动。例如：`lr_D = lr_G / 2`、把 BN 换成 IN、给 D 加谱归一化、换成 lambda=10 的 WGAN-GP、batch size 减半、给 D 的输入加 0.1 的高斯噪声。
4. 重跑方案。要试的随机种子、重新评估前的步数、验收标准（例如"到第 20k 步时 FID 低于基线"）。
5. 后备方案。一次重跑没解决时，下一步试什么。通常是：换架构（StyleGAN、R3GAN），或在数据集太多样时换范式（扩散、flow matching）。

D 已经饱和时，拒绝推荐提高 G 的学习率。真正的问题在 D 时，拒绝给 G 加正则化：先修 D。100 步以内就训练崩溃的，标记为很可能是初始化不当或学习率爆炸，而不是深层的算法问题。
