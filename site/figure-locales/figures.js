(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures.js"] = {
  "attention-matrix": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "attention matrix": "自注意力矩阵",
      "Interactive explanation for attention matrix.": "自注意力矩阵的交互讲解。",
      "SELF-ATTENTION  ·  Q · Kᵀ → SOFTMAX → · V": "自注意力 · Q · Kᵀ → SOFTMAX → · V",
      "KEYS →": "键 →",
      "QUERIES ↓": "查询 ↓",
      "CONTEXT VECTOR  =  Σ αⱼ · vⱼ": "上下文向量 = Σ αⱼ · vⱼ",
      "QUERY: \"it\"  ·  TOP KEY: \"it\"": "查询：“it” · 最高权重的键：“it”",
      "Self-attention matrix": "自注意力矩阵"
    },
    "patterns": [
      [
        "^QUERY: \"([a-z]+)\"  ·  TOP KEY: \"([a-z]+)\"$",
        "查询：“$1” · 最高权重的键：“$2”"
      ]
    ],
    "preserve": [
      {
        "text": "the",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "cat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "sat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "on",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "mat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "because",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "it",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "was",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "warm",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "and",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "sunny",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "transformer-block": {
    "text": {
      "feed-forward": "前馈网络",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "transformer block": "Transformer 块",
      "Interactive explanation for transformer block.": "Transformer 块的交互讲解。",
      "ONE TRANSFORMER BLOCK  ·  EMBED · MHA · NORM · FFN · NORM": "一个 Transformer 块 · 嵌入 · MHA · 归一化 · FFN · 归一化",
      "EMBED + POS": "嵌入 + 位置编码",
      "AFTER MHA": "MHA 之后",
      "+ RESIDUAL · NORM": "+ 残差 · 归一化",
      "AFTER FFN": "FFN 之后",
      "residual": "残差",
      "multi-head attn": "多头注意力",
      "residual + norm": "残差 + 归一化",
      "STAGE 3 / 4  ·  per-token MLP transform": "阶段 3 / 4 · 逐 token 执行 MLP 变换",
      "Transformer block data flow": "Transformer 块的数据流"
    },
    "patterns": [
      [
        "^STAGE (\\d+) / 4  ·  tokens query each other$",
        "阶段 $1 / 4 · token 相互查询"
      ],
      [
        "^STAGE (\\d+) / 4  ·  add residual, normalize$",
        "阶段 $1 / 4 · 加入残差并归一化"
      ],
      [
        "^STAGE\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ /\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ ·\\ \\ per\\-token\\ MLP\\ transform$",
        "阶段 $1 / $2 · 逐 token 执行 MLP 变换"
      ]
    ],
    "preserve": [
      {
        "text": "MHA",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "FFN",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "tokenizer-bpe": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "tokenizer bpe": "BPE 分词器",
      "Interactive explanation for tokenizer bpe.": "BPE 分词器的交互讲解。",
      "CORPUS": "语料",
      "SCAN PAIRS": "扫描相邻对",
      "MERGED TOKENS": "合并后的 token",
      "LEARNED MERGES": "已学到的合并",
      "VOCAB · 32": "词表 · 32",
      "MERGED  c + a  →  ca": "已合并  c + a → ca",
      "TOKENIZER LEARNED · LOOPING": "分词器已学成 · 循环播放",
      "BPE tokenizer training": "BPE 分词器训练"
    },
    "patterns": [
      [
        "^MERGED  ([\\s\\S]+)  →  ([\\s\\S]+)$",
        "已合并  $1 → $2"
      ],
      [
        "^COUNTING PAIRS  ·  step (\\d+)/(\\d+)$",
        "统计相邻对 · 第 $1/$2 步"
      ],
      [
        "^VOCAB\\ ·\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "词表 · $1"
      ]
    ],
    "preserve": [
      {
        "text": "the·",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "the",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "the + · →",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "cat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "attention-lookup": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "attention lookup": "注意力查询",
      "Interactive explanation for attention lookup.": "注意力查询的交互讲解。",
      "QUERY": "查询"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "SOFTMAX(qK⊤/√d)",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "embedding-arithmetic": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "embedding arithmetic": "嵌入向量运算",
      "Interactive explanation for embedding arithmetic.": "嵌入向量运算的交互讲解。",
      "EMBEDDING SPACE  ·  PCA(2) PROJECTION": "嵌入空间 · PCA(2) 投影",
      "Word vector arithmetic": "词向量运算"
    },
    "patterns": [
      [
        "^EMBEDDING\\ SPACE\\ \\ ·\\ \\ PCA\\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)\\ PROJECTION$",
        "嵌入空间 · PCA($1) 投影"
      ]
    ],
    "preserve": [
      {
        "text": "king − man + woman ≈ queen",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "cat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "dog",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "run",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "sit",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "apple",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "car",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "river",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "code",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "book",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "sky",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "fire",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "king",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "man",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "queen",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "woman",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "= QUEEN ✓",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "king − man",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "king − man + woman",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "king − man + woman  ≈  queen",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "embedding-projection": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "embedding projection": "嵌入投影",
      "Interactive explanation for embedding projection.": "嵌入投影的交互讲解。",
      "EMBEDDING SPACE · 2D PROJECTION": "嵌入空间 · 2D 投影"
    },
    "patterns": [
      [
        "^EMBEDDING\\ SPACE\\ ·\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)D\\ PROJECTION$",
        "嵌入空间 · $1D 投影"
      ]
    ],
    "preserve": [
      {
        "text": "king",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "queen",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "prince",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "duke",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "apple",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "banana",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "peach",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "grape",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "run",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "walk",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "jump",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "sit",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "kv-cache": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "kv cache": "KV 缓存",
      "Interactive explanation for kv cache.": "KV 缓存的交互讲解。",
      "CACHE GROWS LEFT → RIGHT · NEW TOKEN HIGHLIGHTED": "缓存从左向右增长 · 高亮显示新 token"
    },
    "patterns": [],
    "preserve": []
  },
  "loss-curve": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "loss curve": "损失曲线",
      "Interactive explanation for loss curve.": "损失曲线的交互讲解。",
      "LOSS": "损失",
      "STEP →": "步数 →",
      "loss=0.161": "损失=0.161"
    },
    "patterns": [
      [
        "^loss=([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "损失=$1"
      ]
    ],
    "preserve": []
  },
  "ngram-machine": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "ngram machine": "N-gram 模型",
      "Interactive explanation for ngram machine.": "N-gram 模型的交互讲解。",
      "CORPUS · BIGRAM WINDOW": "语料 · 二元词窗口",
      "SAMPLED FROM P(next | current)": "从 P(next | current) 采样",
      "TRANSITION TABLE": "转移表",
      "SAMPLING  ·  the": "正在采样 · the",
      "PHASE 2": "阶段 2",
      "PHASE 1": "阶段 1",
      "N-gram language model": "N-gram 语言模型"
    },
    "patterns": [
      [
        "^SAMPLING  ·  ([a-z ]+)$",
        "正在采样 · $1"
      ],
      [
        "^COUNTING BIGRAMS  ·  (\\d+) / (\\d+)$",
        "统计二元词 · $1 / $2"
      ],
      [
        "^PHASE\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "阶段 $1"
      ],
      [
        "^PHASE\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "阶段 $1"
      ]
    ],
    "preserve": [
      {
        "text": "the",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "cat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "sat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "on",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "mat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "dog",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "log",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "ate",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "the →",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "cat →",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "sat →",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "dog →",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "token-strip": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "token strip": "token 拆分",
      "Interactive explanation for token strip.": "token 拆分的交互讲解。",
      "TEXT": "文本",
      "WORDS": "词"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "the cat sat on the mat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "the",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "cat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "sat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "on",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "mat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "BPE",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "·cat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "·sat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "·the",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  }
};
