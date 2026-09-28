# 规范阅读指南

这份一页式参考帮助你按照考试的方式阅读 MCP 2026-07-28 规范。

## 从哪里开始

- 规范索引：区分每个实现都 MUST 支持的内容（基础协议、版本控制、消息模式），以及实现 MAY 添加的内容（授权、服务端功能、客户端功能、实用工具）。
- schema.ts 是所有消息与结构的事实来源；schema.json 由它生成，供工具使用，本身不具备权威性。
- 当前修订版是 2026-07-28。修订版状态分为 Draft、Current、Final；任何时候只有一个修订版处于 Current。

## 阅读 MUST、SHOULD 或 MAY

| 关键字（仅限全部大写） | 强度 |
|---|---|
| MUST, SHALL, REQUIRED | required |
| MUST NOT, SHALL NOT | forbidden |
| SHOULD, RECOMMENDED | recommended |
| SHOULD NOT, NOT RECOMMENDED | not recommended |
| MAY, OPTIONAL | optional |

普通叙述中的小写 "must"、"should" 或 "may" 按照 BCP 14（RFC 2119、RFC 8174）不具有规范约束力。只有规范中那样全部大写的形式才算数。

## 功能状态与修订版状态

整个带日期的修订版处于 Draft、Current 或 Final 状态。某项功能——一条消息、一项能力或一种传输方式——处于 Active、Deprecated 或 Removed 状态，并在弃用功能注册表中跟踪，与修订版自身状态相互独立。功能可以在 Current 修订版中处于 Deprecated，而不改变修订版本身的状态。

## 弃用时间

- 最短弃用窗口为十二个月，从首次把功能标记为 Deprecated 的修订版发布之日算起，而不是从弃用它的 SEP 进入 Final 的时间算起。
- 最早移除时间是窗口结束当天或之后，以 Current 状态发布的第一个修订版。实际移除仍需 Core Maintainer 在发布时决定；功能保持 Deprecated 的时间可能远长于下限。
- Deprecated 功能可以由后续取代它的 SEP 恢复为 Active。

## 阅读 SEP 及其变更日志条目

- SEP 是 seps 目录中的 Markdown 文件，会经历 draft、in review、accepted 和 final；其他结果包括 rejected、withdrawn、dormant 和 superseded。
- SEP 分为四类：Standards Track、Informational、Process 和 Extensions Track。
- 变更日志条目会注明产生它的 SEP。在相信一行摘要前，应打开 SEP 文件本身，查看确切规范文本、设计理由，以及它是否真正进入 Final。

## 考试要点

- Deprecated 不等于 Removed。Roots、Sampling、Logging 和 Dynamic Client Registration 在 2026-07-28 中是 Deprecated，并未消失；它们仍严格按规范工作。
- JSON-RPC 批处理在 2025-03-26 发布的修订版中加入，却在紧接着的 2025-06-18 修订版中移除，完全没有弃用窗口。这一缺口正是功能生命周期策略存在的原因。
- schema.ts 与 schema.json 冲突时，以 schema.ts 为准。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 1、15 节。
