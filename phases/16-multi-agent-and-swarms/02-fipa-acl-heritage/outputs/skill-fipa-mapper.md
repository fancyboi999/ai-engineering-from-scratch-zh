---
name: fipa-mapper
description: 把任意 2026 年的 agent 协议规范（MCP、A2A、ACP、ANP、CA-MCP、NLIP 或新协议）映射到 FIPA-ACL 的施事行为和交互协议上，判断哪些是真正的创新、哪些是重新发明。
version: 1.0.0
phase: 16
lesson: 02
tags: [multi-agent, protocols, FIPA, speech-acts, interoperability]
---

给定一份新的 agent 协议规范，产出它的 FIPA-ACL 映射，让读者看清哪些部分是重新发明、哪些是真正的新结构。

产出：

1. **信封映射。** 对规范定义的每种消息类型，指出最接近的 FIPA 施事行为（`inform`、`request`、`query-if`、`query-ref`、`propose`、`accept-proposal`、`reject-proposal`、`cfp`、`subscribe`、`cancel`、`failure`、`not-understood`，或其余约 20 个之一）。没有合适的施事行为时，准确描述缺口。
2. **关联模型。** 规范如何把请求关联到回复、把取消关联到原请求、把流式事件关联到订阅？与 FIPA 的 `:conversation-id` 和 `:reply-with` 字段做对比。
3. **内容语言立场。** 规范是强制规定内容 schema（类型化产物、JSON-Schema）、接受自然语言，还是不作规定？与 FIPA 的 SL0/SL1 及 ontology 字段做对比。
4. **交互协议库。** 哪些 FIPA 交互协议可以在该规范之上实现：contract-net、subscribe-notify、request-when、propose-accept？写出实现每种协议所需的消息。
5. **发现模型。** agent 如何找到对方及其能力（MCP `listTools`、A2A Agent Card、ANP DID + 元协议）？与 FIPA 的目录服务（directory facilitator）和黄页服务做对比。
6. **重新发明还是创新。** 产出一张三列短表：[FIPA 概念, 现代规范中的对应物, 变化之处]。每行标记为 [reinvention] 或 [novel-structure]。只有当规范引入了 FIPA 没有的原语时，这一行才算 "novel-structure"；常见候选是去中心化身份、类型化多模态产物和 LLM 可解读的内容。

直接否决：

- 声称某规范"革命性"，却拿不出一个 FIPA 没有的原语的任何映射。当年失败的根源是言语行为理论加 ontology 的开销，不是这些原语本身。
- 忽略发现层的框架对比。没有发现机制的规范是不完整，不是创新。
- "协议 X 取代了 FIPA"之类的说法，却不回答两个 agent 对内容含义理解不一致（语义漂移）时怎么办。

拒绝规则：

- 规范尚未标准化（草案不到 6 个月、没有公开实现）时，说明映射是临时性的，并标出三处最可能的变化。
- 规范是闭源或仅限企业使用的（某些 ACP 变体）时，映射已有文档的部分，并写明缺口。
- 用户只提供了一篇博客文章（没有规范文档）时，先要规范再做映射。

输出：一页简报。开头用一句话总结（"协议 X 就是 FIPA `request`/`subscribe` 加上 JSON 语法和基于 DID 的发现层。"），然后是上面六个部分，最后用一段话回答："这份规范会重新踩到 FIPA 当年的哪个失败模式？"
