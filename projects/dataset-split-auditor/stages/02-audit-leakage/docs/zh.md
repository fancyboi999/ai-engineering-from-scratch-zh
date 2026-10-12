# 审计重复内容与分组泄漏

第 2 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在先前契约之上。

## 变化内容

内容泄漏和分组泄漏不同。同一事件的两条不同支持消息，即使文本不同，也可能泄漏答案。在分区间追踪规范化内容哈希和分组 ID。

返回碰撞哈希和分组名，不只返回百分比。审核者需要定位记录。拒绝重复记录 ID，因为它们会让证据产生歧义。

## 推演一个具体案例

train-a 和 test-a 在不同事件中共享规范化文本。train-a 和 test-b 文本不同，却共享 incident-1。报告保留两个独立证据列表，列出涉及的精确记录 ID。

```figure
pj-dataset-split-auditor-2
```

改变实验输入，在查看指标前计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

按声明的契约实现 `audit`。

使用[公共 API 契约](../../../API.md)和带类型的起始签名。核心函数返回值，让提供的驱动器负责文件输入、参数解析和展示。

为两侧构建值到记录 ID 的索引，再取键的交集。仅哈希能证明碰撞，却无法告诉初学者该检查哪些源行。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py dataset-split-auditor --init learning-artifacts/dataset-split-auditor` 初始化一次。然后累积评分：

```bash
python3 scripts/project_test.py dataset-split-auditor --stage 2 --path learning-artifacts/dataset-split-auditor --strict
```

实现契约前，新工作区应失败。完成全部阶段后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/dataset-split-auditor
python3 cli.py samples/input.json --output split-audit.json --html split-audit.html
```

## 探查失败边界

让两条记录共享 ID。在构建证据前拒绝，因为产生的位置会有歧义。




## 参考资料

[主要技术参考](https://scikit-learn.org/stable/common_pitfalls.html)
