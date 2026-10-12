# 构建显式启用的原生边界

第 4 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 行为变化

不用 shell，构造 macOS screencapture 和 AppleScript 参数数组。把输入文本作为参数传递，绝不能作为可执行脚本内容。从原生截图头读取 PNG 尺寸，保留实际图像载荷。默认演示仍使用 fixture。原生捕获需要显式 --native-capture 标记、操作系统权限；显示缩放时还需要调用者提供 DESKTOP_SCALE。原生点击和输入是库方法，不是自动演示动作。

## 推演一个具体案例

文本载荷 `Mira "quoted"` 属于 osascript argv 元素。绝不能粘贴到 AppleScript 程序字符串中。这样无论引号如何都能保留参数边界。

```figure
pj-desktop-control-4
```

更改实验输入，在读指标前先计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.rs` 实现 `click_argv, text_argv, png_dimensions, MacBackend`。保持此前阶段正常工作。先阅读函数签名和测试，再逐一实现边界。fixture 是确定性的测试后端，其结果不能证明原生操作系统行为。

使用[公开 API 契约](../../../API.md)和类型化 starter 签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和展示。

将原生捕获、点击和输入置于 Backend 后面。TSV CLI 测试 fixture；可选原生适配器需要单独权限和可丢弃的目标应用。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py desktop-control --init learning-artifacts/desktop-control` 初始化一次，再进行累积评分：

```bash
python3 scripts/project_test.py desktop-control --stage 4 --path learning-artifacts/desktop-control --strict
```

新工作区应失败，直到你实现契约。全部阶段完成后，用提供的样本运行实际产物：

```bash
cd learning-artifacts/desktop-control
rustc --edition 2021 cli.rs -o desktop-cli
./desktop-cli samples/actions.tsv desktop-frames
```

## 探索失败边界

检查 cli.rs 生成的 frame-1.ppm、frame-4.ppm 和 frame-6.ppm。解释变化像素证明了什么，以及为何不能证明原生 macOS 行为。

CLI 使用 fixture 后端。原生捕获是 main.rs 中需要单独选择的命令；macOS 点击和输入方法需要操作系统权限，此处仍未验证。generation 失效检测的是此控制器的修改，不是任意外部桌面变化。


## 参考资料

[Rust 进程命令](https://doc.rust-lang.org/std/process/struct.Command.html)
[AppleScript 语言指南](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/)
[PNG 规范](https://www.w3.org/TR/png-3/)
