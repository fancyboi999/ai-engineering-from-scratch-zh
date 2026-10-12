# 提供 REST 和 MCP 工具

第 4 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

绑定本地服务器，要求 bearer token，限制请求体，并通过 JSON-RPC POST 实现 health、REST 写入/搜索及 MCP 初始化/工具子集。工具执行失败在成功的 JSON-RPC 响应中使用 isError；未知协议方法使用 JSON-RPC 错误。这是教学子集，不提供会话、流式传输或生产认证。测试实际 HTTP 字节，避免序列化丢失来源或修订版本。

本阶段的边界是 `createMemoryServer`。保持之前阶段的行为不变：最终评分器会在同一工作区运行所有阶段。

## 推演一个具体案例

持久化 CLI 选择保留的目录，只绑定 127.0.0.1。REST 写入与 MCP tools/call memory_search 使用同一 MemoryStore，因此来源和修订版本必须经两条序列化路径保留下来。

```figure
pj-memory-server-4
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

在工作区的 `main.ts` 中实现 `createMemoryServer`。先尝试实现契约，再阅读参考实现的导出类型。保留 starter 的公共名称，让测试能够调用你的实现。核心函数返回结构化值，不在内部打印；CLI 打印最终结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

将请求体分块收集为字节，完整请求到达后才一次性解码 UTF-8，让跨网络块的码点保持完整。将输入请求体限制为 50,000 字节。超限时发送 HTTP 413，包含 {"error":"body too large"} 和 Connection: close；未完成上传不能让连接保持打开。

通过 MEMORY_TOKEN 设置 bearer token，绝不打印。以受支持版本初始化，检查完整 memory_put schema，再发送格式错误的参数，确认工具级 isError 响应。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py memory-server --init learning-artifacts/memory-server` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py memory-server --stage 4 --path learning-artifacts/memory-server --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/memory-server
node cli.ts --data-dir memory-data --put samples/memory.json
node cli.ts --data-dir memory-data --query "cache policy"
node cli.ts --data-dir memory-data --history cache-policy
```

## 探查失败边界

用相同目录重启服务，查询先前记录。区分重启持久化、多写入者锁和断电持久性；此日志不提供后两者。

每个数据目录只用一个写入进程。追加 JSONL 提供重启持久化，不保证断电或多进程事务。哈希词法向量不是语义嵌入。MCP HTTP 是有文档说明的工具子集，不提供流式传输或会话。


## 参考资料

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
