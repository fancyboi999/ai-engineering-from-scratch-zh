# 持久化记忆服务器

具有修订历史的持久化记忆工作台，为 REST 和 MCP 提供统一边界。

需要 Node 22.18+、Rust 2021 和用于评分器的 Python 3；需了解 Promise、追加日志、HTTP、命名空间、修订版本和向量点积。核心使用标准库。评分器检查你选定的工作区，绝不会用参考实现补齐缺失的行为。

## 构建并运行你的版本

从仓库根目录初始化一次。全新的 starter 会有意失败。

```bash
python3 scripts/project_test.py memory-server --init learning-artifacts/memory-server
python3 scripts/project_test.py memory-server --stage 1 --path learning-artifacts/memory-server --strict
```

逐阶段实现，然后运行累积评分器和提供的输入驱动器：

```bash
python3 scripts/project_test.py memory-server --all --path learning-artifacts/memory-server --strict
cd learning-artifacts/memory-server
node cli.ts --data-dir memory-data --put samples/memory.json
node cli.ts --data-dir memory-data --query "cache policy"
node cli.ts --data-dir memory-data --history cache-policy
```

驱动器和离线样本是提供的脚手架，其导入指向你的实现。公共输入类型和函数签名见 starter 和 [API 契约](API.md)。

## 单独检查参考实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py memory-server --all --solution --strict
cd projects/memory-server/solution
node cli.ts --data-dir memory-data --put samples/memory.json
node cli.ts --data-dir memory-data --query "cache policy"
node cli.ts --data-dir memory-data --history cache-policy
```

## 观察变化

第一个进程追加修订版本 1。独立的另一个进程恢复并搜索该记录，带回来源。用 --revision 1 更新会追加修订版本 2；再次使用修订版本 0 会失败，日志不变。

编辑样本的副本，再次运行命令。把输入与输出放在一起，方便别人复现；提供的样本是专门编写的教学数据。

## 集成与限制

在环境中设置 MEMORY_TOKEN，运行 node cli.ts --data-dir memory-data --serve --port 8788。REST 和 MCP 共享同一存储；token 不写入文件。

每个数据目录只用一个写入进程。追加 JSONL 提供重启持久化，不保证断电或多进程事务。哈希词法向量不是语义嵌入。MCP HTTP 是有文档说明的工具子集，不提供流式传输或会话。

要持续提供服务，在环境中设置 MEMORY_TOKEN，再运行：

```bash
node cli.ts --data-dir memory-data --serve --port 8788
```

用相同目录重启以恢复历史。更新初始样本时使用新 id 或 `--revision 1`；以修订版本 0 再次创建会有意产生冲突。

## 阶段

1. [将文本、命名空间和来源放在一起](stages/01-record-contract/docs/zh.md)
2. [串行化带修订版本的写入](stages/02-durable-log/docs/zh.md)
3. [在真实 Rust 进程中为向量评分](stages/03-hybrid-search/docs/zh.md)
4. [提供 REST 和 MCP 工具](stages/04-transports/docs/zh.md)


## 主要参考资料

[MCP 工具规范](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
[Rust 标准库](https://doc.rust-lang.org/std/)
[Node HTTP API](https://nodejs.org/api/http.html)

## 可选标准 MCP 客户端验证

可选路径使用 `mcp==2.1.1`，即安装的官方 Python 客户端，连接项目的实际回环 HTTP 服务。它协商所声明的 2025-11-25 旧版工具契约。这不能证明支持每个更新的协议功能。

```bash
python3 -m venv .venv-mcp
.venv-mcp/bin/python -m pip install -r projects/memory-server/requirements-framework.txt
.venv-mcp/bin/python scripts/project_test.py memory-server --all --solution --optional --strict
```

使用 `--path learning-artifacts/memory-server`，对你的实现运行同一客户端。默认路径仍只使用标准库；缺少可选包会产生 SKIP，使严格的可选评分失败。

## 比较来源变化

写入初始样本后，在同一已完成工作区中运行以下命令：

```bash
node cli.ts --data-dir memory-data --put samples/memory-updated.json --revision 1
node cli.ts --data-dir memory-data --history cache-policy --html history.html
```

比较表保留两个来源定位信息和修订版本。修订版本 1 在 policies/cache.md:12 写着六十秒；修订版本 2 在第 18 行写着九十秒。保留旧来源让变化可审查。服务器不验证外部源文件是否仍与存储文本一致。
