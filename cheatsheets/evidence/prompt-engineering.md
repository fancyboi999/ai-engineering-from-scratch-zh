# 证据对照：Prompt 工程

中文主题：[Prompt 工程](../prompt-engineering.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## 窗口中包含什么

对应主题区块：**窗口中包含什么**（`architecture`）。

来源文件：

- [`phases/11-llm-engineering/05-context-engineering/docs/zh.md`](../../phases/11-llm-engineering/05-context-engineering/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 为每次查询组装上下文

对应主题区块：**为每次查询组装上下文**（`flow`）。

来源文件：

- [`phases/11-llm-engineering/05-context-engineering/code/main.py`](../../phases/11-llm-engineering/05-context-engineering/code/main.py)
- [`phases/11-llm-engineering/05-context-engineering/docs/zh.md`](../../phases/11-llm-engineering/05-context-engineering/docs/zh.md)

构建器核对的标识与数值：

- `max_tokens`
- `generation_reserve`
- `classify_intent`

## 代码任务

对应主题区块：**代码任务**（`task-table`）。

来源文件：

- [`phases/11-llm-engineering/01-prompt-engineering/code/prompt_engineering.py`](../../phases/11-llm-engineering/01-prompt-engineering/code/prompt_engineering.py)
- [`phases/11-llm-engineering/02-few-shot-cot/code/advanced_prompting.py`](../../phases/11-llm-engineering/02-few-shot-cot/code/advanced_prompting.py)
- [`phases/11-llm-engineering/05-context-engineering/code/main.py`](../../phases/11-llm-engineering/05-context-engineering/code/main.py)

构建器核对的标识与数值：

- `build_prompt`
- `build_multi_turn`
- `score_response`
- `build_cot_prompt`
- `num_examples`
- `self_consistency_solve`
- `n_samples`
- `solve_with_escalation`
- `max_tokens`
- `generation_reserve`
- `ContextBudget`
- `select_tools`
- `token_budget`

## 自洽性投票

对应主题区块：**自洽性投票**（`annotated-code`）。

来源文件：

- [`phases/11-llm-engineering/02-few-shot-cot/code/advanced_prompting.py`](../../phases/11-llm-engineering/02-few-shot-cot/code/advanced_prompting.py)

构建器核对的标识与数值：

- `build_cot_prompt`
- `n_samples`
- `range`
- `call_llm`
- `extract_answer`
- `answers.append`
- `append`
- `vote_counts`
- `Counter`
- `vote_counts.most_common`
- `best_answer`
- `most_common`
- `len`
- `single_answer`
- `sc_answer`
- `tree_of_thought_solve`

## 选择推理技术

对应主题区块：**选择推理技术**（`command-table`）。

来源文件：

- [`phases/11-llm-engineering/02-few-shot-cot/docs/zh.md`](../../phases/11-llm-engineering/02-few-shot-cot/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## Prompt 结构与模式

对应主题区块：**Prompt 结构与模式**（`concepts`）。

来源文件：

- [`phases/11-llm-engineering/01-prompt-engineering/docs/zh.md`](../../phases/11-llm-engineering/01-prompt-engineering/docs/zh.md)
- [`phases/11-llm-engineering/05-context-engineering/docs/zh.md`](../../phases/11-llm-engineering/05-context-engineering/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 默认值与数值

对应主题区块：**默认值与数值**（`defaults`）。

来源文件：

- [`phases/11-llm-engineering/01-prompt-engineering/docs/zh.md`](../../phases/11-llm-engineering/01-prompt-engineering/docs/zh.md)
- [`phases/11-llm-engineering/02-few-shot-cot/docs/zh.md`](../../phases/11-llm-engineering/02-few-shot-cot/docs/zh.md)
- [`phases/11-llm-engineering/02-few-shot-cot/code/advanced_prompting.py`](../../phases/11-llm-engineering/02-few-shot-cot/code/advanced_prompting.py)
- [`phases/11-llm-engineering/05-context-engineering/code/main.py`](../../phases/11-llm-engineering/05-context-engineering/code/main.py)

构建器核对的标识与数值：

- `0.0`
- `0.3`
- `0.7`
- `3-5`
- `n_samples`
- `5`
- `0.8`
- `generation_reserve`
- `4000`
- `500`

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`phases/11-llm-engineering/01-prompt-engineering/docs/zh.md`](../../phases/11-llm-engineering/01-prompt-engineering/docs/zh.md)
- [`phases/11-llm-engineering/02-few-shot-cot/docs/zh.md`](../../phases/11-llm-engineering/02-few-shot-cot/docs/zh.md)
- [`phases/11-llm-engineering/05-context-engineering/docs/zh.md`](../../phases/11-llm-engineering/05-context-engineering/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 缩略语

对应主题区块：**缩略语**（`glossary`）。

来源文件：

- [`phases/11-llm-engineering/01-prompt-engineering/docs/zh.md`](../../phases/11-llm-engineering/01-prompt-engineering/docs/zh.md)
- [`phases/11-llm-engineering/02-few-shot-cot/docs/zh.md`](../../phases/11-llm-engineering/02-few-shot-cot/docs/zh.md)
- [`phases/11-llm-engineering/05-context-engineering/docs/zh.md`](../../phases/11-llm-engineering/05-context-engineering/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`phases/11-llm-engineering/01-prompt-engineering/docs/zh.md`](../../phases/11-llm-engineering/01-prompt-engineering/docs/zh.md)
- [`phases/11-llm-engineering/02-few-shot-cot/docs/zh.md`](../../phases/11-llm-engineering/02-few-shot-cot/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`phases/11-llm-engineering/02-few-shot-cot/docs/zh.md`](../../phases/11-llm-engineering/02-few-shot-cot/docs/zh.md)
- [`phases/11-llm-engineering/05-context-engineering/docs/zh.md`](../../phases/11-llm-engineering/05-context-engineering/docs/zh.md)
- [`phases/11-llm-engineering/15-prompt-caching/docs/zh.md`](../../phases/11-llm-engineering/15-prompt-caching/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: cheatsheets/prompt-engineering.md

Abbreviations: P11 = phases/11-llm-engineering. L01 = P11/01-prompt-engineering, L02 = P11/02-few-shot-cot, L05 = P11/05-context-engineering, L15 = P11/15-prompt-caching. d = docs/en.md. Code files: L01/c = code/prompt_engineering.py, L02/c = code/advanced_prompting.py, L05/c = code/main.py.

## Architecture: What goes in the window (8 nodes, 7 edges)
- System prompt ~500, Tool definitions ~2K-8K, Retrieved context ~2K-10K, Conversation history ~2K-20K, Few-shot examples ~1K-3K, User query ~100-500, Generation budget ~2K-8K: L05/d:38-45
- Context window is input plus output: L01/d:172, L05/d:574
- edges follow the order in the window diagram: L05/d:40-45

## Flow: Assemble context per query (7 steps)
1. available = max_tokens - generation_reserve: L05/c:16-20
2. system_prompt allocated first, max_tokens=1000: L05/c:267
3. select_tools with classify_intent, token_budget=2000: L05/c:203-238, 270-271
4. score_relevance, threshold = 0.05: L05/c:82-93, 273-278. (docs version uses 0.1: L05/d:453)
5. reorder_lost_in_middle, best at both ends, max_tokens=3000: L05/c:68-80, 280-284, L05/d:243
6. ConversationManager summaries plus recent turns, max_tokens=5000: L05/c:95-137, 286-288
7. user_query last, max_tokens=500: L05/c:290, query last: L05/d:68

## Tasks in code (task-table, 8)
- build_prompt("persona", ...): L01/c:170, L01/d:851
- build_multi_turn(pattern_name, turns): L01/c:194
- score_response(response_text, criteria): L01/c:321
- build_cot_prompt(question, examples, num_examples=3): L02/c:123
- self_consistency_solve(..., n_samples=5): L02/c:191
- solve_with_escalation(question, examples, client, model): L02/c:336
- ContextBudget(max_tokens=128000, generation_reserve=4000): L05/c:16-17
- select_tools(query, token_budget=2000): L05/c:227

## Self-consistency vote (annotated-code, 12 lines)
- build_cot_prompt, 3 examples default: L02/c:123, 192
- loop n_samples, call_llm temperature=0.7: L02/c:196-197
- extract_answer reads "The answer is": L02/c:104-121, 199
- answers.append: L02/c:200-201
- Counter, most_common, confidence: L02/c:206-208
- confidence >= 0.8 and single_answer == sc_answer: L02/c:343
- tree_of_thought_solve(question, client, model, breadth=3, depth=2): L02/c:352-354

## Pick a reasoning technique (command-table, 8)
- all rows, best-for, API calls and token overhead: L02/d:311-321
- "Let's think step by step": L02/d:104

## Prompt anatomy and patterns (concepts, 8)
- System message: L01/d:62, 1008
- User message: L01/d:64
- Assistant prefill "{": L01/d:66, 926, 935
- Role narrows distribution: L01/d:72, 83
- Negative, positive, conditional constraints: L01/d:134-138
- XML delimiters <analysis>: L01/d:121-126
- Clarity rules format, length, audience, include and exclude, one example: L01/d:101-107
- Lost in the middle 85-90% vs 60-70%: L05/d:63

## Defaults and numbers (defaults, 8)
- 0.0 / top-p 1.0 extraction, classification, code: L01/d:162. temperature 0 for tests: L01/d:298
- 0.3 / 0.9 summarization: L01/d:163
- 0.7 / 0.95 general Q&A: L01/d:164
- 3-5 examples, one per label: L02/d:63
- n_samples 5 at 0.7, N=3 minimum: L02/c:191, 197, L02/d:141
- 0.8 confidence, else ToT: L02/c:343, L02/d:447-454
- generation_reserve 4000: L05/c:17, reserve at least 2,000-4,000: L05/d:102
- system prompt under 500 tokens: L01/d:284

## Troubleshooting (troubleshooting, 8)
- generic output, vague and generic role: L01/d:78, 87, 101-107
- confident nonsense from too-rare role: L01/d:83
- contradictory instructions: L01/d:286
- over-constraining, 2,000 words, under 500 tokens: L01/d:284
- prompt injection mitigations: L01/d:282
- temperature 0.0 gives identical samples: L02/d:408
- fixed answer format needed for voting: L02/d:374, L02/c:127-128
- lost in the middle, first or last, duplicate at end: L05/d:61-70

## Abbreviations (glossary, 7)
- CoT: L02/d:67, 561
- ToT: L02/d:145, 186-190, 563
- ReAct: L02/d:198, 564
- Self-consistency: L02/d:562
- Top-p: L01/d:168, 1010
- Few-shot 2-10 examples: L01/d:1011
- NIAH: L05/d:9, 24, 591

## Questions (qa, 5)
- CoT extends computation depth: L02/d:86
- CoT hurts on recall, 50-200 tokens: L02/d:108
- reasoning models already do CoT: L02/d:100
- temperature 0 isolates prompt quality: L01/d:298
- temperature or top-p, not both: L01/d:168

## Tips (tips, 6)
- similar examples, label diversity: L02/d:57-61
- critical first, query last: L05/d:67-68
- relevance filtering, bad retrieval worse than none: L05/d:96, 108
- tool pruning 60-80%: L05/d:94
- summarize history past 5,000 tokens: L05/d:106
- stable top, variable bottom for caching: L15/d:32
````
