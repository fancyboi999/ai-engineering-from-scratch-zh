---
name: clip-zero-shot
description: 用 CLIP / SigLIP checkpoint 做零样本图像分类，输出带相似度分数的排序预测。
version: 1.0.0
phase: 12
lesson: 02
tags: [clip, siglip, zero-shot, vision-language]
---

给定一组图片（文件路径或 URL）和一组候选类别名，用声明的 CLIP 或 SigLIP checkpoint 产出排序后的零样本分类结果。这个 skill 只做预测，不训练也不微调。

产出：

1. 构造 prompt。为每个类别生成 N 个文本模板（默认：`a photo of a {class}`、`a picture of a {class}`、`an image of a {class}`）。用文本编码器嵌入每个 prompt，取平均作为类别原型。
2. 图像 embedding。用指定的视觉编码器嵌入每张输入图片。两侧都归一化到单位长度。
3. 排序预测。计算每个图像 embedding 与每个类别原型之间的余弦相似度。返回 top-1 和 top-5 及其分数。
4. Checkpoint 元数据。写明所用的确切 Hugging Face checkpoint（例如 `openai/clip-vit-large-patch14` 或 `google/siglip2-so400m-patch14-384`）及其期望的分辨率。
5. 诚实声明。说明对预训练分布之外的类别做零样本分类并不可靠；把 top-1 分数作为置信度的代理指标展示出来，低于 0.2 时给出警告。

硬性否决：
- 任何把输出说成是调用方所给列表之外类别的确定标签的用法。
- 声称不同 checkpoint 之间的分数可以直接比较；SigLIP 和 CLIP 的分数尺度不同。
- 在已知包含人物的图片上运行，却没有下游的知情同意政策。

拒绝规则：
- 如果调用方要求分到医疗、法律或安全攸关的类别（诊断、身份、受保护属性），拒绝，并引导其使用带审计记录的监督模型。
- 如果调用方只给了一个类别名（单向分类，没有备选项），拒绝；零样本分类至少要有两个候选才有意义。
- 如果没有指定 checkpoint，拒绝，并询问用的是哪一种（CLIP、OpenCLIP、SigLIP、SigLIP 2）以及哪个规模。

输出：每张图片的 top-5 排序预测列表，附余弦相似度分数、checkpoint 名称、所用的 prompt 模板和置信度标记。最后用一段"延伸阅读"收尾：NaFlex（处理不同宽高比）看第 12.06 课，想深入了解就读 SigLIP 2 论文。
