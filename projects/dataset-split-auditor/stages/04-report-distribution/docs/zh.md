# 同时报告划分大小和泄漏

第 4 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在先前契约之上。

## 变化内容

干净划分也可能无用，例如几乎所有记录进入训练集。将行数、分组数和泄漏放在同一产物中，避免无泄漏声明掩盖空测试集。

检查器不认证统计代表性。时间依赖任务常需按时间顺序划分，本项目有意留作后续扩展。

## 推演一个具体案例

零泄漏但 test_rows=0 的报告不可用。提供的脏 fixture 有两个分区，但仍因内容和分组证据而失败。这是同一门禁结果的不同原因。

```figure
pj-dataset-split-auditor-4
```

改变实验输入，在查看指标前计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

按声明的契约实现 `summarize`。

使用[公共 API 契约](../../../API.md)和带类型的起始签名。核心函数返回值，让提供的驱动器负责文件输入、参数解析和展示。

CLI 将 summarize 与来源索引组合，可选返回 exit 2。CI 作业即使门禁失败也应保留 JSON 产物，供审核者定位问题。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py dataset-split-auditor --init learning-artifacts/dataset-split-auditor` 初始化一次。然后累积评分：

```bash
python3 scripts/project_test.py dataset-split-auditor --stage 4 --path learning-artifacts/dataset-split-auditor --strict
```

实现契约前，新工作区应失败。完成全部阶段后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/dataset-split-auditor
python3 cli.py samples/input.json --output split-audit.json --html split-audit.html
```

## 探查失败边界

创建原创干净配对，运行 --check 并确认 exit 0。用新 ID 添加规范化副本，确认 exit 2，且产物包含两个原始 ID。

规范化检测精确的规范化副本，不检测改写。稳定分组哈希不保证类别平衡或时间感知评估。导出分区中仍保留源文本。


## 参考资料

[主要技术参考](https://scikit-learn.org/stable/common_pitfalls.html)
