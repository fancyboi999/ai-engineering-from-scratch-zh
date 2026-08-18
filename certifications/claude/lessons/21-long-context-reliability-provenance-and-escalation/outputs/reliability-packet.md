# 可靠性数据包：仓库安全审查

## Scope and Coverage（范围与覆盖率）

manifest 要求 24 个文件。第一轮审查了 18 of 24；六个 omitted 文件仍在 `services/payments/**` 下具名列出。保留两项有效 finding。

## Provenance Envelope（Provenance 信封）

证据 `policy-auth-017` 携带仓库 URI、source version `3a91c7e`、生效日期、权威性、Markdown content type、heading 和行 location、extractor 版本及观察时间。

## Partial Result（部分结果）

状态为 partial，而非 complete。一项可重试 dependency timeout 指明六个未审文件、trace `8801`、两项 finding ID 和完整 artifact 引用。

## Conflict（冲突）

两份已批准 policy 对 token rotation 存在分歧。两种版本和精确片段保持可见；不编造优先级 Rule。

## Escalation（升级）

安全架构团队是 owner。safe next action 是停止 rollout、解决优先级，再只审查具名覆盖缺口。

## Human Review（人工审查）

审查每项严重 finding、partial 结果和 policy 冲突，外加普通通过项的 random sample。记录处置和纠正原因。
