(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-capstone-h.js"] = {
  "ch-paper-skeleton": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "PAPER SKELETON": "论文骨架",
      "structure first, prose second": "先定结构，再写正文",
      "The skeleton declares sections, figure slots, and bibliography keys as data before any prose exists. The harness validates that contract first: every referenced figure has a slot, every citation has an entry, every section lands in the table of contents. Only then does the generator write prose into each slot, so structural debt never accumulates.": "在正文尚未写出时，骨架就先以数据声明章节、图表槽位和参考文献键。运行器首先校验这一契约：每个被引用的图都有槽位，每条文献引用都有对应条目，每节都出现在目录中。只有通过之后，生成器才往各个槽位写入正文，结构欠账不会累积。",
      "abstract": "摘要",
      "sec: intro": "章节：引言",
      "sec: method": "章节：方法",
      "fig slot: results.png": "图表槽位：results.png",
      "bib: 3 keys": "参考文献：3 个键",
      "validate before prose:": "写正文前先校验：",
      "every figure has a slot": "每个图表都有槽位",
      "every cite has an entry": "每条引用都有条目",
      "every section in TOC": "每个章节都在目录中",
      "then prose fills the slots,": "然后向槽位填入正文，",
      "one section at a time": "每次完成一节"
    },
    "patterns": [
      [
        "^bib:\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ keys$",
        "参考文献：$1 个键"
      ]
    ],
    "preserve": []
  },
  "ch-critic-converge": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "CRITIC LOOP": "评审循环",
      "five dimensions converge or stop": "五个维度收敛，或停止",
      "Each round the critic returns a five-dimension score vector, the revision applies as a structured diff, and the trajectories climb toward the target band. Convergence is engineered, not hoped for: the loop stops on plateau, on target met, or on budget exhausted, and a dimension that regresses is caught because the score is a vector, not a paragraph.": "每轮评审返回一个五维评分向量，修订以结构化差异应用，轨迹逐渐向目标区间上升。收敛依靠设计，而非期待：得分停滞、达到目标或预算耗尽时，循环都会停止。评分是向量而非一段评语，因此任何维度退步都能被发现。",
      "target 8+": "目标 8+",
      "round 1": "第 1 轮",
      "round 2": "第 2 轮",
      "round 3": "第 3 轮",
      "round 4": "第 4 轮",
      "clarity": "清晰度",
      "novelty": "新颖性",
      "evidence": "证据",
      "methodology": "方法",
      "related-work": "相关工作",
      "plateau detected: stop": "检测到停滞：停止"
    },
    "patterns": [
      [
        "^target\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\+$",
        "目标 $1+"
      ],
      [
        "^round\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "第 $1 轮"
      ],
      [
        "^round\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "第 $1 轮"
      ],
      [
        "^round\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "第 $1 轮"
      ],
      [
        "^round\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "第 $1 轮"
      ]
    ],
    "preserve": []
  },
  "ch-ucb-scheduler": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "UCB SCHEDULER": "UCB 调度器",
      "explore, exploit, prune": "探索、利用、剪枝",
      "The queue holds hypotheses scored by upper confidence bound. When a slot frees, the scheduler dispatches the highest-UCB branch; finished experiments fan onto the result bus and loop back to update the statistics, so a finding from one experiment reorders everything behind it. A branch whose bound collapses is pruned instead of burning a slot.": "队列中的假设依据置信上界评分。执行槽空出时，调度器派发 UCB 最高的分支；完成的实验进入结果总线，再回写统计信息。因此，一个实验的发现会重新排列后续所有任务。上界大幅下降的分支会被剪枝，而不再消耗执行槽。",
      "hypothesis queue": "假设队列",
      "slots (parallel)": "并行执行槽",
      "ucb 1.9": "UCB 得分 1.9",
      "slot 0": "执行槽 0",
      "ucb 1.4": "UCB 得分 1.4",
      "slot 1": "执行槽 1",
      "ucb 0.6": "UCB 得分 0.6",
      "slot 2": "执行槽 2",
      "pruned": "已剪枝",
      "result bus": "结果总线",
      "result updates UCB, reorders the queue": "结果更新 UCB，重新排列队列"
    },
    "patterns": [
      [
        "^ucb\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "UCB 得分 $1"
      ],
      [
        "^slot\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "执行槽 $1"
      ],
      [
        "^ucb\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "UCB 得分 $1"
      ],
      [
        "^slot\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "执行槽 $1"
      ],
      [
        "^ucb\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "UCB 得分 $1"
      ],
      [
        "^slot\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "执行槽 $1"
      ]
    ],
    "preserve": []
  },
  "ch-research-pipeline": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "RESEARCH DEMO": "研究演示",
      "five contracts must compose": "五个契约必须能够组合",
      "The demo threads one run through every stage built in the earlier Track D lessons: seed hypotheses, the UCB scheduler, the experiment runner, the critic loop, the paper writer. Each hand-off passes a contract gate that validates the shape before the next stage runs, and the loop self-terminates into a single demo report. If any contract leaks, this is the lesson that catches it.": "这个演示将一次运行穿过此前 D 路线课程构建的所有阶段：初始假设、UCB 调度器、实验运行器、评审循环和论文写作器。每次交接都通过契约关口，先校验数据结构，再运行下一阶段。循环最终自行结束，产出一份演示报告。任何契约漏洞都会在这一课中暴露。",
      "seed": "初始假设",
      "scheduler": "调度器",
      "runner": "运行器",
      "critic": "评审器",
      "writer": "写作器",
      "contract gates: broken input stops the run": "契约关口：输入不合规则停止运行",
      "report": "报告",
      "plain Python imports, no framework": "直接使用 Python import，无需框架"
    },
    "patterns": [],
    "preserve": []
  },
  "ch-patch-tokenizer": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "PATCH EMBEDDING": "图像分块嵌入",
      "a tokenizer for pixels": "像素的分词器",
      "Reading every pixel as a token gives a 150,528-token sequence no 12-layer transformer can afford. Cutting the image into 16x16 squares gives 196 patches; each is flattened to 768 values and projected through one linear layer into the hidden dimension, and a 2D sinusoidal signal restores where each square sat. The transformer sees a short sequence it can chew on.": "将每个像素都作为一个 token，会产生长达 150,528 个 token 的序列，12 层 transformer 无法承受。将图像切成 16x16 方块后，只剩 196 个分块。每个分块展平成 768 个数值，再经一个线性层投影到隐藏维度；2D 正弦信号补回方块的位置信息。transformer 因而能够处理这段较短的序列。",
      "224x224 image, 16x16 patches": "224x224 图像，16x16 分块",
      "flatten (768) + one linear layer": "展平（768）+ 一个线性层",
      "196 tokens of dim 768": "196 个 token，维度为 768",
      "+ 2D sinusoidal position": "+ 2D 正弦位置编码"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x2([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ image,\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x1([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ patches$",
        "$1x2$2 图像，$3x1$4 分块"
      ],
      [
        "^flatten\\ \\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)\\ \\+\\ one\\ linear\\ layer$",
        "展平（$1）+ 一个线性层"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ tokens\\ of\\ dim\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "$1 个 token，维度为 $2"
      ],
      [
        "^\\+\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)D\\ sinusoidal\\ position$",
        "+ $1D 正弦位置编码"
      ]
    ],
    "preserve": [
      {
        "text": "+CLS",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "ch-cls-funnel": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "ViT ENCODER": "ViT 编码器",
      "attention builds awareness": "注意力让分块感知彼此",
      "Patch tokens enter with no awareness of each other. Twelve pre-LN blocks of multi-head self-attention let every patch exchange information with every other, and the CLS token accumulates whole-image features layer by layer; its final hidden state is the pooled summary the rest of the stack reads. This block recipe is the spine of CLIP, SigLIP, and DINOv2.": "图像分块 token 最初不了解彼此。十二个 pre-LN 多头自注意力块让每个分块与所有其他分块交换信息，CLS token 则逐层累积整张图像的特征；它的最终隐藏状态是后续模块读取的池化摘要。这套网络块配方是 CLIP、SigLIP 和 DINOv2 的主干。",
      "block 1": "第 1 个块",
      "block 12": "第 12 个块",
      "CLS pools the whole image": "CLS 汇聚整张图像",
      "12 pre-LN blocks x 12 heads, GELU, 4x FFN": "12 个 pre-LN 块 x 12 个头，GELU，4x FFN"
    },
    "patterns": [
      [
        "^block\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "第 $1 个块"
      ],
      [
        "^block\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "第 $1 个块"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ pre\\-LN\\ blocks\\ x\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ heads,\\ GELU,\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x\\ FFN$",
        "$1 个 pre-LN 块 x $2 个头，GELU，$3x FFN"
      ]
    ],
    "preserve": [
      {
        "text": "CLS",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "ch-projection-bridge": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "MODALITY PROJECTION": "模态投影",
      "a bridge between two spaces": "连接两个空间的桥",
      "The vision encoder and the text table live in unrelated bases. A two-layer MLP, about 1.3M parameters, carries the pooled image vector across into the text embedding space, and a cosine alignment loss against the paired caption pulls the projected point onto its partner. Encoder and text table stay frozen; the bridge is the only piece that learns.": "视觉编码器和文本嵌入表使用互不相关的基。一个约含 1.3M 参数的两层 MLP 将池化图像向量送入文本嵌入空间；与配对图像描述计算的余弦对齐损失，再将投影点拉向其配对点。编码器和文本嵌入表保持冻结，只有这座桥参与学习。",
      "vision space (768d)": "视觉空间（768d）",
      "text space (512d)": "文本空间（512d）",
      "frozen": "冻结",
      "image CLS": "图像 CLS",
      "caption": "图像描述",
      "linear": "线性层",
      "trains (1.3M params)": "参与训练（1.3M 参数）",
      "cosine loss pulls the pair together": "余弦损失拉近配对点"
    },
    "patterns": [
      [
        "^vision\\ space\\ \\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)d\\)$",
        "视觉空间（$1d）"
      ],
      [
        "^text\\ space\\ \\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)d\\)$",
        "文本空间（$1d）"
      ],
      [
        "^trains\\ \\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)M\\ params\\)$",
        "参与训练（$1M 参数）"
      ]
    ],
    "preserve": [
      {
        "text": "GELU",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "ch-crossattn-fan": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "CROSS-ATTENTION": "交叉注意力",
      "text asks, the image answers": "文本提问，图像作答",
      "In late fusion the decoder runs on text-only tokens and reaches into the image stream at every layer: the highlighted token sends a query to every memory token, unmasked, and the weighted answer flows back into its residual stream. Self-attention along the bottom row stays causal. The image side is encoded once and reused for every decode step, so long captions stay cheap.": "在后期融合中，解码器处理纯文本 token，并在每一层访问图像流：高亮 token 向所有图像记忆 token 发出无掩码的 query，加权答案再流回它的残差流。底部一行的自注意力仍遵循因果约束。图像只编码一次，并在每个解码步骤复用，因此生成长图像描述的成本仍较低。",
      "image memory tokens (computed once per image)": "图像记忆 token（每张图像只计算一次）",
      "causal self-attention: left to right only": "因果自注意力：只从左向右",
      "queries: no mask": "query：无掩码"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "cat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "the",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "mat",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "ch-infonce-diagonal": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "DUAL-OBJECTIVE PRETRAINING": "双目标预训练",
      "rank and generate in one pass": "一次前向传播，同时排序与生成",
      "For a batch of N image-caption pairs the similarity matrix has N matching cells on the diagonal and N squared minus N mismatches off it; InfoNCE runs cross-entropy over each row and column so the diagonal brightens while everything else dims. The LM loss trains the same weights to caption each image, and both curves fall together in the 50-step demo loop.": "对于一批 N 个图像—描述配对，相似度矩阵的对角线上有 N 个匹配单元，非对角线上有 N 平方减 N 个不匹配单元。InfoNCE 对每一行和每一列计算交叉熵，让对角线变亮、其余单元变暗。语言模型损失则训练同一组权重，为每张图像生成描述。在 50 步演示循环中，两条损失曲线一同下降。",
      "captions": "图像描述",
      "images": "图像",
      "N positives, N*N - N negatives": "N 个正例，N*N - N 个负例",
      "LM loss": "语言模型损失",
      "50 demo steps, shared weights": "50 个演示步骤，共享权重"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ demo\\ steps,\\ shared\\ weights$",
        "$1 个演示步骤，共享权重"
      ]
    ],
    "preserve": [
      {
        "text": "InfoNCE",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "ch-recall-window": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "MULTIMODAL EVAL": "多模态评估",
      "R@K, exact match, BLEU-4": "R@K、精确匹配、BLEU-4",
      "Three surfaces measure what training loss cannot. Retrieval ranks every image by cosine against a query caption and asks whether the match lands in the top 1, 5, or 10; here it climbs to rank 2, an R@1 miss but an R@5 hit. VQA scores one bit per sample on exact answer match, and captioning takes BLEU-4 over generated tokens with a brevity penalty.": "三个评估面向衡量训练损失无法说明的能力。检索按图像与查询描述的余弦相似度排序，检查正确图像是否进入前 1、5 或 10 名；图中它上升至第 2 名，因此 R@1 未命中，R@5 命中。VQA 按答案精确匹配为每个样本计一位分数，图像描述生成则对生成 token 计算 BLEU-4，并施加长度惩罚。",
      "retrieval: rank every image": "检索：为每张图像排序",
      "R@5 window": "R@5 范围",
      "R@1: row 1 only": "R@1：只看第 1 行",
      "matching image": "匹配的图像",
      "R@1 miss, R@5 hit": "R@1 未命中，R@5 命中",
      "two more surfaces": "另两个评估面向",
      "VQA exact match": "VQA 精确匹配",
      "pred == ref: 1 bit per sample": "pred == ref：每个样本 1 位分数",
      "captioning BLEU-4": "图像描述 BLEU-4",
      "1-4 gram precisions,": "1-4 gram 精确率，",
      "geometric mean + brevity penalty": "几何平均 + 长度惩罚",
      "training loss plateauing is not one of the three": "训练损失停滞不属于这三个评估面向"
    },
    "patterns": [
      [
        "^R@K,\\ exact\\ match,\\ BLEU\\-([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "R@K、精确匹配、BLEU-$1"
      ],
      [
        "^R@([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ window$",
        "R@$1 范围"
      ],
      [
        "^R@([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?):\\ row\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ only$",
        "R@$1：只看第 $2 行"
      ],
      [
        "^R@([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ miss,\\ R@([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ hit$",
        "R@$1 未命中，R@$2 命中"
      ],
      [
        "^pred\\ ==\\ ref:\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ bit\\ per\\ sample$",
        "pred == ref：每个样本 $1 位分数"
      ],
      [
        "^captioning\\ BLEU\\-([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "图像描述 BLEU-$1"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ gram\\ precisions,$",
        "$1$2 gram 精确率，"
      ]
    ],
    "preserve": []
  }
};
