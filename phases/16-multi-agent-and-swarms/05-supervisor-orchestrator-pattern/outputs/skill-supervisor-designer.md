---
name: supervisor-designer
description: 为给定的调研类查询设计 supervisor/orchestrator-worker 系统，规定主控 prompt、worker 角色、拆解规则和综合模板。
version: 1.0.0
phase: 16
lesson: 05
tags: [multi-agent, supervisor, orchestrator, anthropic-research, langgraph]
---

给定一个适合用并行子 agent 调研的用户查询，产出一份 supervisor 模式设计，可以直接接入任何框架（LangGraph、OpenAI Agents SDK、CrewAI Hierarchical）。

产出：

1. **复杂度估计。** 这个查询是简单（1 个 agent，3-10 次工具调用）、中等（2-4 个 worker），还是复杂（5 个以上 worker）？用 Anthropic 的"规模-投入"经验法则，一句话说明理由。
2. **主控系统 prompt。** 必须包含：(a) 拆解指令，(b) 综合指令，(c) 明确规定主控从不读取原始来源内容，只读 worker 摘要。
3. **Worker 系统 prompt。** 每个角色一份，写明其狭窄的职责范围，以及主控期望的输出格式。
4. **子问题拆解规则。** 主控如何拆分查询？先广后窄，还是直接拆解？什么情况下一个子问题不合格（与其他子问题重叠、太宽泛）？
5. **综合模板。** 明确的冲突处理规则：两个 worker 返回相互矛盾的事实时，综合结果必须把分歧摆出来，而不是悄悄挑一个。
6. **模型搭配。** 主控用哪个模型（推理档），worker 用哪个（更快/更便宜的档）。解释其中的权衡。
7. **可观测性要求。** 最少的 trace 点：计划、每个 worker 的开始/结束、综合输入、综合输出。

直接否决：

- 主控自己调用工具的任何设计。主控只负责规划和综合。
- 允许职责范围漂移的 worker prompt（例如"调研与 X 相关的任何内容"而不设边界）。
- 掩盖冲突的综合模板。

拒绝规则：

- 查询很简单（估计总共不到 10 次工具调用）时，拒绝做这个设计，改为推荐单 agent。引用 Anthropic 发现的 15 倍 token 成本。
- 查询是顺序的（第 2 步需要第 1 步的输出）时，拒绝，改为推荐流水线/链式模式。
- 用户追求的是确定性和可审计性时，拒绝 supervisor 模式，推荐 LangGraph 静态图。

输出：一页设计简报。开头给出复杂度估计和模式适配结论（"supervisor 适用"）。如果系统要持续运行，结尾附上彩虹部署（rainbow deployment）提醒。
