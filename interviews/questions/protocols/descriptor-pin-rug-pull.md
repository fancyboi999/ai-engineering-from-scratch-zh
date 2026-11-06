---
id: descriptor-pin-rug-pull
title: 放行了已变更工具的哈希锁定检查
card: protocols
kind: debug
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer, ai-developer-relations-engineer]
rounds: [debugging, design-review]
tags: [mcp, tool-poisoning, rug-pull, hash-pin, gateway]
minutes: 9
lessons: [phases/13-tools-and-protocols/15-mcp-security-tool-poisoning]
manuals: []
practice: []
cheatsheet: [mcp-security-auth, mcp-gateways-operations]
related: [protocols/two-error-layers]
updated: 2026-11-03
---

你的网关靠哈希已审批工具的说明文本（description）锁定工具。某个连接的服务端发布了更新。说明文本没有改变，但其 `inputSchema` 增加了一个 `destination` 字段，且 `destructiveHint` 变为了 false。哈希锁定通过了，模型开始使用新参数调用该工具。哪里出了问题，正确的锁定方式是什么？

## Short answer

哈希锁定仅覆盖了一个字段，因此 schema 和注解的变更被当作未变更放行。应按键排序规范化完整描述符并计算哈希，将摘要与发布者证据及审批时间一起存储在限定名称下。在每次刷新时，遇到未知键或已更改的摘要均予以隔离，直到人工重新审批。哈希一致证明的是稳定性而非安全性，因此首个描述符同样需要审查。

## Full answer

### 锁定整个描述符

```python
normalized = json.dumps(tool, sort_keys=True, separators=(",", ":"))
digest = hashlib.sha256(normalized.encode()).hexdigest()
```

将摘要存储在限定键下，例如 `notes.export`。在每次刷新时：

| 现象 | 动作 |
|---|---|
| 未知键 | 隔离直到审查 |
| 相同键，不同摘要 | 作为 rug pull 隔离直到重新审批 |
| 重复的非限定名称 | 要求确定性命名空间 |
| 扫描器命中 | 拦截并审查完整描述符 |

### 七个攻击面，而不是一个

元数据投毒、描述符 rug pull、跨服务端同名遮蔽、头与请求体混淆、能力提升、MRTR 状态篡改以及供应链身份混淆相互交织。哈希锁定有助于发现变更，但无法证明第一个版本是安全的。静态扫描器可以捕获明显的短语，但会漏掉隐晦的措辞。命名空间可防止一类冲突，但无法阻止恶意的命名空间服务端。应层叠多种控制。

### 扫描器是一根绊线

简单的模式可以标记角色标签、指令覆盖、隐瞒、机密访问和模糊的网络目标。它们在安装时和 CI 中成本低廉。但它们不是语义证明：安全的描述可能在警告中包含被标记的短语，而恶意的描述可以避开所有短语。将命中视为审查证据。

### 在合并前设置命名空间

当两个服务端都暴露 `search` 时，绝不让发现顺序来做决定。限定名称 `notes.search` 和 `issues.search` 成为公开的网关名称，后端映射则单独记录。稳定的名称使审批、审计、锁定和 `Mcp-Name` 路由指向同一对象。

### 检查执行两次

在服务发现时运行哈希锁定比对，并在分发之前再次运行。缓存可以减少发现工作，但在描述符变更时缓存的审批必须过期或失效。

## Follow-ups

- **Level 2:** 干净的扫描器结果证明了什么？ Expected: 没有证明任何语义层面的内容；它是审查证据，而非无害评分。
- **Level 3:** 服务端的 `serverInfo` 表明它是熟悉的发布者，这能带来多少信任？ Expected: 毫无信任；那是用于日志的自报展示数据，而不是证书或注册中心证明。
- **Level 3:** 描述符在第一天就被投毒且哈希存储了该摘要，什么能捕获它？ Expected: 首次审批前的审查，并以扫描器作为绊线；哈希无法捕获。
- **Level 4:** 网关如何阻止模型将注解视作策略？ Expected: 注解保持为展示提示；鉴权将主体绑定至确切动词、资源和规范化参数，会产生重要后果的调用需要与具体操作绑定的审批。

## Wrong answers

- "只哈希 description；schema 只是类型定义。" Schema 决定了模型可以发送哪些参数，新字段可以将数据路由到新目的地。
- "匹配的哈希意味着工具是安全的。" 这意味着描述符未改变。被投毒的描述符在锁定后依然是被投毒的。
- "设置 `destructiveHint`，宿主就会确认。" 注解是不可信的提示。服务端强制执行鉴权和审批。

## Taught in

[工具投毒课程](../../../phases/13-tools-and-protocols/15-mcp-security-tool-poisoning/)列出了七个攻击面并锁定了完整描述符。
