(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-nlp2.js"] = {
  "edit-distance": {
    "text": {
      "EDIT DISTANCE": "编辑距离",
      "Levenshtein distance fills a table where each cell is the cheapest way to turn one prefix into another using insert, delete, and substitute. Every cell takes the minimum of its three neighbors, so the bottom-right corner is the distance for the whole strings. Tracing back the choices recovers the actual edit path, which is how spell-checkers and translation metrics align text.": "Levenshtein 距离填一张表，每格是用插入、删除、替换把一个前缀变成另一个的最低代价。每格取三个邻居的最小值，右下角就是整串的距离。回溯这些选择能还原出实际的编辑路径——拼写检查器和翻译指标就是这样对齐文本的。",
      "edits": "编辑次数"
    },
    "patterns": [
      [
        "^\"([A-Za-z]+)\" → \"([A-Za-z]+)\"  ·  highlighted cells are the minimum-edit path  ·  bottom-right is the distance$",
        "\"$1\" → \"$2\" · 高亮网格表示最少编辑路径 · 右下角是编辑距离"
      ],
      [
        "^D\\[i\\]\\[j\\] = min\\( D\\[i-1\\]\\[j\\]\\+1 del, D\\[i\\]\\[j-1\\]\\+1 ins, D\\[i-1\\]\\[j-1\\]\\+\\[a≠b\\] sub \\)$",
        "D[i][j] = min( D[i-1][j]+1 删除, D[i][j-1]+1 插入, D[i-1][j-1]+[a≠b] 替换 )"
      ]
    ],
    "preserve": [
      {
        "text": "kitten → sitting",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "flaw → lawn",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "sunday → saturday",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "book → back",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      }
    ]
  },
  "bow-tfidf": {
    "text": {},
    "patterns": [
      [
        "^\"([A-Za-z]+)\" appears in (\\d+) of (\\d+) docs  ·  in every doc: idf 0, weight collapses$",
        "\"$1\" 出现在 $3 篇文档中的 $2 篇 · 每篇都有：idf 为 0，权重降为零"
      ],
      [
        "^\"([A-Za-z]+)\" appears in (\\d+) of (\\d+) docs  ·  idf ([\\d.]+)$",
        "\"$1\" 出现在 $3 篇文档中的 $2 篇 · idf $4"
      ],
      [
        "^\"([A-Za-z]+)\" appears in (\\d+) of (\\d+) docs  ·  rare: high idf lifts its weight$",
        "\"$1\" 出现在 $3 篇文档中的 $2 篇 · 较罕见：较高 idf 提高其权重"
      ]
    ],
    "preserve": [
      {
        "text": "the",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "cat",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "sat",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "mat",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "dog",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "ran",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "fox",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "tf-idf = tf · log(N / df) = tf · log(3 / 3) = tf · 0.000",
        "reason": "TF-IDF 数学公式与实际计算值，原样保留。"
      },
      {
        "text": "tf-idf = tf · log(N / df) = tf · log(3 / 2) = tf · 0.405",
        "reason": "TF-IDF 数学公式与实际计算值，原样保留。"
      },
      {
        "text": "tf-idf = tf · log(N / df) = tf · log(3 / 1) = tf · 1.099",
        "reason": "TF-IDF 数学公式与实际计算值，原样保留。"
      }
    ]
  },
  "sentiment-logits": {
    "text": {
      "SENTIMENT LOGITS": "情感 logits",
      "A linear text classifier scores each word with a learned weight, sums them with a bias into a single logit, then squashes it through the sigmoid into a probability. Positive weights push toward positive sentiment, negative weights pull the other way. The decision flips at probability one half, where the summed logit crosses zero.": "线性文本分类器给每个词一个学到的权重，加偏置求和得到单个 logit，再过 sigmoid 压成概率。正权重推向正面情感，负权重往反方向拉。决策在概率一半处翻转，也就是 logit 之和过零的地方。",
      "positive": "正向"
    },
    "patterns": [
      [
        "^summed logit ([\\d.−-]+)  ·  sigmoid → negative  ·  blue lifts, orange lowers$",
        "logit 总和 $1 · sigmoid → 负向 · 蓝色增加，橙色降低"
      ],
      [
        "^summed logit ([\\d.−-]+)  ·  sigmoid → positive  ·  blue lifts, orange lowers$",
        "logit 总和 $1 · sigmoid → 正向 · 蓝色增加，橙色降低"
      ],
      [
        "^logit = bias \\+ Σ wᵢ = ([\\d.−-]+)   ·   P\\(positive\\) = σ\\(logit\\) = 1 / \\(1 \\+ e\\^−logit\\)$",
        "logit = bias + Σ wᵢ = $1 · P(正向) = σ(logit) = 1 / (1 + e^−logit)"
      ]
    ],
    "preserve": [
      {
        "text": "great",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "not",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "terrible",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "okay",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      }
    ]
  },
  "ner-bio-tagging": {
    "text": {
      "NER BIO TAGGING": "NER BIO 标注",
      "Named-entity recognition is framed as per-token tagging. The BIO scheme marks the first token of an entity with B-TYPE, every continuation token with I-TYPE, and all other tokens with O. This lets a sequence labeler express multi-word entities and exact boundaries: \"New York\" becomes B-LOC then I-LOC, distinct from two separate single-word locations.": "命名实体识别被表述为逐 token 打标。BIO 方案给实体首 token 标 B-类型，后续 token 标 I-类型，其余都标 O。这让序列标注器能表达多词实体和精确边界：\"New York\" 是 B-LOC 接 I-LOC，与两个独立的单词地名截然不同。"
    },
    "patterns": [
      [
        "^entity span \"([^\"]+)\" tagged as ([A-Z]+)  ·  B = begin, I = inside, O = outside$",
        "实体片段 \"$1\" 标记为 $2 · B = 开始，I = 内部，O = 外部"
      ],
      [
        "^BIO: first token of an entity gets B-TYPE, continuation tokens get I-TYPE, everything else is O$",
        "BIO：实体首个 token 标为 B-TYPE，后续 token 标为 I-TYPE，其余标为 O"
      ]
    ],
    "preserve": [
      {
        "text": "Barack Obama (PER)",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "New York (LOC)",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "Barack (PER)",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "Barack",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "B-PER",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "Obama",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "I-PER",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "visited",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "New",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "York",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "last",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "week",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "B-LOC",
        "reason": "技术标识、公式或实体标签，保持原样。"
      },
      {
        "text": "I-LOC",
        "reason": "技术标识、公式或实体标签，保持原样。"
      }
    ]
  },
  "rnn-unroll": {
    "text": {
      "RNN UNROLLED": "RNN 按时间展开",
      "A recurrent network is one cell applied at every time step, sharing the same weights. Unrolled across time it becomes a chain: each cell folds the new input into the previous hidden state with tanh, then passes the result forward. The final state has seen the whole sequence, which is also why long sequences make the gradient hard to carry back.": "循环网络是同一个 cell 在每个时间步复用同一份权重。沿时间展开就成了链：每个 cell 用 tanh 把新输入折进上一个隐藏状态，再传向前方。最终状态看过整个序列——这也是长序列让梯度难以传回去的原因。"
    },
    "patterns": [
      [
        "^sequence length (\\d+)  ·  state passes left to right  ·  final h(\\d+) = ([\\d.−-]+)$",
        "序列长度 $1 · 状态从左向右传递 · 最终 h$2 = $3"
      ],
      [
        "^(h_t = tanh\\(W · h_\\{t-1\\} \\+ U · x_t\\)   ·   W = [\\d.]+, U = [\\d.]+)  \\(same weights every step\\)$",
        "$1（每步共享相同权重）"
      ]
    ],
    "preserve": []
  },
  "lstm-gates": {
    "text": {
      "LSTM GATES": "LSTM 门控",
      "The LSTM cell state is a memory the gates edit. The forget gate erases part of the old state, the input gate writes part of a new candidate, and the two add to form the next cell state. The output gate then controls how much of that state leaks out as the hidden vector. Gates near zero or one let the cell hold a value for many steps without the gradient vanishing.": "LSTM 的 cell state 是一块由门控编辑的记忆。遗忘门擦除旧状态的一部分，输入门写入新候选的一部分，两者相加构成下一个 cell state。输出门再控制这块状态有多少作为隐藏向量漏出去。门贴近零或一时，cell 能在许多步里保住一个值而梯度不消失。",
      "f·c (kept)": "f·c（保留部分）",
      "i·g (written)": "i·g（写入部分）"
    },
    "patterns": [
      [
        "^forget keeps (\\d+)% of old state  ·  input writes (\\d+)% of candidate  ·  output exposes (\\d+)%$",
        "遗忘门保留 $1% 旧状态 · 输入门写入 $2% 候选值 · 输出门暴露 $3%"
      ]
    ],
    "preserve": [
      {
        "text": "h_t = o·tanh",
        "reason": "数学公式和变量保持原样。"
      },
      {
        "text": "c_t = f · c_{t-1} + i · g  =  0.70·1.0 + 0.50·0.8 = 1.10   ·   h_t = o · tanh(c_t)",
        "reason": "LSTM 状态更新的完整数学公式，原样保留数字与变量。"
      },
      {
        "text": "c_t = f · c_{t-1} + i · g  =  0.00·1.0 + 0.50·0.8 = 0.40   ·   h_t = o · tanh(c_t)",
        "reason": "LSTM 状态更新的完整数学公式，原样保留数字与变量。"
      },
      {
        "text": "c_t = f · c_{t-1} + i · g  =  1.00·1.0 + 0.50·0.8 = 1.40   ·   h_t = o · tanh(c_t)",
        "reason": "LSTM 状态更新的完整数学公式，原样保留数字与变量。"
      },
      {
        "text": "c_t = f · c_{t-1} + i · g  =  1.00·1.0 + 0.00·0.8 = 1.00   ·   h_t = o · tanh(c_t)",
        "reason": "LSTM 状态更新的完整数学公式，原样保留数字与变量。"
      },
      {
        "text": "c_t = f · c_{t-1} + i · g  =  1.00·1.0 + 1.00·0.8 = 1.80   ·   h_t = o · tanh(c_t)",
        "reason": "LSTM 状态更新的完整数学公式，原样保留数字与变量。"
      }
    ]
  },
  "seq2seq-alignment": {
    "text": {
      "SEQ2SEQ ALIGNMENT": "Seq2Seq 对齐",
      "Attention gives the decoder a soft alignment over the source. Each target token reads a weighted blend of every encoder state, and those weights softmax to one across the source row. Here \"maison\" attends to \"house\" and \"rouge\" to \"red\", so the off-diagonal cells reveal the reordering that translation needs. Sharper weights pick one source word; flatter weights blend several.": "注意力给解码器一份对源句的软对齐。每个目标 token 读取所有编码器状态的加权混合，权重沿源句一行 softmax 归一。这里 \"maison\" 注意 \"house\"、\"rouge\" 注意 \"red\"，偏离对角线的格子揭示了翻译所需的语序重排。权重越尖锐越锁定单个源词；越平坦越混合多个。"
    },
    "patterns": [
      [
        "^rows = target tokens, columns = source tokens  ·  each row softmaxes to 1  ·  diagonal-off cells show reordering$",
        "行 = 目标 token，列 = 源 token · 每行 softmax 后和为 1 · 非对角线网格显示词序重排"
      ],
      [
        "^(context_t = Σ_s align\\[t\\]\\[s\\] · encoder_s)   ·   align = softmax over source for each target token$",
        "$1 · align 为每个目标 token 在源序列上计算的 softmax"
      ]
    ],
    "preserve": [
      {
        "text": "maison",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "rouge",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "the",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      },
      {
        "text": "red",
        "reason": "模型名、结构化输出字面量或按 token 展示的英文输入样本保留原样。"
      },
      {
        "text": "house",
        "reason": "NLP 分词、实体标注、跨语言对齐或模型生成的原始示例数据，不改变训练/演示语义。"
      }
    ]
  },
  "ngram-backoff": {
    "text": {
      "of n-grams seen": "的 n-gram 已观测"
    },
    "patterns": [
      [
        "^(\\d+)-gram: ([\\d.KMB]+) observed of ([\\d.KMB]+) possible  ·  more context, fewer counts$",
        "$1-gram：$3 种可能中观测到 $2 种 · 上下文越长，计数越稀疏"
      ],
      [
        "^P\\(w \\| history of n-1\\) needs counts of length-n grams  ·  V\\^n = (\\d+)\\^(\\d+) = ([\\d.KMB]+) possible$",
        "P(w | 前 n-1 项历史) 需要长度为 n 的片段计数 · V^n = $1^$2 = $3 种可能"
      ],
      [
        "^(\\d+)-gram: ([\\d.KMBT]+) observed of ([\\d.KMBT]+) possible  ·  unigram: no context, but every count dense$",
        "$1-gram：$3 种可能中观测到 $2 种 · 一元模型没有上下文，但每项计数都稠密"
      ],
      [
        "^(\\d+)-gram: ([\\d.KMBT]+) observed of ([\\d.KMBT]+) possible  ·  severe sparsity: most contexts never seen, back off to lower n$",
        "$1-gram：$3 种可能中观测到 $2 种 · 极度稀疏：大部分上下文从未出现，需回退到较低 n"
      ],
      [
        "^P\\(w \\| history of n-1\\) needs counts of length-n grams  ·  V\\^n = (\\d+)\\^(\\d+) = ([\\d.KMBT]+) possible$",
        "P(w | 前 n-1 项历史) 需要长度为 n 的片段计数 · V^n = $1^$2 = $3 种可能"
      ]
    ],
    "preserve": []
  }
};
