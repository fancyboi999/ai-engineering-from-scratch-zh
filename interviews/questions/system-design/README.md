# 系统设计

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

端到端设计一个模型服务：需求、数据、模型、服务、评估与成本。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [标志着 Demo 演变为产品的核心信号](demo-to-product-signals.md) | 概念 | 1 基础 | 6 |
| [AUC 表现优异却无人问津的流失预警模型](metric-layers-churn-auc.md) | 概念 | 1 基础 | 8 |
| [何时应当对引入机器学习模型说不](when-not-ml.md) | 概念 | 1 基础 | 8 |
| [在不拿核心产品冒险的前提下灰度发布新 Prompt](ab-test-prompt-rollout.md) | 设计 | 2 应用 | 12 |
| [针对两小时数据时效限制选择批处理或在线服务](batch-vs-online-serving-choice.md) | 权衡 | 2 应用 | 12 |
| [设计用户流失预警系统而非单纯的流失模型](churn-model-system.md) | 设计 | 2 应用 | 20 |
| [基于 800 条短消息与预训练主体构建分类器](classifier-head-swap-choice.md) | 权衡 | 2 应用 | 12 |
| [为支付风控模型设计漂移监控体系](drift-monitoring-design.md) | 设计 | 2 应用 | 15 |
| [设计保证训练真实可靠的特征存储系统](feature-store-design.md) | 设计 | 2 应用 | 15 |
| [测算对话功能的月度账单开销](llm-cost-projection.md) | 估算 | 2 应用 | 10 |
| [安全地将模型演示 Demo 暴露在公开链接后](public-demo-controls.md) | 设计 | 2 应用 | 15 |
| [确保对话服务在供应商故障时持续响应](streaming-and-fallback.md) | 设计 | 2 应用 | 15 |
| [为万级日活用户设计对话 API 系统](batched-inference-api-budget.md) | 设计 | 3 高级 | 25 |
| [准确率下降但所有输入监控指标全绿](concept-drift-blind-spot.md) | 排障 | 3 高级 | 12 |
| [设计决定模型是否准予上线的评估门禁平台](eval-platform-ship-gate.md) | 设计 | 3 高级 | 20 |
| [单条命令完成从原始数据到调优模型部署](finetune-pipeline-design.md) | 设计 | 3 高级 | 25 |
| [百毫秒内的支付风控反欺诈判定系统](fraud-check-100ms.md) | 设计 | 3 高级 | 20 |
| [为十个代码仓库设计附带引用的检索问答系统](rag-service-company-docs.md) | 设计 | 3 高级 | 25 |
| [离线准确率达标但线上表现大幅滑坡的排查](skew-triage.md) | 排障 | 3 高级 | 15 |
| [评审机器学习设计文档并指出一票否决项](design-doc-blocking-review.md) | 设计 | 4 架构与规模 | 20 |
| [当模型改变自身未来时保留纯净数据](feedback-loop-clean-data.md) | 设计 | 4 架构与规模 | 15 |
| [在训练启动前制定好回滚应对方案](pipeline-rollback-plan.md) | 权衡 | 4 架构与规模 | 20 |

[全部主题](../../README.md)
