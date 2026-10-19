# 证据对照：使用 LoRA 微调

中文主题：[使用 LoRA 微调](../lora-fine-tuning.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## 任务

对应主题区块：**任务**（`task-table`）。

来源文件：

- [`phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md)
- [`phases/19-capstone-projects/39-instruction-tuning-sft/code/main.py`](../../phases/19-capstone-projects/39-instruction-tuning-sft/code/main.py)
- [`phases/19-capstone-projects/38-classifier-finetuning/code/main.py`](../../phases/19-capstone-projects/38-classifier-finetuning/code/main.py)

构建器核对的标识与数值：

- `get_peft_model`
- `lora_config`
- `model.print_trainable_parameters`
- `print_trainable_parameters`
- `load_in_4bit`
- `bnb_4bit_quant_type`
- `BitsAndBytesConfig`
- `count_parameters`
- `model.save_pretrained`
- `save_pretrained`
- `merge_lora_weights`
- `F.cross_entropy`
- `cross_entropy`
- `ignore_index`
- `freeze_body`

## 单层中的 LoRA 路径

对应主题区块：**单层中的 LoRA 路径**（`architecture`）。

来源文件：

- [`phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 从零实现 LoRA

对应主题区块：**从零实现 LoRA**（`annotated-code`）。

来源文件：

- [`phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md)
- [`phases/11-llm-engineering/08-fine-tuning-lora/code/lora.py`](../../phases/11-llm-engineering/08-fine-tuning-lora/code/lora.py)

构建器核对的标识与数值：

- `nn.Module`
- `LoRALayer`
- `in_features`
- `out_features`
- `__init__`
- `super`
- `self.scaling`
- `self.A`
- `nn.Parameter`
- `torch.randn`
- `math.sqrt`
- `Parameter`
- `randn`
- `sqrt`
- `self.B`
- `torch.zeros`
- `zeros`
- `forward`
- `LinearWithLoRA`
- `self.linear.parameters`
- `parameters`
- `param.requires_grad`
- `requires_grad`
- `self.linear`
- `self.lora`
- `linear`
- `lora`

## 使用 PEFT 的 QLoRA

对应主题区块：**使用 PEFT 的 QLoRA**（`annotated-code`）。

来源文件：

- [`phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md)

构建器核对的标识与数值：

- `bnb_config`
- `load_in_4bit`
- `BitsAndBytesConfig`
- `bnb_4bit_quant_type`
- `torch.bfloat16`
- `bnb_4bit_compute_dtype`
- `bnb_4bit_use_double_quant`
- `AutoModelForCausalLM.from_pretrained`
- `from_pretrained`
- `quantization_config`
- `device_map`
- `TaskType.CAUSAL_LM`
- `lora_config`
- `task_type`
- `CAUSAL_LM`
- `LoraConfig`
- `lora_alpha`
- `lora_dropout`
- `target_modules`
- `q_proj`
- `v_proj`
- `get_peft_model`
- `model.save_pretrained`
- `save_pretrained`

## 一次 SFT 训练步骤

对应主题区块：**一次 SFT 训练步骤**（`flow`）。

来源文件：

- [`phases/19-capstone-projects/39-instruction-tuning-sft/docs/zh.md`](../../phases/19-capstone-projects/39-instruction-tuning-sft/docs/zh.md)
- [`phases/19-capstone-projects/39-instruction-tuning-sft/code/main.py`](../../phases/19-capstone-projects/39-instruction-tuning-sft/code/main.py)

构建器核对的标识与数值：

- `INST_ID`
- `RESP_ID`
- `PAD_ID`
- `sft_collate`
- `shifted_loss`
- `ignore_index`

## 关键公式

对应主题区块：**关键公式**（`concepts`）。

来源文件：

- [`phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md)
- [`phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md`](../../phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 默认值

对应主题区块：**默认值**（`defaults`）。

来源文件：

- [`phases/11-llm-engineering/08-fine-tuning-lora/outputs/skill-fine-tuning-guide.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/outputs/skill-fine-tuning-guide.md)
- [`phases/11-llm-engineering/08-fine-tuning-lora/outputs/prompt-lora-advisor.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/outputs/prompt-lora-advisor.md)
- [`phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md)
- [`phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md`](../../phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md)

构建器核对的标识与数值：

- `16`
- `32`
- `0.05`
- `q_proj, v_proj`
- `2e-4`
- `5e-5`
- `2e-5`
- `1-3`

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`phases/11-llm-engineering/08-fine-tuning-lora/outputs/skill-fine-tuning-guide.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/outputs/skill-fine-tuning-guide.md)
- [`phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md)
- [`phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md`](../../phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md)
- [`phases/19-capstone-projects/39-instruction-tuning-sft/docs/zh.md`](../../phases/19-capstone-projects/39-instruction-tuning-sft/docs/zh.md)

构建器核对的标识与数值：

- `paged_adamw_8bit`

## 缩略语

对应主题区块：**缩略语**（`glossary`）。

来源文件：

- [`phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md)
- [`phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md`](../../phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md)

构建器核对的标识与数值：

- `im_start`
- `im_end`

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md)
- [`phases/19-capstone-projects/39-instruction-tuning-sft/docs/zh.md`](../../phases/19-capstone-projects/39-instruction-tuning-sft/docs/zh.md)
- [`phases/11-llm-engineering/08-fine-tuning-lora/outputs/skill-fine-tuning-guide.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/outputs/skill-fine-tuning-guide.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md)
- [`phases/11-llm-engineering/08-fine-tuning-lora/outputs/skill-fine-tuning-guide.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/outputs/skill-fine-tuning-guide.md)
- [`phases/19-capstone-projects/38-classifier-finetuning/docs/zh.md`](../../phases/19-capstone-projects/38-classifier-finetuning/docs/zh.md)
- [`phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md`](../../phases/10-llms-from-scratch/06-instruction-tuning-sft/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 选择方法

对应主题区块：**选择方法**（`command-table`）。

来源文件：

- [`phases/11-llm-engineering/08-fine-tuning-lora/outputs/prompt-lora-advisor.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/outputs/prompt-lora-advisor.md)
- [`phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md`](../../phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: lora-fine-tuning

L08 = phases/11-llm-engineering/08-fine-tuning-lora, ADV = L08/outputs/prompt-lora-advisor.md, SKILL = L08/outputs/skill-fine-tuning-guide.md, SFT = phases/10-llms-from-scratch/06-instruction-tuning-sft, C38 = phases/19-capstone-projects/38-classifier-finetuning, C39 = phases/19-capstone-projects/39-instruction-tuning-sft

## Tasks (task-table, 8)
- get_peft_model(model, lora_config): L08/docs/en.md:449
- model.print_trainable_parameters(): L08/docs/en.md:450
- BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4"): L08/docs/en.md:458-460
- count_parameters(model): L08/docs/en.md:297-306; L08/code/lora.py:55
- model.save_pretrained("./lora-adapter"): L08/docs/en.md:504
- merge_lora_weights(model): L08/docs/en.md:312, 417
- F.cross_entropy(..., ignore_index=ignore_index): C39/code/main.py:439-443
- freeze_body(model): C38/code/main.py:173-179; C38/docs/en.md:122

## LoRA path in one layer (architecture, 8 nodes)
- Input x, Frozen W, A, B, merge into output: L08/docs/en.md:61-68
- W is out x in: L08/docs/en.md:44
- A r x in, Gaussian init: L08/docs/en.md:52, 75
- B out x r, zero init: L08/docs/en.md:52, 75
- Scale alpha / r: L08/docs/en.md:79-82
- Add Wx + scaled BAx: L08/docs/en.md:82
- Merged W' = W + (alpha/r) BA: L08/docs/en.md:186

## LoRA from scratch (annotated-code, 13 lines)
- LoRALayer, __init__, scaling, A, B, forward: L08/docs/en.md:236-247; L08/code/lora.py:6-17
- LinearWithLoRA freeze loop and forward: L08/docs/en.md:255-267; L08/code/lora.py:20-29
- comment "BA starts at zero": L08/docs/en.md:250. "freeze W": L08/docs/en.md:270
- the __init__ body of LinearWithLoRA is summarized in one comment line (L08/docs/en.md:256-261)

## QLoRA with PEFT (annotated-code, 11 lines)
- BitsAndBytesConfig 4 fields: L08/docs/en.md:458-463
- from_pretrained with quantization_config, device_map="auto": L08/docs/en.md:465-469 (model name replaced by <model>)
- LoraConfig task_type, r=16, lora_alpha=32, lora_dropout=0.05, target_modules: L08/docs/en.md:441-447
- get_peft_model: L08/docs/en.md:449, 471
- save_pretrained, 10-100MB: L08/docs/en.md:504, 507
- double quant meaning: L08/docs/en.md:136. query and value: L08/docs/en.md:103

## One SFT training step (flow, 7)
1. template <INST> ... <RESP> ...: C39/docs/en.md:22-25
2. INST_ID 256, RESP_ID 257, PAD_ID 258: C39/docs/en.md:67-69; C39/code/main.py:40-42
3. sft_collate pads to longest: C39/docs/en.md:74, 133; C39/code/main.py:397-410
4. -100 on instruction, padding, boundary: C39/docs/en.md:75-78; C39/code/main.py:414-420
5. model sees full sequence: C39/docs/en.md:46
6. shifted_loss, i predicts i+1, ignore_index=-100: C39/docs/en.md:40, 89; C39/code/main.py:432-443
7. Adam, exact-match every fifth epoch: C39/docs/en.md:103, 105

## Key formulas (concepts, 6)
- y = Wx + BAx, W frozen: L08/docs/en.md:46-49
- scaled update: L08/docs/en.md:82
- 2 · r · d instead of d^2: L08/docs/en.md:14
- r=16 on 4096x4096, 131,072 of 16,777,216, 0.78%: L08/docs/en.md:54-57
- merge W' = W + (alpha/r) · BA, no overhead: L08/docs/en.md:186
- 8B fp16 about 56GB: L08/docs/en.md:22

## Defaults (8)
- r 16: SKILL:51
- lora_alpha 32, 2 x rank, alpha = rank conservative: SKILL:51; ADV:35-36; L08/docs/en.md:444
- lora_dropout 0.05, 0.1 below 5K: SKILL:54; ADV:56-57
- target_modules q_proj, v_proj: ADV:40, 43
- QLoRA lr 2e-4: SKILL:53; ADV:46
- LoRA fp16 lr 5e-5: SKILL:53
- full SFT lr 2e-5, 15x lower: SFT/docs/en.md:125, 132
- epochs 1-3: SKILL:55

## Troubleshooting (7)
- NaN losses, pad token: SKILL:63
- loss not decreasing, try 2e-4: SKILL:88
- overfitting fix: SKILL:95
- rank too low or wrong targets: SKILL:96-97
- general skills drop, 1e-5 to 5e-5, 1-3 epochs: SFT/docs/en.md:138, 142, 144
- model predicts instruction without mask: C39/docs/en.md:142; fix C39/docs/en.md:75-77
- OOM, paged optimizer, paged_adamw_8bit: L08/docs/en.md:138, 493

## Abbreviations (8)
- LoRA: L08/docs/en.md:531
- QLoRA: L08/docs/en.md:532
- NF4 16 levels at quantiles: L08/docs/en.md:134, 535
- PEFT: L08/docs/en.md:171
- TRL: L08/docs/en.md:172
- SFT: SFT/docs/en.md:589
- ChatML: SFT/docs/en.md:82-90
- Double quantization to fp8: L08/docs/en.md:136

## Questions (5)
- B zero at init: L08/docs/en.md:75, 250
- alpha scales update: L08/docs/en.md:85
- merge or separate: L08/docs/en.md:184-188
- mask the instruction: C39/docs/en.md:142
- when not to fine-tune: L08/docs/en.md:198-204; SKILL:34-36

## Tips (5)
- prompt, then RAG, then fine-tune: L08/docs/en.md:198-204
- evaluate every 100 steps, best checkpoint by eval loss: SKILL:56-57
- compare base plus prompt vs base plus LoRA on 200+: SKILL:70-72
- head only on 800 examples: C38/docs/en.md:131
- raw text loss rise above 10-15%: SFT/docs/en.md:477

## Choose a method (command-table, 5)
- full fine-tune ~56GB, VRAM >= 2x model size: L08/docs/en.md:128; ADV:22
- LoRA fp16 base ~18GB, VRAM >= model size: L08/docs/en.md:129; ADV:23
- QLoRA 4-bit ~6GB, VRAM >= model size / 4: L08/docs/en.md:130; ADV:24
- r=16 multi-domain, instruction following, chat: ADV:30
- r=32 code generation, complex reasoning, math: ADV:31
````
