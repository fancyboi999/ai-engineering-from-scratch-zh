# 安全 —— 密钥、API Key 轮换、审计日志、Guardrails

> 用集中式 vault（HashiCorp Vault、AWS Secrets Manager、Azure Key Vault）消灭密钥四散。绝不把凭证放在配置文件、VCS 里的 env 文件、电子表格里。用 IAM role 而不是静态 key；CI/CD 用 OIDC。AI 网关模式是 2026 年的解：应用 → 网关 → 模型供应商，网关在运行时从 vault 拉凭证。在 vault 里轮换，所有应用几分钟内拿到 —— 不用重新部署，不用在 Slack 里问"谁有新 key"。轮换策略 ≤90 天；每次提交用 TruffleHog / GitGuardian / Gitleaks 扫。零信任：MFA、SSO、RBAC/ABAC、短时 token、设备态势。PII 擦洗用实体识别在转发前掩码 PHI/PII；一致性 token 化（Mesh 方式）把敏感值映射到稳定占位符，于是 LLM 保住代码/关系语义。网络出口：LLM 服务放在专用 VPC/VNet 子网，只放行 `api.openai.com`、`api.anthropic.com` 等；阻断其他一切出站。2026 年的事件成因：Vercel 供应链攻击经由被攻陷的 CI/CD 凭证，跨数千个客户部署外泄了 env var。

**类型：** Learn
**语言：** Python（标准库，一个玩具级 PII 擦洗器 + 审计日志写入器）
**前置要求：** 阶段 17 · 19（AI 网关）、阶段 17 · 13（可观测性）
**预计时间：** ~60 分钟

## 学习目标

- 列举四个密钥管理反模式（VCS 里的配置文件、硬编码 env、电子表格、静态 key），并说出它们的替代物。
- 解释"AI 网关从 vault 拉"模式作为 2026 年生产标准。
- 实现一个带一致性 token 化（相同值 → 相同占位符）的 PII 擦洗器，让语义存活。
- 说出 2026 年的 Vercel 供应链事件，以及它对 CI/CD 凭证卫生的教训。

## 问题背景

一个实习生提交了带 API key 的 `.env`。他们很快删了。key 已经在 git 历史里了 —— GitGuardian 扫描抓到它，而你的轮换流程是"在 Slack 通知团队、更新 40 个配置文件、重新部署所有服务"。8 小时后，一半服务上线了，一半还在等部署窗口。

另一边，用户 prompt 里有"我的 SSN 是 123-45-6789"。prompt 发给了 OpenAI。你有 BAA，但你的内部策略是转发前掩码 PII。你没做。

再另一边，你的 EKS 集群的 LLM pod 能访问任意互联网主机。有人通过对攻击者控制的域名做 DNS 查询来外泄数据。没有任何东西拦住它。

LLM 服务的安全必须处理这三个向量。vault 支撑的凭证。PII 擦洗。网络出口过滤。审计日志。

## 核心概念

### 集中式 vault + IAM role 拉取

**Vault**：HashiCorp Vault、AWS Secrets Manager、Azure Key Vault、GCP Secret Manager。单一事实来源。

**IAM role**：应用/网关用它的 IAM 身份鉴权，不用静态 key。Vault 在 token 生命周期内返回密钥。

**AI 网关模式**：网关在请求时从 vault 拉 `OPENAI_API_KEY`。在 vault 里轮换；下一个请求拿到新 key。不用重新部署。

### 轮换策略 ≤ 90 天

所有 API key、vault root token、CI/CD 凭证。尽可能自动轮换。手动轮换要记录并跟踪。

### 密钥扫描

- **TruffleHog** —— 对提交做正则 + 熵。
- **GitGuardian** —— 商用，准确率高。
- **Gitleaks** —— OSS，在 CI 里跑。

每次提交都跑。检测到新密钥就拦 PR。

### 零信任态势

- 所有账户要求 MFA。
- 经 SAML/OIDC 的 SSO。
- 细粒度访问用 RBAC（基于角色）或 ABAC（基于属性）。
- 短时 token（小时级，不是天级）。
- 设备态势 —— 只有带磁盘加密的公司设备。

### PII / PHI 擦洗

在 prompt 离开你的基础设施之前：

1. 实体识别（spaCy NER、Presidio、商用）。
2. 掩码匹配到的实体：`"My SSN is 123-45-6789"` → `"My SSN is [SSN_TOKEN_A3F]"`。
3. 一致性 token 化（Mesh 方式）：相同值映射到相同占位符，于是 LLM 保住关系。
4. 对 LLM 响应做可选的反向映射。

静态正则过滤器抓基本模式；NER 抓更多。两个都用。

### 输入 + 输出 guardrails

输入：拦已知越狱、禁忌话题；按用户限流。

输出：正则擦洗泄露的密钥（API key 模式、拒答上下文里的邮箱模式），用分类器查策略违规。

### 网络出口白名单

LLM 服务放在专用子网：
- 白名单：`api.openai.com`、`api.anthropic.com`、向量数据库端点、vault 端点。
- 其他一切：丢弃。
- DNS 走仅白名单的解析器（避免 DNS 隧道外泄）。

### 审计日志

每次 LLM 调用的不可变日志，带：
- 时间戳。
- 用户 / 租户。
- prompt 哈希（为隐私不存原始 prompt）。
- 模型 + 版本。
- token 数。
- 成本。
- 响应哈希。
- 任何 guardrail 触发。

按监管要求保留（SOC 2 一年，HIPAA 六年）。

### 2026 年的 Vercel 事件

供应链攻击：被攻陷的 CI/CD 凭证跨数千个客户部署外泄了 env var。教训：CI/CD 凭证等同于生产凭证。存进 vault。范围收窄。激进轮换。

### 你该记住的数字

- 轮换策略：≤ 90 天。
- 每次提交都扫：TruffleHog / GitGuardian / Gitleaks。
- Vercel 2026：CI/CD 凭证被攻陷 → 数千个客户 env var 泄露。
- 审计日志保留：SOC 2 = 一年，HIPAA = 六年。

```figure
i4-vault-rotation
```

## 实际使用

`code/main.py` 实现一个带一致性 token 化的玩具级 PII 擦洗器和一个仅追加的审计日志。

## 拿去用

这一课产出 `outputs/skill-llm-security-plan.md`。给定监管范围和当前状态，规划 vault 迁移、擦洗器、出口、审计日志。

## 练习

1. 跑 `code/main.py`。发两个引用同一个 SSN 的 prompt。确认两个都拿到相同占位符。
2. 为一个调 OpenAI + Anthropic + Weaviate 的 vLLM-on-EKS 部署设计网络出口策略。
3. 你在 git 历史里发现一个 key（两年前的）。正确的响应是什么 —— 轮换 key、擦洗历史，还是两个都？论证。
4. 你的审计日志每天涨 10 GB。设计保留分层（热 30 天、温 12 个月、冷 6 年）。
5. 论证反向 token 化（把真实值替回 LLM 响应）相比保持占位符可见，是否值得那份复杂度。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Vault | "密钥库" | 集中式凭证管理服务 |
| IAM role | "基于身份的鉴权" | 应用承担的角色；返回短时凭证 |
| CI/CD 用 OIDC | "云签发的 token" | CI 里无静态 key —— 经 OIDC 的身份 |
| TruffleHog / GitGuardian / Gitleaks | "密钥扫描器" | 提交时密钥检测 |
| RBAC / ABAC | "访问控制" | 基于角色 vs 基于属性 |
| PII 擦洗 | "数据掩码" | 移除或 token 化敏感实体 |
| 一致性 token 化 | "稳定占位符" | 相同值每次 → 相同 token |
| Mesh 方式 | "Mesh token 化" | 保语义的 token 化模式 |
| 出口白名单 | "出站允许列表" | 只有被允许的域名可达 |
| 审计日志 | "不可变历史" | 用于合规的仅追加记录 |

## 延伸阅读

- [Doppler — Advanced LLM Security](https://www.doppler.com/blog/advanced-llm-security)
- [Portkey — Manage LLM API keys with secret references](https://portkey.ai/blog/secret-references-ai-api-key-management/)
- [Datadog — LLM Guardrails Best Practices](https://www.datadoghq.com/blog/llm-guardrails-best-practices/)
- [JumpServer — Secrets Management Best Practices 2026](https://www.jumpserver.com/blog/secret-management-best-practices-2026)
- [Microsoft Presidio](https://github.com/microsoft/presidio) —— PII 检测与匿名化。
- [HashiCorp Vault docs](https://developer.hashicorp.com/vault/docs)
