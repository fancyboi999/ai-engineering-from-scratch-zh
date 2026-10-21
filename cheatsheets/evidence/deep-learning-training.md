# Evidence: cheatsheets/deep-learning-training.md
upstream_revision: 45fa4084de6ba2f88fa96a41e69efa2166f868b3

# 证据对照：神经网络训练

中文主题：[神经网络训练](../deep-learning-training.md)。下列逐条英文记录保留冻结上游版本的路径、行号与数值；标题对应中文主题。

原始记录中的 docs/en.md 和行号只在上述 upstream 版本有效，不代表当前 docs/zh.md 的行号，也不表示本次重新运行了命令、GPU 测量或外部模型。当前中文主题的 from 路径另由构建器校验。

Abbreviations: L03 = phases/03-deep-learning-core/03-backpropagation/docs/en.md, L06 = phases/03-deep-learning-core/06-optimizers/docs/en.md, L07 = phases/03-deep-learning-core/07-regularization/docs/en.md, L08 = phases/03-deep-learning-core/08-weight-initialization/docs/en.md, L09 = phases/03-deep-learning-core/09-learning-rate-schedules/docs/en.md, L13 = phases/03-deep-learning-core/13-debugging-neural-networks/docs/en.md.

## 一步 AdamW (architecture)

原始区块：One AdamW step (architecture, 8 nodes)
- Loss node, forward pass output: L06:417
- loss.backward() node: L06:418
- clip_grad_norm_ max_norm=1.0: L06:419, L06:458
- first moment m_t, mean, beta1 0.9: L06:85, L06:107
- second moment v_t, variance, beta2 0.999: L06:86, L06:107
- bias correction 1 - beta^t: L06:92-95, L06:455
- Adam update lr · m̂ / (√v̂ + ε): L06:103-104
- decoupled decay lr · λ · w, edge AdamW: L06:115-120

## 训练步骤 (flow)

原始区块：The training step (flow, 7)
- 1 zero_grad: L06:415
- 2 forward: L06:416
- 3 loss: L06:417
- 4 backward: L06:418
- 5 clip, optional: L06:419, L06:424
- 6 step: L06:420
- 7 scheduler.step() after optimizer.step(): L06:421, L06:424

## AdamW 与余弦调度训练循环 (annotated-code)

原始区块：Training loop with AdamW and cosine (annotated-code, 13 lines)
- AdamW lr=3e-4 weight_decay=0.01: L06:410
- CosineAnnealingLR T_max=100: L06:412
- loop body zero_grad, forward, cross_entropy, backward, clip, step, scheduler.step: L06:414-421
- get_cosine_schedule_with_warmup num_warmup_steps=2000 num_training_steps=100000, HuggingFace: L09:380-389 (arguments joined onto one line)

## 关键公式 (concepts)

原始区块：Key formulas (concepts, 8)
- chain rule: L03:29
- Adam moments: L06:85-86
- bias correction: L06:94-95
- AdamW update: L06:118
- cosine decay: L09:56
- linear warmup: L09:72
- Kaiming and Xavier variance: L08:62, L08:86
- inverted dropout during training: L07:58

## 按场景选择 (command-table)

原始区块：Pick by situation (command-table, 8)
- Transformer AdamW lr=1e-4 wd=0.01-0.1: L06:168
- CNN SGD + Momentum lr=0.1 momentum=0.9: L06:169
- GAN Adam lr=2e-4 beta1=0.5: L06:170
- Fine-tuning AdamW lr=2e-5 wd=0.01: L06:171
- not sure AdamW lr=3e-4 wd=0.01: L06:172
- sigmoid or tanh Xavier: L08:153
- ReLU, GELU, Swish Kaiming: L08:154-155
- transformer residual 1/sqrt(2N): L08:156

## 初始化、归一化与正则化代码 (task-table)

原始区块：Init, norm and regularization in code (task-table, 8)
- kaiming_normal_: L08:337
- xavier_uniform_: L08:333
- BatchNorm1d(256): L07:458
- LayerNorm(d_model): L07:484
- Dropout(0.3): L07:460
- CosineAnnealingLR T_max=1000 eta_min=1e-5: L09:373
- detect_anomaly: L13:610
- clip_grad_norm_ with float("inf") to measure: L13:632

## 优化器默认值 (defaults)

原始区块：Optimizer defaults (defaults, 8)
- Adam lr 0.001, change lr first: L06:107
- beta1 0.9, almost never change: L06:107
- beta2 0.999, change second: L06:107
- epsilon 1e-8: L06:107 (10^{-8}), L06:216 (epsilon=1e-8)
- AdamW weight_decay 0.01, not scaled by adaptive rate: L06:121, L06:246
- SGD momentum 0.9, last 10 gradients: L06:56, L06:426
- SGD weight decay 1e-4 on CNNs, step or cosine: L06:426
- clip max_norm 1.0: L06:419

## 正则化与调度默认值 (defaults)

原始区块：Regularization and schedule defaults (defaults, 8)
- dropout transformers 0.1: L07:65, L07:501
- dropout MLPs 0.5: L07:50, L07:65
- BatchNorm momentum 0.1, 90% old 10% new: L07:104, L07:258
- BatchNorm eps 1e-5: L07:258
- warmup share 3-5%: L09:392
- cosine floor eta_min 1e-5: L09:373
- step decay factor 0.1: L09:419
- log clamp eps 1e-7: L13:81

## 故障排查 (troubleshooting)

原始区块：Troubleshooting (8)
- loss stuck at -log(1/num_classes): L13:199
- loss NaN after a few steps, reduce lr 10x: L13:200
- loss NaN at once, log(0), clamp [eps, 1-eps]: L13:81, L13:201
- loss oscillates, zero_grad before backward: L13:186
- test accuracy varies, model.eval() and torch.no_grad(): L13:187
- train high test low, overfitting: L13:204
- gradients all zero, LeakyReLU, .requires_grad: L13:207
- early layers stop learning, sigmoid derivative 0.25: L03:87, L03:91; fix ReLU or GELU with Kaiming: L08:154-155

## 术语表 (glossary)

原始区块：Glossary (8)
- SGD: L06:450
- AdamW: L06:454
- BatchNorm across mini-batch: L07:95, L07:104
- LayerNorm per sample: L07:123
- RMSNorm: L07:129 (LayerNorm without the mean subtraction)
- 1cycle: L09:420
- SGDR: L09:407
- LR range test: L09:421

## 问答 (qa)

原始区块：Questions (5)
- AdamW vs Adam plus L2: L06:111-121
- warmup: L09:66-69
- bias correction 0.1 times gradient: L06:90
- LayerNorm in transformers: L07:123
- Kaiming for ReLU, 2/fan_in: L08:372, L08:154

## 提示 (tips)

原始区块：Tips (6)
- overfit-one-batch, loss near zero: L13:151
- 3 learning rates 10x apart: L13:57
- tune the learning rate: L06:142
- print shapes after every operation: L13:188
- gradient sizes similar across layers: L13:131
- .to(device) on model and data: L13:189
