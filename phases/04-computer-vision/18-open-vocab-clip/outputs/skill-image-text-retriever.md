---
name: skill-image-text-retriever
description: 使用任意 CLIP 检查点构建图像嵌入索引，支持以文本或图像查询。
version: 1.0.0
phase: 4
lesson: 18
tags: [clip, retrieval, faiss, zero-shot]
---

# 图文检索器

用 CLIP 嵌入把一个图像文件夹变成可搜索的索引。

## 何时使用

- 在内部图库上搭建零样本图像搜索。
- 按嵌入距离对几乎相同的图像去重。
- 没有标注数据集，也想快速做一个"查找相似"组件。

## 输入

- `image_folder`：图像文件所在目录。
- `clip_model`：HuggingFace id，例如 `openai/clip-vit-base-patch32` 或 `google/siglip-base-patch16-224`。
- `index_type`：flat | IVF | HNSW。
- `embedding_dim`：从模型推断。

## 步骤

1. 加载 CLIP 模型和预处理器。
2. 分批编码文件夹里的每张图像。把嵌入保存为 (N, D) 的 float32 数组，外加文件名列表。
3. 在嵌入上构建 FAISS 索引。对 L2 归一化后的向量使用内积，即得到余弦相似度。
4. 暴露两个查询接口：
   - `search_by_text(text, k)`：嵌入文本，然后搜索。
   - `search_by_image(image_path, k)`：嵌入图像，然后搜索。

## 输出模板

```python
import os
import glob
import numpy as np
import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor
import faiss


class ImageTextRetriever:
    def __init__(self, model_name="openai/clip-vit-base-patch32"):
        self.model = CLIPModel.from_pretrained(model_name).eval()
        self.processor = CLIPProcessor.from_pretrained(model_name)
        self.dim = self.model.config.projection_dim
        self.index = None
        self.filenames = []

    @torch.no_grad()
    def _encode_images(self, paths, batch=16):
        embs = []
        for i in range(0, len(paths), batch):
            imgs = [Image.open(p).convert("RGB") for p in paths[i:i + batch]]
            inputs = self.processor(images=imgs, return_tensors="pt")
            out = self.model.get_image_features(**inputs)
            out = out / out.norm(dim=-1, keepdim=True)
            embs.append(out.cpu().numpy())
        return np.concatenate(embs).astype(np.float32)

    @torch.no_grad()
    def _encode_text(self, texts):
        inputs = self.processor(text=texts, return_tensors="pt", padding=True)
        out = self.model.get_text_features(**inputs)
        out = out / out.norm(dim=-1, keepdim=True)
        return out.cpu().numpy().astype(np.float32)

    def build_index(self, folder, index_type="flat"):
        exts = ("*.jpg", "*.jpeg", "*.png", "*.webp", "*.bmp")
        files = []
        for ext in exts:
            files.extend(glob.glob(os.path.join(folder, ext)))
        self.filenames = sorted(files)
        embs = self._encode_images(self.filenames)
        if index_type == "IVF":
            quantizer = faiss.IndexFlatIP(self.dim)
            nlist = min(256, max(4, len(embs) // 32))
            self.index = faiss.IndexIVFFlat(quantizer, self.dim, nlist)
            self.index.train(embs)
        elif index_type == "HNSW":
            self.index = faiss.IndexHNSWFlat(self.dim, 32, faiss.METRIC_INNER_PRODUCT)
        else:
            self.index = faiss.IndexFlatIP(self.dim)
        self.index.add(embs)

    def search_by_text(self, text, k=5):
        q = self._encode_text([text])
        dist, idx = self.index.search(q, k)
        return [(self.filenames[i], float(d)) for d, i in zip(dist[0], idx[0])]

    def search_by_image(self, image_path, k=5):
        q = self._encode_images([image_path])
        dist, idx = self.index.search(q, k)
        return [(self.filenames[i], float(d)) for d, i in zip(dist[0], idx[0])]
```

## 报告

```
[retriever]
  model:          <name>
  num_images:     <int>
  dim:            <int>
  index_type:     flat | IVF | HNSW
  index_size_mb:  <float>
```

## 规则

- 建索引前一律对嵌入做 L2 归一化；在归一化向量上，FAISS 的内积就等于余弦相似度。
- 少于 100k 张图像时，`IndexFlatIP`（精确检索）最简单也最快。
- 100k 到 10M 之间，`IndexIVFFlat` 是标准的折中方案。
- 超过 10M 时，用 HNSW 或乘积量化变体。
- 绝不在每次查询时重建索引；嵌入一次，多次搜索。
