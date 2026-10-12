# 拒绝过期观测和耗尽的预算

第 3 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 行为变化

在后端外包一层 Controller。每次后端调用前预留动作预算，点击前要求已捕获帧，修改后使该帧失效。过期 generation 必须在点击前失败。保留成功动作的轨迹；即使后端返回错误，也要计入尝试的后端调用。

## 推演一个具体案例

捕获 generation 0，点击一次，再尝试用 generation 0 点击。控制器在首次修改后使保存的帧失效，因此第二次点击需要新捕获。

```figure
pj-desktop-control-3
```

更改实验输入，在读指标前先计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.rs` 实现 `Controller.capture, Controller.click, Controller.type_text`。保持此前阶段正常工作。先阅读函数签名和测试，再逐一实现边界。fixture 是确定性的测试后端，其结果不能证明原生操作系统行为。

使用[公开 API 契约](../../../API.md)和类型化 starter 签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和展示。

调用可能失败的后端方法前预留调用预算。后端失败仍消耗一次尝试调用。修改前清除缓存帧，避免错误留下不安全的复用机会。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py desktop-control --init learning-artifacts/desktop-control` 初始化一次，再进行累积评分：

```bash
python3 scripts/project_test.py desktop-control --stage 3 --path learning-artifacts/desktop-control --strict
```

新工作区应失败，直到你实现契约。全部阶段完成后，用提供的样本运行实际产物：

```bash
cd learning-artifacts/desktop-control
rustc --edition 2021 cli.rs -o desktop-cli
./desktop-cli samples/actions.tsv desktop-frames
```

## 探索失败边界

用提供的 TSV 运行 33 次捕获。32 次调用预算必须停止执行，并报告动作文件的实际行号。




## 参考资料

[Rust 进程命令](https://doc.rust-lang.org/std/process/struct.Command.html)
[AppleScript 语言指南](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/)
[PNG 规范](https://www.w3.org/TR/png-3/)
