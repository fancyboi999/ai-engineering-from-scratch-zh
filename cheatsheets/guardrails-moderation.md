---
id: guardrails-moderation
title: 护栏、内容审核与脱敏
code: GM
subtitle: 检查输入输出、路由分类结论、遮盖文本区间并把关工具调用。采用课程中的 Python 与 Rust 实现。
hue: 350
sources: phases/11-llm-engineering/12-guardrails, phases/15-autonomous-systems/18-llama-guard, phases/18-ethics-safety-alignment/29-moderation-systems-openai-perspective-llamaguard, phases/19-capstone-projects/85-content-classifier-integration, projects/sensitive-text-redaction-gate, projects/tool-call-firewall
source_hash: 63de3bc0616abfd2
---

## 护栏检查
type: task-table
span: 2
from: phases/11-llm-engineering/12-guardrails/code/guardrails.py

| 任务 | 代码 |
|---|---|
| 查找注入模式 | `detect_injection(text)` |
| 查找输入中的个人信息 | `detect_pii(text)` |
| 限制 prompt 大小 | `check_length(text, max_chars=5000, max_words=1000)` |
| 阻止有害输出 | `filter_toxicity(text)` |
| 脱敏输出中的个人信息 | `scrubbed, result = scrub_pii_from_output(text)` |
| 检查输出是否回答输入 | `check_relevance(input_text, output_text, threshold=0.15)` |
| 捕获系统 prompt 复述 | `check_system_prompt_leak(output_text, system_prompt, threshold=0.4)` |
| 在模型调用前后运行全部检查 | `pipeline.process(attack)` |

## 过滤器栈
type: flow
from: phases/11-llm-engineering/12-guardrails/docs/zh.md

1. **长度检查**：拒绝超过 5000 字符的输入。长度检查无需模型成本。
2. **限流**：每用户每分钟允许 10 个请求。
3. **主题分类器**：调用模型前拒绝偏题输入。
4. **个人信息检测器**：脱敏或拒绝个人数据。
5. **注入检测器**：分类器耗时 5-20ms。
6. **LLM**：调用耗时 200-2000ms。
7. **有害内容过滤器**：对每个输出分类。
8. **个人信息脱敏与相关性检查**：先脱敏，再检查答案是否切题。

## 内容审核 API 调用
type: annotated-code
lang: python
from: phases/11-llm-engineering/12-guardrails/docs/zh.md, phases/18-ethics-safety-alignment/29-moderation-systems-openai-perspective-llamaguard/docs/zh.md

```python
from openai import OpenAI
client = OpenAI()
response = client.moderations.create(
    model="omni-moderation-latest",  # 一次调用处理文本与图像
    input="<text>",
)
result = response.results[0]
print(result.flagged)  # 任一类别触发时为 True
```

## 代码中的阈值
type: defaults
from: phases/11-llm-engineering/12-guardrails/code/guardrails.py, phases/18-ethics-safety-alignment/29-moderation-systems-openai-perspective-llamaguard/code/main.py, phases/19-capstone-projects/85-content-classifier-integration/code/classifiers.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `check_length` `max_chars` | 5000 | 同时有 `max_words` 1000 |
| `detect_injection` 阻断阈值 | 0.75 | 最高模式置信度 |
| `filter_toxicity` 阻断阈值 | 0.80 | 最高类别置信度 |
| `check_relevance` `threshold` | 0.15 | 达到或超过则通过 |
| `check_system_prompt_leak` `threshold` | 0.4 | 低于则通过 |
| `input_moderator` `threshold` | 0.5 | `output_moderator` 相同 |
| `InstructionLeakageClassifier` `threshold` | 0.55 | 三元组余弦相似度 |
| `_NEGATION_WINDOW` | 20 | 在此前字符内检查 not、never、no |

## 内容审核系统对比
type: comparison
from: phases/18-ethics-safety-alignment/29-moderation-systems-openai-perspective-llamaguard/docs/zh.md, phases/15-autonomous-systems/18-llama-guard/docs/zh.md, phases/11-llm-engineering/12-guardrails/docs/zh.md

| 比较项 | OpenAI Moderation | Llama Guard | Perspective API |
|---|---|---|---|
| 模型 | `omni-moderation-latest`、GPT-4o | Llama-3.1-8B 基础模型（v3） | LLM 之前的有害内容评分 |
| 类别 | 13 个布尔值 | v4 中为 S1 至 S14 | TOXICITY 及 5 个变体 |
| 输入 | 文本与图像 | v4：图像与文本 | 文本 |
| 语言 | 多语言表现提升 42% | 8 种语言（v3） | 未说明 |
| 成本 | 对多数开发者免费 | 开放权重 | 研究基线 |
| 使用场景 | 需要托管 API | 自托管、S14 代码滥用 | 与研究结果比较 |

## 严重程度规则
type: concepts
from: phases/19-capstone-projects/85-content-classifier-integration/docs/zh.md, phases/19-capstone-projects/85-content-classifier-integration/code/classifiers.py

- **high**：阻断。丢弃输出，返回政策拒绝信息。
- **medium**：脱敏。应用各分类器的脱敏器。
- **low**：警告。记录日志并附加温和提示。
- **none**：记录日志。原样输出。
- **取最高级别**：脱敏加警告，最终执行脱敏。
- **pii**：ssn 或银行卡为 high。三项发现或电子邮箱为 medium。
- **instruction-leakage**：0.85 为 high，0.70 为 medium，0.55 为 low。
- **toxicity**：命中 3 项为 high，2 项为 medium，1 项为 low。

## 输出路由器
type: architecture
from: phases/19-capstone-projects/85-content-classifier-integration/docs/zh.md, phases/19-capstone-projects/85-content-classifier-integration/code/main.py

```arch
node | out | 1,2 | 模型输出 | | model
node | tox | 2,1 | toxicity | 侮辱与骚扰 | process
node | pii | 2,2 | pii | 邮箱、电话、ssn、银行卡、IP | process
node | leak | 2,3 | instruction-leakage | 三元组重叠 | process
node | router | 3,2 | 路由器 | 最高严重级别 | process
node | act | 4,2 | 动作 | 阻断、脱敏、警告、记录 | store
edge | out | tox |
edge | out | pii |
edge | out | leak |
edge | tox | router | 结论
edge | pii | router | 结论
edge | leak | router | 结论
edge | router | act |
```

## 故障排查
type: troubleshooting
from: phases/15-autonomous-systems/18-llama-guard/docs/zh.md, phases/15-autonomous-systems/18-llama-guard/code/main.py, phases/18-ethics-safety-alignment/29-moderation-systems-openai-perspective-llamaguard/docs/zh.md, phases/19-capstone-projects/85-content-classifier-integration/docs/zh.md, projects/sensitive-text-redaction-gate/API.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 表情符号夹带请求通过 | 分词器合并表情符号的方式不同 | 增加归一化步骤 |
| 西里尔同形字母通过 | 分类器以英文训练 | `normalize(text)`：NFKC、同形字映射 |
| 编码攻击通过 | 只审核输入 | 增加输出审核 |
| 所有输入都到达模型 | 只审核输出 | 增加输入审核 |
| “you are not a slur”触发规则 | 没有否定检查 | 在匹配项前检查否定窗口 |
| 大区间的剩余部分仍显示 | 只删除了嵌套的小匹配 | 将相交区间合并为并集 |

## 工具调用防火墙
type: flow
from: projects/tool-call-firewall/solution/stage1.rs, projects/tool-call-firewall/solution/stage2.rs, projects/tool-call-firewall/solution/stage3.rs, projects/tool-call-firewall/solution/stage4.rs, projects/tool-call-firewall/README.md

1. **call**：`call(line, max_bytes)` 拆分 `id|role|tool|argument`，并拒绝控制字符。
2. **decide**：`read` 为 `Allow`。编辑者的 `write` 为 `ApprovalRequired`。其他角色为 `Deny`。
3. **authorize**：批准必须与完整调用一致且未使用，否则返回 `Error::Conflict`。
4. **dispatch**：目标必须是限定目录内已存在的文件。内容最多 16384 字节。
5. **audit**：每个请求 ID 写一行制表符分隔记录。重复 ID 返回 `Error::Conflict`。

## 脱敏门槛 API
type: task-table
from: projects/sensitive-text-redaction-gate/API.md, projects/sensitive-text-redaction-gate/solution/main.py

| 任务 | 代码 |
|---|---|
| 查找 EMAIL、IPV4、LITERAL 区间 | `detect(text, literals=())` |
| 合并相交区间 | `merge_spans(spans, text_length)` |
| 替换为 `[REDACTED]` | `redact(text, literals=())` |
| 检查最多 10000 条记录 | `process(records, literals=())` |
| 渲染偏移量账本 | `render_html(report)` |

## 运行项目
type: command-table
span: 2
from: projects/sensitive-text-redaction-gate/README.md, projects/tool-call-firewall/README.md

| 命令 | 作用 |
|---|---|
| `python3 scripts/project_test.py <project> --init learning-artifacts/<project>` | 创建学习者工作区 |
| `python3 scripts/project_test.py <project> --all --solution --strict` | 测试参考实现 |
| `python3 cli.py samples/input.jsonl --literals samples/literals.json --output demo-output` | 写入 redacted.jsonl、receipt.json 和 review.html |
| `rustc --edition=2021 <dir>/cli.rs -o <dir>/firewall` | 构建防火墙 CLI |
| `<dir>/firewall <root> reader r1 read notes.md` | 通过门槛读取文件 |

## 问答
type: qa
from: phases/11-llm-engineering/12-guardrails/docs/zh.md, phases/15-autonomous-systems/18-llama-guard/docs/zh.md, projects/sensitive-text-redaction-gate/API.md, projects/tool-call-firewall/README.md, phases/19-capstone-projects/85-content-classifier-integration/docs/zh.md

- **为何检查输入和输出？** 单独任何一层都可能被攻击者绕过。
- **护栏分类器够用吗？** 不够。Emoji Smuggling 在六种护栏系统上达到 100% 攻击成功率。
- **谁提供角色？** 调用方应用。模型只提供操作。
- **输出检查增加延迟吗？** 与 token 流式输出并行运行，缓冲最后一块。
