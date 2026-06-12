# 从零构建一个 tokenizer

> 第 01 课给了你一个玩具。这一课给你一件武器。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 10，第 01 课（Tokenizer：BPE、WordPiece、SentencePiece）
**预计时间：** ~90 分钟

## 学习目标

- 构建一个生产级 BPE tokenizer，能处理 Unicode、空白归一化和特殊 token
- 实现字节级兜底，让 tokenizer 能编码任意输入（包括 emoji、中日韩文字和代码）而不产生未知 token
- 加入预分词正则模式，在应用 BPE 合并之前先在词边界处切分文本
- 在一份语料上训练自定义 tokenizer，并在多语言文本上和 tiktoken 对比其压缩比

## 问题背景

你在第 01 课写的 BPE tokenizer 对英文文本能用。现在扔一段日语给它。或者 emoji。或者一段 tab 和空格混用的 Python 代码。

它崩了。

不是因为 BPE 错了——而是因为实现不完整。一个生产级 tokenizer 要处理任意编码的原始字节，在切分前归一化 Unicode，管理那些永远不会被合并的特殊 token，把预分词和子词切分串起来，而且要快到不会拖累一条处理 15 万亿 token 的训练流水线。

GPT-2 的 tokenizer 有 50,257 个 token。Llama 3 有 128,256 个。GPT-4 大约 100,000 个。这些不是玩具数字。这些词表背后的合并表，是在几百 GB 的文本上训练出来的，而周边那套机制——归一化、预分词、特殊 token 注入、chat 模板格式化——才是区分一个只能处理 "hello world" 的 tokenizer 和一个能处理整个互联网的 tokenizer 的关键。

你要构建的就是这套机制。

## 核心概念

### 完整流水线

一个生产级 tokenizer 不是单个算法。它是一条由五个阶段组成的流水线，每个阶段解决一个不同的问题。

```mermaid
graph LR
    A[原始文本] --> B[归一化]
    B --> C[预分词]
    C --> D[BPE 合并]
    D --> E[特殊 token]
    E --> F[Token ID]

    style A fill:#1a1a2e,stroke:#e94560,color:#fff
    style B fill:#1a1a2e,stroke:#e94560,color:#fff
    style C fill:#1a1a2e,stroke:#e94560,color:#fff
    style D fill:#1a1a2e,stroke:#e94560,color:#fff
    style E fill:#1a1a2e,stroke:#e94560,color:#fff
    style F fill:#1a1a2e,stroke:#e94560,color:#fff
```

每个阶段都有具体职责：

| 阶段 | 它做什么 | 为什么重要 |
|-------|-------------|----------------|
| Normalize | NFKC Unicode，可选小写化，可选去重音 | "fi" 连字（U+FB01）变成 "fi"（两个字符）。没有这一步，同一个词会得到不同的 token。 |
| Pre-Tokenize | 在 BPE 之前把文本切成块 | 防止 BPE 跨词边界合并。"the cat" 永远不该产出一个 "e c" 的 token。 |
| BPE Merge | 把学到的合并规则应用到字节序列上 | 核心压缩。把原始字节变成子词 token。 |
| Special Tokens | 注入 [BOS]、[EOS]、[PAD]、chat 模板标记 | 这些 token 有固定 ID。它们从不参与 BPE 合并。模型靠它们来组织结构。 |
| ID Mapping | 把 token 字符串转成整数 ID | 模型看到的是整数，不是字符串。 |

### 字节级 BPE

第 01 课的 tokenizer 在 UTF-8 字节上工作。那个选择是对的。但我们跳过了一件重要的事：当这些字节不是合法 UTF-8 时怎么办？

字节级 BPE 通过把每一个可能的字节值（0-255）都当成合法 token 来解决这个问题。你的基础词表恰好是 256 个条目。任何文件——文本、二进制、损坏的——都能被分词而不产生未知 token。

GPT-2 加了个小技巧：把每个字节映射到一个可打印的 Unicode 字符，让词表保持人类可读。在它的映射里，字节 0x20（空格）变成字符 "G"。这纯粹是为了好看。算法并不在乎。

真正的威力在于：字节级 BPE 能处理地球上的每一种语言。中文字符每个占 3 个 UTF-8 字节。日语可以是 3-4 字节。阿拉伯文、天城文、emoji——全都只是字节序列。BPE 算法在这些字节序列里找模式的方式，和它在英文 ASCII 字节里找模式的方式一模一样。

### 预分词

在 BPE 碰你的文本之前，你需要把它切成块。这能防止合并算法造出跨词边界的 token。

GPT-2 用一个正则模式来切分文本：

```
'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+
```

这个模式在缩写处切分（"don't" 变成 "don" + "'t"）、在带可选前导空格的词处、数字处、标点处和空白处切分。前导空格保留在词上——所以 "the cat" 变成 [" the", " cat"]，而不是 ["the", " ", "cat"]。

Llama 用 SentencePiece，完全跳过正则。它把原始字节流当成一条长序列，让 BPE 算法自己搞清楚边界。这更简单，但给了 BPE 更大的自由去造跨词 token。

这个选择很重要。GPT-2 的正则阻止 tokenizer 学到 "一个词结尾的 the 和下一个词开头的 the 应该合并"。SentencePiece 允许这样，有时能产出更高效的压缩，但 token 的可解释性更差。

### 特殊 token

每个生产级 tokenizer 都为结构标记保留一些 token ID：

| Token | 用途 | 谁在用 |
|-------|---------|---------|
| `[BOS]` / `<s>` | 序列开始 | Llama 3、GPT |
| `[EOS]` / `</s>` | 序列结束 | 所有模型 |
| `[PAD]` | 批次对齐用的填充 | BERT、T5 |
| `[UNK]` | 未知 token（字节级 BPE 消除了它） | BERT、WordPiece |
| `<\|im_start\|>` | chat 消息边界起始 | ChatGPT、Qwen |
| `<\|im_end\|>` | chat 消息边界结束 | ChatGPT、Qwen |
| `<\|user\|>` | 用户轮次标记 | Llama 3 |
| `<\|assistant\|>` | 助手轮次标记 | Llama 3 |

特殊 token 永远不会被 BPE 切分。它们在合并算法运行之前被精确匹配出来，替换成各自的固定 ID，周围的文本则正常分词。

### chat 模板

这里就是大多数人犯迷糊、大多数实现出错的地方。

当你给一个 chat 模型发消息时，API 接受一个消息列表：

```
[
  {"role": "system", "content": "You are helpful."},
  {"role": "user", "content": "Hello"},
  {"role": "assistant", "content": "Hi there!"}
]
```

模型看不到 JSON。它看到的是一条扁平的 token 序列。chat 模板用特殊 token 把消息转成那条扁平序列。每个模型做法都不一样：

```
Llama 3:
<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are helpful.<|eot_id|><|start_header_id|>user<|end_header_id|>

Hello<|eot_id|><|start_header_id|>assistant<|end_header_id|>

Hi there!<|eot_id|>

ChatGPT:
<|im_start|>system
You are helpful.<|im_end|>
<|im_start|>user
Hello<|im_end|>
<|im_start|>assistant
Hi there!<|im_end|>
```

模板弄错了，模型就会产出垃圾。它是在一种确切的格式上训练出来的。任何偏差——少一个换行、换错一个 token、多一个空格——都会把输入推到训练分布之外。

### 速度

Python 对生产级分词来说太慢了。

tiktoken（OpenAI）用 Rust 写成，带 Python 绑定。HuggingFace tokenizers 也是 Rust。SentencePiece 是 C++。这些相比纯 Python 能做到 10-100 倍加速。

举个直观的例子：为 Llama 3 预训练分词 15 万亿 token，以每秒 100 万 token（快的 Python）计，要花 174 天。以每秒 1 亿 token（Rust）计，只要 1.7 天。

你用 Python 来构建是为了理解算法。在生产里，你会用一个编译后的实现，只碰那层 Python 封装。

```figure
weight-tying
```

## 动手构建

### 第 1 步：字节级编码

地基。把任意字符串转成字节序列，把每个字节映射到一个可打印字符用于展示，再把过程逆转回来。

```python
def bytes_to_tokens(text):
    return list(text.encode("utf-8"))

def tokens_to_text(token_bytes):
    return bytes(token_bytes).decode("utf-8", errors="replace")
```

在多语言文本上测试，看看字节数：

```python
texts = [
    ("English", "hello"),
    ("Chinese", "你好"),
    ("Emoji", "🔥"),
    ("Mixed", "hello你好🔥"),
]

for label, text in texts:
    b = bytes_to_tokens(text)
    print(f"{label}: {len(text)} chars -> {len(b)} bytes -> {b}")
```

"hello" 是 5 字节。"你好" 是 6 字节（每个字符 3 字节）。火焰 emoji 是 4 字节。字节级 tokenizer 不在乎是什么语言。字节就是字节。

### 第 2 步：带正则的预分词器

用 GPT-2 的正则模式把文本切成块。每一块由 BPE 独立分词。

```python
import re

try:
    import regex
    GPT2_PATTERN = regex.compile(
        r"""'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""
    )
except ImportError:
    GPT2_PATTERN = re.compile(
        r"""'(?:[sdmt]|ll|ve|re)| ?[a-zA-Z]+| ?[0-9]+| ?[^\s\w]+|\s+(?!\S)|\s+"""
    )

def pre_tokenize(text):
    return [match.group() for match in GPT2_PATTERN.finditer(text)]
```

`regex` 模块支持 Unicode 属性转义（`\p{L}` 表示字母，`\p{N}` 表示数字）。标准库的 `re` 模块不支持，所以我们退回到 ASCII 字符类。生产级多语言 tokenizer 请装 `regex`。

试一下：

```python
print(pre_tokenize("Hello, world! Don't stop."))
# [' Hello', ',', ' world', '!', " Don", "'t", ' stop', '.']
```

前导空格留在词上。缩写在撇号处切开。标点成为自己的一块。BPE 永远不会跨这些边界合并 token。

### 第 3 步：在字节序列上做 BPE

第 01 课的核心算法，但现在是在预分词后的块上独立运行。

```python
from collections import Counter

def get_byte_pairs(chunks):
    pairs = Counter()
    for chunk in chunks:
        byte_seq = list(chunk.encode("utf-8"))
        for i in range(len(byte_seq) - 1):
            pairs[(byte_seq[i], byte_seq[i + 1])] += 1
    return pairs

def apply_merge(byte_seq, pair, new_id):
    merged = []
    i = 0
    while i < len(byte_seq):
        if i < len(byte_seq) - 1 and byte_seq[i] == pair[0] and byte_seq[i + 1] == pair[1]:
            merged.append(new_id)
            i += 2
        else:
            merged.append(byte_seq[i])
            i += 1
    return merged
```

### 第 4 步：特殊 token 处理

特殊 token 需要精确匹配和固定 ID。它们完全绕过 BPE。

```python
class SpecialTokenHandler:
    def __init__(self):
        self.special_tokens = {}
        self.pattern = None

    def add_token(self, token_str, token_id):
        self.special_tokens[token_str] = token_id
        escaped = [re.escape(t) for t in sorted(self.special_tokens.keys(), key=len, reverse=True)]
        self.pattern = re.compile("|".join(escaped))

    def split_with_specials(self, text):
        if not self.pattern:
            return [(text, False)]
        parts = []
        last_end = 0
        for match in self.pattern.finditer(text):
            if match.start() > last_end:
                parts.append((text[last_end:match.start()], False))
            parts.append((match.group(), True))
            last_end = match.end()
        if last_end < len(text):
            parts.append((text[last_end:], False))
        return parts
```

### 第 5 步：完整的 tokenizer 类

把所有东西串起来：归一化、按特殊 token 切分、预分词、BPE 合并、映射到 ID。

```python
import unicodedata

class ProductionTokenizer:
    def __init__(self):
        self.merges = {}
        self.vocab = {i: bytes([i]) for i in range(256)}
        self.special_handler = SpecialTokenHandler()
        self.next_id = 256

    def normalize(self, text):
        return unicodedata.normalize("NFKC", text)

    def train(self, text, num_merges):
        text = self.normalize(text)
        chunks = pre_tokenize(text)
        chunk_bytes = [list(chunk.encode("utf-8")) for chunk in chunks]

        for i in range(num_merges):
            pairs = Counter()
            for seq in chunk_bytes:
                for j in range(len(seq) - 1):
                    pairs[(seq[j], seq[j + 1])] += 1
            if not pairs:
                break
            best = max(pairs, key=pairs.get)
            new_id = self.next_id
            self.next_id += 1
            self.merges[best] = new_id
            self.vocab[new_id] = self.vocab[best[0]] + self.vocab[best[1]]
            chunk_bytes = [apply_merge(seq, best, new_id) for seq in chunk_bytes]

    def add_special_token(self, token_str):
        token_id = self.next_id
        self.next_id += 1
        self.special_handler.add_token(token_str, token_id)
        self.vocab[token_id] = token_str.encode("utf-8")
        return token_id

    def encode(self, text):
        text = self.normalize(text)
        parts = self.special_handler.split_with_specials(text)
        all_ids = []
        for part_text, is_special in parts:
            if is_special:
                all_ids.append(self.special_handler.special_tokens[part_text])
            else:
                for chunk in pre_tokenize(part_text):
                    byte_seq = list(chunk.encode("utf-8"))
                    for pair, new_id in self.merges.items():
                        byte_seq = apply_merge(byte_seq, pair, new_id)
                    all_ids.extend(byte_seq)
        return all_ids

    def decode(self, ids):
        byte_parts = []
        for token_id in ids:
            if token_id in self.vocab:
                byte_parts.append(self.vocab[token_id])
        return b"".join(byte_parts).decode("utf-8", errors="replace")

    def vocab_size(self):
        return len(self.vocab)
```

### 第 6 步：多语言测试

真正的测试。把英文、中文、emoji 和代码全扔给它。

```python
corpus = (
    "The quick brown fox jumps over the lazy dog. "
    "The quick brown fox runs through the forest. "
    "Machine learning models process natural language. "
    "Deep learning transforms how we build software. "
    "def train(model, data): return model.fit(data) "
    "def predict(model, x): return model(x) "
)

tok = ProductionTokenizer()
tok.train(corpus, num_merges=50)

bos = tok.add_special_token("<|begin|>")
eos = tok.add_special_token("<|end|>")

test_texts = [
    "The quick brown fox.",
    "你好世界",
    "Hello 🌍 World",
    "def foo(x): return x + 1",
    f"<|begin|>Hello<|end|>",
]

for text in test_texts:
    ids = tok.encode(text)
    decoded = tok.decode(ids)
    print(f"Input:   {text}")
    print(f"Tokens:  {len(ids)} ids")
    print(f"Decoded: {decoded}")
    print()
```

中文字符每个产出 3 字节。emoji 产出 4 字节。这些都没有让 tokenizer 崩溃。都没有产生未知 token。这就是字节级 BPE 的威力。

## 实际使用

### 对比真实的 tokenizer

加载 Llama 3、GPT-4 和 Mistral 的真实 tokenizer。看看每个怎么处理同一段多语言文字。

```python
import tiktoken

gpt4_enc = tiktoken.get_encoding("cl100k_base")

test_paragraph = "Machine learning is powerful. 机器学习很强大。 L'apprentissage automatique est puissant. 🤖💪"

tokens = gpt4_enc.encode(test_paragraph)
pieces = [gpt4_enc.decode([t]) for t in tokens]
print(f"GPT-4 ({len(tokens)} tokens): {pieces}")
```

```python
from transformers import AutoTokenizer

llama_tok = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B")
mistral_tok = AutoTokenizer.from_pretrained("mistralai/Mistral-7B-v0.1")

for name, tok in [("Llama 3", llama_tok), ("Mistral", mistral_tok)]:
    tokens = tok.encode(test_paragraph)
    pieces = tok.convert_ids_to_tokens(tokens)
    print(f"{name} ({len(tokens)} tokens): {pieces[:20]}...")
```

同一段文本，你会看到不同的 token 数。Llama 3 的 128K 词表在合并常见模式上更激进。GPT-4 的 100K 居中。Mistral 的 32K 产出更多 token，但 embedding 层更小。

权衡始终一样：更大的词表意味着更短的序列，但更多的参数。

## 拿去用

本节课产出一个用于构建和调试生产级 tokenizer 的 prompt。见 `outputs/prompt-tokenizer-builder.md`。

## 练习

1. **简单：** 加一个 `get_token_bytes(id)` 方法，显示任意 token ID 的原始字节。用它检查你最常见的那些合并 token 实际代表什么。
2. **中等：** 实现 Llama 风格的预分词器，它在空白和数字处切分但保留前导空格。在同一份语料上把它的词表和 GPT-2 正则方案对比。
3. **困难：** 加一个 chat 模板方法，接受一个 `{"role": ..., "content": ...}` 消息列表，并产出 Llama 3 chat 格式的正确 token 序列。拿它和 HuggingFace 的实现对照测试。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|----------------|----------------------|
| 字节级 BPE | "在字节上工作的 tokenizer" | 基础词表为 256 个字节值的 BPE——处理任意输入而不产生未知 token |
| 预分词 | "BPE 之前的切分" | 基于正则或规则的切分，防止 BPE 跨词边界合并 |
| NFKC 归一化 | "Unicode 清理" | 规范分解后接兼容组合——"fi" 连字变成 "fi"，全角 "Ａ" 变成 "A" |
| chat 模板 | "消息怎么变成 token" | 把 role/content 消息列表转成扁平 token 序列的确切格式——因模型而异，且必须匹配训练格式 |
| 特殊 token | "控制 token" | 绕过 BPE 的保留 token ID——[BOS]、[EOS]、[PAD]、chat 标记——在合并前被精确匹配 |
| Fertility（产出率） | "每个词几个 token" | 输出 token 数与输入词数之比——GPT-4 对英文是 1.3，韩语是 2-3，越高意味着 context 浪费越多 |
| tiktoken | "OpenAI 的 tokenizer" | 带 Python 绑定的 Rust BPE 实现——比纯 Python 快 10-100 倍 |
| 合并表 | "那个词表" | 训练时学到的字节对合并的有序列表——它就是 tokenizer 学到的知识本体 |

## 延伸阅读

- [OpenAI tiktoken source](https://github.com/openai/tiktoken) -- GPT-3.5/4 使用的 Rust BPE 实现
- [HuggingFace tokenizers](https://github.com/huggingface/tokenizers) -- 支持 BPE、WordPiece、Unigram 的 Rust tokenizer 库
- [Llama 3 paper (Meta, 2024)](https://arxiv.org/abs/2407.21783) -- 128K 词表和 tokenizer 训练的细节
- [SentencePiece (Kudo & Richardson, 2018)](https://arxiv.org/abs/1808.06226) -- 语言无关的分词
- [GPT-2 tokenizer source](https://github.com/openai/gpt-2/blob/master/src/encoder.py) -- 最初的字节到 Unicode 映射
