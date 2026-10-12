# 验证帧和坐标空间

第 1 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 行为变化

截图有物理像素尺寸，而原生桌面点击可能使用逻辑坐标。验证正数且有界的尺寸与有限显示缩放比例，在向下取整除法转换前拒绝帧外点。帧的 generation 标识了哪次观测是动作的依据。

## 推演一个具体案例

截图为 640x400 物理像素，缩放比例 2。Pixel(200,100) 映射到 logical(100,50)。Pixel(640,100) 已在图像外，不能通过除法变成看似合理的逻辑坐标。

```figure
pj-desktop-control-1
```

更改实验输入，在读指标前先计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.rs` 实现 `Frame.validate, Frame.logical_point`。保持此前阶段正常工作。先阅读函数签名和测试，再逐一实现边界。fixture 是确定性的测试后端，其结果不能证明原生操作系统行为。

使用[公开 API 契约](../../../API.md)和类型化 starter 签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和展示。

先在物理空间验证边界，再将每个坐标除以缩放比例并向下取整。浮点数转换为无符号整数前检查其有限性。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py desktop-control --init learning-artifacts/desktop-control` 初始化一次，再进行累积评分：

```bash
python3 scripts/project_test.py desktop-control --stage 1 --path learning-artifacts/desktop-control --strict
```

新工作区应失败，直到你实现契约。全部阶段完成后，用提供的样本运行实际产物：

```bash
cd learning-artifacts/desktop-control
rustc --edition 2021 cli.rs -o desktop-cli
./desktop-cli samples/actions.tsv desktop-frames
```

## 探索失败边界

尝试 NaN、负坐标和缩放比例 0。每个错误必须在调用 Backend.click 前发生。




## 参考资料

[Rust 进程命令](https://doc.rust-lang.org/std/process/struct.Command.html)
[AppleScript 语言指南](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/)
[PNG 规范](https://www.w3.org/TR/png-3/)
