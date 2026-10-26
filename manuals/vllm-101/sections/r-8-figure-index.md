# 图表索引

> 本节按顺序列出本手册的每幅图及其表达的核心观点。

每行链接到对应图表。图中实测数值来自[我们的 GPU 运行记录](manuals/vllm-101/capture/gpu)，相关章节会链接到所用文件。图表颜色含义与前言中的配色一致：

- 蓝色表示 vLLM 服务：API server 进程和 engine core。
- 紫色表示模型及其前向计算：kernel、attention backend、CUDA graph。
- 绿色表示 KV cache：block、block pool 和缓存前缀。
- 梅紫色表示模型计算：prefill 和 decode 步骤。
- 橄榄色表示客户端与网络：HTTP、OpenAI API、benchmark client。
- 靛蓝色表示进程间消息与数据流，以及流式输出 token。
- 琥珀色表示生命周期：请求状态和调度步骤。
- 青色表示持久状态：磁盘权重、主机内存和卸载的 KV。
- 玫红色表示故障：内存不足、抢占、中止和崩溃。
- 灰色表示 vLLM 以外的部分：操作系统、其他程序和 GPU 驱动。

```figure-index
```

Sources: the figure blocks of front.md and of every file under sections/; manual.json (palette)
