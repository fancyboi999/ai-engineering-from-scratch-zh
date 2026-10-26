# --grammar-backend 与结构化输出

> SGLang 为每个 decode 步骤将 JSON schema 或正则表达式转成 token mask，并在 batch 循环之外编译语法。

你的 agent 要求模型返回工具调用，用 `json.loads` 解析回复。多数回复能解析，少数缺了括号、多了尾部注释，或包含 schema 不允许的字段，于是 agent 重试。每次重试都要付出完整生成和完整网络往返的成本，延迟长尾也就由重试构成。

读完本节，你能用 JSON schema、正则表达式或 EBNF 语法约束输出，也能解释 mask 的成本、读取语法队列，判断生成后还需检查什么。

## 直观的修复为什么行不通 {#s-structured-outputs-with-xgrammar-the-obvious-fix-and-why-it-fails}

直观做法是生成后验证，失败就重试。它能工作，但依然很慢。它也会在你最关心的情况下失效：温度 0 时，重试相同 prompt 只会再次返回同一条错误回复。

**约束解码：** 在采样器选择 token 前，移除所有会违反语法的 token。于是后端实际执行的每条规则，都成为服务器输出的一项保证。

## SGLang 做了什么 {#s-structured-outputs-with-xgrammar-what-sglang-does}

请求在采样参数中携带一种约束：`json_schema`、`regex`、`ebnf` 或 `structural_tag`。OpenAI chat API 会将 `response_format` 映射到同样的字段。`--grammar-backend` 选择编译引擎，v0.5.22 默认 `xgrammar`，其余选项为 `outlines`、`llguidance` 和 `none`。

```figure
id: fig-4-8
kind: flow
title: 一个约束请求：从到达到采样
claim: 请求在语法队列等待时，schema 在线程池中编译一次，之后每个 decode 步骤都对 logits 应用 mask。
caption: 从左向右读。缓存 key 为约束类型和文本，命中缓存可跳过线程池。依据 v0.5.22 的 GrammarManager 与 ModelRunner._preprocess_logits。
```

1. **查找。** 语法管理器用约束类型和文本构造 key，例如 `("json", schema)`。如果 key 对应的已编译语法在缓存中，就立即返回。
2. **编译。** 缓存未命中时，在线程池中开始编译，返回 future。请求进入语法队列，而非等待队列。
3. **准入。** 调度器每轮轮询 future。使用张量或数据并行时，只有所有 rank 的语法都准备好，请求才被接纳。任一 rank 编译失败，请求就失败。无效语法也会被缓存为无效，因此下个相同 schema 的请求立即失败。
4. **Mask。** 每一步，语法填写词表 bitmask，模型执行器在采样前将其应用到 logits。使用重叠调度器时，GPU 执行当前步骤的同时，CPU 构建下一步的 mask。
5. **推进。** 采样后，语法接受选中的 token。推测解码时，它会回滚被拒绝的草稿 token。

Apple silicon 上，MLX runtime 只有使用 `--mlx-enable-sampling` 才应用语法 mask。不传该参数，每个 decode 步骤都直接选择 logit 最大的 token，帮助文本证据见[第 4.6 节](#s-deterministic-inference-and-logprobs)。

**语法队列：** 语法仍在编译的请求列表。`/metrics` 用 `sglang:num_grammar_queue_reqs` 导出其长度。

## v0.5.22 未启用 jump-forward {#s-structured-outputs-with-xgrammar-jump-forward-is-not-active-at-v0-5-22}

SGLang 论文描述过 jump-forward 解码。语法只允许一种续写时，例如固定文本 `{"name": "`，服务器无需运行模型就写出它。v0.5.22 的语法类仍有 jump-forward 方法，但搜索 runtime 后，语法类之外找不到调用者。调度器没有使用它们，所以即使处于固定文本中，也应预期每个 token 都要一次前向传播。这是代码阅读结论，我们没有运行计时测试。

## 应该测什么 {#s-structured-outputs-with-xgrammar-what-to-measure}

在自己的 schema 上测三件事。第一，新 schema 首个请求与同 schema 第二个请求的 TTFT，差值体现编译时间。第二，在真实并发下，分别有无约束时的 token 间延迟，因为每步 mask 都消耗 CPU 时间。第三，负载下语法队列的长度。

Varad More 的实践报告 {{field Varad More 2026-04}} 在单张 A10G 上测试了 16 个 2B 至 9B 模型的结构化生成，其中 14 个模型上 vLLM 更快。报告没有区分编译时间和逐 token 成本，因此它说明你应该测量，不能直接当作结论。

## 我们在 GB10 上测到了什么 {#s-structured-outputs-with-xgrammar-what-we-measured-on-a-gb10}

我们在单张 NVIDIA GB10 上，对 `Qwen/Qwen3-30B-A3B-Instruct-2507` 使用默认 `xgrammar` 后端运行小型探测。探测连续五次请求“用 JSON 对象描述一张用于模型服务器的 GPU”，一次发送一个请求。原始 prompt 为 `Describe one GPU for a model server as a JSON object.`。Schema 有四个必填字段，整数 `memory_gb` 范围 1 至 1024，厂商使用 `enum`，不允许额外属性。

| 请求 | 约束 | 延迟 | 输出 token 数 | 是否有效 |
|---|---|---|---|---|
| 1 | 无 | 3,943.9 ms | 128 | 无 schema |
| 2 | 新 schema | 1,636.6 ms | 41 | 是 |
| 3 | 相同 schema | 1,309.2 ms | 41 | 是 |
| 4 | 相同 schema | 1,310.9 ms | 41 | 是 |
| 5 | 第二个新 schema | 1,291.1 ms | 41 | 是 |

**我们只实测了一次运行**，所以表格只表明方向。每个约束回复都是有效 JSON，恰好包含四个字段。无约束回复跑到 128 token 上限，并自行创造了 `gpu_id`、`power_consumption` 等 key。

首个约束请求比后续重复请求多约 330 ms。第二个新 schema 没有这样的额外成本。我们的解释是，这笔开销属于服务器启动后的首个语法。单个小 schema 的编译，相比 41 token 的 decode 太短，无法分辨。

Schema 限制了结构，没有约束事实。约束回复说“NVIDIA A100”有 40 GB，无约束回复却说它有“80 GB GDDR6”。语法检查句法，语义仍需你的验证器检查。

## 我们的建议 {#s-structured-outputs-with-xgrammar-our-position}

凡是由程序解析的回复，都应加约束。Mask 会增加每个生成步骤的工作，重试则要重新执行整个请求；我们没有测量 mask 每步增加的成本。

不要相信语法后端会执行每个 JSON Schema 关键字。对消费端依赖的每个关键字，例如 `minLength`、`pattern`、`minimum` 和 `enum`，都用一个故意尝试违反它的请求测试。对重要字段，在服务器后保留一个低成本验证器。

每次部署后，用一个约束请求预热，避免首位用户承担语法 backend 的首次启动成本。GB10 上首个请求多花约 330 ms；我们的 probe 没有发现第二个小型新 schema 增加额外成本。

## 事故 {#s-structured-outputs-with-xgrammar-incidents}

**Schema 规则被静默丢弃。** Issue #37707（2026-09-03）：使用 xgrammar 时，如果字符串字段同时设置 `pattern`，它会接受比 `minLength` 更短的值。同一报告称 outlines 丢弃了 `pattern` 和数值边界。本手册核验时，该 issue 仍未关闭。

**推测解码下，语法工作量随输出长度增长。** Issue #38863（2026-09-10）：开启推测解码后，主机 CPU 构建 bitmask 的耗时随输出长度增长。原因是回滚方法每次调用都复制一份调试列表。该 issue 作为性能报告保持开放。

```takeaways
- 对每个由程序解析的回复，使用 json_schema 或 response_format。
- 用故意违反规则的请求，测试你依赖的每个 JSON Schema 关键字。
- 每次部署后发送一个约束请求，避免用户支付首次语法处理成本。
- 在负载下增加新 schema 时，观察 sglang:num_grammar_queue_reqs。
```

来源： capture/out/serve-help.txt, capture/gpu/out-gb10/structured.txt, capture/gpu/structured_probe.py, python/sglang/srt/constrained/grammar_manager.py (process_req_with_grammar, get_ready_grammar_requests), constrained/base_grammar_backend.py, constrained/xgrammar_backend.py, model_executor/model_runner.py (_preprocess_logits), sampling/sampling_params.py, arg_groups/serving_hook.py (handle_grammar_backend), arg_groups/choices.py (GRAMMAR_BACKEND_CHOICES), observability/metrics_collector.py（v0.5.22）; SGLang 论文（arXiv 2312.07104）; issue #37707、#38863; Varad More 的实践报告（2026-04-22）.
