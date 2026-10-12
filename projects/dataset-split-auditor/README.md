# 数据集划分审计器

点名导致内容泄漏和事件泄漏记录的数据集门禁。

Python 3.10+；列表、集合、字典、Unicode 规范化和哈希函数。核心使用标准库。评分器检查你选择的工作区，不从参考实现填补缺失行为。

## 构建并运行你自己的版本

从仓库根目录初始化一次。新的起始代码会故意失败。

```bash
python3 scripts/project_test.py dataset-split-auditor --init learning-artifacts/dataset-split-auditor
python3 scripts/project_test.py dataset-split-auditor --stage 1 --path learning-artifacts/dataset-split-auditor --strict
```

实现每个阶段，再运行累积评分器和提供的输入驱动器：

```bash
python3 scripts/project_test.py dataset-split-auditor --all --path learning-artifacts/dataset-split-auditor --strict
cd learning-artifacts/dataset-split-auditor
python3 cli.py samples/input.json --output split-audit.json --html split-audit.html
```

驱动器和离线样本是提供的脚手架。它导入的是你的实现。公共输入类型和函数签名在起始代码与 [API 契约](API.md) 中。

## 单独检查参考实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py dataset-split-auditor --all --solution --strict
cd projects/dataset-split-auditor/solution
python3 cli.py samples/input.json --output split-audit.json --html split-audit.html
```

## 观察变化

脏样本将 train-a 与 test-a 标为规范化内容重叠，再将 train-a 与 test-b 标为共享事件。其 usable 标志为 false。

编辑样本副本并重跑命令。将输入保存在输出旁，方便他人复现结果；提供的样本是原创教学数据。

## 集成与限制

向 CLI 传入 {train,test} 记录，或传入 {records} 并指定 --split 0.25 --seed experiment-1。在 CI 中添加 --check，划分不可用时返回 exit 2。

规范化检测精确的规范化副本，不检测改写。稳定分组哈希不保证类别平衡或时间感知评估。导出分区中仍保留源文本。

## 阶段

1. [为规范化记录生成指纹](stages/01-fingerprint-records/docs/zh.md)
2. [审计重复内容与分组泄漏](stages/02-audit-leakage/docs/zh.md)
3. [用稳定哈希划分分组](stages/03-split-groups/docs/zh.md)
4. [同时报告划分大小和泄漏](stages/04-report-distribution/docs/zh.md)


## 主要参考资料

[机制与 API 参考](https://scikit-learn.org/stable/common_pitfalls.html)

## 接入评估工作流

JSONL 输入可用 `python3 cli.py --train train.jsonl --test test.jsonl --check --output split-audit.json`。每行要求 id、group 和 text；额外 label 和 source 字段保留在 partitions.train/partitions.test。碰撞证据包括配对记录 ID 和提供的来源定位信息。

本地模型评估工具接受 `--dataset-audit split-audit.json`。它要求可用的 schema_version1 回执，以及标签 ID 与审计 test 分区完全一致。干净划分是必要证据，不证明评估标签优质。
