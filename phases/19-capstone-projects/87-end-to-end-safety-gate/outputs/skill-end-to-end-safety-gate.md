---
name: skill-end-to-end-safety-gate
description: 三检查点安全门，组合输入检测器、流式 token 过滤器、输出分类器和规则引擎，配有确定性的聚合表和逐请求 trace
version: 1.0.0
phase: 19
lesson: 87
tags: [safety, harness, composition]
---

# 端到端安全门

## 生命周期

1. pre-gen - 对 prompt 运行第 83 课的检测器
   - 如果 confidence >= block_threshold：返回拒绝，输出 trace，结束
2. during-gen - 从模型流式读取，缓冲两个 chunk，扫描已知的有害续写
   - 如果命中：终止迭代器，在 trace 上标记，按 medium 严重度处理
3. post-gen - 如果没有提前终止，对完整输出运行第 85 课的分类器路由器和第 86 课的规则引擎
4. aggregate - 取 pre、during、post.classifier、post.rules 中的最高严重度
5. apply - 映射为 block、redact、warn 或 allow

## 聚合表

| 信号状态 | 动作 |
|---|---|
| 存在 high 严重度 | block |
| 存在 medium 严重度 | redact |
| 存在 low 严重度 | warn |
| 都没有 | allow |

## Trace 结构

```text
RequestTrace
  request_id: str
  prompt: str
  pre_gen: { category, confidence, fired[] }
  during_gen: { terminated_early, matched_pattern, partial_chunks }
  post_gen: { classifier_action, classifier_severity, rules_max_severity, rules_violations[] } | null
  final_action: block | redact | warn | allow
  final_output: str
  latency_ms: float
```

## 产物

`outputs/gate_trace.json` 包含汇总信息和每个请求的 trace，覆盖 50 个分类法测试样例和 10 个正常 prompt。
