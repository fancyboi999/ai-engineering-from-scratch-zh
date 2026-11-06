---
id: browser-agent-trust-boundary
title: 已登录且可读取任意网页的差旅 agent
card: sandboxes
kind: design
level: 3
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [system-design, design-review]
tags: [browser-agent, prompt-injection, trust-boundary, computer-use, hitl]
minutes: 10
lessons: [phases/15-autonomous-systems/11-browser-agents, phases/14-agent-engineering/21-computer-use-agents]
manuals: []
practice: []
cheatsheet: [autonomous-agents, embodied-computer-use]
related: [sandboxes/screen-text-is-not-permission]
updated: 2026-11-03
---

为协助员工预订差旅的浏览器 agent 设计信任边界。它可以读取任意网页、已登录差旅预订平台，并能够提交表单。列出你假定存在的攻击类别、勾勒信任边界、选择与该场景匹配的评估基准，并指出哪一项防御手段是你拒绝单独依赖的。

## Short answer

假定存在五类攻击：网页正文中的恶意指令、从不渲染的 URL 片段或查询参数中的攻击载荷、诱导 agent 写入在下一会话生效的持久记忆的网页、利用已登录会话发起的 CSRF 类请求，以及看似无害实则绑定了连带危险动作的按钮。划定严格的读写边界：读取从不产生后果，任何写入操作（表单提交、POST 请求、带有副作用的工具调用或改变状态的页面导航）在触发内容来自信任边界之外时必须等待全新的人工授权确认，同时配备单任务工具白名单、严格限制凭据作用域，并记录每笔 HTTP 请求日志。采用事务性真实 Web 业务流程而非单纯的信息查找基准做评测。你不单独依赖的防御手段是内容清洗器（content sanitizer），因为 agent 必须读取不可信内容才能正常开展工作，而基于模式特征的过滤器只能剔除最浅显的已知攻击。

## Full answer

### 为什么无法彻底消除这类攻击

攻击与能力同构：agent 必须读取不可信内容，读到的任何内容都可能包含指令，遵循的任何指令都可能违背用户意图。这正是“间接 prompt 注入不是可以彻底修补的 bug”这一公开说法的依据。防御措施提高攻击成本，并缩小影响范围。设计应着眼于遏制，而不是假设能彻底消除这类攻击。

### 信任边界体系构成

| 体系组件 | 具体运作职责 |
|---|---|
| read/write boundary（读写边界） | 读取不触发动作；由信任边界外的内容引发的写入须等待新的人工审批 |
| per-task tool allowlist（单任务工具白名单） | Agent 可以浏览网页，但不能发起支付，除非该任务显式开启了支付工具权限 |
| session isolation（会话隔离） | 仅注入受限作用域的凭据，不使用生产环境凭据和个人邮箱，并留存请求日志以供审计 |
| per-step safety check（每步安全核验） | 动作在执行前必须经过安全评估，阻断针对允许区域外部的点击或携带注入模式的键入 |
| human confirmation（人工介入确认） | 登录认证、最终下单支付和人机验证（CAPTCHA）始终等待人工确认 |
| sanitizer（内容清洗器） | 获取的 HTML 在进入模型上下文之前先行剥离已知的恶意特征模式 |
| memory canary（记忆金丝雀） | 植入的持久记忆在被唤醒激活时对用户完全可见 |

三款生产级计算机使用模型均基于视觉输入，并将屏幕截图、DOM 文本、工具输出和 PDF 内容统一视为不可信数据；只有来自用户的直接指示才算作有效授权。长程任务必须保留单步完整跟踪链，因为包含 200 次点击、在末期失败的执行流若没有逐步跟踪则根本无法排查。

### 选取与业务目标匹配的评测基准

信息检索基准度量的是 Agent 是否能在开放网络上检索事实；桌面基准度量的是其驱动完整操作系统的能力；而经过核验的 Web 任务基准度量的是其在模拟网站中完成事务性业务流程的能力，且包含考察跨多页面状态维护的困难子集。在单纯的信息查找基准上获得高分，丝毫不意味着该 Agent 能够胜任订机票的任务。针对该差旅产品必须采用事务性评测，其核心验收测试标准是：每次注入的写入操作都能触发写入门控。

## Follow-ups

- **Level 3:** 预订流程最终进入支付环节，哪种输入具有合法授权资格？ Expected: 仅限来自用户的直接指示；从网页、URL 片段或工具执行结果中读取的任何内容均不行。
- **Level 3:** 某网页要求 Agent 记住一条规则以备下次使用，如何阻断这种延时炸弹载荷？ Expected: 将记忆写入视为需要审批的写入操作，并配置金丝雀检测使得被植入的记忆条目在触发时对用户可见。
- **Level 4:** 为什么请求日志必须纳入信任边界之中？ Expected: 类似 CSRF 的恶意动作会携带合法 Cookie 顺风车发起请求，全量日志是事后核查 Agent 具体操作的唯一依据。
- **Level 4:** 在本质设计上，内容清洗器注定会漏掉什么？ Expected: 漏掉任何不属于已知模式的内容（包括一句表面看似普通请求的正常散文），因为 agent 无法停止读取文本。

## Wrong answers

- "剥离所有 HTML 标签问题就解决了。" 过滤只能剔除已知结构；该攻击类别无法完全封闭，因为 Agent 必须阅读自然语言。
- "模型经过专门训练能够主动拒绝注入攻击。" 供应商自身的官方文档都明确将抓取的内容视为不可信输入，并将安全门控部署在模型外部。
- "选择在网络浏览通用基准上得分最高的 Agent。" 事实检索与事务性预订流程属于不同维度的能力；必须针对实际交付的真实业务流做评估。

## Taught in

[浏览器 Agent 课程](../../../phases/15-autonomous-systems/11-browser-agents/)指明了攻击类别与配套防御手段，[计算机使用课程](../../../phases/14-agent-engineering/21-computer-use-agents/)阐明了不可信输入契约与单步安全模式。
