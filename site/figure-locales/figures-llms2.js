(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-llms2.js"] = {
  "weight-tying": {
    "text": {
      "WEIGHT TYING": "权重共享",
      "The input embedding maps each token id to a d-dimensional vector; the output projection maps a hidden vector back to a logit per vocabulary entry. Both are vocab×d matrices that play inverse roles, so many models tie them: the output layer reuses the transposed embedding. That removes a whole vocab×d_model block of parameters, a large saving when the vocabulary is tens of thousands of tokens wide.": "输入嵌入把每个 token id 映射成 d 维向量；输出投影把隐藏向量映射回每个词表条目的 logit。两者都是 vocab×d 的矩阵、扮演互逆角色，所以许多模型把它们绑定：输出层复用转置的嵌入矩阵。这省下整整一块 vocab×d_model 的参数——词表宽达几万 token 时是笔大数目。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "input embedding": "输入嵌入",
      "output projection": "输出投影",
      "tied: same V×d matrix, transposed": "绑定：复用同一个 V×d 矩阵的转置",
      "params saved": "节省的参数",
      "vocab 33K × dim 768 = one matrix instead of two · readout reuses the embedding": "词表 33K × 维度 768 = 一个矩阵代替两个 · 输出读取复用嵌入矩阵",
      "logits = h · Eᵀ   ·   saved = vocab × d_model = 33K × 768 = 25M": "logits = h · Eᵀ · 节省量 = vocab × d_model = 33K × 768 = 25M"
    },
    "patterns": [
      [
        "^vocab ([\\d.]+[KMB]?) × dim (\\d+) = one matrix instead of two · readout reuses the embedding$",
        "词表 $1 × 维度 $2 = 一个矩阵代替两个 · 输出读取复用嵌入矩阵"
      ],
      [
        "^logits = h · Eᵀ   ·   saved = vocab × d_model = ([\\d.]+[KMB]?) × (\\d+) = ([\\d.]+[KMB]?)$",
        "logits = h · Eᵀ · 节省量 = vocab × d_model = $1 × $2 = $3"
      ],
      [
        "^vocab\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)K\\ ×\\ dim\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ =\\ one\\ matrix\\ instead\\ of\\ two\\ ·\\ readout\\ reuses\\ the\\ embedding$",
        "词表 $1K × 维度 $2 = 一个矩阵代替两个 · 输出读取复用嵌入矩阵"
      ],
      [
        "^logits\\ =\\ h\\ ·\\ Eᵀ\\ \\ \\ ·\\ \\ \\ saved\\ =\\ vocab\\ ×\\ d_model\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)K\\ ×\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)M$",
        "logits = h · Eᵀ · 节省量 = vocab × d_model = $1K × $2 = $3M"
      ]
    ],
    "preserve": []
  },
  "paged-kv-cache": {
    "text": {
      "PAGED KV CACHE": "分页 KV 缓存",
      "A contiguous KV cache reserves the full maximum sequence length per request up front, so most of it sits empty (grey). PagedAttention stores the cache in fixed-size pages allocated on demand: only the final page is partly free (orange). Internal waste drops from max minus length to at most one page, which is why paged caches fit far more concurrent sequences on the same GPU.": "连续 KV 缓存为每个请求预留满额最大序列长度，大半空置（灰色）。PagedAttention 把缓存放进按需分配的定长页里：只有最后一页部分空闲（橙色）。内部浪费从「上限减实际长度」降到至多一页，这就是分页缓存能在同一块 GPU 上塞进多得多并发序列的原因。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "contiguous: reserve max length up front": "连续缓存：预先保留最大长度",
      "paged: 5 pages of 16, only the last partly free": "分页缓存：5 页，每页 16 个单元，仅末页部分空闲",
      "cells wasted (paged)": "个浪费单元（分页缓存）",
      "contiguous wastes 58 reserved cells · paged wastes only 10 (last page) · 38% less reserved memory": "连续缓存浪费 58 个预留单元 · 分页仅浪费 10 个（末页）· 预留内存减少 38%",
      "pages = ⌈seq / page⌉ = ⌈70 / 16⌉ = 5  ·  internal waste ≤ page − 1 per sequence, not max − seq": "pages = ⌈seq / page⌉ = ⌈70 / 16⌉ = 5 · 每个序列的内部浪费 ≤ page − 1，而非 max − seq"
    },
    "patterns": [
      [
        "^paged:\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ pages\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?),\\ only\\ the\\ last\\ partly\\ free$",
        "分页缓存：$1 页，每页 $2 个单元，仅末页部分空闲"
      ],
      [
        "^contiguous\\ wastes\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ reserved\\ cells\\ ·\\ paged\\ wastes\\ only\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\(last\\ page\\)\\ ·\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\ less\\ reserved\\ memory$",
        "连续缓存浪费 $1 个预留单元 · 分页仅浪费 $2 个（末页）· 预留内存减少 $3%"
      ],
      [
        "^pages\\ =\\ ⌈seq\\ /\\ page⌉\\ =\\ ⌈([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ /\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)⌉\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ ·\\ \\ internal\\ waste\\ ≤\\ page\\ −\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ per\\ sequence,\\ not\\ max\\ −\\ seq$",
        "pages = ⌈seq / page⌉ = ⌈$1 / $2⌉ = $3 · 每个序列的内部浪费 ≤ page − $4，而非 max − seq"
      ]
    ],
    "preserve": []
  },
  "rlhf-pipeline": {
    "text": {
      "RLHF PIPELINE": "RLHF 流水线",
      "RLHF runs in three stages. First supervised fine-tuning teaches the base model to follow instructions from human demonstrations. Then a reward model learns to score responses from preference pairs. Finally PPO optimizes the policy to maximize that reward while a KL penalty keeps it close to the SFT model so it does not drift into reward hacking.": "RLHF 分三个阶段。先用监督微调让基座模型从人类示范中学会遵循指令。再训练一个奖励模型，从偏好对中学会给回答打分。最后用 PPO 优化策略以最大化该奖励，同时 KL 惩罚把它拴在 SFT 模型附近，防止漂进奖励作弊。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "supervised fine-tune": "监督微调",
      "demonstrations →": "示范 →",
      "→ policy π₀": "→ 策略 π₀",
      "Reward": "奖励",
      "train reward model": "训练奖励模型",
      "preference pairs →": "偏好对 →",
      "→ reward r(x,y)": "→ 奖励 r(x,y)",
      "RL optimization": "强化学习优化",
      "prompts + reward →": "prompt + 奖励 →",
      "→ aligned policy π": "→ 对齐后的策略 π",
      "Stage 1 — SFT: fine-tune the base model on human-written demonstrations to get a starting policy.": "第 1 阶段 — SFT：用人工示范微调基础模型，得到初始策略。",
      "Stage 2 — Reward Model: train a model on chosen-vs-rejected pairs to score how good a response is.": "第 2 阶段 — 奖励模型：用优选与拒选回答对训练模型，为回答质量评分。",
      "Stage 3 — PPO: optimize the policy against the reward model with a KL penalty back to the SFT policy.": "第 3 阶段 — PPO：依照奖励模型优化策略，同时用相对 SFT 策略的 KL 惩罚限制偏离。",
      "SFT(demos) → RM(preferences) → PPO(maximize reward − β·KL[π ‖ π₀])": "SFT（示范）→ RM（偏好）→ PPO（最大化奖励 − β·KL[π ‖ π₀]）"
    },
    "patterns": [
      [
        "^Stage\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ —\\ SFT:\\ fine\\-tune\\ the\\ base\\ model\\ on\\ human\\-written\\ demonstrations\\ to\\ get\\ a\\ starting\\ policy\\.$",
        "第 $1 阶段 — SFT：用人工示范微调基础模型，得到初始策略。"
      ],
      [
        "^Stage\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ —\\ Reward\\ Model:\\ train\\ a\\ model\\ on\\ chosen\\-vs\\-rejected\\ pairs\\ to\\ score\\ how\\ good\\ a\\ response\\ is\\.$",
        "第 $1 阶段 — 奖励模型：用优选与拒选回答对训练模型，为回答质量评分。"
      ],
      [
        "^Stage\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ —\\ PPO:\\ optimize\\ the\\ policy\\ against\\ the\\ reward\\ model\\ with\\ a\\ KL\\ penalty\\ back\\ to\\ the\\ SFT\\ policy\\.$",
        "第 $1 阶段 — PPO：依照奖励模型优化策略，同时用相对 SFT 策略的 KL 惩罚限制偏离。"
      ]
    ],
    "preserve": [
      {
        "text": "SFT",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "PPO",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "dpo-loss": {
    "text": {
      "DPO LOSS": "DPO 损失",
      "DPO skips the separate reward model: it directly trains the policy so the chosen response outscores the rejected one, both measured relative to a frozen reference. The loss is −log σ of β times that margin. A positive margin (chosen ahead) drives the loss toward zero; a negative one pushes a large gradient. β controls how hard the implicit KL constraint pulls back toward the reference.": "DPO 跳过单独的奖励模型：直接训练策略，让 chosen 回答的得分超过 rejected，两者都相对一个冻结的参考模型度量。损失是 −log σ(β × 间隔)。正间隔（chosen 领先）把损失推向零；负间隔则推出大梯度。β 控制隐式 KL 约束往参考模型回拉的力度。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "DPO loss": "DPO 损失",
      "tie: loss ≈ 0.69 (−log ½ scaled by β)": "持平：损失 ≈ 0.69（−log ½，按 β 缩放）",
      "chosen ahead of rejected: loss small, model already prefers the right answer": "优选回答领先拒选回答：损失较小，模型已偏好正确答案",
      "rejected ahead of chosen: loss large, strong gradient to fix it": "拒选回答领先优选回答：损失较大，产生较强修正梯度"
    },
    "patterns": [
      [
        "^tie:\\ loss\\ ≈\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\(−log\\ ½\\ scaled\\ by\\ β\\)$",
        "持平：损失 ≈ $1（−log ½，按 β 缩放）"
      ]
    ],
    "preserve": [
      {
        "text": "L = −log σ( β · ( (logπ(yc) − logπref(yc)) − (logπ(yr) − logπref(yr)) ) )   ·   β = 0.30",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "L = −log σ( β · ( (logπ(yc) − logπref(yc)) − (logπ(yr) − logπref(yr)) ) )   ·   β = 0.05",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      },
      {
        "text": "L = −log σ( β · ( (logπ(yc) − logπref(yc)) − (logπ(yr) − logπref(yr)) ) )   ·   β = 1.00",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      }
    ]
  },
  "rmsnorm-vs-layernorm": {
    "text": {
      "RMSNORM vs LAYERNORM": "RMSNorm 与 LayerNorm",
      "Grey is the raw feature vector, blue the normalized output. LayerNorm subtracts the mean then divides by the standard deviation, recentering every vector to zero. RMSNorm skips the mean entirely and divides by the root-mean-square, so it is cheaper and keeps any constant shift. Add a shift and watch LayerNorm absorb it while RMSNorm lets it through.": "灰色是原始特征向量，蓝色是归一化输出。LayerNorm 先减均值再除以标准差，把每个向量重新对中到零。RMSNorm 完全跳过均值、只除以均方根，所以更便宜，且保留任何常数偏移。加一个偏移试试：LayerNorm 把它吸收掉，RMSNorm 放它通过。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "RMSNorm vs LayerNorm": "RMSNorm 与 LayerNorm",
      "divisor": "除数",
      "no mean subtraction: output mean 0.56 (shift survives) · cheaper, no centering": "不减均值：输出均值 0.56（保留平移）· 成本更低，不居中",
      "RMSNorm: xᵢ / sqrt(mean(x²) + ε)   ·   skips the mean, keeps the scale": "RMSNorm: xᵢ / sqrt(mean(x²) + ε) · 不减均值，只调整尺度",
      "LayerNorm: (xᵢ − mean) / sqrt(var + ε)   ·   center then scale": "LayerNorm: (xᵢ − mean) / sqrt(var + ε) · 先居中，再调整尺度"
    },
    "patterns": [
      [
        "^mean ([-\\d.]+) subtracted first: output mean ([-\\d.]+) \\(recentered to 0\\)$",
        "先减去均值 $1：输出均值 $2（重新居中到 0）"
      ],
      [
        "^std ([-\\d.]+)$",
        "标准差 $1"
      ],
      [
        "^no\\ mean\\ subtraction:\\ output\\ mean\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\(shift\\ survives\\)\\ ·\\ cheaper,\\ no\\ centering$",
        "不减均值：输出均值 $1（保留平移）· 成本更低，不居中"
      ]
    ],
    "preserve": [
      {
        "text": "RMSNorm",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "LayerNorm",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "RMS 1.86",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "differential-attention": {
    "text": {
      "DIFFERENTIAL ATTENTION": "差分注意力",
      "Differential attention computes two separate softmax maps and subtracts the second, scaled by a learned λ, from the first. Both maps carry the same broad attention noise, so the subtraction cancels it as common mode, while the genuine signal peak (token 2 here) survives. Raising λ subtracts more aggressively, sharpening the mass onto the relevant token instead of spreading it across irrelevant context.": "差分注意力算两张独立的 softmax 图，把第二张乘上学到的 λ 后从第一张里减去。两张图携带同样的弥散注意力噪声，相减把它当共模信号消掉，而真正的信号峰（这里是 token 2）幸存。调大 λ 减得更狠，注意力权重被收拢到相关 token 上，而不是摊在无关上下文里。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "map 1 (signal + noise)": "映射 1（信号 + 噪声）",
      "map1 − λ·map2 (denoised)": "map1 − λ·map2（去噪后）",
      "% mass on the true token": "% 概率质量集中在真实 token 上",
      "λ = 0.60: common-mode noise cancels, the real peak stands out": "λ = 0.60：共模噪声被抵消，真实峰值突出",
      "Attn = softmax(Q₁K₁) − λ · softmax(Q₂K₂)   ·   shared noise subtracts, signal remains": "Attn = softmax(Q₁K₁) − λ · softmax(Q₂K₂) · 抵消共有噪声，保留信号",
      "λ small: little subtracted, broad noise survives": "λ 较小：减去的分量少，广泛噪声仍保留",
      "λ large: aggressive cancellation, signal sharpened": "λ 较大：抵消更强，信号更突出"
    },
    "patterns": [
      [
        "^map\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\(signal\\ \\+\\ noise\\)$",
        "映射 $1（信号 + 噪声）"
      ],
      [
        "^λ\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?):\\ common\\-mode\\ noise\\ cancels,\\ the\\ real\\ peak\\ stands\\ out$",
        "λ = $1：共模噪声被抵消，真实峰值突出"
      ]
    ],
    "preserve": []
  },
  "sliding-window-attention": {
    "text": {
      "SLIDING WINDOW ATTENTION": "滑动窗口注意力",
      "Rows are queries, columns are keys. Blue cells are the pairs a token actually attends to; grey cells are inside the causal triangle but cut by the window; white is the future, always masked. Full causal attention fills the whole lower triangle at O(N²) cost. A sliding window of width w keeps only the banded diagonal, dropping to O(N·w) so long context stays affordable.": "行是 query，列是 key。蓝格是 token 真正注意的对子；灰格在因果三角形之内但被窗口切掉；白色是永远被掩蔽的未来。完整因果注意力以 O(N²) 填满整个下三角。宽度 w 的滑动窗口只留对角带，降到 O(N·w)，长上下文才付得起。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "of 136 attended pairs": "对参与注意力计算（共 136 对）",
      "window w = 4 · each token sees the previous 3 plus itself · 57% fewer pairs than full causal attention": "窗口 w = 4 · 每个 token 关注前 3 个及自身 · 比完整因果注意力少 57% 的配对",
      "attend(i, j) iff 0 ≤ i − j < w   ·   cost O(N·w) vs full O(N²) when w ≪ N": "attend(i, j) 当且仅当 0 ≤ i − j < w · w ≪ N 时，成本为 O(N·w)，完整注意力为 O(N²)"
    },
    "patterns": [
      [
        "^of\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ attended\\ pairs$",
        "对参与注意力计算（共 $1 对）"
      ],
      [
        "^window\\ w\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ·\\ each\\ token\\ sees\\ the\\ previous\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ plus\\ itself\\ ·\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\ fewer\\ pairs\\ than\\ full\\ causal\\ attention$",
        "窗口 w = $1 · 每个 token 关注前 $2 个及自身 · 比完整因果注意力少 $3% 的配对"
      ],
      [
        "^attend\\(i,\\ j\\)\\ iff\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ≤\\ i\\ −\\ j\\ <\\ w\\ \\ \\ ·\\ \\ \\ cost\\ O\\(N·w\\)\\ vs\\ full\\ O\\(N²\\)\\ when\\ w\\ ≪\\ N$",
        "attend(i, j) 当且仅当 $1 ≤ i − j < w · w ≪ N 时，成本为 O(N·w)，完整注意力为 O(N²)"
      ]
    ],
    "preserve": []
  },
  "expert-capacity": {
    "text": {
      "EXPERT CAPACITY": "专家容量",
      "Each expert in an MoE layer gets a fixed number of token slots, set by the capacity factor. Routing is uneven, so popular experts overflow and the extra tokens are dropped (orange above the dashed line). Set the factor too low and you drop many tokens; set it too high and lightly-loaded experts sit idle, wasting padded compute. The factor is tuned to keep both small.": "MoE 层的每个专家有固定的 token 槽位数，由容量因子决定。路由不均匀，热门专家会溢出，多出的 token 被丢弃（虚线上方的橙色）。因子设太低丢 token 多；设太高则轻载专家闲置、白费填充算力。这个因子就是为了把两头都压小而调的。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "tokens dropped": "个 token 被丢弃",
      "capacity 10 / expert · dropped 6 (overflow, orange) · idle 22 slots (wasted compute) · balanced": "每个专家容量 10 · 丢弃 6 个（溢出，橙色）· 闲置 22 个槽位（浪费计算）· 均衡",
      "capacity = ⌊capacity_factor · tokens / experts⌋ = ⌊1.25 · 64 / 8⌋ = 10": "容量 = ⌊capacity_factor · tokens / experts⌋ = ⌊1.25 · 64 / 8⌋ = 10"
    },
    "patterns": [
      [
        "^capacity (\\d+) / expert · dropped (\\d+) \\(overflow, orange\\) · idle (\\d+) slots \\(wasted compute\\) · too tight$",
        "每个专家容量 $1 · 丢弃 $2 个（溢出，橙色）· 闲置 $3 个槽位（浪费计算）· 容量过紧"
      ],
      [
        "^capacity (\\d+) / expert · dropped (\\d+) \\(overflow, orange\\) · idle (\\d+) slots \\(wasted compute\\) · too loose$",
        "每个专家容量 $1 · 丢弃 $2 个（溢出，橙色）· 闲置 $3 个槽位（浪费计算）· 容量过松"
      ],
      [
        "^capacity\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ /\\ expert\\ ·\\ dropped\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\(overflow,\\ orange\\)\\ ·\\ idle\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ slots\\ \\(wasted\\ compute\\)\\ ·\\ balanced$",
        "每个专家容量 $1 · 丢弃 $2 个（溢出，橙色）· 闲置 $3 个槽位（浪费计算）· 均衡"
      ],
      [
        "^capacity\\ =\\ ⌊capacity_factor\\ ·\\ tokens\\ /\\ experts⌋\\ =\\ ⌊([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ·\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ /\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)⌋\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "容量 = ⌊capacity_factor · tokens / experts⌋ = ⌊$1 · $2 / $3⌋ = $4"
      ]
    ],
    "preserve": []
  },
  "swiglu-ffn": {
    "text": {
      "SWIGLU FEED-FORWARD": "SwiGLU 前馈层",
      "A plain FFN runs the input through one matrix and a ReLU: a hard kink at zero. SwiGLU splits into two paths from the same input, a value x·W and a gate swish(x·V), and multiplies them. The gate smoothly scales the value up or down per coordinate, giving the network a soft, learnable on-off switch that modern open models prefer over a flat ReLU.": "普通 FFN 把输入过一个矩阵加 ReLU：零点处一个硬拐角。SwiGLU 从同一输入分出两条路——值 x·W 和门 swish(x·V)——再相乘。门按坐标平滑地放大或缩小值，给网络一个柔和、可学习的开关，这正是现代开源模型弃用平直 ReLU 的原因。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "SwiGLU (gated)": "SwiGLU（门控）",
      "ReLU (plain)": "ReLU（普通）",
      "output": "输出",
      "value path 1.20 × gate swish(0.96) = 0.69  →  0.83": "数值路径 1.20 × 门控 swish(0.96) = 0.69 → 0.83",
      "SwiGLU: (x·W) ⊙ swish(x·V)   ·   the gate smoothly modulates the value": "SwiGLU: (x·W) ⊙ swish(x·V) · 门控平滑调节数值",
      "ReLU FFN: max(0, x·W)   ·   a hard cutoff, no second path": "ReLU FFN: max(0, x·W) · 硬截断，没有第二条路径"
    },
    "patterns": [
      [
        "^plain FFN: ReLU\\(([-\\d.]+)\\) = ([-\\d.]+) \\(no gate\\)$",
        "普通 FFN：ReLU($1) = $2（无门控）"
      ],
      [
        "^value\\ path\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ×\\ gate\\ swish\\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ →\\ \\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "数值路径 $1 × 门控 swish($2) = $3 → $4"
      ],
      [
        "^ReLU\\ FFN:\\ max\\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?),\\ x·W\\)\\ \\ \\ ·\\ \\ \\ a\\ hard\\ cutoff,\\ no\\ second\\ path$",
        "ReLU FFN: max($1, x·W) · 硬截断，没有第二条路径"
      ]
    ],
    "preserve": []
  }
};
