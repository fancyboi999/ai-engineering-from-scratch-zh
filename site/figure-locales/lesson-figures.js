(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["lesson-figures.js"] = {
  "gradient-descent": {
    "text": {
      "GRADIENT DESCENT": "梯度下降",
      "Each step moves downhill by the gradient times the learning rate. Too small and it crawls; too large and it overshoots and diverges. Training is the search for the rate in between.": "每一步沿梯度乘以学习率的方向下坡。太小就爬得极慢；太大会越过谷底直至发散。训练就是在两者之间寻找那个合适的学习率。",
      "final loss f(x) = 0.0319  ·  12 steps": "最终损失 f(x) = 0.0319  ·  12 步",
      "x ← x − lr · 2x   (loss f(x) = x²,  diverges when lr > 1)": "x ← x − lr · 2x   （损失 f(x) = x²，lr > 1 时发散）",
      "diverged": "发散",
      "converged": "收敛",
      "lr too large: each step overshoots the minimum and the loss explodes": "学习率过大：每步都越过最小值，损失爆炸"
    },
    "patterns": [
      [
        "^final loss f\\(x\\) = ([\\d.]+)  ·  (\\d+) steps$",
        "最终损失 f(x) = $1  ·  $2 步"
      ]
    ],
    "preserve": [
      {
        "text": "x = -0.179",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "x = -2.040",
        "reason": "梯度下降计算出的变量 x 与数值，不是英文散文"
      }
    ]
  },
  "precision-recall-threshold": {
    "text": {
      "PRECISION / RECALL": "精确率 / 召回率",
      "Grey is the negative class, blue the positive; the orange line is the threshold. Move it right and you predict positive less often: precision rises, recall falls. F1 is their harmonic mean, highest where the two curves cross.": "灰色是负类，蓝色是正类；橙线是阈值。右移阈值，判正的次数变少：精确率上升，召回率下降。F1 是两者的调和平均，在两条曲线交叉处最高。",
      "precision 0.86  ·  recall 0.86  ·  TP 86 · FP 14 · FN 14": "精确率 0.86  ·  召回率 0.86  ·  TP 86 · FP 14 · FN 14",
      "predict positive when score ≥ 0.50   ·   raise it for precision, lower it for recall": "得分 ≥ 0.50 时预测为正类   ·   提高阈值重视精确率，降低阈值重视召回率"
    },
    "patterns": [
      [
        "^precision ([\\d.]+)  ·  recall ([\\d.]+)  ·  (TP \\d+ · FP \\d+ · FN \\d+)$",
        "精确率 $1  ·  召回率 $2  ·  $3"
      ],
      [
        "^predict positive when score ≥ ([\\d.]+)   ·   raise it for precision, lower it for recall$",
        "得分 ≥ $1 时预测为正类   ·   提高阈值重视精确率，降低阈值重视召回率"
      ]
    ],
    "preserve": [
      {
        "text": "F1 = 0.859",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "F1 = 0.668",
        "reason": "F1 评分的数学标识与计算结果"
      },
      {
        "text": "F1 = 0.009",
        "reason": "F1 评分的数学标识与计算结果"
      }
    ]
  },
  "bias-variance": {
    "text": {
      "BIAS – VARIANCE": "偏差 – 方差",
      "Grey is training error, blue is test error. Simple models miss the signal (high bias); complex models fit the noise (high variance). Test error is their sum, lowest where the two pressures balance.": "灰色是训练误差，蓝色是测试误差。简单模型抓不住信号（高偏差）；复杂模型拟合了噪声（高方差）。测试误差是两者之和，在两股压力平衡处最低。",
      "sweet spot": "最佳区间",
      "· degree 6": "· 次数 6",
      "train err 1.33  ·  test err 2.60  ·  test min at degree 7": "训练误差 1.33  ·  测试误差 2.60  ·  测试误差在次数 7 时最小",
      "underfit · high bias": "欠拟合 · 高偏差",
      "overfit · high variance": "过拟合 · 高方差"
    },
    "patterns": [
      [
        "^· degree (\\d+)$",
        "· 次数 $1"
      ],
      [
        "^train err ([\\d.]+)  ·  test err ([\\d.]+)  ·  test min at degree (\\d+)$",
        "训练误差 $1  ·  测试误差 $2  ·  测试误差在次数 $3 时最小"
      ]
    ],
    "preserve": []
  },
  "softmax-temperature": {
    "text": {
      "entropy 1.69 bits  ·  balanced": "熵 1.69 比特  ·  均衡"
    },
    "patterns": [
      [
        "^entropy ([\\d.]+) bits  ·  balanced$",
        "熵 $1 比特  ·  均衡"
      ],
      [
        "^entropy ([\\d.]+) bits  ·  sharp / confident$",
        "熵 $1 比特  ·  尖锐／确信"
      ],
      [
        "^entropy ([\\d.]+) bits  ·  flat / random$",
        "熵 $1 比特  ·  平坦／随机"
      ]
    ],
    "preserve": [
      {
        "text": "cat",
        "reason": "类别名称是原始分类示例标签，公式与logits是计算字面量"
      },
      {
        "text": "dog",
        "reason": "类别名称是原始分类示例标签，公式与logits是计算字面量"
      },
      {
        "text": "fox",
        "reason": "类别名称是原始分类示例标签，公式与logits是计算字面量"
      },
      {
        "text": "owl",
        "reason": "类别名称是原始分类示例标签，公式与logits是计算字面量"
      },
      {
        "text": "elk",
        "reason": "类别名称是原始分类示例标签，公式与logits是计算字面量"
      },
      {
        "text": "softmax(zᵢ / T),  T = 1.00   ·   logits [3.1, 2.2, 1.5, 0.8, 0.1]",
        "reason": "类别名称是原始分类示例标签，公式与logits是计算字面量"
      },
      {
        "text": "softmax(zᵢ / T),  T = 0.10   ·   logits [3.1, 2.2, 1.5, 0.8, 0.1]",
        "reason": "softmax 公式与原始 logits 数组"
      },
      {
        "text": "softmax(zᵢ / T),  T = 3.00   ·   logits [3.1, 2.2, 1.5, 0.8, 0.1]",
        "reason": "softmax 公式与原始 logits 数组"
      }
    ]
  },
  "cross-entropy-loss": {
    "text": {
      "CROSS-ENTROPY LOSS": "交叉熵损失",
      "Cross-entropy charges −log of the probability the model put on the correct answer. Right and confident costs almost nothing; wrong and confident costs a fortune. That asymmetry is what pushes the model to be calibrated, not just correct.": "交叉熵按模型给正确答案的概率收取 −log 的代价。答对且自信几乎免费；答错且自信代价惨重。正是这种不对称推动模型学会校准，而不只是答对。",
      "nats": "奈特",
      "uncertain: moderate loss": "不确定：损失适中",
      "loss = −log(p_true),  p = 0.500   ·   p→1 gives 0, p→0 gives ∞": "loss = −log(p_true),  p = 0.500   ·   p→1 时趋向 0，p→0 时趋向 ∞",
      "confident and correct: loss near zero": "确信且正确：损失接近零",
      "confident and wrong: loss explodes": "确信但错误：损失爆炸"
    },
    "patterns": [
      [
        "^(loss = −log\\(p_true\\),  p = [\\d.]+)   ·   p→1 gives 0, p→0 gives ∞$",
        "$1   ·   p→1 时趋向 0，p→0 时趋向 ∞"
      ]
    ],
    "preserve": []
  },
  "l2-regularization": {
    "text": {
      "· 0% smaller": "· 缩小 0%",
      "λ ≈ 0: full-strength weights, risk of overfitting": "λ ≈ 0：权重未衰减，存在过拟合风险",
      "λ large: weights crushed toward 0, model underfits": "λ 过大：权重被压向 0，模型欠拟合",
      "λ shrinks every weight toward zero, trading fit for smoothness": "λ 将每个权重压向零，以拟合程度换取平滑性"
    },
    "patterns": [
      [
        "^· (\\d+)% smaller$",
        "· 缩小 $1%"
      ]
    ],
    "preserve": [
      {
        "text": "w1",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "w2",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "w3",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "w4",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "w5",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "w6",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "‖w‖ = 1.60",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "J(w) + λ‖w‖²   →   wᵢ ≈ wᵢ⁰ / (1 + λ),  λ = 0.00",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "‖w‖ = 0.15",
        "reason": "L2 正则化公式、权重范数与计算值"
      },
      {
        "text": "J(w) + λ‖w‖²   →   wᵢ ≈ wᵢ⁰ / (1 + λ),  λ = 10.00",
        "reason": "L2 正则化公式、权重范数与计算值"
      }
    ]
  },
  "lr-schedule": {
    "text": {
      "LR SCHEDULE": "学习率调度",
      "The learning rate rarely stays fixed. A short warmup avoids early instability; cosine or step decay then anneals the rate toward zero so late training settles into a good minimum.": "学习率很少一成不变。短暂的预热避开训练初期的不稳定；随后余弦或阶梯衰减把学习率退火到零，让训练后期稳稳落进一个好的极小值。",
      "warmup + cosine": "预热 + 余弦",
      "cosine": "余弦",
      "step decay": "阶梯衰减",
      "exponential": "指数衰减",
      "constant": "常数",
      "peak lr 0.500  ·  warmup 10% of steps  ·  1000 steps": "峰值学习率 0.500  ·  预热占总步数的 10%  ·  共 1000 步",
      "linear warmup → cosine decay to 0": "线性预热 → 余弦衰减至 0"
    },
    "patterns": [
      [
        "^peak lr ([\\d.]+)  ·  warmup (\\d+)% of steps  ·  (\\d+) steps$",
        "峰值学习率 $1  ·  预热占总步数的 $2%  ·  共 $3 步"
      ],
      [
        "^peak lr ([\\d.]+)  ·  (\\d+) steps$",
        "峰值学习率 $1  ·  共 $2 步"
      ]
    ],
    "preserve": [
      {
        "text": "lr = peak · ½(1 + cos(π·step/N))",
        "reason": "学习率调度的数学表达式，peak、step、N 为变量"
      },
      {
        "text": "lr = peak · 0.5^⌊step / (N/3)⌋",
        "reason": "学习率调度的数学表达式，peak、step、N 为变量"
      },
      {
        "text": "lr = peak · e^(−3·step/N)",
        "reason": "学习率调度的数学表达式，peak、step、N 为变量"
      },
      {
        "text": "lr = peak",
        "reason": "学习率调度的数学表达式，peak、step、N 为变量"
      }
    ]
  },
  "rope-explorer": {
    "text": {
      "ROTARY POSITION": "旋转位置编码（RoPE）",
      "RoPE rotates each pair of dimensions by an angle that grows with position. Low dimensions use high frequencies (rotate fast, encode nearby order); high dimensions use low frequencies (rotate slowly, encode long-range distance). Raising the base stretches every wavelength, extending usable context.": "RoPE 把每一对维度旋转一个随位置增长的角度。低维用高频（转得快，编码近距离顺序）；高维用低频（转得慢，编码长程距离）。调大底数会拉长所有波长，从而扩展可用上下文。",
      "position 16  ·  base 10,000  ·  4 of 64 dimension pairs shown (dark = low dim, fast)": "位置 16  ·  底数 10,000  ·  展示 4 个维度对（共 64 个；深色 = 低维，旋转快）",
      "θ(pos, i) = pos / base^(2i/d)   ·   low dims rotate fast, high dims slow": "θ(pos, i) = pos / base^(2i/d)   ·   低维旋转快，高维旋转慢"
    },
    "patterns": [
      [
        "^position (\\d+)  ·  base ([\\d,]+)  ·  4 of (\\d+) dimension pairs shown \\(dark = low dim, fast\\)$",
        "位置 $1  ·  底数 $2  ·  展示 4 个维度对（共 $3 个；深色 = 低维，旋转快）"
      ]
    ],
    "preserve": []
  },
  "kv-cache-sizer": {
    "text": {
      "dtype": "数据类型",
      "10% of one 80 GiB GPU": "占比 10%（单张 80 GiB GPU）",
      "2 · 32 layers · 8 kv-heads · 128 head-dim · 8,192 tokens · 8 batch · 2 B": "2 · 32 层 · 8 个 KV 头 · 128 维头 · 8,192 token · 8 批大小 · 2 B"
    },
    "patterns": [
      [
        "^(\\d+)% of one (\\d+) GiB GPU$",
        "占比 $1%（单张 $2 GiB GPU）"
      ],
      [
        "^⚠ exceeds (\\d+)% of one (\\d+) GiB GPU$",
        "⚠ 已超出：占比 $1%（单张 $2 GiB GPU）"
      ],
      [
        "^2 · (\\d+) layers · (\\d+) kv-heads · (\\d+) head-dim · ([\\d,]+) tokens · (\\d+) batch · (\\d+) B$",
        "2 · $1 层 · $2 个 KV 头 · $3 维头 · $4 token · $5 批大小 · $6 B"
      ]
    ],
    "preserve": [
      {
        "text": "8K",
        "reason": "保留容量单位及数据类型名称，确保与实际缓存字节计算一致"
      },
      {
        "text": "fp16 / bf16",
        "reason": "保留容量单位及数据类型名称，确保与实际缓存字节计算一致"
      },
      {
        "text": "fp8",
        "reason": "保留容量单位及数据类型名称，确保与实际缓存字节计算一致"
      },
      {
        "text": "int8",
        "reason": "保留容量单位及数据类型名称，确保与实际缓存字节计算一致"
      },
      {
        "text": "GiB",
        "reason": "保留容量单位及数据类型名称，确保与实际缓存字节计算一致"
      },
      {
        "text": "128K",
        "reason": "缓存序列长度的数量单位 K，不是英文文案"
      }
    ]
  },
  "scaling-laws": {
    "text": {
      "loss": "损失",
      "20 tokens/param  ·  near Chinchilla-optimal (~20)": "20 token/参数  ·  接近 Chinchilla 最优值（约 20）",
      "N = 1.0B params · D = 20B tokens · compute 6ND ≈ 119716P FLOPs": "N = 1.0B 参数 · D = 20B token · 计算量 6ND ≈ 119716P FLOPs"
    },
    "patterns": [
      [
        "^([\\d.]+[KMBPT]?) tokens/param  ·  near Chinchilla-optimal \\(~20\\)$",
        "$1 token/参数  ·  接近 Chinchilla 最优值（约 20）"
      ],
      [
        "^([\\d.]+[KMBPT]?) tokens/param  ·  under-trained: too few tokens$",
        "$1 token/参数  ·  训练不足：token 太少"
      ],
      [
        "^([\\d.]+[KMBPT]?) tokens/param  ·  over-trained: spend on params instead$",
        "$1 token/参数  ·  过度训练：应将预算转用于参数规模"
      ],
      [
        "^N = ([\\d.]+[KMBPT]?) params · D = ([\\d.]+[KMBPT]?) tokens · compute 6ND ≈ ([\\d.]+[KMBPT]?) FLOPs$",
        "N = $1 参数 · D = $2 token · 计算量 6ND ≈ $3 FLOPs"
      ]
    ],
    "preserve": []
  },
  "tokenizer-tradeoff": {
    "text": {
      "embedding params": "嵌入参数",
      "1.60 tokens/word  ·  a 1000-word doc ≈ 1600 tokens": "1.60 token/词  ·  一篇 1000 词文档约为 1600 个 token",
      "vocab 33K × dim 768 = embedding table  ·  bigger vocab → fewer tokens, larger table": "词表 33K × 维度 768 = 嵌入表  ·  词表越大 → token 越少，嵌入表越大"
    },
    "patterns": [
      [
        "^([\\d.]+) tokens/word  ·  a (\\d+)-word doc ≈ (\\d+) tokens$",
        "$1 token/词  ·  一篇 $2 词文档约为 $3 个 token"
      ],
      [
        "^vocab ([\\d.]+[KMBT]?) × dim (\\d+) = embedding table  ·  bigger vocab → fewer tokens, larger table$",
        "词表 $1 × 维度 $2 = 嵌入表  ·  词表越大 → token 越少，嵌入表越大"
      ]
    ],
    "preserve": [
      {
        "text": "25M",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "197K",
        "reason": "嵌入参数数量的 K、M、B 数量单位"
      },
      {
        "text": "201M",
        "reason": "嵌入参数数量的 K、M、B 数量单位"
      },
      {
        "text": "34M",
        "reason": "嵌入参数数量的 K、M、B 数量单位"
      },
      {
        "text": "1.1B",
        "reason": "嵌入参数数量的 K、M、B 数量单位"
      }
    ]
  },
  "sampling-decoder": {
    "text": {
      "temperature → top-k → top-p": "温度 → top-k → top-p",
      "4 of 10 tokens survive  ·  balanced": "保留 4 个 token（共 10 个）  ·  均衡",
      "softmax(z / T) → keep top-5 → keep smallest set with cumulative ≥ 0.90 → renormalize": "softmax(z / T) → 保留 top-5 → 保留累计概率 ≥ 0.90 的最小集合 → 重新归一化"
    },
    "patterns": [
      [
        "^(\\d+) of (\\d+) tokens survive  ·  balanced$",
        "保留 $1 个 token（共 $2 个）  ·  均衡"
      ],
      [
        "^(\\d+) of (\\d+) tokens survive  ·  low T: near-greedy$",
        "保留 $1 个 token（共 $2 个）  ·  低温度：接近贪心选择"
      ],
      [
        "^(\\d+) of (\\d+) tokens survive  ·  high T: wild$",
        "保留 $1 个 token（共 $2 个）  ·  高温度：随机性强"
      ],
      [
        "^softmax\\(z / T\\) → keep top-([\\d∞]+) → keep smallest set with cumulative ≥ ([\\d.]+) → renormalize$",
        "softmax(z / T) → 保留 top-$1 → 保留累计概率 ≥ $2 的最小集合 → 重新归一化"
      ]
    ],
    "preserve": [
      {
        "text": "the",
        "reason": "采样解码器中的词语为实际候选token；裁剪标记也属于可视化样例，不翻译输入词语"
      },
      {
        "text": "a",
        "reason": "采样解码器中的词语为实际候选token；裁剪标记也属于可视化样例，不翻译输入词语"
      },
      {
        "text": "an",
        "reason": "采样解码器中的词语为实际候选token；裁剪标记也属于可视化样例，不翻译输入词语"
      },
      {
        "text": "this",
        "reason": "采样解码器中的词语为实际候选token；裁剪标记也属于可视化样例，不翻译输入词语"
      },
      {
        "text": "that ·",
        "reason": "采样解码器中的词语为实际候选token；裁剪标记也属于可视化样例，不翻译输入词语"
      },
      {
        "text": "cut",
        "reason": "采样解码器中的词语为实际候选token；裁剪标记也属于可视化样例，不翻译输入词语"
      },
      {
        "text": "one ·",
        "reason": "采样解码器中的词语为实际候选token；裁剪标记也属于可视化样例，不翻译输入词语"
      },
      {
        "text": "some ·",
        "reason": "采样解码器中的词语为实际候选token；裁剪标记也属于可视化样例，不翻译输入词语"
      },
      {
        "text": "my ·",
        "reason": "采样解码器中的词语为实际候选token；裁剪标记也属于可视化样例，不翻译输入词语"
      },
      {
        "text": "our ·",
        "reason": "采样解码器中的词语为实际候选token；裁剪标记也属于可视化样例，不翻译输入词语"
      },
      {
        "text": "its ·",
        "reason": "采样解码器中的词语为实际候选token；裁剪标记也属于可视化样例，不翻译输入词语"
      },
      {
        "text": "a ·",
        "reason": "原始英文候选 token 和裁剪标记，不改变采样输入"
      },
      {
        "text": "an ·",
        "reason": "原始英文候选 token 和裁剪标记，不改变采样输入"
      },
      {
        "text": "this ·",
        "reason": "原始英文候选 token 和裁剪标记，不改变采样输入"
      },
      {
        "text": "that",
        "reason": "原始英文候选 token 和裁剪标记，不改变采样输入"
      },
      {
        "text": "one",
        "reason": "原始英文候选 token 和裁剪标记，不改变采样输入"
      },
      {
        "text": "some",
        "reason": "原始英文候选 token 和裁剪标记，不改变采样输入"
      },
      {
        "text": "my",
        "reason": "原始英文候选 token 和裁剪标记，不改变采样输入"
      },
      {
        "text": "our",
        "reason": "原始英文候选 token 和裁剪标记，不改变采样输入"
      },
      {
        "text": "its",
        "reason": "原始英文候选 token 和裁剪标记，不改变采样输入"
      }
    ]
  },
  "quantization": {
    "text": {
      "fp32 (32-bit)": "fp32（32 位）",
      "fp16 / bf16 (16-bit)": "fp16 / bf16（16 位）",
      "int8 (8-bit)": "int8（8 位）",
      "int4 (4-bit)": "int4（4 位）",
      "int2 (2-bit)": "int2（2 位）",
      "50% smaller than fp32  ·  quantization error: negligible": "比 fp32 缩小 50%  ·  量化误差：可忽略",
      "7.1B params · 16 bits = 2^16 levels per weight": "7.1B 参数 · 16 位 = 每个权重 2^16 个量化级别"
    },
    "patterns": [
      [
        "^(\\d+)% smaller than fp32  ·  quantization error: negligible$",
        "比 fp32 缩小 $1%  ·  量化误差：可忽略"
      ],
      [
        "^(\\d+)% smaller than fp32  ·  quantization error: < 1% perplexity hit$",
        "比 fp32 缩小 $1%  ·  量化误差：困惑度影响 < 1%"
      ],
      [
        "^(\\d+)% smaller than fp32  ·  quantization error: small with good schemes \\(GPTQ/AWQ\\)$",
        "比 fp32 缩小 $1%  ·  量化误差：使用合适方案（GPTQ/AWQ）时较小"
      ],
      [
        "^(\\d+)% smaller than fp32  ·  quantization error: large: needs care$",
        "比 fp32 缩小 $1%  ·  量化误差：较大，需要谨慎"
      ],
      [
        "^([\\d.]+[KMBT]?) params · (\\d+) bits = ([\\d.KMBT^]+) levels per weight$",
        "$1 参数 · $2 位 = 每个权重 $3 个量化级别"
      ]
    ],
    "preserve": [
      {
        "text": "GB",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "cosine-similarity": {
    "text": {
      "COSINE SIMILARITY": "余弦相似度",
      "Embeddings compare by angle, not distance. Cosine is 1 when two vectors point the same way, 0 when orthogonal (unrelated), and negative when opposed. Magnitude drops out, so a long document and a short query can still match.": "嵌入向量比的是角度，不是距离。两个向量同向时余弦为 1，正交（不相关）时为 0，相反时为负。模长被消掉了，所以长文档和短查询依然可以匹配。",
      "40°  ·  similar": "40°  ·  相似"
    },
    "patterns": [
      [
        "^(\\d+)°  ·  similar$",
        "$1°  ·  相似"
      ],
      [
        "^(\\d+)°  ·  loosely related$",
        "$1°  ·  弱相关"
      ],
      [
        "^(\\d+)°  ·  unrelated \\(orthogonal\\)$",
        "$1°  ·  不相关（正交）"
      ],
      [
        "^(\\d+)°  ·  opposite$",
        "$1°  ·  相反"
      ]
    ],
    "preserve": [
      {
        "text": "cos θ",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "rag-chunking": {
    "text": {
      "chunks": "个分块",
      "top-5 retrieval feeds 2,560 tokens into the prompt  ·  224 vectors to store": "top-5 检索向 prompt 输入 2,560 个 token  ·  需要存储 224 个向量",
      "chunks = ⌈(corpus − overlap) / (chunk − overlap)⌉  ·  corpus = 100K tokens": "chunks = ⌈(corpus − overlap) / (chunk − overlap)⌉  ·  语料 = 100K token"
    },
    "patterns": [
      [
        "^top-(\\d+) retrieval feeds ([\\d,]+) tokens into the prompt  ·  ([\\d.]+[KMBT]?) vectors to store$",
        "top-$1 检索向 prompt 输入 $2 个 token  ·  需要存储 $3 个向量"
      ],
      [
        "^(chunks = ⌈\\(corpus − overlap\\) / \\(chunk − overlap\\)⌉)  ·  corpus = ([\\d.]+[KMBT]?) tokens$",
        "$1  ·  语料 = $2 token"
      ]
    ],
    "preserve": []
  },
  "lora-params": {
    "text": {
      "% trainable": "% 可训练参数",
      "4.19M trainable of 1.07B frozen  ·  256x fewer gradients to store": "4.19M 可训练参数，1.07B 冻结参数  ·  需存储的梯度减少 256 倍",
      "ΔW = B·A,  A∈ℝ^{r×d}, B∈ℝ^{d×r}  →  2·d·r per matrix vs d²  =  2r/d = 0.391%": "ΔW = B·A,  A∈ℝ^{r×d}, B∈ℝ^{d×r}  →  每个矩阵 2·d·r，对比 d²  =  2r/d = 0.391%"
    },
    "patterns": [
      [
        "^([\\d.]+[KMBT]?) trainable of ([\\d.]+[KMBT]?) frozen  ·  (\\d+)x fewer gradients to store$",
        "$1 可训练参数，$2 冻结参数  ·  需存储的梯度减少 $3 倍"
      ],
      [
        "^(ΔW = B·A,  A∈ℝ\\^\\{r×d\\}, B∈ℝ\\^\\{d×r\\})  →  2·d·r per matrix vs d²  =  (2r/d = [\\d.]+%)$",
        "$1  →  每个矩阵 2·d·r，对比 d²  =  $2"
      ]
    ],
    "preserve": []
  }
};
