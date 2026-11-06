---
id: fp8-kv-scale-silently-one
title: FP8 KV cache 静默回退至 1.0 缩放因子
card: scenarios
kind: incident
level: 3
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [fp8, kv-cache, quantization, attention-backend, accuracy, scales]
minutes: 20
lessons: []
manuals: [vllm-101#s-fit-more-users-with-an-fp8-kv-cache, vllm-101#s-change-the-attention-backend-only-for-a-reason, vllm-101#s-ref-incident-index, sglang-101#s-quantization]
practice: []
cheatsheet: [quantization]
related: []
updated: 2026-11-03
system:
  version: vLLM 0.31.0
  model: Qwen/Qwen3-8B
  hardware: one L4 with 24 GB of memory
source:
  - manuals/vllm-101/capture/gpu/incidents/l4-vllm-kv-fp8-flashinfer-attention-jit.txt
  - manuals/vllm-101/capture/gpu/out-l4/gsm8k-fp8-accuracy.txt
  - manuals/vllm-101/sections/2-4-fit-more-users-with-an-fp8-kv-cache.md
  - manuals/vllm-101/sections/r-3-incident-index.md
---

## Situation

一个团队在单张 L4 上部署 `Qwen/Qwen3-8B`。由于 KV 显存池被打满导致请求排队，他们添加了 `--kv-cache-dtype fp8` 将每个缓存值从两个字节压缩到一个字节。首次启动因内核库编译报错失败。一位同事添加了一个后端参数后服务成功启动，且快速基准测试显示单 token 耗时比之前略有下降。

在正式上线前，团队在 GSM8K 前 500 道题目上对比了 BF16 与 FP8 的准确率，发现两者在误差范围内完全一致。他们随即推向上线。在复盘评审中，一位资深 Staff 工程师问了一个问题：“缓存实际使用的是哪个缩放因子？”现场无人知晓。生产线上准备运行的模型并非眼前这个测试模型，而是一个官方检查点自带校准后缩放因子的更新模型家族。

## Evidence

- [L4 上首次启用 FP8 KV cache 时的启动失败日志](evidence/first-start-fails.txt)
- [池大小固定下 Triton 后端 FP8 KV cache 与默认 BF16 的速度对比](evidence/speed-at-a-fixed-pool.txt)
- [四种配置在两套推理引擎上的 GSM8K 准确率测试数据](evidence/accuracy-check.txt)
- [0.31.0 版本故障索引中记录的三起加载器缺陷](evidence/known-loader-bugs.txt)
- [技术手册关于检查点及启动日志中缩放因子的核验规范](evidence/the-check.txt)

## Questions

1. 当 KV 数据类型改变时服务器自动选择了不同的注意力后端。为什么数据类型决定了后端选型，为什么该后端在当前宿主机上编译失败？
2. 速度对比表中 BF16 与 FP8 之间发生了两处变化。在何种并发用户下你能得出什么结论，又不能得出什么结论？
3. 什么是 KV 缩放因子，1.0 的缩放因子会对 FP8 取值造成什么影响，针对哪些检查点 1.0 是唯一的无奈之选？
4. 准确率表格中的所有置信区间均相互重叠。这证明了什么，500 道题无法排除什么？
5. 生产检查点携带了校准后的缩放因子。给出按顺序执行的三项检查以证明运行中的服务器真正加载使用了它们。

## Walkthrough

1. **分析启动失败日志。** 第二行打印了后端选择：在候选的 `FLASHINFER` 和 `TRITON_ATTN` 中选用了 `FLASHINFER`。FlashAttention 在候选列表中缺席。在 L4 上，vLLM 优先尝试 FlashAttention，但在 0.31.0 版本中 FlashAttention 仅在 Hopper 和 Blackwell 数据中心 GPU 上支持读取 FP8 KV cache，而 L4 属于 SM 8.9 的 Ada 架构。因此 vLLM 降级选择列表中的下一个后端。FlashInfer 在首次启动时需要即时编译其算子内核，第四行显示编译失败，根因在于宿主机上的 CUDA 编译器与 CUDA 头文件来自不同版本。修复方案是指定 `--attention-backend TRITON_ATTN`（其读取 FP8 cache 无需动态编译）并配置 `VLLM_USE_FLASHINFER_SAMPLER=0`（防止采样器因同样原因编译失败）。
2. **解读固定显存池下的性能对比。** 速度测试表在两次运行中均将显存池容量强制固定在 24,096 个 token，因此完全没有展现显存池扩容带来的吞吐优势，展现的纯粹是运算耗时的变化。在单用户下，FP8 单 token 耗时快了 2.3%，从 104.1 ms 降至 101.8 ms，时钟频率同为 210 MHz 且多次随机种子区间不重叠。在 32 用户下随机种子区间发生重叠且 FP8 运行时的时钟频率更高，480 MHz 对比 450 MHz，因此在多并发下无法下达任何确定性结论。此外本次运行同时改变了 KV 数据类型和注意力后端两项变量，因此即便是单用户下的收益也无法单独归因于数据类型本身。
3. **理解 KV 缩放因子的数学机制。** 准确率表格开头的结论直接回答了 Staff 工程师的疑问。当前检查点本身未携带任何 KV 缩放因子，因此 FP8 KV 运行默认采用了 1.0 的固定 scale。FP8 表示范围极窄，缩放因子的作用是将实际键值的动态范围精确映射到该数值空间内。缺少校准缩放因子时，服务器只能原样截断保存。对于该测试模型，500 道题中答对 454 题（BF16 为 459 题），准确率为 90.8% 对比 91.8%，置信区间分别为 87.9%~93.0% 与 89.1%~93.9%。区间重叠仅说明本次测试未观测到显著差异，绝不代表不存在性能损耗。500 题的小样本无法排除微小掉点的可能，且仅仅覆盖了单一模型与单个基准。
4. **警惕加载器缺陷导致的隐蔽失效。** 故障索引揭示了潜在的巨大风险。Issue 54623 披露 Qwen3.5 模型家族从未真正加载检查点中的 KV 缩放因子，即便检查点提供了校准 scale，FP8 KV cache 依然在以 1.0 的盲目比例静默运行。Issue 60333 汇报了某 MTP 草稿模型加载器的同类 bug。这两处缺陷在 0.31.0 中均处于 open 未修复状态。因此检查点拥有缩放因子绝不等于服务器真正使用了它。
5. **执行三步核验流程。** 首先检索权重索引，查找以 `k_scale` 或 `v_scale` 结尾的张量名称，无输出说明检查点根本没有缩放因子。其次检查启动日志，核实是否存在 `Using KV cache scaling factor 1.0` 的警告，若检查点有 scale 但依然打印该警告，说明加载器发生了静默丢弃。最后在自有业务提示词上对比开启与关闭 FP8 时的输出质量。

## Resolution

本起事故属于认知盲区而非服务崩溃。对于 `Qwen/Qwen3-8B` 而言，1.0 的 scale 是唯一的现状选择，且 500 题测试无法将两套配置有效区分开。但对于生产模型，团队在发布前必须确证三件事：检查点包含 `k_scale` 和 `v_scale` 张量；启动日志没有打印 scale 1.0 的警告；在自有业务提示词样本上验证 FP8 与 BF16 输出一致。

同时在每次调整 KV 数据类型后必须核查生效的注意力后端。在当前 L4 上该改动使后端从 FlashAttention 静默漂移到了 Triton，性能测试反映的是后端与精度的复合效应。在汇报数据旁注明后端、缩放因子与准确率置信区间，并坚持在自有业务场景下复测质量，因为注意力结构不同的其他模型可能发生更严重的精度崩塌。

## Wrong turns

- "准确率打平了，因此 FP8 对所有模型都是安全的。" 测试仅针对缺少缩放因子的特定模型、单基准和 500 道题。它无法排除微弱精度损失，其他模型可能损失严重。
- "检查点包含了缩放因子，说明服务器已经正常使用。" 0.31.0 存在两起已被证实的加载器丢弃缩放因子并回退至 1.0 的已知 bug。唯有启动日志能证明服务器实际采用了什么。
- "FP8 让单 token 速度提升了 2.3%，说明数据类型优化生效。" 该次测试同时切换了注意力后端，且收益仅在单用户下得到印证。数据无法拆分两者各自的贡献。
- "修复编译环境以便顺利构建 FlashInfer。" 这是运维层面的宿主机修复，而非推理架构决策。Triton 后端无需动态编译即可原生支持 FP8，日志中的后端指示行能指明具体运行方式。

## Generalize

量化存储必须依赖缩放因子，默认回退至 1.0 是服务端在幕后替你做出的静默妥协。无论何时调整数据类型，都必须核验随之触发的三项级联变化：切换到了哪个算子后端、采用了什么缩放因子，以及评测手段在当前样本量下究竟具备多大的检验效能。未能检测出质量差异的测试仅能给出损失上限，并不能证明完全没有损失。

## Taught in

vLLM 手册在[FP8 KV cache 页面](../../../manuals/vllm-101/sections/2-4-fit-more-users-with-an-fp8-kv-cache.md)演示了开启缓存与核查缩放因子的流程，在[注意力后端页面](../../../manuals/vllm-101/sections/4-5-change-the-attention-backend-only-for-a-reason.md)剖析了后端选型机制，并在[故障索引](../../../manuals/vllm-101/sections/r-3-incident-index.md)中列出了加载器缺陷，而 SGLang 手册在[量化页面](../../../manuals/sglang-101/sections/4-3-quantization.md)执行了相同的准确率检验。
