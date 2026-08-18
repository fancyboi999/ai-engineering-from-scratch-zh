# AI 工程术语表

当某节课、论文、模型卡或代码审查提到一个术语的速度快过解释它的速度时，请查阅这份术语表。先按准确术语或别名搜索，阅读直接定义，再通过实际使用说明把它和你能构建的系统联系起来。

每个词条归入一个学习分类。`相关术语` 会给出下一批值得了解的概念，而不是强制规定学习路径。定义描述的是常见的工程含义，但不同提供商的实际行为可能不同。若 API 契约或模型卡与通用定义冲突，以当前官方文档为准。

十二个分类分别是：数学与训练；模型与推理；数据与表示；检索与生成；Prompt 与上下文；Agent 与工具；评估与安全；AI-native 开发；基础设施与服务；可靠性与运维；安全与治理；多模态系统。

## A

### Activation Checkpointing
- **分类:** 数学与训练
- **实际含义:** 一种训练显存优化技术：只保存部分前向传播激活值，在反向传播时重新计算未保存的激活值。
- **为什么重要:** 它通过用额外计算换取更少的激活值存储，使你能在固定显存预算内训练更大的模型或更长的序列。
- **实际使用:** 对占显存较多的 transformer block 做 checkpoint，测量每步额外耗时，并将故障恢复 checkpoint 与激活值重算配置分开管理。
- **常见混淆:** Activation checkpointing 不是用于持久化训练状态的 checkpoint。它帮助一次前向和反向传播装进内存，却不能在运行崩溃后恢复训练。
- **相关术语:** Autograd, Backpropagation, Checkpoint, Mixed Precision
- **来源:** [Training Deep Nets with Sublinear Memory Cost](https://arxiv.org/abs/1604.06174)

### Activation Function
- **分类:** 数学与训练
- **常见说法:** 层与层之间的非线性运算。
- **实际含义:** 在线性层或仿射层之后应用的函数，用于引入非线性。没有它，带权重和偏置的多层组合会退化为一次仿射变换。ReLU、GELU 和 SiLU 都是常见选择。它的选择会直接影响训练期间梯度能否顺畅传播。
- **学习课程:** [Activation Functions](../phases/03-deep-learning-core/04-activation-functions/)
- **相关术语:** ReLU, Gradient, Backpropagation

### Adam (Optimizer)
- **分类:** 数学与训练
- **常见说法:** 不假思索就会用的优化器。
- **实际含义:** Adaptive Moment Estimation。它将梯度的指数滑动平均与梯度平方的指数滑动平均结合起来，进行偏差校正，并为每个参数自适应调整更新尺度。它是一个有用的基线，但仍需要合适的学习率和调度策略。
- **常见混淆:** Adam 是很强的基线，并不是放之四海皆准的最佳优化器。
- **来源:** [Adam paper](https://arxiv.org/abs/1412.6980)
- **相关术语:** AdamW, Optimizer, Learning Rate

### AdamW
- **分类:** 数学与训练
- **常见说法:** 修正了 weight decay 的 Adam。
- **实际含义:** Adam 的一种变体，将 weight decay 与基于梯度的参数更新解耦。相比在 Adam 经自适应缩放的梯度中加入 L2 惩罚，这让参数收缩行为更容易理解。
- **常见混淆:** 解耦的 weight decay 并不意味着 AdamW 总是最优。模型、数据和训练规模仍会决定最佳的优化器与调度策略。
- **来源:** [Decoupled Weight Decay Regularization](https://arxiv.org/abs/1711.05101)
- **相关术语:** Adam (Optimizer), Weight Decay, Optimizer

### Admission Control
- **分类:** 可靠性与运维
- **实际含义:** 在请求被接收前进行的准入闸门；它依据系统当前的容量、优先级和策略，决定请求是否可以进入容量受限的队列或服务。
- **为什么重要:** 在可控边界拒绝过量工作，能保护已准入请求免受队列增长、超时级联和资源耗尽的影响。
- **实际使用:** 估算请求成本，检查租户和系统容量，原子地预留所需预算；拒绝时明确哪个范围过载。只有在条件暂时存在且调用方重试预算允许时，才提供重试指引。
- **常见混淆:** Admission control 在接收前起作用。Load shedding 则可在入口、队列、依赖或其他过载边界拒绝或移除工作。
- **相关术语:** Load Shedding, Backpressure, Rate Limit, Saturation
- **来源:** [Google SRE: Handling Overload](https://sre.google/sre-book/handling-overload/)

### Agent
- **分类:** Agent 与工具
- **常见说法:** 能独自思考和行动的自主模型。
- **实际含义:** 一种软件系统，让模型为达成目标选择行动、观察工具或环境结果，并在编排策略下继续执行。Agent 可以使用循环、状态机、工作流引擎或人工审批；模型只是其中一个组件，并非整个系统。
- **为什么重要:** 可靠性来自模型周围的 harness、工具契约、状态、权限和验证机制。
- **实际使用:** 一个编程 agent 会读取仓库上下文、提出补丁、在沙箱中运行测试，并在部署前停下来等待审批。
- **常见混淆:** 自主性是委托权限的程度，并非每个 agent 都必须具备的属性。
- **学习课程:** [The Agent Loop](../phases/14-agent-engineering/01-the-agent-loop/)
- **相关术语:** Agent Harness, Agent State, Tool Contract, Human-in-the-Loop (HITL)

### Agent Harness
- **分类:** Agent 与工具
- **实际含义:** 模型周围的运行时，负责组装上下文、暴露工具、管理状态、施加限制、记录 trace，并决定 agent 应继续、重试、提问还是停止。
- **为什么重要:** 即使使用同一个模型，两个系统的表现也可能大相径庭，因为它们的 harness 提供了不同的上下文、工具、反馈与安全边界。
- **实际使用:** 你的 harness 可以限制一个 agent 最多进行五次工具调用，在每个被接受的补丁后持久化 checkpoint，并要求完成前通过指定测试命令。
- **常见混淆:** harness 的范围比 prompt 模板更大，但比完整产品更小。
- **学习课程:** [Minimal Agent Workbench](../phases/14-agent-engineering/32-minimal-agent-workbench/)
- **相关术语:** Agent, Tool Contract, Agent State, Verification Gate, Sandbox

### Agent Memory
- **分类:** Agent 与工具
- **实际含义:** 存储在模型外部、供后续 agent 步骤按需选取的信息，例如既往决策、用户偏好、任务过程片段或已验证事实。
- **为什么重要:** 它让 agent 在一个上下文窗口之外仍能保持连续性，而不必把所有历史事件都塞进每个 prompt。
- **实际使用:** 保存带来源的精简任务结果，仅在相关时检索，并允许用户查看或更正持久化的个人信息。
- **常见混淆:** Agent memory 不等同于 agent state。State 跟踪当前运行，memory 则保存供未来运行选择性使用的信息。
- **相关术语:** Agent State, Context Engineering, Checkpoint, Semantic Cache
- **来源:** [Generative Agents](https://arxiv.org/abs/2304.03442)

### Agent State
- **分类:** Agent 与工具
- **实际含义:** agent 跨步骤携带的显式数据，例如当前目标、已完成操作、工具结果、待解决问题、预算、审批和产物引用。
- **为什么重要:** 显式 state 能让长任务可恢复、可检查，也更少依赖模型从对话记录中重建进度。
- **实际使用:** 在一个类型化对象中保存已选择的 issue、修改过的文件、最新测试结果和剩余检查项，并在每次操作后更新它。
- **常见混淆:** State 不等同于对话历史。记录是证据；state 是用于决定下一步做什么的精简运行记录。
- **学习课程:** [Repository Memory and State](../phases/14-agent-engineering/34-repo-memory-and-state/)
- **相关术语:** Checkpoint, Durable Execution, Context Engineering, Handoff

### AI Risk Assessment
- **分类:** 安全与治理
- **实际含义:** 对 AI 系统如何影响个人、组织和环境所做的文档化分析，包括背景、危害、可能性、影响、控制措施、剩余风险和监测职责。
- **为什么重要:** 模型能力本身并不能决定风险。部署背景、受影响群体、人工权限、数据和系统集成都会改变危害与控制措施。
- **实际使用:** 明确预期用途和受影响方，识别可信的失效与滥用场景，为控制措施指定负责人，记录剩余风险，并为重大变更设置复审触发条件。
- **常见混淆:** 风险评估是在既定假设下支持决策的依据，不是一次性的安全证书，也不能证明已找出所有危害。
- **相关术语:** Threat Model, Guardrails, Human-in-the-Loop (HITL), Data Classification
- **来源:** [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)

### Alignment
- **分类:** 评估与安全
- **常见说法:** 让 AI 变得安全。
- **实际含义:** 让模型或 AI 系统在预期和对抗性情境中，都以符合既定目标、约束与人类偏好的方式行动的工作。
- **为什么重要:** 系统可能优化了已声明的指标，却违背用户真正的意图。因此 alignment 除了模型训练，还需要评估、监督和系统控制。
- **相关术语:** Guardrails, Evaluation (Eval), Human-in-the-Loop (HITL)

### Approval Gate
- **分类:** Agent 与工具
- **实际含义:** 一个控制点，在获得授权人员或策略许可前阻止执行具有重要后果的操作。
- **为什么重要:** 它在保留可逆工作自动化的同时，限制不确定模型决策的影响范围。
- **实际使用:** 可以让 agent 起草数据库迁移并在一次性数据库中运行，但生产执行必须由负责人审批。
- **常见混淆:** Approval gate 关注操作是否已获授权；verification gate 关注证据是否表明操作正确。
- **学习课程:** [Verification Gates](../phases/14-agent-engineering/38-verification-gates/)
- **相关术语:** Human-in-the-Loop (HITL), Verification Gate, Least Privilege

### Approximate Nearest Neighbor (ANN)
- **分类:** 检索与生成
- **实际含义:** 一种搜索方法，无需将查询与所有已存向量逐一比较，就能返回很可能位于查询近邻之列的向量。
- **为什么重要:** 近似使大规模向量索引得以实用化，但也引入了搜索速度、内存和检索召回率之间可量化的权衡。
- **实际使用:** 在留出的查询集上调优索引和搜索参数，然后同时报告延迟与 Recall@K，而不是假设所有真实近邻都被找到了。
- **常见混淆:** ANN 描述的是搜索目标及其权衡；HNSW 是实现这一目标的一种特定索引算法。
- **相关术语:** Vector Database, HNSW, Cosine Similarity, Recall@K
- **来源:** [Efficient and Robust Approximate Nearest Neighbor Search Using HNSW](https://dl.acm.org/doi/10.1109/TPAMI.2018.2889473)

### Attention
- **分类:** 模型与推理
- **常见说法:** 模型如何聚焦重要 token。
- **实际含义:** 一种机制：通过比较 query 向量与 key 向量形成上下文化表示，对得到的分数归一化，再据此组合 value 向量。mask、位置规则或稀疏模式可以限制哪些位置参与其中。
- **为什么重要:** Attention 让模型能在序列位置之间路由信息，但它本身并不能解释或证明模型理解了什么。
- **常见混淆:** Attention 权重是计算系数，并不是对模型推理过程的忠实解释。
- **学习课程:** [Self-Attention from Scratch](../phases/07-transformers-deep-dive/02-self-attention-from-scratch/)
- **来源:** [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- **相关术语:** Self-Attention, Transformer, KV Cache

### Audio Token
- **分类:** 多模态系统
- **实际含义:** 由音频 codec 或分词器为音频信号的短片段或特征生成的离散标识符，有时会跨多个 codebook。
- **为什么重要:** 离散音频表示让序列模型能以面向 token 的架构处理、预测、存储或生成声音。
- **实际使用:** 将 codec 与模型一同版本化，保留采样率和 codebook 元数据，测量重建质量，并区分语义 audio token 与波形压缩 token。
- **常见混淆:** audio token 并非固定时长、音素或单词；其含义和时间跨度取决于分词器与 codebook 设计。
- **学习课程:** [Neural Audio Codecs](../phases/06-speech-and-audio/13-neural-audio-codecs/)
- **相关术语:** Token, Embedding, Automatic Speech Recognition (ASR), Multimodal Model
- **来源:** [SoundStream](https://arxiv.org/abs/2107.03312)

### Audit Log
- **分类:** 安全与治理
- **实际含义:** 一份持久化且受访问控制的记录，用于记载与安全或问责相关的事件，包括谁或什么执行了操作、改变了什么、何时发生，以及最终状态。
- **为什么重要:** 具有重要后果的 agent 操作需要可供调查、策略审查和责任追溯的证据，而不只是性能调试信息。
- **实际使用:** 记录工具授权、审批决策、外部写入、策略版本和产物标识符，同时对敏感信息脱敏并限制日志访问。
- **常见混淆:** trace 有助于诊断一条执行路径；audit log 则保存跨执行、长期问责所需的事件。
- **相关术语:** Trace, Observability, Approval Gate, Provenance Attestation
- **来源:** [NIST SP 800-92](https://csrc.nist.gov/pubs/sp/800/92/final)

### Autograd
- **分类:** 数学与训练
- **常见说法:** 自动计算梯度。
- **实际含义:** 一种记录或转换 tensor 操作以计算导数的系统，通常采用反向模式自动微分。你只需写前向计算，框架会推导反向传播所需的梯度。
- **学习课程:** [Chain Rule and Automatic Differentiation](../phases/01-math-foundations/05-chain-rule-and-autodiff/)
- **相关术语:** Backpropagation, Gradient, Tensor

### Automatic Speech Recognition (ASR)
- **分类:** 多模态系统
- **实际含义:** 将语音信号映射为转录文本的任务及系统流水线，通常还可提供 token 或片段的时间戳与置信度信息。
- **为什么重要:** 语音界面不只依赖语言建模。声学变化、分段、解码、词表和领域条件都会影响最终转录结果。
- **实际使用:** 按语言、说话人、噪声和领域评估字词错误率；当下游需要依据时间定位时保留时间戳，并测试生产环境实际使用的音频预处理流程。
- **常见混淆:** ASR 转录说了什么。判断是谁在说话则需要 diarization 或 speaker recognition；翻译和意图理解是另外的任务。
- **学习课程:** [Speech Recognition and ASR](../phases/06-speech-and-audio/04-speech-recognition-asr/)
- **相关术语:** Audio Token, Encoder, Tokenization, Multimodal Model
- **来源:** [Connectionist Temporal Classification](https://www.cs.toronto.edu/~graves/icml_2006.pdf)

### Autoregressive
- **分类:** 模型与推理
- **常见说法:** 模型一次生成一个词。
- **实际含义:** 一种分解方式：每个输出 token 都根据其之前的 token 进行预测。生成时，选出的 token 会追加到序列中，成为下一次预测的上下文。
- **常见混淆:** 单位是 token，不一定是词；生成也可以采用并非始终选取最高概率 token 的解码方法。
- **相关术语:** Token, Temperature, KV Cache

### Autoscaling
- **分类:** 基础设施与服务
- **实际含义:** 一个控制循环，在配置边界内根据观测到的需求、资源使用情况或应用指标，调整服务工作进程的数量或容量。
- **为什么重要:** AI 工作负载的变化可能快过人工调配，但扩缩容决策必须考虑模型加载时间、加速器可用性、排队情况和请求成本。
- **实际使用:** 依据与有效工作关联的需求信号扩缩容，设置最小预热容量，限制缩容抖动，并确认新副本通过 readiness 检查后再接收流量。
- **常见混淆:** Autoscaling 是增加或减少容量，并不会让过载的依赖变快，也不能保证能及时获得足够的硬件。
- **学习课程:** [GPU Autoscaling on Kubernetes](../phases/17-infrastructure-and-production/03-gpu-autoscaling-kubernetes/)
- **相关术语:** Model Serving, Saturation, Readiness Probe, Backpressure
- **来源:** [Kubernetes Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)

### Availability
- **分类:** 可靠性与运维
- **实际含义:** 在已声明的测量边界内，用户能够获得定义好的可接受服务的合格服务交互或时间窗口所占比例。
- **为什么重要:** 服务进程在运行时，用户仍可能无法完成有效请求，因此可用性必须与用户可见的成功结果绑定，而不是只看进程存活时间。
- **实际使用:** 定义合格事件和可接受结果，只排除有文档依据的情形，在固定窗口内计算指标，并调查总体故障和持续的部分降级。
- **常见混淆:** Availability 只是一个可靠性结果，并不描述延迟、正确性、安全性或每个用户群体的体验。
- **相关术语:** Service Level Indicator (SLI), Service Level Objective (SLO), Error Budget, Incident Response
- **来源:** [Google SRE: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)

## B

### Backpressure
- **分类:** AI-native 开发
- **实际含义:** 一种流量控制机制：当下游组件无法以当前速率安全处理工作时，减缓或拒绝上游工作。
- **为什么重要:** 没有 backpressure，排队的 agent 运行、工具调用或流式事件可能耗尽内存、超出速率限制，并放大重试。
- **实际使用:** 当评估器队列达到上限时，暂停新的 agent 任务，或返回可重试响应，而不是无限制地接收工作。
- **常见混淆:** Backpressure 在故障发生前保护容量；circuit breaker 则在故障表明依赖不健康后停止调用。
- **相关术语:** Rate Limit, Retry with Backoff, Circuit Breaker

### Backpropagation
- **分类:** 数学与训练
- **常见说法:** 神经网络如何学习。
- **实际含义:** 高效应用链式法则，将导数从标量损失沿计算图反向传播的过程。它计算梯度；优化器再用这些梯度更新参数。
- **常见混淆:** Backpropagation 负责计算梯度，并不选择更新规则或学习率。
- **名称由来:** 导数信息从损失向前面的操作反向传递。
- **学习课程:** [Backpropagation from Scratch](../phases/03-deep-learning-core/03-backpropagation/)
- **相关术语:** Autograd, Gradient, Optimizer

### Batch Size
- **分类:** 数学与训练
- **常见说法:** 一次处理多少个样本。
- **实际含义:** 在优化器更新前，其损失共同构成一次梯度估计的样本数量。更大的 batch 可提高硬件利用率并降低梯度噪声，但需要更多内存，也可能需要不同的学习率或调度策略。
- **常见混淆:** 不存在通用的 batch size 范围或规则，认为每次增大 batch 都应以相同幅度提高学习率并不成立。
- **相关术语:** Learning Rate, Gradient, Optimizer

### Benchmark Contamination
- **分类:** 评估与安全
- **实际含义:** 评估样本与用于预训练、微调、prompt、选择或以其他方式改进被评估系统的数据之间发生重叠或信息泄漏。
- **为什么重要:** 污染可能使 benchmark 分数反映的是既有暴露，而非对未见任务的泛化能力。
- **实际使用:** 跟踪数据集来源，在训练数据源中搜索完全和近似重复项，保留私有测试用例，并用新编写的样本更新公开评估集。
- **常见混淆:** 污染的范围不止于完全复制。改写文本、答案密钥、benchmark 元数据和重复的 prompt 调优也都可能泄漏评估信息。
- **相关术语:** Data Leakage, Data Deduplication, Eval Set, Exact Match (EM)
- **来源:** [Investigating Data Contamination in Modern Benchmarks for Large Language Models](https://arxiv.org/abs/2311.09783)

### BM25
- **分类:** 检索与生成
- **实际含义:** 一种词法排序函数：根据查询词匹配为文档评分，同时考虑词语稀有度、重复出现次数和文档长度。
- **为什么重要:** 它是很强的精确术语检索基线，且能为标识符、罕见词与领域短语补足 dense retrieval。
- **实际使用:** 使用 BM25 和 dense search 检索候选项，合并二者排名，再评估合并结果，之后才考虑加入成本更高的 reranker。
- **常见混淆:** BM25 不直接理解语义相似性，其分数在不同查询或索引配置之间也没有通用含义。
- **相关术语:** Hybrid Retrieval, Dense Retrieval, Reranker, RAG (Retrieval-Augmented Generation)
- **来源:** [The Probabilistic Relevance Framework: BM25 and Beyond](https://doi.org/10.1561/1500000019)

### Byte Pair Encoding (BPE)
- **分类:** 数据与表示
- **实际含义:** 一种子词分词方法，反复合并频繁相邻的单元，从训练文本构建固定词表。
- **为什么重要:** 它在词表规模和把罕见词或未见词表示为更小单元的能力之间取得平衡。
- **实际使用:** 只在获准的语料划分上训练分词器，将其合并规则与模型一同版本化，并检查它如何切分代码、多语言文本和空白字符。
- **常见混淆:** BPE 是一种分词器家族，并不是对所有模型如何产生 token 的通用描述。
- **相关术语:** Tokenization, Vocabulary, Token, Embedding
- **来源:** [Neural Machine Translation of Rare Words with Subword Units](https://arxiv.org/abs/1508.07909)
## C

### Calibration
- **分类:** 评估与安全
- **实际含义:** 系统声明的置信度与该置信度下预测实际正确频率之间的一致程度。
- **为什么重要:** 一个系统的平均准确率可以很高，但在用户依赖其评分的案例上，它仍可能危险地过度自信。
- **实际使用:** 按置信度分桶，比较置信度与经验准确率；当差距不可接受时，重新校准或选择拒答。
- **常见混淆:** Calibration 衡量的是置信度是否可靠，不是整体准确率、事实性或推理质量。
- **相关术语:** Softmax, Evaluation (Eval), Precision & Recall, Logits
- **来源:** [On Calibration of Modern Neural Networks](https://proceedings.mlr.press/v70/guo17a.html)

### Canary Release
- **分类:** 可靠性与运维
- **实际含义:** 一种部署策略：先将新版本暴露给少量流量或基础设施，再逐步扩大发布范围。
- **为什么重要:** 它能限制缺陷的影响范围，并在新模型、prompt、agent 或服务面向所有人之前提供生产环境证据。
- **实际使用:** 将符合条件的小部分用户路由到新版本，与对照组比较质量和运维指标；一旦触发预设失败条件就停止或回滚。
- **常见混淆:** Canary release 限制的是暴露范围；它不能取代部署前测试、审批或回滚准备。
- **相关术语:** Evaluation (Eval), Observability, Rollback, Verification Gate
- **来源:** [Kubernetes Deployments: Canary Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#canary-deployment)

### Chain of Thought (CoT)
- **分类:** Prompt 与上下文
- **常见说法:** 让模型展示它思考的每一步。
- **实际含义:** 在产出答案前用于拆解任务的中间推理。prompt 可以要求给出可见的理由，而有些系统使用不会返回给用户的内部推理。
- **为什么重要:** 拆解任务有助于处理多步问题，但流畅的理由并不能证明答案正确，也不能证明文本如实反映了模型的内部计算。
- **实际使用:** 要求给出简洁计划，独立核验结果，并索取可验证的计算过程或引用，而不是依赖冗长的推理记录。
- **常见混淆:** Chain of thought 不能替代工具、测试或外部验证。
- **学习课程:** [Few-Shot and Chain of Thought](../phases/11-llm-engineering/02-few-shot-cot/)
- **相关术语:** Prompt Engineering, Verification Gate, Evaluation (Eval)

### Checkpoint
- **分类:** Agent 与工具
- **实际含义:** 用于从已知边界恢复的持久快照。在工作流中，它保存运行状态和产物引用；在模型训练中，它可保存参数、优化器状态、调度器状态和训练位置。
- **为什么重要:** 长时间运行的工作流和训练任务可在中断后恢复，不必重放已完成的工作或丢失代价高昂的进度。
- **实际使用:** 一个经过验证的步骤完成后，保存 agent 已接受的 patch 和测试证据；或者在关机前保存训练任务的权重、优化器状态、随机状态和数据位置。
- **常见混淆:** 工作流 checkpoint 和模型训练 checkpoint 都用于恢复，但保存的状态不同。两者都不只是转录记录，也不只是没有恢复元数据的权重文件。
- **学习课程:** [Checkpoint Save and Resume](../phases/19-capstone-projects/47-checkpoint-save-resume/); [Repository Memory and State](../phases/14-agent-engineering/34-repo-memory-and-state/)
- **相关术语:** Agent State, Durable Execution, Parameter, Optimizer

### Chunked Prefill
- **分类:** 基础设施与服务
- **实际含义:** 一种服务技术：将长 prompt 的预填充计算切成更小、可调度的片段，使其能与其他请求的 decode 计算交错执行。
- **为什么重要:** 否则，一个长 prompt 可能独占加速器并延迟正在生成的请求，即使总吞吐量看起来健康，尾延迟仍会很差。
- **实际使用:** 根据实测工作负载选择分块策略，计入调度开销，并在混合 prompt 长度下比较预填充完成时间、decode 延迟和 goodput。
- **常见混淆:** Chunked prefill 改变的是 prompt 计算的调度方式，不会把用户上下文拆成彼此独立的语义块，也不会改变模型的上下文窗口。
- **学习课程:** [vLLM Serving Internals](../phases/17-infrastructure-and-production/04-vllm-serving-internals/)
- **相关术语:** Prefill, Decode Phase, Dynamic Batching, Tail Latency
- **来源:** [Sarathi-Serve](https://arxiv.org/abs/2403.02310)

### Chunking
- **分类:** 检索与生成
- **常见说法:** 把文档拆成小块。
- **实际含义:** 在建立索引前，将源材料划分为可检索单元。块边界、重叠、元数据和文档结构决定了检索能否返回足够上下文，又不致淹没 prompt。
- **为什么重要:** 合适的 chunking 策略取决于文档形态、查询类型、embedding 模型和评估结果。不存在通用的 token 大小或重叠比例。
- **实际使用:** 保持标题和代码块完整，附上源元数据；再用真实问题衡量检索质量，之后才调整块大小。
- **相关术语:** RAG (Retrieval-Augmented Generation), Reranker, Grounding

### Circuit Breaker
- **分类:** AI-native 开发
- **实际含义:** 一种可靠性控制机制：当对某个依赖的调用失败次数超过阈值时，暂时停止调用，之后再探测该依赖是否已经恢复。
- **为什么重要:** 它可防止重复的模型或工具故障消耗系统其他部分的延迟预算、成本和容量。
- **实际使用:** provider 多次超时后打开熔断器，执行故障转移或返回受控响应；冷却期后只允许有限次健康探测。
- **常见混淆:** Circuit breaker 响应的是依赖健康状况；rate limit 控制的是允许的请求量。
- **相关术语:** Retry with Backoff, Rate Limit, Model Router, Backpressure

### CNN (Convolutional Neural Network)
- **分类:** 模型与推理
- **常见说法:** 用于图像的神经网络。
- **实际含义:** 一种利用卷积操作（让滤波器在输入上滑动）检测局部模式的神经网络。层叠卷积可检测越来越复杂的特征：边缘、纹理和物体。
- **常见混淆:** 卷积同样适用于音频、时间序列和其他网格状数据。
- **相关术语:** Feature, Inductive Bias, Activation Function

### Coding Agent
- **分类:** AI-native 开发
- **实际含义:** 专门处理软件工作的 agent，能够检查仓库、编辑文件、运行开发工具，并利用输出推进有明确范围的工程任务。
- **为什么重要:** 它的价值取决于仓库上下文、工具权限、审查边界和验证，而不只取决于代码生成质量。
- **实际使用:** 向 agent 提供 issue、范围契约、仓库指引和测试命令；接受前审查生成的 patch 和证据。
- **常见混淆:** 只会给出文本建议的 coding assistant 不一定是 agent。agent 会通过工具行动并观察结果。
- **学习课程:** [Workbench for Real Repositories](../phases/14-agent-engineering/41-workbench-for-real-repos/)
- **相关术语:** Agent Harness, Repository Map, Patch, Scope Contract, Reviewer Agent

### Compensating Action
- **分类:** Agent 与工具
- **实际含义:** 当原始操作无法原子回滚时，为在语义上抵消已完成副作用而特意执行的操作。
- **为什么重要:** 多步骤 agent 工作流会跨越数据库和外部服务，后续失败无法通过一笔事务撤销之前的写入。
- **实际使用:** 如果订票工作流已扣款但预订失败，应发起可追踪的退款并保留两项事件，而不是删除历史记录。
- **常见混淆:** 补偿是新的业务操作，不是时光倒流。它也可能失败，因此需要幂等性、监控和升级处理。
- **相关术语:** Durable Execution, Idempotency, Checkpoint, Approval Gate
- **来源:** [Sagas](https://dl.acm.org/doi/10.1145/38713.38742)

### Content Provenance
- **分类:** 安全与治理
- **实际含义:** 关于一段媒体或其他数字内容的来源和编辑历史的可验证信息，包括与之关联的参与者、工具、转换过程和声明。
- **为什么重要:** 生成式系统使人们难以仅从表面判断来源主张，因此消费者和平台需要可检查的证据来了解内容是如何生成的。
- **实际使用:** 将溯源声明绑定到内容上，用受控身份为其签名，保留转换历史；当证据缺失或无法验证时清楚说明。
- **常见混淆:** Provenance 可以证明是谁声明了一段历史，以及记录是否被篡改；它不能证明所呈现的事件为真，也不能证明内容无害。
- **学习课程:** [Watermarking, SynthID, Stable Signature, and C2PA](../phases/18-ethics-safety-alignment/23-watermarking-synthid-stable-signature-c2pa/)
- **相关术语:** Data Provenance, Provenance Attestation, Audit Log, Grounding
- **来源:** [C2PA Technical Specification](https://c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html)

### Context Compression
- **分类:** Prompt 与上下文
- **实际含义:** 在尽力保留后续模型决策所需信息的同时，减少源材料的 token 占用。
- **为什么重要:** 压缩可以让长任务符合预算，但每一个省略的细节都可能让模型丢失证据、约束或未解决状态。
- **实际使用:** 原样保留权威事实和标识符，概括重复历史，附上源指针，并在代表性任务上测试压缩后的上下文。
- **常见混淆:** 除非保留了完整原文，否则压缩就是有损的。更短的摘要并不自动等价于原上下文。
- **相关术语:** Token Budget, Context Engineering, Progressive Disclosure, Handoff
- **来源:** [LLMLingua](https://arxiv.org/abs/2310.05736)

### Context Engineering
- **分类:** Prompt 与上下文
- **实际含义:** 设计模型在每一步接收的完整信息环境，包括指令、选定文件、检索到的证据、工具结果、示例、状态和输出约束。
- **为什么重要:** 模型表现不佳往往是因为相关证据缺失、过期、排序不当，或被噪声淹没。
- **实际使用:** 用目标、仓库规则、相关接口、最近的工具输出和未决决定组装紧凑的任务包，再随状态变化更新它。
- **常见混淆:** Prompt engineering 关注指令措辞；context engineering 还决定哪些证据和状态进入模型的工作上下文。
- **学习课程:** [Context Engineering](../phases/11-llm-engineering/05-context-engineering/)
- **相关术语:** Context Window, Progressive Disclosure, Agent State, Repository Map

### Context Window
- **分类:** Prompt 与上下文
- **常见说法:** 模型能记住多少内容。
- **实际含义:** 在特定模型和 API 契约下，一次模型推理可用的最大 token 容量。该容量可能包括系统指令、消息、检索内容、工具交互和生成输出，具体计费方式和输出限制因 provider 而异。
- **为什么重要:** 只有应用程序发送或重建对话历史时，历史才会进入模型。更大的窗口并不保证其中每个细节都会被可靠使用。
- **常见混淆:** Context 是一次推理的临时输入；持久 memory 存在模型外部，并在之后被选择性放回上下文。
- **学习课程:** [Context Engineering](../phases/11-llm-engineering/05-context-engineering/)
- **相关术语:** Token Budget, Context Engineering, Prompt Cache, Agent State

### Continuous Batching
- **分类:** 基础设施与服务
- **实际含义:** 一种服务调度器：在迭代边界加入和移除生成请求，而不是等待固定 batch 中的每个请求都结束。
- **为什么重要:** 自回归请求产生的输出长度不同，因此 continuous batching 能保持加速器利用率，而不会强迫短请求等待最长请求完成。
- **实际使用:** 当容量可用时接纳新请求，跟踪每个请求的延迟；当在线 batch 或 KV cache 预算已满时施加 backpressure。
- **常见混淆:** Continuous batching 是推理调度策略，不是梯度累积，也不是训练 batch size 技术。
- **相关术语:** Dynamic Batching, Decode Phase, Backpressure, Rate Limit
- **来源:** [Orca](https://www.usenix.org/conference/osdi22/presentation/yu)

### Contrastive Learning
- **分类:** 数学与训练
- **常见说法:** 通过比较学习。
- **实际含义:** 在 embedding 空间中训练，让相似样本对彼此靠近，让不相似样本对彼此远离。CLIP 就采用这种方式：匹配的图文对与不匹配的图文对相互区分。
- **相关术语:** Embedding, Cosine Similarity, Loss Function

### Cosine Similarity
- **分类:** 数据与表示
- **常见说法:** 两个向量有多相似。
- **实际含义:** 两个向量的归一化点积。它比较方向而不是大小；对于实值向量，取值范围为 -1 到 1。
- **常见混淆:** 高 cosine similarity 只有结合 embedding 模型和数据分布才有意义。它不能证明事实等价或语义等价。
- **相关术语:** Embedding, Semantic Search, Reranker

### Cost per Successful Task
- **分类:** AI-native 开发
- **实际含义:** 系统总成本除以满足既定成功标准的任务数量，其中包括重试、失败运行、工具使用和评估开销。
- **为什么重要:** 一次模型调用即便便宜，如果经常失败或需要反复人工纠正，整个工作流仍可能很昂贵。
- **实际使用:** 在 100 个仓库任务中测量 provider 收费和基础设施成本，再除以 patch 通过测试与审查的任务数量。
- **常见混淆:** Cost per token 衡量使用量；cost per successful task 衡量的是有用产出。
- **相关术语:** Evaluation (Eval), Retry with Backoff, Model Router, Verification Gate

### Cross-Attention
- **分类:** 多模态系统
- **实际含义:** 一种注意力机制：query 表示来自一个序列或表示，而 keys 和 values 来自另一个序列或表示。
- **为什么重要:** 它让一个信息流能以可学习的方式从另一个信息流检索信息，例如语言 token 关注视觉特征。
- **实际使用:** 明确哪个信息流提供 queries、keys 和 values，对缺失或无效位置施加 mask，并检查消融掉一个模态后模型是否仍能工作。
- **常见混淆:** Cross-attention 并非天生就是多模态的。它可以连接两个文本序列或其他表示；self-attention 则从同一序列表示中派生 queries、keys 和 values。
- **相关术语:** Attention, Self-Attention, Vision-Language Model (VLM), Multimodal Fusion
- **来源:** [Attention Is All You Need](https://arxiv.org/abs/1706.03762)

### Cross-Entropy
- **分类:** 数学与训练
- **常见说法:** 分类损失。
- **实际含义:** 一种基于赋给目标结果的负对数概率的损失。在 next-token 训练中，当模型为观测到的下一个 token 分配较低概率时，它会受到惩罚。
- **常见混淆:** 只有在平均方式和对数底数定义一致时，perplexity 才是平均 cross-entropy 取指数后的结果。
- **相关术语:** Loss Function, Softmax, Perplexity

### CUDA
- **分类:** 模型与推理
- **常见说法:** GPU 编程。
- **实际含义:** NVIDIA 面向兼容 GPU 的通用计算平台和编程模型。深度学习框架借助 CUDA 库和 kernel 并行执行大量 tensor 操作。
- **常见混淆:** GPU 加速不等同于 CUDA；还有其他硬件和软件栈可用。
- **相关术语:** Tensor, Mixed Precision, JAX
## D

### Data Augmentation
- **分类:** 数学与训练
- **常见说法:** 扩充训练数据。
- **实际含义:** 在不收集全新源数据的前提下，创建经变换的图像、扰动后的音频或改写后的文本等样本，以增加训练数据的多样性。只要变换没有破坏任务信号，它就能缓解过拟合。
- **常见混淆:** 数据增强必须保留你希望模型学习的目标标签或行为。
- **相关术语:** Overfitting, Epoch, Eval Set

### Data Classification
- **分类:** 安全与治理
- **实际含义:** 按已记录的敏感性或影响等级为数据分类，使处理、访问、留存、共享和事件处置规则能反映数据泄露或丢失的后果。
- **为什么重要:** 如果源文档、prompt、trace 和生成产物都被视为同等敏感，AI 流水线就无法采用与风险相称的控制措施。
- **实际使用:** 在数据进入系统时分类，将标签贯穿派生产物；按类别限制可用工具和去向，并规定数据经转换或聚合后标签如何变化。
- **常见混淆:** 数据分类描述的是保护要求，不等同于机器学习中的分类任务，也不表示数据本身准确无误。
- **相关术语:** Data Minimization, Trust Boundary, Least Privilege, Audit Log
- **来源:** [NIST SP 1800-39 Initial Public Draft: Data Classification Practices](https://www.nccoe.nist.gov/sites/default/files/2026-02/nist-sp-1800-39-ipd.pdf); [NIST FIPS 199: Federal Information and Information System Categorization](https://csrc.nist.gov/pubs/fips/199/final)

### Data Deduplication
- **分类:** 数据与表示
- **实际含义:** 在一个或多个数据集中检测并移除完全重复和近似重复的样本。
- **为什么重要:** 重复内容会扭曲训练分布、增加记忆化风险、泄露测试材料，并让评估结果看起来比实际更好。
- **实际使用:** 规范化内容，结合精确哈希与相似度方法，人工审查临界聚类，并记录每个样本是由哪个版本和规则移除的。
- **常见混淆:** 去重不是普通的数据清洗。两条不同记录可以合理地共享文本，两段改写文本也可能携带同一份泄露信息。
- **相关术语:** Data Provenance, Benchmark Contamination, Dataset Split, Overfitting
- **来源:** [Deduplicating Training Data Makes Language Models Better](https://arxiv.org/abs/2107.06499)

### Data Exfiltration
- **分类:** 安全与治理
- **实际含义:** 未经授权，将受保护的数据从一个系统或信任区域传给无权接收它的人员、工具、服务或存储位置。
- **为什么重要:** 即使原始数据存储仍完好，agent 也可能通过生成文本、工具参数、URL、日志或副作用暴露机密。
- **实际使用:** 减少可读取的数据，维护允许的目的地列表，检查出站工具调用，脱敏敏感字段，并对跨越信任边界的异常传输发出告警。
- **常见混淆:** 数据外泄关注的是未经授权的移动或披露。获授权组件的正常数据检索不属于外泄，尽管其后续使用仍可能构成外泄。
- **学习课程:** [EchoLeak and CVEs for AI](../phases/18-ethics-safety-alignment/25-echoleak-cves-for-ai/)
- **相关术语:** Trust Boundary, Least Privilege, Indirect Prompt Injection, Audit Log
- **来源:** [NIST SP 800-53 Rev. 5: AC-4 Information Flow Enforcement](https://csrc.nist.gov/files/pubs/sp/800/53/r5/upd1/final/docs/sp800-53r5-controls.xlsx)

### Data Leakage
- **分类:** 数据与表示
- **实际含义:** 在训练或特征构建中，无意使用了真实预测时不可获得的信息，或使用了本应留作独立评估边界的信息。
- **为什么重要:** 信息泄漏会产生虚高指标；系统一旦面对真正未见过的输入，表现就会下滑。
- **实际使用:** 在拟合预处理器之前划分数据，不让未来信息进入历史特征，并将测试标签和 benchmark 答案与 prompt 和调优循环隔离。
- **常见混淆:** 泄漏不只发生在重复行。全局归一化统计量、时间戳、由目标派生的特征，以及反复根据测试结果修改 prompt，都可能泄漏信息。
- **相关术语:** Dataset Split, Benchmark Contamination, Eval Set, Data Provenance
- **来源:** [scikit-learn: Data leakage](https://scikit-learn.org/stable/common_pitfalls.html#data-leakage)

### Data Lineage
- **分类:** 安全与治理
- **实际含义:** 记录数据产物如何经由来源、转换、连接、筛选、版本和下游用途而形成。
- **为什么重要:** 当某个来源被修正、撤回或发现不安全时，lineage 能指出哪些数据集、嵌入（embedding）、评估和模型产物可能受影响。
- **实际使用:** 为输入和输出分配稳定标识符，记录每次转换及其版本，保留父子关系，并验证受影响来源是否能追溯到每一个派生物。
- **常见混淆:** Data provenance 广义地说明来源和保管链；lineage 更强调数据产物之间的转换路径和依赖关系。
- **相关术语:** Data Provenance, Datasheet for Datasets, Audit Log, Content Provenance
- **来源:** [W3C PROV-O](https://www.w3.org/TR/prov-o/)

### Data Minimization
- **分类:** 安全与治理
- **实际含义:** 对个人数据而言，只收集、处理、暴露和留存为特定目的所必需的数据。团队也可以把同一原则用作敏感非个人数据的工程控制措施。
- **为什么重要:** 每个被放入 prompt、trace、缓存或工具调用的非必要字段，都会增加隐私暴露面以及误用或失陷后的影响。
- **实际使用:** 收集前先定义所需字段；尽早在边界处脱敏或聚合；设置留存期限；只有确认可选上下文能提升可量化的任务结果时才保留它。
- **常见混淆:** 最小化不代表完全不保留数据，而是要求能针对既定目的说明每项数据、每种用途、每个接收方和每段留存期的必要性。
- **相关术语:** Purpose Limitation, Data Classification, Least Privilege, Context Engineering
- **来源:** [General Data Protection Regulation, Article 5(1)(c)](https://eur-lex.europa.eu/eli/reg/2016/679/oj)

### Data Provenance
- **分类:** 数据与表示
- **实际含义:** 可追溯的信息，说明数据从何而来、由谁或什么进行了转换、使用了哪些版本，以及派生产物与来源之间的关系。
- **为什么重要:** 要复现结果、遵守使用限制、调查污染，或在来源变化后移除受影响数据，都需要 provenance。
- **实际使用:** 为数据集分配不可变版本，记录转换作业和来源标识符，并把 lineage 元数据带入嵌入（embedding）、eval 用例和模型产物。
- **常见混淆:** 来源 URL 只是 provenance 的一部分；它并不说明采集时间、许可、筛选、转换或下游使用情况。
- **相关术语:** Dataset Split, Data Deduplication, Provenance Attestation, Grounding
- **来源:** [W3C PROV Overview](https://www.w3.org/TR/prov-overview/)

### Dataset Split
- **分类:** 数据与表示
- **实际含义:** 将样本以文档化方式划分为不同子集，分别用于拟合、开发决策和最终评估。
- **为什么重要:** 这种隔离避免了用于选择系统的证据，同时又被当作该系统具备泛化能力的独立证明。
- **实际使用:** 应按真实部署单位划分，例如用户、仓库、组织或时间，而不是随机切分彼此相关的行。
- **常见混淆:** 随机划分不会自动带来独立性。近似重复项、未来观测值，或同一实体的记录都可能跨越边界。
- **相关术语:** Eval Set, Overfitting, Data Leakage, Distribution Shift
- **来源:** [Datasheets for Datasets](https://cacm.acm.org/research/datasheets-for-datasets/)

### Datasheet for Datasets
- **分类:** 安全与治理
- **实际含义:** 结构化的 dataset 文档，涵盖其动机、组成、采集过程、预处理、用途、分发、维护和已知局限。
- **为什么重要:** dataset 可用不代表安全或适用。下游构建者需要了解其创建方式，以及其假设会在哪些地方失效。
- **实际使用:** 将 datasheet 与已版本化的 dataset 一同发布，明确可答疑的负责人，记录被排除的人群和做过的转换，并在 dataset 变化时更新文档。
- **常见混淆:** datasheet 记录的是证据和预期用途，不是许可证、质量保证，也不能替代针对具体部署场景的评估。
- **学习课程:** [Model, System, and Dataset Cards](../phases/18-ethics-safety-alignment/26-model-system-dataset-cards/)
- **相关术语:** Data Lineage, Data Provenance, Model Card, Dataset Split
- **来源:** [Datasheets for Datasets](https://arxiv.org/abs/1803.09010)

### Deadline Propagation
- **分类:** 可靠性与运维
- **实际含义:** 将端到端请求剩余的时间预算传给下游调用，使每个依赖都知道原始请求还能等待多久才有意义。
- **为什么重要:** 各自独立的超时设置可能超过用户的截止时间，让结果已无用的遗留工作继续占用容量。
- **实际使用:** 在入口设置一个请求截止时间；每次下游调用扣除已耗时间；取消过期工作；记录是哪个边界耗尽了预算。
- **常见混淆:** deadline 是绝对或剩余的完成边界。重试延迟决定何时再次开始尝试，且必须纳入同一预算。
- **相关术语:** Retry with Backoff, Retry Budget, Tail Latency, Service Level Objective (SLO)
- **来源:** [gRPC Deadlines](https://grpc.io/docs/guides/deadlines/)

### Decode Phase
- **分类:** 基础设施与服务
- **实际含义:** 自回归推理在处理完输入前缀后，逐步生成新 token 的迭代阶段。
- **为什么重要:** decode 与 prefill 在计算、内存和调度上的行为不同，单一的总延迟数字可能掩盖真正的服务瓶颈。
- **实际使用:** 分别测量 token 间延迟和输出吞吐量，计入 KV-cache 占用，并测试活跃 decode 与新 prefill 共享容量的混合工作负载。
- **常见混淆:** Decode phase 不是 encoder-decoder 模型里的 decoder 组件，它指的是运行时的生成阶段。
- **学习课程:** [Disaggregated Prefill and Decode](../phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/)
- **相关术语:** Prefill, Autoregressive, KV Cache, Time per Output Token (TPOT)
- **来源:** [DistServe](https://arxiv.org/abs/2401.09670)

### Decoder
- **分类:** 模型与推理
- **常见说法:** 模型的输出端。
- **实际含义:** 将一种表示映射为输出的组件。在 encoder-decoder transformer 中，decoder 使用带 mask 的 self-attention 和 cross-attention 生成输出；decoder-only language model 则通过单一的因果堆栈生成内容。
- **相关术语:** Encoder, Transformer, Autoregressive

### Decoding Strategy
- **分类:** 模型与推理
- **实际含义:** 将模型的下一个 token 分数序列转换为选定 token 和完整输出的算法。
- **为什么重要:** 贪心选择、采样、截断和搜索，即使面对相同 logits，也会产生不同的质量、多样性、延迟和可复现性。
- **实际使用:** 在 eval 配置中明确任务的 decoding 设置、停止规则和随机种子行为，才能公平比较结果。
- **常见混淆:** Decoding 改变的是输出的选择方式，并不会改动模型已训练的参数，也不会注入新知识。
- **相关术语:** Autoregressive, Temperature, Top-k Sampling, Nucleus Sampling (Top-p)
- **来源:** [The Curious Case of Neural Text Degeneration](https://arxiv.org/abs/1904.09751)

### Defense in Depth
- **分类:** 安全与治理
- **实际含义:** 在多个系统边界部署相互独立的预防、检测和纠正控制措施，使单一控制失效不会决定最终结果。
- **为什么重要:** AI 系统将概率模型、不受信任的内容、工具和外部服务结合在一起，任何单一过滤器或 prompt 都不足以构成安全边界。
- **实际使用:** 将指令控制与最小权限、sandbox、schema 校验、重要操作审批、监控和经过测试的恢复路径结合使用。
- **常见混淆:** 控制措施更多不一定更好。各层应覆盖不同的失效模式，并保持可测试，而不是重复同一种假设。
- **相关术语:** Guardrails, Sandbox, Least Privilege, Trust Boundary
- **来源:** [NIST Glossary: Defense in Depth](https://csrc.nist.gov/glossary/term/defense_in_depth)

### Delegation
- **分类:** Agent 与工具
- **实际含义:** 向另一名人员或 agent 分配边界明确的子任务，同时提供所需上下文、权限、输出契约和返回条件。
- **为什么重要:** 明确的委托让团队能专业分工、并行工作，同时不丢失所有权、范围控制或整合结果的能力。
- **实际使用:** 向 reviewer agent 提供确切的文件、评审标准、证据和截止时间，再要求其返回结论，而不是悄悄修改主要产物。
- **常见混淆:** 给另一个 agent 发一条含糊消息不算可靠的委托。接收方需要范围契约和明确的回交方式。
- **相关术语:** Scope Contract, Handoff, Reviewer Agent, Orchestration
- **来源:** [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)

### Dense Retrieval
- **分类:** 检索与生成
- **实际含义:** 一种第一阶段检索方法：将 query 和候选项嵌入（embedding）为向量表示，再用相似度函数对候选项排序。
- **为什么重要:** 它能检索几乎不共享原词的改写和语义匹配内容，补足 BM25 等词法方法。
- **实际使用:** 为领域训练或选择 embedding 模型，为候选项建立向量索引，并在将结果接入生成前评估检索召回率。
- **常见混淆:** Dense retrieval 不是 reranker。它负责搜索整个集合；reranker 则重新评分一个较小的候选集。
- **相关术语:** Embedding, Semantic Search, BM25, Hybrid Retrieval
- **来源:** [Dense Passage Retrieval](https://aclanthology.org/2020.emnlp-main.550/)

### Diffusion Model
- **分类:** 模型与推理
- **常见说法:** 从噪声生成图像的模型。
- **实际含义:** 围绕渐进加噪过程和学习得到的逆过程训练的生成模型。采样通常从噪声开始，反复执行去噪步骤，有时在学习得到的潜在空间中进行。
- **常见混淆:** Diffusion 是通用的生成式框架，并非只用于图像。
- **相关术语:** Latent Space, VAE (Variational Autoencoder), Inference

### Disaggregated Serving
- **分类:** 基础设施与服务
- **实际含义:** 一种服务架构：将 prefill 和 decode 运行在单独配置的工作进程池中，并在它们之间传递所需的 attention state。
- **为什么重要:** Prefill 和 decode 对硬件的压力不同，因此独立的资源池可以针对各自瓶颈调整规模和调度，而不用在同一个队列中竞争。
- **实际使用:** 测量 state transfer 成本，按兼容的模型版本路由请求，依据各自需求信号扩缩容，并测试阶段间的故障恢复。
- **常见混淆:** Disaggregation 分离的是运行时阶段，不会把一个模型拆成同一阶段内的 tensor 或 pipeline-parallel 分片。
- **学习课程:** [Disaggregated Prefill and Decode](../phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/)
- **相关术语:** Prefill, Decode Phase, Model Serving, Goodput
- **来源:** [DistServe](https://arxiv.org/abs/2401.09670)

### Distribution Shift
- **分类:** 评估与安全
- **实际含义:** 用于构建或评估系统的数据分布，与系统部署后实际遇到的数据分布之间的差异。
- **为什么重要:** 即便模型通过了留出测试，当用户、任务、语言、工具或运行条件变化时仍可能失败。
- **实际使用:** 定义预期的部署切片，按切片监测性能和输入特征，并将新的失败案例加入已版本化的 eval set。
- **常见混淆:** Distribution shift 不一定是 model drift。模型可能没有变化，环境或用户群体却已经变了。
- **相关术语:** Dataset Split, Eval Set, Overfitting, Model Card
- **来源:** [WILDS](https://proceedings.mlr.press/v139/koh21a.html)

### DPO (Direct Preference Optimization)
- **分类:** 数学与训练
- **常见说法:** 不需要单独 reward model 阶段的偏好训练。
- **实际含义:** 一种偏好优化目标，直接依据相对于参考 policy 的偏好与拒绝回答对来训练 policy。在这一阶段，它无需运行显式 reward model 和 reinforcement-learning 循环。
- **常见混淆:** DPO 仍依赖偏好数据的质量和覆盖范围，并不会消除评估或 alignment 风险。
- **学习课程:** [Direct Preference Optimization](../phases/10-llms-from-scratch/08-dpo/)
- **来源:** [Direct Preference Optimization paper](https://arxiv.org/abs/2305.18290)
- **相关术语:** RLHF (Reinforcement Learning from Human Feedback), SFT (Supervised Fine-Tuning), Alignment

### Dropout
- **分类:** 数学与训练
- **常见说法:** 随机关闭一部分激活值。
- **实际含义:** 训练期间，随机将一部分激活值设为零，促使网络不依赖单一激活路径。标准推理通常会关闭 dropout，不过 Monte Carlo dropout 会有意保持它开启，以估计不确定性。
- **相关术语:** Overfitting, Weight Decay, Activation Function

### Durable Execution
- **分类:** Agent 与工具
- **实际含义:** 以一种方式运行工作流，使其状态和已完成步骤能跨越进程崩溃、重启或长时间等待而保留下来，不会重复已确认的副作用。
- **为什么重要:** Agent 任务常横跨模型调用、工具、审批和外部系统。短暂的进程不应成为唯一的进度记录。
- **实际使用:** 持久化每次工作流状态转换，为外部写入使用幂等键，并在 worker 重启后从最新 checkpoint 恢复。
- **常见混淆:** Durable execution 不会自动让每项操作都安全。副作用仍需要幂等性和补偿规则。
- **相关术语:** Checkpoint, Agent State, Idempotency, Approval Gate

### Dynamic Batching
- **分类:** 基础设施与服务
- **实际含义:** 一种运行时策略：根据兼容的形状、最大规模、优先级和允许的排队等待时间，从排队请求中组成推理 batch。
- **为什么重要:** 将请求分组可提高硬件利用率，但在流量稀疏或请求差异很大时，等待凑 batch 反而会增加延迟。
- **实际使用:** 根据测得的延迟目标设定排队等待和 batch 上限，分离不兼容的请求形状，并在接近真实到达率的条件下同时比较吞吐量和尾延迟。
- **常见混淆:** Dynamic batching 从排队任务中组装 batch；Continuous batching 则在自回归生成已运行时改变 batch 成员。
- **学习课程:** [vLLM Serving Internals](../phases/17-infrastructure-and-production/04-vllm-serving-internals/)
- **相关术语:** Admission Control, Continuous Batching, Saturation, Tail Latency
- **来源:** [NVIDIA Triton: Models and Schedulers](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/model_configuration.html#scheduling-and-batching)
## E

### Early Fusion
- **分类:** 多模态系统
- **实际含义:** 在大部分特定任务建模开始前，就将多种模态的原始表示或低层表示合并起来。
- **为什么重要:** 早期交互能呈现细粒度的跨模态关系，但也要求表示彼此兼容，并谨慎处理对齐问题和缺失输入。
- **实际使用:** 将每种模态转为已定义的 token 或特征表示，保留来源与位置标记，在共享 backbone 之前融合，并与单模态和晚期融合基线比较。
- **常见混淆:** Early fusion 描述的是架构中各路信息流在何处合并，并不保证模型能学到有用的模态对齐。
- **学习课程:** [Chameleon 的早期融合 token](../phases/12-multimodal-ai/11-chameleon-early-fusion-tokens/)
- **相关术语:** Late Fusion, Multimodal Fusion, Modality Alignment, Token
- **来源:** [Chameleon: Mixed-Modal Early-Fusion Foundation Models](https://arxiv.org/abs/2405.09818); [Multimodal Machine Learning: A Survey and Taxonomy](https://arxiv.org/abs/1705.09406)

### Eigenvalue
- **分类:** 数学与训练
- **常见说法:** PCA 中使用的一种矩阵属性。
- **实际含义:** 描述线性变换如何缩放对应非零特征向量、同时不改变其方向的标量。在协方差矩阵的 PCA 中，较大的特征值对应方差更大的方向。
- **相关术语:** Tensor, Feature, Latent Space

### Embedding
- **分类:** 数据与表示
- **常见说法:** 表示语义的向量。
- **实际含义:** 将离散项（词语、图像、用户）映射到连续空间中稠密向量的学习结果；相似项通常会靠得更近。
- **常见混淆:** 相似性取决于模型、训练目标和度量方法。一个 embedding 空间中的距离不能直接迁移到另一个空间。
- **名称由来:** 这些项目被放置，或说嵌入到一个几何表示空间中。
- **学习课程:** [嵌入（Embedding）](../phases/11-llm-engineering/04-embeddings/)
- **相关术语:** Cosine Similarity, Semantic Search, Vector Database

### Encoder
- **分类:** 模型与推理
- **常见说法:** 模型的输入端。
- **实际含义:** 将输入转换为某种表示的组件。transformer encoder 通常使用非因果 self-attention，并受可能存在的 mask 约束，因此每个位置都可融合整个输入中的上下文。
- **常见混淆:** 尽管 encoder-only 模型通常不用于自回归文本生成，它们仍可通过任务头产生输出。
- **相关术语:** Decoder, Transformer, Embedding

### Epoch
- **分类:** 数学与训练
- **常见说法:** 对训练数据完整遍历一次。
- **实际含义:** 对已定义训练数据集的一次遍历。在分布式训练或采样训练中，epoch 的精确定义取决于数据加载器和采样策略。
- **常见混淆:** 更多 epoch 不保证泛化更好；应在留出数据上评估。
- **相关术语:** Batch Size, Overfitting, Eval Set

### Error Budget
- **分类:** 可靠性与运维
- **实际含义:** 在服务级别目标的度量窗口内，目标耗尽前允许发生的服务失败量。
- **为什么重要:** 它为可靠性工作和产品工作提供共同的决策边界：尚有余额时团队可以用它推动变更；用户可见失败消耗预算时则需要放缓风险。
- **实际使用:** 从 SLO 推导预算，按原因和用户群体跟踪消耗速率，在耗尽前定义发布动作，并避免在事故后重置账目。
- **常见混淆:** Error budget 不是制造事故的配额，而是从面向用户的可靠性目标推导出的运行策略。
- **相关术语:** Service Level Objective (SLO), Service Level Indicator (SLI), Availability, Incident Response
- **来源:** [Google SRE Workbook: Error Budget Policy](https://sre.google/workbook/error-budget-policy/)

### Eval Set
- **分类:** 评估与安全
- **别名:** Evaluation set
- **实际含义:** 一组有版本控制的输入、预期属性、评分规则和元数据，用于衡量 AI 系统针对特定能力或风险的表现。
- **为什么重要:** 可重复使用的集合能将模糊的质量主张转化为可比较的证据，并在 prompt、模型、工具或检索变化后捕捉回归。
- **实际使用:** 将有代表性的客服问题、对抗性指令、预期引用和失败标签保存在经过评审的数据集中，并与开发示例分开。
- **常见混淆:** 开发 eval 用于指导迭代；最终留出测试在决策固定后估计性能；标准化 benchmark 则支持在共享协议下进行比较。反复针对任何留出集合调优都会泄露测试信息并夸大结果。
- **学习课程:** [评估驱动的 Agent 开发](../phases/14-agent-engineering/30-eval-driven-agent-development/)
- **相关术语:** Evaluation (Eval), Regression Test, LLM-as-a-Judge, Verification Gate

### Evaluation (Eval)
- **分类:** 评估与安全
- **别名:** Eval
- **实际含义:** 使用明确的成功标准、数据、评分器和审查程序，在代表性任务上衡量模型或系统行为的既定过程。
- **为什么重要:** 如果成功只是来自少量演示的主观印象，就无从提升可靠性。
- **实际使用:** 修改检索前后运行同一批客服场景，评估正确性和引用支撑情况，并按类别检查失败。
- **常见混淆:** benchmark 分数只是一次评估结果，并不能完整反映生产质量。
- **学习课程:** [LLM 评估](../phases/11-llm-engineering/10-evaluation/)
- **相关术语:** Eval Set, LLM-as-a-Judge, Cost per Successful Task, Regression Test

### Exact Match (EM)
- **分类:** 评估与安全
- **实际含义:** 仅当输出经归一化后的表示与某个可接受的参考答案完全相等时，才将其计为正确的一种指标。
- **为什么重要:** 对只有一个标准答案的任务，它具有确定性且易于审计；但不会提供部分得分。
- **实际使用:** 在评估前定义归一化规则和全部可接受的参考答案；当多个输出都可能有效时，再搭配任务专用检查。
- **常见混淆:** 较低的 exact-match 分数可能只是无害的格式差异，而字符串一致的输出在上下文中仍可能缺乏支撑或不安全。
- **相关术语:** ROUGE, Eval Set, Structured Output, Pass@k
- **来源:** [SQuAD](https://aclanthology.org/D16-1264/)

### Expert Parallelism
- **分类:** 基础设施与服务
- **实际含义:** 将 mixture-of-experts 子网络分布到不同设备上，并把每个 token 的激活路由到承载其选中 expert 的设备。
- **为什么重要:** 稀疏 expert 能在不为每个 token 执行所有 expert 的情况下扩大模型容量，但路由会引入通信、负载均衡和部署约束。
- **实际使用:** 测量各 expert 的 token 分布，配置通信带宽，有意识地限制或路由溢出请求，并测试流量造成 expert 需求不均时的质量。
- **常见混淆:** Expert parallelism 划分的是由 router 选中的 expert；tensor parallelism 划分的是层内的 tensor 运算。
- **学习课程:** [Mixture of Experts](../phases/07-transformers-deep-dive/11-mixture-of-experts/)
- **相关术语:** MoE (Mixture of Experts), Tensor Parallelism, Pipeline Parallelism, Model Serving
- **来源:** [GShard](https://arxiv.org/abs/2006.16668)

## F

### Feature
- **分类:** 数据与表示
- **常见说法:** 数据集中的一列。
- **实际含义:** 数据中一个可单独度量的属性。在经典机器学习中，特征由人工设计；在深度学习中，网络会从原始数据自动学习特征。
- **常见混淆:** 一个存储列可能包含多个有用特征，而学习到的表示也可能包含没有简单人工标签的特征。
- **相关术语:** Embedding, Latent Space, Inductive Bias

### Few-Shot
- **分类:** Prompt 与上下文
- **常见说法:** 在 prompt 中给模型几个示例。
- **实际含义:** 一种 in-context learning：在目标输入之前提供少量演示，让模型推断所需任务、格式或决策边界。
- **为什么重要:** 示例的质量和覆盖度比固定的示例数量更重要。差劲或相互矛盾的演示会降低可靠性。
- **相关术语:** Zero-Shot, In-Context Learning, Prompt Engineering, Context Window

### Fine-tuning
- **分类:** 数学与训练
- **常见说法:** 用你的数据训练模型。
- **实际含义:** 从预训练参数继续训练，使用范围更窄的数据集或目标。根据方法不同，可以更新所有参数、选定参数或新增的 adapter 参数。
- **为什么重要:** Fine-tuning 能适应行为、风格、格式或任务表现，但当事实必须保持最新且可追溯时，它不能可靠地替代检索。
- **常见混淆:** Fine-tuning 能影响模型编码的知识，但并不是把记录简单追加到模型内部一个可搜索的数据库中。
- **学习课程:** [微调与 LoRA](../phases/11-llm-engineering/08-fine-tuning-lora/)
- **相关术语:** SFT (Supervised Fine-Tuning), LoRA (Low-Rank Adaptation), QLoRA, RAG (Retrieval-Augmented Generation)

### Flaky Test
- **分类:** AI-native 开发
- **实际含义:** 在代码或预期测试环境没有相关变化的情况下，同等运行之间仍可能通过或失败的测试。
- **为什么重要:** 不稳定性会削弱验证关卡，还会让人或 agent 学会忽略真实失败，或不停重试直到得到一次假阳性。
- **实际使用:** 保留失败时的随机种子和环境，只在明确负责人和截止日期的前提下隔离用例，然后修复未受控的时间、并发、网络、顺序或共享状态依赖。
- **常见混淆:** 一个能稳定暴露间歇性产品 bug 的测试很有价值，并不一定就是 flaky test。
- **相关术语:** Regression Test, Test Oracle, Retry with Backoff, Verification Gate
- **来源:** [De-Flake Your Tests](https://conferences.computer.org/icsme/pdfs/ICSME2020-1oOutvkGTwF4GyVvNtr3Mm/561900a736/561900a736.pdf)

### FlashAttention
- **分类:** 基础设施与服务
- **实际含义:** 一种精确的 attention 算法，通过分块计算减少 accelerator 各级内存之间的数据传输，并避免在高带宽内存中完整实体化 attention 矩阵。
- **为什么重要:** attention 的瓶颈常在内存搬运而非算术运算，特别是面对长序列；因此 IO 感知 kernel 能提升实际速度和内存效率。
- **实际使用:** 使用模型形状、mask、dtype 和硬件都支持的 kernel，验证数值容差，并进行端到端延迟基准测试，而不是把论文结果当作固定倍率引用。
- **常见混淆:** FlashAttention 改变的是 attention 的计算方式，不是其目标数学结果；它与 KV cache 和量化是不同概念。
- **学习课程:** [KV Cache 与 Flash Attention](../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/)
- **相关术语:** Attention, Self-Attention, KV Cache, Mixed Precision
- **来源:** [FlashAttention](https://arxiv.org/abs/2205.14135)

### Function Calling
- **分类:** Agent 与工具
- **常见说法:** 模型在使用工具。
- **实际含义:** 一种 provider 或应用接口，模型通过它发出结构化请求，指定工具名称及其参数。应用代码校验请求、执行操作，并可将结果返回给下一步模型调用。
- **常见混淆:** 模型提出 function call 请求；是否执行及如何执行由你的可信代码决定。仅有 function calling 还不构成完整的 agent。
- **学习课程:** [Function Calling](../phases/11-llm-engineering/09-function-calling/)
- **相关术语:** Structured Output, Tool Contract, Agent, MCP (Model Context Protocol)

## G

### GAN (Generative Adversarial Network)
- **分类:** 模型与推理
- **常见说法:** 两个神经网络在训练时相互竞争。
- **实际含义:** generator 网络尝试生成逼真的数据，discriminator 网络则尝试辨别真实数据和伪造数据。两者共同训练：generator 更擅长欺骗 discriminator，discriminator 也更擅长识别伪造内容。
- **相关术语:** Loss Function, Latent Space, Diffusion Model

### Goodput
- **分类:** 基础设施与服务
- **实际含义:** 在已声明的工作负载下，同时满足首 token 时间和逐 token 延迟等已定义服务约束的完成请求速率。
- **为什么重要:** 原始吞吐量可能上升，用户却要面对更多慢请求。Goodput 只计算满足服务契约的工作。
- **实际使用:** 明确请求分布和延迟阈值，只统计合规完成，汇总速率旁报告百分位数，并避免在目标不同的系统之间直接比较。
- **常见混淆:** Goodput 不是全部已完成吞吐量，也不是模型的通用属性。它取决于工作负载和成功阈值。
- **学习课程:** [推理指标与 Goodput](../phases/17-infrastructure-and-production/08-inference-metrics-goodput/)
- **相关术语:** Service Level Objective (SLO), Time to First Token (TTFT), Time per Output Token (TPOT), Cost per Successful Task
- **来源:** [DistServe](https://arxiv.org/abs/2401.09670)

### GPT
- **分类:** 模型与推理
- **常见说法:** 任意聊天机器人的通称。
- **实际含义:** Generative Pre-trained Transformer，是一类生成式 transformer 模型的家族标签：先以序列预测目标进行预训练，再针对下游用途进行适配。产品名和模型架构不能视作同义词。
- **名称由来:** Generative 指生成输出，pre-trained 指最初的广泛训练阶段，transformer 指所属架构家族。
- **相关术语:** Transformer, Autoregressive, LLM (Large Language Model)

### Graceful Degradation
- **分类:** 可靠性与运维
- **实际含义:** 当容量或依赖受损时，通过降低可选质量、功能、新鲜度或工作负载来保留有界的核心服务，而不是让每个请求都失败。
- **为什么重要:** AI 系统常依赖多个缓慢或易出错的组件，因此明确的降级模式能在局部故障时保护关键用户结果。
- **实际使用:** 预先定义哪些能力可以禁用，让操作人员可见降级模式，保护安全检查，在依赖故障下测试回退路径，并有意恢复完整服务。若正确性、安全性、新鲜度或已承诺契约发生实质变化，应告知用户。
- **常见混淆:** Graceful degradation 不是悄悄返回更差的答案、却假装什么也没发生。操作人员始终需要可见性；降级模式实质改变结果或服务契约时，用户也需要被告知。
- **学习课程:** [生产级 LLM 应用](../phases/11-llm-engineering/13-production-app/)
- **相关术语:** Circuit Breaker, Load Shedding, Model Router, Availability
- **来源:** [Google SRE: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)

### Gradient
- **分类:** 数学与训练
- **常见说法:** 损失的斜率。
- **实际含义:** 由偏导数组成、指向最陡上升方向的向量。在机器学习中，为最小化损失，需要沿梯度反方向进行梯度下降。
- **常见混淆:** Optimizer 可以变换、平均、裁剪或自适应调整梯度，而不是简单沿负梯度迈一步。
- **相关术语:** Backpropagation, Gradient Descent, Optimizer

### Gradient Accumulation
- **分类:** 数学与训练
- **实际含义:** 在执行一次 optimizer 更新之前，对多个 microbatch 的梯度求和或平均。
- **为什么重要:** 当单个设备容纳不下所有样本和激活值时，它能近似更大的有效 batch。
- **实际使用:** 一致地缩放损失，仅在选定数量的 microbatch 之后调用 optimizer，并测量归一化或分布式同步是否改变了行为。
- **常见混淆:** Gradient accumulation 会减少每步的激活内存，但不能复现同时处理完整 batch 的全部性质。
- **相关术语:** Batch Size, Mixed Precision, Optimizer, Backpropagation
- **来源:** [PyTorch AMP examples: Gradient accumulation](https://docs.pytorch.org/docs/stable/notes/amp_examples.html#gradient-accumulation)

### Gradient Clipping
- **分类:** 数学与训练
- **实际含义:** 在梯度值或其合并范数超过选定阈值时，于 optimizer 更新前对其进行限制。
- **为什么重要:** 它能避免异常大的梯度破坏某个训练步骤，并产生非有限值。
- **实际使用:** 记录未裁剪的范数，在对 mixed-precision 梯度取消缩放后再裁剪，并调查反复发生的裁剪，不要把它当作回避不稳定性诊断的手段。
- **常见混淆:** 裁剪控制的是更新幅度，无法修复无效数据、损坏的损失函数或持续不合适的学习率。
- **相关术语:** Gradient, NaN (Not a Number), Mixed Precision, Learning Rate
- **来源:** [On the difficulty of training recurrent neural networks](https://arxiv.org/abs/1211.5063)

### Gradient Descent
- **分类:** 数学与训练
- **常见说法:** 在损失曲面上向下走。
- **实际含义:** 一类优化更新方法，使用目标函数的负梯度移动参数，通常基于 batch 估计，而非整个数据集。
- **相关术语:** Gradient, Learning Rate, Optimizer

### Grounding
- **分类:** 检索与生成
- **实际含义:** 将生成的回答或动作与系统能够识别并检查的证据、状态或观测结果关联起来。
- **为什么重要:** Grounding 让系统有了不受约束生成之外的依据，也更容易发现缺乏支撑的主张。
- **实际使用:** 检索一段政策内容，要求回答引用它，并拒绝那些引用段落无法支撑的主张。
- **常见混淆:** 往 prompt 里加入文档创造了 grounding 的机会，并不保证模型会正确使用这些文档。
- **学习课程:** [检索增强生成](../phases/11-llm-engineering/06-rag/)
- **相关术语:** RAG (Retrieval-Augmented Generation), Hallucination, Verification Gate, Reranker

### Guardrails
- **分类:** 评估与安全
- **常见说法:** 模型周围的安全过滤器。
- **实际含义:** 用于约束输入、工具使用、输出、权限和升级处理的系统控制措施，可能包括 schema、策略检查、分类器、允许列表、sandbox、审批和操作后验证。
- **为什么重要:** 没有任何单一过滤器能覆盖所有失效模式，因此控制措施应按风险分层。
- **常见混淆:** Guardrails 能降低风险，但不能证明 AI 系统安全。
- **学习课程:** [Guardrails](../phases/11-llm-engineering/12-guardrails/)
- **相关术语:** Least Privilege, Approval Gate, Sandbox, Evaluation (Eval)

## H

### Hallucination
- **分类:** 评估与安全
- **常见说法:** 模型在说谎。
- **实际含义:** 生成内容虚假、缺乏现有证据支撑，或与任务的事实来源不一致。即使输出流畅且模型并无欺骗意图，也可能发生。
- **为什么重要:** 通常无法检查某个说法是否曾出现在训练数据中，因此生产检查应聚焦支撑性、正确性和可追溯性。
- **实际使用:** 对事实性回答要求提供引用证据，并评估每条引用是否确实支撑对应主张。
- **常见混淆:** Hallucination 是输出质量失败，不是对模型意图的诊断。
- **相关术语:** Grounding, RAG (Retrieval-Augmented Generation), Verification Gate

### Handoff
- **分类:** AI-native 开发
- **实际含义:** 在人员或 agent 之间结构化转交任务，同时保留目标、当前状态、证据、决策、约束和剩余工作。
- **为什么重要:** 良好的 handoff 能避免下一位执行者从长篇记录中重建整个任务，或重复已经完成的操作。
- **实际使用:** 用一份紧凑的任务包交付已接受的计划、改动文件、测试命令和结果、未解决风险以及确切的下一步动作。
- **常见混淆:** Summary 只说明发生了什么；handoff 还要说明哪个状态是权威状态，以及接下来应该做什么。
- **学习课程:** [多会话交接](../phases/14-agent-engineering/40-multi-session-handoff/)
- **相关术语:** Agent State, Checkpoint, Scope Contract, Progressive Disclosure

### HNSW
- **分类:** 检索与生成
- **别名:** Hierarchical Navigable Small World
- **实际含义:** 一种近似最近邻索引，将向量组织为分层的邻近图，并从粗粒度的上层逐步搜索到细粒度的下层。
- **为什么重要:** 当穷举比较过慢时，它是让高召回向量搜索在实际规模上可行的常用方法。
- **实际使用:** 围绕延迟、内存和 Recall@K 目标调优构建和查询参数；embedding 版本变化时重建索引。
- **常见混淆:** HNSW 是索引算法，不是相似度度量、embedding 模型或完整的向量数据库。
- **相关术语:** Approximate Nearest Neighbor (ANN), Vector Database, Embedding, Recall@K
- **来源:** [Efficient and Robust Approximate Nearest Neighbor Search Using HNSW](https://dl.acm.org/doi/10.1109/TPAMI.2018.2889473)

### Human-in-the-Loop (HITL)
- **分类:** Agent 与工具
- **别名:** Human oversight, human review
- **实际含义:** 一种工作流设计：在 AI 驱动流程的既定节点，由人提供判断、纠正、审批或升级处理。
- **为什么重要:** 人的参与在高影响、含糊或不可逆的边界最有价值，而不该在每一步之后充当未定义的兜底。
- **实际使用:** 让 agent 自动处理常规请求，但将不确定或高价值的情况连同证据和拟议动作一起交给 reviewer。
- **常见混淆:** HITL 不会自动让系统安全。reviewer 需要时间、上下文、权限和清晰的决策标准。
- **相关术语:** Approval Gate, Verification Gate, Agent, Guardrails

### Hybrid Retrieval
- **分类:** 检索与生成
- **实际含义:** 在合并或重排序结果前，将不同方法的信号结合起来的检索方式，常见组合是词法匹配和稠密向量相似度。
- **为什么重要:** 精确标识符、罕见术语和语义改写的表现各不相同，单一检索信号可能遗漏有用证据。
- **实际使用:** 同时用 BM25 风格的关键词搜索和 embeddings 检索候选项，合并其排名，再针对用户 query 重排序合并后的集合。
- **常见混淆:** Hybrid retrieval 合并的是候选项信号；reranker 会对已检索到的候选项应用第二个相关性模型。
- **学习课程:** [高级 RAG](../phases/11-llm-engineering/07-advanced-rag/)
- **相关术语:** Semantic Search, Reranker, RAG (Retrieval-Augmented Generation), Embedding

### Hyperparameter
- **分类:** 数学与训练
- **常见说法:** 你要调优的设置。
- **实际含义:** 影响模型结构、优化、数据处理或推理的配置选择，而非作为普通模型参数学习得到的值。例如学习率、batch size、层数和 decoding 设置。
- **常见混淆:** 有些 hyperparameter 在训练前选定，另一些则可以在训练计划期间或推理时调整。
- **相关术语:** Parameter, Learning Rate, Batch Size, Temperature
## I

### Idempotency
- **分类:** AI-native 开发
- **实际含义:** 使用同一身份重复执行同一操作时，除第一次成功应用外，不会产生额外副作用的特性。
- **为什么重要:** 在分布式 agent 系统中，重试很常见。缺少幂等性时，一次不确定的响应就可能重复付款、评论、部署或创建记录。
- **实际使用:** 为工具请求附加幂等键，并持久化已完成的结果；这样重试会返回该结果，而不是再次执行写入。
- **常见混淆:** 幂等性不表示每个响应都逐字节相同，而是预期的状态变更不会被重复执行。
- **来源:** [HTTP Semantics: idempotent methods](https://www.rfc-editor.org/rfc/rfc9110.html#name-idempotent-methods)
- **相关术语:** Retry with Backoff, Durable Execution, Checkpoint

### Image Token
- **分类:** 多模态系统
- **实际含义:** 模型专用的视觉单元，以向量或离散码表示，通常来自图像 patch、区域或学习得到的视觉码本条目。
- **为什么重要:** 将视觉输入转换成序列后，transformer 风格的组件便能把图像与文本或其他已 token 化的模态一起处理。
- **实际使用:** 记录 token 是连续 patch 还是离散码，保留空间位置信息，测试分辨率和长宽比变化，并在模型输入预算中计入视觉 token。
- **常见混淆:** Image token 不一定对应一个像素、一个物体或固定的物理区域；它的范围由视觉 encoder 或 tokenizer 决定。
- **学习课程:** [Vision-Language Models](../phases/04-computer-vision/25-vision-language-models/)
- **相关术语:** Patch Embedding, Token, VAE (Variational Autoencoder), Vision Transformer (ViT)
- **来源:** [Vision Transformer](https://arxiv.org/abs/2010.11929); [VQ-VAE](https://arxiv.org/abs/1711.00937)

### In-Context Learning
- **分类:** Prompt 与上下文
- **实际含义:** 模型依据当前输入中提供的指令、示例或模式调整行为，而不进行常规参数更新。
- **为什么重要:** 它说明了同一个预训练模型如何在权重不变的情况下，借助上下文完成新任务。
- **实际使用:** 将有代表性的演示放在目标输入之前，测试顺序和格式的不同变体，并让评估示例与演示示例分离。
- **常见混淆:** In-context learning 是临时条件化，不是微调、持久记忆，也不能证明模型推断出了预期规则。
- **相关术语:** Few-Shot, Zero-Shot, Context Window, Prompt Engineering
- **来源:** [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165)

### Incident Response
- **分类:** 可靠性与运维
- **实际含义:** 针对威胁服务、数据、安全性或安保的事件，协同进行检测、分析、遏制、恢复、沟通和复盘学习的过程。
- **为什么重要:** 事件期间，明确的角色和证据比临场逞英雄更重要，尤其是模型行为和分布式依赖会掩盖实际故障边界。
- **实际使用:** 定义严重性分级和指挥角色，保留 trace 与审计记录，停止有害操作，沟通影响，验证恢复，并跟踪纠正工作直到完成。
- **常见混淆:** 事件响应管理事件及其后果；根因分析和长期预防会在服务即时恢复后继续进行。
- **学习课程:** [SRE for AI](../phases/17-infrastructure-and-production/23-sre-for-ai/)
- **相关术语:** Observability, Audit Log, Postmortem, Availability
- **来源:** [Google SRE: Managing Incidents](https://sre.google/sre-book/managing-incidents/); [NIST SP 800-61 Rev. 3](https://csrc.nist.gov/pubs/sp/800/61/r3/final)

### Indirect Prompt Injection
- **分类:** 安全与治理
- **实际含义:** 通过系统检索或观察到的内容发起的 prompt injection 攻击，例如网页、文档、邮件、图片文字或工具结果，而非直接通过用户指令传递。
- **为什么重要:** agent 在执行已授权任务时，可能遇到攻击者控制的指令，并误把这类内容当成具有权威的指导。
- **实际使用:** 将外部内容标为不受信任的数据并与指令分开，最小化工具权限，对重要操作要求审批，并在回归测试中加入恶意检索内容。
- **常见混淆:** Indirect 描述的是传递路径，并不意味着攻击更弱。检索内容中隐藏的指令，后果可以和直接用户 prompt 一样严重。
- **学习课程:** [Indirect Prompt Injection](../phases/18-ethics-safety-alignment/15-indirect-prompt-injection/)
- **相关术语:** Prompt Injection, Instruction Hierarchy, Trust Boundary, Data Exfiltration
- **来源:** [Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection](https://arxiv.org/abs/2302.12173)

### Inductive Bias
- **分类:** 模型与推理
- **常见说法:** 学习系统内置的假设。
- **实际含义:** 偏向某些函数或表示的结构性或统计性假设。卷积偏向局部性和共享过滤器；因果 mask 偏向根据前序位置进行预测。
- **常见混淆:** transformer 依然具有归纳偏置，来自 tokenization、位置处理、mask、架构、数据和目标函数。
- **相关术语:** CNN (Convolutional Neural Network), Transformer, Feature

### Inference
- **分类:** 模型与推理
- **常见说法:** 运行一个已训练模型。
- **实际含义:** 执行已训练模型来产出预测、评分、嵌入（embedding）或生成的 token，且不对其参数进行常规训练更新。
- **常见混淆:** 即使模型权重保持不变，应用仍可在 inference 期间更新缓存、对话状态或外部记忆。
- **相关术语:** Autoregressive, Streaming, KV Cache

### Instruction Following
- **分类:** Prompt 与上下文
- **实际含义:** 模型将自然语言指令和给定上下文映射为满足既定任务与约束的行为的能力。
- **为什么重要:** 语言生成可以很流畅，却不一定遵守用户要求的操作、格式、边界或优先级。
- **实际使用:** 使用冲突约束、格式要求、无关上下文和拒答案例，将指令遵循度与答案质量分开评估。
- **常见混淆:** Instruction following 不等于事实正确性、alignment，或服从每一段看起来像指令的字符串。
- **相关术语:** SFT (Supervised Fine-Tuning), Prompt Engineering, Instruction Hierarchy, Alignment
- **来源:** [Finetuned Language Models Are Zero-Shot Learners](https://arxiv.org/abs/2109.01652)

### Instruction Hierarchy
- **分类:** Prompt 与上下文
- **实际含义:** 用于化解不同权威来源之间指令冲突的一套规则，例如应用政策、用户和不受信任的检索内容。
- **为什么重要:** Agent 系统将可信目标与外部文本混在一起，因此当低权威内容与高优先级约束冲突时，模型和 harness 需要有明确的应对规则。
- **实际使用:** 将不受信任的工具输出标为数据，把高优先级约束置于该内容之外，并测试直接和间接冲突案例。
- **常见混淆:** Instruction hierarchy 可以改善行为，但并非安全边界；最小权限和审批控制仍会限制后果。
- **相关术语:** System Prompt, Prompt Injection, Least Privilege, Tool Contract
- **来源:** [The Instruction Hierarchy](https://arxiv.org/abs/2404.13208)

### Inter-Token Latency (ITL)
- **分类:** 基础设施与服务
- **实际含义:** 单个请求中两个连续输出 token 到达事件之间的经过时间；对第一个 token 之后的输出 token，计算为 `t_i - t_(i-1)`。
- **为什么重要:** 单次间隔可暴露 decode 卡顿和流式输出抖动；这些问题很容易被按请求计算的平均值掩盖，尤其是在 batch、抢占或混合负载下。
- **实际使用:** 记录每个首 token 后间隔及其请求和 token 位置；再按工作负载、输出长度和并发度报告分布，不要把请求边界混在一起。
- **常见混淆:** ITL 是两个连续 token 之间的一次间隔。Time per output token 是跨越这些间隔的按请求平均值；Time to first token 则覆盖流式输出开始前的等待。
- **学习课程:** [Inference Metrics and Goodput](../phases/17-infrastructure-and-production/08-inference-metrics-goodput/)
- **相关术语:** Time per Output Token (TPOT), Time to First Token (TTFT), Decode Phase, Tail Latency
- **来源:** [DistServe](https://arxiv.org/abs/2401.09670)

## J

### Jailbreak
- **分类:** 安全与治理
- **实际含义:** 一种对抗性输入或交互策略，意在让模型产生其训练或应用控制本应阻止的行为。
- **为什么重要:** 成功的 jailbreak 会暴露既定政策与实际行为之间的缺口；当模型可控制工具或受保护数据时，后果会更严重。
- **实际使用:** 从被禁止的行为中推导测试族，改变格式和交互长度，同时衡量拒答与有害完成，并将确认的失败转为带版本的对抗性 eval。
- **常见混淆:** Jailbreak 针对模型或系统的行为限制。Prompt injection 则重定向指令遵循，通常服务于攻击者的目标；一次交互可能同时涉及两者。
- **学习课程:** [Jailbreak Taxonomy](../phases/19-capstone-projects/82-jailbreak-taxonomy/)
- **相关术语:** Prompt Injection, Red Teaming, Guardrails, Eval Set
- **来源:** [Universal and Transferable Adversarial Attacks on Aligned Language Models](https://arxiv.org/abs/2307.15043)

### JAX
- **分类:** 数学与训练
- **常见说法:** 用于加速机器学习的类 NumPy 系统。
- **实际含义:** 一个 Python 库，可对数值函数进行自动微分、编译、向量化和跨加速器并行执行等变换。其变换机制最适合状态显式、采用函数式风格的代码。
- **常见混淆:** JAX 并不禁止所有有状态编程，但在被变换的函数中隐藏 mutation，可能导致错误或不受支持的行为。
- **学习课程:** [Introduction to JAX](../phases/03-deep-learning-core/12-intro-to-jax/)
- **来源:** [JAX documentation](https://docs.jax.dev/en/latest/)
- **相关术语:** Autograd, Tensor, CUDA

## K

### Knowledge Distillation
- **分类:** 数学与训练
- **实际含义:** 训练 student model 复现更强 teacher 的特定行为或输出分布，通常同时使用常规目标标签。
- **为什么重要:** 当直接服务 teacher 不现实或成本过高时，它可以把有用行为迁移到更小或更便宜的模型中。
- **实际使用:** 定义 teacher 输出、temperature、student loss 和留出 eval set；再将 student 同 teacher 以及仅用标签的基线进行比较。
- **常见混淆:** Distillation 迁移的是训练分布上的行为，不会复制 teacher 的每种能力、事实或安全属性。
- **相关术语:** Fine-tuning, Loss Function, Logits, Quantization
- **来源:** [Distilling the Knowledge in a Neural Network](https://arxiv.org/abs/1503.02531)

### KV Cache
- **分类:** 模型与推理
- **常见说法:** 能加快 token 生成的缓存。
- **实际含义:** 自回归生成中较早位置的 key 和 value tensor 的缓存。复用它们可避免在每个 decode 步骤中，为未变化的前缀重复计算 attention 投影。
- **为什么重要:** 它会减少重复计算，但也会消耗随序列长度、层数、batch 和模型配置增长的内存。
- **常见混淆:** KV cache 是一个序列的运行时 attention 状态。Prefix caching 会跨请求复用合格的 KV 状态；prompt caching 是更广义的提供商或应用复用契约。
- **学习课程:** [KV Cache and Flash Attention](../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/)
- **相关术语:** Attention, Autoregressive, Prefix Caching, Prompt Cache

## L

### Late Fusion
- **分类:** 多模态系统
- **实际含义:** 通过独立的 encoder 或预测器处理各模态，并在接近任务输出时合并其高层表示、评分或决策。
- **为什么重要:** 独立分支可使用特定模态的架构并容忍缺失输入，但也可能错过更早融合才能捕获的细粒度交互。
- **实际使用:** 校准每个分支，定义缺失模态如何影响合并，比较评分层和特征层组合，并将各分支单独作为消融实验进行评估。
- **常见混淆:** Late fusion 描述的是合并发生的位置，不表示简单平均，也不保证各模态贡献相等。
- **学习课程:** [Cross-Attention Fusion](../phases/19-capstone-projects/61-cross-attention-fusion/)
- **相关术语:** Early Fusion, Multimodal Fusion, Modality, Evaluation (Eval)
- **来源:** [Multimodal Deep Learning](https://ai.stanford.edu/~ang/papers/icml11-MultimodalDeepLearning.pdf); [Multimodal Machine Learning: A Survey and Taxonomy](https://arxiv.org/abs/1705.09406)

### Latent Space
- **分类:** 数据与表示
- **常见说法:** 模型的隐藏表示空间。
- **实际含义:** 一种学习得到的表示空间，其坐标编码对模型有用的因素。它可能比输入维度更低，但并非每种 latent representation 都要求压缩。
- **常见混淆:** 邻近点是否有意义地相似，取决于模型和训练目标实际学到了什么。
- **相关术语:** Embedding, VAE (Variational Autoencoder), Feature

### Learning Rate
- **分类:** 数学与训练
- **常见说法:** 每次优化步长的大小。
- **实际含义:** 优化器用来控制参数更新幅度的缩放系数。取值过大会让训练不稳定；取值过小则会使有用的进展慢到不切实际。
- **常见混淆:** 实际更新还取决于优化器、调度策略、梯度规模、batch 和参数历史。
- **相关术语:** Optimizer, Gradient Descent, Batch Size

### Learning Rate Schedule
- **分类:** 数学与训练
- **实际含义:** 按步数、epoch、指标或预设曲线，随着训练进行而改变优化器学习率的策略。
- **为什么重要:** 训练的不同阶段可能受益于不同的更新幅度，因此固定学习率可能在早期不稳定，或在后期造成浪费。
- **实际使用:** 将调度策略与优化器配置一起版本化，记录每步的实际学习率，并在相同 token 或更新预算下比较不同调度策略。
- **常见混淆:** Scheduler 控制的是学习率随时间的变化；它不决定优化器何时执行一步，也不保证收敛。
- **相关术语:** Learning Rate, Warmup, Optimizer, Epoch
- **来源:** [SGDR](https://arxiv.org/abs/1608.03983); [Attention Is All You Need](https://arxiv.org/abs/1706.03762)

### Least Privilege
- **分类:** 评估与安全
- **实际含义:** 仅为模型、agent、工具或用户授予当前任务所需的权限，并且只在需要期间授予。
- **为什么重要:** 模型会犯错，也可能遵循恶意指令。收窄权限能降低单次失败可造成的损失。
- **实际使用:** 给文档 agent 源文件的读权限和单个分支的写权限，但不给生产凭证或合并权限。
- **常见混淆:** Authentication 证明身份；least privilege 限制该身份能做什么。
- **相关术语:** Sandbox, Approval Gate, Prompt Injection, Tool Contract

### LLM (Large Language Model)
- **分类:** 模型与推理
- **常见说法:** AI 应用的大脑。
- **实际含义:** 容量足够大、训练覆盖广泛，能通过 prompting 或适配完成多种语言任务的 language model。当前大多数 LLM 使用 transformer 架构和序列预测目标，但规模阈值、数据来源和训练配方各不相同。
- **常见混淆:** LLM 是模型组件；工具、检索、状态、政策和产品逻辑都位于其周边系统中。
- **相关术语:** Transformer, Autoregressive, Agent Harness

### LLM-as-a-Judge
- **分类:** 评估与安全
- **实际含义:** 使用 language model 按 rubric 对另一系统的输出进行评分、比较、分类或批评。
- **为什么重要:** 对于清晰度或指令遵循这类难以写成精确匹配测试的质量，它可以扩展评估规模。
- **实际使用:** 向独立的 evaluator model 提供任务、候选答案、参考证据和结构化 rubric，再用人工审查过的示例校准其评分。
- **常见混淆:** Judge model 不是真值。它可能受顺序、篇幅、文风、prompt 措辞或模型共同失效模式影响而产生偏差。
- **学习课程:** [Eval-Driven Agent Development](../phases/14-agent-engineering/30-eval-driven-agent-development/)
- **相关术语:** Evaluation (Eval), Eval Set, Verification Gate, Precision & Recall

### Load Shedding
- **分类:** 可靠性与运维
- **实际含义:** 当需求超过可用于产出有效结果的容量时，在一个或多个过载边界有意拒绝、丢弃或取消选定工作。
- **为什么重要:** 过载时若继续接受每个请求，排队会不断加剧，直到几乎所有请求都错过截止时间，恢复也会更困难。
- **实际使用:** 尽早在已有充分信息的边界实施丢弃；尽量保留高优先级及已准入的工作；识别过载范围；只有在条件暂时存在且请求仍处于其重试预算内时，才将响应标为可重试。
- **常见混淆:** Load shedding 不局限于已接收的工作。Admission control 专指接收前的关卡；rate limiting 即使在仍有容量时也可执行使用政策。
- **相关术语:** Admission Control, Backpressure, Rate Limit, Graceful Degradation
- **来源:** [Google SRE: Handling Overload](https://sre.google/sre-book/handling-overload/)

### Logits
- **分类:** 模型与推理
- **实际含义:** 模型为候选结果给出的未归一化数值分数，随后由归一化函数或 decoding 规则将其转换为选择结果。
- **为什么重要:** Temperature、softmax、top-k 和 top-p 都直接作用于 logits 或由其派生，因此 logits 连接了模型计算与生成 token。
- **实际使用:** 在 API 提供时检查 logits 或 log probabilities，在采样前应用 mask，并避免将原始数值大小理解为已校准的置信度。
- **常见混淆:** Logits 不是概率；没有定义好的转换时，也不能跨无关位置、模型或任务进行比较。
- **相关术语:** Softmax, Temperature, Token, Cross-Entropy
- **来源:** [Attention Is All You Need](https://arxiv.org/abs/1706.03762)

### LoRA (Low-Rank Adaptation)
- **分类:** 数学与训练
- **常见说法:** 参数高效的微调。
- **实际含义:** 一种方法：保持基础权重冻结，仅为选定层学习低秩更新矩阵。相较全参数微调，它可减少可训练参数数量，并降低训练内存消耗。
- **常见混淆:** 实际节省的内存和速度取决于秩、目标模块、优化器状态、激活值内存、量化和实现方式。
- **学习课程:** [Fine-Tuning and LoRA](../phases/11-llm-engineering/08-fine-tuning-lora/)
- **来源:** [LoRA paper](https://arxiv.org/abs/2106.09685)
- **相关术语:** Fine-tuning, QLoRA, Parameter

### Loss Function
- **分类:** 数学与训练
- **常见说法:** 衡量训练误差的数值。
- **实际含义:** 将预测与目标（有时还包含正则化项）映射为优化过程尝试降低的值的目标函数。损失函数决定训练会直接奖励或惩罚哪些错误。
- **常见混淆:** 较低的训练损失不保证在生产任务上产生有用、安全或可泛化的行为。
- **相关术语:** Cross-Entropy, Gradient, Evaluation (Eval)

### Lost in the Middle
- **分类:** Prompt 与上下文
- **实际含义:** 一种长上下文失效模式：模型表现会随证据位置而变化，当相关信息处于开头与结尾之间时可能退化。
- **为什么重要:** 即使证据装得进上下文窗口，也不能保证模型会以同样的可靠性使用每个位置的信息。
- **实际使用:** 测试多种证据位置，减少干扰项，把决策关键约束放在仍然显眼的位置，并根据来源核验答案。
- **常见混淆:** 这是观察到的行为模式，不是对每个模型、任务或位置都同样适用的固定定律。
- **相关术语:** Context Window, Context Engineering, Eval Set, Grounding
- **来源:** [Lost in the Middle](https://aclanthology.org/2024.tacl-1.9/)
## M

### Maximum Marginal Relevance (MMR)
- **分类:** 检索与生成
- **实际含义:** 一种选择规则，在与查询的相关性和相对于已选条目的新颖性之间取得平衡。
- **为什么重要:** 它可以减少重复的 chunk，使有限的上下文预算覆盖更多不同的证据。
- **实际使用:** 先检索候选池，再使用有文档说明的相关性—多样性权重选择下一项，并同时评估答案质量和来源覆盖度。
- **常见混淆:** MMR 对已有候选集合进行多样化；它不会检索缺失的证据，也不能证明所选段落正确。
- **相关术语:** Reranker, Chunking, RAG (Retrieval-Augmented Generation), Grounding
- **来源:** [The Use of MMR, Diversity-Based Reranking for Reordering Documents and Producing Summaries](https://www.cs.cmu.edu/~jgc/publication/MMR_DiversityBased_Reranking_SIGIR_1998.pdf)

### MCP (Model Context Protocol)
- **分类:** Agent 与工具
- **常见说法:** 让 AI 应用连接工具和上下文的一种标准方式。
- **实际含义:** 一种开放协议，host 可借助已定义的消息生命周期和传输绑定，连接到暴露工具、资源、prompt 等能力的 server。
- **常见混淆:** MCP 标准化能力发现和交换，但它本身不决定调用哪个工具是安全的，也不自行授予权限。
- **学习课程:** [Model Context Protocol](../phases/11-llm-engineering/14-model-context-protocol/)
- **来源:** [Model Context Protocol specification](https://modelcontextprotocol.io/specification/)
- **相关术语:** Function Calling, Tool Contract, Least Privilege

### Membership Inference
- **分类:** 安全与治理
- **实际含义:** 一种攻击：通过观察模型输出或其他可访问的信号，推测某条特定记录或样本是否被包含在模型训练数据中。
- **为什么重要:** 即使模型不会逐字复现某条记录，可区分的行为仍可能泄露其是否参与了敏感数据集。
- **实际使用:** 在真实查询接口下测试有代表性的成员和非成员，限制不必要的置信度信号，减少数据暴露，并根据效用要求评估隐私防护。
- **常见混淆:** Membership inference 询问记录是否参与训练。Model extraction 试图复现模型行为，而直接 memorization 测试则询问能否恢复内容。
- **学习课程:** [Differential Privacy for LLMs](../phases/18-ethics-safety-alignment/22-differential-privacy-for-llms/)
- **相关术语:** Data Leakage, Data Minimization, Eval Set, Data Classification
- **来源:** [Membership Inference Attacks Against Machine Learning Models](https://doi.org/10.1109/SP.2017.41)

### Mixed Precision
- **分类:** 数学与训练
- **常见说法:** 使用低精度算术来节省速度和内存。
- **实际含义:** 一种数值策略，对不同运算使用不同数据类型：通常为许多矩阵运算使用较低精度，并为需要更大数值范围或稳定性的值使用较高精度。
- **常见混淆:** 对速度、内存和准确率的影响取决于硬件、数据类型、缩放方法、kernel 和模型，并不是固定倍数。
- **相关术语:** Tensor, CUDA, NaN (Not a Number), Quantization

### Modality
- **分类:** 多模态系统
- **实际含义:** 一种具有自身结构和采集过程的信息形式，例如文本、图像、音频、视频、深度信息或传感器测量值。
- **为什么重要:** 不同模态具有不同的采样率、噪声、空间或时间结构以及缺失数据行为，因此一种预处理假设很少能适用于所有模态。
- **实际使用:** 在设计对齐或融合前，记录每种模态的来源、单位、分辨率、时间信息、预处理和缺失值策略。
- **常见混淆:** 模态不只是文件扩展名或特征列。多种编码可以表示同一种模态，一个样本也可以包含多种模态。
- **学习课程:** [MIO Any-to-Any Streaming](../phases/12-multimodal-ai/16-mio-any-to-any-streaming/)
- **相关术语:** Multimodal Model, Token, Tensor, Embedding
- **来源:** [ImageBind: One Embedding Space To Bind Them All](https://arxiv.org/abs/2305.05665); [Multimodal Machine Learning: A Survey and Taxonomy](https://arxiv.org/abs/1705.09406)

### Modality Alignment
- **分类:** 多模态系统
- **实际含义:** 学习或建立不同模态表示之间的对应关系，以便匹配语义上或时间上相关的条目。
- **为什么重要:** 当系统无法跨结构不同的输入连接同一事件、对象或概念时，融合和跨模态检索就会失败。
- **实际使用:** 定义正样本对和负样本对，保留时间或空间元数据，评估错配示例，并将对齐与下游任务准确率分开衡量。
- **常见混淆:** 对齐使表示能够比较或建立对应关系；它不要求表示变得完全相同，也不要求抹去模态特有的信息。
- **学习课程:** [Projection Layer Modality Alignment](../phases/19-capstone-projects/60-projection-layer-modality-align/)
- **相关术语:** Shared Embedding Space, Contrastive Learning, Grounding, Multimodal Fusion
- **来源:** [Learning Transferable Visual Models From Natural Language Supervision](https://proceedings.mlr.press/v139/radford21a.html)

### Model Card
- **分类:** 评估与安全
- **实际含义:** 一份结构化报告，描述模型的预期用途、评估条件、性能特征、局限性以及相关的伦理或安全考量。
- **为什么重要:** 它为下游构建者提供背景，帮助判断已报告的证据是否适用于其用户和部署条件。
- **实际使用:** 记录模型版本、训练和评估范围、子群体结果、已知失效模式、禁止用途以及每项声明的日期。
- **常见混淆:** Model card 用于传达证据和局限性；它不是认证、担保、系统威胁模型，也不能替代针对具体部署的评估。
- **相关术语:** Eval Set, Dataset Split, Distribution Shift, Alignment
- **来源:** [Model Cards for Model Reporting](https://dl.acm.org/doi/10.1145/3287560.3287596)

### Model Router
- **分类:** AI-native 开发
- **实际含义:** 一个组件，依据能力、延迟、成本、上下文大小、政策和当前可用性等要求，为请求选择模型或 provider。
- **为什么重要:** 不同任务和故障条件适合不同模型；路由无需将每个请求发送给最大模型，也能提升结果质量。
- **实际使用:** 将低风险提取任务发送给快速模型，将复杂代码审查发送给能力更强的模型，并且只故障转移到满足相同数据政策的 provider。
- **常见混淆:** 路由是一项政策决策；随机负载均衡只是在分配流量。
- **相关术语:** Evaluation (Eval), Circuit Breaker, Rate Limit, Cost per Successful Task

### Model Serving
- **分类:** 基础设施与服务
- **实际含义:** 一层运行时和 API，负责加载带版本的模型产物、接受 inference 请求、调度执行、管理资源，并在运维契约下返回结果。
- **为什么重要:** 如果未明确工程化排队、batching、放置、版本控制、取消和响应边界，再强大的模型也可能产出不可靠的产品。
- **实际使用:** 固定模型和 tokenizer 版本，验证请求限制，暴露就绪状态和延迟信号，控制并发，并在将生产流量路由过去前测试回滚。
- **常见混淆:** Model serving 的范围大于一次 inference 调用，小于完整应用；完整应用还可能包括检索、工具、政策和用户状态。
- **学习课程:** [Self-Hosted Serving Selection](../phases/17-infrastructure-and-production/28-self-hosted-serving-selection/)
- **相关术语:** Inference, Model Router, Autoscaling, Observability
- **来源:** [Clipper](https://arxiv.org/abs/1612.03079)

### MoE (Mixture of Experts)
- **分类:** 模型与推理
- **常见说法:** 对每个 token 只激活部分参数的大型模型。
- **实际含义:** 一种架构，包含多个 expert 子网络以及一个学习到的 router，后者为每个输入单元（通常是每个 token）选择其中一部分。稀疏激活无需在每次前向传播中使用所有 expert，也能增加总参数容量。
- **为什么重要:** 计算、内存、通信、路由均衡和质量取决于具体架构与 serving 系统。
- **常见混淆:** 除非模型开发者披露，否则产品名称不能证明其采用了 MoE 架构。
- **学习课程:** [Mixture of Experts](../phases/07-transformers-deep-dive/11-mixture-of-experts/)
- **相关术语:** Transformer, Model Router, Parameter

### Multimodal Fusion
- **分类:** 多模态系统
- **实际含义:** 将来自一种以上模态的证据或学习到的表示结合起来，生成联合表示、预测或输出。
- **为什么重要:** 各模态可以提供互补证据，但朴素的组合可能放大噪声、时间误差，或让某一信息流占据主导。
- **实际使用:** 建立单模态基线，明确融合点和 mask，测试缺失与矛盾的输入，并报告每个已评估切片由哪些模态驱动。
- **常见混淆:** Fusion 是组合操作；alignment 建立对应关系；仅将两种模态放进一个请求，并不能证明两者任一项已成功发生。
- **学习课程:** [Cross-Attention Fusion](../phases/19-capstone-projects/61-cross-attention-fusion/)
- **相关术语:** Early Fusion, Late Fusion, Cross-Attention, Modality Alignment
- **来源:** [Multimodal Deep Learning](https://ai.stanford.edu/~ang/papers/icml11-MultimodalDeepLearning.pdf); [Multimodal Machine Learning: A Survey and Taxonomy](https://arxiv.org/abs/1705.09406)

### Multimodal Model
- **分类:** 多模态系统
- **实际含义:** 一种模型，通过表示、对齐、融合、翻译或协同预测，从一种以上模态学习、关联或生成内容。
- **为什么重要:** 多模态能力取决于模态如何交互，而不只是能接受多种输入类型；每个表示边界都可能发生故障。
- **实际使用:** 记录支持的输入和输出组合，分别及联合评估每种模态，测试缺失或冲突的输入，并随模型跟踪预处理版本。
- **常见混淆:** 一条含独立图像模型和文本模型的 pipeline 在系统层面是多模态的，但不一定是一个联合训练的 multimodal model。
- **学习课程:** [MIO Any-to-Any Streaming](../phases/12-multimodal-ai/16-mio-any-to-any-streaming/)
- **相关术语:** Modality, Vision-Language Model (VLM), Multimodal Fusion, Transformer
- **来源:** [Flamingo: a Visual Language Model for Few-Shot Learning](https://arxiv.org/abs/2204.14198); [Multimodal Machine Learning: A Survey and Taxonomy](https://arxiv.org/abs/1705.09406)

## N

### NaN (Not a Number)
- **分类:** 数学与训练
- **常见说法:** 数值计算失败的信号。
- **实际含义:** 一种表示未定义或不可表示数值结果的浮点值。在训练中，NaN 可能来自无效运算、溢出、不稳定的 normalization、过大的更新，或更早出现的受损值。
- **实际使用:** 找到第一个非有限 tensor，检查其输入，并在该运算附近添加断言或异常检测。
- **相关术语:** Mixed Precision, Learning Rate, Gradient

### Normalization
- **分类:** 数学与训练
- **常见说法:** 将数据缩放到标准范围。
- **实际含义:** 一类变换，使用已定义的统计量来缩放或重新居中输入、activation 或 feature。Batch normalization 和 layer normalization 使用不同的轴，并且在训练和 inference 中行为不同。
- **常见混淆:** Normalization 可以改善优化稳定性，但它并不总是允许使用更大的 learning rate，也不会改善每种架构。
- **相关术语:** Tensor, Activation Function, Mixed Precision

### Nucleus Sampling (Top-p)
- **分类:** 模型与推理
- **别名:** Top-p sampling
- **实际含义:** 一种 decoding 方法，从累计概率达到所选阈值的最小 next-token 候选集合中采样。
- **为什么重要:** 候选集合大小会随分布而变化：不确定性分散时保留更多选项，概率集中时保留更少选项。
- **实际使用:** 在保持 temperature 和 stop 设置不变的情况下评估该阈值，并为每项结果记录完整的 decoding 配置。
- **常见混淆:** Top-p 是概率质量阈值，而 top-k 始终保留固定最大数量的候选项。
- **相关术语:** Top-k Sampling, Temperature, Decoding Strategy, Softmax
- **来源:** [The Curious Case of Neural Text Degeneration](https://arxiv.org/abs/1904.09751)
## O

### Observability
- **分类:** AI-native 开发
- **实际含义:** 通过记录的输入、输出、状态转换、工具调用、耗时、成本、错误和评估信号来理解 AI 系统行为的能力。
- **为什么重要:** AI 故障往往跨越模型、检索、工具和编排。要定位发生故障的边界，就需要能相互关联的证据。
- **实际使用:** 在检索、模型调用、工具执行、审批和最终评分中记录同一个 trace ID，同时实施脱敏和访问控制。
- **常见混淆:** Logging 用于收集事件；Observability 则让事件具备足够的结构和关联性，从而回答运维问题。
- **学习课程:** [Agent Observability Platforms](../phases/14-agent-engineering/24-agent-observability-platforms/)
- **相关术语:** Trace, Evaluation (Eval), Agent State, Time to First Token (TTFT)

### Optimizer
- **分类:** 数学与训练
- **常见说法:** 用于更新权重的算法。
- **实际含义:** 将梯度转换为参数更新的算法。普通随机梯度下降是简单基线；momentum、Adam 等 optimizer 会利用历史信息或自适应缩放来改变更新。每种选择的内存占用、稳定性和调优行为都不同。
- **常见混淆:** optimizer 使用梯度；反向传播负责计算梯度。
- **相关术语:** Adam (Optimizer), AdamW, Gradient, Learning Rate

### Orchestration
- **分类:** Agent 与工具
- **实际含义:** 跨模型和工具步骤对工作进行排序、分支、委派、重试、暂停、恢复和终止的控制逻辑。
- **为什么重要:** 可靠的 agent 行为依赖模型之外明确的工作流决策，尤其当任务存在依赖关系或会带来重要副作用时。
- **实际使用:** 将稳定的步骤编码为工作流或状态机，把有边界的决策暴露给模型，并在外部写入前持久化状态转换。
- **常见混淆:** Orchestration 不等同于自主性或多 agent 系统；单个 agent 也可以由确定性的工作流编排。
- **相关术语:** Agent Harness, Planning, Delegation, Durable Execution
- **来源:** [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)

### Overfitting
- **分类:** 数学与训练
- **常见说法:** 模型记住了训练数据。
- **实际含义:** 一种泛化差距：模型在训练数据上的表现明显优于在有代表性的未见数据上的表现。记忆训练样本可能是成因之一，但可观测到的症状是泛化不佳。
- **实际使用:** 对比训练集与留出集指标，检查子群体失效，并测试数据质量、正则化、早停或模型容量等改动。
- **相关术语:** Underfitting, Dropout, Weight Decay, Eval Set

## P

### Paged KV Cache
- **分类:** 基础设施与服务
- **实际含义:** 一种 KV cache 内存管理器：它把注意力状态存入固定大小的块，并将逻辑序列位置映射到物理块，无需为每条序列分配一段连续内存。
- **为什么重要:** 可变的序列长度会导致内存碎片和不可预测的增长，因此基于块的分配可提高可用内存，并支持灵活共享。
- **实际使用:** 根据工作负载测量选择块大小，跟踪分配和驱逐，在请求之间隔离状态，并在内存压力下测试取消和前缀共享。
- **常见混淆:** Paged KV cache 管理运行时的注意力状态内存；它不会把模型参数移到磁盘，也不会扩展模型训练时的上下文长度上限。
- **学习课程:** [vLLM Serving Internals](../phases/17-infrastructure-and-production/04-vllm-serving-internals/)
- **相关术语:** KV Cache, Prefix Caching, Context Window, Model Serving
- **来源:** [Efficient Memory Management for Large Language Model Serving with PagedAttention](https://arxiv.org/abs/2309.06180)

### Parameter
- **分类:** 模型与推理
- **常见说法:** 用来描述模型大小的数值。
- **实际含义:** 训练过程中学习得到的值，通常是 weight、bias、embedding 元素或归一化参数。参数数量是衡量模型容量的一种指标，但不直接决定质量、内存占用或服务成本。
- **常见混淆:** 每个参数的内存占用取决于数值格式、量化元数据、分片、optimizer 状态、激活值和运行时开销。
- **相关术语:** Weight, MoE (Mixture of Experts), Quantization

### Pass@k
- **分类:** 评估与安全
- **实际含义:** 在一组任务中，至少有一个 k 次采样候选通过既定正确性测试的任务所占比例。
- **为什么重要:** 对于代码生成等可由自动验证器检查每个候选的任务，它衡量多次采样尝试的价值。
- **实际使用:** 在固定配置下独立生成候选，对每个候选运行相同的隔离测试，并报告 k 值以及采样和估计器细节。
- **常见混淆:** Pass@k 不是单次尝试的准确率；更高的分数可能反映更大的尝试预算，而不是更好的首个答案。
- **相关术语:** Coding Agent, Regression Test, Eval Set, Test Oracle
- **来源:** [Evaluating Large Language Models Trained on Code](https://arxiv.org/abs/2107.03374)

### Patch
- **分类:** AI-native 开发
- **实际含义:** 对一个或多个文件变更的可审查表示，通常以相对于已知基线版本的新增和删除来表达。
- **为什么重要:** Patch 为人和 agent 提供一个聚焦的产物，可在不接受整个工作目录的情况下检查、测试、应用或拒绝它。
- **实际使用:** 要求 coding agent 返回统一 diff，然后确认它只触及允许的文件，并能干净地应用到预期 commit。
- **常见混淆:** Patch 记录的是文件变更，不包含发布这些变更所需的推理、测试证据或审批。
- **学习课程:** [Workbench for Real Repositories](../phases/14-agent-engineering/41-workbench-for-real-repos/)
- **相关术语:** Coding Agent, Worktree, Scope Contract, Regression Test

### Patch Embedding
- **分类:** 多模态系统
- **实际含义:** 一种学习得到的投影，它将图像 patch 转换为固定宽度的向量，作为 transformer 输入序列中的一个元素。
- **为什么重要:** 它在空间图像网格与序列模型之间建立接口；patch 大小决定 token 数量和保留的局部细节。
- **实际使用:** 记录 patch 和图像尺寸，显式处理填充或缩放，加入位置信息，并衡量分辨率变化对准确率和 token 成本的影响。
- **常见混淆:** Patch embedding 是一个 patch 的向量表示，不是语义目标检测器，也不能保证 patch 边界与视觉实体相吻合。
- **学习课程:** [Vision Transformer Patch Tokens](../phases/12-multimodal-ai/01-vision-transformer-patch-tokens/)
- **相关术语:** Vision Transformer (ViT), Image Token, Embedding, Token
- **来源:** [An Image is Worth 16x16 Words](https://arxiv.org/abs/2010.11929)

### Perplexity
- **分类:** 模型与推理
- **常见说法:** 语言模型对一个数据集有多惊讶。
- **实际含义:** 在明确的 tokenization 和对数约定下，平均负对数似然的指数值。值越低，表示模型为被评估序列分配的概率越高。
- **常见混淆:** Perplexity 不能跨不同 tokenizer 或评估设置比较，也不直接衡量事实性或实用性。
- **相关术语:** Cross-Entropy, Token, Evaluation (Eval)

### Pipeline Parallelism
- **分类:** 基础设施与服务
- **实际含义:** 将模型中连续的一组层划分到多个设备上，再让 microbatch 或请求像流水线一样穿过这些阶段。
- **为什么重要:** 它让模型能够超出单个设备的内存容量，但阶段不均衡、流水线气泡、激活值传输和故障协调都会影响实际性能。
- **实际使用:** 平衡各阶段成本，选择 microbatch 调度，测量空闲时间和互连流量，并为模型和 checkpoint 分区元数据维护版本。
- **常见混淆:** Pipeline parallelism 按深度划分层；tensor parallelism 则在单层内划分张量运算。
- **学习课程:** [Scaling and Distributed Training](../phases/10-llms-from-scratch/05-scaling-distributed/)
- **相关术语:** Tensor Parallelism, Expert Parallelism, Batch Size, Model Serving
- **来源:** [GPipe](https://arxiv.org/abs/1811.06965)

### Planning
- **分类:** Agent 与工具
- **实际含义:** 构建、选择或修订一组行动及其依赖关系，以便从当前状态达到某个目标。
- **为什么重要:** 显式计划会在 agent 执行昂贵或不可逆操作之前，让假设和顺序变得可见。
- **实际使用:** 先要求给出简短且考虑依赖的计划，再根据可用工具和权限验证；当观察结果推翻某项假设时，重新规划。
- **常见混淆:** 生成的计划只是提案，并不能证明步骤可行、充分或安全。
- **相关术语:** Agent State, ReAct, Orchestration, Verification Gate
- **来源:** [LLM+P](https://arxiv.org/abs/2304.11477)

### Postmortem
- **分类:** 可靠性与运维
- **实际含义:** 一份可长期留存的事故记录，说明影响、发现、响应、促成条件、恢复过程和有责任人的后续行动；它不以归咎替代分析。
- **为什么重要:** 已解决的故障仍是有价值的证据。记录系统条件和决策，能将单次事件转化为改进，从而减少复发并缩短响应时间。
- **实际使用:** 从 trace 和日志构建时间线，区分触发事件与促成条件，分配带日期的行动，并审查每项行动是否改变了相关控制措施。
- **常见混淆:** Postmortem 不是会议纪要，也不是寻找某个人的错误；它应产出可测试的系统改进。
- **相关术语:** Incident Response, Regression Test, Audit Log, Observability
- **来源:** [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)

### Precision & Recall
- **分类:** 评估与安全
- **常见说法:** 分类或检索质量的两个指标。
- **实际含义:** Precision 衡量被标记项目中有多少是正确的；recall 衡量有多少相关项目被找到了。对于同一个固定评分模型，改变决策阈值时，提高 recall 往往会降低 precision，反之亦然。更好的模型可以同时提高两者。F1 是它们的调和平均数。
- **常见混淆:** 合适的阈值和指标取决于每类错误的代价，以及目标类别的普遍程度。
- **相关术语:** Eval Set, Semantic Search, Guardrails

### Prefill
- **分类:** 基础设施与服务
- **别名:** Prefill Phase
- **实际含义:** 推理的初始阶段：处理所有输入 token，生成其表示以及后续自回归生成所需的注意力状态。
- **为什么重要:** prompt 形态、排队和 cache 复用会影响 prefill 成本；prefill 与 decode 对计算资源的竞争方式也不同，因此它会显著影响启动延迟和服务调度。
- **实际使用:** 记录 prompt token 数量和 prefill 延迟，将排队时间与执行时间分开，对比缓存与未缓存前缀，并在活跃 decode 流量旁测试长 prompt。
- **常见混淆:** Prefill 是运行时处理 prompt 的阶段，不是生成的第一个 token 本身。首个 token 只会在 prefill 和所有排队完成后出现。
- **学习课程:** [Disaggregated Prefill and Decode](../phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/)
- **相关术语:** Decode Phase, KV Cache, Time to First Token (TTFT), Chunked Prefill
- **来源:** [Sarathi-Serve](https://www.usenix.org/system/files/osdi24-agrawal.pdf); [DistServe](https://arxiv.org/abs/2401.09670)

### Prefix Caching
- **分类:** 基础设施与服务
- **实际含义:** 跨请求复用由相同且符合条件的 token 前缀产生的 KV-cache 块，让服务运行时跳过重复的前缀计算。
- **为什么重要:** 共享的系统指令、模板或文档可能消耗大量 prefill 工作，但仅当 token 序列和 cache 可用条件一致时，复用才有帮助。
- **实际使用:** 将稳定 token 放在请求特定内容之前，在 cache 标识中包含模型和 tokenizer 版本，隔离租户敏感状态，监控命中率，并将驱逐视为正常现象。
- **常见混淆:** Prefix caching 会复用精确 token 前缀的运行时注意力状态。Prompt caching 是更广义的提供商或应用契约；semantic caching 则为足够相似的请求复用先前结果。
- **学习课程:** [Inference Optimization](../phases/10-llms-from-scratch/12-inference-optimization/)
- **相关术语:** Prompt Cache, Semantic Cache, KV Cache, Paged KV Cache
- **来源:** [SGLang](https://arxiv.org/abs/2312.07104)

### Progressive Disclosure
- **分类:** AI-native 开发
- **实际含义:** 先向人或模型提供最少但有用的上下文，再在任务或证据需要时逐步揭示更深层细节。
- **为什么重要:** 它在保留可按需取得的权威细节的同时，限制上下文噪声和成本。
- **实际使用:** 先给 coding agent 仓库规则和地图；只有在它识别出相关模块后，才加载完整实现文件。
- **常见混淆:** Progressive disclosure 是分阶段获取细节，不是刻意隐瞒做决策所必需的信息。
- **学习课程:** [Workbench for Real Repositories](../phases/14-agent-engineering/41-workbench-for-real-repos/)
- **相关术语:** Context Engineering, Repository Map, Token Budget, Handoff

### Prompt Cache
- **分类:** Prompt 与上下文
- **实际含义:** 对相同或符合条件的 prompt 前缀复用提供商侧或应用侧的计算，从而让重复推理避免部分预处理工作。
- **为什么重要:** 当满足提供商的 cache 契约时，稳定的指令和大量共享文档可以在重复调用中降低成本或提升速度。
- **实际使用:** 将稳定的政策文本放在请求特定内容之前，监控 cache-hit 元数据；因可用条件和存活期因提供商而异，应把未命中视为正常现象。
- **常见混淆:** Prompt cache 是提供商或应用的复用契约，内部可能采用 prefix caching。Prefix caching 专指复用符合条件的精确 token KV 状态；semantic caching 则为足够相似的请求复用先前结果。
- **学习课程:** [Prompt Caching](../phases/11-llm-engineering/15-prompt-caching/)
- **相关术语:** Semantic Cache, Prefix Caching, KV Cache, Time to First Token (TTFT)

### Prompt Engineering
- **分类:** Prompt 与上下文
- **常见说法:** 通过措辞让模型遵从任务指令。
- **实际含义:** 设计面向模型的指令、示例、约束和输出要求，以改善其在已定义任务上的行为。
- **常见混淆:** prompt 措辞无法弥补缺失的证据、不安全的权限、糟糕的工具契约或缺少的评估。
- **学习课程:** [Prompt Engineering](../phases/11-llm-engineering/01-prompt-engineering/)
- **相关术语:** Context Engineering, Few-Shot, System Prompt, Structured Output

### Prompt Injection
- **分类:** 评估与安全
- **常见说法:** 将模型引向错误方向的对抗性指令。
- **实际含义:** 一种攻击或失效模式：不可信内容影响模型，使其无视预期指令、暴露数据、滥用工具，或在用户目标之外采取行动。该内容可以直接来自用户，也可间接来自检索页面、文件、消息或工具输出。
- **为什么重要:** 模型通过同一个语言通道处理指令和数据，因此仅靠输入过滤无法可靠地区分每条恶意指令与合法内容。
- **实际使用:** 将外部内容视为不可信内容，使其与带有权威性的指令隔离，最小化工具权限，对重要写入要求审批，并验证输出和行动。
- **常见混淆:** Prompt injection 与 SQL injection 在技术机制上并不相同；更强的 system prompt 也不是完整防线。
- **学习课程:** [Prompt Injection Defense](../phases/14-agent-engineering/27-prompt-injection-defense/)
- **来源:** [OWASP prompt injection guidance](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- **相关术语:** Least Privilege, Sandbox, Approval Gate, Tool Contract

### Prompt Sensitivity
- **分类:** Prompt 与上下文
- **实际含义:** 当 prompt 的措辞、顺序、格式或示例发生变化，但任务意图保持不变时，模型输出或测得性能随之产生的差异。
- **为什么重要:** 只在一种方便的表述下成功的系统，对真实用户可能并不可靠，也可能在评估中造成误导。
- **实际使用:** 创建语义等价的 prompt 变体，按案例测量方差，并将这些变体保留在回归测试中，而不是围绕一个 eval set 优化单个 prompt。
- **常见混淆:** Sensitivity 并不总是 prompt 的缺陷；它可能暴露歧义、模型鲁棒性不足、decoding 不稳定或评分规则不充分。
- **相关术语:** Prompt Engineering, Eval Set, Regression Test, Few-Shot
- **来源:** [ProSA](https://aclanthology.org/2024.findings-emnlp.108/)

### Provenance Attestation
- **分类:** 安全与治理
- **实际含义:** 经认证、机器可读的元数据，将某个产物与关于其如何、何处、何时以及由哪些输入生成的声明绑定起来。
- **为什么重要:** 它让自动化政策和 reviewer 能验证供应链声明，而非信任一份未签名的构建说明。
- **实际使用:** 在构建系统中生成 attestation，将它绑定到产物摘要，用受控身份签名，并在发布前验证。
- **常见混淆:** 签名可识别证明者并保护完整性；它不能证明 attestation 中每项声明都为真。
- **相关术语:** Data Provenance, Reproducible Build, Audit Log, Verification Gate
- **来源:** [SLSA Software Attestations](https://slsa.dev/spec/v1.2/attestation-model)

### Purpose Limitation
- **分类:** 安全与治理
- **实际含义:** 对个人数据而言，只能为明确、具体的目的收集和使用数据；除非新的用途具备适当的相容或获授权依据。
- **为什么重要:** 在一个工作流中可接受的数据，若被悄然复用于模型训练、评估、个性化或无关分析，可能带来隐私和治理风险。
- **实际使用:** 为每个数据集记录用途，在访问前检查新流水线是否符合该用途，隔离不相容的使用，并在用途变化时要求有文档记录的决策。
- **常见混淆:** Purpose limitation 约束的是数据为何被使用；data minimization 约束的是该用途实际需要多少数据。
- **相关术语:** Data Minimization, Data Classification, AI Risk Assessment, Audit Log
- **来源:** [General Data Protection Regulation, Article 5(1)(b)](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
## Q

### QLoRA
- **分类:** 数学与训练
- **常见说法:** 使用量化基座模型的 LoRA。
- **实际含义:** 一种参数高效微调方法：将预训练基座模型以低比特量化表示冻结，仅在需要处以更高精度计算训练 LoRA adapter。
- **为什么重要:** 它能减少适配大模型所需的内存，但节省幅度和质量取决于模型、rank、optimizer、序列长度、硬件和具体实现。
- **常见混淆:** QLoRA 不保证特定的内存占用，也不保证与全量微调之间存在固定的质量差距。
- **学习课程:** [Fine-Tuning and LoRA](../phases/11-llm-engineering/08-fine-tuning-lora/)
- **来源:** [QLoRA paper](https://arxiv.org/abs/2305.14314)
- **相关术语:** LoRA (Low-Rank Adaptation), Quantization, Fine-tuning

### Quantization
- **分类:** 模型与推理
- **常见说法:** 用更少的 bit 存储或计算模型数值。
- **实际含义:** 使用较低精度格式表示权重、激活值或 cache，以降低内存、带宽或计算成本。不同方法在校准、粒度、数据类型，以及转换发生在训练前、训练中还是训练后等方面各不相同。
- **常见混淆:** 从一种标称 bit 宽度变为另一种，并不保证端到端内存或速度按相同比例变化；元数据、kernel、cache 和硬件支持同样会产生影响。
- **相关术语:** QLoRA, Mixed Precision, Parameter

## R

### RAG (Retrieval-Augmented Generation)
- **分类:** 检索与生成
- **常见说法:** 模型基于检索到的知识回答。
- **实际含义:** 一种系统模式：先检索与请求相关的证据，再将选定内容提供给生成模型，由它进行回答或执行操作。检索可采用词法、向量、结构化或混合方法。
- **为什么重要:** RAG 能提供最新或私有的证据，而无需把它们编码进模型权重；不过仍应将检索质量与 grounding 分开评估。
- **名称由来:** Retrieval 负责找到证据，augmentation 将选定证据加入上下文，generation 则产出响应。
- **学习课程:** [Retrieval-Augmented Generation](../phases/11-llm-engineering/06-rag/)
- **来源:** [Retrieval-Augmented Generation paper](https://arxiv.org/abs/2005.11401)
- **相关术语:** Grounding, Hybrid Retrieval, Reranker, Hallucination

### Rate Limit
- **分类:** AI-native 开发
- **实际含义:** 一项策略：在规定的时间或容量窗口内，对请求数、token 数、并发工作量或其他资源设置上限。
- **为什么重要:** 它能保护 provider 和你自己的系统免受过载、失控支出及不公平资源使用的影响。
- **实际使用:** 按租户实施 token 和并发限制，读取 provider 的重试元数据，并以可预测的方式将超额工作排队或拒绝。
- **常见混淆:** Rate limit 控制允许的使用量；backpressure 则把下游容量约束向系统上游传递。
- **相关术语:** Backpressure, Retry with Backoff, Circuit Breaker

### ReAct
- **分类:** Agent 与工具
- **实际含义:** 一种 agent 模式：在决定下一步前，交替进行任务推理、具体行动，以及接收环境返回的观察结果。
- **为什么重要:** 环境反馈能纠正假设，并为后续决策提供依据，无需迫使模型仅靠内部生成完成整个任务。
- **实际使用:** 提供一小组类型明确的工具，返回简洁的观察结果，限制循环次数，并验证最终产物，而不是保存私有推理轨迹。
- **常见混淆:** ReAct 是一种 prompting 和控制模式，不保证自主性、正确性或安全的工具使用。
- **相关术语:** Agent, Function Calling, Planning, Grounding
- **来源:** [ReAct](https://arxiv.org/abs/2210.03629)

### Readiness Probe
- **分类:** 可靠性与运维
- **实际含义:** 一项诊断，用来告知流量路由层某个服务实例当前是否能够接收请求。
- **为什么重要:** 进程仍存活时，模型可能尚未加载、依赖可能不可用，或预热尚未完成；过早导入流量会带来本可避免的失败。
- **实际使用:** 检查服务所需的最小依赖，在启动和排空流量期间让 readiness 失败，保持探针轻量，并且不要只因 readiness 为 false 就重启进程。
- **常见混淆:** Readiness 决定是否可接收流量；liveness 决定进程是否应被重启，两者都不能证明每个模型响应都正确。
- **学习课程:** [Production LLM Application](../phases/11-llm-engineering/13-production-app/)
- **相关术语:** Autoscaling, Model Serving, Availability, Graceful Degradation
- **来源:** [Kubernetes Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)

### Recall@K
- **分类:** 检索与生成
- **实际含义:** 对单个查询，Recall@K 为 `|relevant items intersecting the top k| / |relevant items|`。数据集得分则按声明的规则聚合各查询的该数值。
- **为什么重要:** 它衡量检索阶段是否为下游生成或 reranking 提供了足够多的相关候选。
- **实际使用:** 定义相关性标注、k 值、聚合方法以及没有已标注相关项查询的处理策略，再检查没有召回证据的查询。
- **常见混淆:** 高 Recall@K 不代表首个结果足够好、排序合理，或最终答案有 grounding。没有相关项的查询需要明确采用排除或赋值策略，因为分母为零。
- **相关术语:** Precision & Recall, Eval Set, Reranker, Approximate Nearest Neighbor (ANN)
- **来源:** [BEIR](https://openreview.net/forum?id=wCu6T5xFjeJ)

### Reciprocal Rank Fusion (RRF)
- **分类:** 检索与生成
- **实际含义:** 一种排序融合方法：对每个条目在各个结果列表中的随名次下降的贡献求和，从而组合多个结果列表。
- **为什么重要:** 它能合并词法、dense 或多查询排序，而无需假设各自的原始分数使用同一尺度。
- **实际使用:** 检索彼此独立的候选列表，按稳定的文档标识去重，应用一个有版本管理的融合常数，并相对每个单独 retriever 进行评估。
- **常见混淆:** RRF 融合的是排名，不是 embedding 或相关性分数；它无法找回所有输入中都未出现的条目。
- **相关术语:** Hybrid Retrieval, BM25, Dense Retrieval, Reranker
- **来源:** [Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods](https://dl.acm.org/doi/10.1145/1571941.1572114)

### Red Teaming
- **分类:** 安全与治理
- **实际含义:** 一种结构化对抗测试过程：经授权的测试人员依据已记录的目标、威胁假设、案例和证据来寻找失败。
- **为什么重要:** 常规质量测试很少会探索系统在操纵、滥用、目标冲突或蓄意绕过控制时的行为。
- **实际使用:** 从威胁模型推导攻击，在隔离环境中执行，记录可复现案例，按层修复，并将已确认的失败转化为回归评估。
- **常见混淆:** 一组 jailbreak prompt 不是完整的 red-team 项目，red teaming 也无法证明不存在未知失败。
- **相关术语:** Threat Model, Guardrails, Prompt Injection, Eval Set
- **来源:** [Red Teaming Language Models with Language Models](https://arxiv.org/abs/2202.03286)

### Regression Test
- **分类:** AI-native 开发
- **实际含义:** 一项可重复执行的检查，用于保护已知正确的行为，尤其是在代码、prompt、模型、检索或工具发生变化之后。
- **为什么重要:** AI 系统的改动可能提升平均质量，却悄然重新引入先前已修复的故障。
- **实际使用:** 将一次已修复的 prompt-injection 事故变成永久评估案例，在下次部署前必须通过。
- **常见混淆:** Regression test 保护特定的预期行为；广泛 benchmark 估计的是更宽任务分布上的表现。
- **学习课程:** [Eval-Driven Agent Development](../phases/14-agent-engineering/30-eval-driven-agent-development/)
- **相关术语:** Eval Set, Verification Gate, Patch, Evaluation (Eval)

### ReLU
- **分类:** 数学与训练
- **常见说法:** 一个简单的 activation function。
- **实际含义:** Rectified Linear Unit，定义为 `f(x) = max(0, x)`。它计算成本低，正半轴不饱和；但负半轴梯度为零，可能产生失活单元。
- **相关术语:** Activation Function, Gradient, CNN (Convolutional Neural Network)

### Repository Instructions
- **分类:** AI-native 开发
- **实际含义:** 受版本控制的指引，说明 coding agent 应如何理解仓库组织、适用哪些命令和约定、需遵守哪些边界，以及如何验证工作。
- **为什么重要:** 它把反复传递的隐性知识变成随代码流转的本地上下文，并可以针对不同子项目有所区别。
- **实际使用:** 在仓库根目录保留 `AGENTS.md`，为子目录添加更细粒度的文件，并写明构建、测试、生成文件、安全和贡献方面的准确规则。
- **常见混淆:** Repository instructions 是对源代码和人工文档的补充；它们不会覆盖用户当前请求，也不保证 agent 会正确遵循。
- **相关术语:** Repository Map, Scope Contract, Coding Agent, Progressive Disclosure
- **来源:** [AGENTS.md specification](https://agents.md/)

### Repository Map
- **分类:** AI-native 开发
- **实际含义:** 对仓库重要目录、所有权边界、入口点、构建命令、测试、生成文件和本地指引的紧凑且持续维护的说明。
- **为什么重要:** 它帮助 coding agent 在加载大文件或编辑错误子系统之前，先找到正确的证据。
- **实际使用:** 从目录树和 manifest 生成索引，再用模块边界和验证命令的权威说明加以补充。
- **常见混淆:** 原始文件树只展示名称；repository map 解释哪些路径重要，以及它们与任务的关系。
- **学习课程:** [Repository Memory and State](../phases/14-agent-engineering/34-repo-memory-and-state/)
- **相关术语:** Coding Agent, Progressive Disclosure, Scope Contract, Context Engineering

### Reproducible Build
- **分类:** AI-native 开发
- **实际含义:** 一种构建：其声明的源码、环境和指令可被独立复现，并产出逐 bit 相同的指定产物。
- **为什么重要:** 它让产物能够在原始机器或 agent 之外被验证，并暴露隐藏的构建输入。
- **实际使用:** 固定 toolchain 和依赖，消除时间戳与不稳定排序，记录环境，然后比较独立重建产物的摘要。
- **常见混淆:** 一次构建连续成功两次只说明其具有可重复性的证据；可复现性要求满足声明的独立条件且输出完全相同。
- **相关术语:** Repository Instructions, Verification Gate, Provenance Attestation, Software Bill of Materials (SBOM)
- **来源:** [Reproducible Builds definition](https://reproducible-builds.org/docs/definition/)

### Reranker
- **分类:** 检索与生成
- **实际含义:** 一种第二阶段模型或评分函数，利用查询与每个候选之间更丰富的比较，对小规模候选集重新排序。
- **为什么重要:** 快速的第一阶段检索最大化候选覆盖面，而 reranking 能改善哪些证据进入受限的上下文窗口。
- **实际使用:** 用混合检索召回 50 个候选，以 cross-encoder 对每组查询—文档对评分，并向 generation 提供前 5 个有依据的 chunk。
- **常见混淆:** Reranker 不会搜索整个语料库；它只重排检索阶段已经找到的候选。
- **相关术语:** Hybrid Retrieval, Semantic Search, RAG (Retrieval-Augmented Generation)

### Retry Budget
- **分类:** 可靠性与运维
- **实际含义:** 对重试流量设置的上限，通常相对于原始请求或在一个时间窗口内表达，用以防止重试无限消耗容量。
- **为什么重要:** 当依赖变慢或失败时，无限制重试恰好会在系统余量最少的时候放大负载。
- **实际使用:** 将重试与首次尝试分别计数，按服务和租户设上限，遵守 deadline，使用带 jitter 的 backoff，并停止重试非瞬态或非幂等操作。
- **常见混淆:** Retry budget 限制额外尝试次数；error budget 衡量 SLO 允许的用户可见不可靠性。
- **相关术语:** Retry with Backoff, Error Budget, Rate Limit, Admission Control
- **来源:** [Google SRE: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)

### Retry with Backoff
- **分类:** AI-native 开发
- **实际含义:** 在逐步延长的延迟后重试失败的瞬态操作，通常使用随机 jitter，并设定严格的重试上限。
- **为什么重要:** 立即发起同步重试会加剧故障、消耗 rate limit，并导致副作用重复发生。
- **实际使用:** 对 provider 超时采用有上限的指数延迟重试，遵从服务端重试建议，并为任何写入复用 idempotency key。
- **常见混淆:** 不应重试永久性的校验或权限错误；没有防重复策略时，也不应重试非幂等操作。
- **相关术语:** Idempotency, Rate Limit, Circuit Breaker, Backpressure

### Reviewer Agent
- **分类:** AI-native 开发
- **实际含义:** 被指派按明确标准检查另一位 agent 的产物或决策，并返回发现或结论的 agent。
- **为什么重要:** 角色分离能发现遗漏，但前提是 reviewer 获得独立证据和具体的评判标准。
- **实际使用:** 一个 agent 产出 patch 后，将 diff、scope contract、仓库规则和测试输出交给独立 reviewer，再要求其给出逐行发现。
- **常见混淆:** 第二次模型调用并不会自动独立或正确。共享上下文、模型偏差和模糊标准都可能复现同样的错误。
- **学习课程:** [Reviewer Agent](../phases/14-agent-engineering/39-reviewer-agent/)
- **相关术语:** Coding Agent, Verification Gate, Scope Contract, LLM-as-a-Judge

### RLHF (Reinforcement Learning from Human Feedback)
- **分类:** 数学与训练
- **常见说法:** 用人类偏好训练模型。
- **实际含义:** 一类流水线：利用人类反馈学习 reward 或偏好信号，再针对该信号优化模型 policy。具体实现不同，不一定都使用相同的 reinforcement-learning 算法。
- **常见混淆:** RLHF 优化的是从收集到的反馈中学习到的代理目标；它不保证与每位用户或各种情境实现广泛 alignment。
- **学习课程:** [Reinforcement Learning from Human Feedback](../phases/10-llms-from-scratch/07-rlhf/)
- **来源:** [InstructGPT paper](https://arxiv.org/abs/2203.02155)
- **相关术语:** DPO (Direct Preference Optimization), SFT (Supervised Fine-Tuning), Alignment

### Rollback
- **分类:** 可靠性与运维
- **实际含义:** 当当前发布违反运维、质量或安全标准时，恢复到此前已知状态的部署或配置。
- **为什么重要:** Agent 和模型的改动即使经过部署前评估，仍可能在生产中失败，因此必须在 rollout 前设计好恢复方案。
- **实际使用:** 保留带版本的产物和配置，定义 rollback 触发条件，演练命令及其数据影响，并在恢复后验证服务健康状态。
- **常见混淆:** 代码 rollback 不会自动撤销数据库迁移、外部副作用、缓存输出或错误发布所写入的数据。
- **相关术语:** Canary Release, Checkpoint, Regression Test, Durable Execution
- **来源:** [Kubernetes Deployments: Rolling Back](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-back-a-deployment)

### ROUGE
- **分类:** 评估与安全
- **常见说法:** 常用于摘要的参考文本重叠指标。
- **实际含义:** 一类指标，使用 n-gram 重叠或最长公共子序列等单位，将生成文本与参考文本进行比较。
- **常见混淆:** 表面重叠可能遗漏语义等价内容，也可能奖励照抄措辞，却无法证明事实质量。
- **相关术语:** Evaluation (Eval), Precision & Recall, LLM-as-a-Judge
## S

### Sandbox
- **分类:** Agent 与工具
- **实际含义:** 一种隔离的执行环境，限制 agent 访问文件、进程、网络目标、凭证和宿主机资源。
- **为什么重要:** 生成的代码和工具调用可能出错或带有恶意。隔离可限制其影响范围，也让可随时丢弃的验证成为可能。
- **实际使用:** 在临时容器中运行测试：基础镜像只读、工作区具有受限写入权限、不放生产密钥，并明确配置网络允许列表。
- **常见混淆:** Sandbox 能降低影响，却不能证明其中的代码正确或无害。
- **学习课程:** [Production Agent Runtimes](../phases/14-agent-engineering/29-production-runtimes/)
- **相关术语:** Least Privilege, Approval Gate, Coding Agent, Guardrails

### Saturation
- **分类:** 可靠性与运维
- **实际含义:** 受限资源或服务的容量被耗尽的程度，也包括无法及时开始执行的排队工作。
- **为什么重要:** 即使利用率看起来可以接受，内存、加速器槽位、队列深度或下游配额也可能已经限制有效吞吐量。
- **实际使用:** 找出每项关键资源，度量正在执行和等待执行的工作，将饱和度与尾延迟和错误关联起来，并在队列进入不稳定增长状态前告警。
- **常见混淆:** Saturation 不是一个通用百分比。瓶颈资源及其排队行为取决于工作负载和架构。
- **相关术语:** Observability, Autoscaling, Backpressure, Tail Latency
- **来源:** [Google SRE: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)

### Scope Contract
- **分类:** AI-native 开发
- **实际含义:** 一份具体约定，定义任务目标、允许和禁止触及的范围、预期产物、验证要求及停止条件。
- **为什么重要:** 它能避免 agent 把一个小修复扩大成难以审查的重构，也能防止在没有证据时宣称完成。
- **实际使用:** 明确只有 parser 模块及其测试可以修改，公共 API 必须保持兼容，且指定的测试套件必须通过。
- **常见混淆:** 任务描述说明你想要什么；scope contract 还会定义边界和证明要求。
- **学习课程:** [Scope Contracts](../phases/14-agent-engineering/36-scope-contracts/)
- **相关术语:** Coding Agent, Patch, Verification Gate, Handoff

### Self-Attention
- **分类:** 模型与推理
- **常见说法:** token 决定哪些其他 token 更重要。
- **实际含义:** 一种注意力机制，其中 query、key 和 value 都来自同一序列表示。经缩放的相似度分数会被归一化后用于组合 value，并受因果、填充、局部或其他 mask 约束。
- **为什么重要:** 它能构建与上下文相关的 token 表示，但允许的注意力模式取决于具体架构。
- **常见混淆:** 并非每个 token 都能始终注意到其他所有 token。因果模型和稀疏模型会有意限制连接。
- **学习课程:** [Self-Attention from Scratch](../phases/07-transformers-deep-dive/02-self-attention-from-scratch/)
- **相关术语:** Attention, Transformer, Context Window

### Semantic Cache
- **分类:** AI-native 开发
- **实际含义:** 当新请求在选定表示和阈值下被判定为足够相似时，复用先前结果的缓存。
- **为什么重要:** 它可以为重复意图降低延迟和成本，但错误匹配可能返回过时或不适合当前用户的输出。
- **实际使用:** 按归一化意图缓存低风险 FAQ 答案，在 key 中包含租户和政策版本；对于个性化或时效性请求则绕过缓存。
- **常见混淆:** 语义相似不代表两个请求有相同的正确答案。Semantic cache 复用先前结果；prefix caching 复用精确 token 的 KV 状态；prompt caching 则遵循提供商或应用的适用规则。
- **相关术语:** Prompt Cache, Embedding, Cost per Successful Task, Grounding

### Semantic Search
- **分类:** 检索与生成
- **常见说法:** 按含义而非精确字词搜索。
- **实际含义:** 将 query 和候选项表示在 embedding 空间中，并使用向量相似度函数对候选项排序的检索方式。
- **为什么重要:** 它能检索同义改写和概念相关文本，但精确标识符和罕见字符串仍可能需要词法搜索。
- **相关术语:** Embedding, Hybrid Retrieval, Vector Database, Reranker

### Separation of Duties
- **分类:** 安全与治理
- **实际含义:** 将相互冲突的职责或权限分配给独立角色，使单一主体无法在没有另一项授权决策的情况下完成高风险操作。
- **为什么重要:** 被攻陷的账号或出错的 agent 不应能对同一项重要变更提议、审批、执行并掩盖痕迹。
- **实际使用:** 将产物创建与发布审批分离，使用不同身份，在审计日志中保留两项决策，并定义事后审查的紧急访问机制。
- **常见混淆:** 职责分离针对的是冲突权限，不只是把工作分给多个共用相同凭证的人或 agent。
- **相关术语:** Approval Gate, Reviewer Agent, Audit Log, Least Privilege
- **来源:** [NIST SP 800-53 Rev. 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)

### Service Level Indicator (SLI)
- **分类:** 可靠性与运维
- **实际含义:** 在明确、与用户相关的边界上度量服务行为的量化指标，例如成功请求占比或低于某个阈值的延迟比例。
- **为什么重要:** 只有明确观测行为、适格事件和测量位置，可靠性讨论才能落到可执行的层面。
- **实际使用:** 定义分子、分母、排除项、数据来源和聚合窗口，再验证该指标确实跟踪用户实际经历的结果。
- **常见混淆:** SLI 是度量本身；SLO 是在指定周期内施加于该度量的目标。
- **相关术语:** Service Level Objective (SLO), Availability, Tail Latency, Observability
- **来源:** [Google SRE: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)

### Service Level Objective (SLO)
- **分类:** 可靠性与运维
- **实际含义:** 针对服务级别指标，在规定的总体范围和测量窗口内设定的目标区间或阈值。
- **为什么重要:** 它将预期的用户结果转化为监控、容量、发布风险和事故决策的运行边界。
- **实际使用:** 选择用户真正关心的指标，根据产品需求而非当前表现设定目标，定义窗口和排除项，并附上 error budget 策略。
- **常见混淆:** SLO 是内部可靠性目标。具有合同效力的服务级别协议可能包含补救措施，也可能使用不同定义。
- **学习课程:** [Inference Metrics and Goodput](../phases/17-infrastructure-and-production/08-inference-metrics-goodput/)
- **相关术语:** Service Level Indicator (SLI), Error Budget, Availability, Goodput
- **来源:** [Google SRE: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)

### SFT (Supervised Fine-Tuning)
- **分类:** 数学与训练
- **常见说法:** 用示例输入和期望输出训练模型。
- **实际含义:** 在成对的输入与期望响应上微调预训练模型，让它在训练分布下学习所展示的行为。
- **常见混淆:** SFT 不仅能适配聊天行为；示例质量决定了哪些行为会被强化。
- **相关术语:** Fine-tuning, DPO (Direct Preference Optimization), RLHF (Reinforcement Learning from Human Feedback)

### Shadow Traffic
- **分类:** 可靠性与运维
- **实际含义:** 将线上请求流量的一份副本发送给候选系统进行观察，同时候选系统的响应不进入主要用户响应路径。由于复制的请求仍会执行，其副作用必须隔离。
- **为什么重要:** 它让候选系统接触真实的输入形态和负载，同时限制对用户的影响，从而暴露合成测试未能发现的故障。
- **实际使用:** 删除或 token 化敏感字段，将工具和依赖指向 sandbox 或无操作目标，在能力边界阻止写入，保留请求关联，并避免 shadow 负载与用户流量竞争。
- **常见混淆:** 候选响应不进入主路径，并不意味着执行没有副作用。Canary release 的不同在于，它会让候选系统为受控比例的真实用户提供服务。
- **学习课程:** [Shadow, Canary, and Progressive Delivery](../phases/17-infrastructure-and-production/20-shadow-canary-progressive/)
- **相关术语:** Canary Release, Evaluation (Eval), Trace, Model Serving
- **来源:** [Istio Traffic Mirroring](https://istio.io/latest/docs/tasks/traffic-management/mirroring/)

### Shared Embedding Space
- **分类:** 多模态系统
- **实际含义:** 一种公共向量空间，不同模态的表示可以在其中使用同一个相似度函数进行比较。
- **为什么重要:** 它支持跨模态检索和匹配，例如根据文本查找图像，而无需让两个对象共享原始表示。
- **实际使用:** 有意识地训练配对样本和非配对负样本，在目标函数要求时归一化向量，评估两个检索方向，并检查子群体和语言表现。
- **常见混淆:** 共享向量维度并不会自动产生共享语义空间。训练目标和数据必须建立跨模态可比性。
- **学习课程:** [CLIP Contrastive Pretraining](../phases/12-multimodal-ai/02-clip-contrastive-pretraining/)
- **相关术语:** Embedding, Cosine Similarity, Modality Alignment, Semantic Search
- **来源:** [Learning Transferable Visual Models From Natural Language Supervision](https://proceedings.mlr.press/v139/radford21a.html)

### Softmax
- **分类:** 数学与训练
- **常见说法:** 将 logits 转换为归一化正值的函数。
- **实际含义:** 定义为 `softmax(x_i) = exp(x_i) / sum(exp(x_j))` 的函数，实际实现会进行数值稳定化处理。其输出为正且总和为一，因此可以参数化一个类别分布。
- **常见混淆:** Softmax 的值并不天然就是关于现实世界正确性的校准概率。
- **相关术语:** Temperature, Cross-Entropy, Attention

### Software Bill of Materials (SBOM)
- **分类:** 安全与治理
- **别名:** SBOM
- **实际含义:** 与某个产品或产物相关的软件组件及其关系的结构化清单，通常包含版本、供应商、许可证和标识符。
- **为什么重要:** 当软件发生变化或出现漏洞时，需要组件清单来评估受影响的依赖、许可证义务和供应链暴露面。
- **实际使用:** 在可信构建期间生成 SBOM，将其绑定到发布产物，在策略检查中验证，并在依赖或打包发生变化时更新。
- **常见混淆:** SBOM 是清单，并不能证明组件安全、许可证正确或实际存在，除非生成过程和来源可信。
- **相关术语:** Provenance Attestation, Reproducible Build, Data Provenance, Audit Log
- **来源:** [SPDX 3.0.1 specification](https://spdx.github.io/spdx-spec/v3.0/)

### Speculative Decoding
- **分类:** 模型与推理
- **实际含义:** 一种推理方法：成本更低的草稿过程先提出多个 token，目标模型再并行评分这些草稿位置。在精确采样变体中，接受和校正规则会保持目标模型的输出分布。
- **为什么重要:** 当草稿被接受时，它可以减少目标模型串行解码的工作量，无需改变目标模型已训练的权重。
- **实际使用:** 用真实 prompt 测量接受率和端到端延迟，计入草稿模型开销，并验证实现保持了预期的解码分布。
- **常见混淆:** Speculative decoding 不是普通的模型路由或未经验证的自动补全。精确变体通过接受和校正保留目标分布；近似变体可能为了速度牺牲该保证。
- **相关术语:** Autoregressive, KV Cache, Decoding Strategy, Tokens per Second (TPS)
- **来源:** [Fast Inference from Transformers via Speculative Decoding](https://proceedings.mlr.press/v202/leviathan23a.html)

### Stochastic Gradient Descent (SGD)
- **分类:** 数学与训练
- **别名:** SGD
- **实际含义:** 一类 optimizer：它使用从抽样样本或 minibatch 估计出的梯度更新参数，而不是使用完整训练数据集。
- **为什么重要:** 它是理解梯度噪声、momentum、batch 扩展，以及现代训练中自适应 optimizer 的基础。
- **实际使用:** 记录 batch 采样、learning rate、如有使用则记录 momentum 和调度策略；随后在相同更新次数或 token 预算下比较验证集表现。
- **常见混淆:** 在当前实践中，SGD 通常指 minibatch SGD，其有效学习率并不遵循唯一通用的 batch 扩展规则。
- **相关术语:** Gradient Descent, Batch Size, Learning Rate, Optimizer
- **来源:** [Optimization Methods for Large-Scale Machine Learning](https://arxiv.org/abs/1606.04838); [Accurate, Large Minibatch SGD](https://arxiv.org/abs/1706.02677)

### Stop Sequence
- **分类:** 模型与推理
- **实际含义:** 由应用指定的一段 token 或文本模式，当解码系统遇到它时，生成就会停止。
- **为什么重要:** Stop sequence 可以约束输出协议和多段生成，无需等待模型从语义上自行判断已经结束。
- **实际使用:** 选择无歧义的分隔符，测试 tokenization 和部分流式匹配，并且仍要实施输出长度和 schema 校验。
- **常见混淆:** Stop sequence 是机械性的解码条件，并不能证明答案完整，也不能证明 agent 目标已满足。
- **相关术语:** Decoding Strategy, Structured Output, Token, Termination Condition
- **来源:** [Transformers text-generation documentation](https://huggingface.co/docs/transformers/main/en/main_classes/text_generation)

### Streaming
- **分类:** 模型与推理
- **常见说法:** 输出生成时就展示出来。
- **实际含义:** 在完整结果就绪之前持续交付增量响应事件。根据 API 的不同，流可能包含 token 文本、结构化增量、工具调用参数、用量元数据或状态事件。
- **为什么重要:** 它能提升感知响应速度，但不会缩短模型生成完整答案所需的实际时间。
- **常见混淆:** 网络传输方式、事件形状和分块边界由提供商决定，不能保证与单词或 token 对齐。
- **学习课程:** [Production LLM Application](../phases/11-llm-engineering/13-production-app/)
- **相关术语:** Time to First Token (TTFT), Autoregressive, Observability

### Structured Output
- **分类:** Agent 与工具
- **实际含义:** 受机器可读 schema 约束或针对其验证的模型输出，使应用代码能够消费字段，而无需解析自由形式的散文。
- **为什么重要:** 它减少模型到软件边界的格式歧义，并支持字段级验证和重试。
- **实际使用:** 要求事故分诊结果包含允许的严重性枚举、证据数组和可为空的升级原因，然后拒绝所有未通过 schema 校验的响应。
- **常见混淆:** Schema 有效的输出仍可能包含错误值。结构不是事实验证。
- **学习课程:** [Structured Outputs](../phases/11-llm-engineering/03-structured-outputs/)
- **相关术语:** Function Calling, Tool Contract, Verification Gate

### Swarm
- **分类:** Agent 与工具
- **常见说法:** 许多 agent 在没有固定控制器的情况下协作。
- **实际含义:** 一种松散协调的多 agent 模式，其中局部的 agent 决策和消息交换共同产生系统级行为。该术语的用法不一致，因此必须明确实际拓扑、状态归属和终止规则。
- **常见混淆:** 有多个具名 agent，并不保证会有有用的专长分工或涌现式协作。
- **相关术语:** Agent, Reviewer Agent, Handoff, Agent State

### System Prompt
- **分类:** Prompt 与上下文
- **常见说法:** 由开发者控制的模型交互指令。
- **实际含义:** 由提供商定义、由应用提供的指令消息或配置，用于在该提供商的指令层级中建立行为和约束。
- **为什么重要:** System instructions 能引导行为，但不能保证始终保密，也不应视为安全边界。
- **常见混淆:** 优先级规则、消息角色、持久性和可见性因 API 而异。应查阅当前提供商的契约。
- **学习课程:** [Instructions as Executable Constraints](../phases/14-agent-engineering/33-instructions-as-executable-constraints/)
- **相关术语:** Prompt Engineering, Prompt Injection, Context Engineering, Guardrails
## T

### Tail Latency
- **分类:** 可靠性与运维
- **实际含义:** 请求中最慢那一部分所经历的延迟，通常会在明确的工作负载和时间窗口下用高分位数来概括。
- **为什么重要:** 平均值看起来可能很健康，但排队、资源争用、重试或请求成本的波动，会让相当一部分用户等待得久得多。
- **实际使用:** 按路由和工作负载报告多个分位数；按已记录的规则将超时保留为删失观测或失败观测；并跨依赖链路追踪慢请求。
- **常见混淆:** Tail latency 不是单个最慢请求；脱离分位数、总体人群和测量边界，它没有意义。
- **学习课程:** [Inference Metrics and Goodput](../phases/17-infrastructure-and-production/08-inference-metrics-goodput/)
- **相关术语:** Time to First Token (TTFT), Time per Output Token (TPOT), Saturation, Goodput
- **来源:** [The Tail at Scale](https://research.google/pubs/the-tail-at-scale/)

### Temperature
- **分类:** 模型与推理
- **常见说法:** 控制创造力的设置。
- **实际含义:** 在形成概率分布前重新缩放 logits 的解码参数。较高的正值通常会让分布更平坦，较低的正值则会让分布更尖锐。
- **为什么重要:** Temperature 改变的是采样行为，而不是模型掌握的知识或事实准确性。
- **常见混淆:** 设置为零时通常会采用贪心解码，但具体行为和确定性取决于提供商、采样器、是否支持 seed，以及服务系统。
- **相关术语:** Softmax, Autoregressive, Token

### Tensor
- **分类:** 数据与表示
- **常见说法:** 用于数值计算的多维数组。
- **实际含义:** 一种带有形状、数据类型和设备放置位置的类型化数组，框架用它表示输入、参数、激活值和梯度。自动微分元数据取决于框架和操作，并非每个 tensor 固有的属性。
- **相关术语:** Autograd, Parameter, Mixed Precision

### Tensor Parallelism
- **分类:** 基础设施与服务
- **实际含义:** 将模型层内部的 tensor 运算划分到多个设备上，并在层计算期间通过集合通信合并部分结果。
- **为什么重要:** 它让单层可以利用多个设备的内存和算力，但当互连或划分方式不合适时，频繁通信可能占据主要开销。
- **实际使用:** 让划分维度匹配模型形状，基准测试集合通信流量，将 ranks 部署在高速互连上，并将分片布局随 checkpoint 和服务配置一同记录。
- **常见混淆:** Tensor parallelism 在层内部拆分工作；pipeline parallelism 则将不同层组放到不同设备上。
- **学习课程:** [Scaling and Distributed Training](../phases/10-llms-from-scratch/05-scaling-distributed/)
- **相关术语:** Tensor, Pipeline Parallelism, Expert Parallelism, Parameter
- **来源:** [Megatron-LM](https://arxiv.org/abs/1909.08053)

### Termination Condition
- **分类:** Agent 与工具
- **实际含义:** 一条显式规则：当 agent 成功、失败、耗尽预算、到达安全边界或需要升级处理时，结束或暂停其运行。
- **为什么重要:** 没有 termination condition，agent 可能陷入循环、重复产生副作用、浪费预算，或在未完成目标时宣称已完成。
- **实际使用:** 在启动循环前定义成功证据、最大步数和成本、不可重试的错误，以及升级处理状态。
- **常见混淆:** Stop sequence 结束文本生成；termination condition 决定任务或工作流是否应停止。
- **相关术语:** Agent Harness, Token Budget, Verification Gate, Stop Sequence
- **来源:** [AutoGen](https://arxiv.org/abs/2308.08155)

### Test Oracle
- **分类:** AI-native 开发
- **实际含义:** 用于判断观测到的程序行为是否正确的机制、规范、参考实现、不变量或人工判断。
- **为什么重要:** 仅生成测试输入还不够；自动验证需要一个独立依据来判定每项结果。
- **实际使用:** 优先使用可执行的不变量、参考实现、schema 和确定性的预期输出，然后记录哪些部分仍需人工判断。
- **常见混淆:** 编写代码的模型，即使被要求判断自己的输出是否正确，也不应被视为独立的 oracle。
- **相关术语:** Regression Test, Verification Gate, Eval Set, Human-in-the-Loop (HITL)
- **来源:** [The Oracle Problem in Software Testing](https://www.computer.org/csdl/journal/ts/2015/05/06963470/13rRUx0geBw)

### Threat Model
- **分类:** 安全与治理
- **实际含义:** 一份文档化说明，涵盖受保护资产、信任边界、潜在对手、假定能力、攻击路径、影响及计划中的控制措施。
- **为什么重要:** 若不说明防御什么、针对谁、基于哪些假设，就无法评估安全控制措施。
- **实际使用:** 梳理数据和权限在模型、检索、工具、用户及外部服务之间的流动，再将可信的滥用路径转化为红队用例和缓解措施。
- **常见混淆:** Threat model 会优先处理可信的风险；它不是能证明系统安全，或预测未来所有攻击的检查清单。
- **相关术语:** Least Privilege, Prompt Injection, Sandbox, Red Teaming
- **来源:** [NIST SP 800-154](https://csrc.nist.gov/pubs/sp/800/154/ipd); [NIST Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.600-1.pdf)

### Time per Output Token (TPOT)
- **分类:** 基础设施与服务
- **实际含义:** 对单个有 `N > 1` 个输出 token 的请求，首个 token 之后的平均间隔为：`(t_N - t_1) / (N - 1)`。系统分布再聚合这些逐请求平均值。
- **为什么重要:** 用户可能很快收到第一个 token，但后续答案流式输出很慢，因此仅看启动延迟无法描述生成的响应速度。
- **实际使用:** 分别计算每个请求的 TPOT，按输出长度和并发度报告请求间的分位数；不要汇总所有 token 间隔，也不要比较 tokenizer 或测量边界不同的系统。
- **常见混淆:** TPOT 是逐请求平均值。单个 inter-token latency 是连续两个 token 之间的一次间隔，而 time to first token 包含输出开始前的等待。
- **学习课程:** [Inference Metrics and Goodput](../phases/17-infrastructure-and-production/08-inference-metrics-goodput/)
- **相关术语:** Decode Phase, Time to First Token (TTFT), Streaming, Goodput
- **来源:** [DistServe](https://arxiv.org/abs/2401.09670)

### Time to First Token (TTFT)
- **分类:** 模型与推理
- **别名:** TTFT
- **实际含义:** 在明确的测量边界下，从提交生成请求到客户端收到第一个输出 token 或内容事件所经过的时间。
- **为什么重要:** TTFT 强烈影响用户感受到的响应速度，并能暴露排队、prompt 处理、缓存或网络延迟。
- **实际使用:** 按模型、prompt 长度、区域和缓存状态记录客户端侧 TTFT，再将它与总完成时间分开分析。
- **常见混淆:** TTFT 不是 tokens per second。前者衡量启动延迟，后者衡量输出开始后的生成吞吐量。
- **相关术语:** Streaming, Prompt Cache, Observability, Token Budget

### Token
- **分类:** 数据与表示
- **常见说法:** 模型输入或输出中大小相当于一个词的片段。
- **实际含义:** 模型特定 tokenizer 从文本、字节、图像、音频或其他输入表示中生成的整数标识符。一个 token 可以是完整词、词的一部分、标点、空白、字节序列或特殊控制符号。
- **常见混淆:** 字符与 token 的比例因语言、内容和 tokenizer 而异；应使用目标模型的 tokenizer 或提供商工具计数。
- **学习课程:** [Tokenizers](../phases/10-llms-from-scratch/01-tokenizers/)
- **相关术语:** Token Budget, Context Window, Autoregressive

### Token Budget
- **分类:** Prompt 与上下文
- **实际含义:** 对 instructions、证据、历史记录、工具结果、reasoning 或工作空间及输出所分配的明确 token 容量。
- **为什么重要:** 每一个纳入的 token 都会争夺上下文容量、延迟和成本。预算迫使你优先保留高价值证据。
- **实际使用:** 预留输出容量，限制检索片段，将旧工具结果汇总进状态，并在达到模型上限前停止或压缩。
- **常见混淆:** Token budget 是规划约束，并不等同于模型的最大 context window。
- **学习课程:** [Context Engineering](../phases/11-llm-engineering/05-context-engineering/)
- **相关术语:** Context Window, Context Engineering, Progressive Disclosure, Cost per Successful Task

### Tokenization
- **分类:** 数据与表示
- **实际含义:** 将输入表示转换为特定模型或 tokenizer 可接受的有序 token 标识符。
- **为什么重要:** Tokenization 决定序列长度、词表边界、成本核算、截断行为，以及文本或代码在 embedding 前的表示方式。
- **实际使用:** 使用目标模型的准确 tokenizer，将其与产物一同版本化，并测试多语言文本、代码、空白和特殊 token。
- **常见混淆:** Tokenization 不总是按词切分；两个模型也可能为相同输入分配不同的 token 数量和 ID。
- **相关术语:** Token, Vocabulary, Byte Pair Encoding (BPE), Embedding
- **来源:** [Neural Machine Translation of Rare Words with Subword Units](https://arxiv.org/abs/1508.07909)

### Tokens per Second (TPS)
- **分类:** 基础设施与服务
- **别名:** TPS, output token throughput
- **实际含义:** 一项吞吐量度量，在明确的范围和工作负载下，报告服务系统单位时间生成多少输出 token。
- **为什么重要:** 它通过说明输出开始后生成推进的速度，以及服务在负载下的表现，补充了启动延迟指标。
- **实际使用:** 说明 TPS 是逐请求还是聚合指标，排除或明确标注 prefill，并报告 batch、并发度、序列长度、硬件和延迟分位数。
- **常见混淆:** TPS 不能直接比较 tokenizer、工作负载、质量设置或测量边界不同的系统。
- **相关术语:** Time to First Token (TTFT), Streaming, Prefill, Observability
- **来源:** [Sarathi-Serve](https://www.usenix.org/system/files/osdi24-agrawal.pdf)

### Tool Contract
- **分类:** Agent 与工具
- **实际含义:** 工具边界的完整约定：用途、类型化输入、输出、验证、权限、副作用、错误、超时、幂等性，以及返回给调用方的证据。
- **为什么重要:** Schema 告诉模型有哪些字段；contract 则规定工具何时安全，以及系统必须如何处理失败。
- **实际使用:** 为文件写入工具定义允许的根目录、预期基准修订版、最大大小、dry-run 模式、明确的冲突错误和返回的 patch hash。
- **常见混淆:** JSON Schema 是 tool contract 的一部分，不是全部。
- **学习课程:** [Tool Use and Function Calling](../phases/14-agent-engineering/06-tool-use-and-function-calling/)
- **相关术语:** Function Calling, Structured Output, Least Privilege, Idempotency

### Top-k Sampling
- **分类:** 模型与推理
- **实际含义:** 一种解码方法：将下一个 token 的分布限制在得分最高的 k 个候选项中，对其概率重新归一化，再从中采样。
- **为什么重要:** 它从采样中移除了低概率的长尾，同时保留固定的最大候选数量。
- **实际使用:** 将 k 与 temperature、top-p 和 stop 设置一同评估，并随生成结果记录完整的 sampler 配置。
- **常见混淆:** Top-k 使用固定候选数量；top-p 使用概率质量阈值，其候选数量会随每一步变化。
- **相关术语:** Nucleus Sampling (Top-p), Temperature, Decoding Strategy, Logits
- **来源:** [The Curious Case of Neural Text Degeneration](https://arxiv.org/abs/1904.09751)

### Trace
- **分类:** AI-native 开发
- **实际含义:** 一份关联记录，覆盖一个请求或任务中的模型调用、检索、工具、状态转换、重试、审批和评估。
- **为什么重要:** 它可以让你重建多步骤工作流中时间、成本和故障是从何处进入的。
- **实际使用:** 在 agent harness 中传播同一个 trace identifier，并为每个模型和工具操作附加脱敏 span。
- **常见混淆:** Trace 应记录运行证据，而不是暴露隐藏的模型 reasoning、密钥或未脱敏的敏感内容。
- **学习课程:** [OpenTelemetry GenAI Conventions](../phases/14-agent-engineering/23-otel-genai-conventions/)
- **来源:** [OpenTelemetry traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- **相关术语:** Observability, Agent State, Time to First Token (TTFT), Evaluation (Eval)

### Transfer Learning
- **分类:** 数学与训练
- **常见说法:** 为新任务复用预训练模型。
- **实际含义:** 从一个数据分布或目标上学得的表示或参数出发，再将其适配到另一个分布或目标。可迁移的组成部分及更新策略取决于架构和任务。
- **常见混淆:** Transfer 并不限于后面的层；当源任务和目标任务差异很大时，也不能保证迁移成功。
- **相关术语:** Fine-tuning, Feature, SFT (Supervised Fine-Tuning)

### Transformer
- **分类:** 模型与推理
- **常见说法:** 许多现代语言模型背后的架构。
- **实际含义:** 一种由 attention、位置信息、前馈子层、残差连接和归一化构成的神经网络架构。encoder、decoder 和 encoder-decoder 变体使用不同的 mask 和信息流。
- **为什么重要:** 训练时可以并行处理许多序列位置，而自回归生成仍需逐步产生输出。
- **常见混淆:** Self-attention 并不意味着每个 transformer 都具有不受限制的全连接注意力。
- **学习课程:** [Build a Full Transformer](../phases/07-transformers-deep-dive/05-full-transformer/)
- **来源:** [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- **相关术语:** Attention, Self-Attention, Encoder, Decoder

### Trust Boundary
- **分类:** 安全与治理
- **实际含义:** 数据、instructions、身份或权限在具有不同信任假设的组件或主体之间跨越的接口。
- **为什么重要:** 在边界跨越处，系统必须验证身份、校验数据、约束权限，并决定哪些声明可以影响行动。
- **实际使用:** 围绕用户、模型上下文、检索来源、工具、网络和数据存储划出边界，再为每次跨越指定校验和授权。
- **常见混淆:** 网络边界只是 trust boundary 的一种。非受信任文档文本进入拥有特权的 agent 上下文，也是在跨越边界。
- **学习课程:** [Jailbreak Taxonomy](../phases/19-capstone-projects/82-jailbreak-taxonomy/)
- **相关术语:** Threat Model, Least Privilege, Sandbox, Indirect Prompt Injection
- **来源:** [Microsoft Learn: Trust Boundary, the Trust Zone Change Element](https://learn.microsoft.com/en-us/training/modules/tm-create-a-threat-model-using-foundational-data-flow-diagram-elements/6-trust-boundary-the-trust-zone-change-element); [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling)
## U

### Underfitting
- **分类:** 数学与训练
- **常见说法:** 模型无法充分拟合训练任务。
- **实际含义:** 模型或训练配置的有效容量、优化方式、特征或训练信号不足，因而无法捕捉训练数据中的有用模式。
- **实际使用:** 先诊断数据和优化问题，再考虑延长训练、调整特征、减弱过度正则化，或提高合适的模型容量。
- **相关术语:** Overfitting, Loss Function, Hyperparameter

## V

### VAE (Variational Autoencoder)
- **分类:** 模型与推理
- **常见说法:** 一种概率生成式自编码器。
- **实际含义:** 一种潜变量模型，以重建目标和正则项训练；该正则项让近似后验保持接近选定的先验。重参数化估计量使梯度可以穿过随机的潜变量采样过程。
- **常见混淆:** VAE 并不要求每个潜变量分布都固定为同一个 Gaussian；具体先验和近似后验均是建模选择。
- **来源:** [Auto-Encoding Variational Bayes](https://arxiv.org/abs/1312.6114)
- **相关术语:** Latent Space, Encoder, Decoder, Diffusion Model

### Vector Database
- **分类:** 检索与生成
- **常见说法:** 针对向量相似度搜索优化的数据库。
- **实际含义:** 一种存储和索引系统，支持在向量表示上进行最近邻查询，通常还提供元数据过滤、持久化和近似索引。
- **常见混淆:** 向量数据库负责存储和检索向量，不会生成高质量 embedding，也不保证检索结果相关。
- **相关术语:** Embedding, Semantic Search, Hybrid Retrieval

### Verification Gate
- **分类:** 评估与安全
- **实际含义:** 一个控制点：只有既定证据满足正确性或质量标准，流程才能继续。
- **为什么重要:** 它把模型声称“已完成”转化为有证据支持的决策。
- **实际使用:** 在补丁可应用、范围内测试通过、禁止修改的文件保持不变且所需产物齐备之前，阻止编码任务完成。
- **常见混淆:** Verification 检查证据是否符合标准；Approval 则是在证据已知的情况下授予继续推进的权限。
- **学习课程:** [Verification Gates](../phases/14-agent-engineering/38-verification-gates/)
- **相关术语:** Approval Gate, Regression Test, Scope Contract, Structured Output

### Vision-Language Model (VLM)
- **分类:** 多模态系统
- **实际含义:** 一种学习视觉表示与语言表示之间关系，或联合处理二者的模型，可用于检索、描述、问答或有依据的生成等任务。
- **为什么重要:** VLM 的表现取决于视觉编码器、语言组件、连接机制、训练数据和分辨率策略，而非一个笼统的能力标签。
- **实际使用:** 评估仅文本和仅视觉的对照，改变图像分辨率和布局；尽可能要求定位证据，并按视觉能力和语言分别报告失败情况。
- **常见混淆:** 能接收图像并不能证明模型会正确使用图像；VLM 也不一定能生成图像。
- **学习课程:** [Vision-Language Models](../phases/04-computer-vision/25-vision-language-models/)
- **相关术语:** Multimodal Model, Vision Transformer (ViT), Cross-Attention, Visual Grounding
- **来源:** [CLIP](https://arxiv.org/abs/2103.00020); [Flamingo](https://arxiv.org/abs/2204.14198)

### Vision Transformer (ViT)
- **分类:** 多模态系统
- **实际含义:** 一种视觉架构：将图像表示为带有位置信息的 patch embedding 序列，再用 transformer encoder blocks 处理该序列。
- **为什么重要:** 它为视觉数据提供了序列模型接口，但性能和计算量取决于 patch 大小、分辨率、预训练和归纳偏置。
- **实际使用:** 保持 patch 切分和归一化与训练时一致，考虑新分辨率下 position embedding 的行为，并在目标数据集上与合适的视觉基线比较。
- **常见混淆:** ViT 是一类架构，不是所有能接收图像的 transformer；它的 patch 也并非天然具有语义。
- **学习课程:** [Vision Transformers](../phases/04-computer-vision/14-vision-transformers/)
- **相关术语:** Transformer, Patch Embedding, Self-Attention, Encoder
- **来源:** [An Image is Worth 16x16 Words](https://arxiv.org/abs/2010.11929)

### Visual Grounding
- **分类:** 多模态系统
- **实际含义:** 将语言表达与图像或视频中的空间证据关联起来，例如区域、物体、mask 或被跟踪的实体。
- **为什么重要:** 流畅的视觉回答可能没有证据支持；grounding 能让所指对象可检查，并支持区域级评估。
- **实际使用:** 要求回答同时给出方框、mask 或时间片段；测试含糊和不存在的指代，并将定位得分与语言正确性分开评估。
- **常见混淆:** Visual grounding 识别被提及证据的位置。一般图像描述可以描述场景，却不必定位每项主张。
- **学习课程:** [Cross-Attention Fusion](../phases/19-capstone-projects/61-cross-attention-fusion/)
- **相关术语:** Grounding, Vision-Language Model (VLM), Attention, Evaluation (Eval)
- **来源:** [MDETR](https://arxiv.org/abs/2104.12763)

### Vocabulary
- **分类:** 数据与表示
- **实际含义:** token 标识符与 tokenizer 可输出单元之间的有限映射，其中包括普通 token、字节级 token 和特殊控制 token。
- **为什么重要:** 词表设计会影响序列长度、多语言覆盖、代码表示、embedding 大小，以及 tokenizer 与模型权重之间的兼容性。
- **实际使用:** 将词表和特殊 token 的分配与模型一同版本化，测试编码—解码往返，并且绝不能仅因 token 名称相近就替换 tokenizer。
- **常见混淆:** 模型词表不是人类词语的字典；其中许多条目是片段、字节、空白模式或控制符号。
- **相关术语:** Tokenization, Byte Pair Encoding (BPE), Token, Embedding
- **来源:** [Neural Machine Translation of Rare Words with Subword Units](https://arxiv.org/abs/1508.07909)

## W

### Warmup
- **分类:** 数学与训练
- **实际含义:** 训练开始时的一个阶段，学习率从较小的值逐步升至主调度计划的目标值。
- **为什么重要:** 早期的梯度和优化器统计量可能不稳定，尤其在大 batch 或 transformer 训练中；骤然采用完整幅度的更新可能破坏优化过程。
- **实际使用:** 用步数或已处理的 token 定义 warmup，记录实际曲线，并在批大小、优化器和总训练预算都明确的前提下调参。
- **常见混淆:** Warmup 并非每个模型都需要，也不能让原本不合适的学习率变得安全。
- **相关术语:** Learning Rate Schedule, Learning Rate, Batch Size, AdamW
- **来源:** [Accurate, Large Minibatch SGD](https://arxiv.org/abs/1706.02677)

### Weight
- **分类:** 数学与训练
- **常见说法:** 模型内部学到的一个数值。
- **实际含义:** 模型变换中的一个可训练系数。权重通常组织为 tensor，优化过程通过调整它们来降低训练目标。
- **常见混淆:** 并非所有 parameter 都称为 weight；bias、embedding 和 normalization scale 也都是 parameter。
- **相关术语:** Parameter, Tensor, Optimizer

### Weight Decay
- **分类:** 数学与训练
- **常见说法:** 在优化过程中缩小权重的正则化方法。
- **实际含义:** 一种在训练期间减小选定 parameter 幅度的更新规则，常见做法是在梯度更新之外，以单独的收缩因子乘以权重。
- **为什么重要:** 它可能提升泛化能力，但适用的系数和应排除的 parameter 组取决于模型、优化器、调度计划和数据。
- **常见混淆:** 对某些简单优化器，解耦的 weight decay 等同于 L2 损失惩罚；但对 Adam 等自适应优化器通常并不等同。
- **相关术语:** AdamW, Overfitting, Optimizer

### Worktree
- **分类:** AI-native 开发
- **实际含义:** 在 Git 中，worktree 是附属于某个仓库及分支或 commit 的工作目录；它共享对象存储，但拥有各自检出的文件和 index。
- **为什么重要:** 独立 worktree 让人和 agent 可以并行工作，无须反复切换或覆盖同一个检出目录。
- **实际使用:** 为每个编码 agent 分配具名功能分支和准确的 worktree 路径，再通过正常的 Git 历史审查并集成补丁。
- **常见混淆:** Worktree 隔离的是检出的文件，并不会隔离机器上的所有进程、端口、缓存、数据库或密钥。
- **学习课程:** [Workbench for Real Repositories](../phases/14-agent-engineering/41-workbench-for-real-repos/)
- **来源:** [git-worktree documentation](https://git-scm.com/docs/git-worktree)
- **相关术语:** Coding Agent, Patch, Scope Contract, Handoff

## Z

### Zero-Shot
- **分类:** Prompt 与上下文
- **常见说法:** 在当前 prompt 中不给示例就要求完成任务。
- **实际含义:** 不在即时输入中包含针对该任务的示范，仅凭指令或任务框定来完成任务。
- **常见混淆:** Zero-shot 不表示模型没有相关的预训练、指令微调、工具或检索到的上下文。
- **相关术语:** Few-Shot, Prompt Engineering, Transfer Learning

### Zero Trust
- **分类:** 安全与治理
- **实际含义:** 一种安全模型：不因网络位置或资产所有权而给予隐式信任，而是依据身份、设备、资源、策略和当前上下文评估每一次访问请求。
- **为什么重要:** AI 工具和 agent 横跨本地文件、云服务、模型和外部内容，因此可信内网作为授权依据的范围过大。
- **实际使用:** 对每个行为主体和工作负载进行认证，授权每项资源操作，签发短期凭证，分割访问范围，并持续记录和重新评估与策略相关的信号。
- **常见混淆:** Zero trust 不等于完全不信任或阻断所有自动化；它要求把信任决策做成明确、有范围且可持续验证的过程。
- **学习课程:** [Security, Secrets, and Audit](../phases/17-infrastructure-and-production/25-security-secrets-audit/)
- **相关术语:** Least Privilege, Trust Boundary, Approval Gate, Audit Log
- **来源:** [NIST SP 800-207](https://csrc.nist.gov/pubs/sp/800/207/final)
