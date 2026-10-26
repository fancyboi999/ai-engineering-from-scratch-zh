---
id: constitutional-classifiers
title: 宪法式 AI 与输入输出分类器
code: CO
subtitle: 批评与修订训练、层级冲突解析、输入输出护栏及其绕过方式，以及 YAML 规则引擎。
hue: 160
sources: phases/15-autonomous-systems/17-constitutional-ai, phases/15-autonomous-systems/18-llama-guard, phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif, phases/19-capstone-projects/86-constitutional-rules-engine
source_hash: 6a269b3d4d4df8fb
---

## CAI 训练的两个阶段
type: flow
from: phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/docs/zh.md, phases/15-autonomous-systems/17-constitutional-ai/docs/zh.md

1. **SFT 模型**：回答红队 prompt。模型有帮助，但尚未达到无害要求。
2. **批评者**：读取一条采样原则，批评回答。
3. **修订者**：根据批评修改回答。修订结果成为 SFT 目标。
4. **策略**：生成成对的补全结果。
5. **反馈模型**：依据采样原则为每对结果排序。
6. **奖励模型**：用 AI 偏好训练，再让 PPO 针对它优化。

## 分层防御
type: architecture
from: phases/15-autonomous-systems/18-llama-guard/docs/zh.md, phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/docs/zh.md, phases/19-capstone-projects/86-constitutional-rules-engine/docs/zh.md

```arch
node | user | 1,1 | 用户轮次 | | client
node | inrail | 2,1 | 输入护栏 | Llama Guard, NeMo | process
node | model | 3,1 | 模型权重 | 经 CAI 训练 | model
node | outrail | 4,1 | 输出护栏 | 分类器门控 | process
node | rules | 4,2 | 规则引擎 | YAML 宪法 | process
node | fixer | 3,2 | 修复器 | 按规则局部编辑 | process
node | out | 2,2 | 判定结果 | 接受或升级处理 | client
edge | user | inrail |
edge | inrail | model | 允许
edge | model | outrail | 草稿
edge | outrail | rules | 草稿
edge | rules | fixer | 违规项
edge | fixer | out | 第二轮
```

## 三层对比
type: comparison
span: 2
from: phases/15-autonomous-systems/17-constitutional-ai/docs/zh.md, phases/15-autonomous-systems/18-llama-guard/docs/zh.md, phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/docs/zh.md, phases/19-capstone-projects/86-constitutional-rules-engine/docs/zh.md

| 比较项 | CAI 权重 | 输入输出分类器 | 规则引擎 |
|---|---|---|---|
| 作用对象 | 权重偏好 | 每轮输入和输出 | 候选回答 |
| 信号 | 原则、批评、AI 反馈 | 危害分类，S1 至 S14 | YAML 谓词 |
| 结果 | 带解释的拒绝 | 按类别阻止、标记或路由 | 每条规则对应一项违规及修复 |
| 擅长 | 未见过的近似情形 | 快速拒绝明显滥用 | 契约约束 |
| 缺口 | 原则歧义、漂移 | 表情符号夹带、同形异义字符、改写 | 结构性重写 |
| 示例 | Claude Constitution | Llama Guard 3, NeMo Guardrails | `rules.yml` |

## 层级与区域
type: concepts
from: phases/15-autonomous-systems/17-constitutional-ai/docs/zh.md, phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/docs/zh.md

- **第 1 层**：安全与支持人类监督。优先级最高。
- **第 2 层**：伦理。冲突时高于指南。
- **第 3 层**：Anthropic 指南。
- **第 4 层**：有用性。优先级最低。
- **硬编码**：提升 CBRN 能力、CSAM、基础设施攻击、身份欺骗。不可覆盖。
- **软编码**：长度、主题范围、风格、工具使用。操作者可在边界内调整。
- **第 18.05 课的顺序**：灾难风险、指南、伦理、有用性。自上而下解决冲突。

## 关键数值
type: concepts
from: phases/15-autonomous-systems/17-constitutional-ai/docs/zh.md, phases/15-autonomous-systems/18-llama-guard/docs/zh.md, phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/docs/zh.md

- **Claude Constitution**：79 页，CC0，2026 年 1 月。
- **CAI 2022**：宪法包含 16 条原则。
- **参与式版本 2023**：约 1,000 名美国受访者，与企业文本约有 50% 一致。
- **Constitutional Classifiers**：v1 计算开销为 23.7%，v2 约为 1%。
- **Llama Guard 3**：基于 Llama-3.1-8B，涵盖 13 类危害、8 种语言。
- **1B-INT4 变体**：在移动端 CPU 上超过 30 tokens/sec。
- **Llama Guard 4**：S1 至 S14。S14 为代码解释器滥用。
- **攻击**：Emoji Smuggling 在六种护栏上 ASR 为 100%；NeMo Guard Detect 为 72.54%。

## 四层解析器（第 15.17 课）
type: annotated-code
lang: python
from: phases/15-autonomous-systems/17-constitutional-ai/code/main.py

```python
block = hardcoded_block(action)  # 子串匹配，HARDCODED_PROHIBITIONS
if block:
    return "refuse", f"hardcoded prohibition: {block}"
if score.safety >= 3:  # 冲突时较高层优先
    return "refuse", f"safety violation (score={score.safety})"
if score.ethics >= 3:
    return "refuse", f"ethics violation (score={score.ethics})"
if score.guidelines >= 3:  # 修改，而非拒绝
    return "modify", f"guideline conflict (score={score.guidelines}); modify"
return "allow", "all higher tiers clear; helpfulness respected"
```

## 先规范化，再分类（第 15.18 课）
type: annotated-code
lang: python
from: phases/15-autonomous-systems/18-llama-guard/code/main.py

```python
out = unicodedata.normalize("NFKC", text)  # 统一兼容形式
out = _homoglyph_map(out)  # 将西里尔同形字符映射为拉丁字符
return "".join(ch for ch in out if not _is_invisible(ch))  # 删除零宽字符
hits = classify_raw(normalize(text))  # classify_normalized 的操作
hits = output_rail(o)  # 模型轮次中的 OUTPUT_DISALLOWED
```

## rules.yml 中的一条规则
type: annotated-code
lang: yaml
from: phases/19-capstone-projects/86-constitutional-rules-engine/code/rules.yml

```yaml
- name: no-empty-refusal
  severity: medium  # low、medium 或 high
  applies_when:  # 为 false 时得到 not_applicable
    contains_regex: '\b(i cannot|i will not|i refuse|unable to help)\b'
  must:
    any_of:
      - contains_regex: '\b(try|consider|alternative|instead|suggest)\b'
      - contains_regex: '\bredirect\b'
  explanation: "Refusals must offer a next step (a suggestion, an alternative, or a redirect)."
  fix:
    append_if_missing: "\n\nIf this is something I cannot help with, ..."
```

## 规则语法
type: command-table
from: phases/19-capstone-projects/86-constitutional-rules-engine/docs/zh.md, phases/19-capstone-projects/86-constitutional-rules-engine/code/main.py

| 命令 | 作用 |
|---|---|
| `contains_regex`, `not_contains_regex` | 正则匹配存在或不存在，不区分大小写 |
| `starts_with_regex`, `ends_with_regex` | 匹配文本开头或结尾 |
| `max_words`, `min_words` | 词数边界 |
| `all_of`, `any_of`, `not_` | 组合谓词。`any_of` 使用短路求值 |
| `applies_when` | 为 False 时记录 `not_applicable` |
| `append_if_missing`, `prepend_if_missing` | 缺少文本时添加 |
| `replace_regex` | 将 `pattern` 替换为 `replacement` |
| `low`, `medium`, `high` | 严重级别。第 87 课的门控会阻止 `high` |

## 运行与使用
type: task-table
from: phases/15-autonomous-systems/17-constitutional-ai/docs/zh.md, phases/15-autonomous-systems/18-llama-guard/docs/zh.md, phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/code/main.py, phases/19-capstone-projects/86-constitutional-rules-engine/code/main.py, phases/19-capstone-projects/86-constitutional-rules-engine/code/tests.py

| 任务 | 代码 |
|---|---|
| 四层解析器演示（15.17） | `code/main.py` |
| 分类器与输出护栏演示（15.18） | `code/main.py` |
| CAI 玩具流水线（18.05） | `python3 code/main.py` |
| 规则引擎演示（19.86） | `python3 main.py` |
| 加载宪法 | `engine = Engine()` |
| 评估草稿 | `report = engine.evaluate(draft)` |
| 修复违规项 | `fixer.apply(draft, report.violations())` |
| 比较草稿与修订稿 | `diff(draft, revised)` |

## 故障排查
type: troubleshooting
from: phases/15-autonomous-systems/17-constitutional-ai/docs/zh.md, phases/15-autonomous-systems/18-llama-guard/docs/zh.md, phases/15-autonomous-systems/18-llama-guard/code/main.py, phases/19-capstone-projects/86-constitutional-rules-engine/code/main.py

| 现象 | 原因 | 修正 |
|---|---|---|
| 零宽字符绕过关键词护栏 | 表情符号夹带将词拆开 | 在 `classify_raw` 前调用 `normalize()` |
| 西里尔同形字符通过检查 | 同形字符替换 | 使用 `_homoglyph_map`，扩充映射 |
| 输入通过后仍泄露秘密 | 缺少输出护栏 | 为模型轮次加入 `output_rail()` |
| 请求随轮次漂移 | 分类器只看单轮上下文 | 使用 Colang 对话护栏 |
| “持证实验室”前提绕过限制 | 仅依赖推理式层级 | 使用硬编码禁令 |
| `has bad severity` | 严重级别不是 low、medium、high | 使用这三个值之一 |
| `missing required field` | 缺少 name、explanation 或 must | 补充字段 |
| `unknown predicate` | 键不在语法中 | 使用原子谓词或组合谓词 |

## 问答
type: qa
span: 2
from: phases/15-autonomous-systems/17-constitutional-ai/docs/zh.md, phases/15-autonomous-systems/18-llama-guard/docs/zh.md, phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/docs/zh.md, phases/19-capstone-projects/86-constitutional-rules-engine/docs/zh.md

- **RLAIF 只是更便宜的 RLHF 吗？** 不是。标注者偏差转移到了原则解释中。
- **RLAIF 改变了什么？** 迎合减少，但古德哈特定律依然存在。
- **分类器位于哪里？** 在宪法层之下、运行时层之上。
- **为何只做局部修复？** 结构性重写属于独立的拒绝与帮助层。
- **一层足够吗？** 不够。CAI 塑造行为，分类器执行不变量。
