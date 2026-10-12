# 解析不可信边界

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 本阶段的变化

模型响应是字节串。将整个字符串解析为 JSON，拒绝 Markdown 包装和尾随文本，并在解析前限制 UTF-8 字节大小。既接受 JSON 基本类型，也接受对象：基本类型是否有用由 schema 决定，不由解析器决定。不要不断删掉文本直到解析成功，那会隐藏真实输出契约。

本阶段的边界是 `parseJSON`。保持前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

## 推演一个具体案例

字符串 `{"answer":"yes"}` 是有效 JSON。加上尾随句子会让整个响应无效。删除该句以求解析成功，会隐藏 provider 契约违规。

```figure
pj-json-schema-output-guard-1
```

修改实验输入，在查看指标前先算出结果。图表会根据这些输入计算；下方的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.ts` 中实现 `parseJSON`。先尝试实现契约，再阅读参考实现导出的类型。保留 starter 的公开名称，让测试能调用你的实现。核心函数返回结构化值，不要直接打印；CLI 会打印最终结果。

使用[公开 API 契约](../../../API.md)和带类型的 starter 签名。核心函数返回值，文件输入、参数解析和展示交给随附驱动程序。

JSON.parse 前先计算 UTF-8 字节数。一千个非 ASCII 字符不一定只占一千字节。区分 JSON null 与缺失属性。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py json-schema-output-guard --init learning-artifacts/json-schema-output-guard` 初始化一次。随后累积评分：

```bash
python3 scripts/project_test.py json-schema-output-guard --stage 1 --path learning-artifacts/json-schema-output-guard --strict
```

全新工作区在你实现契约之前应当失败。完成所有阶段后，用随附样本运行你的实际产物：

```bash
cd learning-artifacts/json-schema-output-guard
node cli.ts --schema samples/schema.json --attempts samples/attempts.json --output guard.json --html guard.html
```

## 探查失败边界

尝试 Markdown 代码围栏和合法 JSON 基本类型。围栏在解析时失败；基本类型要等 schema 阶段判断是否适合。




## 参考资料

[JSON Schema 校验词汇](https://json-schema.org/draft/2020-12/json-schema-validation)
[Node TypeScript 执行](https://nodejs.org/api/typescript.html)
