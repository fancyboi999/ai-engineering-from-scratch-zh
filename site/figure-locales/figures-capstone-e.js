(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-capstone-e.js"] = {
  "ce-agent-loop": {
    "text": {
      "Motion reduced": "已减少动画",
      "plan": "规划",
      "act": "行动",
      "AGENT TURN CIRCUIT": "agent 回合回路",
      "one lap = one turn": "一圈 = 一个回合",
      "The harness runs a plan, act, observe, recover circuit, and every lap burns one turn of the 50-turn budget. PreToolUse and PostToolUse hooks fire as each tool call crosses the edge, and an oversized observation, like 8MB of ripgrep output, is truncated before it re-enters the context window.": "运行框架执行规划、行动、观察、恢复的循环，每圈消耗 50 回合预算中的一个回合。每次工具调用跨过边界时触发 PreToolUse 和 PostToolUse 钩子；8MB ripgrep 输出等过大观察结果会先截断，再进入上下文窗口。",
      "observe": "观察",
      "recover": "恢复",
      "turn 47 / 50": "回合 47 / 50",
      "observe:": "观察结果：",
      "8MB stdout, truncated before re-entry": "8MB 标准输出，重新进入上下文前截断",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^The\\ harness\\ runs\\ a\\ plan,\\ act,\\ observe,\\ recover\\ circuit,\\ and\\ every\\ lap\\ burns\\ one\\ turn\\ of\\ the\\ ([-+]?\\d+(?:[.,]\\d+)*)\\-turn\\ budget\\.\\ PreToolUse\\ and\\ PostToolUse\\ hooks\\ fire\\ as\\ each\\ tool\\ call\\ crosses\\ the\\ edge,\\ and\\ an\\ oversized\\ observation,\\ like\\ ([-+]?\\d+(?:[.,]\\d+)*)MB\\ of\\ ripgrep\\ output,\\ is\\ truncated\\ before\\ it\\ re\\-enters\\ the\\ context\\ window\\.$",
        "运行框架执行规划、行动、观察、恢复的循环，每圈消耗 $1 回合预算中的一个回合。每次工具调用跨过边界时触发 PreToolUse 和 PostToolUse 钩子；$2MB ripgrep 输出等过大观察结果会先截断，再进入上下文窗口。"
      ],
      [
        "^turn\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ /\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "回合 $1 / $2"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)MB\\ stdout,\\ truncated\\ before\\ re\\-entry$",
        "$1MB 标准输出，重新进入上下文前截断"
      ]
    ],
    "preserve": [
      {
        "text": "PreToolUse",
        "reason": "钩子事件名"
      },
      {
        "text": "PostToolUse",
        "reason": "钩子事件名"
      }
    ]
  },
  "ce-hybrid-retrieval": {
    "text": {
      "Motion reduced": "已减少动画",
      "query": "查询",
      "HYBRID RETRIEVAL": "混合检索",
      "dense + bm25 - rerank": "稠密检索 + BM25，再重排",
      "The query fires both searches at once: dense nearest-neighbor over embeddings and sparse BM25 over terms. Their union feeds the cross-encoder, which reorders the list, and the chunk that BM25 alone would have buried rises to the top. The synthesizer must cite file and line from what survives.": "查询同时触发两种搜索：在嵌入上做稠密最近邻检索，在词项上做稀疏 BM25 检索。两者的并集交给交叉编码器重新排序，仅用 BM25 时可能被埋没的文本块会升到首位。合成答案必须引用最终保留内容的文件和行号。",
      "dense (hnsw)": "稠密检索（HNSW）",
      "bm25 (terms)": "BM25（词项）",
      "union": "并集",
      "top-k": "前 k 项",
      "cross-encoder rerank": "交叉编码器重排",
      "chunk a  0.31": "文本块 a  0.31",
      "chunk b  0.58": "文本块 b  0.58",
      "chunk c  0.87": "文本块 c  0.87",
      "answer cites file:line from the top chunk": "回答引用首位文本块的文件:行号",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^dense\\ \\+\\ bm2([-+]?\\d+(?:[.,]\\d+)*)\\ \\-\\ rerank$",
        "稠密检索 + BM2$1，再重排"
      ],
      [
        "^The\\ query\\ fires\\ both\\ searches\\ at\\ once:\\ dense\\ nearest\\-neighbor\\ over\\ embeddings\\ and\\ sparse\\ BM2([-+]?\\d+(?:[.,]\\d+)*)\\ over\\ terms\\.\\ Their\\ union\\ feeds\\ the\\ cross\\-encoder,\\ which\\ reorders\\ the\\ list,\\ and\\ the\\ chunk\\ that\\ BM2([-+]?\\d+(?:[.,]\\d+)*)\\ alone\\ would\\ have\\ buried\\ rises\\ to\\ the\\ top\\.\\ The\\ synthesizer\\ must\\ cite\\ file\\ and\\ line\\ from\\ what\\ survives\\.$",
        "查询同时触发两种搜索：在嵌入上做稠密最近邻检索，在词项上做稀疏 BM2$1 检索。两者的并集交给交叉编码器重新排序，仅用 BM2$2 时可能被埋没的文本块会升到首位。合成答案必须引用最终保留内容的文件和行号。"
      ],
      [
        "^bm2([-+]?\\d+(?:[.,]\\d+)*)\\ \\(terms\\)$",
        "BM2$1（词项）"
      ],
      [
        "^chunk\\ a\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "文本块 a  $1"
      ],
      [
        "^chunk\\ b\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "文本块 b  $1"
      ],
      [
        "^chunk\\ c\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "文本块 c  $1"
      ]
    ],
    "preserve": []
  },
  "ce-voice-latency": {
    "text": {
      "Motion reduced": "已减少动画",
      "VOICE LATENCY WATERFALL": "语音延迟瀑布图",
      "pipelined, not sequential": "流水线并行，而非串行",
      "Every stage streams into the next before it finishes: ASR emits partials while the user still speaks, the turn detector fires on completion cues, and TTS starts within the 800ms first-audio budget. When the user barges in at 900ms the TTS cancels instantly and ASR takes over again.": "每个阶段都在完成前向下一阶段流式输出：用户仍在说话时 ASR 已输出部分结果，轮次检测器根据结束信号触发，TTS 在首段音频 800ms 预算内开始。用户在 900ms 打断时，TTS 立即取消，ASR 重新接管。",
      "mic in": "麦克风输入",
      "asr partial": "ASR 部分结果",
      "turn detect": "轮次检测",
      "llm tokens": "LLM token",
      "tts out": "TTS 输出",
      "800ms budget": "800ms 预算",
      "first audio 780ms": "首段音频 780ms",
      "barge-in": "用户打断",
      "cancelled": "已取消",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^Every\\ stage\\ streams\\ into\\ the\\ next\\ before\\ it\\ finishes:\\ ASR\\ emits\\ partials\\ while\\ the\\ user\\ still\\ speaks,\\ the\\ turn\\ detector\\ fires\\ on\\ completion\\ cues,\\ and\\ TTS\\ starts\\ within\\ the\\ ([-+]?\\d+(?:[.,]\\d+)*)ms\\ first\\-audio\\ budget\\.\\ When\\ the\\ user\\ barges\\ in\\ at\\ ([-+]?\\d+(?:[.,]\\d+)*)ms\\ the\\ TTS\\ cancels\\ instantly\\ and\\ ASR\\ takes\\ over\\ again\\.$",
        "每个阶段都在完成前向下一阶段流式输出：用户仍在说话时 ASR 已输出部分结果，轮次检测器根据结束信号触发，TTS 在首段音频 $1ms 预算内开始。用户在 $2ms 打断时，TTS 立即取消，ASR 重新接管。"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)ms\\ budget$",
        "$1ms 预算"
      ],
      [
        "^first\\ audio\\ ([-+]?\\d+(?:[.,]\\d+)*)ms$",
        "首段音频 $1ms"
      ]
    ],
    "preserve": [
      {
        "text": "LLM token",
        "reason": "已规范显示的产品名、技术缩写、模型标识或实体名称"
      }
    ]
  },
  "ce-late-interaction": {
    "text": {
      "Motion reduced": "已减少动画",
      "LATE INTERACTION MAXSIM": "后期交互 MaxSim",
      "per-token max over patches": "逐 token 对图像块取最大值",
      "No OCR and no pooled vector: the page stays an image, embedded as thousands of patch vectors. Each query token scores against every patch, keeps only its maximum, and the per-token maxima sum into the page score. Tables, charts, and handwriting match directly at the patch level.": "不做 OCR，也不池化为单一向量：页面保持图像形式，嵌入为数千个图像块向量。每个查询 token 与所有图像块计算分数，只保留最大值，再将各 token 的最大值相加得到页面分数。表格、图表和手写内容直接在图像块层面匹配。",
      "pdf page as patch grid": "PDF 页面图像块网格",
      "query tokens": "查询 token",
      "sum of max": "最大值之和",
      "score 1.68": "分数 1.68",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^score\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "分数 $1"
      ]
    ],
    "preserve": [
      {
        "text": "q: net",
        "reason": "查询词样本"
      },
      {
        "text": "q: margin",
        "reason": "查询词样本"
      }
    ]
  },
  "ce-experiment-tree": {
    "text": {
      "Motion reduced": "已减少动画",
      "EXPERIMENT TREE SEARCH": "实验树搜索",
      "expand best, spend budget": "扩展最优节点，消耗预算",
      "Each node is a sandboxed experiment scored after it runs. The search expands the best-scoring node, not the newest, so the 0.71 branch earns children while its siblings stall. The budget gauge drains with every run, and when it empties the best branch is written up as the paper.": "每个节点是一个在沙箱中运行后评分的实验。搜索扩展得分最高的节点，而非最新节点，因此 0.71 分支产生子节点，其他分支停滞。每次运行都消耗预算；预算耗尽时，将最佳分支整理为论文。",
      "best-first expansion": "最佳优先扩展",
      "seed": "种子",
      "paper": "论文",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^Each\\ node\\ is\\ a\\ sandboxed\\ experiment\\ scored\\ after\\ it\\ runs\\.\\ The\\ search\\ expands\\ the\\ best\\-scoring\\ node,\\ not\\ the\\ newest,\\ so\\ the\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ branch\\ earns\\ children\\ while\\ its\\ siblings\\ stall\\.\\ The\\ budget\\ gauge\\ drains\\ with\\ every\\ run,\\ and\\ when\\ it\\ empties\\ the\\ best\\ branch\\ is\\ written\\ up\\ as\\ the\\ paper\\.$",
        "每个节点是一个在沙箱中运行后评分的实验。搜索扩展得分最高的节点，而非最新节点，因此 $1 分支产生子节点，其他分支停滞。每次运行都消耗预算；预算耗尽时，将最佳分支整理为论文。"
      ]
    ],
    "preserve": []
  },
  "ce-rootcause-walk": {
    "text": {
      "Motion reduced": "已减少动画",
      "ROOT-CAUSE WALK": "根因排查",
      "read-only until approved": "获批前只读",
      "An OOMKilled alert lands on the pod. The agent walks ownership edges up to the deployment and the scheduling edge out to the node, pulling a telemetry slice at each hop. Hypotheses rank by evidence weight, and the winner still waits behind a human approval gate before any remediation runs.": "容器组收到 OOMKilled 告警。agent 沿归属边向上遍历到部署，再沿调度边到节点，每一跳都提取一段遥测数据。假设按证据权重排序；任何修复开始前，排名首位的假设仍须等待人工批准。",
      "knowledge graph walk": "知识图谱遍历",
      "deployment": "部署",
      "replicaset": "副本集",
      "pod": "容器组",
      "node": "节点",
      "owns": "拥有",
      "alert: OOMKilled": "告警：OOMKilled",
      "ranked hypotheses": "假设排序",
      "limits too low  0.86": "资源上限过低  0.86",
      "node memory pressure  0.51": "节点内存压力  0.51",
      "bad rollout  0.22": "发布异常  0.22",
      "awaiting slack approval": "等待 Slack 批准",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^limits\\ too\\ low\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "资源上限过低  $1"
      ],
      [
        "^node\\ memory\\ pressure\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "节点内存压力  $1"
      ],
      [
        "^bad\\ rollout\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "发布异常  $1"
      ]
    ],
    "preserve": []
  },
  "ce-finetune-stages": {
    "text": {
      "Motion reduced": "已减少动画",
      "FINE-TUNE ASSEMBLY LINE": "微调流水线",
      "yaml in, endpoint out": "输入 YAML，输出服务端点",
      "One artifact rides the whole pipeline. Clean data feeds SFT, which fills the base model with task behavior; DPO deepens the alignment tint; quantization shrinks the block to 4-bit without changing what it learned; and the served endpoint streams tokens with speculative decoding.": "同一产物经过整条流水线。清洗后的数据进入 SFT，为基础模型加入任务行为；DPO 加深对齐；量化将模型块缩小到 4-bit，保留已学内容；服务端点通过推测解码流式输出 token。",
      "data": "数据",
      "dedup + pii": "去重 + 个人信息处理",
      "sft": "SFT",
      "dpo": "DPO",
      "trl pairs": "TRL 偏好对",
      "quantize": "量化",
      "awq 4-bit": "AWQ 4-bit",
      "serve": "提供服务",
      "vllm + eagle": "vLLM + EAGLE",
      "4-bit": "4 位",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^One\\ artifact\\ rides\\ the\\ whole\\ pipeline\\.\\ Clean\\ data\\ feeds\\ SFT,\\ which\\ fills\\ the\\ base\\ model\\ with\\ task\\ behavior;\\ DPO\\ deepens\\ the\\ alignment\\ tint;\\ quantization\\ shrinks\\ the\\ block\\ to\\ ([-+]?\\d+(?:[.,]\\d+)*)\\-bit\\ without\\ changing\\ what\\ it\\ learned;\\ and\\ the\\ served\\ endpoint\\ streams\\ tokens\\ with\\ speculative\\ decoding\\.$",
        "同一产物经过整条流水线。清洗后的数据进入 SFT，为基础模型加入任务行为；DPO 加深对齐；量化将模型块缩小到 $1-bit，保留已学内容；服务端点通过推测解码流式输出 token。"
      ],
      [
        "^awq\\ ([-+]?\\d+(?:[.,]\\d+)*)\\-bit$",
        "AWQ $1-bit"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\-bit$",
        "$1 位"
      ]
    ],
    "preserve": [
      {
        "text": "axolotl",
        "reason": "产品名"
      },
      {
        "text": "AWQ 4-bit",
        "reason": "已规范显示的产品名、技术缩写、模型标识或实体名称"
      },
      {
        "text": "DPO",
        "reason": "已规范显示的产品名、技术缩写、模型标识或实体名称"
      },
      {
        "text": "SFT",
        "reason": "已规范显示的产品名、技术缩写、模型标识或实体名称"
      },
      {
        "text": "vLLM + EAGLE",
        "reason": "已规范显示的产品名、技术缩写、模型标识或实体名称"
      }
    ]
  },
  "ce-migration-funnel": {
    "text": {
      "Motion reduced": "已减少动画",
      "MIGRATION FUNNEL": "迁移漏斗",
      "recipes first, agent second": "先运行规则，再用 agent",
      "Most files flow straight through the deterministic recipes and land in a green-CI branch. The ambiguous minority diverts into the agent loop, which builds, classifies the failure, applies a fix, and reruns under hard caps. What still fails gets filed in the taxonomy with an exemplar diff.": "大部分文件直接经过确定性规则，在 CI 通过的分支中落地。有歧义的少量文件转入 agent 循环，在硬性上限内构建、分类失败、修复并重跑。仍然失败的项连同示例差异归入分类表。",
      "50 repos": "50 个仓库",
      "java 8": "Java 8",
      "deterministic recipes": "确定性迁移规则",
      "~75% of edits, auditable diffs": "约 75% 的编辑，可审计差异",
      "ci green": "CI 通过",
      "open pr": "创建 PR",
      "failure": "失败",
      "taxonomy": "分类表",
      "agent loop": "agent 循环",
      "build - classify - fix - rerun": "构建 - 分类 - 修复 - 重跑",
      "caps per repo: 30 min, $8, 20 turns": "每仓库上限：30 分钟、$8、20 回合",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ repos$",
        "$1 个仓库"
      ],
      [
        "^java\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "Java $1"
      ],
      [
        "^\\~([-+]?\\d+(?:[.,]\\d+)*)%\\ of\\ edits,\\ auditable\\ diffs$",
        "约 $1% 的编辑，可审计差异"
      ],
      [
        "^caps\\ per\\ repo:\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ min,\\ \\$([-+]?\\d+(?:[.,]\\d+)*),\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ turns$",
        "每仓库上限：$1 分钟、$$$2、$3 回合"
      ]
    ],
    "preserve": [
      {
        "text": "Java 8",
        "reason": "已规范显示的产品名、技术缩写、模型标识或实体名称"
      }
    ]
  },
  "ce-team-handoff": {
    "text": {
      "Motion reduced": "已减少动画",
      "reviewer": "审查者",
      "FACTORY HANDOFFS": "工厂式交接",
      "parallel lanes, one merge": "并行工作通道，一次合并",
      "The architect freezes a plan onto the task board and four coders drain it in parallel worktrees, each finishing at its own pace. The merge is where handoffs fail: two coders touched the same file, the conflict flashes, and only then does the diff pass the reviewer gate and the isolated test run.": "架构师将计划固定到任务板，四个编码者在并行 worktree 中各自推进。交接问题在合并时暴露：两个编码者改了同一文件，冲突亮起；之后差异才通过审查关卡和隔离测试。",
      "architect": "架构师",
      "task board": "任务板",
      "coder a": "编码者 a",
      "worktree": "工作树",
      "coder b": "编码者 b",
      "coder c": "编码者 c",
      "coder d": "编码者 d",
      "merge": "合并",
      "conflict: b vs d": "冲突：b 与 d",
      "tests: pass": "测试：通过",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "ce-otel-drift": {
    "text": {
      "Motion reduced": "已减少动画",
      "DRIFT TO ALERT": "漂移告警",
      "semconv spans, sampled evals": "语义约定 span，抽样评估",
      "GenAI-semconv spans stream from four SDK families through the collector into ClickHouse, where eval jobs score sampled traces. When the injected regression lands, the faithfulness sparkline steps below the alert floor and the page fires, inside the five-minute detection budget.": "GenAI-semconv span 从四类 SDK 经采集器流入 ClickHouse，评估任务对采样轨迹评分。注入回归缺陷后，忠实度趋势线跌破告警下限，并在五分钟检测预算内触发告警。",
      "openai sdk": "OpenAI SDK",
      "anthropic sdk": "Anthropic SDK",
      "langchain": "LangChain",
      "otel collector": "OTel 采集器",
      "clickhouse": "ClickHouse",
      "eval jobs sample traces": "评估任务抽样轨迹",
      "injected regression": "注入的回归缺陷",
      "faithfulness": "忠实度",
      "alert floor": "告警下限",
      "alert fired in < 5 min": "不到 5 分钟触发告警",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^alert\\ fired\\ in\\ <\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ min$",
        "不到 $1 分钟触发告警"
      ]
    ],
    "preserve": [
      {
        "text": "Anthropic SDK",
        "reason": "已规范显示的产品名、技术缩写、模型标识或实体名称"
      },
      {
        "text": "ClickHouse",
        "reason": "已规范显示的产品名、技术缩写、模型标识或实体名称"
      },
      {
        "text": "LangChain",
        "reason": "已规范显示的产品名、技术缩写、模型标识或实体名称"
      },
      {
        "text": "OpenAI SDK",
        "reason": "已规范显示的产品名、技术缩写、模型标识或实体名称"
      }
    ]
  }
};
