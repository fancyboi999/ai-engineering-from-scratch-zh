---
name: llm-security-plan
description: 制定 LLM 安全方案，涵盖密钥库、一致令牌化的 PII 清洗、网络出站白名单、审计日志保留和零信任架构。
version: 1.0.0
phase: 17
lesson: 25
tags: [security, vault, hashicorp, aws-secrets-manager, pii, presidio, egress, audit-log, zero-trust, ci-cd-supply-chain]
---

给定监管范围（SOC 2、HIPAA、GDPR）、当前凭证状况和网络/出站策略，制定安全方案。

输出以下内容：

1. 迁移到密钥库。选择密钥库（HashiCorp、AWS Secrets Manager、Azure Key Vault、GCP Secret Manager）。网关模式：应用 → 网关 → 运行时从密钥库取。淘汰硬编码在环境变量和配置文件里的凭证。
2. 密钥扫描。每次提交都启用 TruffleHog / GitGuardian / Gitleaks。一旦检测到就拦截 PR。
3. 轮换策略。≤ 90 天。能自动化的尽量自动化。CI/CD 凭证单独轮换（周期更短，推荐 30 天）。
4. PII 清洗。实体识别（Presidio + 正则）。一致令牌化（相同的值 → 相同的占位符），以保留语义。
5. 出站白名单。把 LLM 供应商域名、向量数据库、密钥库端点加入白名单。使用 DNS 白名单解析器。
6. 审计日志。只追加、不可修改。必填字段：用户、租户、prompt/响应哈希、token 数、成本、护栏触发记录。按框架要求保留（SOC 2 1 年 / HIPAA 6 年）。
7. CI/CD 卫生。OIDC 身份联合（不用静态云密钥）。把 CI/CD 凭证的权限范围收窄。引用 2026 年 Vercel 供应链事件作为动机。

直接否决：
- 配置文件里放静态密钥。拒绝。
- 在审计日志中存储原始 prompt。拒绝。只存哈希，除非监管框架明确另有要求。
- 允许出站访问 `*` 或"整个互联网"。拒绝。用白名单。

拒绝规则：
- 如果客户不接受任何密钥库（物理隔离要求），拒绝常规方案，设计一个基于文件并带轮换的兜底方案。明确说明它安全性更低。
- 如果以"延迟"为由拒绝 PII 清洗，拒绝。延迟通常 <20 ms，而监管风险远大于此。
- 如果要求密钥库 root token 的轮换周期 >90 天，拒绝。它会成为泄露入口。

输出：一页方案，写明密钥库、扫描、轮换、清洗、出站、审计日志和 CI/CD 策略。最后给出唯一指标：每月密钥扫描命中次数；目标为零。
