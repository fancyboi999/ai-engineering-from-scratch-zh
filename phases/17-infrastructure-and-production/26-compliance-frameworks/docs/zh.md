# 合规 —— SOC 2、HIPAA、GDPR、PCI-DSS、EU AI Act、ISO 42001

> 多框架覆盖是 2026 年企业级交易的入场券。**EU AI Act**：自 2024 年 8 月 1 日起生效。大部分高风险要求在 2026 年 8 月 2 日强制执行。违反高风险系统义务（第 99(4) 条）罚款最高 1500 万欧元或全球年营业额 3%；违禁 AI 实践（第 99(3) 条）最高 3500 万欧元或 7%。只要服务欧盟用户就全球适用。**Colorado AI Act**：2026 年 6 月 30 日生效（因 SB25B-004 从 2026 年 2 月推迟）—— 高风险系统的影响评估、对 AI 决策的申诉权。Virginia 在信贷/就业/住房/教育上类似。**SOC 2 Type II**：事实上的 B2B AI 要求（金融科技要 Type II，不是 Type I）。**GDPR**：有记录的最大 AI 专属罚款是对 Clearview AI 的 3050 万欧元（荷兰 DPA，2024 年 9 月）；意大利 Garante 在 2024 年 12 月对 OpenAI 开出 1500 万欧元（后于 2026 年 3 月上诉被推翻）。推理时的实时 PII 脱敏是站得住脚的标准；后处理清理不够。**HIPAA**：医疗约束 —— 没有 BAA 不能把 PHI 发给外部 AI 服务。**PCI-DSS**：AI 交互层覆盖需要配置 + 合同协议，不是自动的。**ISO 42001**：新兴的 AI 治理标准，与 ISO 27001 并列、采购要求日增。参考画像：OpenAI 维持 SOC 2 Type 2、ISO/IEC 27001:2022、ISO/IEC 27701:2019、GDPR/CCPA/HIPAA（BAA）/FERPA，以及 ChatGPT 支付组件的 PCI-DSS。跨框架映射减少审计疲劳：访问控制横跨 ISO 27001 A.5.15-5.18、GDPR 第 32 条、HIPAA §164.312(a)。

**类型：** Learn
**语言：** （Python 可选 —— 合规是策略 + 流程，不是代码）
**前置要求：** 阶段 17 · 25（安全）、阶段 17 · 13（可观测性）
**预计时间：** ~60 分钟

## 学习目标

- 列举与 LLM 产品相关的七个 2026 框架，并把每个对应到一个客户群。
- 引用 EU AI Act 执行时间线（2024 年 8 月生效；高风险 2026 年 8 月执行）和两档罚款上限（高风险义务 €15M / 3%，违禁实践 €35M / 7%）。
- 解释为什么后处理 PII 清理对 GDPR 不够，并说出实时推理层脱敏作为站得住脚的标准。
- 描述跨框架控制映射（比如访问控制对应 ISO 27001 A.5.15-5.18 + GDPR 第 32 条 + HIPAA §164.312(a)）。

## 问题背景

一个企业客户的采购要 SOC 2 Type II、GDPR、HIPAA BAA、ISO 27001，以及"EU AI Act 合规声明"。你的团队有 SOC 2 Type I。你离 Type II 还有六个月，GDPR 第 30 条记录都还没开始。

多框架覆盖不是个 LLM 问题 —— 它是个企业 SaaS 问题，带 LLM 专属的叠加层。2026 年的采购团队想要一张每框架一行、每控制一列的矩阵，不是一份 PDF。

## 核心概念

### 七个框架

| 框架 | 范围 | LLM 专属要求 |
|-----------|-------|--------------------------|
| SOC 2 Type II | B2B SaaS 基线 | 流程控制在 6-12 个月里被审计 |
| HIPAA | 美国医疗 | 需要 BAA；没签协议 PHI 不能离开基础设施 |
| GDPR | 欧盟用户 | 实时 PII 脱敏；数据主体权利；第 30 条记录 |
| PCI-DSS | 支付数据 | 触及支付的 AI 需要配置 + 合同 |
| EU AI Act | 服务欧盟用户 | 风险分级；高风险系统：合格评定、文档、日志 |
| Colorado AI Act | 服务科罗拉多居民 | 影响评估；申诉权 |
| ISO 42001 | AI 治理 | 新兴；与 ISO 27001 配对 |

### EU AI Act 时间线

- 2024 年 8 月 1 日：生效。
- 2025 年 2 月 2 日：违禁 AI 实践执行。
- 2026 年 8 月 2 日：高风险系统执行（合格评定、文档、日志）。
- 2027 年 8 月：受统一立法约束的产品里的高风险系统。

风险分级：不可接受（禁止）、高风险（合格评定 + 日志）、有限风险（透明度）、最小风险（无约束）。大多数 B2B LLM SaaS 是有限风险；高风险在就业、信贷、教育、执法、移民、基础服务上启动。

罚款（第 99 条）：违反高风险系统义务最高 1500 万欧元或全球年营业额 3%（第 99(4) 条）；违禁 AI 实践最高 3500 万欧元或 7%（第 99(3) 条）；取较高者适用。

### GDPR —— 实时脱敏是标准

后处理清理（在 LLM 看过数据后再脱敏 PII）不是站得住脚的姿态 —— 模型已经看过那数据了。实时推理层脱敏是 2026 年的标准：

- LLM 调用前的实体识别。
- 一致性 token 化（Mesh 方式）保住语义。
- 只存脱敏后的 prompt + 经同意 opt-in 的原始数据。

近期执行：对 Clearview AI 的 3050 万欧元（荷兰 DPA，2024 年 9 月）是迄今有记录的最大 AI 专属 GDPR 罚款；对 OpenAI 的 1500 万欧元（意大利 Garante，2024 年 12 月）是最大的 LLM 专属罚款，尽管它在 2026 年 3 月上诉被推翻，且裁决仍在进一步复审中。后处理的说法在审计中没站住。

### HIPAA —— BAA 不是可选项

没有签署的业务伙伴协议（Business Associate Agreement），你不能把 PHI 发给外部 AI 服务。三家超大规模厂商的 LLM 平台（Bedrock、Azure OpenAI、Vertex）都提供 BAA。OpenAI 直连 API 提供 BAA。Anthropic 直连 API 提供 BAA。发 PHI 前先确认。

### SOC 2 Type II

Type I：控制已设计并记录。
Type II：控制在 6-12 个月里有效运作。

2026 年的 B2B 采购默认 Type II。Type I 是入门；Type II 是闸门。

常见审计驱动：访问日志（谁看了什么）、变更管理（怎么部署的）、风险评估（每季度）、事件响应（测过吗？）。阶段 17 · 25 的审计日志可直接复用。

### 跨框架映射

一条访问控制策略满足多个框架控制：

| 控制 | 框架 |
|---------|-----------|
| 访问日志 | ISO 27001 A.5.15-5.18、GDPR 第 32 条、HIPAA §164.312(a) |
| 变更管理 | ISO 27001 A.8.32、PCI DSS Req. 6、HIPAA 泄露通知范围 |
| 传输中加密 | ISO 27001 A.8.24、GDPR 第 32 条、HIPAA §164.312(e) |
| 密钥管理 | ISO 27001 A.8.19、PCI DSS Req. 8、SOC 2 CC6.1 |

合规工具（Drata、Vanta、Secureframe）把这套映射自动化。规模上值这个钱。

### ISO 42001 —— 新兴

2023 年底发布。与 ISO 27001 并列、采购要求日增。AI 治理框架，含风险管理、数据质量、透明度、人工监督。

### OpenAI 的参考画像

OpenAI 维持 SOC 2 Type 2、ISO/IEC 27001:2022、ISO/IEC 27701:2019、GDPR/CCPA/HIPAA（BAA）/FERPA，以及 ChatGPT 支付组件的 PCI-DSS。这大致就是 2026 年的企业入场券。

### 你该记住的数字

- EU AI Act 罚款：最高 €15M / 3%（高风险义务，第 99(4) 条）；最高 €35M / 7%（违禁实践，第 99(3) 条）。
- EU AI Act 高风险执行：2026 年 8 月 2 日。
- 有记录的最大 AI 专属 GDPR 罚款：3050 万欧元，Clearview AI（荷兰 DPA，2024 年 9 月）。
- 最大的 LLM 专属 GDPR 罚款：1500 万欧元，OpenAI（意大利 Garante，2024 年 12 月；2026 年 3 月上诉被推翻）。
- SOC 2 Type II 窗口：6-12 个月的控制运作。
- Colorado AI Act 生效日期：2026 年 6 月 30 日（因 SB25B-004 从 2026 年 2 月推迟）。

```figure
i4-control-matrix
```

## 实际使用

`code/main.py` 是个 Python 写的合规映射表 —— 给定一个控制，列出它满足的框架。

## 拿去用

这一课产出 `outputs/skill-compliance-matrix.md`。给定客户群和地理位置，指明所需框架和控制。

## 练习

1. 你的第一个企业客户要求 SOC 2 Type II、HIPAA BAA、EU AI Act 声明。赢下这单的最小可行合规姿态是什么？
2. 把三个假设的 LLM 产品按 EU AI Act 风险分级归类。高风险时有什么变化？
3. 你不小心把 PHI 发给了一个没有 BAA 的供应商。走一遍事件响应。
4. 论证 ISO 42001 对一个中端市场 AI 厂商在 2026 年是否"必要"。
5. 把你的 LLM 审计日志字段（阶段 17 · 25）映射到至少三个框架控制。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| SOC 2 Type II | "被审计的控制" | 控制运作 6-12 个月，由独立方背书 |
| HIPAA BAA | "医疗合同" | 业务伙伴协议；PHI 必需 |
| GDPR | "欧盟隐私" | 实时 PII 脱敏是站得住脚的 2026 标准 |
| EU AI Act | "欧盟 AI 规则" | 高风险 2026 年 8 月执行；€15M / 3%（高风险义务）—— €35M / 7%（违禁实践） |
| Colorado AI Act | "美国州 AI 法" | 2026 年 6 月 30 日生效（因 SB25B-004 推迟）；影响评估 |
| ISO 42001 | "AI 治理" | 新兴的 AI 风险 + 透明度框架 |
| ISO 27001 | "安全 ISMS" | 信息安全管理体系基线 |
| 合格评定 | "EU AI 文档包" | 高风险要求：文档、测试、日志 |
| 跨框架映射 | "一个控制，多个框架" | 单条策略满足多个框架控制 |

## 延伸阅读

- [OpenAI Security and Privacy](https://openai.com/security-and-privacy/) —— 参考合规画像。
- [GuardionAI — LLM Compliance 2026: ISO 42001, EU AI Act, SOC 2, GDPR](https://guardion.ai/blog/llm-compliance-guide-iso-42001-eu-ai-act-soc2-gdpr-2026)
- [Dsalta — SOC 2 Type 2 Audit Guide 2026: 10 AI Controls](https://www.dsalta.com/resources/ai-compliance/soc-2-type-2-audit-guide-2026-10-ai-powered-controls-every-saas-team-needs)
- [EU AI Act official text](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) —— 一手来源。
- [Colorado AI Act](https://leg.colorado.gov/bills/sb24-205) —— 一手来源。
- [ISO/IEC 42001:2023](https://www.iso.org/standard/81230.html) —— AI 管理体系标准。
