# Tool 目录审查：客服证据

## Catalog Boundary（目录边界）

policy 角色可以使用当前 policy 搜索和来源查询，不获得账户 tool 或写能力。每个 tool 都具有感知 tenant 的 execution scope。

## Tool Contracts（Tool 合约）

`search_active_policy`：`use when` 客服 policy 决定答案；`do not use` 于账户事实或公开 research。`read_assigned_account`：`use when` 已认证 case 需要账户事实；`do not use` 于 policy 或其它 tenant。

## Error Matrix（错误矩阵）

validation 只有在输入变更后才可重试。authorization 在访问权限或批准变化前是 non-retryable。依赖超时可重试一次，并保留任何 partial result 与 trace ID。

## Progressive Discovery（渐进式发现）

起始界面仅暴露该角色允许发现的能力名称搜索。专用定义只在范围受限的发现之后加载；受限名称不会泄露。

## Authorization（授权）

发现绝不授予 execution。服务会针对每个调用检查主体、tenant、当前 scope、对象所有权和已绑定的批准。

## Selection Fixtures（选择 Fixture）

12 个 fixture 覆盖 policy 与账户问题、公开 research、无需 tool 的回答、validation、authorization、conflict、timeout 和 partial result。
