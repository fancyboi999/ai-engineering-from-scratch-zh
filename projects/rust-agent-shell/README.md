# Rust 流式 agent 工具壳

可检查的仓库观测进程，可供不同编程 agent 使用。

Rust 进程接受刻意精简的工具语言。Python 适配器接受含调用者 ID 与工具参数的 JSONL，只翻译已知命令。没有参数会变成操作系统 shell 命令。

## 从学员工作区开始

[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)、[工具模式设计](../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md)。语言基础：[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)。

安装 Rust（`rustc`）与 Python 3.10+。核心用 Rust 标准库；Python 适配器编译到私有临时目录。

```bash
python3 scripts/project_test.py rust-agent-shell --init learning-artifacts/rust-agent-shell
python3 scripts/project_test.py rust-agent-shell --stage 1 --path learning-artifacts/rust-agent-shell
```

## 构建路线

1. [解析刻意精简的动作语言](stages/01-grammar/docs/zh.md)
2. [将文件工具限制在有界根目录](stages/02-filesystem/docs/zh.md)
3. [跟踪预算与终止状态](stages/03-session/docs/zh.md)
4. [经真实 stdin 流式输出有界 JSON 事件](stages/04-streaming/docs/zh.md)

## 用自己的输入运行

阶段完成后，这些命令在原创 Orchard 示例上运行你的工作区代码。把样本路径替换为自己的文件。

```bash
python3 learning-artifacts/rust-agent-shell/client.py projects/rust-agent-shell/examples/workspace projects/rust-agent-shell/examples/requests.jsonl --limit 8 --out observations.jsonl
```

先检查完整参考方案时，将同命令中的 `learning-artifacts/rust-agent-shell` 替换为 `projects/rust-agent-shell/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例明确，便于其他工具消费。

## 集成边界

JSONL 请求使用调用者 ID 和显式工具参数对象。适配器将它们转为有界 Rust stdin 语法。--limit 控制动作数；原生文件读取仍限 16 KiB。应用路径检查不提供操作系统隔离，也不消除恶意替换竞态。

```bash
python3 scripts/project_test.py rust-agent-shell --all --solution --strict
python3 scripts/project_test.py rust-agent-shell --all --path learning-artifacts/rust-agent-shell --strict
```

首命令检查参考方案，第二检查你的实现。发布的示例和测试是回归证据，不是生产认证或未见基准测试。

## 主要参考资料

- [Rust BufRead](https://doc.rust-lang.org/std/io/trait.BufRead.html)
- [Rust 文件系统路径](https://doc.rust-lang.org/std/path/struct.Path.html)
- [JSON 数据交换](https://www.rfc-editor.org/rfc/rfc8259)
