# 谈判与议价

> agent 谈判资源、价格、任务分配和条款。2026 年的基准集很清楚：NegotiationArena（arXiv:2402.05863）显示 LLM 能通过人设操纵（「绝望」）把收益提升约 20%；《Measuring Bargaining Abilities》（arXiv:2402.15813）显示买方比卖方难、且规模帮不上忙——它们的 **OG-Narrator**（确定性报价生成器 + LLM 叙述器）把成交率从 26.67% 推到 88.88%；大规模自主谈判竞赛（arXiv:2503.06416）跑了约 18 万场谈判，发现**隐藏思维链**的 agent 靠向对手藏起推理而获胜；Bhattacharya 等人 2025 年用哈佛谈判项目（Harvard Negotiation Project）指标，把 Llama-3 排为最有效、Claude-3 最激进、GPT-4 最公平。本课实现合同网协议（Contract Net Protocol，FIPA 的祖宗，第 02 课）、接上一个 LLM 风格的买/卖方、跑一个 OG-Narrator 风格的拆解、并测量每个结构选择如何改变成交率。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** Phase 16 · 02（FIPA-ACL 遗产）、Phase 16 · 09（并行 Swarm 网络）
**预计时间：** ~75 分钟

## 问题背景

两个 agent 需要就一个价格达成一致。如果只给纯语言 prompt 让它们自己来，2024-2026 年的 LLM 成交率低得惊人（在 arXiv:2402.15813 里参数收紧的议价上约 27%）。规模解决不了它：GPT-4 在议价的*结构*上并不比 GPT-3.5 强；它强在议价的*语言*上。

根因在于 LLM 把两件活儿混为一谈——决定报价、和叙述报价。OG-Narrator 把这两件分开：一个确定性报价生成器计算数值动作；LLM 只负责叙述。成交率跳到约 89%。

这呼应了一个经典的多 agent 发现：把机制与通信层解耦能赢。合同网协议（FIPA，1996；Smith，1980）是参考性的任务市场机制。把一个 LLM 插进叙述槽位，你就得到了一个现代的 LLM 驱动任务市场。

## 核心概念

### 一段话讲清合同网

Smith 1980 年的合同网协议：一个 **manager** 广播一个**征集提案（call for proposals，cfp）**；**竞标者**用包含报价的 **propose** 消息回应；manager 挑出赢家，向赢家发 **accept-proposal**、向输家发 **reject-proposal**。赢家执行工作。可选消息：**refuse**（竞标者拒绝提案）。FIPA 把它编成了 `fipa-contract-net` 交互协议。

### OG-Narrator 为何赢

《Measuring Bargaining Abilities of Language Models》（arXiv:2402.15813）观察到：

- LLM 常常违反议价规则（在荒谬价位报价、无视对方的 ZOPA）。
- 它们锚定得差（接受糟糕的第一报价；还价的金额是象征性的而非战略性的）。
- 光靠规模修不好这些。更大的模型造出更像样的语言，但战略错误差不多。

OG-Narrator 拆解：

```
           ┌──────────────────┐        ┌──────────────────┐
  state  → │ offer generator  │ price → │  LLM narrator    │ → message
           │  (deterministic) │        │  (writes the     │
           │                  │        │   human-style    │
           └──────────────────┘        │   accompaniment) │
                                       └──────────────────┘
```

报价生成器是一个经典谈判策略：Rubinstein 议价模型、Zeuthen 策略、或就价格做简单的针锋相对（tit-for-tat）。LLM 负责叙述。消息里包含确定性的价格和自然语言的框定。

成交率跳升是因为：
- 价格留在议价区内。
- 锚定是战略性的，不是情绪化的。
- LLM 干它擅长的事：写作。

### NegotiationArena 的发现

arXiv:2402.05863 提供了标准基准。头条发现：

- LLM 能通过采用人设把收益提升约 20%（「我急着周五前把这个卖掉」）——人设操纵是个真实战术。
- 公平/合作的 agent 会被对抗性的 agent 利用；防御需要显式的反向作态。
- 在约 40% 的基准场景里，对称配对收敛到不公平的结果。

这不是「LLM 是糟糕的谈判者」。这是「LLM 谈判得太像人了，连可被利用的那部分也一样」。

### 思维链隐藏

大规模自主谈判竞赛（arXiv:2503.06416）跨多种 LLM 策略跑了约 18 万场谈判。赢家向对手隐藏自己的推理：

- 如果一个 agent 把「我最多到 75 美元；我的保留价是 70」打进一个公开可见的草稿区，对手就读到了。
- 赢家私下计算策略；输出通道里只有报价和最低限度的必要叙述。

这是经典博弈论（Aumann 1976 关于理性与信息）在 2026 年的回响：暴露你的私有估值会损失收益。LLM 不会本能地懂这点，乐呵呵地把保留价打进会被对手看到的推理轨迹里。

工程要点：把私有草稿上下文和公开消息上下文分开。不是可选项。

### Bhattacharya 等人 2025 —— 模型排名

在哈佛谈判项目指标上（原则性谈判、尊重 BATNA、利益互惠）：

- **Llama-3** 最擅长达成交易（成交率 + 收益）。
- **Claude-3** 是最激进的谈判者（高锚定、晚让步）。
- **GPT-4** 最公平（跨配对的收益方差最小）。

这是 2025 年的快照。重点不是 2026 年 4 月哪个模型赢——而是不同基础模型有持续的谈判风格。异质集成（第 15 课）把这当作一个多样性来源。

### 通过合同网 + LLM 做任务分配

合同网在 LLM 多 agent 里的现代复用：

1. manager agent 把任务拆成单元。
2. 向 worker agent 广播带任务描述的 `cfp`。
3. 每个 worker 返回一个报价：`(price, eta, confidence)`，其中 price 可以是 token、计算单元、或美元。
4. manager 挑出赢家（单个或多个，视任务而定）并授予。
5. 被拒的 worker 可自由去竞标其他任务。

这能轻松扩展到超过 100 个 worker，因为协调是「广播-响应」，不是同步聊天。生产里在用：Microsoft Agent Framework 的 orchestration 模式、一些 LangGraph 实现。

### LLM-利益相关方交互式谈判

NeurIPS 2024（https://proceedings.neurips.cc/paper_files/paper/2024/file/984dd3db213db2d1454a163b65b84d08-Paper-Datasets_and_Benchmarks_Track.pdf）引入了带**秘密分数**和**最低接受阈值**的多方可计分博弈。每个利益相关方有私有效用；LLM 必须从消息里推断它们。这是两方议价向 N 方联盟形成的推广。对带异质 worker 能力的生产任务市场有意义。

### 叙述对机制的规则

在所有 2024-2026 年的谈判基准里，一致的工程规则是：

> 让 LLM 叙述。不要让 LLM 计算报价。

如果报价需要是一个数字（价格、ETA、数量），就从谈判状态确定性地生成它，让 LLM 产出框定。如果报价需要是一个提案结构（任务拆解、角色分配），让 LLM 起草它，但发出前对照 schema 校验、做约束检查。

```figure
a5-og-narrator
```

## 动手构建

`code/main.py` 实现：

- `ContractNetManager`、`ContractNetTask`、`Bid` —— manager + 竞标者，广播 cfp、收集提案、授予。
- `og_narrator_bargain(state, rng)` —— OG-Narrator 买方：朝中点做确定性的 Zeuthen 式让步。
- `seller_response(state, rng)` —— 确定性的卖方还价策略（两种风格共同的结构性 ground truth）。
- `naive_llm_bargain(state, rng)` —— 模拟一个全 LLM 议价者：以高方差挑价格，常落在 ZOPA 之外。
- 测量：在 1000 次试验上的成交率，每次试验采样新的保留价。

运行：

```
python3 code/main.py
```

预期输出：朴素 LLM 成交率约 65-75%；OG-Narrator 成交率约 85-95%；这 15-25 个点的差距就是把报价生成与叙述拆开带来的结构优势。外加一个三竞标者、一个任务的合同网任务市场分配示例。

## 实际使用

`outputs/skill-bargainer-designer.md` 设计一个议价协议：谁生成报价（确定性还是 LLM）、谁叙述、私有草稿如何与公开消息分开、成交率如何监控。

## 拿去用

生产议价检查清单：

- **独立草稿区。** 私有状态绝不进入对手的上下文。这点不容商量。
- **确定性报价生成。** 价格、数量、ETA：计算，别 prompt。
- **校验所有进来的报价**，对照 schema。在协议边界处拒掉 ZOPA 之外的报价。
- **给轮数设界。** 最多 3-5 轮；僵局时上报给调解者。
- **持续测量成交率和收益方差。** 成交率下降是一个症状——常是 prompt 漂移或对手侧攻击。
- **记录所有被拒提案**，附确定性理由。对合同网 manager 来说，落选竞标者需要理解为什么。

## 练习

1. 跑 `code/main.py`。确认 OG-Narrator 在成交率上打败朴素 LLM。差多少？
2. 实现**基于人设的收益提升**（arXiv:2402.05863）——买方仅在叙述里采用「这周急着买到」人设，报价生成器不变。成交率或收益变了吗？
3. 实现思维链**隐藏**：维护一个不传给对手的私有草稿字符串。如果你不小心泄露了它（通过交换通道来模拟）会怎样？
4. 把合同网扩展成带保留价的 N 竞标者拍卖。当出价全部超过保留价时，manager 如何在最低价和最高质量之间抉择？你选哪条授予规则，为什么？
5. 读 Bhattacharya 等人 2025 年关于哈佛谈判项目指标的内容。实现两个不同风格（激进 vs 公平）的议价者。测量对称和非对称配对下的收益方差。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| Contract Net | 「任务市场」 | Smith 1980、FIPA 1996。cfp + propose + accept/reject。标准的任务市场。 |
| ZOPA | 「可能达成一致的区间」 | 买方上限与卖方下限的重叠。落在它之外的报价成不了交。 |
| BATNA | 「谈判协议的最佳替代方案」 | 这笔交易失败时你的退路。它定了你的保留价。 |
| OG-Narrator | 「报价生成器 + 叙述器」 | 拆解：确定性报价、LLM 叙述。 |
| Zeuthen strategy | 「风险最小化的让步」 | 基于风险限度做让步的经典报价生成器。 |
| Rubinstein bargaining | 「交替报价均衡」 | 带贴现的无限期议价的博弈论模型。 |
| CoT concealment | 「藏起你的推理」 | arXiv:2503.06416 里的赢家保留私有草稿；公开通道只露报价。 |
| Persona manipulation | 「情绪化作态」 | arXiv:2402.05863：靠绝望/紧迫人设带来约 20% 收益提升。 |

## 延伸阅读

- [NegotiationArena](https://arxiv.org/abs/2402.05863) —— 基准；人设操纵与被利用的发现
- [Measuring Bargaining Abilities of Language Models](https://arxiv.org/abs/2402.15813) —— OG-Narrator 与「买方比卖方难」的结果
- [Large-Scale Autonomous Negotiation Competition](https://arxiv.org/abs/2503.06416) —— 约 18 万场谈判；隐藏思维链者胜
- [LLM-Stakeholders Interactive Negotiation (NeurIPS 2024)](https://proceedings.neurips.cc/paper_files/paper/2024/file/984dd3db213db2d1454a163b65b84d08-Paper-Datasets_and_Benchmarks_Track.pdf) —— 带秘密效用的多方可计分博弈
- [Smith 1980 — The Contract Net Protocol](https://ieeexplore.ieee.org/document/1675516) —— 经典机制，IEEE Transactions on Computers
