---
name: prompt-reasoning-chain
description: 可直接上生产的 few-shot CoT prompt，支持 self-consistency，适用于多步推理任务
phase: 11
lesson: 02
---

你是一个严谨的解题者。给出最终答案之前，先把复杂问题拆成清晰、可核对的步骤。

## 指令

对每道题：

1. 找出所有已知量及其关系
2. 明确题目要求什么
3. 一步一步推导
4. 每一步算术都写出来
5. 按下方指定的格式给出最终答案

## 示例

<example>
Q: Janet 的鸭子每天下 16 个蛋。她每天早上吃掉 3 个，每天再用 4 个给朋友烤松饼。剩下的蛋她全部拿到农贸市场卖，每个 $2。她每天在农贸市场能赚多少钱？

A: Let me work through this step by step.

已知：每天 16 个蛋，吃 3 个，烤松饼用 4 个，剩余的每个卖 $2。

第 1 步：用掉的蛋 = 3 + 4 = 7
第 2 步：剩余的蛋 = 16 - 7 = 9
第 3 步：收入 = 9 * $2 = $18

The answer is 18.
</example>

<example>
Q: 做一件长袍需要 2 匹蓝色纤维，白色纤维用量是蓝色的一半。一共需要多少匹？

A: Let me work through this step by step.

已知：蓝色 2 匹，白色 = 蓝色的一半。

第 1 步：白色纤维 = 2 / 2 = 1 匹
第 2 步：合计 = 2 + 1 = 3 匹

The answer is 3.
</example>

<example>
Q: Josh 想试试倒卖房子。他花 $80,000 买下一套房，又投入 $50,000 装修。装修让房子增值了 150%。他赚了多少？

A: Let me work through this step by step.

已知：买入价 $80,000，装修 $50,000，增值 150%。

第 1 步：总投入 = $80,000 + $50,000 = $130,000
第 2 步：增值额 = $80,000 * 1.5 = $120,000
第 3 步：房子新价值 = $80,000 + $120,000 = $200,000
第 4 步：利润 = $200,000 - $130,000 = $70,000

The answer is 70000.
</example>

## 你的任务

用上面示例中同样的逐步方法解下面这道题。

<problem>
{problem}
</problem>

## 输出格式

你的回答必须：
- 以 "Let me work through this step by step." 开头
- 列出所有已知量
- 用编号步骤展示，算术要写明
- 严格以 "The answer is [number]." 结尾

## Self-Consistency 协议

以 self-consistency 方式（N > 1 次采样）使用本 prompt 时：
- temperature 设为 0.7
- 采样 N=5 个回答
- 从每个回答中提取 "The answer is" 后面的数字
- 取多数票
- 如果置信度（多数票数 / N）低于 0.6，标记交给人工复核

## 迁移指南

把本 prompt 改用于非数学领域：

**分类**：把算术步骤换成收集证据的步骤。把 "The answer is [number]" 换成 "The classification is [label]."

**代码调试**：把算术换成代码追踪步骤。最终答案换成 "The bug is [description]."

**法律/医疗分析**：把算术换成基于证据的推理步骤。最终答案加上置信度说明。

所有领域都不变的一点：先展示中间推理再给最终答案，并且最终答案格式保持一致，方便自动提取。
