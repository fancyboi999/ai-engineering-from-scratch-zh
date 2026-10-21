# Evidence: cheatsheets/sglang-serving.md
upstream_revision: 45fa4084de6ba2f88fa96a41e69efa2166f868b3

# 证据对照：使用 SGLang 提供 LLM 服务

中文主题：[使用 SGLang 提供 LLM 服务](../sglang-serving.md)。下列逐条英文记录保留冻结上游版本的路径、行号与数值；标题对应中文主题。

原始记录中的 docs/en.md 和行号只在上述 upstream 版本有效，不代表当前 docs/zh.md 的行号，也不表示本次重新运行了命令、GPU 测量或外部模型。当前中文主题的 from 路径另由构建器校验。

Abbreviations: S = manuals/sglang-101/sections, R = manuals/sglang-101, C = manuals/sglang-101/capture, O = manuals/sglang-101/capture/gpu/out-l4.

## 启动服务 (annotated-code)

原始区块：Start a server (annotated-code, 3 lines)
- HF_HUB_OFFLINE=1 for offline runs: C/README.md:40
- sglang serve flags --model-path, --host, --port: O/server-default.command.txt:1
- --enable-cache-report, --enable-metrics, --mem-fraction-static 0.85: O/server-default.command.txt:1
- /ready returns 200 when ready: S/7-1-operating-sglang.md:12

## 三个进程 (architecture)

原始区块：Three processes (architecture, 6 nodes)
- Client sends POST /generate: S/1-2-one-request-end-to-end.md:20
- TokenizerManager converts text to token ids: S/2-1-sglang-serve-and-the-three-processes.md:18
- Scheduler runs batches over the KV pool: S/2-1-sglang-serve-and-the-three-processes.md:22
- Detokenizer turns ids back to text: S/2-1-sglang-serve-and-the-three-processes.md:24
- Model on GPU runs the forward pass: S/2-1-sglang-serve-and-the-three-processes.md:26
- KV pool stores slots per token: S/3-1-kv-bytes-per-token-and-the-kv-pool.md:30

## 请求与检查 (task-table)

原始区块：Requests and checks (task-table, 8 rows)
- POST /generate native request: S/1-2-one-request-end-to-end.md:24
- POST /v1/chat/completions OpenAI format: S/2-5-streaming-stop-strings-and-the-openai-api.md:20
- meta_info field cached_tokens: S/2-5-streaming-stop-strings-and-the-openai-api.md:30
- /ready readiness probe: S/7-1-operating-sglang.md:12
- --random-range-ratio 1.0: S/5-1-sglang-benchmark-serving.md:40
- --max-concurrency 8: S/5-1-sglang-benchmark-serving.md:44
- --request-rate for fixed arrivals: S/5-1-sglang-benchmark-serving.md:70
- test_deterministic with --n-trials and --test-mode: S/4-6-deterministic-inference-and-logprobs.md:50

## 捕获工具与审计命令 (command-table)

原始区块：Kit and audit commands (command-table, 4 rows)
- python3 capture/run.py --check: R/README.md:46
- python3 capture/run.py --only small-pool: C/README.md:14
- SGLANG_KIT_PROFILE=gb10 python3 capture/gpu/run.py: C/README.md:52
- node scripts/audit_manuals.js --manual sglang-101, TOTAL 0: R/README.md:61

## 关键默认值 (defaults)

原始区块：Defaults that matter (defaults, 7 rows)
- --schedule-policy fcfs: S/2-2-the-scheduler-loop-and-schedule-policy.md:60
- --schedule-conservativeness 1.0: S/2-3-admission-and-retraction.md:22
- --radix-eviction-policy lru: S/3-5-eviction-policies-and-hicache.md:18
- --kv-cache-dtype auto: S/3-1-kv-bytes-per-token-and-the-kv-pool.md:70
- --stream-interval 1: S/2-5-streaming-stop-strings-and-the-openai-api.md:60
- --tp-size 1: S/6-1-tp-size-dp-size-and-attn-dp-size.md:20
- --cache-threshold 0.3: S/6-4-sgl-model-gateway.md:50

## 修正这些错误 (troubleshooting)

原始区块：Fix these errors (troubleshooting, 7 rows)
- [METAL] Command buffer execution failed, 87 percent pool, 0.4 fix: S/3-2-mem-fraction-static-and-startup-sizing.md:20, 60
- Median TTFT near 28 s, admission queue: S/2-3-admission-and-retraction.md:70
- KV cache pool is full. Retract requests. with max_new_tokens: S/2-3-admission-and-retraction.md:95
- The memory capacity is unbalanced, no flag disables it: S/6-1-tp-size-dp-size-and-attn-dp-size.md:150
- cuda graph: False under load, --cuda-graph-max-bs-decode: S/4-1-forwardmode-and-cuda-graphs.md:70
- ambiguous option --cuda-graph-max-bs, split flags: S/4-1-forwardmode-and-cuda-graphs.md:160
- #cached-token: 0 with random ID at start: S/3-4-prefix-friendly-prompts.md:10

## 按此顺序调优 (flow)

原始区块：Tune in this order (flow, 6 steps)
- Measure at three caps with --random-range-ratio 1.0: S/7-1-operating-sglang.md:80, S/5-1-sglang-benchmark-serving.md:40
- Set --mem-fraction-static on shared machines: S/7-1-operating-sglang.md:82
- Shared text first, no request ID at start: S/7-1-operating-sglang.md:84
- Cap --max-running-requests at the knee: S/7-1-operating-sglang.md:86
- Change kernels one at a time, graph and attention: S/7-1-operating-sglang.md:88
- Add --tp-size or --dp-size when one replica saturates: S/6-1-tp-size-dp-size-and-attn-dp-size.md:20

## 应监控的指标 (concepts)

原始区块：Numbers to watch (concepts, 5 bullets)
- sglang:token_usage near 1.0: S/5-2-the-metrics-endpoint.md:40
- sglang:num_queue_reqs above 0 for minutes: S/5-2-the-metrics-endpoint.md:60
- sglang:cache_hit_rate and sglang:prefill_effective_tokens_total: S/5-2-the-metrics-endpoint.md:30, 50
- cached_tokens reused prompt tokens: S/2-5-streaming-stop-strings-and-the-openai-api.md:30
- Goodput meets TTFT and TPOT together: S/1-1-what-a-serving-engine-owns.md:30

## 已记录的事故 (concepts)

原始区块：Incidents on record (concepts, 4 bullets)
- Issue #36889 Mamba cap to 2: S/2-2-the-scheduler-loop-and-schedule-policy.md:150
- Issue #17411 FlashInfer Hopper seven times slower: S/4-2-attention-backend.md:10
- Issue #5274 EAGLE-3 concurrency 20: S/4-4-speculative-decoding.md:10
- Issue #35129 hash removal 66.8 to 94.4 percent: S/3-4-prefix-friendly-prompts.md:60

## 术语表 (glossary)

原始区块：Glossary (glossary, 5 bullets)
- ITL inter-token latency: S/1-1-what-a-serving-engine-owns.md:30
- MLA multi-head latent attention: S/3-1-kv-bytes-per-token-and-the-kv-pool.md:50
- MoE mixture of experts: S/6-2-moe-serving-deepep-and-eplb.md:10
- EPLB expert placement load balancing: S/6-2-moe-serving-deepep-and-eplb.md:60
- PD prefill-decode disaggregation: S/6-3-prefill-decode-disaggregation.md:10

## 问答 (qa)

原始区块：Questions (qa, 3 bullets)
- Tokenizer process first when idle GPU: S/2-1-sglang-serve-and-the-three-processes.md:70
- Pool never full at 64 users: S/3-2-mem-fraction-static-and-startup-sizing.md:180
- Pin a tag such as v0.5.22, not latest: S/7-1-operating-sglang.md:10

## 提示 (tips)

原始区块：Tips (tips, 4 bullets)
- --enable-cache-report and --enable-metrics at start: S/2-5-streaming-stop-strings-and-the-openai-api.md:30, S/5-2-the-metrics-endpoint.md:10
- Pool size in the startup log: S/2-1-sglang-serve-and-the-three-processes.md:40
- SIGTERM to the main process only: S/7-1-operating-sglang.md:120
- SGLANG_ENABLE_HEALTH_ENDPOINT_GENERATION=false: S/7-1-operating-sglang.md:14
