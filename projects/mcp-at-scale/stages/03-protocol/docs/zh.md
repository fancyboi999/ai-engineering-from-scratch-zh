# 通过 stdio 实现带初始化的 JSON-RPC

第 3 阶段，共 5 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

协议有生命周期：协商版本、接收 initialized 通知，然后列出或调用工具。通知没有响应。分离传输错误与工具执行错误，保留请求 id，分页目录而非一次返回全部 250 个 schema。

## 推演一个具体案例

initialize id1 返回版本和能力。notifications/initialized 没有 id，不输出任何行。随后 tools/call id2 返回带 id2 的内容或协议错误。若把输入行数当作预期响应数，就会挂起。

```figure
pj-mcp-at-scale-3
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

实现 `protocol.py`：`handle`、`serve`。这是“具有 250 个工具的 MCP 服务器”的第 3 阶段产物。它消费明确的输入，返回下一阶段可使用、可检查的结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

分别维护 negotiated 和 initialized 状态。CLI 向 serve 提供限定范围的目录；catalog_search 工具调用第 2 阶段测试过的同一 discover 函数。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py mcp-at-scale --init learning-artifacts/mcp-at-scale` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py mcp-at-scale --stage 3 --path learning-artifacts/mcp-at-scale --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/mcp-at-scale
python3 cli.py samples/inventory.json --query "pods count" --max-chars 500
```

## 探查失败边界

初始化前调用工具，再完成生命周期，对样本清单调用 pods_count。比较协议错误 -32002 与成功文本结果 "2"。




## 参考资料

[参考资料 1](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
[参考资料 2](https://www.jsonrpc.org/specification)
