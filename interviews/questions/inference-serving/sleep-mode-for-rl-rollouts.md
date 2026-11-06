---
id: sleep-mode-for-rl-rollouts
title: RL 循环中的休眠、唤醒与权重更新
card: inference-serving
kind: concept
level: 2
roles: [inference-engineer]
rounds: [ml-depth, system-design]
tags: [sleep-mode, rl-rollout, weight-update, logprobs, dev-mode]
minutes: 8
lessons: []
manuals: [vllm-101#s-use-vllm-as-an-rl-rollout-engine]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

你的 RL 训练器与生成 rollout 的 vLLM 服务器共用 GPU。rollout 步之间，训练器需要收回 GPU 显存，每步之后服务器又需要新权重。vLLM 为这个循环提供什么机制？锁定版本下可能出什么问题？

## Short answer

vLLM 提供开发模式路由：`/sleep` 释放 GPU 显存，`/wake_up` 重新占用显存，`/pause` 和 `/resume` 停止和恢复生成，权重传输经由 `/init_weight_transfer_engine`、`/start_weight_update` 和 `/finish_weight_update` 完成，GPU 之间用 NCCL，同机也可用 CUDA 内存句柄。级别 1 休眠保留权重，级别 2 连权重也丢弃，适合训练器本来就要发送新权重的步骤。0.31.0 有三个已知问题：级别 2 唤醒不重载推测解码的 draft，级别 2 休眠会清除校准过的 KV scale，休眠期间更新权重会让引擎停止，所以要先唤醒，再重载、重置前缀缓存并读接受计数器。

## Full answer

### 循环

RL 的一步分成两半。rollout 阶段用当前权重生成回答。训练阶段计算损失并更新权重，下次 rollout 前生成器需要拿到新权重。共用一组 GPU 时，两个阶段轮流使用同一份显存，因此生成器要在训练期间交还显存，之后再取回。

### 各个组件

所有这些路由都仅在服务器以 `VLLM_SERVER_DEV_MODE=1` 启动时存在。它们会释放显存、更换权重，并在每个 worker 上运行方法，所以绝不能把这个模式的服务器暴露到训练器网络之外；手动试验时绑定本机地址。

- **休眠模式。** 用 `--enable-sleep-mode` 启动。`/sleep?level=1` 释放 KV cache 和其他显存，保留权重；级别 2 也丢弃权重。`--sleep-preserve-parameter-names` 把冻结权重留在 GPU 上，避免每步搬运。`/is_sleeping` 报告状态。
- **暂停和恢复。** `/pause` 停止新生成，可以中止运行中请求、等待它们完成或保留它们；`/resume` 恢复生成。
- **权重更新。** 训练器发起传输、调用 start、发送权重、调用 finish，再用 `/update_weight_version` 记录版本，给后续 rollout 标记版本。
- **集体调用。** `/collective_rpc` 在每个 worker 上运行方法，用于 vLLM 未覆盖的设置工作。
- **外部启动。** 使用外部 launcher 后端时，torchrun 之类的启动器可以在训练器进程内启动 vLLM worker。

### 手册测到了什么

L4 上的 Qwen3-0.6B 做级别 1 休眠：每次 POST 返回 200、响应体为空，休眠耗时 1.9 秒，GPU 显存从 14,861 降到 4,245 MiB，唤醒后恢复，日志为 `Sleep mode freed 10.37 GiB memory`。这是手册唯一的耗时测量；没有测级别 2 休眠和权重更新的耗时。

### 0.31.0 可能出什么问题

- 级别 2 唤醒不会重载推测解码的 draft。重载只覆盖目标模型，所以目标模型拒绝每个 draft token，decode 速度降到接近不开推测解码的水平。输出仍正确，也不报错。issue 尚未关闭。
- 级别 2 休眠会清除某些使用 FP8 cache 的 checkpoint 中校准过的 KV scale。重载后的首个请求返回 NaN logprobs 和错误的首 token。下一版本修复此问题。
- 休眠中更新权重会让引擎发生段错误。API 服务器仍运行，之后每个请求却都失败。issue 尚未关闭。

因此每次级别 2 唤醒后，都要重载权重、重置前缀缓存并读推测解码接受计数器。0.31.0 的重载无法恢复被清除的 KV scale；0.32.0 修复了这个问题。训练器发送权重前，必须先唤醒服务器。

### logprob 差距

训练器比较服务器返回的 logprobs 与自身计算值。因为 kernel 不同，两者不会完全一致；小而稳定的差距正常，差距扩大说明权重没有送到生成器。先查服务器返回哪种值。默认的 `--logprobs-mode raw_logprobs` 返回全词表上的 logprob；`processed_logprobs` 返回采样设置改变分布后的值。top-p 为 0.9 时，raw 模式与全词表参考值的绝对差中位数为 0.005，processed 模式高出保留概率质量的负对数，偏移中位数约为 0.053。模式应与训练器给 token 打分的方式一致。

## Follow-ups

- **Level 2:** 两个休眠级别有什么区别？ Expected: 级别 1 释放 KV cache 和其他显存，保留权重；级别 2 也丢弃权重，适合本来就要接收新权重的步骤，代价是重载。
- **Level 3:** 级别 2 唤醒后，输出正确，decode 却像不开推测解码一样慢。为什么？ Expected: 权重重载只覆盖目标模型，没有重载 draft，目标模型因此拒绝每个 draft token；不会报错，接受计数器能显示问题。
- **Level 3:** 训练器和服务器的 logprobs 在每个 token 上都有差异。是 bug 吗？ Expected: kernel 不同，小而稳定的差距正常，raw logprobs 的绝对差中位数是 0.005；差距扩大说明权重未送达，而接近保留概率质量对数的恒定偏移说明服务器返回 top-p 下的 processed logprobs，训练器却按全词表打分。
- **Level 4:** 按这些路由排出一轮 RL 迭代的步骤。 Expected: 暂停生成或等待在途生成完成，休眠，训练，唤醒，开始并完成权重更新，记录版本，重置前缀缓存，若开启推测解码则重载 draft，读接受计数器，恢复生成；绝不能在休眠期间发送权重，否则会让引擎停止。

## Wrong answers

- "在公共端口暴露休眠和权重路由。" 它们只在开发模式下存在，会释放显存、更换权重并在每个 worker 上运行方法；应留在训练器网络内，手动测试时绑定本机地址。
- "服务器休眠时发送新权重可以省时间。" 0.31.0 中这会让引擎发生段错误；API 服务器仍运行，后续每个请求却都失败，所以训练器发送权重前必须先唤醒。
- "服务器和训练器的 logprobs 应完全一致。" kernel 不同，小而稳定的差距正常；每步跟踪，差距扩大时应怀疑权重未送到生成器。
- "级别 2 唤醒会恢复到休眠前的状态。" 它只重载目标权重；推测解码的 draft 没有重载，部分 checkpoint 中校准过的 KV scale 会丢失，因此每次级别 2 唤醒后要重载、重置缓存并读取接受情况，而且 0.31.0 的重载不能恢复 scale。

## Taught in

[把 vLLM 用作 RL rollout 引擎](../../../manuals/vllm-101/sections/3-9-use-vllm-as-an-rl-rollout-engine.md)列出了路由、休眠检查和已知问题。
