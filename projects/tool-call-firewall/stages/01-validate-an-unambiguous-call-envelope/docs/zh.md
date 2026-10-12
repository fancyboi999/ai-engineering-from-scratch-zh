# 验证无歧义调用封装

**第 1 阶段，共 4 阶段。** Rust。预计约 2 小时。

此本地练习用竖线分隔符解析有界四字段封装。拒绝缺身份、控制字符和过长输入。语法刻意窄于 JSON，不得悄悄复用为通用线路协议。

```figure
pj-tool-call-firewall-1
```

## 实现边界

```rust
pub fn call(line:&str,max_bytes:usize)->Result<Call,Error>
```

主要参考：[官方参考](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[工具模式设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md)。

调用者应用提供身份；模型只提供建议操作。紧凑 Rust 封装含稳定请求 ID、角色、工具、相对参数，不含含糊分隔符或控制字符。

```text
r1|reader|read|notes.md -> typed request
r1|reader|read|notes.md|extra -> reject
```

## 构建与检查

策略评估前验证完整有界封装。CLI 中 trusted-role 是操作者参数，不是接受自模型文本的字段。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py tool-call-firewall --init learning-artifacts/tool-call-firewall
python3 scripts/project_test.py tool-call-firewall --stage 1 --path learning-artifacts/tool-call-firewall
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

模型能将 reader 替换为 editor 时会破坏什么？
