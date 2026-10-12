# 在明确的上下文预算内选择工具

第 2 阶段，共 5 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

发送工具到上下文窗口前，对元数据排序。计算每个所选 schema 的实际紧凑 JSON 字符数，在明确预算处停止。这是字符预算，不是模型 token 估计；如实标明单位。名称平局的稳定排序让发现可复现。

## 推演一个具体案例

两个紧凑长度为 200 和 220 的 schema，在数组中占 423 字符：200+220、两个括号和一个逗号。只加单项长度会少算，可能超出 420 字符预算。

```figure
pj-mcp-at-scale-2
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

实现 `discovery.py`：`discover`。这是“具有 250 个工具的 MCP 服务器”的第 2 阶段产物。它消费明确的输入，返回下一阶段可使用、可检查的结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

接受下一个 schema 前，测量候选所选数组的 JSON 序列化长度。排序与装包是两回事：排名高但过大的 schema 可以跳过，较小且有用的 schema 仍能放下。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py mcp-at-scale --init learning-artifacts/mcp-at-scale` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py mcp-at-scale --stage 2 --path learning-artifacts/mcp-at-scale --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/mcp-at-scale
python3 cli.py samples/inventory.json --query "pods count" --max-chars 500
```

## 探查失败边界

将 max_chars 设为单个所选 schema 数组的精确大小，再减一字符。无需估计模型 token 即可验证边界。




## 参考资料

[参考资料 1](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
[参考资料 2](https://www.jsonrpc.org/specification)
