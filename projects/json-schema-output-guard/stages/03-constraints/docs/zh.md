# 拒绝有歧义和不支持的契约

第 3 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 本阶段的变化

增加数字边界、enum 成员校验、最小 Unicode 字符串长度、数组边界和封闭对象。转义属性路径内的斜杠和波浪号。教学子集以外的关键词是配置错误，不能悄悄成功。本实现明确不声称完整符合 JSON Schema：引用、格式和组合器需要额外工作。

本阶段的边界是 `validate, guard`。保持前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

## 推演一个具体案例

必需键 a/b~c 报告在 $/a~1b~0c。先转义 ~，再转义 /；反过来或省略转义，会让诊断指向错误字段。最小字符串长度统计 Unicode 码点。

```figure
pj-json-schema-output-guard-3
```

修改实验输入，在查看指标前先算出结果。图表会根据这些输入计算；下方的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.ts` 中实现 `validate, guard`。先尝试实现契约，再阅读参考实现导出的类型。保留 starter 的公开名称，让测试能调用你的实现。核心函数返回结构化值，不要直接打印；CLI 会打印最终结果。

使用[公开 API 契约](../../../API.md)和带类型的 starter 签名。核心函数返回值，文件输入、参数解析和展示交给随附驱动程序。

将不支持的词汇当作配置异常，将普通值不匹配当作 Issue[] 结果。在检查模型数据前，校验全部 schema 结构，包括 minItems 和嵌套 properties。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py json-schema-output-guard --init learning-artifacts/json-schema-output-guard` 初始化一次。随后累积评分：

```bash
python3 scripts/project_test.py json-schema-output-guard --stage 3 --path learning-artifacts/json-schema-output-guard --strict
```

全新工作区在你实现契约之前应当失败。完成所有阶段后，用随附样本运行你的实际产物：

```bash
cd learning-artifacts/json-schema-output-guard
node cli.ts --schema samples/schema.json --attempts samples/attempts.json --output guard.json --html guard.html
```

## 探查失败边界

用空数组测试含 $ref 的 items。空输入不能绕过 schema 词汇校验。




## 参考资料

[JSON Schema 校验词汇](https://json-schema.org/draft/2020-12/json-schema-validation)
[Node TypeScript 执行](https://nodejs.org/api/typescript.html)
