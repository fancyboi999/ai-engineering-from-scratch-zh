---
id: acceptance-fell-after-upgrade
title: 平均延迟变好了，长尾却变差了
card: tokenization-decoding
kind: debug
level: 4
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, system-design]
tags: [speculative-decoding, acceptance-rate, draft-drift, tail-latency, monitoring]
minutes: 12
lessons: [phases/19-capstone-projects/14-speculative-decoding-server, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding, phases/10-llms-from-scratch/15-speculative-decoding-eagle3]
manuals: []
practice: []
cheatsheet: [speculative-decoding]
related: [tokenization-decoding/choose-the-draft-for-a-new-model, tokenization-decoding/speedup-from-alpha]
updated: 2026-11-03
---

同一周上线了两项变更：目标模型升级到下一个版本；一个以代码流量为主的新客户被路由到同一集群。推测解码已经开了几个月。此后，平均 token 间延迟下降 25%，P99 上升 15%，常规并发下的吞吐量也下降了。请诊断原因。

## Short answer

两项变更都在拉低接受率。草稿头（draft head）针对上一版目标模型训练，目标换代后分布漂移，被拒的草稿变多；代码流量又让输入分布偏离了草稿头训练用的通用对话数据，在这类流量上接受率会落到 0.4 到 0.6。一次被拒的草稿要付出一次验证和一次重抽（re-roll），满批时这两次前向会串行排队，结果正是均值还在变好、长尾却在变差。从引擎的推测解码指标里按流量切片和目标版本读出接受率，重训草稿头，或回滚到与新目标对齐的草稿头，并按请求类别开关推测解码。

## Full answer

### 为什么平均延迟与长尾延迟反向变动

大多数请求仍然接受了大部分草稿，它们的 token 间延迟下降，均值随之改善。草稿早早被拒的请求要付出草稿步骤、一次验证，再加一次目标模型前向来生成修正 token；满批时这些前向彼此排队。长尾就是这些被拒请求。要看 P99，不要看 P50。

### 原因一：草稿头落后一个版本

基于隐藏状态的草稿头（hidden-state draft）被训练成用某个特定目标模型的特征去预测这个目标的下一个 token。目标换了新版本，特征和分布都变了，草稿与它的一致率随之下降。综合项目的第一个练习就是测量这种退化，并为它建告警。

### 原因二：草稿头从未见过的领域

在通用对话上训练的草稿头，在对话流量上的接受率是 0.6 到 0.8，在代码、医疗或法律流量上只有 0.4 到 0.6。用代码训练过的草稿能很好地预测代码 token，没训练过的就预测得很差。高并发下接受率低于约 0.55 时，推测解码是净亏的，所以新客户可能已经把集群拉到了这条底线以下。

### 诊断步骤

1. 从引擎按请求拉取被接受的草稿 token 数和提议的草稿 token 数，前者除以后者，再按目标版本、按客户或请求类别切分。全集群只看一个数，两个原因都会被掩盖。
2. 对比升级前后的对话切片：如果下降了，版本漂移就是真实存在的。
3. 在同一版本下对比代码切片和对话切片：如果代码切片低得多，领域偏移就是真实存在的。
4. 按接受率给 P99 分桶，确认长尾的解释；慢的长尾应该正好落在低接受率切片上。

### 修复方案

- 对着新目标版本重训草稿头，或者先把目标回滚，等对齐的草稿头就绪。
- 把代码客户路由到普通解码池，或者训练一个代码专用的草稿头；这个训练任务比微调目标模型轻得多。
- 按请求类别、依据实测接受率开关推测解码；低于底线时回退到 n-gram 或不用草稿的方案。
- 按切片对接受率告警，让下一次版本升级无法撇下草稿单独上线。

## Follow-ups

- **Level 3:** 为什么均值变好了，吞吐量却在下降？ Expected: 被接受的请求变快了，但每个被拒的请求要消耗两次目标模型前向；满批时，这部分额外工作挤占了其他请求。
- **Level 4:** 用两句话设计这条告警。 Expected: 在短时间窗口内按切片、按目标版本计算接受率，与上线时记录的基线比较；某个切片跌破底线，或比基线下降固定比例时，就通知值班人员。
- **Level 4:** 只有一个切片的接受率下降时，回退方案是什么？ Expected: 重训草稿头期间，把这个切片切到 n-gram 草稿或普通解码，在仍然划算的地方保留推测解码。
- **Level 4:** 这会怎样改变你的发布流程？ Expected: 目标模型升级要和对着它训练好的草稿一起发布，发布门禁的基准测试要按切片报告接受率和 P99。

## Wrong answers

- "加大草稿长度，把吞吐量赢回来。" 接受率低时，多出来的草稿大多被拒，成本却照付；长尾会更差。
- "全部关掉推测解码。" 对话切片可能仍然划算；应该按切片开关，并修好草稿头。
- "只是新目标模型更慢，和推测解码无关。" 对新目标跑一次普通解码基准，几分钟就能确认；而且均值变好、长尾变差，指向的正是草稿被拒。

## Taught in

[推测解码服务端综合项目](../../../phases/19-capstone-projects/14-speculative-decoding-server/)布置了漂移测量和回退的练习，[生产环境 EAGLE-3 课程](../../../phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/)解释了长尾与接受率底线，而 [EAGLE-3 课程](../../../phases/10-llms-from-scratch/15-speculative-decoding-eagle3/)解释了草稿为什么绑定在一个目标版本上。
