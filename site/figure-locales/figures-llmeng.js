(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-llmeng.js"] = {
  "cot-decomposition": {
    "text": {
      "CHAIN OF THOUGHT": "思维链",
      "A hard problem asked for a direct answer forces the model to compress every step into one jump, and it often slips. Chain-of-thought asks it to write the intermediate steps, turning one large leap into a chain of small, individually easy ones. Each visible substep is also a place the model can catch its own mistake.": "要求模型直接回答难题，会迫使它把所有步骤压缩成一次跳跃，因而容易出错。思维链要求它写出中间步骤，把一次大跳拆成多个各自更容易的小步骤。每个可见步骤也给模型提供了发现自身错误的机会。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "chain-of-thought on": "开启思维链",
      "direct answer (off)": "直接回答（关闭思维链）",
      "question": "问题",
      "answer": "答案",
      "% solved": "% 已解决",
      "chain-of-thought: 5 intermediate steps make each substep checkable  ·  +33 pts": "思维链：5 个中间步骤让每个子步骤可检查 · +33 个百分点",
      "prompt += \"let us reason step by step\" → expose intermediate states": "prompt += \"let us reason step by step\" → 展示中间状态",
      "direct answer: the model must do every step at once, in one jump": "直接回答：模型必须一次完成所有步骤",
      "answer = f(question) in a single forward pass": "answer = f(question)，只进行一次前向传播",
      "(no shown work)": "（不展示推导过程）"
    },
    "patterns": [
      [
        "^chain\\-of\\-thought:\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ intermediate\\ steps\\ make\\ each\\ substep\\ checkable\\ \\ ·\\ \\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ pts$",
        "思维链：$1 个中间步骤让每个子步骤可检查 · $2 个百分点"
      ]
    ],
    "preserve": []
  },
  "few-shot-curve": {
    "text": {
      "FEW-SHOT CURVE": "少样本曲线",
      "Adding labeled examples to the prompt lifts accuracy fast at first, then flattens. The grey dot is zero-shot; the first few demonstrations close most of the gap, and beyond a handful each new example earns almost nothing while still costing tokens. The skill is picking the smallest set that reaches the plateau.": "在 prompt 中加入带标签示例，准确率起初会快速提升，随后逐渐变平。灰点是 zero-shot 基线；前几个示例已补上大部分差距，之后每增加一个示例都几乎没有收益，却仍要消耗 token。关键是用最小的示例集到达平台期。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "% accuracy": "% 准确率",
      "4-shot  ·  +34.1 pts over zero-shot  ·  still climbing": "4 个示例 · 比零样本高 +34.1 个百分点 · 仍在上升",
      "accuracy(k) = 42% + (50 pts)(1 − e^(−k/3.5))  ·  diminishing returns": "accuracy(k) = 42% + (50 个百分点)(1 − e^(−k/3.5)) · 收益递减"
    },
    "patterns": [
      [
        "^zero-shot baseline  ·  \\+([\\d.]+) pts over zero-shot  ·  still climbing$",
        "零样本基线 · 比零样本高 +$1 个百分点 · 仍在上升"
      ],
      [
        "^(\\d+)-shot  ·  \\+([\\d.]+) pts over zero-shot  ·  still climbing$",
        "$1 个示例 · 比零样本高 +$2 个百分点 · 仍在上升"
      ],
      [
        "^(\\d+)-shot  ·  \\+([\\d.]+) pts over zero-shot  ·  plateau: more examples barely help$",
        "$1 个示例 · 比零样本高 +$2 个百分点 · 已到平台期：增加示例几乎无收益"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\-shot\\ \\ ·\\ \\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ pts\\ over\\ zero\\-shot\\ \\ ·\\ \\ still\\ climbing$",
        "$1 个示例 · 比零样本高 $2 个百分点 · 仍在上升"
      ],
      [
        "^accuracy\\(k\\)\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\ \\+\\ \\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ pts\\)\\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ −\\ e\\^\\(−k/([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)\\)\\ \\ ·\\ \\ diminishing\\ returns$",
        "accuracy(k) = $1% + ($2 个百分点)($3 − e^(−k/$4)) · 收益递减"
      ]
    ],
    "preserve": []
  },
  "lost-in-the-middle": {
    "text": {
      "LOST IN THE MIDDLE": "中间遗忘",
      "When a single relevant fact is buried in a long context, the model recalls it well if it sits near the start or the end, and far worse if it lands in the middle. Accuracy is U-shaped over position. This is why context engineering puts the most important material at the top or bottom of the prompt and never relies on a long unstructured dump.": "一条相关事实埋在长上下文中时，位于开头或结尾的内容容易被模型回忆，落在中间则明显更差，准确率随位置呈 U 形。这也是上下文工程要把最重要材料放在 prompt 顶部或底部、不能依赖一大段无结构堆料的原因。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "start of context": "上下文开头",
      "end of context": "上下文结尾",
      "% retrieval accuracy": "% 检索准确率",
      "fact at 50% of context  ·  buried in the middle: easy to miss": "事实位于上下文的 50% 处 · 埋在中间：容易遗漏",
      "accuracy(pos) ≈ 0.40 + 0.55·(2·pos − 1)²  ·  U-shaped: primacy + recency, dip in the middle": "accuracy(pos) ≈ 0.40 + 0.55·(2·pos − 1)² · U 形：首因 + 近因，中间低谷"
    },
    "patterns": [
      [
        "^fact at (\\d+)% of context  ·  near an edge: easy to recall$",
        "事实位于上下文的 $1% 处 · 靠近两端：容易回忆"
      ],
      [
        "^fact\\ at\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\ of\\ context\\ \\ ·\\ \\ buried\\ in\\ the\\ middle:\\ easy\\ to\\ miss$",
        "事实位于上下文的 $1% 处 · 埋在中间：容易遗漏"
      ],
      [
        "^accuracy\\(pos\\)\\ ≈\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\+\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)·\\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)·pos\\ −\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)²\\ \\ ·\\ \\ U\\-shaped:\\ primacy\\ \\+\\ recency,\\ dip\\ in\\ the\\ middle$",
        "accuracy(pos) ≈ $1 + $2·($3·pos − $4)² · U 形：首因 + 近因，中间低谷"
      ]
    ],
    "preserve": []
  },
  "llm-judge-rubric": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "An LLM judge rates a response on several criteria, here helpfulness, correctness, and safety. The final score is a weighted average, and the weights encode what you actually care about. This response is strong on safety but weak on correctness, so leaning the rubric toward correctness pulls its score down. The weights, not the model, decide what good means.": "LLM 评审器从多个维度评价回答，图中为有用性、正确性和安全性。最终得分是加权平均，权重表示你实际重视什么。这个回答安全性较强，正确性较弱，因此提高正确性权重就会拉低得分。决定“好”是什么意思的是权重，而非模型。",
      "helpfulness weight": "有用性权重",
      "correctness weight": "正确性权重",
      "safety weight": "安全性权重",
      "helpfulness (w 40%)": "有用性（w 40%）",
      "correctness (w 40%)": "正确性（w 40%）",
      "safety (w 20%)": "安全性（w 20%）",
      "weighted score": "加权得分",
      "weights normalized to sum 1  ·  shift weight onto correctness and this response drops, since it scored lowest there": "权重归一化后总和为 1 · 增加正确性权重会降低本回答的得分，因为它在该维度得分最低",
      "score = Σ (wᵢ / Σw) · sᵢ  ·  s = [0.85, 0.60, 0.95]  ·  the judge rates each criterion, the rubric aggregates": "score = Σ (wᵢ / Σw) · sᵢ · s = [0.85, 0.60, 0.95] · 评审器逐维度评分，量表汇总",
      "LLM-AS-JUDGE RUBRIC": "LLM 评审量表",
      "drag the rubric weights": "拖动评分维度权重"
    },
    "patterns": [
      [
        "^helpfulness\\ \\(w\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\)$",
        "有用性（w $1%）"
      ],
      [
        "^correctness\\ \\(w\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\)$",
        "正确性（w $1%）"
      ],
      [
        "^safety\\ \\(w\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\)$",
        "安全性（w $1%）"
      ],
      [
        "^weights\\ normalized\\ to\\ sum\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ ·\\ \\ shift\\ weight\\ onto\\ correctness\\ and\\ this\\ response\\ drops,\\ since\\ it\\ scored\\ lowest\\ there$",
        "权重归一化后总和为 $1 · 增加正确性权重会降低本回答的得分，因为它在该维度得分最低"
      ],
      [
        "^score\\ =\\ Σ\\ \\(wᵢ\\ /\\ Σw\\)\\ ·\\ sᵢ\\ \\ ·\\ \\ s\\ =\\ \\[([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?),\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?),\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\]\\ \\ ·\\ \\ the\\ judge\\ rates\\ each\\ criterion,\\ the\\ rubric\\ aggregates$",
        "score = Σ (wᵢ / Σw) · sᵢ · s = [$1, $2, $3] · 评审器逐维度评分，量表汇总"
      ]
    ],
    "preserve": []
  },
  "semantic-cache": {
    "text": {
      "SEMANTIC CACHE": "语义缓存",
      "A semantic cache answers a new query from a stored answer when their embeddings are close enough. Each dot is an incoming query placed by its cosine similarity to the nearest cached entry; the shaded zone past the orange line is served from cache. Raise the threshold and you get fewer hits but rarely serve a wrong answer; lower it and you cache more but risk returning a stale or mismatched reply (orange dots).": "语义缓存会在新 query 与已缓存答案的 embedding 足够接近时直接复用答案。每个点表示一条进入的 query，按它与最近缓存项的余弦相似度排列；橙线之后的阴影区从缓存返回。提高阈值会减少命中却很少答错；降低阈值会增加命中，也更容易返回过期或不匹配的回答。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "of 10 served from cache": "条由缓存返回（共 10 条）",
      "threshold 0.85  ·  0 of those hits return a wrong answer  ·  balanced": "阈值 0.85 · 命中中有 0 条返回错误答案 · 均衡",
      "serve cached answer when cos(query, cached) ≥ 0.85  ·  lower threshold = more hits, more risk": "当 cos(query, cached) ≥ 0.85 时返回缓存答案 · 阈值越低 = 命中越多，风险越高"
    },
    "patterns": [
      [
        "^threshold ([\\d.]+)  ·  (\\d+) of those hits return a wrong answer  ·  high: few hits, safe$",
        "阈值 $1 · 命中中有 $2 条返回错误答案 · 高阈值：命中少，安全"
      ],
      [
        "^threshold ([\\d.]+)  ·  (\\d+) of those hits return a wrong answer  ·  low: many hits, risky$",
        "阈值 $1 · 命中中有 $2 条返回错误答案 · 低阈值：命中多，风险高"
      ],
      [
        "^of\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ served\\ from\\ cache$",
        "条由缓存返回（共 $1 条）"
      ],
      [
        "^threshold\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ ·\\ \\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ of\\ those\\ hits\\ return\\ a\\ wrong\\ answer\\ \\ ·\\ \\ balanced$",
        "阈值 $1 · 命中中有 $2 条返回错误答案 · 均衡"
      ],
      [
        "^serve\\ cached\\ answer\\ when\\ cos\\(query,\\ cached\\)\\ ≥\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ ·\\ \\ lower\\ threshold\\ =\\ more\\ hits,\\ more\\ risk$",
        "当 cos(query, cached) ≥ $1 时返回缓存答案 · 阈值越低 = 命中越多，风险越高"
      ]
    ],
    "preserve": []
  },
  "prompt-cache-hit": {
    "text": {
      "PROMPT CACHE HIT": "Prompt 缓存命中",
      "A long system prompt or document that repeats across calls can be prefilled once and reused. The cached prefix (dashed) skips recomputation, so only the new suffix (solid) is processed. The saving is the hit rate times the prefix fraction: a big shared prefix that is hit often is where caching pays off most.": "重复出现的长系统 prompt 或文档可以预填充一次并复用。虚线表示缓存前缀，它跳过重复计算，只有新的实线后缀需要处理。节省量等于命中率乘以前缀占比：共享前缀越大、命中越频繁，缓存收益越高。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "cached prefix 70%": "缓存前缀 70%",
      "new 30%": "新增 30%",
      "% prefill saved": "% 预填充计算节省量",
      "hit rate 80%  ·  cached prefix skips recompute  ·  cost and time-to-first-token both drop by ~56%": "命中率 80% · 缓存前缀跳过重复计算 · 成本和首个 token 延迟均降低约 56%",
      "saved = hit_rate × prefix_fraction = 0.80 × 0.70 = 0.56": "节省量 = hit_rate × prefix_fraction = 0.80 × 0.70 = 0.56"
    },
    "patterns": [
      [
        "^cached\\ prefix\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%$",
        "缓存前缀 $1%"
      ],
      [
        "^new\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%$",
        "新增 $1%"
      ],
      [
        "^hit\\ rate\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\ \\ ·\\ \\ cached\\ prefix\\ skips\\ recompute\\ \\ ·\\ \\ cost\\ and\\ time\\-to\\-first\\-token\\ both\\ drop\\ by\\ \\~([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%$",
        "命中率 $1% · 缓存前缀跳过重复计算 · 成本和首个 token 延迟均降低约 $2%"
      ],
      [
        "^saved\\ =\\ hit_rate\\ ×\\ prefix_fraction\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ×\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "节省量 = hit_rate × prefix_fraction = $1 × $2 = $3"
      ]
    ],
    "preserve": []
  },
  "function-call-args": {
    "text": {
      "FUNCTION CALL ARGS": "函数调用参数",
      "Function calling is two jobs in one. First the model selects which tool to invoke from the available set, then it populates that tool's typed argument schema by extracting values from the user request. The output is not prose but a structured call: a tool name plus a JSON object whose fields match the declared types, ready to execute.": "函数调用同时做两件事：先从可用工具中选择要调用的工具，再从用户请求中抽取值并填入该工具的有类型参数 schema。输出不是散文，而是结构化调用：工具名加上字段符合声明类型的 JSON 对象，可直接执行。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "request: book 2 seats Mumbai to San Francisco on Jul 1": "请求：7 月 1 日从孟买飞往旧金山，预订 2 个座位",
      "3 of 5 slots filled  ·  the model selects the tool, then extracts each typed argument from the request": "5 个槽位中已填充 3 个 · 模型先选择工具，再从请求中提取各个带类型的参数"
    },
    "patterns": [
      [
        "^(\\d+) of (\\d+) slots filled  ·  the model selects the tool, then extracts each typed argument from the request$",
        "共 $2 个槽位，已填充 $1 个 · 模型先选择工具，再从请求中提取各个带类型的参数"
      ]
    ],
    "preserve": [
      {
        "text": "tool : enum  =  book_flight",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "from : string  =  \"BOM\"",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "to : string  =  \"SFO\"",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "date : date  =  ?",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "pax : int  =  ?",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "{ \"tool\": book_flight, \"from\": \"BOM\", \"to\": \"SFO\", ... }",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "from : string  =  ?",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      },
      {
        "text": "to : string  =  ?",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      },
      {
        "text": "{ \"tool\": book_flight, ... }",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      },
      {
        "text": "date : date  =  \"2026-07-01\"",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      },
      {
        "text": "pax : int  =  2",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      },
      {
        "text": "{ \"tool\": book_flight, \"from\": \"BOM\", \"to\": \"SFO\", \"date\": \"2026-07-01\", \"pax\": 2 }",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      }
    ]
  },
  "constrained-decoding": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "allowed": "允许",
      "masked": "已屏蔽",
      "of 5 tokens valid": "个 token 有效（共 5 个）",
      "so far: {  ·  the grammar only permits tokens that keep the output schema-valid": "当前：{ · 语法只允许保持输出符合 schema 的 token",
      "logits[invalid] = −∞ before softmax → the model can only sample a token the schema allows next": "在 softmax 前令 logits[invalid] = −∞ → 模型只能采样 schema 下一步允许的 token"
    },
    "patterns": [
      [
        "^so far: ([\\s\\S]*)  ·  the grammar only permits tokens that keep the output schema-valid$",
        "当前：$1 · 语法只允许保持输出符合 schema 的 token"
      ],
      [
        "^of\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ tokens\\ valid$",
        "个 token 有效（共 $1 个）"
      ]
    ],
    "preserve": [
      {
        "text": "\"name\"",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "\"hello\"",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      },
      {
        "text": "\"true\"",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      }
    ]
  }
};
