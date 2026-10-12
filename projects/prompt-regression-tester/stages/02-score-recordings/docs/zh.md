# 不调用模型，对录制输出评分

**第 2 阶段，共 4 阶段。** Python。预计约 2 小时。

录制与回放将评估器与模型可用性、采样波动隔离。每个响应接受每项检查评分；只有全部检查通过，案例才通过。缺失响应算失败。

字面子串检查刻意区分大小写。规范化大小写或标点会改变断言，若需要这类转换，应在另一种检查类型中明确表达。

```figure
pj-prompt-regression-tester-2
```

主要参考：[主要技术参考](https://docs.python.org/3/library/difflib.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[结构化输出](../../../../../phases/11-llm-engineering/03-structured-outputs/docs/zh.md)。先完成[第 1 阶段](../../01-validate-cases/docs/zh.md)。

有效 JSON 响应仍可能省略来源。对每个断言评分并保留单项结果，让维护者看到哪个承诺失败。

```text
response: {"answer":"ready"}
json -> true
contains("source:") -> false
case passed -> false
```

## 构建与检查

先评估检查列表，再应用 all()。缺失响应不能变成通过的空检查清单。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py prompt-regression-tester --stage 2 --path learning-artifacts/prompt-regression-tester
```

预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案通过不代表你的学习者工作区已完成。

## 下一步探究

在 excludes 检查前把响应转为小写，会改变 API_KEY 的契约吗？
