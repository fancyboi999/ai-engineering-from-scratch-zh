(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-autoswarm5.js"] = {
  "a5-scaffold-delta": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "SCAFFOLD DELTA": "编排框架带来的差距",
      "same weights, different loop": "相同权重，不同循环",
      "Claude Sonnet 4.5 scores 43.2% on SWE-bench Verified inside SWE-agent v1 and 59.8% inside the Cline autonomous scaffold. Same weights, 16.6 points apart. The retrieval layer, planner, sandbox, and edit-verify loop around the model now matter as much as the model itself.": "Claude Sonnet 4.5 在 SWE-agent v1 中的 SWE-bench Verified 得分为 43.2%，在 Cline 自主编排框架中为 59.8%。同一组权重，相差 16.6 个百分点。模型周围的检索层、规划器、沙箱及编辑—验证循环，现在和模型本身同样重要。",
      "same": "相同",
      "model": "模型",
      "Cline autonomous": "Cline 自主编排",
      "+16.6 pts, same weights": "+16.6 个百分点，相同权重",
      "one model, two scaffolds  ·  the loop around the model is load-bearing": "一个模型，两套编排框架 · 模型周围的循环承担关键工作"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ pts,\\ same\\ weights$",
        "$1 个百分点，相同权重"
      ]
    ],
    "preserve": [
      {
        "text": "SWE-agent v1",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "a5-guard-sieve": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "GUARD SIEVE": "护栏筛网",
      "classify in, classify out": "分类输入，分类输出",
      "Llama Guard sits on both sides of the model, classifying inputs and outputs against the MLCommons S1-S14 hazard taxonomy. Obvious misuse is caught cheaply. But Huang et al. 2025 measured emoji smuggling at 100% attack success across six guard systems: classifiers are a layer, not a solution.": "Llama Guard 位于模型两侧，依据 MLCommons S1–S14 危害分类体系对输入和输出分类。明显的滥用可以低成本拦截。但 Huang 等人在 2025 年测得，表情符号夹带攻击对六套护栏系统的成功率均达 100%：分类器只是其中一层，不能单独解决问题。",
      "model": "模型",
      "guard in": "输入护栏",
      "guard out": "输出护栏",
      "blocked": "已阻断",
      "smuggled": "夹带绕过",
      "classify the input, classify the output  ·  character-level attacks still get through": "分类输入、分类输出 · 字符级攻击仍可绕过"
    },
    "patterns": [],
    "preserve": []
  },
  "a5-rsp-ladder": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "gauge vs threshold": "能力仪表对照阈值",
      "RSP v3.0 names AI R&D-4 as the next threshold: a model that could automate a substantial fraction of AI research at competitive cost. Claude Opus 4.6 sits below it, though Anthropic concedes that confidently ruling it out is getting difficult. Commitments now split into unilateral actions and industry recommendations, and the 2023 pause clause is gone; SaferAI scored the policy down from 2.2 to 1.9.": "RSP v3.0 将 AI R&D-4 定为下一道阈值：模型能以有竞争力的成本自动完成 AI 研究中的相当一部分工作。Claude Opus 4.6 仍低于该阈值，但 Anthropic 承认，要有把握地排除这种能力正在变难。承诺现已分为单边行动和行业建议，2023 年的暂停条款也已移除；SaferAI 将该政策的评分从 2.2 下调至 1.9。",
      "Opus 4.6 today": "当前的 Opus 4.6",
      "capability": "能力",
      "unilateral": "单边行动",
      "training + deploy gates": "训练与部署关口",
      "industry recommendation": "行业建议",
      "RAND SL-4 security": "RAND SL-4 安全等级",
      "pause clause (v2)": "暂停条款（v2）",
      "dropped in v3.0": "v3.0 已移除",
      "gauge": "能力仪表",
      "two-tier commitments": "两层承诺"
    },
    "patterns": [
      [
        "^Opus\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ today$",
        "当前的 Opus $1"
      ],
      [
        "^RAND\\ SL\\-([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ security$",
        "RAND SL-$1 安全等级"
      ],
      [
        "^dropped\\ in\\ v3\\.([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "v3.$1 已移除"
      ]
    ],
    "preserve": [
      {
        "text": "RSP v3.0",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "RSP v3.0",
        "reason": "产品名、公式或演示字面量，保持原样"
      },
      {
        "text": "RSP v3.0",
        "reason": "产品名、公式或演示字面量，保持原样"
      },
      {
        "text": "RSP v3.0",
        "reason": "产品名、公式或演示字面量，保持原样"
      },
      {
        "text": "RSP v3.0",
        "reason": "产品名、公式或演示字面量，保持原样"
      }
    ]
  },
  "a5-tracked-vs-research": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "TRACKED vs RESEARCH": "跟踪类别与研究类别",
      "gated or observed": "设置关口，或仅做观察",
      "OpenAI Preparedness v2 splits categories in two. Tracked Categories trigger Capabilities and Safeguards Reports reviewed by the Safety Advisory Group before deployment. Research Categories, including Long-range Autonomy and Sandbagging, are monitored with only potential mitigations. DeepMind FSF v3 makes the same move by folding autonomy into its ML R&D and Cyber domains.": "OpenAI Preparedness v2 将类别分为两种。跟踪类别会触发能力与防护措施报告，部署前由安全咨询组审阅。研究类别包括长程自主性和刻意压低能力表现，仅接受监测与可能的缓解措施。DeepMind FSF v3 也采取相似做法，将自主性并入 ML 研发和网络安全领域。",
      "TRACKED": "跟踪类别",
      "RESEARCH": "研究类别",
      "capability +": "能力与",
      "safeguards reports": "防护措施报告",
      "gate opens": "关口开放",
      "observed": "接受观察",
      "no automatic trigger": "不会自动触发",
      "same capability, two buckets  ·  which lane it lives in decides whether it is gated or watched": "相同能力，分属两类 · 所属类别决定设关还是观察"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "SAG",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "a5-horizon-fit": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "TIME HORIZON FIT": "任务时间跨度拟合",
      "logistic through the tasks": "对任务拟合 Logistic 曲线",
      "METR runs a model across HCAST, RE-Bench, and SWAA tasks spanning minutes to hours of expert time, then fits a logistic curve to success probability versus log expert-completion-time. The 50% crossing is the time horizon. It is an idealized upper bound measured without real consequences, not a deployment prediction.": "METR 在 HCAST、RE-Bench 和 SWAA 任务上运行模型，这些任务对应专家数分钟到数小时的工作。随后，它将成功概率对专家完成时间的对数拟合为 Logistic 曲线。曲线穿过 50% 的位置就是任务时间跨度。这是没有真实后果的测试中得到的理想化上界，不是部署预测。",
      "1 min": "1 分钟",
      "P(success)": "P（成功）",
      "time horizon": "任务时间跨度"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ min$",
        "$1 分钟"
      ]
    ],
    "preserve": []
  },
  "a5-four-risks": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "FOUR RISKS": "四类风险",
      "the CAIS taxonomy": "CAIS 分类体系",
      "The CAIS framework groups catastrophic AI risk into malicious use, AI races, organizational risks, and rogue AIs. The categories overlap: a rogue AI shipped by a lab that traded audits for speed in a race is all four at once. Organizational risk is the quadrant a practitioner can actually act on, which is why it holds the highlight.": "CAIS 框架将灾难性 AI 风险分为恶意使用、AI 竞赛、组织风险和失控 AI。各类别会重叠：如果一家实验室在竞赛中牺牲审计来换取速度，最终交付了失控 AI，就同时涉及四类风险。组织风险是实践者能够直接采取行动的一类，因此图中将它突出显示。",
      "malicious use": "恶意使用",
      "AI races": "AI 竞赛",
      "organizational risks": "组织风险",
      "rogue AIs": "失控 AI",
      "safety culture": "安全文化",
      "rigorous audits": "严格审计",
      "infosec": "信息安全",
      "four societal-scale risk classes  ·  one of them is under your control": "四类社会级风险 · 其中一类在你的控制范围内"
    },
    "patterns": [],
    "preserve": []
  },
  "a5-primitive-radar": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "PRIMITIVE RADAR": "基本构件雷达图",
      "four axes, every framework": "四个维度，比较所有框架",
      "Agent, handoff, shared state, orchestrator: four primitives span the whole design space. OpenAI Swarm leans on agents plus handoffs and leaves state to the caller. LangGraph puts weight on the StateGraph and a deterministic graph orchestrator. CrewAI leans on role-heavy agents with a manager process. Every new framework release is another shape on the same radar.": "agent、交接、共享状态和编排器这四个基本构件覆盖了整个设计空间。OpenAI Swarm 侧重 agent 与交接，将状态交给调用方管理；LangGraph 侧重 StateGraph 和确定性的图编排器；CrewAI 则侧重明确分工的 agent 与管理进程。每次框架更新，都是同一张雷达图上的新形状。",
      "handoff": "交接",
      "shared state": "共享状态",
      "orchestrator": "编排器"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "OpenAI Swarm",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "LangGraph",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "CrewAI",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "a5-og-narrator": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "OG-NARRATOR": "OG-Narrator 报价叙述器",
      "numbers, then words": "先算数值，再写文字",
      "LLMs conflate deciding an offer with narrating it, and close only 26.7% of tightly-parameterized bargains; scale does not fix it. OG-Narrator splits the two: a deterministic offer generator computes each numeric move and the LLM only writes the accompanying message. Deal rate jumps to 88.9%, echoing Contract Net: keep the mechanism separate from the communication layer.": "LLM 常把确定报价与叙述报价混在一起，在参数严格限定的议价任务中成交率仅为 26.7%，扩大模型规模也无济于事。OG-Narrator 将二者分开：确定性的报价生成器计算每一次数值调整，LLM 只负责撰写配套消息。成交率由此升至 88.9%，与合同网协议的原则一致：将机制与沟通层分离。",
      "LLM ALONE": "仅使用 LLM",
      "LLM decides": "LLM 决定报价",
      "and narrates": "并撰写说明",
      "offer generator": "报价生成器",
      "deterministic": "确定性计算",
      "LLM narrator": "LLM 叙述器",
      "words only": "只负责文字",
      "26.7% deals": "26.7% 成交",
      "88.9% deals": "88.9% 成交",
      "decide the number, then narrate it  ·  decoupling mechanism from language wins": "先确定数值，再组织文字 · 将机制与语言分离更有效"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\ deals$",
        "$1% 成交"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\ deals$",
        "$1% 成交"
      ]
    ],
    "preserve": []
  },
  "a5-memory-reflection": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "GENERATIVE AGENT LOOP": "生成式 agent 循环",
      "stream, reflect, plan": "记忆流、反思、计划",
      "Smallville agents keep an append-only memory stream scored by recency, importance, and relevance. Periodically the agent synthesizes recent memories into a reflection, which drops back into the stream and feeds top-down plans from day level to action level. Ablate any of the three and believability drops: this loop is what let one seeded party idea spread through 24 unscripted agents.": "Smallville 的 agent 维护一个只追加的记忆流，并按新近程度、重要性和相关性评分。agent 定期将近期记忆综合为反思，再将反思写回记忆流，驱动从日级到行动级的自上而下计划。移除其中任何一项都会降低可信程度。正是这个循环，让一次预设的聚会想法在 24 个没有预设剧本的 agent 之间传播。",
      "memory stream": "记忆流",
      "observation": "观察",
      "reflection": "反思",
      "higher-order synthesis": "高阶综合",
      "plan": "计划",
      "day, hour, action": "日、小时、行动",
      "observe, reflect, plan  ·  reflections re-enter the stream and are retrieved like any memory": "观察、反思、计划 · 反思重新进入记忆流，并像其他记忆一样被检索"
    },
    "patterns": [],
    "preserve": []
  },
  "a5-retry-cascade": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "RETRY CASCADE": "重试级联",
      "the storm and the breaker": "重试风暴与熔断器",
      "MAST puts coordination failures at 36.94% of 1642 multi-agent execution traces, and the retry storm is the canonical cascade: a payment failure triggers order retries, each order retry triggers inventory retries, and the inventory service sees 10x load within seconds. A circuit breaker between tiers is the mitigation that turns an amplifying chain back into one contained failure.": "在 MAST 的 1642 条多 agent 执行轨迹中，协调失败占 36.94%。重试风暴是典型的级联：支付失败触发订单重试，每次订单重试又触发库存重试，几秒内库存服务的负载就达到 10 倍。在服务层之间加入熔断器，才能把不断放大的链条重新限制为一次局部失败。",
      "payment": "支付",
      "orders": "订单",
      "inventory": "库存",
      "fail": "失败",
      "10x load": "10x 负载",
      "circuit breaker": "熔断器",
      "1 failure, 2 retries, 4 retries  ·  coordination failures are 36.9% of MAST traces": "1 次失败、2 次重试、4 次重试 · 协调失败占 MAST 轨迹的 36.9%"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x\\ load$",
        "$1x 负载"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ failure,\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ retries,\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ retries\\ \\ ·\\ \\ coordination\\ failures\\ are\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\ of\\ MAST\\ traces$",
        "$1 次失败、$2 次重试、$3 次重试 · 协调失败占 MAST 轨迹的 $4%"
      ]
    ],
    "preserve": []
  },
  "a5-bench-gap": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "BENCHMARK GAP": "基准差距",
      "Verified vs Pro": "Verified 对比 Pro",
      "Frontier models score 70%+ on SWE-bench Verified and about 23% on SWE-bench Pro, whose 1865 problems require 10+ line changes across 41 repos. Verified is near saturation, partially contaminated, and padded by an easy tail of one-to-two-line tasks. Pro is the uncontaminated reality check: read any leaderboard claim against both columns.": "前沿模型在 SWE-bench Verified 上的得分超过 70%，在 SWE-bench Pro 上却只有约 23%。Pro 的 1865 个问题来自 41 个仓库，每题要求修改 10 行以上代码。Verified 接近饱和，存在部分数据污染，并包含不少只需改一两行的简单任务。Pro 是未受污染的现实检验：阅读任何排行榜声明时，都应同时查看这两列。",
      "10+ line tasks": "需修改 10+ 行的任务",
      "generalization gap": "泛化差距",
      "same model, two task distributions  ·  passing Verified is not evidence of generalization": "相同模型，两种任务分布 · 通过 Verified 不能证明泛化能力"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\+\\ line\\ tasks$",
        "需修改 $1+ 行的任务"
      ]
    ],
    "preserve": [
      {
        "text": "SWE-bench Verified",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "SWE-bench Pro",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "a5-orchestrator-scale": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  }
};
