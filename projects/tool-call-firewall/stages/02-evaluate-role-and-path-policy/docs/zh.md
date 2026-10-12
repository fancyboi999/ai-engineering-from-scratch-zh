# 评估角色与路径策略

**第 2 阶段，共 4 阶段。** Rust。预计约 2 小时。

只有 reader、editor 角色。读取用相对路径；写入需 editor 角色和批准。拒绝父组件、绝对路径、隐藏顶层路径、未知工具。这检查词法策略；实际文件适配器须执行符号链接安全包含约束。

```figure
pj-tool-call-firewall-2
```

## 实现边界

```rust
pub fn decide(c:&Call)->Decision
```

主要参考：[官方参考](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[工具模式设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md)。先完成[阶段 1](../../01-validate-an-unambiguous-call-envelope/docs/zh.md)。

策略拒绝未知角色、不支持工具和不安全路径组件。reader 可读包含范围内笔记；editor 写需批准。词法允许之后仍需 dispatch 的实际文件系统包含检查。

```text
reader + read notes.md -> Allow
reader + write notes.md -> Deny
editor + write notes.md -> ApprovalRequired
```

## 构建与检查

默认分支设为 Deny。真实文件访问前检查规范路径；不要把策略判定当操作系统隔离。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py tool-call-firewall --stage 2 --path learning-artifacts/tool-call-firewall
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

相对名没有父组件，符号链接为何仍可逃逸？
