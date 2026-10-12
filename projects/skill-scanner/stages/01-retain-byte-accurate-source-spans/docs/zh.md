# 保留字节精确的来源区间

**第 1 阶段，共 4 阶段。** Rust。预计约 2 小时。

将 UTF-8 来源拆成带行号的行，保留指向原缓冲区、终点不含的字节偏移。只去掉行终止符。发现项必须引用精确切片，不能在规范化后重构证据。

```figure
pj-skill-scanner-1
```

## 实现边界

```rust
pub fn spans(text:&str,max_bytes:usize)->Result<Vec<Span>,Error>
```

主要参考：[官方参考](https://agentskills.io/specification)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

来源证据使用字节偏移。含 café 的行占用的 UTF-8 字节多于可见字母，所以字符索引不能安全切 Rust 字符串。拆行时保留起止偏移。

```text
text="café\n.env"
first line bytes [0,5)
second line bytes [6,10)
```

## 构建与检查

按包含换行的原始行字节推进游标。只从展示引文中去掉 CRLF。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py skill-scanner --init learning-artifacts/skill-scanner
python3 scripts/project_test.py skill-scanner --stage 1 --path learning-artifacts/skill-scanner
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

错误偏移如何把本来正确的发现项变成无效证据？
