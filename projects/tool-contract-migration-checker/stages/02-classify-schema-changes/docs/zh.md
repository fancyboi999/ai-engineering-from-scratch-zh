# 分类受支持的 schema 变更

第 2 阶段，共 4 阶段。开始前阅读[第 1 阶段](../../01-load-contracts-and-calls/docs/zh.md)；本阶段比较两份已加载的契约。

## 本阶段的变化

修改 AI agent 的工具接口时，不同变更的影响并不相同。新增可选参数时，现有调用方不改也能继续工作。新增必填字段、删除字段、收紧取值范围或缩小枚举，则会立刻让已部署的 agent 出错。

本阶段的边界是 `classify_changes`。

## 推演一个具体案例

以一个数据库搜索工具的演进为例：

```figure
pj-tool-contract-migration-checker-2
```

如果第 2 版新增必填的 `auth_token`，或者把 `max_results` 从 100 收紧到 50，所有依赖旧的宽松契约的历史 agent 计划都会被拒绝。

## 实现契约

在工作区的 `main.py` 中实现 `classify_changes(old_contract, new_contract)`。

把检测到的每项变更归入以下类别：
- `breaking`：新增必填属性、删除属性、收窄类型、缩小枚举、收紧 minimum/maximum/minLength/maxLength，或把 `additionalProperties` 从 `True` 改为 `False`。
- `compatible`：新增可选属性、放宽类型、扩大枚举、放宽上下界，或开启 `additionalProperties`。
- `unresolved`：受支持子集以外的关键词（如 `$ref`、`oneOf`、`pattern`、`format`）在两个版本间取值不同，或者某个属性内部嵌套的 `properties`、`required`、`additionalProperties`、`items` 发生了变化。注解（`title`、`description`、`default`、`examples`）会被忽略；没有变化的不支持关键词不报告。

每个变更对象必须包含：
```python
{
    "type": "breaking" | "compatible" | "unresolved",
    "category": str,
    "property": str,
    "description": str
}
```

## 验证与检查

```bash
python3 scripts/project_test.py tool-contract-migration-checker --stage 2 --path learning-artifacts/tool-contract-migration-checker --strict
```

## 参考资料

[语义化版本 2.0.0](https://semver.org/)
