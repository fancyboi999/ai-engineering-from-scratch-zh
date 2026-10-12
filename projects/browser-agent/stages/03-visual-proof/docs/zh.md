# 用 Python 验证截图像素

第 3 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

读取 PNG 签名、块长度和 CRC，再解压有大小上限的图像载荷。逆向还原 PNG 行过滤器，统计代表成功的绿色像素。将这个视觉信号与 DOM 标记结合；单独任何一个都不够。这是针对教学 fixture 的狭义像素状态检测器，不是 OCR 或通用视觉。损坏、超大、交错以及不支持的颜色格式均明确失败。

本阶段的边界是 `inspectPNG`。保持之前阶段的行为不变：最终评分器会在同一工作区运行所有阶段。

## 推演一个具体案例

4x4 的 RGB 截图包含 16 个像素。四个绿色像素得到 0.25，零个则得到 0.0。有效 PNG 签名只是开端：改变一个 IHDR 字节而不更新 CRC 必须失败。

```figure
pj-browser-agent-3
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

在工作区的 `main.ts` 中实现 `inspectPNG`。先尝试实现契约，再阅读参考实现的导出类型。保留 starter 的公共名称，让测试能够调用你的实现。核心函数返回结构化值，不在内部打印；CLI 打印最终结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

过滤器 1：还原字节 = 存储字节 + 左侧已还原字节，再对 256 取模。过滤器 2 使用上一行。RGB 每像素三个字节，因此左侧是 index-3，不是 index-1。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py browser-agent --init learning-artifacts/browser-agent` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py browser-agent --stage 3 --path learning-artifacts/browser-agent --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/browser-agent
node cli.ts --task samples/contact.json --output browser-run.json
```

## 探查失败边界

构造一行，像素为 (20,140,80) 和 (30,150,90)。对于红色字节，过滤器 1 存储 20 和 10；还原必须得到 20 和 30。通用颜色检测仍不在此 fixture 契约范围内。




## 参考资料

[Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
[PNG 规范](https://www.w3.org/TR/png-3/)
[HTML 表单控件](https://html.spec.whatwg.org/multipage/forms.html)
