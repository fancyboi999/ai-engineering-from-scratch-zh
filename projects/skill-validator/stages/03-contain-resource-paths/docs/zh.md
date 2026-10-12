# 约束资源路径

**第 3 阶段，共 4 阶段。** Rust。预计约 2 小时。

相对 skill 根解析资源名。拼接前拒绝绝对路径、父组件、Windows 分隔符，再规范化已有路径，防符号链接逃逸。规范化检查当前文件系统；生产敌对加载器需相对描述符打开，消除后续替换竞态。

```figure
pj-skill-validator-3
```

## 实现边界

```rust
pub fn reference_path(root: &std::path::Path, resource: &str) -> Result<std::path::PathBuf, Error>
```

主要参考：[官方参考](https://agentskills.io/specification)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[阶段 2](../../02-validate-names-and-descriptions/docs/zh.md)。

资源查找相对 skill 文件夹。解析 references/restore.md，验证规范路径仍在文件夹内；任何读取前拒绝父目录遍历。

```text
resource references/restore.md -> contained file
resource ../private.md -> invalid component
symlink outside root -> escapes root
```

## 构建与检查

拼接前验证路径组件，再规范化。教学加载器不消除恶意路径替换竞态。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py skill-validator --stage 3 --path learning-artifacts/skill-validator
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

对原始路径文本用 starts_with 为何不足以约束包含范围？
