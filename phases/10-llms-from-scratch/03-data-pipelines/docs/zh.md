# 预训练的数据流水线

> 模型是一面镜子。你喂它什么，它就映出什么。喂它垃圾，它就用完美的流畅度映出垃圾。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 10，第 01-02 课（Tokenizer、从零构建一个 tokenizer）
**预计时间：** ~90 分钟

## 学习目标

- 构建一条流式数据流水线，无需把全部数据载入内存，就能对 TB 级文本做分词、切块、打乱和分批
- 实现真实预训练流水线里用到的数据质量过滤（去重、语言检测、内容过滤）
- 创建定长训练序列，配上正确的 attention mask 和文档边界处理
- 对流水线吞吐做性能剖析，确保 dataloader 跟得上 GPU 的训练速度

## 问题背景

你有了一个 tokenizer。现在你需要数据。

不是一个数据集。不是一个 CSV 文件。是 TB 级的文本——清洗过、去重过、按质量过滤过、分词成定长序列，并以随机化的批次供给，快到你那 8 卡集群永远不用等下一个批次。

大多数人以为训练 LLM 关键在模型架构。不是。Llama 3 用了 15.6 万亿 token。GPT-3 用了 3000 亿。DeepSeek-V2 用了 8.1 万亿。这三者的架构大体相同：堆叠的 transformer 块，带注意力和前馈层。输出质量上的差异，绝大部分来自数据。

DeepMind 的 Chinchilla 论文把这件事说精确了。对于给定的算力预算，模型参数量和训练 token 数之间存在一个最优比例。Chinchilla 表明，2022 年的大多数模型都严重训练不足——相对它们看到的数据量，参数太多了。一个用 1.4 万亿 token 训练的 70B 模型（Chinchilla 最优），跑赢了一个用 3000 亿 token 训练的 280B 模型（Gopher）。

你的数据流水线决定了你的模型学到的是语言还是噪声。

## 核心概念

### 数据从哪来

每个大语言模型都是在多个来源的混合数据上训练的。确切的配比对大多数实验室来说是严守的秘密，但我们对这些类别已经知道得够多了。

| 来源 | 规模 | 质量 | 谁在用 |
|--------|------|---------|---------|
| Common Crawl | 原始 ~250 TB | 低（需要重度过滤） | GPT-3、Llama、大多数开放模型 |
| Wikipedia | ~20 GB | 高 | 每个主流 LLM |
| GitHub 代码 | ~1 TB+ | 中（大量重复、死代码） | StarCoder、CodeLlama、DeepSeek-Coder |
| 书籍（BookCorpus、Pile） | ~100 GB | 高 | GPT-2、GPT-3、早期模型 |
| 学术论文（arXiv、S2ORC） | ~100 GB | STEM 领域高 | Llama、Galactica |
| StackOverflow、Reddit | ~100 GB | 中 | Llama、Falcon |
| 精选 web（C4、RefinedWeb） | ~5 TB | 中-高（已预过滤） | T5、Falcon |

Llama 3 公开了它的数据配比：大约 50% web 数据、25% 代码、13% 书籍和学术论文、8% 数学数据、4% 多语言 web 数据。总量是 15.6 万亿 token，来自超过 5 TB 原始文本的来源。

配比和总量同等重要。web 数据太多，模型就变成一只 Reddit 鹦鹉。代码太少，它就不会编程。数学太少，它就推理失败。把这个配比调对，是训练 LLM 里最难的部分之一，而且没有公式——它需要实验和评估。

### 数据清洗

原始 web 数据脏得很。一份典型的 Common Crawl dump 里包含：

- HTML 标签和 JavaScript
- 样板化的页头、页脚、导航菜单
- 重复页面（完全重复和近似重复）
- 机器生成的垃圾内容
- 个人可识别信息（PII）
- 低质量文本（关键词堆砌、SEO 垃圾）
- 编码成文本的非文本内容

清洗它不是可选项。这是 "生成连贯段落的模型" 和 "输出一堆 HTML 标签混着商品列表的模型" 之间的差别。

```mermaid
graph TD
    A[原始文本] --> B[去除 HTML]
    B --> C[语言检测]
    C --> D[质量过滤]
    D --> E[去重]
    E --> F[PII 移除]
    F --> G[干净文本]

    style A fill:#1a1a2e,stroke:#e94560,color:#fff
    style B fill:#1a1a2e,stroke:#e94560,color:#fff
    style C fill:#1a1a2e,stroke:#e94560,color:#fff
    style D fill:#1a1a2e,stroke:#e94560,color:#fff
    style E fill:#1a1a2e,stroke:#e94560,color:#fff
    style F fill:#1a1a2e,stroke:#e94560,color:#fff
    style G fill:#1a1a2e,stroke:#e94560,color:#fff
```

每一步都消除一类噪声：

**HTML 剥离：** 移除所有标记。只保留可见的文本内容。像 `trafilatura` 或 `readability` 这样的库能提取文章正文，丢掉导航、广告和样板内容。

**语言检测：** 用 fastText 的语言识别模型（lid.176.bin）给每篇文档分类。过滤到你的目标语言。一篇被分类为英语但置信度低于 0.8 的文档，多半不是干净的英语。

**质量过滤：** 这里开始有意思了。RefinedWeb（Falcon 背后的数据集）用一个基于困惑度的过滤器：在 Wikipedia 上训练一个小语言模型，然后给每篇文档打分。困惑度高意味着文档不像 Wikipedia——很可能是垃圾、关键词列表或机器生成的内容。困惑度超过阈值的文档被移除。

**去重：** 影响最大的单个清洗步骤。Common Crawl 包含海量的重复页面——法律免责声明、cookie 提示、服务条款。在重复内容上训练既浪费算力，又可能让模型逐字记住并复述特定段落。

**PII 移除：** 姓名、邮箱地址、电话号码、社会安全号。结构化 PII 用基于正则的检测，上下文里的姓名用 NER 模型。

### 用 MinHash 去重

完全去重很容易：给每篇文档算哈希，移除重复的。但近似重复才是真正的问题。同一篇新闻文章的两个副本，周围广告稍有不同，就是近似重复。内容 95% 相同，但逐字节看它们不一样。

MinHash + 局部敏感哈希（LSH）能高效解决这个问题。

```mermaid
graph LR
    A[文档] --> B[Shingling 切片]
    B --> C[MinHash 签名]
    C --> D[LSH 桶]
    D --> E[候选对]
    E --> F[Jaccard 相似度]
    F --> G[去重后集合]

    style A fill:#1a1a2e,stroke:#e94560,color:#fff
    style B fill:#1a1a2e,stroke:#e94560,color:#fff
    style C fill:#1a1a2e,stroke:#e94560,color:#fff
    style D fill:#1a1a2e,stroke:#e94560,color:#fff
    style E fill:#1a1a2e,stroke:#e94560,color:#fff
    style F fill:#1a1a2e,stroke:#e94560,color:#fff
    style G fill:#1a1a2e,stroke:#e94560,color:#fff
```

思路是：

1. **Shingling（切片）：** 把每篇文档转成一组 n-gram（比如词或字符的 5-gram）。"the quick brown fox" 用 3 词切片变成 {"the quick brown", "quick brown fox"}。

2. **MinHash：** 对每篇文档的切片集合，计算 k 个哈希值。每个哈希值是在不同哈希函数下、所有切片中的最小哈希。这构成一个定长的 "签名"，近似任意两篇文档之间的 Jaccard 相似度。

3. **LSH：** 根据 MinHash 签名的若干段（band）把文档分到桶里。同一个桶里的文档是候选近似重复。这避免了两两比较——你只比较候选对。

4. **校验：** 对每个候选对，计算精确的 Jaccard 相似度。如果相似度超过阈值（通常 0.8），移除其中一个副本。

Llama 团队报告说，通过去重移除了大约 38% 的 web 数据。这不是个小数字。Common Crawl 中超过三分之一是重复或近似重复内容。

### 序列打包

你的模型期望定长输入序列。你的文档长度可变。有的 50 个 token。有的 50,000 个 token。

朴素做法：把每篇文档都填充到最大序列长度。这在对学习毫无贡献的填充 token 上浪费了巨量算力。

更好的做法：把多篇文档打包进单条序列，用序列结束 token 隔开。一条 2048-token 的序列可能包含三篇短文档，中间用 [EOS] token 拼接。

```mermaid
graph TD
    subgraph Naive Packing["朴素填充"]
        A1["文档 A (200 token)"] --> P1["[PAD] x 1848"]
        A2["文档 B (500 token)"] --> P2["[PAD] x 1548"]
        A3["文档 C (100 token)"] --> P3["[PAD] x 1948"]
    end

    subgraph Efficient Packing["高效打包"]
        B1["文档 A (200) | 文档 B (500) | 文档 C (100) | 文档 D (400) | 文档 E (848)"]
    end

    style A1 fill:#1a1a2e,stroke:#e94560,color:#fff
    style A2 fill:#1a1a2e,stroke:#e94560,color:#fff
    style A3 fill:#1a1a2e,stroke:#e94560,color:#fff
    style P1 fill:#333,stroke:#666,color:#999
    style P2 fill:#333,stroke:#666,color:#999
    style P3 fill:#333,stroke:#666,color:#999
    style B1 fill:#1a1a2e,stroke:#16c784,color:#fff
```

attention mask 必须设置正确。在同一条打包序列里，文档 A 的 token 不应注意到文档 B 的 token。这需要一个块对角的 attention mask。

长文档会在序列边界处被截断或切块。切点很重要：从句子中间切会逼模型看到不完整的想法。有些流水线在可能时把切点对齐到段落或句子边界。

### Chinchilla 缩放定律

对于固定的算力预算 C（以 FLOPs 计），最优模型规模 N 和数据集规模 D 遵循：

```
N_opt ~ C^0.5
D_opt ~ C^0.5
```

实践中，这意味着你应该把模型规模和数据集规模大致等比例放大。一个参数多 10 倍的模型，大约需要多 10 倍的训练 token 才能达到相同的损失。

| 模型 | 参数量 | 训练 token | 是否 Chinchilla 最优？ |
|-------|-----------|----------------|-------------------|
| GPT-3 | 175B | 300B | 否（训练不足 3-4 倍） |
| Chinchilla | 70B | 1.4T | 是（刻意设计） |
| Llama 2 | 70B | 2T | 过度训练（有意为之） |
| Llama 3 | 70B | 15T | 严重过度训练 |

Llama 3 故意违反了 Chinchilla 定律。Meta 发现，在更多数据上过度训练——远超算力最优比例——会产出推理时更好的模型。额外的训练成本只付一次，但更小的模型永远更便宜地服务。这有时被称为 "推理最优" 缩放方法，自 2024 年起已成为行业标准。

```figure
l5-data-pipeline
```

## 动手构建

### 第 1 步：文本清洗

剥离 HTML、归一化空白、移除非文本内容。我们用一段公共领域文本（古登堡计划）作为小语料。

```python
import re

def clean_text(text):
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^\x20-\x7E\n]", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    return text.strip()

def quality_filter(text, min_words=50, max_ratio_caps=0.3, max_ratio_special=0.1):
    words = text.split()
    if len(words) < min_words:
        return False
    caps_ratio = sum(1 for w in words if w.isupper()) / len(words)
    if caps_ratio > max_ratio_caps:
        return False
    special_chars = sum(1 for c in text if not c.isalnum() and not c.isspace())
    if special_chars / max(len(text), 1) > max_ratio_special:
        return False
    return True
```

质量过滤器抓住 SEO 垃圾（全大写）、机器生成的噪声（特殊字符比例高）和残桩页面（太短）。光这三项检查就能从 web 爬取数据里移除惊人数量的垃圾。

### 第 2 步：MinHash 去重

从零实现 MinHash。不需要外部库——只用 `hashlib`。

```python
import hashlib
from collections import defaultdict

def get_shingles(text, k=5):
    words = text.lower().split()
    if len(words) < k:
        return set()
    return {" ".join(words[i:i+k]) for i in range(len(words) - k + 1)}

def minhash_signature(shingles, num_hashes=128):
    signature = []
    for i in range(num_hashes):
        min_hash = float("inf")
        for shingle in shingles:
            h = int(hashlib.sha256(f"{i}:{shingle}".encode()).hexdigest(), 16)
            min_hash = min(min_hash, h)
        signature.append(min_hash)
    return signature

def lsh_buckets(signature, bands=16):
    rows_per_band = len(signature) // bands
    buckets = []
    for b in range(bands):
        start = b * rows_per_band
        band_data = tuple(signature[start:start + rows_per_band])
        bucket_hash = hashlib.md5(str(band_data).encode()).hexdigest()
        buckets.append((b, bucket_hash))
    return buckets

def deduplicate(documents, threshold=0.8, num_hashes=128, bands=16):
    signatures = []
    shingle_sets = []
    for doc in documents:
        shingles = get_shingles(doc)
        shingle_sets.append(shingles)
        signatures.append(minhash_signature(shingles, num_hashes))

    bucket_map = defaultdict(list)
    for doc_idx, sig in enumerate(signatures):
        for band_id, bucket_hash in lsh_buckets(sig, bands):
            bucket_map[(band_id, bucket_hash)].append(doc_idx)

    duplicate_pairs = set()
    for bucket_docs in bucket_map.values():
        if len(bucket_docs) < 2:
            continue
        for i in range(len(bucket_docs)):
            for j in range(i + 1, len(bucket_docs)):
                duplicate_pairs.add((bucket_docs[i], bucket_docs[j]))

    removed = set()
    for i, j in duplicate_pairs:
        if i in removed or j in removed:
            continue
        s1, s2 = shingle_sets[i], shingle_sets[j]
        if not s1 or not s2:
            continue
        jaccard = len(s1 & s2) / len(s1 | s2)
        if jaccard >= threshold:
            removed.add(j)

    return [doc for idx, doc in enumerate(documents) if idx not in removed], len(removed)
```

`num_hashes=128` 和 `bands=16` 这两个参数控制精确率-召回率的权衡。哈希越多，相似度估计越准。段（band）越多，召回率越高（抓到更多重复），代价是更多误报。这些值对典型的 web 文本效果不错。

### 第 3 步：分词并打包序列

拿干净、去重后的文本，分词，再打包成定长序列用于训练。

```python
def tokenize_corpus(documents, tokenizer):
    all_tokens = []
    for doc in documents:
        tokens = tokenizer.encode(doc)
        all_tokens.extend(tokens)
        all_tokens.append(tokenizer.eos_id)
    return all_tokens

def pack_sequences(token_ids, seq_length, pad_id=0):
    sequences = []
    attention_masks = []
    for i in range(0, len(token_ids), seq_length):
        seq = token_ids[i:i + seq_length]
        mask = [1] * len(seq)
        if len(seq) < seq_length:
            pad_count = seq_length - len(seq)
            seq = seq + [pad_id] * pad_count
            mask = mask + [0] * pad_count
        sequences.append(seq)
        attention_masks.append(mask)
    return sequences, attention_masks
```

### 第 4 步：训练用的 DataLoader

产出随机化的打包序列批次。这是训练循环要消费的东西。

```python
import random

class PreTrainingDataLoader:
    def __init__(self, sequences, attention_masks, batch_size, shuffle=True):
        self.sequences = sequences
        self.attention_masks = attention_masks
        self.batch_size = batch_size
        self.shuffle = shuffle

    def __len__(self):
        return (len(self.sequences) + self.batch_size - 1) // self.batch_size

    def __iter__(self):
        indices = list(range(len(self.sequences)))
        if self.shuffle:
            random.shuffle(indices)
        for start in range(0, len(indices), self.batch_size):
            batch_idx = indices[start:start + self.batch_size]
            batch_seqs = [self.sequences[i] for i in batch_idx]
            batch_masks = [self.attention_masks[i] for i in batch_idx]
            yield batch_seqs, batch_masks
```

### 第 5 步：数据集统计

算出关键数字：总 token 数、唯一 token 数、压缩比、文档长度分布。

```python
from collections import Counter

def compute_statistics(documents, token_ids, sequences, tokenizer_vocab_size):
    total_chars = sum(len(d) for d in documents)
    total_tokens = len(token_ids)
    unique_tokens = len(set(token_ids))
    compression_ratio = total_chars / total_tokens

    doc_lengths = [len(d.split()) for d in documents]
    avg_doc_length = sum(doc_lengths) / max(len(doc_lengths), 1)
    max_doc_length = max(doc_lengths) if doc_lengths else 0
    min_doc_length = min(doc_lengths) if doc_lengths else 0

    token_counts = Counter(token_ids)
    top_tokens = token_counts.most_common(10)

    non_pad_tokens = sum(sum(1 for t in seq if t != 0) for seq in sequences)
    total_positions = sum(len(seq) for seq in sequences)
    utilization = non_pad_tokens / max(total_positions, 1)

    stats = {
        "total_documents": len(documents),
        "total_characters": total_chars,
        "total_tokens": total_tokens,
        "unique_tokens": unique_tokens,
        "vocab_utilization": unique_tokens / tokenizer_vocab_size,
        "compression_ratio": compression_ratio,
        "avg_doc_length_words": avg_doc_length,
        "max_doc_length_words": max_doc_length,
        "min_doc_length_words": min_doc_length,
        "num_sequences": len(sequences),
        "sequence_utilization": utilization,
        "top_10_tokens": top_tokens,
    }
    return stats
```

压缩比告诉你 tokenizer 在这个语料上有多高效。英文文本通常压缩到每个 token 约 3-4 个字符。如果你看到每个 token 1.5 个字符，你的 tokenizer 切得太激进了。如果看到 8+，说明它学到了非常领域特定的合并。

序列利用率告诉你打包序列里多少是真数据、多少是填充。低于 90% 意味着你的打包效率低下——你在填充 token 上浪费了算力。

## 实际使用

### 和 HuggingFace Datasets 对比

通过 HuggingFace 的 datasets 库加载同一个语料，对比流水线速度。

```python
from datasets import load_dataset
from transformers import AutoTokenizer

ds = load_dataset("wikitext", "wikitext-2-raw-v1", split="train")
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B")

import time

start = time.time()
tokenized = ds.map(
    lambda x: tokenizer(x["text"], truncation=True, max_length=2048),
    batched=True,
    num_proc=4,
)
hf_time = time.time() - start
total_tokens = sum(len(t) for t in tokenized["input_ids"])
print(f"HuggingFace: {total_tokens:,} tokens in {hf_time:.2f}s ({total_tokens/hf_time:,.0f} tokens/sec)")
```

HuggingFace 流水线底层用 Rust tokenizer，并在 4 个核上并行处理。你的纯 Python 流水线会慢 10-50 倍。这个差距就是生产团队用编译后 tokenizer 的原因。算法是一样的。差别在实现语言。

## 拿去用

本节课产出一个用于验证和调试 LLM 训练流水线数据质量的 prompt。见 `outputs/prompt-data-quality-checker.md`。

## 练习

1. **简单：** 用一个简单的启发式（字符集分析）给清洗流水线加上语言检测。过滤到只剩英语文档，测量有多少文档被移除。
2. **中等：** 在 MinHash 近似去重之外，再用 SHA-256 哈希实现精确去重。在一份 web 爬取语料上对比两种方法各抓到多少重复。
3. **困难：** 构建一个基于困惑度的质量过滤器。在 Wikipedia 文本上训练一个小的 bigram 语言模型，按困惑度给每篇文档打分，移除最差的 20%。对比在过滤过 vs 未过滤数据上训练时的模型输出质量。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|----------------|----------------------|
| Common Crawl | "互联网" | 一个每月爬取 web 的非营利组织——原始 ~250TB，大多数 LLM 训练数据的起点 |
| MinHash | "某种哈希技巧" | 用定长签名估计集合间 Jaccard 相似度的技术——让大规模近似重复检测成为可能 |
| LSH | "局部敏感哈希" | 把相似项分到同一个桶的方法——把两两比较从 O(n^2) 降到近线性 |
| 序列打包 | "拼接文档" | 把多篇文档塞进定长序列、配上正确的 attention mask——消除填充浪费 |
| Chinchilla 缩放 | "用更多数据训练" | 对固定算力预算，最优性能需要把模型规模和训练 token 大致等比例放大 |
| Fertility（产出率） | "每个词几个 token" | 每个词的平均 token 数——GPT-4 对英文是 1.3，非拉丁文字更高 |
| 数据混合 | "选择训练数据" | 代码 vs 文本 vs 数学 vs 多语言数据的配比——没有公式，需要实验 |
| 困惑度过滤 | "质量打分" | 用一个小语言模型给文档打分——困惑度高意味着文本不像干净的参考数据 |
| 去重 | "移除副本" | 消除完全和近似重复的文档——通常移除 30-40% 的原始 web 数据 |
| Attention mask | "该看哪些 token" | 一个二值 mask，在打包序列里阻止跨文档边界的注意力 |

## 延伸阅读

- [Hoffmann et al., 2022 -- Training Compute-Optimal Large Language Models (Chinchilla)](https://arxiv.org/abs/2203.15556) -- 改变了我们对数据规模认知的论文
- [Penedo et al., 2023 -- The RefinedWeb Dataset for Falcon LLM](https://arxiv.org/abs/2306.01116) -- 如何把 Common Crawl 过滤到高质量
- [Touvron et al., 2023 -- Llama 2: Open Foundation and Fine-Tuned Chat Models](https://arxiv.org/abs/2307.09288) -- Llama 2 的数据流水线细节
- [Lee et al., 2022 -- Deduplicating Training Data Makes Language Models Better](https://arxiv.org/abs/2107.06499) -- 为什么去重比你想的更重要
- [Broder, 1997 -- On the Resemblance and Containment of Documents](https://ieeexplore.ieee.org/document/666900) -- 最初的 MinHash 论文
- [Meta, 2024 -- Llama 3 Technical Report](https://arxiv.org/abs/2407.21783) -- 15.6T token、数据混合比例、过滤流水线
