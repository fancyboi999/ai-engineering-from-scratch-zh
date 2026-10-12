# 测量置信度校准

第 3 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在先前契约之上。

## 变化内容

对自动路由器而言，99% 置信度却答错的模型比承认不确定的模型更危险。预期校准误差按置信度分组，比较平均置信度和实际正确率。

ECE 依赖分箱选择和样本数。报告每个非空箱、大小及差距。小样本或看似低的 ECE 不证明新任务上的概率已校准。

## 推演一个具体案例

四个 confidence 0.9 的预测中有三个正确。实际准确率 0.75，单箱差距 0.15。另一个箱若只有一个高置信度错误答案，应按一个样本加权，而非与四样本箱等权。

```figure
pj-local-model-eval-harness-3
```

改变实验输入，在查看指标前计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

按声明的契约实现 `calibration`。

使用[公共 API 契约](../../../API.md)和带类型的起始签名。核心函数返回值，让提供的驱动器负责文件输入、参数解析和展示。

用 min(index,bins-1) 将 confidence 1.0 放入最后一个箱。在 ECE 旁报告非空箱计数，避免平均值掩盖证据极少的情况。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py local-model-eval-harness --init learning-artifacts/local-model-eval-harness` 初始化一次。然后累积评分：

```bash
python3 scripts/project_test.py local-model-eval-harness --stage 3 --path learning-artifacts/local-model-eval-harness --strict
```

实现契约前，新工作区应失败。完成全部阶段后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/local-model-eval-harness
python3 cli.py samples/input.json --output scorecard.json --html reliability.html
```

## 探查失败边界

将相同记录分成五箱和十箱。解释为何模型答案不变，ECE 却变化。




## 参考资料

[主要技术参考](https://docs.python.org/3/library/statistics.html)
