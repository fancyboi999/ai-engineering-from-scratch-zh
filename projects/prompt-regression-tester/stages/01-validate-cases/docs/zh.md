# 评分前校验案例

**第 1 阶段，共 4 阶段。** Python。预计约 2 小时。

评估案例需要稳定 id、prompt 和少量断言。结果变成字典时，重复 id 会悄悄覆盖证据。回放任何响应前先校验 id 和断言类型。

这里的断言是字面文本检查和 JSON 语法检查，可用于发现契约漂移，但无法证明事实正确或语气合适。将这些限制与门禁实际执行的要求分开说明。

```figure
pj-prompt-regression-tester-1
```

主要参考：[主要技术参考](https://docs.python.org/3/library/difflib.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[结构化输出](../../../../../phases/11-llm-engineering/03-structured-outputs/docs/zh.md)。

Orchard 必须返回 JSON 并保留来源定位信息。将 `format-json` 和 `source-link` 保持为不同案例 id：它们是对调用方的两个独立承诺。比较运行前，录制文件对整个案例列表（含 prompt 和检查）计算哈希。

```text
case ids: [format-json, source-link]
checks: json; contains("source:")
repeat format-json -> reject before replay
```

## 构建与检查

校验时构建 id 集合。查找录制响应前，先校验每种检查类型。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py prompt-regression-tester --init learning-artifacts/prompt-regression-tester
python3 scripts/project_test.py prompt-regression-tester --stage 1 --path learning-artifacts/prompt-regression-tester
```

预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案通过不代表你的学习者工作区已完成。

## 下一步探究

只改 prompt 措辞。为什么原来的案例哈希必须不再匹配？
