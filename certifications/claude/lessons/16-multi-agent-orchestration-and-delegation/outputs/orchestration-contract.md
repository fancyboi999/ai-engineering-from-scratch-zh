# 编排合约：Runtime 迁移决策

## Goal and Scope（目标与范围）

比较三种迁移方案并交付决策 brief。研究过程只读。任何 agent 都不得编辑仓库、联系 vendor 或选择最终架构。

## Tasks and Dependencies（任务与依赖）

coordinator 将来源、runtime 与风险研究分配给互不重叠的 claim ID。所有任务的 allowed tools 均为只读。synthesis 必须等到每项必需结果达到 complete 或明确的 partial；独立审查则必须等待经过验证的 synthesis。

## Result States（结果状态）

complete 表示满足每个主张字段；partial 会保留有效主张并列出缺失来源；blocked 则说明继续推进所需的策略、权限或外部状态。

## Budgets（预算）

每名 researcher 的 budget 上限是五个来源、六次 tool 调用和 12 分钟。coordinator 只能针对一个具名缺口重新委派一次。

## Merge Rules（合并规则）

主张按 claim ID 与 provenance 合并。重复来源会折叠；conflict 必须保留双方的来源版本与升级处理 owner。

## Independent Review（独立审查）

reviewer 在 isolated 上下文中接收 brief、主张、证据与 rubric。它返回稳定的 finding ID，不能编辑候选 brief。
