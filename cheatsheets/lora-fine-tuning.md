---
id: lora-fine-tuning
title: 使用 LoRA 微调
subtitle: 添加 LoRA 适配器、为 QLoRA 加载 4 位基座、遮蔽 SFT 标签、训练、合并与调试。使用 PyTorch、PEFT 和 bitsandbytes。
hue: 310
sources: phases/11-llm-engineering/08-fine-tuning-lora, phases/10-llms-from-scratch/06-instruction-tuning-sft, phases/19-capstone-projects/38-classifier-finetuning, phases/19-capstone-projects/39-instruction-tuning-sft
code: FT
source_hash: 69905774bb399a14
---

## 任务
type: task-table
from: phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md, phases/19-capstone-projects/39-instruction-tuning-sft/code/main.py, phases/19-capstone-projects/38-classifier-finetuning/code/main.py

| 任务 | 代码 |
|---|---|
| 为模型添加 LoRA | `model = get_peft_model(model, lora_config)` |
| 显示可训练参数比例 | `model.print_trainable_parameters()` |
| 以 4 位加载基座 | `BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4")` |
| 统计可训练参数 | `count_parameters(model)` |
| 仅保存适配器 | `model.save_pretrained("./lora-adapter")` |
| 将适配器合并到 W | `merge_lora_weights(model)` |
| 损失忽略被遮蔽标签 | `F.cross_entropy(..., ignore_index=ignore_index)` |
| 仅训练输出头 | `freeze_body(model)` |

## 单层中的 LoRA 路径
type: architecture
from: phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md

```arch
node | x | 1,1 | 输入 x |
node | w | 2,1 | 冻结 W | out x in
node | a | 2,2 | A | r x in，高斯初始化
node | b | 3,2 | B | out x r，零初始化
node | s | 4,2 | 缩放 | alpha / r
node | add | 4,1 | 相加 | Wx + 缩放后的 BAx
node | y | 5,1 | 输出 y |
node | m | 5,2 | 合并后的 W' | W + (alpha/r) BA
edge | x | w |
edge | x | a |
edge | a | b |
edge | b | s |
edge | w | add |
edge | s | add |
edge | add | y |
edge | s | m | 合并
```

## 从零实现 LoRA
type: annotated-code
lang: python
from: phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md, phases/11-llm-engineering/08-fine-tuning-lora/code/lora.py

```python
class LoRALayer(nn.Module):
    def __init__(self, in_features, out_features, rank=8, alpha=16):
        super().__init__()
        self.scaling = alpha / rank  # alpha / r
        self.A = nn.Parameter(torch.randn(in_features, rank) * (1 / math.sqrt(rank)))
        self.B = nn.Parameter(torch.zeros(rank, out_features))  # BA 初始为零
    def forward(self, x):
        return (x @ self.A @ self.B) * self.scaling  # 缩放的低秩更新

class LinearWithLoRA(nn.Module):
    # __init__ 包装 linear 并构建 self.lora
        for param in self.linear.parameters():
            param.requires_grad = False  # 冻结 W
    def forward(self, x):
        return self.linear(x) + self.lora(x)  # Wx 加缩放后的 BAx
```

## 使用 PEFT 的 QLoRA
type: annotated-code
lang: python
from: phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md

```python
bnb_config = BitsAndBytesConfig(load_in_4bit=True,  # 4 位基座
    bnb_4bit_quant_type="nf4",  # NF4 量化级别
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True)  # 同时量化缩放因子
model = AutoModelForCausalLM.from_pretrained("<model>",
    quantization_config=bnb_config, device_map="auto")
lora_config = LoraConfig(task_type=TaskType.CAUSAL_LM, r=16,
    lora_alpha=32, lora_dropout=0.05,
    target_modules=["q_proj", "v_proj"])  # 查询与值
model = get_peft_model(model, lora_config)  # 添加 A 与 B
model.save_pretrained("./lora-adapter")  # 10-100MB 的适配器
```

## 一次 SFT 训练步骤
type: flow
from: phases/19-capstone-projects/39-instruction-tuning-sft/docs/zh.md, phases/19-capstone-projects/39-instruction-tuning-sft/code/main.py

1. **模板**：每对样本转为 `<INST> instruction <RESP> response`。
2. **分词**：使用字节标识以及 `INST_ID = 256`、`RESP_ID = 257`、`PAD_ID = 258`。
3. **组批**：`sft_collate` 将每批填充到其中最长序列的长度。
4. **遮蔽**：指令、填充和边界的标签设为 `-100`。
5. **前向传播**：模型看到包含指令在内的完整序列。
6. **损失**：`shifted_loss` 预测位置 i+1，设置 `ignore_index=-100`。
7. **更新**：Adam 更新主体，每五个 epoch 运行一次精确匹配评估。

## 关键公式
type: concepts
from: phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md, phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md

- **LoRA 前向传播**：冻结 $W$，$y = Wx + BAx$。
- **缩放更新**：$y = Wx + \frac{\alpha}{r} \cdot BAx$
- **参数量**：秩为 $r$ 时训练 $2 \cdot r \cdot d$ 个参数，而非 $d^2$。
- **示例**：4096x4096 权重上 $r=16$，训练 16,777,216 个参数中的 131,072 个，即 0.78%。
- **合并**：$W' = W + (\alpha/r) \cdot BA$，尺寸不变，无额外推理开销。
- **全量微调内存**：8B 的 fp16 模型，加上梯度与 Adam 状态约需 56GB。

## 默认值
type: defaults
from: phases/11-llm-engineering/08-fine-tuning-lora/outputs/skill-fine-tuning-guide.md, phases/11-llm-engineering/08-fine-tuning-lora/outputs/prompt-lora-advisor.md, phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md, phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| r | 16 | 多数任务的稳妥起点 |
| lora_alpha | 32 | 秩的 2 倍，alpha = rank 较保守 |
| lora_dropout | 0.05 | 样例少于 5K 时用 0.1 |
| target_modules | q_proj, v_proj | 质量不足时再扩展 |
| QLoRA 学习率 | 2e-4 | 高于全量微调 |
| LoRA fp16 学习率 | 5e-5 | |
| 全量 SFT 学习率 | 2e-5 | Llama 2 Chat，比预训练低 15 倍 |
| Epoch 数 | 1-3 | 更多轮数增加过拟合风险 |

## 故障排查
type: troubleshooting
from: phases/11-llm-engineering/08-fine-tuning-lora/outputs/skill-fine-tuning-guide.md, phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md, phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md, phases/19-capstone-projects/39-instruction-tuning-sft/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| Llama 模型损失为 NaN | 未设置填充 token | 设置填充 token |
| 损失不下降 | LoRA 学习率过低 | 尝试 2e-4 |
| 损失下降，评估质量差 | 过拟合 | 更少 epoch、更多 dropout 与数据 |
| 复杂任务表现弱 | 秩过低或目标层不合适 | 尝试 r=32 或加入 MLP 层 |
| SFT 后通用能力下降 | 学习率过高 | 使用 1e-5 至 5e-5，训练 1-3 个 epoch |
| 模型预测指令本身 | 缺少损失遮蔽 | 将指令与填充标签设为 `-100` |
| 长序列导致 OOM | 优化器状态超过显存 | 使用 `optim="paged_adamw_8bit"` |

## 缩略语
type: glossary
from: phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md, phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md

- **LoRA**：低秩适配，冻结 W，训练 A 与 B。
- **QLoRA**：量化 LoRA，4 位 NF4 基座搭配 fp16 适配器。
- **NF4**：Normal Float 4，在正态分位点设置 16 个量化级别。
- **PEFT**：Hugging Face 的 LoRA、QLoRA、DoRA 和 IA3 库。
- **TRL**：Hugging Face 的 SFT、DPO、GRPO、PPO 和 ORPO 训练器。
- **SFT**：在指令与响应对上执行监督微调。
- **ChatML**：使用 `<|im_start|>` 和 `<|im_end|>` token 的角色格式。
- **双重量化**：将每块缩放因子量化为 fp8。

## 问答
type: qa
from: phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md, phases/19-capstone-projects/39-instruction-tuning-sft/docs/zh.md, phases/11-llm-engineering/08-fine-tuning-lora/outputs/skill-fine-tuning-guide.md

- **B 为何零初始化？** BA 初始为零，使训练从原模型行为开始。
- **alpha 做什么？** 在基础学习率之外，按 alpha / r 缩放更新。
- **合并还是分开保留？** 多任务服务分开保留，单模型服务可合并。
- **为何遮蔽指令？** 不遮蔽时模型会学习预测指令，响应信号的占比变小。
- **何时不该微调？** prompt 已有效、需要事实知识时用 RAG，或样例少于 500 时。

## 提示
type: tips
from: phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md, phases/11-llm-engineering/08-fine-tuning-lora/outputs/skill-fine-tuning-guide.md, phases/19-capstone-projects/38-classifier-finetuning/docs/zh.md, phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md

- 先尝试 prompt 工程，再 RAG，最后微调。
- 每 100 步在留出集上评估，保留最佳检查点。
- 用至少 200 个留出样例比较基座加 prompt 与基座加 LoRA。
- 仅有 800 个样例时，冻结主体，只训练输出头。
- 跟踪原始文本损失，增加超过 10-15% 表示 SFT 过于激进。

## 选择方法
type: command-table
from: phases/11-llm-engineering/08-fine-tuning-lora/outputs/prompt-lora-advisor.md, phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md

| 选择 | 适用条件 |
|---|---|
| 全量微调，7B 约需 56GB | 显存 >= fp16 模型大小的 2 倍 |
| fp16 基座上的 LoRA，约 18GB | 显存 >= fp16 模型大小 |
| 4 位基座上的 QLoRA，约 6GB | 显存 >= 模型大小 / 4 |
| `r=16` | 多领域任务、指令遵循、对话 |
| `r=32` | 代码生成、复杂推理、数学 |
