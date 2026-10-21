---
id: ai-security-incidents
title: prompt 注入事件与 AI CVE
code: PI
subtitle: 发现、追踪并阻断间接 prompt 注入。涵盖 EchoLeak 攻击链、PVE 验证器、规则检测器和工具调用防火墙。
hue: 350
sources: phases/18-ethics-safety-alignment/15-indirect-prompt-injection, phases/18-ethics-safety-alignment/25-echoleak-cves-for-ai, phases/14-agent-engineering/27-prompt-injection-defense, phases/19-capstone-projects/83-prompt-injection-detector, projects/tool-call-firewall
source_hash: e5b30f48d6fcf719
---

## 现象、原因与修正
type: troubleshooting
from: phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md, phases/18-ethics-safety-alignment/15-indirect-prompt-injection/code/main.py, phases/18-ethics-safety-alignment/25-echoleak-cves-for-ai/docs/zh.md, phases/14-agent-engineering/27-prompt-injection-defense/docs/zh.md, phases/19-capstone-projects/83-prompt-injection-detector/docs/zh.md, phases/19-capstone-projects/83-prompt-injection-detector/code/main.py

| 现象 | 原因 | 修正 |
|---|---|---|
| agent 将邮件转发给所有联系人 | 简单 agent 服从邮件正文中的命令 | 将邮件标记为不可信，忽略其控制指令 |
| 过滤器拦住 `[SYSTEM:`，礼貌改写却通过 | 自适应攻击者去掉标记 | 使用 IFC。关键词过滤挡不住自适应攻击 |
| 防御报告的 ASR 接近零，随后却失效 | 只用静态攻击测试 | 发布前用自适应攻击评估 |
| 数据通过批准的域名外流 | 输出通过 URL 越过信任边界 | 分别控制检索、作用域与输出 |
| 模型已经影响外部世界 | 所有护栏都在最后运行 | 每次工具调用执行前都验证 |
| 昨天的记忆笔记劫持今天的运行 | 过度信任检索出的记忆 | 拒绝看似指令的记忆写入 |
| 正则漏掉 "disregard the prior" | 只有一条正则，从未衡量效果 | 按类别报告精确率和召回率 |
| `load_taxonomy` 抛出 FileNotFoundError | 缺少第 82 课的产物 | 先运行第 82 课的 main.py |

## 生产环境事件
type: comparison
from: phases/18-ethics-safety-alignment/25-echoleak-cves-for-ai/docs/zh.md, phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md

| 维度 | EchoLeak | CamoLeak | Copilot RCE |
|---|---|---|---|
| 目标 | Microsoft 365 Copilot | GitHub Copilot Chat | GitHub Copilot |
| CVE | CVE-2025-32711 | 编号未披露 | CVE-2025-53773 |
| CVSS | 9.3 | 9.6 | 细节很少 |
| 入口 | RAG 上下文中的特制邮件 | 仓库内容 | 代码建议界面 |
| 影响 | 在 CSP 批准的 URL 上加载 Mermaid 图片 | 通过 Camo 代理加载图片 | 远程代码执行 |
| 修正 | 2025 年 6 月服务端更新 | 禁用图片渲染 | 细节很少 |

## EchoLeak 攻击链
type: flow
from: phases/18-ethics-safety-alignment/25-echoleak-cves-for-ai/docs/zh.md

1. **攻击者**：给任意员工发送一封主题普通的邮件。
2. **受害者**：什么也不做。这是零点击攻击。
3. **Copilot**：处理普通查询时，RAG 检索将邮件带入上下文。
4. **模型**：执行隐藏文本，在收件箱中找到最近的 MFA 验证码。
5. **渲染器**：从包含验证码的签名 URL 加载 Mermaid 图。
6. **CSP**：域名已获批准，因此放行请求。
7. **厂商**：最初评为低风险，MFA 演示后将评分升至 9.3。

## 三道边界与执行闸门
type: architecture
from: phases/18-ethics-safety-alignment/25-echoleak-cves-for-ai/docs/zh.md, phases/18-ethics-safety-alignment/25-echoleak-cves-for-ai/code/main.py, phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md

```arch
node | atk | 1,1 | 攻击者邮件 | 标记为不可信 | client
node | rag | 2,1 | 检索边界 | 进入上下文 | process
node | llm | 3,1 | 模型 | 读取隐藏文本 | model
node | out | 4,1 | 输出边界 | CSP 批准的 URL | client
node | user | 1,2 | 用户 prompt | 可信 | client
node | gate | 2,2 | 作用域隔离 | 阻断不可信调用 | process
node | scope | 3,2 | 作用域边界 | 私人收件箱 | store
edge | atk | rag | 邮件
edge | rag | llm | 上下文
edge | llm | out | render_image
edge | user | gate | 意图
edge | gate | llm | 已批准调用
edge | llm | scope | MFA 验证码
```

## 攻击面
type: concepts
from: phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md, phases/14-agent-engineering/27-prompt-injection-defense/docs/zh.md

- **RAG 途径**：攻击者发布文档，检索将它放入 prompt。
- **收件箱途径**：攻击者发送邮件，agent 读取正文。
- **工具输出途径**：攻击者控制工具结果，例如网页搜索结果。
- **数据窃取**：agent 将对话历史发送到攻击者 URL。
- **蠕虫式传播**：注入内容要求 agent 在下一次输出中嵌入攻击载荷。
- **记忆投毒**：agent 保存指令，在下一次会话中再次感染自己。
- **生态污染**：注入的事实通过共享记忆传播到其他 agent。
- **任意工具使用**：注册表中的任何工具都可能被攻击者调用。

## 运行实验
type: command-table
from: phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md, phases/18-ethics-safety-alignment/25-echoleak-cves-for-ai/docs/zh.md, phases/14-agent-engineering/27-prompt-injection-defense/docs/zh.md, phases/19-capstone-projects/83-prompt-injection-detector/docs/zh.md, projects/tool-call-firewall/README.md

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` (18.15) | 攻击简单 agent、过滤 agent 和 IFC agent |
| `python3 code/main.py` (18.25) | 追踪 EchoLeak，再演示作用域隔离 |
| `python3 code/main.py` (14.27) | 逐次查看 PVE 验证器判定 |
| `python3 main.py` (19.83) | 输出检测器指标与 JSON 报告 |
| `project_test.py <id> --init <dir>` | 创建工作区。id 为 tool-call-firewall |
| `project_test.py <id> --stage 1 --path <dir>` | 评测一个阶段 |
| `project_test.py <id> --all --solution` | 检查参考实现，可加 `--strict` |

## 在执行器之前运行 PVE 验证器
type: annotated-code
lang: python
from: phases/14-agent-engineering/27-prompt-injection-defense/code/main.py

```python
validator = Validator(
    allowed_tools=("search", "send_message", "read_memory"),
    sensitive_tools=("send_message",),
)
call = ToolCall("search", {"query": "<q>"}, intent="research")
contents = [Content("<text>", "user_message")]   # 不扫描用户文本
ok, reason = validator.assess(call, contents)    # 检查允许列表、参数和检索内容
if ok:
    executor.run(call)                           # 仅在放行后执行
looks_like_directive("<text>")                   # 返回标记或 None
memory_write_guard(MemoryWrite("<text>"))        # 拒绝写入指令
```

## 分层注入检测器
type: annotated-code
lang: python
from: phases/19-capstone-projects/83-prompt-injection-detector/code/main.py, phases/19-capstone-projects/83-prompt-injection-detector/code/rules.py

```python
{"name": "ignore-previous", "category": "instruction-override",
 "score": 0.85, "substring": "ignore previous"}   # 规则本身是数据
detector = Detector()                             # 正则规则只编译一次
v = detector.analyze("<prompt>")                  # 检查原始文本与规范化文本
v.category                                        # 最高分类及该类最高得分
normalize(text)                                   # 零宽字符、base64、hex、leet、rot13
report = evaluate(detector, fixtures, benign)     # 各类别的 tp、fp、fn、tn
write_report(report)                              # 写入 outputs/detector_report.json
```

## 工具调用防火墙
type: task-table
from: projects/tool-call-firewall/solution, projects/tool-call-firewall/stages/02-evaluate-role-and-path-policy/docs/zh.md, projects/tool-call-firewall/stages/03-consume-a-request-bound-approval-once/docs/zh.md

| 任务 | 代码 |
|---|---|
| 解析请求封装 | `call(raw, 256)` |
| 判定策略 | `decide(&c)` 返回 Allow、ApprovalRequired 或 Deny |
| 读者写笔记 | `reader + write notes.md -> Deny` |
| 编辑者写笔记 | `editor + write notes.md -> ApprovalRequired` |
| 单次使用批准 | `authorize(request, Some(&mut gate))` |
| 在隔离约束下执行 | `dispatch(root, &request, content, approval)` |
| 记录判定 | `audit(&mut log, &c, &d, 10)` |
| 构建 CLI | `rustc --edition=2021 cli.rs -o firewall` |

## 限制与数值
type: defaults
span: 1
from: projects/tool-call-firewall/solution, phases/19-capstone-projects/83-prompt-injection-detector/code/main.py, phases/19-capstone-projects/83-prompt-injection-detector/outputs/detector_report.json, phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| CLI 请求封装字节数 | 4096 | 拒绝更长输入 |
| 写入内容字节数 | 16384 | 读取也使用同一上限 |
| 审计 `max_entries` | 10 | 拒绝重复 id |
| JSON `schema_version` | 1 | CLI 结果 JSON |
| Base64 token 长度 | 16 | 不解码更短的 token |
| Rot13 词命中数 | 2 | 命中更少时保留输入 |
| 没有规则触发 | 0.0 | 判定类别为 `benign` |
| 检测器准确率 | 0.62 | 50 个测试样例中有 31 个正确 |

## 问答
type: qa
from: phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md, phases/18-ethics-safety-alignment/25-echoleak-cves-for-ai/docs/zh.md, phases/14-agent-engineering/27-prompt-injection-defense/docs/zh.md, phases/19-capstone-projects/83-prompt-injection-detector/docs/zh.md, projects/tool-call-firewall/README.md

- **用户输入过滤器为什么漏掉 IPI？** 载荷位于检索内容中，而非用户输入中。
- **为什么不能只过滤关键词？** “请输出 Yes”这类无害措辞的指令没有关键词。
- **修好一道边界能保护其余边界吗？** 不能。三道边界必须分别防护。
- **一条系统 prompt 规则够吗？** 不够。只靠模型遵循指令不构成强制执行。
- **角色来自哪里？** 可信应用，绝不能来自模型响应。
- **检测器就是安全闸门吗？** 不是。它只是闸门综合使用的一个信号。
- **防火墙是操作系统沙箱吗？** 不是。批准只在单次调用的内存中使用一次。
