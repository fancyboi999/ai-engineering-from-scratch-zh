---
id: speculation-on-real-prompts
title: 为什么推测解码赢了基准测试却输在生产环境
card: inference-serving
kind: debug
level: 3
roles: [inference-engineer]
rounds: [debugging, ml-depth]
tags: [speculative-decoding, eagle3, kv-pool, max-running-requests, datasets]
minutes: 10
lessons: []
manuals: [sglang-101#s-speculative-decoding]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---
一位同事在一张 L4 上用 random 数据集测试 Qwen/Qwen3-8B 的 EAGLE-3，看到 8 个用户时每个 token 的时间缩减了一半。但在生产环境中面对 32 个并发对话用户时，输出吞吐量并没有增加，首 token 时间反而变长了。日志里的接受长度看起来一切正常。发生了什么？

## Short answer

有两个原因，而接受长度把两者都掩盖了。在 24 GB 的卡上，draft 权重占用了池空间：KV 池从 24,094 token 降到了 9,951 token，只够装下约 15 个 640 token 的请求，所以 32 个用户时大部分请求在排队等槽位，中位首 token 时间从 2,970 ms 增加到了 8,040 ms。数据集也很关键：在 32 个用户下，EAGLE-3 在 GSM8K 和代码 prompt 上给出了 1.6 倍的输出，而在 random 数据集和 ShareGPT 上输出没有增加，因为 draft 只有在 GPU 有空闲算力可供猜测时才划算。

## Full answer

### L4 上的压测

默认服务器与使用 `Tengyunw/qwen3_8b_eagle3` draft 的 EAGLE-3 服务器对比，每个点三个随机种子，输入 512 token，输出 128 token：

| 并发数 | 默认中位 TPOT | EAGLE-3 中位 TPOT | 默认输出 tok/s | EAGLE-3 输出 tok/s |
|---|---|---|---|---|
| 1 | 60.16 ms | 25.61 ms | 13.42 | 31.81 |
| 8 | 66.01 ms | 35.58 ms | 112.62 | 181.55 |
| 32 | 96.18 ms | 43.82 ms | 270.11 | 269.42 |
| 64 | 107.42 ms | 51.50 ms | 250.85 | 245.34 |

在各个并发数下，每步接受长度都是 2.73 到 2.74 个 token。每个 token 在各个负载下都快了 1.6 到 2.3 倍。但从并发 32 开始，服务器每秒产出的 token 不再多于默认配置。

### 池解释了前半部分

EAGLE-3 服务器的启动日志展示了在小显存卡上加载 draft 的代价。单独的目标模型拥有 24,094 token 的池。加载 draft 之后，池只剩 9,951 token，约合 15 个 640 token 的请求，draft 占用了近 60% 的池空间。池里只能放 15 个请求，其余请求只能等待空位。并发 32 时，EAGLE-3 的中位首 token 时间是 8,040 ms，不开推测解码时是 2,970 ms。

同一行日志还显示 `max_running_requests=48`。未显式设置时，推测解码处理逻辑会设定这个上限，并在首个请求之前打出一条警告。在显存池充沛的 GB10 上，这个上限成了瓶颈：64 个用户时，开启推测解码的吞吐量依然更高（每秒 276.32 对 235.38 个 token），但中位首 token 时间是 7,772 ms 对 557 ms，因为有 16 个请求排在 48 之后。

### 数据集解释了后半部分

该版本的 random 数据集截取或重复 ShareGPT 对话的第一轮至 512 token，并忽略结束 token。手册随后在锁定 900 MHz 且每次运行前清空缓存的条件下，在四个数据集上运行了同样的 L4 压测：

| 数据集 | 8 个用户下中位 TPOT（默认 / EAGLE-3 / NGRAM） | 32 个用户下输出 tok/s（默认 / EAGLE-3 / NGRAM） |
|---|---|---|
| random | 67.6 至 68.2 / 33.8 至 39.4 / 68.2 至 71.4 ms | 250 至 254 / 239 至 242 / 236 至 250 |
| ShareGPT | 66.4 至 68.6 / 39.5 至 43.1 / 69.5 至 72.4 ms | 281 至 288 / 277 至 283 / 245 至 256 |
| GSM8K | 65.5 / 33.3 至 34.3 / 54.6 至 55.0 ms | 397 / 648 至 660 / 433 至 435 |
| code | 65.9 至 66.4 / 36.8 / 58.2 至 58.8 ms | 365 至 366 / 566 至 581 / 377 至 386 |

8 个用户时，EAGLE-3 在每个数据集上都让每 token 时间减少了约一半，接受长度为 2.35 到 2.78。32 个用户时，它在 GSM8K 和 code 上产出了 1.6 倍的输出。在 random 和 ShareGPT 上输出没有增加，首 token 时间变为原来的 2 到 3 倍，因为 draft 占用了排队所需的池空间。NGRAM 只在 GSM8K 和 code 上有帮助，8 个用户时速度约为原来的 1.1 到 1.2 倍，在另外两个数据集上更慢，P99 ITL 为 244 到 779 ms。

### 卡和模型决定表现

在 GB10 上搭配 MoE 模型 Qwen3-30B-A3B 时，同样的特性在各个负载下都保持了增益：每 token 时间缩短为原来的 1/1.56 到 1/1.89，并在 64 个用户时仍给出 1.17 倍的吞吐量。手册的解读是：dense 模型每步都要读全部权重，更大的 batch 已经用满了多余算力；而 MoE 模型每步只读取当前 token 选中的专家，验证阶段能复用已读取的权重对四个位置打分。这个解释仅依据一个模型和一张 GPU 的结果。

其他团队也发现了同样的局限。一项基准测试研究发现，合成 prompt 平均高估了 23% 的推测解码吞吐量，最佳 draft 长度随 batch 增大而降至 1，且随机 token id 在某些层让 20% 到 30% 的专家闲置。2025 年的一项服务基准测试研究观察到，开启推测解码后中位 TPOT 降低至原来的 1/1.3，P99 TPOT 升至 1.16 倍，首 token 时间也更晚，因为 draft 还要跑自己的 prefill。

### 怎么做

1. 读取推测解码服务器的 `KV Cache is allocated` 日志行，与普通服务器对比。
2. 自己显式设置 `--max-running-requests`，取值来自压测证明推测解码依然胜出的并发数。
3. 用你自己的 prompt 和真实输出长度跑基准测试，加上 `--disable-ignore-eos`，并读取上面的 `accept len`。
4. 把 P99 ITL 和 P99 TTFT 放在一起对比，不要只看中位数。
5. 对单副本少数用户的交互式流量开启推测解码；对批处理任务以及池受限显卡上的高并发保持关闭。

## Follow-ups

- **Level 3:** 无论负载如何，日志都显示每步接受 2.73 个 token。为什么这没能预测吞吐量？ Expected: 接受长度只衡量 draft 猜得有多准，不衡量 GPU 是否有多余算力去猜，也不衡量池是否有空间；draft 占用了池空间，队列变长，所以单个 token 变快了，服务器整体吞吐却没有变快。
- **Level 3:** 同事本该读取哪些启动日志？ Expected: 分配的 KV cache 行（9,951 token，不开 draft 时为 24,094），以及未显式设置时推测解码默认设置的 48 个运行中请求上限。
- **Level 4:** 在 GB10 上搭配 Qwen3-30B-A3B 时，收益在 64 个用户下依然保持。为什么 MoE 模型的表现不同？ Expected: dense 模型每步读全部权重，更大的 batch 已经用完了多余算力；MoE 模型只读当前步 token 选中的专家，验证阶段能复用已读权重对四个位置打分，所以保持了 1.56 倍或更高的收益；手册称这是来自一个模型和一张 GPU 的解读。

## Wrong answers

- "接受长度正常，所以推测解码在正常工作。" 它衡量的是 draft 的猜测能力，而不是服务器；在 L4 上，每个 token 在各个负载下都快了 1.6 到 2.3 倍，但服务器从 32 个用户起没有多产出任何 token。
- "random prompt 是真实文本，所以基准测试符合实际。" random 数据集截取或重复 ShareGPT 对话的第一轮至 512 token 并忽略结束 token；在 GSM8K 和 code prompt 上，推测解码在 32 个用户时给出了 1.6 倍的输出，而在 ShareGPT 上没有增加。
- "调大 --max-running-requests 让更多用户进入。" 在 L4 上，池大约只能装 15 个请求，调大上限不会改变任何事；瓶颈在池，draft 占了近 60% 的池空间。
- "换用 NGRAM，它不需要 draft 权重。" 它只在 GSM8K 和 code 上有帮助，8 个用户时约 1.1 到 1.2 倍，在另外两个数据集上更慢，P99 ITL 为 244 到 779 ms。

## Taught in

[SGLang 推测解码一节](../../../manuals/sglang-101/sections/4-4-speculative-decoding.md)给出了 L4 和 GB10 上的压测以及四个数据集上的测试。
