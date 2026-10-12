# 公开实现契约

Backend trait 是可复用边界。TSV 使用 capture、click<TAB>x<TAB>y<TAB>generation 和 type<TAB>text；运行器拒绝未知动作，并将调用上限设为 32。

CLI 使用 fixture 后端。原生捕获是 main.rs 中需要单独选择的命令；macOS 点击和输入方法需要操作系统权限，此处仍未验证。generation 失效检测的是此控制器的修改，不是任意外部桌面变化。

类型化的 `main.rs` starter 定义 Frame、Point、Backend、FixtureBackend、Controller 和 MacBackend，包括全部方法签名。`cli.rs` 导入你的模块，只实现有界 TSV 输入和产物输出。缩放转换前坐标是物理像素；帧和 PPM 尺寸是有界整数。

阶段测试规定正常结果和被拒绝的输入。不要把学员导入替换为参考导入。最后阶段还会针对你的累积实现运行提供的输入驱动器。
