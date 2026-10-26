---
id: security-compliance
title: 密钥、审计日志与合规
code: AU
subtitle: 密钥库托管密钥、个人信息脱敏、审计日志、签名 webhook、框架控制措施与 AI 法规日期。
hue: 140
sources: phases/17-infrastructure-and-production/25-security-secrets-audit, phases/17-infrastructure-and-production/26-compliance-frameworks, phases/18-ethics-safety-alignment/24-regulatory-frameworks-eu-us-uk-korea, projects/signed-webhook-inbox
source_hash: 62e84f40b4a481fc
---

## 运行实验
type: task-table
from: phases/17-infrastructure-and-production/25-security-secrets-audit/docs/zh.md, phases/17-infrastructure-and-production/26-compliance-frameworks/docs/zh.md, phases/18-ethics-safety-alignment/24-regulatory-frameworks-eu-us-uk-korea/code/main.py, projects/signed-webhook-inbox/README.md

| 任务 | 代码 |
|---|---|
| 个人信息脱敏与审计日志，第 25 课 | `code/main.py` |
| 控制措施与配置映射，第 26 课 | `code/main.py` |
| AI 法规时间线，第 18 阶段 | `python3 code/main.py` |
| Webhook 演示：202、200、401 | `go run . --mode demo` |
| 构建 webhook 收件箱 | `go build -o /tmp/webhook-inbox .` |

## 网关从密钥库获取密钥
type: architecture
from: phases/17-infrastructure-and-production/25-security-secrets-audit/docs/zh.md

```arch
node | app | 1,1 | 应用 | 无提供方密钥 | client
node | gw | 2,1 | AI 网关 | IAM 角色、护栏 | process
node | vault | 2,2 | 密钥库 | OPENAI_API_KEY | store
node | egress | 3,1 | 出口白名单 | DNS 仅允许白名单 | process
node | prov | 4,1 | 模型提供方 | api.openai.com | model
node | audit | 3,2 | 审计日志 | 不可变，逐次调用记录 | store
edge | app | gw | 请求
edge | gw | vault | 请求时获取
edge | gw | egress | 脱敏后的 prompt
edge | egress | prov | 仅允许的主机
edge | gw | audit | 追加
```

## 安全数值
type: defaults
from: phases/17-infrastructure-and-production/25-security-secrets-audit/docs/zh.md, projects/signed-webhook-inbox/solution/main.go, projects/signed-webhook-inbox/README.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 密钥轮换 | ≤ 90 天 | 密钥、密钥库根 token、CI/CD 凭据 |
| token 寿命 | 小时级 | 使用短期 token，不用天级 token |
| 审计保留期，SOC 2 | 1 年 | 按法规保留 |
| 审计保留期，HIPAA | 6 年 | 按法规保留 |
| Webhook 时钟偏差 | `5*time.Minute` | 当前时间前后 |
| Webhook 请求体大小 | 1..65536 字节 | 解码前先读取 |
| Webhook 密钥 | WEBHOOK_SECRET | 至少 16 字节 |
| `--seconds` | 60 | 接收器寿命，1..600 |

## 审计日志条目
type: annotated-code
lang: python
from: phases/17-infrastructure-and-production/25-security-secrets-audit/code/main.py

```python
entry = AuditEntry(
    timestamp=datetime.utcnow().isoformat() + "Z",
    user=f"user_{i:03}",
    tenant="tenant_01",
    model="anthropic/claude-3.7-sonnet",  # 模型及版本
    prompt_hash=hash_short(scrubbed),  # 哈希，不保存原始 prompt
    response_hash=hash_short(response),
    input_tokens=len(scrubbed.split()),
    output_tokens=len(response.split()),
    cost_usd=0.0012,
    guardrail_trips=[],  # 所有护栏触发项
)
print(audit_log_call(entry))  # 每次调用一行 JSON
```

## 个人信息脱敏
type: concepts
from: phases/17-infrastructure-and-production/25-security-secrets-audit/docs/zh.md, phases/17-infrastructure-and-production/25-security-secrets-audit/code/main.py, phases/17-infrastructure-and-production/26-compliance-frameworks/docs/zh.md

- **顺序**：实体识别、遮盖、一致 token 化、可选反向映射。
- **实验模式**：`scrubber.scrub` 中的 `SSN`、`EMAIL`、`PHONE` 正则。
- **一致 token**：相同值每次映射为同一占位符。
- **正则与 NER**：正则捕获基础模式，NER 覆盖更多。两者结合。
- **时机**：在调用 LLM 前。事后清理无法作为充分防护。
- **存储**：仅保留脱敏 prompt，以及经用户主动同意保存的原文。
- **输出护栏**：用正则脱敏泄漏的 API 密钥模式。

## Webhook 接收流程
type: flow
from: projects/signed-webhook-inbox/solution/main.go, projects/signed-webhook-inbox/README.md

1. **ReadDelivery**：要求 POST、有效 `X-Delivery-ID` 和整数 `X-Timestamp`，否则返回 400。
2. **Verify**：时间戳超出 5 分钟窗口时返回 401。
3. **Verify**：用 `hmac.Equal` 比较时间戳、ID 和请求体的 `v1=` HMAC-SHA256，否则返回 401。
4. **Accept**：使用 fsync 和原子硬链接写入。新投递返回 202。
5. **重试**：同一 ID、同一请求体返回 200。
6. **冲突**：同一 ID、不同请求体返回 409。
7. **重放**：显式 `--run` ID 写入一份处理回执。再次重放时复用该回执。

## Webhook 收件箱命令
type: command-table
span: 2
from: projects/signed-webhook-inbox/README.md

| 命令 | 作用 |
|---|---|
| `/tmp/webhook-inbox --mode serve --dir <dir> --listen 127.0.0.1:8141 --seconds 120` | 接收投递 120 秒 |
| `/tmp/webhook-inbox --mode sign --id delivery-1 --timestamp <unix> --body fixtures/event.json` | 打印三个签名请求头 |
| `/tmp/webhook-inbox --mode inspect --dir <dir> --id delivery-1` | 显示已保存投递 |
| `/tmp/webhook-inbox --mode replay --dir <dir> --id delivery-1 --run review-1` | 在运行 ID review-1 下处理一次 |

## 框架及其 LLM 义务
type: concepts
from: phases/17-infrastructure-and-production/26-compliance-frameworks/docs/zh.md

- **SOC 2 Type II**：控制措施在 6-12 个月内持续有效运行。
- **HIPAA**：未签署 BAA，不得向外部 AI 服务发送 PHI。
- **GDPR**：实时个人信息脱敏、数据主体权利、第 30 条记录。
- **PCI-DSS**：接触支付的 AI 需要相应配置与合同。
- **EU AI Act**：按风险等级分类。高风险需要合格评定与日志记录。
- **Colorado AI Act**：影响评估与申诉权。2026 年 6 月 30 日生效。
- **ISO 42001**：AI 治理，与 ISO 27001 配套。

## 跨框架控制映射
type: command-table
from: phases/17-infrastructure-and-production/26-compliance-frameworks/code/main.py

| 命令 | 作用 |
|---|---|
| `access logging` | ISO 27001 A.5.15-5.18、GDPR 第 32 条、HIPAA §164.312(a)、SOC 2 CC6 |
| `encryption in transit` | ISO 27001 A.8.24、GDPR 第 32 条、HIPAA §164.312(e) |
| `secrets management` | ISO 27001 A.8.19、PCI DSS 第 8 项要求、SOC 2 CC6.1 |
| `audit log retention` | SOC 2 CC7、HIPAA §164.312(b)、ISO 27001 A.8.15 |
| `PII redaction (inference-time)` | GDPR 第 25 条、EU AI Act 第 10 条、HIPAA §164.514 |
| `impact assessment` | Colorado AI Act SB24-205、EU AI Act 第 27 条 |
| `BAA signed` | HIPAA §164.504(e) |

## EU AI Act 日期与罚款
type: concepts
from: phases/18-ethics-safety-alignment/24-regulatory-frameworks-eu-us-uk-korea/docs/zh.md, phases/17-infrastructure-and-production/26-compliance-frameworks/docs/zh.md

- **2024 年 8 月 1 日**：生效。
- **2025 年 2 月 2 日**：适用禁止行为与 AI 素养要求。
- **2025 年 8 月 2 日**：适用 GPAI 与治理义务。
- **2026 年 8 月 2 日**：全面适用，涵盖第 50 条透明度要求及处罚。
- **2027 年 8 月 2 日**：既有 GPAI 与嵌入式高风险系统。
- **第 99(4) 条**：违反高风险义务，最高 €15M 或 3%。
- **第 99(3) 条**：违反禁止行为规定，最高 €35M 或 7%。

## 四个司法辖区
type: comparison
from: phases/18-ethics-safety-alignment/24-regulatory-frameworks-eu-us-uk-korea/docs/zh.md

| 比较项 | 欧盟 | 美国 | 英国 | 韩国 |
|---|---|---|---|---|
| 取向 | 严格，按风险分级 | 倾向创新 | 聚焦特定安全问题 | MSIT 主导 |
| 机构 | AI Office | NIST 下的 CAISI | AI Security Institute | MSIT 下的 AISI |
| 关键日期 | 2024 年 8 月生效 | 2025 年 6 月更名 | 2025 年 2 月更名 | 2026 年 1 月生效 |
| 核心义务 | 风险分级、日志 | 标准支持 | 前沿安全 | 本地代表 |

## 故障排查
type: troubleshooting
from: phases/17-infrastructure-and-production/25-security-secrets-audit/docs/zh.md, projects/signed-webhook-inbox/solution/main.go, projects/signed-webhook-inbox/README.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 删除 `.env` 后密钥仍泄漏 | 密钥留在 git 历史中 | 轮换密钥，扫描每个提交 |
| 数据经 DNS 查询外泄 | LLM pod 可访问任意主机 | 出口白名单、仅允许白名单的解析器 |
| SSN 到达提供方 | 转发前未遮盖 | 在 prompt 离开前脱敏个人信息 |
| 401 `signature mismatch` | 请求体字节变化 | 发送文件的精确字节 |
| 401 `timestamp outside acceptance window` | 时间戳过旧或在未来 | 用当前 Unix 时间戳签名 |
| 已知投递 ID 返回 409 | 同 ID、不同请求体 | 使用新的投递 ID |
| `--dir, 16-byte key env and seconds 1..600 required` | 密钥太短或没有收件箱目录 | 设置 16 字节 WEBHOOK_SECRET 和 `--dir` |

## 问答
type: qa
from: phases/17-infrastructure-and-production/25-security-secrets-audit/docs/zh.md, phases/17-infrastructure-and-production/26-compliance-frameworks/docs/zh.md, phases/18-ethics-safety-alignment/24-regulatory-frameworks-eu-us-uk-korea/docs/zh.md, projects/signed-webhook-inbox/README.md

- **如何处理 CI/CD 凭据？** 按生产级凭据处理。存入密钥库，缩小权限，频繁轮换。
- **Type I 还是 Type II？** Type II。Type I 是起点，Type II 才是门槛。
- **202 表示操作已执行吗？** 否。仅表示经过认证的字节已持久接收。
- **跨司法辖区遵循哪套规则？** 最严格的一套，2026 年通常为 EU AI Act。
- **GPAI 何时构成系统性风险？** 训练算力超过 1e25 FLOP。
