(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-llmstack5.js"] = {
  "l5-data-pipeline": {
    "text": {
      "Motion reduced": "已减少动画",
      "PRETRAINING DATA PIPELINE": "预训练数据流水线",
      "filter, pack, keep the GPU fed": "过滤、打包，持续供给 GPU",
      "Terabytes of raw text stream through deduplication and quality filters before being packed into fixed-length sequences. Only a fraction survives, and the pipeline has to produce batches faster than the GPUs consume them, or the whole cluster waits on the dataloader.": "数 TB 原始文本经过去重和质量过滤，再打包为固定长度序列。只有一部分内容保留下来；流水线产出批次的速度必须高于 GPU 消耗速度，否则整个集群都在等待数据加载器。",
      "raw text": "原始文本",
      "dedup": "去重",
      "quality": "质量",
      "pack": "打包",
      "duplicate": "重复项",
      "low quality": "低质量",
      "batches": "批次",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "l5-spec-decode-eagle": {
    "text": {
      "Motion reduced": "已减少动画",
      "SPECULATIVE DECODING": "推测解码",
      "draft cheap, verify once": "低成本起草，一次验证",
      "The draft head proposes four cheap tokens. One verifier forward pass scores all of them at once: the agreeing prefix is accepted, the first disagreement is rejected and replaced by a sample from the residual distribution, and everything after it is discarded. On a full accept the verifier emits a bonus token, so one big-model pass can yield N+1 tokens with the verifier distribution preserved exactly.": "草稿头低成本提出四个 token。验证器一次前向计算同时给全部 token 评分：接受一致的前缀，拒绝首个不一致项并从残差分布重采样，丢弃后续项。全部接受时，验证器再输出一个额外 token，因此大模型一次前向可产生 N+1 个 token，同时精确保留验证器分布。",
      "draft": "草稿",
      "verifier: one forward pass": "验证器：一次前向计算",
      "resample": "重采样",
      "two accepted + one corrected token from a single verifier forward": "验证器一次前向，接受两个并纠正一个 token",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^The\\ draft\\ head\\ proposes\\ four\\ cheap\\ tokens\\.\\ One\\ verifier\\ forward\\ pass\\ scores\\ all\\ of\\ them\\ at\\ once:\\ the\\ agreeing\\ prefix\\ is\\ accepted,\\ the\\ first\\ disagreement\\ is\\ rejected\\ and\\ replaced\\ by\\ a\\ sample\\ from\\ the\\ residual\\ distribution,\\ and\\ everything\\ after\\ it\\ is\\ discarded\\.\\ On\\ a\\ full\\ accept\\ the\\ verifier\\ emits\\ a\\ bonus\\ token,\\ so\\ one\\ big\\-model\\ pass\\ can\\ yield\\ N\\+([-+]?\\d+(?:[.,]\\d+)*)\\ tokens\\ with\\ the\\ verifier\\ distribution\\ preserved\\ exactly\\.$",
        "草稿头低成本提出四个 token。验证器一次前向计算同时给全部 token 评分：接受一致的前缀，拒绝首个不一致项并从残差分布重采样，丢弃后续项。全部接受时，验证器再输出一个额外 token，因此大模型一次前向可产生 N+$1 个 token，同时精确保留验证器分布。"
      ]
    ],
    "preserve": []
  },
  "l5-prod-app-paths": {
    "text": {
      "Motion reduced": "已减少动画",
      "request": "请求",
      "PRODUCTION LLM SERVICE": "生产 LLM 服务",
      "two requests, two very different paths": "两条请求，两条截然不同的路径",
      "One request misses every cache and pays the full path: guardrails, retrieval, the model itself. Seconds of latency and full token cost. An identical request moments later short-circuits at the cache and returns in milliseconds for nearly nothing. Production LLM engineering is largely the work of making the second path the common one.": "一条请求未命中任何缓存，完整经过护栏、检索和模型，延迟以秒计，支付全部 token 成本。不久后的相同请求在缓存处短路，几乎免费地在毫秒内返回。生产 LLM 工程的主要工作，就是让第二条路径成为常态。",
      "guard": "护栏",
      "cache": "缓存",
      "respond": "响应",
      "cache hit shortcut": "缓存命中捷径",
      "miss": "未命中",
      "hit": "命中",
      "~2 s, full token cost": "约 2 秒，完整 token 成本",
      "~50 ms, free": "约 50 毫秒，免费",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^\\~([-+]?\\d+(?:[.,]\\d+)*)\\ s,\\ full\\ token\\ cost$",
        "约 $1 秒，完整 token 成本"
      ],
      [
        "^\\~([-+]?\\d+(?:[.,]\\d+)*)\\ ms,\\ free$",
        "约 $1 毫秒，免费"
      ]
    ],
    "preserve": [
      {
        "text": "RAG",
        "reason": "RAG技术缩写"
      }
    ]
  },
  "l5-state-graph-ledger": {
    "text": {
      "Motion reduced": "已减少动画",
      "model": "模型",
      "AGENT STATE MACHINE": "agent 状态机",
      "the loop becomes a graph you can pause": "循环变成可暂停的图",
      "The same ReAct loop drawn as an explicit graph. The walker crosses model, tools, and human-approval nodes, and every transition writes a checkpoint to the ledger below. At the human node execution simply stops: state is already persisted, so the graph can resume later, or rewind to any earlier checkpoint and branch down a different path.": "将同一个 ReAct 循环画成显式图。执行路径经过模型、工具和人工批准节点，每次状态转移都向下方账本写入检查点。在人工节点，执行直接停止：状态已持久化，之后可继续，也可回退到早前任一检查点，沿不同路径分支。",
      "tools": "工具",
      "human": "人工",
      "interrupt: waiting for approval": "中断：等待批准",
      "checkpointer": "检查点存储器",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "END",
        "reason": "状态节点标识"
      }
    ]
  },
  "l5-framework-fit": {
    "text": {
      "Motion reduced": "已减少动画",
      "FRAMEWORK TRADEOFFS": "框架权衡",
      "match the abstraction to the problem shape": "让抽象匹配问题结构",
      "Each framework has one core abstraction, and it is the thing you would draw on a whiteboard. LangGraph draws a state graph, CrewAI an org chart, AutoGen a conversation, Agno a single agent with tools attached. Pick the one whose drawing matches your problem; forcing the wrong shape means writing the missing abstraction yourself, twice.": "每个框架都有一种核心抽象，正是你会在白板上画的结构。LangGraph 画状态图，CrewAI 画组织图，AutoGen 画对话，Agno 画带工具的单个 agent。选择结构匹配问题的框架；强行使用错误结构，等于自己再写两遍缺失的抽象。",
      "the whiteboard test: which shape is your problem?": "白板测试：你的问题是什么结构？",
      "you draw a graph: typed state, edges": "画状态图：有类型的状态、边",
      "you draw an org chart: roles + tasks": "画组织图：角色 + 任务",
      "you draw a chat: agents take turns": "画对话：agent 轮流发言",
      "you draw one box: agent + batteries": "画一个框：agent + 配套能力",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "LangGraph",
        "reason": "产品名"
      },
      {
        "text": "CrewAI",
        "reason": "产品名"
      },
      {
        "text": "AutoGen",
        "reason": "产品名"
      },
      {
        "text": "Agno",
        "reason": "产品名"
      }
    ]
  },
  "l5-vlm-recipe-knobs": {
    "text": {
      "Motion reduced": "已减少动画",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "l5-onevision-budget": {
    "text": {
      "Motion reduced": "已减少动画",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "l5-native-pretrain": {
    "text": {
      "Motion reduced": "已减少动画",
      "NATIVE MULTIMODAL PRETRAINING": "原生多模态预训练",
      "two ways to build the same wall": "建同一面墙的两种方式",
      "Post-hoc training lays down trillions of text tokens first and glues vision on at the end; the seam is alignment debt, visible as catastrophic forgetting, answer drift, and visual-text inconsistency. InternVL3 lays text, interleaved, and caption data together from the first step, so visual tokens are native citizens of the wall rather than an extension bolted on.": "后接训练先铺设数万亿文本 token，最后再接上视觉；接缝就是对齐债务，表现为灾难性遗忘、答案漂移和图文不一致。InternVL3 从第一步起混合文本、交错数据和图像描述，让视觉 token 成为墙体的原生成员，而非事后外挂。",
      "post-hoc: text first, vision bolted on": "后接式：先文本，再外挂视觉",
      "alignment debt": "对齐债务",
      "native: interleaved from step one": "原生：第一步起交错训练",
      "no seam": "无接缝",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "l5-emu3-next-token": {
    "text": {
      "Motion reduced": "已减少动画",
      "EMU3 NEXT-TOKEN GENERATION": "Emu3 下一 token 生成",
      "one head, three modalities": "一个头，三种模态",
      "Emu3 trains a single Llama-style decoder with next-token prediction over one shared vocabulary in which text, VQ image tokens, and 3D video tokens are all just entries. No diffusion schedule, no CLIP loss, no second objective. The same sweep of the same head writes a sentence, an image, or a video clip, which is why one model can be Emu3-Chat and Emu3-Gen at once.": "Emu3 用一个 Llama 风格解码器，在共享词表上训练下一 token 预测；文本、VQ 图像 token 和 3D 视频 token 都只是其中的词条。没有扩散调度、CLIP 损失或第二目标。同一个头以同样的扫描方式写句子、图像或视频，因此一个模型可同时作为 Emu3-Chat 和 Emu3-Gen。",
      "one decoder, one vocabulary, one loss: predict the next token": "一个解码器、一个词表、一个损失：预测下一 token",
      "text": "文本",
      "image tokens": "图像 token",
      "video tokens": "视频 token",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^Emu3\\ trains\\ a\\ single\\ Llama\\-style\\ decoder\\ with\\ next\\-token\\ prediction\\ over\\ one\\ shared\\ vocabulary\\ in\\ which\\ text,\\ VQ\\ image\\ tokens,\\ and\\ ([-+]?\\d+(?:[.,]\\d+)*)D\\ video\\ tokens\\ are\\ all\\ just\\ entries\\.\\ No\\ diffusion\\ schedule,\\ no\\ CLIP\\ loss,\\ no\\ second\\ objective\\.\\ The\\ same\\ sweep\\ of\\ the\\ same\\ head\\ writes\\ a\\ sentence,\\ an\\ image,\\ or\\ a\\ video\\ clip,\\ which\\ is\\ why\\ one\\ model\\ can\\ be\\ Emu3\\-Chat\\ and\\ Emu3\\-Gen\\ at\\ once\\.$",
        "Emu3 用一个 Llama 风格解码器，在共享词表上训练下一 token 预测；文本、VQ 图像 token 和 $1D 视频 token 都只是其中的词条。没有扩散调度、CLIP 损失或第二目标。同一个头以同样的扫描方式写句子、图像或视频，因此一个模型可同时作为 Emu3-Chat 和 Emu3-Gen。"
      ]
    ],
    "preserve": []
  },
  "l5-janus-decouple": {
    "text": {
      "Motion reduced": "已减少动画",
      "JANUS-PRO DECOUPLED ENCODERS": "Janus-Pro 解耦编码器",
      "two front doors, one hall": "两个入口，同一主干",
      "Understanding wants semantic features, generation wants reconstruction-friendly codes, and one encoder cannot serve both. Janus-Pro routes understanding through SigLIP and generation through a VQ tokenizer while both tasks share the same transformer body. Two front doors, one hall, and neither task pays the other's quality tax.": "理解任务需要语义特征，生成任务需要利于重建的编码，单个编码器难以兼顾。Janus-Pro 将理解任务送入 SigLIP，将生成任务送入 VQ 分词器，两者共享同一个 transformer 主干。两个入口共用主干，各任务无需承担另一任务的质量代价。",
      "shared": "共享",
      "understand": "理解",
      "image": "图像",
      "text answer": "文本回答",
      "VQ decoder": "VQ 解码器",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "SigLIP",
        "reason": "模型名"
      },
      {
        "text": "generate",
        "reason": "状态节点标识"
      }
    ]
  },
  "l5-thinker-talker": {
    "text": {
      "Motion reduced": "已减少动画",
      "THINKER-TALKER SPLIT": "Thinker-Talker 分离",
      "parallel streams beat the latency budget": "并行流满足延迟预算",
      "Qwen2.5-Omni splits the voice pipeline: a large Thinker writes the reply as text tokens while a small Talker converts them to speech tokens in parallel, trailing only a couple of tokens behind. The first audio reaches the speaker while most of the sentence is still unwritten, which is how the round trip stays under the 500 ms conversational threshold.": "Qwen2.5-Omni 拆开语音流水线：较大的 Thinker 写出文本 token，较小的 Talker 并行转为语音 token，只落后几个 token。句子大部分尚未写出，首段音频已到扬声器，因此往返延迟可低于 500 ms 的会话阈值。",
      "text tokens": "文本 token",
      "speech tokens": "语音 token",
      "first audio ~350 ms": "首段音频约 350 ms",
      "time": "时间",
      "the talker streams while the thinker is still writing": "Thinker 仍在写作时，Talker 已流式输出",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^Qwen2\\.([-+]?\\d+(?:[.,]\\d+)*)\\-Omni\\ splits\\ the\\ voice\\ pipeline:\\ a\\ large\\ Thinker\\ writes\\ the\\ reply\\ as\\ text\\ tokens\\ while\\ a\\ small\\ Talker\\ converts\\ them\\ to\\ speech\\ tokens\\ in\\ parallel,\\ trailing\\ only\\ a\\ couple\\ of\\ tokens\\ behind\\.\\ The\\ first\\ audio\\ reaches\\ the\\ speaker\\ while\\ most\\ of\\ the\\ sentence\\ is\\ still\\ unwritten,\\ which\\ is\\ how\\ the\\ round\\ trip\\ stays\\ under\\ the\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ ms\\ conversational\\ threshold\\.$",
        "Qwen2.$1-Omni 拆开语音流水线：较大的 Thinker 写出文本 token，较小的 Talker 并行转为语音 token，只落后几个 token。句子大部分尚未写出，首段音频已到扬声器，因此往返延迟可低于 $2 ms 的会话阈值。"
      ],
      [
        "^first\\ audio\\ \\~([-+]?\\d+(?:[.,]\\d+)*)\\ ms$",
        "首段音频约 $1 ms"
      ]
    ],
    "preserve": [
      {
        "text": "THINKER",
        "reason": "模型组件专名"
      },
      {
        "text": "TALKER",
        "reason": "模型组件专名"
      }
    ]
  }
};
