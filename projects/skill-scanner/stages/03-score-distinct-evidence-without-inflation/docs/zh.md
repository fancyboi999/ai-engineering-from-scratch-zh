# 对独立证据评分，避免膨胀

**第 3 阶段，共 4 阶段。** Rust。预计约 2 小时。

每来源行中每规则只计一次，即使收集器重复发现项。以溢出检查算术累加严重度。拒绝超范围严重度和不可能偏移，避免格式错误的扫描器数据伪装成低分。

```figure
pj-skill-scanner-3
```

## 实现边界

```rust
pub fn risk_score(findings:&[Finding])->Result<u32,Error>
```

主要参考：[官方参考](https://agentskills.io/specification)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[阶段 2](../../02-detect-named-advisory-patterns/docs/zh.md)。

每规则和来源行的发现项只计一次严重度。重复同检测不应增加风险，同一行两种不同能力仍是独立证据。

```text
line 7 secret-access severity 2, repeated twice -> 2
line 7 network-command severity 2 -> total 4
```

## 构建与检查

验证范围和严重度后按规则与行去重。总数使用检查溢出的加法。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py skill-scanner --stage 3 --path learning-artifacts/skill-scanner
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

为何只按行去重会隐藏第二种能力？
