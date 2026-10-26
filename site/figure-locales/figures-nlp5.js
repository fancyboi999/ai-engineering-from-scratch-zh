(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-nlp5.js"] = {
  "n5-subword-merge": {
    "text": {
      "Motion reduced": "已减少动画",
      "SUBWORD TOKENIZATION": "子词分词",
      "pairs merge into tokens": "相邻字符对合并为 token",
      "Byte-pair encoding starts from characters and repeatedly merges the most frequent adjacent pair: (l,o) and (e,r) first, then (lo,w), then (low,er). Frequent words end up as single tokens while rare words split into familiar pieces, so no input is ever out of vocabulary.": "字节对编码从字符开始，反复合并频率最高的相邻对：先合并 (l,o) 和 (e,r)，再合并 (lo,w)，之后合并 (low,er)。常见词最终成为单个 token，罕见词则拆成常见片段，因此任何输入都不会落在词表之外。",
      "merge queue: (l,o) (e,r) (lo,w) (low,er)": "合并队列：(l,o) (e,r) (lo,w) (low,er)",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "low",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "lower",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      }
    ]
  },
  "n5-crosslingual-bridge": {
    "text": {
      "Motion reduced": "已减少动画",
      "CROSS-LINGUAL TRANSFER": "跨语言迁移",
      "one space, many languages": "同一空间，多种语言",
      "A single encoder pretrained across a hundred languages puts sentences with the same meaning near each other in one shared space. Fine-tune a task head on English labels and carry it across the bridge: it scores Urdu text with zero Urdu labels, and a few hundred target-language examples close most of the remaining gap.": "在一百种语言上预训练的单个编码器，会把含义相同的句子放在同一共享空间的邻近位置。先用英语标签微调任务头，再把它迁移到另一种语言：即使没有乌尔都语标签，也能对乌尔都语文本评分；再补几百个目标语言样本，就能弥合大部分剩余差距。",
      "fine-tuned task head": "微调后的任务头",
      "English · labeled": "英语 · 有标签",
      "Urdu · unlabeled": "乌尔都语 · 无标签",
      "shared space": "共享空间",
      "fine-tune here": "在此微调",
      "zero-shot here": "在此零样本迁移",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "n5-chunk-cuts": {
    "text": {
      "Motion reduced": "已减少动画",
      "CHUNKING FOR RAG": "RAG 分块",
      "same text, three cut rules": "同一文本，三种切分规则",
      "The document is identical in every row; only the cut points differ. Fixed windows are cheap but split mid-sentence (the marked cut), recursive splitting backs off from paragraph breaks to sentences to spaces, and semantic splitting cuts where adjacent-sentence similarity drops. Recursive 512-token chunks remain the benchmark default.": "每一行都是同一份文档，仅切分点不同。固定窗口成本低，却会在句中切开（图中已标记）；递归切分依次尝试段落、句子和空格边界；语义切分则在相邻句子相似度下降的位置切开。递归切分的 512-token 块仍是基准中的默认方案。",
      "same document, three ways to cut": "同一文档的三种切分方式",
      "fixed 512": "固定 512",
      "equal windows, cuts land mid-sentence": "等长窗口，切分点可能落在句中",
      "recursive": "递归切分",
      "try \\n\\n first, then . , then space": "先尝试 \\n\\n，再尝试句点，最后尝试空格",
      "semantic": "语义切分",
      "cut where sentence similarity drops": "在句子相似度下降处切分",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "n5-judge-gauge": {
    "text": {
      "Motion reduced": "已减少动画",
      "LLM AS JUDGE": "LLM 评审器",
      "rubric in, score out": "输入评分标准，输出分数",
      "A judge model reads the query, the retrieved context, and the answer, applies a rubric, and returns a score between 0 and 1. RAGAS, DeepEval, and G-Eval are all built on this loop; the trust work is freezing the judge version and auditing its bias toward long answers.": "评审模型读取查询、检索上下文和回答，按评分标准给出 0 到 1 之间的分数。RAGAS、DeepEval 和 G-Eval 都基于这一循环。建立可信度的关键是固定评审模型版本，并审计它偏好较长回答的倾向。",
      "query": "查询",
      "context": "上下文",
      "answer": "回答",
      "LLM judge": "LLM 评审器",
      "rubric: faithfulness": "评分标准：忠实度",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "n5-slot-tracker": {
    "text": {
      "Motion reduced": "已减少动画",
      "DIALOGUE STATE TRACKING": "对话状态跟踪",
      "the state is a dict": "状态用字典表示",
      "Three turns, three edits to one slot-value dictionary: price and area fill first, then a correction overwrites cheap with moderate, then cuisine arrives. Joint goal accuracy scores a turn only when every slot matches, which makes mid-dialogue corrections the hardest part of tracking.": "三轮对话对同一个槽位值字典进行三次编辑：先填入价格与区域，再把 cheap 修正为 moderate，最后补充菜系。联合目标准确率仅在每个槽位都匹配时才把该轮计为正确，因此对话中的中途修正是状态跟踪最难的部分。",
      "turn 1": "第 1 轮",
      "turn 2": "第 2 轮",
      "turn 3": "第 3 轮",
      "dialogue state": "对话状态",
      "price": "price（价格）",
      "area": "area（区域）",
      "cuisine": "cuisine（菜系）",
      "JGA: a turn counts only if every slot is right": "JGA：仅当全部槽位正确时，该轮才算正确",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "\"cheap place in the north\"",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "\"actually, make it moderate\"",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "\"and add Italian\"",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "cheap",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "moderate",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "north",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "italian",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      }
    ]
  },
  "n5-patch-stream": {
    "text": {
      "Motion reduced": "已减少动画",
      "VIT PATCHIFY": "ViT 图像分块",
      "an image becomes a sequence": "图像转为序列",
      "A vision transformer never convolves: the image is cut into fixed patches, each patch is flattened and linearly projected, and the patches queue up as tokens behind a learned [CLS] token. Position embeddings are the only memory of the original grid; from there it is the standard transformer encoder.": "视觉 transformer 不执行卷积：图像被切成固定分块，各块展平后线性投影，作为 token 排在可学习的 [CLS] token 后。位置嵌入是模型保留原始网格位置的唯一方式；之后就是标准的 transformer 编码器。",
      "image, 3 x 3 patches": "图像，3 x 3 个分块",
      "flatten + linearly project, add position embeddings": "展平后线性投影，再加入位置嵌入",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "[CLS]",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      }
    ]
  },
  "n5-mel-decode": {
    "text": {
      "Motion reduced": "已减少动画",
      "WHISPER PIPELINE": "Whisper 流水线",
      "spectrogram in, text out": "输入频谱图，输出文本",
      "Whisper hears with its eyes: the waveform becomes a log-mel spectrogram, the encoder reads spectrogram frames the way a ViT reads patches, and the decoder types the transcript one token at a time, steered by special tokens that select the language and the task.": "Whisper 用“眼睛”听声音：波形先变成对数梅尔频谱图，编码器像 ViT 读取图像块一样读取频谱帧，解码器再逐个 token 输出转录文本。用于选择语言和任务的特殊 token 会引导解码过程。",
      "audio · 16 kHz": "音频 · 16 kHz",
      "log-mel spectrogram · 80 bins": "对数梅尔频谱图 · 80 个频带",
      "encoder": "编码器",
      "decoder": "解码器",
      "decoder output, one token at a time": "解码器逐个输出 token",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "<|transcribe|>",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "The",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "sky",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "clear.",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      }
    ]
  },
  "n5-block-stack": {
    "text": {
      "Motion reduced": "已减少动画",
      "TRANSFORMER CAPSTONE": "Transformer 综合项目",
      "thirteen lessons, one model": "十三节课，一个模型",
      "The capstone stacks the whole phase into one decoder-only model: embeddings at the base, L repeated blocks of causal attention and a SwiGLU feed-forward, then a final norm and LM head that samples Shakespeare character by character. Small enough for a laptop, correct enough to scale.": "综合项目把整个阶段的内容堆叠为一个仅解码器模型：底部是嵌入，之后重复 L 次因果注意力与 SwiGLU 前馈块，最后经过归一化和语言模型输出头，逐字符采样莎士比亚文本。它小到笔记本就能运行，实现也正确到可以继续扩展。",
      "characters in (B, N)": "输入字符 (B, N)",
      "token + position embed": "token 嵌入 + 位置嵌入",
      "causal attn + SwiGLU": "因果注意力 + SwiGLU",
      "RMSNorm + LM head": "RMSNorm + 语言模型输出头",
      "lesson 04": "第 04 课",
      "lessons 03 + 05 + 07": "第 03 + 05 + 07 课",
      "lesson 05": "第 05 课",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "ROMEO:",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "speak!",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      }
    ]
  }
};
