(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-infra.js"] = {
  "cost-per-token": {
    "text": {
      "/ 1M tokens": "/ 1M token"
    },
    "patterns": [
      [
        "^\\$([\\d.]+)/hr GPU  ·  ([\\d,]+) tokens/sec  ·  ([\\d.]+)M tokens/hr served$",
        "GPU 每小时 美元 $1 · 每秒 $2 token · 每小时服务 $3M token"
      ],
      [
        "^cost/1M = \\(price/hr\\) / \\(tokens/sec × 3600\\) × 10⁶ = \\(([\\d.]+) / ([\\d,]+)\\) × 10⁶ = \\$([\\d.]+)$",
        "每 1M token 成本 = (每小时价格) / (每秒 token × 3600) × 10⁶ = ($1 / $2) × 10⁶ = 美元 $3"
      ]
    ],
    "preserve": [
      {
        "text": "/ 1M token",
        "reason": "计价单位与 token 技术名，保持原样。"
      }
    ]
  },
  "autoscaling": {
    "text": {
      "AUTOSCALING": "自动扩缩容",
      "An autoscaler adds and removes replicas so that the offered load stays within capacity and latency holds under its target. The replica count is the load divided by what one replica can serve, rounded up. Raise the QPS and replicas spin up; lower it and they scale back down, which is what keeps both latency and cost in check.": "自动扩缩容增减副本，使到来的负载不超容量、延迟稳在目标之内。副本数就是负载除以单副本服务能力再向上取整。QPS 上调，副本转起来；下调，再缩回去——延迟和成本就是这样同时被按住的。",
      "replicas": "副本数"
    },
    "patterns": [
      [
        "^(\\d+) QPS  ·  (\\d+) QPS per replica  ·  headroom (\\d+) QPS keeps latency under target$",
        "$1 QPS · 每副本 $2 QPS · $3 QPS 的余量使延迟低于目标"
      ],
      [
        "^replicas = ceil\\(QPS / per-replica capacity\\) = ceil\\((\\d+) / (\\d+)\\) = (\\d+)$",
        "副本数 = ceil(QPS / 单副本容量) = ceil($1 / $2) = $3"
      ],
      [
        "^\\+ (\\d+) more$",
        "另有 $1 个"
      ]
    ],
    "preserve": []
  },
  "tensor-parallel": {
    "text": {
      "TENSOR PARALLELISM": "张量并行",
      "A single large matmul is split across GPUs by partitioning the weight matrix into column blocks. Each GPU multiplies the full input by its slice, producing a partial output, then an all-gather stitches the slices into the complete result. The parameters per GPU drop by the GPU count, which is how one layer too big for a single device gets served.": "单个大矩阵乘法按权重矩阵的列块切到多块 GPU 上。每块 GPU 用完整输入乘自己的切片得到部分输出，再由一次 all-gather 把切片拼成完整结果。每 GPU 参数量按 GPU 数下降——单卡放不下的一层就是这样被服务起来的。",
      "all-gather partial outputs into the full result": "全聚合局部输出，得到完整结果",
      "columns / GPU": "列数 / GPU"
    },
    "patterns": [
      [
        "^weight matrix W is split column-wise across (\\d+) GPUs  ·  each holds 1/(\\d+) of the parameters$",
        "权重矩阵 W 按列拆分到 $1 个 GPU · 每个保存 1/$2 的参数"
      ],
      [
        "^Y = X·W  with W = \\[W₁ \\| … \\| Wₙ\\],  each GPU computes X·Wᵢ then all-gather  ·  mem/GPU ≈ d/(\\d+) cols = (\\d+)$",
        "Y = X·W，其中 W = [W₁ | … | Wₙ]；每个 GPU 计算 X·Wᵢ 后执行全聚合 · 每 GPU 内存 ≈ d/$1 列 = $2"
      ],
      [
        "^Y = X·W  with W = \\[W₁ \\| … \\| (W[₁-₉ₙ])\\],  each GPU computes X·Wᵢ then all-gather  ·  mem/GPU ≈ d/(\\d+) cols = (\\d+)$",
        "Y = X·W，其中 W = [W₁ | … | $1]；每个 GPU 计算 X·Wᵢ 后执行全聚合 · 每 GPU 内存 ≈ d/$2 列 = $3"
      ]
    ],
    "preserve": [
      {
        "text": "GPU 1",
        "reason": "GPU 设备技术名称与编号，原样保留。"
      },
      {
        "text": "GPU 2",
        "reason": "GPU 设备技术名称与编号，原样保留。"
      },
      {
        "text": "GPU 3",
        "reason": "GPU 设备技术名称与编号，原样保留。"
      },
      {
        "text": "GPU 4",
        "reason": "GPU 设备技术名称与编号，原样保留。"
      },
      {
        "text": "GPU 5",
        "reason": "GPU 设备技术名称与编号，保持原样。"
      },
      {
        "text": "GPU 6",
        "reason": "GPU 设备技术名称与编号，保持原样。"
      },
      {
        "text": "GPU 7",
        "reason": "GPU 设备技术名称与编号，保持原样。"
      },
      {
        "text": "GPU 8",
        "reason": "GPU 设备技术名称与编号，保持原样。"
      }
    ]
  },
  "roofline": {
    "text": {
      "ROOFLINE": "Roofline 模型",
      "Arithmetic intensity is the FLOPs a kernel does per byte it moves. On the left the slanted roof means performance is capped by memory bandwidth; on the right the flat roof means it is capped by raw compute. The ridge is where the two meet. A kernel below and left of the ridge (orange) is memory-bound, and the fix is more data reuse, not a faster chip.": "算术强度是 kernel 每搬一字节做的 FLOP 数。左边斜的屋顶意味着性能被内存带宽封顶；右边平的屋顶意味着被纯算力封顶。屋脊是两者相交处。落在屋脊左下方的 kernel（橙色）是内存受限的，解法是更多的数据复用，而不是更快的芯片。",
      "memory-bound": "受内存带宽限制",
      "compute-bound": "受计算能力限制"
    },
    "patterns": [
      [
        "^ridge ([\\d.]+) FLOP/B$",
        "转折点 $1 FLOP/B"
      ],
      [
        "^at AI ([\\d.]+) FLOP/B$",
        "计算强度 AI $1 FLOP/B"
      ],
      [
        "^attainable ([\\d.]+) GFLOP/s  ·  starved on memory bandwidth: feed it more reuse$",
        "可达性能 $1 GFLOP/s · 内存带宽不足：提高数据复用"
      ],
      [
        "^attainable ([\\d.]+) GFLOP/s  ·  compute-bound: more reuse no longer helps$",
        "可达性能 $1 GFLOP/s · 受计算能力限制：继续复用数据不再有帮助"
      ],
      [
        "^attainable = min\\(peak compute, bandwidth × AI\\)  ·  ridge at AI = peak/BW = ([\\d.]+) FLOP/byte$",
        "可达性能 = min(峰值算力, 带宽 × AI) · 转折点 AI = 峰值算力/带宽 = $1 FLOP/字节"
      ],
      [
        "^attainable ([\\d.]+) GFLOP/s  ·  saturating the compute units: near peak$",
        "可达性能 $1 GFLOP/s · 计算单元趋于饱和：接近峰值"
      ]
    ],
    "preserve": []
  },
  "pipeline-parallel": {
    "text": {
      "PIPELINE PARALLELISM": "流水线并行",
      "The model is split into stages, one per GPU, and micro-batches flow through them like an assembly line. While the pipeline fills and drains some stages sit idle, the grey bubble. The bubble fraction is (stages minus one) over (micro-batches plus stages minus one), so feeding more micro-batches amortizes the fixed fill-and-drain cost toward zero.": "模型按阶段切开，每阶段一块 GPU，micro-batch 像流水线一样穿过它们。流水线灌入和排空时部分阶段闲着，就是灰色气泡。气泡占比为 (阶段数−1)/(micro-batch 数+阶段数−1)，所以喂更多 micro-batch 能把固定的灌排成本摊薄到接近零。",
      "% bubble (idle)": "% 气泡（空闲）"
    },
    "patterns": [
      [
        "^(\\d+) micro-batches across (\\d+) stages  ·  grey cells are idle pipeline bubble at fill and drain$",
        "$1 个微批次经过 $2 个阶段 · 灰格表示流水线填充与排空时的空闲气泡"
      ],
      [
        "^bubble fraction = \\(stages − 1\\) / \\(micro-batches \\+ stages − 1\\) = (\\d+) / (\\d+) = ([\\d.]+)%$",
        "气泡比例 = (阶段数 − 1) / (微批次数 + 阶段数 − 1) = $1 / $2 = $3%"
      ]
    ],
    "preserve": []
  },
  "throughput-latency": {
    "text": {
      "THROUGHPUT / LATENCY": "吞吐 / 延迟",
      "Blue is throughput, the dashed grey line is per-request latency. Bigger batches keep the GPU busier so total tokens per second climbs, but each individual request waits longer behind the others, so latency rises too. The knee (orange) is where throughput stops growing much while latency keeps climbing, which is the batch size most serving systems aim for.": "蓝色是吞吐，灰虚线是单请求延迟。批越大 GPU 越忙，总 token/秒爬升，但每个请求要在别人后面等更久，延迟也跟着涨。拐点（橙色）是吞吐增长趋缓而延迟继续爬的地方——多数推理服务瞄准的就是这个批大小。",
      "tokens/sec": "token/秒"
    },
    "patterns": [
      [
        "^batch (\\d+)  ·  per-request latency (\\d+) ms  ·  knee near batch (\\d+) \\(orange\\)$",
        "批大小 $1 · 每请求延迟 $2 ms · 拐点位于批大小 $3 附近（橙色）"
      ],
      [
        "^larger batch → throughput rises toward saturation, latency rises linearly  ·  pick batch at the knee for the best of both$",
        "批次增大 → 吞吐量逐渐饱和，延迟线性增长 · 在拐点选择批大小，兼顾两者"
      ]
    ],
    "preserve": []
  },
  "gpu-memory-breakdown": {
    "text": {
      "GB total": "GB 总量"
    },
    "patterns": [
      [
        "^⚠ exceeds (\\d+)% of one (\\d+) GB GPU  ·  optimizer states dominate at training time$",
        "⚠ 占单个 $2 GB GPU 容量的 $1%，已超限 · 训练时优化器状态占主要部分"
      ],
      [
        "^([\\d.]+)B params × \\(2 \\+ 2 \\+ 12\\) B = ([\\d.]+) GB fixed, \\+ ([\\d.]+) GB activations$",
        "$1B 参数 × (2 + 2 + 12) B = $2 GB 固定内存，加上 $3 GB 激活值"
      ],
      [
        "^(\\d+)% of one (\\d+) GB GPU  ·  optimizer states dominate at training time$",
        "占单个 $2 GB GPU 容量的 $1% · 训练时优化器状态占主要部分"
      ]
    ],
    "preserve": []
  },
  "zero-sharding": {
    "text": {
      "stage 0": "阶段 0",
      "stage 1": "阶段 1",
      "stage 2": "阶段 2",
      "stage 3": "阶段 3",
      "bytes / param / GPU": "字节 / 参数 / GPU",
      "2.00 B/param": "2.00 B/参数",
      "0.25 B/param": "0.25 B/参数",
      "1.50 B/param": "1.50 B/参数"
    },
    "patterns": [
      [
        "^ZeRO stage (\\d+)  ·  (\\d+) GPUs  ·  optimizer states \\+ gradients sharded$",
        "ZeRO 阶段 $1 · $2 个 GPU · 优化器状态与梯度均分片"
      ],
      [
        "^full footprint (\\d+) B/param  →  sharded components divided across (\\d+) GPUs  →  ([\\d.]+) B/param per GPU$",
        "完整占用 $1 B/参数 → 分片组件分摊到 $2 个 GPU → 每 GPU $3 B/参数"
      ],
      [
        "^ZeRO stage 0  ·  (\\d+) GPUs  ·  nothing sharded \\(plain data parallel\\)$",
        "ZeRO 阶段 0 · $1 个 GPU · 不分片（普通数据并行）"
      ],
      [
        "^ZeRO stage 1  ·  (\\d+) GPUs  ·  optimizer states sharded$",
        "ZeRO 阶段 1 · $1 个 GPU · 优化器状态分片"
      ],
      [
        "^ZeRO stage 3  ·  (\\d+) GPUs  ·  optimizer states \\+ gradients \\+ parameters sharded$",
        "ZeRO 阶段 3 · $1 个 GPU · 优化器状态、梯度和参数均分片"
      ],
      [
        "^([\\d.]+) B/param$",
        "$1 B/参数"
      ]
    ],
    "preserve": []
  },
  "data-parallel": {
    "text": {
      "DATA PARALLELISM": "数据并行",
      "Each GPU holds a complete copy of the model and processes a different slice of the global batch. After the backward pass an all-reduce sums every GPU’s gradients so the copies stay identical. Throughput scales close to linearly with GPU count, but memory does not drop because every device still stores the whole model.": "每块 GPU 持有完整的模型副本，处理全局批的不同切片。反向传播之后，一次 all-reduce 把所有 GPU 的梯度求和，使各副本保持一致。吞吐随 GPU 数接近线性扩展，但显存并不下降，因为每台设备仍存整个模型。",
      "full copy": "完整副本",
      "throughput (ideal)": "吞吐量（理想值）"
    },
    "patterns": [
      [
        "^(\\d+) rows$",
        "$1 行"
      ],
      [
        "^all-reduce gradients across (\\d+) GPUs$",
        "在 $1 个 GPU 之间全归约梯度"
      ],
      [
        "^global batch (\\d+) split into (\\d+) shards of (\\d+)  ·  each GPU holds a full model copy$",
        "全局批大小 $1 拆分成 $2 个分片，每片 $3 项 · 每个 GPU 保存完整模型副本"
      ],
      [
        "^per-GPU batch = ceil\\((\\d+) / (\\d+)\\) = (\\d+)  ·  gradients summed by all-reduce, weights stay in sync$",
        "每 GPU 批大小 = ceil($1 / $2) = $3 · 全归约汇总梯度，保持权重同步"
      ]
    ],
    "preserve": [
      {
        "text": "GPU 1",
        "reason": "GPU 设备技术名称与编号，原样保留。"
      },
      {
        "text": "GPU 2",
        "reason": "GPU 设备技术名称与编号，原样保留。"
      },
      {
        "text": "GPU 3",
        "reason": "GPU 设备技术名称与编号，原样保留。"
      },
      {
        "text": "GPU 4",
        "reason": "GPU 设备技术名称与编号，原样保留。"
      },
      {
        "text": "GPU 5",
        "reason": "GPU 设备技术名称与编号，保持原样。"
      },
      {
        "text": "GPU 6",
        "reason": "GPU 设备技术名称与编号，保持原样。"
      },
      {
        "text": "GPU 7",
        "reason": "GPU 设备技术名称与编号，保持原样。"
      },
      {
        "text": "GPU 8",
        "reason": "GPU 设备技术名称与编号，保持原样。"
      }
    ]
  }
};
