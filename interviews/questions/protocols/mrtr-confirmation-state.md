---
id: mrtr-confirmation-state
title: 在无会话情况下确认删除操作
card: protocols
kind: design
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [mcp, elicitation, mrtr, request-state, replay, confirmation]
minutes: 12
lessons: [phases/13-tools-and-protocols/12-mcp-roots-and-elicitation, phases/13-tools-and-protocols/15-mcp-security-tool-poisoning]
manuals: []
practice: []
cheatsheet: [mcp-tasks-elicitation-apps, mcp-security-auth]
related: [protocols/roots-are-not-a-sandbox, protocols/header-body-mismatch-order]
updated: 2026-11-03
---

一个负责删除笔记的工具 `notes_delete` 找到了与用户提供的标题相匹配的三篇笔记。请在当前 MCP 修订版下设计确认流程：服务端如何要求用户选择一篇并确认、答案如何返回，以及是什么阻止了客户端回答不同问题或使用修改后的参数重放某次确认。

## Short answer

服务端返回类型为 `input_required` 的结果，其中嵌入一个列出三个候选 ID 和 `confirm` 布尔值的 `elicitation/create` 表单请求，加上完整性受保护的 `requestState`。客户端显示表单并使用新请求 ID 重试原始 `tools/call`，回传 `requestState` 和 `inputResponses`。服务端对主体、方法、参数摘要、候选集、阶段和过期时间签名，验证回传内容，检查所选 ID 是否在签名集中，重新鉴权工作区并重新检查笔记是否仍在工作区内，并在删除前消耗共享重放存储中的一次性 nonce。

## Full answer

### 首次响应

```json
{
  "resultType": "input_required",
  "inputRequests": {
    "delete_choice": {
      "method": "elicitation/create",
      "params": {
        "mode": "form",
        "message": "Choose one matching note and confirm deletion.",
        "requestedSchema": {
          "type": "object",
          "properties": {
            "note_id": {"type": "string", "enum": ["note-3", "note-7", "note-14"]},
            "confirm": {"type": "boolean"}
          },
          "required": ["note_id", "confirm"]
        }
      }
    }
  },
  "requestState": "integrity-protected-delete-state"
}
```

当前服务端不发送反向的 JSON-RPC 请求。嵌入的请求是完整的，带有 `method` 和 `params`，其键必须与重试时 `inputResponses` 中的条目相匹配。

### 能力在当前请求上检查

服务端仅在当前请求的 `clientCapabilities` 支持表单模式时才可嵌入表单。`{"elicitation": {}}` 和 `{"elicitation": {"form": {}}}` 均支持表单模式。仅声明 URL 模式则不支持，服务端返回 `-32021`，且 `data.requiredCapabilities` 等于 `{"elicitation":{"form":{}}}`。早期请求的声明绝不算数。

### 表单模式的限制

根节点必须是对象，字段只能是扁平的基本类型或受支持的枚举。用它在候选项中选择、确认破坏性操作或收集非敏感偏好。切勿在其中收集密码、API 密钥或支付凭据，因为它们会通过客户端并可能到达日志或模型上下文。URL 模式适用于此类外部流程。

### 三种结果，三种行为

| 动作 | 含义 | 服务端行为 |
|---|---|---|
| `accept` | 用户提交了表单 | 验证内容并继续 |
| `decline` | 用户拒绝了 | 返回完整的非错误拒绝；消耗 nonce 且不删除 |
| `cancel` | 用户关闭或未能完成 | 安全停止；状态在过期前仍可重试 |

切勿将缺失的内容解读为同意，也切勿将拒绝转变为重复的提示。

### 签名状态绑定的内容

该状态保存已认证的主体、原始方法、`workspaceUri` 和 `title` 的摘要、表单中显示的允许笔记 ID、操作阶段和短暂的过期时间。在重试时，服务端验证签名，对照 schema 验证响应，检查 `note_id` 是否在签名的候选集中，重新鉴权工作区，重新检查笔记是否仍在工作区内，然后才修改。更改的标题无法重用原始状态。

### 为什么仅靠 HMAC 还不够

有效状态在其有效期内可以被重放。在每个处理程序实例共享的重放存储中恰好存储并消耗一次 nonce，并在删除运行时保持原子性占用。数据库将占用和修改耦合在一个事务中。在占用之前先验证：畸形响应或取消不占用任何内容。

## Follow-ups

- **Level 3:** 客户端仅声明 `{"elicitation": {"url": {}}}`。服务端怎么做？ Expected: 返回 `-32021` 并在 `data` 中附带所需的表单能力；绝不能嵌入当前请求未声明的模式。
- **Level 3:** 用户关闭对话框。对应什么动作，状态如何变化？ Expected: `cancel`；没有任何修改，且状态在过期前保持可重试，不同于终止性的 `decline`。
- **Level 4:** 两个服务端实例共享笔记存储。如何阻止两者执行同一次确认？ Expected: 具有与修改耦合的原子 nonce 占用的共享重放存储；课程的测试针对一个状态运行两个服务端对象。
- **Level 4:** 在显示表单后，笔记移到了工作区之外。什么能捕获它？ Expected: 修改前的实时记录检查和工作区范围复查，而不能仅靠签名状态。

## Wrong answers

- "将候选列表保存在服务端内存中，以连接为键。" 没有会话，且重试可以到达任何实例。候选项在签名状态内传输。
- "宿主验证了表单，所以服务端可以信任内容。" 客户端控制它发送的所有内容。服务端再次验证 schema 和候选集。
- "在表单中索要用户密码作为确认。" 表单模式绝不能携带机密。外部凭据流程使用 URL 模式，并将浏览器用户绑定到同一主体。

## Taught in

[根路径与信息征询课程](../../../phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/)使用重放存储构建了此流程，[安全课程](../../../phases/13-tools-and-protocols/15-mcp-security-tool-poisoning/)将 `requestState` 视为恶意输入。
