---
id: video-3d-vision
title: 视频、深度与三维视觉
code: VD
subtitle: 帧采样、时间建模、NeRF 与高斯泼溅渲染、深度预测和跨帧目标跟踪。
hue: 190
sources: phases/04-computer-vision/12-video-understanding, phases/04-computer-vision/13-3d-vision-nerf, phases/04-computer-vision/22-3d-gaussian-splatting, phases/04-computer-vision/26-monocular-depth, phases/04-computer-vision/27-multi-object-tracking, phases/04-computer-vision/28-world-models-video-diffusion
source_hash: 2b3e7be63a73d970
---

## 视频模型
type: concepts
from: phases/04-computer-vision/12-video-understanding/docs/zh.md

- **2D + 池化**：逐帧 CNN，再沿时间求均值。
- **3D 卷积**：(T, H, W) 卷积核，建模运动。
- **I3D**：沿时间维扩展 2D 卷积核。
- **(2+1)D**：先做 2D 空间卷积，再做 1D 时间卷积。
- **分解注意力**：先沿时间，再沿空间。
- **均匀采样**：均匀取 T 帧，2D+池化的默认方式。
- **密集采样**：随机连续窗口，用于 3D 卷积。
- **片段 / 视频准确率**：单片段结果，或多个片段的均值。

## 选择三维、深度或跟踪模型
type: concepts
from: phases/04-computer-vision/13-3d-vision-nerf/docs/zh.md, phases/04-computer-vision/22-3d-gaussian-splatting/docs/zh.md, phases/04-computer-vision/26-monocular-depth/docs/zh.md, phases/04-computer-vision/27-multi-object-tracking/docs/zh.md

- **NeRF**：用 MLP 表示场景，训练需数小时。
- **3DGS**：显式高斯，训练需数分钟。
- **Depth Anything V3**：相对深度，冻结 DINOv2。
- **ZoeDepth**：度量深度，对内参敏感。
- **Marigold**：扩散深度，10-50 步。
- **ByteTrack**：车辆和行人，30+ fps。
- **DeepSORT**：严重遮挡，使用 ReID 特征。
- **SAM 3.1 Multiplex**：同类别密集目标。

## 基于检测的跟踪
type: architecture
from: phases/04-computer-vision/27-multi-object-tracking/docs/zh.md

```arch
node | frame | 1,1 | 第 t 帧 | 视频输入 | client
node | det | 2,1 | 检测器 | t 时刻的检测结果 | model
node | assoc | 3,1 | 匈牙利匹配 | IoU、余弦、运动
node | upd | 4,1 | 更新 | 已匹配轨迹
node | prev | 1,2 | 截至 t-1 的轨迹 | | store
node | kal | 2,2 | 卡尔曼预测 | 匀速运动
node | born | 3,2 | 新建 | 新轨迹
node | age | 4,2 | 未匹配轨迹老化 | N 次后删除
edge | frame | det |
edge | det | assoc | 检测结果
edge | prev | kal |
edge | kal | assoc | 预测框
edge | assoc | upd | 已匹配
edge | assoc | born | 未匹配的检测
edge | assoc | age | 未匹配的轨迹
```

## 公式
type: concepts
from: phases/04-computer-vision/13-3d-vision-nerf/docs/zh.md, phases/04-computer-vision/22-3d-gaussian-splatting/docs/zh.md, phases/04-computer-vision/26-monocular-depth/docs/zh.md, phases/04-computer-vision/27-multi-object-tracking/docs/zh.md

- **PointNet**：$f(P) = \max_{p \in P} \mathrm{MLP}(p)$，点的顺序不改变结果。
- **位置编码**：$\sin(2^l \pi p), \cos(2^l \pi p)$，最多 $L = 10$ 层。
- **体渲染**：$C = \sum_i T_i (1 - e^{-\sigma_i \delta_i}) c_i$，$T_i = e^{-\sum_{j<i} \sigma_j \delta_j}$
- **3DGS 形状**：$\Sigma = R S S^T R^T$，屏幕上为 $\Sigma' = J W \Sigma W^T J^T$。
- **3DGS 像素**：$C = \sum_i \alpha_i T_i c_i$，$T_i = \prod_{j<i} (1 - \alpha_j)$
- **针孔反投影**：$X = (u - c_x) d / f_x$，$Y = (v - c_y) d / f_y$，$Z = d$
- **AbsRel**：$|d_{pred} - d_{gt}| / d_{gt}$ 的均值，越低越好。
- **MOTA**：$1 - (FN + FP + \mathrm{IDSW}) / GT$

## 帧、卷积核扩展与 (2+1)D
type: annotated-code
lang: python
from: phases/04-computer-vision/12-video-understanding/docs/zh.md, phases/04-computer-vision/12-video-understanding/code/main.py

```python
idx = sample_uniform(num_frames_total, T)          # 均匀分布
idx = sample_dense(num_frames_total, T)            # 连续窗口
model = FramePool(num_classes=10)                  # 每帧 ResNet-18，沿 T 求均值
x = torch.randn(2, 8, 3, 224, 224)                 # (N, T, 3, H, W)
conv2d = nn.Conv2d(3, 64, kernel_size=3, padding=1, bias=False)
conv3d = inflate_2d_to_3d(conv2d, time_kernel=3)   # 沿时间重复，再除以 3
c = Conv2Plus1D(3, 64)                             # 先空间，再时间
c(torch.randn(1, 3, 8, 56, 56))                    # 与 conv3d 相同的三维输入
```

## 渲染一条 NeRF 光线
type: annotated-code
lang: python
from: phases/04-computer-vision/13-3d-vision-nerf/docs/zh.md, phases/04-computer-vision/13-3d-vision-nerf/code/main.py

```python
y = positional_encoding(x, L=10)                   # (5, 3) 转为 (5, 60)
t_vals = torch.linspace(2.0, 6.0, N)               # 沿光线取 N = 64 个样本
delta = torch.cat([t_vals[1:] - t_vals[:-1], torch.full_like(t_vals[:1], 1e10)])
alpha = 1.0 - torch.exp(-sigma * delta)            # 每个样本的不透明度
trans = torch.cumprod(torch.cat([torch.ones_like(alpha[..., :1]), 1.0 - alpha + 1e-10], dim=-1), dim=-1)[..., :-1]
weights = alpha * trans                            # 透射率乘不透明度
rendered = (weights.unsqueeze(-1) * rgb).sum(dim=-2)  # 像素颜色
depth = (weights * t_vals).sum(dim=-1)             # 沿光线的深度
```

## 深度指标与反投影
type: annotated-code
lang: python
from: phases/04-computer-vision/26-monocular-depth/docs/zh.md, phases/04-computer-vision/26-monocular-depth/code/main.py

```python
aligned = align_scale_shift(pred, gt)              # 为相对深度拟合 a * pred + b
abs_rel_error(aligned, gt)                         # 生产模型为 0.05-0.1
delta_accuracy(pred, target, threshold=1.25)       # 最佳水平为 0.9+
intr = (320.0, 320.0, 160.0, 120.0)                # fx, fy, cx, cy
pc = depth_to_point_cloud(depth, intr)             # (H, W, 3)
pipe = pipeline(task="depth-estimation", model="depth-anything/Depth-Anything-V2-Large-hf")
out = pipe(image)
depth_np = np.array(out["depth"])                  # PIL 灰度图转 numpy
```

## IoU 与匈牙利关联
type: annotated-code
lang: python
from: phases/04-computer-vision/27-multi-object-tracking/docs/zh.md, phases/04-computer-vision/27-multi-object-tracking/code/main.py

```python
iou = bbox_iou(track_boxes, det_boxes)             # (轨迹数, 检测数)
cost = 1 - iou
cost[iou < self.iou_threshold] = 1e6               # 禁止弱匹配
row, col = linear_sum_assignment(cost)             # 最小总成本
for r, c in zip(row, col):
    if cost[r, c] < 1.0:
        self.tracks[r].update(det_boxes[c], frame)
self.tracks = [t for t in self.tracks if frame - t.last_frame <= self.max_age]
tracker = SimpleTracker()                          # iou_threshold=0.3, max_age=5
tracks = tracker.step(dets, f)                     # (id, bbox) 列表
```

## 命令与导出
type: command-table
from: phases/04-computer-vision/22-3d-gaussian-splatting/docs/zh.md, phases/04-computer-vision/27-multi-object-tracking/docs/zh.md

| 命令 | 作用 |
|---|---|
| `pip install nerfstudio gsplat` | 安装 3DGS 工具 |
| `ns-download-data example` | 获取示例数据集 |
| `ns-train splatfacto --data path/to/data` | 训练 3DGS，RTX 4090 上需 10-30 分钟 |
| `.ply` | 原始高斯云，可移植，文件最大 |
| `.splat` | 量化格式 |
| `KHR_gaussian_splatting` | 跨查看器的 glTF 标准 |
| `UsdVolParticleField3DGaussianSplat` | OpenUSD 模式 |
| `model.track(source, tracker="bytetrack.yaml")` | YOLOv8 配合 ByteTrack |

## 默认值与数字
type: defaults
from: phases/04-computer-vision/12-video-understanding/docs/zh.md, phases/04-computer-vision/13-3d-vision-nerf/docs/zh.md, phases/04-computer-vision/22-3d-gaussian-splatting/docs/zh.md, phases/04-computer-vision/26-monocular-depth/docs/zh.md, phases/04-computer-vision/27-multi-object-tracking/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 每片段帧数 T | 8、16、32 或 64 | T 越大，信号与计算越多 |
| `time_kernel` | 3 | 扩展后的权重除以该值 |
| NeRF `L` | 10 | 方向使用 `L_dir=4` |
| 每条光线样本数 | 64 | t 从 2.0 到 6.0 |
| SH 阶数 | 3 | 每通道 16 个系数，共 48 个浮点数 |
| 3DGS 迭代次数 | 约 30,000 | 高斯数从约 100k 增至 1-5M |
| 跟踪器 `iou_threshold` | 0.3 | 配合 `max_age=5` |
| Delta 阈值 | 1.25 | 误差在 25% 内的像素比例 |

## 常见问题排查
type: troubleshooting
from: phases/04-computer-vision/12-video-understanding/docs/zh.md, phases/04-computer-vision/13-3d-vision-nerf/docs/zh.md, phases/04-computer-vision/26-monocular-depth/docs/zh.md, phases/04-computer-vision/27-multi-object-tracking/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| “开门”等同于“关门” | 时间池化对顺序不敏感 | 使用 3D 卷积或 (2+1)D |
| 扩展后 BN 失效 | 权重未缩放 | 除以 `time_kernel` |
| NeRF 看起来模糊 | 没有位置编码 | 添加傅里叶特征 |
| 远近顺序正确，米数错误 | 相对深度模型 | 度量深度模型加内参 |
| 玻璃与镜子深度错误 | 反射表面 | 不信任这些像素 |
| MiDaS 输出 AbsRel 高 | 未对齐尺度与偏移 | 先做 `align_scale_shift` |
| 密集人群附近 ID 切换 | 只用 IoU 关联 | ByteTrack 第二轮匹配或 ReID |
| 短暂遮挡就丢失轨迹 | 无运动模型 | 添加卡尔曼预测步骤 |

## 问答
type: qa
span: 2
from: phases/04-computer-vision/12-video-understanding/docs/zh.md, phases/04-computer-vision/22-3d-gaussian-splatting/docs/zh.md, phases/04-computer-vision/26-monocular-depth/docs/zh.md, phases/04-computer-vision/27-multi-object-tracking/docs/zh.md

- **3DGS 为何能达到 NeRF 质量？** 两者使用相同合成方程。
- **为何从 2D + 池化开始？** 可复用 ImageNet 权重，通常仅差 5-10 个百分点。
- **跟踪用哪个指标？** IDF1 衡量身份，HOTA 用于运动场景和比较。
- **单张图像无法提供什么？** 无内参时的绝对尺度，以及被遮挡的几何结构。
- **为何保留低置信度框？** ByteTrack 第二轮匹配它们，以恢复短暂遮挡。
