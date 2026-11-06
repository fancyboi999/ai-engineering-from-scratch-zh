# 协议：MCP、A2A 与技能

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

agent 怎样调用工具和其他 agent，以及怎样保证这些调用安全。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [A2A 客户端发第一条消息前要读什么](a2a-card-before-the-call.md) | 概念 | 1 基础 | 7 |
| [根据选择者挑选适配的 MCP 原语](tool-resource-or-prompt.md) | 概念 | 1 基础 | 6 |
| [协议错误不是工具错误](two-error-layers.md) | 概念 | 1 基础 | 6 |
| [永远停不下的轮询，和不该发生的部署](a2a-rejected-task-loop.md) | 排障 | 2 应用 | 8 |
| [忘记版本的客户端引发的两处错误](a2a-version-header-missing.md) | 排障 | 2 应用 | 8 |
| [私有笔记前的共享缓存](cache-scope-private.md) | 权衡 | 2 应用 | 8 |
| [看似相同的三类取消机制](cancel-signal-per-transport.md) | 概念 | 2 应用 | 8 |
| [放行了已变更工具的哈希锁定检查](descriptor-pin-rug-pull.md) | 排障 | 2 应用 | 9 |
| [提前两页结束的翻页循环](empty-cursor-stops-early.md) | 代码阅读 | 2 应用 | 7 |
| [当前传输协议中的粘性会话、GET 流与断流恢复](post-only-streamable-http.md) | 概念 | 2 应用 | 9 |
| [根路径仅为提示而非授权](roots-are-not-a-sandbox.md) | 概念 | 2 应用 | 8 |
| [为什么每个 MCP 请求都重复其元数据](stateless-request-metadata.md) | 概念 | 2 应用 | 8 |
| [不靠重放，恢复断开的 A2A 流](a2a-stream-drop-resubscribe.md) | 设计 | 3 高级 | 10 |
| [可能触发两次或完全不触发的 Webhook](a2a-webhook-at-least-once.md) | 权衡 | 3 高级 | 10 |
| [在第二个副本上消失的草稿](draft-lost-across-replicas.md) | 排障 | 3 高级 | 10 |
| [鉴权了读取却执行了删除的网关校验顺序漏洞](header-body-mismatch-order.md) | 排障 | 3 高级 | 10 |
| [当旧服务端确实属于旧版时](legacy-probe-fail-closed.md) | 设计 | 3 高级 | 12 |
| [在无会话情况下确认删除操作](mrtr-confirmation-state.md) | 设计 | 3 高级 | 12 |
| [超时后执行了两次扣款](retry-is-not-idempotency.md) | 设计 | 3 高级 | 12 |
| [得分 66.7% 的服务器到底有多合规](a2a-tck-score-reading.md) | 估算 | 4 架构与规模 | 12 |
| [构建 MCP 网关的准入关卡](gateway-admission-take-home.md) | 课后任务 | 4 架构与规模 | 60 |
| [两个签发方，一个资源服务器，服务不中断](issuer-bound-tokens-and-jwks.md) | 设计 | 4 架构与规模 | 15 |

[全部主题](../../README.md)
