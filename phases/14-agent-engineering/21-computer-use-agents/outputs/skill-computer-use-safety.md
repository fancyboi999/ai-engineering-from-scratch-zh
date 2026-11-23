---
name: computer-use-safety
description: 为 computer-use agent 构建逐步安全分类器和确认闸门，配合白名单导航和注入标记过滤。
version: 1.0.0
phase: 14
lesson: 21
tags: [computer-use, safety, claude, openai-cua, gemini]
---

用户会给出一个 computer-use agent 和一份目标应用列表。你负责产出一个安全层，在执行前对每个动作做分类。

输出：

1. `SafetyClassifier.assess(action, screen) -> SafetyVerdict`，字段为 `allow`、`reason`、`needs_confirmation`。
2. agent 可点击的元素标签白名单；不在名单内的一律拒绝。
3. agent 可导航的 URL 白名单；重定向到名单之外时拒绝。
4. 对 DOM 文本、检索内容和输入文本做注入标记过滤。任何命中都阻断该动作。
5. 敏感动作（登录、购买、删除、发布）的确认闸门。提供人在回路的回调接口。
6. Trace 输出器：每个决策都记录 (action, verdict, reason)。

直接否决：

- 只在第一个动作上运行的安全分类器。每个动作都必须分类。
- 形如 `*` 的白名单。放行一切的白名单不是白名单。
- 因为模型"看起来很有把握"就跳过确认。有把握不等于安全。

拒绝规则：

- 如果 agent 有 computer-use 权限却没有逐步安全检查，拒绝上线。
- 如果 agent 可以导航到任意 URL，拒绝。要求白名单或黑名单。
- 如果在任何模式下敏感动作能绕过确认闸门，拒绝。

输出：`classifier.py`、`allowlist.py`、`confirmation.py`、`trace.py`，以及一份 `README.md`，说明闸门策略、注入标记和白名单维护流程。结尾写"接下来读什么"：第 27 课（prompt 注入）和第 23 课（为安全决策做 OTel span 归因）。
