# 构建显式审查门禁

**第 4 阶段，共 4 阶段。** Rust。预计约 2 小时。

跨阈值要求审查；低于阈值只表示这些规则未跨配置阈值。限制发现数量，验证全部来源切片，输出带行号和字面引文的文本报告。门禁从不执行 skill 指令。

```figure
pj-skill-scanner-4
```

## 实现边界

```rust
pub fn review(text:&str,findings:&[Finding],threshold:u32,max_findings:usize)->Result<String,Error>
```

主要参考：[官方参考](https://agentskills.io/specification)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[阶段 3](../../03-score-distinct-evidence-without-inflation/docs/zh.md)。

遍历调用者包，在版本化 JSON 输出文件路径、行号、字节偏移和来源引文。阈值要求审查；低于阈值不声明 skill 安全。

```text
benign bundle -> below-threshold
reviewable bundle -> review-required
findings retain path + exact source slice
```

## 构建与检查

扫描前拒绝符号链接、限制文件数和字节数。审查状态与安装器完整性检查分开。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py skill-scanner --stage 4 --path learning-artifacts/skill-scanner
```

累积阶段通过后，从仓库根对原创样本输入运行产物：

```bash
rustc --edition=2021 learning-artifacts/skill-scanner/cli.rs -o learning-artifacts/skill-scanner/scanner
learning-artifacts/skill-scanner/scanner projects/skill-scanner/examples/reviewable 3
```

扫描器输出版本化 JSON，含文件路径、精确 UTF-8 字节区间和提示规则。显式模式会漏混淆内容，也可能标记无害文档。below-threshold 不代表安全；扫描状态从不替代安装完整性或人工审查。

## 下一步探索

批准升级前，你会讨论哪个新增发现项？
