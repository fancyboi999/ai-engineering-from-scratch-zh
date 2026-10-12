# 检查每条记录，不做强制转换

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

使用已校验的契约。返回有序 {field,rule} 字典。缺失必需字段产生 required；标量类型错误产生 type；数值越界产生 min 或 max；不允许的枚举值产生 enum。未知字段产生 extra，除非 allow_extra=true。非对象行产生 {field:"",rule:"object"}。

```text
row_issues(row, contract) -> list[dict]
```

## 推演一个示例

```python
row_issues({}, {'fields': {'id': {'type': 'string', 'required': True}}})
```

预期值：

```text
[{'field': 'id', 'rule': 'required'}]
```

字符串 `31` 不是整数。在校验时转换它会掩盖上游漂移。先检查类型再比较，让无效值报告一个有用的类型问题，而非在不相关的数值操作中抛错。缺失可选字段通过；显式 null 不通过任何支持的标量类型。

## 交互实验

```figure
pj-dataset-contract-gate-2
```

改变机制中的一项输入。预测哪个中间值应变化，再比较计算回执。图表展示本阶段契约；本地评分器测试实际 Python 代码。

## 动手构建

打开学习工作区的 `main.py`。使用明确的数据结构实现本阶段函数。保留先前阶段契约。CLI 和 HTML 渲染器已在初始化时提供，不替代你正在编写的实现。阶段测试导入 `PROJECT_WORKSPACE`，因此编辑教师文件不算完成你自己的版本。

## 失败情况

布尔 true 不通过 integer 和 number 字段。非有限浮点数不通过 number 字段。契约保留原记录，绝不编造缺失值。

## 验证

从仓库根目录运行：

```bash
python3 scripts/project_test.py dataset-contract-gate --stage 2 --path learning-artifacts/dataset-contract-gate --strict
```

评分器逐阶段累积检查。阅读第一个失败断言，用最小输入复现，修复负责的函数。它检查普通情况、边界条件、格式错误值和独立 fixture。仅供教师使用的等效命令为 `--stage 2 --solution --strict`。

## 实际使用与扩展

全部四阶段通过后，用提供的 CLI 处理自己的 JSONL：

```bash
cd learning-artifacts/dataset-contract-gate
python3 cli.py samples/input.jsonl --contract samples/contract.json --output demo-output
```

再编写一个与示例不同的留出案例。解释为何其结果来自契约，而非匹配硬编码样本。

明确说明不支持的行为。扩展接受的输入格式前，需要先新增契约示例和测试，再改实现。
