---
id: narrow-auto-remediation
title: 运维 agent 可以独立执行哪些修复
card: production-mlops
kind: tradeoff
level: 3
roles: [ai-evaluation-reliability-engineer, inference-engineer]
rounds: [system-design, design-review]
tags: [ai-sre, auto-remediation, runbooks, human-approval]
minutes: 12
lessons: [phases/17-infrastructure-and-production/23-sre-for-ai]
manuals: []
practice: []
cheatsheet: [sre-for-ai]
related: [production-mlops/two-models-disagree, production-mlops/prediction-without-action]
updated: 2026-11-03
---

某厂商演示了一个能独立修复事故的运维 agent。你的主管问：在模型服务上，你愿意让这样的 agent 在无人参与的情况下执行哪些操作？划定边界，并说明理由。

## Short answer

只允许预先批准的小范围操作：重启一个 Pod、回滚某个指定的部署、在已批准的范围内扩缩容实例池，以及切换已批准的功能开关。凡是改变系统形态的操作，都交给人决定，包括拓扑、资源限制、新代码、访问权限和数据库变更。agent 提建议，需要判断的决策由人批准；只有在 agent 积累了执行记录后，才扩大安全操作集合。

## Full answer

### 两类操作

| 安全，可自动执行 | 不安全，只能由人执行 |
|---|---|
| 重启一个 Pod | 改变服务拓扑 |
| 回滚某个指定的部署 | 修改资源限制 |
| 在预先批准的范围内扩缩容实例池 | 部署新代码 |
| 启用预先批准的功能开关 | 改变访问权限 |
| | 修改数据库 |

### 什么让操作安全

操作可逆，爆炸半径事先有限定，而且对应人工编写的 runbook 中的一个步骤。课程的事故示例是 KV cache 激增，导致推理服务引擎内存耗尽。重启 Pod 能清除问题，而且重启属于安全操作。调高内存限制也可能清除问题，但它会改变此后每个 Pod 的运行方式，所以仍由人决定。

### 操作如何获得自动执行资格

1. 编写结构化 runbook：症状、假设、验证、处置。
2. 为操作设定成功标准，以及执行后的验证步骤。
3. 记录每次建议和每次人工决策。
4. 在一系列事故中，建议都与人的选择一致后，将该操作从建议执行升级为自动执行。

### 保留审批关口

架构由一个监督者协调日志、指标和 runbook agent，形成带证据的假设，交给人批准，然后从小范围操作集合中执行一个动作。即使两个模型独立得出相同根因，安全集合以外的操作仍需审批。课程直言：厂商若声称系统不需要任何监督，就是夸大宣传。

## Follow-ups

- **Level 3:** 为什么在限定范围内扩容是安全的，而修改资源限制不是？ Expected: 范围事先经过批准，操作也能顺利撤销。修改限制会改变每个 Pod 的运行方式，可能引发下一次事故。
- **Level 3:** agent 无人监督执行操作前，必须满足哪些条件？ Expected: 有结构化 runbook、带成功标准的验证步骤、审计记录，以及建议与人工决策一致的历史记录。
- **Level 4:** 负载突增时，agent 因探针失败重启了最繁忙的 Pod。这符合规则吗？ Expected: 操作被允许，但触发条件错了。高负载下重启会丢掉正在处理的请求，因此规则要包含负载和探针类型条件，而不只是动作名称。

## Wrong answers

- "只要 agent 足够准确，就让它做一切。" 对过去事故的判断准确率，无法限制一次错误的大范围操作造成的损害。
- "agent 完美之前，不做任何自动化。" 重启和回滚现在就是安全操作，能省去大多数排查的第一部分。
- "审批步骤会让 agent 在夜间没用。" agent 仍会完成排查。人只需批准一个建议的操作，而不必从看板开始查起。

## Taught in

[AI 的 SRE 课程](../../../phases/17-infrastructure-and-production/23-sre-for-ai/)区分小范围与大范围修复，并保留人工审批关口。
