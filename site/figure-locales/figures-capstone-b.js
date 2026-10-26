(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-capstone-b.js"] = {
  "grad-clip-monitor": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "GRADIENT CLIP + AMP": "梯度裁剪 + AMP",
      "norm spikes, ceiling holds": "范数激增，上限兜底",
      "clip ceiling = 1.0": "裁剪上限 = 1.0",
      "NaN → skip step": "NaN → 跳过更新",
      "step →": "步骤 →",
      "Every step the global gradient norm is measured and clipped to the ceiling. A single overflow batch (orange) would spike past it and turn the loss to NaN; the GradScaler detects the Inf, skips the optimizer step, and halves its scale so the run survives.": "每一步都测量全局梯度范数，并按上限裁剪。一个溢出批次（橙色）的范数会冲过上限，使损失变成 NaN；GradScaler 会检测 Inf，跳过这次优化器更新，并将缩放系数减半，让训练继续运行。"
    },
    "patterns": [],
    "preserve": []
  },
  "rrf-fusion": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "RECIPROCAL RANK FUSION": "倒数排名融合",
      "two lanes, one vote": "两路检索，统一投票",
      "query": "查询",
      "dense": "稠密检索",
      "RRF fuse": "RRF 融合",
      "fused top-k": "融合后的 top-k",
      "A query runs through BM25 and a dense retriever in parallel. Each returns a ranked list; RRF scores every document by 1/(k+rank) summed across lists, so a document ranked well by either lane rises. The fusion votes rather than interpolates, which is why it wins across query classes.": "查询同时经过 BM25 与稠密检索器。两者各返回一个排名列表，RRF 将每个文档在各列表中的 1/(k+rank) 相加，因此任一路排名靠前的文档都能上升。融合采用投票而非插值，这也是它能适应多类查询的原因。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "1/(k+rank)",
        "reason": "RRF 排名评分公式"
      }
    ]
  },
  "rerank-funnel": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "CROSS-ENCODER RERANK": "交叉编码器重排",
      "N candidates → top-K": "N 个候选 → top-K",
      "retrieved N": "检索到 N 个",
      "reranked top-K": "重排后的 top-K",
      "cross": "交叉",
      "encoder": "编码器",
      "A cheap retriever returns N candidates; the cross-encoder reads each (query, document) pair with full attention and scores it. Only the top-K survive (blue). The expensive model runs N times instead of corpus-many, so its precision lift lands inside the request latency budget.": "低成本检索器先返回 N 个候选，交叉编码器再通过完整注意力读取每个（query，文档）对并评分，只有 top-K 被保留（蓝色）。昂贵模型仅运行 N 次，无需遍历整个语料库，因此能在请求延迟预算内提高精度。"
    },
    "patterns": [],
    "preserve": []
  },
  "rag-pipeline-flow": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "END-TO-END RAG": "端到端 RAG",
      "one query, four stages": "一次查询，四个阶段",
      "rewrite": "改写",
      "retrieve": "检索",
      "rerank": "重排",
      "generate": "生成",
      "corpus + query": "语料 + 查询",
      "answer + [chunk:42] citation": "回答 + [chunk:42] 引用",
      "or refuse on low confidence": "或在置信度低时拒答",
      "The packet carries one query through the assembled pipeline: rewrite expands it, the hybrid index retrieves, the cross-encoder reranks, the generator answers with a chunk-anchored citation or refuses when confidence is low. Six isolated components become one system that beats each stage measured alone.": "一个查询依次流经组装好的流水线：改写阶段扩展查询，混合索引执行检索，交叉编码器重排，生成器给出带片段引用的回答，或在置信度低时拒答。六个独立组件由此组成一个系统，整体表现优于孤立测量的各个阶段。"
    },
    "patterns": [],
    "preserve": []
  },
  "sandbox-runner": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "CODE-EXEC SANDBOX": "代码执行沙箱",
      "run, assert, time out": "运行、断言、超时",
      "candidate": "候选",
      "code": "代码",
      "subprocess sandbox": "子进程沙箱",
      "wall-clock": "实际耗时",
      "timeout": "超时",
      "3/4 pass": "3/4 通过",
      "Generated code is shipped on stdin to a fresh interpreter inside a subprocess with an import denylist and output cap. Each supplied assertion runs and lights pass (blue) or fail (orange); a wall-clock timeout kills runaway loops. The score is the fraction of assertions that pass, with crashes and timeouts as first-class fail modes.": "生成的代码通过 stdin 送入子进程中的新解释器，配有导入黑名单与输出上限。逐个运行提供的断言，并标记通过（蓝色）或失败（橙色）；实际耗时达到上限时会终止失控循环。得分是通过断言的比例，崩溃与超时也都按明确的失败类型处理。"
    },
    "patterns": [
      [
        "^assert (\\d+)$",
        "断言 $1"
      ]
    ],
    "preserve": []
  },
  "eval-grid": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "EVAL RUNNER": "评测运行器",
      "tasks fan out, scores light up": "分发任务，逐项评分",
      "worker": "工作",
      "pool": "进程池",
      "score = mean(pass) · per-model EvalRun → leaderboard": "得分 = mean(pass) · 每个模型的 EvalRun → 排行榜",
      "The runner reads the task spec, fans the tasks across a worker pool, and scores each with the metric layer plus the calibration report. Cells light pass (blue) or fail (orange) as the sweep crosses them. Per-model EvalRun records flow straight into the leaderboard aggregator; the demo self-terminates on a clean run.": "运行器读取任务规范，将任务分发到工作进程池，并结合指标层与校准报告逐项评分。扫描经过单元格时，单元格会标记通过（蓝色）或失败（橙色）。每个模型的 EvalRun 记录直接进入排行榜聚合器；演示会在完整运行成功后自行结束。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "tasks.jsonl →",
        "reason": "原样的协议、代码、产品名或公式标识，不属于人读散文"
      }
    ]
  },
  "injection-gate": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "INJECTION DETECTOR": "注入检测器",
      "three layers, one verdict": "三层检查，一个结论",
      "normalize": "规范化",
      "layer": "层",
      "substring": "子串",
      "regex": "正则",
      "verdict": "判定",
      "rule fires → attack": "规则触发 → 攻击",
      "p, category": "p，类别",
      "A prompt flows through three auditable layers: normalize decodes base64/rot13/zero-width tricks, substring rules catch hand-written phrases, regex rules catch families. A benign prompt (blue) passes clean; an attack (orange) trips a rule and the aggregator emits a confidence and category instead of a vibe.": "prompt 流经三个可审计的检查层：规范化负责解码 base64、rot13 与零宽字符等技巧，子串规则捕获手写短语，正则规则捕获一类模式。无害 prompt（蓝色）顺利通过；攻击输入（橙色）触发规则，聚合器给出置信度与类别，而非凭感觉判断。"
    },
    "patterns": [],
    "preserve": []
  },
  "safety-checkpoints": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "SAFETY GATE": "安全关卡",
      "pre · during · post": "生成前 · 生成中 · 生成后",
      "pre-gen": "生成前",
      "detector": "检测器",
      "model": "模型",
      "mock LLM": "模拟 LLM",
      "during-gen": "生成中",
      "token filter": "token 过滤器",
      "post-gen": "生成后",
      "classifier": "分类器",
      "block": "阻止",
      "terminate": "终止",
      "final action": "最终动作",
      "per-request audit trace": "每个请求的审计轨迹",
      "One request crosses three checkpoints. Pre-gen the detector can block outright; during-gen a token filter can terminate the stream early on a forbidden phrase; post-gen the classifier and rules engine inspect the full output. The gate aggregates the verdicts, applies a final action, and draws an audit trace every reviewer can read.": "每个请求都要经过三道检查。生成前，检测器可以直接阻止请求；生成中，token 过滤器遇到禁用短语可提前终止流；生成后，分类器与规则引擎检查完整输出。关卡汇总各次判定，应用最终动作，并生成可供每位审查者阅读的审计轨迹。"
    },
    "patterns": [],
    "preserve": []
  }
};
