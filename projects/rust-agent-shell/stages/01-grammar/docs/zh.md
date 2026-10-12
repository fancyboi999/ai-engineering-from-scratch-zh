# 解析刻意精简的动作语言

**第 1 阶段，共 4 阶段。** Rust。预计约 2 小时。

为 help、pwd、list、read、字面搜索和 quit 定义动作枚举。拒绝未知命令，包括类似 shell 的指令。搜索用制表符分隔模式和路径，使任一参数内空格仍有效。解析不调用子进程，输入限 4096 字节。这是模型无关工具循环，不是自然语言模型或操作系统 shell。

```figure
pj-rust-agent-shell-1
```

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

Rust 进程接受刻意精简的工具语言。Python 适配器接受含调用者 ID 与工具参数的 JSONL，只翻译已知命令。没有参数会变成操作系统 shell 命令。

```text
{"id":"evidence","tool":"search","arguments":{"pattern":"Restore","path":"release.md"}}
wire: search Restore<TAB>release.md
```

## 构建与检查

拒绝适配器参数中的控制字符，避免路径注入第二命令。区分解析拒绝和执行失败。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py rust-agent-shell --init learning-artifacts/rust-agent-shell
python3 scripts/project_test.py rust-agent-shell --stage 1 --path learning-artifacts/rust-agent-shell
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

调用者路径中的字面换行为何必须在 stdin 序列化前拒绝？
