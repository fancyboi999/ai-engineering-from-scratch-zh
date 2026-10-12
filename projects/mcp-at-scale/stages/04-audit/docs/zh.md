# 通过协议分页审计目录覆盖率

第 4 阶段，共 5 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

将分页视为客户端可见契约。通过处理器遍历每一页，跨页追踪重复名称。有限页数保护捕获意外游标循环。此审计验证协议清单，最后的类型化客户端再测试独立的操作系统进程边界。

## 推演一个具体案例

250 个工具、每页 32 个，需要八页：七个满页和最后 26 个。跨页保留已见名称，避免用新游标重复第一页却冒充完整覆盖。

```figure
pj-mcp-at-scale-4
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

实现 `audit.py`：`audit_catalog`。这是“具有 250 个工具的 MCP 服务器”的第 4 阶段产物。它消费明确的输入，返回下一阶段可使用、可检查的结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

通过 handle 驱动分页，不直接调用 catalog。审计内部数组无法发现传输层游标错误。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py mcp-at-scale --init learning-artifacts/mcp-at-scale` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py mcp-at-scale --stage 4 --path learning-artifacts/mcp-at-scale --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/mcp-at-scale
python3 cli.py samples/inventory.json --query "pods count" --max-chars 500
```

## 探查失败边界

在测试替身中故意返回同一游标两次。限制分页循环，暴露重复页，而不是无限继续。




## 参考资料

[参考资料 1](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
[参考资料 2](https://www.jsonrpc.org/specification)
