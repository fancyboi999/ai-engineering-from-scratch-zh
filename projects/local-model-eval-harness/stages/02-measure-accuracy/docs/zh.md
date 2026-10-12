# 测量规范化精确答案准确率

第 2 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在先前契约之上。

## 变化内容

精确答案匹配适合标签和短参考答案等受约束输出。仅规范化大小写和空白；不要删事实或标点来抬高分数。

每项有标签条目要求一个预测，拒绝未知 ID。缺失预测在分母中计为错误。覆盖率揭示实际尝试了多少数据。

## 推演一个具体案例

十个标签中，六个预测正确、两个错误、两个缺失，accuracy 为 6/10，coverage 为 8/10。除以八会奖励系统回避困难案例。

```figure
pj-local-model-eval-harness-2
```

改变实验输入，在查看指标前计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

按声明的契约实现 `accuracy`。

使用[公共 API 契约](../../../API.md)和带类型的起始签名。核心函数返回值，让提供的驱动器负责文件输入、参数解析和展示。

本任务只规范化大小写与重复空白。保留标点和事实。拒绝 expected 标签映射中不存在的预测 ID。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py local-model-eval-harness --init learning-artifacts/local-model-eval-harness` 初始化一次。然后累积评分：

```bash
python3 scripts/project_test.py local-model-eval-harness --stage 2 --path learning-artifacts/local-model-eval-harness --strict
```

实现契约前，新工作区应失败。完成全部阶段后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/local-model-eval-harness
python3 cli.py samples/input.json --output scorecard.json --html reliability.html
```

## 探查失败边界

十案例数据集只录制一个简单正确答案。运行评分器前预测 accuracy 0.1、coverage 0.1。




## 参考资料

[主要技术参考](https://docs.python.org/3/library/statistics.html)
