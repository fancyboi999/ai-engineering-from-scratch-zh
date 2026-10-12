# 用类型化客户端测试真实线协议

第 5 阶段，共 5 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

父进程和子进程内存独立。序列化请求、保留 id，并在解析后关联回复。初始化通知有意不带 id、不接收响应。期待每个输入行都有一个输出行的客户端会挂起。

同时限制经过时间和累计输出。服务器可能停滞或无限打印，只有响应超时还不够。检查退出码，分离 stderr 和 JSON 输出。创建进程前拒绝重复的发送 id。

## 推演一个具体案例

类型化客户端启动独立 Python 进程，在请求后关闭 stdin，并验证响应 id。组合 CLI 也可持续为 stdio MCP 客户端提供你的清单。

```figure
pj-mcp-at-scale-5
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

实现阶段测试和 API 契约中命名的公共接口。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

分离 stderr 和协议 stdout。限制时间和累计输出，超时或响应格式错误时终止子进程。类型化 Response 注解不能在运行时验证外部 JSON。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py mcp-at-scale --init learning-artifacts/mcp-at-scale` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py mcp-at-scale --stage 5 --path learning-artifacts/mcp-at-scale --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/mcp-at-scale
python3 cli.py samples/inventory.json --query "pods count" --max-chars 500
```

## 探查失败边界

运行完整 stdio 集成回归：initialize、notify、pods_count。再通过同一边界检查 catalog_search，保留其精确上下文字符数。

stdio 传输实现了文档所述的 2025-06-18 和 2025-11-25 初始化/工具子集，不声称完全符合当前 MCP。清单读取使用本地记录；生成的工具数并不代表 250 个不同集成。


## 参考资料

[MCP stdio 传输](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)

## 可选标准 MCP 客户端验证

可选路径使用 `mcp==2.1.1`，即安装的官方 Python 客户端，连接项目的实际 stdio 进程。它协商所声明的 2025-11-25 旧版工具契约。这不能证明支持每个更新的协议功能。

```bash
python3 -m venv .venv-mcp
.venv-mcp/bin/python -m pip install -r projects/mcp-at-scale/requirements-framework.txt
.venv-mcp/bin/python scripts/project_test.py mcp-at-scale --all --solution --optional --strict
```

使用 `--path learning-artifacts/mcp-at-scale`，对你的实现运行同一客户端。默认路径仍只使用标准库；缺少可选包会产生 SKIP，使严格的可选评分失败。
