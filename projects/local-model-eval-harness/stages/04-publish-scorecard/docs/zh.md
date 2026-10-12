# 同时发布准确率和延迟

第 4 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在先前契约之上。

## 变化内容

质量和延迟衡量不同取舍。使用最近秩百分位数，让小样本下定义可复现。在准确率、覆盖率、校准和实测预测数旁报告 p50 与 p95。

演示包含明确标为合成的录制延迟，不声称是任何本地模型的计时。做性能决策前替换为真实测量。

## 推演一个具体案例

延迟 [80,100,120,300,900] 的最近秩 p95 位于 ceil(.95*5)=5，因此 p95=900。录制清单在该值旁保留 model revision、prompt revision、hardware 和 confidence method。

```figure
pj-local-model-eval-harness-4
```

改变实验输入，在查看指标前计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

按声明的契约实现 `scorecard`。

使用[公共 API 契约](../../../API.md)和带类型的起始签名。核心函数返回值，让提供的驱动器负责文件输入、参数解析和展示。

record.py 仅向模型端点发送 prompt；expected 标签留在本地。围绕实际请求使用单调时钟，将录制结果交给 cli.py。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py local-model-eval-harness --init learning-artifacts/local-model-eval-harness` 初始化一次。然后累积评分：

```bash
python3 scripts/project_test.py local-model-eval-harness --stage 4 --path learning-artifacts/local-model-eval-harness --strict
```

实现契约前，新工作区应失败。完成全部阶段后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/local-model-eval-harness
python3 cli.py samples/input.json --output scorecard.json --html reliability.html
```

## 探查失败边界

比较两份标签不同的录制。即使两个数据集案例数相同，CLI 也必须拒绝比较。

除非适配器定义其他方法，报告的 confidence 是模型自报。ECE 随分箱和样本数变化。不下载或启动模型，样本也不是硬件基准。


## 参考资料

[主要技术参考](https://docs.python.org/3/library/statistics.html)
