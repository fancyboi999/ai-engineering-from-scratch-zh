# 将 vLLM 用作 RL rollout engine

> RL trainer 会在训练步骤之间借用服务器；vLLM 提供休眠、唤醒和加载新权重的路由。

你的 RL trainer 需要生成 rollout，再更新权重。读完本节，你可以说出 RL framework 会调用哪些控制路由。

## 工作循环 {#s-use-vllm-as-an-rl-rollout-engine-the-loop}

一个 RL 步骤分为两部分。Rollout 阶段使用当前权重生成答案；训练阶段计算 loss 并更新权重。下一轮 rollout 开始前，生成器必须获取新权重。

如果两部分使用同一组 GPU，它们会依次使用同一块内存。训练期间，生成器需要释放内存；训练结束后再取回。vLLM server 提供了所需功能，不少 RL framework 会调用这些功能。vLLM 文档列出的用户包括 verl、OpenRLHF、TRL、NeMo-RL、SkyRL 和 Prime-RL。

## 控制接口 {#s-use-vllm-as-an-rl-rollout-engine-the-pieces}

只有以 `VLLM_SERVER_DEV_MODE=1` 启动服务器时，下列路由才会开放。它们会释放内存、替换权重，并在每个 worker 上运行方法。不要将此模式下的服务器暴露给 trainer 所在网络之外的主机。

**休眠模式。** 使用 `--enable-sleep-mode` 启动服务器。调用 `/sleep` 可以释放 GPU 内存，调用 `/wake_up` 可以恢复占用。休眠等级 2 会连权重一并移除，适合 trainer 本来就要发送新权重的训练步骤。`--sleep-preserve-parameter-names` 可让被冻结的权重保留在 GPU 上，避免每步都搬移。

**暂停和恢复。** `/pause` 会停止新的生成请求，`/resume` 会恢复请求。暂停时可以中止正在运行的请求、等待这些请求完成，或让它们继续保持运行。

**更新权重。** Trainer 先调用 `/init_weight_transfer_engine` 启动传输，再调用 `/start_weight_update`、发送权重，最后调用 `/finish_weight_update`。传输可在多 GPU 之间通过 NCCL 完成，也可以在同一台机器上使用 CUDA memory handle。`/update_weight_version` 会记录下一轮 rollout 使用的权重版本。

**集体调用。** `/collective_rpc` 会在每个 worker 上运行一个方法。Framework 会用它来执行 vLLM 未覆盖的初始化步骤。

**外部启动器。** 使用 `--distributed-executor-backend external_launcher` 时，`torchrun` 等启动器会在 trainer 进程中启动 vLLM worker。一些共置运行的 framework 会使用这种方式。

## 手动测试休眠与唤醒 {#s-use-vllm-as-an-rl-rollout-engine-try-sleep-and-wake-by-hand}

开启开发模式和休眠模式启动服务器。`--host 127.0.0.1` 会将控制路由限制在本机：

```bash
VLLM_SERVER_DEV_MODE=1 vllm serve Qwen/Qwen3-8B --enable-sleep-mode --host 127.0.0.1 2>&1 | tee server.log
```

在第二个终端中让服务器休眠、检查状态，再唤醒它：

```bash
curl -X POST 'http://localhost:8000/sleep?level=1'
curl http://localhost:8000/is_sleeping
curl -X POST 'http://localhost:8000/wake_up'
curl http://localhost:8000/is_sleeping
```

两个 POST 路由都会返回 HTTP 200 和空响应体。第一个 `/is_sleeping` 请求返回 `{"is_sleeping":true}`，第二个返回 `{"is_sleeping":false}`。在调用之间运行 `nvidia-smi`，可以看到休眠时 GPU 内存下降，唤醒后恢复。

我们在 L4 上使用小模型 Qwen3-0.6B，对休眠等级 1 运行了这些请求。每个 POST 都返回 200 和空响应体，休眠耗时 1.9 秒。GPU 内存从 14,861 MiB 降到 4,245 MiB，唤醒后恢复。日志中的 `Sleep mode freed 10.37 GiB memory` 也证实了内存已释放。

## 了解 0.31.0 的休眠模式问题 {#s-use-vllm-as-an-rl-rollout-engine-know-the-sleep-mode-problems-at-0-31-0}

0.31.0 已知有三个休眠模式问题。我们没有自行复现：

- **等级 2 唤醒不会重新加载 speculative draft。** Issue 52479 报告，权重重新加载只覆盖目标模型。之后目标模型会拒绝所有 draft token，decode 速度会降到近似不使用 speculation 的水平。输出内容仍然正确，也不会报错。该 issue 仍然开放。
- **等级 2 休眠会清除校准过的 KV scale。** 在使用 compressed-tensors checkpoint 和 FP8 KV cache 时，重新加载权重后的首个请求会返回 NaN logprobs，且第一个 token 错误。0.32.0 已修复此问题。
- **休眠期间更新权重会让 engine 停止。** Issue 57853 报告，在调用 `/sleep` 后、`/wake_up` 前发送权重会触发 segfault。API server 仍然运行，但之后的请求全部失败。该 issue 仍然开放。

所以，每次等级 2 唤醒后，都应重新加载权重、重置前缀缓存，并查看 speculative acceptance 计数器。Trainer 发送权重前，先唤醒服务器。

## 检查 rollout logprobs {#s-use-vllm-as-an-rl-rollout-engine-check-the-rollout-logprobs}

Trainer 通常会将 vLLM 返回的 logprob 与自行计算的 logprob 比较。由于 kernel 不同，两者不会完全相同。小幅且稳定的误差是正常的；误差逐步增加，说明生成器可能没有收到更新后的权重。每个训练步骤都应记录这个差值。[可复现输出](#s-get-reproducible-outputs)一节解释了相同权重为什么仍会得到不同数值。

分析差值前，先确认 vLLM 返回的是哪种 logprob。使用 top-p 或 top-k 时，两者通常不相同。

**Logprobs 模式：**服务器参数 `--logprobs-mode` 用于选择 vLLM 为每个 token 返回的数值。默认值 `raw_logprobs` 表示整个词表上的 logprob；`processed_logprobs` 表示采样设置修改概率分布后的 logprob。另有 `raw_logits` 和 `processed_logits` 两种模式，会返回 logits。

2026-10-23，我们在 L4 节点的第二块 GPU 上检查了这两种 logprob 模式。使用的是 BF16 的 `Qwen/Qwen3-0.6B`、16 条 48-token 提示词、temperature 1 和 top-p 0.9。我们用 Transformers 的 float32 前向计算作为参考。这块 GPU 是共享的且没有锁定时钟，但时钟不会改变这些数值。

```listing
title: 返回的 logprob 减去全词表参考值
source: capture/gpu/out-l4/logprobs-top-p.txt
lang: text
note: 展示 vLLM 的两行结果。同一文件中的 SGLang 结果已省略。
---
engine and mode                                  returned minus reference, median   median absolute
vLLM --logprobs-mode raw_logprobs                0.0000                             0.005
vLLM --logprobs-mode processed_logprobs          +0.0527
```

- `raw_logprobs` 与全词表 logprob 相符。受 kernel 差异影响，绝对值误差中位数为 0.005。
- `processed_logprobs` 比全词表 logprob 高出的幅度，等于保留下来的 top-p 概率质量取负对数。按该公式计算后，剩余误差中位数为 8e-9。
- top-p 为 0.9 时，大多数采样 token 保留的概率质量低于 0.99，中位差值约为 0.053。

Trainer 按全词表评分时，应比较 `raw_logprobs`。只有在 Trainer 使用相同保留集合评分时，才比较 `processed_logprobs`。

我们没有在自己的硬件上完整测量，只运行了上述休眠等级 1 和 logprob 检查，并且都使用小模型。我们没有测量等级 2 休眠或权重更新耗时。Miles 101 手册使用 SGLang 作为生成器，对相同训练循环进行了测量。

```takeaways
- 休眠会释放 GPU 内存供训练使用，唤醒会将内存取回。
- 权重传输由 trainer 通过服务器路由启动并结束。
- 每个步骤都要记录生成器与 trainer 之间的 logprob 差值。
- 让 --logprobs-mode 与 trainer 的 token 评分方式保持一致。
- 在 0.31.0 中，等级 2 唤醒后检查 draft acceptance，并在更新权重前唤醒服务器。
```

来源：vLLM 0.31.0 源码（vllm/config/model.py、vllm/config/parallel.py、vllm/entrypoints/serve/dev/sleep/api_router.py、vllm/entrypoints/serve/dev/rlhf/api_router.py、vllm/entrypoints/serve/dev/rpc/api_router.py、vllm/distributed/weight_transfer/base.py、vllm/distributed/weight_transfer/factory.py、vllm/distributed/weight_transfer/nccl_engine.py、vllm/distributed/weight_transfer/ipc_engine.py），vLLM 0.31.0 文档（docs/training/rlhf.md、docs/training/async_rl.md、docs/features/sleep_mode.md、docs/training/weight_transfer/），v0.31.0 和 v0.32.0 发布说明，vLLM issues 52479 和 57853，v0.32.0 发布说明（等级 2 休眠与校准 KV scale），capture/gpu/out-l4/livecheck-2026-10-22.txt、capture/gpu/out-l4/logprobs-top-p.txt。
