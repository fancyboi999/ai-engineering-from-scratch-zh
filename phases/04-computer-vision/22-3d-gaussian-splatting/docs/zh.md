# 从零实现 3D 高斯泼溅

> 一个场景是几百万个 3D 高斯的云。每个都有位置、朝向、缩放、不透明度，以及一个随观看方向变化的颜色。把它们光栅化，对光栅化反向传播，搞定。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 4 第 13 课（3D 视觉与 NeRF）、阶段 1 第 12 课（张量运算）、阶段 4 第 10 课（扩散基础，可选）
**预计时间：** ~90 分钟

## 学习目标

- 解释为什么 2026 年 3D 高斯泼溅取代 NeRF 成了照片级真实感 3D 重建的生产默认
- 说出每个高斯的六个参数（位置、旋转四元数、缩放、不透明度、球谐颜色、可选特征）以及各自贡献多少个浮点数
- 用 `alpha` 合成从零实现一个 2D 高斯泼溅光栅化器，再展示 3D 情形如何投影到同一个循环
- 用 `nerfstudio`、`gsplat` 或 `SuperSplat` 从 20-50 张照片重建一个场景，并导出到 `KHR_gaussian_splatting` glTF 扩展或 OpenUSD 26.03 的 `UsdVolParticleField3DGaussianSplat` schema

## 问题背景

NeRF 把场景存成一个 MLP 的权重。每个渲染像素是沿一条射线的几百次 MLP 查询。训练要几小时，渲染要几秒，而且权重没法编辑——你想在场景里挪一把椅子，就得重训。

3D 高斯泼溅（Kerbl、Kopanas、Leimkühler、Drettakis，SIGGRAPH 2023）把这一切都替换了。一个场景是一组显式的 3D 高斯。渲染是 100+ fps 的 GPU 光栅化。训练要几分钟。编辑很直接：平移一个子集的高斯，你就挪了那把椅子。到 2026 年，Khronos Group 已批准了高斯泼溅的 glTF 扩展，OpenUSD 26.03 提供了高斯泼溅 schema，Zillow 和 Apartments.com 用它们渲染房产，而大多数 3D 重建的新研究论文都是核心 3DGS 点子的变体。

心智模型简单，但数学有足够多活动部件，以致大多数入门都从光栅化开始、跳过了投影和球谐。这一课把整个东西都搭出来——先一个 2D 版本，再 3D 扩展。

## 核心概念

### 一个高斯携带什么

一个 3D 高斯是空间里的一个参数化斑块，带这些属性：

```
position         mu         (3,)    世界坐标里的中心
rotation         q          (4,)    编码朝向的单位四元数
scale            s          (3,)    每轴的对数缩放（渲染时取指数）
opacity          alpha      (1,)    sigmoid 之后的不透明度 [0, 1]
SH coefficients  c_lm       (3 * (L+1)^2,)   随视角变化的颜色
```

旋转 + 缩放构建一个 3x3 协方差：`Sigma = R S S^T R^T`。那就是高斯在 3D 里的形状。球谐让颜色随观看方向变化——镜面高光、微妙光泽、随视角的辉光——而无需存每视角的纹理。用 SH degree 3，每个颜色通道得到 16 个系数，光颜色每个高斯就 48 个浮点数。

一个场景通常有 100-500 万个高斯。每个存大约 60 个浮点数（3 + 4 + 3 + 1 + 48 + 杂项）。一个五百万高斯的场景就是 240 MB——远小于带逐点纹理的等价点云，也比 NeRF 的 MLP 权重在高分辨率重新渲染时小一个数量级。

### 光栅化，不是 ray marching

```mermaid
flowchart LR
    SCENE["几百万个 3D 高斯<br/>（位置、旋转、缩放、<br/>不透明度、SH 颜色）"] --> PROJ["投影到 2D<br/>（相机外参 + 内参）"]
    PROJ --> TILES["分配到 tile<br/>（16x16 屏幕空间）"]
    TILES --> SORT["逐 tile<br/>深度排序"]
    SORT --> ALPHA["从前到后<br/>Alpha 合成"]
    ALPHA --> PIX["像素颜色"]

    style SCENE fill:#dbeafe,stroke:#2563eb
    style ALPHA fill:#fef3c7,stroke:#d97706
    style PIX fill:#dcfce7,stroke:#16a34a
```

五步，全都对 GPU 友好。没有逐像素的 MLP 查询。单块 RTX 3080 Ti 以 147 fps 渲染 600 万个 splat。

### 投影步骤

世界位置 `mu`、3D 协方差 `Sigma` 的 3D 高斯，投影成一个屏幕位置 `mu'`、2D 协方差 `Sigma'` 的 2D 高斯：

```
mu' = project(mu)
Sigma' = J W Sigma W^T J^T          (2 x 2)

W = 观看变换（相机的旋转 + 平移）
J = 透视投影在 mu' 处的雅可比
```

2D 高斯的足迹是一个椭圆，其轴是 `Sigma'` 的特征向量。那个椭圆内每个像素都接收该高斯的贡献，由 `exp(-0.5 * (p - mu')^T Sigma'^-1 (p - mu'))` 加权。

### Alpha 合成规则

对一个像素，覆盖它的高斯按从后到前排序（或等价地用反转公式从前到后）。颜色用和自 1980 年代以来每个半透明光栅化器相同的方程合成：

```
C_pixel = sum_i alpha_i * T_i * c_i

T_i = prod_{j < i} (1 - alpha_j)       到 i 为止的透射率
alpha_i = opacity_i * exp(-0.5 * d^T Sigma'^-1 d)   局部贡献
c_i = eval_SH(SH_i, view_direction)    随视角的颜色
```

这**和 NeRF 的体积渲染是同一个方程**，只不过作用于一组显式的稀疏高斯，而不是沿射线的稠密采样。正是这个等同性，让渲染质量匹敌 NeRF——两者都在积分同一个辐射场方程。

### 这为什么可微

每一步——投影、tile 分配、alpha 合成、SH 求值——对高斯参数都可微。给定一张真值图像，算渲染像素损失，对光栅化器反向传播，用梯度下降更新所有 `(mu, q, s, alpha, c_lm)`。在约 30,000 次迭代里，高斯找到它们正确的位置、缩放和颜色。

### 致密化与剪枝

一组固定的高斯覆盖不了复杂场景。训练包含两个自适应机制：

- 当一个高斯梯度幅值大但缩放小时，在它当前位置**克隆（Clone）**它——这里的重建需要更多细节。
- 当一个大尺度高斯梯度大时，把它**分裂（Split）**成两个更小的——一个大高斯太平滑、拟合不了那块区域。
- **剪枝（Prune）**不透明度掉到阈值以下的高斯——它们没在贡献。

致密化每 N 次迭代跑一次。一个场景通常从约 10 万个初始高斯（用 SfM 点播种）增长到训练结束时的 100-500 万个。

### 一段话讲清球谐

随视角的颜色是单位球面上的一个函数 `c(direction)`。球谐是球面的傅里叶基。截断到 degree `L`，每个通道就得到 `(L+1)^2` 个基函数。为新视角求颜色，是学到的 SH 系数和在观看方向上求值的基之间的一次点积。Degree 0 = 一个系数 = 常数颜色。Degree 3 = 16 个系数 = 足够捕捉 Lambertian 着色、镜面和轻微反射。3D 高斯泼溅论文默认用 degree 3。

### 2026 年的生产栈

```
1. 采集            智能手机 / DJI 无人机 / 手持扫描仪
2. SfM / MVS       COLMAP 或 GLOMAP 推导相机位姿 + 稀疏点
3. 训练 3DGS       nerfstudio / gsplat / inria 官方 / PostShot（RTX 4090 上约 10-30 分钟）
4. 编辑            SuperSplat / SplatForge（清漂浮物、分割）
5. 导出            .ply -> glTF KHR_gaussian_splatting 或 .usd（OpenUSD 26.03）
6. 查看            Cesium / Unreal / Babylon.js / Three.js / Vision Pro
```

### 4D 与生成式变体

- **4D 高斯泼溅** —— 高斯是时间的函数；用于体积视频（Superman 2026、A$AP Rocky 的 "Helicopter"）。
- **生成式 splat** —— 文本到 splat 的模型（World Labs 的 Marble），幻想出整个场景。
- **3D Gaussian Unscented Transform** —— NVIDIA NuRec 用于自动驾驶仿真的变体。

```figure
cv3-gaussian-splat
```

## 动手构建

### 第 1 步：一个 2D 高斯

我们先搭一个 2D 光栅化器。3D 情形投影后就归约到它。

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


def eval_2d_gaussian(means, covs, points):
    """
    means:  (G, 2)      中心
    covs:   (G, 2, 2)   协方差矩阵
    points: (H, W, 2)   像素坐标
    返回: (G, H, W)  每个高斯在每个像素处的密度
    """
    G = means.size(0)
    H, W, _ = points.shape
    flat = points.view(-1, 2)
    inv = torch.linalg.inv(covs)
    diff = flat[None, :, :] - means[:, None, :]
    d = torch.einsum("gpi,gij,gpj->gp", diff, inv, diff)
    density = torch.exp(-0.5 * d)
    return density.view(G, H, W)
```

`einsum` 对每个（高斯，像素）对算二次型 `diff^T Sigma^-1 diff`。

### 第 2 步：2D 泼溅光栅化器

从前到后 alpha 合成。2D 里深度没意义，所以我们用一个学习出来的逐高斯标量来排序。

```python
def rasterise_2d(means, covs, colours, opacities, depths, image_size):
    """
    means:     (G, 2)
    covs:      (G, 2, 2)
    colours:   (G, 3)
    opacities: (G,)     在 [0, 1]
    depths:    (G,)     用于排序的逐高斯标量
    image_size: (H, W)
    返回:   (H, W, 3) 渲染图像
    """
    H, W = image_size
    yy, xx = torch.meshgrid(
        torch.arange(H, dtype=torch.float32, device=means.device),
        torch.arange(W, dtype=torch.float32, device=means.device),
        indexing="ij",
    )
    points = torch.stack([xx, yy], dim=-1)

    densities = eval_2d_gaussian(means, covs, points)
    alphas = opacities[:, None, None] * densities
    alphas = alphas.clamp(0.0, 0.99)

    order = torch.argsort(depths)
    alphas = alphas[order]
    colours_sorted = colours[order]

    T = torch.ones(H, W, device=means.device)
    out = torch.zeros(H, W, 3, device=means.device)
    for i in range(means.size(0)):
        a = alphas[i]
        out += (T * a)[..., None] * colours_sorted[i][None, None, :]
        T = T * (1.0 - a)
    return out
```

不快——真实实现用基于 tile 的 CUDA kernel——但数学完全正确且完全可微。

### 第 3 步：一个可训练的 2D splat 场景

```python
class Splats2D(nn.Module):
    def __init__(self, num_splats=128, image_size=64, seed=0):
        super().__init__()
        g = torch.Generator().manual_seed(seed)
        H, W = image_size, image_size
        self.means = nn.Parameter(torch.rand(num_splats, 2, generator=g) * torch.tensor([W, H]))
        self.log_scale = nn.Parameter(torch.ones(num_splats, 2) * math.log(2.0))
        self.rot = nn.Parameter(torch.zeros(num_splats))  # 2D 里单个角度
        self.colour_logits = nn.Parameter(torch.randn(num_splats, 3, generator=g) * 0.5)
        self.opacity_logit = nn.Parameter(torch.zeros(num_splats))
        self.depth = nn.Parameter(torch.rand(num_splats, generator=g))

    def covs(self):
        s = torch.exp(self.log_scale)
        c, si = torch.cos(self.rot), torch.sin(self.rot)
        R = torch.stack([
            torch.stack([c, -si], dim=-1),
            torch.stack([si, c], dim=-1),
        ], dim=-2)
        S = torch.diag_embed(s ** 2)
        return R @ S @ R.transpose(-1, -2)

    def forward(self, image_size):
        covs = self.covs()
        colours = torch.sigmoid(self.colour_logits)
        opacities = torch.sigmoid(self.opacity_logit)
        return rasterise_2d(self.means, covs, colours, opacities, self.depth, image_size)
```

`log_scale`、`opacity_logit` 和 `colour_logits` 都是无约束参数，渲染时通过正确的激活映射。这是每个 3DGS 实现的标准模式。

### 第 4 步：用 2D 高斯拟合一张目标图像

```python
import math
import numpy as np

def make_target(size=64):
    yy, xx = np.meshgrid(np.arange(size), np.arange(size), indexing="ij")
    img = np.zeros((size, size, 3), dtype=np.float32)
    # 红色圆
    mask = (xx - 20) ** 2 + (yy - 20) ** 2 < 10 ** 2
    img[mask] = [1.0, 0.2, 0.2]
    # 蓝色方块
    mask = (np.abs(xx - 45) < 8) & (np.abs(yy - 40) < 8)
    img[mask] = [0.2, 0.3, 1.0]
    return torch.from_numpy(img)


target = make_target(64)
model = Splats2D(num_splats=64, image_size=64)
opt = torch.optim.Adam(model.parameters(), lr=0.05)

for step in range(200):
    pred = model((64, 64))
    loss = F.mse_loss(pred, target)
    opt.zero_grad(); loss.backward(); opt.step()
    if step % 40 == 0:
        print(f"step {step:3d}  mse {loss.item():.4f}")
```

在 200 步里，64 个高斯安顿进那两个形状。这就是整个点子——对显式几何原语做梯度下降。

### 第 5 步：从 2D 到 3D

3D 扩展保留同一个循环。新增的：

1. 逐高斯旋转是一个四元数，而不是单个角度。
2. 协方差是 `R S S^T R^T`，`R` 由四元数构建，`S = diag(exp(log_scale))`。
3. 投影 `(mu, Sigma) -> (mu', Sigma')` 用相机外参和透视投影在 `mu` 处的雅可比。
4. 颜色变成一个球谐展开；在观看方向上对它求值。
5. 深度排序来自实际的相机空间 z，而不是一个学出来的标量。

每个生产实现（`gsplat`、`inria/gaussian-splatting`、`nerfstudio`）在 GPU 上用基于 tile 的 CUDA kernel 干的正是这件事。

### 第 6 步：球谐求值

到 degree 3 的 SH 基每个通道有 16 项。求值：

```python
def eval_sh_degree_3(sh_coeffs, dirs):
    """
    sh_coeffs: (..., 16, 3)   最后一维是 RGB 通道
    dirs:      (..., 3)       单位向量
    返回:   (..., 3)
    """
    C0 = 0.282094791773878
    C1 = 0.488602511902920
    C2 = [1.092548430592079, 1.092548430592079,
          0.315391565252520, 1.092548430592079,
          0.546274215296039]
    x, y, z = dirs[..., 0], dirs[..., 1], dirs[..., 2]
    x2, y2, z2 = x * x, y * y, z * z
    xy, yz, xz = x * y, y * z, x * z

    result = C0 * sh_coeffs[..., 0, :]
    result = result - C1 * y[..., None] * sh_coeffs[..., 1, :]
    result = result + C1 * z[..., None] * sh_coeffs[..., 2, :]
    result = result - C1 * x[..., None] * sh_coeffs[..., 3, :]

    result = result + C2[0] * xy[..., None] * sh_coeffs[..., 4, :]
    result = result + C2[1] * yz[..., None] * sh_coeffs[..., 5, :]
    result = result + C2[2] * (2.0 * z2 - x2 - y2)[..., None] * sh_coeffs[..., 6, :]
    result = result + C2[3] * xz[..., None] * sh_coeffs[..., 7, :]
    result = result + C2[4] * (x2 - y2)[..., None] * sh_coeffs[..., 8, :]

    # 为简洁此处省略 degree 3 的项；完整 16 系数版本在代码文件里
    return result
```

学到的 `sh_coeffs` 为那个高斯存"每个方向上的颜色"。渲染时对着当前视角方向求值，得到一个 3 维 RGB。

## 实际使用

干真正的 3DGS 活，用 `gsplat`（Meta）或 `nerfstudio`：

```bash
pip install nerfstudio gsplat
ns-download-data example
ns-train splatfacto --data path/to/data
```

`splatfacto` 是 nerfstudio 的 3DGS 训练器。典型场景在 RTX 4090 上跑 10-30 分钟。

2026 年要紧的导出选项：

- `.ply` —— 原始高斯云（可移植，文件最大）。
- `.splat` —— PlayCanvas / SuperSplat 量化格式。
- glTF `KHR_gaussian_splatting` —— Khronos 标准，跨查看器可移植（2026 年 2 月 RC）。
- OpenUSD `UsdVolParticleField3DGaussianSplat` —— USD 原生，用于 NVIDIA Omniverse 和 Vision Pro 流水线。

做 4D / 动态场景，`4DGS` 和 `Deformable-3DGS` 用随时间变化的均值和不透明度扩展同一套机制。

## 拿去用

这一课产出：

- `outputs/prompt-3dgs-capture-planner.md` —— 一个 prompt，为给定场景类型规划一次采集会话（照片数量、相机路径、光照）。
- `outputs/skill-3dgs-export-router.md` —— 一个 skill，给定下游查看器或引擎，挑出正确的导出格式（`.ply` / `.splat` / glTF / USD）。

## 练习

1. **（简单）** 在另一张合成图像上跑上面的 2D splat 训练器。把 `num_splats` 在 `[16, 64, 256]` 间变化，各画 MSE 对 step 的图。找出收益递减的点。
2. **（中等）** 扩展 2D 光栅化器，支持通过一个 degree-2 谐波随标量"视角"变化的逐高斯 RGB 颜色。在一对目标图像上训练，验证模型重建出两张。
3. **（困难）** 克隆 `nerfstudio`，在你手头任意场景（书桌、植物、人脸、房间）的 20 张照片采集上训练 `splatfacto`。导出到 glTF `KHR_gaussian_splatting`，在一个查看器里打开（Three.js `GaussianSplats3D`、SuperSplat、Babylon.js V9）。报告训练时间、高斯数量和渲染 fps。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|----------------------|
| 3DGS | "高斯 splat" | 把场景显式表示为几百万个 3D 高斯，每个有位置、旋转、缩放、不透明度、SH 颜色 |
| 协方差 | "高斯的形状" | `Sigma = R S S^T R^T`；一个高斯的朝向和各向异性缩放 |
| Alpha 合成 | "从后到前混合" | 和 NeRF 体积渲染同一个方程，现在作用于一组显式稀疏集 |
| 致密化 | "克隆和分裂" | 在重建欠拟合处自适应添加新高斯 |
| 剪枝 | "删低不透明度的" | 移除训练中塌成近零不透明度的高斯 |
| 球谐 | "随视角的颜色" | 球面上的傅里叶基；把颜色存成观看方向的函数 |
| Splatfacto | "nerfstudio 的 3DGS" | 2026 年训练 3DGS 最容易的路径 |
| `KHR_gaussian_splatting` | "glTF 标准" | Khronos 2026 扩展，让 3DGS 跨查看器和引擎可移植 |

## 延伸阅读

- [3D Gaussian Splatting for Real-Time Radiance Field Rendering (Kerbl et al., SIGGRAPH 2023)](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/) —— 原始论文
- [gsplat (Meta/nerfstudio)](https://github.com/nerfstudio-project/gsplat) —— 生产质量的 CUDA 光栅化器
- [nerfstudio Splatfacto](https://docs.nerf.studio/nerfology/methods/splat.html) —— 参考训练配方
- [Khronos KHR_gaussian_splatting extension](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_gaussian_splatting/README.md) —— 2026 年的可移植格式
- [OpenUSD 26.03 release notes](https://openusd.org/release/) —— `UsdVolParticleField3DGaussianSplat` schema
- [THE FUTURE 3D State of Gaussian Splatting 2026](https://www.thefuture3d.com/blog-0/2026/4/4/state-of-gaussian-splatting-2026) —— 行业概览
