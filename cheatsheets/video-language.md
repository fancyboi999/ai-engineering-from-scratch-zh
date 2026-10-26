---
id: video-language
title: 视频语言模型与长视频
code: VV
subtitle: 采样视频帧、规划 token 预算、编码时间、定位事件，为长视频建立索引并输出带时间戳的答案。
hue: 320
sources: phases/12-multimodal-ai/17-video-language-temporal-grounding, phases/12-multimodal-ai/18-long-video-million-token, phases/04-computer-vision/12-video-understanding, phases/19-capstone-projects/12-video-understanding-pipeline
source_hash: 8475cbea0582e93e
---

## 场景索引流程（综合项目）
type: architecture
from: phases/19-capstone-projects/12-video-understanding-pipeline/docs/zh.md

```arch
node | video | 1,1 | 视频文件 | YouTube URL 或本地 MP4 | client
node | scene | 2,1 | 场景分割 | TransNetV2 或 PySceneDetect | process
node | cap | 3,1 | VLM 描述 | 描述 + 帧嵌入 | model
node | index | 4,1 | 多向量 Qdrant | 三个命名向量 | store
node | asr | 3,2 | ASR 处理 | Whisper-v3-turbo、词级时间戳 | model
node | query | 1,3 | 问题 | 自然语言 | client
node | rrf | 2,3 | RRF 合并 | 前 k=5 个场景 | process
node | ground | 3,3 | 时间定位 | 细化场景内的起止时间 | process
node | synth | 4,3 | VLM 合成 | 答案 + 时间戳 | model
edge | video | scene |
edge | scene | cap | 关键帧
edge | scene | asr | 音频
edge | cap | index |
edge | asr | index |
edge | query | rrf |
edge | index | rrf | 三次查询
edge | rrf | ground | 最高排名场景
edge | ground | synth | 时间窗口
```

## 视频 VLM 设计
type: comparison
span: 2
from: phases/12-multimodal-ai/17-video-language-temporal-grounding/docs/zh.md, phases/12-multimodal-ai/17-video-language-temporal-grounding/code/main.py

| 维度 | Video-LLaMA | Video-LLaVA | Qwen2.5-VL |
|---|---|---|---|
| 帧 | 2 FPS 下的 16 帧片段 | 8 帧 | 动态 FPS |
| 压缩器 | 视频 Q-former，32 个查询 | MLP | 逐 token 时间对齐 M-RoPE |
| 时间位置 | 一维时间 RoPE | 可学习时间嵌入 | 绝对时间戳 (t, h, w) |
| 说明 | 音频分支、ImageBind | 共享图像与视频编码器 | 2025 年最佳开放模型 |
| 对“何时”的回答 | “片段开头” | 8-16 帧系统 | “在 4.2 秒处” |
| 弱点 | 片段长度固定 | 不支持长视频 | 未说明 |

## 长视频的四条路径
type: comparison
span: 2
from: phases/12-multimodal-ai/18-long-video-million-token/docs/zh.md, phases/12-multimodal-ai/18-long-video-million-token/code/main.py

| 维度 | 超长上下文 | 环形注意力 | token 压缩 | agent 式检索 |
|---|---|---|---|---|
| 示例 | Gemini 1.5、Gemini 2.5 Pro | LWM、LongVILA | Video-XL、LongVA | VideoAgent |
| 机制 | 一次处理所有 token | 数据块在设备间轮转 | 每片段一个摘要 token | LLM 查询片段工具 |
| 成本 | 数百万 token | 随上下文线性增长 | 较小上下文 | 仅处理相关片段 |
| 弱点 | 封闭、不开源 | 分布在多台设备上 | 漏掉精确帧 | 依赖检索质量 |
| 适用场景 | >1h 的通用问答 | 15-60 min | 15-60 min | >1h 的特定查询 |

## VideoAgent 循环
type: flow
from: phases/12-multimodal-ai/18-long-video-million-token/docs/zh.md, phases/12-multimodal-ai/18-long-video-million-token/code/main.py

1. **LLM**：读取问题。
2. **LLM**：调用 `find_clips(keyword='<word>')` 获取相关片段。
3. **工具**：返回匹配片段的时间戳。
4. **VLM**：编码 3 个各 30s 的片段，总计约 7290 个 token。
5. **LLM**：组织答案，或发出后续查询。

## token 计算
type: concepts
from: phases/12-multimodal-ai/17-video-language-temporal-grounding/docs/zh.md, phases/12-multimodal-ai/18-long-video-million-token/docs/zh.md, phases/12-multimodal-ai/18-long-video-million-token/code/main.py

- **预算**：`tokens(duration_s, fps, per_frame)` 等于时长乘 FPS 再乘每帧 token 数。
- **原始数据**：1 分钟、30 FPS、每帧 196 个 token，共 352k 个 token。
- **3x3 池化**：每帧 64 个 token，5 分钟、1 FPS 共 19,200 个 token。
- **原生 384**：每帧约 729 个 token，3x3 池化后为 81 个。
- **30 min**：1 FPS、每帧 81 个 token 共 145,800 个；2 FPS 为 291,600 个。
- **2 小时**：1 FPS、每帧 81 个 token 共 583k 个 token。
- **检索**：3 个片段为 `3 * 30 * 81 + 200` 个 token，成本降低 99%。

## 视频视觉模型家族
type: concepts
from: phases/04-computer-vision/12-video-understanding/docs/zh.md

- **2D + 池化**：逐帧 2D CNN，沿时间取均值，无法建模运动。
- **3D 卷积**：卷积核覆盖 (T, H, W)，例如 C3D、I3D、SlowFast。
- **I3D 膨胀**：沿时间复制 2D 卷积核，3x3 变为 3x3x3。
- **(2+1)D**：先 2D 空间卷积，再 1D 时间卷积，参数更少。
- **联合注意力**：在 (t, h, w) 上计算一次注意力，对 `T*H*W` 呈平方复杂度。
- **分离注意力**：每个块分别计算时间注意力与空间注意力。
- **因子化注意力**：跨块交替使用时间与空间注意力。

## 代码中的函数
type: task-table
span: 2
from: phases/12-multimodal-ai/17-video-language-temporal-grounding/code/main.py, phases/04-computer-vision/12-video-understanding/code/main.py, phases/19-capstone-projects/12-video-understanding-pipeline/code/main.py

| 任务 | 代码 |
|---|---|
| 均匀时间戳 | `uniform_sample(duration, n)` |
| 运动感知时间戳 | `dynamic_sample(motion, fps_cap=4, total_budget=32)` |
| 为定位结果评分 | `evaluate_grounding(predictions, ground_truth, tol_iou=0.3)` |
| 时间区间重叠 | `iou(a_start, a_end, b_start, b_end)` |
| 均匀帧索引 | `sample_uniform(num_frames_total, T)` |
| 随机连续窗口 | `sample_dense(num_frames_total, T, rng=None)` |
| 将 2D 卷积升为 3D | `inflate_2d_to_3d(conv2d, time_kernel=3)` |
| 搜索三个向量 | `multi_vector_search(query, scenes, k=5)` |

## 采样、定位与膨胀
type: annotated-code
lang: python
span: 2
from: phases/12-multimodal-ai/17-video-language-temporal-grounding/code/main.py, phases/04-computer-vision/12-video-understanding/code/main.py

```python
uni = uniform_sample(duration, 8)                          # step * (i + 0.5)
dyn = dynamic_sample(motion, fps_cap=4, total_budget=12)   # 每秒 1 至 fps_cap 帧
result = evaluate_grounding(predictions, ground)           # IoU >= tol_iou 时命中
result["recall"]                                           # 命中数除以真实事件数
model = FramePool(num_classes=10, pretrained=False)        # 逐帧 ResNet-18，沿 T 取均值
c3d = inflate_2d_to_3d(c2d, time_kernel=3)                 # 沿时间复制，再除以 time_kernel
c21 = Conv2Plus1D(3, 16)                                   # 空间卷积、BN、ReLU、时间卷积
```

## 运行综合项目
type: command-table
from: phases/19-capstone-projects/12-video-understanding-pipeline/code/main.py, phases/19-capstone-projects/12-video-understanding-pipeline/code/ts/README.md, phases/19-capstone-projects/12-video-understanding-pipeline/code/ts/src/server.ts, phases/19-capstone-projects/12-video-understanding-pipeline/code/ts/src/types.ts

| 命令 | 作用 |
|---|---|
| `python main.py` | 索引演示：RRF 搜索、定位窗口 |
| `npm run typecheck` | 对 UI 部分进行类型检查 |
| `npm test` | 作业状态与存储测试 |
| `npm start` | 自动结束的演示 |
| `npm run serve` | :8123 上的 HTTP 服务端 |
| `GET /jobs` | 以 JSON 返回作业摘要 |
| `GET /job/:id` | 阶段时间线，未知 id 返回 404 |
| 阶段 | chunk、embed、index、qa |

## 默认值
type: defaults
span: 1
from: phases/12-multimodal-ai/17-video-language-temporal-grounding/code/main.py, phases/12-multimodal-ai/17-video-language-temporal-grounding/docs/zh.md, phases/04-computer-vision/12-video-understanding/code/main.py, phases/04-computer-vision/12-video-understanding/docs/zh.md, phases/19-capstone-projects/12-video-understanding-pipeline/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `fps_cap` | 4 | 每秒最大采样帧数 |
| `total_budget` | 32 | 动态采样总量 |
| `tol_iou` | 0.3 | 定位命中的 IoU 阈值 |
| `time_kernel` | 3 | 膨胀的时间深度 |
| RRF 常数 | 60 | 累加 `1.0 / (60 + rank + 1)` |
| 搜索中的 `k` | 5 | 融合后的前几个场景 |
| 片段长度 T | 8 | 也可取 16、32 或 64 |

## 故障排查
type: troubleshooting
span: 2
from: phases/04-computer-vision/12-video-understanding/docs/zh.md, phases/12-multimodal-ai/17-video-language-temporal-grounding/docs/zh.md, phases/12-multimodal-ai/18-long-video-million-token/docs/zh.md, phases/19-capstone-projects/12-video-understanding-pipeline/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| “开门”等同于“关门” | 时间池化不保留顺序 | 使用 3D 卷积或 transformer |
| 运动类别准确率接近随机 | 仅靠外观不够 | 训练 R(2+1)D，而非 FramePool |
| 膨胀模型破坏批归一化 | 激活尺度增大 | 除以 `time_kernel` |
| 联合注意力耗时暴涨 | 对 `T*H*W` 呈平方复杂度 | 使用分离注意力 |
| 均匀采样漏掉动作 | 丢失运动峰值 | 使用带最大帧数限制的动态 FPS |
| 答案只说“片段开头” | 缺少绝对时间位置 | 使用时间对齐 M-RoPE 与 JSON 输出 |
| 2h 视频上下文溢出 | 1 FPS 下需要 583k 个 token | 加强池化或使用 VideoAgent |
| “多少个 X”计数错误 | 计数幻觉 | 单独报告计数准确率 |

## 问答
type: qa
from: phases/12-multimodal-ai/17-video-language-temporal-grounding/docs/zh.md, phases/12-multimodal-ai/18-long-video-million-token/docs/zh.md, phases/04-computer-vision/12-video-understanding/docs/zh.md, phases/19-capstone-projects/12-video-understanding-pipeline/docs/zh.md

- **时间对齐 M-RoPE 增加了什么？** 逐 token 的绝对时间，可处理动态 FPS 的不均匀间距。
- **用什么输出格式？** 包含时间与事件字段的结构化 JSON。
- **用哪种池化？** 多数任务用 3x3 双线性池化，agent 工作流用 6x6。
- **15 分钟片段走哪条路径？** 具有原生上下文的开放 72B 模型。
- **2 小时以上走哪条路径？** VideoAgent 或分层摘要。
- **片段 78%、整段视频 82% 意味着什么？** 模型依赖测试时平均。
- **每个场景为什么用三个向量？** 单个池化向量会造成检索回退。

## 基准
type: concepts
from: phases/12-multimodal-ai/17-video-language-temporal-grounding/docs/zh.md, phases/12-multimodal-ai/18-long-video-million-token/docs/zh.md

- **VideoMME**：短、中、长视频，2500 多个样本。
- **TempCompass**：“之前”与“之后”的顺序问题。
- **EgoSchema**：长程第一人称视频。
- **大海捞针**：在随机位置隐藏标记，计算 Recall@k。
