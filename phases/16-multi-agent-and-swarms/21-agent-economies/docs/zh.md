# Agent 经济、token 激励、声誉

> 长视野自主 agent（METR 的「1 小时到 8 小时工作曲线」）需要经济能动性。新兴的**五层栈**是：**DePIN**（物理算力）→ **身份**（W3C DID + 声誉资本）→ **认知**（RAG + MCP）→ **结算**（账户抽象）→ **治理**（Agentic DAO）。生产级的 agent 激励网络包括 **Bittensor**（TAO 子网奖励任务专属模型）、**Fetch.ai / ASI Alliance**（ASI-1 Mini LLM + FET 代币）、和 **Gonka**（基于 transformer 的 PoW，把算力重新分配到有产出的 AI 任务上）。学术工作：AAMAS 2025 的去中心化 LaMAS 用 **Shapley 值信用归因** 公平地奖励有贡献的 agent；Google Research 的《Mechanism design for large language models》提出在单调聚合下用二价支付的 **token 拍卖**。本课构建一个最小的 agent 市场，对一条多 agent 流水线应用 Shapley 值信用归因，并跑一场二价 token 拍卖，让博弈论这套机器具体落地。

**类型：** Learn
**语言：** Python（标准库）
**前置要求：** Phase 16 · 16（谈判与议价）、Phase 16 · 09（并行 Swarm 网络）
**预计时间：** ~75 分钟

## 问题背景

当 agent 共同产出价值、却需要被单独奖励时，多 agent 系统就变复杂了。经典机制——平分、最后贡献者通吃——要么不公平要么可被操纵。通过 Shapley 值做基于联盟的奖励从构造上是公平的，但计算昂贵。2025-2026 年的文献推出了有用的近似：Shapley 采样、单调聚合拍卖、以及从确认贡献中累积的链上声誉。

在信用归因之外，这个领域转向了真正的经济 agent：Bittensor TAO 奖励挖矿算力去微调子网专属模型，Fetch.ai/ASI 用 FET 代币奖励 ASI-1 Mini LLM 使用，Gonka 把 transformer 工作量证明重新分配到有产出的 AI 任务上。自主交易的 agent 今天就存在；问题是如何对齐激励。

本课把 agent 经济当成一个具体的问题家族——信用归因、机制设计、声誉——用最少的数学构建每一个，好让想法留得住。

## 核心概念

### 五层 agent 经济栈

1. **DePIN（物理算力）。** 出租 GPU、存储、带宽的去中心化基础设施。Bittensor 子网、Render Network、Akash。不是 agent 专属；agent 用它。
2. **身份。** W3C 去中心化标识符（DID）给每个 agent 一个独立于任何平台的持久 ID。声誉累积到 DID 上。Agent Network Protocol（ANP）用 DID 当发现层。
3. **认知。** agent 的推理循环：LLM + RAG + MCP。这是其他阶段构建的东西。
4. **结算。** 账户抽象（ERC-4337）让 agent 从自己的余额支付 gas，无需持有 ETH。agent 能为服务、为彼此、或为算力付费。
5. **治理。** Agentic DAO：人*和* agent 都对协议变更投票的治理结构，投票权与声誉挂钩。

不是每个生产系统都用全五层。Bittensor 用 1、2，部分用 3、部分用 4，完全不用 5。OpenAI agent 除了 3 哪个都不用。这个栈是一张参考地图，不是要求。

### Bittensor、Fetch.ai、Gonka —— 在跑的是什么

**Bittensor（TAO）。** 子网是专门化的任务（语言建模、图像生成、预测）。矿工提交模型输出。验证者给它们排名；按质押加权的打分分配 TAO 奖励。每个子网有自己的评估。经济教训：为任务专属输出质量付费，而不是为用掉的算力付费。

**Fetch.ai / ASI Alliance。** ASI-1 Mini LLM 跑在 Fetch.ai 的网络上；用户付 FET 代币做推理。「agent 即对等端」叙事在这里更强：Fetch 上的一个 agent 能为一个任务调另一个 agent、用 FET 付钱。

**Gonka。** Transformer 工作量证明：「工作」是 transformer 的前向传播。矿工通过跑有已知正确输出（来自训练数据）的推理任务来赚取。用资源有产出的 PoW 取代基于哈希的 PoW。

截至 2026 年 4 月，这三个都是生产级的。收益分配各不相同。Bittensor 奖励相对子网验证者的质量；Fetch 奖励由付费用户衡量的效用；Gonka 奖励可验证的推理工作。

### Shapley 值信用归因

三个 agent 协作做一个任务。输出得 0.8 分。谁贡献了什么？

Shapley 值：满足四条公理（效率、对称、线性、零贡献）的唯一信用分配。对 agent `i`：

```
shapley(i) = (1/N!) * sum over all orderings O of (v(S_i_O ∪ {i}) - v(S_i_O))
```

其中 `S_i_O` 是排序 `O` 里 `i` 之前的 agent 集合。实践中：枚举所有排列，记录每个 agent 在每个排列里的边际贡献，求平均。

N=3 个 agent 有 6 个排列。N=10 有 360 万——所以实践中你采样排序而非枚举。

### 用于聚合的二价拍卖

Google Research（《Mechanism design for large language models》）提出用二价 token 拍卖来聚合 LLM 输出。设定：N 个 agent 各提一个补全；每个对「被选中」有一个私有价值。拍卖方挑出价值最高的提案，支付*次高*价值。在单调聚合下（价值取决于选了哪个提案，而非有多少出价），这是诚实的——agent 出真实价值。

这对 LLM 系统为何重要：你能把补全任务外包给多个定价不同的 agent；拍卖挑出最好的 + 公平支付，agent 没有谎报的动机。

### 声誉资本

一个绑定 DID 的声誉分数从确认的贡献中累积。一条简单的更新规则：

```
rep(i, t+1) = alpha * rep(i, t) + (1 - alpha) * contribution_quality(i, t)
```

衰减因子 `alpha` 接近 1。声誉：

- 读起来便宜，可用于路由决策（「把难任务发给高声誉 agent」）。
- 伪造起来昂贵（随时间累积，绑定 DID）。
- 可被罚没：未通过验证的贡献做减法。

### AAMAS 2025 去中心化 LaMAS

LaMAS 提案（AAMAS 2025）结合了：DID 身份、Shapley 值信用归因、和一个简单的拍卖机制。关键论断：把信用归因这一步去中心化，让系统可审计、且免疫单点操纵。

### 经济学在哪崩

- **价格预言机操纵。** 如果信用函数能被操纵，agent 就会操纵它。每个机制都需要一个对抗测试。
- **女巫攻击（Sybil）。** 一个运营方拉起 N 个假 agent 来抬高自己的贡献。DID 拖慢但拦不住这个；「伪造声誉的成本」才是缓解。
- **验证成本。** 信用归因只跟验证器一样公平。如果验证便宜（小 LLM），它能被操纵；如果昂贵（人类评审团），系统扩展不了。
- **监管悬顶。** agent 经济与金融监管交叉。截至 2026 年，Bittensor、Fetch、Gonka 在某些司法辖区都处于法律灰色地带。

### agent 经济何时说得通

- **运营方异质的开放网络。** 没有单个团队控制所有 agent。
- **可验证的输出。** 没有验证，信用归因就是瞎猜。
- **长视野工作流。** 一次性任务从声誉累积里得不到好处。
- 在你的司法辖区**代币化支付在法律上可行**。

在封闭的企业系统里，经济学让位于更简单的分配（管理者派活儿、指标是内部的）。经济学文献主要适用于开放网络。

```figure
swarm-auction
```

## 动手构建

`code/main.py` 实现：

- `shapley(value_fn, agents)` —— 对小 N 用枚举做精确 Shapley 计算。
- `second_price_auction(bids)` —— 诚实机制；赢家支付次高价。
- `Reputation` —— 绑定 DID 的声誉，带指数衰减和罚没。
- 演示 1：三个 agent 协作，精确 Shapley 归因信用。
- 演示 2：五个 agent 竞标一个任务槽位；二价拍卖挑赢家 + 支付。
- 演示 3：100 轮把任务分配给声誉异质的 agent；声誉加权路由打败随机。

运行：

```
python3 code/main.py
```

预期输出：每个 agent 的 Shapley 值；展示诚实出价均衡的拍卖结果；预热后声誉加权路由相比随机有 10-20% 质量提升。

## 实际使用

`outputs/skill-economy-designer.md` 设计一个最小的 agent 经济：身份层选择、信用归因机制、支付机制、声誉规则。

## 拿去用

2026 年运行一个 agent 经济：

- **先上声誉，不上代币。** 声誉实现便宜、单独就有价值；代币增加法律和经济复杂度。
- **奖励前先验证。** 绝不在没有独立验证步骤的情况下分配信用。自报质量会招来女巫游戏。
- **用 Shapley 采样，不用 Shapley 精确。** 采样 100-1000 个排序；精确枚举扩展不了。
- **给衰减因子设上限、给声誉设下限。** 无界衰减会抹掉正当贡献者；衰减太慢会奖励陈旧的高声誉 agent。
- **对机制做对抗审计。** 在开放网络前跑红队场景。每个机制都有一套博弈论；你要找的是漏洞，而不是攻击者。

## 练习

1. 跑 `code/main.py`。确认 Shapley 值之和等于总价值（效率公理）。改变价值函数；Shapley 分配是否朝预期方向变化？
2. 实现 Shapley *采样*（对 K 个排序做蒙特卡洛）。K 如何影响近似精度？对 N=4 跟精确做对比。
3. 在拍卖前实现一个联盟形成步骤：agent 能合并成团队、作为一个单元出价。哪些联盟会形成？结果在帕累托意义上比单独出价更好吗？
4. 读 Google Research 机制设计博文。指出一个假设，它一旦被违反就破坏诚实性。在 LLM 设定里那个故障模式长什么样？
5. 读 AAMAS 2025 去中心化 LaMAS 论文。在一个合成任务上对 10 个 agent 实现他们的 Shapley 步骤。精确计算花多久？采样 100 次能逼近到多接近？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| DePIN | 「去中心化物理基础设施」 | 代币激励的算力/存储/带宽。Bittensor、Akash、Render。 |
| DID | 「去中心化标识符」 | 可移植 ID 的 W3C 规范。agent 声誉绑定到 DID，而非平台。 |
| ERC-4337 | 「账户抽象」 | 能赞助 gas 的合约账户，使 agent 支付成为可能。 |
| Shapley value | 「公平信用归因」 | 满足效率、对称、线性、零贡献的唯一分配。 |
| Second-price auction | 「Vickrey 拍卖」 | 诚实机制：赢家支付次高出价。与单调聚合兼容。 |
| Reputation capital | 「累积的质量分数」 | 从确认贡献得来的绑定 DID 分数；随时间衰减。 |
| Agentic DAO | 「agent + 人共同治理」 | agent 投票者作为一等公民的 DAO，投票权与声誉挂钩。 |
| TAO / FET / GPU credits | 「代币计价单位」 | Bittensor TAO、Fetch.ai FET、各种 DePIN 代币。 |

## 延伸阅读

- [The Agent Economy](https://arxiv.org/abs/2602.14219) —— 2026 年五层 agent 经济栈综述
- [Google Research — Mechanism design for large language models](https://research.google/blog/mechanism-design-for-large-language-models/) —— 带单调聚合的 token 拍卖
- [AAMAS 2025 — decentralized LaMAS](https://www.ifaamas.org/Proceedings/aamas2025/pdfs/p2896.pdf) —— Shapley 值信用归因
- [Bittensor TAO documentation](https://docs.bittensor.com/) —— 子网结构与奖励分配
- [Fetch.ai / ASI Alliance](https://fetch.ai/) —— ASI-1 Mini LLM 与 FET 代币
- [W3C Decentralized Identifiers (DIDs) spec](https://www.w3.org/TR/did-core/) —— 身份基础
