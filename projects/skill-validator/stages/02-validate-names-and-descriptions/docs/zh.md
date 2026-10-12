# 验证名称和描述

**第 2 阶段，共 4 阶段。** Rust。预计约 2 小时。

加载器仅接受 1 到 64 字节的小写名称，内部只允许单连字符，不限制数字开头；描述非空白且最多 1024 字符。验证 skill 目录名与元数据一致，避免发现阶段悄悄重命名包。

```figure
pj-skill-validator-2
```

## 实现边界

```rust
pub fn validate(fields: &std::collections::BTreeMap<String,String>, directory: &str) -> Result<Skill, Error>
```

主要参考：[官方参考](https://agentskills.io/specification)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[阶段 1](../../01-parse-an-explicit-frontmatter-subset/docs/zh.md)。

元数据标识包。Orchard-release 含大写字母，不符合可移植小写语法；orchard-release 在不同名目录里不通过身份验证。

```text
directory=orchard-release
name=orchard-release -> valid
name=orchard--release -> invalid name
```

## 构建与检查

按契约统计名称字节数与描述 Unicode 标量数。解析后保留人类可读描述。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py skill-validator --stage 2 --path learning-artifacts/skill-validator
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

改目录名为何也应要求改元数据？
