(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-multimodal.js"] = {
  "modality-projection": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "MODALITY PROJECTION": "模态投影",
      "drag to align the pair": "拖动以对齐配对点",
      "A separate image encoder and text encoder land in their own spaces, so a matched pair starts pointing in different directions. A learned projection maps both into one shared d-dimensional space, and training rotates the matched vectors together until their cosine approaches one. Once aligned, a single distance compares across modalities.": "独立的图像编码器与文本编码器把输入放在各自的空间里，因此一个匹配图文对最初指向不同方向。可学习投影将二者映射到同一个 d 维共享空间，训练使匹配向量逐渐转向同一方向，直到余弦接近 1。对齐后，就可以用同一种距离跨模态比较。",
      "image": "图像",
      "text": "文本",
      "cosine": "余弦",
      "angle between projections 64°  ·  misaligned: separate subspaces": "投影夹角 64° · 尚未对齐：位于不同子空间",
      "enc_img(x) → ℝ^d ← enc_txt(y),  train to maximize cos(z_img, z_txt) for matched pairs": "enc_img(x) → ℝ^d ← enc_txt(y)，训练使匹配对的 cos(z_img, z_txt) 最大化"
    },
    "patterns": [
      [
        "^angle between projections (\\d+)°  ·  partly aligned$",
        "投影夹角 $1° · 部分对齐"
      ],
      [
        "^angle between projections (\\d+)°  ·  aligned: the matched pair points the same way$",
        "投影夹角 $1° · 已对齐：匹配对指向同一方向"
      ],
      [
        "^angle\\ between\\ projections\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)°\\ \\ ·\\ \\ misaligned:\\ separate\\ subspaces$",
        "投影夹角 $1° · 尚未对齐：位于不同子空间"
      ]
    ],
    "preserve": []
  },
  "cross-attention-fusion": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "CROSS-ATTENTION FUSION": "交叉注意力融合",
      "drag the query and sharpness": "拖动 query 与注意力尖锐程度",
      "In a vision-language model, each text token is a query that attends across the image patch keys. The grid is one attention map: rows are text tokens, columns are image patches, and each row softmaxes to one. The content words like \"bird\" concentrate onto the patches that contain the object, which is how language grounds itself in pixels.": "在视觉语言模型中，每个文本 token 都作为 query，关注各个图像分块的 key。网格表示一个注意力映射：行是文本 token，列是图像分块，每行经过 softmax 后总和为 1。像“bird”这样的实义词会将注意力集中在包含对象的分块上，语言因此能够落到具体像素。",
      "attention sharpness": "注意力尖锐程度",
      "\"bird\" puts 23% of its attention on patch 4  ·  rows = text queries, columns = image patches": "“bird”将 23% 的注意力放在分块 4 上 · 行 = 文本 query，列 = 图像分块",
      "A = softmax(Q_text · Kᵀ_image),  rows sum to 1   ·   higher sharpness peaks each query onto its patch": "A = softmax(Q_text · Kᵀ_image)，各行之和为 1 · 尖锐程度越高，query 越集中于对应分块"
    },
    "patterns": [
      [
        "^\"(red|bird|branch)\" puts (\\d+)% of its attention on patch (\\d+)  ·  rows = text queries, columns = image patches$",
        "“$1”将 $2% 的注意力放在分块 $3 上 · 行 = 文本 query，列 = 图像分块"
      ],
      [
        "^\"a\" puts (\\d+)% of its attention on patch (\\d+)  ·  rows = text queries, columns = image patches$",
        "“a”将 $1% 的注意力放在分块 $2 上 · 行 = 文本 query，列 = 图像分块"
      ],
      [
        "^\"bird\"\\ puts\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\ of\\ its\\ attention\\ on\\ patch\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ ·\\ \\ rows\\ =\\ text\\ queries,\\ columns\\ =\\ image\\ patches$",
        "“bird”将 $1% 的注意力放在分块 $2 上 · 行 = 文本 query，列 = 图像分块"
      ],
      [
        "^A\\ =\\ softmax\\(Q_text\\ ·\\ Kᵀ_image\\),\\ \\ rows\\ sum\\ to\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ \\ ·\\ \\ \\ higher\\ sharpness\\ peaks\\ each\\ query\\ onto\\ its\\ patch$",
        "A = softmax(Q_text · Kᵀ_image)，各行之和为 $1 · 尖锐程度越高，query 越集中于对应分块"
      ]
    ],
    "preserve": [
      {
        "text": "red",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "bird",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "branch",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "a",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "vq-codebook": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "VQ CODEBOOK": "VQ 码本",
      "drag the codebook size": "拖动码本大小",
      "A VQ-VAE encoder produces continuous vectors (blue dots), but the model needs discrete tokens. Each vector snaps to its nearest codebook entry (orange square), turning the image into a sequence of integer codes. A bigger codebook quantizes more finely, lowering reconstruction error, but spends more bits per token and risks codes that never get used.": "VQ-VAE 编码器产生连续向量，即图中的蓝点，但模型需要离散 token。每个向量吸附到最近的码本条目，即橙色方块，于是图像变成整数编码序列。码本越大，量化越精细，重建误差越小，但每个 token 消耗的位数更多，也可能出现从不被使用的编码。",
      "codes": "个编码",
      "12 of 16 codes used by 12 vectors  ·  avg quantization error 0.076  ·  bits/token 4": "12 个向量使用了 16 个编码中的 12 个 · 平均量化误差 0.076 · 每 token 位数 4",
      "z_q = argmin_k ‖z_e − e_k‖,  codebook size K = 16   ·   larger K → lower error but more codes to learn": "z_q = argmin_k ‖z_e − e_k‖，码本大小 K = 16 · K 越大，误差越低，但要学习更多编码"
    },
    "patterns": [
      [
        "^(\\d+) of (\\d+) codes used by (\\d+) vectors  ·  avg quantization error ([\\d.]+)  ·  bits/token (\\d+)$",
        "$3 个向量使用了 $2 个编码中的 $1 个 · 平均量化误差 $4 · 每 token 位数 $5"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ codes\\ used\\ by\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ vectors\\ \\ ·\\ \\ avg\\ quantization\\ error\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ ·\\ \\ bits/token\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "$1 个向量使用了 $2 个编码中的 $3 个 · 平均量化误差 $4 · 每 token 位数 $5"
      ],
      [
        "^z_q\\ =\\ argmin_k\\ ‖z_e\\ −\\ e_k‖,\\ \\ codebook\\ size\\ K\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ \\ ·\\ \\ \\ larger\\ K\\ →\\ lower\\ error\\ but\\ more\\ codes\\ to\\ learn$",
        "z_q = argmin_k ‖z_e − e_k‖，码本大小 K = $1 · K 越大，误差越低，但要学习更多编码"
      ]
    ],
    "preserve": []
  },
  "cfg-guidance-scale": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "CLASSIFIER-FREE GUIDANCE": "无分类器引导",
      "drag w": "拖动 w",
      "Classifier-free guidance runs the diffusion model twice, once with the prompt and once without, then extrapolates along the difference. A scale of one is the plain conditional prediction; higher scales push further toward the prompt, trading diversity for adherence. Push too far and the sample saturates and breaks, so practical scales sit in a middle band.": "无分类器引导将扩散模型运行两次：一次带 prompt，一次不带 prompt，然后沿两次结果的差值外推。尺度为 1 时就是普通条件预测；尺度越大，结果越偏向 prompt，用多样性换取遵循程度。推得太远会使样本饱和、失真，因此实际尺度通常取中间区间。",
      "uncond": "无条件",
      "cond": "有条件",
      "guided": "引导后",
      "diversity": "多样性",
      "prompt adherence": "遵循 prompt 的程度",
      "guided estimate pushed 6.6 past unconditional toward the prompt": "引导估计从无条件结果向 prompt 方向推进 6.6",
      "ε_guided = ε_uncond + w · (ε_cond − ε_uncond),  w = 3.0   ·   w=1 is plain conditional, larger w over-extrapolates": "ε_guided = ε_uncond + w · (ε_cond − ε_uncond)，w = 3.0 · w=1 是普通条件预测，w 过大会过度外推",
      "w ≈ 1: prediction sits near unconditional, diverse but loosely on-prompt": "w ≈ 1：预测接近无条件结果，多样性高，但对 prompt 的遵循较松",
      "w very high: saturated, sharp but less diverse and prone to artifacts": "w 极高：结果饱和、边界尖锐，但多样性下降且容易失真"
    },
    "patterns": [
      [
        "^guided estimate pushed ([-\\d.]+) past unconditional toward the prompt$",
        "引导估计从无条件结果向 prompt 方向推进 $1"
      ],
      [
        "^guided\\ estimate\\ pushed\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ past\\ unconditional\\ toward\\ the\\ prompt$",
        "引导估计从无条件结果向 prompt 方向推进 $1"
      ],
      [
        "^ε_guided\\ =\\ ε_uncond\\ \\+\\ w\\ ·\\ \\(ε_cond\\ −\\ ε_uncond\\),\\ \\ w\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ \\ ·\\ \\ \\ w=([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ is\\ plain\\ conditional,\\ larger\\ w\\ over\\-extrapolates$",
        "ε_guided = ε_uncond + w · (ε_cond − ε_uncond)，w = $1 · w=$2 是普通条件预测，w 过大会过度外推"
      ],
      [
        "^w\\ ≈\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?):\\ prediction\\ sits\\ near\\ unconditional,\\ diverse\\ but\\ loosely\\ on\\-prompt$",
        "w ≈ $1：预测接近无条件结果，多样性高，但对 prompt 的遵循较松"
      ]
    ],
    "preserve": [
      {
        "text": "w · (cond − uncond)",
        "reason": "产品名、公式或演示字面量，保持原样"
      },
      {
        "text": "w · (cond − uncond)",
        "reason": "产品名、公式或演示字面量，保持原样"
      },
      {
        "text": "w · (cond − uncond)",
        "reason": "产品名、公式或演示字面量，保持原样"
      }
    ]
  },
  "video-temporal-patches": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "VIDEO TEMPORAL PATCHES": "视频时空分块",
      "drag frames and patch size": "拖动帧数与分块大小",
      "Video tokenizes in space and time at once. Each 224-pixel frame splits into a grid of spatial patches, and frames group into tubelets along time. The total token count is the temporal count times the spatial count, and since attention cost grows with the square of tokens, long clips at fine patches explode the budget. Larger patches and tubelets are the main levers to keep it tractable.": "视频同时在空间和时间上分词。每个 224 像素的帧被切成空间分块网格，连续帧再沿时间组成管状块。token 总数等于时间分块数乘以空间分块数。注意力成本随 token 数的平方增长，因此长视频加上细分块会迅速耗尽预算。增大空间分块与时间管状块，是控制成本的主要手段。",
      "14 × 14 patches/frame": "每帧 14 × 14 个分块",
      "8 frames": "8 帧",
      "÷ 2 (tubelet) = 4 temporal": "÷ 2（管状块）= 4 个时间分块",
      "196 spatial patches": "196 个空间分块",
      "784 tokens": "784 个 token",
      "tokens": "token 数",
      "8 frames · 224² px · patch 16 · tubelet 2  ·  196 spatial × 4 temporal": "8 帧 · 224² 像素 · 空间分块 16 · 管状块 2 · 196 个空间分块 × 4 个时间分块",
      "tokens = ⌊frames / tubelet⌋ · (H/p)·(W/p) = 4 · 196 = 784   ·   token count drives the attention cost": "tokens = ⌊frames / tubelet⌋ · (H/p)·(W/p) = 4 · 196 = 784 · token 数决定注意力成本"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ×\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ patches/frame$",
        "每帧 $1 × $2 个分块"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ frames$",
        "$1 帧"
      ],
      [
        "^÷\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\(tubelet\\)\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ temporal$",
        "÷ $1（管状块）= $2 个时间分块"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ spatial\\ patches$",
        "$1 个空间分块"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ tokens$",
        "$1 个 token"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ frames\\ ·\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)²\\ px\\ ·\\ patch\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ·\\ tubelet\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ ·\\ \\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ spatial\\ ×\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ temporal$",
        "$1 帧 · $2² 像素 · 空间分块 $3 · 管状块 $4 · $5 个空间分块 × $6 个时间分块"
      ],
      [
        "^tokens\\ =\\ ⌊frames\\ /\\ tubelet⌋\\ ·\\ \\(H/p\\)·\\(W/p\\)\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ·\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ \\ ·\\ \\ \\ token\\ count\\ drives\\ the\\ attention\\ cost$",
        "tokens = ⌊frames / tubelet⌋ · (H/p)·(W/p) = $1 · $2 = $3 · token 数决定注意力成本"
      ]
    ],
    "preserve": []
  },
  "audio-text-ctc": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "AUDIO-TEXT CTC": "音频文本 CTC",
      "drag frames and duration": "拖动帧数与时长",
      "Audio is a long frame sequence; the transcript is short. CTC lets the model emit a label or a blank at every frame, then collapses the output by merging repeats and dropping blanks. The alignment stays monotonic, time only moves forward, and the blank token is what keeps a genuine double letter from collapsing into one. Many frame-level alignments map onto the same final text.": "音频是一段很长的帧序列，转录文本却很短。CTC 允许模型在每一帧输出一个标签或空白，再合并连续重复标签、删除空白，得到最终输出。对齐保持单调，时间只能向前；空白 token 能防止真正的重复字母被合并成一个。多种逐帧对齐路径可以对应同一段最终文本。",
      "12 audio frames (∅ = blank)": "12 个音频帧（∅ = 空白）",
      "collapse repeats, drop blanks →": "合并重复，删除空白 →",
      "frames → chars": "帧 → 字符",
      "emitted \"____CAT_____\" collapses to \"CAT\"  ·  matches target CAT": "输出“____CAT_____”折叠为“CAT” · 匹配目标 CAT",
      "CTC: many alignments map to one label · collapse(a a _ b) = a b   ·   blanks separate repeats so \"AA\" survives": "CTC：多种对齐对应同一标签 · collapse(a a _ b) = a b · 空白分隔重复，使“AA”得以保留"
    },
    "patterns": [
      [
        "^emitted \"([A-Z_]*)\" collapses to \"([A-Z]*)\"  ·  matches target CAT$",
        "输出“$1”折叠为“$2” · 匹配目标 CAT"
      ],
      [
        "^emitted \"([A-Z_]*)\" collapses to \"([A-Z]*)\"  ·  does not yet spell CAT$",
        "输出“$1”折叠为“$2” · 尚未拼出 CAT"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ audio\\ frames\\ \\(∅\\ =\\ blank\\)$",
        "$1 个音频帧（∅ = 空白）"
      ]
    ],
    "preserve": []
  },
  "contrastive-matrix": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "CONTRASTIVE MATRIX": "对比相似度矩阵",
      "drag τ": "拖动 τ",
      "CLIP scores every image against every caption in the batch, forming a similarity matrix. The contrastive loss pulls the matched diagonal pairs together and pushes the off-diagonal apart. Dividing by a small temperature sharpens the softmax so the diagonal lights up; a large temperature flattens it and the model stops distinguishing pairs.": "CLIP 将批次中的每张图像与每条图像描述逐一评分，组成相似度矩阵。对比损失拉近对角线上的匹配对、推远非对角线配对。除以较小的温度会使 softmax 更尖锐，对角线随之变亮；较大的温度则使分布变平，模型不再区分不同配对。",
      "img:dog": "图像：dog",
      "img:car": "图像：car",
      "img:tree": "图像：tree",
      "img:boat": "图像：boat",
      "img:bird": "图像：bird",
      "txt:dog": "文本：dog",
      "txt:car": "文本：car",
      "txt:tree": "文本：tree",
      "txt:boat": "文本：boat",
      "txt:bird": "文本：bird",
      "matched-pair mass 99%  ·  diagonal outlined  ·  balanced": "匹配对概率质量 99% · 对角线已描边 · 均衡",
      "L = −log softmax(sim / τ)[matched],  τ = 0.10   ·   each image-row and text-column softmaxes to the matched pair": "L = −log softmax(sim / τ)[matched]，τ = 0.10 · 每个图像行和文本列都通过 softmax 对准匹配对"
    },
    "patterns": [
      [
        "^matched-pair mass (\\d+)%  ·  diagonal outlined  ·  low τ: matrix sharpens to a clear diagonal$",
        "匹配对概率质量 $1% · 对角线已描边 · τ 较低：矩阵形成清晰对角线"
      ],
      [
        "^matched-pair mass (\\d+)%  ·  diagonal outlined  ·  high τ: rows flatten, pairs blur together$",
        "匹配对概率质量 $1% · 对角线已描边 · τ 较高：各行变平，配对混在一起"
      ],
      [
        "^matched\\-pair\\ mass\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\ \\ ·\\ \\ diagonal\\ outlined\\ \\ ·\\ \\ balanced$",
        "匹配对概率质量 $1% · 对角线已描边 · 均衡"
      ],
      [
        "^L\\ =\\ −log\\ softmax\\(sim\\ /\\ τ\\)\\[matched\\],\\ \\ τ\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ \\ ·\\ \\ \\ each\\ image\\-row\\ and\\ text\\-column\\ softmaxes\\ to\\ the\\ matched\\ pair$",
        "L = −log softmax(sim / τ)[matched]，τ = $1 · 每个图像行和文本列都通过 softmax 对准匹配对"
      ]
    ],
    "preserve": []
  }
};
