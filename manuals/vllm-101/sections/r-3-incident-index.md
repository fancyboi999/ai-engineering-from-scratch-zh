# 故障索引

> 本节列出手册引用的每个 issue，以及 vLLM 0.31.0 中的状态。

可用本节确认你遇到的问题是否为已知问题。

状态截至 2026-10-22。编号指 vLLM 仓库中的 issue。

## Issues {#s-ref-incident-index-issues}

| Issue | 问题描述 | 状态 | 详见 |
|---|---|---|---|
| 44740 | GB10 上启用 MTP speculation 时 CUDA graph 内存估算为负数，导致 KV cache 过大 | open | [DGX Spark](#s-size-memory-on-a-dgx-spark) |
| 46307 | GB10 启动 profile 阶段的内存超过 `--gpu-memory-utilization` 限额，导致宿主机停机 | 2026-10-22 stale 关闭，未修复 | [DGX Spark](#s-size-memory-on-a-dgx-spark) |
| 52479 | 从休眠状态以 level 2 恢复时没有重新加载 speculative draft，因此没有 draft token 被接受 | open | [RL rollout](#s-use-vllm-as-an-rl-rollout-engine) |
| 54623 | Qwen3.5 系列不加载 checkpoint KV scale，因此 FP8 KV cache 使用 scale 1.0 | open | [FP8 KV cache](#s-fit-more-users-with-an-fp8-kv-cache) |
| 57853 | Engine 休眠期间收到权重更新会导致 engine core 段错误 | open | [RL rollout](#s-use-vllm-as-an-rl-rollout-engine) |
| 60333 | 一种 MTP draft loader 会丢失 FP8 KV scale，draft layer 因而使用 scale 1.0 | open | [FP8 KV cache](#s-fit-more-users-with-an-fp8-kv-cache) |
| 58726 | GB10 加载权重较慢，因为权重通过文件映射逐 tensor 复制 | open | [DGX Spark](#s-size-memory-on-a-dgx-spark) |
| 59770 | 自 0.29.0 起，一个模型在 GB10 上的 NVFP4 decode 变慢 | open | [故障排查](#s-troubleshoot-by-symptom) |
| 60174 | 0.30 和 0.31 上使用 DFlash2 或 DSpark speculation 命中 prefix cache 后会重复一个 token | 2026-10-22 closed | [故障排查](#s-troubleshoot-by-symptom) |
| 60262 | FP8 KV cache 选择了无法正常构建 kernel 的 FlashInfer，导致启动崩溃 | open | [故障排查](#s-troubleshoot-by-symptom) |
| 60830 | 某模型同时使用 MTP speculation 和 JSON schema 时会输出无效 JSON | closed | [故障排查](#s-troubleshoot-by-symptom) |
| 60838 | 移除 Mamba cache 模式 `all` 后，`--mamba-block-size` 不再生效 | open | [长上下文](#s-serve-long-contexts-and-hybrid-models) |
| 61024 | 2026 年第四季度项目路线图列出了移除旧 model runner 的计划 | open | [Model Runner V2](#s-what-model-runner-v2-changed) |
| 61886 | 不依赖 tensor-parallel size 的 KV offloading | open | [KV connector](#s-how-kv-connectors-move-the-cache) |
| 59538 | KV transfer 与 storage 的压缩层 | open | [KV connector](#s-how-kv-connectors-move-the-cache) |
| 61229 | NIXL connector 远程读取期间释放 KV block 的问题 | open | [KV connector](#s-how-kv-connectors-move-the-cache) |
| 58253 | 建议增加 reviewer 角色以提升审查能力 | open | [发展历程](#s-where-vllm-came-from) |
| 61698 | 建议实现可复现的 eval 和 benchmark，让贡献者在自己的 GPU 上运行 | open | [发展历程](#s-where-vllm-came-from) |

## 我们遇到的故障 {#s-ref-incident-index-our-own-incidents}

| 日期 | 机器 | 情况 | 详见 |
|---|---|---|---|
| 2026-10-22 | L4，共享 GPU | 一个请求的最大长度为 2,928 token，启动失败，因为所需 KV cache 略高于可用空间 | [启动](#s-fix-out-of-memory-at-startup) |
| 2026-10-21 | GB10 | 首次加载 56.93 GiB 权重花了 330 秒 | [DGX Spark](#s-size-memory-on-a-dgx-spark) |

Sources: vLLM issues 44740, 46307, 52479, 54623, 57853, 58253, 58726, 59538, 59770, 60174, 60262, 60333, 60830, 60838, 61024, 61229, 61698, and 61886 (fetched 2026-10-21, and the state of each again on 2026-10-22); capture/gpu/out-gb10/server-load-vllm.log.
