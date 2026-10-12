# 将 DOM 状态转成受约束的操作

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

从小型表单读取标签、值、禁用状态和稳定的 id。验证 id 唯一性和字段类型。每次选择一个操作：填写姓名、填写邮箱，再点击唯一确定的 Save request 按钮。页面正文绝不作为指令解释。字段缺失、标签歧义、危险按钮和意外来源都会明确返回阻止结果。

本阶段的边界是 `parseObservation, choose`。保持之前阶段的行为不变：最终评分器会在同一工作区运行所有阶段。

## 推演一个具体案例

页面有 Full name 和 Full name confirmation 两个字段。只能精确匹配请求的标签；选取第一个模糊匹配可能填错控件。如果两个字段共享请求的标签，应在修改前阻止操作。

```figure
pj-browser-agent-1
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

在工作区的 `main.ts` 中实现 `parseObservation, choose`。先尝试实现契约，再阅读参考实现的导出类型。保留 starter 的公共名称，让测试能够调用你的实现。核心函数返回结构化值，不在内部打印；CLI 打印最终结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

将 Task 视为调用者的授权，将 Observation 视为不可信的页面状态。根据观察到的 id 构建一个 fill 或 click 值；页面正文绝不提供代码或命令。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py browser-agent --init learning-artifacts/browser-agent` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py browser-agent --stage 1 --path learning-artifacts/browser-agent --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/browser-agent
node cli.ts --task samples/contact.json --output browser-run.json
```

## 探查失败边界

将 done=true，但让邮箱与任务不符。即使出现绿色横幅，也必须判定未完成。




## 参考资料

[Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
[PNG 规范](https://www.w3.org/TR/png-3/)
[HTML 表单控件](https://html.spec.whatwg.org/multipage/forms.html)
