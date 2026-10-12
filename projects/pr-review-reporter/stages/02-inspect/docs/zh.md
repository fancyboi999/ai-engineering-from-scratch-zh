# 生成狭义审查候选

第 2 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

为动态 eval、shell exec、禁用 TLS 验证和空 catch 处理器构建明确的静态检测器。只检查添加行。这些模式产生审查候选，不证明存在可利用行为。保持 rule id 稳定，方便后续模型审查者报告同一问题时去重。

本阶段的边界是 `inspect`。保持之前阶段的行为不变：最终评分器会在同一工作区运行所有阶段。

## 推演一个具体案例

补丁添加 eval(input)，还有一条写着 // eval(input) is dangerous 的注释。看似可执行的行产生 dynamic-eval 候选；前导注释被抑制。

```figure
pj-pr-review-reporter-2
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

在工作区的 `main.ts` 中实现 `inspect`。先尝试实现契约，再阅读参考实现的导出类型。保留 starter 的公共名称，让测试能够调用你的实现。核心函数返回结构化值，不在内部打印；CLI 打印最终结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

稳定的 rule id 让另一位审查者报告同一问题而不产生重复发现。这些正则表达式仍缺少 AST，可能误读字符串或多行结构；每份报告中都要说明此限制。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py pr-review-reporter --init learning-artifacts/pr-review-reporter` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py pr-review-reporter --stage 2 --path learning-artifacts/pr-review-reporter --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/pr-review-reporter
node cli.ts --diff samples/change.diff --output review.json --html review.html --sarif review.sarif
```

## 探查失败边界

尝试含 eval( 的字符串字面量。决定加入词法状态解析，还是将它保留为文档已说明、需要人工审查的候选。




## 参考资料

[Git diff 格式](https://git-scm.com/docs/diff-format)
[Python 子进程与 JSON](https://docs.python.org/3/library/json.html)
