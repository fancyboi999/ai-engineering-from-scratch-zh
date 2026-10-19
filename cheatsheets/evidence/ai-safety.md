# 证据对照：AI 安全与红队测试

中文主题：[AI 安全与红队测试](../ai-safety.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## 三道检查点的安全门控

对应主题区块：**三道检查点的安全门控**（`architecture`）。

来源文件：

- [`phases/19-capstone-projects/87-end-to-end-safety-gate/docs/zh.md`](../../phases/19-capstone-projects/87-end-to-end-safety-gate/docs/zh.md)
- [`phases/19-capstone-projects/87-end-to-end-safety-gate/code/safety_gate.py`](../../phases/19-capstone-projects/87-end-to-end-safety-gate/code/safety_gate.py)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## PAIR 攻击循环

对应主题区块：**PAIR 攻击循环**（`flow`）。

来源文件：

- [`phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md`](../../phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 越狱攻击分类

对应主题区块：**越狱攻击分类**（`command-table`）。

来源文件：

- [`phases/19-capstone-projects/82-jailbreak-taxonomy/docs/zh.md`](../../phases/19-capstone-projects/82-jailbreak-taxonomy/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 代码任务

对应主题区块：**代码任务**（`task-table`）。

来源文件：

- [`phases/19-capstone-projects/82-jailbreak-taxonomy/docs/zh.md`](../../phases/19-capstone-projects/82-jailbreak-taxonomy/docs/zh.md)
- [`phases/19-capstone-projects/83-prompt-injection-detector/code/rules.py`](../../phases/19-capstone-projects/83-prompt-injection-detector/code/rules.py)
- [`phases/19-capstone-projects/83-prompt-injection-detector/code/main.py`](../../phases/19-capstone-projects/83-prompt-injection-detector/code/main.py)
- [`phases/19-capstone-projects/84-refusal-evaluation/code/main.py`](../../phases/19-capstone-projects/84-refusal-evaluation/code/main.py)
- [`phases/19-capstone-projects/87-end-to-end-safety-gate/code/safety_gate.py`](../../phases/19-capstone-projects/87-end-to-end-safety-gate/code/safety_gate.py)
- [`phases/19-capstone-projects/87-end-to-end-safety-gate/code/main.py`](../../phases/19-capstone-projects/87-end-to-end-safety-gate/code/main.py)

构建器核对的标识与数值：

- `self.detector.analyze`
- `analyze`
- `codecs.encode`
- `rot_13`
- `encode`
- `classify_refusal`
- `self.classifier_router.run`
- `classifier_router`
- `run`
- `self.rules_fixer.apply`
- `rules_fixer`
- `apply`
- `gate.handle`
- `handle`

## 聚合信号

对应主题区块：**聚合信号**（`annotated-code`）。

来源文件：

- [`phases/19-capstone-projects/87-end-to-end-safety-gate/code/safety_gate.py`](../../phases/19-capstone-projects/87-end-to-end-safety-gate/code/safety_gate.py)

构建器核对的标识与数值：

- `pre.category`
- `pre.confidence`
- `self.block_confidence`
- `block_confidence`
- `signals.append`
- `SEVERITY_RANK`
- `append`
- `self.note_confidence`
- `note_confidence`
- `during.terminated_early`
- `terminated_early`
- `post.classifier`
- `SEVERITY_RANK.get`
- `post.classifier_severity`
- `classifier_severity`
- `get`
- `max_rank`
- `max`

## 指标

对应主题区块：**指标**（`concepts`）。

来源文件：

- [`phases/19-capstone-projects/83-prompt-injection-detector/docs/zh.md`](../../phases/19-capstone-projects/83-prompt-injection-detector/docs/zh.md)
- [`phases/19-capstone-projects/83-prompt-injection-detector/code/main.py`](../../phases/19-capstone-projects/83-prompt-injection-detector/code/main.py)
- [`phases/19-capstone-projects/84-refusal-evaluation/docs/zh.md`](../../phases/19-capstone-projects/84-refusal-evaluation/docs/zh.md)
- [`phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md`](../../phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 对齐失败模式

对应主题区块：**对齐失败模式**（`concepts`）。

来源文件：

- [`phases/18-ethics-safety-alignment/02-reward-hacking-goodhart/docs/zh.md`](../../phases/18-ethics-safety-alignment/02-reward-hacking-goodhart/docs/zh.md)
- [`phases/18-ethics-safety-alignment/04-sycophancy-rlhf-amplification/docs/zh.md`](../../phases/18-ethics-safety-alignment/04-sycophancy-rlhf-amplification/docs/zh.md)
- [`phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/docs/zh.md`](../../phases/18-ethics-safety-alignment/05-constitutional-ai-rlaif/docs/zh.md)
- [`phases/18-ethics-safety-alignment/07-sleeper-agents-persistent-deception/docs/zh.md`](../../phases/18-ethics-safety-alignment/07-sleeper-agents-persistent-deception/docs/zh.md)
- [`phases/18-ethics-safety-alignment/09-alignment-faking/docs/zh.md`](../../phases/18-ethics-safety-alignment/09-alignment-faking/docs/zh.md)
- [`phases/18-ethics-safety-alignment/10-ai-control-subversion/docs/zh.md`](../../phases/18-ethics-safety-alignment/10-ai-control-subversion/docs/zh.md)
- [`phases/18-ethics-safety-alignment/11-scalable-oversight-weak-to-strong/docs/zh.md`](../../phases/18-ethics-safety-alignment/11-scalable-oversight-weak-to-strong/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 默认值与数值

对应主题区块：**默认值与数值**（`defaults`）。

来源文件：

- [`phases/19-capstone-projects/87-end-to-end-safety-gate/code/safety_gate.py`](../../phases/19-capstone-projects/87-end-to-end-safety-gate/code/safety_gate.py)
- [`phases/19-capstone-projects/84-refusal-evaluation/code/main.py`](../../phases/19-capstone-projects/84-refusal-evaluation/code/main.py)
- [`phases/19-capstone-projects/85-content-classifier-integration/code/classifiers.py`](../../phases/19-capstone-projects/85-content-classifier-integration/code/classifiers.py)
- [`phases/19-capstone-projects/86-constitutional-rules-engine/code/rules.yml`](../../phases/19-capstone-projects/86-constitutional-rules-engine/code/rules.yml)
- [`phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md`](../../phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md)
- [`phases/18-ethics-safety-alignment/13-many-shot-jailbreaking/docs/zh.md`](../../phases/18-ethics-safety-alignment/13-many-shot-jailbreaking/docs/zh.md)

构建器核对的标识与数值：

- `0.85`
- `0.5`
- `2`
- `10`
- `0.55`
- `800`
- `20`
- `256`

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`phases/19-capstone-projects/83-prompt-injection-detector/docs/zh.md`](../../phases/19-capstone-projects/83-prompt-injection-detector/docs/zh.md)
- [`phases/19-capstone-projects/84-refusal-evaluation/docs/zh.md`](../../phases/19-capstone-projects/84-refusal-evaluation/docs/zh.md)
- [`phases/19-capstone-projects/87-end-to-end-safety-gate/docs/zh.md`](../../phases/19-capstone-projects/87-end-to-end-safety-gate/docs/zh.md)
- [`phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md`](../../phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md)
- [`phases/18-ethics-safety-alignment/13-many-shot-jailbreaking/docs/zh.md`](../../phases/18-ethics-safety-alignment/13-many-shot-jailbreaking/docs/zh.md)
- [`phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md`](../../phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md)
- [`phases/18-ethics-safety-alignment/29-moderation-systems-openai-perspective-llamaguard/docs/zh.md`](../../phases/18-ethics-safety-alignment/29-moderation-systems-openai-perspective-llamaguard/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 缩略语

对应主题区块：**缩略语**（`glossary`）。

来源文件：

- [`phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md`](../../phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md)
- [`phases/18-ethics-safety-alignment/13-many-shot-jailbreaking/docs/zh.md`](../../phases/18-ethics-safety-alignment/13-many-shot-jailbreaking/docs/zh.md)
- [`phases/18-ethics-safety-alignment/14-ascii-art-visual-jailbreaks/docs/zh.md`](../../phases/18-ethics-safety-alignment/14-ascii-art-visual-jailbreaks/docs/zh.md)
- [`phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md`](../../phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md)
- [`phases/19-capstone-projects/84-refusal-evaluation/docs/zh.md`](../../phases/19-capstone-projects/84-refusal-evaluation/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`phases/19-capstone-projects/82-jailbreak-taxonomy/docs/zh.md`](../../phases/19-capstone-projects/82-jailbreak-taxonomy/docs/zh.md)
- [`phases/19-capstone-projects/85-content-classifier-integration/docs/zh.md`](../../phases/19-capstone-projects/85-content-classifier-integration/docs/zh.md)
- [`phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md`](../../phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/zh.md)
- [`phases/18-ethics-safety-alignment/13-many-shot-jailbreaking/docs/zh.md`](../../phases/18-ethics-safety-alignment/13-many-shot-jailbreaking/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`phases/19-capstone-projects/82-jailbreak-taxonomy/docs/zh.md`](../../phases/19-capstone-projects/82-jailbreak-taxonomy/docs/zh.md)
- [`phases/19-capstone-projects/83-prompt-injection-detector/docs/zh.md`](../../phases/19-capstone-projects/83-prompt-injection-detector/docs/zh.md)
- [`phases/19-capstone-projects/86-constitutional-rules-engine/docs/zh.md`](../../phases/19-capstone-projects/86-constitutional-rules-engine/docs/zh.md)
- [`phases/19-capstone-projects/15-constitutional-safety-harness/docs/zh.md`](../../phases/19-capstone-projects/15-constitutional-safety-harness/docs/zh.md)
- [`phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md`](../../phases/18-ethics-safety-alignment/15-indirect-prompt-injection/docs/zh.md)
- [`phases/18-ethics-safety-alignment/16-red-team-tooling-garak-llamaguard-pyrit/docs/zh.md`](../../phases/18-ethics-safety-alignment/16-red-team-tooling-garak-llamaguard-pyrit/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: ai-safety

P18 = phases/18-ethics-safety-alignment, P19 = phases/19-capstone-projects. C15 = P19/15-constitutional-safety-harness, C82 = P19/82-jailbreak-taxonomy, C83 = P19/83-prompt-injection-detector, C84 = P19/84-refusal-evaluation, C85 = P19/85-content-classifier-integration, C86 = P19/86-constitutional-rules-engine, C87 = P19/87-end-to-end-safety-gate. All doc paths are docs/en.md.

## Architecture: Three checkpoint safety gate (7 nodes)
- in "User prompt": C87/docs:24
- pre "Pre-gen detector, rules on prompt": C87/docs:14, 25; C87/code/safety_gate.py:117-119
- llm "Model stream, 4 token chunks": C87/docs:46; C87/code/mock_llm_stream.py:60
- dur "During-gen filter, 2 chunk buffer": C87/docs:46; C87/code/safety_gate.py:121-145
- post "Post-gen checks, classifier, rules engine": C87/docs:14, 29; C87/code/safety_gate.py:147-156
- agg "Aggregate, max severity": C87/docs:30, 34; C87/code/safety_gate.py:175
- out "Final action, RequestTrace": C87/docs:31, 44; C87/code/safety_gate.py:93-101
- edges pass, stream, complete, early stop: C87/docs:26-29, 46

## Flow: PAIR attack loop
1. A reads goal G and history: P18/12-red-teaming-pair-automated-attacks/docs:33
2. A emits p_k: P18/12/docs:34
3. T returns r_k: P18/12/docs:35
4. J scores (p_k, r_k): P18/12/docs:36
5. score at or above threshold halts: P18/12/docs:37
6. append and repeat up to budget K: P18/12/docs:30, 38

## Command table: Jailbreak taxonomy (6 rows)
- all six rows verbatim: C82/docs:22-29

## Task table: Tasks in code
- python3 main.py: C82/docs:67 (same command in C83 to C87 Use It sections)
- detector rule dict: C83/code/rules.py:14
- self.detector.analyze(prompt): C87/code/safety_gate.py:118
- codecs.encode rot_13: C83/code/main.py:113
- classify_refusal(response): C84/code/main.py:54
- self.classifier_router.run(output): C87/code/safety_gate.py:148
- self.rules_fixer.apply: C87/code/safety_gate.py:193
- gate.handle(prompt): C87/code/main.py:68

## Annotated code: Aggregate the signals (14 lines)
- condensed from C87/code/safety_gate.py:160-179. Drops 159 (signals list), 165-166 (low else branch), 171-174 (rules signal, empty check). Second argument of SEVERITY_RANK.get written as 0, the value of SEVERITY_RANK["none"] at line 57.
- comment "return a refusal": C87/docs:44
- comment "then warn on low, else allow": C87/code/safety_gate.py:180-182

## Concepts: Metrics
- precision: C83/docs:79
- recall: C83/docs:80
- F1: C83/code/main.py:65
- under-refusal: C84/docs:69
- over-refusal: C84/docs:70
- accuracy: C84/docs:35
- ECE bins of tenths, weighted by bin size: C84/docs:37
- ASR with budget and judge: P18/12/docs:100

## Concepts: Alignment failure modes
- Goodhart: P18/02-reward-hacking-goodhart/docs:102
- over-optimization: P18/02/docs:105
- sycophancy: P18/04-sycophancy-rlhf-amplification/docs:116
- trigger persistence: P18/07-sleeper-agents-persistent-deception/docs:95
- alignment faking compliance gap: P18/09-alignment-faking/docs:99
- Constitutional AI: P18/05-constitutional-ai-rlaif/docs:102
- AI control trusted editing: P18/10-ai-control-subversion/docs:108-111
- PGR: P18/11-scalable-oversight-weak-to-strong/docs:102

## Defaults and numbers
- block_confidence 0.85: C87/code/safety_gate.py:110, 161
- note_confidence 0.5: C87/code/safety_gate.py:111, 163
- buffer_cap 2: C87/code/safety_gate.py:121
- n_bins 10: C84/code/main.py:89
- leakage threshold 0.55: C85/code/classifiers.py:179; trigram overlap C85/docs:16, 47
- max_words 800: C86/code/rules.yml:68
- PAIR budget K 20: P18/12/docs:30
- MSJ 256 shots: P18/13-many-shot-jailbreaking/docs:41

## Troubleshooting
- regex misses paraphrase, families, normalize, measure: C83/docs:12, 16, 28
- agent obeys an email, label untrusted, ratify: P18/15-indirect-prompt-injection/docs:26, 33, 37
- near zero ASR, adaptive attacks: P18/15/docs:43-45
- refuses chemistry homework, measure over-refusal: C84/docs:12
- prefix injection survives post-hoc check: C87/docs:14
- ASR budgets not comparable, name the judge: P18/12/docs:60, 100
- 256 shots, classifier over full context: P18/13/docs:41, 55
- input only moderation, layered: P18/29-moderation-systems-openai-perspective-llamaguard/docs:63, 67

## Glossary
- PAIR: P18/12/docs:98
- GCG: P18/12/docs:99
- TAP: P18/12/docs:104
- MSJ: P18/13/docs:97
- ArtPrompt: P18/14-ascii-art-visual-jailbreaks/docs:85
- IPI: P18/15/docs:87
- IFC: P18/15/docs:90
- ECE: C84/docs:37, 71

## Questions
- taxonomy turns attacks into histogram and coverage chart: C82/docs:14
- output classification, one-shot bypass: C85/docs:14
- maximum severity, block wins, redact + warn is redact: C85/docs:43
- PAIR black box, in-context feedback: P18/12/docs:44
- MSJ same mechanism as ICL: P18/13/docs:47-49

## Tips
- taxonomy id with every finding: C82/docs:71
- normalize first, keep raw prompt: C83/docs:24
- constitution in YAML, version control, separate review: C86/docs:14
- guard classifier on both sides: P18/16-red-team-tooling-garak-llamaguard-pyrit/docs:56
- single turn probes nightly, multi-turn campaigns before release: P18/16/docs:52, 56
- CVSS 4.0 per jailbreak: C15/docs:96
````
