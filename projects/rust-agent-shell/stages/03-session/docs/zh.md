# 跟踪预算与终止状态

**第 3 阶段，共 4 阶段。** Rust。预计约 2 小时。

将工具包进拥有根、请求计数、关闭状态的会话。每个已解析请求，包括被拒绝命令，都消耗一个动作槽。Quit 终止。超预算请求输出终止错误。区分解析拒绝和执行错误，让调用者能修复命令，不会与缺文件混淆。

```figure
pj-rust-agent-shell-3
```

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[阶段 2](../../02-filesystem/docs/zh.md)。

会话拥有请求预算和终止状态。无效请求也消耗尝试。通过可执行参数与适配器 --limit 暴露预算，让调用者能推理有界工作量。

```text
limit=2
request 1: list -> step 1
request 2: rejected grammar -> step 2
request 3 -> terminal budget_exhausted
```

## 构建与检查

每收到请求、分派前递增一次。关闭后，会话不得再读文件。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py rust-agent-shell --stage 3 --path learning-artifacts/rust-agent-shell
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

输出在请求 ID 收到事件前结束时，客户端应如何处理？
