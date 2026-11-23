---
name: skill-recall-at-k-runner
description: 编写一套干净的 recall@K 评估工具，划分 train/val/gallery 并明确数据约定
version: 1.0.0
phase: 4
lesson: 20
tags: [retrieval, evaluation, recall, faiss]
---

# Recall@K 运行器

把查询图像、图库图像和标签，变成一个可复现的 recall@K 数值。

## 何时使用

- 为新的骨干网络做第一次检索基准测试。
- 在微调的各个 epoch 之间跟踪嵌入质量。
- 在同一数据集上比较两套检索系统。

## 输入

- `query_images`：路径列表。
- `gallery_images`：路径列表（可能与查询集重叠，也可能不重叠）。
- `query_labels`、`gallery_labels`：类别 ID 或实例 ID。
- `encoder_fn`：可调用对象 `image -> embedding`（预先计算或实时计算）。
- `ks`：形如 `[1, 5, 10]` 的列表。

## 步骤

1. 每张图库图像只编码一次，保存为 numpy 数组。
2. 编码每张查询图像。
3. 对两组嵌入都做 L2 归一化。
4. 对每个查询，计算它与所有图库条目的相似度。
5. 降序排列，取前 max(ks) 个。
6. 对每个 K，检查前 K 个图库条目中是否有与查询标签相同的。
7. 报告 `recall@K = fraction of queries that had at least one correct neighbour in top K`。

## 输出模板

```python
import numpy as np
from sklearn.preprocessing import normalize

def encode_all(images, encoder_fn, batch=32):
    out = []
    for i in range(0, len(images), batch):
        embs = encoder_fn(images[i:i + batch])
        out.append(embs)
    return np.concatenate(out)


def recall_at_k(query_emb, gallery_emb, q_labels, g_labels,
                ks=(1, 5, 10), query_ids=None, gallery_ids=None):
    if len(query_emb) == 0 or len(gallery_emb) == 0:
        return {f"recall@{k}": 0.0 for k in ks}

    g_label_set = set(g_labels.tolist())
    keep = np.array([lbl in g_label_set for lbl in q_labels])
    if not keep.any():
        return {f"recall@{k}": 0.0 for k in ks}

    q_emb_f = query_emb[keep]
    q_lab_f = q_labels[keep]
    q_id_f = query_ids[keep] if query_ids is not None else None

    q = normalize(q_emb_f)
    g = normalize(gallery_emb)
    sims = q @ g.T

    if q_id_f is not None and gallery_ids is not None:
        self_mask = q_id_f[:, None] == gallery_ids[None, :]
        sims = np.where(self_mask, -np.inf, sims)

    top_k_max = min(max(ks), g.shape[0])
    if top_k_max <= 0:
        return {f"recall@{k}": 0.0 for k in ks}

    top = np.argpartition(-sims, top_k_max - 1, axis=1)[:, :top_k_max]
    sorted_top = np.take_along_axis(
        top, np.argsort(-sims[np.arange(len(q))[:, None], top], axis=1), axis=1
    )
    out = {}
    for k in ks:
        k_eff = min(k, top_k_max)
        hits = np.any(g_labels[sorted_top[:, :k_eff]] == q_lab_f[:, None], axis=1)
        out[f"recall@{k}"] = float(hits.mean())
    return out


def evaluate(query_images, query_labels, gallery_images, gallery_labels, encoder_fn, ks=(1, 5, 10)):
    q_emb = encode_all(query_images, encoder_fn)
    g_emb = encode_all(gallery_images, encoder_fn)
    return recall_at_k(q_emb, g_emb, np.array(query_labels), np.array(gallery_labels), ks)
```

## 报告

```
[evaluation]
  num queries:   <int>
  num gallery:   <int>
  embedding_dim: <int>

[recall]
  recall@1:  <float>
  recall@5:  <float>
  recall@10: <float>
```

## 规则

- 计算相似度前先归一化嵌入；在归一化向量上，FAISS IndexFlatIP 就等于余弦相似度。
- 如果某个查询的真实标签在图库中不存在，就把它排除；否则 recall 天然达不到 1。
- 如果查询集和图库重叠，要把查询本身从它自己的前 K 结果中排除，否则你测的是自相似度，不是检索。
- 当 `num_queries > 10,000` 时，对相似度矩阵乘法分批计算，避免 OOM。
