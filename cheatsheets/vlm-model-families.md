---
id: vlm-model-families
title: 开放 VLM 家族：LLaVA、Qwen-VL、InternVL
code: OV
subtitle: 对比 LLaVA、LLaVA-OneVision、Qwen-VL 与 InternVL3 的连接器、分辨率、视频、token 与训练方式。
hue: 265
sources: phases/12-multimodal-ai/05-llava-visual-instruction-tuning, phases/12-multimodal-ai/06-any-resolution-patch-n-pack, phases/12-multimodal-ai/08-llava-onevision-single-multi-video, phases/12-multimodal-ai/09-qwen-vl-family-dynamic-fps, phases/12-multimodal-ai/10-internvl3-native-multimodal
source_hash: 89bdcfaa4b1ca296
---

## 模型家族对比
type: comparison
span: 2
from: phases/12-multimodal-ai/05-llava-visual-instruction-tuning/docs/zh.md, phases/12-multimodal-ai/08-llava-onevision-single-multi-video/docs/zh.md, phases/12-multimodal-ai/09-qwen-vl-family-dynamic-fps/docs/zh.md, phases/12-multimodal-ai/10-internvl3-native-multimodal/docs/zh.md, phases/12-multimodal-ai/10-internvl3-native-multimodal/code/main.py

| 维度 | LLaVA-NeXT | LLaVA-OneVision | Qwen-VL 家族 | InternVL3 |
|---|---|---|---|---|
| 视觉到 LLM | 2 层 MLP、GELU | 相同 MLP 投影器 | Qwen2-VL：合并图块上的 2 层 MLP | 原生，无对齐阶段 |
| 训练方案 | 在文本 LLM 上后加视觉 | 在文本 LLM 上后加视觉 | 在文本 LLM 上后加视觉 | 原生多模态预训练 |
| 高分辨率 | AnyRes：336 图块加缩略图 | AnyRes-9 或 AnyRes-4，384 图块 | Qwen2-VL：任意可被 28 整除的 H 与 W | ViR 选择低、中或高分辨率 |
| 视频 | 逐帧拼接 | 32 帧，每帧 81 个 token | 动态 FPS、`<time>` token | 预训练中视频文本占 5% |
| 视觉 token | 基础 576，AnyRes 2880 | 每样本固定 3000-4000 | 随输入增长 | 通过 ViR 取 256、576 或 2048+ |
| 训练 | 先对齐，再指令微调 | SI、OV、TT 三阶段 | Qwen3-VL：各阶段侧重 OCR、定位与 agent | 一个预训练阶段，再指令微调 |
| 更换 LLM | 重训投影器 | 重训投影器 | 重训适配器 | 后期无法更换 |

## LLaVA 前向传播
type: architecture
from: phases/12-multimodal-ai/05-llava-visual-instruction-tuning/docs/zh.md

```arch
node | img | 1,1 | 图像 | 336x336 | client
node | vit | 2,1 | CLIP ViT-L/14 @ 336 | 576 个图块，1024 维 | model
node | mlp | 3,1 | 2 层 MLP | 1024 → 4096 → 4096、GELU | process
node | prompt | 1,2 | prompt | system + <image> + user | client
node | splice | 2,2 | 替换 <image> | 576 个投影后 token | process
node | llm | 3,2 | LLM | Vicuna-13B，后为 Llama-3.1-8B | model
edge | img | vit |
edge | vit | mlp | 图块
edge | mlp | splice | 576 个 token
edge | prompt | splice |
edge | splice | llm | 完整序列
```

## Qwen-VL 演进
type: flow
from: phases/12-multimodal-ai/09-qwen-vl-family-dynamic-fps/docs/zh.md, phases/12-multimodal-ai/09-qwen-vl-family-dynamic-fps/code/main.py

1. **Qwen-VL（2023）**：448 分辨率，以文本表示定位框，Q-Former 有 256 个查询。
2. **Qwen2-VL（2024）**：M-RoPE、原生动态分辨率、MLP 投影器。
3. **Qwen2.5-VL（2025）**：动态 FPS、绝对时间 token、ViT 中的窗口注意力。
4. **Qwen2.5-VL agent**：JSON 工具调用，ScreenSpot 从 55% 提高至 84%。
5. **Qwen3-VL（2025）**：Qwen3 基座、思考模式、更多 OCR 数据，保留 ViT 与 M-RoPE。

## 各家族的适用条件
type: tips
from: phases/12-multimodal-ai/05-llava-visual-instruction-tuning/docs/zh.md, phases/12-multimodal-ai/06-any-resolution-patch-n-pack/docs/zh.md, phases/12-multimodal-ai/06-any-resolution-patch-n-pack/code/main.py, phases/12-multimodal-ai/08-llava-onevision-single-multi-video/docs/zh.md, phases/12-multimodal-ai/09-qwen-vl-family-dynamic-fps/docs/zh.md, phases/12-multimodal-ai/10-internvl3-native-multimodal/docs/zh.md

- **LLaVA**：需要便宜、可复现的方案。阶段 2 在 8xA100 上约需 20 小时。
- **LLaVA-OneVision**：单个模型处理单图、多图与视频，成本可预测。
- **Qwen2.5-VL**：带时间戳的视频、JSON 输出的 GUI agent，以及 `min_pixels`、`max_pixels` 限制。
- **InternVL3**：文本能力不能回退，且有预算做原生预训练。
- **后加视觉方案**：希望以后更换 LLM，对多数项目成本仍更低。
- **AnyRes 分块**：编码器固定为 336x336，但需要更多细节。

## 各课的玩具代码
type: task-table
from: phases/12-multimodal-ai/05-llava-visual-instruction-tuning/code/main.py, phases/12-multimodal-ai/06-any-resolution-patch-n-pack/code/main.py, phases/12-multimodal-ai/08-llava-onevision-single-multi-video/code/main.py, phases/12-multimodal-ai/10-internvl3-native-multimodal/code/main.py

| 任务 | 代码 |
|---|---|
| 投影 ViT 图块 | `MLPProjector(PATCH_DIM, HIDDEN_DIM, LLM_DIM)` |
| 构建 LLaVA prompt | `build_llava_prompt(system, user, 576)` |
| 打包混合批次 | `pack_batch(images, patch)` |
| 稠密块对角掩码 | `build_dense_mask(pack)` |
| AnyRes token 成本 | `anyres_cost(img, tile=336, thumb=336)` |
| 方形缩放成本 | `square_cost(img, side=336, patch=14)` |
| OneVision 视频计划 | `plan_video(budget)` |
| ViR 平均 token 数 | `vir_sim(tiers)` |

## M-RoPE、动态 FPS 与工具调用
type: annotated-code
lang: python
from: phases/12-multimodal-ai/09-qwen-vl-family-dynamic-fps/code/main.py

```python
cfg = MRoPEConfig(hidden=48, temporal_dim=16, height_dim=16, width_dim=16)
mrope_angles(cfg, 0, 5, 7)      # 图像图块：t=0、h=row、w=col
mrope_angles(cfg, 3, 5, 7)      # 视频帧 t=3
mrope_rotate(cfg, vec, 3, 5, 7) # 按各自轴旋转每个频带
plan = VideoPlan(duration_s=600.0, tokens_per_frame=81,
                 budget=32768, motion="low")
plan.fps()                      # 首个 <= fps_max 的候选
plan.frame_times()              # 每帧一个时间戳
plan.total_tokens()             # 帧数乘 tokens_per_frame
parse_tool_call(raw)            # 先 json.loads，再截取 { 到 }
```

## token 计算
type: concepts
from: phases/12-multimodal-ai/05-llava-visual-instruction-tuning/docs/zh.md, phases/12-multimodal-ai/06-any-resolution-patch-n-pack/docs/zh.md, phases/12-multimodal-ai/08-llava-onevision-single-multi-video/docs/zh.md, phases/12-multimodal-ai/09-qwen-vl-family-dynamic-fps/docs/zh.md

- **LLaVA 基础**：每图 576 个 token，2048 上下文中还剩 1472 个 token 给文本。
- **AnyRes 2x2**：4 * 576 + 576 = 2880 个视觉 token。
- **AnyRes 4x4**：1344x1344 图像得到 9216 + 576，约 9800 个 token。
- **Qwen2-VL 原生**：1120x672 得到 40x24 个合并图块，960 个 token。
- **OneVision 图像**：AnyRes-9 配合 2x2 池化，9 * 182 + 182 = 1820 个 token。
- **OneVision 视频**：32 帧配合 3x3 池化，32 * 81 = 2592 个 token。
- **动态 FPS 上限**：$fps_{max} = B / (T \cdot \text{tokens per frame})$
- **Qwen2.5-VL 视频**：60 s、4 FPS、每帧 81 个 token，总计 19440 个 token。

## 训练方案
type: comparison
from: phases/12-multimodal-ai/05-llava-visual-instruction-tuning/docs/zh.md, phases/12-multimodal-ai/08-llava-onevision-single-multi-video/docs/zh.md, phases/12-multimodal-ai/08-llava-onevision-single-multi-video/code/main.py, phases/12-multimodal-ai/10-internvl3-native-multimodal/docs/zh.md

| 步骤 | LLaVA | OneVision | InternVL3 |
|---|---|---|---|
| 第一阶段 | 只训练 MLP，558k 条图像描述 | SI：单图、AnyRes | 原生预训练 |
| 第二阶段 | MLP + LLM，158k 个 GPT-4 轮次 | OV：0.5 / 0.3 / 0.2 混合 | 指令微调 |
| 第三阶段 | 无 | TT：目标任务混合 | 无 |
| 冻结 | 阶段 1 冻结 ViT 与 LLM | 不重置权重 | 没有冻结阶段 |
| 数据 | LAION-CC-SBU、LLaVA-Instruct | LLaVA-NeXT 数据加自有数据 | 文本、交错、图像描述、视频占比 40/35/20/5 |

## 课程中的默认值
type: defaults
from: phases/12-multimodal-ai/05-llava-visual-instruction-tuning/code/main.py, phases/12-multimodal-ai/06-any-resolution-patch-n-pack/code/main.py, phases/12-multimodal-ai/08-llava-onevision-single-multi-video/code/main.py, phases/12-multimodal-ai/09-qwen-vl-family-dynamic-fps/docs/zh.md, phases/12-multimodal-ai/09-qwen-vl-family-dynamic-fps/code/main.py, phases/12-multimodal-ai/10-internvl3-native-multimodal/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `anyres_cost` 的 tile、thumb | 336 | patch 为 14 时每图块 576 个 token |
| `square_cost` 的 side | 336 | 每图固定 576 个 token |
| LLaVA prompt 的 image_tokens | 576 | 替换图像占位符 |
| `MRoPEConfig` 的 base | 10000.0 | 各频带的 RoPE 频率基数 |
| Qwen2-VL 视频采样 | 1-2 FPS | 接受任意帧数 |
| OneVision 规划器预算 | 4096 | 每样本视觉 token 数 |
| 动态 FPS 演示预算 | 32768 | 3x 池化后每帧 81 个 token |
| `dvd_throughput` 的 llm_tokens | 128 | 每请求输出 token 数 |

## 故障排查
type: troubleshooting
from: phases/12-multimodal-ai/06-any-resolution-patch-n-pack/docs/zh.md, phases/12-multimodal-ai/08-llava-onevision-single-multi-video/docs/zh.md, phases/12-multimodal-ai/09-qwen-vl-family-dynamic-fps/docs/zh.md, phases/12-multimodal-ai/10-internvl3-native-multimodal/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 文本压扁、图表标签丢失 | 方形缩放到 336 | 保持原生宽高比，并限制最大像素数 |
| 大图占满上下文 | AnyRes 4x4 约需 9800 个 token | 使用原生打包或 M-RoPE，避免分块额外开销 |
| 图块跨图像相互注意 | 没有块对角掩码 | 从累计偏移生成掩码，或使用 `cu_seqlens` 路径 |
| 训练后图像能力弱 | 先训练视频或多图 | 先训练 SI，再 OV，最后 TT |
| GSM8K 下降 5-10 个百分点 | 后加视觉带来的对齐债务 | 原生预训练，文本比例至少 40% |
| 长视频超出频率范围 | 位置尺度固定 | 按最大输入尺寸进行 MRoPE-v2 缩放 |

## 缩写
type: glossary
from: phases/12-multimodal-ai/06-any-resolution-patch-n-pack/docs/zh.md, phases/12-multimodal-ai/08-llava-onevision-single-multi-video/docs/zh.md, phases/12-multimodal-ai/09-qwen-vl-family-dynamic-fps/docs/zh.md, phases/12-multimodal-ai/10-internvl3-native-multimodal/docs/zh.md

- **M-RoPE**：多模态 RoPE，在隐藏维度中划分时间、高度和宽度频带。
- **V2PE**：可变视觉位置编码，按模态学习频带划分。
- **NaFlex**：SigLIP 2 原生灵活模式，一个检查点支持 256、729 或 1024 个 token。
- **ViR**：视觉分辨率路由器，编码前选择最低所需分辨率。
- **DvD**：视觉语言解耦部署，将编码器与 LLM 放在不同 GPU 上。
- **SI、OV、TT**：OneVision 阶段，分别为单图、OneVision 混合、任务迁移。

## 问答
type: qa
from: phases/12-multimodal-ai/05-llava-visual-instruction-tuning/docs/zh.md, phases/12-multimodal-ai/08-llava-onevision-single-multi-video/docs/zh.md, phases/12-multimodal-ai/09-qwen-vl-family-dynamic-fps/docs/zh.md, phases/12-multimodal-ai/10-internvl3-native-multimodal/docs/zh.md

- **MLP 为什么胜过 Q-Former？** 只需 LM 损失，且容易更换 LLM。上下文增长到 32k-128k+ 后，576 个 token 已不昂贵。
- **OneVision 与 Qwen2.5-VL 的预算有何不同？** OneVision 固定预算并调整池化，Qwen2.5-VL 的预算随输入增长。
- **M-RoPE 为什么不需要位置表？** 各 token 按 (t, h, w) 位置旋转，图像使用 t = 0。
- **为什么不总做原生预训练？** 算力需求接近文本 LLM，交错数据稀少，后续无法更换 LLM。
- **DvD 有什么收益？** 对带 400M 编码器的 8B LLM，每节点吞吐量约提高 2 倍。
