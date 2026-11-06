# 生产与 MLOps

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

模型服务的可观测性、渐进式发布、A/B 测试、混沌测试与值班。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [第一次混沌实验前必须具备什么](chaos-before-you-start.md) | 概念 | 1 基础 | 6 |
| [评估分数更高，为什么还要做实验](evals-or-ab-test.md) | 概念 | 1 基础 | 5 |
| [一周影子运行能证明什么](shadow-mode-is-a-smoke-test.md) | 概念 | 1 基础 | 5 |
| [哪些 agent span 是 CLIENT，哪些是 INTERNAL](span-kind-client-or-internal.md) | 概念 | 1 基础 | 5 |
| [1% 的金丝雀能给闸门多少样本](canary-samples-at-one-percent.md) | 估算 | 2 应用 | 8 |
| [付费调用模型前的检查顺序](checks-in-order-of-cost.md) | 设计 | 2 应用 | 10 |
| [评估分数未变时，如何发现用户的问题变了](drift-score-on-prompts.md) | 概念 | 2 应用 | 8 |
| [读懂 prompt 路由器的实验分组代码](hash-bucket-assignment.md) | 代码阅读 | 2 应用 | 8 |
| [trace 比模型还贵时的保留策略](keep-every-error-trace.md) | 设计 | 2 应用 | 10 |
| [完整 prompt 应该放在 span 上吗](prompts-in-span-attributes.md) | 权衡 | 2 应用 | 8 |
| [SDK 升级后 token 看板显示零](renamed-token-attribute.md) | 排障 | 2 应用 | 8 |
| [让下一次回滚只需几秒](rollback-without-redeploy.md) | 设计 | 2 应用 | 10 |
| [均分实验却分成了 47 比 53](split-ratio-mismatch.md) | 排障 | 2 应用 | 8 |
| [答案输出一半后就没了动静](stream-fails-after-200.md) | 排障 | 2 应用 | 8 |
| [事故分诊 agent 何时该承认不确定](two-models-disagree.md) | 概念 | 2 应用 | 8 |
| [设定不会被噪声叫停的金丝雀闸门](canary-gates-above-noise.md) | 设计 | 3 高级 | 12 |
| [选一套不被锁定的可观测技术栈](dev-platform-or-telemetry-tool.md) | 权衡 | 3 高级 | 12 |
| [五分钟内发现泄露数据的 prompt](five-minute-detection.md) | 设计 | 3 高级 | 15 |
| [运维 agent 可以独立执行哪些修复](narrow-auto-remediation.md) | 权衡 | 3 高级 | 12 |
| [在首个表现良好的早晨终止 A/B 实验的隐患](peeking-at-an-ab-test.md) | 权衡 | 3 高级 | 12 |
| [审查新埋点分支中的一条 span](read-this-span.md) | 代码阅读 | 3 高级 | 12 |
| [服务商变慢，你的服务却崩溃了](retries-that-amplify.md) | 排障 | 3 高级 | 12 |
| [用同一条 trace 串起 HTTP 与 stdio 工具服务器](trace-context-over-stdio.md) | 设计 | 3 高级 | 12 |
| [别让生产环境的混沌实验变成事故](budget-burn-pauses-chaos.md) | 设计 | 4 架构与规模 | 18 |
| [系统面对预测出的服务故障该采取什么行动](prediction-without-action.md) | 设计 | 4 架构与规模 | 15 |
| [模拟影子、金丝雀与回滚方案](rollout-plan-take-home.md) | 课后任务 | 4 架构与规模 | 60 |

[全部主题](../../README.md)
