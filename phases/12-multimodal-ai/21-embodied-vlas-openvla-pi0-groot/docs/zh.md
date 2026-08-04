# 具身 VLA：RT-2、OpenVLA、π0、GR00T

> 模型第一次从网页上读出一份菜谱并在一台厨房机器人上执行，是 RT-2（Google DeepMind，2023 年 7 月）。RT-2 把动作离散化为文本 token，在网络数据加机器人动作数据上协同微调一个 VLM，并证明了网络规模的视觉-语言知识能迁移到机器人控制。OpenVLA（2024 年 6 月）出货了开放的 7B 参考。Physical Intelligence 的 π0 系列（2024-2025）加入了 flow-matching 动作专家。NVIDIA 的 GR00T N1（2025 年 3 月）为人形机器人交付了大规模的双系统（系统 1 / 系统 2）控制。VLA 原语——vision-language-action，一个能看、能读、能动的单一模型——是本阶段理解模型与 Phase 15 自主系统之间的桥梁。

**类型：** Learn
**语言：** Python（标准库，动作分词器 + VLA 推理骨架）
**前置要求：** Phase 12 · 05（LLaVA）、Phase 15（自主系统，被引用）
**预计时间：** ~180 分钟

## 学习目标

- 描述动作分词：离散 bin 编码（RT-2）、FAST 高效动作 token、连续 flow-matching 动作（π0）。
- 解释为什么在网络 + 机器人数据上协同微调能保留向新任务的通用知识迁移。
- 在同一个机器人任务上把 OpenVLA（开放 7B Llama+VLM）、π0（flow-matching）、GR00T N1（双系统）作比较。
- 说出 Open X-Embodiment 数据集及其作为 RT-X 训练语料的角色。

## 问题背景

一台能听自然语言指令做家务的机器人，自 1970 年代起就是研究目标。2020 年代的答案：一个 vision-language-action（VLA）模型。和做 VQA 用的 VLM 架构相同，但输出是动作（关节扭矩、末端执行器位姿、离散命令），而非文本。

VLA 特有的挑战：

1. 动作空间是连续的（关节角、力）且高维（7 自由度臂 + 3 自由度夹爪 = 30 Hz 下 10 维）。
2. 机器人专属训练数据稀缺。Open X-Embodiment 有约 100 万条轨迹；网络图文是 50 亿+。
3. 控制频率要紧。30 Hz 控制环意味着每个动作 33ms 预算。
4. 安全。一个错误动作会损坏硬件、人员或财产。

## 核心概念

### 动作分词（RT-2）

RT-2 的戏法：把每个关节目标表示成一个量化的文本 token。把归一化的 [-1, 1] 范围离散成 256 个 bin，每个 bin 映射到一个词表 ID。一个 10 自由度动作在每个控制步变成 10 个 token。

在一个混合上协同微调一个 PaLM-X VLM：

- 网络图文对（看图说话、VQA）。
- 机器人演示，动作作为 token。

模型看到"pick up the red cube"（语言）→ 图像（视觉）→ 10-token 动作序列（离散化关节目标）。网络预训练保留通用知识迁移：RT-2 能遵循"朝快速移动的物体移动"，即便"快速移动"不在训练数据里。

RT-2 论文里推理 3-5 Hz，受限于 VLM 自回归解码。

### OpenVLA —— 开放的 7B 参考

OpenVLA（Kim 等人，2024 年 6 月）是开放权重的 RT-2 等价物。7B Llama 骨干、DINOv2 + SigLIP 双视觉编码器、256 bin 上的动作分词。

在 Open X-Embodiment（22 种机器人上的 97 万条轨迹）上训练。出货时带 LoRA 微调支持，用于适配新机器人。

推理：A100 上带量化 4-5 Hz。对慢速操作够快，对高频控制不够。

### FAST 分词器 —— 更快的动作解码

Pertsch 等人（2024）证明离散 bin 分词低效——大多数动作聚在 bin 空间的一个小区域里。FAST（Frequency-domain Action Sequence Tokenizer）通过 DCT 压缩动作序列并量化系数。

一条 30 步动作轨迹变成约 10 个 FAST token，而非 300 个离散 bin token。推理加速 3-5 倍而无质量损失。

### π0 与 flow-matching 动作

Physical Intelligence 的 π0（Black 等人，2024 年 10 月）用一个 flow-matching 动作专家替换离散动作 token：

- 一个小动作 transformer 读 VLM 的隐藏状态，经 rectified flow 输出一条连续的 50 步动作序列。
- 动作头用 flow-matching 损失训练；VLM 预训练保持不变。
- 推理：整条动作序列在约 5 个去噪步内吐出，实际上是 50 Hz 控制。

π0 的断言：在一大套操作任务上击败 OpenVLA 和 Octo。连续动作表述保留了离散化会毁掉的平滑性。

π0.5 和 π0-FAST 是增量升级。π0-FAST 把 FAST 分词与 flow matching 结合。

### GR00T N1 —— 人形机器人的双系统

NVIDIA 的 GR00T N1（2025 年 3 月）为人形机器人（>30 自由度，全身）打造：

- 系统 2：一个大 VLM 读场景 + 指令，以约 1 Hz 产出高层子目标。
- 系统 1：一个小动作头 transformer，以子目标为条件产出低层 50-100 Hz 关节命令。

这个拆分对应 Kahneman 的快慢思考：系统 2 规划，系统 1 行动。好处：慢速 VLM 规模的规划不会阻塞快速控制；系统 1 为延迟保持小巧。

GR00T N1.7（2025 年底）改善了数据缩放。GR00T 用来自 Omniverse 的 sim-to-real 数据微调。

### Open X-Embodiment

训练数据。RT-X（2023 年 10 月）汇总了 22 个数据集，覆盖 22 种机器人上的 100 万条轨迹。Open X-Embodiment 是所有人都用的语料：

- ALOHA / Bridge V2 / Droid / RT-2 Kitchen / Language Table。
- 每个样本：(机器人状态, 相机视角, 指令, 动作序列)。
- 训练卫生：统一动作空间、归一化关节范围、缩放相机。

OpenVLA 和 π0 在 Open X-Embodiment 上训练。到任何特定机器人的领域差距，靠在 100-1000 个任务专属演示上做 LoRA 微调来弥合。

### 协同微调 vs 仅机器人

协同微调把网络 VQA 数据与机器人轨迹混在一起。比例要紧：VQA 太多模型就忘动作；机器人数据太多模型就丢通用知识。

RT-2 的比例：约 1:1。OpenVLA：约 0.5:1 网络对机器人。π0：类似。精确比例是个按数据集大小要调的超参数。

仅机器人训练产出任务专属模型，在分布外指令上失败。协同微调是"pick up the red cube（演示里有）"和"pick up the third largest object from the left（新措辞）"之间的差别。

### 安全与动作限制

每个生产 VLA 出货时都带：

- 硬关节限制（不能扭过规格）。
- 速度限制（软裁剪）。
- 工作空间边界（末端执行器不能离开桌面）。
- 新任务的人在环审批。

这些坐在 VLA 之外，作为控制层检查。VLA 的输出是建议，不是命令。

```figure
mm-action-tokens
```

## 实际使用

`code/main.py`：

- 实现 256 bin 动作分词和反分词。
- 勾勒一个基于 DCT + 量化的 FAST 分词器。
- 在 (离散 bin、FAST、连续 flow) 上对比每动作步的 token 数。
- 打印一份 RT-2 → OpenVLA → π0 → GR00T 的脉络摘要。

## 拿去用

本节课产出 `outputs/skill-vla-action-format-picker.md`。给定一个机器人任务（操作、导航、人形全身），它在 离散 bin + RT-2、FAST + OpenVLA、flow-matching + π0、双系统 + GR00T 之间挑选。

## 练习

1. 一个 10 自由度臂，30 Hz 控制率。256 bin 的离散 bin 分词每秒吐多少 token？一个 7B VLM 跟得上吗？

2. FAST 分词把 30 步轨迹压成约 10 个 token。如果轨迹有高频运动（比如打鼓），用户会丢什么？

3. π0 的 flow-matching 头在约 5 步内去噪。把吞吐与 OpenVLA 4-5 Hz 的自回归解码作比较。

4. GR00T 的系统 1 / 系统 2 拆分对应 Kahneman。提出一个可能帮助双足行走的不同拆分（系统 3？）。

5. 读 Open X-Embodiment 第 4 节关于数据集筛选的内容。说出防止领域泄漏的三条筛选规则。

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| VLA | "vision-language-action" | 接受图像 + 指令并输出动作命令的模型 |
| 动作分词 | "离散 bin" | 把连续关节目标每维量化成 256 个 bin，各为一个词表 ID |
| FAST 分词器 | "频域动作 token" | DCT + 量化，把 30 步轨迹压成约 10 个 token |
| 协同微调 | "混合网络 + 机器人" | 在网络 VQA 数据和机器人演示上一起训练以保留通用知识 |
| flow-matching 动作头 | "π0 连续输出" | 经 rectified flow 输出 50 步动作序列的小型 transformer |
| 系统 1 / 系统 2 | "双系统控制" | 大 VLM 慢速规划，小动作头快速行动；GR00T 模式 |
| Open X-Embodiment | "RT-X 数据集" | 100 万条轨迹的跨机器人数据集；训练语料 |

## 延伸阅读

- [Brohan et al. — RT-2 (arXiv:2307.15818)](https://arxiv.org/abs/2307.15818)
- [Kim et al. — OpenVLA (arXiv:2406.09246)](https://arxiv.org/abs/2406.09246)
- [Black et al. — π0 (arXiv:2410.24164)](https://arxiv.org/abs/2410.24164)
- [NVIDIA — GR00T N1 (arXiv:2503.14734)](https://arxiv.org/abs/2503.14734)
- [Open X-Embodiment Collab — RT-X (arXiv:2310.08864)](https://arxiv.org/abs/2310.08864)
