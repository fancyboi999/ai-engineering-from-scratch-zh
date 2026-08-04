# 浏览器 agent 与长程网页任务

> ChatGPT agent（2025 年 7 月）把 Operator 和 deep research 合并成一个浏览器/终端 agent，把 BrowseComp 的 SOTA 拉到 68.9%。OpenAI 在 2025 年 8 月 31 日关停了 Operator——产品层的整合。Anthropic 收购 Vercept，把 Claude Sonnet 在 OSWorld 上从不到 15% 推到了 72.5%。WebArena-Verified（ServiceNow，ICLR 2026）修掉了原版 WebArena 中 11.3 个百分点的假阴性率，并交付了 258 任务的 Hard 子集。这些数字是真的。攻击面也是真的：OpenAI 的 preparedness 负责人公开表示，注入进浏览器 agent 的间接 prompt 注入"不是一个能被完全打补丁的 bug"。2025-2026 年有记录在案的攻击：Tainted Memories（Atlas CSRF）、HashJack（Cato Networks），以及 Perplexity Comet 中的一键劫持。

**类型：** Learn
**语言：** Python（标准库，间接 prompt 注入攻击面模型）
**前置要求：** 阶段 15 · 10（权限模式），阶段 15 · 01（长程 agent）
**预计时间：** ~45 分钟

## 问题背景

浏览器 agent 是一个会读取不可信内容并采取有后果动作的长程 agent。agent 访问的每个页面都是用户没有写过的输入。每个页面上的每个表单都是一条潜在的命令通道。2025-2026 年的攻击语料表明这不是假设：Tainted Memories 让攻击者通过一个精心构造的页面把恶意指令绑到 agent 的记忆上；HashJack 把命令藏在 agent 访问的 URL 片段里；Perplexity Comet 的劫持一击即中。

防御的图景令人不安。OpenAI 的 preparedness 负责人把那句不愿明说的话说大声了：间接 prompt 注入"不是一个能被完全打补丁的 bug"。这是因为攻击就活在 agent 的"读取 vs 行动"边界里，而这条边界在架构上是模糊的——原则上，模型读到的每一个 token 都可能被当作一条指令来读。

本课点出攻击面，点出基准全景（BrowseComp、OSWorld、WebArena-Verified），并对一个最小的间接 prompt 注入场景建模，好让你能在第 14 和第 18 课里对真实的防御做推理。

## 核心概念

### 2026 全景，每个系统一段话

**ChatGPT agent（OpenAI）。** 2025 年 7 月发布。统一了 Operator（浏览）和 Deep Research（多小时研究）。2025 年 8 月 31 日关停了独立的 Operator。BrowseComp 上 SOTA 68.9%；在 OSWorld 和 WebArena-Verified 上数字强劲。

**Claude Sonnet + Vercept（Anthropic）。** Anthropic 的 Vercept 收购聚焦于计算机使用能力。把 Claude Sonnet 在 OSWorld 上从 <15% 推到 72.5%。Claude Computer Use 以一个工具 API 的形式发布。

**Gemini 3 Pro 带 Browser Use（DeepMind）。** Browser Use 集成交付计算机使用控制；FSF v3（2026 年 4 月，第 20 课）专门跟踪 ML 研发领域的自主性。

**WebArena-Verified（ServiceNow，ICLR 2026）。** 修掉一个有充分记录的问题：原版 WebArena 有约 11.3% 的假阴性率（被标为失败、实际已解出的任务）。Verified 版用人工策划的成功判据重新评分，并加了一个 258 任务的 Hard 子集（ICLR 2026 论文，openreview.net/forum?id=94tlGxmqkN）。

### BrowseComp vs OSWorld vs WebArena

| 基准 | 它衡量什么 | 时间跨度 |
|---|---|---|
| BrowseComp | 在时间压力下从开放网页找特定事实 | 分钟级 |
| OSWorld | agent 操作一个完整桌面（鼠标、键盘、shell） | 几十分钟级 |
| WebArena-Verified | 模拟站点里的事务型网页任务 | 分钟级 |
| Hard 子集 | 带多页面状态转移的 WebArena-Verified 任务 | 几十分钟级 |

不同的维度。高 BrowseComp 分数说明 agent 找得到事实；它不说明 agent 订得了机票。OSWorld 分数更接近"它在我的桌面上能不能用"。WebArena-Verified 更接近"它能不能完成一个流程"。任何生产决策都需要那个跟任务分布相匹配的基准。

### 把攻击面点名

1. **间接 prompt 注入。** 不可信的页面内容含有指令。agent 读到它们。agent 执行它们。公开例子：2024 年 Kai Greshake 等人、2025 年 Tainted Memories 论文、2026 年 HashJack（Cato Networks）。
2. **URL 片段 / 查询注入。** 被爬取 URL 的 `#fragment` 或查询字符串含有命令。从不可见地渲染；却仍在 agent 的上下文里。
3. **记忆绑定攻击。** 页面指示 agent 写一条持久记忆（第 12 课讲持久状态）。下次会话，这条记忆在没有可见触发的情况下打出载荷。
4. **针对已认证会话的 CSRF 形态攻击。** Tainted Memories 这一类：agent 在某处已登录；攻击者的页面发出会改变状态的请求，agent 带着用户的 cookie 执行它们。
5. **一键劫持。** 一个视觉上无害的按钮搭载着一个 agent 会跟随的载荷。Comet 这一类。
6. **agent 宿主面上的内容安全策略（CSP）漏洞。** 渲染层和工具层本身就可能是攻击向量；浏览器套浏览器 agent 的栈很宽。

### 为什么"无法完全打补丁"

这个攻击跟 agent 的能力是同构的。agent 必须读取不可信内容才能干活。agent 读到的任何内容都可能含有指令。agent 跟随的任何指令都可能跟用户的实际请求失准。防御（信任边界、分类器、工具白名单、对有后果动作的 HITL）抬高攻击的成本、缩小它的爆炸半径。它们闭合不了这个类别。

这跟 Lob 定理（第 8 课）是同一种推理模式：agent 无法证明下一个 token 是安全的；它只能搭起一个让不安全 token 更可检测的系统。

### 真正能上线的防御姿态

- **读 / 写边界。** 读永远没有后果。写（提交表单、发布内容、调用一个有副作用的工具）如果发起内容来自信任边界之外，就需要新鲜的人工批准。
- **每任务的工具白名单。** agent 能浏览；它不能发起一笔电汇，除非那个工具为这个任务被显式启用。第 13 课讲预算。
- **会话隔离。** 浏览器 agent 会话只用受限范围的凭证运行。没有生产认证，没有个人邮箱。每个 HTTP 请求的日志都保留以供审计。
- **内容净化器。** 抓取到的 HTML 在拼进模型上下文之前，被剥掉已知坏的模式。（减少容易的攻击；挡不住老练的载荷。）
- **对有后果动作的 HITL。** propose-then-commit 模式（第 15 课）。
- **记忆上的金丝雀 token。** 如果一条记忆打出来了，用户能看到它（第 14 课）。

```figure
injection-boundary
```

## 实际使用

`code/main.py` 对着三个合成页面，对一次微型浏览器 agent 运行建模。一个页面是良性的，一个在可见文本里有一个直接 prompt 注入块，一个有一个 URL 片段注入（不可见，但在 agent 的上下文里）。脚本展示 (a) 一个朴素的 agent 会做什么，(b) 读/写边界抓住什么，(c) 净化器抓住什么，(d) 两者都抓不住什么。

## 拿去用

`outputs/skill-browser-agent-trust-boundary.md` 给一个提议的浏览器 agent 部署划定范围：它碰到哪些信任区、它被授权写什么，以及在第一次运行前必须就位的哪些防御。

## 练习

1. 运行 `code/main.py`。指出哪种攻击净化器抓得住而读/写边界抓不住，以及哪种攻击只有读/写边界抓得住。

2. 扩展净化器，去检测一类 HashJack 风格的 URL 片段注入。在带合法片段的良性 URL 上测量误报率。

3. 挑一个你熟悉的真实浏览器 agent 工作流（比如"订机票"）。列出每一次读和每一次写。标出哪些写需要 HITL 以及为什么。

4. 读 WebArena-Verified 的 ICLR 2026 论文。指出原版 WebArena 评分不可靠的一个任务类别，并解释 Verified 子集如何解决它。

5. 为一个浏览器 agent 场景设计一个记忆金丝雀。你会存什么、存在哪、什么触发警报？

## 关键术语

| 术语 | 大家嘴上怎么说 | 实际指什么 |
|---|---|---|
| Indirect prompt injection（间接 prompt 注入） | "坏的页面文本" | agent 读取的页面里的不可信内容含有 agent 会执行的指令 |
| Tainted Memories | "记忆攻击" | agent 把攻击者提供的指令写进持久记忆；下次会话触发 |
| HashJack | "URL 片段攻击" | 藏在 URL 片段 / 查询字符串里的载荷在 agent 上下文里，却不可见地渲染 |
| One-click hijack（一键劫持） | "坏按钮" | 可见的可点击元素搭载一个 agent 会执行的后续载荷 |
| BrowseComp | "网页搜索基准" | 从开放网页找特定事实；分钟级跨度 |
| OSWorld | "桌面基准" | 完整的操作系统控制；多步 GUI 任务 |
| WebArena-Verified | "修好的网页任务基准" | ServiceNow 重新评分的 WebArena，带 Hard 子集 |
| Read/write boundary（读/写边界） | "副作用门" | 读永远没后果；若内容在信任之外，写需要新鲜的批准 |

## 延伸阅读

- [OpenAI — Introducing ChatGPT agent](https://openai.com/index/introducing-chatgpt-agent/) —— Operator 与 deep research 的合并；BrowseComp SOTA。
- [OpenAI — Computer-Using Agent](https://openai.com/index/computer-using-agent/) —— Operator 的谱系，以及后来成为 ChatGPT agent 的架构。
- [Zhou et al. — WebArena](https://webarena.dev/) —— 最初的基准。
- [WebArena-Verified (OpenReview)](https://openreview.net/forum?id=94tlGxmqkN) —— ICLR 2026 修好子集的论文。
- [Anthropic — Measuring agent autonomy in practice](https://www.anthropic.com/research/measuring-agent-autonomy) —— 含对计算机使用类 agent 攻击面的讨论。
