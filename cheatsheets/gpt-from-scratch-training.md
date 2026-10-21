---
id: gpt-from-scratch-training
title: 从零训练与加载 GPT
code: TL
subtitle: 构建 124M GPT，使用 AdamW 与余弦预热训练，加载 GPT-2 权重，并设置流水线门禁。
hue: 28
sources: phases/19-capstone-projects/35-gpt-model-assembly, phases/19-capstone-projects/36-training-loop-eval, phases/19-capstone-projects/37-loading-pretrained-weights, phases/19-capstone-projects/44-cosine-lr-warmup, phases/10-llms-from-scratch/13-building-complete-llm-pipeline
source_hash: 8219c1640db41acc
---

## 运行课程
type: command-table
from: phases/19-capstone-projects/35-gpt-model-assembly/docs/zh.md, phases/19-capstone-projects/36-training-loop-eval/docs/zh.md, phases/19-capstone-projects/37-loading-pretrained-weights/docs/zh.md, phases/19-capstone-projects/44-cosine-lr-warmup/docs/zh.md, phases/10-llms-from-scratch/13-building-complete-llm-pipeline/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` (35) | 统计 124M 参数，使用微型配置生成文本 |
| `python3 code/main.py` (36) | 训练微型模型，写入 `outputs/losses.jsonl` |
| `python3 code/main.py` (37) | 写入并加载 `outputs/gpt2-stub.safetensors` |
| `python3 code/main.py` (44) | 20 步，逐步记录学习率与梯度范数，绘制文本图 |
| `python code/main.py plan` | 校验清单、估算成本、打印 DAG |
| `python code/main.py run` | 执行阶段，写入 `manifest.out.yaml` |
| `python code/main.py gate` | 应用评估门禁，打印 `SHIP` 或 `HOLD` |
| `build_param_groups(model, weight_decay)` | AdamW 参数分组，按是否衰减拆分 |

## GPTConfig 默认值（124M）
type: defaults
from: phases/19-capstone-projects/35-gpt-model-assembly/code/main.py, phases/19-capstone-projects/35-gpt-model-assembly/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `vocab_size` | 50257 | token 表行数 |
| `context_length` | 1024 | 位置表行数 |
| `d_model` | 768 | 嵌入宽度 |
| `num_heads` | 12 | `d_model` 必须能被它整除 |
| `num_layers` | 12 | 十二个 `TransformerBlock` 模块 |
| `mlp_expansion` | 4 | MLP 隐层为 `d_model` 的 4 倍 |
| `dropout` | 0.1 | 微型演示设为 0.0 |
| `weight_tying` | True | `lm_head` 与 `tok_embed` 共享权重 |

## GPTModel 前向传播
type: architecture
from: phases/19-capstone-projects/35-gpt-model-assembly/code/main.py, phases/19-capstone-projects/35-gpt-model-assembly/docs/zh.md

```arch
node | ids | 1,1 | token 标识 | 形状 B, T | client
node | tok | 2,1 | tok_embed | 50257, 768 | store
node | pos | 2,2 | pos_embed | 1024, 768，可学习 | store
node | add | 3,1 | 相加 | embed_dropout | process
node | blk | 4,1 | 12 个块 | pre-LN TransformerBlock | model
node | ln | 4,2 | final_ln | LayerNorm | process
node | head | 3,2 | lm_head | logits B, T, 50257 | model
edge | ids | tok | ids
edge | ids | pos | 0 至 T-1
edge | tok | add |
edge | pos | add |
edge | add | blk |
edge | blk | ln |
edge | ln | head |
edge | head | tok | 共享权重
```

## 构建、计数与采样
type: annotated-code
lang: python
from: phases/19-capstone-projects/35-gpt-model-assembly/code/main.py

```python
ref_model = GPTModel(GPTConfig())  # 124M 参考模型
count_parameters(ref_model)  # 统计独立参数，共享权重只计一次
GPTModel(GPTConfig(weight_tying=False))  # 增加 vocab_size * d_model
self.lm_head.weight = self.tok_embed.weight  # 共享，不复制
generate(tiny_model, prompt, max_new_tokens=12,
         temperature=0.8, top_k=20, seed=42)  # temperature 必须为正
top_k_filter(logits, top_k)  # 其余设为 -inf
window = tokens[:, -model.cfg.context_length:]  # 滑动窗口
```

## 一次训练步骤
type: flow
from: phases/19-capstone-projects/36-training-loop-eval/code/main.py, phases/19-capstone-projects/36-training-loop-eval/docs/zh.md

1. **make_batches**：目标为输入向后移一位。
2. **调度**：`cosine_with_warmup` 设置各参数组的 `group["lr"]`。
3. **calc_loss_batch**：前向传播，展平为 `(batch * seq, vocab)`，计算交叉熵。
4. **反向传播**：`loss.backward()`，然后以 `max_norm=1.0` 调用 `clip_grad_norm_`。
5. **AdamW**：使用 `betas=(0.9, 0.95)` 执行 `optimizer.step()`。
6. **记录**：将 `{"step", "train_loss", "lr"}` 追加到 `losses.jsonl`。
7. **探测**：每 `eval_every` 步运行 `evaluate_model` 和 `generate_and_print_sample`。

## 训练循环核心
type: annotated-code
lang: python
from: phases/19-capstone-projects/36-training-loop-eval/code/main.py

```python
optimizer = torch.optim.AdamW(
    build_param_groups(model, cfg.weight_decay),  # 按是否衰减拆分
    lr=cfg.max_lr, betas=(0.9, 0.95))
for step in range(cfg.num_steps):
    lr = cosine_with_warmup(step, cfg.warmup_steps, cfg.num_steps, cfg.max_lr, cfg.min_lr)
    for group in optimizer.param_groups:
        group["lr"] = lr
    inputs, targets = next(train_loader)
    optimizer.zero_grad(set_to_none=True)
    loss = calc_loss_batch(model, inputs, targets)  # 展平后计算交叉熵
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=cfg.grad_clip)
    optimizer.step()
```

## 调度与规模数值
type: concepts
from: phases/19-capstone-projects/44-cosine-lr-warmup/docs/zh.md, phases/19-capstone-projects/35-gpt-model-assembly/docs/zh.md, phases/10-llms-from-scratch/13-building-complete-llm-pipeline/docs/zh.md

- **预热**：在 `warmup_steps` 之前使用 `lr_max * step / warmup_steps`。
- **余弦**：`lr_min + 0.5 * (lr_max - lr_min) * (1 + cos(pi * progress))`。
- **下限**：超过 `total_steps` 后学习率保持 `lr_min`。
- **预热长度**：占总步数的一部分，通常为 1 至 3%。
- **下限大小**：`lr_min` 取 `lr_max` 的 10%，让优化器持续学习。
- **权重共享**：节省 50257 乘 768，即 38M 个参数。
- **残差初始化**：将输出投影缩放 `1 / sqrt(2 * num_layers)`。
- **预训练 FLOPs**：6 x params x tokens。

## GPT-2 名称到本地名称的映射
type: comparison
span: 2
from: phases/19-capstone-projects/37-loading-pretrained-weights/docs/zh.md, phases/19-capstone-projects/37-loading-pretrained-weights/code/main.py

| 维度 | GPT-2 文件 | 本地模型 |
|---|---|---|
| token 嵌入 | `wte.weight` | `tok_embed.weight` |
| 位置嵌入 | `wpe.weight` | `pos_embed.weight` |
| LayerNorm 1 缩放 | `h.N.ln_1.weight` | `blocks.N.ln1.scale` |
| 融合 QKV，转置 | `h.N.attn.c_attn.weight` | `blocks.N.attn.qkv.weight` |
| 注意力输出，转置 | `h.N.attn.c_proj.weight` | `blocks.N.attn.out_proj.weight` |
| MLP fc1，转置 | `h.N.mlp.c_fc.weight` | `blocks.N.mlp.fc1.weight` |
| MLP fc2，转置 | `h.N.mlp.c_proj.weight` | `blocks.N.mlp.fc2.weight` |
| 最终 LayerNorm | `ln_f.weight`, `ln_f.bias` | `final_ln.scale`, `final_ln.shift` |

## 加载 safetensors 权重
type: annotated-code
lang: python
from: phases/19-capstone-projects/37-loading-pretrained-weights/code/main.py

```python
make_stub_safetensors(STUB_PATH, cfg, seed=42)  # 离线夹具
model = GPTModel(cfg)
report = load_safetensors(model, STUB_PATH, verbose=False)
report.summary()  # loaded= missing= unexpected= shape_mismatch=
report.ok()  # 无 missing，无 shape_mismatch
model.lm_head.weight.data_ptr() == model.tok_embed.weight.data_ptr()  # 权重共享
```

## 故障排查
type: troubleshooting
from: phases/19-capstone-projects/36-training-loop-eval/docs/zh.md, phases/19-capstone-projects/37-loading-pretrained-weights/docs/zh.md, phases/19-capstone-projects/44-cosine-lr-warmup/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 损失接近零，模型学不到东西 | 未移位一位 | 目标使用位置 1..T |
| LayerNorm 缩放趋于零 | 缩放参数施加了权重衰减 | 将缩放与偏置放入不衰减组 |
| 一个坏批次毁掉数小时训练 | 梯度巨大 | `step` 前执行 `clip_grad_norm_` |
| 加载前后采样相同 | 名称映射未匹配任何张量 | 阅读 `LoadReport` |
| 报告中出现 `shape_mismatch` | 维度与配置不同 | 加载器不赋值任何权重。修正配置 |
| 训练后期学习率差一步 | 三段调度拼接出错 | 用一个关于 `step` 的函数，测试边界 |

## 流水线评估门禁
type: defaults
from: phases/10-llms-from-scratch/13-building-complete-llm-pipeline/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `mmlu` | 65.0 | 至少达到此值 |
| `humaneval` | 40.0 | 至少达到此值 |
| `truthfulqa` | 50.0 | 至少达到此值 |
| `safety_refusal_rate` | 0.05 | 不超过此值 |
| `kl_from_reference` | 25.0 | 不超过此值 |
| `cost_total_usd` | 50000.0 | 不超过此值 |
| `budget_usd` | 50000.0 | 超预算时停止运行 |
| `seed` | 42 | 清单字段 |

## 问答
type: qa
from: phases/19-capstone-projects/37-loading-pretrained-weights/docs/zh.md, phases/19-capstone-projects/36-training-loop-eval/docs/zh.md, phases/19-capstone-projects/44-cosine-lr-warmup/docs/zh.md

- **加载时为何转置？** `c_attn`、`c_proj` 和 `c_fc` 使用 conv1d 布局。`nn.Linear` 需要其转置。
- **训练时为何打印样本？** 损失是标量。样本能暴露模型是否卡在一个 token 上。
- **为何只切片一次评估批次？** 相同批次让不同运行的评估损失可比较。
- **调度从哪里读取步数？** 从检查点的 `global_step` 读取，而非本地计数器。
