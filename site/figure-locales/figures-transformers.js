(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-transformers.js"] = {
  "word-vector-arithmetic": {
    "text": {
      "WORD VECTOR ARITHMETIC": "词向量运算",
      "Word2Vec arranges words so that relationships become directions. The vector from man to king is the same as woman to queen, so subtracting man and adding woman to king lands almost exactly on queen. Meaning becomes geometry, and analogy becomes vector addition.": "Word2Vec 把词排布成关系即方向。从 man 到 king 的向量与从 woman 到 queen 的相同，所以 king 减 man 加 woman 几乎正好落在 queen 上。语义变成几何，类比变成向量加法。",
      "result lands at (3.0, 4.0)  ·  distance to \"queen\" 0.00  ·  match": "结果位于 (3.0, 4.0)  ·  距离“queen”0.00  ·  匹配",
      "king − man + woman ≈ queen   ·   the same offset (man→king) carries woman→queen": "king − man + woman ≈ queen   ·   相同偏移 (man→king) 也使 woman→queen"
    },
    "patterns": [
      [
        "^result lands at \\(([-\\d.]+), ([-\\d.]+)\\)  ·  distance to \"queen\" ([\\d.]+)  ·  match$",
        "结果位于 ($1, $2)  ·  距离“queen”$3  ·  匹配"
      ],
      [
        "^result lands at \\(([-\\d.]+), ([-\\d.]+)\\)  ·  distance to \"queen\" ([\\d.]+)$",
        "结果位于 ($1, $2)  ·  距离“queen”$3"
      ]
    ],
    "preserve": [
      {
        "text": "man",
        "reason": "词向量运算的词语是原始向量词表键，翻译会改变演示输入"
      },
      {
        "text": "woman",
        "reason": "词向量运算的词语是原始向量词表键，翻译会改变演示输入"
      },
      {
        "text": "king",
        "reason": "词向量运算的词语是原始向量词表键，翻译会改变演示输入"
      },
      {
        "text": "queen",
        "reason": "词向量运算的词语是原始向量词表键，翻译会改变演示输入"
      }
    ]
  },
  "attention-heatmap": {
    "text": {
      "ATTENTION HEATMAP": "注意力热力图",
      "Each query token scores every key token by dot product, divides by the temperature, then softmaxes the row so the weights sum to one. Darker cells take more attention. Lower temperature sharpens onto a single key; higher temperature spreads the focus.": "每个 query token 与每个 key token 做点积打分，除以温度，再对整行 softmax 使权重和为一。颜色越深注意力越多。温度越低越聚焦在单个 key 上；温度越高注意力越分散。",
      "rows = queries, columns = keys  ·  each row softmaxes to 1  ·  balanced": "行 = query，列 = key  ·  每行经过 softmax 后总和为 1  ·  均衡",
      "A = softmax(QKᵀ / T),  T = 1.00   ·   cell opacity = attention weight": "A = softmax(QKᵀ / T),  T = 1.00   ·   单元格不透明度 = 注意力权重"
    },
    "patterns": [
      [
        "^rows = queries, columns = keys  ·  each row softmaxes to 1  ·  balanced$",
        "行 = query，列 = key  ·  每行经过 softmax 后总和为 1  ·  均衡"
      ],
      [
        "^rows = queries, columns = keys  ·  each row softmaxes to 1  ·  sharp / peaked$",
        "行 = query，列 = key  ·  每行经过 softmax 后总和为 1  ·  尖锐／集中"
      ],
      [
        "^rows = queries, columns = keys  ·  each row softmaxes to 1  ·  diffuse / blurred$",
        "行 = query，列 = key  ·  每行经过 softmax 后总和为 1  ·  分散／模糊"
      ],
      [
        "^(A = softmax\\(QKᵀ / T\\),  T = [\\d.]+)   ·   cell opacity = attention weight$",
        "$1   ·   单元格不透明度 = 注意力权重"
      ]
    ],
    "preserve": [
      {
        "text": "The",
        "reason": "注意力热力图的词语为原始 token 序列，保留以对应注意力矩阵"
      },
      {
        "text": "cat",
        "reason": "注意力热力图的词语为原始 token 序列，保留以对应注意力矩阵"
      },
      {
        "text": "sat",
        "reason": "注意力热力图的词语为原始 token 序列，保留以对应注意力矩阵"
      },
      {
        "text": "on",
        "reason": "注意力热力图的词语为原始 token 序列，保留以对应注意力矩阵"
      },
      {
        "text": "the",
        "reason": "注意力热力图的词语为原始 token 序列，保留以对应注意力矩阵"
      },
      {
        "text": "mat",
        "reason": "注意力热力图的词语为原始 token 序列，保留以对应注意力矩阵"
      }
    ]
  },
  "bpe-merge": {
    "text": {
      "step 0 of 10  ·  vocab 11 symbols  ·  24 tokens across corpus": "第 0 步，共 10 步  ·  词表含 11 个符号  ·  语料共 24 个 token",
      "next merge: \"e\" + \"s\" (freq 9)": "下次合并：“e” + “s”（频次 9）",
      "no pair occurs twice — merging stops": "没有任何相邻对出现两次，停止合并"
    },
    "patterns": [
      [
        "^step (\\d+) of (\\d+)  ·  vocab (\\d+) symbols  ·  (\\d+) tokens across corpus$",
        "第 $1 步，共 $2 步  ·  词表含 $3 个符号  ·  语料共 $4 个 token"
      ],
      [
        "^next merge: \"([^\"]+)\" \\+ \"([^\"]+)\" \\(freq (\\d+)\\)$",
        "下次合并：“$1” + “$2”（频次 $3）"
      ]
    ],
    "preserve": [
      {
        "text": "l · o · w · _   (×5)",
        "reason": "BPE演示中的字母、分隔符与词频是原始语料，不能翻译词语"
      },
      {
        "text": "l · o · w · e · r · _   (×2)",
        "reason": "BPE演示中的字母、分隔符与词频是原始语料，不能翻译词语"
      },
      {
        "text": "n · e · w · e · s · t · _   (×6)",
        "reason": "BPE演示中的字母、分隔符与词频是原始语料，不能翻译词语"
      },
      {
        "text": "w · i · d · e · s · t · _   (×3)",
        "reason": "BPE演示中的字母、分隔符与词频是原始语料，不能翻译词语"
      },
      {
        "text": "low_   (×5)",
        "reason": "不同合并步的原始 BPE 语料分片，不改变演示输入"
      },
      {
        "text": "low · e · r · _   (×2)",
        "reason": "不同合并步的原始 BPE 语料分片，不改变演示输入"
      },
      {
        "text": "newest_   (×6)",
        "reason": "不同合并步的原始 BPE 语料分片，不改变演示输入"
      },
      {
        "text": "wi · d · est_   (×3)",
        "reason": "不同合并步的原始 BPE 语料分片，不改变演示输入"
      }
    ]
  },
  "softmax-attention-scaling": {
    "text": {
      "SOFTMAX SCALING": "Softmax 缩放",
      "Dot products grow with the head dimension, so without scaling the scores get large and the softmax saturates onto one token, killing the gradient. Dividing by the square root of d_k cancels that growth and keeps the attention distribution calibrated across any dimension.": "点积随头维度增长，不缩放的话分数会变大、softmax 饱和到单个 token 上，梯度随之消失。除以 √d_k 恰好抵消这种增长，让注意力分布在任何维度下都保持校准。",
      "scaled  (÷ √d_k)": "缩放（÷ √d_k）",
      "unscaled": "不缩放",
      "on top token": "分配给最主要 token",
      "scaled by 1/√d_k: distribution stays calibrated  ·  entropy 2.54 bits": "按 1/√d_k 缩放：分布保持适度分散  ·  熵 2.54 比特"
    },
    "patterns": [
      [
        "^scaled by 1/√d_k: distribution stays calibrated  ·  entropy ([\\d.]+) bits$",
        "按 1/√d_k 缩放：分布保持适度分散  ·  熵 $1 比特"
      ],
      [
        "^scaled by 1/√d_k: softmax saturated, gradients vanish  ·  entropy ([\\d.]+) bits$",
        "按 1/√d_k 缩放：softmax 饱和，梯度消失  ·  熵 $1 比特"
      ],
      [
        "^unscaled: distribution stays calibrated  ·  entropy ([\\d.]+) bits$",
        "未缩放：分布保持适度分散  ·  熵 $1 比特"
      ],
      [
        "^unscaled: softmax saturated, gradients vanish  ·  entropy ([\\d.]+) bits$",
        "未缩放：softmax 饱和，梯度消失  ·  熵 $1 比特"
      ],
      [
        "^softmax\\(QKᵀ\\),  variance grows with d_k = (\\d+)$",
        "softmax(QKᵀ)，方差随 d_k = $1 增大"
      ]
    ],
    "preserve": [
      {
        "text": "softmax(QKᵀ / √d_k),  d_k = 64,  √d_k = 8.0",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "softmax(QKᵀ / √d_k),  d_k = 8,  √d_k = 2.8",
        "reason": "softmax 缩放公式与头维度计算值"
      },
      {
        "text": "softmax(QKᵀ / √d_k),  d_k = 256,  √d_k = 16.0",
        "reason": "softmax 缩放公式与头维度计算值"
      }
    ]
  },
  "multihead-split": {
    "text": {
      "d_model": "模型维度 d_model",
      "num_heads": "头数 num_heads",
      "MULTI-HEAD SPLIT": "多头拆分",
      "Multi-head attention splits the model dimension into equal slices, one per head, so the head count must divide d_model evenly. Each head attends in its own subspace; the slices concatenate back to d_model, so adding heads costs nothing in total width.": "多头注意力把模型维度切成等宽的片，每头一片，所以头数必须整除 d_model。每个头在自己的子空间里做注意力；各片拼接回 d_model，因此加头不增加总宽度。",
      "8 heads × d_head 64": "8 个头 × d_head 64",
      "each head sees a 64-dim slice  ·  total params unchanged: 8 × 64 = 512": "每个头读取一个 64 维切片  ·  总参数量不变：8 × 64 = 512"
    },
    "patterns": [
      [
        "^(\\d+) heads × d_head (\\d+)$",
        "$1 个头 × d_head $2"
      ],
      [
        "^each head sees a (\\d+)-dim slice  ·  total params unchanged: (\\d+ × \\d+ = \\d+)$",
        "每个头读取一个 $1 维切片  ·  总参数量不变：$2"
      ],
      [
        "^(\\d+) is not divisible by (\\d+)$",
        "$1 不能被 $2 整除"
      ],
      [
        "^pick a head count that divides d_model evenly: ([\\d, ]+)$",
        "请选择能整除 d_model 的头数：$1"
      ],
      [
        "^(d_head = d_model / num_heads = \\d+ / \\d+) \\(not integer\\)$",
        "$1（不是整数）"
      ]
    ],
    "preserve": [
      {
        "text": "d_model = 512",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "d_head = d_model / num_heads = 512 / 8 = 64",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "d_model = 64",
        "reason": "多头维度的公式与参数标识 d_model、d_head、num_heads"
      },
      {
        "text": "d_head = d_model / num_heads = 64 / 8 = 8",
        "reason": "多头维度的公式与参数标识 d_model、d_head、num_heads"
      },
      {
        "text": "d_model = 1024",
        "reason": "多头维度的公式与参数标识 d_model、d_head、num_heads"
      },
      {
        "text": "d_head = d_model / num_heads = 1024 / 8 = 128",
        "reason": "多头维度的公式与参数标识 d_model、d_head、num_heads"
      },
      {
        "text": "d_head = d_model / num_heads = 1024 / 1 = 1024",
        "reason": "多头维度的公式与参数标识 d_model、d_head、num_heads"
      },
      {
        "text": "d_head = d_model / num_heads = 1024 / 32 = 32",
        "reason": "多头维度的公式与参数标识 d_model、d_head、num_heads"
      }
    ]
  },
  "transformer-residual": {
    "text": {
      "TRANSFORMER BLOCK": "transformer 块",
      "A transformer block is two sublayers: self-attention, then a feed-forward network, each wrapped in add-and-norm. The dashed lines are the residual skips that carry the input x forward and add it back after each sublayer. Those skips are what let hundreds of blocks stack without the gradient dying on the way down.": "一个 transformer 块 是两个子层：自注意力，然后前馈网络，各自包在 残差相加与归一化 里。虚线是把输入 x 带到前面、在每个子层之后加回去的残差捷径。正是这些捷径让数百个块 堆起来，梯度也不会在下行途中死掉。",
      "Transformer Block": "transformer 块",
      "on": "开启",
      "off": "关闭",
      "self-attention": "自注意力",
      "add & norm": "相加并归一化",
      "x in": "x 输入",
      "x out": "x 输出",
      "residual on: the input adds back after each sublayer, so gradients flow straight through": "残差开启：每个子层后重新加回输入，使梯度可以直接流过",
      "x → x + Attention(Norm(x)) → x + FFN(Norm(x))   ·   the + is the skip connection": "x → x + Attention(Norm(x)) → x + FFN(Norm(x))   ·   + 表示跳跃连接",
      "residual off: deep stacks of these blocks stop training — gradients vanish": "残差关闭：深层堆叠停止学习，梯度消失",
      "一个 transformer block 是两个子层：自注意力，然后前馈网络，各自包在 add-and-norm 里。虚线是把输入 x 带到前面、在每个子层之后加回去的残差捷径。正是这些捷径让几百个 block 堆起来，梯度也不会在下行途中死掉。": "一个 transformer 块 是两个子层：自注意力，然后前馈网络，各自包在 残差相加与归一化 里。虚线是把输入 x 带到前面、在每个子层之后加回去的残差捷径。正是这些捷径让数百个块 堆起来，梯度也不会在下行途中死掉。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "FFN",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "causal-mask": {
    "text": {
      "CAUSAL MASK": "因果掩码",
      "A causal mask sets every future score to negative infinity before the softmax, so each token attends only to itself and the tokens before it. The grey upper triangle is the forbidden future. This single constraint is what lets a transformer generate left to right without peeking ahead.": "因果掩码在 softmax 之前把所有未来位置的分数设为负无穷，使每个 token 只能注意自己和之前的 token。灰色上三角就是被禁止的未来。仅凭这一条约束，transformer 就能从左到右生成而不偷看后文。",
      "28 of 49 positions attend  ·  21 masked  ·  token i sees tokens 0..i": "28 个位置可参与注意力（共 49 个）  ·  21 个被屏蔽  ·  token i 可见 token 0..i",
      "mask[i][j] = −∞ when j > i  →  softmax sends future weights to 0  (lower triangle = causal)": "当 j > i 时 mask[i][j] = −∞  →  softmax 令未来位置的权重为 0  （下三角 = 因果）"
    },
    "patterns": [
      [
        "^(\\d+) of (\\d+) positions attend  ·  (\\d+) masked  ·  token i sees tokens 0\\.\\.i$",
        "$1 个位置可参与注意力（共 $2 个）  ·  $3 个被屏蔽  ·  token i 可见 token 0..i"
      ]
    ],
    "preserve": []
  },
  "flash-attention-memory": {
    "text": {
      "FLASH ATTENTION MEMORY": "Flash Attention 显存",
      "Standard attention writes the full N×N score matrix to memory, so it grows with the square of the sequence length and quickly dominates. FlashAttention computes attention in tiles and never materializes that matrix, so its memory grows linearly. The two curves separate fast: at long context the saving is orders of magnitude.": "标准注意力要把完整的 N×N 分数矩阵写进显存，随序列长度平方增长，很快成为大头。FlashAttention 分块计算注意力，从不物化那个矩阵，显存只线性增长。两条曲线很快分开：长上下文下节省达数量级。",
      "less memory": "内存更少",
      "N = 4,096  ·  standard (orange) 32 MB  ·  flash (blue) 1.0 MB": "N = 4,096  ·  标准实现（橙色）32 MB  ·  FlashAttention（蓝色）1.0 MB",
      "standard materializes the full N×N scores: O(N²)  ·  flash tiles and never stores it: O(N)": "标准实现物化完整的 N×N 分数：O(N²)  ·  FlashAttention 分块计算且不存储该矩阵：O(N)"
    },
    "patterns": [
      [
        "^N = ([\\d,]+)  ·  standard \\(orange\\) ([\\d.]+ [KMG]?B)  ·  flash \\(blue\\) ([\\d.]+ [KMG]?B)$",
        "N = $1  ·  标准实现（橙色）$2  ·  FlashAttention（蓝色）$3"
      ]
    ],
    "preserve": [
      {
        "text": "32x",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "4.0x",
        "reason": "内存缩减的数值倍数 x，不是英文文案"
      },
      {
        "text": "2048x",
        "reason": "内存缩减的数值倍数 x，不是英文文案"
      }
    ]
  },
  "gqa-kv-sharing": {
    "text": {
      "GQA KV-SHARING": "GQA KV 共享",
      "Every query head keeps its own projection, but several can share one key-value head. One kv per query is full multi-head attention; one kv for all is multi-query; a few groups in between is grouped-query attention. Fewer kv heads shrink the cache by the ratio of query to kv heads while keeping most of the quality.": "每个 query 头保留自己的投影，但几个头可以共享一个 key-value 头。一个 query 配一个 kv 是完整多头注意力；全部共享一个 kv 是 多查询注意力（MQA）；中间分几组就是 分组查询注意力（GQA）。kv 头越少，缓存就按 query 头与 kv 头之比缩小，效果大体保持。",
      "2 kv heads": "2 个 KV 头",
      "8 query heads": "8 个 query 头",
      "smaller kv-cache": "KV 缓存更小",
      "GQA (4 queries per kv)  ·  8 query heads → 2 kv heads": "GQA（每个 KV 对应 4 个 query）  ·  8 个 query 头 → 2 个 KV 头",
      "kv-cache reduction = query_heads / kv_heads = 8 / 2 = 4.00x": "KV 缓存缩减倍数 = query_heads / kv_heads = 8 / 2 = 4.00x",
      "每个 query 头保留自己的投影，但几个头可以共享一个 key-value 头。一个 query 配一个 kv 是完整多头注意力；全部共享一个 kv 是 multi-query；中间分几组就是 grouped-query attention。kv 头越少，缓存就按 query 头与 kv 头之比缩小，效果大体保持。": "每个 query 头保留自己的投影，但几个头可以共享一个 key-value 头。一个 query 配一个 kv 是完整多头注意力；全部共享一个 kv 是 多查询注意力（MQA）；中间分几组就是 分组查询注意力（GQA）。kv 头越少，缓存就按 query 头与 kv 头之比缩小，效果大体保持。"
    },
    "patterns": [
      [
        "^(\\d+) kv heads?$",
        "$1 个 KV 头"
      ],
      [
        "^(\\d+) query heads$",
        "$1 个 query 头"
      ],
      [
        "^GQA \\((\\d+) queries per kv\\)  ·  (\\d+) query heads → (\\d+) kv heads$",
        "GQA（每个 KV 对应 $1 个 query）  ·  $2 个 query 头 → $3 个 KV 头"
      ],
      [
        "^MHA \\(one kv per query\\)  ·  (\\d+) query heads → (\\d+) kv heads$",
        "MHA（每个 query 对应一个 KV）  ·  $1 个 query 头 → $2 个 KV 头"
      ],
      [
        "^MQA \\(all queries share one kv\\)  ·  (\\d+) query heads → (\\d+) kv heads$",
        "MQA（全部 query 共享一个 KV）  ·  $1 个 query 头 → $2 个 KV 头"
      ],
      [
        "^kv-cache reduction = (query_heads / kv_heads = \\d+ / \\d+ = [\\d.]+x)$",
        "KV 缓存缩减倍数 = $1"
      ]
    ],
    "preserve": [
      {
        "text": "4.0x",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "1.0x",
        "reason": "KV 缓存缩减的数值倍数 x，不是英文文案"
      },
      {
        "text": "16x",
        "reason": "KV 缓存缩减的数值倍数 x，不是英文文案"
      }
    ]
  }
};
