const lesson = (path, title) => ({ href: `/lesson?path=${encodeURIComponent(path)}`, title });
const manual = (anchor, title) => ({ href: `/manual-sglang-101/${anchor.replace(/^s-/, "")}`, title });
const P17 = "phases/17-infrastructure-and-production/";

export const PART_ORDER = ["ingress", "tokenizer", "scheduler", "link", "sms", "l2", "weights", "pool", "detok", "package", "cooler"];

export const NAMES = {
  ingress: "提示词入口",
  tokenizer: "分词器",
  scheduler: "调度器",
  link: { l4: "PCIe Gen4 x16", gb10: "NVLink-C2C" },
  sms: "SM 与 Tensor Core",
  l2: "L2 缓存",
  weights: "模型权重",
  pool: "KV 缓存池",
  detok: "解码器",
  package: "芯片封装",
  cooler: "散热器",
};

export const INFO = {
  ingress: {
    name: "网络端口",
    is: "请求进入机器、回答离开机器的接口。",
    does: {
      l4: "请求经网络到达主机 CPU。GPU 看不到文本，只会接收主机通过 PCIe 发送的 token ID。",
      gb10: "请求经网络到达 GB10 的 CPU 小芯片。CPU 和 GPU 共用内存，因此文本和 token ID 无须穿过扩展卡插槽。",
    },
    why: "推理引擎由 CPU 上的三个进程和 GPU 上的一个模型组成。端口是系统的入口。",
    without: "请求无法到达引擎。",
    lesson: manual("s-what-the-server-does-with-your-request", "SGLang 101 · 1.3：服务器如何处理请求"),
  },
  tokenizer: {
    name: "分词器进程",
    is: "三个 SGLang 进程中的第一个，运行在 CPU 上。",
    does: { l4: "它在主机 CPU 上把提示词文本转换为 token ID。负载测试使用 512 个 ID；最长的共享提示词最多有 4,224 个。", gb10: "它在 20 个 Arm 核心之一上把提示词转换为 token ID。图中把它放在第一个 10 核集群。" },
    why: "模型读取的是 token ID，而不是文本。ID 数量决定请求占用多少 KV 缓存。",
    without: "调度器没有可统计的输入长度，因此无法接纳请求。",
    lesson: manual("s-sglang-serve-and-the-three-processes", "SGLang 101 · 2.1：三个进程"),
  },
  scheduler: {
    name: "调度器进程",
    is: "决定下一步交给 GPU 处理哪些请求的进程。",
    does: { l4: "只有 KV 缓存池能容纳提示词和输出时，它才会接纳请求。L4 使用 BF16 时，缓存池可容纳 24,094 个 token，因此能放下 37 个各含 640 个 token 的请求。查找共享前缀的 radix tree 也在这里。", gb10: "只有 KV 缓存池还有空间时，它才会接纳请求。GB10 使用 BF16 时，缓存池可容纳 234,600 个 token，64 个请求约占 17%。查找共享前缀的 radix tree 也在这里。" },
    why: "缓存池是硬性上限。每次接纳请求时，都要先判断内存是否够用。",
    without: "请求会超出缓存池容量，引擎只能在解码过程中撤回请求。",
    lesson: manual("s-admission-and-retraction", "SGLang 101 · 2.3：请求接纳与撤回"),
  },
  link: {
    name: { l4: "PCIe Gen4 x16 插槽与转接板", gb10: "小芯片之间的 NVLink-C2C" },
    is: { l4: "连接主机和扩展卡的总线。NVIDIA 为 L4 列出的接口是 PCIe Gen4 x16。", gb10: "连接 CPU 小芯片与 GPU 小芯片的片间链路。NVIDIA 给出的 GPU 总带宽约为 600 GB/s。" },
    does: { l4: "每个请求的 token ID 经过这里传输一次。未启用 CUDA graphs 时，主机还会通过它发送每一步解码中的每次 kernel 启动命令。", gb10: "GPU 小芯片通过这条链路，从共享 LPDDR5X 读取 token ID、权重和 KV 缓存。内存控制器位于 CPU 小芯片上。" },
    why: "启动 kernel 只需几微秒，一步解码却需要几十毫秒。因此，启动间隔远短于读取权重的时间。在 L4 上，最多 16 个用户时，CUDA graphs 让实测单步时间变化不到 1%。",
    without: { l4: "GPU 没有输入，也无事可做。", gb10: "内存子系统位于另一个小芯片上，GPU 小芯片无法读取内存。" },
    lesson: manual("s-forwardmode-and-cuda-graphs", "SGLang 101 · 4.1：CUDA graphs"),
  },
  sms: {
    name: { l4: "58 个流式多处理器", gb10: "GPU 小芯片上的 SM 区域" },
    is: { l4: "AD104 芯片上的计算单元。NVIDIA 列出了 5 个 GPC、58 个 SM，每个 SM 含 4 个第四代 Tensor Core，共 232 个。", gb10: "Blackwell GPU 小芯片上的计算单元。NVIDIA 列出了 6,144 个 CUDA core 和第五代 Tensor Core，但没有公开 SM 数量，因此图中用抽象方块表示。" },
    does: "Prefill 会一次把数百或数千个 token 送入每一层，因此 Tensor Core 一直忙于计算。Decode 每个运行中的请求每步只送入一个 token，所以 SM 大部分时间都在等待权重。",
    why: "同一块芯片在 prefill 阶段受计算能力限制，在 decode 阶段受内存带宽限制。",
    without: "没有计算发生。",
    lesson: lesson(P17 + "08-inference-metrics-goodput", "推理指标与 goodput"),
  },
  l2: {
    name: { l4: "48 MB L2 缓存", gb10: "24 MB 图形 L2 缓存" },
    is: "位于内存控制器与 SM 之间的缓存。",
    does: { l4: "权重会经过 L2 才能到达 SM。48 MB 的容量只能存下 16.41 GB BF16 权重的约 0.3%，因此每一步解码都要从 GDDR6 重新读取权重。", gb10: "权重会经过 24 MB 图形 L2 才能到达 SM。模型权重有几十 GB，因此每一步解码都要从 LPDDR5X 重新读取选中的专家。" },
    why: "缓存适合保存很快会再次使用的数据。大模型的权重每步使用一次，而且远大于缓存容量。",
    without: "SM 会直接访问内存，省去中间缓存；整体差异不大，因为运行速度仍由内存带宽决定。",
    lesson: manual("s-forwardmode-and-cuda-graphs", "SGLang 101 · 4.1"),
  },
  weights: {
    name: { l4: "GDDR6 中的权重", gb10: "LPDDR5X 中的权重" },
    is: { l4: "存放模型的内存区域。启动日志显示，Qwen3-8B 的 BF16 权重占 15.28 GB，FP8 检查点占 8.81 GB。", gb10: "存放模型的统一内存区域。启动日志显示，Qwen3-30B-A3B 的 BF16 权重占 57.75 GB，FP8 权重占 29.75 GB。" },
    does: { l4: "内存交错分布在 32 位通道上，因此每个封装都会保存每个张量的一部分。解码时，六个通道会同时读取全部权重。峰值带宽为 300 GB/s 时，读取 16.41 GB 需要 54.7 ms。单用户实测一步耗时 60.16 ms。", gb10: "该模型采用混合专家结构，因此每步解码只会读取 token 选中的专家。内存由 CPU 共用，带宽为 273 GB/s。" },
    why: "这次读取决定了解码速度。减少一半字节数就能缩短单步时间：L4 单用户实测从 60.16 ms 降到 39.66 ms。",
    without: "模型权重不存在。",
    lesson: lesson(P17 + "09-production-quantization", "生产环境中的量化"),
  },
  pool: {
    name: "KV 缓存池",
    is: "存放所有运行中请求和已缓存前缀的 key、value 的 token 槽位。",
    does: "SGLang 会在启动时根据内存比例确定缓存池大小，并以 token 计量。封装中的每个方格表示池的一部分。黄色方格属于当前请求，蓝绿色方格属于其他请求，橙色方格表示 radix tree 可以复用的共享前缀。",
    why: "缓存池大小决定能容纳多少用户。L4 使用 FP8 后，容量从 24,094 增至 142,369 个 token。内存比例为 0.74 时，BF16 缓存池缩到 6,559 个 token，四个各含 2,048 个 token 的前缀便无法同时放入。",
    without: "每一步解码都得重新计算整段对话的 key 和 value。",
    lesson: manual("s-kv-bytes-per-token-and-the-kv-pool", "SGLang 101 · 3.1：KV 缓存池"),
  },
  detok: {
    name: "解码器进程",
    is: "三个 SGLang 进程中的第三个，运行在 CPU 上。",
    does: "它把新生成的 token ID 转换回文本，并流式发送给客户端。",
    why: "流式输出让用户在等待首 token 时间之后就能开始阅读，无须等到完整回答生成完毕。",
    without: "客户端只能收到 token ID，或者等待整个回答。",
    lesson: manual("s-streaming-stop-strings-and-the-openai-api", "SGLang 101 · 2.5：流式输出"),
  },
  package: {
    name: { l4: "GPU 封装：基板、芯片和焊球", gb10: "GB10 封装：两颗小芯片位于同一基板" },
    is: { l4: "AD104 芯片位于基板上，基板下方是扩展卡上的焊球阵列。展开机器可查看各层。NVIDIA 未公开芯片尺寸和焊球数量，因此图中尺寸为合理示意。", gb10: "S 小芯片包含 CPU 和内存子系统；G 小芯片包含 GPU。两者采用台积电 3 nm 工艺和 2.5D 封装。展开机器可查看各层。" },
    does: "焊球把电源、内存和 PCIe 信号从电路板送入封装。芯片下方的凸点再把信号送入硅片。",
    why: "每一步解码时，每个权重的每个字节都要经过这些引脚。",
    without: "芯片既没有电源，也无法访问内存。",
    lesson: lesson(P17 + "28-self-hosted-serving-selection", "如何选择自托管推理方案"),
  },
  cooler: {
    name: { l4: "被动散热片", gb10: "散热器" },
    is: { l4: "L4 是一张 72 W 的被动散热卡，服务器风扇会推动气流穿过散热片。", gb10: "GB10 芯片的 CPU 和 GPU 合计热设计功耗为 140 W。" },
    does: "图中把散热器设为半透明，使芯片和内存仍然可见。展开机器可以把它移开。",
    why: { l4: "第一次 L4 测量时温度达到 87 °C，发生热降频，SM 频率降到 360 MHz。单用户每步耗时 103.38 ms，而正常值为 60.16 ms。", gb10: "芯片过热会降频。每次基准测试都要记录频率和温度。" },
    without: "频率下降，页面上的性能数字也会变差。",
    lesson: manual("s-sglang-benchmark-serving", "SGLang 101 · 5.1：记录 GPU 频率"),
  },
};

export const SCENARIOS = [
  { label: "L4 正常运行", note: "BF16、8 个用户、112.62 tok/s。", config: {} },
  { label: "单用户", note: "读取权重决定单步时间：60.16 ms。", config: { users: 1 } },
  { label: "缓存池已满", note: "64 个请求中可运行 37 个，另有 27 个等待。", config: { users: 64 } },
  { label: "64 个用户，FP8", note: "缓存池可容纳 142,369 个 token，吞吐 735.91 tok/s。", config: { dtype: "fp8", users: 64 } },
  { label: "小缓存池与长前缀", note: "内存比例 0.74、共享前缀 2,048 个 token：部分前缀无法放入。", config: { workload: "shared", shared: 2048, frac: "0.74" } },
  { label: "同一场景，使用 FP8", note: "107,299 个 token 的容量可以保留全部前缀。", config: { workload: "shared", shared: 2048, frac: "0.74", dtype: "fp8" } },
  { label: "关闭 radix cache", note: "重新计算 4,096 个共享 token。", config: { workload: "shared", shared: 4096, radix: false } },
  { label: "关闭 CUDA graphs", note: "60.63 ms 的单步耗时中，启动间隔为 0.47 ms。", config: { graphs: false, users: 1 } },
  { label: "显卡过热", note: "降频后，每步耗时 103.38 ms。", config: { clock: "hot", users: 1 } },
  { label: "GB10，单用户", note: "统一内存，每步耗时 32.52 ms。", config: { gpu: "gb10", users: 1 } },
  { label: "GB10 使用 FP8", note: "读取字节数减半，每步耗时 18.41 ms。", config: { gpu: "gb10", dtype: "fp8", users: 1 } },
];

export const BREAK_NOTES = [
  "缓存池容量不足：64 个用户中，BF16 缓存池只能容纳 37 个。",
  "共享前缀无法保留：内存比例 0.74 时，缓存池只剩 6,559 个 token。",
  "散热不足：显卡降频至 360 MHz。",
  "缓存失效：radix tree 已关闭。",
  "图执行已关闭：每个 kernel 都由主机逐个启动。",
];
