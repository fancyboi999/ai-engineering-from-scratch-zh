# 找出重复组中的全部行

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

对每个 unique 列，将有效类型值索引到从 1 开始的输入行号。仅为至少包含两行的组输出 {field,rows}。缺字段和类型错误的值留给行校验。报告所有碰撞成员，包括第一次出现的记录。

```text
duplicate_rows(rows, contract) -> list[dict]
```

## 推演一个示例

```python
duplicate_rows([{'id': 'x'}, {'id': 'x'}], {'fields': {'id': {'type': 'string'}}, 'unique': ['id']})
```

预期值：

```text
[{'field': 'id', 'rows': [1, 2]}]
```

保留首个重复记录会让接受与否依赖输入顺序。先对所有行分组，再决定。number 列中的数值 1 和 1.0 会碰撞，而字符串 `a` 和 `A` 仍不同。证据保存行号，不重复保存值。

## 交互实验

```figure
pj-dataset-contract-gate-3
```

改变机制中的一项输入。预测哪个中间值应变化，再比较计算回执。图表展示本阶段契约；本地评分器测试实际 Python 代码。

## 动手构建

打开学习工作区的 `main.py`。使用明确的数据结构实现本阶段函数。保留先前阶段契约。CLI 和 HTML 渲染器已在初始化时提供，不替代你正在编写的实现。阶段测试导入 `PROJECT_WORKSPACE`，因此编辑教师文件不算完成你自己的版本。

## 失败情况

不要尝试对无效数组或对象求哈希。两个缺失可选值不证明键重复。这里选择的是按列唯一性规则，不是组合唯一性。

## 验证

从仓库根目录运行：

```bash
python3 scripts/project_test.py dataset-contract-gate --stage 3 --path learning-artifacts/dataset-contract-gate --strict
```

评分器逐阶段累积检查。阅读第一个失败断言，用最小输入复现，修复负责的函数。它检查普通情况、边界条件、格式错误值和独立 fixture。仅供教师使用的等效命令为 `--stage 3 --solution --strict`。

## 实际使用与扩展

全部四阶段通过后，用提供的 CLI 处理自己的 JSONL：

```bash
cd learning-artifacts/dataset-contract-gate
python3 cli.py samples/input.jsonl --contract samples/contract.json --output demo-output
```

再编写一个与示例不同的留出案例。解释为何其结果来自契约，而非匹配硬编码样本。

明确说明不支持的行为。扩展接受的输入格式前，需要先新增契约示例和测试，再改实现。
