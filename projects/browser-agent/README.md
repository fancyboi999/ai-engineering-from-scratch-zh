# 浏览器 agent

一份表单运行回执：先检查请求的值，再相信成功横幅。

需要 Node 22.18+、Python 3，以及 DOM 标签、异步函数、子进程参数和字节数组知识。实时 Chromium 还需要已安装的 gstack browse 可执行文件。核心使用标准库。评分器检查你选定的工作区，绝不会用参考实现补齐缺失的行为。

## 构建并运行你的版本

从仓库根目录初始化一次。全新的 starter 会有意失败。

```bash
python3 scripts/project_test.py browser-agent --init learning-artifacts/browser-agent
python3 scripts/project_test.py browser-agent --stage 1 --path learning-artifacts/browser-agent --strict
```

逐阶段实现，然后运行累积评分器和提供的输入驱动器：

```bash
python3 scripts/project_test.py browser-agent --all --path learning-artifacts/browser-agent --strict
cd learning-artifacts/browser-agent
node cli.ts --task samples/contact.json --output browser-run.json
```

驱动器和离线样本是提供的脚手架，其导入指向你的实现。公共输入类型和函数签名见 starter 和 [API 契约](API.md)。

## 单独检查参考实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py browser-agent --all --solution --strict
cd projects/browser-agent/solution
node cli.ts --task samples/contact.json --output browser-run.json
```

## 观察变化

contact 任务填入 Mira Chen 和 mira@example.test，提交一次，再验证 DOM 状态和截图像素。第二个样本已有填好的姓名，因此少需一次操作。

编辑样本的副本，再次运行命令。把输入与输出放在一起，方便别人复现；提供的样本是专门编写的教学数据。

## 集成与限制

以实现 observe、act 和 capture 的适配器替换 Driver。只有在启动教学 fixture 的服务并设置 BROWSE_BIN 后，才运行 cli.ts --live。

离线模式测试 fixture 的状态转换和记录的像素。绿色像素只是该 fixture 特有的信号，不代表通用视觉理解。实时 CLI 仅限访问明确允许的回环页面。

要实际运行浏览器，在一个终端中为完成的工作区启动服务：

```bash
python3 -m http.server 8877 --bind 127.0.0.1
```

在该工作区的另一个终端中，将 BROWSE_BIN 设为已安装的 gstack 可执行文件，然后运行 `node cli.ts --task samples/contact.json --live`。运行器自行导航到配置的回环 URL，并保存真实截图。

## 阶段

1. [将 DOM 状态转成受约束的操作](stages/01-observations/docs/zh.md)
2. [在完成、停滞或预算耗尽时停止](stages/02-bounded-loop/docs/zh.md)
3. [用 Python 验证截图像素](stages/03-visual-proof/docs/zh.md)
4. [驱动真实 fixture 并为运行评分](stages/04-real-browser/docs/zh.md)


## 主要参考资料

[Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
[PNG 规范](https://www.w3.org/TR/png-3/)
[HTML 表单控件](https://html.spec.whatwg.org/multipage/forms.html)
