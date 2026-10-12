# 用有限预算修复

第 4 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 本阶段的变化

只向生成回调传递结构化校验反馈。解释输出前先计数每次调用。接受后立即停止；最后一次被拒绝后返回明确 exhausted 状态。provider 失败直接传播，不伪装成 schema 失败。跟踪记录每次尝试，因此第三次成功响应不会掩盖前两次契约违规。

本阶段的边界是 `repair`。保持前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

## 推演一个具体案例

样本先记录 confidence 1.5，再记录 0.8。第一个响应产生超出最大值的 issue；回调在第 2 次尝试前收到它。接受后立即返回，不消耗第三次调用。

```figure
pj-json-schema-output-guard-4
```

修改实验输入，在查看指标前先算出结果。图表会根据这些输入计算；下方的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.ts` 中实现 `repair`。先尝试实现契约，再阅读参考实现导出的类型。保留 starter 的公开名称，让测试能调用你的实现。核心函数返回结构化值，不要直接打印；CLI 会打印最终结果。

使用[公开 API 契约](../../../API.md)和带类型的 starter 签名。核心函数返回值，文件输入、参数解析和展示交给随附驱动程序。

调用 generate 前先调用 checkSchema，避免损坏的 schema 消耗 provider 预算。provider 异常必须保持为 provider 失败，不能变成无限重试的理由。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py json-schema-output-guard --init learning-artifacts/json-schema-output-guard` 初始化一次。随后累积评分：

```bash
python3 scripts/project_test.py json-schema-output-guard --stage 4 --path learning-artifacts/json-schema-output-guard --strict
```

全新工作区在你实现契约之前应当失败。完成所有阶段后，用随附样本运行你的实际产物：

```bash
cd learning-artifacts/json-schema-output-guard
node cli.ts --schema samples/schema.json --attempts samples/attempts.json --output guard.json --html guard.html
```

## 探查失败边界

提供两个无效响应，预算为 2。断言 exhausted 且跟踪恰好两行；再只把第二个响应换成有效对象，检查被接受的产物。

这是明确限定的 JSON Schema 子集。拒绝 $ref、format 和组合器。通过 schema 不代表回答符合事实。录制的修复不是实时模型调用。


## 参考资料

[JSON Schema 校验词汇](https://json-schema.org/draft/2020-12/json-schema-validation)
[Node TypeScript 执行](https://nodejs.org/api/typescript.html)
