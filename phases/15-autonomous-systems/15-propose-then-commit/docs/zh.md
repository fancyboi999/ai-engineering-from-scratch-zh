# 人在回路：先提议后提交（Propose-Then-Commit）

> 2026 年关于 HITL 的共识很具体。它不是"agent 问一下，用户点 Approve"。它是先提议后提交：提议的动作带一个幂等键持久化到一个持久存储；连同意图、数据血缘、碰到的权限、爆炸半径和回滚计划一起呈现给一个审查者；只有在收到肯定确认后才提交；执行后还要核验，确认副作用确实发生了。LangGraph 的 `interrupt()` 加 PostgreSQL checkpoint、Microsoft Agent Framework 的 `RequestInfoEvent`、Cloudflare 的 `waitForApproval()`，实现的都是同一个形态。标志性的失败模式是橡皮图章式批准：没看就点了 "Approve?"。有记录在案的缓解手段是带显式清单的挑战-应答（challenge-and-response）。

**类型：** Learn
**语言：** Python（标准库，带幂等性的先提议后提交状态机）
**前置要求：** 阶段 15 · 12（持久化执行），阶段 15 · 14（绊线）
**预计时间：** ~60 分钟

## 问题背景

agent 采取一个动作。用户得决定：批准还是不批。如果决定是瞬时的，那它大概不是一次审查。如果决定是结构化的，那它慢但可信。工程问题是如何让结构化审查成为阻力最小的那条路。

2023 年那个时代的 HITL 模式是一个同步提示："agent 想给 X 发一封正文为 Y 的邮件——批准吗？"用户点 Approve。大家都觉得系统是安全的。实践中这个界面被大量盖橡皮图章：用户批得飞快，批准预测不了多少东西，而当 agent 出错时，审计轨迹显示一长串用户根本想不起来的批准。

2026 年的模式——先提议后提交——把 HITL 移到一个持久基底上，附上结构化元数据，并要求肯定的提交。每个托管 agent SDK 都有一个版本：LangGraph 的 `interrupt()`、Microsoft Agent Framework 的 `RequestInfoEvent`、Cloudflare 的 `waitForApproval()`。API 名字不同；形态相同。

## 核心概念

### 先提议后提交的状态机

1. **提议（Propose）。** agent 产出一个提议的动作。持久化到一个持久存储（PostgreSQL、Redis、Durable Object）。包含：
   - 意图（agent 为什么要做这个）
   - 数据血缘（什么来源导致了这个提议）
   - 碰到的权限（哪些范围 / 文件 / 端点）
   - 爆炸半径（最坏情况是什么）
   - 回滚计划（如果提交了，我们怎么撤销它）
   - 幂等键（每个提议唯一；重新提交返回同一条记录）
2. **呈现（Surface）。** 审查者看到带全部元数据的提议。审查者是一个人（不是 agent 审查自己）。
3. **提交（Commit）。** 肯定的确认。动作执行。
4. **核验（Verify）。** 执行后，把副作用读回来确认。如果核验步骤失败，系统就处在一个已知的坏状态，告警启动。

### 幂等键

没有幂等键，一次瞬时失败后的重试可能把一个已批准的动作执行两次。具体例子：用户批准"从 A 转 $100 给 B"。网络抖了一下。工作流重试。用户批准了一次，但转账执行了两次。幂等键把这次批准跟单个唯一的副作用绑在一起；第二次执行是个空操作。

这跟 Stripe 和 AWS API 用的是同一个幂等模式。把它复用到 agent 批准上，在 Microsoft Agent Framework 文档里是明说的。

### 持久性：为什么批准比进程活得久

批准等候室是一块 agent 不拥有的状态。工作流被暂停（第 12 课）。当批准到达时，工作流从那个确切的点恢复。这就是为什么 LangGraph 把 `interrupt()` 跟 PostgreSQL checkpoint 配对，而不只是内存状态——两天后的一次批准仍能找到完好无损的工作流。

### 橡皮图章式批准与挑战-应答缓解

HITL 的默认 UI（"Approve" / "Reject" 按钮）产出没有真正审查的飞快批准。有记录在案的缓解手段是：一份挑战-应答清单，要求在 Approve 按钮被启用之前对特定问题给出肯定的回答。具体形态：

- "你理解这碰的是哪个资源吗？[ ]"
- "你核实过爆炸半径可以接受吗？[ ]"
- "如果这失败了你有回滚计划吗？[ ]"

不是为官僚而官僚——是一个强制函数。勾不上这些框的审查者，要么要求澄清（升级），要么拒绝（安全默认）。Anthropic 的 agent 安全研究明确把清单驱动的 HITL 引为对橡皮图章式批准模式的一种缓解。

### 什么算有后果

不是每个动作都需要先提议后提交。2026 年的指南：

- **有后果的动作**（永远 HITL）：不可逆的写入、金融交易、对外通信、生产数据库改动、破坏性的文件系统操作。
- **可逆的动作**（有时 HITL）：对本地文件的编辑、staging 环境改动、有清晰回滚的可逆写入。
- **读取和检查**（从不 HITL）：读一个文件、列资源、调一个只读 API。

### 动作后核验

"提交跑了"不等于"副作用发生了"。网络分区和竞态条件可能产生一个以为自己成功了、而后端并没持久化的工作流。核验步骤在提交后重新读取目标资源来确认。这跟带 `RETURNING` 子句的数据库事务、或 `PutObject` 之后的 AWS `GetObject` 是同一个模式。

### EU AI Act 第 14 条

第 14 条强制要求欧盟高风险 AI 系统有有效的人类监督。"有效"不是装饰。监管措辞明确排除了橡皮图章模式。带挑战-应答的先提议后提交，正是在 Microsoft Agent Governance Toolkit 合规文档里能扛过第 14 条审视的那个形态。

```figure
mx-propose-then-commit
```

## 实际使用

`code/main.py` 用标准库 Python 实现了一个先提议后提交的状态机。持久存储是一个 JSON 文件。幂等键是 (thread_id, action_signature) 的哈希。驱动程序模拟三个案例：一个干净的批准流程、一次瞬时失败后的重试（必须不重复执行），以及一个橡皮图章默认 对比 一个挑战-应答流程。

## 拿去用

`outputs/skill-hitl-design.md` 审查一个提议的 HITL 工作流是否符合先提议后提交的形态，并标出缺失的元数据、幂等性、核验或挑战-应答层。

## 练习

1. 运行 `code/main.py`。确认一个已批准提议的重试用的是持久记录、不重新执行。现在把幂等键改成包含一个时间戳，展示重试会重复执行。

2. 给提议记录扩展一个 `rollback` 字段。模拟一次核验步骤失败的执行。展示回滚自动触发。

3. 读 Microsoft Agent Framework 的 `RequestInfoEvent` 文档。指出该 API 包含、而玩具引擎缺失的一个元数据字段。把它加上，并解释它防范什么。

4. 为一个特定动作（比如"发到一个公开 Twitter 账号"）设计一份挑战-应答清单。审查者必须回答哪三个问题？为什么是这三个？

5. 挑一个同步 "Approve?" 提示就足够（不需要持久存储）的案例。解释为什么，并说出你正在接受的风险类别。

## 关键术语

| 术语 | 大家嘴上怎么说 | 实际指什么 |
|---|---|---|
| Propose-then-commit（先提议后提交） | "两阶段批准" | 持久化的提议 + 肯定的提交 + 核验 |
| Idempotency key（幂等键） | "重试安全的 token" | 每个提议唯一；第二次执行是空操作 |
| Data lineage（数据血缘） | "它从哪来的" | 导致这个提议的那段具体来源内容 |
| Blast radius（爆炸半径） | "最坏情况" | 动作出错时的影响范围 |
| Rubber-stamp（橡皮图章） | "飞快批准" | 没真正审查就点了 "Approve" |
| Challenge-and-response（挑战-应答） | "强制清单" | 审查者必须对特定问题给出肯定确认 |
| RequestInfoEvent | "MS Agent Framework 原语" | 带结构化元数据的持久 HITL 请求 |
| `interrupt()` / `waitForApproval()` | "框架原语" | LangGraph / Cloudflare 同一形态的等价物 |

## 延伸阅读

- [Microsoft Agent Framework — Human in the loop](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop) —— `RequestInfoEvent`、持久批准。
- [Cloudflare Agents — Human in the loop](https://developers.cloudflare.com/agents/concepts/human-in-the-loop/) —— `waitForApproval()` 与 Durable Objects。
- [Anthropic — Measuring agent autonomy in practice](https://www.anthropic.com/research/measuring-agent-autonomy) —— 把 HITL 作为长程风险的缓解。
- [EU AI Act — Article 14: Human oversight](https://artificialintelligenceact.eu/article/14/) —— 高风险系统的监管基线。
- [Anthropic — Claude's Constitution (January 2026)](https://www.anthropic.com/news/claudes-constitution) —— 围绕监督的章程框架。
