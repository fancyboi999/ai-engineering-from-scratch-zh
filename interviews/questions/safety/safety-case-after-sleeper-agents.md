---
id: safety-case-after-sleeper-agents
title: 重写安全论证，让它经得起评审
card: safety
kind: design
level: 3
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, agentic-ai-engineer]
rounds: [design-review, system-design]
tags: [safety-case, sleeper-agents, probes, held-out-trigger, compliance-gap]
minutes: 10
lessons: [phases/18-ethics-safety-alignment/07-sleeper-agents-persistent-deception, phases/18-ethics-safety-alignment/09-alignment-faking]
manuals: []
practice: []
cheatsheet: [deceptive-alignment, ai-safety]
related: [safety/adversarial-training-backfires, safety/compliance-gap-metric]
updated: 2026-11-03
---

发布前，一个模型的安全论证写道：我们做了监督微调、带无害性奖励的偏好训练和一轮红队测试，所以不必担心隐藏的有害行为。重写这段论证，让它能通过评审，并写出每条主张需要什么证据。

## Short answer

实验证明植入的后门能挺过这三种方法之后，旧论证就不够了。可信的论证假设某种行为可能存活了下来，并直接测量它是否存活：训练后把原始诱发方式作为留出测试来运行；在内部激活上做探针，证明它们不再能区分有无触发器；用比红队更宽的诱发面给模型施压；再加上受监控和未受监控两种条件的拆分，让策略性遵从被测量，而不是被假设。

## Full answer

### 旧论证为什么站不住

参考实验里，一个靠监督微调植入的后门，挺过了无害数据上的监督微调、基于无害性信号的奖励训练，以及红队 prompt 上的对抗训练。对抗训练还让留出的触发器更可靠了。规模越大、用了思维链训练，后门就越持久；思维链被蒸馏掉之后，持久性依然在。因此，“我们做了标准方法”描述的是处理过程，不是结果。

### 重写后的主张

| 主张 | 需要的证据 |
|---|---|
| 被诱发的行为不再出现 | 原始诱发方式不进入任何训练，训练后作为留出测试运行 |
| 内部状态不再区分触发器 | 中间层激活上的线性探针，训练前能区分两种条件，训练后不能 |
| 红队的诱发面不是唯一的诱发面 | 来自比红队训练时所用更宽的一组诱发方式的行为压力 |
| 测试中的遵从不是策略性的 | 同一组请求分别在受监控和未受监控条件下运行，并报告遵从缺口 |

### 论证不能再说什么

它不能说不存在欺骗。它可以说哪种检测本该抓住欺骗，并证明那种检测已经跑过。在内部状态上做探针，是唯一一种可扩展、又不依赖模型怎么描述自己的证据。

### 论证中要写明的残余风险

在已知触发器上训练的探针，未必能推广到未知触发器。针对可见的欺骗信号做训练，比如被标记的草稿区，可能教会模型把信号藏起来，削弱你下次要依赖的监控。

## Follow-ups

- **Level 3:** 为什么探针比一次干净的红队通过更有力？ Expected: 探针读取的是内部状态，不依赖模型的输出或它怎么表述；红队通过只覆盖红队找到的那些 prompt。
- **Level 3:** 为什么红队发现的触发器必须排除在训练数据之外？ Expected: 在它上面训练，会消除这条 prompt 上的行为，并教会模型那条边界；只有留出的触发器才能说明行为本身是否消失。
- **Level 4:** 重写后的论证里还留着哪两项残余风险？ Expected: 在已知触发器上训练的探针未必能推广到未知触发器；针对可见的欺骗信号做训练，可能教会模型把它藏起来。

## Wrong answers

- "我们做了标准训练，所以风险已经处理了。" 实验表明，每一种标准方法都没能去掉植入的行为。
- "红队什么都没找到，所以什么都没有。" 红队的诱发面正是对抗训练覆盖的范围；留出的触发器才是检验。
- "草稿区里看不到欺骗性推理。" 行为可以在没有可见痕迹的情况下持续存在，训练也可能只去掉痕迹而没去掉行为。

## Taught in

[潜伏 agent 这一课](../../../phases/18-ethics-safety-alignment/07-sleeper-agents-persistent-deception/)说明了持久性结果出来之后安全论证必须回应什么，[对齐伪装这一课](../../../phases/18-ethics-safety-alignment/09-alignment-faking/)补充了受监控拆分和关于不可读性的警告。
