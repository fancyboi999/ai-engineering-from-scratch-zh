# 提取审查报告：客服 Policy 变更

## Extraction Contract（提取合约）

每条记录包含 policy ID、生效日期或 `null`、地区、动作类型、阈值或 `null`、证据片段、来源版本和审查状态。unknown 可被显式表示，额外字段会被拒绝。

## Batch Manifest（Batch 清单）

Job `policy-w32-review` 包含 40 个输入，通过稳定的 `custom_id`、来源版本、schema `policy-change-2` 和预期输出关联。fixture 返回 shuffled 结果，其中有两项 dependency 失败，并保留 38 条成功记录。有日期的规划假设是 Message Batches 成本降低 50%、服务窗口最长 24-hour、no guaranteed latency SLA；deploy 时必须重新核对当前 API 文档。

## Validation Layers（验证层）

syntax 解析 40/40；schema 接受 40 条。semantic validation 拒绝一条早于其来源生效日期的 deadline；provenance validation 拒绝一个证据片段中不存在的编造 threshold。

## Reviewer Findings（Reviewer Finding）

independent reviewer 返回稳定 finding `REV-017` 和 `REV-018`，包含字段、来源片段、原因和处置；它没有静默重写输出。

## Adjudication（裁决）

具备资格的 policy owner 将不受支持的 threshold 设为 `null`，确认 deadline 例外，并记录原因代码。反复歧义会升级处理，而不是进入下一轮重试。

## Metrics（指标）

字段 precision：0.98。adjudication 后的 evidence-support 率：1.00。高风险误报：0。reviewer 分歧：40 条中的 2 条。每条已接受记录成本：0.014 单位。
