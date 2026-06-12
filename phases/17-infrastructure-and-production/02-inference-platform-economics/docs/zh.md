# 推理平台经济学 —— Fireworks、Together、Baseten、Modal、Replicate、Anyscale

> 2026 年的推理市场已经不再是租 GPU 时间。它分化成三块：定制芯片（Groq、Cerebras、SambaNova）、GPU 平台（Baseten、Together、Fireworks、Modal）和 API 优先的市场（Replicate、DeepInfra）。Fireworks 在 2026 年 5 月 1 日把每 GPU 每小时的价格涨了 1 美元，而 40 亿美元估值、每天 10T+ token 的处理量告诉你：靠走量的模式行得通。Baseten 在 2026 年 1 月以 50 亿美元估值完成了 3 亿美元的 E 轮。竞争定位的规律很简单：Fireworks 优化延迟，Together 优化目录广度，Baseten 优化企业级打磨，Modal 优化 Python 原生开发体验，Replicate 优化多模态覆盖，Anyscale 优化分布式 Python。这一课给你一张能直接递给创始人的对比矩阵。

**类型：** Learn
**语言：** Python（标准库，一个玩具级的单次调用经济账对比器）
**前置要求：** 阶段 17 · 01（托管 LLM 平台）、阶段 17 · 04（vLLM 服务内部机制）
**预计时间：** ~60 分钟

## 学习目标

- 说出三个市场分段（定制芯片、GPU 平台、API 优先），并把每个厂商对应到一个分段。
- 解释为什么"按 token"的 API 定价模式会向服务引擎的成本曲线压缩，而不是向硬件的成本曲线压缩。
- 跨至少三家厂商算出单次请求的有效成本，并说明按分钟计费（Baseten、Modal）何时胜过按 token。
- 对给定工作负载（serverless 突发型、稳定高吞吐型、微调变体型、多模态型）判断哪个平台是合适的默认选。

## 问题背景

你评估完了托管的超大规模平台。你决定需要一个更窄、更快的供应商 —— Fireworks 拼延迟，Together 拼广度，Baseten 上一个微调过的自定义模型。现在你面前有六个真实选项，而定价页根本对不齐。Fireworks 标的是 $/M token；Baseten 标的是 $/分钟；Modal 标的是 $/秒；Replicate 标的是 $/次预测。不对工作负载建模，你根本没法把它们摆在一起正面比。

更糟的是，每张定价页背后的商业模式都不一样。Fireworks 在共享 GPU 上跑自家的定制引擎（FireAttention）；按 token 的费率反映的是他们的利用率曲线。Baseten 给你 Truss + 专属 GPU；按分钟反映的是独占性。Modal 是真正的 Python serverless —— 按秒计费，冷启动不到一秒。同样的产出（一段 LLM 回复），三套不同的成本函数。

这一课给这六家建模，并告诉你每一家何时胜出。

## 核心概念

### 三个分段

**定制芯片** —— Groq（LPU）、Cerebras（WSE）、SambaNova（RDU）。在同一个模型上，decode 通常比基于 GPU 的集群快 5-10 倍。每 token 价格更高（Groq 在 2025 年底跑 Llama-70B 约 $0.99/M），但在延迟敏感的场景里无可匹敌。Groq 是语音 agent 和实时翻译的生产首选。

**GPU 平台** —— Baseten、Together、Fireworks、Modal、Anyscale。跑在 NVIDIA（2026 年是 H100、H200、B200）上，有时也跑 AMD。这是介于"裸 GPU 租赁"（RunPod、Lambda）和"超大规模托管服务"（Bedrock）之间的经济层。

**API 优先市场** —— Replicate、DeepInfra、OpenRouter、Fal。目录广、按次预测或按秒付费，强调"首次调用所需时间"。

### Fireworks —— 延迟优化的 GPU 平台

- FireAttention 引擎（定制）；宣传在等效配置上延迟比 vLLM 低 4 倍。
- 针对非交互工作负载的 batch 档位，约为 serverless 费率的 50%。
- 微调模型按基础模型同样的费率服务 —— 这是相对那些为你的 LoRA 加价的供应商的真正差异点。
- 2026 年中：从 5 月 1 日起按需 GPU 租赁涨 $1/小时。规模上量后批量价格可谈。
- 财务信号：40 亿美元估值，每天处理 10T+ token。

### Together —— 广度优化

- 200+ 模型，其中开源版本在上游发布后几天内就跟进。
- 在等效 LLM 模型上比 Replicate 便宜 50-70% —— "AI Native Cloud"的定位就是走量和目录。
- 推理 + 微调 + 训练在一个 API 里。

### Baseten —— 企业级打磨优化

- Truss 框架：把依赖、密钥、服务配置打包进一份 manifest。
- GPU 范围从 T4 到 B200。按分钟计费，冷启动缓解做得还算合理。
- SOC 2 Type II、HIPAA-ready。常见的金融科技和医疗首选。
- 50 亿美元估值，2026 年 1 月 E 轮（来自 CapitalG、IVP、NVIDIA 的 3 亿美元）。

### Modal —— Python 原生优化

- 用纯 Python 写基础设施即代码。用 `@modal.function(gpu="A100")` 装饰一个函数，一条命令就部署。
- 按秒计费。带预热时冷启动 2-4 秒；小模型 <1 秒。
- 8700 万美元 B 轮，11 亿美元估值（2025）。在独立调研里开发者体验得分最高。

### Replicate —— 多模态广度

- 按次预测付费。图像、视频、音频模型的默认平台。
- 集成生态（Zapier、Vercel、CMS 插件）。
- 在 LLM 按 token 费率上竞争力较弱，但在多模态多样性上胜出。

### Anyscale —— Ray 原生

- 建在 Ray 之上；RayTurbo 是 Anyscale 自有的推理引擎（与 vLLM 竞争）。
- 最适合分布式 Python 工作负载 —— 推理这一步只是更大图里的一个节点。
- 托管的 Ray 集群；与 Ray AIR 和 Ray Serve 紧密集成。

### 按 token vs 按分钟 —— 各自何时胜出

当工作负载对延迟不敏感且突发时，按 token 合理 —— 你只为用掉的付费。当利用率高且可预测时，按分钟合理 —— 一旦你把 GPU 喂满，按分钟就赢了。

粗略规则：对一块专属 GPU 持续利用率超过约 30% 的工作负载，按分钟（Baseten、Modal）开始胜过按 token（Fireworks、Together）。低于这个值，按 token 赢，因为你避开了为闲置付费。

### 定制引擎才是真正的护城河

每个建在 vLLM 和 SGLang 之上的平台都声称有定制引擎。FireAttention、RayTurbo、Baseten 的推理栈。定制引擎的说法多少带营销色彩 —— 诚实的说法是：vLLM + SGLang 占了大约 80% 的生产开源推理，而平台层的差异化在于开发体验、归因和 SLA。

### 你该记住的数字

- Fireworks GPU 租赁：2026 年 5 月 1 日起涨 $1/小时。
- Fireworks 宣称：等效配置上延迟比 vLLM 低 4 倍。
- Together：在 LLM 上比 Replicate 便宜 50-70%。
- Baseten 估值：50 亿美元（E 轮，2026 年 1 月，3 亿美元一轮）。
- Modal 估值：11 亿美元（B 轮，2025）。
- 持续利用率超过约 30% 时，按分钟胜过按 token。

```figure
cost-per-token
```

## 实际使用

`code/main.py` 在一个合成工作负载上跨定价模型对比这六家厂商。报告 $/天和有效 $/M token。跑一下，找出按 token 和按分钟之间的盈亏平衡点。

## 拿去用

这一课产出 `outputs/skill-inference-platform-picker.md`。给定工作负载画像、SLA 和预算，挑出主推理平台并点名第二选择。

## 练习

1. 跑 `code/main.py`。对一块 H100 上的 70B 模型，持续利用率到多少时 Baseten（按分钟）才胜过 Fireworks（按 token）？自己推出这个交叉点，并和经验法则对比。
2. 你的产品要服务图像生成 + 聊天 + 语音转文字。为每种模态挑平台，并说出把它们统一起来的 gateway 模式。
3. Fireworks 把你主力模型的价格涨了 $1/小时。如果你 40% 的流量转到 batch 档位（打 5 折），给混合成本影响建模。
4. 一个受监管客户要求 SOC 2 Type II + HIPAA + 专属 GPU。哪三个平台可行，哪一个在 FinOps 上胜出？
5. 对比 Llama 3.1 70B 在 Fireworks serverless、Together 按需、Baseten 专属、Replicate API 上每 1,000 次预测的成本。在每天 10 次预测时哪个最便宜？每天 10,000 次时呢？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| 定制芯片 | "非 GPU 的芯片" | Groq LPU、Cerebras WSE、SambaNova RDU —— 为 decode 优化 |
| FireAttention | "Fireworks 引擎" | 定制的注意力 kernel；宣传延迟比 vLLM 低 4 倍 |
| Truss | "Baseten 的格式" | 模型打包 manifest；依赖 + 密钥 + 服务配置 |
| 按 token | "API 定价" | 按消耗的 token 收费；不为闲置付费 |
| 按分钟 | "专属定价" | 按 GPU 的墙钟时间收费；高利用率时胜出 |
| 按次预测 | "Replicate 定价" | 按每次模型调用收费；图像/视频常用 |
| RayTurbo | "Anyscale 引擎" | Ray 上的自有推理；在 Ray 集群上与 vLLM 竞争 |
| Batch 档位 | "打 5 折" | 降价的非交互队列；Fireworks、OpenAI 常见 |
| 微调按基础费率 | "Fireworks LoRA" | LoRA 服务的请求按基础模型的费率收费（差异点） |

## 延伸阅读

- [Fireworks Pricing](https://fireworks.ai/pricing) —— 按 token 费率、batch 档位、GPU 租赁。
- [Baseten Pricing](https://www.baseten.co/pricing/) —— 按分钟费率、承诺算力、企业档位。
- [Modal Pricing](https://modal.com/pricing) —— 按秒 GPU 费率与免费档。
- [Together AI Pricing](https://www.together.ai/pricing) —— 模型目录与按 token 费率。
- [Anyscale Pricing](https://www.anyscale.com/pricing) —— RayTurbo 与托管 Ray 定价。
- [Northflank — Fireworks AI Alternatives](https://northflank.com/blog/7-best-fireworks-ai-alternatives-for-inference) —— 对比评估。
- [Infrabase — AI Inference API Providers 2026](https://infrabase.ai/blog/ai-inference-api-providers-compared) —— 厂商版图。
