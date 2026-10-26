---
id: pretraining-data
title: 预训练数据流水线
code: PP
subtitle: 清洗、去重、下载、分词、分片并滑窗读取预训练语料。包含课程 Python 实现。
hue: 28
sources: phases/10-llms-from-scratch/03-data-pipelines, phases/19-capstone-projects/31-tokenized-dataset-sliding-window, phases/19-capstone-projects/42-large-corpus-downloader, phases/19-capstone-projects/43-hdf5-tokenized-corpus
source_hash: ecff395d16bd5217
---

## 任务
type: task-table
from: phases/10-llms-from-scratch/03-data-pipelines/code/main.py, phases/19-capstone-projects/31-tokenized-dataset-sliding-window/code/main.py, phases/19-capstone-projects/42-large-corpus-downloader/code, phases/19-capstone-projects/43-hdf5-tokenized-corpus/code

| 任务 | 代码 |
|---|---|
| 运行课程演示 | `python3 code/main.py` |
| 运行测试 | `python3 -m unittest discover code/tests -v` |
| 删除近似重复 | `deduplicate(filtered_docs, threshold=0.8)` |
| 将标识打包成序列 | `pack_sequences(token_ids, seq_length, pad_id=0)` |
| 下载一个分片 | `process_shard(plan, downloader, dedup, manifest)` |
| 写入 HDF5 分片 | `pipeline.write_corpus(shards)` |
| 检查分片 hash | `validate_corpus(entries)` |
| 读取 token 范围 | `store.get_slice(start, stop)` |

## 从语料到批次
type: architecture
from: phases/19-capstone-projects/42-large-corpus-downloader/docs/zh.md, phases/19-capstone-projects/43-hdf5-tokenized-corpus/docs/zh.md

```arch
node | url | 1,1 | 分片 URL | ShardPlanner | client
node | dl | 2,1 | StreamingDownloader | Range 续传 | process
node | zst | 3,1 | ZstdDocIterator | 每行一篇文档 | process
node | dedup | 4,1 | 去重 | MinHasher + LSHIndex | process
node | man | 4,2 | manifest.json | 分片 sha256 | store
node | h5 | 3,2 | HDF5ShardWriter | 每分片一个 .h5 | store
node | store | 2,2 | MmapTokenStore | swmr 读取 | store
node | win | 1,2 | SlidingWindowDataloader | 输入、目标 | gpu
edge | url | dl | GET
edge | dl | zst | 字节
edge | zst | dedup | 文档
edge | dedup | man | 判定
edge | man | h5 | JSONL 分片
edge | h5 | store | shards.json
edge | store | win | get_slice
```

## 清洗与过滤
type: annotated-code
lang: python
from: phases/10-llms-from-scratch/03-data-pipelines/code/main.py, phases/10-llms-from-scratch/03-data-pipelines/docs/zh.md

```python
def clean_text(text):
    text = re.sub(r"<[^>]+>", "", text)  # 删除 HTML 标签
    text = re.sub(r"http\S+", "", text)  # 删除 URL
    text = re.sub(r"[^\x20-\x7E\n]", "", text)  # 仅保留可打印 ASCII
    text = re.sub(r"\n{3,}", "\n\n", text)  # 合并空行
    text = re.sub(r" {2,}", " ", text)  # 合并空格
    return text.strip()

def quality_filter(text, min_words=50, max_ratio_caps=0.3, max_ratio_special=0.1):
    ...  # 短页、全大写垃圾文本、符号噪声返回 False
```

## 清洗阶段
type: flow
from: phases/10-llms-from-scratch/03-data-pipelines/docs/zh.md

1. **去除 HTML**：只保留可见文本。
2. **语言检测**：fastText lid.176.bin。置信度低于 0.8 不算干净英语。
3. **质量过滤**：相对 Wikipedia 模型的困惑度高，表示垃圾文本。
4. **去重**：MinHash 加 LSH。Jaccard 高于 0.8 时移除一个副本。
5. **移除 PII**：结构化 PII 用正则，人名用 NER 模型。
6. **分词与打包**：每篇文档末尾追加 `tokenizer.eos_id`。

## 滑动窗口数据集
type: annotated-code
lang: python
from: phases/19-capstone-projects/31-tokenized-dataset-sliding-window/code/main.py

```python
ds = SlidingWindowDataset(ids, context_length=16, stride=8)  # stride 为 None 时使用 context_length
SlidingWindowDataset.count_windows(num_ids, context_length, stride)  # 1 + usable // stride
x, y = ds[0]  # window[:-1], window[1:]
loader = make_dataloader(ds, batch_size=4, base_seed=7, epoch=0)
generator.manual_seed(base_seed + epoch)  # 相同种子，相同顺序
```

## 断点续传
type: flow
from: phases/19-capstone-projects/42-large-corpus-downloader/code/main.py, phases/19-capstone-projects/42-large-corpus-downloader/docs/zh.md

1. **StreamingDownloader**：读取 `<shard_id>.zst` 旁的 `<shard_id>.partial.json`。
2. **_verify_partial**：文件大小必须等于 `verified_bytes`，sha256 必须等于 `sha256_prefix_hex`。
3. **不匹配**：删除分片和检查点，从零字节重新开始。
4. **匹配**：发送值为 `bytes={resume_from}-` 的 `Range`，以 `ab` 模式打开分片。
5. **响应检查**：状态必须为 206，且 `Content-Range` 匹配。否则执行完整 GET。
6. **每个数据块**：先通过 `os.replace` 执行 `_write_checkpoint`，再执行 `out.write(buf)`。

## 去重与过滤默认值
type: defaults
from: phases/10-llms-from-scratch/03-data-pipelines/code/main.py, phases/19-capstone-projects/42-large-corpus-downloader/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `min_words` | 50 | 短页不通过 |
| `max_ratio_caps` | 0.3 | 全大写垃圾文本不通过 |
| `max_ratio_special` | 0.1 | 符号噪声不通过 |
| `threshold` | 0.8 | 删除副本的 Jaccard 阈值 |
| `num_hashes` | 128 | 签名长度 |
| `bands` | 16 | 第 03 课。第 42 课使用 `DEFAULT_BANDS = 32` |
| `DEFAULT_SHINGLE_WIDTH` | 5 | 演示使用 `shingle_width=3` |
| `CHUNK_BYTES` | `1 << 16` | 下载读取大小 |

## 存储默认值
type: defaults
from: phases/19-capstone-projects/43-hdf5-tokenized-corpus/code/main.py, phases/19-capstone-projects/43-hdf5-tokenized-corpus/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `DEFAULT_CHUNK_SIZE` | 8192 | 演示使用 `chunk_size=512` |
| `DEFAULT_WINDOW_SIZE` | 64 | 读取 `window_size + 1` 个 token |
| `BOUNDARY_TOKEN_ID` | 0 | 文档分隔符 |
| `TOKEN_DTYPE` | `np.uint16` | 字节标识加一 |
| `maxshape` | `(None,)` | 可调整大小的数据集 |
| `libver` | `"latest"` | SWMR 要求写入端设置此值 |

## 数值与公式
type: concepts
from: phases/10-llms-from-scratch/03-data-pipelines/docs/zh.md, phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md, phases/19-capstone-projects/42-large-corpus-downloader/docs/zh.md, phases/19-capstone-projects/42-large-corpus-downloader/code/main.py

- **窗口数**：N 个标识、上下文 T、步长 S 时为 `max(0, 1 + (N - (T + 1)) // S)`。
- **步长**：`T // 2` 使数据集翻倍，`1` 使其增至 `T` 倍。
- **LSH 碰撞**：`1 - (1 - s^r)^b`，其中 `k = b * r`。
- **LSH 阈值**：接近 `(1/b)^(1/r)`。b=32、r=4 时接近 s = 0.42。
- **压缩**：英语每 token 约 3-4 个字符。
- **序列利用率**：低于 90% 表示打包浪费计算。
- **去重收益**：Llama 团队移除了约 38% 的网页数据。
- **Chinchilla**：参数量和 token 量大致等比例扩展。

## 故障排查
type: troubleshooting
from: phases/19-capstone-projects/42-large-corpus-downloader/docs/zh.md, phases/19-capstone-projects/42-large-corpus-downloader/code/main.py, phases/19-capstone-projects/43-hdf5-tokenized-corpus/docs/zh.md, phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md, phases/10-llms-from-scratch/03-data-pipelines/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 续传分片含垃圾数据 | 偏移与文件不符 | 先检查 sha256 前缀 |
| 服务忽略 `Range` | 状态不是 206 | 关闭连接，完整 GET |
| 断电后后缀重复 | 先写字节，后写检查点 | 先写检查点，再写数据 |
| 模型学会预测零 | 读取器读到了零填充 | 在 `token_count` 处截断 |
| "file is locked" | 缺少 `libver="latest"` 或过晚启用 SWMR | 先创建数据集，再设置 `swmr_mode` |
| 吞吐减半 | 块与窗口不匹配 | 块大小取 `window_size` 的倍数 |
| 运行无故产生差异 | 未设置打乱种子 | 每个 epoch 传入 `base_seed` |
| `LSHIndex` 抛出 `ValueError` | `bands` 不能整除 `num_hashes` | 选择能整除 128 的 bands |

## 问答
type: qa
from: phases/10-llms-from-scratch/03-data-pipelines/docs/zh.md, phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md, phases/19-capstone-projects/42-large-corpus-downloader/docs/zh.md, phases/19-capstone-projects/43-hdf5-tokenized-corpus/docs/zh.md

- **为何打包而非填充？** 填充会把计算浪费在没有学习价值的 token 上。
- **为何使用块对角掩码？** 文档 A 的 token 不应关注文档 B 的 token。
- **切片器如何处理短尾部？** 丢弃最后一个窗口。
- **为何分词前去重？** 分词成本高，不要付两次。
- **为何给重复项留下删除标记？** 清单保留了到保留项的链接。
- **为何每个源分片一个 HDF5？** 崩溃最多损失一个分片。

## 提示
type: tips
from: phases/19-capstone-projects/42-large-corpus-downloader/docs/zh.md, phases/19-capstone-projects/43-hdf5-tokenized-corpus/docs/zh.md, phases/19-capstone-projects/31-tokenized-dataset-sliding-window/docs/zh.md

- 训练器读取 `shards.json`，不读取目录列表。
- 信任分片行之前，先核对 `manifest.lock` 中的清单 sha256。
- SWMR 模式下每次调整大小后调用 `dataset.flush()`。
- 先将 token 缓冲至块大小，再调整大小。不要逐文档写入。
- 多数运行使用与上下文长度相同的步长。
