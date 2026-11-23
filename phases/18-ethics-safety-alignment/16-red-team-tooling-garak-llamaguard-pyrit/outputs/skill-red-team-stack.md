---
name: red-team-stack
description: 为给定部署推荐红队工具栈及其配置。
version: 1.0.0
phase: 18
lesson: 16
tags: [llama-guard, garak, pyrit, red-team-tooling, mlcommons-hazards]
---

给定一份部署描述，推荐红队工具栈和回归测试节奏。

输出以下内容：

1. 分类器位置。推荐把 Llama Guard（3-8B、3-1B-INT4 或 4-12B）放在输入端、输出端，或两端都放。边缘部署优先选 3-1B-INT4。多模态场景用 Llama Guard 4。
2. 探针扫描器配置。推荐与该部署相关的 Garak 探针：幻觉（RAG 系统）、数据泄漏（涉及 PII 的场景）、prompt 注入（必选）、越狱（必选）。端到端评估时指定 Prompt-Guard-86M + Llama-Guard-3-8B 的防护组合。
3. 攻击活动编排器。对具备新能力的模型，发布前用 PyRIT 跑攻击活动。指定要跑的转换器链（改写、编码、翻译、角色扮演）和编排器（Crescendo 用于逐步升级，TAP 用于分支探索）。
4. 节奏。Garak 每晚跑一次做回归。PyRIT 每次发布跑一次做深度红队。Llama Guard 持续在线。
5. 裁判校准。凡是用到裁判 LLM 的工具，都要指定裁判（GPT-4-turbo、StrongREJECT、内部模型）。裁判校准决定了报告出来的 ASR。

直接否决：
- 部署中没有任何 Llama Guard 级别的输入或输出分类器。
- 发布前没有 Garak 或同等的单轮回归测试。
- 高风险部署发布前没有跑过 PyRIT 级别的攻击活动。

拒绝规则：
- 如果用户要一个"最好"的工具，拒绝：这三个工具覆盖不同层面，应该叠加使用，不能互相替代。
- 如果用户要一款一体化的商业替代品，拒绝推荐，并指出 2026 年的现状：这三款开源工具就是当前的最佳实践组合。

输出：一页推荐，写明分类器位置、探针配置、攻击活动编排器、回归节奏和裁判身份。Meta（arXiv:2407.21783）、NVIDIA Garak 和 Microsoft PyRIT 各引用一次。
