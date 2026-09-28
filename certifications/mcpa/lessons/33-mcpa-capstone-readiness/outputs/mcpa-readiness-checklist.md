# MCPA 就绪检查清单

面向 MCP 2026-07-28 的考前检查清单，与 `certifications/mcpa/tracks/mcpa-f.json` 保持一致。五个加权领域的全部 18 项 objective 均列于此，并转化为你实际能完成的操作，同时指向本综合项目交互记录（`code/main.py`、`docs/zh.md`）中的对应实践，或首次讲解它的前序课程。本课结束后做一次，考试前一晚再做一次。

## MCP Fundamentals（16%）

- [ ] 我能解释 MCP 标准化的集成问题、N×M 自定义集成如何缩减为 N+M，以及协议刻意留给 host 应用的职责。首次见于第 02 课；本综合项目的每次交互都以此为背景。
- [ ] 我能描述 host、client、server、primitive 和无状态 JSON-RPC 请求模型，包括为什么任何请求都不能依赖早先请求建立的状态。第 04 课深入构建了这些概念；本综合项目服务器每次都根据全新、自包含的请求回答。
- [ ] 我能分析 protocol versioning，并解释为什么一个开放协议胜过每个系统各自定义集成。直接实践：交互记录的第一次调用使用 protocol version 2025-11-25，在修正后的调用继续前收到 UnsupportedProtocolVersionError。
- [ ] 我能阅读规范、revision history 和 feature lifecycle，区分当前、deprecated 与 removed 行为。第 01、05、15 课覆盖这些内容；本综合项目从不使用已删除 method，并把 roots、sampling 和 logging 视为 deprecated 而非消失。

## Architecture and Components（14%）

- [ ] 我能读取定义 MCP message、tool definition、capability 与 server manifest 的 schema 和 structured data。直接实践：`restart_service` 的 inputSchema 会把缺少 environment 参数转化为 isError 结果，而不是静默成功。
- [ ] 我能区分 host、client 与 server 的职责，并说明 discovery 和 capability negotiation 如何连接三者。直接实践：任何客户端尝试使用 tasks extension 之前，`server/discover` 已公布支持；每个后续调用仍逐请求声明自身 capabilities。
- [ ] 我能追踪模型交互如何从用户请求经过 host、model、client 和 server，再返回 model context。第 10 课构建完整循环；本综合项目的 `restart_service` 流程是一次具体往返：请求、schema 检查、consent、结果。

## Interactions and Execution（26%）

- [ ] 我能应用 request、notification、subscription 与 MRTR 交互模式，并处理每种 result type。直接实践：本交互记录在一次运行中产生 complete、input_required、task 结果和 notifications/progress。
- [ ] 我能处理协议错误与工具执行错误，包括 version、capability、header 和 validation failure。直接实践：同一服务器中包括版本错误 `-32022`、能力错误 `-32021`、第 19 课 header 检查覆盖的 `-32020` 区域，以及 validation failure 对应的 isError true。
- [ ] 我能走完工具调用生命周期：从发现和选择，到调用、用户输入、进度、取消与结果。直接实践：`scan_fleet_health` 从进度进入结果；`restart_service` 通过 MRTR 接受用户输入后进入结果；第二个 diagnostics task 在完成前被取消。
- [ ] 我能识别协议 primitive 与 utility：tools、resources、prompts、completion、caching、pagination、transport 和 deprecated client feature。本综合项目交互覆盖 tools、缓存提示，以及 stdio 风格与 Streamable HTTP transport；第 12、13、15、20 课深入覆盖 resources、prompts、completion 和 pagination，本课不再重复。

## Security and Governance（24%）

- [ ] 我能定位 host、client、server、model 以及服务器暴露的工具与内容之间的信任边界。第 22 课命名了边界；本综合项目针对 `acknowledge_incident` 的 OAuth gate 在线路上执行它。
- [ ] 我能应用基于 OAuth 的授权、client registration、scope 和 consent，让用户批准服务器可查看和执行的内容。直接实践：为另一个 resource server audience 签发的 bearer token 以 401 拒绝，scope 正确的 token 成功；第 23、24 课构建此调用所依赖的完整授权与注册流程。
- [ ] 我能选择风险与安全控制，抵御 tool poisoning、injection、token misuse 和过宽访问。直接实践：`restart_service` 从不只凭调用方一句话就执行，而是要求已声明能力、带签名的 requestState 与明确 accept；第 26 课覆盖更广的控制目录。
- [ ] 我能设计审计与可观测性，使协议活动可追踪、可归因、可复核。直接实践：同一个 W3C trace id 贯穿本交互的每一跳，哈希链审计日志记录谁做了什么；正常时通过验证，异常时准确指出被篡改 entry。

## Use Cases and Ecosystem（20%）

- [ ] 我能梳理构建和部署 MCP 的团队角色、职责、治理与采用模式。第 28 课深入覆盖；本综合项目的 `incident-console` 是运维团队服务器的真实示例，不是玩具。
- [ ] 我能为运维用例选择合适的 primitive 或 extension。直接实践：快速只读 scan 保持普通调用；破坏性 restart 使用 MRTR consent；耗时 diagnostics sweep 使用 tasks extension——三类问题对应三种机制；第 29 课还列出更多模式。
- [ ] 我能分析客户端、服务器、SDK、扩展、gateway 和 registry 之间的生态可移植性。第 30 至 32 课深入构建；本综合项目中的扩展协商——tasks extension 出现在 capabilities 中，且只有双方声明后才使用——展示了这些课程所描述的可移植性机制。

## 考试陷阱终检

- 未知工具始终返回 `-32602`，绝不是 `-32601`；`-32601` 只保留给服务器真正从未听说过的 JSON-RPC method。
- schema 不合法的工具调用是带 isError true 的工具执行错误，绝不是协议错误。
- 2026-07-28 中没有 initialize 握手，也没有 session；每个请求携带自己的 protocol version 和 capabilities。
- MRTR 重试始终使用新的 JSON-RPC id，并精确回显 requestState；复用原 id 是错误做法。
- 在符合 2026-07-28 的服务器中，Resource not found 和自定义应用错误都位于 `-32000` 至 `-32019` 与 `-32020` 至 `-32099` 之外。
- Roots、sampling 和 logging 已 deprecated，但没有删除；它们仍可工作，只是不应作为新设计的起点。
- 为某个 resource server audience 签发的 token 绝不能被另一个服务器接受；禁止向上游 passthrough 调用方 token。
- cacheScope public 表示响应可以跨用户共享，绝不表示可以跳过访问控制。

来源：`certifications/mcpa/tracks/mcpa-f.json` 提供领域 objective，`certifications/mcpa/research/mcp-2026-07-28-brief.md` 提供协议事实，本课 `code/main.py` 交互记录对应以上每条“直接实践”。
