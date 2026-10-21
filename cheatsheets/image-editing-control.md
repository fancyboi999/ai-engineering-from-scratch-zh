---
id: image-editing-control
title: ControlNet、局部重绘与图像编辑
code: CI
subtitle: 使用 Diffusers 完成文生图、图生图、局部重绘、LoRA 与 ControlNet。参数、默认值和修正方法。
hue: 265
sources: phases/08-generative-ai/08-controlnet-lora-conditioning, phases/08-generative-ai/09-inpainting-outpainting-editing, phases/04-computer-vision/11-stable-diffusion
source_hash: 898f82f72b6415f0
---

## 进入 U-Net 的控制信号
type: architecture
from: phases/08-generative-ai/08-controlnet-lora-conditioning/docs/zh.md, phases/04-computer-vision/11-stable-diffusion/docs/zh.md

```arch
node | cond | 1,1 | 条件图像 | 深度、姿态、边缘 | client
node | cn | 2,1 | ControlNet | 克隆编码器，可训练 | model
node | zc | 3,1 | 零卷积 | 1×1，初始为零 | process
node | txt | 1,2 | Prompt | | client
node | te | 2,2 | 文本编码器 | CLIP-L 或 T5 | model
node | unet | 3,2 | 冻结的 SD U-Net | 对文本做交叉注意力 | gpu
node | ref | 1,3 | 参考图像 | | client
node | ip | 2,3 | IP-Adapter | CLIP 图像 token | model
node | lora | 3,3 | LoRA | 注意力中的 W + BA | store
edge | cond | cn |
edge | cn | zc | 特征
edge | zc | unet | 加入解码器
edge | txt | te |
edge | te | unet | 文本 token
edge | ref | ip |
edge | ip | unet | 图像 token
edge | lora | unet | 低秩增量
```

## 文生图
type: annotated-code
lang: python
from: phases/04-computer-vision/11-stable-diffusion/docs/zh.md, phases/04-computer-vision/11-stable-diffusion/code/main.py

```python
pipe = StableDiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    torch_dtype=torch.float16,            # 显存减半
).to("cuda")
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
image = pipe(
    prompt="<prompt>",
    guidance_scale=7.5,                   # CFG 系数 w，SD 默认值
    num_inference_steps=25,               # 相当于 DDIM 的 50 步
    generator=torch.Generator("cuda").manual_seed(42),
).images[0]
image.save("dog.png")
```

## 图生图、局部重绘与 LoRA
type: annotated-code
lang: python
from: phases/04-computer-vision/11-stable-diffusion/docs/zh.md, phases/08-generative-ai/08-controlnet-lora-conditioning/docs/zh.md

```python
out = img2img(prompt="<prompt>", image=init_image,
              strength=0.6, guidance_scale=7.5).images[0]     # 0.0 不变，1.0 重新生成
mask = Image.open("dog_mask.png").convert("L").resize((512, 512))
out = inpaint(prompt="<prompt>", image=image,
              mask_image=mask, guidance_scale=7.5).images[0]  # 白色像素重新生成
pipe.load_lora_weights("<repo>", weight_name="<file>")
pipe.fuse_lora(lora_scale=0.8)                                # 融入权重，无法直接切换
pipe.unfuse_lora()                                            # 加载另一适配器前调用
pipe.set_adapters([...], adapter_weights=[...])               # 按请求混合 LoRA
```

## 代码任务
type: task-table
from: phases/04-computer-vision/11-stable-diffusion/docs/zh.md, phases/04-computer-vision/11-stable-diffusion/code/main.py, phases/08-generative-ai/09-inpainting-outpainting-editing/docs/zh.md

| 任务 | 代码 |
|---|---|
| 安装依赖 | `pip install diffusers transformers accelerate` |
| 图生图 | `StableDiffusionImg2ImgPipeline` |
| 使用 SD 局部重绘 | `StableDiffusionInpaintPipeline` |
| 使用 Flux 局部重绘 | `FluxFillPipeline` |
| 随机采样器 | `EulerAncestralDiscreteScheduler` |
| 编码为潜变量 | `pipe.image_processor.preprocess(img)` |
| 复用已有潜变量 | 传入 `latents=...`，跳过一次 VAE 编码 |
| 缩放 VAE 潜变量 | `latent_dist.sample() * 0.18215` |

## 感知掩码的反向循环
type: flow
from: phases/08-generative-ai/09-inpainting-outpainting-editing/code/main.py, phases/08-generative-ai/09-inpainting-outpainting-editing/docs/zh.md

1. **开始**：对每个维度从 N(0, I) 采样 `x`。
2. **重新注入**：将干净源图像加噪至步骤 t，写入每个未遮罩维度。
3. **预测**：去噪器给出步骤 t 下 `x` 的 `eps_hat`。
4. **反向**：计算 DDPM 均值。t > 0 时加入噪声。
5. **重复**：从 t = T - 1 递减至 0。
6. **固定**：结束时将干净值复制到未遮罩维度。
7. **扩图**：反转掩码。训练目标不变。

## 公式与数字
type: concepts
from: phases/04-computer-vision/11-stable-diffusion/docs/zh.md, phases/08-generative-ai/08-controlnet-lora-conditioning/docs/zh.md, phases/08-generative-ai/09-inpainting-outpainting-editing/docs/zh.md

- **CFG**：$\epsilon = \epsilon_{\text{uncond}} + w \cdot (\epsilon_{\text{cond}} - \epsilon_{\text{uncond}})$
- **LoRA**：$W' = W + \alpha \cdot B A$，其中 $r \ll d$。新增参数为 $2 \cdot d \cdot r$，而非 $d^2$。
- **LoRA 大小**：$d=640$、$r=16$ 时为 20k 参数，而非 410k。
- **ControlNet 混合**：`features += weight_a * control_a(depth) + weight_b * control_b(pose)`
- **潜空间扩散**：从 3x512x512 变为 4x64x64，计算量减少 48x。
- **局部重绘 U-Net**：9 个输入通道。带噪潜变量 4、编码图像 4、掩码 1。
- **SDEdit t/T**：0.3 接近源图像，0.6 保留粗略结构，0.9 接近噪声。
- **零卷积**：ControlNet 初始为恒等映射。训练前不影响结果。

## 编辑方法对比
type: comparison
from: phases/08-generative-ai/09-inpainting-outpainting-editing/docs/zh.md, phases/04-computer-vision/11-stable-diffusion/docs/zh.md
span: 2

| 因素 | 局部重绘模型 | SDEdit 或图生图 | InstructPix2Pix | RePaint |
|---|---|---|---|---|
| 输入 | 图像、掩码、prompt | 图像、噪声级别、prompt | 图像与指令 | 图像与掩码 |
| 训练 | 9 通道 U-Net | 无 | 用三元组微调 | 无，使用无条件模型 |
| 保留内容 | 掩码外像素 | 粗略结构 | 输入的结构 | 掩码外像素 |
| 主要参数 | 掩码与 CFG | `t/T` 或 `strength` | 图像系数与文本系数 | 重采样步数 |
| 用途 | 移除物体、更换天空 | 某一区域的风格 | “变成日落” | 手头没有局部重绘模型 |

## 条件控制工具对比
type: comparison
from: phases/08-generative-ai/08-controlnet-lora-conditioning/docs/zh.md
span: 2

| 因素 | ControlNet | LoRA | IP-Adapter | DreamBooth |
|---|---|---|---|---|
| 控制内容 | 空间结构 | 风格、主体、概念 | 参考图像外观 | 单个主体 |
| 大小 | 70-360MB | 20-200MB | 20MB | 2-5GB |
| 机制 | 克隆编码器、零卷积跳连 | 注意力上的低秩增量 | 交叉注意力中的 CLIP 图像 token | 全量微调 |
| 适用场景 | 精确布局或构图 | 个性化或风格 | 文字难以描述外观 | 强身份保真，高计算预算 |

## 默认值
type: defaults
from: phases/04-computer-vision/11-stable-diffusion/docs/zh.md, phases/04-computer-vision/11-stable-diffusion/code/main.py, phases/08-generative-ai/08-controlnet-lora-conditioning/docs/zh.md, phases/08-generative-ai/09-inpainting-outpainting-editing/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `guidance_scale` | 7.5 | SD 默认 CFG 系数 |
| `num_inference_steps` | 25 | 使用 DPM-Solver++ |
| 图生图 `strength` | 0.6 | 风格迁移使用 0.5-0.7 |
| CFG 训练中 prompt 丢弃率 | 10% | 形成无条件分支 |
| VAE 缩放因子 | 0.18215 | SDXL 使用 0.13025 |
| LoRA 秩 `r` | 4-16 | 大幅微调使用 64-128 |
| ControlNet 权重总和 | 1.0 | 安全默认值 |
| 掩码膨胀像素数 | 8-16 | 隐藏接缝 |

## 故障排查
type: troubleshooting
from: phases/08-generative-ai/08-controlnet-lora-conditioning/docs/zh.md, phases/08-generative-ai/09-inpainting-outpainting-editing/docs/zh.md, phases/04-computer-vision/11-stable-diffusion/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 风格过重或输出损坏 | LoRA α 为 2 或 3 | 保持 α 不超过 1.5 |
| 姿态加深度控制过强 | 两个 ControlNet 权重均为 1.0 | 使权重总和为 1.0 |
| LoRA 无效果 | 将 SDXL LoRA 用于 SD 1.5 | 匹配基础模型 |
| 无法加载另一个 LoRA | `fuse_lora` 已融入权重 | 先调用 `pipe.unfuse_lora()` |
| 掩码边缘有明显接缝 | 直接重新注入 | 膨胀掩码或使用 9 通道模型 |
| 局部过饱和 | 小掩码使用高 CFG | 小幅编辑降低 CFG |
| 主体失去身份特征 | SDEdit `t/T` 从 0.5 增至 0.6 | 扫描参数并保存检查点 |
| 填充忽略场景 | prompt 只描述新增内容 | 描述整张图像 |

## 方法选型
type: tips
from: phases/08-generative-ai/08-controlnet-lora-conditioning/docs/zh.md, phases/08-generative-ai/09-inpainting-outpainting-editing/docs/zh.md, phases/04-computer-vision/11-stable-diffusion/docs/zh.md

- **ControlNet-Openpose + SDXL + 文本**：通过 prompt 指定具体姿态。
- **ControlNet-Scribble 或 ControlNet-Canny**：精确布局。
- **约 30 张精选图像、秩为 32 的 LoRA**：品牌美术风格。
- **SD-Inpaint 或 Flux-Fill**：移除小掩码下的物体。
- **先 SAM 掩码，再 SD-Inpaint**：替换背景。
- **InstructPix2Pix 或 Flux-Kontext**：无掩码指令编辑。
- **LCM-LoRA**：延迟低于 1s。

## 问答
type: qa
from: phases/08-generative-ai/08-controlnet-lora-conditioning/docs/zh.md, phases/08-generative-ai/09-inpainting-outpainting-editing/docs/zh.md, phases/04-computer-vision/11-stable-diffusion/docs/zh.md

- **为何 ControlNet 门控初始化为零？** 第 0 步的输出与基础模型完全相同。
- **合并 LoRA 还是热切换？** 热切换。合并快 3-5%，但固定了 α 与基础模型。
- **为何 strength 1.0 会忽略输入？** 它加入完整噪声，结果是完全重新生成。
- **为何用 9 通道模型而非重新注入？** 模型能看到掩码周围的上下文。
- **训练后可以换调度器吗？** 可以。调度器状态与 U-Net 权重解耦。
- **额外一个 ControlNet 成本多大？** 每个活跃 ControlNet 按约 1.5× 的单步成本预算。
