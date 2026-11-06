---
id: five-minute-detection
title: 五分钟内发现泄露数据的 prompt
card: production-mlops
kind: design
level: 3
roles: [ai-evaluation-reliability-engineer, ai-data-engineer, inference-engineer]
rounds: [system-design, design-review]
tags: [observability, evals, alerting, pii, mttd]
minutes: 15
lessons: [phases/19-capstone-projects/11-llm-observability-dashboard, phases/11-llm-engineering/13-production-app]
manuals: []
practice: []
cheatsheet: [genai-observability]
related: [production-mlops/drift-score-on-prompts, production-mlops/keep-every-error-trace, production-mlops/dev-platform-or-telemetry-tool]
updated: 2026-11-03
---

一次带退化的发布上线了。你的一个 prompt 开始泄露伪造的客户标识符，大约每一百个回答出现一次。设计可观测流水线，让第一个坏回答出现后五分钟内告警就能到达一个人手里，并说明每个阶段在这五分钟里占了多少。

## Short answer

给每次模型调用打上符合 GenAI 规范的 span，通过 OTLP 发到 collector。在 collector 上对每条输出做一次低成本的模式检查，按短周期用 judge 给采样的 trace 打分，把分数写回为 eval span，把聚合值导出为指标，泄露分数越过阈值就告警。五分钟是抓取间隔、judge 批处理窗口和告警路由三者之和，所以每个阶段都要短，而且采样器必须保留足够多的流量，才能看到百分之一的事件。五分钟目标只覆盖模式检查标记到的、或采样器保留下来的泄露。

## Full answer

### 各阶段及其在时钟里的份额

| 阶段 | 产出 | 耗时 |
|---|---|---|
| 埋点与 OTLP 导出 | 带输出内容的 span | 几秒 |
| 带尾部采样的 collector | 是否保留该 trace 的决定 | 几秒，加上缓冲等待 |
| 对输出的模式检查 | 对标识符形状的即时标记 | 可以忽略 |
| 对采样 trace 运行 judge | 为模式漏掉的泄露打分 | 批处理窗口 |
| eval span 与指标导出 | 告警读取的聚合值 | 抓取间隔 |
| 告警规则与路由 | 呼叫值班 | 评估间隔加路由时间 |

综合项目的评估任务读取最近十五分钟的采样 trace。要达到五分钟目标，judge 必须每分钟对最新的 trace 运行一次，否则光是批处理窗口就会吃掉全部预算。

### 让罕见事件可见

泄露率为百分之一时，只保留十分之一成功请求的采样器，每一千个回答才看到一次泄露。高流量下没问题，低流量下就看不见了。在 collector 上对每条输出做标识符形状的模式检查，就像生产应用综合项目在输出护栏里做的那样，并保留该检查标记到的所有 trace。judge 只给采样部分里改写过的泄露打分。未采样的 trace 里如果有改写过的泄露，它不会得到分数，也不会触发告警。

### 告警链路

评估分数作为 eval span 写入，并链接到父 trace。指标导出器把它们聚合起来；某个窗口内的泄露分数越过阈值时，告警规则触发；告警管理器把警告发到聊天群，把严重越线发到 pager。

### 证明它有效

综合项目的回归探针注入一个缺陷，让百分之一的回答泄露伪造标识符，然后测量从部署到告警的时间。检测是恢复过程中归看板负责的部分。修复靠回滚，回滚属于发布流程。

## Follow-ups

- **Level 3:** 五分钟里通常哪个阶段占大头？ Expected: judge 的批处理窗口。每十五分钟跑一次的任务达不到五分钟的目标。
- **Level 3:** 采样器每十个成功请求丢掉九个。泄露率为百分之一时，检测会怎样？ Expected: 每一千个回答才看到一次泄露，低流量时检测会更慢。保留低成本模式检查标记到的所有 trace。
- **Level 4:** 怎样证明流水线达到了目标？ Expected: 像综合项目那样故意注入退化，测量从部署到告警的时间。

## Wrong answers

- "每条 trace 都跑 judge。" 流量大时这比模型调用本身还贵。先采样，再用低成本检查过滤。
- "每天一份评估报告就够了。" 泄露一整天标识符，本身就是事故。目标是分钟级。
- "模式检查能抓住一切。" 模式会漏掉改写。judge 抓模式漏掉的，模式让 judge 的成本可以承受。

## Taught in

[可观测看板综合项目](../../../phases/19-capstone-projects/11-llm-observability-dashboard/)搭建了摄取、评估和告警链路，并用注入的退化测量检测时间，[生产应用课程](../../../phases/11-llm-engineering/13-production-app/)给出了基于模式的输出护栏。
