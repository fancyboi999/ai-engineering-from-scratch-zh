---
id: cross-attention-mask-bug
title: 掩码被错误调换的图像描述解码器
card: multimodal
kind: code-reading
level: 2
roles: [applied-ai-engineer]
rounds: [coding, debugging]
tags: [cross-attention, causal-mask, kv-cache, code-reading]
minutes: 12
lessons: [phases/19-capstone-projects/61-cross-attention-fusion, phases/12-multimodal-ai/04-flamingo-gated-cross-attention]
manuals: []
practice: []
cheatsheet: [vlm-from-scratch]
related: [multimodal/perceiver-fixed-tokens]
updated: 2026-11-03
---

一位队友实现的图文解码器在训练时指标看似良好，但在推理生成图像描述（caption）时，从第二个 token 开始就生成错误；且用包含 197 个 token 的图像测试时，程序因张量形状不匹配（shape error）直接崩溃。请阅读其解码块与解码循环代码并找出症结所在。

```python
def causal_mask(n):
    return torch.tril(torch.ones(n, n, dtype=torch.bool))


class DecoderBlock(nn.Module):
    def forward(self, text, image, mask):
        text = text + self.self_attn(self.ln1(text), mask=None)
        text = text + self.cross_attn(self.ln2(text), image, mask=mask)
        text = text + self.ffn(self.ln3(text))
        return text


def generate(model, image, prompt_ids, steps):
    ids = prompt_ids
    for _ in range(steps):
        memory = model.encode_image(image)
        mask = causal_mask(ids.shape[1])
        logits = model.decode(ids, memory, mask)
        ids = torch.cat([ids, logits[:, -1].argmax(-1, keepdim=True)], dim=1)
    return ids
```

## Short answer

两个掩码（mask）被错误调换了。作用于文本的自注意力层（self-attention）没有传入任何掩码，导致训练期间每个位置都能看到未来的 token，模型退化为走捷径抄袭下一个 token 而非学习自回归预测，一旦进入真正的自回归推理便立即崩溃。而交叉注意力层（cross-attention）却被错误传入了针对文本长度的下三角因果掩码，由于交叉注意力的得分矩阵形状是“文本长度乘以图像 token 数”，方阵掩码无法广播，从而在 197 个图像 token 时引发形状崩溃。此外，解码循环每一步都重新编码图像；应只编码一次，缓存图像的 key 和 value 并复用。

## Full answer

### 掩码规范与几何维度

| 注意力类型 | Query 来源 | Key 来源 | 掩码规范 |
|---|---|---|---|
| 文本自注意力（Self-attention） | 文本，长度 Nt | 文本，长度 Nt | 因果下三角掩码，形状为 Nt × Nt |
| 图像交叉注意力（Cross-attention） | 文本，长度 Nt | 图像，长度 Nv | 无需掩码 |

自回归文本解码严禁偷窥未来时间步。而图像在文本生成之前就已经被完全观测，图像内部的 patch 之间也不存在时间因果顺序，因此文本序列中的任意位置都应当且可以关注图像的每一个 patch。

### Bug 1：自注意力缺少因果掩码

传入 `mask=None` 会导致位置 i 能够直接看到位置 i 之后的所有 token。在 Teacher Forcing 训练模式下，位置 i 的预测目标正是位于输入序列 i+1 处的真实 token，此时未加掩码的注意力层直接把目标偷看过来，损失迅速骤降，模型实际上学会了查表而非预测。但在自回归推理阶段，未来的 token 根本不存在，因此从第二个 token 开始生成质量崩溃，这正是现象描述中指出的问题。

### Bug 2：将文本因果掩码强加于交叉注意力

交叉注意力内部的注意力得分矩阵维度是 Nt × Nv。尺寸为 Nt × Nt 的因果掩码仅在图像 token 数 Nv 恰好等于文本长度 Nt 时碰巧不会报错（但此时也会错误屏蔽掉早前文本对图像后半部分的视野）。当图像特征包含 197 个 token 而文本长度较短时，两个张量维度无法广播，前向传播直接抛出 Shape Error。课程项目特意设计了张量形状校验函数，确保在此类失误发生时能够给出明确报错，而不是污染整个训练曲线。

### 观察 3：缺少 KV cache

解码期间图像不变。每一步都重新编码图像、重新投影 key 和 value，会让重型编码器的成本乘以生成 token 数。只编码一次、投影一次，把 key 和 value 缓存下来，供每一步复用。综合项目用测试检查缓存与非缓存路径的 logits 是否一致。

### 修复后的 DecoderBlock

```python
def forward(self, text, image_kv, text_mask):
    text = text + self.self_attn(self.ln1(text), mask=text_mask)
    text = text + self.cross_attn(self.ln2(text), image_kv, mask=None)
    text = text + self.ffn(self.ln3(text))
    return text
```

## Follow-ups

- **Level 2:** 为什么存在第一个 bug 时训练损失看起来依然很漂亮？ Expected: Teacher forcing 使得目标 token 直接存在于下一个输入位置，未加掩码的注意力可以直接去读取它；此时损失衡量的是偷看查表能力，而非真正的自回归预测能力。
- **Level 2:** 交叉注意力在什么时候才真正需要掩码？ Expected: 当多张图像与多个文本片段相互交错出现时，特定文本片段仅允许查看位于其之前的图像；而在单图单段 caption 生成时无需掩码。
- **Level 3:** Flamingo 架构在此类 block 中引入的门控机制（Gate）起到了什么作用？ Expected: 在交叉注意力残差分支上经过双曲正切（tanh）乘以一个初始为零的可学习标量，使冻结的语言模型在初始化时保持文本行为，再逐步融合图像。
- **Level 3:** 如何测试缓存路径？ Expected: 用相同的 prompt 分别运行缓存和非缓存路径，断言 logits 在浮点容差范围内匹配；综合项目提供了这项测试。

## Wrong answers

- "为安全起见，在两处注意力层上都加上因果掩码。" 交叉注意力矩阵维度是文本乘图像，方形文本掩码要么直接引发维度报错，要么错误遮蔽掉部分图像区域；图像交叉注意力无需掩码。
- "生成的文本错乱是因为图像编码器表征能力太弱。" 第一步正确而从第二步起完全崩坏，是典型的训练期未来信息泄露特征；原因是掩码错误。
- "每步都重新编码图像无所谓，编码器开销很小。" 视觉编码器通常是单次前向中计算量最大的部件，且图像内容完全静止；缓存让图像描述生成更快。

## Taught in

[交叉注意力融合实战](../../../phases/19-capstone-projects/61-cross-attention-fusion/)定义了掩码形状和 KV cache，[Flamingo 课程](../../../phases/12-multimodal-ai/04-flamingo-gated-cross-attention/)补充了门控机制与图文交错掩码。
