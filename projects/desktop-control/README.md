# 桌面控制后端

可审计的坐标与帧动作运行器，生成可复现的前后像素产物。

需要 Rust 2021 工具链，以及结构体、trait、泛型、Result、可变借用和字节向量知识。Python 3 运行评分器和演示包装器。核心使用标准库。评分器检查你选定的工作区，绝不会用参考实现填补缺失行为。

## 构建并运行你的版本

从仓库根目录初始化一次。新的 starter 会有意失败。

```bash
python3 scripts/project_test.py desktop-control --init learning-artifacts/desktop-control
python3 scripts/project_test.py desktop-control --stage 1 --path learning-artifacts/desktop-control --strict
```

实现每个阶段，再运行累积评分器和提供的输入驱动器：

```bash
python3 scripts/project_test.py desktop-control --all --path learning-artifacts/desktop-control --strict
cd learning-artifacts/desktop-control
rustc --edition 2021 cli.rs -o desktop-cli
./desktop-cli samples/actions.tsv desktop-frames
```

驱动器和离线样本是提供的脚手架。其导入解析到你的实现。公开输入类型和函数签名在 starter 与 [API 契约](API.md)中。

## 单独检查参考实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py desktop-control --all --solution --strict
cd projects/desktop-control/solution
rustc --edition 2021 cli.rs -o desktop-cli
./desktop-cli samples/actions.tsv desktop-frames
```

## 观察变化

六个 TSV 动作生成三张真实 PPM 捕获和 trace.txt。最后一行报告 complete=true calls=6。把首次点击的 generation 从 0 改成 9，会在第 2 行、点击之前失败。

编辑样本副本并重新运行命令。把输入放在输出旁，方便他人复现结果；提供的样本是原创教学数据。

## 集成与限制

Backend trait 是可复用边界。TSV 使用 capture、click<TAB>x<TAB>y<TAB>generation 和 type<TAB>text；运行器拒绝未知动作，并将调用上限设为 32。

CLI 使用 fixture 后端。原生捕获是 main.rs 中需要单独选择的命令；macOS 点击和输入方法需要操作系统权限，此处仍未验证。generation 失效检测的是此控制器的修改，不是任意外部桌面变化。

## 阶段

1. [验证帧和坐标空间](stages/01-frame-contract/docs/zh.md)
2. [渲染并操作 fixture 场景](stages/02-backend-trait/docs/zh.md)
3. [拒绝过期观测和耗尽的预算](stages/03-controller/docs/zh.md)
4. [构建显式启用的原生边界](stages/04-native-adapter/docs/zh.md)


## 主要参考资料

[Rust 进程命令](https://doc.rust-lang.org/std/process/struct.Command.html)
[AppleScript 语言指南](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/)
[PNG 规范](https://www.w3.org/TR/png-3/)
