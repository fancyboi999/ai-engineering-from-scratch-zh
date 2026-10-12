# 一次性消费绑定请求的批准

**第 3 阶段，共 4 阶段。** Rust。预计约 2 小时。

批准存完整类型化请求：ID、角色、工具、参数。仅在要求批准的决定中消费。不匹配、已使用或被拒请求失败，不修改批准。保留展示 ID 却改参数是冲突。应用仅在用户批准精确请求后创建记录。

```figure
pj-tool-call-firewall-3
```

## 实现边界

```rust
pub fn authorize(c:&Call,approval:Option<&mut Approval>)->Result<(),Error>
```

主要参考：[官方参考](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[工具模式设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md)。先完成[阶段 2](../../02-evaluate-role-and-path-policy/docs/zh.md)。

真实文件分派器把批准绑定类型化请求和写内容。执行写前消费回执。载荷变化或重放失败，不能再写。

```text
approved content="approved after restore"
changed content -> Conflict, file unchanged
exact content -> write, used=true
replay -> Conflict
```

## 构建与检查

消费批准前验证载荷大小和实际包含范围。一次性回执与 dispatch 留在同一可信应用边界。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py tool-call-firewall --stage 3 --path learning-artifacts/tool-call-firewall
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

允许跨进程重启复用批准前，需要什么持久回执存储？
