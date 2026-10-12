# 导出分区并执行数据集门禁

> 隔离无效记录，按明确的数据集规则阻止摄取。

**类型：** Build
**语言：** Python
**前置要求：** 前面的项目阶段
**预计时间：** 约 120 分钟

## 学习目标

- 实现公共函数契约并拒绝不支持的输入。
- 在运行工具前预测示例结果。
- 用保存的证据解释失败情况。
- 在下一流水线阶段复用输出。

## 构建内容

返回 schema_version=1、passed、counts、dataset_issues、duplicates、accepted 和 quarantine。隔离记录带有 row_number、record 和 issues。为重复组中的每行添加 unique 问题。仅当没有隔离行和整个数据集的问题时，数据集才通过。CLI --check 对规则失败使用 exit1，对无效输入使用 exit2。

```text
evaluate(rows, contract) -> dict; render_html(report) -> str
```

## 推演一个示例

```python
evaluate([{'id': 'x'}, {'id': 'x'}, {'id': 'y'}], {'version': 1, 'fields': {'id': {'type': 'string'}}, 'unique': ['id']})['counts']
```

预期值：

```text
{'input': 3, 'accepted': 1, 'quarantined': 2}
```

最终测试运行真实 CLI，在第二次评估中读取 accepted.jsonl，确认干净分区通过。即使每行单独有效，行数违规仍阻止摄取。使用导出行前先读 receipt.json。HTML 标记从 1 开始的源行，因为空 JSONL 行被拒绝。

## 交互实验

```figure
pj-dataset-contract-gate-4
```

改变机制中的一项输入。预测哪个中间值应变化，再比较计算回执。图表展示本阶段契约；本地评分器测试实际 Python 代码。

## 动手构建

打开学习工作区的 `main.py`。使用明确的数据结构实现本阶段函数。保留先前阶段契约。CLI 和 HTML 渲染器已在初始化时提供，不替代你正在编写的实现。阶段测试导入 `PROJECT_WORKSPACE`，因此编辑教师文件不算完成你自己的版本。

## 失败情况

输出分区是证据，不是自动丢弃记录的许可。多个独立输出文件不构成原子事务；下游应等命令成功完成后再加载。

## 验证

从仓库根目录运行：

```bash
python3 scripts/project_test.py dataset-contract-gate --stage 4 --path learning-artifacts/dataset-contract-gate --strict
```

评分器逐阶段累积检查。阅读第一个失败断言，用最小输入复现，修复负责的函数。它检查普通情况、边界条件、格式错误值和独立 fixture。仅供教师使用的等效命令为 `--stage 4 --solution --strict`。

## 实际使用与扩展

最后阶段从工作区运行 CLI，检查每份导出产物：

```bash
cd learning-artifacts/dataset-contract-gate
python3 cli.py samples/input.jsonl --contract samples/contract.json --output demo-output
```

样本有四行。第一行被接受，第二行 token 数为负，id 为 sample-c 的两行都被隔离。因此回执报告一行接受、三行隔离。--check 对该结果退出 1。移除坏行与通过原数据集门禁是两个不同决定。

版本 1 契约为原创教学格式，不是 JSON Schema 或 Open Data Contract Standard。支持扁平 JSON 对象、四种标量类型、必需字段、数值边界、枚举、单列唯一性和行数边界。缺失的可选唯一字段不会碰撞。重复检测内存与批次大小成正比；API 将输入限制为十万行。不检查语义真实性或跨表外键。隔离区含原始记录，必须保存在适当的本地位置。
