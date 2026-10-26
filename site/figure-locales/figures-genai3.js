(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-genai3.js"] = {
  "gx-hybrid-retrieval": {
    "text": {
      "Motion reduced": "已减少动画",
      "HYBRID RETRIEVAL": "混合检索",
      "sparse + dense + rerank": "稀疏 + 稠密 + 重排",
      "Production retrieval is a chain, not a single method. Sparse BM25 nails exact keywords; dense vectors catch paraphrase; Reciprocal Rank Fusion merges the two ranked lists using only positions, so their incompatible score scales do not matter; a cross-encoder then reranks the survivors by reading each query and document together. The final top result can differ from either input list.": "生产检索是一条链，而非单一方法。稀疏 BM25 精确匹配关键词，稠密向量识别改述；倒数排序融合仅依据位置合并两份排序，因此不受分数尺度不兼容的影响；交叉编码器联合读取查询和文档，对保留项重排。最终首位结果可能与两份输入列表都不同。",
      "BM25 (sparse)": "BM25（稀疏）",
      "dense": "稠密",
      "RRF fusion": "RRF 融合",
      "rerank top-5": "重排前 5 项",
      "each layer catches the failures of the one before": "每层补上前一层的失误",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^Production\\ retrieval\\ is\\ a\\ chain,\\ not\\ a\\ single\\ method\\.\\ Sparse\\ BM2([-+]?\\d+(?:[.,]\\d+)*)\\ nails\\ exact\\ keywords;\\ dense\\ vectors\\ catch\\ paraphrase;\\ Reciprocal\\ Rank\\ Fusion\\ merges\\ the\\ two\\ ranked\\ lists\\ using\\ only\\ positions,\\ so\\ their\\ incompatible\\ score\\ scales\\ do\\ not\\ matter;\\ a\\ cross\\-encoder\\ then\\ reranks\\ the\\ survivors\\ by\\ reading\\ each\\ query\\ and\\ document\\ together\\.\\ The\\ final\\ top\\ result\\ can\\ differ\\ from\\ either\\ input\\ list\\.$",
        "生产检索是一条链，而非单一方法。稀疏 BM2$1 精确匹配关键词，稠密向量识别改述；倒数排序融合仅依据位置合并两份排序，因此不受分数尺度不兼容的影响；交叉编码器联合读取查询和文档，对保留项重排。最终首位结果可能与两份输入列表都不同。"
      ],
      [
        "^BM2([-+]?\\d+(?:[.,]\\d+)*)\\ \\(sparse\\)$",
        "BM2$1（稀疏）"
      ],
      [
        "^rerank\\ top\\-([-+]?\\d+(?:[.,]\\d+)*)$",
        "重排前 $1 项"
      ]
    ],
    "preserve": []
  },
  "gx-matryoshka": {
    "text": {
      "Motion reduced": "已减少动画",
      "MATRYOSHKA TRUNCATION": "套娃式向量截断",
      "shed dimensions": "缩减维度",
      "A Matryoshka-trained embedding packs the most important information into its earliest dimensions. You can keep only a prefix of the vector, slicing 3072 floats down to a few hundred, and still retrieve well. Truncation cuts index storage several-fold while quality falls off gradually rather than collapsing, so you tune the dimension budget to your cost target.": "套娃式嵌入把最重要的信息放在最前面的维度中。只保留向量前缀，把 3072 个浮点数截为几百个，仍可有效检索。截断让索引存储减少数倍，而质量逐渐下降，不会突然崩溃，因此可以按成本目标调整维度预算。",
      "one Matryoshka vector, truncated to a smaller prefix": "一个套娃式向量，截为较短前缀",
      "3072 dims": "3072 维",
      "prefix kept": "保留的前缀",
      "storage scales with kept dimensions; quality degrades gracefully": "存储随保留维度变化；质量平缓下降",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^A\\ Matryoshka\\-trained\\ embedding\\ packs\\ the\\ most\\ important\\ information\\ into\\ its\\ earliest\\ dimensions\\.\\ You\\ can\\ keep\\ only\\ a\\ prefix\\ of\\ the\\ vector,\\ slicing\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ floats\\ down\\ to\\ a\\ few\\ hundred,\\ and\\ still\\ retrieve\\ well\\.\\ Truncation\\ cuts\\ index\\ storage\\ several\\-fold\\ while\\ quality\\ falls\\ off\\ gradually\\ rather\\ than\\ collapsing,\\ so\\ you\\ tune\\ the\\ dimension\\ budget\\ to\\ your\\ cost\\ target\\.$",
        "套娃式嵌入把最重要的信息放在最前面的维度中。只保留向量前缀，把 $1 个浮点数截为几百个，仍可有效检索。截断让索引存储减少数倍，而质量逐渐下降，不会突然崩溃，因此可以按成本目标调整维度预算。"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ dims$",
        "$1 维"
      ]
    ],
    "preserve": []
  },
  "gx-entity-linking": {
    "text": {
      "Motion reduced": "已减少动画",
      "ENTITY LINKING": "实体链接",
      "candidates then pick": "先生成候选，再选择",
      "Entity linking runs in two stages. Candidate generation pulls every knowledge-base entry a surface form like \"Jordan\" could refer to. Disambiguation then scores each candidate against the surrounding context and keeps one. Here the sports context resolves the mention to the basketball entry while the actor, country, and ML-professor candidates fade out.": "实体链接分两步进行。候选生成收集知识库中 \"Jordan\" 等表面形式可能指代的所有条目；消歧根据上下文给候选打分，只保留一个。此处，体育上下文让篮球条目胜出，演员、国家和机器学习教授候选逐渐淡出。",
      "mention": "提及",
      "context: beat the press": "上下文：突破紧逼防守",
      "Q41421  M. Jordan (NBA)": "Q41421  M. Jordan（NBA）",
      "Q44437  M.B. Jordan (actor)": "Q44437  M.B. Jordan（演员）",
      "Q810  Jordan (country)": "Q810  Jordan（国家）",
      "Q3308285  M.I. Jordan (ML)": "Q3308285  M.I. Jordan（机器学习）",
      "generate candidates, then disambiguate by context": "生成候选，再按上下文消歧",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^Q4([-+]?\\d+(?:[.,]\\d+)*)\\ \\ M\\.\\ Jordan\\ \\(NBA\\)$",
        "Q4$1  M. Jordan（NBA）"
      ],
      [
        "^Q4([-+]?\\d+(?:[.,]\\d+)*)\\ \\ M\\.B\\.\\ Jordan\\ \\(actor\\)$",
        "Q4$1  M.B. Jordan（演员）"
      ],
      [
        "^Q8([-+]?\\d+(?:[.,]\\d+)*)\\ \\ Jordan\\ \\(country\\)$",
        "Q8$1  Jordan（国家）"
      ],
      [
        "^Q3([-+]?\\d+(?:[.,]\\d+)*)\\ \\ M\\.I\\.\\ Jordan\\ \\(ML\\)$",
        "Q3$1  M.I. Jordan（机器学习）"
      ]
    ],
    "preserve": [
      {
        "text": "\"Jordan\"",
        "reason": "实体名称样本"
      },
      {
        "text": "Q41421  M. Jordan（NBA）",
        "reason": "已规范显示的产品名、技术缩写、模型标识或实体名称"
      }
    ]
  },
  "gx-niah-decay": {
    "text": {
      "Motion reduced": "已减少动画",
      "NEEDLE IN A HAYSTACK": "大海捞针测试",
      "depth vs recall": "深度与召回",
      "A needle test plants a single fact at a controlled depth in a long context and asks the model to retrieve it. Recall is near-perfect for shallow needles in short contexts, but as the fact sits deeper inside a longer haystack the accuracy gauge falls. The advertised context window is rarely the usable one, which is why depth-by-length sweeps matter.": "大海捞针测试将一条事实放在长上下文的指定深度，再要求模型检索。上下文短、埋得浅时，召回接近完美；上下文越长、事实越深，准确率越低。标称上下文窗口通常不等于可用窗口，因此需要同时扫描深度与长度。",
      "haystack: context grows left to right": "草堆：上下文从左向右增长",
      "needle": "针",
      "recall accuracy": "召回准确率",
      "advertised context is not all usable": "标称上下文并非全部可用",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "gx-patchgan": {
    "text": {
      "Motion reduced": "已减少动画",
      "PATCHGAN DISCRIMINATOR": "PatchGAN 判别器",
      "local realism": "局部真实感",
      "A PatchGAN does not output one real/fake score for the whole image. It slides a fixed receptive field across the output and judges each local patch independently, producing an NxN grid of verdicts that is then averaged. Realism is treated as a local property, which makes the discriminator smaller, faster, and sharper on high-frequency texture.": "PatchGAN 不为整张图像输出一个真假分数，而是用固定感受野滑过输出，分别判断每个局部图像块，产生 NxN 判定网格后取平均。把真实感视为局部属性，使判别器更小、更快，也更善于处理高频纹理。",
      "generated image y  (conditioned on input x)": "生成图像 y（以输入 x 为条件）",
      "NxN real/fake grid": "NxN 真假判定网格",
      "70x70 receptive field": "70x70 感受野",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)x7([-+]?\\d+(?:[.,]\\d+)*)\\ receptive\\ field$",
        "$1x7$2 感受野"
      ]
    ],
    "preserve": []
  },
  "gx-stylegan-mapping": {
    "text": {
      "Motion reduced": "已减少动画",
      "STYLEGAN MAPPING": "StyleGAN 映射",
      "untangle then inject": "先解耦，再注入",
      "A plain generator feeds the noise vector z straight into the network, so every factor of variation stays tangled together. StyleGAN first maps z through an 8-layer MLP to an intermediate space W whose axes line up with meaningful factors like pose and lighting, then injects that w through AdaIN at every resolution. Disentangling first is what made style mixing and editing possible.": "普通生成器直接将噪声 z 输入网络，所有变化因素混在一起。StyleGAN 先通过 8 层 MLP 将 z 映射到中间空间 W，让轴对齐姿态、光照等有意义的因素，再在各分辨率通过 AdaIN 注入 w。先解耦，才使风格混合与编辑成为可能。",
      "Z: entangled": "Z：纠缠",
      "f (8-layer MLP)": "f（8 层 MLP）",
      "W: disentangled": "W：解耦",
      "pose axis": "姿态轴",
      "w injected via AdaIN at every resolution": "各分辨率通过 AdaIN 注入 w",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^A\\ plain\\ generator\\ feeds\\ the\\ noise\\ vector\\ z\\ straight\\ into\\ the\\ network,\\ so\\ every\\ factor\\ of\\ variation\\ stays\\ tangled\\ together\\.\\ StyleGAN\\ first\\ maps\\ z\\ through\\ an\\ ([-+]?\\d+(?:[.,]\\d+)*)\\-layer\\ MLP\\ to\\ an\\ intermediate\\ space\\ W\\ whose\\ axes\\ line\\ up\\ with\\ meaningful\\ factors\\ like\\ pose\\ and\\ lighting,\\ then\\ injects\\ that\\ w\\ through\\ AdaIN\\ at\\ every\\ resolution\\.\\ Disentangling\\ first\\ is\\ what\\ made\\ style\\ mixing\\ and\\ editing\\ possible\\.$",
        "普通生成器直接将噪声 z 输入网络，所有变化因素混在一起。StyleGAN 先通过 $1 层 MLP 将 z 映射到中间空间 W，让轴对齐姿态、光照等有意义的因素，再在各分辨率通过 AdaIN 注入 w。先解耦，才使风格混合与编辑成为可能。"
      ],
      [
        "^f\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\-layer\\ MLP\\)$",
        "f（$1 层 MLP）"
      ]
    ],
    "preserve": []
  },
  "gx-fid-distributions": {
    "text": {
      "Motion reduced": "已减少动画",
      "FRECHET INCEPTION DISTANCE": "弗雷歇 Inception 距离",
      "two distributions": "两个分布",
      "FID does not score images one by one. It fits a Gaussian to the real images and another to the generated images in Inception feature space, then measures the distance between those two distributions through their means and covariances. As the generated cloud moves to overlap the real one, the distance, and the FID, falls toward zero.": "FID 不逐张给图像打分，而是在 Inception 特征空间中，分别为真实图像和生成图像拟合高斯分布，再通过均值和协方差衡量两分布距离。生成点云逐渐与真实点云重合时，距离和 FID 都趋向零。",
      "Inception feature space (2 of 2048 dims)": "Inception 特征空间（显示 2 维，共 2048 维）",
      "real (blue)   generated (amber)": "真实（蓝色）  生成（琥珀色）",
      "FID = high": "FID = 高",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^Inception\\ feature\\ space\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ dims\\)$",
        "Inception 特征空间（显示 $1 维，共 $2 维）"
      ]
    ],
    "preserve": []
  },
  "gx-var-next-scale": {
    "text": {
      "Motion reduced": "已减少动画",
      "NEXT-SCALE PREDICTION": "下一尺度预测",
      "coarse to fine": "由粗到细",
      "VAR generates an image as a sequence of resolutions, not pixels in raster order. It predicts a 1x1 token summary, then a 2x2 grid, then 4x4, then 8x8, each scale produced in a single parallel pass and conditioned on every coarser scale before it. The generation-order problem of pixel-by-pixel models disappears.": "VAR 按分辨率序列生成图像，而非按像素扫描顺序生成。它先预测 1x1 token 摘要，再预测 2x2、4x4、8x8 网格；每个尺度在单次并行前向中生成，并以所有更粗尺度为条件。逐像素模型的生成顺序问题因此消失。",
      "predict each scale in one pass, conditioned on all coarser scales": "每个尺度一次预测，以所有更粗尺度为条件",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^VAR\\ generates\\ an\\ image\\ as\\ a\\ sequence\\ of\\ resolutions,\\ not\\ pixels\\ in\\ raster\\ order\\.\\ It\\ predicts\\ a\\ ([-+]?\\d+(?:[.,]\\d+)*)x1\\ token\\ summary,\\ then\\ a\\ ([-+]?\\d+(?:[.,]\\d+)*)x2\\ grid,\\ then\\ ([-+]?\\d+(?:[.,]\\d+)*)x4,\\ then\\ ([-+]?\\d+(?:[.,]\\d+)*)x8,\\ each\\ scale\\ produced\\ in\\ a\\ single\\ parallel\\ pass\\ and\\ conditioned\\ on\\ every\\ coarser\\ scale\\ before\\ it\\.\\ The\\ generation\\-order\\ problem\\ of\\ pixel\\-by\\-pixel\\ models\\ disappears\\.$",
        "VAR 按分辨率序列生成图像，而非按像素扫描顺序生成。它先预测 $1x1 token 摘要，再预测 $2x2、$3x4、$4x8 网格；每个尺度在单次并行前向中生成，并以所有更粗尺度为条件。逐像素模型的生成顺序问题因此消失。"
      ]
    ],
    "preserve": []
  }
};
