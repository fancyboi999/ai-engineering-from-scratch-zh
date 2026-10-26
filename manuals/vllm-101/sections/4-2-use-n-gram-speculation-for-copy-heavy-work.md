# 在大量复制内容的任务中使用 n-gram speculation

> N-gram speculation 无需 draft model；当答案会复制提示词内容时有收益，但会关闭异步调度。

用户希望修改他们提供的文档。读完本节，你可以判断何时 n-gram speculation 比 draft model 更合适。

**我们的测量结果：**在 L4 上使用随机提示词并生成 128-token 输出时，n-gram 将单用户每个 token 的耗时从 242 ms 降到 77 ms。

## 启用 n-gram speculation {#s-use-n-gram-speculation-for-copy-heavy-work-turn-it-on}

N-gram speculation 会根据请求中已有的文本猜测下一个 token。它会取输出末尾的几个 token，在请求更早的位置找到相同片段，再提议其后续 token。目标模型会一次性验证这些猜测，详见[Speculative decoding](#s-how-speculative-decoding-checks-drafts)。

它不需要 draft model，因此不会额外占用 GPU 权重内存。使用 speculative 配置启动服务器：

```bash
vllm serve Qwen/Qwen3-8B \
  --speculative-config '{"method": "ngram", "num_speculative_tokens": 3, "prompt_lookup_max": 4}'
```

`num_speculative_tokens` 是每个步骤猜测的 token 数。`prompt_lookup_max` 是 proposer 尝试匹配的最长 token 序列。我们的测试使用了上面两个数值。

## 了解何时值得使用 {#s-use-n-gram-speculation-for-copy-heavy-work-know-when-it-pays}

Proposer 只能猜测请求中已经出现的文本。因此，会复制提示词内容的任务更容易命中：

- 修改用户提供的文档
- 总结并引用原文
- 保留大多数原有行的代码修改
- 从长输入中提取字段

普通 chat 很少直接复制原文。此时大多数猜测都会失败，每个步骤仍只生成一个 token，与不使用 speculation 相同。

## 查看我们的测量结果 {#s-use-n-gram-speculation-for-copy-heavy-work-see-what-our-run-shows}

**我们的测量：**2026-10-22，我们在 L4 节点的[共享 GPU 时段](#s-front-l4-sessions)使用 `Qwen/Qwen3-8B`，比较了启用和关闭 n-gram speculation 时每个 token 的耗时。该 GPU 的缓存池为 2,928 个 token，因此我们测试了 1 个和 4 个用户，每项各用两个随机种子。提示词来自基准工具的随机数据集，输入 512 个 token，输出 128 个 token。

```figure
id: fig-4-2
kind: chart
title: 使用 n-gram speculation 后的每个 token 耗时
claim: 在我们的 L4 上，n-gram speculation 将单用户每个 token 的中位耗时降至约三分之一；四用户时降至 37%。
caption: 每条柱形表示两次运行的中位数。数值越低越快。来源：capture/gpu/summary/l4-gpu1.json。
```

| 用户数（L4 共享 GPU 时段） | TPOT 中位数，关闭 / n-gram | 输出 token/s，关闭 / n-gram | P99 ITL，关闭 / n-gram | SM 时钟中位数，关闭 / n-gram |
|---|---|---|---|---|
| 1 | 241.7 / 76.6 ms | 3.98 / 7.39 | 274 / 284 ms | 375 / 413 MHz |
| 4 | 272.6 / 101.3 ms | 13.02 / 19.22 | 290 / 1,691 ms | 428 / 443 MHz |

这块 GPU 由多人共用且处于降频状态，时钟只有 375 到 443 MHz，远低于完整时钟，因此耗时较慢。应比较两列数值的比例，而不是绝对耗时。启用 n-gram 的时钟约高 10%，但差距远小于三倍的速度提升。

单用户时，输出量提高了 86%。四个用户时提高了 48%，但最差的 token 间隔从 290 ms 增至 1,691 ms。我们没有追查该间隔变长的原因。

我们没有记录 acceptance counter，因此不知道有多少猜测匹配成功。我们的结果只适用于随机提示词和 128-token 输出。对自己的提示词来说，收益取决于输出复制输入的程度。

其他团队也报告了相同限制，但我们没有自行测量。2025 年底发布的论文《Speculative Decoding: Performance or Illusion?》研究了 vLLM 中的 speculation。研究发现，不同请求和数据集的 acceptance length 差异很大。我们的测试也显示，较好的中位数可能掩盖更差的尾部延迟：四用户时，每个 token 的中位耗时下降了，但 P99 ITL 上升。

## 了解它的成本 {#s-use-n-gram-speculation-for-copy-heavy-work-know-what-it-costs}

- N-gram speculation 会关闭异步调度，日志只会输出一条 warning。[异步调度](#s-leave-async-scheduling-on)一节列出会关闭它的方法。
- 它使用较旧的 model runner，不使用 Model Runner V2。

## 在自己的提示词上检查收益 {#s-use-n-gram-speculation-for-copy-heavy-work-check-the-gain-on-your-prompts}

使用自己的真实流量样本，分别启用和关闭该配置运行。保留实际输出长度，不要使用 `--ignore-eos`。比较 TPOT 中位数、P99 ITL 和 P99 TTFT，不能只看中位数。然后从 `/metrics` 读取两个计数器：

```bash
curl -s http://localhost:8000/metrics | grep -E "spec_decode_num_(draft|accepted)_tokens"
```

将 accepted token 数除以 draft token 数。比例较高，说明输出会复制提示词，n-gram 可能值得使用。比例较低时，可再测试 EAGLE3 等 draft model。

```takeaways
- 在文档修改、引用、代码修改和信息提取任务中测试 n-gram speculation。
- 用自己的提示词测量 acceptance rate 和 P99 ITL。
- 查看日志，确认异步调度关闭的 warning。
```

来源：capture/gpu/summary/l4-gpu1.json（load.vllm-fast-b、load.vllm-ngram），vLLM 0.31.0 源码（vllm/config/vllm.py、vllm/v1/spec_decode/），vLLM 0.31.0 文档（docs/features/speculative_decoding），论文《Speculative Decoding: Performance or Illusion?》（arXiv 2601.11580）。
