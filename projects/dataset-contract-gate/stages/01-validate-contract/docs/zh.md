# 校验明确的质量契约

> 隔离无效记录，按明确的数据集规则阻止摄取。

**类型：** Build
**语言：** Python
**前置要求：** Python 字典与列表基础
**预计时间：** 约 120 分钟

## 学习目标

- 实现公共函数契约并拒绝不支持的输入。
- 在运行工具前预测示例结果。
- 用保存的证据解释失败情况。
- 在下一流水线阶段复用输出。

## 构建内容

要求 version=1 且 fields 为非空对象。每个字段声明 type 为 string、integer、number 或 boolean；可选 required 为布尔值。数值 min/max 必须有限且有序。enum 为声明类型的非空列表。unique 包含互不相同的已声明字段名。min_rows/max_rows 为非负整数。未知规则按失败关闭处理。

```text
validate_contract(contract) -> dict
```

## 推演一个示例

```python
validate_contract({'version': 1, 'fields': {'id': {'type': 'string'}}})['version']
```

预期值：

```text
1
```

查看数据前先校验政策。`minimum` 这类拼写错误不能静默禁用边界。Python 的 isinstance 检查将 True 视为整数，因此区分布尔政策标志与数值边界时要做精确类型检查。

## 交互实验

```figure
pj-dataset-contract-gate-1
```

改变机制中的一项输入。预测哪个中间值应变化，再比较计算回执。图表展示本阶段契约；本地评分器测试实际 Python 代码。

## 动手构建

打开学习工作区的 `main.py`。使用明确的数据结构实现本阶段函数。保留先前阶段契约。CLI 和 HTML 渲染器已在初始化时提供，不替代你正在编写的实现。阶段测试导入 `PROJECT_WORKSPACE`，因此编辑教师文件不算完成你自己的版本。

## 失败情况

拒绝不支持的版本、未知键、缺少字段、上下界倒置、不兼容枚举和指向不存在列的唯一性规则。

## 验证

从仓库根目录运行：

```bash
python3 scripts/project_test.py dataset-contract-gate --stage 1 --path learning-artifacts/dataset-contract-gate --strict
```

评分器逐阶段累积检查。阅读第一个失败断言，用最小输入复现，修复负责的函数。它检查普通情况、边界条件、格式错误值和独立 fixture。仅供教师使用的等效命令为 `--stage 1 --solution --strict`。

## 实际使用与扩展

全部四阶段通过后，用提供的 CLI 处理自己的 JSONL：

```bash
cd learning-artifacts/dataset-contract-gate
python3 cli.py samples/input.jsonl --contract samples/contract.json --output demo-output
```

再编写一个与示例不同的留出案例。解释为何其结果来自契约，而非匹配硬编码样本。

明确说明不支持的行为。扩展接受的输入格式前，需要先新增契约示例和测试，再改实现。
