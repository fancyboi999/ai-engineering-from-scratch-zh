# 衡量审查小组的精确率与召回率

第 4 阶段，共 4 阶段。开始前阅读[项目的前置要求](../../../README.md)；本阶段建立在此前契约之上。

## 变化

将去重后的发现 id 与预期集合比较。精确率衡量预测发现中有多少符合预期；召回率衡量找回了多少预期发现。两个集合都要去重，避免重复审查抬高指标。预测数为零时，精确率为零，而不是误导性的满分。调整法定票数前，先试留出的输入。

本阶段的边界是 `evaluate`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

## 分析一个具体案例

宽泛本地审查者预测三条发现，其中两条是真阳性，因此 precision=2/3。法定票数保留两个预期发现：在这个样本上 precision=1、recall=1。预算为 1 时没有共识，recall 为 0。

```figure
pj-multi-agent-code-review-panel-4
```

修改实验输入，先算出结果，再看指标。图表根据输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.ts` 中实现 `evaluate`。先尝试实现契约，再阅读参考方案导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数返回结构化值，不在内部打印；CLI 负责打印最终结果。

使用[公开 API 契约](../../../API.md)和起始代码的类型化签名。核心函数返回值，提供的驱动器负责文件输入、参数解析和呈现。

使用同一个预期集合比较单独与合并后的预测。两个集合都去重，并保留源指纹；不同快照产生的指标不是可比较的证据。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py multi-agent-code-review-panel --init learning-artifacts/multi-agent-code-review-panel` 初始化一次。随后累积评分：

```bash
python3 scripts/project_test.py multi-agent-code-review-panel --stage 4 --path learning-artifacts/multi-agent-code-review-panel --strict
```

全新工作区应在契约实现之前失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/multi-agent-code-review-panel
node cli.ts --input samples/review.json --output panel.json --html panel.html
```

## 探查失败边界

留出一个只有一位审查者发现的案例。在把一致意见宣传为改进之前，衡量法定票数是否丢掉了这个真阳性。

本地审查者是不同的静态启发式规则，不是独立 LLM。共识衡量支持程度，不代表真相。外部回调必须遵守 AbortSignal；超时不能撤销远程副作用。


## 参考资料

[Node 中的 AbortController](https://nodejs.org/api/globals.html#class-abortcontroller)
[Node 测试运行器](https://nodejs.org/api/test.html)
