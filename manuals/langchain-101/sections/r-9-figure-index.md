# 图索引

> 本手册的每幅图按顺序列出，并附上图注所给出的那一条论点。

每一行链接到对应的图，论点即图块的 `claim:` 字段。构建时按各部分内图出现的顺序给图编号，所以图号就是它在本部分里的位置。图中的实测数字来自[我们的录制运行](manuals/langchain-101/capture/lab)，每幅柱状图等图表读取[汇总文件夹](manuals/langchain-101/capture/lab/summary)中的一个文件。第 9 部分的图表读取[生产服务的汇总](manuals/langchain-101/capture/lab/prodapp-mac/summary)。配色沿用前言中的色板：

- 紫罗兰色是你的代码：调用方、它的输入和它的配置
- 蓝色是 LangChain：`create_agent`、中间件、消息，以及作为对象的工具
- 靛蓝色是 LangGraph：图、它的节点、Pregel 循环和它的流
- 梅红色是聊天模型和每次模型调用
- 绿色是工具和它们返回的结果
- 橄榄色是进程之外的服务，例如提供方、LangSmith 或 Ollama
- 琥珀色是生命周期：步、下一个节点、中断和恢复
- 青色是持久状态：检查点、store 及其数据行
- 玫瑰色是故障：异常、错误消息或重复的副作用
- 灰色在 LangChain 之外：Python、包、机器和运维人员

```figure-index
```

来源：front.md 和 sections/ 下每个文件的图块；manual.json（色板）
