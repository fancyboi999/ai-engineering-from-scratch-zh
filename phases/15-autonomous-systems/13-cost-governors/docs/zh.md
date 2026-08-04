# 动作预算、迭代上限与成本调控器

> 一个中型电商 agent 的月度 LLM 成本，在团队启用了"订单追踪"技能后，从 $1,200 跳到 $4,800。这不是定价 bug。这是一个 agent 找到了一个新循环，然后一直在循环里花钱。微软的 Agent Governance Toolkit（2026 年 4 月 2 日）把对这一类问题的防御写成了规范：每请求 `max_tokens`、每任务的 token 和美元预算、每日/每月上限、迭代上限、分层模型路由、prompt 缓存、上下文窗口化、对昂贵动作的 HITL 检查点、预算突破时的急停开关。Anthropic 的 Claude Code Agent SDK 用不同的名字交付同一套原语。金融速率限制——比如 10 分钟内超过 $50 就切断访问——比月度上限更快地抓住循环。

**类型：** Learn
**语言：** Python（标准库，分层成本调控器模拟器）
**前置要求：** 阶段 15 · 10（权限模式），阶段 15 · 12（持久化执行）
**预计时间：** ~60 分钟

## 问题背景

自主 agent 在每一轮上都花真钱。聊天机器人的坏输出是一条坏回复；agent 的坏循环是一张账单。业界对这种失败模式有据可查的术语是"Denial of Wallet"（钱包拒绝服务）——agent 一直推理、一直调工具、一直计费，没有任何东西阻止它，因为压根没设计任何东西去阻止。

修法不是一个数字。它是不同时间尺度和粒度上的一摞限制：每请求、每任务、每小时、每天、每月。一个设计良好的栈能在几分钟内抓住失控循环、几小时内抓住缓慢泄漏、一天内抓住一次坏发布。当 agent 是长程且自主时，正是这同一个栈让预算还能算数。

这是一节工程课：数学是琐碎的，纪律才是团队栽跟头的地方。下面这串限制，要么在微软 Agent Governance Toolkit 里、要么在 Anthropic Claude Code Agent SDK 文档里被点过名。

## 核心概念

### 成本调控器栈

1. **每请求 `max_tokens`。** 简单。防止任何一次调用吐出无界的补全。
2. **每任务 token 预算。** 整个运行加起来，不超过 N 个 token。到上限硬停。
3. **每任务美元预算。** 跟 token 一样但用货币计。Claude Code 里的 `max_budget_usd`。
4. **每工具调用上限。** 不超过 N 次 `WebFetch` 调用、N 次 `shell_exec` 调用，等等。
5. **迭代上限（`max_turns`）。** agent 循环的总迭代数；防止无限推理循环。
6. **每分钟 / 每小时 / 每天 / 每月上限。** 滚动窗口。在不同时间尺度上抓住泄漏。
7. **金融速率限制。** 比如"如果 10 分钟内花费超过 $50，就切断访问"。在月度上限触发之前抓住基于循环的烧钱。
8. **分层模型路由。** 默认用较小的模型；只在一个分类器判断任务值得时才升级到更大的。
9. **prompt 缓存。** 系统 prompt 和稳定的上下文存在服务方缓存里；重发的 token 成本近乎为零。
10. **上下文窗口化。** 压缩 / 摘要，把活动上下文保持在阈值以下；直接降低 token 成本。
11. **对昂贵动作的 HITL 检查点。** 在一个已知昂贵的动作（长工具调用、大下载、一次昂贵的模型升级）之前，要求人点一下。
12. **预算突破时的急停开关。** 任何上限触发时会话中止。上限被记录下来；需要一条单独的重新启用路径。

### 为什么是一摞，而不是一个上限

单个月度上限只有在钱包已经没了之后才抓住失控 agent。单个每请求上限在会话层面什么都抓不住。不同的失败模式需要不同的时间尺度：

- **失控循环**（agent 卡在一个 5 秒重试里）：靠速率限制抓住。
- **缓慢泄漏**（agent 每个任务干约 2 倍预期的活）：靠每日上限抓住。
- **坏发布**（新版本用 5 倍的 token）：靠每周 / 每月上限抓住。
- **正当的激增**（真实需求，不是 bug）：靠每小时 / 每天上限带清晰日志抓住。

### Harness 的预算面

Claude Code Agent SDK 暴露（公开文档）：

- `max_turns` —— 迭代上限。
- `max_budget_usd` —— 美元上限；突破时会话中止。
- `allowed_tools` / `disallowed_tools` —— 工具白名单与黑名单。
- 工具使用前的钩子点，用于自定义成本核算。

跟权限模式阶梯（第 10 课）结合。一个没有 `max_budget_usd` 的 `auto` 会话就是不受治理的自主性。Anthropic 明确把 Auto Mode 定位为需要预算控制；分类器跟成本是正交的。

### EU AI Act、OWASP Agentic Top 10

微软的 Agent Governance Toolkit 覆盖 OWASP Agentic Top 10 和 EU AI Act 第 14 条（人类监督）的要求。在欧盟生产部署，日志记录和上限执行不是可选项。

### 观察到的 $1,200 → $4,800 案例

微软文档里的真实案例：一个电商 agent，在加了一个新工具后月度成本翻了三倍。这个工具允许 agent 在每个会话期间轮询订单状态。没有循环检测。没有每工具上限。没有对周环比增长的告警。修法是一个每工具上限加上一个每日增长告警。这是个模板：每个新工具面都是一个新的潜在循环；每个新工具都需要它自己的上限和它自己的告警。

```figure
cost-governor-stack
```

## 实际使用

`code/main.py` 模拟一次带与不带分层成本调控器栈的 agent 运行。被模拟的 agent 在若干轮后漂进一个轮询循环；分层栈在速率窗口内抓住它，而单个月度上限要到好几天后才会触发。

## 拿去用

`outputs/skill-agent-budget-audit.md` 审计一个提议的 agent 部署的成本调控器栈，并标出缺失的层。

## 练习

1. 运行 `code/main.py`。确认在一条轮询循环轨迹上，速率限制比迭代上限先触发。现在禁用速率限制，测量在迭代上限抓住它之前 agent "花"了多少。

2. 为一个浏览器 agent（第 11 课）设计一组每工具上限。哪个工具需要最紧的上限？哪个工具能无界运行而无风险？

3. 读微软 Agent Governance Toolkit 文档。列出工具包点名的每一种上限类型。把每一种映射到某个失败模式（失控循环、缓慢泄漏、坏发布、激增）。

4. 为一个现实任务（比如"在一个仓库里分诊 50 个 issue"）的过夜无人值守运行定价。把 `max_budget_usd` 设成你点估计的 2 倍。论证这个 2 倍。

5. Claude Code 的 `max_budget_usd` 在会话总成本上触发。设计一个你会在外部执行的互补速率限制。什么触发切断，重新启用又长什么样？

## 关键术语

| 术语 | 大家嘴上怎么说 | 实际指什么 |
|---|---|---|
| Denial of Wallet（钱包拒绝服务） | "失控账单" | agent 循环在没有上限阻止的情况下产生花费 |
| max_tokens | "每请求上限" | 单次补全大小的天花板 |
| max_turns | "迭代上限" | 一个会话里 agent 循环迭代数的天花板 |
| max_budget_usd | "美元急停开关" | 会话成本上限；突破时中止 |
| Velocity limit（速率限制） | "速率上限" | 对每个短窗口内花费的限制（比如 $50 / 10 分钟） |
| Tiered routing（分层路由） | "小模型优先" | 便宜模型默认；只在分类器判断值得时升级 |
| Prompt caching（prompt 缓存） | "缓存的系统 prompt" | 服务方侧缓存把重发的 token 成本降到近乎为零 |
| HITL checkpoint | "人工批准门" | 昂贵动作之前需要人点一下 |

## 延伸阅读

- [Anthropic Claude Code Agent SDK — agent loop and budgets](https://code.claude.com/docs/en/agent-sdk/agent-loop) —— `max_turns`、`max_budget_usd`、工具白名单。
- [Microsoft Agent Framework — human-in-the-loop and governance](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop) —— 成本调控器检查点。
- [Anthropic — Claude Managed Agents overview](https://platform.claude.com/docs/en/managed-agents/overview) —— 服务方侧的成本控制。
- [Anthropic — Prompt caching (Claude API docs)](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) —— 缓存机制。
- [Anthropic — Measuring agent autonomy in practice](https://www.anthropic.com/research/measuring-agent-autonomy) —— 长程 agent 的成本画像。
