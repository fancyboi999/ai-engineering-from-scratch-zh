# 图表索引

> 按顺序列出本手册全部图表，以及各图说明提出的核心结论。

每行链接到对应图表，结论是说明开头的粗体句。实测数字来自 `capture/out/` 下文件，说明列明文件名。GPU 数字标明其依据的实践报告或代码。颜色沿用前言配色：

- 蓝色表示 SGLang 服务进程：tokenizer manager、scheduler、detokenizer。
- 紫色表示模型与前向传播：内核、注意力后端、CUDA graphs。
- 绿色表示 KV 缓存：池槽位、基数树节点、缓存 token。
- 梅紫色表示模型计算：prefill 与 decode 步骤。
- 橄榄色表示客户端与网络。
- 靛蓝色表示流与消息。
- 琥珀色表示生命周期状态，例如请求状态或调度器阶段。
- 青绿色表示持久状态：主机内存、存储层、磁盘权重。
- 玫红色表示失败：内存耗尽、回撤、中止或崩溃。
- 灰色表示 SGLang 外部：操作系统、其他程序、GPU 驱动。

```figure-index
```

Sources: the figure blocks of front.md and of every file under sections/; manual.json (palette)
