# 基准：WebArena 与 OSWorld

> WebArena 测网页 agent 在四个自托管应用上的能力。OSWorld 测桌面 agent 在 Ubuntu、Windows、macOS 上的能力。发布时（2023–2024）两者都显示出顶尖 agent 与人类之间的巨大差距。差距在缩小；失败模式没变。

**类型：** Learn
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 19（SWE-bench、GAIA）
**预计时间：** ~60 分钟

## 学习目标

- 描述 WebArena 的四个自托管应用，以及为什么基于执行的评估重要。
- 解释 OSWorld 为什么用真实 OS 截图而非无障碍 API。
- 说出 OSWorld 的两个主要失败模式：GUI 锚定和操作性知识。
- 总结 OSWorld-G 和 OSWorld-Human 在基础基准之上加了什么。

## 问题背景

通才 agent 能调工具。它们能驱动浏览器、跨 20 次点击完成一次购物结账吗？它们能只用键盘鼠标配置一台 Linux 机器吗？这些是 WebArena 和 OSWorld 回答的问题。

## 核心概念

### WebArena（Zhou 等人，ICLR 2024）

- 812 个长跨度任务，横跨四个自托管 web 应用：一个购物站、一个论坛、一个类 GitLab 的开发工具、一个商业 CMS。
- 外加工具：地图、计算器、便笺。
- 评估是基于执行的，通过 gym API —— 订单下了吗、issue 关了吗、CMS 页面更新了吗？
- 发布时：最佳 GPT-4 agent 成功率 14.41%，人类 78.24%。

自托管的框定很重要 —— 这个基准不会因为目标应用被钉死且可复现而抖动。

### 扩展

- **VisualWebArena** —— 视觉锚定任务，成功取决于解读图像（截图作为一等观察）。
- **TheAgentCompany**（2024 年 12 月）—— 加了终端 + 编码；更像一个真实的远程办公环境。

### OSWorld（Xie 等人，NeurIPS 2024）

- 369 个真实计算机任务，横跨 Ubuntu、Windows、macOS。
- 对真实应用的自由形式键鼠控制。
- 以 1920×1080 截图作为观察。
- 发布时：最佳模型 12.24%，人类 72.36%。

### 主要失败模式

1. **GUI 锚定。** 像素 → 元素的映射。模型很难在 1920×1080 里可靠地定位 UI 元素。
2. **操作性知识。** 哪个菜单里有那个设置、哪个键盘快捷键、哪个偏好面板。人类用多年攒出来的知识长尾。

### 后续工作

- **OSWorld-G** —— 564 样本的锚定套件 + Jedi 训练集。把锚定从规划里分解出来，让你能分别度量。
- **OSWorld-Human** —— 人工策划的黄金动作轨迹。显示顶尖 agent 用的步数是必要步数的 1.4-2.7 倍（轨迹效率差距）。

### 为什么这重要

Claude computer use、OpenAI CUA、Gemini 2.5 Computer Use（第 21 课）全都在由 WebArena 和 OSWorld 塑形的工作负载上训练。基准是目标；生产模型是交付出来的答案。

### 基准测试在哪里会出错

- **只看截图的评估。** OSWorld 是截图驱动的；在 OSWorld 上评估一个用 DOM 或无障碍 API 的 agent 会错过锚定挑战。
- **忽略轨迹长度。** 只给成功率打分会错过 OSWorld-Human 揭示的 1.4-2.7 倍步数低效。
- **过时的自托管应用。** WebArena 的应用钉死了特定版本；更新而不重新策划会破坏可比性。

```figure
ae-agent-human-gap
```

## 动手构建

`code/main.py` 实现一个玩具网页 agent harness：

- 一个极简「购物应用」状态机：list_items、add_to_cart、checkout。
- 3 个任务的黄金轨迹。
- 一个脚本化 agent，尝试每个任务。
- 基于执行的评估器（状态检查）和轨迹效率指标（步数 vs 黄金）。

运行它：

```
python3 code/main.py
```

输出：每任务成功率和轨迹效率，镜像 OSWorld-Human 的方法论。

## 实际使用

- **WebArena Verified** 自托管在一个内部集群上做持续评估。
- **OSWorld** 在一支 VM 队列里做桌面 agent。
- **computer-use agent**（第 21 课）—— Claude、OpenAI CUA、Gemini —— 全都在这类工作负载上训练。
- **你自己的产品流程** —— 为你的 top 20 任务捕获黄金轨迹；每周拿 agent 对着它们跑。

## 拿去用

`outputs/skill-web-desktop-harness.md` 构建一个网页/桌面 agent harness，带基于执行的评估和轨迹效率指标。

## 练习

1. 用第二个应用（一个论坛）扩展玩具 harness。写 3 个任务外加黄金轨迹。
2. 加每任务的轨迹效率报告。在你的玩具上，agent 是黄金的 1 倍、2 倍还是 3 倍？
3. 实现一个「干扰项」工具 —— 黄金轨迹从不使用的那种。脚本化 agent 会被诱惑吗？
4. 读 OSWorld-G。你会怎么在自己的评估里把锚定失败和规划失败分开？
5. 读 WebArena 的应用 README。当你升级某个钉死的应用版本时，什么会崩？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| WebArena | 「网页 agent 基准」 | 跨 4 个自托管应用的 812 个任务；gym 式评估 |
| VisualWebArena | 「视觉版 WebArena」 | 视觉锚定的 WebArena；截图就是观察 |
| OSWorld | 「桌面 agent 基准」 | 真实 Ubuntu/Windows/macOS 上的 369 个任务 |
| GUI grounding | 「像素到元素的映射」 | 模型在 1920x1080 里定位 UI 元素 |
| Operational knowledge | 「OS 门道」 | 哪个菜单、哪个快捷键、哪个偏好面板 |
| OSWorld-G | 「锚定套件」 | 564 个纯锚定样本 + 训练集 |
| OSWorld-Human | 「黄金轨迹」 | 人工专家动作序列，用来度量效率 |
| Trajectory efficiency | 「相对黄金的步数」 | agent 步数除以人类最小步数 |

## 延伸阅读

- [Zhou et al., WebArena (arXiv:2307.13854)](https://arxiv.org/abs/2307.13854) —— 四应用网页基准
- [Xie et al., OSWorld (arXiv:2404.07972)](https://arxiv.org/abs/2404.07972) —— 跨 OS 桌面基准
- [Anthropic, Introducing computer use](https://www.anthropic.com/news/3-5-models-and-computer-use) —— Claude 由基准塑形的能力
- [OpenAI, Computer-Using Agent](https://openai.com/index/computer-using-agent/) —— OSWorld 和 WebArena 数字
