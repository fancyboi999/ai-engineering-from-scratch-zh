# 在调用预算内运行 harness

> 将调用花在策略上，不要花在答案泄露上。

**类型：** Build
**语言：** Go
**阶段：** 第 3 阶段，共 4 阶段
**前置要求：** 阶段 1、2。添加真实模型前理解 Go 回调和 context 取消。
**预计时间：** 约 2 小时

## 构建内容

实现 `EvaluatePolicy` 和 `PolicyPrompt`；保留 `Evaluate` 作为基线便捷包装器。三策略接收相同有序案例和模型配置。`baseline` 每案例一次调用。`retry-errors` 允许 provider 错误后多一次。`evidence` 只把案例声明的证据追加到 prompt。

每次调用前计入 `Calls`。`Attempted` 统计案例，`Errors` 统计最终调用失败的案例，`Total` 始终含全部输入案例。在 `Trace` 记录每次调用的 prompt、答案、失败与正确性。绝不只因答案未通过评分器就重试。

## 示例推演

恢复问题记录的首次响应为错误，第二次为 `ready`。基线结束该案例时 `Calls=1, Attempted=1, Errors=1`。重试策略为 `Calls=2, Attempted=1, Errors=0, Correct=1`。

将预算降为一。无法重试，案例仍错误，状态为 `budget-exhausted`。后续案例仍在分母里。到期问题中有效但错误的 `60 minutes` 答案绝不触发借助标准答案的重试。

```figure
pj-harness-bench-3
```

## 实现契约

```go
func PolicyPrompt(c Case, policy string) string
func EvaluatePolicy(ctx context.Context, name, policy string, cases []Case, model ContextModel, budget int, modelReceipt string) (Result, error)
func Evaluate(name string, cases []Case, model Model, budget int) (Result, error)
```

把每案例尝试与运行调用计数分开。只有模型 prompt 进入 `ContextModel`；`Expected` 留在评分侧。每策略构造新记录适配器，避免前策略消耗后策略首个响应。记录耗尽返回错误，不会永远重复最后答案。

## 运行你的实现

从仓库根目录初始化一次；评分器保留已有工作区文件：

```bash
python3 scripts/project_test.py harness-bench --init /tmp/harness-bench-work
python3 scripts/project_test.py harness-bench --stage 3 --path /tmp/harness-bench-work --strict
```

实现在该工作区的 `stage3.go` 中。提供的适配器调用学员函数，不导入参考方案。阶段测试含独立于 Orchard 演示的案例。

## 检查与扩展

在完成的学员工作区运行 `go run . --budget 2 --out /tmp/orchard-budget.json`。解释为何早期案例的重试会让后续案例未尝试。context 截止时间约束提供的 HTTP 适配器；任意自定义回调必须配合取消。

[Go 标准库参考](https://pkg.go.dev/encoding/json)。可运行核心只用 Go 标准库。外部模型调用可选，普通评分不运行它们。
