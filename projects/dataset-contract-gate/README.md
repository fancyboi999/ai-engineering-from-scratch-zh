# 数据集契约门禁

定义小型版本化数据契约，检查字段类型和边界，找出重复组内的每一行，将接受记录与隔离记录分开导出。CLI 退出码控制摄取门禁，源行报告解释失败原因。

Python 3.12 或更高版本。无需模型凭据或第三方依赖。

## 构建你自己的版本

从仓库根目录运行：

```bash
python3 scripts/project_test.py dataset-contract-gate --init learning-artifacts/dataset-contract-gate
python3 scripts/project_test.py dataset-contract-gate --stage 1 --path learning-artifacts/dataset-contract-gate --strict
```

第一阶段实现前，首次运行会故意失败。提供的 CLI 和 HTML 渲染器只是调用你函数的脚手架。逐阶段实现，不要用参考实现替换工作区。

```bash
python3 scripts/project_test.py dataset-contract-gate --all --path learning-artifacts/dataset-contract-gate --strict --report completion.json
cd learning-artifacts/dataset-contract-gate
python3 cli.py samples/input.jsonl --contract samples/contract.json --output demo-output
```

## 运行参考实现

```bash
python3 scripts/project_test.py dataset-contract-gate --all --solution --strict
cd projects/dataset-contract-gate/solution
python3 cli.py samples/input.jsonl --contract samples/contract.json --output demo-output
```

在本地打开 `demo-output/review.html`。将样本输入路径替换为自己的 JSONL，让工具用于演示以外的数据。[API 契约](API.md) 定义接受的输入和输出形状。

## 预期结果与集成

样本有四行。第一行被接受，第二行 token 数为负，id 为 sample-c 的两行都被隔离。因此回执报告一行接受、三行隔离。--check 对该结果退出 1。移除坏行与通过原数据集门禁是两个不同决定。

导出产物为 `accepted.jsonl, quarantine.jsonl, receipt.json and review.html`。提供的 fixture 为原创示例。测试级留出案例使用不同值和格式错误输入；只成功运行演示不算完成。

## 范围

版本 1 契约为原创教学格式，不是 JSON Schema 或 Open Data Contract Standard。支持扁平 JSON 对象、四种标量类型、必需字段、数值边界、枚举、单列唯一性和行数边界。缺失的可选唯一字段不会碰撞。重复检测内存与批次大小成正比；API 将输入限制为十万行。不检查语义真实性或跨表外键。隔离区含原始记录，必须保存在适当的本地位置。

## 阶段

1. [校验明确的质量契约](stages/01-validate-contract/docs/zh.md)
2. [检查每条记录，不做强制转换](stages/02-check-records/docs/zh.md)
3. [找出重复组中的全部行](stages/03-check-uniqueness/docs/zh.md)
4. [导出分区并执行数据集门禁](stages/04-quarantine-and-gate/docs/zh.md)

## 主要参考资料

- [Python JSON API](https://docs.python.org/3/library/json.html)
- [JSON 规范，RFC 8259](https://www.rfc-editor.org/rfc/rfc8259.html)
