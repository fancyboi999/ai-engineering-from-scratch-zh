(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-agents2.js"] = {
  "rewoo-plan": {
    "text": {
      "REWOO PLAN-EXECUTE": "ReWOO 规划-执行",
      "ReWOO separates reasoning from observation. A planner writes the full chain of tool calls in one pass, then a worker executes them without calling the model again between steps. ReAct instead invokes the model before every action, re-reading the whole growing trajectory each time, which costs more tokens as the run gets longer.": "ReWOO 把推理和观察分开：规划器一次写完完整的工具调用链，执行器随后逐步执行，步骤之间不再重新调用模型。ReAct 则每次行动前都调用模型并重读不断增长的轨迹，任务越长，token 成本越高。",
      "act": "行动",
      "ReWOO: plan once, then execute": "ReWOO：一次规划，然后执行",
      "PLANNER": "规划器",
      "call 1": "调用 1",
      "call 2": "调用 2",
      "call 3": "调用 3",
      "call 4": "调用 4",
      "ReAct: interleave a model call per step": "ReAct：每步穿插一次模型调用",
      "ReWOO uses 1 planning call for 4 tools; ReAct uses 4 model calls, one before each tool": "ReWOO 用 1 次规划调用驱动 4 个工具；ReAct 在每个工具之前调用模型，共 4 次",
      "ReWOO model calls = 1 (plan) + 1 (solve) = 2  vs  ReAct model calls = 4  ->  2 total vs 4, but ReWOO front-loads the context once": "ReWOO 模型调用 = 1（规划）+ 1（求解）= 2，对比 ReAct 的 4 次模型调用；总计 2 次对比 4 次，但 ReWOO 在开始时一次载入上下文"
    },
    "patterns": [
      [
        "^call\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "调用 $1"
      ],
      [
        "^call\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "调用 $1"
      ],
      [
        "^call\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "调用 $1"
      ],
      [
        "^call\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "调用 $1"
      ],
      [
        "^ReWOO\\ uses\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ planning\\ call\\ for\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ tools;\\ ReAct\\ uses\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ model\\ calls,\\ one\\ before\\ each\\ tool$",
        "ReWOO 用 $1 次规划调用驱动 $2 个工具；ReAct 在每个工具之前调用模型，共 $3 次"
      ],
      [
        "^ReWOO\\ model\\ calls\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\(plan\\)\\ \\+\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\(solve\\)\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ vs\\ \\ ReAct\\ model\\ calls\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ \\->\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)\\ total\\ vs\\ ([-+]?\\d+(?:[.,]\\d+)*),\\ but\\ ReWOO\\ front\\-loads\\ the\\ context\\ once$",
        "ReWOO 模型调用 = $1（规划）+ $2（求解）= $3，对比 ReAct 的 $4 次模型调用；总计 $5 次对比 $6 次，但 ReWOO 在开始时一次载入上下文"
      ]
    ],
    "preserve": []
  },
  "tree-of-thoughts": {
    "text": {
      "TREE OF THOUGHTS": "思维树",
      "Tree of Thoughts turns a single chain into a search. At each step the model proposes several candidate thoughts; a scorer ranks them and a beam keeps only the best few to expand. Pruning the weak branches is what makes the exponential tree affordable while still letting the agent backtrack from a bad line of reasoning.": "思维树把单条思路变成搜索。每一步模型提出多个候选想法，评分器排序后只保留最优的几条继续展开。剪掉弱分支让指数型搜索变得可负担，也让智能体能从错误路线回退。",
      "15 thoughts explored across 3 levels  ·  beam keeps the top 2 per level (blue), prunes the rest": "已探索 15 个思路，共 3 层  ·  束搜索每层保留前 2 个（蓝色），剪去其余分支",
      "breadth 3 x depth 3 = up to 27 leaves; beam search caps the frontier at 2 to stay tractable": "宽度 3 x 深度 3 = 最多 27 个叶节点；束搜索将前沿限制为 2，使计算可控"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ thoughts\\ explored\\ across\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ levels\\ \\ ·\\ \\ beam\\ keeps\\ the\\ top\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ per\\ level\\ \\(blue\\),\\ prunes\\ the\\ rest$",
        "已探索 $1 个思路，共 $2 层  ·  束搜索每层保留前 $3 个（蓝色），剪去其余分支"
      ],
      [
        "^breadth\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ x\\ depth\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ =\\ up\\ to\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ leaves;\\ beam\\ search\\ caps\\ the\\ frontier\\ at\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ to\\ stay\\ tractable$",
        "宽度 $1 x 深度 $2 = 最多 $3 个叶节点；束搜索将前沿限制为 $4，使计算可控"
      ]
    ],
    "preserve": []
  },
  "self-refine": {
    "text": {
      "SELF-REFINE": "自我改进",
      "Self-Refine has one model write an answer, critique its own work, and revise, looping the output back as input. The first few passes catch the obvious flaws and gain the most; later passes find less to fix, so quality climbs toward a ceiling and flattens. The skill is knowing when extra iterations stop paying for their tokens.": "Self-Refine 让一个模型先写答案，再批评自身结果并修订，把输出循环作为下一轮输入。最初几轮能抓住最明显的问题，收益最大；之后可改之处越来越少，质量向上限收敛。关键在于知道额外迭代何时不再值得消耗 token。",
      "ceiling": "上限",
      "/ 100 quality": "/ 100 质量分",
      "iteration 3 gained +6.1 points  ·  still improving": "第 3 轮提升了 +6.1 分  ·  仍在改进",
      "each pass: critique own output -> revise.  gain_k = ceiling - draft shrinks geometrically, so quality plateaus": "每轮：批评自身输出，再修订。gain_k = ceiling - draft 按几何级数减小，因此质量逐渐进入平台期",
      "first draft, no self-critique yet": "初稿，尚未自我批评",
      "iteration 8 gained +0.6 points  ·  returns have flattened, stop refining": "第 8 轮提升了 +0.6 分  ·  收益已趋平，应停止修订"
    },
    "patterns": [
      [
        "^/\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ quality$",
        "/ $1 质量分"
      ],
      [
        "^iteration\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ gained\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ points\\ \\ ·\\ \\ still\\ improving$",
        "第 $1 轮提升了 $2 分  ·  仍在改进"
      ],
      [
        "^iteration\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ gained\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ points\\ \\ ·\\ \\ returns\\ have\\ flattened,\\ stop\\ refining$",
        "第 $1 轮提升了 $2 分  ·  收益已趋平，应停止修订"
      ]
    ],
    "preserve": []
  },
  "memory-blocks": {
    "text": {
      "MEMORY BLOCKS": "记忆块",
      "Structured agent memory splits a fixed core block that always sits in the context window from an unbounded archival store on disk. The agent reads and writes its own memory: when core fills, it summarizes or evicts the least relevant items into archival and pages others back in on demand. This is how an agent keeps an effectively limitless history inside a finite window.": "结构化智能体记忆把始终位于上下文窗口内的固定核心块，与磁盘上无上限的归档库分开。智能体读写自己的记忆：核心块满时会摘要或逐出最不相关的条目到归档，需要时再按页换回。这让有限窗口能够承载近乎无限的历史。",
      "context window": "上下文窗口",
      "proj specs": "项目规范",
      "api keys note": "API 密钥说明",
      "user prefs": "用户偏好",
      "free slot": "空闲槽位",
      "archival store (unbounded)": "归档存储（无上限）",
      "proj": "项目",
      "user": "用户",
      "past": "历史",
      "design": "设计",
      "meeting": "会议",
      "schema": "模式",
      "todo": "待办",
      "page in / out": "换入 / 换出",
      "3 of 4 core slots filled  ·  5 items stay in archival until retrieved (outlined = currently paged in)": "已用 3 个核心槽位，共 4 个  ·  另有 5 项留在归档中等待检索（轮廓框表示当前换入的项）",
      "core memory is fixed and always in context; archival is unbounded on disk.  agent pages relevant items in and evicts stale ones to respect the window": "核心记忆容量固定，始终位于上下文中；归档在磁盘上没有容量上限。agent 换入相关条目并移出过期条目，以遵守窗口限制",
      "past bug": "历史缺陷"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ core\\ slots\\ filled\\ \\ ·\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)\\ items\\ stay\\ in\\ archival\\ until\\ retrieved\\ \\(outlined\\ =\\ currently\\ paged\\ in\\)$",
        "已用 $1 个核心槽位，共 $2 个  ·  另有 $3 项留在归档中等待检索（轮廓框表示当前换入的项）"
      ]
    ],
    "preserve": []
  },
  "voyager-skills": {
    "text": {
      "VOYAGER SKILL LIBRARY": "Voyager 技能库",
      "A lifelong agent turns each solved task into a named, reusable skill and stores it. As episodes accumulate, the library grows, and later tasks are solved faster by composing skills already on the shelf instead of starting from scratch. The capability compounds: every success makes the next problem cheaper.": "终身学习型智能体会把每个已解决任务变成具名、可复用的 skill 并保存下来。回合累积时，技能库不断增长，后续任务可组合已有 skill 更快完成，而不是每次从零开始。能力会复利：每一次成功都会让下一个问题更便宜。",
      "skills in the library after each episode": "每轮任务后库中的技能数",
      "episode 4: library holds 7 reusable skills  ·  this run reused 2 existing skills before writing new ones": "第 4 轮任务：库中有 7 个可复用技能  ·  本次先复用了 2 个已有技能，再编写新技能",
      "each solved task is distilled into a named, reusable skill.  later tasks are solved by composing skills already in the library, so the curve compounds": "每个已解决任务会提炼为具名的可复用技能。之后通过组合库中已有技能解决任务，使积累形成复利"
    },
    "patterns": [
      [
        "^episode\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ library\\ holds\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ reusable\\ skills\\ \\ ·\\ \\ this\\ run\\ reused\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ existing\\ skills\\ before\\ writing\\ new\\ ones$",
        "第 $1 轮任务：库中有 $2 个可复用技能  ·  本次先复用了 $3 个已有技能，再编写新技能"
      ]
    ],
    "preserve": []
  },
  "langgraph-state": {
    "text": {
      "STATEFUL GRAPH": "有状态图",
      "A stateful graph models an agent as nodes connected by edges, threading one shared state object through every node. Each node reads the state, does its work, and writes back. Conditional edges branch on the state, so a failed grade can loop back to rewrite instead of finishing. The graph makes control flow explicit and the state inspectable at every step.": "有状态图把智能体建模为由边连接的节点，在所有节点之间传递一个共享状态对象。每个节点读取状态、完成工作并写回；条件边依据状态分支，因此评分失败可以回到改写节点，而不是直接结束。图让控制流显式可见，也让每一步状态可检查。",
      "retrieve": "检索",
      "step 1 of 7: node \"START\" ran  ·  state object updated and passed to the next node": "第 1 / 7 步：节点 \"START\" 已运行  ·  更新状态对象后传给下一节点",
      "step 7 of 7: node \"grade\" ran  ·  a conditional edge branches on the grade": "第 7 / 7 步：节点 \"grade\" 已运行  ·  条件边根据评分选择分支",
      "step 5 of 7: node \"rewrite\" ran  ·  grade failed, conditional edge loops back to rewrite": "第 5 / 7 步：节点 \"rewrite\" 已运行  ·  评分失败，条件边回到重写",
      "step 2 of 7: node \"retrieve\" ran  ·  state object updated and passed to the next node": "第 2 / 7 步：节点 \"retrieve\" 已运行  ·  更新状态对象后传给下一节点",
      "step 3 of 7: node \"generate\" ran  ·  state object updated and passed to the next node": "第 3 / 7 步：节点 \"generate\" 已运行  ·  更新状态对象后传给下一节点",
      "step 4 of 7: node \"grade\" ran  ·  a conditional edge branches on the grade": "第 4 / 7 步：节点 \"grade\" 已运行  ·  条件边根据评分选择分支",
      "step 6 of 7: node \"generate\" ran  ·  state object updated and passed to the next node": "第 6 / 7 步：节点 \"generate\" 已运行  ·  更新状态对象后传给下一节点"
    },
    "patterns": [
      [
        "^step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ node\\ \"START\"\\ ran\\ \\ ·\\ \\ state\\ object\\ updated\\ and\\ passed\\ to\\ the\\ next\\ node$",
        "第 $1 / $2 步：节点 \"START\" 已运行  ·  更新状态对象后传给下一节点"
      ],
      [
        "^step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ node\\ \"grade\"\\ ran\\ \\ ·\\ \\ a\\ conditional\\ edge\\ branches\\ on\\ the\\ grade$",
        "第 $1 / $2 步：节点 \"grade\" 已运行  ·  条件边根据评分选择分支"
      ],
      [
        "^step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ node\\ \"rewrite\"\\ ran\\ \\ ·\\ \\ grade\\ failed,\\ conditional\\ edge\\ loops\\ back\\ to\\ rewrite$",
        "第 $1 / $2 步：节点 \"rewrite\" 已运行  ·  评分失败，条件边回到重写"
      ],
      [
        "^step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ node\\ \"retrieve\"\\ ran\\ \\ ·\\ \\ state\\ object\\ updated\\ and\\ passed\\ to\\ the\\ next\\ node$",
        "第 $1 / $2 步：节点 \"retrieve\" 已运行  ·  更新状态对象后传给下一节点"
      ],
      [
        "^step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ node\\ \"generate\"\\ ran\\ \\ ·\\ \\ state\\ object\\ updated\\ and\\ passed\\ to\\ the\\ next\\ node$",
        "第 $1 / $2 步：节点 \"generate\" 已运行  ·  更新状态对象后传给下一节点"
      ],
      [
        "^step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ node\\ \"grade\"\\ ran\\ \\ ·\\ \\ a\\ conditional\\ edge\\ branches\\ on\\ the\\ grade$",
        "第 $1 / $2 步：节点 \"grade\" 已运行  ·  条件边根据评分选择分支"
      ],
      [
        "^step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ node\\ \"generate\"\\ ran\\ \\ ·\\ \\ state\\ object\\ updated\\ and\\ passed\\ to\\ the\\ next\\ node$",
        "第 $1 / $2 步：节点 \"generate\" 已运行  ·  更新状态对象后传给下一节点"
      ]
    ],
    "preserve": [
      {
        "text": "START",
        "reason": "状态节点标识"
      },
      {
        "text": "generate",
        "reason": "状态节点标识"
      },
      {
        "text": "grade",
        "reason": "状态节点标识"
      },
      {
        "text": "rewrite",
        "reason": "状态节点标识"
      },
      {
        "text": "grade=fail",
        "reason": "状态边条件字面量"
      },
      {
        "text": "state = { query: \"how to deploy\" }",
        "reason": "程序状态对象示例"
      }
    ]
  },
  "orchestration-pattern": {
    "text": {
      "ORCHESTRATION PATTERN": "编排模式",
      "The three common multi-agent topologies trade control for resilience. A supervisor centralizes routing in O(N) edges but is a single point of failure. A peer-to-peer swarm has no bottleneck yet pays O(N squared) coordination cost. A hierarchy delegates through layers of supervisors, scaling fan-out at the price of added latency per level. The right choice depends on how much the agents must talk to each other.": "三种常见多智能体拓扑在控制力与韧性之间取舍。监督者用 O(N) 条边集中路由，却是单点故障；点对点群体没有瓶颈，但要付出 O(N²) 的协调成本；层级结构经由多层监督者委派，扩展分支数的代价是每层额外延迟。如何选择取决于智能体之间需要交流多少。",
      "supervisor": "监督者",
      "swarm (peer-to-peer)": "群体（对等通信）",
      "hierarchical": "层级式",
      "pattern \"supervisor\"  ·  5 coordination edges among 5 agents": "模式 \"supervisor\"  ·  5 个 agent 之间有 5 条协调边",
      "one supervisor routes to N workers: 5 edges, O(N).  central planning, single point of control and failure": "一个监督者将任务分派给 N 个工作者：5 条边，O(N)。集中规划，存在单一控制点和单点故障",
      "pattern \"swarm\"  ·  10 coordination edges among 5 agents": "模式 \"swarm\"  ·  10 条协调边连接 5 个 agent",
      "peers hand off directly: 10 edges, O(N^2).  no central bottleneck, but coordination cost grows fast": "同级直接交接：10 条边，O(N^2)。没有中央瓶颈，但协调成本增长很快",
      "root": "根节点",
      "pattern \"hierarchical\"  ·  6 coordination edges among 7 agents": "模式 \"hierarchical\"  ·  6 条协调边连接 7 个 agent",
      "tree of supervisors: 6 edges, depth-limited fan-out.  delegation scales but adds latency per layer": "监督者树：6 条边，扇出受深度限制。委派可扩展，但每层都会增加延迟"
    },
    "patterns": [
      [
        "^pattern\\ \"supervisor\"\\ \\ ·\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)\\ coordination\\ edges\\ among\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ agents$",
        "模式 \"supervisor\"  ·  $1 个 agent 之间有 $2 条协调边"
      ],
      [
        "^one\\ supervisor\\ routes\\ to\\ N\\ workers:\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ edges,\\ O\\(N\\)\\.\\ \\ central\\ planning,\\ single\\ point\\ of\\ control\\ and\\ failure$",
        "一个监督者将任务分派给 N 个工作者：$1 条边，O(N)。集中规划，存在单一控制点和单点故障"
      ],
      [
        "^pattern\\ \"swarm\"\\ \\ ·\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)\\ coordination\\ edges\\ among\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ agents$",
        "模式 \"swarm\"  ·  $1 条协调边连接 $2 个 agent"
      ],
      [
        "^peers\\ hand\\ off\\ directly:\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ edges,\\ O\\(N\\^([-+]?\\d+(?:[.,]\\d+)*)\\)\\.\\ \\ no\\ central\\ bottleneck,\\ but\\ coordination\\ cost\\ grows\\ fast$",
        "同级直接交接：$1 条边，O(N^$2)。没有中央瓶颈，但协调成本增长很快"
      ],
      [
        "^pattern\\ \"hierarchical\"\\ \\ ·\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)\\ coordination\\ edges\\ among\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ agents$",
        "模式 \"hierarchical\"  ·  $1 条协调边连接 $2 个 agent"
      ],
      [
        "^tree\\ of\\ supervisors:\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ edges,\\ depth\\-limited\\ fan\\-out\\.\\ \\ delegation\\ scales\\ but\\ adds\\ latency\\ per\\ layer$",
        "监督者树：$1 条边，扇出受深度限制。委派可扩展，但每层都会增加延迟"
      ]
    ],
    "preserve": []
  },
  "multi-agent-debate": {
    "text": {
      "MULTI-AGENT DEBATE": "多智能体辩论",
      "In debate, several agents answer independently, then read each other transcripts and revise across rounds. Disagreement forces each to defend or correct its reasoning, and the positions usually converge toward a better shared answer. The first one or two rounds capture most of the accuracy gain; beyond that the agents agree and extra rounds mostly burn tokens.": "辩论中，多个智能体先独立回答，再阅读彼此的记录并跨轮修订。分歧迫使它们为自己的推理辩护或纠错，结果通常会收敛到更好的共同答案。前一两轮已获得大部分准确率收益，之后智能体逐渐一致，额外轮次主要消耗 token。",
      "answer": "答案",
      "% accuracy": "% 准确率",
      "round 3: positions differ by 10 points  ·  still converging": "第 3 轮：观点相差 10 分  ·  仍在收敛",
      "each round, agents read the other transcript and update.  convergence is geometric, so accuracy rises with diminishing returns": "每一轮，agent 阅读对方记录并更新观点。误差按几何速度收敛，准确率随之上升，但收益逐渐减小",
      "round 6: positions differ by 2 points  ·  agents have converged": "第 6 轮：观点相差 2 分  ·  agent 已收敛",
      "round 4: positions differ by 6 points  ·  gains have flattened, extra rounds rarely help": "第 4 轮：观点相差 6 分  ·  收益已趋平，额外轮次很少有帮助"
    },
    "patterns": [
      [
        "^round\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ positions\\ differ\\ by\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ points\\ \\ ·\\ \\ still\\ converging$",
        "第 $1 轮：观点相差 $2 分  ·  仍在收敛"
      ],
      [
        "^round\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ positions\\ differ\\ by\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ points\\ \\ ·\\ \\ agents\\ have\\ converged$",
        "第 $1 轮：观点相差 $2 分  ·  agent 已收敛"
      ],
      [
        "^round\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ positions\\ differ\\ by\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ points\\ \\ ·\\ \\ gains\\ have\\ flattened,\\ extra\\ rounds\\ rarely\\ help$",
        "第 $1 轮：观点相差 $2 分  ·  收益已趋平，额外轮次很少有帮助"
      ]
    ],
    "preserve": [
      {
        "text": "agent A",
        "reason": "技术名称、数学符号或示例标识，按翻译契约保留"
      },
      {
        "text": "agent B",
        "reason": "技术名称、数学符号或示例标识，按翻译契约保留"
      }
    ]
  }
};
