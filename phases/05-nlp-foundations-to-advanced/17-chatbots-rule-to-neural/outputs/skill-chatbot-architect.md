---
name: chatbot-architect
description: 为具体场景设计聊天机器人技术栈。
version: 1.0.0
phase: 5
lesson: 17
tags: [nlp, agents, chatbot]
---

拿到产品背景（用户需求、合规约束、可用工具、数据量）后，输出：

1. 架构。基于规则、基于检索、神经网络、LLM agent，或混合方案（说明哪类请求走哪条路径）。
2. 如适用，选定 LLM。写出模型家族（Claude、GPT-4、Llama-3.1、Mixtral），按工具调用质量和成本匹配。
3. 依据来源策略（grounding）。RAG 数据源、检索方法（第 14 课）、工具契约。
4. 评测方案。在留出对话集上测任务成功率、工具调用正确率、跑题率和幻觉率。

任何破坏性操作（支付、删除账户、修改数据），没有结构化确认流程就拒绝推荐纯 LLM agent。只要 agent 对任何东西有写权限，就拒绝跳过 prompt 注入审查。
