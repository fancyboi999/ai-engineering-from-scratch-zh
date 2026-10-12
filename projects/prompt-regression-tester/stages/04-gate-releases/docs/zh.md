# 按明确容差设置发布门禁

**第 4 阶段，共 4 阶段。** Python。预计约 2 小时。

发布规则把测量转换成决策。要求最低通过比例和最高回归数量。先检查阈值取值域：NaN 和越界值不能让门禁失效。

空测试集保守拒绝。零证据的发布决策不同于零失败的发布决策。输出在决策旁保留测量结果，供审核。

```figure
pj-prompt-regression-tester-4
```

主要参考：[主要技术参考](https://docs.python.org/3/library/difflib.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[结构化输出](../../../../../phases/11-llm-engineering/03-structured-outputs/docs/zh.md)。先完成[第 3 阶段](../../03-pair-revisions/docs/zh.md)。

发布门禁是可执行政策。三个案例中只要一个回归，即使其他响应改进，候选仍被阻止。将 JSON 和 Markdown 差异保存为 CI 产物。

```text
cases=3; candidate passes=2; regressions=1
minimum pass fraction=1; regression budget=0
decision=block; CLI exit=1
```

## 构建与检查

比较数值前，检查阈值有限且测试集非空。退出状态必须与报告的决策一致。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py prompt-regression-tester --stage 4 --path learning-artifacts/prompt-regression-tester
```

累积阶段通过后，在仓库根目录用原创样本输入运行你的产物：

```bash
python3 learning-artifacts/prompt-regression-tester/cli.py projects/prompt-regression-tester/examples/cases.json projects/prompt-regression-tester/examples/baseline.json projects/prompt-regression-tester/examples/candidate.json --out prompt-diff.json --markdown prompt-diff.md
```

附带录制是编写的 fixture。工具比较录制响应，不调用模型，也不能证明语义正确。JSON 案例和响应文件是公开接口。门禁阻止发布时退出码为 1。

## 下一步探究

真实支持事故后你会添加什么断言？怎样保留其录制来源？
