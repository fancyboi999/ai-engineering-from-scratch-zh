---
id: rl-custom-reward-take-home
title: 编写并严密验证 GRPO 自定义奖励函数
card: post-training
kind: take-home
level: 3
roles: [applied-ai-engineer, inference-engineer]
rounds: [take-home, coding]
tags: [grpo, reward-function, custom-reward, float32, miles]
minutes: 30
lessons: []
manuals: [miles-101#s-write-a-custom-reward, miles-101#s-how-rollout-functions-plug-in, miles-101#s-troubleshoot-by-symptom, miles-101#s-keep-runs-comparable]
practice: [grpo-advantages]
cheatsheet: [miles-rl]
related: [post-training/grpo-groups-teach-nothing]
updated: 2026-11-03
---

课后作业题：你所使用的强化学习训练框架支持通过动态 import 路径挂载自定义奖励函数，给每个采样回答打分。请为具有数值最终答案的任务编写一个自定义奖励函数、为其设计完整的测试方案，并解释在开展长期训练之前，你如何证明你的奖励函数绝不会破坏 GRPO 算法的优势值计算。代码与说明须精炼至 5 分钟内即可读完。

## Short answer

编写一个接收运行参数与单个样本对象的异步函数，分别从模型生成文本和真实标签中提取最后一个数值，若二者数值相等则返回 1.0，否则返回 0.0；比较数值而不是比较字符串，防止 142 误匹配 42。用十条手工打分的回答测试，涵盖正确、错误、空回答和达到长度上限被截断的回答，因为若奖励函数在空回答上抛出异常，会导致整个推演步骤停止。随后校验优势值：组内所有回答得分相同的组其每个样本的优势值必须严格为 0，而返回任意浮点小数由于 float32 精度舍入可能破坏该性质。

## Full answer

### 核心函数实现

```python
import re


def last_number(text):
    found = re.findall(r"-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?", text.replace(",", ""))
    return float(found[-1]) if found else None


async def custom_rm(args, sample, **kwargs):
    answer = last_number(sample.response)
    label = last_number(str(sample.label))
    return 1.0 if answer is not None and answer == label else 0.0
```

手册规定的三条规则：必须声明为 `async def`，因为框架在底层通过 await 异步调用，普通函数在首次调用时就会失败。函数接收运行参数和单条样本，其中模型回答在 `sample.response`，标准答案在 `sample.label`。如果返回字典，必须通过奖励键配置项显式指明包含奖励分数的字段名称；若开启了 group 标志，函数将以列表形式一次性接收整个组的所有样本并返回分数列表。

### 接入系统配置

将该 Python 模块保存在挂载的实验目录中，将该路径加入 `PYTHONPATH`，并通过命令行参数 `--custom-rm-path my_rewards.custom_rm` 传入。若导入成功，第一条 `rollout 0` 日志行就会打印出由你的函数计算的分数。若导入失败，日志会打印 `ModuleNotFoundError`，且训练进程不会自动退出。手册测试因此运行了两小时却没有完成一步；由于引擎只写了 44 行错误，看门狗未触发。应停止容器、修正模块路径后重新启动。

### 完整严密的测试方案

1. 在容器内部、调用任何 GPU 之前先做手工单样本测试：传入回答 "So the answer is 42." 与标签 "42"，必须断言返回 1.0。
2. 针对 10 个精心构造的边界样本执行断言测试：正确答案、错误答案、格式不同的正确答案、带千分位逗号的数字、完全为空的回答、没有任何数字的散文回答、因达到长度上限而被截断的回答、负数标签、小数标签，以及包含两个数字且最后一个正确的回答。
3. 挂载奖励函数执行一次两步冒烟测试：观察第 1 步的 `rollout/raw_reward`，抽查几条日志样本与手工打分核对。

### 严密验证优势值计算未被破坏

GRPO 从每个奖励中减去组均值，并除以组标准差。二元离散奖励能够产生精确的组均值，因此当组内所有回答得分相同时，每个成员的优势值分子精确为 0。但若采用连续浮点小数，float32 精度舍入可能带来隐患：例如在 float32 下 16 个 0.3 的均值并不完全等于 0.3，微小的舍入残差在除以接近 0 的极小标准差时，会被灾难性放大到每个样本约 0.029 的虚假非零优势值。若需引入部分得分，使用 float32 能精确表示的值，例如 0.25 的倍数，并且在长程运行前必须跑一组同分样本断言其优势值严格为 0。

### 选用最小接入 Hook

实现打分准则只需挂载奖励函数 Hook。组过滤器与文本生成逻辑完全沿用框架内置实现，批处理调度、指标统计以及概率差距检查都能继续为你正常工作。

## Follow-ups

- **Level 3:** 为什么提取出的数值必须以数值而非字符串比较？ Expected: 确保末尾多余的零或千分位逗号不会导致正确答案被误判，且防止 142 凭借子字符串包含关系错误匹配 42。
- **Level 3:** 若业务任务是自由文本问答，方案作何调整？ Expected: 调整提取逻辑；在适用时直接选用框架内置的重叠度或多项选择打分器，并沿用相同的十样本边界测试方案。
- **Level 4:** 框架内置的哪种奖励函数会为错误回答给出 -1 分，这对下游有什么影响？ Expected: DAPO 风格的奖励函数会返回包含分数的字典，因此需要配置奖励键参数；正负符号的改变影响的是整体均值，而不会破坏两值奖励在全等组下优势值恒为 0 的优良性质。
- **Level 4:** 在不重新调用大模型采样的前提下，如何快速测试奖励函数的变动？ Expected: 保存单次运行的采样推演离线样本，仅运行训练器做重放评估，让所有候选奖励函数在完全相同的固定样本上打分对比。

## Wrong answers

- "写成普通的同步函数，参数帮助文档里就是这么写的。" 框架底层通过 await 调度，同步函数在首次被调用时就会直接报错；必须声明为 async 异步函数。
- "为了给部分过程步骤打分，直接返回 0 到 1 之间的任意浮点小数即可。" float32 无法精确表示的浮点数会导致全同组的优势值不再为零，引发数值爆炸；必须量化到精确浮点数并做全同组验证。
- "忽略空回答的边界情况，大模型总归会吐出一些内容的。" 截断或空回答在训练的每一步都可能出现，若奖励函数在此处抛异常，会导致整个推演停止。

## Taught in

[Miles 101 第 3.5 节](../../../manuals/miles-101/sections/3-5-write-a-custom-reward.md)给出了代码模板、模块导入规范与 float32 优势值检查，而[第 8.5 节](../../../manuals/miles-101/sections/8-5-how-rollout-functions-plug-in.md)解释了为什么奖励 Hook 是此类需求的最轻量侵入点。
