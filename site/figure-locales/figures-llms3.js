(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-llms3.js"] = {
  "rnn-vs-parallel": {
    "text": {
      "WHY TRANSFORMERS": "为何采用 transformer",
      "serial state vs parallel attention": "串行状态与并行注意力",
      "An RNN drags a single hidden state across the sequence one step at a time, so a 1,000-token input is 1,000 serial steps. A transformer lets every position attend to every other in one parallel matrix multiply. That single bet — drop recurrence — is what let the curves keep scaling after 2017.": "RNN 每次只把一个隐藏状态沿序列推进一步，因此 1,000 个 token 的输入需要 1,000 个串行步骤。transformer 用一次并行矩阵乘法，让每个位置都能关注其他所有位置。放弃循环这一选择，使规模曲线在 2017 年后仍能持续扩展。",
      "RNN — serial": "RNN — 串行",
      "TRANSFORMER — parallel": "transformer — 并行",
      "serial: t+1 waits for t   vs   parallel: one matmul": "串行：t+1 等待 t   对比   并行：一次矩阵乘法"
    },
    "patterns": [],
    "preserve": []
  },
  "encoder-decoder": {
    "text": {
      "ENCODER – DECODER": "编码器 – 解码器",
      "cross-attention lights up": "交叉注意力逐步点亮",
      "The encoder reads the whole source once and freezes a dense representation. The decoder then generates the output token by token, cross-attending into that representation at every layer. Translation, summarization, and transcription are all this same input-to-output shape.": "编码器一次读完整个源输入，并固定一份稠密表示。解码器随后逐个 token 生成输出，每层都对该表示执行交叉注意力。翻译、摘要和转录都遵循同样的输入到输出结构。",
      "ENCODER": "编码器",
      "DECODER": "解码器"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "the cat sleeps",
        "reason": "保留翻译示例的英文输入句子，避免改变演示语料"
      }
    ]
  },
  "expert-routing": {
    "text": {
      "MIXTURE OF EXPERTS": "混合专家（MoE）",
      "route each token to a few experts": "将每个 token 路由给少数专家",
      "A dense block runs one FFN for every token. An MoE block swaps in many expert FFNs and a router that sends each token to only the top-k of them. Total parameters scale with the number of experts, but compute per token scales only with k — so the model gets bigger without getting slower.": "稠密块对每个 token 都运行同一个 FFN。MoE 块则换入多个专家 FFN，再由路由器只把每个 token 发送给排名前 k 个专家。总参数量随专家数增长，而每个 token 的计算量只随 k 增长，因此模型可以增大而不变慢。",
      "router": "路由器",
      "expert 1": "专家 1",
      "expert 2": "专家 2",
      "expert 3": "专家 3",
      "expert 4": "专家 4",
      "each token activates top-k of E experts — the rest stay idle": "每个 token 激活 E 个专家中的 top-k 个，其余保持空闲"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "the",
        "reason": "保留路由示例中的原始 token 语料"
      },
      {
        "text": "cat",
        "reason": "保留路由示例中的原始 token 语料"
      },
      {
        "text": "sat",
        "reason": "保留路由示例中的原始 token 语料"
      },
      {
        "text": "down",
        "reason": "保留路由示例中的原始 token 语料"
      }
    ]
  },
  "draft-verify-tokens": {
    "text": {
      "SPECULATIVE DECODING": "推测解码",
      "draft → verify → keep the prefix": "草拟 → 验证 → 保留前缀",
      "A cheap drafter proposes several tokens in quick small passes. The big model then verifies all of them in a single forward pass, accepting the longest prefix that matches its own distribution and rejecting the rest. When the draft is good you get many tokens for the price of one big step — with no change to the output distribution.": "低成本草稿模型通过数次快速的小规模计算提出多个 token。大模型随后用一次前向传播验证全部 token，接受符合自身分布的最长前缀，拒绝其余部分。草稿质量好时，一次大模型计算的成本便可换来多个 token，且输出分布不变。",
      "DRAFT": "草拟",
      "VERIFY": "验证",
      "accept": "接受",
      "reject": "拒绝"
    },
    "patterns": [],
    "preserve": []
  },
  "loss-masking": {
    "text": {
      "SFT LOSS MASKING": "SFT 损失掩码",
      "learn the reply, not the prompt": "学习回答，而非 prompt",
      "A chat example contains system, user, and assistant turns, but the model should only be trained to produce the assistant turn. Loss masking zeroes the gradient on every prompt token so the model learns to answer rather than to memorize and replay the question.": "对话样本包含 system、user 和 assistant 轮次，但模型只应被训练为生成 assistant 轮次。损失掩码将每个 prompt token 的梯度设为零，使模型学会回答，而不是记住并复述问题。",
      "loss ↑ only on assistant tokens": "损失 ↑ 仅作用于 assistant token",
      "prompt tokens masked — gradient = 0": "prompt token 被屏蔽 — 梯度 = 0"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "system",
        "reason": "保留对话角色协议标识和原始训练样例词语，不改变模型输入"
      },
      {
        "text": "You",
        "reason": "保留对话角色协议标识和原始训练样例词语，不改变模型输入"
      },
      {
        "text": "are",
        "reason": "保留对话角色协议标识和原始训练样例词语，不改变模型输入"
      },
      {
        "text": "helpful",
        "reason": "保留对话角色协议标识和原始训练样例词语，不改变模型输入"
      },
      {
        "text": "user",
        "reason": "保留对话角色协议标识和原始训练样例词语，不改变模型输入"
      },
      {
        "text": "capital?",
        "reason": "保留对话角色协议标识和原始训练样例词语，不改变模型输入"
      },
      {
        "text": "assistant",
        "reason": "保留对话角色协议标识和原始训练样例词语，不改变模型输入"
      },
      {
        "text": "Paris",
        "reason": "保留对话角色协议标识和原始训练样例词语，不改变模型输入"
      }
    ]
  },
  "self-critique-loop": {
    "text": {
      "CONSTITUTIONAL AI": "宪法式 AI",
      "critique and revise, no human": "自评并修订，无需人工",
      "Instead of paying humans for preference labels, the model grades itself. It drafts an answer, critiques that draft against a written constitution of principles, and revises. The revised pairs become the training signal, so most of the alignment work loops through the model itself.": "模型自行评分，而不是付费请人标注偏好。它先起草回答，再依据写好的原则宪法批评草稿，随后修订。修订前后的样本对构成训练信号，因此大部分对齐工作在模型自身的循环中完成。",
      "draft": "起草",
      "critique": "自评",
      "revise": "修订",
      "constitution": "原则宪法"
    },
    "patterns": [],
    "preserve": []
  },
  "multi-token-predict": {
    "text": {
      "MULTI-TOKEN PREDICTION": "多 token 预测",
      "one state, several futures": "一个状态，多个未来",
      "Standard training supervises each hidden state to predict exactly one next token — a weak signal. MTP adds depth heads that each predict a token further ahead, chained so the causal order survives. The richer signal sharpens the backbone, and the trained heads double as a speculative drafter at inference.": "标准训练要求每个隐藏状态恰好预测一个下一个 token，监督信号较弱。MTP 增加深度预测头，各自预测更远处的 token，并以链式结构保留因果顺序。更丰富的信号改善主干网络；训练好的预测头还可在推理时充当推测解码的草稿模型。",
      "one hidden state": "一个隐藏状态"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "h_t",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "MTP t+1",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "MTP t+2",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "MTP t+3",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "activation-recompute": {
    "text": {
      "GRADIENT CHECKPOINTING": "梯度检查点",
      "trade FLOPs for memory": "用计算量换内存",
      "Backward needs the forward activations, but keeping them all blows the memory budget. Checkpointing saves only a few layers (solid) and discards the rest. During backward, each dropped segment is recomputed from the nearest checkpoint — a little extra compute buys a large drop in peak memory.": "反向传播需要前向激活，但保留全部激活会超出内存预算。检查点只保存少数层（实心），丢弃其余激活。反向传播期间，从最近的检查点重新计算每个被丢弃的片段：多花少量计算，便能大幅降低峰值内存。",
      "FWD": "前向",
      "BWD": "反向",
      "save": "保存",
      "recompute dropped activations during backward": "反向传播时重算已丢弃的激活"
    },
    "patterns": [],
    "preserve": []
  }
};
