# 解析明确的 frontmatter 子集

**第 1 阶段，共 4 阶段。** Rust。预计约 2 小时。

只拆开开头的 --- 块。接受普通或 JSON 兼容双引号单行键值对；保留值内冒号，拒绝重复键，从不解释 YAML 标签或别名。解析器刻意只支持 YAML 子集，不是通用实现。

```figure
pj-skill-validator-1
```

## 实现边界

```rust
pub fn parse(text: &str) -> Result<std::collections::BTreeMap<String,String>, Error>
```

主要参考：[官方参考](https://agentskills.io/specification)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

安装器输出带引号元数据。接受普通单行标量和 JSON 兼容双引号标量，包括转义引号和 Unicode。拒绝标签、别名、多行 YAML，不悄悄重新解释它们。

```text
description: "Check \"replicas\" first"
parsed description: Check "replicas" first
description: | -> unsupported syntax
```

## 构建与检查

在首个冒号拆头部行。元数据验证前解码引号值；重复键是冲突。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py skill-validator --init learning-artifacts/skill-validator
python3 scripts/project_test.py skill-validator --stage 1 --path learning-artifacts/skill-validator
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

兼容标准的子集为何需要显式不支持语法错误？
