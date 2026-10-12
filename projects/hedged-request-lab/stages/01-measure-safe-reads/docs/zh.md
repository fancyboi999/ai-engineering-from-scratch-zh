# 测量安全读取延迟

> 汇总观测样本，不虚构性能保证。

**类型：** Build
**语言：** Go
**阶段：** 第 1 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的此前阶段。
**预计时间：** 约 2 小时

## 构建内容

用最近秩百分位汇总非负有限延迟样本。保留样本数和最大值，避免小实验伪装为稳定分布。库适配器只执行 GET。

## 示例推演

样本 [2,4,10,20,80] 得到 P50=10、P95=80、最大值=80、样本数 5。排序不得修改调用者数组。

```figure
pj-hedged-request-lab-1
```

## 实现契约

`Summarize([]float64)(Distribution,error)` 返回 samples、p50Ms、p95Ms、maxMs。拒绝空、负、NaN、无穷值。`SafeURL(string)error` 接受没有凭据或片段的 HTTP(S) URL。

在生成部分产物前拒绝格式错误的输入。测试包含独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py hedged-request-lab --init /tmp/hedged-request-lab-work
python3 scripts/project_test.py hedged-request-lab --stage 1 --path /tmp/hedged-request-lab-work --strict
```

初始化复制累积脚手架，不替换你的工作。实现第一阶段 starter 的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学员工作区。阶段通过后，用自己的输入运行 README 中的命令。

## 检查与扩展

收集重复的受控运行。五个点的最近秩 P95 只是最大值，不是生产尾部估计。

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
