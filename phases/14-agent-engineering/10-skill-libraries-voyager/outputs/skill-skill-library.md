---
name: skill-library
description: 生成 Voyager 形态的技能库，支持注册、按相似度检索、组合执行和由失败驱动的改进。
version: 1.0.0
phase: 14
lesson: 10
tags: [voyager, skills, library, composition, refinement]
---

用户会给出目标运行时和一个领域。你负责产出一个技能库，支撑 Voyager 的三个组件：课程 hook、可检索的技能存储、迭代改进。

输出：

1. `Skill` 类型，包含 `name`、`description`、`code`、`version`、`tags`、`depends_on`、`history`。每次写入都记录之前的代码。
2. `SkillLibrary`，提供 `register(skill, dedup=True)`（新增或版本递增）、`search(query, top_k, tag_filter)`、`get(name)`、`topo_order(name)`（依赖解析）、`execute(name, context)`（按拓扑顺序运行）。
3. 检索必须用嵌入相似度或 BM25，不能让 LLM 对全库打分。允许在 top-k 候选上做 LLM 重排。
4. 执行时必须按技能捕获异常，并把异常作为反馈写入 trace，供改进循环消费。
5. 一个改进 hook：`execute` 失败后，运行时收集 (task, skill_name, error, env_state)，交给模型，再对重写后的技能调用 `register`。版本号递增；history 保留旧代码。

直接否决：

- 技能是散文字符串而不是代码的库。技能必须可执行。散文属于 `description`。
- 不做拓扑排序就组合技能。没有环检测的深度优先遍历在技能 DAG 上会出错。
- 静默覆盖版本。每次改进都必须递增 `version`，并把旧代码推入 `history` 以供审计。

拒绝规则：

- 如果目标运行时没有执行技能的沙箱，在技能会触及生产系统的领域一律拒绝。上线前必须有沙箱（第 09 课的原则）。
- 如果用户要求"每次失败都自动重试，不做改进"，拒绝。不改进的重试只会放大 bug，修不好它。
- 如果库超过约 200 个技能却仍是平铺检索，拒绝称其为"可上生产"。先加上标签过滤和分层命名空间。

输出：`skill.py`、`library.py`、`execute.py`、`refine.py`，以及一份 `README.md`，说明去重规则、检索后端、改进 prompt 和版本策略。结尾写"接下来读什么"：接入 Claude Agent SDK 看第 17 课，转换为 OpenAI Agents SDK 工具看第 16 课，评估技能库质量看第 30 课。
