---
id: llm-routing-gateways
title: LLM 路由与 AI 网关对比
code: LR
subtitle: 选择网关、配置别名和兜底链，在低成本与前沿模型之间路由，并对慢速安全读取发起对冲。
hue: 28
sources: phases/13-tools-and-protocols/21-llm-routing-layer, phases/17-infrastructure-and-production/16-model-routing, phases/17-infrastructure-and-production/19-ai-gateways, projects/hedged-request-lab
source_hash: c5a3cf33e5a221e1
---

## AI 网关对比
type: comparison
span: 2
from: phases/17-infrastructure-and-production/19-ai-gateways/docs/zh.md, phases/13-tools-and-protocols/21-llm-routing-layer/docs/zh.md, phases/17-infrastructure-and-production/19-ai-gateways/outputs/skill-gateway-picker.md

| 因素 | LiteLLM | Portkey | Kong AI Gateway | Cloudflare / Vercel |
|---|---|---|---|---|
| 代码 | MIT 开源，Python | 自 2026 年 3 月以 Apache 2.0 开源 | 基于 Kong Gateway | 托管，无需运维 |
| 开销 | 5-15 ms | 20-40 ms | 3-8 ms | 边缘端 1-3 ms |
| 扩展性 | 8 GB 下约 2000 RPS 达到瓶颈 | 控制平面 | 比 Portkey 快 228% | 边缘优势 |
| 限流 | token 桶 | 分层 | 滑动窗口 | 有限 |
| 护栏 | 可选 | 预设护栏、PII 脱敏 | 预设护栏 | 有限 |
| 价格 | 开源版 $0 | 生产层 $49/月 | 每模型每月 $100，Plus 最多 5 个 | 仅托管 |
| 最适合 | Python、低于 500 RPS、开发 | 受监管行业 | 已用 Kong、超过 1000 RPS | 边缘 JavaScript 应用 |

## 如何选择
type: concepts
from: phases/13-tools-and-protocols/21-llm-routing-layer/docs/zh.md, phases/17-infrastructure-and-production/19-ai-gateways/docs/zh.md, phases/17-infrastructure-and-production/19-ai-gateways/outputs/skill-gateway-picker.md, phases/13-tools-and-protocols/21-llm-routing-layer/outputs/skill-routing-config-designer.md

- **LiteLLM**：有 SRE 团队，需要数据主权，流量低于 500 RPS。
- **OpenRouter**：托管 SaaS，300+ 提供方，积分计费，不想管理基础设施。
- **Portkey**：需要开箱即用的护栏与合规能力。
- **Kong AI Gateway**：已运行 Kong，且需要超过 1000 RPS。
- **Cloudflare / Vercel**：在边缘运行 JavaScript，需要零运维。
- **自托管**：数据驻留要求决定，医疗与金融默认采用。
- **不用网关**：单模型原型，直接 API 调用更简单。

## 路由模式
type: comparison
from: phases/17-infrastructure-and-production/16-model-routing/docs/zh.md, phases/17-infrastructure-and-production/16-model-routing/code/main.py

| 因素 | 预路由 | 级联 | 集成 |
|---|---|---|---|
| 方法 | 先用分类器 | 先低成本模型，再升级 | 低成本与前沿模型并行 |
| 延迟 | 增加约 5-10ms，最快 | 中位约 1.2x，升级时约 2x | 并行运行 |
| 质量 | 取决于分类器 | 质量下限最好 | 最高 |
| 成本 | 仅简单任务便宜 | 升级时支付两类模型成本 | 最高 |
| 适用条件 | 分类器准确 | 重视质量下限 | 仅关键 A/B 测试 |

## 网关请求路径
type: architecture
from: phases/17-infrastructure-and-production/19-ai-gateways/code/main.ts

```arch
node | client | 1,1 | 客户端 | 提交 API 密钥 | client
node | auth | 2,1 | AuthService | 401 invalid api key | process
node | limit | 3,1 | TokenBucketLimiter | 429 rate limit exceeded | process
node | fb | 3,2 | callWithFallback | 按链顺序 | process
node | retry | 2,2 | callWithRetry | 可重试时退避 | process
node | prov | 1,2 | 提供方 | openai、anthropic、自托管 | model
edge | client | auth | 处理
edge | auth | limit | 租户
edge | limit | fb | 允许
edge | fb | retry | 各提供方
edge | retry | prov | 调用
```

## 一次请求：route()
type: flow
from: phases/13-tools-and-protocols/21-llm-routing-layer/code/main.py

1. **redact_pii**：将 SSN 与 16 位卡号模式替换为 `[REDACTED]`。
2. **route**：`ROUTES.get(alias, [alias])` 给出兜底链。
3. **provider_call**：处于 `OUTAGE` 中的模型抛出模拟 5xx。
4. **route**：遇到 `RuntimeError` 时尝试链中的下一个模型。
5. **成本**：`prompt_tokens` 乘 `in_rate`，加 `completion_tokens` 乘 `out_rate`，再除以 `1_000_000`。
6. **route**：全部模型失败时，`error` 为 "all providers failed"。

## 别名路由网关代码
type: annotated-code
lang: python
from: phases/13-tools-and-protocols/21-llm-routing-layer/code/main.py

```python
ROUTES = {"smart": [...], "fast": [...]}  # 别名映射到兜底链
PRICES = {"openai/gpt-4o": (5.0, 15.0)}   # 每 1M token 的输入和输出价格
inv = route("smart", [{"role": "user", "content": "<prompt>"}])
inv.chosen_model                          # 首个回答的模型
inv.attempts                              # 按顺序列出尝试的模型
inv.input_tokens, inv.output_tokens       # 来自 usage
inv.cost_usd                              # token 数乘 PRICES
inv.redacted                              # 匹配到 PII 时为 True
inv.error                                 # "all providers failed"
OUTAGE.add("openai/gpt-4o")               # 模拟主要提供方故障
```

## 代码任务
type: task-table
from: phases/13-tools-and-protocols/21-llm-routing-layer/code/main.py, phases/17-infrastructure-and-production/16-model-routing/code/main.py, phases/17-infrastructure-and-production/16-model-routing/code/main.ts, phases/17-infrastructure-and-production/19-ai-gateways/code/main.py, phases/17-infrastructure-and-production/19-ai-gateways/code/main.ts, projects/hedged-request-lab/solution/main.go

| 任务 | 代码 |
|---|---|
| 按别名路由 | `route(alias, messages)` |
| 分派前清除 PII | `redact_pii(text)` |
| 比较路由模式 | `simulate("CASCADE", reqs)` |
| 按策略选择模型 | `router.pick(c.signals, c.policy)` |
| 网关兜底模拟器 | `simulate_fallback(gateway, n=1000, seed=7)` |
| 重试单个提供方 | `callWithRetry(provider, prompt, cfg)` |
| 按顺序尝试提供方 | `callWithFallback(chain, prompt, cfg)` |
| 对冲安全读取 | `Hedged(ctx, client, endpoints, delay)` |

## 运行实验
type: command-table
span: 2
from: phases/13-tools-and-protocols/21-llm-routing-layer/code/main.py, projects/hedged-request-lab/README.md, projects/hedged-request-lab/solution/main.go

| 命令 | 作用 |
|---|---|
| `python code/main.py` | 路由网关：正常、故障、PII 与全部不可用场景 |
| `python3 scripts/project_test.py hedged-request-lab --init <dir>` | 创建工作目录，实现前起始代码会失败 |
| `python3 scripts/project_test.py hedged-request-lab --stage 1 --path <dir> --strict` | 评分单个阶段 |
| `python3 scripts/project_test.py hedged-request-lab --all --solution --strict` | 评分参考实现 |
| `go run . --samples 3 --delay-ms 10 --out /tmp/hedge-report.json` | 在 `solution` 中比较回环上的基线与对冲 |
| `go run . --primary <url> --secondary <url>` | 对自己的两个安全读取端点发起对冲 |
| `python3 scripts/project_test.py hedged-request-lab --all --path <dir> --strict --report <file>` | 写入完成证据 |

## 默认值与限制
type: defaults
from: phases/17-infrastructure-and-production/16-model-routing/code/main.ts, phases/17-infrastructure-and-production/19-ai-gateways/code/main.ts, projects/hedged-request-lab/README.md, projects/hedged-request-lab/solution/main.go

| 设置 | 默认值 | 说明 |
|---|---|---|
| `hardSetThreshold` | 0.88 | 达到或超过时，路由器固定选择前沿模型 |
| `maxAttempts` | 2 | 演示中每个提供方的重试预算 |
| 免费层桶 | `capacity: 2` | `refillPerSec: 0.5`，第三次调用返回 429 |
| `--delay-ms` | 10 | 对冲延迟，允许 0 至 1s |
| `--samples` | 3 | 每种策略样本数，1 至 100 |
| `--out` | `/tmp/aiefs-hedge-report.json` | 回执文件 |
| GET 尝试次数 | 2 | 正文 64KiB、两秒上限、100ms 宽限 |

## 常见问题排查
type: troubleshooting
from: phases/17-infrastructure-and-production/19-ai-gateways/docs/zh.md, phases/17-infrastructure-and-production/19-ai-gateways/outputs/skill-gateway-picker.md, phases/17-infrastructure-and-production/16-model-routing/docs/zh.md, phases/13-tools-and-protocols/21-llm-routing-layer/outputs/skill-routing-config-designer.md, projects/hedged-request-lab/README.md, projects/hedged-request-lab/project.json, projects/hedged-request-lab/solution/main.go

| 现象 | 原因 | 修正 |
|---|---|---|
| 接近 2000 RPS 时级联故障 | LiteLLM 达到上限 | 提前迁移到 Kong |
| TTFT P99 超过 100 ms SLA | Portkey 增加 20-40 ms | 使用 Kong 或 Cloudflare |
| 升级率超过 30% | 过多请求路由到低成本模型 | 减少该模型流量 |
| 质量下降但无告警 | 低成本模型漂移 | 用在线质量指标把守路由 |
| 故障使别名不可用 | 链中只有一个提供方 | 增加第二个故障域 |
| 兜底级联提高成本 | 重试无预算 | 将重试计入预算 |
| 快速错误赢得对冲 | 未校验胜者 | 要求 HTTP 200 和非空 `value` |
| 取消未节省工作 | 服务端继续执行 | 查看 `fixtureWork` 计数 |

## 数字与问答
type: qa
from: phases/17-infrastructure-and-production/19-ai-gateways/code/main.py, phases/17-infrastructure-and-production/16-model-routing/docs/zh.md, phases/13-tools-and-protocols/21-llm-routing-layer/docs/zh.md, phases/17-infrastructure-and-production/19-ai-gateways/outputs/skill-gateway-picker.md, phases/13-tools-and-protocols/21-llm-routing-layer/outputs/skill-routing-config-designer.md

- **兜底带来什么？** 单个提供方错误率 3% 时可用率 97%，两个为 99.94%，三个为 99.997%。
- **路由能省多少？** 案例中同等质量下节省 20-60%。
- **70/30 分流有什么效果？** 相同产品质量下账单下降约 65%。
- **语义缓存省多少？** 重复 agent 循环中节省 30 至 60%。
- **哪些在线关卡可发现漂移？** 每路由点赞、5% 样本的 LLM 评判、升级率和拒绝率。
- **先对哪个指标告警？** 先看兜底使用率，再看网关 P99 延迟。
