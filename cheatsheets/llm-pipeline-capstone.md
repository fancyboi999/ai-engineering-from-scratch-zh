---
id: llm-pipeline-capstone
title: 端到端 LLM 与微调流水线
code: EE
subtitle: 规划、运行并验证带 hash 的阶段 DAG。包含综合项目中的分类头替换、SFT 损失掩码、DPO 损失和默认值。
hue: 215
sources: phases/10-llms-from-scratch/13-building-complete-llm-pipeline, phases/19-capstone-projects/07-end-to-end-fine-tuning-pipeline, phases/19-capstone-projects/38-classifier-finetuning, phases/19-capstone-projects/39-instruction-tuning-sft, phases/19-capstone-projects/40-dpo-from-scratch
source_hash: b9861d57c6dabca2
---

## 命令
type: command-table
from: phases/10-llms-from-scratch/13-building-complete-llm-pipeline/docs/zh.md, phases/10-llms-from-scratch/13-building-complete-llm-pipeline/code/main.py, phases/19-capstone-projects/07-end-to-end-fine-tuning-pipeline/docs/zh.md, phases/19-capstone-projects/07-end-to-end-fine-tuning-pipeline/code/main.py, phases/19-capstone-projects/38-classifier-finetuning/code/main.py, phases/19-capstone-projects/39-instruction-tuning-sft/code/main.py, phases/19-capstone-projects/40-dpo-from-scratch/code/main.py

| 命令 | 作用 |
|---|---|
| `python code/main.py plan` | 校验清单，打印 DAG 和门禁 |
| `python code/main.py run` | 运行各阶段，打印清单 JSON |
| `python code/main.py gate` | 应用评估门禁，打印 `SHIP` 或 `HOLD` |
| `python code/main.py` | 演示规划、运行，以及通过和失败的门禁 |
| `./pipeline.sh config/llama3.3-8b-domainX.yaml` | 综合项目 07：从数据到模型卡 |
| `run_demo()` | 综合项目 38 至 40，成功时以零退出 |

## 十二阶段 DAG
type: architecture
span: 2
from: phases/10-llms-from-scratch/13-building-complete-llm-pipeline/docs/zh.md, phases/10-llms-from-scratch/13-building-complete-llm-pipeline/code/main.py

```arch
node | tok | 1,1 | 01-02 分词器 | 词表、合并规则 | store
node | data | 2,1 | 03 数据集 | 已分片 | store
node | base | 3,1 | 04-05 检查点 | 预训练、扩展 | gpu
node | sft | 4,1 | 06 SFT 模型 | 检查点 + 训练配置 | gpu
node | ppo | 4,2 | 07 奖励 + PPO | 策略 | gpu
node | dpo | 3,2 | 08 DPO | 策略 | gpu
node | cai | 2,2 | 09 CAI / GRPO | 改进后的策略 | gpu
node | eval | 1,2 | 10 评估报告 | 分数、差异 | process
node | quant | 2,3 | 11 量化模型 | 权重 + 增量 | store
node | srv | 3,3 | 12 服务规格 | 端点 | process
node | gate | 1,3 | 交付门禁 | SHIP 或 HOLD | client
edge | tok | data |
edge | data | base |
edge | base | sft |
edge | sft | ppo |
edge | sft | dpo |
edge | ppo | cai |
edge | dpo | cai |
edge | cai | eval |
edge | cai | quant |
edge | quant | srv |
edge | eval | gate |
edge | srv | gate |
```

## 编排器的行为
type: flow
from: phases/10-llms-from-scratch/13-building-complete-llm-pipeline/docs/zh.md, phases/10-llms-from-scratch/13-building-complete-llm-pipeline/code/main.py

1. **编排器**：根据清单解析 DAG。
2. **编排器**：输出已存在且 hash 正确时跳过该阶段。
3. **阶段**：执行。编排器测量实际耗时和成本。
4. **编排器**：将输出 hash 与下一阶段输入 hash 核对。
5. **CostTracker**：总成本超过预算时，以 `halted_over_budget` 停止。
6. **失败时**：写入部分清单，以非零状态退出。

## 清单与门禁
type: annotated-code
lang: yaml
from: phases/10-llms-from-scratch/13-building-complete-llm-pipeline/docs/zh.md

```yaml
pipeline_version: 1.2.3
seed: 42
git_commit: a1b2c3d4
stages:
  01_tokenizer:
    input_hash: sha256:...  # 前一阶段的输出 hash
    output_hash: sha256:...  # 下一阶段的输入 hash
gates:
  mmlu:      >= baseline + 0.5   # 不得回退
  humaneval: >= baseline + 1.0
  safety_refusal_rate: <= 0.05
  kl_from_reference: <= 25.0  # KL 预算门禁
  cost_total_usd: <= 50000
```

## main.py 中的门禁默认值
type: defaults
from: phases/10-llms-from-scratch/13-building-complete-llm-pipeline/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `mmlu` | 65.0 | 运算符 `>=` |
| `humaneval` | 40.0 | 运算符 `>=` |
| `truthfulqa` | 50.0 | 运算符 `>=` |
| `safety_refusal_rate` | 0.05 | 运算符 `<=` |
| `kl_from_reference` | 25.0 | 运算符 `<=` |
| `cost_total_usd` | 50000.0 | 运算符 `<=` |
| `budget_usd` | 50000.0 | 超过此值则停止运行 |
| `seed` | 42 | 位于 `Manifest` 中 |

## 三个综合项目对比
type: comparison
span: 2
from: phases/19-capstone-projects/38-classifier-finetuning, phases/19-capstone-projects/39-instruction-tuning-sft, phases/19-capstone-projects/40-dpo-from-scratch

| 维度 | 38 分类头替换 | 39 指令 SFT | 40 DPO |
|---|---|---|---|
| 构建内容 | 主体 + 均值池化 + 二分类头 | 在回复 token 上训练的 `TinyGPT` | 相对冻结参考模型优化策略 |
| 数据 | 800 条短信，640 训练、160 测试 | 200 对，160 训练、40 测试 | 12 个 (prompt, chosen, rejected) 三元组 |
| 模型 | 隐层 64、4 头、2 块、最长 32 | 隐层 96、2 块 | 隐层 64、2 块 |
| 训练 | 仅头部 20 epoch，全量 20 epoch | 20 epoch，lr 5e-4 | 30 epoch，beta 0.2，lr 1e-3 |
| 指标 | 精确率、召回率、F1、混淆矩阵 | 各类别的精确匹配率 | 选中与拒绝回复的分数差 |
| 检查 | 仅头部与全量均报告结果 | 精确匹配率随 epoch 上升 | 损失下降、分数差增大 |

## 综合项目中的关键调用
type: task-table
span: 2
from: phases/19-capstone-projects/38-classifier-finetuning/code/main.py, phases/19-capstone-projects/39-instruction-tuning-sft/code/main.py, phases/19-capstone-projects/40-dpo-from-scratch/code/main.py

| 任务 | 代码 |
|---|---|
| 冻结主体，仅训练头部 | `freeze_body(model)` |
| 使用掩码池化隐状态 | `mean_pool(h, mask)` |
| 批量填充，用 -100 遮蔽标签 | `sft_collate(batch)` |
| 回复 token 上的因果损失 | `shifted_loss(logits, labels)` |
| 计算模型下回复的分数 | `sequence_log_prob(...)` |
| DPO 损失与隐式奖励差 | `dpo_loss(lp_w_pol, lp_l_pol, lp_w_ref, lp_l_ref, beta=cfg.beta)` |
| 用参考模型初始化策略 | `policy.load_state_dict(reference.state_dict())` |

## DPO 损失
type: annotated-code
lang: python
from: phases/19-capstone-projects/40-dpo-from-scratch/code/main.py

```python
diff_w = logp_w_pol - logp_w_ref  # 选中回复的对数比
diff_l = logp_l_pol - logp_l_ref  # 拒绝回复的对数比
margin = diff_w - diff_l  # 隐式奖励差
z = beta * margin
loss = -F.logsigmoid(z)  # 数值稳定
for p in reference.parameters():
    p.requires_grad = False  # 参考模型始终不训练
reference.eval()
```

## 综合项目 07 日志行
type: command-table
from: phases/19-capstone-projects/07-end-to-end-fine-tuning-pipeline/docs/zh.md

| 命令 | 作用 |
|---|---|
| `280k accepted (seed=7)` | 数据阶段保留的行数 |
| `val loss 1.42 -> 1.03` | SFT，在 8xH100 上训练 3 epoch |
| `1 epoch, beta=0.08, 4xH100` | DPO 运行 |
| `GPTQ-INT4 4.6 GB, AWQ-INT4 4.8 GB` | 量化大小 |
| `EAGLE-3 acceptance 0.74` | 推测解码检查 |
| `p99 126ms @ bs=8` | 批量为 8 时的尾延迟 |
| `MMLU-Pro +3.2, MT-Bench-v2 +0.41` | 相对基础模型的评估收益 |

## 故障排查
type: troubleshooting
from: phases/10-llms-from-scratch/13-building-complete-llm-pipeline/docs/zh.md, phases/10-llms-from-scratch/13-building-complete-llm-pipeline/code/main.py, phases/19-capstone-projects/39-instruction-tuning-sft/docs/zh.md, phases/19-capstone-projects/38-classifier-finetuning/docs/zh.md, phases/19-capstone-projects/40-dpo-from-scratch/docs/zh.md, phases/19-capstone-projects/07-end-to-end-fine-tuning-pipeline/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `HOLD: missing metric <metric>` | 评估报告缺少数值 | 向评估阶段添加该指标 |
| `input hash missing for stage` | 存储中没有上游产物 | 重跑上游阶段 |
| `halted_over_budget` | 总成本超过 `budget_usd` | 规划时修正成本估算 |
| DPO 模型进入 SFT 路径 | 产物无类型 | 使用类型化产物和阶段签名 |
| 模型学会预测指令 | 无损失掩码 | 指令、填充、边界处设为 `-100` |
| 全量微调对 800 个样本过拟合 | 小数据破坏主体能力 | 只训练头部 |
| MMLU-Pro 准确率突增 | 训练数据污染 | MinHash 检查，拒绝任何重叠 |
| DPO 偏好短回复 | 长度偏差 | 将对数概率除以回复长度 |

## 回滚与提示
type: tips
from: phases/10-llms-from-scratch/13-building-complete-llm-pipeline/docs/zh.md, phases/19-capstone-projects/40-dpo-from-scratch/docs/zh.md

- 每次先运行 `plan`。它免费，`run` 成本高。
- 重跑成本低：分词器、评估、量化、推理服务。
- 成本中等：SFT、DPO、CAI。保留基础模型。
- 成本高：预训练。使用最后一个良好检查点。
- 阶段 06 失败会使 06 至 12 失效。阶段 11 失败只影响 11 和 12。
- 用 hash 定位产物。`latest.pt` 这样的文件名容易引发误操作。
- 预训练 FLOPs：6 x params x tokens。

## 问答
type: qa
from: phases/10-llms-from-scratch/13-building-complete-llm-pipeline/docs/zh.md, phases/19-capstone-projects/40-dpo-from-scratch/docs/zh.md, phases/19-capstone-projects/39-instruction-tuning-sft/docs/zh.md

- **哪两个门禁能拦住多数灾难？** 回归门禁和 KL 预算门禁。
- **是可复现还是确定性？** 可复现。浮点数会在 1e-5 级别产生差异。
- **DPO 中 log Z(x) 为何消掉？** 选中与拒绝回复的这一项相同。
- **精确匹配为何使用贪心解码？** 温度会让指标随机变化。
