# Qwen-VL 家族与动态 FPS 视频

> Qwen-VL 家族——Qwen-VL（2023）、Qwen2-VL（2024）、Qwen2.5-VL（2025）、Qwen3-VL（2025）——是 2026 年最具影响力的开放视觉-语言模型一脉。每一代都下了一个决定性的架构赌注，整个开放生态在十二个月内就抄了过去：通过 M-RoPE 实现的原生动态分辨率、带绝对时间对齐的动态 FPS 采样、ViT 里的窗口注意力，以及结构化的 agent 输出格式。到 Qwen3-VL，配方已经稳定下来：一个带原生长宽比输入的 2D-RoPE-ViT 编码器、一个接入大型 Qwen3 语言基座的 MLP 投影器，以及把 OCR、grounding 和 agent 行为当作一等目标来强调的训练阶段。本节课按时间顺序通读这个家族，好让你明白每根旋钮为什么在它现在的位置上。

**类型：** Learn
**语言：** Python（标准库，M-RoPE 编码器 + 动态 FPS 采样器）
**前置要求：** Phase 12 · 06（patch-n'-pack）
**预计时间：** ~120 分钟

## 学习目标

- 计算 M-RoPE 的三轴旋转（时间、高、宽），并解释为什么三者都需要。
- 为一段视频挑一个动态 FPS 采样策略，并就每秒 token 数 vs 事件检测准确率作权衡。
- 按顺序说出 Qwen-VL 的四代升级，以及每一代解锁了什么。
- 接好一个 Qwen2.5-VL 式的 JSON agent 输出格式，并从 VLM 回应里解析出结构化的工具调用。

## 问题背景

Qwen-VL 于 2023 年 8 月出货，是对 LLaVA-1.5 和 BLIP-2 的直接回应。Qwen 团队瞄准的差距有三：分辨率、视频、结构化输出。

分辨率：LLaVA-1.5 跑在 336x336。对照片够用，对一张中文发票或一张密集的电子表格截图毫无用处。Qwen-VL 的第一个创新是 448x448 和带 grounding 的边界框输出，让模型能指着东西说话。

视频：Video-LLaMA 堆叠逐帧编码器再喂给 LLM。对短片能用，对时间轴才是信号的多分钟视频则不行。Qwen 团队想要一个理解时间的单一编码器。

结构化输出：LLaVA 吐自由形式文本。agent 需要 JSON。Qwen-VL 在明确的 JSON 输出格式上训练，把边界框坐标也作为文本一并训。

Qwen-VL 的每一代都在这三条轴中的一条上做拓展。

## 核心概念

### Qwen-VL（2023 年 8 月）

第一代：OpenCLIP ViT-bigG/14 作编码器（25 亿参数）、与 Llama 兼容的 Q-Former（256 query 的一步式）、Qwen-7B 基座。贡献：

- 448x448 分辨率（当时开放 VLM 的 SOTA）。
- grounding：在带显式坐标 token 输出的图文对上训练。"The cat is at <box>(112, 204), (280, 344)</box>"。
- 从一开始就做中英双语训练。

当时的基准：英文上与 GPT-4V 旗鼓相当，中文上占主导。grounding 监督才是真正的头条。

### Qwen2-VL（2024 年 9 月）—— M-RoPE 与原生分辨率

Qwen2-VL 用一个原生动态分辨率的 ViT 编码器换掉了固定分辨率 + Q-Former 那一套。关键改动：

- 原生动态分辨率。ViT 接受任何能被 28 整除的 HxW（patch 14 配 2x 空间合并）。一张 1120x672 的图（40x24 合并 patch）产出 960 个视觉 token。不缩放、不切块、不缩略图。
- M-RoPE（多模态 RoPE）。每个 token 携带一个 3D 位置 (t, h, w)，而非 1D。图像 t=0，视频 t = 帧索引。RoPE 按每轴一个频率旋转 query/key 向量。无位置嵌入表。
- MLP 投影器。扔掉 Q-Former；在合并 patch token 上用一个 2 层 MLP。
- 带动态 FPS 的视频。视频默认按 1-2 FPS 采样，但模型接受任意帧数。

结果：Qwen2-VL-7B 在多个多模态基准上追平 GPT-4o，并在 DocVQA 上击败它（94.5 vs 88.4）。架构改动是决定性的一步。

### Qwen2.5-VL（2025 年 2 月）—— 动态 FPS + 绝对时间

Qwen2.5-VL 的大转向是视频。动态 FPS 不只是"需要时多采几帧"。论文把它正式化了：

- 绝对时间 token。不用位置索引（帧 0、1、2……），而用真实时间戳。"在 0:04，猫跳了起来。"模型看到 `<time>0.04</time>` token 与帧 token 交错。
- 动态 FPS。慢镜头 1 FPS，动作 4+ FPS。由用户或训练者选；M-RoPE 自适应。
- ViT 里的窗口注意力。为吞吐，空间注意力做窗口化（块内局部）；每隔几层做一次全局注意力。
- 显式 JSON 输出格式。在工具调用数据上训练："{\"tool\": \"click\", \"coords\": [380, 220]}"。开箱即用 agent-ready。
- MRoPE-v2 缩放。位置随最大输入尺寸缩放，于是一段 10 分钟的视频不会耗尽频率范围。

基准：Qwen2.5-VL-72B 在大多数视频基准上击败 GPT-4o，在文档上追平 Gemini 2.0，并为 GUI grounding 创下开放模型 SOTA（ScreenSpot：84% 准确率 vs GPT-4o 的 38%）。

### Qwen3-VL（2025 年 11 月）

Qwen3-VL 是一次增量升级，整合而非重新发明：更大的 LLM 骨干（Qwen3-72B）、扩充的训练数据、改进的 OCR、经由 Qwen3"思考模式"的更强推理。ViT 和 M-RoPE 保持不变。论文把重点放在数据和训练改进上，而非架构。

这一脉的要点：到 2025 年 Qwen-VL 架构已经稳定。后续各代缩放的是算力和数据，不是原语。

### M-RoPE 的数学

经典 RoPE 用成对坐标，按位置 `m` 旋转一个维度为 `d` 的 query `q`：

```
q_rot[2i]   = q[2i]   * cos(m * theta_i) - q[2i+1] * sin(m * theta_i)
q_rot[2i+1] = q[2i]   * sin(m * theta_i) + q[2i+1] * cos(m * theta_i)
theta_i     = 10000^(-2i/d)
```

M-RoPE 把隐藏维度分成三个频带。比如 `d = 96`。分 32 维给时间、32 给高、32 给宽。每个频带按它自己的轴位置旋转。一个在 (t=5, h=10, w=20) 的 patch，其三个频带分别施加旋转 `R_t(5)`、`R_h(10)`、`R_w(20)`。

文本 token 用 `t = text_index, h = 0, w = 0`（或某种归一化选择），保持兼容。视频帧用 `t = frame_time, h = row, w = col`。单图用 `t = 0`。

好处是：一套位置编码就能处理文本、图像、视频，不用分支代码或不同的位置表。

### 动态 FPS 采样逻辑

给定一段时长 `T` 秒的视频和一个目标 token 预算 `B`：

1. 算出你负担得起的最大 FPS：`fps_max = B / (T * tokens_per_frame)`。
2. 从 `{1, 2, 4, 8}` 里挑一个满足 `fps <= fps_max` 的目标 FPS。
3. 若运动剧烈（光流启发式或用户显式请求），挑更高 FPS。若运动平缓，挑更低。
4. 按选定 FPS 均匀采样；在帧之间插入 `<time>t</time>` token。

Qwen2.5-VL 隐式地训练这套逻辑；推理时用户通过 `fps` 参数控制。一段 60 秒动作序列以 4 FPS、每帧 81 token = 19440 token，在 32k 上下文里可控。

### 结构化 agent 输出

Qwen2.5-VL 的 agent 训练明确瞄准结构化工具调用：

```
{
  "tool": "mouse_click",
  "coords": [1024, 512],
  "button": "left",
  "modifier": null
}
```

解析是确定性的：对模型输出做 JSON.parse。对比自由形式的"click at (1024, 512)"，那种需要正则和歧义处理。这一转变正是 Qwen2.5-VL 的 ScreenSpot 分数从 Qwen2-VL 的 55% 跳到 84% 的原因。

```figure
mm-mrope-axes
```

## 实际使用

`code/main.py` 实现了：

- 对一条混合文本、图像 patch、视频帧的打包序列计算 M-RoPE 位置。
- 动态 FPS 采样器：给定 (时长, 预算, 运动级别)，挑 FPS 并产出帧时间戳。
- 一个玩具版 Qwen2.5-VL JSON 输出解析器，处理带坐标字段的工具调用回应。

跑一下，然后在一段 5 分钟视频上把固定 FPS 换成动态 FPS，感受差别。

## 拿去用

本节课产出 `outputs/skill-qwen-vl-pipeline-designer.md`。给定一个视频任务（监控、agent、动作识别、无障碍），它产出 Qwen2.5-VL 配置（帧预算、FPS 策略、窗口注意力开关、agent 输出模式）和一个延迟估计。每当你为某个视频产品部署 Qwen-VL 家族模型时就用它。

## 练习

1. 对一个在 (t=3, h=5, w=7) 的 patch，隐藏维度 48（每频带 16，base theta 10000），计算 M-RoPE 旋转。给出每个频带前三对的旋转角度。

2. 一段 10 分钟、1 FPS 的监控录像产出多少帧？在 384 分辨率、3x 池化下，总共多少 token？Qwen2.5-VL 默认的 32k 上下文容得下吗？

3. 为一段 30 秒网球对拉、一段 30 秒菜谱演示、一段 30 秒 UI-agent 录屏分别挑 FPS。用动态 FPS 逻辑为每个辩护。

4. Qwen2.5-VL 彻底扔掉了 Q-Former。为什么一个简单 MLP 在 2025 年能用、在 2023 年不能？（提示：数据规模和编码器质量。）

5. 把三个 Qwen2.5-VL JSON 工具调用输出解析成 Python dict。格式错误的 JSON 会让什么失败，Qwen cookbook 推荐什么恢复策略？

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| M-RoPE | "多模态 RoPE" | 隐藏维度里带时间、高、宽三个频带的 3D 旋转位置嵌入 |
| 动态 FPS | "智能采样" | 按运动、时长和 token 预算为每段视频选定的帧采样率 |
| 绝对时间 token | "时间戳 token" | 序列里交错的 `<time>t</time>`，让模型看到真实秒数而非帧索引 |
| 窗口注意力 | "局部注意力" | 为提速把空间自注意力限制在小窗口内；周期性地加全局注意力 |
| 结构化 agent 输出 | "JSON 模式" | 教 VLM 吐出带坐标和工具名、可解析 JSON 的训练数据监督 |
| min_pixels / max_pixels | "分辨率边界" | Qwen2.5-VL 的每请求控制，限定总像素数从而限定 token 数 |
| grounding | "指着它" | 把边界框坐标作为文本 token 输出；自 Qwen-VL v1 起使用 |

## 延伸阅读

- [Bai et al. — Qwen-VL (arXiv:2308.12966)](https://arxiv.org/abs/2308.12966)
- [Wang et al. — Qwen2-VL (arXiv:2409.12191)](https://arxiv.org/abs/2409.12191)
- [Qwen Team — Qwen2.5-VL Technical Report (arXiv:2502.13923)](https://arxiv.org/abs/2502.13923)
- [Qwen Team — Qwen3-VL (arXiv:2511.21631)](https://arxiv.org/abs/2511.21631)
- [Zhu et al. — InternVL3 (arXiv:2504.10479)](https://arxiv.org/abs/2504.10479)
