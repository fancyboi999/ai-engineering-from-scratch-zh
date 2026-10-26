# 重叠调度器

> GPU 运行批次 N 时，CPU 上的重叠调度器准备 N+1，这是 v0.5.22 的默认路径。

剖析简单的服务循环，会在 GPU 时间线的 decode 步之间发现空隙。Python 读取采样 token、检查停止字符串、释放内存、组建下一批时，GPU 等待。小模型的一步 decode 只有几毫秒，1 ms 空隙已占很大比例。

读完本节，你能解释 SGLang 如何隐藏步间 CPU 工作、何时关闭重叠，并判断命令中是否应有 `--disable-overlap-schedule`。

## 成本：GPU 步之间的 CPU 时间 {#s-the-overlap-scheduler-the-cost-cpu-time-between-gpu-steps}

**重叠调度：** 一批的 CPU 工作与另一批的 GPU 工作同时运行。

SGLang 团队在 v0.4 发布文章中描述了问题：批次调度、内存分配与前缀匹配使 GPU 步间闲置 {{team 2024-12}}。方案是让调度器领先一个批次，提前准备下批所需的全部元数据。团队报告吞吐量提升 1.1 倍 {{team 2024-12}}，这是他们在自己 GPU 上测得的主张。

直观修法是第二线程建批，第一线程运行 GPU。但 Python 线程共享解释器，调度线程与前向线程仍轮流执行。SGLang 最初试过线程，自 2025 年 10 月 PR #11210 起，改用单线程中的两个 CUDA stream {{code}}。

## CUDA 上如何工作 {#s-the-overlap-scheduler-how-it-works-on-cuda}

循环先向 GPU 提交 N+1 批，再在 CPU 处理 N 批结果 {{code}}。GPU 无需等待前一步的记账工作。

问题在于 N+1 需要 N 采样的 token，而构建 N+1 时它们还在 GPU 上。SGLang 用占位 token ID 建立 N+1，再由 `FutureMap` 在 GPU 上用 N 的输出填充占位。CPU 在提交前不必读取 token {{code}}。

```figure
id: fig-2-4
kind: timeline
title: 同样三个 decode 步，关闭与开启重叠
claim: 关闭时 GPU 每步后等待 CPU 记账；开启时 CPU 处理 N 步，GPU 已运行 N+1。
caption: 时间从左到右。梅紫为 GPU 前向，蓝色为 CPU 工作，灰色斜线为 GPU 闲置。形状为示意，循环顺序来自 v0.5.22 event_loop_overlap。
```

## Mac 上如何工作 {#s-the-overlap-scheduler-how-it-works-on-a-mac}

MLX 后端有独立的 `event_loop_overlap_mlx` {{code}}。MLX 采用惰性求值，因此循环用 `mx.async_eval` 排队两个 decode graph。文档字符串说 GPU 会紧接当前步执行下一步，设备上没有调度间隙。Prefill 到达、请求完成或等待队列有新工作时，该链中断，循环构建新一步。

CUDA 和 MLX 使用同一个 Python scheduler，批处理、基数树记账与[第 2.2 节](#s-the-scheduler-loop-and-schedule-policy)日志相同，只有前向传播与重叠机制不同。

## 关闭后的结果 {#s-the-overlap-scheduler-what-happened-when-we-turned-it-off}

SGLang 的 Apple silicon 文档将 `--disable-overlap-schedule` 列为 MLX 的关键参数之一。上游加入它后运行并发 8 基准。服务器完成自身预热和基准预热，却在正式运行的首个批次调度器就退出。

```listing
title: MLX 上设置 --disable-overlap-schedule 导致 scheduler 崩溃
source: capture/out/server-no-overlap.log
lang: text
note: 省略事件循环至 run_batch 之间的 traceback。路径来自上游 v0.5.22 checkout。
---
[2026-10-16 14:07:15] Prefill batch, #new-seq: 1, #new-token: 1, #cached-token: 511, token usage: 0.00, #running-req: 0, #queue-req: 0, #pending-token: 0, cuda graph: False, input throughput (token/s): 0.39
[2026-10-16 14:07:16] Scheduler hit an exception: Traceback (most recent call last):
…
    scheduler.event_loop_normal()
…
  File "/private/tmp/sglang-research/sglang-v0.5.22/python/sglang/srt/managers/scheduler.py", line 4746, in run_batch
    self._relay_forward_payload(
  File "/private/tmp/sglang-research/sglang-v0.5.22/python/sglang/srt/managers/scheduler.py", line 4852, in _relay_forward_payload
    self.future_map.stash(future_indices, payload)
  File "/private/tmp/sglang-research/sglang-v0.5.22/python/sglang/srt/managers/overlap_utils.py", line 639, in stash
    self.output_tokens_buf[indices] = payload.bonus_tokens.to(
…
RuntimeError: Expected all tensors to be on the same device, but found at least two devices, mps:0 and cpu!
```

从栈底阅读：关闭重叠后，分派器选择通用 `event_loop_normal`。该循环调用 `run_batch`，后者仍通过重叠机制的 `FutureMap` 转发采样 token。MLX 上缓冲区位于 Metal 设备，而采样 token 来自 CPU，PyTorch 拒绝混用。MLX 重叠循环不走该路径，默认服务器因此不会触发它。

随后主进程关闭全部进程。32 个基准请求全部失败：8 个响应中断，24 个在服务退出后无法连接。

```listing
title: 崩溃的客户端视角
source: capture/out/no-overlap-bench-random-c8.txt
lang: text
note: 展示 32 条错误中两条的开头，以及末行。各错误原文含完整 traceback。
---
Warmup completed with 1 sequences. Starting main benchmark run...
…
requests.exceptions.ConnectionError: HTTPConnectionPool(host='0.0.0.0', port=30000): Max retries exceeded with url: /server_info (Caused by NewConnectionError("HTTPConnection(host='0.0.0.0', port=30000): Failed to establish a new connection: [Errno 61] Connection refused"))
```

上游唯一一次 MLX 录制中发生了这样的失败。这里按观察如实报告：平台文档推荐的参数，在固定版本上使该平台崩溃。

相同捕获配置在 L4 和 GB10 的 CUDA 上运行无误，64 个请求全部成功。每张卡都在八个用户下，分别开启和关闭重叠各运行一次。两张卡的结果方向相反：

| 显卡、模型 | 输出 tok/s，开启 / 关闭重叠 | TPOT 中位数，开启 / 关闭重叠 |
|---|---|---|
| L4, Qwen3-8B | 73.71 / 84.17 | 91.24 / 69.38 ms |
| GB10, Qwen3-30B-A3B | 78.92 / 73.59 | 97.30 / 103.21 ms |

L4 关闭重叠后快了 14%，GB10 则慢了 7%。两者都是没有时钟记录的单次运行，显卡发热可能解释任一结果。它们没有显示 SGLang 团队报告的 1.1 倍收益，也不能推翻该结论。

## 同根问题的 GPU 事故 {#s-the-overlap-scheduler-a-gpu-incident-with-the-same-root}

CUDA 上，一位用户开启重叠，在 token 占用 94% 时先看到 `KV cache pool is full`，紧接着分配失败 {{issue #14972}}。重叠模式在上批 token 仍在计算时规划下批。回撤需要考虑一步后才会结束的请求。PR #15626 提出的修复未合入便关闭。v0.5.22 会将即将因长度结束的请求移出下一 decode 批，也会在完成请求即将释放 KV 的步骤跳过回撤 {{code}}。

两个故事说明同一件事：重叠让调度器同时维护另一条时间线，每项功能都必须与它一致。

## 本手册的建议 {#s-the-overlap-scheduler-our-position}

除非在自己的显卡上测得相反结果，否则保持重叠开启。它是默认值，设计目的是隐藏每步都要付出的 CPU 时间。上游两次 CUDA 单次运行方向相反，所以修改设置前，要记录时钟并测量两种配置。

只有排查错误输出或挂起、需要排除重叠影响时才关闭。关闭路径测试较少，依赖前先在自己的硬件验证。无法工作的场景 SGLang 会自行关闭，例如不使用 MLX 的 Apple MPS，以及 CPU 上的推测解码 {{code}}。

```takeaways
- 除非自己的测量说明应关闭，否则保持重叠调度开启。
- --disable-overlap-schedule 仅用于隔离 bug，且先测试。
- v0.5.22 的 MLX 不要添加 --disable-overlap-schedule。
- 从栈底读取 scheduler traceback，找出失败组件。
```

来源： python/sglang/srt/managers/scheduler.py (event_loop_overlap, event_loop_normal, _dispatch_event_loop_once, run_batch, _relay_forward_payload, update_running_batch), python/sglang/srt/managers/overlap_utils.py (FutureMap.stash), python/sglang/srt/hardware_backend/mlx/scheduler_mixin.py (event_loop_overlap_mlx)，v0.5.22; docs/docs/hardware-platforms/apple_metal.mdx，v0.5.22; LMSYS, "SGLang v0.4: Zero-Overhead Batch Scheduler", 2024-12-04, https://lmsys.org/blog/2024-12-04-sglang-v0-4/; PR https://github.com/sgl-project/sglang/pull/11210; issue https://github.com/sgl-project/sglang/issues/14972 和 PR https://github.com/sgl-project/sglang/pull/15626; capture/out/server-no-overlap.command.txt, server-no-overlap.log, no-overlap-bench-random-c8.txt, capture/gpu/out-l4/bench-random-c8.txt, capture/gpu/out-l4/no-overlap-bench-random-c8.txt, capture/gpu/out-gb10/bench-random-c8.txt, capture/gpu/out-gb10/no-overlap-bench-random-c8.txt
