---
name: skill-3dgs-export-router
description: 根据下游查看器或引擎，选择合适的 3DGS 导出格式（.ply / .splat / glTF KHR_gaussian_splatting / USD）
version: 1.0.0
phase: 4
lesson: 22
tags: [3d-gaussian-splatting, export, glTF, OpenUSD, pipeline]
---

# 3DGS 导出路由器

把下游目标映射到正确的 3DGS 文件格式。省下排查"加载不出来"的好几个小时。

## 何时使用

- 训练完一个 3DGS 场景之后、交给内容管线之前。
- 在研究级格式（.ply）和生产级格式（glTF / USD）之间做选择。
- 管线交接：拍摄团队 -> 3DGS 工程师 -> 游戏设计师 / VFX 艺术家 / Web 开发者。

## 输入

- `target_engine`：unreal | unity | omniverse | blender | vision_pro | three_js | babylon_js | cesium | playcanvas | supersplat
- `priority`：portability | file_size | quality_preservation
- `include_sh_degree`：0 | 1 | 2 | 3

## 格式决策

| 目标 | 推荐格式 | 原因 |
|--------|--------------------|-----|
| Unreal Engine（虚拟制片） | Volinga 插件或 glTF KHR_gaussian_splatting | Unreal SDK 原生路径 |
| Unity（XR / 游戏） | .ply，通过 Aras-P Unity-GaussianSplatting 插件 | 社区标准的 Unity 管线 |
| NVIDIA Omniverse、Pixar 工具 | OpenUSD 26.03（UsdVolParticleField3DGaussianSplat） | 原生 USD prim 类型 |
| Apple Vision Pro | OpenUSD 26.03 | visionOS 2.x 原生支持 |
| Blender | .ply + KIRI Engine 插件 | 社区插件可直接读取原始 splat |
| Three.js Web 查看器 | glTF KHR_gaussian_splatting 或 .splat | 浏览器标准，可配合 `GaussianSplats3D` 使用 |
| Babylon.js V9+ | glTF KHR_gaussian_splatting | V9 加入了原生支持 |
| Cesium（CesiumJS 1.139+、Cesium for Unreal 2.23+） | glTF KHR_gaussian_splatting | 已正式支持 |
| PlayCanvas | .splat | PlayCanvas 原生量化格式 |
| SuperSplat（编辑器） | .ply 或 .splat | 支持导入和导出 |

## 量化取舍

- `.ply` 全精度：文件最大，无损，任何查看器都能用。
- `.splat`：小 4-8 倍，SH3 系数有轻微质量损失，是 PlayCanvas 生态的标准。
- glTF KHR：可通过 EXT_meshopt_compression 配置压缩；体积最小，兼容性最高。
- USD：经 USDZ 打包压缩；在 Apple 管线中体积最小。

## 输出报告

```
[export plan]
  target:         <engine>
  format:         <name>
  sh degree:      <0|1|2|3>
  compression:    <none|meshopt|quantisation|usdz>
  expected size:  <MB>
  compatible with: <list of viewers>

[pipeline]
  1. source: <.ply from training>
  2. optional: SuperSplat cleanup pass
  3. convert: <tool + CLI or API call>
  4. package: <.gltf / .glb / .usd / .usdz / .splat / .ply>
  5. validate: <viewer sanity check>
```

## 规则

- 绝不悄悄去掉 SH3 系数：这会明显改变镜面反射效果。
- 如果 `priority == file_size`，推荐 `.splat` 或带 meshopt 的 glTF；同时提醒质量损失。
- 2026 年在 Apple 平台上，优先用 USD / USDZ 而不是 glTF；USDZ 在 visionOS 上有一等支持。
- 如果目标查看器的 3DGS 支持早于标准（2026 年 2 月之前），推荐 `.ply` 配合查看器自己的加载器；它还认不出 Khronos 标准的 glTF。
- 交付前一律至少在一个查看器里验证导出文件；量化过程中会发生静默损坏。
