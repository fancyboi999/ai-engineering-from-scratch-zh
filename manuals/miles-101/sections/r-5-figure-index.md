# 图表索引

> 按顺序列出本手册的所有图表，以及图注说明的结论。

每一行都链接到对应图表，结论摘自各图表块中的 `claim:` 字段。图表里的实测数字都来自我们在一台 DGX Spark 上的运行。构建手册时，图表会读取这些运行的[摘要](manuals/miles-101/capture/gpu/summary/miles-gb10-lab.json)。颜色遵循前言中的色板：

- 蓝色表示 trainer：FSDP actor、权重和 optimizer。
- 紫色表示 rollout engine：生成答案的 SGLang server。
- 绿色表示数据和 reward：prompt、答案、组和分数。
- 琥珀色表示生命周期步骤，例如训练步骤的阶段或权重更新。
- 青色表示持久状态：checkpoint、日志和摘要文件。
- 玫红色表示故障：engine 退出、内存不足停止或崩溃。
- 灰色表示 Miles 外部环境：主机、Docker 和 Ray。

```figure-index
```

来源：front.md 和 sections/ 下所有文件中的 figure 块；manual.json (色板)。
