# 加载带版本的工具契约与已保存调用

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段为 schema 比较打基础。

## 本阶段的变化

AI 工具契约演进时，要把旧 schema 和拟议的新 schema 都解析成统一的内部表示，再用这两份契约校验录下的历史 agent 调用。

本阶段的边界是 `load_contract`、`load_calls` 和 `validate_call`。

## 推演一个具体案例

工具契约规定必填参数、属性类型，以及 `enum`、`minimum`、`maximum` 等校验关键词。

```figure
pj-tool-contract-migration-checker-1
```

有效调用提供全部必填参数，且类型与声明一致。历史调用缺少必填属性或违反约束时，`validate_call` 会发现不匹配，并返回结构化的问题说明。

## 实现契约

在工作区的 `main.py` 中实现 `load_contract`、`load_calls` 和 `validate_call`。

- `load_contract(raw)` 确认 `raw` 是带 `type: "object"` 的字典，返回规范化后的字典。
- `load_calls(raw)` 接收对象列表，每个对象都包含 `arguments` 字典。
- `validate_call(contract, args)` 按声明的属性检查调用：必填字段、属性类型、上下界和枚举成员。

## 验证与检查

从仓库根目录初始化一次：

```bash
python3 scripts/project_test.py tool-contract-migration-checker --init learning-artifacts/tool-contract-migration-checker
python3 scripts/project_test.py tool-contract-migration-checker --stage 1 --path learning-artifacts/tool-contract-migration-checker --strict
```

## 参考资料

[JSON Schema 2020-12 校验](https://json-schema.org/draft/2020-12/json-schema-validation)
