# 工具契约迁移检查器

找出拟议的 schema 变更会破坏哪些已保存的工具调用。

需要 Python 3.10+；需掌握字典、schema 解析和生成式测试。核心只用 Python 标准库，没有外部依赖。

## 构建并运行你的版本

从仓库根目录初始化一次：

```bash
python3 scripts/project_test.py tool-contract-migration-checker --init learning-artifacts/tool-contract-migration-checker
python3 scripts/project_test.py tool-contract-migration-checker --stage 1 --path learning-artifacts/tool-contract-migration-checker --strict
```

实现每个阶段后，运行累积评分器和 CLI 驱动程序：

```bash
python3 scripts/project_test.py tool-contract-migration-checker --all --path learning-artifacts/tool-contract-migration-checker --strict
cd learning-artifacts/tool-contract-migration-checker
python3 cli.py --old samples/catalog_v1.json --new samples/catalog_v2.json --calls samples/saved_calls.json --output report.json
```

## 单独查看参考实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py tool-contract-migration-checker --all --solution --strict
cd projects/tool-contract-migration-checker/solution
python3 cli.py --old samples/catalog_v1.json --new samples/catalog_v2.json --calls samples/saved_calls.json --output report.json
```

## 观察变化

演示比较 `catalog_v1.json` 和 `catalog_v2.json`。拟议的 schema 新增必填的 `api_key`，缩小 `category` 允许的枚举值，把 `limit` 的上限降到 50，并拒绝未声明的属性。回放五条历史调用后，发现四条破坏性失败，并合成出具体的反例载荷。

## 集成与限制

基线支持扁平对象上的 `properties`、`required`、`additionalProperties`、`type`、`enum`、`minimum`、`maximum`、`minLength`、`maxLength`、`minItems` 和 `maxItems`。`title`、`description`、`default`、`examples` 等注解不影响有效性，会被忽略。其他关键词（如 `$ref`、`oneOf`、`pattern`、`format`）的取值在两个版本间变化时，报告为无法判定。嵌套对象或数组 schema 内部的变化也报告为无法判定。存在无法判定的变更时，报告判为不兼容，因此 `--strict` 会失败，而不是放行一项它无法检查的变更。

## 阶段

1. [加载带版本的工具契约与已保存调用](stages/01-load-contracts-and-calls/docs/zh.md)
2. [分类受支持的 schema 变更](stages/02-classify-schema-changes/docs/zh.md)
3. [生成并回放破坏性调用反例](stages/03-generate-and-replay-counterexamples/docs/zh.md)
4. [导出迁移夹具与兼容性闸门](stages/04-export-fixtures-and-ci-gate/docs/zh.md)

## 主要参考资料

[JSON Schema 2020-12](https://json-schema.org/draft/2020-12/json-schema-validation)
[语义化版本 2.0.0](https://semver.org/)
