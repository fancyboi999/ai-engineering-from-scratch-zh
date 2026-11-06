# 安全

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

奖励作弊、prompt 注入、越狱、拒答与安全关卡。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [奖励一直在涨，担心什么](goodhart-over-optimization-curve.md) | 概念 | 1 基础 | 6 |
| [先给攻击命名，再谈防御](six-jailbreak-categories.md) | 概念 | 1 基础 | 6 |
| [有害请求全拒了，化学作业也拒了](two-refusal-metrics.md) | 概念 | 1 基础 | 6 |
| [附和该罚多重](agreement-penalty-tradeoff.md) | 权衡 | 2 应用 | 8 |
| [四条评审发现，同一个机制](four-costumes-one-mechanism.md) | 概念 | 2 应用 | 8 |
| [同一句攻击，换成 base64、rot13 和零宽字符](normalize-then-match.md) | 设计 | 2 应用 | 8 |
| [prompt 注入防御只有一条正则](one-regex-is-not-a-detector.md) | 排障 | 2 应用 | 8 |
| [输入通过了，输出却泄露了](output-router-severity.md) | 设计 | 2 应用 | 9 |
| [用读准则的模型替换人工标注员](rlaif-is-not-cheaper-rlhf.md) | 权衡 | 2 应用 | 8 |
| [分类器看不见的约束](rule-needs-three-parts.md) | 设计 | 2 应用 | 9 |
| [模型说 0.9，十次只对六次](stated-confidence-ece.md) | 估算 | 2 应用 | 7 |
| [重新标注治不好阿谀奉承](sycophancy-is-the-loss.md) | 概念 | 2 应用 | 8 |
| [红队的 prompt 现在全都通过了](adversarial-training-backfires.md) | 概念 | 3 高级 | 9 |
| [被监控时拒答，没被监控时呢](compliance-gap-metric.md) | 概念 | 3 高级 | 9 |
| [让三个请求走一遍门控聚合器](gate-aggregation-table.md) | 代码阅读 | 3 高级 | 12 |
| [KL 惩罚限住的是漂移，不是作弊](kl-does-not-save-you.md) | 概念 | 3 高级 | 9 |
| [重写安全论证，让它经得起评审](safety-case-after-sleeper-agents.md) | 设计 | 3 高级 | 10 |
| [一张表写着 97% 拒答率](safety-eval-missing-pieces.md) | 排障 | 3 高级 | 10 |
| [检测器判为良性，输出流却被截断了](stream-filter-catches-late.md) | 排障 | 3 高级 | 9 |
| [给检索问答助手搭一套安全门控](rag-injection-gate-take-home.md) | 课后任务 | 4 架构与规模 | 60 |
| [不需要你值守也能运转的红队靶场](red-team-range-design.md) | 设计 | 4 架构与规模 | 15 |
| [惩罚那些盘算着伪装的推理](training-against-the-trace.md) | 权衡 | 4 架构与规模 | 10 |

[全部主题](../../README.md)
