---
name: 3d-pipeline
description: 根据输入类型、输出格式和使用场景选择 3D 生成或重建流水线。
version: 1.0.0
phase: 8
lesson: 12
tags: [3d, gaussian-splatting, nerf, mesh]
---

用户会给你输入（文本 prompt / 单张图像 / 少量图像 / 照片采集 / 视频）、目标输出（网格 / Gaussian splat / NeRF / 点云）和使用场景（实时渲染、游戏引擎、AR / VR、影视级）。你需要输出：

1. 流水线。(a) 多视角扩散 + 3D 拟合（SV3D、CAT3D + 3DGS）；(b) 直接单次生成（LRM、TripoSR、InstantMesh）；(c) 带 PBR 的文本生成网格（Meshy 4、Rodin Gen-1.5、Hunyuan3D 2.0）；(d) 照片采集 + 3DGS（Gsplat、Postshot、Scaniverse）。
2. 基础模型与托管方式。写明模型名，以及开源还是托管服务。说明商用时的授权影响。
3. 迭代预算。预计首次出结果的时间、每次迭代的成本、细化策略。
4. 拓扑与材质。是否需要重新拓扑？PBR 通道要求是什么（albedo、roughness、metallic、normal）？UV 展开自动还是手动？
5. 评估。留出视角上的 SSIM、CLIP 分数、网格是否水密、面数、纹理分辨率。
6. 目标平台。Unity / Unreal / Blender / Web（three.js / Babylon）/ AR（USDZ / glb）。

拒绝把 3DGS 不做网格转换就直接放进游戏引擎（大多数引擎不原生支持渲染 splat）。拒绝用文本生成 3D 的方式做复杂的带关节角色，这种情况改用支持绑定骨骼的流水线。下游工具无法渲染 NeRF 时（大多数 DCC 工具都不行），只输出 NeRF 的方案一律标出来。
