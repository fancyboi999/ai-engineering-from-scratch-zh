# 精确定义正确答案

> 看到分数前先定义答案契约。

**类型：** Build
**语言：** Go
**阶段：** 第 2 阶段，共 4 阶段
**前置要求：** 阶段 1 和字符串处理。评分器刻意使用精确答案契约。
**预计时间：** 约 2 小时

## 构建内容

实现 `Correct(actual, expected)`：转小写、压缩空白，再比较相等性。空预期答案从不通过。保留数字、单位、标点：15 分钟和 150 分钟到期有不同运维后果。

此指标适合要求时长、状态或明确弃答的 prompt，不衡量自由文章的事实质量。

## 示例推演

对 `actual = " 15   MINUTES\n"`，拆为 `["15", "MINUTES"]`，连接为 `15 MINUTES`，再转小写为 `15 minutes`。规范后的预期答案也是 `15 minutes`，所以案例得一分。

`15 min` 对 `15 minutes` 不通过。这是已声明的指标限制，不是模型错误的证据。应用需要时通过另行规定的契约添加可接受变体；不要看完胜者后放宽相等性。

```figure
pj-harness-bench-2
```

## 实现契约

```go
func Correct(actual, expected string) bool
```

`strings.Fields` 处理连续空白。`strings.ToLower` 处理 Unicode 大小写，但不组合规范等价的重音。记录边界，不要声称语义或完整 Unicode 规范化。

## 运行你的实现

从仓库根目录初始化一次；评分器保留已有工作区文件：

```bash
python3 scripts/project_test.py harness-bench --init /tmp/harness-bench-work
python3 scripts/project_test.py harness-bench --stage 2 --path /tmp/harness-bench-work --strict
```

实现在该工作区的 `stage2.go` 中。提供的适配器调用学员函数，不导入参考方案。阶段测试含独立于 Orchard 演示的案例。

## 检查与扩展

测试 `10 ms` 对 `100 ms`、`ready!` 对 `ready`。按契约哪些应通过？运行评分器前写下答案。开放答案使用带来源证据的[报告评审器](../../../../report-judge/README.md)，而不是此指标。

[Go 标准库参考](https://pkg.go.dev/encoding/json)。可运行核心只用 Go 标准库。外部模型调用可选，普通评分不运行它们。
