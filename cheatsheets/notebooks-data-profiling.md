---
id: notebooks-data-profiling
title: Notebook、数据文件与性能分析
code: ND
subtitle: 安全运行 notebook，加载和划分数据集，避免大文件进入 git，分析时间与内存，发现无声的 AI bug。
hue: 285
sources: phases/00-setup-and-tooling/05-jupyter-notebooks, phases/00-setup-and-tooling/09-data-management, phases/00-setup-and-tooling/12-debugging-and-profiling
source_hash: 8f1f13ab32ab617b
---

## Notebook 快捷键
type: command-table
from: phases/00-setup-and-tooling/05-jupyter-notebooks/docs/zh.md

| 命令 | 作用 |
|---|---|
| 先 `pip install jupyterlab`，再 `jupyter lab` | 启动 JupyterLab |
| `Escape` / `Enter` | 命令模式 / 编辑模式 |
| `Shift+Enter` | 运行单元格并移到下一个 |
| `A` / `B` | 在上方 / 下方插入单元格 |
| `DD` | 删除单元格 |
| `M` / `Y` | 转为 Markdown / 代码 |
| `Shift+Tab` | 显示函数签名 |
| `Ctrl+Shift+H` | 显示全部快捷键 |

## 魔法命令
type: command-table
from: phases/00-setup-and-tooling/05-jupyter-notebooks/docs/zh.md, phases/00-setup-and-tooling/05-jupyter-notebooks/outputs/prompt-notebook-helper.md

| 命令 | 作用 |
|---|---|
| `%timeit np.random.randn(10000)` | 多次运行并取均值，适合微基准 |
| `%%time` | 运行单元格一次，适合训练运行 |
| `%matplotlib inline` | 在 notebook 中显示图 |
| `!pip install scikit-learn` | `!` 可运行任意 shell 命令 |
| `%env CUDA_VISIBLE_DEVICES` | 检查环境变量 |
| `%who` | 列出内存中全部变量 |
| `!which python` | 检查内核环境 |

## Notebook 故障排查
type: troubleshooting
from: phases/00-setup-and-tooling/05-jupyter-notebooks/docs/zh.md, phases/00-setup-and-tooling/05-jupyter-notebooks/outputs/prompt-notebook-helper.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 本机可用，他人无法运行 | 单元格未按顺序运行 | 分享前执行 Kernel > Restart & Run All |
| 干净 notebook 依赖已删除单元格 | 内核有隐藏状态 | 定期重启内核 |
| RAM 持续增长 | 变量在单元格间保留 | 使用 `del variable_name` 和 `gc.collect()` |
| 内核无声终止 | UI 隐藏了错误 | 阅读运行 Jupyter 的终端 |
| `print(df)` 显示文本 | 不是最后一个表达式 | 让单元格以 `df` 结束 |
| pip 安装后仍导入失败 | 包装进了另一个 Python | 在 notebook 中执行 `!pip install package` |
| 单元格一直运行 | 等待 `input()` 或陷入循环 | 执行 Kernel > Interrupt，或按两次 `I` |
| Colab 文件消失 | 免费会话闲置 90 分钟后结束 | 使用 `drive.mount('/content/drive')` |

## 数据流水线
type: architecture
from: phases/00-setup-and-tooling/09-data-management/docs/zh.md

```arch
node | hub | 1,1 | Hugging Face Hub | 数据集与模型 | store
node | lib | 2,1 | datasets 库 | 加载或流式读取 | process
node | cache | 3,1 | 本地缓存 | ~/.cache/huggingface/ | store
node | fmt | 2,2 | 格式转换 | CSV、JSON、Parquet、Arrow | process
node | split | 3,2 | 数据划分 | 训练 / 验证 / 测试 | process
node | train | 4,2 | 训练流水线 | | model
edge | hub | lib | 下载
edge | lib | cache | 首次加载
edge | lib | fmt |
edge | fmt | split |
edge | split | train |
```

## 加载、流式读取、转换与划分
type: annotated-code
lang: python
from: phases/00-setup-and-tooling/09-data-management/docs/zh.md, phases/00-setup-and-tooling/09-data-management/code/data_utils.py

```python
dataset = load_dataset("stanfordnlp/imdb", split="train")   # 首次加载后缓存
stream = load_dataset("wikimedia/wikipedia", "20231101.en", split="train", streaming=True)
dataset.to_parquet("imdb_train.parquet")                    # 也可用 to_csv、to_json
split = dataset.train_test_split(test_size=0.2, seed=42)
train_val = split["train"].train_test_split(test_size=0.125, seed=42)
train_ds, val_ds, test_ds = train_val["train"], train_val["test"], split["test"]
make_splits(ds, train_ratio=0.8, val_ratio=0.1, seed=42)    # data_utils 辅助函数
model_dir = snapshot_download("sentence-transformers/all-MiniLM-L6-v2")
```

## 文件格式
type: defaults
from: phases/00-setup-and-tooling/09-data-management/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| CSV | 慢 | 体积大。适合人工阅读、电子表格 |
| JSON | 慢 | 体积大。适合 API、嵌套数据 |
| Parquet | 快 | 体积小。适合 AI 工作的存储格式 |
| Arrow | 最快 | 体积小。用于 `datasets` 内部的内存表示 |
| 训练划分 | 80% | 验证 10%、测试 10% |
| 数据集缓存 | `~/.cache/huggingface/datasets/` | 模型缓存在 `~/.cache/huggingface/hub/` |

## 不让大文件进入 git
type: task-table
from: phases/00-setup-and-tooling/09-data-management/docs/zh.md
span: 2

| 任务 | 代码 |
|---|---|
| 忽略权重和数据 | `*.safetensors`、`*.pt`、`data/*.parquet`、`models/` |
| 用 Git LFS 跟踪 | `git lfs track "*.safetensors"` |
| 提交 LFS 规则 | `git add .gitattributes` |
| 启用 DVC | `dvc init` |
| 用 DVC 跟踪数据 | `dvc add data/training_set.parquet` |
| 提交指针 | `git add data/training_set.parquet.dvc data/.gitignore` |
| 将数据推送到 S3 | 先 `dvc remote add -d myremote s3://my-bucket/dvc-store`，再 `dvc push` |

## 调试与性能分析工具
type: task-table
from: phases/00-setup-and-tooling/12-debugging-and-profiling/docs/zh.md
span: 2

| 任务 | 代码 |
|---|---|
| 仅在损失异常时暂停 | `if loss.item() > 100 or torch.isnan(loss): breakpoint()` |
| 在 pdb 中检查 | `p outputs.shape`、`p loss.item()`，再输入 `c` 或 `q` |
| 函数级分析 | `python -m cProfile -s cumtime train.py` |
| 逐行分析 | 先 `@profile`，再 `kernprof -l -v train.py` |
| 逐行内存分析 | `python -m memory_profiler your_script.py` |
| 最大分配项 | `tracemalloc.take_snapshot().statistics("lineno")` |
| GPU 内存 | `torch.cuda.memory_allocated()`、`torch.cuda.memory_reserved()` |
| 训练曲线 | 先 `SummaryWriter("runs/experiment_1")`，再 `tensorboard --logdir=runs` |

## 调试流程
type: flow
from: phases/00-setup-and-tooling/12-debugging-and-profiling/docs/zh.md

1. **训练前**：用样本批次运行 `check_shapes`。
2. **前 10 步**：通过 `debug_print` 输出损失、输出和梯度。不能有 NaN。
3. **训练中**：向 TensorBoard 记录损失、学习率和梯度范数。
4. **出错时**：在故障点插入 `breakpoint()`。
5. **优化速度**：测量加载数据、前向和反向传播时间。接近 OOM 时分析内存。

## 无声的 AI bug
type: troubleshooting
from: phases/00-setup-and-tooling/12-debugging-and-profiling/docs/zh.md, phases/00-setup-and-tooling/12-debugging-and-profiling/outputs/prompt-debug-ai-code.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 几步后出现 NaN | 学习率过高 | 降低 10x，添加梯度裁剪 |
| 立即出现 NaN | 对零或负数取对数 | 使用 `torch.log(x + 1e-8)` |
| 损失卡在 ln(num_classes) | 梯度未流动 | 移除误加的 `.detach()` |
| 测试准确率 99% | 数据泄漏 | 运行 `check_data_leakage(train_set, test_set)` |
| OOM | 批量太大 | 批量减半，使用 `torch.cuda.empty_cache()` |
| 反向传播时 OOM | 未清除梯度 | 每步执行 `optimizer.zero_grad()` |
| 速度慢、GPU 使用率低 | 数据加载瓶颈 | 使用 `num_workers=4` 和 `pin_memory=True` |
| 张量在错误设备 | CPU 张量、GPU 模型 | 运行 `check_devices(model, *tensors)` |

## 读懂曲线
type: qa
from: phases/00-setup-and-tooling/12-debugging-and-profiling/docs/zh.md

- **损失不降？** 学习率太低，或架构有问题。
- **损失剧烈振荡？** 学习率太高。
- **训练损失下降，验证损失上升？** 过拟合。
- **权重直方图收缩到零？** 梯度消失。
- **梯度直方图爆炸？** 添加梯度裁剪。

## 提示
type: tips
from: phases/00-setup-and-tooling/05-jupyter-notebooks/docs/zh.md, phases/00-setup-and-tooling/09-data-management/docs/zh.md, phases/00-setup-and-tooling/12-debugging-and-profiling/docs/zh.md

- 在 notebook 中探索，用脚本交付。
- 微基准使用 `%timeit`，训练运行使用 `%%time`。
- 始终设置种子。相同种子得到相同划分。
- 数据集无法装入磁盘时使用流式读取。
- 数据加载常占训练时间的 60%。设置 `num_workers > 0`。
