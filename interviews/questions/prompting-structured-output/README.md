# Prompt 与结构化输出

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

prompt 设计、上下文工程、schema、约束解码与函数调用。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [分步思考提示在哪里有用，在哪里增加成本](cot-when-it-hurts.md) | 概念 | 1 基础 | 7 |
| [JSON 模式能保证什么，不能保证什么](json-mode-is-not-a-schema.md) | 概念 | 1 基础 | 6 |
| [对话调用的三个部分与 prefill 技巧](system-user-prefill.md) | 概念 | 1 基础 | 6 |
| [有效 JSON 却准确率更低：字段顺序导致的问题](answer-before-reasoning.md) | 排障 | 2 应用 | 8 |
| [prompt 里放几个示例，放哪些](few-shot-example-count.md) | 权衡 | 2 应用 | 7 |
| [上下文各部分放在哪里，为什么](lost-in-the-middle-order.md) | 概念 | 2 应用 | 8 |
| [读懂约束生成循环](read-the-constrained-decoder.md) | 代码阅读 | 2 应用 | 8 |
| [五票同一条路径，账单却是五倍](self-consistency-at-temperature-zero.md) | 排障 | 2 应用 | 8 |
| [类型化数据还是动作，这个区别为什么重要](structured-output-vs-function-call.md) | 权衡 | 2 应用 | 7 |
| [结构化输出调用失败的三种方式](three-failure-modes-structured.md) | 概念 | 2 应用 | 7 |
| [每次请求的缓存读取都是零](timestamp-kills-the-cache.md) | 排障 | 2 应用 | 8 |
| [工具描述决定调用哪个工具](tool-description-is-a-prompt.md) | 概念 | 2 应用 | 7 |
| [为批量代码审查选择合适的缓存生命周期](cache-break-even.md) | 估算 | 3 高级 | 10 |
| [为采购订单邮件设计信息抽取服务](design-extraction-with-refusals.md) | 设计 | 3 高级 | 20 |
| [校验错误为零，发票总额却是错的](schema-valid-value-wrong.md) | 排障 | 3 高级 | 10 |
| [把记忆整合移出关键路径](sleep-time-consolidation.md) | 权衡 | 3 高级 | 10 |
| [构建支持逐出和来源引用的双层 agent 记忆](take-home-two-tier-memory.md) | 课后任务 | 3 高级 | 60 |
| [五十个工具定义每次调用要花多少](tool-budget-fifty-tools.md) | 估算 | 3 高级 | 9 |
| [设计 agent 工具调用背后的执行器](tool-call-security-rules.md) | 设计 | 3 高级 | 15 |
| [让每个推理阶段都对得起它的成本](escalation-pipeline-cost.md) | 权衡 | 4 架构与规模 | 15 |
| [为三款产品调整三种存储的记忆融合权重](fusion-weights-per-product.md) | 设计 | 4 架构与规模 | 15 |
| [审查一段可能损坏下一次会话的状态写入](state-file-atomic-write.md) | 代码阅读 | 4 架构与规模 | 12 |

[全部主题](../../README.md)
