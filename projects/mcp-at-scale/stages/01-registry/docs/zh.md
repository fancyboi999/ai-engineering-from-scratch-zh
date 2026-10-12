# 构建 250 个只读工具的目录

第 1 阶段，共 5 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

为 50 种资源各创建五个限定范围的读操作。名称和 schema 稳定；执行读取注入的清单，不连接集群。工具 schema 定义精确接受的键和值，未知参数不会意外到达处理器。

## 推演一个具体案例

五十个资源族乘五种操作产生 250 个教学工具，但都共享同一种本地清单机制。只含 pods 的清单暴露五个有用资源工具；组合服务器加上 catalog_search，成为第六个。

```figure
pj-mcp-at-scale-1
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

实现 `registry.py`：`catalog`、`execute`。这是“具有 250 个工具的 MCP 服务器”的第 1 阶段产物。它消费明确的输入，返回下一阶段可使用、可检查的结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

将公共 name、description 和 inputSchema 与内部 resource/operation 元数据分开。查询清单前验证精确的参数键。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py mcp-at-scale --init learning-artifacts/mcp-at-scale` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py mcp-at-scale --stage 1 --path learning-artifacts/mcp-at-scale --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/mcp-at-scale
python3 cli.py samples/inventory.json --query "pods count" --max-chars 500
```

## 探查失败边界

向 pods_search 传入 {query:"worker",extra:true}。它必须失败，而不是悄悄忽略未识别的指令。




## 参考资料

[参考资料 1](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
[参考资料 2](https://www.jsonrpc.org/specification)
