# MCP 工具发现工作台

一个限定范围的 MCP 清单服务器，在可测量的上下文预算内发现 schema。

需要 Python 3.10+、Node 22.18+，以及字典、JSON-RPC 请求 id、stdin/stdout 和子进程知识。核心使用标准库。评分器检查你选定的工作区，绝不会用参考实现补齐缺失的行为。

## 构建并运行你的版本

从仓库根目录初始化一次。全新的 starter 会有意失败。

```bash
python3 scripts/project_test.py mcp-at-scale --init learning-artifacts/mcp-at-scale
python3 scripts/project_test.py mcp-at-scale --stage 1 --path learning-artifacts/mcp-at-scale --strict
```

逐阶段实现，然后运行累积评分器和提供的输入驱动器：

```bash
python3 scripts/project_test.py mcp-at-scale --all --path learning-artifacts/mcp-at-scale --strict
cd learning-artifacts/mcp-at-scale
python3 cli.py samples/inventory.json --query "pods count" --max-chars 500
```

驱动器和离线样本是提供的脚手架，其导入指向你的实现。公共输入类型和函数签名见 starter 和 [API 契约](API.md)。

## 单独检查参考实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py mcp-at-scale --all --solution --strict
cd projects/mcp-at-scale/solution
python3 cli.py samples/inventory.json --query "pods count" --max-chars 500
```

## 观察变化

文件提供三个资源族，暴露十五个读取工具和 catalog_search。搜索在精确的 tools 数组序列化预算内返回最匹配的 schema。完整教学注册表仍有 250 个工具。

编辑样本的副本，再次运行命令。把输入与输出放在一起，方便别人复现；提供的样本是专门编写的教学数据。

## 集成与限制

运行 `python3 cli.py /absolute/inventory.json --serve` 启动 stdio 服务器。tools/call catalog_search 接受 query、max_chars 和 k；响应返回选中的公共 schema 及其字符数。

stdio 传输实现了文档所述的 2025-06-18 和 2025-11-25 初始化/工具子集，不声称完全符合当前 MCP。清单读取使用本地记录；生成的工具数并不代表 250 个不同集成。

## 阶段

1. [构建 250 个只读工具的目录](stages/01-registry/docs/zh.md)
2. [在明确的上下文预算内选择工具](stages/02-discovery/docs/zh.md)
3. [通过 stdio 实现带初始化的 JSON-RPC](stages/03-protocol/docs/zh.md)
4. [通过协议分页审计目录覆盖率](stages/04-audit/docs/zh.md)
5. [用类型化客户端测试真实线协议](stages/05-typed-client/docs/zh.md)


## 主要参考资料

- [MCP 工具规范](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [JSON-RPC 2.0 规范](https://www.jsonrpc.org/specification)

## 可选标准 MCP 客户端验证

可选路径使用 `mcp==2.1.1`，即安装的官方 Python 客户端，连接项目的实际 stdio 进程。它协商所声明的 2025-11-25 旧版工具契约。这不能证明支持每个更新的协议功能。

```bash
python3 -m venv .venv-mcp
.venv-mcp/bin/python -m pip install -r projects/mcp-at-scale/requirements-framework.txt
.venv-mcp/bin/python scripts/project_test.py mcp-at-scale --all --solution --optional --strict
```

使用 `--path learning-artifacts/mcp-at-scale`，对你的实现运行同一客户端。默认路径仍只使用标准库；缺少可选包会产生 SKIP，使严格的可选评分失败。

## 导入小型 REST 契约

`rest_adapter.py` 导入具有唯一 operationId 和基本类型 path/query 参数的 OpenAPI 3 GET 操作。不支持的参数形式明确失败；排除写操作。每个导入操作保留规范化源规范的 SHA-256。

```bash
python3 cli.py samples/api-recordings.json --openapi samples/api.json --query "incident" --max-chars 800
python3 cli.py samples/api-recordings.json --openapi samples/api.json --serve
```

用 {"id":"checkout-1"} 调用 incident_get。教学记录必须匹配提供的参数；不同 id 会被拒绝，而不是收到误导性的预设答案。`--base-url http://127.0.0.1:PORT` 明确启用对你的回环 fixture 的实际 GET。拒绝重定向和非回环端点，请求五秒超时，响应字节上限为一 megabyte。此狭义导入器不承诺完整 OpenAPI 覆盖。
