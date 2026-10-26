(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-foundations2.js"] = {
  "transfer-learning": {
    "text": {
      "TRANSFER LEARNING": "迁移学习",
      "drag the freeze line": "拖动冻结边界",
      "A pretrained backbone already knows generic features — edges, textures, shapes. Transfer learning freezes those lower layers and trains only the top few plus a new head on the target task. Fewer trainable parameters means fewer gradients to store, far less data to fit, and faster convergence; freeze more when your dataset is tiny, fewer when it is large and different.": "预训练骨干已学会边缘、纹理和形状等通用特征。迁移学习冻结底层，仅在目标任务上训练顶部几层和新任务头。可训练参数更少，意味着存储的梯度更少、所需拟合数据更少、收敛更快。数据集小就多冻结；数据量大且差异大就少冻结。",
      "input →  18 frozen (grey)  ·  6 trainable (blue)  → head": "输入 → 18 层冻结（灰色）  ·  6 层可训练（蓝色） → 任务头",
      "gradients flow only through the blue layers": "梯度只经过蓝色层",
      "trainable params": "可训练参数",
      "25% of the backbone trains  ·  about 8 epochs to converge on a small dataset": "训练骨干的 25%  ·  小数据集上约 8 轮收敛",
      "frozen layers keep pretrained weights, contribute no gradients  ·  fewer trainable params → less data and compute needed": "冻结层保留预训练权重，不产生梯度  ·  可训练参数越少 → 所需数据和计算越少"
    },
    "patterns": [
      [
        "^input\\ →\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)\\ frozen\\ \\(grey\\)\\ \\ ·\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)\\ trainable\\ \\(blue\\)\\ \\ →\\ head$",
        "输入 → $1 层冻结（灰色）  ·  $2 层可训练（蓝色） → 任务头"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)%\\ of\\ the\\ backbone\\ trains\\ \\ ·\\ \\ about\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ epochs\\ to\\ converge\\ on\\ a\\ small\\ dataset$",
        "训练骨干的 $1%  ·  小数据集上约 $2 轮收敛"
      ]
    ],
    "preserve": []
  },
  "batchnorm-inference": {
    "text": {
      "BATCHNORM: TRAIN vs EVAL": "批归一化：训练与推理",
      "During training BatchNorm normalizes each activation by the mean and variance of the current mini-batch (orange), and quietly accumulates a running average. At inference it switches to those frozen running averages (blue) so a single input is processed deterministically. Small batches make the per-batch statistics noisy, which is why tiny batches hurt BatchNorm and motivate Group or Layer Norm.": "训练时，BatchNorm 使用当前小批次的均值和方差归一化激活（橙色），同时累积运行均值。推理时切换为冻结的运行均值（蓝色），因此单个输入也能确定性处理。小批次使批内统计量噪声较大，因而削弱 BatchNorm，也促使人们采用组归一化或层归一化。",
      "training: this batch  μ=-0.58  σ=1.34": "训练：本批次 μ=-0.58  σ=1.34",
      "inference: running avg  μ=0.00  σ=1.00": "推理：运行均值 μ=0.00  σ=1.00",
      "batch-vs-population gap": "批次与总体的差距",
      "8 samples per batch  ·  moderate batch: usable estimates": "每批 8 个样本  ·  中等批次：估计可用",
      "train: normalize by THIS batch μ,σ  ·  eval: normalize by running averages collected during training": "训练：用当前批次 μ、σ 归一化  ·  推理：用训练期间累积的运行均值归一化",
      "training: this batch  μ=0.64  σ=0.00": "训练：本批次 μ=0.64  σ=0.00",
      "1 samples per batch  ·  small batch: noisy estimates, unstable normalization": "每批 1 个样本  ·  小批次：估计噪声大，归一化不稳定",
      "64 samples per batch  ·  large batch: stable estimates close to the population": "每批 64 个样本  ·  大批次：估计稳定，接近总体",
      "training: this batch  μ=0.01  σ=1.11": "训练：本批次 μ=0.01  σ=1.11"
    },
    "patterns": [
      [
        "^training:\\ this\\ batch\\ \\ μ=([-+]?\\d+(?:[.,]\\d+)*)\\ \\ σ=([-+]?\\d+(?:[.,]\\d+)*)$",
        "训练：本批次 μ=$1  σ=$2"
      ],
      [
        "^inference:\\ running\\ avg\\ \\ μ=([-+]?\\d+(?:[.,]\\d+)*)\\ \\ σ=([-+]?\\d+(?:[.,]\\d+)*)$",
        "推理：运行均值 μ=$1  σ=$2"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ samples\\ per\\ batch\\ \\ ·\\ \\ moderate\\ batch:\\ usable\\ estimates$",
        "每批 $1 个样本  ·  中等批次：估计可用"
      ],
      [
        "^training:\\ this\\ batch\\ \\ μ=([-+]?\\d+(?:[.,]\\d+)*)\\ \\ σ=([-+]?\\d+(?:[.,]\\d+)*)$",
        "训练：本批次 μ=$1  σ=$2"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ samples\\ per\\ batch\\ \\ ·\\ \\ small\\ batch:\\ noisy\\ estimates,\\ unstable\\ normalization$",
        "每批 $1 个样本  ·  小批次：估计噪声大，归一化不稳定"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ samples\\ per\\ batch\\ \\ ·\\ \\ large\\ batch:\\ stable\\ estimates\\ close\\ to\\ the\\ population$",
        "每批 $1 个样本  ·  大批次：估计稳定，接近总体"
      ],
      [
        "^training:\\ this\\ batch\\ \\ μ=([-+]?\\d+(?:[.,]\\d+)*)\\ \\ σ=([-+]?\\d+(?:[.,]\\d+)*)$",
        "训练：本批次 μ=$1  σ=$2"
      ]
    ],
    "preserve": []
  },
  "data-augmentation": {
    "text": {},
    "patterns": [],
    "preserve": []
  },
  "mfcc-pipeline": {
    "text": {
      "MFCC PIPELINE": "MFCC 流水线",
      "drag the coefficient count": "拖动系数数量",
      "MFCCs run a fixed pipeline: take the spectrogram, warp it onto mel-spaced filters, take the log to mimic loudness perception, then apply a DCT. The DCT packs the smooth spectral envelope into the first few coefficients, so keeping only the lowest 12-13 captures the vocal-tract shape that distinguishes phonemes while discarding pitch and noise in the higher coefficients.": "MFCC 使用固定流水线：计算频谱图，映射到梅尔间隔滤波器，取对数以模拟响度感知，再做 DCT。DCT 将平滑频谱包络压入前几个系数，因此只保留最低的 12-13 个系数，便能捕获区分音素的声道形状，同时丢弃高阶系数中的音高和噪声。",
      "spectrogram": "频谱图",
      "mel filterbank": "梅尔滤波器组",
      "log": "对数",
      "cepstral coefficients: blue kept, grey discarded (40 total)": "倒谱系数：蓝色保留，灰色丢弃（共 40 个）",
      "MFCC coefficients kept": "保留的 MFCC 系数",
      "keeping the first 13 of 40 coefficients  ·  typical for speech (12-13)": "保留前 13 个系数（共 40 个）  ·  语音常用范围（12-13）",
      "STFT power → mel filterbank → log → DCT → keep low coefficients  ·  the DCT compacts the envelope into the first few": "STFT 功率 → 梅尔滤波器组 → 对数 → DCT → 保留低阶系数  ·  DCT 将包络压入前几个系数",
      "keeping the first 4 of 40 coefficients  ·  coarse: smooth spectral envelope only": "保留前 4 个系数（共 40 个）  ·  粗略：仅保留平滑频谱包络",
      "keeping the first 40 of 40 coefficients  ·  fine: includes pitch-like detail and noise": "保留前 40 个系数（共 40 个）  ·  精细：包含类音高细节和噪声"
    },
    "patterns": [
      [
        "^MFCCs\\ run\\ a\\ fixed\\ pipeline:\\ take\\ the\\ spectrogram,\\ warp\\ it\\ onto\\ mel\\-spaced\\ filters,\\ take\\ the\\ log\\ to\\ mimic\\ loudness\\ perception,\\ then\\ apply\\ a\\ DCT\\.\\ The\\ DCT\\ packs\\ the\\ smooth\\ spectral\\ envelope\\ into\\ the\\ first\\ few\\ coefficients,\\ so\\ keeping\\ only\\ the\\ lowest\\ ([-+]?\\d+(?:[.,]\\d+)*)([-+]?\\d+(?:[.,]\\d+)*)\\ captures\\ the\\ vocal\\-tract\\ shape\\ that\\ distinguishes\\ phonemes\\ while\\ discarding\\ pitch\\ and\\ noise\\ in\\ the\\ higher\\ coefficients\\.$",
        "MFCC 使用固定流水线：计算频谱图，映射到梅尔间隔滤波器，取对数以模拟响度感知，再做 DCT。DCT 将平滑频谱包络压入前几个系数，因此只保留最低的 $1$2 个系数，便能捕获区分音素的声道形状，同时丢弃高阶系数中的音高和噪声。"
      ],
      [
        "^cepstral\\ coefficients:\\ blue\\ kept,\\ grey\\ discarded\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\ total\\)$",
        "倒谱系数：蓝色保留，灰色丢弃（共 $1 个）"
      ],
      [
        "^keeping\\ the\\ first\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ coefficients\\ \\ ·\\ \\ typical\\ for\\ speech\\ \\(([-+]?\\d+(?:[.,]\\d+)*)([-+]?\\d+(?:[.,]\\d+)*)\\)$",
        "保留前 $1 个系数（共 $2 个）  ·  语音常用范围（$3$4）"
      ],
      [
        "^keeping\\ the\\ first\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ coefficients\\ \\ ·\\ \\ coarse:\\ smooth\\ spectral\\ envelope\\ only$",
        "保留前 $1 个系数（共 $2 个）  ·  粗略：仅保留平滑频谱包络"
      ],
      [
        "^keeping\\ the\\ first\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ coefficients\\ \\ ·\\ \\ fine:\\ includes\\ pitch\\-like\\ detail\\ and\\ noise$",
        "保留前 $1 个系数（共 $2 个）  ·  精细：包含类音高细节和噪声"
      ]
    ],
    "preserve": [
      {
        "text": "DCT",
        "reason": "DCT算法缩写"
      },
      {
        "text": "MFCC",
        "reason": "MFCC特征缩写"
      }
    ]
  },
  "ctc-collapse": {
    "text": {
      "CTC COLLAPSE": "CTC 折叠",
      "step through decoding": "逐步查看解码",
      "CTC lets an acoustic model emit one label per frame without knowing the alignment. Decoding runs two steps in order: first collapse any run of identical symbols into one, then delete the blank token. The blank is essential — it sits between two real \"l\" frames so that \"hello\" keeps both letters instead of merging them into one.": "CTC 允许声学模型在不知道对齐关系时逐帧输出标签。解码按顺序执行两步：先把连续相同符号折叠为一个，再删除空白 token。空白符很重要：它位于两个真实的 \"l\" 帧之间，让 \"hello\" 保留两个字母，而不是合成一个。",
      "drop blank token \"_\"": "删除空白 token \"_\"",
      "final transcript: \"hello\"": "最终转录：\"hello\"",
      "symbols at this stage": "本阶段的符号数",
      "blanks are removed, leaving the text": "空白符被删除，只剩文本",
      "CTC decode: collapse repeats first, THEN remove blanks  ·  the blank lets the model separate true double letters": "CTC 解码：先折叠重复符号，再删除空白符  ·  空白符让模型区分真正的双字母",
      "raw per-frame argmax (13 frames)": "原始逐帧 argmax（13 帧）",
      "the acoustic model emits one symbol per audio frame, with repeats and blanks": "声学模型每个音频帧输出一个符号，包含重复项和空白符",
      "merge adjacent repeats": "合并相邻重复符号",
      "repeated runs of the same symbol become one": "连续相同符号合并为一个"
    },
    "patterns": [
      [
        "^raw\\ per\\-frame\\ argmax\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\ frames\\)$",
        "原始逐帧 argmax（$1 帧）"
      ]
    ],
    "preserve": []
  },
  "autoencoder-bottleneck": {
    "text": {
      "AUTOENCODER BOTTLENECK": "自编码器瓶颈",
      "drag the latent dim": "拖动潜变量维度",
      "An autoencoder squeezes its input through a narrow bottleneck and rebuilds it on the far side. A wide bottleneck copies everything but learns nothing; a tiny one forces the network to discard detail and keep only the dominant structure, so reconstruction error rises as compression increases. The sweet spot keeps the signal while throwing away the noise — that learned code is the useful representation.": "自编码器将输入压过狭窄瓶颈，再在另一端重建。宽瓶颈会复制全部内容，却学不到有用信息；极窄瓶颈迫使网络丢弃细节、保留主导结构，因此压缩越强，重构误差越大。合适的瓶颈保留信号、丢弃噪声，得到的编码才是有用表示。",
      "grey = input (16 dims)   ·   blue dashed = reconstruction from 4-dim bottleneck": "灰色 = 输入（16 维）  ·  蓝色虚线 = 4 维瓶颈的重构",
      "reconstruction MSE": "重构均方误差",
      "4.0x compression (16 → 4)  ·  compresses while keeping the main structure": "4.0 倍压缩（16 → 4）  ·  压缩同时保留主要结构",
      "x → encoder → z (4 dims) → decoder → x̂  ·  the bottleneck forces the network to keep only what matters": "x → 编码器 → z（4 维）→ 解码器 → x̂  ·  瓶颈迫使网络只保留重要信息",
      "16.0x compression (16 → 1)  ·  bottleneck too small: detail is lost": "16.0 倍压缩（16 → 1）  ·  瓶颈过窄：细节丢失",
      "1.0x compression (16 → 16)  ·  wide bottleneck: near-perfect but no compression": "1.0 倍压缩（16 → 16）  ·  宽瓶颈：几乎完美，但没有压缩"
    },
    "patterns": [
      [
        "^grey\\ =\\ input\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\ dims\\)\\ \\ \\ ·\\ \\ \\ blue\\ dashed\\ =\\ reconstruction\\ from\\ ([-+]?\\d+(?:[.,]\\d+)*)\\-dim\\ bottleneck$",
        "灰色 = 输入（$1 维）  ·  蓝色虚线 = $2 维瓶颈的重构"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)x\\ compression\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\ →\\ ([-+]?\\d+(?:[.,]\\d+)*)\\)\\ \\ ·\\ \\ compresses\\ while\\ keeping\\ the\\ main\\ structure$",
        "$1 倍压缩（$2 → $3）  ·  压缩同时保留主要结构"
      ],
      [
        "^x\\ →\\ encoder\\ →\\ z\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\ dims\\)\\ →\\ decoder\\ →\\ x̂\\ \\ ·\\ \\ the\\ bottleneck\\ forces\\ the\\ network\\ to\\ keep\\ only\\ what\\ matters$",
        "x → 编码器 → z（$1 维）→ 解码器 → x̂  ·  瓶颈迫使网络只保留重要信息"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)x\\ compression\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\ →\\ ([-+]?\\d+(?:[.,]\\d+)*)\\)\\ \\ ·\\ \\ bottleneck\\ too\\ small:\\ detail\\ is\\ lost$",
        "$1 倍压缩（$2 → $3）  ·  瓶颈过窄：细节丢失"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)x\\ compression\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\ →\\ ([-+]?\\d+(?:[.,]\\d+)*)\\)\\ \\ ·\\ \\ wide\\ bottleneck:\\ near\\-perfect\\ but\\ no\\ compression$",
        "$1 倍压缩（$2 → $3）  ·  宽瓶颈：几乎完美，但没有压缩"
      ]
    ],
    "preserve": []
  },
  "score-matching": {
    "text": {
      "SCORE MATCHING": "分数匹配",
      "drag the steps": "拖动步数",
      "A score-based model learns the score — the gradient of the log-density — shown here as the grey vector field pointing toward where data is dense. Generation needs no explicit density: start from noise and repeatedly step along the score (Langevin dynamics, with a little added noise each step). The orange sample follows the arrows out of the empty regions and settles into a high-density mode, which is exactly how diffusion models draw samples.": "分数模型学习对数密度的梯度，即分数；图中灰色向量场指向数据密集处。生成无需显式密度：从噪声出发，反复沿分数方向迈步（朗之万动力学，每步加入少量噪声）。橙色样本沿箭头离开空白区域，落入高密度模态，这正是扩散模型生成样本的方式。",
      "density at the sample": "样本处的密度",
      "18 Langevin steps  ·  the sample climbs the grey arrows into a high-density mode": "18 个朗之万步  ·  样本沿灰色箭头爬向高密度模态",
      "score s(x) = ∇ₓ log p(x)  ·  Langevin: x ← x + ε·s(x) (+ noise)  ·  arrows point toward where data is dense": "分数 s(x) = ∇ₓ log p(x)  ·  朗之万更新：x ← x + ε·s(x)（+ 噪声）  ·  箭头指向数据密集处"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ Langevin\\ steps\\ \\ ·\\ \\ the\\ sample\\ climbs\\ the\\ grey\\ arrows\\ into\\ a\\ high\\-density\\ mode$",
        "$1 个朗之万步  ·  样本沿灰色箭头爬向高密度模态"
      ]
    ],
    "preserve": []
  },
  "normalizing-flow": {
    "text": {
      "NORMALIZING FLOW": "归一化流",
      "drag the flow parameter": "拖动流变换参数",
      "A normalizing flow maps a simple base density (grey Gaussian) through an invertible function to a complex target (blue). Because the map is invertible, the change-of-variables formula gives the exact density: divide by the absolute Jacobian determinant, or in logs, subtract log|det J|. Where the map stretches space the density thins; where it compresses, the density piles up — and because everything is exact, the flow can be trained by maximum likelihood.": "归一化流通过可逆函数，将简单基分布（灰色高斯）映射为复杂目标分布（蓝色）。可逆性允许用变量替换公式计算精确密度：除以雅可比行列式绝对值，或在对数域减去 log|det J|。空间被拉伸时密度降低，被压缩时密度升高；由于计算精确，可用最大似然训练。",
      "grey = base Gaussian p(z)   ·   blue = pushed-forward density p(x)": "灰色 = 基高斯分布 p(z)  ·  蓝色 = 推前密度 p(x)",
      "log|det J| at z=0": "z=0 处的 log|det J|",
      "flow strength a = 1.40  ·  moderate warp into a multi-modal shape": "流强度 a = 1.40  ·  适度扭曲为多模态形状",
      "x = z + a·tanh(z)  invertible  ·  p(x) = p(z) / |dx/dz|  ·  log p(x) = log p(z) − log|det J|": "x = z + a·tanh(z) 可逆  ·  p(x) = p(z) / |dx/dz|  ·  log p(x) = log p(z) − log|det J|",
      "flow strength a = 0.00  ·  near identity: target stays close to the base": "流强度 a = 0.00  ·  接近恒等映射：目标仍接近基分布",
      "flow strength a = 2.50  ·  strong warp: density piles up where the map compresses": "流强度 a = 2.50  ·  强烈扭曲：映射压缩处密度堆积"
    },
    "patterns": [
      [
        "^log\\|det\\ J\\|\\ at\\ z=([-+]?\\d+(?:[.,]\\d+)*)$",
        "z=$1 处的 log|det J|"
      ],
      [
        "^flow\\ strength\\ a\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ moderate\\ warp\\ into\\ a\\ multi\\-modal\\ shape$",
        "流强度 a = $1  ·  适度扭曲为多模态形状"
      ],
      [
        "^flow\\ strength\\ a\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ near\\ identity:\\ target\\ stays\\ close\\ to\\ the\\ base$",
        "流强度 a = $1  ·  接近恒等映射：目标仍接近基分布"
      ],
      [
        "^flow\\ strength\\ a\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ strong\\ warp:\\ density\\ piles\\ up\\ where\\ the\\ map\\ compresses$",
        "流强度 a = $1  ·  强烈扭曲：映射压缩处密度堆积"
      ]
    ],
    "preserve": []
  }
};
