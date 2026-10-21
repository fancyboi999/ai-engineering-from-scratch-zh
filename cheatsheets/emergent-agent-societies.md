---
id: emergent-agent-societies
title: 协商、模拟与 agent 经济
code: NS
subtitle: Contract Net、OG-Narrator 议价、Smallville 记忆、心智理论测试、Shapley 贡献分配与第二价格拍卖。
hue: 30
sources: phases/16-multi-agent-and-swarms/16-negotiation-bargaining, phases/16-multi-agent-and-swarms/17-generative-agents-simulation, phases/16-multi-agent-and-swarms/18-theory-of-mind-coordination, phases/16-multi-agent-and-swarms/21-agent-economies
source_hash: 419030814e358594
---

## Contract Net 任务市场
type: flow
from: phases/16-multi-agent-and-swarms/16-negotiation-bargaining/docs/zh.md, phases/16-multi-agent-and-swarms/16-negotiation-bargaining/code/main.py

1. **管理者**：将任务拆成单元。
2. **管理者**：向执行者广播带任务描述的 `cfp`。
3. **竞标者**：返回包含 `(price, eta, confidence)` 的 **propose**，或返回 **refuse**。
4. **管理者**：保留价格未超预算且 eta 未超截止时间的报价。
5. **管理者**：选择 conf/price 最大的报价，发送 **accept-proposal**。
6. **管理者**：向未中标者发送 **reject-proposal**，让他们竞标其他任务。

## 协商机制
type: concepts
from: phases/16-multi-agent-and-swarms/16-negotiation-bargaining/docs/zh.md

- **OG-Narrator**：确定性报价生成器计算价格，LLM 仅负责表述。
- **报价生成器**：在价格上使用 Rubinstein 议价、Zeuthen 策略或以牙还牙策略。
- **规则**：让 LLM 表述，不让 LLM 计算报价。
- **结构化提案**：由 LLM 起草，发送前用 schema 校验。
- **CoT 隐藏**：获胜者私下计算策略，公开通道只显示报价。
- **人格操纵**：表现急迫的人格可多获得约 20% 收益。

## 代码中的议价
type: annotated-code
lang: python
from: phases/16-multi-agent-and-swarms/16-negotiation-bargaining/code/main.py

```python
state = BargainState(buyer_max=buyer_max, seller_min=seller_min)
og_narrator_bargain(state, rng, concession=0.35)  # 买方报价
seller_response(state, rng, concession=0.3)       # 卖方还价
move = max(1, int(concession * (state.seller_offer - prior)))
candidate = min(candidate, state.buyer_max)       # 不超过自身上限
naive_llm_bargain(state, rng)          # 方差高，经常超出 ZOPA
bench_deal_rate(buyer_fn, label, trials=1000)     # 百分比成交率
winner = max(feasible, key=lambda b: b.confidence / max(b.price, 1))
```

## 生成式 agent 循环
type: architecture
from: phases/16-multi-agent-and-swarms/17-generative-agents-simulation/docs/zh.md, phases/16-multi-agent-and-swarms/17-generative-agents-simulation/code/main.py

```arch
node | obs | 1,1 | 观察 | 邻居的邀请 | client
node | stream | 2,1 | 记忆流 | 仅追加日志 | store
node | retr | 3,1 | 检索 | 按综合分数取 top-k | process
node | refl | 2,2 | 反思 | 新信念写回记忆流 | model
node | plan | 3,2 | 计划 | 日期、小时、动作 | model
node | act | 4,2 | 行动 | 前往 HobbsCafe | process
edge | obs | stream | 观察
edge | stream | retr | 评分
edge | stream | refl | 重要记忆
edge | refl | stream | 反思条目
edge | retr | plan | top-k
edge | plan | act | 时钟步
```

## 记忆检索
type: annotated-code
lang: python
from: phases/16-multi-agent-and-swarms/17-generative-agents-simulation/code/main.py

```python
top = retrieve_top_k(stream, query="party cafe", tick=4, k=3)
recency = math.exp(-0.3 * (tick - m.ts))     # 随时间指数衰减
importance = m.importance / 10.0              # 自评 1 至 10
relevance = 0.6 if any(w in m.content.lower() for w in query.lower().split()) else 0.1
score = recency + importance + relevance  # 排序，保留 [:k]
a.reflect(tick)          # 最近 5 个时钟步内 importance >= 6
a.update_plan(tick)      # 信念添加 Plan(tick=5, where="HobbsCafe")
action = a.act(tick)     # 到达计划时钟步时移动
```

## 心智理论与协调
type: concepts
from: phases/16-multi-agent-and-swarms/18-theory-of-mind-coordination/docs/zh.md, phases/16-multi-agent-and-swarms/18-theory-of-mind-coordination/code/main.py

- **零阶**：不建模他人。agent 仅根据自身观察行动。
- **一阶**：为每个其他 agent 的信念建模。“Alice 相信 X。”
- **二阶**：递归信念。“Alice 相信 Bob 相信 X。”
- **ToM 状态**：使用 `other_models` 属性，保持 `{agent_id: belief_list}` 形式。
- **Riedl 指标**：与身份关联的差异化、目标导向的互补性、高阶协同。
- **真实信号**：随时间体现的互补性，以及在 T+2 轮内出现的预判与纠正。
- **演示**：`run_trial(n_agents, n_boxes, tom, seed, max_turns=10)` 统计重复行动。

## 代码中的经济机制
type: task-table
from: phases/16-multi-agent-and-swarms/21-agent-economies/code/main.py, phases/16-multi-agent-and-swarms/21-agent-economies/docs/zh.md

| 任务 | 代码 |
|---|---|
| 精确 Shapley，适合小 N | `shapley_exact(value_fn, agents)` |
| 采样 Shapley | `shapley_sampled(value_fn, agents, samples, rng)` |
| 诚实出价拍卖 | `second_price(bids)` |
| 赢家支付 | `payment = sorted_bids[1].value` |
| 信誉存储 | `Reputation(alpha=0.95, floor=0.1)` |
| 任务后更新 | `rep.update(agent, quality)` |
| 按信誉路由 | `weighted_choice(agents, rep.weights(agents), rng)` |

## 运行演示
type: command-table
from: phases/16-multi-agent-and-swarms/16-negotiation-bargaining/docs/zh.md, phases/16-multi-agent-and-swarms/17-generative-agents-simulation/docs/zh.md, phases/16-multi-agent-and-swarms/18-theory-of-mind-coordination/docs/zh.md, phases/16-multi-agent-and-swarms/21-agent-economies/docs/zh.md

| 命令 | 作用 |
|---|---|
| 在 16-16 中运行 `python3 code/main.py` | 朴素 LLM 成交率约 65-75%，OG-Narrator 约 85-95% |
| 在 16-17 中运行 `python3 code/main.py` | 5 个 agent 中有 3 个在聚会上汇合 |
| 在 16-18 中运行 `python3 code/main.py` | ToM 重复率约 5%，零阶约 35% |
| 在 16-21 中运行 `python3 code/main.py` | 信誉路由带来 10-20% 的质量提升 |

## 课程代码的默认值
type: defaults
from: phases/16-multi-agent-and-swarms/16-negotiation-bargaining/code/main.py, phases/16-multi-agent-and-swarms/17-generative-agents-simulation/code/main.py, phases/16-multi-agent-and-swarms/17-generative-agents-simulation/docs/zh.md, phases/16-multi-agent-and-swarms/18-theory-of-mind-coordination/code/main.py, phases/16-multi-agent-and-swarms/21-agent-economies/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `max_rounds` | 5 | 每次试验的议价轮数 |
| 买方 `concession` | 0.35 | 卖方使用 0.3 |
| 议价 `trials` | 1000 | ToM 基准使用 200 |
| 检索 `k` | 3 | prompt 中的 top-k 记忆 |
| 反思触发阈值 | 150 | 未处理记忆的重要性总和 |
| `max_turns` | 10 | ToM 收集 token 的轮数预算 |
| `alpha` | 0.95 | 信誉衰减 |
| `floor` | 0.1 | 最低信誉分数 |

## 应记住的数值
type: concepts
from: phases/16-multi-agent-and-swarms/16-negotiation-bargaining/docs/zh.md, phases/16-multi-agent-and-swarms/17-generative-agents-simulation/docs/zh.md, phases/16-multi-agent-and-swarms/21-agent-economies/docs/zh.md

- **OG-Narrator**：成交率从 26.67% 提高到 88.88%。
- **竞赛**：约 180k 次协商。隐藏策略的 agent 获胜。
- **对称配对**：约 40% 场景产生不公平结果。
- **Smallville**：25 个 agent，其中 24 个起初不知道聚会。
- **Shapley 成本**：N=3 有 6 个排列，N=10 有 3.6M 个。
- **Shapley 采样**：100-1000 种顺序。

## 失败模式
type: troubleshooting
from: phases/16-multi-agent-and-swarms/16-negotiation-bargaining/docs/zh.md, phases/16-multi-agent-and-swarms/17-generative-agents-simulation/docs/zh.md, phases/16-multi-agent-and-swarms/18-theory-of-mind-coordination/docs/zh.md, phases/16-multi-agent-and-swarms/21-agent-economies/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 报价超出 ZOPA | LLM 计算价格 | 使用确定性报价生成器 |
| 对方知道你的底线 | 可见轨迹中包含保留价格 | 使用独立的私有草稿区 |
| agent 进入已关门商店 | 空间规范错误 | 显式检测规范违反 |
| 检索成本增长 | 记忆溢出 | 总结并裁剪，衰减低重要性记忆 |
| 编造关系 | 反思幻觉 | 在 prompt 中写入源记忆标识 |
| 只在演示中协调成功 | 仅靠 prompt 包装，缺少对照 | 设置对照条件并检验 `p < 0.05` |
| 信念绑定到错误 agent | 长时间跨度、上下文限制 | 使用显式或外部 ToM 存储 |
| 单个操作者夸大贡献 | 女巫攻击 | 使用 DID，并提高伪造信誉的成本 |

## 问答
type: qa
from: phases/16-multi-agent-and-swarms/16-negotiation-bargaining/docs/zh.md, phases/16-multi-agent-and-swarms/17-generative-agents-simulation/docs/zh.md, phases/16-multi-agent-and-swarms/21-agent-economies/docs/zh.md

- **更大的模型议价更好吗？** 不。语言更好，但策略错误相近。
- **Contract Net 为何能扩展到 100 名以上执行者？** 它采用广播与响应，不是同步聊天。
- **Smallville 可以删掉哪部分？** 都不能。每项消融都会降低可信度。
- **为何使用第二价格？** 在单调聚合下，agent 会按真实价值出价。
- **何时适合 agent 经济？** 开放网络、可验证输出、长周期工作。

## 交付清单
type: tips
from: phases/16-multi-agent-and-swarms/16-negotiation-bargaining/docs/zh.md, phases/16-multi-agent-and-swarms/17-generative-agents-simulation/docs/zh.md, phases/16-multi-agent-and-swarms/21-agent-economies/docs/zh.md

- 将议价限制在 3-5 轮，僵局时升级给调解者。
- 在协议边界拒绝超出 ZOPA 的报价。
- 记忆只追加，纠正作为新条目写入。
- 记录驱动每次行动的 top-k 记忆。
- 先用信誉机制，再考虑 token。
- 奖励前先验证。
