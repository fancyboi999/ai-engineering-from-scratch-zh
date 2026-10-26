(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-agents-alignment.js"] = {
  "guardrail-gates": {
    "text": {
      "none / all pass": "无 / 全部通过",
      "input filter": "输入过滤",
      "policy check": "策略检查",
      "output filter": "输出过滤",
      "GUARDRAIL GATES": "护栏关卡",
      "request": "请求",
      "allowed": "已允许",
      "blocked": "已阻止",
      "all gates pass: the response is returned to the user": "所有关卡均通过：向用户返回响应",
      "Safety runs as ordered gates: an input filter before the model, a policy check on the request, and an output filter on the response. The first gate that trips blocks the request, so unsafe prompts never reach the model and unsafe outputs never reach the user.": "安全检查按顺序设关：模型接收输入前进行过滤，检查请求是否符合策略，再过滤输出。首个触发的关卡会阻止请求，让不安全的 prompt 无法进入模型，也不让不安全的输出到达用户。",
      "BLOCK": "阻止",
      "blocked: malicious or off-policy prompt rejected before the model runs": "已阻止：恶意或违反策略的 prompt 在模型运行前被拒绝",
      "blocked: model output violates a usage policy": "已阻止：模型输出违反使用策略",
      "blocked: unsafe content scrubbed from the response": "已阻止：响应中的不安全内容已清除"
    },
    "patterns": [],
    "preserve": []
  },
  "agent-loop": {
    "text": {
      "causal step": "因果步骤",
      "Twelve-step agent loop causal trace": "十二步 agent 循环的因果轨迹",
      "A persistent Think, Act, Tool, Observe, and Context loop. The selected step highlights the active node, causal edge, and accumulated evidence.": "持续保留思考、行动、工具、观察与上下文的循环。当前步骤会突出显示活动节点、因果边和已积累的证据。",
      "THINK": "思考",
      "ACT": "行动",
      "TOOL": "工具",
      "OBSERVE": "观察",
      "CONTEXT": "上下文",
      "EVIDENCE ENTERING THE NEXT THOUGHT": "带入下一轮思考的证据",
      "PLAN": "计划",
      "find city count": "查找城区人口",
      "ACTION": "行动",
      "waiting": "等待",
      "RESULT": "结果",
      "OBSERVATION": "观察",
      "scope mismatch": "范围不匹配",
      "evidence added": "证据已加入",
      "verify 23 wards": "核实 23 区人口",
      "query: Tokyo": "查询：东京",
      "37m metro": "都市圈 37m",
      "query: 23 wards": "查询：23 区",
      "14m wards": "23 区 14m",
      "scope matched": "范围匹配",
      "ready to answer": "可以回答"
    },
    "patterns": [
      [
        "^STEP (\\d+) OF 12  ·  THINK$",
        "步骤 $1 / 12  ·  思考"
      ],
      [
        "^STEP (\\d+) OF 12  ·  CHOSEN ACTION$",
        "步骤 $1 / 12  ·  选定行动"
      ],
      [
        "^STEP (\\d+) OF 12  ·  TOOL CALL$",
        "步骤 $1 / 12  ·  工具调用"
      ],
      [
        "^STEP (\\d+) OF 12  ·  TOOL RESULT$",
        "步骤 $1 / 12  ·  工具结果"
      ],
      [
        "^STEP (\\d+) OF 12  ·  OBSERVE$",
        "步骤 $1 / 12  ·  观察"
      ],
      [
        "^STEP (\\d+) OF 12  ·  CONTEXT UPDATE$",
        "步骤 $1 / 12  ·  更新上下文"
      ],
      [
        "^STEP (\\d+) OF 12  ·  THINK AGAIN$",
        "步骤 $1 / 12  ·  再次思考"
      ]
    ],
    "preserve": [
      {
        "text": "search_web",
        "reason": "原样保留的代码、协议、产品名或公式字面量"
      }
    ]
  },
  "react-trace": {
    "text": {
      "Thought": "思考",
      "Action": "行动",
      "Observation": "观察",
      "I need the current population of Tokyo.": "我需要东京当前的人口。",
      "\"Tokyo metro: about 37 million.\"": "“东京都市圈：约 37 百万人。”",
      "The question asks for the city proper, not metro.": "问题问的是城区本身，而非都市圈。",
      "\"Tokyo (23 wards): about 14 million.\"": "“东京（23 区）：约 14 百万人。”",
      "I now have the figure to answer.": "现在已有回答所需的人口数据。"
    },
    "patterns": [
      [
        "^(\\d+) of (\\d+) rows  ·  reasoning before the next action$",
        "第 $1 / $2 行  ·  在下一次行动前推理"
      ],
      [
        "^(\\d+) of (\\d+) rows  ·  tool result returned, agent will reason next$",
        "第 $1 / $2 行  ·  工具结果已返回，agent 将继续推理"
      ],
      [
        "^(\\d+) of (\\d+) rows  ·  agent has produced the final answer$",
        "第 $1 / $2 行  ·  agent 已给出最终答案"
      ],
      [
        "^(\\d+) of (\\d+) rows  ·  awaiting the tool result$",
        "第 $1 / $2 行  ·  等待工具结果"
      ]
    ],
    "preserve": [
      {
        "text": "search(\"Tokyo population 2026\")",
        "reason": "ReAct 演示中的工具调用代码与参数，不能改变可执行字面量"
      },
      {
        "text": "search(\"Tokyo city proper population\")",
        "reason": "ReAct 演示中的工具调用代码与参数，不能改变可执行字面量"
      },
      {
        "text": "finish(\"About 14 million in the 23 wards.\")",
        "reason": "ReAct 演示中的工具调用代码与参数，不能改变可执行字面量"
      }
    ]
  },
  "tool-routing": {
    "text": {
      "query": "查询",
      "what is the GDP of France": "法国的 GDP 是多少",
      "add up these expenses": "汇总这些支出",
      "tell the team we shipped": "告诉团队已发布",
      "how many users signed up": "有多少用户注册",
      "routed →": "路由到 →",
      "find facts and current events": "查找事实与时事",
      "compute, parse, transform data": "计算、解析和转换数据",
      "compose and send a message": "撰写并发送消息",
      "look up rows in the database": "查询数据库记录"
    },
    "patterns": [
      [
        "^query \"what is the GDP of France\"  →  ([a-z_]+)  \\(similarity ([\\d.]+) to its description\\)$",
        "查询“法国的 GDP 是多少”  →  $1  （与工具描述的相似度 $2）"
      ],
      [
        "^query \"add up these expenses\"  →  ([a-z_]+)  \\(similarity ([\\d.]+) to its description\\)$",
        "查询“汇总这些支出”  →  $1  （与工具描述的相似度 $2）"
      ],
      [
        "^query \"tell the team we shipped\"  →  ([a-z_]+)  \\(similarity ([\\d.]+) to its description\\)$",
        "查询“告诉团队已发布”  →  $1  （与工具描述的相似度 $2）"
      ],
      [
        "^query \"how many users signed up\"  →  ([a-z_]+)  \\(similarity ([\\d.]+) to its description\\)$",
        "查询“有多少用户注册”  →  $1  （与工具描述的相似度 $2）"
      ]
    ],
    "preserve": [
      {
        "text": "search_web",
        "reason": "已注册工具名称，匹配工具路由的机器标识"
      },
      {
        "text": "run_python",
        "reason": "已注册工具名称，匹配工具路由的机器标识"
      },
      {
        "text": "send_email",
        "reason": "已注册工具名称，匹配工具路由的机器标识"
      },
      {
        "text": "query_db",
        "reason": "已注册工具名称，匹配工具路由的机器标识"
      }
    ]
  },
  "context-budget": {
    "text": {
      "/ 32,768 tokens": "/ 32,768 个 token",
      "⚠ window overflowed: older turns must be compacted or handed off": "⚠ 窗口已溢出：必须压缩旧轮次或交接"
    },
    "patterns": [
      [
        "^(\\d+)% full: compaction triggers near the top, at about turn (\\d+)$",
        "已用 $1%：接近容量上限时压缩，约在第 $2 轮触发"
      ],
      [
        "^([\\d,]+) tokens/turn × (\\d+) turns = ([\\d,]+)  ·  window ([\\d.K]+) = ([\\d,]+)$",
        "$1 token/轮 × $2 轮 = $3  ·  窗口 $4 = $5"
      ],
      [
        "^/ ([\\d,]+) tokens$",
        "/ $1 个 token"
      ],
      [
        "^/ ([\\d,]+) token$",
        "/ $1 个 token"
      ]
    ],
    "preserve": []
  },
  "swarm-messages": {
    "text": {
      "SWARM MESSAGES": "群体消息",
      "all-to-all": "全互联",
      "hub / supervisor": "中枢 / 监督者",
      "broadcast cost grows as O(N²); a supervisor funnels traffic through one node for O(N)": "广播开销按 O(N²) 增长；监督者将流量汇入一个节点，使开销降至 O(N)",
      "If every agent talks to every other agent, message count grows as N·(N−1), so naive broadcast scales quadratically. Routing all traffic through a supervisor cuts it to a linear number of edges, which is why large systems centralize coordination.": "每个 agent 都与其他 agent 通信时，消息数量按 N·(N−1) 增长，因此朴素广播的扩展成本为平方级。让所有流量经过监督者，可将边数降至线性级，这也是大型系统集中协调的原因。"
    },
    "patterns": [
      [
        "^all-to-all: (\\d+) directed messages \\(N·\\(N−1\\)\\)  ·  hub: (\\d+) edges \\(O\\(N\\)\\)$",
        "全互联：$1 条有向消息（N·(N−1)）  ·  中枢：$2 条边（O(N)）"
      ]
    ],
    "preserve": []
  },
  "supervisor-hierarchy": {
    "text": {
      "SUPERVISOR HIERARCHY": "监督者层级",
      "A supervisor splits a task across worker agents, which may themselves supervise. Total agents is the geometric sum of the branching factor over the depth, so even a small fan-out explodes the head count quickly. Keep the tree shallow.": "监督者把任务分给多个工作 agent，工作 agent 也可以继续担任监督者。agent 总数是各深度分支数的几何级数之和，所以即使每个节点只分出少量子节点，数量也会迅速膨胀。应保持较浅的树。"
    },
    "patterns": [
      [
        "^branching (\\d+), depth (\\d+)  →  (\\d+) agents total \\(leaves do the work, internal nodes delegate\\)$",
        "分支数 $1，深度 $2  →  共 $3 个 agent（叶节点执行，内部节点委派）"
      ],
      [
        "^branching (\\d+), depth (\\d+)  →  (\\d+) agents total · diagram caps each level at (\\d+) \\(leaves do the work, internal nodes delegate\\)$",
        "分支数 $1，深度 $2  →  共 $3 个 agent · 图中每层最多显示 $4 个（叶节点执行，内部节点委派）"
      ],
      [
        "^total = Σ 1\\^level for level 0\\.\\.depth = depth \\+ 1 = (\\d+)$",
        "总数 = Σ 1^level（level 从 0 到 depth） = depth + 1 = $1"
      ],
      [
        "^total = Σ b\\^level for level 0\\.\\.depth = \\(b\\^\\(depth\\+1\\) − 1\\) / \\(b − 1\\) = (\\d+)$",
        "总数 = Σ b^level（level 从 0 到 depth） = (b^(depth+1) − 1) / (b − 1) = $1"
      ]
    ],
    "preserve": []
  },
  "rlhf-reward-kl": {
    "text": {
      "RLHF: REWARD − β·KL": "RLHF：奖励 − β·KL",
      "RLHF maximizes reward minus a KL penalty that keeps the policy near the reference model. When β is too small the penalty barely bites, so the policy chases the proxy reward and drifts off, exploiting flaws in the reward model. The KL term is the leash against reward hacking.": "RLHF 最大化奖励减去 KL 惩罚的目标，使策略保持在参考模型附近。β 太小时，惩罚几乎不起作用，策略会追逐代理奖励并偏离原分布，利用奖励模型的漏洞。KL 项就是约束奖励投机的缰绳。",
      "reward hacking": "奖励投机",
      "beta too small: nothing pulls the policy back, it over-optimizes the proxy reward and drifts from the reference": "beta 过小：没有力量拉回策略，它会过度优化代理奖励，偏离参考模型"
    },
    "patterns": [
      [
        "^peak at step (\\d+)$",
        "峰值位于第 $1 步"
      ],
      [
        "^KL penalty caps the drift at ([\\d.]+); the objective peaks then declines$",
        "KL 惩罚将偏移限制在 $1；目标值达到峰值后下降"
      ],
      [
        "^objective = (.+)   \\(grey reward, gold β·KL, blue objective\\)$",
        "目标 = $1   （灰色：奖励，金色：β·KL，蓝色：目标值）"
      ]
    ],
    "preserve": []
  },
  "dpo-margin": {
    "text": {
      "DPO MARGIN": "DPO 间隔",
      "DPO loss": "DPO 损失",
      "DPO trains directly on preference pairs with no separate reward model. The loss is −log σ of β times the implicit reward margin between the chosen and rejected response. A larger positive margin drives the loss toward zero; a negative margin (rejected ranked higher) is heavily penalized.": "DPO 直接使用偏好对训练，无需单独的奖励模型。损失是 β 与选中回答和拒绝回答之间隐式奖励间隔的乘积，经过 −log σ 后得到。正间隔越大，损失越接近零；负间隔表示被拒绝回答排名更高，会受到较重惩罚。"
    },
    "patterns": [
      [
        "^chosen ranked above rejected by ([\\d.-]+)  ·  P\\(prefer chosen\\) = ([\\d.]+)$",
        "选中回答比拒绝回答高 $1  ·  P(偏好选中回答) = $2"
      ],
      [
        "^loss = (.+)   ·   larger margin → lower loss$",
        "损失 = $1   ·   间隔越大 → 损失越小"
      ],
      [
        "^rejected wrongly ranked above chosen  ·  P\\(prefer chosen\\) = ([\\d.]+)$",
        "拒绝回答被错误地排在选中回答之上  ·  P(偏好选中回答) = $1"
      ],
      [
        "^tie  ·  P\\(prefer chosen\\) = ([\\d.]+)$",
        "并列  ·  P(偏好选中回答) = $1"
      ]
    ],
    "preserve": []
  }
};
