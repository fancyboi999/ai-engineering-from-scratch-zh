# 驱动真实 fixture 并为运行评分

第 4 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

通过回环地址为 fixture.html 提供服务，用 gstack browse 导航到该页面。GstackDriver 读取 DOM 观察结果、填写标签、点击观察到的按钮，并捕获真实截图。命令使用参数数组而非 shell。用 --live 运行同一个有界策略，将轨迹与 fixture 后端比较。模拟运行和真实浏览器运行的完成分数要分开记录。

本阶段的边界是 `GstackDriver, scoreRuns`。保持之前阶段的行为不变：最终评分器会在同一工作区运行所有阶段。

## 推演一个具体案例

真实适配器导航到配置的回环 URL，通过 JavaScript 读取标签、填写观察到的 id，并捕获 browser-result.png。截图来自 Chromium；fixture 模式则有意复用预先编写的像素。

```figure
pj-browser-agent-4
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

在工作区的 `main.ts` 中实现 `GstackDriver, scoreRuns`。先尝试实现契约，再阅读参考实现的导出类型。保留 starter 的公共名称，让测试能够调用你的实现。核心函数返回结构化值，不在内部打印；CLI 打印最终结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

在 execFileSync 中分离可执行文件和参数。含引号的任务值仍是一个 fill 参数。导航前提供允许的来源，并在每次观察时重新检查。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py browser-agent --init learning-artifacts/browser-agent` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py browser-agent --stage 4 --path learning-artifacts/browser-agent --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/browser-agent
node cli.ts --task samples/contact.json --output browser-run.json
```

## 探查失败边界

在 127.0.0.1:8877 为 fixture.html 提供服务，设置 BROWSE_BIN，运行 cli.ts --task samples/contact.json --live。将模式、操作次数与截图一起记录。

离线模式测试 fixture 的状态转换和记录的像素。绿色像素只是该 fixture 特有的信号，不代表通用视觉理解。实时 CLI 仅限访问明确允许的回环页面。


## 参考资料

[Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
[PNG 规范](https://www.w3.org/TR/png-3/)
[HTML 表单控件](https://html.spec.whatwg.org/multipage/forms.html)
