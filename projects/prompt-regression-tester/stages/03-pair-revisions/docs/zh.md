# 跨版本比较相同案例

**第 3 阶段，共 4 阶段。** Python。预计约 2 小时。

平均值可能隐藏严重回归。按案例 id 配对版本，将各案例标记为改进、退步、稳定通过或稳定失败。新成功不能抵消必需行为的丢失。

两个版本使用相同案例列表。录制文件的多余键忽略，缺失键失败。这样即使一次录制任务未完成，也能比较版本，而不虚构结果。

```figure
pj-prompt-regression-tester-3
```

主要参考：[主要技术参考](https://docs.python.org/3/library/difflib.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[结构化输出](../../../../../phases/11-llm-engineering/03-structured-outputs/docs/zh.md)。先完成[第 2 阶段](../../02-score-recordings/docs/zh.md)。

候选修好了来源归属，却把机器可读 JSON 换成友好散文。计算平均值前先配对案例 id：一个改进修不好另一个被破坏的接口。

```text
format-json: pass -> fail = regressed
source-link: fail -> pass = improved
aggregate pass rate: unchanged
```

## 构建与检查

在响应旁保留 model、settings 和案例哈希。除非你明确允许该实验，CLI 会拒绝更改后的 model/settings。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py prompt-regression-tester --stage 3 --path learning-artifacts/prompt-regression-tester
```

预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案通过不代表你的学习者工作区已完成。

## 下一步探究

你会怎样向 JSON 消费者的负责人解释没有变化的通过率？
