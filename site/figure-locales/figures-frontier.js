(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-frontier.js"] = {
  "task-decomposition": {
    "text": {
      "TASK DECOMPOSITION": "任务分解",
      "A long-horizon agent does not attack a complex objective head-on. It decomposes the goal into sub-tasks, then decomposes those again, until the leaves are steps it can execute directly. Wider branching and deeper trees plan more thoroughly but multiply the work to track, which is why useful plans stay shallow.": "长程智能体不会正面强攻复杂目标。它把目标拆成子任务，再继续往下拆，直到叶子是能直接执行的步骤。分支更宽、树更深，规划更周全，但要跟踪的工作也成倍增长——有用的计划之所以保持浅，就是这个原因。",
      "GOAL": "目标"
    },
    "patterns": [
      [
        "^branching (\\d+), depth (\\d+)  ->  (\\d+) leaf sub-tasks, (\\d+) nodes total \\(leaves are the executable steps\\)$",
        "分支数 $1，深度 $2  ->  $3 个叶子子任务，共 $4 个节点（叶子是可执行步骤）"
      ],
      [
        "^leaves = b\\^depth ;  total nodes = \\(b\\^\\(depth\\+1\\) - 1\\) / \\(b - 1\\)$",
        "叶子数 = b^depth；总节点数 = (b^(depth+1) - 1) / (b - 1)"
      ]
    ],
    "preserve": []
  },
  "reflection-loop": {
    "text": {
      "REFLECTION LOOP": "反思循环",
      "A self-improvement loop acts, evaluates the result, critiques what went wrong, and revises before the next attempt. Each pass raises quality, but the gain shrinks geometrically and soon flattens. The skill is knowing when reflection has stopped paying for itself.": "自我改进循环是：行动、评估结果、批判错在哪、修正后再试。每一轮都提升质量，但增益几何缩减、很快走平。真正的功夫在于看出反思何时不再回本。",
      "ACT": "行动",
      "EVALUATE": "评估",
      "CRITIQUE": "反思",
      "REVISE": "修订",
      "revise feeds the next attempt": "修订结果用于下一次尝试",
      "quality": "质量"
    },
    "patterns": [
      [
        "^iteration (\\d+)  ·  gain this pass \\+([\\d.]+)  ·  still improving$",
        "第 $1 轮 · 本轮增益 +$2 · 仍在改进"
      ],
      [
        "^iteration (\\d+)  ·  gain this pass \\+([\\d.]+)  ·  diminishing returns$",
        "第 $1 轮 · 本轮增益 +$2 · 收益递减"
      ],
      [
        "^iteration (\\d+)  ·  gain this pass \\+([\\d.]+)  ·  almost flat$",
        "第 $1 轮 · 本轮增益 +$2 · 几乎持平"
      ],
      [
        "^iteration (\\d+)  ·  gain this pass \\+([\\d.]+)  ·  returns have flattened: stop reflecting$",
        "第 $1 轮 · 本轮增益 +$2 · 收益已持平：停止反思"
      ]
    ],
    "preserve": []
  },
  "world-model-rollout": {
    "text": {
      "WORLD-MODEL ROLLOUT": "世界模型推演",
      "Model-based planning simulates the future before touching the world. From the current state the agent imagines the states each candidate action would lead to, rolls those forward with a learned model, and only then commits to the best first move. Deeper rollouts plan better but the imagined tree grows exponentially.": "基于模型的规划先在脑内模拟未来，再触碰真实世界。智能体从当前状态想象每个候选动作通向的状态，用学到的模型往前推演，然后才落子最优的第一步。推演越深规划越好，但想象的树呈指数膨胀。",
      "now": "当前"
    },
    "patterns": [
      [
        "^looking (\\d+) steps ahead, (\\d+) actions per state  ->  (\\d+) imagined futures simulated before one real action$",
        "向前推演 $1 步，每个状态 $2 个行动  ->  实际行动一次前，模拟 $3 种未来"
      ],
      [
        "^imagined states = sum b\\^k for k=1\\.\\.depth  ·  cost grows exponentially with rollout depth$",
        "推演状态数 = 对 k=1..depth 求和 b^k  ·  成本随推演深度指数增长"
      ],
      [
        "^looking (\\d+) step ahead, (\\d+) actions per state  ->  (\\d+) imagined futures simulated before one real action$",
        "向前推演 $1 步，每个状态 $2 个行动 -> 实际行动一次前，模拟 $3 种未来"
      ]
    ],
    "preserve": []
  },
  "autonomy-oversight": {
    "text": {
      "auto-approved": "自动批准",
      "escalate ->": "转交审批 ->"
    },
    "patterns": [
      [
        "^autonomy (\\d+): actions at or below the dial run unattended; anything riskier escalates to a human gate$",
        "自主程度 $1：风险不高于设定值的行动自动运行；更高风险的行动转交人工审批"
      ]
    ],
    "preserve": []
  },
  "memory-consolidation": {
    "text": {
      "MEMORY CONSOLIDATION": "记忆固化",
      "Recent steps live as detailed episodic records. Once the buffer crosses a threshold, the oldest episodes are compressed into a compact semantic summary that preserves the gist while freeing the window. A long-running agent survives by consolidating instead of remembering every token forever.": "近期步骤以详细的情景记录存活。缓冲一过阈值，最老的情景就被压缩成紧凑的语义摘要——保住要旨、腾出窗口。长期运行的智能体靠固化存活，而不是永远记住每一个 token。",
      "episodic events (recent in blue)": "情节事件（近期事件为蓝色）",
      "semantic memory": "语义记忆"
    },
    "patterns": [
      [
        "^(\\d+) events -> 1 summary$",
        "$1 个事件 -> 1 份摘要"
      ],
      [
        "^(\\d+) recent events kept verbatim  ·  (\\d+) older events compressed into long-term memory$",
        "原样保留 $1 个近期事件 · 将 $2 个较早事件压缩进长期记忆"
      ],
      [
        "^keep newest (\\d+) episodic; consolidate the rest into a semantic summary as the buffer overflows$",
        "保留最新 $1 个情节记录；缓冲区溢出时，将其余记录整合为语义摘要"
      ]
    ],
    "preserve": []
  },
  "canary-rollout": {
    "text": {
      "CANARY ROLLOUT": "金丝雀发布",
      "A canary release routes a small slice of traffic to the new version while the rest stays on the proven one. Error rate on the canary is watched against an SLA; the moment it breaches, traffic drains back to stable. Here the canary runs hot, so widening the split raises the blended error and keeps the rollback armed.": "金丝雀发布把一小片流量路由到新版本，其余留在久经考验的旧版上。金丝雀的错误率对照 SLA 盯着；一旦越线，流量立刻撤回稳定版。这里金丝雀错误率偏高，所以放大切片会推高混合错误率、让回滚时刻待命。",
      "% blended error": "% 混合错误率",
      "canary breaches the SLA: drain its traffic back to the stable version": "金丝雀版本违反 SLA：将其流量切回稳定版本"
    },
    "patterns": [
      [
        "^stable (\\d+)%$",
        "稳定版本 $1%"
      ],
      [
        "^canary (\\d+)%$",
        "金丝雀版本 $1%"
      ],
      [
        "^canary error ([\\d.]+)% vs SLA ([\\d.]+)%  ROLLBACK TRIGGERED$",
        "金丝雀错误率 $1%，SLA $2% · 已触发回滚"
      ],
      [
        "^canary error ([\\d.]+)% vs SLA ([\\d.]+)%  within SLA$",
        "金丝雀错误率 $1%，SLA $2% · 符合 SLA"
      ],
      [
        "^blended error = \\(stable% · 0\\.4 \\+ canary% · 2\\.6\\) / 100  ·  trip rollback when canary error > SLA$",
        "混合错误率 = (稳定版本% · 0.4 + 金丝雀版本% · 2.6) / 100  ·  金丝雀错误率 > SLA 时触发回滚"
      ]
    ],
    "preserve": []
  },
  "pass-at-k": {
    "text": {
      "PASS @ K": "Pass@K",
      "Pass@k asks whether at least one of k independent samples solves the task. If each try succeeds with probability p, all k fail with probability (1-p)^k, so pass@k is one minus that. Even a weak model climbs steeply with more samples, which is why best-of-k is such a cheap lever and why pass@1 and pass@k tell different stories.": "Pass@k 问的是 k 次独立采样里是否至少有一次解出任务。每次成功概率为 p，则 k 次全败的概率是 (1-p)^k，pass@k 就是一减它。哪怕弱模型也会随采样数陡峭爬升——这就是 best-of-k 如此便宜的杠杆、pass@1 和 pass@k 讲出不同故事的原因。"
    },
    "patterns": [
      [
        "^one sample succeeds (\\d+)% of the time  ·  (\\d+) tries lift it to ([\\d.]+)%$",
        "单次采样成功率 $1% · 尝试 $2 次后达到 $3%"
      ],
      [
        "^pass@k = 1 - \\(1 - p\\)\\^k,  p = ([\\d.]+), k = (\\d+)   ·   k -> infinity drives it toward 1$",
        "pass@k = 1 - (1 - p)^k，p = $1，k = $2 · k 趋于无穷时，结果趋近 1"
      ]
    ],
    "preserve": [
      {
        "text": "Pass@K",
        "reason": "指标名称或 trace span 的技术标识，原样保留。"
      },
      {
        "text": "% pass@5",
        "reason": "Pass@k 指标的原始数学标签，k 是滑块数值，保持不变。"
      },
      {
        "text": "% pass@1",
        "reason": "Pass@k 指标的原始数学标签，k 是滑块数值，保持不变。"
      },
      {
        "text": "% pass@20",
        "reason": "Pass@k 指标的原始数学标签，k 是滑块数值，保持不变。"
      },
      {
        "text": "% pass@2",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@3",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@4",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@6",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@7",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@8",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@9",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@10",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@11",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@12",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@13",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@14",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@15",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@16",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@17",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@18",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      },
      {
        "text": "% pass@19",
        "reason": "Pass@k 指标的数学标签与滑块数值，保持原样。"
      }
    ]
  },
  "trace-spans": {
    "text": {
      "TRACE SPANS": "Trace Span 视图",
      "A distributed trace is a tree of spans laid out on a timeline. The root span covers the whole request; child spans for each LLM call, retrieval, and tool call nest inside it by start time and duration. Reading the gantt shows where the latency actually went, which is the first question every production incident asks.": "分布式 trace 是摆在时间线上的 span 树。根 span 罩住整个请求；每次 LLM 调用、检索、工具调用的子 span 按开始时间和时长嵌在里面。读这张甘特图就能看出延迟到底去了哪——这是每次线上事故的第一问。",
      "retrieval": "检索",
      "rerank": "重排序"
    },
    "patterns": [
      [
        "^span starts at (\\d+)ms, runs (\\d+)ms, depth (\\d+)  ·  total trace (\\d+)ms \\(one root span, its children nested by indent\\)$",
        "span 从 $1ms 开始，持续 $2ms，深度 $3 · 整条 trace 为 $4ms（一个根 span，子 span 按缩进嵌套）"
      ]
    ],
    "preserve": [
      {
        "text": "llm_call (plan)",
        "reason": "指标名称或 trace span 的技术标识，原样保留。"
      },
      {
        "text": "llm_call (answer)",
        "reason": "指标名称或 trace span 的技术标识，原样保留。"
      },
      {
        "text": "ms · llm_call (plan)",
        "reason": "指标名称或 trace span 的技术标识，原样保留。"
      },
      {
        "text": "ms · llm_call (answer)",
        "reason": "技术标识、公式或实体标签，保持原样。"
      }
    ]
  },
  "eval-harness-matrix": {
    "text": {
      "baseline": "基线",
      "tuned": "调优后",
      "ablation": "消融",
      "EVAL HARNESS MATRIX": "评测矩阵",
      "An eval harness runs every task against every model variant and records pass or fail in a grid. Reading down a column shows which tasks are hard; reading across a row gives one variant its aggregate score. The matrix is what turns a vague hunch into a number you can regression-test against.": "评测框架把每个任务跑过每个模型变体，在网格里记下通过或失败。竖着读一列能看出哪些任务难；横着读一行得到一个变体的总分。这张矩阵把模糊的直觉变成可以做回归测试的数字。",
      "parse-json": "解析 JSON",
      "sort-list": "列表排序",
      "sql-join": "SQL 连接",
      "regex-extract": "正则提取",
      "recursion": "递归",
      "edge-cases": "边界情况"
    },
    "patterns": [
      [
        "^aggregate score for (baseline|tuned|ablation) = (\\d+)%  ·  P = pass, F = fail per fixture task$",
        "$1 的综合得分 = $2% · 每项固定测试中，P = 通过，F = 失败"
      ]
    ],
    "preserve": []
  }
};
