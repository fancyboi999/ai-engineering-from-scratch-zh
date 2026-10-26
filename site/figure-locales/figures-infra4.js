(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-infra4.js"] = {
  "i4-platform-lanes": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "PLATFORM LANES": "平台容量通道",
      "reserved PTU capacity vs shared on-demand": "预留 PTU 容量对比共享按需容量",
      "The hyperscaler latency gap is a capacity story, not a model story. Azure PTUs reserve throughput, so requests ride a dedicated lane at ~50 ms median. Bedrock on-demand shares a pool with every other tenant, and the same-scale model reads ~75 ms because your tokens queue behind theirs. Pick the platform for its catalog and FinOps surface, then decide which workloads deserve the reserved lane.": "超大规模云平台的延迟差距来自容量安排，而非模型。Azure PTU 预留吞吐能力，请求走专用通道，中位延迟约为 50 ms。Bedrock 按需服务与其他租户共享资源池，同等规模的模型约为 75 ms，因为你的 token 需要排在其他租户之后。先按模型目录和 FinOps 能力选择平台，再决定哪些工作负载值得使用预留通道。",
      "PTU reserved lane": "PTU 预留通道",
      "dedicated": "专用",
      "~50 ms median": "中位延迟约 50 ms",
      "on-demand shared lane": "按需共享通道",
      "shared pool": "共享资源池",
      "~75 ms median": "中位延迟约 75 ms",
      "queued behind neighbors": "排在其他租户之后",
      "same model, different capacity contract: reserved beats shared by ~25 ms": "相同模型，不同容量契约：预留比共享快约 25 ms"
    },
    "patterns": [
      [
        "^\\~([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ms\\ median$",
        "中位延迟约 $1 ms"
      ],
      [
        "^\\~([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ms\\ median$",
        "中位延迟约 $1 ms"
      ],
      [
        "^same\\ model,\\ different\\ capacity\\ contract:\\ reserved\\ beats\\ shared\\ by\\ \\~([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ms$",
        "相同模型，不同容量契约：预留比共享快约 $1 ms"
      ]
    ],
    "preserve": []
  },
  "i4-otel-glue": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "OTEL GLUE PATTERN": "OTel 连接模式",
      "gateway telemetry cloned to a metrics sink and an eval sink": "将网关遥测复制到指标端与评估端",
      "No single observability tool wins both jobs, so the production pattern splits them. The gateway captures every LLM call as an OpenTelemetry span; the collector clones each span to two sinks: a telemetry backend for traces, latency, and cost, and an eval platform for drift and RAG quality. Swapping either side later is a config change, not a re-instrumentation.": "没有单一可观测性工具能同时做好这两类工作，因此生产模式将它们拆开。网关将每次 LLM 调用记录为 OpenTelemetry span；收集器把每个 span 复制到两个接收端：遥测后端负责轨迹、延迟和成本，评估平台负责漂移与 RAG 质量。以后替换任一侧只需改配置，无需重新埋点。",
      "app": "应用",
      "LLM calls": "LLM 调用",
      "gateway": "网关",
      "collector": "收集器",
      "telemetry": "遥测",
      "traces + cost": "轨迹 + 成本",
      "eval platform": "评估平台",
      "drift + RAG": "漂移 + RAG",
      "one span, two sinks: no tool has to do both jobs": "一个 span，两个接收端：无需让一个工具兼顾两类工作"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "Helicone",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "OTel",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "i4-canary-ramp": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "SHADOW THEN CANARY": "先影子运行，再金丝雀发布",
      "mirror first, then step live traffic through metric gates": "先镜像，再逐级放行线上流量",
      "Shadow mode duplicates production requests to the candidate and discards its answers, catching cost spikes and distribution shifts at zero user risk. Only then does the canary ramp start: 10, 25, 50, 100 percent, each step gated on latency percentiles, cost per request, refusal rate, output-length distribution, and user feedback. Rollback is a policy flip measured in seconds, never a redeploy.": "影子模式将生产请求复制给候选模型并丢弃它的答案，在不影响用户的情况下发现成本突增和分布漂移。之后才开始金丝雀放量：依次为 10%、25%、50%、100%，每一级都检查延迟分位数、单请求成本、拒绝率、输出长度分布和用户反馈。回滚是几秒内完成的策略切换，无需重新部署。",
      "traffic": "流量",
      "splitter": "分流器",
      "prod model": "生产模型",
      "serves users": "向用户提供服务",
      "candidate": "候选模型",
      "shadow: log only": "影子模式：只记录",
      "mirrored copy is discarded, never returned": "镜像响应被丢弃，绝不返回给用户",
      "canary share of live traffic": "金丝雀模型的线上流量占比",
      "gate: latency, cost, refusals, length, feedback": "放行关口：延迟、成本、拒绝、长度、反馈",
      "each step holds until the metric gate passes; rollback is a policy flip": "每一级等待指标检查通过；回滚只需切换策略"
    },
    "patterns": [],
    "preserve": []
  },
  "i4-incident-agents": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "AI SRE TRIAGE": "AI SRE 事件分诊",
      "supervisor fans out, evidence converges, a human gates the fix": "主管分派、证据汇聚、人工批准修复",
      "The page lands on a supervisor agent that fans queries to specialists: one greps logs, one correlates metrics to deploys, one matches runbooks. Their evidence converges into a hypothesis before anyone opens a dashboard. The remediation still crosses a human approval gate, and the autonomous set stays narrow: restart a pod, revert a deploy, nothing that re-architects the service at 3 a.m.": "告警交给主管 agent，由它向专门角色分派查询：一个检索日志，一个关联指标与部署，一个匹配操作手册。在任何人打开仪表盘之前，它们的证据就已汇成假设。修复仍需经过人工批准，自主操作范围保持狭窄：重启一个 pod、回滚一次部署，而不是凌晨三点重新设计服务架构。",
      "supervisor": "主管",
      "triage": "分诊",
      "logs agent": "日志 agent",
      "metrics agent": "指标 agent",
      "runbooks agent": "操作手册 agent",
      "hypothesis:": "假设：",
      "vLLM OOM, KV spike": "vLLM 内存不足，KV 突增",
      "human": "人工",
      "approve?": "批准？",
      "action": "操作",
      "restart pod": "重启 pod",
      "approved": "已批准",
      "agents gather evidence in parallel; judgment stays human": "agent 并行收集证据；判断仍由人完成"
    },
    "patterns": [],
    "preserve": []
  },
  "i4-chaos-guard": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "CHAOS WITH A LEASH": "受控混沌实验",
      "injected faults run until the burn-rate guard pulls the plug": "注入故障，直到燃烧率护栏叫停",
      "The control plane schedules faults against the target: a 429 storm, a KV cache eviction, a network drop. The safety plane watches the error-budget burn meter the whole time. When daily burn crosses twice the expected rate, the guard aborts the experiment mid-flight and the last fault never lands. Chaos without that leash is just an outage you signed up for.": "控制平面为目标安排故障：429 风暴、KV 缓存淘汰、网络丢包。安全平面全程监视错误预算燃烧率。当每日消耗超过预期速率的两倍时，护栏会中途终止实验，最后一个故障不会执行。没有这道约束的混沌实验，只是你主动招来的服务中断。",
      "control plane": "控制平面",
      "scheduler": "调度器",
      "target: LLM service": "目标：LLM 服务",
      "KV cache, gateway": "KV 缓存、网关",
      "429 storm": "429 风暴",
      "KV evict": "KV 淘汰",
      "net loss": "网络丢包",
      "budget burn": "预算消耗",
      "guard: burn > 2x, experiment paused": "护栏：消耗 > 2x，实验暂停",
      "faults are scheduled, never loose: the safety plane can always abort": "故障按计划执行，绝不失控：安全平面随时可以终止实验"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ storm$",
        "$1 风暴"
      ],
      [
        "^guard:\\ burn\\ >\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x,\\ experiment\\ paused$",
        "护栏：消耗 > $1x，实验暂停"
      ]
    ],
    "preserve": []
  },
  "i4-vault-rotation": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "VAULT-BACKED ROTATION": "基于密钥库的轮换",
      "the key changes in one place and the gateway picks it up live": "只在一个位置换密钥，网关实时获取",
      "Credentials live in the vault and nowhere else. Apps call the AI gateway, which pulls the current key at runtime, so no service ever holds a static secret. When key v1 rotates to v2, the swap happens in one place and every caller is current within minutes: no redeploys, no 40 config files, no message asking who has the new key. The 90-day rotation policy stops being a migration and becomes a non-event.": "凭证只保存在密钥库中，不放在其他地方。应用调用 AI 网关，网关在运行时拉取当前密钥，因此服务不持有静态密钥。密钥 v1 轮换为 v2 时，只改一个位置，所有调用方几分钟内就能更新：无需重新部署，无需修改 40 份配置文件，也不用询问谁拿到了新密钥。90 天轮换策略不再是一场迁移，而成为日常操作。",
      "vault": "密钥库",
      "key v1": "密钥 v1",
      "key v2": "密钥 v2",
      "rotated, <=90 days": "已轮换，<=90 天",
      "AI gateway": "AI 网关",
      "pulls at runtime": "运行时拉取",
      "app A": "应用 A",
      "app B": "应用 B",
      "app C": "应用 C",
      "no keys in env files or VCS": "环境文件和版本控制中不保存密钥",
      "rotate once in the vault; every app is current in minutes, zero redeploys": "在密钥库轮换一次；所有应用几分钟内更新，无需重新部署"
    },
    "patterns": [
      [
        "^rotated,\\ <=([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ days$",
        "已轮换，<=$1 天"
      ]
    ],
    "preserve": []
  },
  "i4-control-matrix": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "CONTROL CROSS-MAPPING": "控制措施交叉映射",
      "each control lights every framework cell it satisfies": "一项控制点亮它满足的所有框架单元",
      "Procurement wants a matrix with a row per framework, and the way to survive it is cross-mapping. One access-control implementation lights cells in SOC 2, GDPR Article 32, HIPAA 164.312(a), and ISO alike; PII redaction and audit logging sweep their own columns. You build each control once and claim it many times, so five frameworks cost far less than five audits, and the gaps that remain are visibly framework-specific, not everywhere.": "采购方希望矩阵的每一行对应一个框架，应对方法是交叉映射。一套访问控制实现可同时点亮 SOC 2、GDPR 第 32 条、HIPAA 164.312(a) 和 ISO 的单元；PII 脱敏和审计日志分别覆盖它们的列。每项控制只建设一次，再映射到多个框架，五个框架的成本因此远低于五次独立审计；剩余缺口也能明确定位到具体框架，而非看似处处缺失。",
      "access ctl": "访问控制",
      "PII redact": "PII 脱敏",
      "audit log": "审计日志",
      "built once": "只建设一次",
      "one control, many cells: the matrix fills faster than the framework count grows": "一项控制对应多个单元：矩阵覆盖速度快于框架数量增长"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "SOC 2 II",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "GDPR",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "HIPAA",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "EU AI Act",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "ISO 42001",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "i4-spend-ladder": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "TENANT SPEND METERS": "租户支出仪表",
      "per-tenant meters fill until one trips the enforcement ladder": "逐租户计费，超限时逐级处置",
      "Every call is stamped with tenant_id at creation, so spend lands in the right meter as it happens, not in a retroactive tagging pass. Tenants A and B fill normally under their daily caps. Tenant C spikes past the cap line, its spend z-score crosses 4, and the kill switch answers with 429s while the on-call gets paged. The ladder runs rate limit, spend cap, kill switch, and the blast radius stays inside one meter.": "每次调用在创建时就标记 tenant_id，支出随调用实时进入正确的仪表，而不是事后补标签。租户 A 和 B 在每日上限内正常增长。租户 C 的支出突增越过上限线，支出 z 分数超过 4，紧急停止开关返回 429，同时通知值班人员。处置顺序是限速、支出上限、紧急停止开关，影响范围始终限制在一个租户内。",
      "tokens in, stamped tenant_id at the call site": "token 进入，在调用处标记 tenant_id",
      "tenant A": "租户 A",
      "tenant B": "租户 B",
      "tenant C": "租户 C",
      "cap": "上限",
      "z > 4: kill switch, 429": "z > 4：紧急停止开关，429",
      "rate limit, then spend cap, then kill switch: A and B never notice C": "先限速，再限制支出，最后紧急停止：A 和 B 不受 C 影响"
    },
    "patterns": [
      [
        "^z\\ >\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?):\\ kill\\ switch,\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "z > $1：紧急停止开关，$2"
      ]
    ],
    "preserve": []
  }
};
