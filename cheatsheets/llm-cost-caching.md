---
id: llm-cost-caching
title: LLM 成本、缓存与批处理 API
code: LC
subtitle: 计算每次调用价格、缓存前缀和语义、批处理离线任务并限制支出。使用课程中的 Python 与 Rust。
hue: 40
sources: phases/11-llm-engineering/11-caching-cost, phases/11-llm-engineering/15-prompt-caching, phases/17-infrastructure-and-production/14-prompt-semantic-caching, phases/17-infrastructure-and-production/15-batch-apis, phases/17-infrastructure-and-production/27-finops-llms, projects/token-counter-and-cost-meter, projects/agent-budget-planner
source_hash: 35f2d1031b64a1c3
---

## 任务
type: task-table
span: 2
from: phases/11-llm-engineering/11-caching-cost/docs/zh.md, phases/11-llm-engineering/11-caching-cost/code/caching_cost.py, phases/11-llm-engineering/15-prompt-caching/docs/zh.md

| 任务 | 代码 |
|---|---|
| 计算一次调用成本 | `calculate_cost(model, input_tokens, output_tokens, cached_input_tokens=0)` |
| 标记可缓存区块 | `"cache_control": {"type": "ephemeral"}` |
| 将区块保留一小时 | `"cache_control": {"type": "ephemeral", "ttl": "1h"}` |
| 读取 Anthropic 缓存命中量 | `response.usage.cache_read_input_tokens` |
| 读取 OpenAI 缓存命中量 | `resp.usage.prompt_tokens_details.cached_tokens` |
| 创建 Gemini 缓存 | `client.caches.create(model=<model>, config=...)` |
| 使用 Gemini 缓存 | `config=types.GenerateContentConfig(cached_content=cache.name)` |
| 将查询路由至最便宜模型 | `route_model(query, tier="pro")` |

## 缓存稳定前缀
type: annotated-code
lang: python
from: phases/11-llm-engineering/15-prompt-caching/docs/zh.md, phases/11-llm-engineering/11-caching-cost/docs/zh.md

```python
SYSTEM = [{
    "type": "text",
    "text": RUBRIC,  # 稳定文本放在前面
    "cache_control": {"type": "ephemeral"},  # TTL 为 5 min
}]
response = client.messages.create(
    model="<model>", max_tokens=1024,
    system=SYSTEM,
    messages=[{"role": "user", "content": code}],  # 可变文本放在最后
)
response.usage.cache_creation_input_tokens  # 按 1.25x 计费
response.usage.cache_read_input_tokens  # 按 0.1x 计费
```

## 关键数字
type: concepts
from: phases/11-llm-engineering/15-prompt-caching/docs/zh.md, phases/17-infrastructure-and-production/14-prompt-semantic-caching/docs/zh.md, phases/17-infrastructure-and-production/15-batch-apis/docs/zh.md, phases/17-infrastructure-and-production/27-finops-llms/docs/zh.md, phases/11-llm-engineering/11-caching-cost/docs/zh.md

- **缓存写入**：5 min TTL 为基础价的 1.25x，1 小时 TTL 为 2x。
- **缓存读取**：$0.30/M，未缓存为 $3.00/M。便宜十倍。
- **盈亏平衡**：1 次写入和 1 次读取为 0.675x；1 次写入和 10 次读取为 0.205x。
- **复用规则**：TTL 内读取 3 次或更多的区块适合缓存。
- **批处理**：输入与输出均半价。保证 24 h 内完成，通常 2 至 6 h。
- **批处理加缓存**：约为同步无缓存账单的 10%。
- **模型路由**：节省 40 至 70% 的模型成本。
- **全部措施叠加**：约为朴素基线的 5 至 10%。

## 按顺序设置预算保护
type: flow
from: phases/17-infrastructure-and-production/27-finops-llms/docs/zh.md, phases/11-llm-engineering/11-caching-cost/docs/zh.md, phases/11-llm-engineering/11-caching-cost/code/caching_cost.py

1. **限流**：每个租户设为预期峰值的 2 至 3x。返回 429 和 `Retry-After`。
2. **每日支出上限**：合同上限的 1.5 至 3x。收紧速率并告警。
3. **紧急开关**：相对租户基线的支出 z 分数超过 4 时，自动暂停并通知值班人员。
4. **预算的 70%**：`CostTracker` 增加警告提醒。
5. **预算的 85%**：节流。只路由到更便宜的模型。
6. **预算的 95%**：停止。仅返回缓存响应。

## 两层缓存
type: architecture
from: phases/17-infrastructure-and-production/14-prompt-semantic-caching/docs/zh.md, phases/11-llm-engineering/11-caching-cost/docs/zh.md

```arch
node | query | 1,1 | 用户查询 | | client
node | l1 | 2,1 | L1 语义缓存 | 嵌入，余弦相似度 0.95+ | store
node | l2 | 3,1 | L2 前缀缓存 | 服务商复用 KV | store
node | llm | 4,1 | 模型 | 未命中按全价计费 | model
node | hit | 2,2 | 缓存响应 | 无 LLM 调用 |
node | track | 4,2 | 成本跟踪器 | token、成本、user_id | process
edge | query | l1 | 嵌入
edge | l1 | hit | 命中
edge | l1 | l2 | 未命中
edge | l2 | llm | 前缀
edge | llm | track | 用量
```

## 服务商 prompt 缓存
type: comparison
from: phases/11-llm-engineering/15-prompt-caching/docs/zh.md

| 因素 | Anthropic | OpenAI | Gemini |
|---|---|---|---|
| API 形式 | `cache_control` 标记 | 自动前缀 | `CachedContent` API |
| 命中价格 | 输入折扣 90% | 输入折扣 50% | 约为正常价的 25% |
| 写入成本 | 附加费 25% | 无 | 按 token·小时收取存储费 |
| 默认 TTL | 5 min，可选 1 小时 | 最长 1 小时 | 用户设置，1 小时 |
| 最小前缀 | 1,024 token，Haiku 为 2,048 | 1,024 token | Flash 为 4,096，Pro 为 32,768 |
| 适用场景 | 稳定的 10k+ prompt、多轮交互 | 无服务器、无自定义基础设施 | 多天复用同一语料 |

## 代码默认值
type: defaults
from: phases/11-llm-engineering/11-caching-cost/code/caching_cost.py, phases/17-infrastructure-and-production/27-finops-llms/code/main.py, phases/11-llm-engineering/15-prompt-caching/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `similarity_threshold` | 0.85 | `SemanticCache`。演示使用 0.75 |
| `ttl_seconds` | 3600 | 精确缓存与语义缓存 |
| `max_size` | 1000 | `ExactCache`。淘汰最旧条目 |
| `temperature` | 0.0 | 大于 0 时跳过精确缓存 |
| `monthly_budget` | 1000.0 | `CostTracker` 告警基准 |
| `spend_cap_multiplier` | 2.0 | 上限为合同金额乘以此值 |
| `kill_z_score` | 4.0 | 超过时暂停租户 |
| Anthropic TTL | 5 分钟 | 用 `"ttl": "1h"` 设置一小时 |

## 提交批处理
type: annotated-code
lang: python
from: phases/11-llm-engineering/11-caching-cost/docs/zh.md

```python
requests.append({
    "custom_id": f"request-{i}",  # 将结果匹配到输入
    "method": "POST", "url": "/v1/chat/completions",
    "body": {"model": "<model>", "messages": [{"role": "user", "content": query}]},
})
batch_file = client.files.create(file=open("batch_input.jsonl", "rb"), purpose="batch")
batch = client.batches.create(
    input_file_id=batch_file.id,
    endpoint="/v1/chat/completions",
    completion_window="24h",  # 半价，24 小时内返回结果
)
```

## 故障排查
type: troubleshooting
from: phases/17-infrastructure-and-production/14-prompt-semantic-caching/docs/zh.md, phases/11-llm-engineering/15-prompt-caching/docs/zh.md, phases/11-llm-engineering/11-caching-cost/docs/zh.md, projects/token-counter-and-cost-meter/solution

| 现象 | 原因 | 修正 |
|---|---|---|
| 命中率约 7% | 前缀中包含时间或请求标识 | 将动态文本放在边界后 |
| 并行调用产生 N 次写入 | 调用早于首次写入完成 | 先单独发送请求 1，再发送其余请求 |
| `cache_read_input_tokens` 始终为 0 | 缓存键漂移 | 在 CI 中检查两个用量字段 |
| 区块未缓存 | 少于 1,024 token（Haiku 为 2,048） | 增大缓存区块 |
| 部署后 OpenAI 不再命中 | 工具重排或新增 `user` 字段 | 以稳定顺序序列化工具 |
| `cached exceeds input` | 将缓存计为额外 token | 缓存是输入的子集 |

## 运行代码
type: command-table
span: 2
from: phases/11-llm-engineering/15-prompt-caching/code/main.py, projects/token-counter-and-cost-meter/README.md, projects/agent-budget-planner/README.md, projects/agent-budget-planner/solution/cli.py

| 命令 | 作用 |
|---|---|
| `python main.py` | 在 `code/` 中运行课程模拟器 |
| `python3 scripts/project_test.py <project> --stage 1 --path <workspace>` | 评测一个阶段 |
| `python3 scripts/project_test.py <project> --all --solution --strict` | 评测参考解答 |
| `python3 <workspace>/usage.py <usage-file> --out usage-ledger.json` | 将记录的用量重放到账本 |
| `python3 cli.py samples/input.json --mode execute --output budget.json` | 运行预算规划器任务 |

## 项目账本
type: concepts
span: 2
from: projects/token-counter-and-cost-meter/solution, projects/token-counter-and-cost-meter/README.md, projects/agent-budget-planner/solution/main.py, projects/agent-budget-planner/solution/cli.py, projects/agent-budget-planner/README.md

- **费率**：每 token 的整数纳美元。来自测试输入，并非服务商报价。
- **estimate**：`text.chars().count()` 除以 `chars_per_token`，向上取整。比例为 0 会报错。
- **cost**：`usage.input - usage.cached` 按输入费率计费，再加缓存与输出。各项使用 `checked_mul`。
- **reserve**：`spent + sum(holds) + amount > limit` 时抛出 `budget exceeded`。
- **settle**：实际成本超出预留额时抛出 `actual cost exceeds reservation`。
- **状态**：`completed`、`rejected`、`needs_reconciliation`。
- **示例运行**：100 单位上限对应 190 单位需求。两个任务通过，结算 95 单位。

## 问答
type: qa
from: phases/11-llm-engineering/15-prompt-caching/docs/zh.md, phases/11-llm-engineering/11-caching-cost/docs/zh.md, phases/17-infrastructure-and-production/14-prompt-semantic-caching/docs/zh.md, phases/17-infrastructure-and-production/15-batch-apis/docs/zh.md, phases/17-infrastructure-and-production/27-finops-llms/docs/zh.md

- **prompt 缓存还是语义缓存？** prompt：token 相同。语义：含义相同。
- **语义阈值设多少？** 0.92 至 0.95。0.85 时会出现错误答案。
- **使用哪个单位指标？** 每个已解决查询的成本，而非每百万 token 美元数。

## 提示
type: tips
from: phases/17-infrastructure-and-production/27-finops-llms/docs/zh.md, phases/11-llm-engineering/15-prompt-caching/docs/zh.md

- 为每次调用标记 `user_id`、`task_id`、`route` 与 `tenant_id`。
- 分别统计 prompt、工具、记忆和响应 token。
- 将读取占比高于 80% 作为部署门禁。
