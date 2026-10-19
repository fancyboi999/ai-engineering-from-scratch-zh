# 证据对照：分词与 BPE

中文主题：[分词与 BPE](../tokenization.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## 任务

对应主题区块：**任务**（`task-table`）。

来源文件：

- [`phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/code/main.py`](../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/code/main.py)
- [`phases/10-llms-from-scratch/01-tokenizers/docs/zh.md`](../../phases/10-llms-from-scratch/01-tokenizers/docs/zh.md)
- [`phases/10-llms-from-scratch/02-building-a-tokenizer/docs/zh.md`](../../phases/10-llms-from-scratch/02-building-a-tokenizer/docs/zh.md)
- [`phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md)

构建器核对的标识与数值：

- `target_vocab_size`
- `train`
- `allow_special`
- `encode`
- `decode`
- `unicodedata.normalize`
- `normalize`
- `tiktoken.get_encoding`
- `enc.encode`
- `get_encoding`
- `cl100k_base`
- `tokenizer.train`
- `spm.SentencePieceTrainer.train`
- `vocab_size`
- `AutoTokenizer.from_pretrained`
- `from_pretrained`

## 分词器与数据流水线

对应主题区块：**分词器与数据流水线**（`architecture`）。

来源文件：

- [`phases/10-llms-from-scratch/02-building-a-tokenizer/docs/zh.md`](../../phases/10-llms-from-scratch/02-building-a-tokenizer/docs/zh.md)
- [`phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md`](../../phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 训练 BPE 合并规则

对应主题区块：**训练 BPE 合并规则**（`annotated-code`）。

来源文件：

- [`phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/code/main.py`](../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/code/main.py)

构建器核对的标识与数值：

- `tokenizer.initialize`
- `initialize`
- `_build_initial_units`
- `tokenizer.vocab_size`
- `vocab_size`
- `target_vocab_size`
- `_count_pairs`
- `pairs.values`
- `max_count`
- `max`
- `values`
- `pairs.items`
- `sorted`
- `items`
- `tokenizer._add_token`
- `new_id`
- `_add_token`
- `tokenizer.vocab`
- `tokenizer.merges`
- `_apply_merge_to_corpus`

## 编码新文本

对应主题区块：**编码新文本**（`flow`）。

来源文件：

- [`phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md`](../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md)
- [`phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/code/main.py`](../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/code/main.py)

构建器核对的标识与数值：

- `allow_special`

## 滑动窗口数据集

对应主题区块：**滑动窗口数据集**（`annotated-code`）。

来源文件：

- [`phases/19-capstone-projects/31-tokenized-dataset-sliding-window/code/main.py`](../../phases/19-capstone-projects/31-tokenized-dataset-sliding-window/code/main.py)

构建器核对的标识与数值：

- `num_ids`
- `context_length`
- `self.stride`
- `self.context_length`
- `self.ids`
- `clone`
- `torch.Generator`
- `Generator`
- `generator.manual_seed`
- `manual_seed`
- `base_seed`
- `next`
- `iter`

## 算法与公式

对应主题区块：**算法与公式**（`concepts`）。

来源文件：

- [`phases/10-llms-from-scratch/01-tokenizers/docs/zh.md`](../../phases/10-llms-from-scratch/01-tokenizers/docs/zh.md)
- [`phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md)
- [`phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md`](../../phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md)

构建器核对的标识与数值：

- `count`
- `max`

## 默认值与数值

对应主题区块：**默认值与数值**（`defaults`）。

来源文件：

- [`phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md`](../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md)
- [`phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md)
- [`phases/10-llms-from-scratch/01-tokenizers/docs/zh.md`](../../phases/10-llms-from-scratch/01-tokenizers/docs/zh.md)
- [`phases/19-capstone-projects/31-tokenized-dataset-sliding-window/code/main.py`](../../phases/19-capstone-projects/31-tokenized-dataset-sliding-window/code/main.py)

构建器核对的标识与数值：

- `256`
- `50,257`
- `30,522`
- `128,256`
- `o200k_base`
- `200,019`
- `0.9995`
- `context_length`
- `0`

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md)
- [`phases/10-llms-from-scratch/02-building-a-tokenizer/docs/zh.md`](../../phases/10-llms-from-scratch/02-building-a-tokenizer/docs/zh.md)
- [`phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md`](../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md)
- [`phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/code/main.py`](../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/code/main.py)
- [`phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md`](../../phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md)

构建器核对的标识与数值：

- `add_special_tokens`
- `add_prefix_space`
- `allow_special`

## 术语

对应主题区块：**术语**（`glossary`）。

来源文件：

- [`phases/10-llms-from-scratch/01-tokenizers/docs/zh.md`](../../phases/10-llms-from-scratch/01-tokenizers/docs/zh.md)
- [`phases/10-llms-from-scratch/02-building-a-tokenizer/docs/zh.md`](../../phases/10-llms-from-scratch/02-building-a-tokenizer/docs/zh.md)
- [`phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md`](../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md)
- [`phases/10-llms-from-scratch/01-tokenizers/docs/zh.md`](../../phases/10-llms-from-scratch/01-tokenizers/docs/zh.md)
- [`phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md`](../../phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md`](../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md)
- [`phases/10-llms-from-scratch/01-tokenizers/docs/zh.md`](../../phases/10-llms-from-scratch/01-tokenizers/docs/zh.md)
- [`phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md`](../../phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md)
- [`phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md`](../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: cheatsheets/tokenization.md

Abbreviations: N19 = phases/05-nlp-foundations-to-advanced/19-subword-tokenization, T1 = phases/10-llms-from-scratch/01-tokenizers, T2 = phases/10-llms-from-scratch/02-building-a-tokenizer, C30 = phases/19-capstone-projects/30-bpe-tokenizer-from-scratch, C31 = phases/19-capstone-projects/31-tokenized-dataset-sliding-window.

## Tasks (task-table, 8)
- train(tokenizer, <corpus>, target_vocab_size=320): C30/code/main.py:303,305
- encode(tokenizer, text, allow_special=True): C30/code/main.py:182-186,333
- decode(tokenizer, ids): C30/code/main.py:220,315
- unicodedata.normalize("NFKC", text): T2/docs/en.md:291
- tiktoken.get_encoding("cl100k_base"), enc.encode(text): T1/docs/en.md:389,392
- tokenizer.train(["corpus.txt"], trainer): T1/docs/en.md:411-412
- spm.SentencePieceTrainer.train(input="corpus.txt", vocab_size=8000): N19/docs/en.md:89-92 (other arguments dropped)
- AutoTokenizer.from_pretrained("meta-llama/Llama-3.1-8B"): T1/docs/en.md:426

## Tokenizer and data pipeline (architecture, 8 nodes, 7 edges)
- Raw Text, Normalize, Pre-Tokenize, BPE Merge, Special Tokens, Token IDs: T2/docs/en.md:35-41
- NFKC, split into chunks, merge table, fixed IDs: T2/docs/en.md:55-58
- flat list of ids, Dataset, windows of T+1 ids: C31/docs/en.md:29,33-39
- DataLoader seeded shuffle, B x T: C31/docs/en.md:42-44,70

## Train BPE merges (annotated-code, 14 lines)
- initialize, _build_initial_units, while loop: C30/code/main.py:116-118
- _count_pairs weighted by count: C30/code/main.py:80-85,119
- max_count, candidates, best (tie break): C30/code/main.py:112-114,122-124
- pairs[best] < 2 break: C30/code/main.py:125-126
- _add_token, merges[best], _apply_merge_to_corpus: C30/code/main.py:127-131
- 256 bytes then specials: C30/code/main.py:56-63. "if not pairs: break" (120-121) omitted for length.

## Encode fresh text (flow, 7)
1. allow_special maps literal strings to ids: C30/docs/en.md:85, code/main.py:192-210
2. _pretokenize whitespace and non-whitespace runs: C30/code/main.py:66-73
3. chunk to UTF-8 byte ids: C30/code/main.py:76-77,156
4. lowest-ranked merge: C30/docs/en.md:74, code/main.py:160-174
5. replace pair with merged id: C30/code/main.py:177-178
6. stop when no merge applies: C30/docs/en.md:74, code/main.py:175-176
7. concatenate chunk ids: C30/code/main.py:213-217

## Sliding window dataset (annotated-code, 9 lines)
- usable, return 1 + usable // stride: C31/code/main.py:178-181
- start, end, window, return input/target: C31/code/main.py:191-194
- torch.Generator, manual_seed(base_seed + epoch): C31/code/main.py:206-207
- inputs, targets = next(iter(loader)), (B, T): C31/code/main.py:281,286-287

## Algorithms and formulas (concepts, 8)
- BPE: T1/docs/en.md:57
- Byte-level 256, no unknown: T1/docs/en.md:126
- WordPiece criterion, ##: T1/docs/en.md:139-140,145
- Unigram prune: N19/docs/en.md:26
- SentencePiece raw Unicode, ▁: N19/docs/en.md:30
- tiktoken does not train: N19/docs/en.md:30
- O(n · |merges|): N19/docs/en.md:82
- window count formula: C31/docs/en.md:90

## Defaults and numbers (defaults, 8)
- 256, 0x00 to 0xFF: C30/docs/en.md:27,49
- 50,257 = 256 + 50,000 + 1: N19/docs/en.md:24
- 30,522 WordPiece: T1/docs/en.md:152
- 128,256 Llama 3: T1/docs/en.md:162,196
- 200,019 o200k_base: T1/docs/en.md:132
- character_coverage 0.9995, 0.995 Japanese: N19/docs/en.md:94
- stride defaults to context_length: C31/code/main.py:168-169
- num_workers 0: C31/code/main.py:214, docs/en.md:86

## Troubleshooting (8)
- tokenizer drift, hash in CI: N19/docs/en.md:118
- whitespace ambiguity, add_special_tokens, add_prefix_space: N19/docs/en.md:119
- chat template mismatch: T2/docs/en.md:139
- multilingual undertraining 5-10x: N19/docs/en.md:120, T1/docs/en.md:203
- \p{L} needs regex module: T2/docs/en.md:207
- specials as bytes when flag off: C30/docs/en.md:85
- KeyError unknown token id: C30/code/main.py:227-228
- last window dropped: C31/docs/en.md:47

## Terms (glossary, 8)
- BPE: T1/docs/en.md:463
- NFKC: T2/docs/en.md:55,434
- Merge table: T1/docs/en.md:469
- Pre-tokenization: T2/docs/en.md:433, C30/docs/en.md:51
- Fertility 1.0 perfect: T1/docs/en.md:467
- Compression ratio: T1/docs/en.md:471
- Chat template: T2/docs/en.md:435
- Special tokens: T2/docs/en.md:436

## Questions (qa, 5)
- byte alphabet: C30/docs/en.md:27,49
- pre-tokenize: C30/docs/en.md:51
- rank order: C30/docs/en.md:76
- vocab size: T1/docs/en.md:184-186, T2/docs/en.md:416
- seeded shuffle: C31/docs/en.md:78

## Tips (6)
- round trip tests: C30/docs/en.md:91
- compression ratio on held-out text: T1/docs/en.md:320
- encode once at build time: C31/docs/en.md:71
- <|endoftext|> between documents: C31/docs/en.md:96
- stride equal to context length: C31/docs/en.md:53
- vocab size heuristic: N19/docs/en.md:135
````
