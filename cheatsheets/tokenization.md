---
id: tokenization
title: 分词与 BPE
subtitle: 训练字节级 BPE 分词器，执行编码与解码，再将标识流切成训练窗口。
hue: 45
sources: phases/05-nlp-foundations-to-advanced/19-subword-tokenization, phases/10-llms-from-scratch/01-tokenizers, phases/10-llms-from-scratch/02-building-a-tokenizer, phases/19-capstone-projects/30-bpe-tokenizer-from-scratch, phases/19-capstone-projects/31-tokenized-dataset-sliding-window
code: TB
---

## 任务
type: task-table
from: phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/code/main.py, phases/10-llms-from-scratch/01-tokenizers/docs/zh.md, phases/10-llms-from-scratch/02-building-a-tokenizer/docs/zh.md, phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md

| 任务 | 代码 |
|---|---|
| 训练字节级 BPE | `train(tokenizer, <corpus>, target_vocab_size=320)` |
| 包含特殊 token 的编码 | `encode(tokenizer, text, allow_special=True)` |
| 标识解码为文本 | `decode(tokenizer, ids)` |
| 先归一化 Unicode | `unicodedata.normalize("NFKC", text)` |
| 使用 tiktoken 编码 | 先 `enc = tiktoken.get_encoding("cl100k_base")`，再 `enc.encode(text)` |
| 使用 HF tokenizers 训练 | `tokenizer.train(["corpus.txt"], trainer)` |
| 训练 SentencePiece | `spm.SentencePieceTrainer.train(input="corpus.txt", vocab_size=8000)` |
| 加载模型分词器 | `AutoTokenizer.from_pretrained("meta-llama/Llama-3.1-8B")` |

## 分词器与数据流水线
type: architecture
from: phases/10-llms-from-scratch/02-building-a-tokenizer/docs/zh.md, phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md

```arch
node | raw | 1,1 | 原始文本 |
node | norm | 2,1 | 归一化 | NFKC
node | pre | 3,1 | 预分词 | 划分为文本块
node | bpe | 4,1 | BPE 合并 | 合并表
node | spec | 4,2 | 特殊 token | 固定标识
node | ids | 3,2 | Token 标识 | 扁平标识列表
node | ds | 2,2 | PyTorch Dataset | T+1 个标识的窗口
node | dl | 1,2 | DataLoader | 固定种子打乱，B x T
edge | raw | norm |
edge | norm | pre |
edge | pre | bpe |
edge | bpe | spec |
edge | spec | ids |
edge | ids | ds | 切片
edge | ds | dl | 批次
```

## 训练 BPE 合并规则
type: annotated-code
lang: python
from: phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/code/main.py

```python
tokenizer.initialize(specials)                 # 256 个字节，再加特殊 token
units = _build_initial_units(corpus)           # 字节元组到词频的映射
while tokenizer.vocab_size < target_vocab_size:
    pairs = _count_pairs(units)                # 按词频加权
    max_count = max(pairs.values())
    candidates = sorted(p for p, c in pairs.items() if c == max_count)
    best = candidates[0]                       # 并列时按字节对排序
    if pairs[best] < 2:
        break                                  # 没有重复字节对
    new_id = tokenizer._add_token(
        tokenizer.vocab[best[0]] + tokenizer.vocab[best[1]]
    )                                          # 下一个空闲标识
    tokenizer.merges[best] = new_id            # 顺序即排名
    units = _apply_merge_to_corpus(units, best, new_id)
```

## 编码新文本
type: flow
from: phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md, phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/code/main.py

1. **特殊 token**：`allow_special=True` 时，特殊字符串使用保留标识。
2. **预分词**：`_pretokenize` 按空白与连续单词拆分文本。
3. **字节**：每块转为 UTF-8 字节标识。
4. **排名**：查找当前块可应用的最低排名合并。
5. **合并**：将该字节对替换为合并后的标识。
6. **重复**：直到合并表中没有可应用的规则。
7. **拼接**：按顺序连接全部文本块的标识。

## 滑动窗口数据集
type: annotated-code
lang: python
from: phases/19-capstone-projects/31-tokenized-dataset-sliding-window/code/main.py

```python
usable = num_ids - (context_length + 1)        # count_windows
return 1 + usable // stride                    # usable < 0 时为 0
start = index * self.stride                    # __getitem__
end = start + self.context_length + 1          # T+1 个标识
window = self.ids[start:end]
return window[:-1].clone(), window[1:].clone()  # 输入、目标
generator = torch.Generator()
generator.manual_seed(base_seed + epoch)       # 重跑时顺序相同
inputs, targets = next(iter(loader))           # (B, T) 与 (B, T)
```

## 算法与公式
type: concepts
from: phases/10-llms-from-scratch/01-tokenizers/docs/zh.md, phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md, phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md

- **BPE**：反复合并最高频相邻对，直到达到目标词表大小。
- **字节级 BPE**：基础词表恰好包含 256 个字节，无未知 token。
- **WordPiece**：按 `count(AB) / (count(A) * count(B))` 合并，续接片段带 `##`。
- **Unigram**：从大词表开始，裁剪移除后使语料对数似然增加最少的 token。
- **SentencePiece**：在原始 Unicode 上训练 BPE 或 Unigram，空格用 `▁` 表示。
- **tiktoken**：使用现成词表的快速编码器，不负责训练。
- **朴素编码成本**：单词为 $O(n \cdot \lvert \text{merges} \rvert)$。
- **窗口数**：N 个标识、上下文 T、步幅 S 时，`max(0, 1 + (N - (T + 1)) // S)`。

## 默认值与数值
type: defaults
from: phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md, phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md, phases/10-llms-from-scratch/01-tokenizers/docs/zh.md, phases/19-capstone-projects/31-tokenized-dataset-sliding-window/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| 字节表 | 256 | 字节 0x00 至 0xFF 的标识 |
| GPT-2 词表 | 50,257 | 256 字节、50,000 次合并、1 个特殊 token |
| BERT WordPiece 词表 | 30,522 | 续接前缀为 `##` |
| Llama 3 词表 | 128,256 | 字节级 BPE |
| GPT-4o 词表 | 200,019 | `o200k_base` 编码 |
| SentencePiece character_coverage | 0.9995 | 日语使用 0.995 |
| SlidingWindowDataset stride | context_length | stride 为 None 时使用 |
| make_dataloader num_workers | 0 | 切分内存中的张量 |

## 故障排查
type: troubleshooting
from: phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md, phases/10-llms-from-scratch/02-building-a-tokenizer/docs/zh.md, phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md, phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/code/main.py, phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 部署后模型输出乱码 | 训练用词表 A，部署用词表 B | CI 检查分词器文件 hash |
| "hello" 与 " hello" 标识不同 | 空白歧义 | 显式设置 `add_special_tokens` 与 `add_prefix_space` |
| 对话模型输出无意义 | 对话模板与训练不一致 | 精确匹配训练格式 |
| 非拉丁文字消耗 5-10 倍 token | 词表偏重英语 | 训练更大的多语言词表 |
| `\p{L}` 模式失败 | 标准库 `re` 不支持 Unicode 属性转义 | 安装 `regex` |
| 特殊 token 被编码成字节 | 未开启 `allow_special` | 传入 `allow_special=True` |
| `KeyError`，未知 token 标识 | 标识不在词表中 | 仅解码此分词器产生的标识 |
| 缺少最后窗口 | 尾部不足 T+1 个标识 | 符合预期，切片器会舍弃它 |

## 术语
type: glossary
from: phases/10-llms-from-scratch/01-tokenizers/docs/zh.md, phases/10-llms-from-scratch/02-building-a-tokenizer/docs/zh.md, phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md

- **BPE**：字节对编码，迭代合并最高频对。
- **NFKC**：Unicode 归一化，将 fi 连字转为 "fi"。
- **合并表**：有序的字节对合并列表，就是分词器本身。
- **预分词**：BPE 前的切分规则，使合并限制在词内部。
- **Fertility**：每个词的平均 token 数，1.0 为理想值。
- **压缩比**：产出的 token 数除以输入字节数，越低越好。
- **对话模板**：将消息转为扁平 token 序列的模型专用格式。
- **特殊 token**：绕过 BPE 的保留标识，如 [BOS]、[EOS]、[PAD]。

## 问答
type: qa
from: phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md, phases/10-llms-from-scratch/01-tokenizers/docs/zh.md, phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md

- **为何使用字节表？** 合并前任意 UTF-8 输入都在词表内，不会出现未知 token。
- **为何预分词？** 否则合并会跨越词边界，用短语填满词表。
- **为何按排名应用合并？** 使编码确定且与训练一致。
- **大词表还是小词表？** 大词表使序列更短，但嵌入矩阵更大。
- **为何为打乱设置种子？** 仅改变一个超参数的两次运行就能看到相同数据顺序。

## 提示
type: tips
from: phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/docs/zh.md, phases/10-llms-from-scratch/01-tokenizers/docs/zh.md, phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md, phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/zh.md

- 使用未见文本、emoji 与字面量 <|endoftext|> 测试往返。
- 在留出文本上衡量压缩比，不要用训练语料。
- 构建时只编码语料一次，之后切分标识流。
- 文档之间插入 <|endoftext|> 标识。
- 大语料的步幅可设为上下文长度。
- 按模型规模选择词表：小于 1B 参数用 32k，1-10B 用 50-100k。
