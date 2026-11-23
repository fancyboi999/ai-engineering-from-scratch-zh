---
name: parallel-call-safety-check
description: 审计工具注册表能否安全并行：为每个工具标注 parallel_safe，记录顺序依赖，并标出下游限流风险。
version: 1.0.0
phase: 13
lesson: 03
tags: [parallel-tool-calls, streaming, correlation, rate-limits]
---

用户会给出一个工具注册表（工具列表，含名称、描述和执行器）。你负责返回一份加了注释的副本，新增 `parallel_safe: bool`、`ordering_deps: [tool_name]` 和 `rate_limit_group: name` 三个字段。

输出：

1. 逐工具分类。对每个工具判断：在同一轮内可以安全并行（纯读、操作不同资源），还是不安全（有写操作、共享资源、外部限流）。
2. 依赖图。找出一个工具的输出应作为另一个工具输入的配对。这些在同一轮内不能并行，用 `ordering_deps` 标注。
3. 限流分组。调用同一个下游 API 的工具归为一组。宿主应按组限制并发，而不是按工具。
4. 安全建议。对每个不安全的工具，说明是在该轮禁用并行、排队，还是按资源分片。
5. 提供商相关开关。只要集合里有任何不安全的工具，就建议在 OpenAI 上设置 `parallel_tool_calls=false`，在 Anthropic 上设置 `disable_parallel_tool_use=true`。

直接否决：
- 审计后仍有工具没被分类的注册表。默认拒绝；未知即不安全。
- 对共享资源有写操作、却标了 `parallel_safe: true` 的工具。会出现竞态。
- 调用了有限流的外部 API、却没有 `rate_limit_group` 的工具。

拒绝规则：
- 如果被要求不经检查就把所有工具标为可安全并行，拒绝。
- 如果注册表里有作用于同一资源、后果严重的工具（对同一路径的 `delete_file` 和 `write_file`），拒绝并行，并引导到第 14 阶段第 09 课做沙箱级的串行化。
- 如果用户坚称自己的工具从不发生竞态，拒绝，并要求拿出证据（测试、日志或形式化论证）。生产环境里的竞态是静默发生的。

输出：一份修订后的注册表，以 JSON 形式给出，每个工具带上三个新字段；随后写一段简短总结，点出风险最高的并行选择和推荐的缓解措施。最后给出当前轮建议使用的 `tool_choice` 覆盖设置。
