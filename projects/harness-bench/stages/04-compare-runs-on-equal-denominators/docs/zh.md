# 用相同分母比较运行

> 排名前证明运行可比。

**类型：** Build
**语言：** Go
**阶段：** 第 4 阶段，共 4 阶段
**前置要求：** 阶段 1 至 3。阅读 [prompt 回归测试器](../../../../prompt-regression-tester/README.md)，了解配对输出比较。
**预计时间：** 约 2 小时

## 构建内容

实现 `Leaderboard`，排序前验证结果。要求相同总数和唯一 harness 名称。含回执结果必须有相同的有序数据集 SHA-256、模型配置 SHA-256 和调用预算。含回执比较中混入缺失回执结果应拒绝。

`Fingerprint` 先序列化类型化值再哈希。数据集键顺序和空白消失，但案例顺序、prompt、预期答案、证据仍属于回执。模型回执含适配器、模型 ID、生成设置，真实调用时的端点、重放时完整记录摘要。

## 示例推演

原创 Orchard 记录得到 baseline 三调用 `1/3`、retry 四调用 `2/3`、evidence 三调用 `3/3`。这些刻意构造的响应展示机制，不排名真实模型。

现在替换到期问题，仍保留三案例。相同分母仍为 `3`，数据集摘要却不同。以 `ErrConflict` 拒绝比较。将 `max_tokens` 从 128 改为 256，也必须拒绝混合比较，即使模型名称未变。

```figure
pj-harness-bench-4
```

## 实现契约

```go
func Leaderboard(results []Result) (string, error)
```

排序副本前验证计数：`Correct + Errors <= Attempted <= Total`，含回执运行须满足 `Attempted <= Calls <= CallBudget`。按正确答案数、较少最终错误、名称排名。完全无回执的旧手工结果保留原计数 API；记录或真实比较用 `EvaluatePolicy`。

## 运行你的实现

从仓库根目录初始化一次；评分器保留已有工作区文件：

```bash
python3 scripts/project_test.py harness-bench --init /tmp/harness-bench-work
python3 scripts/project_test.py harness-bench --stage 4 --path /tmp/harness-bench-work --strict
```

实现在该工作区的 `stage4.go` 中。提供的适配器调用学员函数，不导入参考方案。阶段测试含独立于 Orchard 演示的案例。

## 检查与扩展

在完成的工作区运行 `go run . --cases fixtures/orchard-cases.json --recording fixtures/orchard-recording.json --out /tmp/orchard-runs.json`。检查每策略一条轨迹。HTTP 适配器接受完整 chat-completions 端点、`--model`、`--key-env`、`--temperature`、`--max-tokens`；README 有命令。估计方差需要重复真实运行，这些未签名回执不证明远程模型保持固定。

[Go 标准库参考](https://pkg.go.dev/encoding/json)。可运行核心只用 Go 标准库。外部模型调用可选，普通评分不运行它们。
