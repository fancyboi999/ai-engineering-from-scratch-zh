# 记录有界审计证据

**第 4 阶段，共 4 阶段。** Rust。预计约 2 小时。

策略决定后格式化稳定制表符分隔审计行。拒绝重复调用 ID，限制保留条目。省略参数以避免记录秘密内容；ID、角色、工具、决定足以统计授权结果。

```figure
pj-tool-call-firewall-4
```

## 实现边界

```rust
pub fn audit(log:&mut Vec<String>,c:&Call,d:&Decision,max_entries:usize)->Result<(),Error>
```

主要参考：[官方参考](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[工具模式设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md)。先完成[阶段 3](../../03-consume-a-request-bound-approval-once/docs/zh.md)。

紧凑审计记录结果，不复制文件内容。可执行程序返回请求 ID、相对参数、决定、输出、批准是否消费、重放是否拒绝。集成时将请求身份与应用结果一起记录。

```text
request r1 -> one policy row
file write succeeds -> approval_consumed=true
second dispatch -> replay_denied=true
```

## 构建与检查

追加前拒绝重复审计 ID 和满日志。有界内存审计不是持久防篡改日志。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py tool-call-firewall --stage 4 --path learning-artifacts/tool-call-firewall
```

累积阶段通过后，从仓库根对原创样本输入运行产物：

```bash
rustc --edition=2021 learning-artifacts/tool-call-firewall/cli.rs -o learning-artifacts/tool-call-firewall/firewall
learning-artifacts/tool-call-firewall/firewall projects/tool-call-firewall/examples/workspace reader r1 read notes.md
```

原生 CLI 要求调用应用提供可信角色。读写经 dispatch，验证规范路径包含关系，将写入绑定精确内容。批准在单次调用内于内存一次性使用。代码是文件工具强制约束示例，不是持久跨进程权威或操作系统沙箱。

## 下一步探索

你会哈希哪些非秘密字段，把持久批准回执与执行结果关联？
