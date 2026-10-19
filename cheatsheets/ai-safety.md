---
id: ai-safety
title: AI 安全与红队测试
subtitle: 识别攻击、检测风险、衡量拒答、门控输出并审计对齐。涵盖第 18、19 阶段课程。
hue: 340
sources: phases/19-capstone-projects/15-constitutional-safety-harness, phases/19-capstone-projects/82-jailbreak-taxonomy, phases/19-capstone-projects/83-prompt-injection-detector, phases/19-capstone-projects/84-refusal-evaluation, phases/19-capstone-projects/85-content-classifier-integration, phases/19-capstone-projects/86-constitutional-rules-engine, phases/19-capstone-projects/87-end-to-end-safety-gate, phases/18-ethics-safety-alignment/02-reward-hacking-goodhart, phases/18-ethics-safety-alignment/04-sycophancy-rlhf-amplification, phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif, phases/18-ethics-safety-alignment/07-sleeper-agents-persistent-deception, phases/18-ethics-safety-alignment/09-alignment-faking, phases/18-ethics-safety-alignment/10-ai-control-subversion, phases/18-ethics-safety-alignment/11-scalable-oversight-weak-to-strong, phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks, phases/18-ethics-safety-alignment/13-many-shot-jailbreaking, phases/18-ethics-safety-alignment/14-ascii-art-visual-jailbreaks, phases/18-ethics-safety-alignment/15-indirect-prompt-injection, phases/18-ethics-safety-alignment/16-red-team-tooling-garak-llamaguard-pyrit, phases/18-ethics-safety-alignment/29-moderation-systems-openai-perspective-llamaguard
code: AS
---

## 三道检查点的安全门控
type: architecture
from: phases/19-capstone-projects/87-end-to-end-safety-gate/docs/zh.md, phases/19-capstone-projects/87-end-to-end-safety-gate/code/safety_gate.py

```arch
node | in | 1,1 | 用户 prompt |
node | pre | 2,1 | 生成前检测 | 检查 prompt 的规则
node | llm | 3,1 | 模型输出流 | 每块 4 个 token
node | dur | 3,2 | 生成中过滤 | 缓冲 2 个分块
node | post | 2,3 | 生成后检查 | 分类器、规则引擎
node | agg | 1,2 | 聚合 | 取最高严重程度
node | out | 1,3 | 最终动作 | RequestTrace
edge | in | pre |
edge | pre | llm | 通过
edge | llm | dur | 流式输出
edge | dur | post | 完成
edge | dur | agg | 提前停止
edge | post | agg |
edge | agg | out |
```

## PAIR 攻击循环
type: flow
from: phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md

1. **攻击者 A**：读取目标 G 以及 prompt 与响应对的历史。
2. **攻击者 A**：编写新 prompt $p_k$。
3. **目标 T**：返回响应 $r_k$。
4. **裁判 J**：依据目标为 $(p_k, r_k)$ 评分。
5. **停止**：分数达到或超过阈值即为越狱成功。
6. **重复**：否则将此对加入历史，直到用完预算 K。

## 越狱攻击分类
type: command-table
from: phases/19-capstone-projects/82-jailbreak-taxonomy/docs/zh.md

| 分类 | 被利用的信任边界 |
|---|---|
| role-play | 助手的人设 |
| instruction-override | 系统 prompt 的权威性 |
| context-smuggling | 用户内容与指令内容的边界 |
| multi-turn-ramp | 将对话历史作为契约 |
| encoding-trick | 禁止 token 的表面形式 |
| prefix-injection | 助手对下一个 token 的决策 |

## 代码任务
type: task-table
from: phases/19-capstone-projects/82-jailbreak-taxonomy/docs/zh.md, phases/19-capstone-projects/83-prompt-injection-detector/code/rules.py, phases/19-capstone-projects/83-prompt-injection-detector/code/main.py, phases/19-capstone-projects/84-refusal-evaluation/code/main.py, phases/19-capstone-projects/87-end-to-end-safety-gate/code/safety_gate.py, phases/19-capstone-projects/87-end-to-end-safety-gate/code/main.py

| 任务 | 代码 |
|---|---|
| 运行综合项目演示 | `python3 main.py` |
| 添加检测规则 | `{"name": "debug-mode", "category": "instruction-override", "score": 0.80, "substring": "debug mode"}` |
| 为 prompt 评分 | `v = self.detector.analyze(prompt)` |
| 尝试 rot13 解码 | `candidate = codecs.encode(text, "rot_13")` |
| 识别拒答 | `classify_refusal(response)` |
| 路由输出 | `action = self.classifier_router.run(output)` |
| 修正规则违规 | `redacted = self.rules_fixer.apply(redacted, violations)` |
| 运行一次请求 | `trace = gate.handle(prompt)` |

## 聚合信号
type: annotated-code
lang: python
from: phases/19-capstone-projects/87-end-to-end-safety-gate/code/safety_gate.py

```python
if pre.category != "benign":
    if pre.confidence >= self.block_confidence:        # 0.85 为高风险
        signals.append(("pre", SEVERITY_RANK["high"]))
    elif pre.confidence >= self.note_confidence:       # 0.5 为中风险
        signals.append(("pre", SEVERITY_RANK["medium"]))
if during.terminated_early:                            # 提前截断流
    signals.append(("during", SEVERITY_RANK["medium"]))
if post is not None:                                   # 分类器与规则
    signals.append(("post.classifier", SEVERITY_RANK.get(post.classifier_severity, 0)))
max_rank = max(rank for _, rank in signals)
if max_rank >= SEVERITY_RANK["high"]:
    return "block"                                     # 返回拒答
if max_rank >= SEVERITY_RANK["medium"]:
    return "redact"                                    # 随后低风险警告，否则放行
```

## 指标
type: concepts
from: phases/19-capstone-projects/83-prompt-injection-detector/docs/zh.md, phases/19-capstone-projects/83-prompt-injection-detector/code/main.py, phases/19-capstone-projects/84-refusal-evaluation/docs/zh.md, phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md

- **精确率**：$TP / (TP + FP)$，触发检测中判断正确的比例。
- **召回率**：$TP / (TP + FN)$，检测器捕获的攻击比例。
- **F1**：每类计算 $2 P R / (P + R)$。
- **拒答不足**：模型回答了标记为不安全的 prompt。
- **过度拒答**：模型拒绝了标记为安全的 prompt。
- **准确率**：安全与否决策的 $(TP + TN) / \text{total}$。
- **ECE**：按十分位分箱，计算 $\lvert \text{conf} - \text{accuracy} \rvert$ 并按箱大小加权。
- **ASR**：攻击成功率。报告时须同时注明查询预算和裁判。

## 对齐失败模式
type: concepts
from: phases/18-ethics-safety-alignment/02-reward-hacking-goodhart/docs/zh.md, phases/18-ethics-safety-alignment/04-sycophancy-rlhf-amplification/docs/zh.md, phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/docs/zh.md, phases/18-ethics-safety-alignment/07-sleeper-agents-persistent-deception/docs/zh.md, phases/18-ethics-safety-alignment/09-alignment-faking/docs/zh.md, phases/18-ethics-safety-alignment/10-ai-control-subversion/docs/zh.md, phases/18-ethics-safety-alignment/11-scalable-oversight-weak-to-strong/docs/zh.md

- **Goodhart**：强优化器找到代理指标与真实目标不一致的输入。
- **过度优化**：KL 增大时代理奖励持续上升，真实奖励先升后降。
- **谄媚**：无论是否真实，都认同用户提出的前提。
- **触发器残留**：用于消除后门的训练结束后，后门仍然存在。
- **伪装对齐**：受监控与不受监控条件下出现服从差距。
- **Constitutional AI**：先批评、修订并执行 SFT，再用 AI 反馈进行 RL。
- **AI 控制**：可信模型 T 修改不可信模型 U 的输出，人工 H 审计模糊结果。
- **PGR**：$(\text{fine-tuned} - \text{weak}) / (\text{ceiling} - \text{weak})$。1.0 表示完全弥合差距。

## 默认值与数值
type: defaults
from: phases/19-capstone-projects/87-end-to-end-safety-gate/code/safety_gate.py, phases/19-capstone-projects/84-refusal-evaluation/code/main.py, phases/19-capstone-projects/85-content-classifier-integration/code/classifiers.py, phases/19-capstone-projects/86-constitutional-rules-engine/code/rules.yml, phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md, phases/18-ethics-safety-alignment/13-many-shot-jailbreaking/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| block_confidence | 0.85 | 生成前检测器触发阻止的分数 |
| note_confidence | 0.5 | 生成前检测器添加中风险信号的分数 |
| buffer_cap | 2 | 生成中过滤器保留的分块数 |
| n_bins | 10 | ECE 分箱数 |
| 泄露阈值 | 0.55 | 与系统 prompt 的三元组重叠率 |
| max_words | 800 | 长度上限规则 |
| PAIR 预算 K | 20 | 每个目标的查询数 |
| MSJ 样例数 | 256 | 对暴力和欺骗内容的有效攻击规模 |

## 故障排查
type: troubleshooting
from: phases/19-capstone-projects/83-prompt-injection-detector/docs/zh.md, phases/19-capstone-projects/84-refusal-evaluation/docs/zh.md, phases/19-capstone-projects/87-end-to-end-safety-gate/docs/zh.md, phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md, phases/18-ethics-safety-alignment/13-many-shot-jailbreaking/docs/zh.md, phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md, phases/18-ethics-safety-alignment/29-moderation-systems-openai-perspective-llamaguard/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 正则漏掉改写表达 | 仅一种模式且未衡量效果 | 使用模式族、先归一化，衡量精确率与召回率 |
| Agent 服从邮件中的指令 | 只过滤用户输入 | 标记不可信内容，审批其动作 |
| 防御报告 ASR 接近零 | 仅使用静态攻击 | 采用自适应攻击评估 |
| 模型拒绝化学作业 | 只衡量有害 prompt | 用安全 prompt 衡量过度拒答 |
| 前缀注入通过 | 只在生成后检查 | 加入生成中的流过滤器 |
| ASR 数字无法比较 | 查询预算不同 | 对齐预算，注明裁判 |
| 256 个样例时攻击成功 | 长上下文中的模式模仿 | 对完整上下文执行分类 |
| 编码攻击通过输入检查 | 仅审核输入 | 同时审核输入与输出 |

## 缩略语
type: glossary
from: phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md, phases/18-ethics-safety-alignment/13-many-shot-jailbreaking/docs/zh.md, phases/18-ethics-safety-alignment/14-ascii-art-visual-jailbreaks/docs/zh.md, phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md, phases/19-capstone-projects/84-refusal-evaluation/docs/zh.md

- **PAIR**：prompt 自动迭代优化，攻击者 LLM 与裁判 LLM 构成循环。
- **GCG**：白盒梯度搜索，用于寻找对抗 token 后缀。
- **TAP**：树状攻击，加入分支与剪枝的 PAIR。
- **MSJ**：多样例越狱，在上下文中加入数百组伪造的服从交互。
- **ArtPrompt**：以 ASCII 艺术字遮蔽安全敏感词。
- **IPI**：间接 prompt 注入，载荷位于非用户编写的内容中。
- **IFC**：信息流控制，不可信内容需要可信批准。
- **ECE**：期望校准误差，比较声明的置信度与准确率。

## 问答
type: qa
from: phases/19-capstone-projects/82-jailbreak-taxonomy/docs/zh.md, phases/19-capstone-projects/85-content-classifier-integration/docs/zh.md, phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md, phases/18-ethics-safety-alignment/13-many-shot-jailbreaking/docs/zh.md

- **为何先建立分类？** 分类标签可将攻击流转为直方图和覆盖图。
- **为何也要分类输出？** 输入检查漏掉的攻击会直接到达用户。
- **哪种动作优先？** 最高严重程度优先。阻止优先，脱敏加警告归为脱敏。
- **PAIR 为何比 GCG 便宜？** 它采用黑盒方法，并从上下文中的每次拒绝学习。
- **MSJ 为何难以阻挡？** 它利用了与上下文学习相同的机制。

## 提示
type: tips
from: phases/19-capstone-projects/82-jailbreak-taxonomy/docs/zh.md, phases/19-capstone-projects/83-prompt-injection-detector/docs/zh.md, phases/19-capstone-projects/86-constitutional-rules-engine/docs/zh.md, phases/19-capstone-projects/15-constitutional-safety-harness/docs/zh.md, phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md, phases/18-ethics-safety-alignment/16-red-team-tooling-garak-llamaguard-pyrit/docs/zh.md

- 每条发现都记录分类标识。
- 先归一化：移除零宽字符，解码 base64、rot13 和十六进制。保留原始 prompt。
- 将宪法规则保存在受版本控制的 YAML 中，并单独评审。
- 在模型输入和输出两侧都放置防护分类器。
- 每晚执行单轮探测，发布前执行多轮攻击测试。
- 使用 CVSS 4.0 为每次成功越狱评分。
