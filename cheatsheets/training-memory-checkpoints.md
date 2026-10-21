---
id: training-memory-checkpoints
title: 训练内存、梯度累积与检查点
code: TM
subtitle: 修复 NaN 更新、内存限制、累积缩放和恢复故障。速查裁剪、AMP、重计算与原子检查点。
hue: 20
sources: phases/10-llms-from-scratch/34-gradient-checkpointing, phases/19-capstone-projects/45-gradient-clipping-amp, phases/19-capstone-projects/46-gradient-accumulation, phases/19-capstone-projects/47-checkpoint-save-resume, phases/19-capstone-projects/80-checkpoint-sharded-resume, phases/19-capstone-projects/81-end-to-end-distributed-train
source_hash: 57da29f8be32bdce
---

## 训练现象
type: troubleshooting
from: phases/19-capstone-projects/45-gradient-clipping-amp/docs/zh.md, phases/19-capstone-projects/46-gradient-accumulation/docs/zh.md, phases/19-capstone-projects/47-checkpoint-save-resume/docs/zh.md, phases/10-llms-from-scratch/34-gradient-checkpointing/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 一个批次后损失陡升 | 梯度范数突增，未裁剪 | 使用 `clip_grad_norm_`，设 `max_norm = 1.0` |
| 一步后全部权重为 NaN | FP16 溢出产生 Inf，继而 NaN | `torch.amp.GradScaler` 跳过该步 |
| 缩放因子从不变化 | 跳过路径未调用 `scaler.update()` | 每步调用 `scaler.update()` |
| 裁剪作用于已缩放梯度 | 裁剪在取消缩放之前运行 | 先调用 `scaler.unscale_(optimizer)` |
| 每轮跳过数百步 | 模型超出 FP16 范围 | 跳过率高于 5% 时告警 |
| 优化器更新大了 16 倍 | 微批次损失未除以累积步数 | 损失除以 `accum_steps` |
| 恢复后的损失曲线不同 | 检查点未存 RNG 状态 | 保存 `capture_rng_state()` 输出 |
| 激活放不进内存 | 反向传播保留所有激活 | `torch.utils.checkpoint.checkpoint(fn, input)` |

## 检查点加载失败
type: troubleshooting
from: phases/19-capstone-projects/80-checkpoint-sharded-resume/docs/zh.md, phases/19-capstone-projects/80-checkpoint-sharded-resume/code/main.py, phases/19-capstone-projects/47-checkpoint-save-resume/code/main.py, phases/19-capstone-projects/47-checkpoint-save-resume/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `world_size mismatch` | 恢复时 world size 不同 | 在相同 world size 下恢复 |
| `sha256 mismatch on rank` | 分片在刷盘中被截断 | 写 .tmp，fsync 后重命名 |
| `shard file missing` | rank 文件数少于清单分片数 | 枚举分片并逐个检查存在性 |
| `unknown schema` | 载荷模式不以 ckpt 开头 | 按模式字符串分支迁移 |
| 恢复 100 步后损失变成 NaN | 清单存在，但分片不完整 | 原子写入，加载时检查 sha256 |
| 运行中磁盘写满 | 没有轮换 | 用 `rotate_checkpoints` 保留最近 K 个 |

## 安全的 AMP 更新
type: annotated-code
lang: python
from: phases/19-capstone-projects/45-gradient-clipping-amp/code/main.py, phases/19-capstone-projects/45-gradient-clipping-amp/docs/zh.md

```python
optimizer.zero_grad(set_to_none=True)  # 梯度设为 None
with torch.amp.autocast(device_type="cuda"):  # FP16 前向传播
    loss = loss_fn(model(inputs), targets)
if not torch.isfinite(loss).all().item():  # 在反向传播前检查
    return skip("non_finite_loss")  # 此处不调用 scaler.update
scaler.scale(loss).backward()  # 缩放后反向传播
scaler.unscale_(optimizer)  # 裁剪前取消缩放
if has_non_finite_grad(model.parameters()):
    scaler.update()  # 缩放因子减半
    return skip("non_finite_grad")
pre, post = clip_global_l2_norm(params, max_norm)
scaler.step(optimizer)
scaler.update()  # 加倍或减半
```

## 累积梯度，最后一次同步
type: annotated-code
lang: python
from: phases/19-capstone-projects/46-gradient-accumulation/code/main.py, phases/19-capstone-projects/46-gradient-accumulation/docs/zh.md

```python
accum_steps = len(micro_batches)
zero_grads(model)
for i, (x, y) in enumerate(micro_batches):
    is_last = i == accum_steps - 1
    if no_sync_until_last and not is_last:
        with no_sync_context(model):  # DDP 跳过 all-reduce
            loss = loss_scaled_for_accum(model(x), y, accum_steps, loss_fn)
            loss.backward()  # 梯度累加进 param.grad
    else:
        loss = loss_scaled_for_accum(model(x), y, accum_steps, loss_fn)
        loss.backward()  # 每个有效更新同步一次
optimizer.step()  # 每个有效批次执行一次
```

## 代码任务
type: task-table
span: 2
from: phases/19-capstone-projects/45-gradient-clipping-amp/docs/zh.md, phases/19-capstone-projects/45-gradient-clipping-amp/code/main.py, phases/19-capstone-projects/46-gradient-accumulation/code/main.py, phases/10-llms-from-scratch/34-gradient-checkpointing/docs/zh.md, phases/19-capstone-projects/47-checkpoint-save-resume/code/main.py, phases/19-capstone-projects/80-checkpoint-sharded-resume/code/main.py

| 任务 | 代码 |
|---|---|
| 按全局 L2 范数裁剪 | `clip_grad_norm_(parameters, max_norm)` |
| 记录缩放因子 | `scaler.get_scale()` |
| 缩放微批次损失 | `loss_scaled_for_accum(logits, target, accum_steps, loss_fn)` |
| 反向传播时重计算一段 | `checkpoint(fn, input)` |
| 原子保存完整状态 | `save_checkpoint(model, optimizer, scheduler, state, out_path)` |
| 加载不可信文件 | `torch.load(path, map_location="cpu", weights_only=True)` |
| 保存和加载逐 rank 分片 | `save_sharded(per_rank_state, dest_dir, step)` |
| 恢复并核验所有分片 | `load_sharded(src_dir, expected_world_size)` |

## 分片原子保存
type: architecture
from: phases/19-capstone-projects/80-checkpoint-sharded-resume/docs/zh.md, phases/19-capstone-projects/80-checkpoint-sharded-resume/code/main.py

```arch
node | s0 | 1,1 | rank 0 状态 | 参数与优化器分片 | gpu
node | s1 | 1,2 | rank 1 状态 | 每个 rank 一个文件 | gpu
node | t0 | 2,1 | rank0.bin.tmp | 写入、flush、fsync | store
node | t1 | 2,2 | rank1.bin.tmp | 写入、flush、fsync | store
node | man | 3,1 | manifest.json.tmp | world_size、step、shards | store
node | ren | 3,2 | os.replace | 先分片，最后清单 | process
node | load | 4,1 | load_sharded | 逐分片检查 sha256 | process
edge | s0 | t0 |
edge | s1 | t1 |
edge | t0 | man | sha256
edge | t1 | man | sha256
edge | man | ren |
edge | ren | load | 恢复
```

## 轮次中途保存与恢复
type: flow
from: phases/19-capstone-projects/47-checkpoint-save-resume/docs/zh.md, phases/19-capstone-projects/47-checkpoint-save-resume/code/main.py

1. **save_checkpoint**：打包模型、优化器、调度器、计数器与 RNG。
2. **atomic_save**：写临时文件，再调用 `os.replace`。
3. **load_checkpoint**：使用 `weights_only=True` 调用 `torch.load`。
4. **restore_rng_state**：恢复 Python、NumPy 和 torch 的 RNG。
5. **训练循环**：从 `batch_in_epoch` 继续，损失差异低于 1e-4。

## 运行课程
type: command-table
from: phases/19-capstone-projects/45-gradient-clipping-amp/docs/zh.md, phases/19-capstone-projects/46-gradient-accumulation/docs/zh.md, phases/19-capstone-projects/46-gradient-accumulation/code/main.py, phases/19-capstone-projects/47-checkpoint-save-resume/code/main.py, phases/19-capstone-projects/80-checkpoint-sharded-resume/docs/zh.md, phases/19-capstone-projects/81-end-to-end-distributed-train/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` | 第 45 课：20 步，每行标记 STEP 或 SKIP |
| `--num-steps 100` | 第 46 课：更长的曲线扫描 |
| `--accum-grid 1,2,4,8,16` | 第 46 课：扫描的累积步数 |
| `--total-steps 24 --interrupt-at 10` | 第 47 课：恢复演示窗口 |
| `python3 code/main.py` | 第 80 课：4 个分片加清单，重载后逐字节相同 |
| `python3 code/main.py` | 第 81 课：20 步，4 个 rank，RESUME VERIFIED |

## 代码默认值
type: defaults
from: phases/19-capstone-projects/45-gradient-clipping-amp/code/main.py, phases/10-llms-from-scratch/34-gradient-checkpointing/code/main.py, phases/19-capstone-projects/80-checkpoint-sharded-resume/code/main.py, phases/19-capstone-projects/47-checkpoint-save-resume/code/main.py, phases/19-capstone-projects/81-end-to-end-distributed-train/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `DEFAULT_MAX_NORM` | 1.0 | `AmpTrainState` 的裁剪阈值 |
| cpu 上的 `amp_dtype` | `torch.bfloat16` | cuda 上为 `torch.float16` |
| `window` | 1000 | `rolling_skip_rate` 的步数 |
| `k` | 4 | 每个检查点分段的层数 |
| `attention_fraction` | 0.15 | 选择性模式中的重计算比例 |
| `keep_last` | 5 | `rotate_checkpoints` 保留的检查点数 |
| `CHECKPOINT_SCHEMA` | ckpt.v1 | 载荷中的模式字符串 |
| `CHECKPOINT_STEP` | 10 | 第 81 课的分片保存步数 |

## 内存与成本数字
type: concepts
from: phases/10-llms-from-scratch/34-gradient-checkpointing/docs/zh.md, phases/19-capstone-projects/46-gradient-accumulation/docs/zh.md, phases/19-capstone-projects/81-end-to-end-distributed-train/docs/zh.md

- **每层激活**：约 `12 * B * L * d` 个浮点数。
- **d=8192、L=8192、B=1**：BF16 每层 800 MB，64 层为 51 GB。
- **全量激活检查点**：FLOPs 约增加 33%，每步为 4 个单位而非 3 个。
- **选择性激活检查点**：仅重计算注意力，开销约 5%。
- **sqrt(L) 规则**：每 sqrt(L) 层设一个检查点，L=64 时为 8 个。
- **有效批次**：`micro_batch * accum_steps`，再乘数据并行 world size。
- **ZeRO-1 优化器内存**：每个 rank 为 12P/N 字节。

## 问答
type: qa
from: phases/19-capstone-projects/45-gradient-clipping-amp/docs/zh.md, phases/19-capstone-projects/46-gradient-accumulation/docs/zh.md, phases/19-capstone-projects/47-checkpoint-save-resume/docs/zh.md, phases/19-capstone-projects/80-checkpoint-sharded-resume/docs/zh.md, phases/10-llms-from-scratch/34-gradient-checkpointing/docs/zh.md

- **CPU GradScaler 为何不起作用？** CPU autocast 使用 BF16，无需损失缩放。
- **缩放因子何时变化？** 连续正常更新后加倍，每次跳过时减半。
- **梯度累积节省时间吗？** 不，`accum_steps` 加倍，每步实际耗时也加倍。
- **为何用 `weights_only=True`？** `.pt` 文件是 pickle，反序列化可执行代码。使用 torch 2.6 或更高版本。
- **为何每个 rank 一个文件？** 写带宽可扩展，单 rank 的 4 小时可在 64 个 rank 上降至 4 分钟。

## 提示
type: tips
from: phases/19-capstone-projects/45-gradient-clipping-amp/docs/zh.md, phases/19-capstone-projects/47-checkpoint-save-resume/docs/zh.md, phases/19-capstone-projects/81-end-to-end-distributed-train/docs/zh.md

- autocast 设备应与优化器设备一致。
- 抛出 `ValueError`，不要用 assert，`python -O` 会移除 assert。
- 损失突增超过 2x 时，回退到上一个检查点。
