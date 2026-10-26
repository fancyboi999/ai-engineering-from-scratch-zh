(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-capstone-a.js"] = {
  "cap-bpe-merge": {
    "text": {
      "BPE MERGE LOOP": "BPE 合并循环",
      "scan · merge · repeat": "扫描 · 合并 · 重复",
      "Byte-Pair Encoding starts from raw bytes and repeatedly finds the most frequent adjacent pair, merges it into one new symbol, and grows the vocabulary by one id. The scan box sweeps every neighboring pair; the winner collapses into a single token.": "字节对编码从原始字节开始，反复找出最常见的相邻对，将其合并成一个新符号，并让词表增加一个 ID。扫描框扫过每一对相邻元素；获胜的一对折叠为单个 token。",
      "bytes": "字节",
      "merge": "合并",
      "→ new id": "→ 新 ID",
      "vocab + 1": "词表 + 1"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "l",
        "reason": "分词示例的字母及合并结果是原始演示数据"
      },
      {
        "text": "o",
        "reason": "分词示例的字母及合并结果是原始演示数据"
      },
      {
        "text": "w",
        "reason": "分词示例的字母及合并结果是原始演示数据"
      },
      {
        "text": "e",
        "reason": "分词示例的字母及合并结果是原始演示数据"
      },
      {
        "text": "s",
        "reason": "分词示例的字母及合并结果是原始演示数据"
      },
      {
        "text": "t",
        "reason": "分词示例的字母及合并结果是原始演示数据"
      },
      {
        "text": "est",
        "reason": "分词示例的字母及合并结果是原始演示数据"
      }
    ]
  },
  "cap-sliding-window": {
    "text": {
      "SLIDING WINDOW": "滑动窗口",
      "window slides · stride": "窗口滑动 · 步幅",
      "The tokenizer flattens the corpus into one long id stream. A fixed-length window of T ids slides along it by a stride, and the target is the same window shifted left by one for next-token prediction. Smaller strides overlap more and inflate the example count.": "分词器将语料展平为一条很长的 ID 流。长度固定为 T 个 ID 的窗口按步幅沿流移动，目标则是同一窗口向左移一位，用于预测下一个 token。步幅越小，重叠越多，样本数也越大。",
      "token id stream": "token ID 流",
      "input  (B, T)": "输入  (B, T)",
      "target = input shifted by one": "目标 = 输入移位一个位置"
    },
    "patterns": [],
    "preserve": []
  },
  "cap-multihead-attention": {
    "text": {
      "MULTI-HEAD ATTENTION": "多头注意力",
      "one projection · H heads": "一次投影 · H 个头",
      "A single linear layer projects the input to Q, K, and V, then reshapes into H parallel heads of size D/H. Each head runs scaled dot-product attention under the causal mask independently, and the outputs concatenate back to D. The heads specialize during training.": "单个线性层将输入投影为 Q、K 和 V，然后重塑为 H 个并行头，每个头的维度为 D/H。每个头独立在因果掩码下运行缩放点积注意力，输出再拼接回 D 维。各个头会在训练过程中形成分工。",
      "input": "输入",
      "Linear": "线性层",
      "head 1": "头 1",
      "head 2": "头 2",
      "head 3": "头 3",
      "head 4": "头 4",
      "scaled dot-product · causal mask · softmax": "缩放点积 · 因果掩码 · softmax"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "(B,T,D)",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "D→3D",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "cap-training-loop": {
    "text": {
      "step": "步骤",
      "steps": "步数",
      "TRAINING LOOP": "训练循环",
      "forward · backward · step": "前向 · 反向 · 更新",
      "Each step pulls a batch, runs the forward pass to logits, scores cross-entropy loss, backpropagates, and takes an AdamW step under the LR schedule. Repeated thousands of times, the loss curve falls and flattens. Periodic eval and sample probes catch divergence the scalar loss hides.": "每一步取出一个批次，前向计算 logits，求交叉熵损失，反向传播，再按学习率调度执行一次 AdamW 更新。重复数千次后，损失曲线下降并逐渐变平。定期评估与采样检查能发现标量损失掩盖的发散。",
      "batch": "批次",
      "forward": "前向",
      "loss": "损失",
      "backward": "反向",
      "every": "每隔"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "AdamW",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "cap-classifier-head-swap": {
    "text": {
      "CLASSIFIER HEAD SWAP": "替换分类头",
      "freeze body · swap head": "冻结主体 · 替换输出头",
      "A pretrained model is a frozen body plus a head. To classify, you keep the expensive body and lift off the vocabulary head, gluing on a small linear layer to two logits. Train head-only for speed or unfreeze the body for accuracy when the domain drifts.": "预训练模型由主体和输出头构成。做分类时，保留昂贵的主体，卸下词表输出头，接上一个输出两个 logits 的小型线性层。只训练输出头速度快；当领域发生偏移时，也可解冻主体以提高准确率。",
      "transformer body": "transformer 主体",
      "(frozen)": "（已冻结）",
      "block 1": "块 1",
      "block 2": "块 2",
      "block 3": "块 3",
      "block 4": "块 4",
      "pooled": "已池化",
      "old LM head": "原语言模型头",
      "vocab projection": "词表投影",
      "new classifier head": "新分类头",
      "linear → 2 logits": "线性层 → 2 个 logits"
    },
    "patterns": [],
    "preserve": []
  },
  "cap-dpo-preference": {
    "text": {
      "DPO PREFERENCE": "DPO 偏好优化",
      "chosen ↑ · rejected ↓": "选中回答 ↑ · 拒绝回答 ↓",
      "DPO trains the policy directly on chosen-over-rejected pairs, with no separate reward model. The loss is a sigmoid over the log-probability gap relative to a frozen reference, so the chosen completion is pushed up and the rejected pulled down while the KL anchor keeps the policy honest.": "DPO 直接用选中回答优于拒绝回答的样本对训练策略，无需单独的奖励模型。损失是相对于冻结参考模型的对数概率差的 sigmoid，因此选中回答的概率被推高，拒绝回答被拉低，而 KL 锚定约束策略避免偏离。",
      "training steps": "训练步数",
      "frozen reference π_ref": "冻结参考策略 π_ref",
      "chosen  y_w  ↑": "选中  y_w  ↑",
      "rejected  y_l  ↓": "拒绝  y_l  ↓"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "log p",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "cap-corpus-downloader": {
    "text": {
      "CORPUS DOWNLOADER": "语料下载器",
      "stream · resume · dedup": "流式读取 · 断点续传 · 去重",
      "Shards stream from the remote source and decompress through Zstandard without buffering the whole file. A verified byte offset lets a dropped connection resume with an HTTP Range request, and each document gets a MinHash signature bucketed by LSH so near-duplicates collide and drop before reaching the manifest.": "分片从远程源流式读取，经 Zstandard 解压，无需缓存整个文件。校验过的字节偏移可让中断的连接用 HTTP Range 请求续传；每篇文档获得 MinHash 签名，再通过 LSH 分桶，使近似重复项在进入清单前发生碰撞并被丢弃。",
      "remote": "远程",
      "shards": "分片",
      "Range resume": "Range 断点续传",
      "stream": "数据流",
      "duplicate dropped": "丢弃重复项"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "zstd",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "LSH 1",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "LSH 2",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "LSH 3",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "cap-cosine-warmup": {
    "text": {
      "step": "步骤",
      "COSINE LR WARMUP": "余弦学习率预热",
      "ramp up · decay down": "先升高 · 再衰减",
      "The schedule ramps the learning rate linearly from zero to lr_max over the warmup steps, protecting the brittle first updates, then follows the upper half of a cosine curve back toward lr_min. The marker rides the exact value the optimizer uses at each step.": "调度器在预热步数内将学习率从零线性提高到 lr_max，保护脆弱的初始更新；随后沿余弦曲线的上半段回落到 lr_min。标记点沿曲线移动，表示优化器每一步实际使用的值。",
      "warmup": "预热",
      "cosine decay": "余弦衰减"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "lr",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "lr_max",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  }
};
