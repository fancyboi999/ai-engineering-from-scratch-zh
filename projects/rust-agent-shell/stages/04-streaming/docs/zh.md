# 经真实 stdin 流式输出有界 JSON 事件

**第 4 阶段，共 4 阶段。** Rust。预计约 2 小时。

用 BufRead 增量读输入，分配无界字符串前限制每行。EOF 时处理末尾未终止行，接受 CRLF。JSON 输出转义控制字符，每事件后刷新，使父 agent 立即看见结果。演示编译实际二进制，向同一循环输入确定性脚本。交互模式读取用户终端，直到 quit、EOF 或动作预算用尽。

```figure
pj-rust-agent-shell-4
```

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[阶段 3](../../03-session/docs/zh.md)。

客户端逐个读 JSON 事件，匹配适配器添加的请求 ID。每行刷新让 UI 无需等进程退出即可展示观测。

```text
request evidence -> {request_id:evidence, seq:2, kind:ok}
output: 2:Restore evidence: rehearsal completed at 09:20 UTC.
```

## 构建与检查

用 BufRead 块在构造命令字符串前约束分配。工具输出做 JSON 转义，不拼接原始文件文本。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py rust-agent-shell --stage 4 --path learning-artifacts/rust-agent-shell
```

累积阶段通过后，从仓库根对原创样本输入运行产物：

```bash
python3 learning-artifacts/rust-agent-shell/client.py projects/rust-agent-shell/examples/workspace projects/rust-agent-shell/examples/requests.jsonl --limit 8 --out observations.jsonl
```

JSONL 请求使用调用者 ID 和显式工具参数对象。适配器将它们转为有界 Rust stdin 语法。--limit 控制动作数；原生文件读取仍限 16 KiB。应用路径检查不提供操作系统隔离，也不消除恶意替换竞态。

提供的 Python 适配器为每输入 ID 写一份回执，保留全部原生响应。quit、预算耗尽或进程终止后未获响应的请求得到带停止原因的终止 `kind: "not-executed"` 回执。进程错误或超时保存部分回执流，非零退出。意外终止时，无答案请求没有执行证据；重试前检查原因。空输入不产生事件。

## 下一步探索

文件含引号、制表符或换行会怎样？
