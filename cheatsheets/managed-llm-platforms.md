---
id: managed-llm-platforms
title: 托管平台与自托管对比
code: MN
subtitle: 选择大型云服务商、推理平台或自托管引擎，计算价格与容量，缩短冷启动。
hue: 28
sources: phases/17-infrastructure-and-production/01-managed-llm-platforms, phases/17-infrastructure-and-production/02-inference-platform-economics, phases/17-infrastructure-and-production/10-cold-start-mitigation, phases/17-infrastructure-and-production/28-self-hosted-serving-selection
source_hash: 54d1d39c5c16eb19
---

## 三家大型云服务商对比
type: comparison
span: 2
from: phases/17-infrastructure-and-production/01-managed-llm-platforms

| 比较项 | Bedrock | Azure OpenAI | Vertex AI |
|---|---|---|---|
| 策略 | 模型市场 | 独家 OpenAI 模型 | Gemini 优先 |
| 模型目录 | Claude, Llama, Titan, Mistral, Cohere | GPT, o-series, DALL·E, Whisper | Gemini 加 Model Garden |
| TTFT 中位数 | 按需约 75 ms | 使用 PTU 约 50 ms | `main.py` 中为 60 ms |
| 专用容量 | Provisioned Throughput，$21-$50/hr | PTU，最多节省 70% | 按 Gemini SKU |
| 盈亏平衡点 | 峰值利用率的一半左右 | 持续利用率约 40-60% | 公开信息较少 |
| 成本归因 | Application Inference Profiles | 作用域、标签、PTU 预留 | 每团队独立项目，导出到 BigQuery |
| 合规 | BAA、VPC 端点、护栏 | HIPAA, SOC 2, ISO 27001 | HIPAA、GDPR、按区域保证数据驻留 |

## 推理平台对比
type: comparison
span: 2
from: phases/17-infrastructure-and-production/02-inference-platform-economics

| 比较项 | Fireworks | Together | Baseten | Modal |
|---|---|---|---|---|
| 优化重点 | 延迟 | 模型目录广度 | 企业级完善度 | Python 原生开发体验 |
| 计费 | 按 token | 按 token | 按分钟 | 按秒 |
| `main.py` 中费率 | $0.90/M 输出 | $0.88/M 输出 | $0.55/min | $0.48/min |
| 最低预留 | 无 | 无 | 1440 min/day | 60 min/day |
| `main.py` 中冷启动 | 1.5 s | 2.0 s | 5.0 s | 2.5 s |
| 关键特性 | 批处理价格约为无服务模式的 50% | 200+ 个模型 | Truss, SOC 2 Type II | `@modal.function(gpu="A100")` |

## 何时使用大型云服务商
type: concepts
from: phases/17-infrastructure-and-production/01-managed-llm-platforms

- **Bedrock**：需要通过一套 API 和 IAM 访问 Claude、Llama 等模型。
- **Bedrock**：需要按团队、产品或功能统计成本，且不做后处理。
- **Azure OpenAI**：需要 GPT 模型，以及 PTU 上低于 100 ms 的 TTFT P99。
- **Vertex AI**：需要 Gemini 的 1M-token 上下文或多模态输入。
- **双提供方**：每个产品关键调用都能在两家大型云服务商上运行。
- **常见组合**：Bedrock 提供 Claude，Azure OpenAI 提供 GPT，统一经一个网关访问。

## 何时使用平台或自托管
type: concepts
from: phases/17-infrastructure-and-production/02-inference-platform-economics, phases/17-infrastructure-and-production/28-self-hosted-serving-selection

- **定制芯片**：延迟至关重要。语音 agent 可选择 Groq。
- **Fireworks**：需要低延迟，以及按基础模型费率使用 LoRA。
- **Together**：需要在新开放模型发布后数天内使用。
- **Baseten**：需要微调模型、专用 GPU、SOC 2 和 HIPAA。
- **Modal**：团队使用 Python，且需要按秒计费。
- **Replicate**：按次预测提供图像、视频和音频模型。
- **Anyscale**：推理是更大 Ray 图中的一个节点。
- **自托管**：需要数据驻留、定制微调、规模化成本优势，或没有可用托管模型。

## 选择自托管引擎
type: flow
from: phases/17-infrastructure-and-production/28-self-hosted-serving-selection

1. **CPU 硬件**：使用 llama.cpp。其他引擎在 CPU 上没有竞争力。
2. **AMD 硬件**：使用带 ROCm 的 vLLM。TRT-LLM 绑定 NVIDIA。
3. **Blackwell 硬件**：TRT-LLM 在 B200/GB200 上领先，vLLM 和 SGLang 随后。
4. **1 位用户**：使用 Ollama。一条命令，数秒内得到首个 token。
5. **10-100 位用户**：单 GPU 上使用 vLLM。
6. **100-10k 位用户**：使用 vLLM production-stack 或 SGLang。
7. **agent 或重前缀工作负载**：使用 SGLang RadixAttention。
8. **流水线**：开发用 Ollama，预发布用 llama.cpp，生产用 vLLM。将 GGUF 转为 safetensors。

## 70B 模型冷启动（秒）
type: comparison
span: 2
from: phases/17-infrastructure-and-production/10-cold-start-mitigation

| 阶段 | 原始配置 | 预置镜像 | 模型流式加载器 | GPU 快照 |
|---|---|---|---|---|
| 节点供应 | 50.0 | 50.0 | 50.0 | 0.5 |
| 镜像拉取 | 180.0 | 0.0 | 180.0 | 0.0 |
| 权重加载到 HBM | 75.0 | 75.0 | 35.0 | 0.0 |
| 引擎初始化 | 20.0 | 20.0 | 20.0 | 2.0 |
| 首次前向 | 3.0 | 3.0 | 3.0 | 0.5 |
| 工具 | 无 | Bottlerocket, `EC2NodeClass` | Run:ai Model Streamer | Modal 检查点 |
| 收益 | 总计 328s | 节省 2-4 分钟 | 权重加载约快 2 倍 | 重启快 10 倍 |

## 运行代码中的模型
type: task-table
span: 2
from: phases/17-infrastructure-and-production/01-managed-llm-platforms/code/main.py, phases/17-infrastructure-and-production/02-inference-platform-economics/code/main.py, phases/17-infrastructure-and-production/10-cold-start-mitigation/code/main.py, phases/17-infrastructure-and-production/28-self-hosted-serving-selection/code/main.py

| 任务 | 代码 |
|---|---|
| 每家大型云服务商的成本与 TTFT | `simulate(tokens_in_per_day, tokens_out_per_day, sla_ttft_ms, use_ptu)` |
| 扫描 Azure PTU 盈亏平衡点 | `break_even_demo()` |
| 双提供方最低配置成本 | `lock_in_cost()` |
| 单个厂商的日成本 | `cost_per_day(v, tokens_per_day, predictions_per_day)` |
| 扫描按 token 与按分钟计费 | `utilization_breakeven()` |
| 组合缓解措施的冷启动 | `total_for_stack({"pre_seeded", "streamer"})` |
| 预热池盈亏平衡点 | `warm_pool_break_even(gpu_hourly=4.50, cold_seconds=328, sla_tolerated_drops_per_day=5)` |
| 按硬件、规模、工作负载选择引擎 | `pick_engine(hardware, scale, workload)` |

## 故障排查
type: troubleshooting
from: phases/17-infrastructure-and-production/01-managed-llm-platforms, phases/17-infrastructure-and-production/10-cold-start-mitigation, phases/17-infrastructure-and-production/28-self-hosted-serving-selection

| 现象 | 原因 | 修正 |
|---|---|---|
| 按需模式 P99 TTFT 未达到 100 ms | 共享容量与其他流量竞争 | 购买 PTU 或 Provisioned Throughput |
| 低流量时 PTU 账单高 | 空闲时仍为预留容量付费 | 仅在持续利用率约 40-60% 时预留 |
| 流量相同，Bedrock 账单增至 4 倍 | 缺少按功能归因 | 将调用路由到 Application Inference Profiles |
| Azure 没有逐请求成本 | 标签来自资源组 | 使用 Application Insights 自定义指标或网关请求头 |
| 提供方故障导致产品停机 | 绑定单一厂商 | 一个网关后至少配置两家提供方 |
| 首个 token 需要 3-8 分钟 | 缩容至零后原始 70B 冷启动 | 组合预置镜像、流式加载器与快照 |
| 新节点上恢复快照失败 | 快照绑定 GPU 拓扑 | 在新 SKU 上重新创建检查点 |
| 新项目选择 TGI | 自 2025 年 12 月 11 日起进入维护模式 | 默认选择 vLLM 或 SGLang |

## 问答
type: qa
from: phases/17-infrastructure-and-production/01-managed-llm-platforms, phases/17-infrastructure-and-production/02-inference-platform-economics, phases/17-infrastructure-and-production/10-cold-start-mitigation, phases/17-infrastructure-and-production/28-self-hosted-serving-selection

- **Bedrock 为何慢约 25 ms？** 按需容量共享。Azure PTU 为租户预留 GPU。
- **何时按分钟优于按 token？** 文档给出持续利用率约高于 30%；`main.py` 在预留分钟计费下给出约 60-70%。
- **何时必须使用预热池？** 对 70B+ 模型，通常是要求 TTFT P99 < 60s 时。
- **预热池成本多少？** 五个产品各保留一个预热副本，每月使用 3,600 GPU 小时。
- **在线迁移为何移动 token？** 输入是 KB 级，KV 缓存是 GB 级，重算更便宜。
- **生产为何不用 Ollama？** 比 llama.cpp 慢 15-30%，生产负载下差距达 3 倍。

## 术语表
type: glossary
from: phases/17-infrastructure-and-production/01-managed-llm-platforms, phases/17-infrastructure-and-production/02-inference-platform-economics, phases/17-infrastructure-and-production/10-cold-start-mitigation, phases/17-infrastructure-and-production/28-self-hosted-serving-selection

- **PTU**：预配吞吐量单位。按小时计费的预留推理 GPU。
- **BAA**：商业伙伴协议。处理 PHI 所必需，三家均提供。
- **Application Inference Profile**：带标签的 Bedrock 配置，CloudWatch 按配置统计成本。
- **Truss**：Baseten 的依赖、秘密和服务配置清单。
- **FireAttention**：Fireworks 自定义注意力内核。
- **RayTurbo**：Anyscale 在 Ray 上的专有推理引擎。
- **min_workers**：无服务模式的保活数量。`min_workers=1` 即预热池。
- **GGUF**：llama.cpp 权重格式，包含 K-quant 变体。
