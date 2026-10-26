# 实验记录

> 本节记录每项测量所用的硬件、软件版本、随机种子、GPU 时钟，以及完整数据表。

可在此核对其他章节的数值，或按相同条件重跑。

## 测量方法 {#s-ref-lab-notes-method}

- **硬件和版本。** [版本固定信息](#s-ref-version-pins)列出了详细信息。
- **客户端。** 每次测试都使用 SGLang 0.5.22 benchmark client。vLLM 测试传入 `--backend vllm`，让客户端将请求发送到 `/v1/completions`。客户端先发送一个预热请求，并要求服务器忽略 end-of-sequence token；除非你传入 `--disable-ignore-eos`。它会随机裁剪或重复真实聊天文本，以达到要求的长度。[Benchmark 章节](#s-benchmark-your-server-in-15-minutes)列出了完整命令。
- **Waves。** Waves 负载由 16 个用户发送 64 个 prompt。长度比例控制 prompt 和输出长度的变化范围。比例为 1.0 时，每个请求都使用 512 个 prompt token 和 128 个输出 token；比例为 0 时，每个长度都会在 1 到对应上限之间随机抽取。
- **种子。** 截至 2026-10-21 的测试使用种子 1、2、3。2026-10-22 的大多数测试使用种子 1 和 2，表中会注明数量。表格列出中位数；部分列还列出最小值和最大值。
- **服务器设置。** 由于 FlashInfer sampler 无法在我们的 L4 上成功构建，sweep 工具启动每个 vLLM server 时都会设置 `VLLM_USE_FLASHINFER_SAMPLER=0`。它还会设置 `--seed 0`、`--max-model-len`、`--num-gpu-blocks-override` 和 `--gpu-memory-utilization`。L4 使用 8,192 个 token、1,506 个 block 和 0.9。GB10 使用 8,192 个 token、14,685 个 block 和 0.75。共享 L4 GPU 使用 2,048 或 2,304 个 token、183 个 block 和 0.83。小池测试使用 4,096 个 token和410个block。
- **舍入。** 表格与正文使用同一规则：将汇总文件中的小数四舍五入，半数向上取整，因此 1,012.5 显示为 1,013。
- **Block pool。** 在 L4 上，vLLM 使用 `--num-gpu-blocks-override 1506`，池容量为 24,096 个 token；SGLang 为 24,094 个。在 GB10 上，vLLM 使用 14,685 个 block，池容量为 234,960 个 token。GB10 上 SGLang 的池容量分别为：load 负载 233,303 个 token、waves 负载 234,958 个、mixed 负载 251,910 个。
- **时钟。** Sampler 每秒记录一次 SM clock 和温度。每次测试前，sweep 工具可以等待 GPU 降温；如果时钟中位数低于本次 sweep 设定的 clock floor（最低时钟），工具也会重跑。表中的 clock 列显示各测试点的结果。2026-10-22 的大多数测试通过 `nvidia-smi -lgc` 将 SM clock 锁定在 900 MHz。锁定值是最高时钟，但 GPU 温度较高时仍会降频。正文只比较时钟相近的测试点；如果某点低于锁定值或处于降频状态，会明确说明。
- **日期。** L4 上 `vllm` 和 `sglang` 的 load 测试于 2026-10-17 运行；`vllm-b`、`vllm-async`、`vllm-eager` 和 `vllm-seqs-16` 的 load 测试于 2026-10-21 运行。L4 上的 rate 和 waves 测试于 2026-10-18 运行。L4 上开启 prefix cache 的测试从 2026-10-17 持续到 2026-10-18；关闭 prefix cache 的测试于 2026-10-21 运行。表中所有 GB10 测试都在 2026-10-21 运行。L4 上三张日期为 2026-10-22 的表格，所有测试都在当天运行。L4 节点的共享 GPU 池容量为 2,928 个 token，因此只测试了 1 和 4 个用户。

- **不同用户数测试之间的 cache。** 2026-10-23 之前的 load 表格为每个配置保持同一 server，并且没有在不同用户数测试之间重置 prefix cache。每个种子在每个用户数下都发送相同的首批 prompt。因此，用户数低于 32 时，L4 上 vLLM 的首 token 时间被 cache 加速了 3.6 到 5.3 倍。2026-10-23 的重测会在每次运行前重置 cache；[benchmark 章节](#s-benchmark-your-server-in-15-minutes)对比了两组结果。
- **2026-10-23 的测试。** 当天的 L4 测试使用第一块 GPU，并将时钟锁定在 900 MHz。每项测试使用两个种子，并先重置 cache。显卡温度较高，许多测试仍低于锁定频率。每份证据文件都记录该文件各行的时钟中位数；正文只比较运行在 900 MHz 的数据。

## 尚未运行的测试 {#s-ref-lab-notes-not-run-yet}

以下测试尚未运行，因此不在这些表格中：

- 在 L4 的混合 prompt 上测试 `--max-num-batched-tokens` 为 512、2048 和 16384。GB10 上有 2048 和 16384 的结果。
- 在 L4 上测试 `-O1`。
- 使用同一种 KV 数据类型对比不同 backend。

## 数据表 {#s-ref-lab-notes-tables}

配置 `vllm-async` 会传入 `--async-scheduling`。对于这些未启用 speculation 的模型，该功能本来就是默认设置，因此在两台机器上，`vllm-async` 都是基线设置的重复测试。

### L4：并发负载，prompt 512 token、输出 128 token {#s-ref-lab-notes-l4-load-users-at-once-512-prompt-and-128-output-tokens}

| 并发用户数 | 配置 | 输出 tok/s（最小值到最大值） | TTFT 中位数 | TPOT 中位数 | P99 ITL（最小值到最大值） | SM clock 中位数 |
|---|---|---|---|---|---|---|
| 1 | `vllm` | 13.5 (13.5 to 13.5) | 192 ms | 60.4 ms | 105 (104 to 105) ms | 1,290 MHz |
| 1 | `sglang` | 13.8 (13.7 to 14.1) | 185 ms | 60.2 ms | 104 (104 to 104) ms | 1,290 MHz |
| 1 | `vllm-b` | 13.5 (13.1 to 13.8) | 191 ms | 60.4 ms | 105 (104 to 105) ms | 1,275 MHz |
| 1 | `vllm-async` | 13.3 (13.1 to 13.6) | 191 ms | 60.4 ms | 105 (104 to 105) ms | 1,268 MHz |
| 1 | `vllm-eager` | 13.2 (13.1 to 13.4) | 190 ms | 61.1 ms | 107 (107 to 107) ms | 1,290 MHz |
| 1 | `vllm-seqs-16` | 13.4 (13.1 to 13.6) | 190 ms | 60.4 ms | 105 (105 to 105) ms | 1,275 MHz |
| 2 | `vllm` | 31.3 (31.3 to 31.3) | 132 ms | 63.4 ms | 64 (64 to 64) ms | 1,500 MHz |
| 2 | `sglang` | 31.2 (31.2 to 31.2) | 116 ms | 63.7 ms | 65 (65 to 65) ms | 1,500 MHz |
| 2 | `vllm-b` | 31.3 (31.3 to 31.3) | 132 ms | 63.4 ms | 64 (64 to 64) ms | 1,500 MHz |
| 2 | `vllm-async` | 31.3 (31.3 to 31.3) | 132 ms | 63.4 ms | 64 (64 to 64) ms | 1,500 MHz |
| 2 | `vllm-eager` | 30.8 (30.7 to 30.8) | 141 ms | 64.5 ms | 65 (65 to 65) ms | 1,515 MHz |
| 2 | `vllm-seqs-16` | 31.3 (31.3 to 31.3) | 132 ms | 63.4 ms | 65 (64 to 65) ms | 1,500 MHz |
| 4 | `vllm` | 61.8 (61.8 to 61.8) | 141 ms | 64.1 ms | 65 (65 to 65) ms | 1,515 MHz |
| 4 | `sglang` | 61.6 (61.5 to 61.6) | 137 ms | 64.4 ms | 67 (65 to 67) ms | 1,530 MHz |
| 4 | `vllm-b` | 61.8 (61.8 to 61.8) | 142 ms | 64.1 ms | 65 (65 to 66) ms | 1,560 MHz |
| 4 | `vllm-async` | 61.8 (61.8 to 61.8) | 141 ms | 64.1 ms | 65 (65 to 65) ms | 1,515 MHz |
| 4 | `vllm-eager` | 60.7 (60.7 to 60.7) | 143 ms | 65.3 ms | 66 (66 to 66) ms | 1,560 MHz |
| 4 | `vllm-seqs-16` | 61.6 (61.3 to 61.6) | 142 ms | 64.3 ms | 65 (65 to 66) ms | 1,515 MHz |
| 8 | `vllm` | 112.8 (112.8 to 112.9) | 253 ms | 65.8 ms | 68 (68 to 70) ms | 1,470 MHz |
| 8 | `sglang` | 112.5 (112.4 to 112.6) | 170 ms | 66.1 ms | 71 (70 to 73) ms | 1,485 MHz |
| 8 | `vllm-b` | 112.8 (112.7 to 112.8) | 253 ms | 65.8 ms | 67 (67 to 68) ms | 1,485 MHz |
| 8 | `vllm-async` | 112.7 (112.6 to 112.8) | 261 ms | 65.8 ms | 67 (67 to 68) ms | 1,500 MHz |
| 8 | `vllm-eager` | 111.2 (111.2 to 111.4) | 206 ms | 67.0 ms | 68 (68 to 68) ms | 1,515 MHz |
| 8 | `vllm-seqs-16` | 112.5 (112.4 to 112.6) | 260 ms | 65.9 ms | 67 (67 to 67) ms | 1,485 MHz |
| 16 | `vllm` | 200.9 (200.5 to 201.2) | 289 ms | 69.5 ms | 80 (80 to 105) ms | 1,425 MHz |
| 16 | `sglang` | 201.1 (201.1 to 201.2) | 212 ms | 70.1 ms | 81 (81 to 82) ms | 1,470 MHz |
| 16 | `vllm-b` | 201.3 (200.9 to 201.3) | 288 ms | 69.5 ms | 85 (81 to 89) ms | 1,455 MHz |
| 16 | `vllm-async` | 201.4 (200.8 to 201.5) | 284 ms | 69.5 ms | 85 (79 to 87) ms | 1,425 MHz |
| 16 | `vllm-eager` | 198.4 (198.2 to 198.4) | 278 ms | 71.1 ms | 80 (80 to 85) ms | 1,455 MHz |
| 16 | `vllm-seqs-16` | 200.9 (200.6 to 201.1) | 288 ms | 69.7 ms | 80 (79 to 86) ms | 1,440 MHz |
| 32 | `vllm` | 273.9 (273.8 to 274.4) | 1,813 ms | 102.2 ms | 619 (612 to 622) ms | 1,275 MHz |
| 32 | `sglang` | 271.3 (270.3 to 272.2) | 2,871 ms | 96.8 ms | 102 (102 to 103) ms | 1,320 MHz |
| 32 | `vllm-b` | 275.1 (274.8 to 275.2) | 1,800 ms | 101.8 ms | 613 (608 to 614) ms | 1,275 MHz |
| 32 | `vllm-async` | 275.3 (273.8 to 275.3) | 1,807 ms | 102.1 ms | 613 (611 to 619) ms | 1,275 MHz |
| 32 | `vllm-eager` | 273.2 (272.4 to 273.3) | 1,768 ms | 103.1 ms | 600 (595 to 601) ms | 1,313 MHz |
| 32 | `vllm-seqs-16` | 171.8 (171.3 to 172.5) | 12,330 ms | 81.1 ms | 595 (587 to 603) ms | 1,365 MHz |
| 64 | `vllm` | 241.4 (241.4 to 246.4) | 10,953 ms | 129.2 ms | 1,363 (1,204 to 1,436) ms | 1,013 MHz |
| 64 | `sglang` | 256.6 (255.8 to 260.5) | 18,356 ms | 106.2 ms | 114 (114 to 118) ms | 1,215 MHz |
| 64 | `vllm-b` | 242.3 (242.0 to 243.8) | 11,181 ms | 129.2 ms | 1,233 (1,187 to 1,437) ms | 1,005 MHz |
| 64 | `vllm-async` | 242.0 (241.2 to 253.3) | 11,087 ms | 128.2 ms | 1,127 (1,116 to 1,423) ms | 998 MHz |
| 64 | `vllm-eager` | 242.5 (241.3 to 245.6) | 10,941 ms | 131.4 ms | 1,326 (1,270 to 1,427) ms | 1,020 MHz |
| 64 | `vllm-seqs-16` | 138.1 (136.9 to 139.4) | 39,890 ms | 103.7 ms | 1,143 (1,086 to 1,282) ms | 630 MHz |

### L4：请求率，prompt 512 token、输出 128 token {#s-ref-lab-notes-l4-rate-requests-each-second-512-prompt-and-128-output-tokens}

| 请求率 | 配置 | 输出 tok/s（最小值到最大值） | TTFT 中位数 | TPOT 中位数 | P99 ITL（最小值到最大值） | SM clock 中位数 |
|---|---|---|---|---|---|---|
| 0.5 | `vllm` | 70.6 (67.2 to 92.3) | 317 ms | 72.7 ms | 214 (208 to 215) ms | 1,485 MHz |
| 0.5 | `sglang` | 70.6 (67.2 to 92.3) | 284 ms | 74.7 ms | 235 (234 to 235) ms | 1,485 MHz |
| 1 | `vllm` | 123.6 (118.4 to 154.5) | 180 ms | 68.2 ms | 77 (77 to 79) ms | 1,485 MHz |
| 1 | `sglang` | 123.3 (118.4 to 153.6) | 166 ms | 74.0 ms | 114 (113 to 166) ms | 1,500 MHz |
| 2 | `vllm` | 227.8 (216.5 to 231.8) | 233 ms | 88.7 ms | 355 (351 to 358) ms | 1,418 MHz |
| 2 | `sglang` | 226.3 (215.5 to 230.1) | 221 ms | 99.9 ms | 387 (384 to 429) ms | 1,433 MHz |
| 4 | `vllm` | 286.6 (283.7 to 291.7) | 8,304 ms | 126.9 ms | 621 (620 to 627) ms | 1,245 MHz |
| 4 | `sglang` | 257.5 (254.9 to 259.7) | 9,575 ms | 115.1 ms | 680 (383 to 811) ms | 1,350 MHz |
| 8 | `vllm` | 261.8 (259.4 to 264.3) | 27,510 ms | 126.0 ms | 1,184 (1,089 to 1,361) ms | 1,035 MHz |
| 8 | `sglang` | 253.9 (250.7 to 260.7) | 37,211 ms | 105.2 ms | 277 (259 to 317) ms | 1,215 MHz |
| 16 | `vllm` | 205.8 (204.8 to 208.4) | 94,322 ms | 185.2 ms | 1,448 (1,448 to 1,483) ms | 450 MHz |
| 16 | `sglang` | 218.2 (215.6 to 229.0) | 97,542 ms | 115.2 ms | 137 (120 to 163) ms | 600 MHz |

### L4：waves 负载，16 个用户发送 64 个 prompt，按长度比例分组（1.0 表示长度相同）{#s-ref-lab-notes-l4-waves-64-prompts-at-16-users-by-length-ratio-1-0-means-equal}

| 长度比例 | 配置 | 输出 tok/s（最小值到最大值） | TTFT 中位数 | TPOT 中位数 | P99 ITL（最小值到最大值） | SM clock 中位数 |
|---|---|---|---|---|---|---|
| 0 | `vllm` | 174.4 (164.1 to 195.0) | 284 ms | 75.0 ms | 202 (180 to 215) ms | 1,493 MHz |
| 0 | `sglang` | 158.2 (146.7 to 176.9) | 283 ms | 86.7 ms | 302 (287 to 305) ms | 1,485 MHz |
| 0.5 | `vllm` | 169.6 (165.2 to 173.4) | 353 ms | 81.4 ms | 191 (189 to 219) ms | 1,455 MHz |
| 0.5 | `sglang` | 159.6 (155.8 to 162.0) | 325 ms | 87.8 ms | 363 (360 to 370) ms | 1,470 MHz |
| 1 | `vllm` | 181.7 (181.7 to 182.8) | 1,499 ms | 76.8 ms | 502 (500 to 503) ms | 1,410 MHz |
| 1 | `sglang` | 182.3 (181.5 to 182.7) | 1,775 ms | 74.7 ms | 81 (79 to 81) ms | 1,440 MHz |

### L4：prefix cache，4 组各含 16 个 prompt，共享前缀 token 数；8 个用户 {#s-ref-lab-notes-l4-prefix-shared-prefix-tokens-4-groups-of-16-prompts-8-users}

| 共享前缀 token 数 | 配置 | 输出 tok/s（最小值到最大值） | TTFT 中位数 | TPOT 中位数 | P99 ITL（最小值到最大值） | SM clock 中位数 |
|---|---|---|---|---|---|---|
| 0 | `vllm` | 113.8 (113.7 to 114.3) | 408 ms | 65.2 ms | 134 (69 to 167) ms | 1,485 MHz |
| 0 | `vllm-no-prefix-cache` | 113.6 (113.5 to 114.3) | 392 ms | 65.3 ms | 135 (129 to 173) ms | 1,485 MHz |
| 0 | `sglang` | 113.5 (113.5 to 113.5) | 354 ms | 66.1 ms | 72 (72 to 75) ms | 1,485 MHz |
| 256 | `vllm` | 111.5 (111.4 to 111.7) | 488 ms | 64.8 ms | 127 (66 to 129) ms | 1,485 MHz |
| 256 | `vllm-no-prefix-cache` | 99.1 (99.0 to 99.6) | 753 ms | 70.2 ms | 323 (255 to 379) ms | 1,463 MHz |
| 256 | `sglang` | 110.9 (110.8 to 111.2) | 470 ms | 67.2 ms | 72 (72 to 72) ms | 1,485 MHz |
| 1,024 | `vllm` | 106.0 (105.7 to 106.8) | 396 ms | 68.9 ms | 189 (73 to 190) ms | 1,455 MHz |
| 1,024 | `vllm-no-prefix-cache` | 70.9 (70.9 to 71.0) | 1,213 ms | 94.9 ms | 602 (598 to 604) ms | 1,410 MHz |
| 1,024 | `sglang` | 105.7 (103.2 to 105.8) | 466 ms | 66.8 ms | 73 (73 to 73) ms | 1,485 MHz |
| 2,048 | `vllm` | 100.2 (99.5 to 100.9) | 410 ms | 72.3 ms | 151 (128 to 165) ms | 1,455 MHz |
| 2,048 | `vllm-no-prefix-cache` | 46.6 (46.2 to 46.7) | 2,550 ms | 119.8 ms | 1,026 (961 to 1,049) ms | 1,035 MHz |
| 2,048 | `sglang` | 100.4 (99.6 to 102.5) | 441 ms | 70.5 ms | 151 (74 to 153) ms | 1,455 MHz |
| 4,096 | `vllm` | 86.8 (85.6 to 89.4) | 375 ms | 80.8 ms | 230 (140 to 232) ms | 1,410 MHz |
| 4,096 | `vllm-no-prefix-cache` | 19.6 (19.5 to 19.7) | 13,353 ms | 192.9 ms | 1,579 (1,531 to 1,589) ms | 675 MHz |
| 4,096 | `sglang` | 88.4 (88.3 to 88.9) | 474 ms | 75.6 ms | 162 (82 to 214) ms | 1,440 MHz |

### L4：降频会话，prompt 512 token、输出 128 token，2026-10-22 {#s-ref-lab-notes-l4-throttled-session-512-prompt-and-128-output-tokens-2026-10-22}

这次测试中，GPU 的时钟远低于满载频率。只在时钟相近时比较这些数据。

| 并发用户数 | 配置 | 输出 tok/s（最小值到最大值） | TTFT 中位数 | TPOT 中位数 | P99 ITL（最小值到最大值） | SM clock 中位数 | Seeds |
|---|---|---|---|---|---|---|---|
| 1 | `vllm-fast-b` | 10.6 (10.4 to 10.7) | 705 ms | 104.1 ms | 105 (105 to 105) ms | 210 MHz | 3 |
| 1 | `vllm-O0` | 10.5 (10.4 to 10.6) | 707 ms | 106.5 ms | 107 (107 to 107) ms | 210 MHz | 2 |
| 1 | `vllm-O3` | 10.6 (10.5 to 10.7) | 705 ms | 104.2 ms | 105 (105 to 105) ms | 210 MHz | 2 |
| 1 | `vllm-kv-fp8-triton` | 10.8 (10.6 to 10.9) | 717 ms | 101.8 ms | 102 (102 to 102) ms | 210 MHz | 2 |
| 32 | `vllm-fast-b` | 186.7 (185.4 to 187.1) | 4,181 ms | 142.7 ms | 1,705 (1,424 to 1,789) ms | 450 MHz | 3 |
| 32 | `vllm-O0` | 191.5 (191.0 to 192.1) | 4,051 ms | 142.0 ms | 1,459 (1,354 to 1,565) ms | 548 MHz | 2 |
| 32 | `vllm-O3` | 189.9 (188.5 to 191.2) | 4,086 ms | 143.9 ms | 1,602 (1,417 to 1,787) ms | 536 MHz | 2 |
| 32 | `vllm-kv-fp8-triton` | 192.0 (183.3 to 200.7) | 4,267 ms | 138.0 ms | 1,672 (1,603 to 1,741) ms | 480 MHz | 2 |

### L4：锁定 900 MHz，prompt 512 token、输出 128 token，2026-10-22 {#s-ref-lab-notes-l4-clock-locked-at-900-mhz-512-prompt-and-128-output-tokens-2026}

时钟锁定值是最高频率。GPU 温度较高时，运行频率仍可能低于此值；`vllm-lock-b` 和 `vllm-lock-small-pool` 的单用户测试就是例子。

| 并发用户数 | 配置 | 输出 tok/s（最小值到最大值） | TTFT 中位数 | TPOT 中位数 | P99 ITL（最小值到最大值） | SM clock 中位数 | Seeds |
|---|---|---|---|---|---|---|---|
| 1 | `vllm-lock-b` | 11.2 (10.9 to 11.5) | 554 ms | 99.0 ms | 105 (105 to 105) ms | 210 MHz | 2 |
| 1 | `vllm-lock-fp8` | 25.4 (24.5 to 26.3) | 239 ms | 35.3 ms | 48 (45 to 52) ms | 900 MHz | 2 |
| 1 | `vllm-lock-eagle3-k1` | 22.4 (21.7 to 23.1) | 240 ms | 39.4 ms | 100 (84 to 115) ms | 900 MHz | 2 |
| 1 | `vllm-lock-eagle3-k3` | 31.3 (31.2 to 31.4) | 255 ms | 27.8 ms | 78 (78 to 78) ms | 900 MHz | 2 |
| 1 | `vllm-lock-eagle3-k5` | 31.7 (30.6 to 32.9) | 267 ms | 26.2 ms | 110 (83 to 136) ms | 900 MHz | 2 |
| 1 | `vllm-lock-small-pool` | 11.6 (10.9 to 12.3) | 449 ms | 82.6 ms | 105 (105 to 105) ms | 281 MHz | 2 |
| 32 | `vllm-lock-b` | 208.8 (206.8 to 210.8) | 3,090 ms | 119.9 ms | 1,406 (1,390 to 1,422) ms | 881 MHz | 2 |
| 32 | `vllm-lock-fp8` | 284.7 (272.3 to 297.1) | 2,862 ms | 83.8 ms | 1,143 (1,027 to 1,260) ms | 900 MHz | 2 |
| 32 | `vllm-lock-eagle3-k1` | 271.1 (261.2 to 281.0) | 1,004 ms | 100.4 ms | 818 (784 to 852) ms | 900 MHz | 2 |
| 32 | `vllm-lock-eagle3-k3` | 333.6 (327.8 to 339.5) | 890 ms | 77.8 ms | 771 (763 to 780) ms | 900 MHz | 2 |
| 32 | `vllm-lock-eagle3-k5` | 289.5 (280.4 to 298.5) | 1,071 ms | 83.7 ms | 915 (836 to 995) ms | 885 MHz | 2 |
| 32 | `vllm-lock-small-pool` | 80.4 (79.8 to 81.1) | 31,568 ms | 120.6 ms | 768 (765 to 771) ms | 248 MHz | 2 |

### L4：共享 GPU，block pool 容量为 2,928 token，prompt 512、输出 128 token，2026-10-22 {#s-ref-lab-notes-l4-shared-gpu-with-a-pool-of-2-928-tokens-512-prompt-and-128-out}

| 并发用户数 | 配置 | 输出 tok/s（最小值到最大值） | TTFT 中位数 | TPOT 中位数 | P99 ITL（最小值到最大值） | SM clock 中位数 | Seeds |
|---|---|---|---|---|---|---|---|
| 1 | `vllm-fast-b` | 4.0 (3.9 to 4.0) | 1,437 ms | 241.7 ms | 274 (255 to 293) ms | 375 MHz | 2 |
| 1 | `vllm-ngram` | 7.4 (7.3 to 7.5) | 1,428 ms | 76.6 ms | 284 (277 to 291) ms | 413 MHz | 2 |
| 1 | `vllm-no-async` | 3.9 (3.8 to 3.9) | 1,467 ms | 249.6 ms | 283 (258 to 307) ms | 368 MHz | 2 |
| 4 | `vllm-fast-b` | 13.0 (13.0 to 13.1) | 4,945 ms | 272.6 ms | 290 (286 to 295) ms | 428 MHz | 2 |
| 4 | `vllm-ngram` | 19.2 (18.8 to 19.7) | 1,925 ms | 101.3 ms | 1,691 (1,669 to 1,713) ms | 443 MHz | 2 |
| 4 | `vllm-no-async` | 12.9 (12.9 to 12.9) | 4,690 ms | 277.2 ms | 309 (309 to 309) ms | 450 MHz | 1 |

### GB10：并发负载 {#s-ref-lab-notes-gb10-load}

| 并发用户数 | 配置 | 输出 tok/s（最小值到最大值） | TTFT 中位数 | TPOT 中位数 | P99 ITL（最小值到最大值） | SM clock 中位数 |
|---|---|---|---|---|---|---|
| 1 | `vllm` | 29.5 (29.3 to 29.5) | 257 ms | 32.3 ms | 35 (34 to 42) ms | 2,411 MHz |
| 1 | `vllm-eager` | 28.0 (28.0 to 28.2) | 249 ms | 33.9 ms | 37 (36 to 43) ms | 2,411 MHz |
| 1 | `vllm-async` | 29.2 (29.2 to 29.4) | 255 ms | 32.5 ms | 35 (35 to 43) ms | 2,411 MHz |
| 1 | `sglang` | 29.4 (29.1 to 29.8) | 270 ms | 32.0 ms | 35 (34 to 42) ms | 2,411 MHz |
| 2 | `vllm` | 44.7 (44.5 to 45.0) | 151 ms | 44.0 ms | 49 (47 to 55) ms | 2,411 MHz |
| 2 | `vllm-eager` | 42.3 (42.1 to 42.6) | 145 ms | 46.5 ms | 51 (50 to 53) ms | 2,411 MHz |
| 2 | `vllm-async` | 44.2 (44.1 to 44.5) | 154 ms | 44.4 ms | 48 (48 to 56) ms | 2,411 MHz |
| 2 | `sglang` | 44.6 (44.4 to 45.2) | 72 ms | 44.6 ms | 49 (48 to 56) ms | 2,411 MHz |
| 4 | `vllm` | 57.1 (56.5 to 57.2) | 250 ms | 69.2 ms | 76 (76 to 77) ms | 2,411 MHz |
| 4 | `vllm-eager` | 55.3 (54.9 to 55.4) | 245 ms | 71.4 ms | 78 (78 to 78) ms | 2,411 MHz |
| 4 | `vllm-async` | 56.1 (55.6 to 56.1) | 256 ms | 70.6 ms | 77 (77 to 78) ms | 2,411 MHz |
| 4 | `sglang` | 57.7 (57.6 to 58.1) | 115 ms | 69.5 ms | 79 (75 to 82) ms | 2,411 MHz |
| 8 | `vllm` | 75.7 (71.8 to 78.7) | 378 ms | 99.9 ms | 115 (115 to 117) ms | 2,411 MHz |
| 8 | `vllm-eager` | 72.8 (68.9 to 75.4) | 337 ms | 104.7 ms | 121 (121 to 123) ms | 2,411 MHz |
| 8 | `vllm-async` | 74.9 (71.1 to 77.8) | 441 ms | 101.2 ms | 117 (117 to 118) ms | 2,411 MHz |
| 8 | `sglang` | 75.5 (72.3 to 78.7) | 214 ms | 101.3 ms | 117 (117 to 121) ms | 2,411 MHz |
| 16 | `vllm` | 101.1 (100.1 to 103.9) | 529 ms | 153.9 ms | 228 (179 to 235) ms | 2,411 MHz |
| 16 | `vllm-eager` | 98.8 (97.7 to 101.1) | 541 ms | 158.2 ms | 216 (175 to 239) ms | 2,411 MHz |
| 16 | `vllm-async` | 99.8 (99.0 to 102.7) | 555 ms | 156.3 ms | 226 (176 to 230) ms | 2,411 MHz |
| 16 | `sglang` | 103.4 (102.4 to 106.7) | 258 ms | 152.2 ms | 164 (163 to 169) ms | 2,411 MHz |
| 32 | `vllm` | 154.1 (152.1 to 154.8) | 644 ms | 198.2 ms | 478 (472 to 479) ms | 2,411 MHz |
| 32 | `vllm-eager` | 149.1 (131.4 to 150.9) | 659 ms | 204.2 ms | 474 (465 to 474) ms | 2,411 MHz |
| 32 | `vllm-async` | 150.2 (148.1 to 150.7) | 644 ms | 203.4 ms | 477 (473 to 479) ms | 2,411 MHz |
| 32 | `sglang` | 154.6 (152.4 to 155.9) | 401 ms | 195.9 ms | 220 (216 to 220) ms | 2,411 MHz |
| 64 | `vllm` | 239.3 (236.3 to 244.7) | 965 ms | 243.8 ms | 528 (510 to 529) ms | 2,398 MHz |
| 64 | `vllm-eager` | 237.5 (232.9 to 240.0) | 774 ms | 248.0 ms | 509 (501 to 511) ms | 2,398 MHz |
| 64 | `vllm-async` | 235.9 (233.2 to 240.2) | 961 ms | 249.1 ms | 527 (524 to 529) ms | 2,398 MHz |
| 64 | `sglang` | 245.1 (239.4 to 247.7) | 573 ms | 246.0 ms | 271 (268 to 273) ms | 2,411 MHz |

### GB10：混合负载，prompt 1,024 至 4,096 token、输出 64 至 256 token，按请求率分组 {#s-ref-lab-notes-gb10-mixed-prompts-of-1-024-to-4-096-tokens-64-to-256-output-tok}

| 请求率 | 配置 | 输出 tok/s（最小值到最大值） | TTFT 中位数 | TPOT 中位数 | P99 ITL（最小值到最大值） | SM clock 中位数 |
|---|---|---|---|---|---|---|
| 0.5 | `vllm` | 72.3 (59.0 to 72.7) | 1,135 ms | 148.5 ms | 571 (486 to 588) ms | 2,398 MHz |
| 0.5 | `vllm-mnbt-2048` | 72.0 (58.8 to 72.6) | 1,145 ms | 149.3 ms | 574 (483 to 594) ms | 2,398 MHz |
| 0.5 | `vllm-mnbt-16384` | 72.5 (59.3 to 73.1) | 906 ms | 139.4 ms | 798 (685 to 799) ms | 2,398 MHz |
| 0.5 | `sglang` | 70.9 (58.1 to 71.1) | 841 ms | 170.1 ms | 922 (811 to 925) ms | 2,411 MHz |
| 1 | `vllm` | 107.8 (96.9 to 112.8) | 462 ms | 155.1 ms | 417 (181 to 432) ms | 2,411 MHz |
| 1 | `vllm-mnbt-2048` | 107.8 (97.4 to 113.0) | 454 ms | 156.5 ms | 405 (187 to 427) ms | 2,411 MHz |
| 1 | `vllm-mnbt-16384` | 107.2 (96.6 to 113.2) | 477 ms | 156.9 ms | 395 (201 to 427) ms | 2,411 MHz |
| 1 | `sglang` | 108.8 (95.6 to 113.7) | 244 ms | 161.9 ms | 219 (179 to 236) ms | 2,411 MHz |
| 2 | `vllm` | 128.8 (123.2 to 135.7) | 584 ms | 204.7 ms | 590 (474 to 615) ms | 2,411 MHz |
| 2 | `vllm-mnbt-2048` | 128.1 (124.0 to 135.7) | 560 ms | 205.5 ms | 587 (477 to 609) ms | 2,411 MHz |
| 2 | `vllm-mnbt-16384` | 127.6 (122.6 to 135.6) | 595 ms | 205.1 ms | 586 (479 to 609) ms | 2,411 MHz |
| 2 | `sglang` | 133.2 (124.8 to 139.8) | 238 ms | 189.8 ms | 261 (234 to 286) ms | 2,411 MHz |

### GB10：waves 负载 {#s-ref-lab-notes-gb10-waves}

| 长度比例 | 配置 | 输出 tok/s（最小值到最大值） | TTFT 中位数 | TPOT 中位数 | P99 ITL（最小值到最大值） | SM clock 中位数 |
|---|---|---|---|---|---|---|
| 0 | `vllm` | 97.0 (93.3 to 97.8) | 476 ms | 154.6 ms | 183 (181 to 184) ms | 2,411 MHz |
| 0 | `vllm-async` | 96.7 (92.9 to 97.5) | 472 ms | 155.5 ms | 191 (182 to 195) ms | 2,411 MHz |
| 0 | `sglang` | 96.6 (93.4 to 97.0) | 324 ms | 155.6 ms | 214 (191 to 225) ms | 2,411 MHz |
| 0.5 | `vllm` | 99.0 (98.9 to 99.7) | 454 ms | 152.7 ms | 188 (182 to 191) ms | 2,411 MHz |
| 0.5 | `vllm-async` | 98.9 (98.8 to 100.3) | 459 ms | 152.5 ms | 183 (182 to 193) ms | 2,411 MHz |
| 0.5 | `sglang` | 99.5 (98.5 to 100.1) | 315 ms | 153.4 ms | 198 (193 to 201) ms | 2,411 MHz |
| 1 | `vllm` | 97.7 (96.3 to 99.6) | 1,185 ms | 157.6 ms | 394 (389 to 402) ms | 2,411 MHz |
| 1 | `vllm-async` | 97.7 (96.9 to 99.7) | 1,212 ms | 157.9 ms | 405 (360 to 411) ms | 2,411 MHz |
| 1 | `sglang` | 101.4 (100.3 to 104.2) | 1,275 ms | 149.7 ms | 159 (159 to 190) ms | 2,411 MHz |

Sources: capture/gpu/summary/l4.json, capture/gpu/summary/gb10.json, capture/gpu/out-l4/, capture/gpu/out-gb10/server-load-vllm.log, capture/gpu/out-l4/load-flushed-vs-unflushed.txt, capture/gpu/out-l4/gsm8k-fp8-accuracy.txt, capture/gpu/out-l4/batch-invariant-cost.txt, capture/gpu/out-l4/admission-cap-64-users.txt, capture/gpu/out-l4/eagle3-long-outputs.txt.
