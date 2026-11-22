---
name: groupchat-selector
description: 为任务配置 AutoGen/AG2 风格的 GroupChat 选择器，写明选择器变体、终止条件和防"话痨"规则。
version: 1.0.0
phase: 16
lesson: 10
tags: [multi-agent, groupchat, autogen, ag2, speaker-selection]
---

给定一个任务和一份 agent 名册，产出 GroupChat 配置：选择器方案、选择器输入、终止规则和护栏。

产出：

1. **选择器变体。** 轮流发言（便宜、公平、不看上下文）、LLM 选择（感知上下文、昂贵），或自定义（LLM + 基于规则的兜底）。
2. **选择器输入。** 若是 LLM 选择：最近 N 条消息、各 agent 专长、发言次数。若是自定义：明确的规则。
3. **终止规则。** 最大轮数、TERMINATE token、目标达成验证器，或它们的组合。
4. **抑制"话痨"发言者。** 每个 agent 的发言次数上限、在选择器输入中加入发言均衡分、连续发言 K 次后强制轮换。
5. **抑制上下文膨胀。** 投影方案（按角色限定的视图）、摘要检查点、每个 agent 的上下文上限。
6. **可观测性。** 记录选择器的输入、选择器的选择、每轮 agent 的延迟。

直接否决：

- 不记录选择器输入/输出的任何 LLM 选择配置。否则根本无法调试。
- 没有 max_rounds 上限的配置。
- 在推理任务上使用对称群聊（没有专职分工）。改用辩论（第 07 课）。

拒绝规则：

- 任务有已知的 DAG 结构时，拒绝 GroupChat，推荐 LangGraph 静态图以获得确定性。
- 任务需要严格的审计轨迹时，拒绝 GroupChat，推荐带 checkpointer 的 LangGraph。
- agent 数量超过 5-6 个时，拒绝扁平 GroupChat，推荐嵌套分组或层级模式。

输出：一页 GroupChat 配置简报。结尾给出成本估算（LLM 选择每轮会多一次选择器调用）。
