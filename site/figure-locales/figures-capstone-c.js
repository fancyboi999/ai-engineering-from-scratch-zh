(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-capstone-c.js"] = {
  "cc-embedding-lookup": {
    "text": {
      "EMBEDDING LOOKUP": "嵌入查表",
      "select row · add position": "选择一行 · 加上位置",
      "A token id is not arithmetic; it is an index. The id selects one row of the token table, returning a dense vector the model treats as the meaning of that id. Position has no inherent vector either, so a parallel positional embedding is looked up by slot and summed elementwise. The result is the (B, T, D) tensor the first attention block consumes.": "一个 token ID 不参与数值运算，而是用作索引。它选中 token 表的一行，返回一个稠密向量，模型将其作为该 ID 的含义。位置也没有天然向量，因此并行的位置嵌入按槽位查表，再逐元素相加。结果是第一个注意力块接收的 (B, T, D) 张量。",
      "token table  (V, D)": "token 表  (V, D)",
      "row 3": "第 3 行",
      "token vec (D)": "token 向量 (D)",
      "position vec (D)": "位置向量 (D)",
      "input (B,T,D)": "输入 (B,T,D)"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "id 0",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "id 1",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "id 2",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "id 3",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "id 4",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "id 5",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "cc-transformer-block": {
    "text": {
      "TRANSFORMER BLOCK": "transformer 块",
      "Transformer Block": "transformer 块",
      "two residual bypasses": "两条残差旁路",
      "The block has exactly two sublayers and two residual paths. The input forks: one copy flows through LayerNorm then attention, the other skips straight to the add. The same fork repeats around the MLP. The clean bypass is what lets gradients reach the bottom of a deep stack, and placing the norm inside the bypass (pre-LN) is why the stack trains without a warmup crutch.": "该块恰好包含两个子层和两条残差路径。输入分叉：一份经过 LayerNorm 和注意力，另一份直接跳到加法节点。同样的分叉在 MLP 周围再出现一次。干净的旁路让梯度能到达深层堆栈底部；将归一化放在旁路内部（pre-LN），则使堆栈无需依赖预热来稳定训练。",
      "input  (B, T, D)": "输入  (B, T, D)",
      "attention": "注意力",
      "causal · multi-head": "因果 · 多头",
      "add residual": "加上残差",
      "residual": "残差",
      "output  (B, T, D)": "输出  (B, T, D)",
      "norm sits": "归一化位于",
      "inside the": "旁路",
      "bypass, so": "内部，因此",
      "the residual": "残差",
      "path stays": "路径在",
      "clean to depth": "深层仍保持畅通"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "LayerNorm 1",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "LayerNorm 2",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "MLP  D→4D→D",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "pre-LN:",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "cc-gpt-assembly": {
    "text": {
      "GPT ASSEMBLY": "组装 GPT",
      "embed · stack · tie": "嵌入 · 堆叠 · 共享权重",
      "The whole 124M model is four pieces: a token table, a position table summed into it, twelve identical blocks lit in sequence, a final LayerNorm, and a language-model head. The head is not new weights; it reuses the token-embedding matrix transposed, which is why tying saves roughly 38M parameters at this scale and makes the count land exactly on the reference.": "完整的 124M 模型由四类部件组成：token 表、与其相加的位置表、依次点亮的十二个相同块，以及最终的 LayerNorm 和语言模型头。输出头没有新增权重，而是转置复用 token 嵌入矩阵。因此，在此规模下权重共享约节省 38M 参数，并使总参数量恰好符合参考实现。",
      "token ids  (B, T)": "token 编号  (B, T)",
      "tok emb": "token 嵌入",
      "pos emb": "位置嵌入",
      "12 blocks": "12 个块",
      "final LayerNorm": "最终 LayerNorm",
      "LM head → logits": "语言模型头 → logits",
      "weights": "权重",
      "tied": "已共享",
      "124M total": "总计 124M",
      "+ 12 blocks": "+ 12 个块",
      "head free": "输出头不增参数",
      "(tied)": "（权重共享）"
    },
    "patterns": [],
    "preserve": []
  },
  "cc-weight-remap": {
    "text": {
      "WEIGHT REMAP": "权重名称映射",
      "rename · shape-check · assign": "重命名 · 核对形状 · 赋值",
      "A published checkpoint carries the original implementation's parameter names, not yours. The loader is a string-to-string mapper feeding a single shape check: matching tensors copy under no_grad into the local name, mismatches are logged and refused rather than copied blindly. Every assignment is recorded so a misload shows up in the report instead of as silent gibberish at generation time.": "发布的检查点使用原始实现的参数名称，而不是你的名称。加载器先进行字符串到字符串的映射，再做统一的形状检查：形状匹配的张量在 no_grad 下复制到本地参数；不匹配项会被记录并拒绝，不会盲目复制。每次赋值都有记录，因此错误加载会在报告中暴露，而不是等生成时才表现为无声的乱码。",
      "pretrained names": "预训练参数名",
      "local model": "本地模型",
      "shape": "形状",
      "check": "检查",
      "✗ mismatch logged": "✗ 已记录不匹配"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "wte",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "tok_embed",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "h.0.attn.c_attn",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "blocks.0.attn.qkv",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "h.0.mlp.c_fc",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "blocks.0.mlp.fc1",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "cc-sft-loss-mask": {
    "text": {
      "SFT LOSS MASK": "SFT 损失掩码",
      "instruction off · response scored": "指令不计分 · 回答计分",
      "Instruction tuning packs each example into one sequence with boundary tokens, but the instruction is given, not learned. The collate function sets those positions to ignore_index -100 so cross-entropy skips them entirely. Only the tokens after the response boundary contribute loss, so the gradient teaches the model to produce the answer rather than to memorize the prompt.": "指令微调将每个样本连同边界 token 打包成一个序列，但指令是给定条件，而不是学习目标。整理批次的函数将这些位置设为 ignore_index -100，使交叉熵完全跳过它们。只有回答边界之后的 token 贡献损失，因此梯度教模型生成答案，而不是记住 prompt。",
      "one causal sequence": "一条因果序列",
      "instruction · masked, zero gradient": "指令 · 已屏蔽，梯度为零",
      "response · scored": "回答 · 计分",
      "update": "更新"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "<INST>",
        "reason": "保留指令微调演示中的输入词、边界token及交叉熵缩写，避免改变训练样本"
      },
      {
        "text": "capital",
        "reason": "保留指令微调演示中的输入词、边界token及交叉熵缩写，避免改变训练样本"
      },
      {
        "text": "of",
        "reason": "保留指令微调演示中的输入词、边界token及交叉熵缩写，避免改变训练样本"
      },
      {
        "text": "France",
        "reason": "保留指令微调演示中的输入词、边界token及交叉熵缩写，避免改变训练样本"
      },
      {
        "text": "<RESP>",
        "reason": "保留指令微调演示中的输入词、边界token及交叉熵缩写，避免改变训练样本"
      },
      {
        "text": "Paris",
        "reason": "保留指令微调演示中的输入词、边界token及交叉熵缩写，避免改变训练样本"
      },
      {
        "text": "CE",
        "reason": "保留指令微调演示中的输入词、边界token及交叉熵缩写，避免改变训练样本"
      },
      {
        "text": "is",
        "reason": "保留指令微调演示中的输入词、边界token及交叉熵缩写，避免改变训练样本"
      },
      {
        "text": "it",
        "reason": "保留指令微调演示中的输入词、边界token及交叉熵缩写，避免改变训练样本"
      }
    ]
  },
  "cc-hdf5-corpus": {
    "text": {
      "HDF5 CORPUS": "HDF5 语料库",
      "buffer · resize · mmap read": "缓冲 · 扩容 · mmap 读取",
      "Writing one document at a time fragments the file; writing everything at once loses the shard on a crash. The honest discipline is buffer-then-extend: accumulate tokens until the buffer matches the chunk size, resize the dataset by exactly that chunk, and write the new range. At training time a memory-mapped slice copies a hyperslab straight from the page cache into the batch buffer.": "逐篇写入文档会使文件碎片化；一次写入全部内容又会在崩溃时丢失整个分片。可靠做法是先缓冲再扩展：累积 token，直到缓冲区达到分块大小；再将数据集恰好扩展一个分块，写入新增范围。训练时，内存映射切片把超矩形数据块从页缓存直接复制到批次缓冲区。",
      "tokenized docs": "已分词文档",
      "buffer (= chunk)": "缓冲区（= 分块）",
      "flush": "刷写",
      "HDF5 resizable dataset": "可扩容的 HDF5 数据集",
      "new range": "新增范围",
      "mmap slice → batch buffer": "mmap 切片 → 批次缓冲区"
    },
    "patterns": [],
    "preserve": []
  },
  "cc-grad-accumulation": {
    "text": {
      "GRADIENT ACCUMULATION": "梯度累积",
      "pile grads · step on last": "累加梯度 · 最后一步更新",
      "When the accelerator holds 32 examples but the loss curve wants 512, run the backward pass micro-batch by micro-batch and let the gradients sum inside the parameter buffers. Each loss is divided by the accumulation count so the running sum matches a single full-batch backward, and the optimizer steps exactly once when the buffer is full, with synchronization deferred to the last micro-batch.": "当加速器只能容纳 32 个样本，而损失曲线要求批大小为 512 时，可逐个微批次运行反向传播，让梯度在参数缓冲区内累加。每次损失除以累积次数，使累加结果与单个完整批次的反向传播一致。缓冲区满时，优化器只更新一次，同步也推迟到最后一个微批次。",
      "one effective batch = 4 micro-batches": "一个有效批次 = 4 个微批次",
      "accumulated grad buffer": "累积梯度缓冲区",
      "micro 1": "微批次 1",
      "loss / 4": "损失 / 4",
      "micro 2": "微批次 2",
      "micro 3": "微批次 3",
      "micro 4": "微批次 4",
      "sync": "同步",
      "optimizer step": "优化器更新",
      "once per": "每个有效批次",
      "effective batch": "执行一次"
    },
    "patterns": [],
    "preserve": []
  },
  "cc-atomic-checkpoint": {
    "text": {
      "optimizer": "优化器",
      "ATOMIC CHECKPOINT": "原子检查点",
      "write temp · rename over": "写临时文件 · 重命名覆盖",
      "A resume needs the entire training state, model, optimizer, scheduler, step counters, and the RNG state for every randomness source, or the post-resume loss curve diverges from the uninterrupted one. The save writes into a temporary file, fsyncs, then renames over the final name. Because POSIX rename is atomic, a crash mid-write leaves the previous good checkpoint untouched rather than a half-written corpse.": "恢复训练需要完整状态：模型、优化器、调度器、步数计数器，以及所有随机来源的 RNG 状态，否则恢复后的损失曲线会偏离不中断的运行。保存时先写入临时文件，再执行 fsync，最后重命名覆盖最终文件。由于 POSIX rename 是原子操作，即使写入中途崩溃，之前完整的检查点也保持不变，而不是留下写了一半的残缺文件。",
      "checkpoint payload": "检查点载荷",
      "model": "模型",
      "scheduler": "调度器",
      "step + losses": "步数 + 损失",
      "RNG state": "RNG 状态",
      "write + fsync": "写入 + fsync",
      "atomic": "原子操作",
      "always valid": "始终有效",
      "crash here?": "此处崩溃？",
      "old file safe": "旧文件安全"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "ckpt.tmp",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "os.replace",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "ckpt.pt",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  }
};
