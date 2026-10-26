(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-infra2.js"] = {
  "cold-start-pipeline": {
    "text": {
      "Motion reduced": "已减少动画",
      "COLD-START PIPELINE": "冷启动流水线",
      "weights stream through tiers until a cold replica goes warm": "权重经过存储层级，直到冷副本可服务",
      "A scaled-to-zero replica cannot answer until its weights are resident in HBM. The cold-start budget is the sum of node provision, weights download, load into HBM, and engine init — minutes for a 70B model against a two-second SLA. Tiered loading streams weights NVMe→DRAM→HBM and warm pools keep min_workers>0, trading idle GPU cost for a vanished cold-start tail.": "缩容到零的副本必须先让权重驻留 HBM 才能响应。冷启动预算包括节点创建、权重下载、载入 HBM 和引擎初始化；70B 模型需要数分钟，而 SLA 可能仅两秒。分层加载沿 NVMe→DRAM→HBM 流式传输权重，预热池保持 min_workers>0，以空闲 GPU 成本换取消失的冷启动长尾。",
      "weights at rest": "静态存放的权重",
      "staged": "已暂存",
      "on GPU": "位于 GPU",
      "cold": "冷副本",
      "serving": "服务中",
      "tiered load: NVMe → DRAM → HBM, then the replica serves": "分层加载：NVMe → DRAM → HBM，然后副本开始服务",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^A\\ scaled\\-to\\-zero\\ replica\\ cannot\\ answer\\ until\\ its\\ weights\\ are\\ resident\\ in\\ HBM\\.\\ The\\ cold\\-start\\ budget\\ is\\ the\\ sum\\ of\\ node\\ provision,\\ weights\\ download,\\ load\\ into\\ HBM,\\ and\\ engine\\ init\\ —\\ minutes\\ for\\ a\\ ([-+]?\\d+(?:[.,]\\d+)*)B\\ model\\ against\\ a\\ two\\-second\\ SLA\\.\\ Tiered\\ loading\\ streams\\ weights\\ NVMe→DRAM→HBM\\ and\\ warm\\ pools\\ keep\\ min_workers>([-+]?\\d+(?:[.,]\\d+)*),\\ trading\\ idle\\ GPU\\ cost\\ for\\ a\\ vanished\\ cold\\-start\\ tail\\.$",
        "缩容到零的副本必须先让权重驻留 HBM 才能响应。冷启动预算包括节点创建、权重下载、载入 HBM 和引擎初始化；$1B 模型需要数分钟，而 SLA 可能仅两秒。分层加载沿 NVMe→DRAM→HBM 流式传输权重，预热池保持 min_workers>$2，以空闲 GPU 成本换取消失的冷启动长尾。"
      ]
    ],
    "preserve": [
      {
        "text": "NVMe",
        "reason": "存储技术缩写"
      },
      {
        "text": "DRAM",
        "reason": "存储技术缩写"
      },
      {
        "text": "HBM",
        "reason": "存储技术缩写"
      }
    ]
  },
  "cache-aware-router": {
    "text": {
      "Motion reduced": "已减少动画",
      "CACHE-AWARE ROUTER": "缓存感知路由器",
      "requests routed to the replica holding their prefix": "请求发往持有相同前缀的副本",
      "Round-robin scatters requests blind, so most miss the cache and pay full prefill. A cache-aware router hashes the prompt prefix and sends every matching request to the replica that already holds those KV blocks — the warm path stays warm and TTFT collapses from prefill-bound to a cache hit.": "轮询路由盲目分散请求，多数请求无法命中缓存，必须完整预填充。缓存感知路由器对 prompt 前缀求哈希，将匹配请求发到已有相应 KV 块的副本；预热路径持续命中，首个 token 延迟从受预填充限制降为缓存命中耗时。",
      "router": "路由器",
      "replica 1": "副本 1",
      "cold": "冷副本",
      "replica 2": "副本 2",
      "cache: P": "缓存：P",
      "replica 3": "副本 3",
      "route on prefix-hash": "按前缀哈希路由",
      "P-requests reuse the warm cache": "P 请求复用预热缓存",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^replica\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "副本 $1"
      ],
      [
        "^replica\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "副本 $1"
      ],
      [
        "^replica\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "副本 $1"
      ]
    ],
    "preserve": []
  },
  "edge-bandwidth-pipe": {
    "text": {
      "Motion reduced": "已减少动画",
      "EDGE BANDWIDTH CEILING": "边缘设备带宽上限",
      "tokens stream through a wide datacenter pipe vs a narrow mobile one": "token 经过宽的数据中心通道，或窄的移动设备通道",
      "Decode reads the full set of weights for every token, so memory bandwidth — not compute — is the ceiling. Datacenter HBM3 near 3 TB/s flushes the weights in around a millisecond, clearing hundreds of tokens per second. Mobile DRAM at 50-90 GB/s is a 30-50x narrower pipe, so the same model trickles out at 14-25 tok/s no matter how much NPU compute sits idle.": "解码每个 token 都读取全部权重，因此上限由内存带宽而非计算量决定。数据中心 HBM3 接近 3 TB/s，约一毫秒可读完权重，能输出每秒数百 token。移动 DRAM 为 50-90 GB/s，通道窄 30-50 倍，即使 NPU 计算闲置，同一模型仍只有 14-25 tok/s。",
      "datacenter HBM3 · ~3 TB/s": "数据中心 HBM3 · 约 3 TB/s",
      "→ ~830 tok/s": "→ 约 830 tok/s",
      "mobile DRAM · ~50-90 GB/s": "移动 DRAM · 约 50-90 GB/s",
      "→ ~14-25 tok/s": "→ 约 14-25 tok/s",
      "decode reads every weight per token — bandwidth sets the ceiling": "解码每个 token 都读取全部权重，带宽决定上限",
      "compute is secondary; the pipe width decides tok/s": "计算量居次；通道宽度决定 tok/s",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^Decode\\ reads\\ the\\ full\\ set\\ of\\ weights\\ for\\ every\\ token,\\ so\\ memory\\ bandwidth\\ —\\ not\\ compute\\ —\\ is\\ the\\ ceiling\\.\\ Datacenter\\ HBM3\\ near\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ TB/s\\ flushes\\ the\\ weights\\ in\\ around\\ a\\ millisecond,\\ clearing\\ hundreds\\ of\\ tokens\\ per\\ second\\.\\ Mobile\\ DRAM\\ at\\ ([-+]?\\d+(?:[.,]\\d+)*)([-+]?\\d+(?:[.,]\\d+)*)\\ GB/s\\ is\\ a\\ ([-+]?\\d+(?:[.,]\\d+)*)([-+]?\\d+(?:[.,]\\d+)*)x\\ narrower\\ pipe,\\ so\\ the\\ same\\ model\\ trickles\\ out\\ at\\ ([-+]?\\d+(?:[.,]\\d+)*)([-+]?\\d+(?:[.,]\\d+)*)\\ tok/s\\ no\\ matter\\ how\\ much\\ NPU\\ compute\\ sits\\ idle\\.$",
        "解码每个 token 都读取全部权重，因此上限由内存带宽而非计算量决定。数据中心 HBM3 接近 $1 TB/s，约一毫秒可读完权重，能输出每秒数百 token。移动 DRAM 为 $2$3 GB/s，通道窄 $4$5 倍，即使 NPU 计算闲置，同一模型仍只有 $6$7 tok/s。"
      ],
      [
        "^datacenter\\ HBM3\\ ·\\ \\~([-+]?\\d+(?:[.,]\\d+)*)\\ TB/s$",
        "数据中心 HBM3 · 约 $1 TB/s"
      ],
      [
        "^→\\ \\~([-+]?\\d+(?:[.,]\\d+)*)\\ tok/s$",
        "→ 约 $1 tok/s"
      ],
      [
        "^mobile\\ DRAM\\ ·\\ \\~([-+]?\\d+(?:[.,]\\d+)*)([-+]?\\d+(?:[.,]\\d+)*)\\ GB/s$",
        "移动 DRAM · 约 $1$2 GB/s"
      ],
      [
        "^→\\ \\~([-+]?\\d+(?:[.,]\\d+)*)([-+]?\\d+(?:[.,]\\d+)*)\\ tok/s$",
        "→ 约 $1$2 tok/s"
      ]
    ],
    "preserve": []
  },
  "semantic-cache-hit": {
    "text": {
      "Motion reduced": "已减少动画",
      "SEMANTIC CACHE": "语义缓存",
      "similar prompts served from cache, novel ones reach the LLM": "相似 prompt 从缓存返回，新 prompt 才访问 LLM",
      "L1 semantic caching embeds each prompt and checks similarity against past entries. A near-duplicate query (blue) is served straight from the cache — fast and nearly free. Only a genuinely novel prompt (orange) misses through to the cold LLM. Hit rates run 10% on open chat up to 70% on structured FAQ; dynamic text in the prefix collapses them to near zero.": "L1 语义缓存嵌入每条 prompt，再与历史条目比较相似度。近似重复的查询（蓝色）直接命中缓存，快速且几乎免费；真正新颖的 prompt（橙色）才穿透到冷 LLM。开放聊天命中率约 10%，结构化 FAQ 可达 70%；前缀中的动态文本会让命中率接近零。",
      "cache": "缓存",
      "embeds": "嵌入",
      "LLM (cold)": "LLM（冷）",
      "slow · $$$": "慢 · $$$",
      "cache hit": "缓存命中",
      "fast · ~$0": "快 · 约 $0",
      "similarity ≥ threshold → serve from cache, skip the LLM": "相似度 ≥ 阈值 → 从缓存返回，跳过 LLM",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^L1\\ semantic\\ caching\\ embeds\\ each\\ prompt\\ and\\ checks\\ similarity\\ against\\ past\\ entries\\.\\ A\\ near\\-duplicate\\ query\\ \\(blue\\)\\ is\\ served\\ straight\\ from\\ the\\ cache\\ —\\ fast\\ and\\ nearly\\ free\\.\\ Only\\ a\\ genuinely\\ novel\\ prompt\\ \\(orange\\)\\ misses\\ through\\ to\\ the\\ cold\\ LLM\\.\\ Hit\\ rates\\ run\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ on\\ open\\ chat\\ up\\ to\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ on\\ structured\\ FAQ;\\ dynamic\\ text\\ in\\ the\\ prefix\\ collapses\\ them\\ to\\ near\\ zero\\.$",
        "L1 语义缓存嵌入每条 prompt，再与历史条目比较相似度。近似重复的查询（蓝色）直接命中缓存，快速且几乎免费；真正新颖的 prompt（橙色）才穿透到冷 LLM。开放聊天命中率约 $1%，结构化 FAQ 可达 $2%；前缀中的动态文本会让命中率接近零。"
      ],
      [
        "^fast\\ ·\\ \\~\\$([-+]?\\d+(?:[.,]\\d+)*)$",
        "快 · 约 $$$1"
      ]
    ],
    "preserve": []
  },
  "batch-lane-triage": {
    "text": {
      "Motion reduced": "已减少动画",
      "triage": "分流",
      "BATCH LANE TRIAGE": "批处理通道分流",
      "workloads sorted into lanes; the batch lane drains overnight": "工作负载分入通道，批处理通道夜间清空",
      "Every new LLM workload triages into three lanes. Interactive stays synchronous at full price; semi-interactive goes on an async queue; everything tolerant of 24-hour latency drops into the batch lane at a 50% discount, stacked with cached input toward ~10% of synchronous cost. Most jobs that pretend to be real-time actually just need an answer by morning.": "每个新 LLM 工作负载分入三条通道。交互式请求保持同步、支付全价；半交互式请求进入异步队列；能容忍 24 小时延迟的请求进入批处理通道，享受 50% 折扣，叠加输入缓存后成本约为同步的 10%。许多自称实时的任务，其实只需次日早晨拿到答案。",
      "interactive": "交互式",
      "sync · full price": "同步 · 全价",
      "semi": "半交互式",
      "async queue": "异步队列",
      "batch": "批处理",
      "50% off · ~24h": "优惠 50% · 约 24 小时",
      "if it is not interactive, it belongs on batch": "无需交互的任务应进入批处理",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^Every\\ new\\ LLM\\ workload\\ triages\\ into\\ three\\ lanes\\.\\ Interactive\\ stays\\ synchronous\\ at\\ full\\ price;\\ semi\\-interactive\\ goes\\ on\\ an\\ async\\ queue;\\ everything\\ tolerant\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*)\\-hour\\ latency\\ drops\\ into\\ the\\ batch\\ lane\\ at\\ a\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ discount,\\ stacked\\ with\\ cached\\ input\\ toward\\ \\~([-+]?\\d+(?:[.,]\\d+)*)%\\ of\\ synchronous\\ cost\\.\\ Most\\ jobs\\ that\\ pretend\\ to\\ be\\ real\\-time\\ actually\\ just\\ need\\ an\\ answer\\ by\\ morning\\.$",
        "每个新 LLM 工作负载分入三条通道。交互式请求保持同步、支付全价；半交互式请求进入异步队列；能容忍 $1 小时延迟的请求进入批处理通道，享受 $2% 折扣，叠加输入缓存后成本约为同步的 $3%。许多自称实时的任务，其实只需次日早晨拿到答案。"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)%\\ off\\ ·\\ \\~([-+]?\\d+(?:[.,]\\d+)*)h$",
        "优惠 $1% · 约 $2 小时"
      ]
    ],
    "preserve": []
  },
  "model-cascade-router": {
    "text": {
      "Motion reduced": "已减少动画",
      "MODEL CASCADE ROUTER": "模型级联路由器",
      "cheap-first, escalate the hard ones": "先用便宜模型，难题再升级",
      "A broker scores each request — task type, length, confidence — and sends the easy majority to a cheap model. Only low-confidence requests escalate down the dashed lane to the frontier model. Most traffic costs cents; the blended bill drops 20-60% at iso-quality. The hazard is silent cheap-model drift, caught only by an online quality gate.": "调度器根据任务类型、长度和置信度给请求评分，将多数简单请求发给便宜模型。只有低置信度请求沿虚线升级到前沿模型。多数流量成本很低，在相同质量下，综合费用下降 20-60%。风险是便宜模型悄然漂移，只有线上质量关卡才能发现。",
      "broker": "调度器",
      "conf?": "置信度？",
      "cheap model": "低成本模型",
      "frontier model": "前沿模型",
      "blended cost ≈ 0.7·cheap + 0.3·frontier": "综合成本 ≈ 0.7·低成本模型 + 0.3·前沿模型",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^A\\ broker\\ scores\\ each\\ request\\ —\\ task\\ type,\\ length,\\ confidence\\ —\\ and\\ sends\\ the\\ easy\\ majority\\ to\\ a\\ cheap\\ model\\.\\ Only\\ low\\-confidence\\ requests\\ escalate\\ down\\ the\\ dashed\\ lane\\ to\\ the\\ frontier\\ model\\.\\ Most\\ traffic\\ costs\\ cents;\\ the\\ blended\\ bill\\ drops\\ ([-+]?\\d+(?:[.,]\\d+)*)([-+]?\\d+(?:[.,]\\d+)*)%\\ at\\ iso\\-quality\\.\\ The\\ hazard\\ is\\ silent\\ cheap\\-model\\ drift,\\ caught\\ only\\ by\\ an\\ online\\ quality\\ gate\\.$",
        "调度器根据任务类型、长度和置信度给请求评分，将多数简单请求发给便宜模型。只有低置信度请求沿虚线升级到前沿模型。多数流量成本很低，在相同质量下，综合费用下降 $1$2%。风险是便宜模型悄然漂移，只有线上质量关卡才能发现。"
      ],
      [
        "^blended\\ cost\\ ≈\\ ([-+]?\\d+(?:[.,]\\d+)*)·cheap\\ \\+\\ ([-+]?\\d+(?:[.,]\\d+)*)·frontier$",
        "综合成本 ≈ $1·低成本模型 + $2·前沿模型"
      ]
    ],
    "preserve": []
  },
  "prefill-decode-split": {
    "text": {
      "Motion reduced": "已减少动画",
      "PREFILL / DECODE SPLIT": "预填充 / 解码分离",
      "two pools, KV cache handed off between them": "两个池，池间移交 KV 缓存",
      "Prefill is compute-bound; decode is memory-bound. Colocating both on one GPU wastes whichever resource the current phase is not using. Disaggregation runs separate pools sized for each bottleneck and ships the KV cache across a high-bandwidth NIXL link. It pays off on long prompts; short prompts do not justify the transfer cost.": "预填充受计算限制，解码受内存限制。两者放在同一 GPU 上，会浪费当前阶段不用的资源。解耦部署为各自瓶颈配置独立资源池，通过高带宽 NIXL 链路传送 KV 缓存。长 prompt 可获益，短 prompt 的收益不足以抵偿传输成本。",
      "PREFILL POOL": "预填充池",
      "compute-bound": "受计算限制",
      "DECODE POOL": "解码池",
      "memory-bound": "受内存限制",
      "KV cache transfers prefill → decode": "KV 缓存从预填充池传到解码池",
      "each pool sized for its own bottleneck": "各资源池按自身瓶颈配置容量",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "NIXL",
        "reason": "NIXL库名"
      }
    ]
  },
  "load-pattern-waves": {
    "text": {
      "Motion reduced": "已减少动画",
      "LOAD PATTERNS": "负载模式",
      "pick a pattern": "选择模式",
      "load pattern": "负载模式",
      "spike": "突刺",
      "steady-state": "稳态",
      "ramp": "爬坡",
      "soak": "浸泡",
      "Four load shapes catch four failures. Steady-state measures baseline throughput; ramp climbs until the breaking point; spike surges suddenly to test how fast autoscaling reacts; soak holds load for hours to surface memory leaks. Generic testers also lie when every request is identical — real traffic needs variable input length and diverse prefixes.": "四种负载形状发现四类故障。稳态测基准吞吐；爬坡逐步加压直到断点；突刺突然激增以检查自动扩容响应速度；浸泡持续数小时以暴露内存泄漏。每条请求都相同时，通用压测器也会给出误导结论；真实流量需要不同输入长度和多样前缀。",
      "SPIKE pattern": "突刺模式",
      "sudden surge — tests autoscaling reaction": "流量突然激增：检查自动扩容响应",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "STEADY pattern": "稳态模式",
      "constant rate — baseline throughput": "恒定速率：测量基准吞吐",
      "RAMP pattern": "爬坡模式",
      "climbing load — finds the breaking point": "负载上升：寻找断点",
      "SOAK pattern": "浸泡模式",
      "sustained hours — surfaces memory leaks (soak)": "持续数小时：暴露内存泄漏（浸泡测试）"
    },
    "patterns": [],
    "preserve": []
  }
};
