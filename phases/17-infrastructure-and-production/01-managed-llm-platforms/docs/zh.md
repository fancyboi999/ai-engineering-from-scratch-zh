# 托管 LLM 平台 —— Bedrock、Vertex AI、Azure OpenAI

> 三家超大规模云厂商，三套截然不同的策略。AWS Bedrock 是一个模型市场 —— Claude、Llama、Titan、Stability、Cohere 都藏在同一个 API 后面。Azure OpenAI 是与 OpenAI 的独家合作，再加上为专属算力准备的 Provisioned Throughput Units（PTUs）。Vertex AI 则以 Gemini 优先，长上下文和多模态讲得最好。2026 年 Artificial Analysis 在 Llama 3.1 405B 等量级模型上测得 Azure OpenAI 中位延迟约 50 ms，Bedrock 约 75 ms —— 这个差距由 PTUs 解释，专属算力本就强过共享按需。决策准则不是"谁最快"，而是"哪家的模型目录和 FinOps 视图匹配我的产品"。这一课教你把权衡写下来再选，而不是凭感觉。

**类型：** Learn
**语言：** Python（标准库，一个玩具级成本与延迟对比器）
**前置要求：** 阶段 11（LLM 工程）、阶段 13（工具与协议）
**预计时间：** ~60 分钟

## 学习目标

- 说出三种平台策略（市场型 vs 独家型 vs Gemini 优先型），并把每一种对应到一个产品用例。
- 解释 Provisioned Throughput Units（PTUs）在 Azure OpenAI 里给你买来了什么，以及为什么按需的 Bedrock 在 405B 规模上通常要慢约 25 ms。
- 画出每个平台的 FinOps 归因视图（Bedrock Application Inference Profiles vs Vertex 每团队一个 project vs Azure 作用域 + PTU 预留）。
- 写下一条"双供应商起步"的策略，并解释为什么单一厂商锁定是 2026 年代价最高的错误。

## 问题背景

你给产品选了 Claude 3.7 Sonnet。现在你得把它服务出去。你可以直接调 Anthropic API，也可以走 AWS Bedrock，或者经过一个 gateway。直接调 API 最简单；Bedrock 加上了 BAA、VPC 端点、IAM 和 CloudWatch 归因。gateway 则跨多家供应商提供故障转移、统一账单和限流。

更深一层的问题是目录。如果你的产品里同时要用 Claude、Llama 和 Gemini，你没法从一个地方全买到 —— 除非这个"地方"是 Bedrock 加 Vertex 加 Azure OpenAI 三个一起上。这几家超大规模厂商不可互换 —— 它们各自押注了不同的人来掌控模型层。

这一课把三种押注、延迟差距、FinOps 差距和锁定风险都梳理清楚。

## 核心概念

### 三种策略

**AWS Bedrock** —— 市场型。Claude（Anthropic）、Llama（Meta）、Titan（AWS 自家）、Stability（图像）、Cohere（嵌入）、Mistral，外加图像和嵌入的子目录。一个 API、一套 IAM 视图、一份 CloudWatch 导出。Bedrock 押注的是：客户想要的是可选性，而不是某一个模型。

**Azure OpenAI** —— 独家合作。你能拿到 GPT-4 / 4o / 5 / o 系列、DALL·E、Whisper，以及在 Azure 数据中心里微调 OpenAI 模型。"Azure OpenAI Service"目录里没有任何非 OpenAI 模型 —— 那些归到 Azure AI Foundry（另一个产品）。Azure 押注的是：OpenAI 仍是前沿，而客户想要在这段特定关系上加一层企业级管控。

**Vertex AI** —— Gemini 第一，其余第二。Gemini 1.5 / 2.0 / 2.5 的 Flash 和 Pro，再加上 Model Garden（第三方）。Vertex 押注的是多模态长上下文 —— 1M token 的 Gemini 上下文就是它的差异化。

### 规模下的延迟差距

Artificial Analysis 持续跑基准测试。在等量级的 Llama 3.1 405B 部署上（共享按需），Azure OpenAI 首 token 延迟中位数约 50 ms；Bedrock 约 75 ms。这个差距不是 AWS 出了什么问题 —— 而是算力模型的差异。Azure 卖的是 PTUs（Provisioned Throughput Units），它为你的租户预留 GPU 算力。Bedrock 的对应物（Provisioned Throughput）也存在，但每单元每小时约 21 美元起步，大多数客户还是留在共享按需上。

按需共享算力要和其他所有客户的流量抢资源。专属算力不用抢。如果你的产品 SLA 要求 P99 的 TTFT < 100 ms，那你要么在 Azure 上买 PTUs，要么买 Bedrock Provisioned Throughput，要么接受默认的方差。

### Provisioned Throughput 的经济账

Azure PTUs：一块预留的推理算力。对可预测的工作负载，相比按需最多省约 70%。每小时成本固定，与流量无关 —— 哪怕闲着也得为预留付费。盈亏平衡点通常在约 40-60% 的持续利用率。

Bedrock Provisioned Throughput：每小时 21-50 美元，取决于模型和区域。算法类似 —— 盈亏平衡点在约一半的峰值利用率。需要按月承诺。

Vertex 的预留算力按 Gemini SKU 售卖；价格随模型和区域变化，公开宣传得也比较少。

### FinOps 视图 —— 真正的差异化

**Bedrock Application Inference Profiles** 是市场型里最干净的归因。给一个 profile 打上 `team`、`product`、`feature` 标签；把所有模型调用都路由过它；CloudWatch 不用后处理就能按 profile 拆出成本。2025 年加入，至今仍是超大规模厂商原生能力里粒度最细的。

**Vertex** 的归因是每团队一个 project 加上到处打 label。你把每个团队建模成一个 GCP project，给每个资源打 label，再用 BigQuery Billing Export + DataStudio 做汇总。活儿多一些，但 BigQuery 让你能对成本数据跑任意 SQL。

**Azure** 依赖 subscription/resource-group 作用域加上 tag，并把 PTU 预留当成一等成本对象。tag 是从 resource group 继承来的，不是从请求来的，所以按请求归因需要 Application Insights 自定义指标，或者一个会盖 header 的 gateway。

规律是：Bedrock 原生最干净，Vertex 经由 BigQuery 最灵活，Azure 最不透明 —— 除非你自己埋点。

### 锁定是 2026 年的风险

当某一个模型一家独大时，押注单一超大规模厂商没问题。可 2026 年前沿每月都在挪 —— 这季度是 Claude 3.7，下季度是 Gemini 2.5，再下季度是 GPT-5。锁死一个平台，就把自己挡在三分之二的前沿之外。

干活的团队采用的模式是：任何产品关键的 LLM 调用，双供应商起步。Bedrock 加 Azure OpenAI 是常见的一对 —— Claude 从一家来，GPT 从另一家来，两者之间故障转移，同一个 gateway。成本上浮可以忽略，因为 gateway 会按最优路由；而宕机期间（比如 2025 年 1 月的 Azure OpenAI 事件、AWS us-east-1 宕机）可用性的提升是决定性的。

### 数据驻留、BAA 与受监管行业

Bedrock：多数区域提供 BAA；VPC 端点；guardrails。常见的金融科技默认选。
Azure OpenAI：HIPAA、SOC 2、ISO 27001；欧盟数据驻留；企业受监管场景的默认选。
Vertex：HIPAA、GDPR、按区域的数据驻留；Google Cloud 的合规栈。

三家都过了基本的勾选项。差别在数据保留策略、日志如何处理，以及滥用监控会不会读你的流量（大多数默认 opt-in；企业版可 opt-out）。

### 你该记住的数字

- Azure OpenAI 在 Llama 3.1 405B 等量级上的 TTFT 中位数：~50 ms（带 PTUs）。
- Bedrock 按需的 TTFT 中位数：~75 ms。
- Bedrock Provisioned Throughput：每单元每小时 21-50 美元。
- Azure PTU 盈亏平衡：~40-60% 的持续利用率。
- 高利用率下 PTU 相比按需的节省：最多 70%。

```figure
i4-platform-lanes
```

## 实际使用

`code/main.py` 在一个合成工作负载上对比三个平台 —— 它对按需 vs PTU 的经济账、TTFT 方差和成本归因的精确度建模。跑一下，看看 PTU 在哪里划算，以及市场型的模型广度在哪里盖过 TTFT 的差距。

## 拿去用

这一课产出 `outputs/skill-managed-platform-picker.md`。给定一份工作负载画像（需要哪些模型、TTFT SLA、日活量、合规要求），它推荐一个主平台、一个回退平台，以及一套 FinOps 埋点方案。

## 练习

1. 跑 `code/main.py`。对一个 70B 量级的模型，持续利用率到多少时 Azure PTU 才胜过按需？算出盈亏平衡点，和宣传的 40-60% 区间对比。
2. 你的产品需要 Claude 3.7 Sonnet 和 GPT-4o。设计一套双供应商部署 —— 哪个放哪家超大规模厂商，前面摆什么 gateway，故障转移策略是什么？
3. 一个受监管的医疗客户要求 BAA、美国东部数据驻留，以及 P99 TTFT 低于 100ms。选一个平台，并用三个具体特性来论证。
4. 你发现这个月 Bedrock 账单涨了 4 倍，流量却没变。没有 Application Inference Profiles 时，你怎么找出元凶？有 profiles 时，要花多久？
5. 读一遍 Azure OpenAI 和 Bedrock 的定价页。对一个月 1 亿 token 的 Claude 工作负载，哪个更便宜 —— 直连 Anthropic API、Bedrock 按需，还是 Bedrock Provisioned Throughput？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Bedrock | "AWS 的 LLM 服务" | 横跨 Claude、Llama、Titan、Mistral、Cohere 的模型市场 |
| Azure OpenAI | "Azure 版 ChatGPT" | Azure 数据中心里独家的 OpenAI 模型，带企业级管控 |
| Vertex AI | "Google 的 LLM" | Gemini 优先的平台，带 Model Garden 接第三方模型 |
| PTU | "专属算力" | Provisioned Throughput Unit —— 预留的推理 GPU，按小时计价 |
| Application Inference Profile | "Bedrock 打标签" | 带 tag 的按产品成本/用量 profile，CloudWatch 原生支持 |
| Model Garden | "Vertex 目录" | Vertex AI 的第三方模型区，和 Gemini 分开 |
| 双供应商起步 | "LLM 冗余" | 每条关键 LLM 路径都跨 ≥2 家超大规模厂商运行的策略 |
| BAA | "HIPAA 文书" | 业务伙伴协议；处理 PHI 时必需；三家都提供 |
| 滥用监控 | "看日志的那个" | 供应商侧对 prompt/输出的安全扫描；企业版可 opt-out |

## 延伸阅读

- [AWS Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/) —— 权威费率表和 Provisioned Throughput 价格。
- [Azure OpenAI Service Pricing](https://azure.microsoft.com/en-us/pricing/details/azure-openai/) —— PTU 经济账与费率表。
- [Vertex AI Generative AI Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing) —— Gemini 各档与 Model Garden 加价。
- [Artificial Analysis LLM Leaderboard](https://artificialanalysis.ai/) —— 跨供应商的持续延迟与吞吐基准。
- [The AI Journal — AWS Bedrock vs Azure OpenAI CTO Guide 2026](https://theaijournal.co/2026/03/aws-bedrock-vs-azure-openai/) —— 企业决策框架。
- [Finout — Bedrock vs Vertex vs Azure FinOps](https://www.finout.io/blog/bedrock-vs.-vertex-vs.-azure-cognitive-a-finops-comparison-for-ai-spend) —— 归因机制并排对比。
