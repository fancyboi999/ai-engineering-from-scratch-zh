---
id: video-3d-generation
title: 视频与 3D 生成
code: V3
subtitle: 视频 DiT 图块与分解注意力、世界模型、高斯泼溅、NeRF 和多视角 3D。包含公式与修正。
hue: 170
sources: phases/08-generative-ai/10-video-generation, phases/08-generative-ai/12-3d-generation, phases/04-computer-vision/22-3d-gaussian-splatting, phases/04-computer-vision/28-world-models-video-diffusion
source_hash: 87d12dc915542d81
---

## 视频扩散流水线
type: architecture
from: phases/08-generative-ai/10-video-generation/docs/zh.md, phases/04-computer-vision/28-world-models-video-diffusion/docs/zh.md

```arch
node | vid | 1,1 | 视频 | T 帧 | client
node | vae | 2,1 | 3D VAE | 时空压缩 | model
node | patch | 3,1 | 图块化 | t_p、h_p、w_p 图块 | process
node | txt | 1,2 | prompt | 重新生成的密集描述 | client
node | te | 2,2 | 文本编码器 | T5-XXL | model
node | dit | 3,2 | 视频 DiT | 3D 位置、分解注意力 | gpu
node | lat | 4,2 | 去噪潜变量 | ε 或 v 预测 | store
node | out | 4,1 | 帧 | VAE 解码 | client
edge | vid | vae |
edge | vae | patch | 潜变量
edge | patch | dit | tokens
edge | txt | te |
edge | te | dit | 交叉注意力
edge | dit | lat | 每一步
edge | lat | out |
```

## 渲染与拟合高斯泼溅
type: flow
from: phases/04-computer-vision/22-3d-gaussian-splatting/docs/zh.md

1. **投影**：通过相机外参与内参，将每个 3D 高斯映射到 2D。
2. **分块**：将每个 2D 高斯分配到 16x16 屏幕分块。
3. **排序**：在各分块内按深度排序高斯。
4. **合成**：从前向后混合，得到像素颜色。
5. **损失**：将渲染结果与真实照片比较。
6. **反向传播**：通过梯度下降更新 `(mu, q, s, alpha, c_lm)`。
7. **增密**：在梯度高的地方复制小高斯、拆分大高斯。
8. **裁剪**：移除低不透明度高斯。训练约 30,000 次迭代。

## 公式与数值
type: concepts
from: phases/04-computer-vision/22-3d-gaussian-splatting/docs/zh.md, phases/04-computer-vision/28-world-models-video-diffusion/docs/zh.md, phases/08-generative-ai/10-video-generation/docs/zh.md

- **协方差**：由四元数与尺度得到 $\Sigma = R S S^T R^T$。
- **投影**：$\Sigma' = J W \Sigma W^T J^T$，得到 2 × 2 协方差。
- **合成**：$C = \sum_i \alpha_i T_i c_i$，其中 $T_i = \prod_{j < i} (1 - \alpha_j)$。NeRF 使用同一公式。
- **球谐颜色**：阶数 L 对应每通道 $(L+1)^2$ 项。3 阶有 16 项。
- **高斯大小**：约 60 个浮点数。500 万个高斯使用 240 MB。
- **视频 token**：$(T / P_t) \cdot (H / P_h) \cdot (W / P_w)$
- **分解注意力**：$(HW) \cdot T^2 + T \cdot (HW)^2$，替代 $O((THW)^2)$。
- **原始视频**：10 s、1080p、24 fps 为 240 帧，约 1.5 GB。

## 微型视频 DiT
type: annotated-code
lang: python
from: phases/04-computer-vision/28-world-models-video-diffusion/code/main.py, phases/04-computer-vision/28-world-models-video-diffusion/docs/zh.md

```python
vid = torch.randn(1, 4, 8, 16, 16)                # (N, C, T, H, W)
model = TinyVideoDiT(in_channels=4, dim=64, depth=2, heads=2)
out, grid = model(vid)                            # grid 为 (4, 8, 8)，out 为 (1, 256, 32)
tokens, grid = self.patch(x)                      # Conv3d，步长等于卷积核
xt = x.view(n, T, H * W, d).permute(0, 2, 1, 3).reshape(n * H * W, T, d)
a, _ = self.time_attn(self.ln1(xt), self.ln1(xt), self.ln1(xt), need_weights=False)
xs = xt.view(n, T, H * W, d).reshape(n * T, H * W, d)
a, _ = self.space_attn(self.ln2(xs), self.ln2(xs), self.ln2(xs), need_weights=False)
xs = xs + self.mlp(self.ln3(xs))                  # 时间与空间处理后执行 MLP
```

## 用 2D 泼溅拟合图像
type: annotated-code
lang: python
from: phases/04-computer-vision/22-3d-gaussian-splatting/docs/zh.md, phases/04-computer-vision/22-3d-gaussian-splatting/code/main.py

```python
model = Splats2D(num_splats=64, image_size=64)
opt = torch.optim.Adam(model.parameters(), lr=0.05)
for step in range(200):
    pred = model((64, 64))                        # 内部使用 rasterise_2d
    loss = F.mse_loss(pred, target)
    opt.zero_grad(); loss.backward(); opt.step()
alphas = alphas.clamp(0.0, 0.99)                  # 位于 rasterise_2d
order = torch.argsort(depths)                     # 二维中学习的深度标量
out = out + (T * a)[..., None] * colours_sorted[i][None, None, :]
T = T * (1.0 - a)                                 # 透射率
```

## 课程中的函数
type: task-table
from: phases/04-computer-vision/28-world-models-video-diffusion/code/main.py, phases/04-computer-vision/28-world-models-video-diffusion/docs/zh.md, phases/04-computer-vision/22-3d-gaussian-splatting/code/main.py, phases/08-generative-ai/10-video-generation/code/main.py

| 任务 | 代码 |
|---|---|
| 统计视频 token | `count_tokens(T, H, W, p_t=2, p_h=8, p_w=8)` |
| 添加 3D 位置 | `rope_3d(tokens, t_dim, h_dim, w_dim, grid)` |
| 先时间后空间的块 | `DividedAttentionBlock(dim=64, heads=2)` |
| 图块与时间嵌入 | `patchify_with_pos(noisy)` |
| 测量闪烁 | `frame_deltas(clip)` |
| 高斯密度 | `eval_2d_gaussian(means, covs, points)` |
| 构建协方差 | `R @ S @ R.transpose(-1, -2)` |
| 视角相关颜色 | `eval_sh_degree_3(sh_coeffs, dirs)` |

## nerfstudio 与导出
type: command-table
from: phases/04-computer-vision/22-3d-gaussian-splatting/docs/zh.md

| 命令 | 作用 |
|---|---|
| `pip install nerfstudio gsplat` | 安装训练器和 CUDA 光栅化器 |
| `ns-download-data example` | 下载示例数据 |
| `ns-train splatfacto --data path/to/data` | 训练 3DGS。在 RTX 4090 上需 10-30 分钟 |
| `.ply` | 原始高斯点云。可移植，文件最大 |
| `.splat` | 量化格式 |
| `KHR_gaussian_splatting` | glTF 标准，可在不同查看器间移植 |
| `UsdVolParticleField3DGaussianSplat` | OpenUSD 26.03 模式 |

## 3D 表示对比
type: comparison
from: phases/08-generative-ai/12-3d-generation/docs/zh.md, phases/04-computer-vision/22-3d-gaussian-splatting/docs/zh.md
span: 2

| 维度 | NeRF | 3D 高斯泼溅 | Triplane | 网格 |
|---|---|---|---|---|
| 存储 | MLP 权重 | 显式高斯 | 三个二维特征网格 | 表面与 PBR 材质 |
| 渲染 | 沿射线积分 | 光栅化与 alpha 合成 | 射线步进加 MLP | 游戏引擎 |
| 速度 | 比网格慢 100-1000x | 4090 上 1080p 约 100 fps | LRM 约 5 s 生成一个 | TripoSR 约 1 s 生成一个 |
| 编辑 | 重训 | 移动部分高斯 | 未涵盖 | 交付前重新网格化 |

## 世界模型族
type: comparison
from: phases/04-computer-vision/28-world-models-video-diffusion/docs/zh.md

| 维度 | 视频生成 | 动作条件 | RL 世界模型 |
|---|---|---|---|
| 输入 | 文本或图像 prompt | 历史帧 + 动作 | 状态 + 动作 |
| 输出 | 视频帧 | 后续帧 | 下一潜变量 + 奖励 |
| 展开途中能否控制 | 否 | 能，使用潜在动作 | 能 |
| 示例 | Sora 2 | Genie 3 | DreamerV3 |

## 代码中的默认值
type: defaults
from: phases/04-computer-vision/28-world-models-video-diffusion/code/main.py, phases/04-computer-vision/22-3d-gaussian-splatting/docs/zh.md, phases/04-computer-vision/22-3d-gaussian-splatting/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `patch_t`、`patch_h`、`patch_w` | 2 | `VideoPatch3D` 将 T、H、W 减半 |
| `dim` | 64 | token 宽度 |
| `heads` | 2 | 块中的每个注意力模块 |
| `count_tokens` 中的 `p_h`、`p_w` | 8 | `p_t` 为 2 |
| `num_splats` | 64 | 代码文件中的 `Splats2D` |
| Adam `lr` | 0.05 | 代码文件使用 0.08 |
| Alpha 裁剪 | 0.99 | 每个高斯的上界 |
| 初始高斯 | 约 100k | 从 SfM 点初始化 |

## 故障排查
type: troubleshooting
from: phases/08-generative-ai/10-video-generation/docs/zh.md, phases/08-generative-ai/12-3d-generation/docs/zh.md, phases/04-computer-vision/28-world-models-video-diffusion/code/main.py, phases/04-computer-vision/28-world-models-video-diffusion/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 帧闪烁 | 各帧独立采样 | 通过注意力或共享噪声耦合各帧 |
| 内存不足 | 完整 3D 注意力 | 分解为空间与时间注意力 |
| 超过 10s 的片段漂移 | 误差累积 | 使用滑动窗口和关键帧锚点 |
| 物体消失或合并 | 无持久物体模型 | 交付前检查物体恒存性 |
| 3D 拟合模糊 | 不同视角结构不一致 | 使用共享注意力的多视角扩散 |
| 10M 泼溅、过拟合 | 缺少增密与裁剪控制 | 使用增密和裁剪启发式规则 |
| 网格有孔洞 | 隐式场拓扑 | 交付前运行重网格化工具 |
| `rope_3d` 抛出 `ValueError` | `t_dim+h_dim+w_dim` 不等于 D | 在三个轴间拆分 D |

## 问答
type: qa
from: phases/04-computer-vision/22-3d-gaussian-splatting/docs/zh.md, phases/08-generative-ai/10-video-generation/docs/zh.md, phases/08-generative-ai/12-3d-generation/docs/zh.md, phases/04-computer-vision/28-world-models-video-diffusion/docs/zh.md

- **3DGS 为何取代 NeRF？** 渲染达到 100+ fps，几分钟内训练，可直接编辑。
- **3DGS 为何能达到 NeRF 质量？** 两者积分同一个辐射场方程。
- **服务时什么限制视频 DiT？** 内存带宽，而非 FLOPs。
- **Sora 最大的改进来自哪里？** 详细程度约增加 10x 的描述。
- **2026 年 3D 技术栈如何工作？** 扩散生成多视角图像，然后做 3D 拟合，常用泼溅。
- **如何衡量视频质量？** FVD 衡量视觉，逐帧 CLIPScore 衡量与 prompt 的对齐。
