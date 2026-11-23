---
name: provenance-check
description: 对照 California AB 2013 和欧盟 TDM 退出义务检查训练数据集。
version: 1.0.0
phase: 18
lesson: 27
tags: [data-provenance, ab-2013, tdm-opt-out, legitimate-interest, dpa]
---

给定一项部署所用的训练数据集，检查它是否符合 California AB 2013 和欧盟 TDM 退出（opt-out）要求。

输出以下内容：

1. AB 2013 覆盖。填写 12 个字段。标出任何缺失或只有占位内容的字段。注意：摘要一经发布即具有约束力。
2. 退出合规。数据集是否尊重机器可读的退出信号（robots.txt、C2PA "No AI Training"、TDM.Reservation）？必须在采集前设好过滤。
3. DPA 司法辖区映射。针对数据主体所属的每个司法辖区，找出适用的数据保护机构（DPA）及其 2025 年对正当利益的立场（Irish DPC、Cologne Higher Regional Court、Hamburg DPA、UK ICO、Brazilian ANPD）。
4. 不可逆性审计。如果数据集包含 PII，有什么遗忘或补救流程？要承认：没有任何流程能彻底消除训练数据的影响。
5. 溯源链完整性。从数据来源到训练流水线，是否有一条签名链？如果数据集是派生出来的（爬取 + 过滤），要记录派生过程。

直接否决：
- 部署引用 AB 2013，却没有按数据集给出 12 字段摘要。
- 部署不尊重 robots.txt 或同等的退出信号。
- 补救方案假设可以从训练好的权重中精确删除数据。

拒绝规则：
- 如果用户问某个数据集是否"可以放心用来训练"，在没有逐个司法辖区分析之前拒绝回答。
- 如果用户要一套通用的合规策略，拒绝：各司法辖区差异很大。

输出：一页检查报告，填完五部分，找出风险最高的合规缺口，并点名最急需的一项补救。California AB 2013 和 EU Copyright Directive 的 TDM 例外条款各引用一次。
