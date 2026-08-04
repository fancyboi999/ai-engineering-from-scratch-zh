# Batch API —— 5 折成为行业标准

> 每家主要供应商都发布了一个异步 batch API，5 折、约 24 小时周转。OpenAI、Anthropic、Google 和大多数推理平台（Fireworks batch 档、Together batch）都实现了同样的模式。把 batch 和 prompt 缓存叠在一起，夜间流水线降到同步未缓存成本的约 10%。规律残酷地简单：只要不是交互的，它就属于 batch。内容生成流水线、文档分类、数据抽取、报告生成、批量标注、目录打标 —— 任何能容忍 24 小时延迟的，在移到 batch 之前都是白白扔在桌上的钱。2026 年的生产模式是把每个新 LLM 工作负载分流进三条道：交互（带缓存的同步）、半交互（带回退的异步队列）、batch（夜间，叠加缓存输入）。那些假装交互、实则能容忍几分钟延迟的工作负载浪费最多。

**类型：** Learn
**语言：** Python（标准库，一个玩具级 batch vs 同步成本模拟器）
**前置要求：** 阶段 17 · 14（Prompt 与语义缓存）
**预计时间：** ~45 分钟

## 学习目标

- 说出三个供应商的 batch API（OpenAI、Anthropic、Google），以及共同的 5 折 + 24h 周转保证。
- 算出在一个夜间分类工作负载上叠加 batch + 缓存输入的成本，并和同步未缓存基线对比。
- 把一个工作负载分流进 交互 / 半交互 / batch，并论证选这条道。
- 说出两个陷阱：部分交互（用户期望比 24h 更快）和输出 schema 漂移（batch 文件格式各供应商不同）。

## 问题背景

你的团队交付一个夜间报告生成流水线。50,000 个文档，逐个摘要、把摘要聚类、起草一份高管简报。同步跑要 4 小时、每晚 $2,000。你听说了 batch API。

batch 给你打 5 折。你还在系统 prompt 上开了 prompt 缓存（在全部 5 万次调用间共享）。叠起来，账单降到每晚 $180 —— 约为基线的 9%。同一个流水线，三处配置改动。

batch 是 LLM 成本工具箱里最便宜、却没人去拉的那根杠杆。原因多半是组织上的：团队心里想"实时"，而 SLA 其实是"早上之前"。这一课讲的就是别把 90% 的账单白扔在桌上。

## 核心概念

### 三个 batch API

**OpenAI Batch API**：上传一个带请求列表的 JSONL 文件。承诺 24 小时周转（实践中通常约 2-8 小时）。输入和输出 token 5 折。`/v1/batches` 端点。可缓存的输入还能在上面叠加缓存输入定价。

**Anthropic Message Batches**：JSONL 上传。24 小时周转。5 折。支持 `cache_control` —— 缓存写入是显式的，读取在 batch 内自动发生。

**Google Vertex AI Batch Prediction**：BigQuery 或 GCS 输入。Gemini 类似的 5 折。和 Vertex 流水线集成。

### 语义：异步，不是慢

batch 是"我保证在 24 小时内返回" —— 不是"这要花 24 小时"。典型 P50 是 2-6 小时。供应商把你的 batch 调度到 GPU 库存利用不足的低峰窗口。

### 和缓存叠加

一个用相同 4K token 系统 prompt 的 5 万文档摘要：

- 同步未缓存：50000 × ($input × 4000 + $output × 200)，按全价。
- 同步缓存：系统 prompt 在第一次写入后被缓存；剩下 49999 个拿到便宜 10 倍的输入。
- batch 缓存：以上全部，外加读写都 5 折。

这套叠加：batch + 缓存 = 同步未缓存账单的约 10%。任何夜间跑、有共享系统 prompt 的工作负载都该用这个。

### 工作负载分流

**交互** —— 用户等响应。TTFT 重要。带 prompt 缓存的同步调用。不能 batch。

**半交互** —— 用户提交一个任务，过几分钟回来看。带回退到同步（batch 不可用时）的异步队列。想想中等量的 RAG 索引。

**batch** —— 用户期望结果"早上之前"或"下一个小时"。内容流水线、规模化分类、离线分析。永远 batch，永远叠缓存。

常见错误：因为流水线是生产的就把一切归为交互。生产不是个延迟规格 —— SLA 才是。

### 部分交互陷阱

有些特性看起来交互，其实能容忍 5-10 分钟。例子：一个带"刷新"按钮的夜间客户健康报告。用户点刷新；等 10 分钟没问题。团队把它做成了同步。50 个并发刷新的成本是"batch 后经邮件投递"的 10 倍。

要问的问题是："对这个用户，24 小时意味着什么？"如果答案是"他们不会注意到"，就 batch 它。

### 输出 schema 陷阱

batch 文件格式各供应商不同：

- OpenAI：JSONL，每行一个请求。
- Anthropic：JSONL，每行一条消息；响应格式内嵌。
- Vertex：BigQuery 表，或带 TFRecord 的 GCS 前缀。

跨供应商写"一个 batch 客户端"意味着每个供应商一份适配代码。宣传多供应商 batch 的网关（Portkey、LiteLLM 某些档位）仍然是对原始格式的薄封装。

### 你该记住的数字

- 各供应商的 batch 折扣：输入 + 输出统一 5 折。
- 周转 SLA：保证 24 小时，典型 P50 为 2-6 小时。
- 叠加的 batch + 缓存输入：同步未缓存成本的约 10%。
- 工作负载分流规则：只要 24h 延迟可接受，永远 batch。

```figure
batch-lane-triage
```

## 实际使用

`code/main.py` 为一个 5 万文档工作负载在 同步、同步+缓存、batch、batch+缓存 之间算成本。报告以 $ 和百分比表示的节省。

## 拿去用

这一课产出 `outputs/skill-batch-triager.md`。给定工作负载特征，分流进 交互/半交互/batch 并估算节省。

## 练习

1. 跑 `code/main.py`。对一个 10 万文档、3K token 系统 prompt、500 token 输出的流水线，算全套叠加（batch + 缓存）vs 同步基线的节省。
2. 在你了解的一个真实产品里挑三个特性。把每个分流进 交互/半交互/batch。
3. 一个用户抱怨他的报告花了 3 小时。这是 batch 分流错了，还是合理的交互？写出决策准则。
4. 你的 batch API 返回 SLA 是 24h 但 P99 是 20 小时。你怎么跟用户沟通这点 —— 边缘情况下下游系统的行为是什么？
5. 算盈亏平衡：共享前缀长到多少时，batch + 缓存才比在你自己预留的 GPU 上夜间跑更便宜？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Batch API | "异步折扣" | 5 折，24h 周转 |
| JSONL | "batch 格式" | 每行一个 JSON 请求；OpenAI/Anthropic 标准 |
| Message Batches | "Anthropic batch" | Anthropic 的 batch API 产品名 |
| Batch prediction | "Vertex batch" | Vertex AI 的 batch API 产品 |
| 周转 SLA | "24h 承诺" | 是保证，不是典型；典型是 2-6h |
| 工作负载分流 | "交互性决策" | 交互 / 半交互 / batch 的路由决策 |
| 输出 schema | "响应格式" | 各供应商的 JSONL 布局；不可移植 |
| 叠加折扣 | "batch + 缓存" | 两者都适用时约为未缓存同步账单的 10% |

## 延伸阅读

- [OpenAI Batch API](https://platform.openai.com/docs/guides/batch) —— JSONL 格式和 `/v1/batches` 语义。
- [Anthropic Message Batches](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing) —— batch 格式和 `cache_control` 相互作用。
- [Vertex AI Batch Prediction](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/batch-prediction-gemini) —— Gemini batch 语义。
- [Finout — OpenAI vs Anthropic API Pricing 2026](https://www.finout.io/blog/openai-vs-anthropic-api-pricing-comparison)
- [Zen Van Riel — LLM API Cost Comparison 2026](https://zenvanriel.com/ai-engineer-blog/llm-api-cost-comparison-2026/)
