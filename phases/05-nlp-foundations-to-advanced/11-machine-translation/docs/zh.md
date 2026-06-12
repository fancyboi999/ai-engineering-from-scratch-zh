# 机器翻译

> 翻译是养活了 NLP 研究三十年、如今还在继续养活它的那个任务。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 10（注意力机制）、Phase 5 · 04（GloVe、FastText、子词）
**预计时间：** ~75 分钟

## 问题背景

模型读一种语言的句子，产出另一种语言的句子。长度会变，词序会变。有些源词对应多个目标词，反之亦然。习语拒绝一对一映射。"I miss you" 在法语里是 "tu me manques"——字面意思是"你对我而言缺失了"。任何词级对齐在这面前都活不下来。

机器翻译这个任务，逼着 NLP 发明了编码器-解码器、注意力、transformer，最终催生了整个 LLM 范式。每一步前进的到来，都是因为翻译质量可衡量，而人机之间的差距又顽固。

这节课跳过历史课，直接教 2026 年能跑的流水线：预训练多语言编码器-解码器（NLLB-200 或 mBART）、子词分词、beam search、BLEU 和 chrF 评估，以及那几种至今仍会没被发现就上生产的翻车方式。

## 核心概念

![MT 流水线：分词 → 编码 → 带注意力解码 → 反分词](../assets/mt-pipeline.svg)

现代 MT 是一个在平行文本上训练的 transformer 编码器-解码器。编码器用源语言的分词方式读源句子。解码器一次一个子词地生成目标，通过交叉注意力（第 10 课）用上编码器的输出。解码用 beam search 来躲开贪心解码的陷阱。输出经过反分词、还原大小写，再拿参考译文打分。

三个操作层面的选择决定了真实世界里的 MT 质量。

- **分词器。** 在混合语言语料上训练的 SentencePiece BPE。跨语言共享词表，正是 NLLB 里 zero-shot 语言对成为可能的原因。
- **模型规模。** NLLB-200 distilled 600M 能塞进笔记本。NLLB-200 3.3B 是已发布的生产默认。54.5B 是研究上限。
- **解码。** 通用内容用束宽 4-5。加长度惩罚以免输出太短。需要术语一致性时用约束解码。

```figure
seq2seq-alignment
```

## 动手构建

### 第 1 步：一次预训练 MT 调用

```python
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

model_id = "facebook/nllb-200-distilled-600M"
tok = AutoTokenizer.from_pretrained(model_id, src_lang="eng_Latn")
model = AutoModelForSeq2SeqLM.from_pretrained(model_id)

src = "The cats are running."
inputs = tok(src, return_tensors="pt")

out = model.generate(
    **inputs,
    forced_bos_token_id=tok.convert_tokens_to_ids("fra_Latn"),
    num_beams=5,
    length_penalty=1.0,
    max_new_tokens=64,
)
print(tok.batch_decode(out, skip_special_tokens=True)[0])
```

```text
Les chats courent.
```

这里有三件事要紧。`src_lang` 告诉分词器用哪种文字和切分。`forced_bos_token_id` 告诉解码器生成哪种语言。两者都是 NLLB 专属的小技巧；mBART 和 M2M-100 用它们自己的约定，彼此不能互换。

### 第 2 步：BLEU 和 chrF

BLEU 衡量输出和参考之间的 n-gram 重叠。四种参考 n-gram 大小（1-4），精确率的几何平均，对太短输出加简短惩罚。分数在 [0, 100]。常用，但解读起来烦人：30 BLEU 是"能用"，40 是"不错"，50 是"卓越"，小于 1 BLEU 的差距是噪声。

chrF 衡量字符级 F 分。对形态丰富的语言更敏感，那些语言里 BLEU 会少算匹配。常和 BLEU 一起报。

```python
import sacrebleu

hypotheses = ["Les chats courent."]
references = [["Les chats courent."]]

bleu = sacrebleu.corpus_bleu(hypotheses, references)
chrf = sacrebleu.corpus_chrf(hypotheses, references)
print(f"BLEU: {bleu.score:.1f}  chrF: {chrf.score:.1f}")
```

永远用 `sacrebleu`。它把分词归一化，让分数跨论文可比。自己手写 BLEU 计算，就是误导性基准的来源。

### 三层评估体系（2026）

现代 MT 评估用三个互补的指标家族。交付时至少带两个。

- **启发式**（BLEU、chrF）。快、基于参考、可解释，对复述不敏感。用于历史对比和回归检测。
- **学习式**（COMET、BLEURT、BERTScore）。在人类判断上训练的神经模型；比较译文与源、参考之间的语义相似度。自 2023 年起 COMET 与 MT 研究的关联度最高，是 2026 年看重质量时的生产默认。
- **LLM 当裁判**（无参考）。让一个大模型给译文在流畅性、充分性、语气、文化恰当性上打分。当评分细则设计得好时，GPT-4 当裁判与人类的一致率约 80%。用于没有参考的开放式内容。

2026 年的实用栈：用 `sacrebleu` 算 BLEU 和 chrF，用 `unbabel-comet` 算 COMET，用一个被 prompt 的 LLM 做最终面向人的信号。在信任任何指标用于生产数据之前，先用 50-100 个人工标注样本校准它。

无参考指标（COMET-QE、BLEURT-QE、LLM 当裁判）让你能在没有参考的情况下评估译文，这对长尾语言对很重要——那些语言对压根没有参考译文。

### 第 3 步：生产里什么会崩

上面那条能跑的流水线，80% 的时候翻得流畅，剩下 20% 默默翻车。点名的翻车方式：

- **幻觉。** 模型编出源句子里没有的内容。在不熟悉的领域词汇上常见。症状：输出流畅，却声称源里没说过的事实。缓解：对领域术语做约束解码，对受监管内容人工复核，监控输出远长于输入的情况。
- **目标偏离（off-target）。** 模型翻成了错误的语言。NLLB 在罕见语言对上出奇地容易这样。缓解：核对 `forced_bos_token_id`，并始终对输出跑一个语言识别模型检查。
- **术语漂移。** "Sign up" 在文档 1 里成了 "s'inscrire"，在文档 2 里成了 "créer un compte"。对 UI 文本和面向用户的字符串，一致性比原始质量更重要。缓解：词表约束解码或后编辑词典。
- **礼貌等级不匹配。** 法语 "tu" vs "vous"、日语的敬语等级。模型挑训练里更常见的那个形式。对面向客户的内容，这通常是错的。缓解：如果模型支持，就在 prompt 前缀里加一个礼貌等级 token，或在仅含正式语体的语料上微调一个小模型。
- **短输入的长度爆炸。** 非常短的输入句子常产出过长的译文，因为长度惩罚在约 5 个源 token 以下会断崖式失效。缓解：设一个与源长度成正比的硬性最大长度上限。

### 第 4 步：为某个领域做微调

预训练模型是通才。法律、医学或游戏对白翻译，在领域平行数据上微调后会有可衡量的提升。配方并不奇特：

```python
from transformers import Trainer, TrainingArguments
from datasets import Dataset

pairs = [
    {"src": "The defendant pleaded guilty.", "tgt": "L'accusé a plaidé coupable."},
]

ds = Dataset.from_list(pairs)


def preprocess(ex):
    return tok(
        ex["src"],
        text_target=ex["tgt"],
        truncation=True,
        max_length=128,
        padding="max_length",
    )


ds = ds.map(preprocess, remove_columns=["src", "tgt"])

args = TrainingArguments(output_dir="out", per_device_train_batch_size=4, num_train_epochs=3, learning_rate=3e-5)
Trainer(model=model, args=args, train_dataset=ds).train()
```

几千条高质量平行样本，胜过几十万条嘈杂的网络爬取样本。训练数据的质量是生产里最大的那根杠杆。

## 实际使用

2026 年 MT 的生产栈：

| 用例 | 推荐起点 |
|---------|---------------------------|
| 任意到任意，200 种语言 | `facebook/nllb-200-distilled-600M`（笔记本）或 `nllb-200-3.3B`（生产） |
| 以英语为中心，高质量，50 种语言 | `facebook/mbart-large-50-many-to-many-mmt` |
| 短跑、便宜推理，英语-法语/德语/西班牙语 | Helsinki-NLP / Marian 模型 |
| 延迟敏感的浏览器端 | ONNX 量化的 Marian（~50 MB） |
| 极致质量，愿意付费 | 配翻译 prompt 的 GPT-4 / Claude / Gemini |

截至 2026 年，LLM 在好几个语言对上已经胜过专用 MT 模型，尤其是在习语内容和长上下文上。代价是每 token 的成本和延迟。当上下文长度、风格一致性、或靠 prompting 做领域适配比吞吐更重要时，挑 LLM。

## 拿去用

存为 `outputs/skill-mt-evaluator.md`：

```markdown
---
name: mt-evaluator
description: Evaluate a machine translation output for shipping.
version: 1.0.0
phase: 5
lesson: 11
tags: [nlp, translation, evaluation]
---

Given a source text and a candidate translation, output:

1. Automatic score estimate. BLEU and chrF ranges you would expect. State whether a reference is available.
2. Five-point human-verifiable check list: (a) content preservation (no hallucinations), (b) correct language, (c) register / formality match, (d) terminology consistency with glossary if provided, (e) no truncation or length explosion.
3. One domain-specific issue to probe. E.g., for legal: named entities and statute citations. For medical: drug names and dosages. For UI: placeholder variables `{name}`.
4. Confidence flag. "Ship" / "Ship with review" / "Do not ship". Tie to the severity of issues found in step 2.

Refuse to ship a translation without a language-ID check on output. Refuse to evaluate without a reference unless the user explicitly opts in to reference-free scoring (COMET-QE, BLEURT-QE). Flag any content over 1000 tokens as likely needing chunked translation.
```

## 练习

1. **简单。** 用 `nllb-200-distilled-600M` 把一段 5 句的英语段落翻成法语再翻回英语。测一测来回结果离原文有多近。你应该看到语义被保住、用词有漂移。
2. **中等。** 用 `fasttext lid.176` 或 `langdetect` 对译文输出实现一个语言识别检查。把它集成进 MT 调用，让目标偏离的生成在返回前被抓住。
3. **困难。** 在你选的一个 5000 对的领域语料上微调 `nllb-200-distilled-600M`。在留出集上测微调前后的 BLEU。报告哪类句子变好了、哪类退步了。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| BLEU | 翻译分数 | 带简短惩罚的 n-gram 精确率。[0, 100]。 |
| chrF | 字符 F 分 | 字符级 F 分。对形态丰富的语言更敏感。 |
| NMT | 神经 MT | 在平行文本上训练的 transformer 编码器-解码器。2017+ 的默认。 |
| NLLB | No Language Left Behind | Meta 的 200 语言 MT 模型家族。 |
| 约束解码 | 受控输出 | 强制特定 token 或 n-gram 在输出里出现/不出现。 |
| 幻觉 | 编造的内容 | 源句子不支持的模型输出。 |

## 延伸阅读

- [Costa-jussà et al. (2022). No Language Left Behind: Scaling Human-Centered Machine Translation](https://arxiv.org/abs/2207.04672) —— NLLB 论文。
- [Post (2018). A Call for Clarity in Reporting BLEU Scores](https://aclanthology.org/W18-6319/) —— 为什么 `sacrebleu` 是报 BLEU 唯一正确的方式。
- [Popović (2015). chrF: character n-gram F-score for automatic MT evaluation](https://aclanthology.org/W15-3049/) —— chrF 论文。
- [Hugging Face MT guide](https://huggingface.co/docs/transformers/tasks/translation) —— 实用的微调讲解。
