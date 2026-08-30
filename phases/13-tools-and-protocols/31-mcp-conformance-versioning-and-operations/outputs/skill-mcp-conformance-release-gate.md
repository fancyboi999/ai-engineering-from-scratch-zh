---
name: mcp-conformance-release-gate
description: 构建 MCP 一致性矩阵，并基于证据作出 promote、hold 或 rollback 决策。
version: 1.0.0
phase: 13
lesson: 31
tags: [mcp, conformance, versioning, transcripts, proxy, operations]
---

面对 MCP client、server、gateway、SDK 或 transport 变更，生成传输层级的一致性 suite 和带脱敏证据的发布决策。

## 必需输入

- 受支持的现代和遗留协议版本，以及每个 deployment target 的 policy。
- SDK 解码前的原始请求和响应 capture points。
- 镜像 HTTP headers、JSON-RPC bodies、statuses、content types 和 intermediary topology。
- 已宣告的 client、server 和 extension capabilities。
- SDK 名称、版本、归一化值和 exceptions。
- Health thresholds、canary window、最小 sample count 和 baseline measurements。
- 精确的 rollback version、admission evidence digest、SHA-256 artifact 和 descriptor pins、Registry status、当前 health、可信 release signers，以及覆盖完整 rollback payload 的 attestation。
- Redaction、retention 和 evidence access policy。

## 过程

1. 定义明确的协议时代。在现代分支中要求精确的 `io.modelcontextprotocol/protocolVersion` 和 `io.modelcontextprotocol/clientCapabilities` keys。将截至 `2025-11-25` 的初始化时代行为放入独立 legacy adapter。
2. 为每个 target 选择 strict 或 bounded fallback policy。成功的 `server/discover` 或已识别的现代 error 证明现代分支。timeout 或空响应不能证明任何事。只允许对配置或 allowlist 中的 endpoint 进行 legacy probe；随后只有验证 pinned legacy revision 的正向 `initialize` 结果后，才选择 legacy。绝不要在 `-32020`、`-32021` 或 `-32022` 后降级。
3. 为已接受的请求、有效的 method-specific results、已宣告的 extension results、选定的 legacy behavior 和 notification 无响应不变量创建 golden transcripts。
4. 为格式错误的 envelopes、response version 或 ID 不匹配、result 与 error 互斥性、格式错误的 errors、错误的 HTTP mapping、缺失元数据、header 与 body 不匹配、缺少 server error response、不支持的版本、缺少现代 `resultType`、格式错误的 method payloads、未知或未宣告的 result types，以及被禁止的 notification responses 创建负向 transcripts。每当本地 validation 观察到 `HeaderMismatch`，都自动要求并结构化验证实际 HTTP 400 JSON-RPC `-32020` response。仅有本地 exception 绝不能使该 case 通过。
5. 先验证 JSON-RPC metadata types。以不区分大小写的方式匹配 HTTP header names，拒绝冲突的重复项，为不安全的 `Mcp-Name` values 解码精确的 Base64 sentinel，然后在检查匹配值是否受支持前，将 `MCP-Protocol-Version`、`Mcp-Method` 和适用的 `Mcp-Name` values 与 body 比较。即使原始值与 body 相等，也将前导或尾随 whitespace 视为不安全并拒绝。
6. 接受已知的现代 `complete` 和 `input_required` results。仅在宣告了对应 capability 后接受 extension discriminator。拒绝每个未知或未宣告的 `resultType`。之后验证 method payload，包括 `tools/list` 的完整 tool descriptors、task result 所需的 lifecycle fields，以及 `completion/complete` 的有边界字符串值 completion object。
7. 在 evidence 中保留原始可加 result 和 `_meta` fields。明确决定每个 component 能否忽略它们，还是必须转发。
8. 让每条高风险 transcript 经过每个已发布 SDK。对比原始传输语义与归一化返回值，并报告每个被合成、提取、剥离或变更的字段。
9. 直接执行 suite，并让其经过每个生产 intermediary。捕获脱敏的 ingress、origin 和 egress evidence。检测 status collapse、JSON-RPC body rewriting、routing header mismatch、buffering 和 content negotiation changes。
10. 在 serialization、hashing、logging 或 upload 前应用 redaction。对 field 和 header names 做大小写折叠并移除分隔符，使 camelCase、连字符、下划线和点号变体共享 denylist；然后移除 `Authorization`、`Set-Cookie`、`X-Api-Key`、`accessToken`、`clientSecret` 和 `registrationAccessToken` 等 credentials，以及 method-specific sensitive arguments。对脱敏后的 evidence bundle 做 hash。
11. 针对非空、确定性的 transcript、SDK differential 和 proxy evidence，加上已预先声明且具有正最小 sample count 的 health window，评估 candidate。要求每个 source 都有有效 evidence digests。遗漏的 boundary 是失败的 gate，不是能通过的空列表。
12. 在 promotion 前验证一个精确的、已准入、已 pinned、active、健康的 rollback target。验证精确 field types 和 SHA-256 digests，然后针对可信 release-controller identity 以密码学方式验证其 attestation。只有 conformance、SDK、proxy、health 和 rollback-readiness evidence 都通过时才 promote。candidate 失败时，仅回滚到这个已验证 target。否则 hold。

## 必需矩阵

对每个 case，报告：

- 稳定的 case name 和规范性不变量
- 协议时代和选择证据
- client、server、SDK、proxy 和 build versions
- 预期 status、response shape、result type 或 error code
- 观察到的 ingress、origin 和 egress evidence digests
- SDK normalization differences
- 每个边界的 pass 或 fail
- redaction policy version
- 最终 reason code

至少包含这些 cases：

- golden 现代 discovery 或 method call
- 带可加字段的 golden 已知 complete result
- 在选定 legacy era 中缺少 `resultType` 的 golden legacy result
- golden 已宣告 extension result
- golden 有效 `completion/complete` result
- 不产生 JSON-RPC response 的 golden notification
- 负向 header 与 body mismatch
- 负向缺少 capabilities
- 负向不支持的匹配版本
- 负向缺少现代 `resultType`
- 负向未知或未宣告的 `resultType`
- 负向 proxy status 或 body transformation
- 负向 SDK semantic field loss
- 负向格式错误的 `completion/complete` result

## 硬性拒绝

- 没有原始线上证据，却根据 SDK 返回值宣称一致性。
- 一个 parser 静默接受现代和 legacy 两种形态。
- 已识别的现代 error 后进行 legacy fallback。
- 仅根据 timeout、沉默、连接关闭或未识别 response 进行 legacy fallback。
- 未捕获和验证 server error response 就让负向请求 case 通过。
- 在本地检测到 `HeaderMismatch` 后，将 HTTP 400 JSON-RPC `-32020` evidence 设为可选。
- 在选择 legacy era 前，为缺失的 `resultType` 推断 complete。
- 将未知 discriminator 当作 complete。
- 没有 reserved-field reason 就拒绝所有可加未知字段。
- 向 notification 发送任意 JSON-RPC response。
- 未验证 method-specific payload 就接受已知 `resultType`。
- 未检查与 body 相等性就授权镜像 headers。
- 将 HTTP field names 视为区分大小写，或不进行精确 sentinel 解码就比较编码的 `Mcp-Name`。
- 接受有前导或尾随 whitespace 的原始 `Mcp-Name`，而不是要求 sentinel encoding。
- 接受没有有效且有边界的 string-values completion object 的 completion result。
- 将 proxy 生成的 500 视为等同于 origin protocol error。
- 将 bearer tokens、cookies、secrets 或敏感 arguments 写入 evidence。
- 使用让 camelCase 或分隔符变体绕过 canonical credential denylist 的 redaction normalization。
- 宣称零 sample 的 canary 健康。
- 将空的 transcript、SDK 或 proxy evidence 视为已通过的 boundary。
- 将真值字符串或未经认证的 rollback dictionary 视为已验证 evidence。
- 回滚到没有精确 admission、pin、status 和 health evidence 的 version。
- 在证明健康 rollback target 前提升生产 candidate。

## 产出

返回以下章节：

1. Era Policy：现代证明、严格 targets、有边界的 fallback triggers，以及被禁止的 downgrade signals。
2. Transcript Matrix：带预期线上结果的 golden 和负向 cases。
3. Result Compatibility：核心 discriminators、已宣告 extensions、可加字段 policy 和 legacy inference boundary。
4. SDK Differential：原始和归一化 digests，以及被提取、剥离、合成和变更的 fields。
5. Proxy Evidence：ingress、origin 和 egress results，以及精确失败 hop。
6. Redaction Report：policy version、已移除 field classes 和脱敏 evidence digest。
7. Health Window：samples、error rate、latency、saturation、duration、thresholds 和 baseline comparison。
8. Rollback Proof：精确 target、admission digest、pins、Registry status、health、signer identity、经验证 attestation 和 route restoration plan。
9. Decision：`promote`、`hold` 或 `rollback`，带稳定的 reason codes 和完整 evidence digest。

以第一个失败 boundary 收尾。如果所有 boundaries 都通过，说明授权完整 promotion 的 canary completion condition。
