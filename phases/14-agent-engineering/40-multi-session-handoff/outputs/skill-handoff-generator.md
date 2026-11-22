---
name: handoff-generator
description: 根据工作台产物生成会话结束时的交接包，同时输出人读的 Markdown 和按七个标准字段组织的机器可读 JSON。
version: 1.0.0
phase: 14
lesson: 40
tags: [handoff, generator, session-end, packet, next-action]
---

给定一个工作台（状态、结论、审查、反馈日志、diff），产出一个接入 agent 运行时的会话结束交接生成器。

产出：

1. `tools/generate_handoff.py`，提供 `generate_handoff(snapshot) -> (markdown, payload)`。
2. `outputs/handoff/<session_id>/handoff.md` 和 `handoff.json`。
3. `handoff.schema.json`，覆盖七个必填字段和反馈尾部的格式。
4. 会话结束钩子脚本：运行生成器，任一字段缺失就拒绝关闭会话。
5. `docs/handoff.md`，列出七个字段、各自来源和裁剪策略。

直接否决：

- 没有 `next_action` 的交接。伪装成交接的状态报告会毒害下一个会话。
- 手写摘要的生成器。agent 的职责是让工作台保持在可以生成交接包的状态。
- 与 JSON 内容不一致的 Markdown 交接包。JSON 是源头，Markdown 只是 JSON 的渲染。
- 超过 30 条的反馈尾部。完整日志在版本控制里，交接包必须保持精简。

拒绝规则：

- 缺少验证报告时，拒绝生成交接包。没有结论的交接只是愿望。
- 缺少审查报告而本应有人工审查时，拒绝执行，要求先完成审查。
- diff 摘要为空但会话运行超过 5 分钟时，生成前先报告这一异常；更可能是会话卡死，而不是真的什么都没做。

输出结构：

```
<repo>/
├── outputs/handoff/<session_id>/
│   ├── handoff.md
│   └── handoff.json
├── tools/generate_handoff.py
├── handoff.schema.json
└── docs/handoff.md
```

最后给出"接下来读什么"，指向：

- 第 41 课：在仿真实风格的示例应用上做端到端演练。
- 第 42 课：把生成器打包进综合项目的工作台套件。
- 第 29 课（生产运行时）：把会话结束接入队列、事件和 cron 触发器。
