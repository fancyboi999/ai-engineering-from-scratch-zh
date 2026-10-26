# 保持异步调度开启

> 大多数生成模型默认启用异步调度；少数设置会在没有报错的情况下将其关闭。

你读过异步调度的介绍，想知道是否应该启用。读完本节，你可以检查服务器是否运行异步调度，并找出哪些设置会关闭它。

**我们的测量结果：**在降频的 L4 上关闭异步调度后，单用户每个 token 的速度约慢 3%。由于时钟频率较低且只有两个随机种子，该结果尚未得到确认。

## 了解异步调度的工作方式 {#s-leave-async-scheduling-on-know-what-it-does}

关闭异步调度时，每个步骤按顺序执行：调度器选出一个 batch，GPU 执行计算，然后调度器读取结果，才能安排下一个 batch。调度器处理期间，GPU 会等待。

开启异步调度后，GPU 仍在执行当前 batch 时，调度器就可以选择下一个 batch。尚未采样的 token 会被记作占位符，因此调度器不会让请求超过 token 上限。这样 GPU 在步骤之间的空闲时间会减少。[Model Runner V2](#s-what-model-runner-v2-changed)一节会解释新 model runner 为何支持这一功能。

## 确认异步调度是否开启 {#s-leave-async-scheduling-on-know-when-it-is-on}

vLLM 0.31.0 提供三种设置：--async-scheduling 表示开启，--no-async-scheduling 表示关闭，不提供参数则由 vLLM 决定。不提供参数时，vLLM 通常会开启异步调度，但以下情况会关闭：

- 模型是 pooling model，例如 embedding 模型。
- speculation 方法是 n-gram、suffix、Medusa 或 MLP speculator。EAGLE、MTP、DFlash 和 DSpark 方法、GPU n-gram 方法，以及 draft model 都会保持异步调度开启。
- Pipeline parallelism 已启用，且当前使用旧的 model runner。
- Executor 不支持此功能。

这些情况下，vLLM 会关闭异步调度。大多数情况下会写一条 warning；pooling model 只会产生 debug 日志。服务器仍会运行，因此很容易忽略。添加 speculation 方法或更改并行布局后，要检查启动日志。

## 查看同一配置重复运行的差异 {#s-leave-async-scheduling-on-see-how-much-two-runs-of-one-setting-differ}

2026-10-21，我们在 L4 上使用 Qwen/Qwen3-8B，在[完整时钟时段](#s-front-l4-sessions)运行了两次负载 sweep。一次没有参数，另一次使用 --async-scheduling。对这个不使用 speculation 的模型，该参数与默认配置相同，所以两次运行使用的是同一项设置。

两次运行的输出量最多相差 1.8%，每 token 耗时最多相差 0.8%。所有并发数下的随机种子结果范围都重叠。因此，在这块 GPU 上，不同配置间几百分点的差异可能只是运行间波动；只有随机种子范围分开时，才有证据说明差异确实存在。[实验记录](#s-ref-lab-notes)列出了 vllm-b 和 vllm-async 的完整表格。

## 查看关闭异步调度的成本 {#s-leave-async-scheduling-on-see-what-turning-it-off-costs}

**我们的测量：**2026-10-22，我们在 L4[共享 GPU 时段](#s-front-l4-sessions)使用 Qwen/Qwen3-8B，将 --no-async-scheduling 与默认设置进行比较。该 GPU 的缓存池容量为 2,928 个 token，因此测试了 1 个和 4 个用户。

| 用户数（L4 共享 GPU 时段） | TPOT 中位数，开启 / 关闭 | 输出 token/s，开启 / 关闭 | SM 时钟中位数，开启 / 关闭 | 随机种子数，开启 / 关闭 |
|---|---|---|---|---|
| 1 | 241.7 / 249.6 ms | 3.98 / 3.87 | 375 / 368 MHz | 2 / 2 |
| 4 | 272.6 / 277.2 ms | 13.02 / 12.85 | 428 / 450 MHz | 2 / 1 |

单用户时，关闭异步调度让每个 token 的耗时增加了 3.3%，且两边随机种子的结果范围不重叠。这一差值大于我们在另一块完整时钟 GPU 上重复运行同一设置时观察到的 0.8% 波动。四用户时，耗时增加 1.7%，但关闭时只有一个随机种子。

该 GPU 的时钟只有 368 至 450 MHz，远低于完整时钟。单用户时，关闭异步调度的时钟低了 2%，接近观测到的变化幅度。因此这个结果尚未确认。在这些 batch 大小下收益很小，我们也没有在完整时钟或高并发情况下测试。

## 设置建议 {#s-leave-async-scheduling-on-decide}

不设置参数，让 vLLM 自行选择。如果添加 speculation 方法或 pipeline parallelism，检查日志中的 warning。如果出现 warning，就分别测试启用和关闭该功能时的每 token 耗时，因为异步调度也会一起关闭。

```takeaways
- 不设置参数，由 vLLM 自行开启异步调度。
- 添加 speculation 或 pipeline parallelism 后，检查启动日志中的 warning。
- 随机种子结果范围重叠且差值较小时，将其视为运行间波动。
```

来源：capture/gpu/summary/l4.json（load.vllm-b、load.vllm-async、load.vllm），capture/gpu/summary/l4-gpu1.json（load.vllm-fast-b、load.vllm-no-async），vLLM 0.31.0 源码（vllm/config/scheduler.py、vllm/config/vllm.py、vllm/v1/core/sched/async_scheduler.py），vLLM 0.31.0 文档（docs/design/model_runner_v2.md）。
