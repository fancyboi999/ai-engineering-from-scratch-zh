---
name: lm-eval-harness
description: 极简的语言模型评估 harness，包含 JSONL 任务规范、五种指标、可替换的适配器，以及排行榜 JSON 输出。
version: 1.0.0
phase: 19
lesson: 49
tags: [evaluation, metrics, leaderboard, harness]
---

## 适用场景

在一组固定任务上对比两个模型、两个 checkpoint 或两个 prompt 模板。凡是要上线、需要长期监控的东西都适用。

## 任务规范

每个样例占一行 JSONL：

```json
{"id": "ex-001", "prompt": "...", "targets": ["..."], "metric": "exact_match", "extras": {}}
```

同一个文件里的所有样例共用一个指标。文件名就是任务名。

## 指标

| 指标 | 判定方式 | 适用于 |
|--------|-----------|---------|
| exact_match | 规范化为小写并处理空白后判断是否相等 | 算术、事实类答案 |
| substring_contains | 目标必须出现在规范化后的预测中 | 带锚点词的自由生成 |
| multiple_choice | 首字母匹配 | A/B/C/D 式选择题 |
| rouge_l | 分词后基于 LCS 的 F1 | 摘要、改写 |
| code_exec | 在 io_pairs 上运行预测中的 `f`，统计匹配数 | 代码生成 |

所有指标都返回 [0.0, 1.0] 内的 float。任务分数取平均值。

## 适配器

```python
class Adapter(Protocol):
    name: str
    def generate(self, prompts: list[str]) -> list[str]: ...
```

适配器是唯一与具体模型相关的代码。

## 排行榜 JSON

包含 schema 字符串、时间戳、各任务的分数和延迟，以及总体平均分。对比多次运行时附上逐样例记录，这样预测层面的回归才看得见。

## 失败模式

- 指标返回值超出 [0, 1]：总分就无法解读。
- 一个任务文件里混用多种指标：断言会触发；每个文件只用一种指标。
- code_exec 没有限制命名空间：等于允许执行任意代码。
- 没有 schema 字符串：格式一演进，下游看板就会坏。
