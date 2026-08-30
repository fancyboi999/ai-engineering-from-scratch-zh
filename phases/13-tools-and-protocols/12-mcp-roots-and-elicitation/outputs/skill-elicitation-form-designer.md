---
name: elicitation-form-designer
description: 为无状态 MCP 2026-07-28 elicitation 设计显式资源范围、授权、安全表单和签名 retry state。
version: 2.0.0
phase: 13
lesson: 12
tags: [mcp, elicitation, mrtr, scope, authorization]
---

为 MCP `2026-07-28` 操作设计用户输入步骤。把 workspace、目录或 resource URI 放在可见 tool 参数或 server 配置中，并说明哪个已认证 principal 可用；定义 URI 归一化、path-component containment、symbolic-link policy 和 OS sandbox。

说明必须询问用户的精确歧义、确认或外部交互。discovery 返回精确版本、capabilities、`ttlMs`、`cacheScope`；若有 tools，`tools/list` 必须稳定、`inputSchema` 为 object 且有 identity/cache hints。`elicitation: {}` 或 `elicitation.form` 表示支持表单；缺失或仅 URL 支持时返回 `-32021` 与 `data.requiredCapabilities.elicitation.form`，版本不支持用 `-32022`。

MRTR 以 `resultType: "input_required"`、稳定 `inputRequests` key 和 `elicitation/create` 返回。form 使用简单 message 与受限扁平 schema；URL 显示 HTTPS 目的地与 out-of-band 完成规则。重试带新 id、原 method/args、当前 `inputResponses`、本轮 `_meta` 和原样 `requestState`；无 id notification 只返回 HTTP 202。区分 accept、decline、cancel；以 HMAC/认证加密把 principal、参数摘要、候选、phase、过期与一次性 nonce 绑定，并在最终 mutation 前重检授权、实时状态和 containment。

拒绝把已弃用 Roots 当授权/containment/sandbox、用 roots/list 或反向 elicitation request、在 form 收集 password/API key/token/payment 信息、未经能力声明使用输入模式、把 clientInfo 当身份、未经确认就执行破坏性操作及未签名权限状态。拒绝显式 decline 后反复提示，最后输出风险和最小修正。
