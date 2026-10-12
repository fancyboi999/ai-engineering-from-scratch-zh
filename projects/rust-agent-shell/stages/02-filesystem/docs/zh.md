# 将文件工具限制在有界根目录

**第 2 阶段，共 4 阶段。** Rust。预计约 2 小时。

规范化工作区根和请求目标，拒绝绝对路径和父目录遍历，验证符号链接仍在根内。文本读取限 16 KiB，目录结果限 100 条，搜索限 50 个匹配行。这些是可信本地工作区的应用层约束；敌对并发符号链接替换需要更强操作系统原语或隔离。

```figure
pj-rust-agent-shell-2
```

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[阶段 1](../../01-grammar/docs/zh.md)。

读取 release.md 前在工作区根下解析它。词法路径看似无害，符号链接却可能指向工作区外文件。结果是应用层包含约束，不是进程沙箱。

```text
workspace=/work/orchard
release.md -> /work/orchard/release.md -> allowed
link.md -> /outside/credentials -> rejected
```

## 构建与检查

规范化根与目标，再比较路径组件。除了初始元数据长度，还要限制实际读取字节。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py rust-agent-shell --stage 2 --path learning-artifacts/rust-agent-shell
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

另一进程在规范化后替换路径，会留下什么竞态？
