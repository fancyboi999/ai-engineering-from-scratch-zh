# 加载未见的基准案例

> 比较策略前先冻结案例。

**类型：** Build
**语言：** Go
**阶段：** 第 1 阶段，共 4 阶段
**前置要求：** Go 结构体、切片与 JSON 解码。阅读[模型评估](../../../../../phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md)，了解留出示例的作用。
**预计时间：** 约 2 小时

## 构建内容

导出链接助手记着旧的 60 分钟到期时间，你的运行手册写着 15 分钟。将问题、预期答案和允许证据分字段保存，准确看到各策略接收到什么。

`Cases(data, max)` 接受 `Case{ID, Prompt, Expected, Evidence}` 的 JSON 数组。`Evidence` 是可选字符串数组。拒绝未知字段、重复 ID、空白必需字段、尾随 JSON 和超过 `max` 的案例数。解码前输入文件限一 MiB。

## 示例推演

从 `fixtures/orchard-cases.json` 首条记录开始。ID 为 `orchard-ttl`，预期答案为 `15 minutes`，证据是一句运行手册文字。解码后状态含一条类型化记录，已见 ID 集合含 `orchard-ttl`。

追加相同 ID、不同问题的第二条记录。返回 `ErrConflict`，不要悄悄替换首条。`max=0` 时连首条都超过声明案例预算。空数组能解析，但最终 CLI 拒绝没有案例的基准测试。

```figure
pj-harness-bench-1
```

## 实现契约

```go
func Cases(data []byte, max int) ([]Case, error)
```

使用 `json.Decoder.DisallowUnknownFields`，再解码一次并要求 `io.EOF`。记录计数与字段验证分开。拼错 `Expected` 键必须报错，而不是产生空答案、悄悄改变分数。

## 运行你的实现

从仓库根目录初始化一次；评分器保留已有工作区文件：

```bash
python3 scripts/project_test.py harness-bench --init /tmp/harness-bench-work
python3 scripts/project_test.py harness-bench --stage 1 --path /tmp/harness-bench-work --strict
```

实现在该工作区的 `stage1.go` 中。提供的适配器调用学员函数，不导入参考方案。阶段测试含独立于 Orchard 演示的案例。

## 检查与扩展

ID 冲突为什么不同于两个案例有相同预期答案？只改 JSON 空白而不改字段：最终数据集回执应相同。案例顺序变化必须改变回执，因为有限预算按顺序访问案例。

[Go 标准库参考](https://pkg.go.dev/encoding/json)。可运行核心只用 Go 标准库。外部模型调用可选，普通评分不运行它们。
