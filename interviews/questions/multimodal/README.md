# 多模态

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

视觉语言模型怎样把图像和文本结合起来，以及它们怎样训练。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [单张图像占用多少上下文 token](image-tokens-per-image.md) | 估算 | 1 基础 | 8 |
| [为什么 VLM 第一阶段只训练桥接层](train-only-the-projector.md) | 概念 | 1 基础 | 8 |
| [视觉语言模型的三个部分](vlm-three-parts.md) | 概念 | 1 基础 | 8 |
| [掩码被错误调换的图像描述解码器](cross-attention-mask-bug.md) | 代码阅读 | 2 应用 | 12 |
| [适配器投影还是统一共享图像词表](early-or-late-fusion.md) | 权衡 | 2 应用 | 12 |
| [单张生成图像在离散编码与耗时上的成本估算](emu3-generation-cost.md) | 估算 | 2 应用 | 10 |
| [哪个维度能真正提高多模态推理能力基准得分](llm-size-sets-ceiling.md) | 概念 | 2 应用 | 10 |
| [图像数量不限，每张图像输出固定数量的 token](perceiver-fixed-tokens.md) | 概念 | 2 应用 | 12 |
| [构建并测试连接两个冻结模型的投影层](projector-alignment-take-home.md) | 课后任务 | 2 应用 | 30 |
| [连接器选型：Query 桥接层还是 MLP](qformer-or-mlp.md) | 权衡 | 2 应用 | 12 |
| [通用 VLM 判断物品在哪个货架](spatial-reasoning-limit.md) | 权衡 | 2 应用 | 10 |
| [预测下一个尺度而非下一个 token](var-next-scale.md) | 概念 | 2 应用 | 10 |
| [早期融合模型在大规模训练下的发散问题](chameleon-diverged.md) | 排障 | 3 高级 | 12 |
| [门控开启过快的多模态微调退化](gate-opened-too-fast.md) | 排障 | 3 高级 | 12 |
| [详尽人工标注描述还是两百万条模型蒸馏描述](human-captions-beat-distillation.md) | 权衡 | 3 高级 | 12 |
| [单一 Transformer 生成图像的三种方式](show-o-parallel-decoding.md) | 权衡 | 3 高级 | 12 |
| [监控已部署 VLM 编造物体的问题](vlm-hallucination-kpi.md) | 设计 | 3 高级 | 15 |
| [为什么分词器限制了生成图像的质量上限](vq-tokenizer-ceiling.md) | 概念 | 3 高级 | 12 |
| [用三次训练缩小 VLM 基准差距](which-knob-first.md) | 权衡 | 3 高级 | 15 |
| [为端侧 UI agent 设计视觉语言模型](mobile-ui-agent-vlm.md) | 设计 | 4 架构与规模 | 20 |
| [选择一个能问答、编辑和生成的开放权重模型](pick-a-unified-model.md) | 设计 | 4 架构与规模 | 15 |
| [两个损失、一个 Transformer、一次梯度更新](transfusion-two-losses.md) | 概念 | 4 架构与规模 | 15 |

[全部主题](../../README.md)
