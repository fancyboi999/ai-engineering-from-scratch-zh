(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-capstone-i.js"] = {
  "ci-chunk-boundaries": {
    "text": {
      "Motion reduced": "已减少动画",
      "CHUNK BOUNDARIES": "分块边界",
      "same doc · three cut plans": "同一文档 · 三种切分方案",
      "Every strategy cuts the same document at different offsets. The fixed 512-token window slices straight through the gold answer span, so the two halves embed into different clusters and recall drops before the retriever even runs. Sentence and structural markdown splitters respect the boundaries the text already carries.": "每种策略都在不同位置切分同一份文档。固定的 512-token 窗口直接切断标准答案片段，使两半被嵌入到不同聚类中；检索器尚未运行，召回率就已下降。按句子和 Markdown 结构切分会遵循文本原有的边界。",
      "document": "文档",
      "gold answer span": "标准答案片段",
      "fixed 512": "固定 512",
      "sentence": "句子",
      "markdown": "Markdown 结构",
      "fixed-window slices the span; markdown keeps it whole": "固定窗口切断答案片段；Markdown 切分保留完整片段",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "ci-rag-metric-ladder": {
    "text": {
      "Motion reduced": "已减少动画",
      "RAG EVAL SWEEP": "RAG 全面评测",
      "rank by rank · six metrics": "逐项遍历排序 · 六项指标",
      "The evaluator walks the ranked list once. Each gold document it passes updates precision and recall; the position of the first gold hit fixes MRR; the discounted positions fix nDCG. Faithfulness and answer relevance are computed afterwards on the generated answer, which is why a perfect retrieval score can still ship a wrong response.": "评估器遍历一次排序列表。每经过一篇标准相关文档，就更新精确率与召回率；首次命中的位置决定 MRR，各命中位置的折扣值决定 nDCG。忠实度和回答相关性则在生成回答后计算，因此检索得分完美也可能输出错误回答。",
      "retrieved top-5": "检索前 5 项",
      "gold doc": "标准相关文档",
      "doc": "文档",
      "metric panel": "指标面板",
      "faithfulness + relevance": "忠实度 + 相关性",
      "grade the answer, not the rank": "评价回答，而非排序",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "precision@5 = 2/5",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      },
      {
        "text": "recall@5    = 2/3",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      },
      {
        "text": "MRR         = 1.0",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      },
      {
        "text": "nDCG@5      = 0.86",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      }
    ]
  },
  "ci-task-spec-gate": {
    "text": {
      "Motion reduced": "已减少动画",
      "TASK SPEC GATE": "任务规格校验关卡",
      "validate · dispatch · reject": "校验 · 分派 · 拒绝",
      "Every line of tasks.jsonl is validated independently before it reaches the runner: required fields present, metric_name inside the closed vocabulary, targets typed correctly. A malformed record is diverted and logged; the run continues. Freezing this gate is what lets lessons 71 through 75 dispatch on a single field.": "tasks.jsonl 中的每一行进入运行器前都会独立校验：必需字段是否齐全、metric_name 是否属于封闭词汇表、目标值类型是否正确。格式错误的记录会被分流并记录日志，整次运行继续进行。固定这道关卡后，第 71 至 75 课就能通过单个字段分派任务。",
      "validator": "校验器",
      "schema · metric vocab · types": "schema · 指标词汇表 · 类型",
      "runner": "运行器",
      "bad line aborts the record, not the run": "错误行只中止该记录，不中止整次运行",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "tasks.jsonl",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      }
    ]
  },
  "ci-leaderboard-ci": {
    "text": {
      "Motion reduced": "已减少动画",
      "LEADERBOARD + BOOTSTRAP CI": "排行榜与自助法置信区间",
      "rank · then doubt the rank": "先排序 · 再检验排序是否可靠",
      "The aggregator turns per-task EvalRun records into per-model means, then resamples tasks with replacement to put a bootstrap confidence interval on each mean. Model A leads model B on the point estimate, but the intervals overlap, so the pairwise difference CI is the number that decides whether the ranking is real or sampling noise.": "聚合器把每项任务的 EvalRun 记录汇成每个模型的均分，再对任务有放回抽样，为各均分计算自助法置信区间。模型 A 的点估计高于模型 B，但区间重叠；因此，要判断排名差异是真实效果还是采样噪声，应查看两者差值的置信区间。",
      "mean score, bootstrap 95% CI": "平均分与自助法 95% 置信区间",
      "model A": "模型 A",
      "model B": "模型 B",
      "model C": "模型 C",
      "CIs overlap: gap may be noise": "置信区间重叠：差距可能来自噪声",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "ci-ring-allreduce": {
    "text": {
      "Motion reduced": "已减少动画",
      "RING ALLREDUCE": "环形全归约",
      "reduce-scatter · allgather": "归约散播 · 全聚合",
      "Each rank owns one chunk of the tensor and only ever talks to its ring neighbour. In the reduce-scatter pass a chunk accumulates partial sums as it hops N-1 times; in the allgather pass the finished sums rotate back around. No root, no bottleneck: per-rank traffic stays at 2T(N-1)/N bytes no matter how many ranks join.": "每个 rank 拥有张量的一个块，且只与环上的相邻 rank 通信。在归约散播阶段，一个块经过 N-1 跳并累积局部和；在全聚合阶段，完整求和结果再沿环传播。没有根节点，也没有单点瓶颈：无论加入多少个 rank，每个 rank 的通信量始终是 2T(N-1)/N 字节。",
      "pass 1 · reduce-scatter": "第 1 轮 · 归约散播",
      "N-1 hops, sums build up": "经过 N-1 跳，逐步累加求和",
      "pass 2 · allgather": "第 2 轮 · 全聚合",
      "N-1 hops, sums fan out": "经过 N-1 跳，传播完整求和结果",
      "2T(N-1)/N bytes per rank": "每个 rank 传输 2T(N-1)/N 字节",
      "independent of cluster size": "不随集群规模变化",
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
  "ci-ddp-grad-sync": {
    "text": {
      "Motion reduced": "已减少动画",
      "DDP GRADIENT SYNC": "DDP 梯度同步",
      "hook · bucket · overlap": "钩子 · 分桶 · 重叠执行",
      "A backward hook on every parameter drops its gradient into a bucket. The moment bucket 1 fills, its allreduce launches on the wire while layers 2 and 1 are still backpropagating, so communication hides behind compute. One broadcast at construction made all replicas identical; the summed gradients keep them identical every step.": "每个参数上的反向传播钩子会把梯度放入桶中。第 1 桶一满就立即发起全归约，此时第 2 层和第 1 层仍在反向传播，因此通信与计算可以重叠。构建时的一次广播使所有副本初始状态一致，之后每步的梯度求和继续维持这种一致性。",
      "backward pass": "反向传播",
      "grads flow this way": "梯度沿此方向流动",
      "layer 1": "第 1 层",
      "layer 2": "第 2 层",
      "layer 3": "第 3 层",
      "layer 4": "第 4 层",
      "bucket 1": "第 1 桶",
      "bucket 0": "第 0 桶",
      "allreduce wire, runs while backward continues": "全归约通信与反向传播同时进行",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "ci-sharded-checkpoint": {
    "text": {
      "Motion reduced": "已减少动画",
      "SHARDED CHECKPOINT": "分片检查点",
      "parallel write · atomic rename": "并行写入 · 原子重命名",
      "Every rank streams its own shard to a temp file at the same time, so write bandwidth scales with the cluster instead of one gather bottleneck. Only after all shards land does the rename flip the temp files and the manifest live. Resume reads the manifest first, checks world size and hashes, and fails loudly on any mismatch.": "每个 rank 同时把自己的分片流式写入临时文件，写入带宽因而能随集群扩展，避免单点聚合瓶颈。所有分片落盘后，才通过重命名使临时文件与清单一起生效。恢复时先读清单，核对进程数和哈希；任何不匹配都会明确报错。",
      "rename: all shards flip at once": "重命名：所有分片同时切换",
      "manifest": "清单",
      "world=4 · sha256": "进程数=4 · sha256",
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
      },
      {
        "text": "rank0.bin.tmp",
        "reason": "检查点文件名是机器读取路径，原样保留。"
      },
      {
        "text": "rank1.bin.tmp",
        "reason": "检查点文件名是机器读取路径，原样保留。"
      },
      {
        "text": "rank2.bin.tmp",
        "reason": "检查点文件名是机器读取路径，原样保留。"
      },
      {
        "text": "rank3.bin.tmp",
        "reason": "检查点文件名是机器读取路径，原样保留。"
      },
      {
        "text": "rank0.bin",
        "reason": "检查点文件名是机器读取路径，原样保留。"
      },
      {
        "text": "rank1.bin",
        "reason": "检查点文件名是机器读取路径，原样保留。"
      },
      {
        "text": "rank2.bin",
        "reason": "检查点文件名是机器读取路径，原样保留。"
      },
      {
        "text": "rank3.bin",
        "reason": "检查点文件名是机器读取路径，原样保留。"
      }
    ]
  },
  "ci-distributed-assembly": {
    "text": {
      "Motion reduced": "已减少动画",
      "DISTRIBUTED ASSEMBLY": "分布式组件集成",
      "compose · run 20 steps": "组合组件 · 运行 20 步",
      "Each piece was built and tested alone; the capstone proves they compose. DDP broadcast syncs the initial weights once, the ZeRO-1 step replaces optimiser.step every iteration, and the sharded checkpoint fires at step 10. The run self-terminates after 20 steps only if all four invariants hold on every rank.": "各组件此前已独立构建并测试，综合项目要证明它们能够组合工作。DDP 广播只同步一次初始权重；每次迭代用 ZeRO-1 更新替代 optimiser.step；第 10 步保存分片检查点。只有四项不变量在所有 rank 上始终成立，运行才会在第 20 步自行正常结束。",
      "DDP broadcast": "DDP 广播",
      "lesson 77": "第 77 课",
      "ZeRO-1 step": "ZeRO-1 更新",
      "lesson 78": "第 78 课",
      "sharded ckpt": "分片检查点",
      "lesson 80": "第 80 课",
      "4 ranks · tiny GPT · gloo CPU": "4 个 rank · 小型 GPT · gloo CPU",
      "step 0": "第 0 步",
      "20 · exit 0": "20 · 退出码 0",
      "ckpt @ step 10": "第 10 步保存检查点",
      "invariants: loss falls · ranks agree · 12P/N optimiser bytes · resume byte-equal": "不变量：损失下降 · 各 rank 一致 · 优化器占用 12P/N 字节 · 恢复后字节相同",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "for step in 1..20",
        "reason": "保留代码、协议字面量、产品名或教学示例数据，避免改变示例语义。"
      }
    ]
  },
  "ci-refusal-quadrant": {
    "text": {
      "Motion reduced": "已减少动画",
      "REFUSAL QUADRANT": "拒绝行为四象限",
      "two failure modes · not one": "两种失误类型，并非一种",
      "The evaluator treats the assistant as a binary classifier on prompt safety. Safe prompts that get refused land in the over-refusal cell; unsafe prompts that get answered land in the under-refusal cell. Both off-diagonal cells are bugs, measured separately per taxonomy category, with ECE tracking whether the model knows when it is right.": "评估器把助手视为一个判断 prompt 安全性的二分类器。安全 prompt 被拒绝属于过度拒绝；不安全 prompt 得到回答属于拒绝不足。两个非对角线象限都代表错误，需要按分类体系中的各类别分别衡量；ECE 则检查模型是否知道自己的判断何时正确。",
      "answered": "已回答",
      "refused": "已拒绝",
      "safe": "安全",
      "unsafe": "不安全",
      "correct": "正确",
      "over-refusal": "过度拒绝",
      "under-refusal": "拒绝不足",
      "labeled prompt set": "带标签的 prompt 集合",
      "plus ECE: does stated confidence match accuracy per bin": "再看 ECE：每个分桶中的置信度与准确率是否一致",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  }
};
