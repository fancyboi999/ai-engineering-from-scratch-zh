(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-misc2.js"] = {
  "mx-schema-funnel": {
    "text": {
      "Motion reduced": "已减少动画",
      "STRUCTURED OUTPUT FUNNEL": "结构化输出漏斗",
      "free text is forced through a grammar into typed JSON": "自由文本经语法约束转为有类型 JSON",
      "An LLM returns a string; your application needs typed JSON. Adding \"respond in JSON\" to the prompt works about 90% of the time and crashes on the rest. Constrained decoding closes the gap at the token level: a finite-state machine or grammar masks the logits so any token that would break the schema is forbidden before it is sampled. The output is valid JSON by construction, not by post-processing, with a Pydantic layer validating types and retrying on the rare miss.": "LLM 返回字符串，应用需要有类型的 JSON。在 prompt 中写“用 JSON 回答”约有 90% 成功率，其余情况会出错。约束解码在 token 层补上缺口：有限状态机或语法屏蔽 logits，在采样前禁止违反 schema 的 token。输出从构造时就是有效 JSON，而非事后处理所得；Pydantic 层再校验类型，并对少数失败重试。",
      "free text": "自由文本",
      "grammar gate": "语法关卡",
      "mask logits": "屏蔽 logits",
      "typed JSON": "有类型 JSON",
      "invalid token masked at the gate": "无效 token 在关卡被屏蔽",
      "constrained decoding forbids any token that breaks the schema": "约束解码禁止任何违反 schema 的 token",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^An\\ LLM\\ returns\\ a\\ string;\\ your\\ application\\ needs\\ typed\\ JSON\\.\\ Adding\\ \"respond\\ in\\ JSON\"\\ to\\ the\\ prompt\\ works\\ about\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ of\\ the\\ time\\ and\\ crashes\\ on\\ the\\ rest\\.\\ Constrained\\ decoding\\ closes\\ the\\ gap\\ at\\ the\\ token\\ level:\\ a\\ finite\\-state\\ machine\\ or\\ grammar\\ masks\\ the\\ logits\\ so\\ any\\ token\\ that\\ would\\ break\\ the\\ schema\\ is\\ forbidden\\ before\\ it\\ is\\ sampled\\.\\ The\\ output\\ is\\ valid\\ JSON\\ by\\ construction,\\ not\\ by\\ post\\-processing,\\ with\\ a\\ Pydantic\\ layer\\ validating\\ types\\ and\\ retrying\\ on\\ the\\ rare\\ miss\\.$",
        "LLM 返回字符串，应用需要有类型的 JSON。在 prompt 中写“用 JSON 回答”约有 $1% 成功率，其余情况会出错。约束解码在 token 层补上缺口：有限状态机或语法屏蔽 logits，在采样前禁止违反 schema 的 token。输出从构造时就是有效 JSON，而非事后处理所得；Pydantic 层再校验类型，并对少数失败重试。"
      ]
    ],
    "preserve": [
      {
        "text": "FSM / CFG",
        "reason": "形式语法算法缩写"
      },
      {
        "text": "{ name, price,",
        "reason": "JSON字段示例"
      }
    ]
  },
  "mx-tool-call-loop": {
    "text": {
      "Motion reduced": "已减少动画",
      "model": "模型",
      "FUNCTION-CALLING LOOP": "函数调用循环",
      "model emits call JSON; your code runs it and feeds the result back": "模型输出调用 JSON；代码执行并回传结果",
      "An LLM only generates text, so it cannot check the weather or query a database. Function calling is the protocol that bridges the gap: the model outputs structured JSON naming which function to call with what arguments, your code executes it, and the result is fed back into the conversation. The model is the brain, your tools are the hands, the loop is the nervous system. It repeats until the model stops requesting calls and produces a final answer, with guards against parallel calls and infinite tool loops.": "LLM 只生成文本，不能自行查天气或数据库。函数调用协议填补了缺口：模型输出结构化 JSON，指定函数和参数；你的代码执行，再把结果放回对话。模型是大脑，工具是双手，循环是神经系统。循环持续到模型不再请求调用、给出最终回答；同时要防范并行调用和无限工具循环。",
      "the brain": "大脑",
      "your code": "你的代码",
      "the hands": "双手",
      "call: get_weather(\"Tokyo\")": "调用：get_weather(\"Tokyo\")",
      "result: 15°C": "结果：15°C",
      "loop until the model stops requesting calls, then it answers": "循环到模型不再请求调用，再给出回答",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^result:\\ ([-+]?\\d+(?:[.,]\\d+)*)°C$",
        "结果：$1°C"
      ]
    ],
    "preserve": []
  },
  "mx-research-loop": {
    "text": {
      "Motion reduced": "已减少动画",
      "AUTONOMOUS RESEARCH LOOP": "自主研究循环",
      "idea → experiment → sandbox → critique, iterated": "想法 → 实验 → 沙箱 → 批评，反复迭代",
      "AI Scientist v2 closes the research loop without human templates: it generates ideas, checks novelty, drafts and runs experiments in a sandbox, has a vision-language model critique the figures, and writes the paper, iterating on internal review. One generated paper passed an ICLR 2025 workshop review. Independent evaluation found 42% of experiments failed on coding errors and the novelty check often mislabeled established methods as new, so the sandbox edge of the loop is where reliability is decided.": "AI Scientist v2 无需人工模板就能闭环研究：生成想法、检查新颖性、起草并在沙箱中运行实验，让视觉语言模型批评图表，撰写论文，并根据内部审查反复迭代。一篇生成论文通过了 ICLR 2025 研讨会审查。独立评估发现，42% 的实验因编码错误失败，新颖性检查也常把已有方法误判为新方法，因此可靠性取决于循环的沙箱执行边界。",
      "idea": "想法",
      "novelty?": "新颖？",
      "experiment": "实验",
      "sandbox run": "沙箱运行",
      "figures": "图表",
      "writeup": "撰写报告",
      "critique": "批评",
      "42% of runs fail on coding errors; the loop re-enters at sandbox": "42% 的运行因编码错误失败；循环重新进入沙箱",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^AI\\ Scientist\\ v2\\ closes\\ the\\ research\\ loop\\ without\\ human\\ templates:\\ it\\ generates\\ ideas,\\ checks\\ novelty,\\ drafts\\ and\\ runs\\ experiments\\ in\\ a\\ sandbox,\\ has\\ a\\ vision\\-language\\ model\\ critique\\ the\\ figures,\\ and\\ writes\\ the\\ paper,\\ iterating\\ on\\ internal\\ review\\.\\ One\\ generated\\ paper\\ passed\\ an\\ ICLR\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ workshop\\ review\\.\\ Independent\\ evaluation\\ found\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ of\\ experiments\\ failed\\ on\\ coding\\ errors\\ and\\ the\\ novelty\\ check\\ often\\ mislabeled\\ established\\ methods\\ as\\ new,\\ so\\ the\\ sandbox\\ edge\\ of\\ the\\ loop\\ is\\ where\\ reliability\\ is\\ decided\\.$",
        "AI Scientist v2 无需人工模板就能闭环研究：生成想法、检查新颖性、起草并在沙箱中运行实验，让视觉语言模型批评图表，撰写论文，并根据内部审查反复迭代。一篇生成论文通过了 ICLR $1 研讨会审查。独立评估发现，$2% 的实验因编码错误失败，新颖性检查也常把已有方法误判为新方法，因此可靠性取决于循环的沙箱执行边界。"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)%\\ of\\ runs\\ fail\\ on\\ coding\\ errors;\\ the\\ loop\\ re\\-enters\\ at\\ sandbox$",
        "$1% 的运行因编码错误失败；循环重新进入沙箱"
      ]
    ],
    "preserve": [
      {
        "text": "VLM",
        "reason": "VLM技术缩写"
      }
    ]
  },
  "mx-propose-then-commit": {
    "text": {
      "Motion reduced": "已减少动画",
      "PROPOSE-THEN-COMMIT": "先提议，再提交",
      "a durable proposal walks four gated stages": "持久化提议经过四个带关卡的阶段",
      "The 2026 HITL shape is not a synchronous Approve prompt. The proposed action is persisted with an idempotency key, surfaced with intent, blast radius, and a rollback plan, committed only on positive acknowledgement, then verified to confirm the side effect actually happened. The failure mode is the rubber-stamp: clicking Approve without review. Challenge-and-response with an explicit checklist is the documented mitigation.": "2026 年的人工介入模式不是同步弹出“批准”提示。拟执行行动先携幂等键持久化，展示意图、影响范围和回滚计划；仅在明确确认后提交，再验证副作用确实发生。失败模式是形式化盖章：不审查就点批准。文档记录的缓解方法是挑战应答配合明确清单。",
      "PROPOSE": "提议",
      "persist + key": "持久化 + 幂等键",
      "REVIEW": "审查",
      "intent · blast": "意图 · 影响范围",
      "COMMIT": "提交",
      "positive ack": "明确确认",
      "VERIFY": "验证",
      "side effect?": "副作用发生？",
      "rec": "记录",
      "rubber-stamp: skips review": "形式化盖章：跳过审查",
      "idempotency key = resubmit returns the same record": "幂等键 = 重复提交返回同一记录",
      "commit only on positive ack; verify confirms the effect landed": "仅在明确确认后提交；验证确认实际效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^The\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ HITL\\ shape\\ is\\ not\\ a\\ synchronous\\ Approve\\ prompt\\.\\ The\\ proposed\\ action\\ is\\ persisted\\ with\\ an\\ idempotency\\ key,\\ surfaced\\ with\\ intent,\\ blast\\ radius,\\ and\\ a\\ rollback\\ plan,\\ committed\\ only\\ on\\ positive\\ acknowledgement,\\ then\\ verified\\ to\\ confirm\\ the\\ side\\ effect\\ actually\\ happened\\.\\ The\\ failure\\ mode\\ is\\ the\\ rubber\\-stamp:\\ clicking\\ Approve\\ without\\ review\\.\\ Challenge\\-and\\-response\\ with\\ an\\ explicit\\ checklist\\ is\\ the\\ documented\\ mitigation\\.$",
        "$1 年的人工介入模式不是同步弹出“批准”提示。拟执行行动先携幂等键持久化，展示意图、影响范围和回滚计划；仅在明确确认后提交，再验证副作用确实发生。失败模式是形式化盖章：不审查就点批准。文档记录的缓解方法是挑战应答配合明确清单。"
      ]
    ],
    "preserve": []
  },
  "mx-priority-tiers": {
    "text": {
      "Motion reduced": "已减少动画",
      "CONSTITUTIONAL PRIORITY TIERS": "宪法原则优先级",
      "four ranked tiers; conflicts resolve upward": "四个有序层级；冲突向上解决",
      "The 2026 Claude Constitution ranks behaviour in four tiers: safety and supporting human oversight first, ethics second, Anthropic guidelines third, helpfulness last. When tiers conflict the higher one wins, the same shape as Unix priorities or network QoS. Hardcoded prohibitions sit above the whole stack and cannot be overridden; everything else is reason-based within the hierarchy, which trades auditability for generalisation to unseen cases.": "2026 年 Claude 宪法把行为分为四层：首先是安全和支持人工监督，其次伦理，再次 Anthropic 指南，最后有用性。冲突时高层优先，结构类似 Unix 优先级或网络 QoS。硬编码禁令位于整个栈之上，不可覆盖；其余规则在层级内基于理由判断，以审计性换取对未见场景的泛化。",
      "1 · SAFETY + OVERSIGHT": "1 · 安全 + 监督",
      "2 · ETHICS": "2 · 伦理",
      "3 · ANTHROPIC GUIDELINES": "3 · Anthropic 指南",
      "4 · HELPFULNESS": "4 · 有用性",
      "conflict → higher tier wins": "冲突 → 高层优先",
      "tier 1 is hardcoded: operators and users cannot override it": "第 1 层为硬编码：运营者和用户均不能覆盖",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^The\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ Claude\\ Constitution\\ ranks\\ behaviour\\ in\\ four\\ tiers:\\ safety\\ and\\ supporting\\ human\\ oversight\\ first,\\ ethics\\ second,\\ Anthropic\\ guidelines\\ third,\\ helpfulness\\ last\\.\\ When\\ tiers\\ conflict\\ the\\ higher\\ one\\ wins,\\ the\\ same\\ shape\\ as\\ Unix\\ priorities\\ or\\ network\\ QoS\\.\\ Hardcoded\\ prohibitions\\ sit\\ above\\ the\\ whole\\ stack\\ and\\ cannot\\ be\\ overridden;\\ everything\\ else\\ is\\ reason\\-based\\ within\\ the\\ hierarchy,\\ which\\ trades\\ auditability\\ for\\ generalisation\\ to\\ unseen\\ cases\\.$",
        "$1 年 Claude 宪法把行为分为四层：首先是安全和支持人工监督，其次伦理，再次 Anthropic 指南，最后有用性。冲突时高层优先，结构类似 Unix 优先级或网络 QoS。硬编码禁令位于整个栈之上，不可覆盖；其余规则在层级内基于理由判断，以审计性换取对未见场景的泛化。"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ ·\\ SAFETY\\ \\+\\ OVERSIGHT$",
        "$1 · 安全 + 监督"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ ·\\ ETHICS$",
        "$1 · 伦理"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ ·\\ ANTHROPIC\\ GUIDELINES$",
        "$1 · Anthropic 指南"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ ·\\ HELPFULNESS$",
        "$1 · 有用性"
      ],
      [
        "^tier\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ is\\ hardcoded:\\ operators\\ and\\ users\\ cannot\\ override\\ it$",
        "第 $1 层为硬编码：运营者和用户均不能覆盖"
      ]
    ],
    "preserve": []
  },
  "mx-speculative-tree": {
    "text": {
      "Motion reduced": "已减少动画",
      "SPECULATIVE DECODING": "推测解码",
      "draft proposes K, target verifies in one pass": "草稿提出 K 个 token，目标模型一次验证",
      "EAGLE-3 trains a draft head on the target model hidden states, so its distribution tracks the target and acceptance rate alpha lands in the 0.6 to 0.8 band on general chat. The draft proposes K tokens; the target verifies all K in a single forward; accepted tokens are amortized free. But every rejected draft costs a second target pass, so below alpha of about 0.55 the technique is net negative at high concurrency. Measure alpha on real traffic first, flip the flag second.": "EAGLE-3 用目标模型隐藏状态训练草稿头，使分布跟随目标模型；普通聊天的接受率 alpha 落在 0.6 到 0.8。草稿提出 K 个 token，目标模型一次前向验证全部 K 个，被接受的 token 相当于摊销后免费。但每次拒绝都要再运行目标模型一次，因此高并发下 alpha 低于约 0.55 时净收益为负。先在真实流量测 alpha，再开启功能。",
      "draft": "草稿",
      "head": "头",
      "target": "目标",
      "1 forward": "1 次前向",
      "accept": "接受",
      "reject": "拒绝",
      "accepted tokens are free; one reject costs a second target pass": "接受的 token 免费；一次拒绝要再跑一次目标模型",
      "alpha < ~0.55 → speculative decoding goes net negative": "alpha < 约 0.55 → 推测解码净收益为负",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^EAGLE\\-([-+]?\\d+(?:[.,]\\d+)*)\\ trains\\ a\\ draft\\ head\\ on\\ the\\ target\\ model\\ hidden\\ states,\\ so\\ its\\ distribution\\ tracks\\ the\\ target\\ and\\ acceptance\\ rate\\ alpha\\ lands\\ in\\ the\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ to\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ band\\ on\\ general\\ chat\\.\\ The\\ draft\\ proposes\\ K\\ tokens;\\ the\\ target\\ verifies\\ all\\ K\\ in\\ a\\ single\\ forward;\\ accepted\\ tokens\\ are\\ amortized\\ free\\.\\ But\\ every\\ rejected\\ draft\\ costs\\ a\\ second\\ target\\ pass,\\ so\\ below\\ alpha\\ of\\ about\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ the\\ technique\\ is\\ net\\ negative\\ at\\ high\\ concurrency\\.\\ Measure\\ alpha\\ on\\ real\\ traffic\\ first,\\ flip\\ the\\ flag\\ second\\.$",
        "EAGLE-$1 用目标模型隐藏状态训练草稿头，使分布跟随目标模型；普通聊天的接受率 alpha 落在 $2 到 $3。草稿提出 K 个 token，目标模型一次前向验证全部 K 个，被接受的 token 相当于摊销后免费。但每次拒绝都要再运行目标模型一次，因此高并发下 alpha 低于约 $4 时净收益为负。先在真实流量测 alpha，再开启功能。"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ forward$",
        "$1 次前向"
      ],
      [
        "^alpha\\ <\\ \\~([-+]?\\d+(?:[.,]\\d+)*)\\ →\\ speculative\\ decoding\\ goes\\ net\\ negative$",
        "alpha < 约 $1 → 推测解码净收益为负"
      ]
    ],
    "preserve": []
  },
  "mx-gateway-fallback": {
    "text": {
      "Motion reduced": "已减少动画",
      "AI GATEWAY FALLBACK": "AI 网关回退",
      "one API fans out; a 429 reroutes to the next provider": "一个 API 分流；429 切换到下一提供方",
      "A gateway sits between your apps and providers, consolidating routing, fallback, retries, rate limits, secret references, and observability behind one OpenAI-compatible API. When the primary returns 429 or 5xx the gateway reroutes to a fallback provider so the request still completes. The 2026 split: LiteLLM (MIT, 100+ providers, breaks down near 2000 RPS), Portkey (control-plane, guardrails), Kong AI (fastest in its own benchmark), Bifrost (auto-retry). Data residency drives self-host vs managed.": "网关位于应用和提供方之间，用兼容 OpenAI 的统一 API 集中处理路由、回退、重试、限流、机密引用和可观测性。主提供方返回 429 或 5xx 时，网关改路由至备用提供方，保证请求完成。2026 年各有侧重：LiteLLM（MIT、100+ 提供方、接近 2000 RPS 时出现瓶颈），Portkey（控制平面、护栏），Kong AI（自有基准中最快），Bifrost（自动重试）。数据驻留要求决定自托管还是托管服务。",
      "gateway": "网关",
      "one API": "一个 API",
      "primary": "主提供方",
      "429 over quota": "429 配额超限",
      "fallback": "回退",
      "serves it": "处理请求",
      "self-host": "自托管",
      "spare": "备用",
      "429 → reroute": "429 → 改路由",
      "routing · fallback · retries · rate limits · secrets · observability": "路由 · 回退 · 重试 · 限流 · 机密 · 可观测性",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^one\\ API\\ fans\\ out;\\ a\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ reroutes\\ to\\ the\\ next\\ provider$",
        "一个 API 分流；$1 切换到下一提供方"
      ],
      [
        "^A\\ gateway\\ sits\\ between\\ your\\ apps\\ and\\ providers,\\ consolidating\\ routing,\\ fallback,\\ retries,\\ rate\\ limits,\\ secret\\ references,\\ and\\ observability\\ behind\\ one\\ OpenAI\\-compatible\\ API\\.\\ When\\ the\\ primary\\ returns\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ or\\ ([-+]?\\d+(?:[.,]\\d+)*)xx\\ the\\ gateway\\ reroutes\\ to\\ a\\ fallback\\ provider\\ so\\ the\\ request\\ still\\ completes\\.\\ The\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ split:\\ LiteLLM\\ \\(MIT,\\ ([-+]?\\d+(?:[.,]\\d+)*)\\+\\ providers,\\ breaks\\ down\\ near\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ RPS\\),\\ Portkey\\ \\(control\\-plane,\\ guardrails\\),\\ Kong\\ AI\\ \\(fastest\\ in\\ its\\ own\\ benchmark\\),\\ Bifrost\\ \\(auto\\-retry\\)\\.\\ Data\\ residency\\ drives\\ self\\-host\\ vs\\ managed\\.$",
        "网关位于应用和提供方之间，用兼容 OpenAI 的统一 API 集中处理路由、回退、重试、限流、机密引用和可观测性。主提供方返回 $1 或 $2xx 时，网关改路由至备用提供方，保证请求完成。$3 年各有侧重：LiteLLM（MIT、$4+ 提供方、接近 $5 RPS 时出现瓶颈），Portkey（控制平面、护栏），Kong AI（自有基准中最快），Bifrost（自动重试）。数据驻留要求决定自托管还是托管服务。"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ over\\ quota$",
        "$1 配额超限"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ →\\ reroute$",
        "$1 → 改路由"
      ]
    ],
    "preserve": []
  },
  "mx-sequential-test": {
    "text": {
      "Motion reduced": "已减少动画",
      "SEQUENTIAL A/B TEST": "序贯 A/B 测试",
      "cumulative effect crosses an always-valid boundary": "累积效应跨过始终有效的边界",
      "Evals ask whether the model can do the job; A/B tests ask whether users care. Fixed-horizon tests punish peeking, so 2026 platforms use sequential testing with always-valid boundaries that stay wide early and tighten over time. The cumulative statistic random-walks until it crosses a boundary, at which point you stop and ship, or it stays inside and you call it flat. CUPED reduces variance and Benjamini-Hochberg corrects for testing many variants at once.": "评估问模型能否完成任务，A/B 测试问用户是否在意。固定时长检验不允许随意中途查看，因此 2026 年的平台使用具有始终有效边界的序贯检验，早期边界宽，之后逐渐收紧。累积统计量随机游走，跨边界时即可停止并发布；一直未跨界则视为无差异。CUPED 降低方差，Benjamini-Hochberg 校正同时测试多个变体的影响。",
      "reject H0 (B wins)": "拒绝 H0（B 胜出）",
      "no effect": "无效应",
      "stop early": "提前停止",
      "peeking is safe: the boundary already paid for every look": "可以安全中途查看：边界已校正每次查看的影响",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^Evals\\ ask\\ whether\\ the\\ model\\ can\\ do\\ the\\ job;\\ A/B\\ tests\\ ask\\ whether\\ users\\ care\\.\\ Fixed\\-horizon\\ tests\\ punish\\ peeking,\\ so\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ platforms\\ use\\ sequential\\ testing\\ with\\ always\\-valid\\ boundaries\\ that\\ stay\\ wide\\ early\\ and\\ tighten\\ over\\ time\\.\\ The\\ cumulative\\ statistic\\ random\\-walks\\ until\\ it\\ crosses\\ a\\ boundary,\\ at\\ which\\ point\\ you\\ stop\\ and\\ ship,\\ or\\ it\\ stays\\ inside\\ and\\ you\\ call\\ it\\ flat\\.\\ CUPED\\ reduces\\ variance\\ and\\ Benjamini\\-Hochberg\\ corrects\\ for\\ testing\\ many\\ variants\\ at\\ once\\.$",
        "评估问模型能否完成任务，A/B 测试问用户是否在意。固定时长检验不允许随意中途查看，因此 $1 年的平台使用具有始终有效边界的序贯检验，早期边界宽，之后逐渐收紧。累积统计量随机游走，跨边界时即可停止并发布；一直未跨界则视为无差异。CUPED 降低方差，Benjamini-Hochberg 校正同时测试多个变体的影响。"
      ]
    ],
    "preserve": []
  }
};
