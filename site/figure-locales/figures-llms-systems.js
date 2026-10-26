(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-llms-systems.js"] = {
  "perplexity-loss": {
    "text": {
      "PERPLEXITY": "困惑度",
      "Perplexity is the exponential of cross-entropy loss, read as the effective number of equally likely choices the model is deciding between per token. A model that guessed uniformly over a vocabulary of size V would score perplexity exactly V (the orange line), so any useful model must land well below it.": "困惑度是交叉熵损失的指数，可读作模型每个 token 在多少个等可能选项之间犹豫。在大小为 V 的词表上均匀乱猜的模型，困惑度恰为 V（橙线），所以任何有用的模型都必须远低于它。",
      "perplexity": "困惑度"
    },
    "patterns": [
      [
        "^cross-entropy ([\\d.]+) nats  ·  random over V = ([\\d.KMB]+) has loss ln V = ([\\d.]+), perplexity ([\\d.KMB]+)$",
        "交叉熵 $1 nat · 在 V = $2 个词上均匀随机猜测，损失 ln V = $3，困惑度 $4"
      ],
      [
        "^perplexity = e\\^loss   ·   a uniform guess over V tokens scores loss ln V and perplexity exactly V$",
        "困惑度 = e^loss · 在 V 个 token 上均匀猜测，损失为 ln V，困惑度恰为 V"
      ]
    ],
    "preserve": []
  },
  "context-window-slide": {
    "text": {
      "CONTEXT WINDOW": "上下文窗口",
      "A model can only attend over a fixed window. As the sequence grows past it, the oldest tokens slide out of the orange frame and are no longer visible to attention. This is the rolling context: recent tokens stay, early ones are forgotten unless they are summarized or retrieved back in.": "模型只能在固定窗口内做注意力。序列一旦超出，最旧的 token 就滑出橙框，注意力再也看不见它们。这就是滚动上下文：新近的留下，早先的被遗忘——除非先摘要或事后检索回来。",
      "tokens dropped": "丢弃的 token"
    },
    "patterns": [
      [
        "^sequence (\\d+) tokens · window (\\d+)  ·  oldest (\\d+) fall outside the rolling context$",
        "序列 $1 个 token · 窗口 $2 · 最早的 $3 个落在滚动上下文之外"
      ],
      [
        "^attention sees only the last (\\d+) positions; tokens before index (\\d+) are no longer attended to$",
        "注意力只能访问最后 $1 个位置；索引 $2 之前的 token 不再参与注意力计算"
      ],
      [
        "^sequence (\\d+) tokens · window (\\d+)  ·  everything still fits$",
        "序列 $1 个 token · 窗口 $2 · 全部仍可放入"
      ]
    ],
    "preserve": []
  },
  "beam-search": {
    "text": {
      "BEAM SEARCH": "束搜索",
      "Each step expands every surviving beam into B candidate continuations, scores them by cumulative log-probability, and keeps only the best B. Greedy decoding is the special case B equals 1: one path, no backtracking. Wider beams explore more but cost proportionally more compute.": "每一步把每条存活的束扩展成 B 个候选延续，按累计对数概率打分，只留最好的 B 条。贪心解码是 B 等于 1 的特例：一条路，不回头。束越宽探索越多，算力开销也成比例增长。"
    },
    "patterns": [
      [
        "^B = (\\d+) beams kept per step  ·  best sequence log-prob ([\\d.−-]+)$",
        "每步保留 B = $1 条束 · 最佳序列对数概率 $2"
      ],
      [
        "^expand each beam into B children, score by Σ log p, keep the top (\\d+)  ·  (\\d+) steps$",
        "每条束扩展出 B 个子候选，按 Σ log p 评分，保留前 $1 项 · 共 $2 步"
      ],
      [
        "^B = 1 is greedy decoding  ·  best sequence log-prob ([\\d.−-]+)$",
        "B = 1 即贪心解码 · 最佳序列对数概率 $1"
      ]
    ],
    "preserve": []
  },
  "moe-routing": {
    "text": {
      "MIXTURE OF EXPERTS": "混合专家（MoE）",
      "A router sends each token to its top-k experts out of E. Only k of E expert blocks run per token, so the active compute is the fraction k over E even though every parameter still lives in memory. Uneven routing overloads a few experts, which is why MoE training adds a load-balancing loss.": "路由器把每个 token 发给 E 个专家中得分最高的 k 个。每个 token 只运行 E 个专家块中的 k 个，激活算力只占 k/E，尽管所有参数仍驻留显存。路由不均会压垮少数专家，所以 MoE 训练要加负载均衡损失。",
      "% of expert params active": "% 专家参数被激活"
    },
    "patterns": [
      [
        "^top-(\\d+) of (\\d+) experts per token  ·  load imbalance \\(max/avg\\) ([\\d.]+)  ·  reasonably balanced$",
        "每个 token 选择 $2 个专家中的前 $1 个 · 负载不均衡度（最大/平均）$3 · 较为均衡"
      ],
      [
        "^top-(\\d+) of (\\d+) experts per token  ·  load imbalance \\(max/avg\\) ([\\d.]+)  ·  hot experts overloaded$",
        "每个 token 选择 $2 个专家中的前 $1 个 · 负载不均衡度（最大/平均）$3 · 热门专家过载"
      ],
      [
        "^active fraction = k / E = (\\d+) / (\\d+) = (\\d+)%  ·  total params unchanged, compute scales with k$",
        "激活比例 = k / E = $1 / $2 = $3% · 参数总量不变，计算量随 k 增长"
      ],
      [
        "^top-(\\d+) of (\\d+) experts per token  ·  load imbalance \\(max/avg\\) ([\\d.]+)  ·  needs balancing loss$",
        "每个 token 选择 $2 个专家中的前 $1 个 · 负载不均衡度（最大/平均）$3 · 需要负载均衡损失"
      ]
    ],
    "preserve": []
  },
  "continuous-batching": {
    "text": {
      "continuous": "连续批处理",
      "static": "静态批处理",
      "CONTINUOUS BATCHING": "连续批处理",
      "Requests in a batch finish at different times because they generate different numbers of tokens. Static batching holds every slot until the longest request ends, leaving grey idle time. Continuous batching refills each freed slot from the queue the moment it opens, keeping the GPU full and lifting utilization.": "同批请求生成的 token 数不同，完成时间也不同。静态批处理要等最长的请求结束才释放所有槽位，留下灰色的空转。连续批处理在槽位空出的那一刻就从队列补位，让 GPU 始终满载、利用率拉满。",
      "% GPU utilization": "% GPU 利用率",
      "finished slots are refilled from the queue immediately, so the batch stays full": "空出的槽位立即从队列补入请求，保持批次满载",
      "every slot waits for the longest request in the batch before any new one starts": "每个槽位都须等待批次内最长请求结束，才能启动新请求"
    },
    "patterns": [
      [
        "^utilization = busy slot-steps / total slot-steps  ·  (\\d+) slots over (\\d+) steps$",
        "利用率 = 忙碌槽位步数 / 总槽位步数 · $1 个槽位，共 $2 步"
      ]
    ],
    "preserve": []
  },
  "speculative-decoding": {
    "text": {
      "accept": "接受",
      "reject": "拒绝",
      "x tokens / verify pass": "x token / 验证轮次"
    },
    "patterns": [
      [
        "^expected ([\\d.]+) of (\\d+) drafts accepted  ·  all-(\\d+)-pass chance (\\d+)%  ·  \\+ 1 token from the target each pass$",
        "预计接受 $2 个草稿中的 $1 个 · 全部 $3 个通过的概率 $4% · 每轮另由目标模型生成 1 个 token"
      ],
      [
        "^draft γ = (\\d+) tokens, verify in one target pass, accept rate α = ([\\d.]+)  →  ~([\\d.]+) tokens per target call$",
        "草稿 γ = $1 个 token，在一次目标模型前向传播中验证，接受率 α = $2 → 每次目标模型调用约 $3 个 token"
      ]
    ],
    "preserve": []
  },
  "image-patch-tokens": {
    "text": {
      "IMAGE PATCH TOKENS": "图像 patch token",
      "A Vision Transformer cuts the image into a grid of fixed-size patches and treats each patch as one token, exactly like a word in text. The token count is the square of size over patch, so halving the patch size quadruples the sequence and the attention cost.": "Vision Transformer 把图像切成固定大小的 patch 网格，每个 patch 当成一个 token，跟文本里的词完全一样。token 数是（尺寸/patch）的平方，patch 减半，序列和注意力开销翻四倍。",
      "patch tokens": "图像分块 token"
    },
    "patterns": [
      [
        "^(\\d+) x (\\d+) grid  ·  each (\\d+) x (\\d+) px patch becomes one token \\(plus a CLS token in ViT\\)$",
        "$1 x $2 网格 · 每个 $3 x $4 px 分块转为一个 token（ViT 另加一个 CLS token）"
      ],
      [
        "^tokens = ⌈size / patch⌉² = ⌈(\\d+) / (\\d+)⌉² = (\\d+)² = (\\d+)$",
        "token 数 = ⌈size / patch⌉² = ⌈$1 / $2⌉² = $3² = $4"
      ],
      [
        "^(\\d+) x (\\d+) grid  ·  each (\\d+) x (\\d+) px patch becomes one token · image padded to (\\d+)px \\(plus a CLS token in ViT\\)$",
        "$1 x $2 网格 · 每个 $3 x $4 px 分块转为一个 token · 图像填充至 $5px（ViT 另加一个 CLS token）"
      ]
    ],
    "preserve": []
  },
  "multimodal-fusion": {
    "text": {
      "late fusion": "后期融合",
      "early fusion": "早期融合",
      "MULTIMODAL FUSION": "多模态融合",
      "An image encoder and a text encoder each map their input into vectors. Late fusion projects both into a shared embedding space and compares them only at the end, which is how contrastive models like CLIP align images and captions. Early fusion concatenates the token streams and models them jointly from the start, letting the two modalities attend to each other throughout.": "图像编码器和文本编码器各自把输入映射成向量。后融合把两者投影到共享嵌入空间、只在最后比较——CLIP 这类对比模型就这样对齐图文。前融合把 token 流拼接起来从头联合建模，让两种模态全程互相注意。",
      "image": "图像",
      "text": "文本",
      "img enc": "图像编码器",
      "txt enc": "文本编码器",
      "proj": "投影",
      "shared": "共享空间",
      "late fusion: encode each modality separately, project into one space, compare at the end (CLIP-style)": "后期融合：各模态分别编码，投影到同一空间，最后比较（CLIP 方式）",
      "concat": "拼接",
      "joint xfmr": "联合 transformer",
      "early fusion: interleave image and text tokens into one sequence and model them jointly": "早期融合：将图像和文本 token 交错成同一序列，共同建模"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "sim = cos( proj(img enc(image)), proj(txt enc(text)) )",
        "reason": "数学公式和变量保持原样。"
      },
      {
        "text": "joint = transformer( [ img tokens ; text tokens ] )",
        "reason": "技术标识、公式或实体标签，保持原样。"
      }
    ]
  },
  "mcp-tool-call": {
    "text": {
      "Unsupported version": "不支持的版本",
      "Header/body mismatch": "请求头与请求体不一致",
      "Course host": "课程宿主",
      "Sends version, capabilities, and client metadata.": "发送版本、能力和客户端元数据。",
      "Replica B": "副本 B",
      "Validates this request without connection history.": "不依赖连接历史，直接校验本次请求。",
      "MCP dispatcher": "MCP 分派器",
      "Runs server/discover with method-specific validation.": "执行 server/discover，并进行该方法专属的校验。",
      "Typed result": "有类型的结果",
      "Returns resultType complete and serving implementation metadata.": "返回 resultType 为 complete 的结果和当前服务实现的元数据。",
      "The request is portable across replicas because every protocol dependency is present in the envelope.": "请求封装包含所有协议依赖，因此可在不同副本之间处理。",
      "Discovery is optional before a call. Per-request metadata and typed results are the actual stateless boundary.": "调用前可以选择是否进行发现。每次请求的元数据与有类型的结果才是无状态边界。",
      "Protocol stages": "协议阶段",
      "Course host: Sends version, capabilities, and client metadata.": "课程宿主：发送版本、能力和客户端元数据。",
      "Replica B: Validates this request without connection history.": "副本 B：不依赖连接历史，直接校验本次请求。",
      "MCP dispatcher: Runs server/discover with method-specific validation.": "MCP 分派器：执行 server/discover，并进行该方法专属的校验。",
      "Typed result: Returns resultType complete and serving implementation metadata.": "有类型的结果：返回 resultType 为 complete 的结果和当前服务实现的元数据。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "server/discover",
        "reason": "MCP 方法、协议判别值、媒体类型或语言专名，保持机器契约字面量。"
      },
      {
        "text": "tools/list",
        "reason": "MCP 方法、协议判别值、媒体类型或语言专名，保持机器契约字面量。"
      },
      {
        "text": "tools/call",
        "reason": "MCP 方法、协议判别值、媒体类型或语言专名，保持机器契约字面量。"
      },
      {
        "text": "resources/read",
        "reason": "MCP 方法、协议判别值、媒体类型或语言专名，保持机器契约字面量。"
      },
      {
        "text": "resultType · complete",
        "reason": "MCP 方法、协议判别值、媒体类型或语言专名，保持机器契约字面量。"
      }
    ]
  }
};
