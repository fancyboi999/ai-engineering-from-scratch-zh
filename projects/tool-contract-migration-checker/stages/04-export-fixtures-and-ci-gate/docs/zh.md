# 导出迁移夹具与兼容性闸门

第 4 阶段，共 4 阶段。开始前阅读[第 3 阶段](../../03-generate-and-replay-counterexamples/docs/zh.md)；本阶段把契约检查接入可复用的 CI 闸门。

## 本阶段的变化

在现代 AI agent 部署中，schema 变更必须在持续集成里自动校验。本阶段构建完整的报告生成器，导出可复现的回归夹具，并提供一个 CLI 闸门：只要发现破坏性 schema 变更或回放调用失败，就让 CI 构建失败。

本阶段的边界是 `build_report`、`export_fixtures` 和 `cli.py` 入口。

## 推演一个具体案例

一个 CI 拉取请求提议收紧工具参数：

```figure
pj-tool-contract-migration-checker-4
```

运行 `cli.py --old schema_v1.json --new schema_v2.json --strict` 会以状态 `1` 退出，阻止合并，直到开发者放宽契约、恢复向后兼容。

## 实现契约

在工作区的 `main.py` 中实现 `build_report` 和 `export_fixtures`。

- `build_report(old_contract, new_contract, changes, counterexamples, replay_result)` 生成结构化摘要，包括 schema 版本、工具名、兼容状态和各项计数。
- `export_fixtures(output_path, counterexamples, broken_calls)` 写出一个干净的 JSON 夹具文件，包含用于回归测试的反例和破坏的调用。
- 随附的 `cli.py` 驱动程序把你累积实现的函数接到命令行参数上。

## 验证与检查

```bash
python3 scripts/project_test.py tool-contract-migration-checker --all --path learning-artifacts/tool-contract-migration-checker --strict
cd learning-artifacts/tool-contract-migration-checker
python3 cli.py --old samples/catalog_v1.json --new samples/catalog_v2.json --calls samples/saved_calls.json --output report.json
```

## 参考资料

[持续集成与 schema 演进](https://martinfowler.com/articles/evodb.html)
