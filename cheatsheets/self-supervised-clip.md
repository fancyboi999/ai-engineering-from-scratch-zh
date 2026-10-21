---
id: self-supervised-clip
title: 自监督视觉、CLIP 与检索
code: SS
subtitle: 无标签预训练，对齐图像与文本，零样本分类，塑造并检索嵌入。使用 PyTorch。
hue: 285
sources: phases/04-computer-vision/17-self-supervised-vision, phases/04-computer-vision/18-open-vocab-clip, phases/04-computer-vision/20-image-retrieval-metric, phases/12-multimodal-ai/02-clip-contrastive-pretraining
source_hash: a560628e25862547
---

## 方法族与模型
type: concepts
from: phases/04-computer-vision/17-self-supervised-vision/docs/zh.md, phases/04-computer-vision/18-open-vocab-clip/docs/zh.md, phases/04-computer-vision/20-image-retrieval-metric/docs/zh.md, phases/12-multimodal-ai/02-clip-contrastive-pretraining/docs/zh.md

- **对比式（SimCLR、MoCo、CLIP）**：拉近两个视图，推远批次中的其余视图。
- **师生式（DINO、BYOL、iBOT）**：学生匹配 EMA 教师，无需负样本。
- **掩码式（MAE、BEiT、SimMIM）**：遮蔽 75% 图块，重建像素。
- **CLIP**：图像塔与文本塔共享一个空间。400M 网页配对，无标签。
- **SigLIP**：逐对 sigmoid，无需 all-gather，小批量训练更好。
- **线性探测**：冻结编码器，加一个线性层，衡量特征质量。
- **探测 top-1**：SimCLR 约 71%、DINO 约 77%、MAE 约 76%、DINOv2 约 86%。
- **类别或实例检索**：现成嵌入适合类别，实例需要度量学习。

## CLIP 双塔
type: architecture
from: phases/04-computer-vision/18-open-vocab-clip/docs/zh.md, phases/12-multimodal-ai/02-clip-contrastive-pretraining/docs/zh.md

```arch
node | img | 1,1 | 图像 | N 个一批 | client
node | ienc | 2,1 | 图像编码器 | ViT 或 ResNet | model
node | inorm | 3,1 | L2 归一化 | (N, D)
node | txt | 1,2 | 描述 | N 条描述 | client
node | tenc | 2,2 | 文本编码器 | transformer | model
node | tnorm | 3,2 | L2 归一化 | (N, D)
node | sim | 4,1 | 相似度 S | N x N，除以 tau
node | loss | 4,2 | 对称交叉熵 | (i2t + t2i) / 2
edge | img | ienc |
edge | ienc | inorm |
edge | txt | tenc |
edge | tenc | tnorm |
edge | inorm | sim |
edge | tnorm | sim |
edge | sim | loss | 对角线目标
```

## 公式
type: concepts
from: phases/04-computer-vision/17-self-supervised-vision/docs/zh.md, phases/04-computer-vision/18-open-vocab-clip/docs/zh.md, phases/04-computer-vision/20-image-retrieval-metric/docs/zh.md, phases/12-multimodal-ai/02-clip-contrastive-pretraining/docs/zh.md

- **InfoNCE**: $-\log \frac{\exp(\mathrm{sim}(z_i, z_j)/\tau)}{\sum_{k \ne i} \exp(\mathrm{sim}(z_i, z_k)/\tau)}$
- **CLIP 矩阵**：$S_{ij} = \cos(f(x_i), g(y_j)) / \tau$。形状为 N x N。
- **CLIP 损失**：按行与按列的交叉熵相加后除以 2。
- **SigLIP**：每对计算 $\log(1 + \exp(-y_{ij} \, \mathrm{sim}_{ij}))$，其中 $y_{ij} = \pm 1$。
- **DINO EMA**: $\theta_t \leftarrow m \, \theta_t + (1 - m) \, \theta_s$
- **三元组**：$\max(0, \lVert f(a) - f(p) \rVert^2 - \lVert f(a) - f(n) \rVert^2 + \mathrm{margin})$
- **余弦与 L2**：对单位向量，$\lVert a - b \rVert^2 = 2 - 2 \cos(a, b)$。
- **Recall@K**：前 K 项中至少有一个正确匹配的查询比例。

## InfoNCE 与 MAE 掩码
type: annotated-code
lang: python
from: phases/04-computer-vision/17-self-supervised-vision/docs/zh.md, phases/04-computer-vision/17-self-supervised-vision/code/main.py

```python
def info_nce(z1, z2, tau=0.1):                   # z1、z2 已做 L2 归一化
    N, D = z1.shape
    z = torch.cat([z1, z2], dim=0)               # (2N, D)
    sim = z @ z.T / tau                          # (2N, 2N)
    mask = torch.eye(2 * N, dtype=torch.bool, device=z.device)
    sim = sim.masked_fill(mask, float("-inf"))   # 排除自身匹配
    targets = torch.cat([torch.arange(N, 2 * N), torch.arange(0, N)]).to(z.device)
    return F.cross_entropy(sim, targets)
num_patches = 196
visible, masked = random_mask_indices(num_patches, mask_ratio=0.75)  # 保留 25%
```

## CLIP 损失与零样本
type: annotated-code
lang: python
from: phases/04-computer-vision/18-open-vocab-clip/docs/zh.md, phases/04-computer-vision/18-open-vocab-clip/code/main.py

```python
sim = logit_scale * image_emb @ text_emb.T       # (N, N)
targets = torch.arange(N, device=sim.device)     # 对角线为匹配
l_i = F.cross_entropy(sim, targets)              # 图像到文本
l_t = F.cross_entropy(sim.T, targets)            # 文本到图像
loss = (l_i + l_t) / 2                           # 随机初始化时接近 log(N)
i = F.normalize(model.image_proj(image_feats), dim=-1)
t = F.normalize(model.text_proj(class_text_feats), dim=-1)
pred = (i @ t.T).argmax(dim=-1)                  # 每张图像一个类别
```

## 三元组损失与 recall@K
type: annotated-code
lang: python
from: phases/04-computer-vision/20-image-retrieval-metric/docs/zh.md, phases/04-computer-vision/20-image-retrieval-metric/code/main.py

```python
def triplet_loss(anchor, positive, negative, margin=0.2):
    d_ap = F.pairwise_distance(anchor, positive, p=2)
    d_an = F.pairwise_distance(anchor, negative, p=2)
    return F.relu(d_ap - d_an + margin).mean()
pos_idx, neg_idx = semi_hard_negatives(emb, y)   # 最难正样本、半难负样本
loss = triplet_loss(emb, emb[pos_idx], emb[neg_idx])
sim = query_emb @ gallery_emb.T                  # 单位向量上的余弦
_, top_k = sim.topk(k, dim=-1)
matches = (gallery_labels[top_k] == query_labels[:, None]).any(dim=-1)
matches.float().mean().item()                    # recall@K
```

## 零样本分类
type: flow
from: phases/04-computer-vision/18-open-vocab-clip/docs/zh.md, phases/12-multimodal-ai/02-clip-contrastive-pretraining/outputs/skill-clip-zero-shot.md

1. **prompt**：为每个类别写 "a photo of a {class}"。
2. **集成**：每类多个模板取均值，top-1 可增加 1-3%。
3. **文本塔**：编码 prompt。`T` 的形状为 (C, d)。
4. **图像塔**：编码图像。`I` 的形状为 (1, d)。
5. **归一化**：让两侧长度均为单位长度。
6. **评分**：`I @ T.T` 得到形状 (1, C)。
7. **预测**：argmax 给出类别。top-1 分数低于 0.2 时警告。

## 代码任务
type: task-table
span: 2
from: phases/04-computer-vision/17-self-supervised-vision/code/main.py, phases/04-computer-vision/18-open-vocab-clip/code/main.py, phases/04-computer-vision/20-image-retrieval-metric/code/main.py, phases/12-multimodal-ai/02-clip-contrastive-pretraining/code/main.py

| 任务 | 代码 |
|---|---|
| 两视图的对比损失 | `info_nce(z1, z2, tau=0.1)` |
| 带中心化的 DINO 教师 | `DinoHead().teacher(x, temp=0.04)` |
| CLIP 对称损失 | `clip_loss(i, t, logit_scale)` |
| 零样本标签 | `zero_shot_classify(model, image_feats, class_text_feats, class_names)` |
| 挖掘半难负样本 | `semi_hard_negatives(emb, labels, margin=0.2)` |
| K 项召回率 | `recall_at_k(query_emb, gallery_emb, query_labels, gallery_labels, k=1)` |
| 纯 Python 对称 InfoNCE | `infonce_loss(S)` |
| SigLIP 逐对损失 | `sigmoid_loss(S, bias=0.0)` |

## 默认值与数值
type: defaults
from: phases/04-computer-vision/17-self-supervised-vision/docs/zh.md, phases/04-computer-vision/17-self-supervised-vision/code/main.py, phases/04-computer-vision/18-open-vocab-clip/docs/zh.md, phases/04-computer-vision/20-image-retrieval-metric/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| SimCLR `tau` | 0.1 | 越低越尖锐，需要更多负样本 |
| CLIP `tau` 初始值 | 0.07 | 可学习。`logit_scale` 从 ln(1/0.07) 开始 |
| SimCLR 批量 | 512-8192 | 每个正样本对应大量负样本 |
| MAE `mask_ratio` | 0.75 | BERT 遮蔽 15% token |
| MAE 解码器 | 8 层、512 维 | 编码器只读取可见图块 |
| DINO EMA m | 0.996 | 教师是学生的 EMA |
| DINO 教师 `temp` | 0.04 | 学生 `temp` 为 0.1 |
| 三元组 `margin` | 0.2 | 半难样本挖掘使用同一间隔 |

## 选择 FAISS 索引
type: command-table
from: phases/04-computer-vision/20-image-retrieval-metric/docs/zh.md

| 命令 | 作用 |
|---|---|
| `IndexFlatIP` | 精确内积。100k 向量上的余弦 |
| `IndexFlatL2` | 精确 L2，暴力搜索，无需训练 |
| `IndexIVFFlat` | K 个单元，搜索最近几个。需训练，适合 10M 向量 |
| `IndexHNSW` | 图索引。大量查询时最快，索引较大 |
| `IndexIVFPQ` | 添加乘积量化，适合 100M+ 向量 |
| DINOv2 + FAISS | 通用视觉检索，开箱即用 |
| CLIP + FAISS | 查询为文本 |
| 微调 DINOv2 + FAISS | 实例检索、重识别、电商 |

## 故障排查
type: troubleshooting
from: phases/04-computer-vision/17-self-supervised-vision/docs/zh.md, phases/04-computer-vision/20-image-retrieval-metric/docs/zh.md, phases/12-multimodal-ai/02-clip-contrastive-pretraining/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 批量 32 时 InfoNCE 失效 | 负样本太少 | 用 512-8192 批量或动量队列 |
| DINO 输出常量向量 | 表征坍塌 | 对教师中心化并锐化 |
| 掩码任务太容易 | 掩码比例过低 | 遮蔽 75% 图块 |
| recall@10 高，recall@1 低 | 排序噪声大 | 延长微调或重排 |
| 最近邻发生变化 | 混用余弦与 L2 | 匹配嵌入训练时的度量 |
| 实例搜索遗漏 | 使用现成特征 | 用度量学习微调 |
| 三元组损失接近 0 | 三元组太简单 | 挖掘半难样本 |
| 多 GPU 上 Softmax 损失缓慢 | 嵌入 all-gather | 使用 sigmoid 损失 |

## 问答
type: qa
from: phases/04-computer-vision/17-self-supervised-vision/docs/zh.md, phases/04-computer-vision/18-open-vocab-clip/docs/zh.md, phases/12-multimodal-ai/02-clip-contrastive-pretraining/docs/zh.md

- **MAE 为何遮蔽 75%，BERT 只遮蔽 15%？** 图块熵低，相邻图块能透露像素。
- **随机配对的 InfoNCE 是多少？** 约 log(2N - 1)，16 对时为 3.4。
- **CLIP 随机初始化时损失多少？** 接近 log(N)。N = 8 时为 2.08。
- **线性探测还是微调？** 微调增加 2-5 个百分点，探测只衡量特征。
- **DINOv2 嵌入是什么？** `outputs.last_hidden_state[:, 0]`，即 768 维 CLS token。
- **零样本、探测还是微调？** 域内探测优于零样本。微调可能损害零样本迁移。
