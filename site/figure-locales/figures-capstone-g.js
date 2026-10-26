(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-capstone-g.js"] = {
  "cg-plan-replan": {
    "text": {
      "Motion reduced": "已减少动画",
      "PLAN / EXECUTE / REPLAN": "规划 / 执行 / 重新规划",
      "fail hands back to planner": "失败后交回规划器",
      "The plan is an ordered list of typed steps the executor can walk, not prose the loop has to parse. When step 3 fails, the executor does not improvise: it hands the cursor and the error back to the planner, which returns a fresh tail from that position. The revision arrives as a diff a tracer can display, and two hard ceilings, one on steps and one on replans, keep the loop from planning forever.": "计划是执行器能够按顺序遍历的有类型步骤列表，而不是需要循环解析的散文。第 3 步失败时，执行器不会自行发挥，而是把当前位置和错误交回规划器；规划器从该位置返回新的后续步骤。修订以差异形式呈现，便于追踪器显示。步骤数与重新规划次数各有硬上限，防止循环无休止地规划。",
      "plan is data · the executor walks it": "计划是数据 · 执行器按计划推进",
      "planner": "规划器",
      "1 read file": "1 读取文件",
      "2 run tests": "2 运行测试",
      "3 apply patch": "3 应用补丁",
      "4 rerun tests": "4 重新测试",
      "5 report": "5 汇报",
      "✗ import error": "✗ 导入错误",
      "3' fix import": "3' 修复导入",
      "4' rerun tests": "4' 重新测试",
      "diff +2 −2": "差异 +2 −2",
      "budgets: steps 7/8 · replans 1/2 · abort past either ceiling": "预算：步骤 7/8 · 重新规划 1/2 · 任一超限即终止",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "replan(cursor, err)",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      }
    ]
  },
  "cg-gate-chain": {
    "text": {
      "Motion reduced": "已减少动画",
      "GATE CHAIN + LEDGER": "检查链与观察账本",
      "deny fast · meter the rest": "尽早拒绝 · 对其余输出计量",
      "The chain is four deterministic gates with short-circuit semantics: the first DENY ends the walk and the reason is logged for the model to read. An allowed call is not free either. Its output is metered into the observation ledger, and once the cumulative tokens shown to the model would cross the budget, the budget gate at the front of the chain starts refusing calls on its own.": "检查链由四个确定性关卡组成，采用短路语义：首次拒绝就结束检查，并记录原因供模型读取。获准的调用也有成本，其输出按 token 数计入观察账本。一旦累计向模型展示的 token 将超过预算，检查链前端的预算关卡就会自行拒绝后续调用。",
      "every tool call walks the chain · first DENY wins": "每次工具调用都经过检查链 · 首次拒绝即终止",
      "budget": "预算",
      "tokens left?": "还有 token 预算？",
      "recency": "时效",
      "stale reads?": "读取结果已过期？",
      "whitelist": "允许清单",
      "tool known?": "工具已登记？",
      "regex": "正则检查",
      "argv clean?": "参数安全？",
      "call: read_file": "调用：read_file",
      "ALLOW": "允许",
      "✗ DENY unknown tool \"shell\"": "✗ 拒绝未知工具 \"shell\"",
      "observation ledger": "观察账本",
      "5.1K / 8K tokens shown": "已展示 5.1K / 8K token",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "cg-path-jail": {
    "text": {
      "Motion reduced": "已减少动画",
      "PATH JAIL + DENYLIST": "路径隔离与拒绝清单",
      "refuse by prefix, name, shape": "按路径前缀、名称和参数形式拒绝",
      "Two refusal surfaces sit between the model and the operating system. Every path argument resolves through realpath and must keep the project root as a prefix, so a ../../ traversal bounces off the jail wall instead of reaching /etc. Alongside it, a denylist refuses executables by name and an argv inspector catches interpreters smuggling shell through -c flags. Output is truncated and a wall-clock timeout kills whatever runs away.": "模型与操作系统之间有两道拒绝机制。每个路径参数都经 realpath 解析，解析后必须仍以项目根目录为前缀，因此 ../../ 路径穿越会被隔离边界挡住，无法到达 /etc。同时，拒绝清单按名称拦截可执行程序，参数检查器识别解释器通过 -c 参数夹带 shell 的情况。输出会被截断；墙钟超时会终止失控进程。",
      "realpath every argument · assert the prefix": "对每个路径参数执行 realpath · 校验前缀",
      "sandbox": "沙箱",
      "project root jail": "项目根目录隔离区",
      "✓ inside root": "✓ 位于根目录内",
      "✗ escapes root": "✗ 逃逸根目录",
      "denylist": "拒绝清单",
      "by name and argv shape": "按名称和参数形式检查",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "subprocess.run",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      },
      {
        "text": "src/main.py",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      },
      {
        "text": "tests/",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      },
      {
        "text": "../../etc/passwd",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      },
      {
        "text": "sudo",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      }
    ]
  },
  "cg-harness-weave": {
    "text": {
      "Motion reduced": "已减少动画",
      "HARNESS END TO END": "端到端运行框架",
      "every step crosses four layers": "每一步都经过四层",
      "The end-to-end run is one token weaving through four strata on every step: the gate chain rules on the call, the sandbox executes it, a span wraps the whole exchange, and the eval harness scores the finished trajectory. The components stop disagreeing because the budgets live in one place and every layer reads the same ledger. The fixture bug falls in nine steps, under the twelve-step ceiling, with zero gate trips on legal tools.": "端到端运行的每一步都会依次经过四层：检查链裁决调用，沙箱执行调用，span 包裹整个交互，评测框架为完整轨迹评分。所有预算集中存放，各层读取同一个账本，因此组件不会各说各话。示例中的缺陷在九步内修复，低于十二步上限，合法工具没有触发任何关卡。",
      "gate chain": "检查链",
      "sandbox": "沙箱",
      "otel span": "OpenTelemetry 跟踪区间",
      "eval harness": "评测框架",
      "read": "读取",
      "tests": "测试",
      "write": "写入",
      "run report": "运行并汇报",
      "PASS": "通过",
      "9 steps · 0 trips": "9 步 · 0 次拦截",
      "global budgets: 12 steps · 8K observation tokens": "全局预算：12 步 · 8K 观察 token",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "cg-eval-quadrant": {
    "text": {
      "Motion reduced": "已减少动画",
      "EVAL PIPELINE": "评测流水线",
      "ppl · em · f1 · judge": "困惑度 · 精确匹配 · F1 · 评审",
      "Perplexity tracks fit to the language distribution but never asks a question. Exact match scores facts and punishes paraphrase; token F1 forgives paraphrase and is fooled by overlap; the mock judge scores open answers on a rubric without a network call. No single number describes a language model, so the pipeline runs all four on shaped held-out subsets and folds them into one weighted report a reviewer can read at a glance.": "困惑度衡量模型对语言分布的拟合，但不直接判断问答。精确匹配评估事实回答，也会惩罚改写；token F1 容忍改写，却可能被词语重叠误导；模拟评审器按评分标准评估开放式回答，无需网络调用。单一数字无法概括语言模型，因此流水线在具有明确结构的留出子集上运行四种评测，再汇成评审者一眼能读懂的加权报告。",
      "four evals · four blind spots covered": "四类评测 · 覆盖四个盲点",
      "perplexity": "困惑度",
      "held-out LM": "语言模型留出集",
      "exact match": "精确匹配",
      "short factual": "简短事实回答",
      "open form": "开放式回答",
      "judge (mock)": "评审器（模拟）",
      "1-5 rubric": "1-5 分评分标准",
      "report": "报告",
      "ppl 31.4": "困惑度 31.4",
      "judge 3.8": "评审分 3.8",
      "agg 0.61": "综合分 0.61",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "token F1",
        "reason": "公式、协议标识或技术专名，原样保留。"
      }
    ]
  },
  "cg-allreduce-ring": {
    "text": {
      "Motion reduced": "已减少动画",
      "DDP COLLECTIVES": "DDP 集合通信",
      "grads meet · mean returns": "汇集梯度 · 返回均值",
      "Data parallel is two collectives and a rule. Parameters broadcast from rank 0 once at construction so every replica starts identical. After each backward pass the per-rank gradients meet in an all-reduce and every rank receives the same mean, so the optimizer steps can never disagree. FSDP extends the same discipline to memory: each rank keeps only a shard of every parameter and gathers the full tensor just long enough for the layer that needs it.": "数据并行由两种集合通信和一条规则组成。构建时只从 rank 0 广播一次参数，使所有副本拥有相同的初始状态。每次反向传播后，各 rank 的梯度通过全归约汇集，每个 rank 都得到同一个均值，因此优化器更新不会产生分歧。FSDP 将同样的纪律用于内存：每个 rank 仅保存各参数的一个分片，只在某层需要时短暂聚合完整张量。",
      "broadcast once · all-reduce every step": "初始广播一次 · 每步执行全归约",
      "seed model": "初始模型",
      "replica": "副本",
      "broadcast θ from rank 0": "从 rank 0 广播 θ",
      "all-reduce mean": "全归约求均值",
      "every rank steps with the same averaged gradient · step 42 everywhere": "每个 rank 都用相同的平均梯度更新 · 全部处于第 42 步",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "rank 0",
        "reason": "分布式进程的 rank 标识与编号，作为技术标识保留。"
      },
      {
        "text": "rank 1",
        "reason": "分布式进程的 rank 标识与编号，作为技术标识保留。"
      },
      {
        "text": "rank 2",
        "reason": "分布式进程的 rank 标识与编号，作为技术标识保留。"
      },
      {
        "text": "rank 3",
        "reason": "分布式进程的 rank 标识与编号，作为技术标识保留。"
      }
    ]
  },
  "cg-novelty-ramp": {
    "text": {
      "Motion reduced": "已减少动画",
      "HYPOTHESIS GENERATOR": "假设生成器",
      "ramp · filter · rank": "升温 · 筛选 · 排序",
      "One pass through the sampler yields one hypothesis; the loop wants a ranked queue with depth. Each pass raises the temperature a notch so the next draft wanders further from the last, and an embedding filter rejects anything that lands inside the cosine radius of a survivor. What remains is scored on novelty, specificity, and testability, and because every step is seeded, the same seed always rebuilds the same queue.": "采样器每次产生一个假设，循环需要的却是有深度的排序队列。每轮把温度提高一点，让下一份草案离上一份更远；embedding 筛选器会拒绝落入已保留假设余弦半径内的候选项。余下候选按新颖性、具体程度和可检验性评分。由于每一步都固定随机种子，同一种子总能重建相同队列。",
      "raise T each pass · reject inside the cluster": "每轮提高 T · 拒绝聚类内的近重复项",
      "temperature ramp": "温度递增",
      "cosine radius": "余弦半径",
      "✗ near-dup": "✗ 近重复",
      "queue": "队列",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "cg-citation-hops": {
    "text": {
      "Motion reduced": "已减少动画",
      "LITERATURE RETRIEVAL": "文献检索",
      "BM25 + citation walk": "BM25 + 引文遍历",
      "BM25 over abstracts returns the papers that share vocabulary with the query, and misses the foundational work that named the idea differently. The second pass starts from a known anchor and walks the citation graph a hop or two in each direction, surfacing follow-ups no keyword would catch. The two hit sets union, deduplicate on stable paper id, and rank, so the anchor that appeared in both passes is counted once.": "在摘要上运行 BM25，能找到与查询共用词汇的论文，却可能漏掉用不同术语提出相同想法的奠基工作。第二轮从已知锚点出发，沿引文图向两个方向遍历一两跳，找出关键词无法命中的后续论文。两组结果合并后按稳定论文 ID 去重并排序，因此同时出现在两轮中的锚点只计一次。",
      "lexical pass + graph pass · union deduped by id": "词法检索 + 图遍历 · 按 ID 合并去重",
      "BM25 over abstracts": "对摘要运行 BM25",
      "seed from known anchor": "从已知锚点开始",
      "hop 1": "第 1 跳",
      "hop 2": "第 2 跳",
      "ranked: p007 p003 p019 p015 p011 p021": "排序：p007 p003 p019 p015 p011 p021",
      "p007 kept once": "p007 仅保留一次",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "\"sparse attention\"",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      }
    ]
  },
  "cg-runner-limits": {
    "text": {
      "Motion reduced": "已减少动画",
      "EXPERIMENT RUNNER": "实验运行器",
      "timeout · mem cap · blob": "超时 · 内存上限 · 结构化结果",
      "The runner serialises the spec to a child process and watches two meters: a hard wall-clock timeout and a polled memory cap. Run A stays under both, exits cleanly, and its stdout carries a structured metrics blob into the result record. Run B grows past the cap and takes the kill path; the record says oom instead of pretending a number exists. Same seed, same spec, same numbers on every rerun.": "运行器将实验规格序列化后交给子进程，并监控两个指标：硬性墙钟超时和轮询得到的内存上限。运行 A 没有触碰上限，正常退出，并通过标准输出把结构化指标写入结果记录。运行 B 的内存超过上限后被终止；记录明确标为 oom，而不是假装存在一个数值结果。相同种子和规格在每次重跑时都产生相同数值。",
      "run A completes · run B trips the cap": "运行 A 完成 · 运行 B 触发上限",
      "seed 1234": "随机种子 1234",
      "subprocess": "子进程",
      "own address space": "独立地址空间",
      "wall clock": "墙钟时间",
      "mem cap": "内存上限",
      "SIGKILL · mem cap": "SIGKILL · 内存超限",
      "metrics blob": "结构化指标",
      "exp_002 · oom-kill": "exp_002 · 内存超限终止",
      "results": "结果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "ExperimentSpec",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      },
      {
        "text": "{\"ppl\": 31.4}",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      }
    ]
  },
  "cg-paired-verdict": {
    "text": {
      "Motion reduced": "已减少动画",
      "RESULT EVALUATOR": "结果评估器",
      "paired diffs · t test · verdict": "配对差值 · t 检验 · 判定",
      "One run per configuration proves nothing; the same spec with a new seed lands on a different number. The evaluator pairs each seed with itself, candidate against baseline, and lets the per-seed differences testify. Their mean is the effect, their spread is the noise floor, and a from-scratch paired t test says whether the mean stands clear of it. The verdict attaches back to the hypothesis queue, and identical inputs always produce the identical verdict.": "每种配置只跑一次无法证明任何结论；相同规格换一个随机种子，就会得到不同数值。评估器把候选配置与基线按相同种子配对，让各对差值提供证据。差值均值表示效果，离散程度表示噪声水平；从零实现的配对 t 检验判断均值是否明显超出噪声。判定结果附回假设队列，相同输入总会产生相同判定。",
      "pair each seed with itself · test the differences": "按相同种子配对 · 检验差值",
      "grey base · blue candidate ppl": "灰色：基线 · 蓝色：候选困惑度",
      "Δ ppl": "困惑度差值 Δ",
      "noise floor": "噪声水平",
      "mean Δ": "差值均值 Δ",
      "improvement · t 5.9 · p < 0.01": "有改进 · t 5.9 · p < 0.01",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  }
};
