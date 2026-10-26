(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-swarms2.js"] = {
  "swarm-message-bus": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "MESSAGE BUS": "消息总线",
      "packets on a shared spine": "共享主干上的消息包",
      "MCP · tool call": "MCP · 工具调用",
      "A2A · task": "A2A · 任务",
      "ANP · identity": "ANP · 身份",
      "one shared spine, typed lanes  ·  each protocol carries its own message kind": "共享主干，分类通道  ·  每个协议承载各自的消息类型",
      "Agents stop passing raw strings and speak typed protocols over a shared bus. MCP carries tool calls, A2A carries delegated tasks (and replies), ANP carries identity. Separating the lanes is what makes a multi-agent system auditable and lets agents built by different teams interoperate.": "agent 不再传递无结构字符串，而是通过共享总线交换带类型的协议消息。MCP 承载工具调用，A2A 承载委派任务与回复，ANP 承载身份。分离这些通道，使多 agent 系统可审计，也让不同团队构建的 agent 能够互操作。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "agent A",
        "reason": "原样的协议、代码、产品名或公式标识，不属于人读散文"
      },
      {
        "text": "agent B",
        "reason": "原样的协议、代码、产品名或公式标识，不属于人读散文"
      }
    ]
  },
  "swarm-hierarchy-token": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "HIERARCHY": "层级结构",
      "delegate down, return up": "向下委派，向上返回",
      "MGR": "管理者",
      "blue = delegation down  ·  gold = results bubbling up": "蓝色 = 向下委派  ·  金色 = 结果向上汇集",
      "A manager splits the goal and delegates down through sub-managers to workers; results return along the same edges. The risk: an LLM manager re-reasons the whole tree each turn, so small context drift misallocates work and the structure loops. Often a flat sequence beats it.": "管理者拆分目标，经子管理者向下委派给工作者，结果沿同样的边返回。风险在于：LLM 管理者每轮都会重新推理整棵树，轻微的上下文偏移就可能造成工作误分配，让结构陷入循环。简单的扁平序列常常更好。"
    },
    "patterns": [],
    "preserve": []
  },
  "swarm-roles": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "ROLE SPECIALIZATION": "角色专门化",
      "one artifact, four roles": "一份产物，四种角色",
      "reject → re-plan": "拒绝 → 重新规划",
      "PLAN": "规划",
      "EXEC": "执行",
      "CRITIC": "评议",
      "VERIFY": "验证",
      "the artifact flows through distinct roles": "产物流经职责不同的角色",
      "planner (□) · executor (○) · critic (◇, subjective) · verifier (⬡, deterministic)": "规划者（□） · 执行者（○） · 评议者（◇，主观） · 验证者（⬡，确定性）",
      "More agents do not help; different agents do. The plan, the artifact, a subjective critique, and a deterministic check are separate roles with separate tools. The verifier is load-bearing: MAST traces nearly every multi-agent failure to missing or broken verification. A reject sends the artifact back to re-plan.": "有帮助的不是 agent 更多，而是 agent 分工不同。规划、产物、主观评议与确定性检查应由不同角色持有不同工具完成。验证者承担关键职责：MAST 将几乎所有多 agent 失败追溯到缺失或失效的验证。拒绝会把产物送回重新规划。"
    },
    "patterns": [],
    "preserve": []
  },
  "swarm-speaker": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "SPEAKER SELECTION": "发言者选择",
      "who talks next": "下一位由谁发言",
      "shared": "共享",
      "pool": "池",
      "selector picks the next speaker": "选择器决定下一位发言者",
      "the token hops A→B→C→D→E and settles on the chosen speaker": "令牌沿 A→B→C→D→E 移动，停在选定发言者处",
      "Agents react to one shared pool instead of a fixed graph. A selector — round-robin, an LLM, or a custom rule — picks who speaks next, so the token hops between candidates and settles on one. This avoids the edge explosion of hardcoding every possible handoff between N agents.": "agent 响应同一个共享池，而非固定图。选择器可以采用轮询、LLM 或自定义规则，决定下一位发言者，令牌在候选者间移动后落到其中一位。这样就无需硬编码 N 个 agent 之间每种交接，避免边数爆炸。"
    },
    "patterns": [],
    "preserve": []
  },
  "swarm-blackboard": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "BLACKBOARD": "黑板",
      "shared state, shared risk": "共享状态，共担风险",
      "W writes, R reads  ·  a poisoned fact (gold) propagates to every reader": "W 写入、R 读取  ·  被污染的事实（金色）传播给每个读取者",
      "Agents share facts through a central board instead of copying messages. The danger is memory poisoning: one agent writes a hallucination, every reader downstream adopts it as verified, and accuracy decays silently. Provenance, an unwritable verifier, and per-agent views are the mitigations that hold.": "agent 通过中央黑板共享事实，而非复制消息。危险在于记忆污染：一个 agent 写入幻觉，下游每个读取者都把它当成已验证事实，准确率便悄然下降。来源追踪、不可被其他 agent 改写的验证者，以及独立的 agent 视图，才是有效缓解措施。"
    },
    "patterns": [],
    "preserve": []
  },
  "swarm-consensus-wave": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "CONSENSUS WAVE": "共识波",
      "one value spreads": "一个值逐步传播",
      "agree?": "是否同意？",
      "wave of agreement spreads around the ring  ·  node X (byzantine) never joins": "共识波沿环传播  ·  拜占庭节点 X 始终不加入",
      "Honest agents converge on a shared value as the decision ripples around the ring. A single byzantine node (X) refuses to flip, so naive majority can still be captured. Classical BFT tolerates f < n/3 such nodes; the open question for LLM agents is correlated faults, not arbitrary ones.": "决策沿环传播，诚实 agent 逐渐收敛到同一个值。一个拜占庭节点（X）拒绝改变，因此朴素多数仍可能被控制。经典 BFT 容忍 f < n/3 个此类节点；对于 LLM agent，尚未解决的问题是故障相关性，而非任意故障本身。"
    },
    "patterns": [],
    "preserve": []
  },
  "swarm-stigmergy": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "STIGMERGY": "间接协作",
      "ants reinforce trails": "蚂蚁强化路径",
      "nest": "巢穴",
      "food": "食物",
      "pheromone concentrates on the short route  ·  weak trails evaporate": "信息素集中在短路径  ·  弱路径逐渐消退",
      "No agent plans the route. Each deposits pheromone as it travels and prefers stronger trails, so the shortest path accumulates traffic while detours evaporate. ACO turns this into agent routing: the trail records which agent handled which task-type, decay lets better routes be rediscovered.": "没有 agent 负责规划路线。每只蚂蚁行进时留下信息素，并偏好较强的轨迹，因此最短路径积累更多流量，绕路轨迹则逐渐消退。ACO 将其用于 agent 路由：轨迹记录哪个 agent 处理了哪类任务，衰减机制让更好的路线有机会重新被发现。"
    },
    "patterns": [],
    "preserve": []
  },
  "swarm-auction": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "TOKEN AUCTION": "token 拍卖",
      "highest bid wins": "最高出价者获胜",
      "pays 2nd price": "支付第二高价格",
      "second-price (Vickrey) auction": "次高价（Vickrey）拍卖",
      "Agents bid for a task; bids rise as the round runs. The highest bidder (a1) wins but pays the second-highest price — the dashed line. Truthful bidding is the dominant strategy under second-price, which is why mechanism design favors it for allocating work and tokens across agents.": "agent 为任务竞价，报价随着轮次推进而增加。最高出价者（a1）获胜，但支付虚线标出的第二高价格。在次高价拍卖中，如实出价是占优策略，因此机制设计偏好用它在 agent 之间分配工作与 token。"
    },
    "patterns": [],
    "preserve": []
  }
};
