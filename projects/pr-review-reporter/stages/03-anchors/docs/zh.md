# 验证并合并发现

第 3 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

每个候选必须对应已有的添加行位置，并包含非空、精确的源子串。拒绝伪造文件、删除行位置、空引文和无效严重级别。按 file、line 和 rule 合并发现；审查者意见不一致时保留更高严重级别。引文门禁证明位置有支持，不证明安全主张为真；后者仍需审查。

本阶段的边界是 `verify, merge`。保持之前阶段的行为不变：最终评分器会在同一工作区运行所有阶段。

## 推演一个具体案例

模型建议引用正确文件，却引用了删除行。该文本不在添加行证据中，必须拒绝。两个有支持的同一 (file,line,rule) 报告合并，采用更高严重级别。

```figure
pj-pr-review-reporter-3
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

在工作区的 `main.ts` 中实现 `verify, merge`。先尝试实现契约，再阅读参考实现的导出类型。保留 starter 的公共名称，让测试能够调用你的实现。核心函数返回结构化值，不在内部打印；CLI 打印最终结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

分开 accepted 和 rejected 集合，调试审查时就不必相信每条建议。把提供的 JSON 当作未知数据：要求外层数组，然后在访问字段前拒绝 null、数组和非对象条目。要求 file、quote、rule、message 是字符串，line 是正整数，severity 受支持，且去除首尾空白后 quote、rule、message 非空。在 `rejected` 保留格式错误条目；相邻有效条目仍必须进入渲染和 SARIF 导出。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py pr-review-reporter --init learning-artifacts/pr-review-reporter` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py pr-review-reporter --stage 3 --path learning-artifacts/pr-review-reporter --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/pr-review-reporter
node cli.ts --diff samples/change.diff --output review.json --html review.html --sarif review.sarif
```

## 探查失败边界

只改有效候选的行号。确认别处相同的引文不会悄悄把发现移到其他位置。




## 参考资料

[Git diff 格式](https://git-scm.com/docs/diff-format)
[Python 子进程与 JSON](https://docs.python.org/3/library/json.html)
