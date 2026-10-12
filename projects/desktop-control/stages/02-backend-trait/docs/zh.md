# 渲染并操作 fixture 场景

第 2 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 行为变化

在一个 Backend trait 后定义 capture、click 和 type_text。fixture 根据状态绘制真实 PPM 图像：文本框、提交区域和绿色完成场景。点击文本框改变焦点，输入需要焦点，只有存在文本后点击提交才完成。fixture 无需控制用户桌面就能复现状态转移错误。

## 推演一个具体案例

fixture 初始无焦点。点击(50,70) 聚焦输入框，输入 Mira 存储文本，点击(230,160) 完成场景。前后捕获包含不同的真实 RGB 字节。

```figure
pj-desktop-control-2
```

更改实验输入，在读指标前先计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.rs` 实现 `Backend, FixtureBackend`。保持此前阶段正常工作。先阅读函数签名和测试，再逐一实现边界。fixture 是确定性的测试后端，其结果不能证明原生操作系统行为。

使用[公开 API 契约](../../../API.md)和类型化 starter 签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和展示。

PPM P6 以 ASCII 头 P6、宽/高、255 开始，后面是 width*height*3 个字节。按行优先遍历像素，根据后端状态得出各颜色。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py desktop-control --init learning-artifacts/desktop-control` 初始化一次，再进行累积评分：

```bash
python3 scripts/project_test.py desktop-control --stage 2 --path learning-artifacts/desktop-control --strict
```

新工作区应失败，直到你实现契约。全部阶段完成后，用提供的样本运行实际产物：

```bash
cd learning-artifacts/desktop-control
rustc --edition 2021 cli.rs -o desktop-cli
./desktop-cli samples/actions.tsv desktop-frames
```

## 探索失败边界

输入前提交，检查 complete=false。逼真的 fixture 必须模拟失败转移，而不是任意点击后都涂成绿色。




## 参考资料

[Rust 进程命令](https://doc.rust-lang.org/std/process/struct.Command.html)
[AppleScript 语言指南](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/)
[PNG 规范](https://www.w3.org/TR/png-3/)
