(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-multimodal2.js"] = {
  "mm-llava-projector": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "LLAVA PROJECTOR": "LLaVA 投影器",
      "patches become LLM tokens": "图像分块变成 LLM token",
      "LLaVA replaced the Q-Former bottleneck with the simplest possible bridge: a 2-layer MLP that maps each frozen ViT patch embedding from the vision dimension up to the language model embedding dimension. Every patch becomes one token the LLM reads in its own input sequence, trained directly on the language-model loss. Simpler won.": "LLaVA 用最简单的桥替代 Q-Former 瓶颈：一个 2 层 MLP，将冻结 ViT 的每个分块嵌入从视觉维度映射到语言模型嵌入维度。每个分块都变成 LLM 输入序列中的一个 token，直接依据语言模型损失训练。更简单的方案胜出了。",
      "ViT patches": "ViT 图像分块",
      "2-layer MLP": "2 层 MLP",
      "LLM tokens": "LLM 的 token",
      "dim 1024": "维度 1024",
      "dim 4096": "维度 4096"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\-layer\\ MLP$",
        "$1 层 MLP"
      ],
      [
        "^dim\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "维度 $1"
      ],
      [
        "^dim\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "维度 $1"
      ]
    ],
    "preserve": [
      {
        "text": "GELU -> 4096",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "GELU -> 4096",
        "reason": "产品名、公式或演示字面量，保持原样"
      },
      {
        "text": "GELU -> 4096",
        "reason": "产品名、公式或演示字面量，保持原样"
      },
      {
        "text": "GELU -> 4096",
        "reason": "产品名、公式或演示字面量，保持原样"
      }
    ]
  },
  "mm-patch-n-pack": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "PATCH-N-PACK": "Patch-n-pack 图像打包",
      "images stream into one sequence": "将多张图像打包为一个序列",
      "Each image keeps its native aspect ratio and contributes its own count of patches: a wide chart, a tall receipt, a small icon. Patch-n-pack concatenates all of them into a single transformer sequence with a block-diagonal mask, so an image only attends to its own patches. No square-resize, no padding tokens wasted.": "每张图像保留原始宽高比，并贡献不同数量的分块，例如横向图表、竖向收据和小图标。Patch-n-pack 将这些分块拼成一个 transformer 序列，并使用块对角掩码，使每张图像只关注自己的分块。不必缩放成正方形，也不会把 token 浪费在填充上。",
      "variable-resolution images": "不同分辨率的图像",
      "one packed sequence (block-diagonal mask)": "一个打包序列（块对角掩码）",
      "9 patch tokens · 0 padding": "9 个分块 token · 0 个填充"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ patch\\ tokens\\ ·\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ padding$",
        "$1 个分块 token · $2 个填充"
      ]
    ],
    "preserve": []
  },
  "mm-mrope-axes": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "mm-video-token-budget": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "VIDEO TOKEN BUDGET": "视频 token 预算",
      "frames per second multiply tokens": "每秒帧数成倍增加 token",
      "Visual tokens scale with sampled frames, and frames scale with FPS times duration. Doubling the sampling rate doubles the token count, so an hour-long clip races past any fixed context window. The three escape routes are brute-force million-token context, ring attention split across devices, and aggressive pooling or agentic retrieval that never loads the whole video at once.": "视觉 token 数随采样帧数增长，而帧数等于 FPS 乘时长。采样率翻倍，token 数也翻倍，因此一小时视频很快就会超过任何固定上下文窗口。三条出路是直接使用百万 token 上下文、在设备间分摊环形注意力，或积极池化与 agent 检索，避免一次加载整段视频。",
      "context limit": "上下文上限",
      "tokens": "token 数",
      "frames per second": "每秒帧数",
      "1 fps": "1 帧/秒",
      "2 fps": "2 帧/秒",
      "4 fps": "4 帧/秒",
      "8 fps": "8 帧/秒",
      "16 fps": "16 帧/秒"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ fps$",
        "$1 帧/秒"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ fps$",
        "$1 帧/秒"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ fps$",
        "$1 帧/秒"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ fps$",
        "$1 帧/秒"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ fps$",
        "$1 帧/秒"
      ]
    ],
    "preserve": []
  },
  "mm-action-tokens": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "ACTION TOKENIZATION": "动作分词",
      "joints snap to discrete bins": "将关节目标映射到离散分箱",
      "A vision-language-action model has to emit motor commands, but a transformer speaks in tokens. RT-2 discretizes each normalized joint target into one of 256 bins and maps the bin to a vocabulary ID, so a 10-DOF action becomes ten ordinary tokens. The same decoder that captions an image now writes a control trajectory, which is what lets web-scale knowledge transfer to the robot.": "视觉语言动作模型必须输出电机控制命令，但 transformer 处理的是 token。RT-2 将每个归一化关节目标离散为 256 个分箱之一，再将分箱映射为词表 ID，因此一个 10 自由度动作变成十个普通 token。原本为图像生成描述的同一个解码器，现在能写出控制轨迹，使网络规模的知识迁移到机器人上。",
      "continuous joint target -> discrete action token": "连续关节目标 -> 离散动作 token",
      "256 bins -> vocabulary IDs · 10 DOF = 10 tokens per step": "256 个分箱 -> 词表 ID · 10 个自由度 = 每步 10 个 token"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ bins\\ \\->\\ vocabulary\\ IDs\\ ·\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ DOF\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ tokens\\ per\\ step$",
        "$1 个分箱 -> 词表 ID · $2 个自由度 = 每步 $3 个 token"
      ]
    ],
    "preserve": []
  },
  "mm-doc-layout": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "DOCUMENT LAYOUT": "文档版面",
      "page resolves into typed regions": "将页面识别为不同类型区域",
      "A document is not a photo. Title, body text, figures, and tables each carry meaning from where they sit on the page. OCR-free models like Donut and Nougat read the page image and emit structured markup directly, while layout-aware encoders fuse three input streams at once: the text content, the bounding-box layout, and the image patches. The position of \"Total: $1,245\" is part of the answer.": "文档不等于照片。标题、正文、图和表都会通过它们在页面中的位置传达含义。Donut 和 Nougat 等无需 OCR 的模型直接读取页面图像并输出结构化标记；版面感知编码器则同时融合三路输入：文本内容、边界框版面和图像分块。“Total: $1,245”在页面上的位置也是答案的一部分。",
      "OCR-free model emits typed regions": "无需 OCR 的模型输出带类型区域",
      "title": "标题",
      "text": "正文",
      "figure": "图",
      "table": "表",
      "layout": "版面",
      "image": "图像",
      "three streams": "三路输入"
    },
    "patterns": [],
    "preserve": []
  },
  "mm-maxsim": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "LATE-INTERACTION MAXSIM": "后期交互 MaxSim",
      "each term finds its best patch": "每个词寻找最匹配的分块",
      "Text-RAG collapses a page into one vector and loses charts and tables. ColPali keeps one vector per image patch and one per query term, then scores by MaxSim: each query term takes the maximum similarity over all page patches, and the page score is the sum of those maxima. A query about a chart can latch onto the exact patch that holds it, with no OCR step in between.": "文本 RAG 将页面压缩成一个向量，丢失图表信息。ColPali 为每个图像分块保留一个向量，也为每个查询词保留一个向量，再用 MaxSim 评分：每个查询词取所有页面分块中的最大相似度，页面得分是这些最大值之和。关于图表的查询可以直接匹配到包含该图表的具体分块，无需中间 OCR 步骤。",
      "query term vectors": "查询词向量",
      "page patch vectors": "页面分块向量",
      "revenue": "收入",
      "chart": "图表",
      "score = sum over query terms of max patch similarity": "得分 = 各查询词最大分块相似度之和"
    },
    "patterns": [],
    "preserve": []
  },
  "mm-agent-loop": {
    "text": {
      "AGENT LOOP": "agent 循环",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "A computer-use agent runs a cycle: perceive the screen, reason about the goal, emit a structured action such as a click coordinate or a typed string, then observe the resulting screenshot and go again. Every turn is one multimodal model call, and grounding to the right pixel is the hard part. Because mistakes carry into the next observation, recovery matters as much as the first plan.": "计算机操作 agent 循环执行四件事：感知屏幕、围绕目标推理、输出点击坐标或输入文本等结构化动作，再观察新的截图并继续。每一轮都是一次多模态模型调用，难点是将动作准确定位到像素。错误会延续到下一次观察，因此恢复能力与最初的计划同样重要。",
      "multimodal agent loop": "多模态 agent 循环",
      "perceive": "感知",
      "screenshot": "截图",
      "reason": "推理",
      "plan": "计划",
      "act": "行动",
      "click (x,y)": "点击 (x,y)",
      "observe": "观察",
      "new state": "新状态",
      "repeat until the task is done · errors compound": "重复直到任务完成 · 错误会累积",
      "perceive, reason, act, observe": "感知、推理、行动、观察"
    },
    "patterns": [],
    "preserve": []
  }
};
