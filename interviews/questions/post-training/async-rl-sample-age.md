---
id: async-rl-sample-age
title: 设计异步 RL 采样并控制样本陈旧度
card: post-training
kind: design
level: 4
roles: [inference-engineer]
rounds: [system-design]
tags: [async-rl, staleness, grpo, weight-update, miles]
minutes: 15
lessons: []
manuals: [miles-101#s-run-rollout-and-training-at-once, miles-101#s-read-the-run, miles-101#s-split-rollout-and-training, miles-101#s-the-correction-methods, miles-101#s-handle-long-responses, miles-101#s-run-a-separate-eval-fleet]
practice: []
cheatsheet: [miles-rl, async-disaggregated-inference]
related: [post-training/gap-remove-before-reweight]
updated: 2026-11-03
---


你将一个 RL 任务从单张 GPU 迁移到集群，采样引擎和训练器分别在不同设备上运行。团队希望生成与训练同时运行，让双方不必互相等待。请设计这套异步方案：哪些参数重要，会出现什么新故障，又该关注哪些日志指标？

## Short answer

异步训练让采样引擎在训练器更新时生成下一个批次，代价是样本来自较旧的权重。它有两种模式：提前一步模式在默认更新间隔下让每个样本最多落后一个权重版本；全异步模式让工作进程持续生成，训练器不断消费缓冲区中的样本，陈旧度取决于消费速度。要限制样本陈旧度，决定每次更新权重时如何处理运行中的请求，并在允许使用更旧的样本时降低学习率。关注每个样本的权重版本、样本丢弃比例、裁剪比例和两端的差距。

## Full answer

### 为什么异步只有在分离部署时才有收益

两端在同一张 GPU 上只能交替运行，生成会在整个训练期间停止；同卡全异步模式只用于熟悉配置。在不同设备上，如果两端不重叠运行，训练器就会在采样期间空闲，采样引擎也会在训练期间空闲。异步能减少一部分等待。

### 配置参数

| 配置项 | 决定内容 |
|---|---|
| `--update-weights-interval` | 向采样引擎更新权重的步数间隔 |
| `--max-weight-staleness` | 样本允许来自的最旧权重版本；未设置表示不设上限 |
| `--async-unused-samples-handler` | 丢弃还是重试过旧的样本 |
| `--async-max-concurrent-samples` | 采样引擎同时生成的样本数 |
| `--pause-generation-mode` | 更新权重时如何处理运行中的请求：abort、retract 或 in place；默认是 retract |

过采样批次大小在全异步模式下不起作用。

### 新故障：陈旧样本

在落后两个版本的权重下生成的样本，对训练器来说是离策略样本。此时训练器概率与采样引擎概率之比会出现差距，但原因不在计算内核。两个信号能反映这一点。在每次采样只执行一次优化器更新的运行中，裁剪比例 `train/pg_clipfrac` 为 0，因为训练策略就是采样策略；这样的运行中若裁剪比例大于 0，就说明样本并非来自当前权重。同理，对数概率差距也会随样本陈旧度增大。

### 学习率随陈旧度调整

一项针对小模型异步 GRPO 的研究同时改变了权重更新间隔和学习率，发现最大稳定学习率随更新间隔增大而按比例下降：间隔翻倍，学习率约减半。手册尚未验证这一结论，只将它作为起步规则。增大更新间隔或陈旧度上限时，先按相同比例降低学习率，再观察差距和奖励。

### 监控重点

- 采样指标中的权重版本统计：样本有多旧。
- 被丢弃或重试的样本比例。比例高说明采样引擎在做无用功。
- `train/pg_clipfrac` 和差距，对照同步运行中的取值范围来解读。
- 对照单步耗时查看 `perf/update_weights_time`。分离部署时，权重更新是网络传输，而不是单张 GPU 内的复制，传输方式本身也需要选择。

### 修正剩余偏差

样本陈旧度上限会丢弃最差的样本。对于其余样本，截断重要性采样修正用带上限的两端概率比对每个 token 重新加权。先消除陈旧性，再重新加权。

## Follow-ups

- **Level 3:** 为什么在每次采样只更新一次的同步运行中，裁剪比例恰好为 0？ Expected: 训练器的策略仍是生成样本的策略，所以所有概率比都是 1，没有比值触及裁剪范围。
- **Level 4:** 你会选择哪种暂停模式，选错的代价是什么？ Expected: retract 保留运行中请求已完成的工作，并在新权重下继续，因而一个回答中会混用权重版本；abort 丢弃已完成的工作；in place 在请求运行时更改权重；全异步模式不支持其中某些选项，因此要阅读所用版本的参数帮助。
- **Level 4:** 一个回答在版本 5 下开始、在版本 7 下完成。这会体现在哪里？ Expected: 体现在差距中，因为部分 token 来自比训练器所持权重更旧的版本；启用部分采样或提高陈旧度上限后，要观察差距。
- **Level 4:** 独立评估集群如何融入这套设计？ Expected: 它加载检查点快照，从不参与训练权重更新，因此其滞后以步数报告；手册所查阅的版本不支持将它与采样容错结合使用。

## Wrong answers

- "单张 GPU 上也运行全异步，反正代码相同。" 在单张 GPU 上，两端仍然交替运行，训练期间生成会停止，所以承担了陈旧性代价，却没有重叠运行的收益。
- "不设陈旧度上限，这样就不会浪费样本。" 未设置意味着没有限制；过旧的样本会把更新拉向错误方向，差距随之增大，而原因并不在计算内核。
- "沿用同步运行的学习率。" 稳定学习率随样本陈旧度增大而下降；增大更新间隔时，要按大致相同的比例降低学习率。

## Taught in

[Miles 101 第 4.1 节](../../../manuals/miles-101/sections/4-1-run-rollout-and-training-at-once.md)列出异步模式和配置，[第 5.1 节](../../../manuals/miles-101/sections/5-1-read-the-run.md)说明如何将裁剪比例解读为陈旧性信号，[第 6.1 节](../../../manuals/miles-101/sections/6-1-split-rollout-and-training.md)介绍分离部署与权重传输。
