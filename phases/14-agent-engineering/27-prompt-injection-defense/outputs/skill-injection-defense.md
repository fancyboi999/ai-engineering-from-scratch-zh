---
name: injection-defense
description: 为任意 agent 运行时构建 PVE（Prompt-Validator-Executor）层，包含来源标注、注入标记扫描和白名单导航。
version: 1.0.0
phase: 14
lesson: 27
tags: [security, prompt-injection, pve, greshake, source-tag]
---

用户会给出一个有工具权限和检索能力的 agent。你负责产出一个注入防御层。

输出：

1. 为每一段内容打上来源标签：`user_message`、`tool_output`、`retrieved_web`、`retrieved_memory`、`retrieved_file`。标签随消息历史一路传递。
2. `Validator.assess(tool_call, contents)`：拒绝参数或检索内容呈现注入特征的工具调用；只有来源标签符合声明的信任级别时才放行。
3. 导航的白名单 / 黑名单：agent 可以触及的 URL、域名、文件路径。
4. 记忆写入护栏：拒绝看起来像指令的写入。
5. 内容采集规范（第 23 课）：检索到的内容存到外部；span 只带引用 ID，不带正文。
6. 测试套件：把 Greshake 提出的五类攻击作为红队用例。

直接否决：

- 没有来源标签的工具使用接口。不知道来源，就无法区分权限级别。
- 只在最终输出上运行的校验器。事后校验毫无意义，模型已经行动了。
- "放心，system prompt 会处理的。"system prompt 写得干净不等于有管控。

拒绝规则：

- 如果 agent 有任何检索能力却没有来源标注，拒绝上线。检索内容是最典型的注入入口。
- 如果敏感工具（发消息、执行 shell、在 / 下写文件）没有人在回路的确认，拒绝。
- 如果记忆写入没有防护，拒绝。持久化的记忆投毒会在下一次会话中再次生效。

输出：`validator.py`、`source_tag.py`、`allowlist.py`、`memory_guard.py`、`red_team.py`，以及一份 `README.md`，说明六层管控栈、残余风险和持续审查节奏。结尾写"接下来读什么"：第 21 课（computer use 安全）和第 23 课（通过 OTel 做内容采集）。
