# 图索引

> 按顺序列出本手册所有图，以及各图图注所表达的唯一结论。

每行链接到对应图，结论来自图块的 `claim:` 字段。图中实测数字来自我们的 [Mac 运行](manuals/sglang-101/capture/out)或 [GPU 运行](manuals/sglang-101/capture/gpu)，各节链接到所用文件。来自实践报告的数字会注明报告。颜色遵循前言配色：

- 蓝色表示 SGLang 服务器进程：分词器管理器、调度器和反分词器。
- 紫色表示模型及其前向传播：内核、注意力后端和 CUDA graphs。
- 绿色表示 KV 缓存：池槽位、radix tree 节点和缓存 token。
- 梅紫色表示模型计算：prefill 与 decode 步骤。
- 橄榄色表示客户端和网络。
- 靛蓝色表示流和消息。
- 琥珀色表示生命周期状态，例如请求状态或调度器阶段。
- 青色表示持久状态：主机内存、存储层和磁盘权重。
- 玫红色表示失败：内存耗尽、retract、中止或崩溃。
- 灰色表示 SGLang 外部：操作系统、其他程序和 GPU 驱动。

```figure-index
```

来源：front.md 及 sections/ 下所有文件的 figure 块；manual.json (palette)。
