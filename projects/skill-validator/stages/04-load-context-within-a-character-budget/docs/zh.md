# 在字符预算内加载上下文

**第 4 阶段，共 4 阶段。** Rust。预计约 2 小时。

发现返回名称与描述。激活仅在请求预算能容纳完整文本时追加正文。拒绝部分指令，不在约束中间截断。预算是字符，不是模型 token 估计。

```figure
pj-skill-validator-4
```

## 实现边界

```rust
pub fn disclose(skill: &Skill, activate: bool, budget: usize) -> Result<String, Error>
```

主要参考：[官方参考](https://agentskills.io/specification)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[阶段 3](../../03-contain-resource-paths/docs/zh.md)。

发现只加载元数据；激活追加指令。CLI 随后可在完整上下文容纳得下时追加一个显式引用。统计字符，不是字节或模型 token，绝不截断半条指令。

```text
metadata length=80; body=120; separators=2
activation needs 202 characters
budget 200 -> Limit
```

## 构建与检查

组装完整上下文后再比较字符数与预算。包含分隔符和请求资源文本。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py skill-validator --stage 4 --path learning-artifacts/skill-validator
```

累积阶段通过后，从仓库根对原创样本输入运行产物：

```bash
rustc --edition=2021 learning-artifacts/skill-validator/cli.rs -o learning-artifacts/skill-validator/validator
learning-artifacts/skill-validator/validator projects/skill-validator/examples/orchard-release 2000 --activate references/restore.md
```

解析器接受普通单行值和 JSON 兼容带引号字符串。刻意拒绝多行 YAML、别名、标签、流式集合。发现与激活上下文使用字符预算，不是模型 token。已有规范路径必须留在提供的 skill 目录内。

## 下一步探索

如何暴露基于分词器的预算，而不与此字符限制混淆？
