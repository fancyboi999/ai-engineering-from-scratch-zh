# 校验预测记录

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在先前契约之上。

## 变化内容

预测记录是证据：id、answer、confidence 和实测延迟。要求 ID 唯一、数值有限，否则 NaN 可能绕过比较，让失败看起来成为有效报告。

工具读取录制结果，让每项指标测试无需模型即可运行。评估真实本地模型时，按同一契约记录响应，并将执行环境保存在结果 JSON 旁。

## 推演一个具体案例

两个 id 为 case-a 的记录会让标签连接产生歧义，因此即使答案相同也拒绝。confidence 必须有限且在 0..1 内；任何比较或平均前 NaN 必须失败。

```figure
pj-local-model-eval-harness-1
```

改变实验输入，在查看指标前计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

按声明的契约实现 `validate`。

使用[公共 API 契约](../../../API.md)和带类型的起始签名。核心函数返回值，让提供的驱动器负责文件输入、参数解析和展示。

Python 中布尔是整数子类，但不是延迟测量值。将 answer、confidence、latency 和 id 一起保留，避免后续指标意外按数组位置对齐。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py local-model-eval-harness --init learning-artifacts/local-model-eval-harness` 初始化一次。然后累积评分：

```bash
python3 scripts/project_test.py local-model-eval-harness --stage 1 --path learning-artifacts/local-model-eval-harness --strict
```

实现契约前，新工作区应失败。完成全部阶段后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/local-model-eval-harness
python3 cli.py samples/input.json --output scorecard.json --html reliability.html
```

## 探查失败边界

重排预测行，证明分数不变。再复制一个 ID，确认运行失败而不是重复计数。




## 参考资料

[主要技术参考](https://docs.python.org/3/library/statistics.html)
