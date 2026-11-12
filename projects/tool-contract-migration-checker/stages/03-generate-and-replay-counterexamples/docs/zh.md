# 生成并回放破坏性调用反例

第 3 阶段，共 4 阶段。开始前阅读[第 2 阶段](../../02-classify-schema-changes/docs/zh.md)；本阶段把分类后的变更转成具体的失败调用夹具。

## 本阶段的变化

静态 schema 差异只能抽象地说明改了什么。开发者需要具体的反例：一个能通过旧契约、却无法通过新契约的确切载荷。再把录下的生产工具调用分别交给两个校验器，就能看出哪些真实的历史用法会受影响。

本阶段的边界是 `generate_counterexamples` 和 `replay_calls`。

## 推演一个具体案例

新增必填字段 `session_id` 时：

```figure
pj-tool-contract-migration-checker-3
```

合成器构造一个不含 `session_id` 的最小载荷（它满足旧契约），并确认它在新契约下失败，错误为 `"missing required property: session_id"`。

## 实现契约

在工作区的 `main.py` 中实现 `generate_counterexamples(old_contract, new_contract)` 和 `replay_calls(old_contract, new_contract, calls)`。

- `generate_counterexamples` 尝试为每项破坏性变更构造一个最小载荷，覆盖新增必填字段、删除属性、缩小或新增枚举、收窄类型、收紧上下界和封闭 schema。只有确认载荷能通过旧契约、且无法通过新契约，才保留它。没有候选满足条件时，该变更不给出反例，而不是输出一个错误的反例。
- `replay_calls` 把已保存的历史调用分成：
  - `preserved`：在新旧契约下都有效。
  - `broken`：在旧契约下有效，但被新契约拒绝。
  - `already_invalid`：已被旧契约拒绝。
  - `breaking_rate`：`len(broken) / (len(preserved) + len(broken))`（为空时取 0.0）。

## 验证与检查

```bash
python3 scripts/project_test.py tool-contract-migration-checker --stage 3 --path learning-artifacts/tool-contract-migration-checker --strict
```

## 参考资料

[基于属性的生成式测试](https://hypothesis.works/)
