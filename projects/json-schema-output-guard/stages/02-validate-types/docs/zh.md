# 递归遍历 schema

第 2 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 本阶段的变化

实现对象、数组和基本类型校验。必需属性按自身属性语义检查。继承属性不满足契约。把 integer 当作 number 的细化类型，拒绝非有限数字，并为每个失败保留路径。递归下降深度限制为 32，避免 schema 和值无限消耗栈。

本阶段的边界是 `validate`。保持前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

## 推演一个具体案例

对于 schema properties.results.items.type=integer，值 {results:[1,"2"]} 在 $/results/1 产生 issue。不能仅因可以强制转换，就将文本 "2" 变成数字。

```figure
pj-json-schema-output-guard-2
```

修改实验输入，在查看指标前先算出结果。图表会根据这些输入计算；下方的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.ts` 中实现 `validate`。先尝试实现契约，再阅读参考实现导出的类型。保留 starter 的公开名称，让测试能调用你的实现。核心函数返回结构化值，不要直接打印；CLI 会打印最终结果。

使用[公开 API 契约](../../../API.md)和带类型的 starter 签名。核心函数返回值，文件输入、参数解析和展示交给随附驱动程序。

递归时向下传递属性路径，不要失败后再重建。用自身属性检查必需字段；即使可选值不存在，也要拒绝不合法 schema 子树。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py json-schema-output-guard --init learning-artifacts/json-schema-output-guard` 初始化一次。随后累积评分：

```bash
python3 scripts/project_test.py json-schema-output-guard --stage 2 --path learning-artifacts/json-schema-output-guard --strict
```

全新工作区在你实现契约之前应当失败。完成所有阶段后，用随附样本运行你的实际产物：

```bash
cd learning-artifacts/json-schema-output-guard
node cli.ts --schema samples/schema.json --attempts samples/attempts.json --output guard.json --html guard.html
```

## 探查失败边界

在 properties.unused 下加入不支持的关键词，再校验 {}。schema 预检必须先拒绝配置，不能宣布空对象有效。




## 参考资料

[JSON Schema 校验词汇](https://json-schema.org/draft/2020-12/json-schema-validation)
[Node TypeScript 执行](https://nodejs.org/api/typescript.html)
