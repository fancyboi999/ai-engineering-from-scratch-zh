# 多模态 agent 与 computer-use（综合实战）

> 2026 年的前沿产品是一个多模态 agent，它读截图、点按钮、导航 web UI、填表单，端到端完成工作流。SeeClick 和 CogAgent（2024）证明了 GUI grounding 原语。Ferret-UI 加入了移动端。ChartAgent 引入了面向图表的视觉工具使用。VisualWebArena 和 AgentVista（2026）是前沿追逐的基准——连 Gemini 3 Pro 和 Claude Opus 4.7 在 AgentVista 的难任务上也只拿约 30%。这个综合实战把 Phase 12 的每条线都拉到一起：感知（高分辨率 VLM）、推理（带工具使用的 LLM）、grounding（坐标输出）、长时程记忆、评测。

**类型：** Capstone
**语言：** Python（标准库，动作 schema + agent 循环骨架）
**前置要求：** Phase 12 · 05（LLaVA）、Phase 12 · 09（Qwen-VL JSON）、Phase 14（Agent 工程）
**预计时间：** ~240 分钟

## 学习目标

- 设计一个多模态 agent 循环：感知 → 推理 → 行动 → 观察 → 重复。
- 搭一个 GUI grounding 输出 schema（点击坐标、输入文本、滚动、拖拽），让 VLM 能以 JSON 吐出。
- 比较仅截图 agent vs 无障碍树 agent vs 混合 agent。
- 在一个小的 VisualWebArena 切片上搭起多模态 agent 基准评测。

## 问题背景

一个订票网站工作流："给我找一张 4 月 15 日去东京、靠走道、低于 800 美元的航班，订下来。"

一个多模态 agent 需要：

1. 截一张浏览器截图。
2. 把截图 + URL + 目标解析成一个计划。
3. 吐出一个结构化动作：在 (x,y) 点击、在元素 E 处输入"Tokyo"、向下滚动、选择（单选按钮）。
4. 把动作施加到浏览器。
5. 观察新状态（下一张截图）。
6. 重复，直到任务完成。

每一步都是一次多模态 VLM 调用。VLM 输出必须是可解析的 JSON。错误跨步骤累积，所以恢复很要紧。

## 核心概念

### GUI grounding —— 原语

GUI grounding 是：给定一张截图和一条自然语言指令，输出要点击的 (x, y) 坐标（或其他动作）。

SeeClick（arXiv:2401.10935）是第一个大规模的开放结果：在合成 + 真实 GUI 数据上微调一个 VLM，把坐标作为纯文本 token 输出。能用。

CogAgent（arXiv:2312.08914）为密集 UI 加入了 1120x1120 高分辨率编码。分数：web 导航上约 84%。

Ferret-UI（arXiv:2404.05719）聚焦移动 UI，与 iOS 无障碍数据集成。

输出格式通常是 JSON：

```json
{"action": "click", "x": 384, "y": 220, "element_desc": "Search button"}
```

`element_desc` 帮助恢复：如果坐标在截图之间漂移，这个语义提示让系统能重新 grounding。

### 动作 schema

一个典型的动作 schema 有 6-10 种动作类型：

- `click`：(x, y)
- `type`：(text, x?, y?)
- `scroll`：(direction, amount)
- `drag`：(x0, y0, x1, y1)
- `select`：(option_index)
- `hover`：(x, y)
- `navigate`：(url)
- `wait`：(ms)
- `done`：(success, explanation)

agent 每步吐出一个动作。浏览器包装器执行并返回新状态。

### 仅截图 vs 无障碍树

两种输入模式：

- 仅截图：完整图像，无结构信息。最通用；在任何应用上都能用。
- 无障碍树：结构化的 DOM / iOS 无障碍信息。对 grounding 可靠得多；在有树的地方能用。
- 混合：两者都用，树作为原子动作的可靠 grounder，截图提供语义上下文。

生产 agent 尽可能用混合。浏览器自动化（Selenium + 无障碍）总有树；桌面应用有时有。

### 长时程记忆

一个 20 步工作流生成 20 张截图。VLM 的上下文很快填满。三种压缩策略：

- 摘要链：每 5 步之后，总结发生了什么，丢掉旧截图。
- 跳帧：保留第一张、最后一张和每隔 3 张的截图。
- 工具记录日志：执行动作，保留一份做了什么的文本日志；不再回看旧截图。

Claude 的 computer-use API 用日志模式。更简单，更可靠。

### 视觉工具使用

ChartAgent（arXiv:2510.04514）为图表理解引入了视觉工具使用：裁剪、缩放、OCR、调外部检测。agent 能输出"裁剪到区域 (100, 200, 300, 400) 然后调 OCR"作为一个工具调用。工具返回文本；VLM 继续推理。

这个模式可泛化：set-of-mark prompting、区域标注和外部检测工具都套进同一个"输出一个工具调用、收到一个结构化响应"的 schema。

### 2026 年的基准

- ScreenSpot-Pro。约 1k 张 web 截图上的 GUI grounding。开放 SOTA Qwen2.5-VL-72B 约 85%。前沿约 90%。
- VisualWebArena。端到端 web 任务（购物、论坛、分类信息）。开放 SOTA 约 20%。Gemini 3 Pro 约 27%。
- AgentVista（arXiv:2602.23166）。2026 年最难的基准。横跨 12 个领域的真实工作流。前沿模型拿 27-40%；开放模型 10-20%。
- WebArena / WebShop。较老的基准；被前沿刷饱和。

### 为什么它仍然难

agent 性能瓶颈：

1. 细尺度的视觉 grounding。"点那个小 X"在移动分辨率下常失败。
2. 长时程规划。10 个动作之后，agent 偏离目标。
3. 错误恢复。当一次点击失败（点错按钮），检测 + 恢复很少是训练数据。
4. 跨页面上下文。在标签页之间跳转或处理长表单会丢状态。

研究方向：记忆架构、显式重规划、多模态验证（用截图匹配判定动作是否成功）。

### 综合实战的动手构建

综合实战任务：搭一个 computer-use agent，它：

1. 读一个订票网站模拟页的 HTML + 截图。
2. 规划一个多步序列：搜索 → 选择 → 填表 → 提交。
3. 吐出匹配动作 schema 的 JSON 动作。
4. 在一个固定的 10 任务切片上评测。

本课提供易于扩展成真实浏览器的脚手架代码。

```figure
mm-agent-loop
```

## 实际使用

`code/main.py` 是综合实战脚手架：

- 动作 schema 的 JSON 定义（10 个动作）。
- 用 dict 表示的模拟浏览器状态。
- agent 循环骨架：接收状态、吐出动作、施加、循环。
- 10 任务迷你基准（合成页面），测量端到端成功率。
- 动作失败时的错误恢复钩子。

## 拿去用

本节课产出 `outputs/skill-multimodal-agent-designer.md`。给定一个 computer-use 产品（领域、动作集、评测目标），它设计完整的 agent 循环、记忆策略、grounding 模式和预期基准分数。

## 练习

1. 用一个 `screenshot_region` 工具（裁剪 + 缩放）扩展动作 schema。哪些任务受益？

2. 读 AgentVista（arXiv:2602.23166）。描述最难的任务类别，以及前沿模型为什么仍然失败。

3. 长时程记忆压缩：设计一个保持 ≤4 张截图存活、任意数量记入日志的摘要链。

4. 搭一个错误恢复钩子：动作失败时（找不到按钮），agent 下一步做什么？

5. 在 10 个 web 任务上把仅截图的 Claude 4.7 与混合截图 + 无障碍树的 Qwen2.5-VL 作比较。各自在哪类任务上取胜？

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| GUI grounding | "点击坐标" | 模型为截图上某条指令的目标输出 (x,y) |
| 动作 schema | "工具定义" | 合法动作（click、type、scroll、drag）的 JSON 描述 |
| 无障碍树 | "结构化 DOM" | 来自浏览器/iOS API 的机器可读 UI 层级 |
| 混合 agent | "截图 + 树" | 同时用图像和结构信息；比单用任一个更可靠 |
| 视觉工具使用 | "缩放/裁剪/检测" | agent 在规划中途调外部视觉工具（OCR、检测） |
| 摘要链 | "记忆压缩" | 周期性文本摘要替代长截图历史 |
| VisualWebArena | "端到端 web 基准" | 2024 年的端到端 web 任务基准 |
| AgentVista | "2026 难基准" | 12 领域真实工作流；连 Gemini 3 Pro 也只拿约 30% |

## 延伸阅读

- [Cheng et al. — SeeClick (arXiv:2401.10935)](https://arxiv.org/abs/2401.10935)
- [Hong et al. — CogAgent (arXiv:2312.08914)](https://arxiv.org/abs/2312.08914)
- [You et al. — Ferret-UI (arXiv:2404.05719)](https://arxiv.org/abs/2404.05719)
- [ChartAgent (arXiv:2510.04514)](https://arxiv.org/abs/2510.04514)
- [Koh et al. — VisualWebArena (arXiv:2401.13649)](https://arxiv.org/abs/2401.13649)
- [AgentVista (arXiv:2602.23166)](https://arxiv.org/abs/2602.23166)
