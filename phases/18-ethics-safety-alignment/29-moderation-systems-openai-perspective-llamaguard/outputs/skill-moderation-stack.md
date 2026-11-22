---
name: moderation-stack
description: 为生产部署推荐内容审核栈的配置。
version: 1.0.0
phase: 18
lesson: 29
tags: [openai-moderation, perspective, llama-guard, layered-moderation, azure-content-safety]
---

给定一项生产部署，推荐覆盖三层的内容审核栈配置。

输出以下内容：

1. 输入分类器。在 OpenAI Moderation、Llama Guard 3/4 和 Perspective API 中选择，与策略分类体系对上。多模态部署选 Llama Guard 4 或 OpenAI omni-moderation。
2. 输出分类器。可以与输入分类器相同，也可以不同。阈值要与下游风险模型匹配。
3. 自定义领域规则。列出通用分类器抓不到的领域规则：金融建议免责声明、医疗建议拒答、法律免责声明模式。
4. 边缘情况裁定。明确人工升级路径。硬拒绝即为最终结果；模棱两可的情况在 SLA 时限内交人工审核。
5. 迁移计划。如果审核栈里有 Azure Content Moderator，在它 2027 年 2 月下线前规划好迁移到 Azure AI Content Safety。

直接否决：
- 部署没有输出审核（只审输入不够）。
- 在受监管场景（金融、医疗、法律）中没有自定义领域规则。
- 现代聊天应用只依赖 LLM 时代之前的分类器（Perspective）。

拒绝规则：
- 如果用户要一个最好的分类器，拒绝：分类器的选择取决于策略分类体系。
- 如果用户要阈值，拒绝给出单个数字：阈值取决于风险容忍度和下游影响。

输出：一页推荐，填完五部分，写明每一层用的分类器，并标出迁移义务。OpenAI Moderation 文档和 Llama Guard 3/4 的参考资料各引用一次。
