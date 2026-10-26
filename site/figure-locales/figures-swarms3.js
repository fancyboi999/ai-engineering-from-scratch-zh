(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-swarms3.js"] = {
  "sw-contract-net": {
    "text": {
      "CONTRACT NET": "合同网协议",
      "The FIPA contract-net protocol turns task allocation into a sealed auction. A manager broadcasts a call for proposals, idle agents reply with bids, and the manager awards the contract to the best bid. MCP tools/call and modern task markets are JSON-native restatements of this 1980 mechanism.": "FIPA 合同网协议将任务分配建模为暗标拍卖。主管广播征求方案（CFP），空闲 agent 提交报价，主管将合同授予最优标的。MCP tools/call 与现代任务市场正是这一 1980 年代机制在 JSON 时代的重述。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "mgr": "管理者",
      "announce  ->  bids return  ->  cheapest bid wins the contract": "发布任务 -> 返回报价 -> 最低报价赢得合同"
    },
    "patterns": [],
    "preserve": []
  },
  "sw-work-stealing": {
    "text": {
      "WORK STEALING": "工作窃取",
      "A swarm has no central dispatcher. Tasks land on a shared queue and idle workers pull the next unit off it themselves. Coordination lives in the queue semantics, so the system scales until the queue does. The price is determinism: you trade a single coherent plan for throughput.": "群体没有中心调度器。任务进入共享队列，空闲工作节点自行拉取下一个任务单元。协调由队列的语义承担，因此系统的扩展能力受队列制约。代价是确定性：用单一、连贯的计划换取更高的吞吐量。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "queue": "队列",
      "workers pull tasks off the shared queue  ·  no orchestrator decides who does what": "工作者从共享队列拉取任务 · 无需编排器分配工作"
    },
    "patterns": [],
    "preserve": []
  },
  "sw-handoff-routing": {
    "text": {
      "HANDOFF ROUTING": "交接路由",
      "OpenAI Swarm reduced orchestration to two primitives: routines (prompt plus tools) and handoffs (a tool that returns the next agent). There is no state machine. The model routes by calling the right handoff, and whichever agent currently holds the conversation is the one in charge.": "OpenAI Swarm 将编排简化为两个原语：routines（prompt 加工具）和 handoffs（返回下一个 agent 的工具）。它没有状态机。模型通过调用合适的交接工具进行路由；当前持有会话的 agent 就负责主导。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "triage": "分诊",
      "billing": "账单",
      "refund": "退款",
      "handoff = a tool call returning the next agent  ·  whoever holds the token is the orchestrator": "交接 = 返回下一个 agent 的工具调用 · 当前持有会话控制权的 agent 就是编排者"
    },
    "patterns": [],
    "preserve": []
  },
  "sw-agent-card-discovery": {
    "text": {
      "A2A DISCOVERY": "A2A 发现机制",
      "A2A is the horizontal wire protocol between agents. A client first fetches an Agent Card from a well-known URL to learn what a remote agent can do, then sends a message that the remote agent turns into a task. The task moves through an opaque lifecycle (TASK_STATE_SUBMITTED, TASK_STATE_WORKING, TASK_STATE_COMPLETED) and returns artifacts. It is HTTP plus REST, reframed with agents as first-class peers.": "A2A 是 agent 之间的横向线协议。客户端首先从知名 URL 获取 Agent Card 以了解远端 agent 能做什么，然后发送消息，由远端 agent 转换为任务。任务在不透明生命周期（TASK_STATE_SUBMITTED、TASK_STATE_WORKING、TASK_STATE_COMPLETED）中推进并返回产物。这就是以 agent 为一等公民重新构建的 HTTP 与 REST。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "client agent": "客户端 agent",
      "reads the card first": "先读取 agent 名片",
      "Agent Card": "agent 名片",
      "skills, interfaces, auth": "技能、接口、认证",
      "remote agent": "远程 agent",
      "internals stay opaque": "内部实现保持不透明",
      "task status + artifact": "任务状态 + 产物",
      "discover via Agent Card  ->  SendMessage  ->  opaque lifecycle returns artifacts": "通过 agent 名片发现能力 -> SendMessage -> 不透明的生命周期返回产物"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "GET /.well-known/agent-card.json",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "SendMessage (POST /message:send)",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "status.state",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "SUBMITTED",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "WORKING",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "COMPLETED",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "sw-debate-topology": {
    "text": {
      "DEBATE TOPOLOGY": "辩论拓扑",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "Aggregating N agents is not just majority vote; the wiring matters. Star routes everything through a hub, chain passes a baton, tree branches, graph lets everyone argue. MultiAgentBench found graph best for research tasks, with a coordination tax that climbs once you pass about four agents.": "将 N 个 agent 聚合起来不只是多数投票，连接方式同样重要。星形结构让所有信息经过中心，链形依次传递，树形分支展开，图结构则允许所有 agent 互相讨论。MultiAgentBench 发现，图结构最适合研究任务，但 agent 超过约四个之后，协调成本开始增加。",
      "STAR": "星形",
      "CHAIN": "链形",
      "TREE": "树形",
      "GRAPH": "图",
      "same agents, different wiring  ·  graph wins for research, coordination tax rises past ~4": "相同 agent，不同连接方式 · 图结构更适合研究，超过约 4 个后协调成本上升"
    },
    "patterns": [
      [
        "^same\\ agents,\\ different\\ wiring\\ \\ ·\\ \\ graph\\ wins\\ for\\ research,\\ coordination\\ tax\\ rises\\ past\\ \\~([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "相同 agent，不同连接方式 · 图结构更适合研究，超过约 $1 个后协调成本上升"
      ]
    ],
    "preserve": []
  },
  "sw-theory-of-mind": {
    "text": {
      "THEORY OF MIND": "心智理论",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "Real coordination needs agents that model each other. Higher-order theory of mind is reasoning about what one agent believes about a third agent. Riedl 2025 found this only produces genuine, goal-directed differentiation under a theory-of-mind prompt; strip the prompt and the apparent coordination does not survive statistical controls.": "真正的协调需要 agent 建立对彼此的模型。高阶心智理论会推理：一个 agent 相信第三个 agent 在想什么。Riedl 在 2025 年发现，只有提供心智理论 prompt 时，才会产生真实的、面向目标的差异化行为；移除 prompt 后，表面上的协调无法通过统计控制检验。",
      "A thinks": "A 认为",
      "B thinks": "B 认为",
      "goal": "目标",
      "A reasons about what B believes about C  ·  higher-order ToM is prompt-conditional": "A 推理 B 如何看待 C · 高阶心智理论依赖 prompt 条件"
    },
    "patterns": [],
    "preserve": []
  },
  "sw-ctde": {
    "text": {
      "CTDE": "集中训练、分散执行",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "Centralized Training, Decentralized Execution is the spine of cooperative MARL. During training a critic sees every agent state and action, which fixes the non-stationarity that plagues independent learners. At test time the critic is gone and each actor runs on its own local observation. MADDPG, QMIX, and MAPPO are three takes on the same split.": "集中训练、分散执行是合作式多 agent 强化学习的主干。训练时，评判器看到每个 agent 的状态与动作，缓解独立学习器面对的非平稳性。测试时，评判器不再参与，每个执行策略只依据本地观察运行。MADDPG、QMIX 和 MAPPO 都采用这种划分，但实现各不相同。",
      "central critic": "集中式评判器",
      "sees all": "看到全部信息",
      "actor 0": "执行策略 0",
      "local obs": "本地观察",
      "actor 1": "执行策略 1",
      "actor 2": "执行策略 2",
      "TRAIN: critic sees everything": "训练：评判器看到全部信息",
      "EXECUTE: actors run alone": "执行：各策略独立运行",
      "centralized training, decentralized execution  ·  global info at train, local policies at test": "集中训练、分散执行 · 训练时使用全局信息，测试时使用本地策略"
    },
    "patterns": [
      [
        "^actor\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "执行策略 $1"
      ],
      [
        "^actor\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "执行策略 $1"
      ],
      [
        "^actor\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "执行策略 $1"
      ]
    ],
    "preserve": []
  },
  "sw-checkpoint-replay": {
    "text": {
      "CHECKPOINT REPLAY": "检查点回放",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "Durable execution is what lets multi-agent systems scale past one laptop. The runtime writes a checkpoint after each step keyed by a thread id. When a worker crashes mid-run its lease is released, and another worker picks the task up and resumes from the last committed checkpoint instead of starting over.": "持久执行让多 agent 系统能够扩展到一台笔记本之外。运行时在每一步之后按线程 ID 写入检查点。工作者在执行中崩溃时，其租约被释放，另一个工作者接手任务，从最后一个已提交的检查点恢复，而非从头重来。",
      "ckpt 0": "检查点 0",
      "ckpt 1": "检查点 1",
      "ckpt 2": "检查点 2",
      "ckpt 3": "检查点 3",
      "worker A": "工作者 A",
      "crash": "崩溃",
      "worker B": "工作者 B",
      "crash releases the lease  ·  worker B resumes from the last durable checkpoint": "崩溃释放租约 · 工作者 B 从最后一个持久检查点恢复"
    },
    "patterns": [
      [
        "^ckpt\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "检查点 $1"
      ],
      [
        "^ckpt\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "检查点 $1"
      ],
      [
        "^ckpt\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "检查点 $1"
      ],
      [
        "^ckpt\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "检查点 $1"
      ]
    ],
    "preserve": []
  }
};
