# 根据症状排查问题

> 从观察到的现象开始，每一项都会说明可能的原因、检查方式和修复方法。

前六项是我们在 GB10 上遇到的问题：五种训练失败症状和一种温度导致的计时变化。第七项以我们的正常训练为参考。第八项来自 Miles 和 SGLang 源码与文档。其余问题来自 Miles issue tracker 的报告。我们没有复现第八项及其他问题。

读完本节后，你可以从最早出现的症状找到训练失败或结果异常的原因。

```figure
id: fig-7-1
kind: decision
title: 从观察到的现象开始排查
claim: 我们遇到的五种症状都各自对应一项首要检查和修复方法。
caption: 图中展示了我们运行时遇到的五种症状。以下条目还包括 reward 模块缺失导致训练挂起的情况、与正常训练的比较、一个文档记录的问题，以及 issue 报告中的五个问题。
```

## GPU 空闲，但日志持续增长 {#s-troubleshoot-by-symptom-the-gpu-is-idle-and-the-log-keeps-growing}

- **原因：**rollout engine 已退出，但 trainer 仍在持续发送请求。
- **检查：**统计日志最近几分钟内每分钟的 `503 Service Unavailable` 数量。我们的失败训练连续一小时每分钟都记录了 2,600 多条。正常训练中，每个 prompt 生成 16 个答案时，错误会短暂出现，最长持续一分钟，随后消失。
- **修复：**停止训练，再查看第一条 503 错误之前的 engine 日志。所有需要无人值守的训练都应启动[第 1.2 节](#s-add-a-watchdog)介绍的 watchdog。

## reward 导入错误后训练挂起 {#s-troubleshoot-by-symptom-the-run-hangs-after-a-reward-import-error}

- **原因：**Miles 无法导入 `--custom-rm-path` 指定的模块，通常是因为 `PYTHONPATH` 没有包含实验目录。
- **检查：**在日志中查找带有 reward 模块名称的 `ModuleNotFoundError`。该错误之后不会出现 `rollout 0` 日志。
- **修复：**训练不会自行停止，watchdog 也不会停止它，因为 engine 只会写入少量 503 错误。我们的测试中，任务持续运行了两个小时。停止容器，按[第 3.5 节](#s-write-a-custom-reward)的说明修正 `PYTHONPATH`，然后重新启动训练。

## engine 启动时出现 FlashAttention 3 错误并退出 {#s-troubleshoot-by-symptom-the-engine-stops-at-start-with-a-flashattention-3-error}

- **原因：**训练在不支持 FlashAttention 3 的 GPU 上请求使用它，通常由 true on-policy 模式触发。
- **检查：**在 engine 日志中查找 `FlashAttention v3 Backend requires SM>=80 and SM<=90`。
- **修复：**非 Hopper GPU 应关闭 true on-policy 模式，并使用默认 backend。[第 4.6 节](#s-know-the-true-on-policy-limits)说明了该限制。

## 任务因 Ray OutOfMemoryError 停止 {#s-troubleshoot-by-symptom-the-job-stops-with-a-ray-outofmemoryerror}

- **原因：**统一内存设备上，Ray 读取的是整台节点的内存，节点已接近内存上限。使用率超过阈值后，Ray 会停止 worker。
- **检查：**查找 `Memory on the node ... was 115.86GB / 121.69GB` 或类似日志，并确认没有 CUDA out-of-memory 错误。
- **修复：**使用更小的模型或减少每步工作量，并保留默认 Ray 阈值。降低 engine 内存比例没有解决我们 4B 训练的问题。详情见[第 2.3 节](#s-stop-ray-killing-the-job)。

## trainer 拒绝 attention implementation {#s-troubleshoot-by-symptom-the-trainer-rejects-the-attention-implementation}

- **原因：**trainer 使用的 attention 名称不受已安装的 transformers 库支持，例如 `triton`。
- **检查：**查看 `ValueError` 错误，其中会列出 transformers 支持的 attention implementation。
- **修复：**从错误列出的选项中选择一个。我们的 GB10 保留了 trainer 默认设置。

## 不同运行的步骤耗时不同 {#s-troubleshoot-by-symptom-step-times-change-from-run-to-run}

- **原因：**过热暂停，或 GPU 过热后降频。我们预计样本和 reward 不会变化，但尚未验证这一点。
- **检查：**查看[第 1.2 节](#s-add-a-watchdog-guard-the-gpu-heat)介绍的 heat guard 暂停日志，以及运行期间的 GPU 时钟频率。
- **修复：**只统计没有暂停影响的步骤，并在同一会话中比较耗时。[第 5.3 节](#s-repeat-a-run)介绍了相关规则。

## 第 0 步的差距远超正常范围 {#s-troubleshoot-by-symptom-the-gap-at-step-0-is-far-above-your-range}

- **原因：**engine 和 trainer 使用的初始权重不同，或它们以不同格式读取相同权重。
- **检查：**将第 0 步的 `train/train_rollout_logprob_abs_diff` 与正常运行比较。我们的 Qwen3-0.6B 范围为 0.0148 至 0.0157。
- **修复：**训练使用错误数值前先停止运行。检查两端的 checkpoint 路径。

## engine 启动时内存不足 {#s-troubleshoot-by-symptom-the-engine-runs-out-of-memory-at-start}

- **原因：**`--sglang-mem-fraction-static` 设置不适合当前 GPU。启用 `--colocate` 时，engine 启动前 trainer 可能已占用 GPU 内存。比例过高会挤占激活值和 CUDA graph 的内存；比例过低则会限制 KV cache。
- **检查：**查看 engine 在启动或第一个 batch 时是否报告 CUDA out-of-memory 错误，并确认没有 `Ray OutOfMemoryError`。比例过低不一定会让 engine 退出。检查 `KV Cache is allocated` 日志中的 `#tokens`。我们的测试中，比例为 0.02 时 engine 启动后只提供 3,082 个 token，首个 rollout 耗时 386 s；比例为 0.25 时为 61 s。
- **修复：**第一种情况每次将比例降低 0.05 或 0.1；第二种情况则逐步调高。Miles 文档建议 `--colocate` 时不超过 0.8。我们的训练使用 0.4。[SGLang 101 第 3.2 节](https://aieng-zh.cn/manual-sglang-101.html#s-mem-fraction-static-and-startup-sizing)介绍了 engine 如何分配内存。

## 小数 reward 改变了本应保持不变的组 {#s-troubleshoot-by-symptom-a-reward-function-with-fractions-moves-a-group-that-should-stay-still}

- **原因：**tracker 中的一份报告显示，16 个答案都得到 0.3 reward 时，float32 舍入会产生很小的非零 advantage。二元 reward 0 和 1 不会出现这一问题。
- **检查：**查看组内所有答案 reward 相同但 advantage 不为 0 的情况。
- **修复：**使用 float32 可以精确表示的 reward，或自行检查这类组的 advantage。

## FSDP offload 后训练结果异常 {#s-troubleshoot-by-symptom-training-goes-wrong-after-offload-on-fsdp}

- **原因：**tracker 中的一份报告指出，在两张或更多 GPU 上使用 FSDP2 卸载 trainer 状态时，可能会破坏大小不均的分片。
- **检查：**首次 offload 后出现非有限值、loss 或 gradient norm 突增，或 collective timeout。模型层无法在各 rank 间平均拆分。
- **修复：**尝试使用 `--no-offload-train` 运行一次并比较结果。关注 issue 中的代码修复。

## 多 GPU 上权重更新失败 {#s-troubleshoot-by-symptom-the-weight-update-fails-on-many-gpus}

- **原因：**tracker 中有两份相关报告。第一份指出，NCCL 2.29 和 2.30 配合 tuner plugin 时，使用 pipeline stage 的 colocated 更新会崩溃；NCCL 2.31 已修复。第二份指出，两张 GPU 上的确定性 serving 和 trainer 使用了不同数量的 NCCL channel，导致权重传输大小不匹配。
- **检查：**权重更新期间发生 segmentation fault 或 `Message truncated` 错误。
- **修复：**第一种情况将 NCCL 更新至 2.31 或更高版本。第二种情况在多 GPU engine 修复发布前，关闭 deterministic serving。

## 数百个未完成请求导致 rollout 变慢 {#s-troubleshoot-by-symptom-rollout-gets-slow-with-hundreds-of-open-requests}

- **原因：**tracker 中的一份报告测量了客户端开销，它会随未完成请求数增加。256 个未完成请求时耗时 4.8 s，1,536 个时耗时 43.7 s。
- **检查：**rollout 耗时的增长幅度超过样本数的增长。
- **修复：**降低每个 engine 同时处理的未完成请求数，或关注 issue 中的客户端修复。

## 启动脚本停止了你自行启动的 Ray cluster {#s-troubleshoot-by-symptom-the-launcher-stops-a-ray-cluster-you-started-yourself}

- **原因：**tracker 中的一份报告指出，六个 agent 示例启动脚本会停止命令行中含有 `sglang` 的所有进程。设置 `MILES_SCRIPT_EXTERNAL_RAY=1` 后，这也会停止你的 Ray cluster。
- **检查：**Miles 运行结束时，其他 Ray 任务也停止了。
- **修复：**删除这些启动脚本中的清理操作，或在 issue 修复前为 Miles 单独启动 Ray cluster。

```takeaways
- 从日志中的第一个症状开始，并先查看 engine 日志，再查看 trainer 日志。
- 为每次无人值守的运行启动 watchdog。
- issue tracker 中的条目是待检查的报告，不是我们测量的结果。
```

来源：Miles main 08752a12 中的 training backend 文档；镜像构建中的 SGLang 内存计算代码 0.5.22.dev46；capture/gpu/out-gb10/engine-died-503.log；capture/gpu/out-gb10/engine-died-count.txt；capture/gpu/out-gb10/503-bursts.txt；capture/gpu/out-gb10/ray-oom-4b.log；capture/gpu/out-gb10/thermostat.log；capture/gpu/summary/miles-gb10-lab.json；manuals/sglang-101/capture/gpu/out-miles/true-on-policy-error.log；Miles issues 3649、3714、4003、4019、4134、4238；capture/gpu/out-gb10/custom-rm-noenv-hang.txt (2026-10-23 实测记录)；capture/gpu/out-gb10/frac-low-kv.txt (2026-10-23 实测记录)。
