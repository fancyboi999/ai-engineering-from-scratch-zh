# 图索引

> 本手册的每幅图按顺序列出，并附上图注所给出的那一条论点。

每一行链接到对应的图，论点即图块的 `claim:` 字段。图中的实测数字来自[我们的录制运行](manuals/agent-substrate-101/capture/lab)，柱状图等图表直接读取[汇总文件](manuals/agent-substrate-101/capture/lab/summary)。有两幅图例外：图 1.2b 和图 6.6 直接读取录制文件。配色沿用前言中的色板：

- 蓝色是 Substrate 控制平面：`ate-api-server`、`ate-controller` 和 `ate-idp-server`
- 紫罗兰色是 worker 与沙箱：`atelet`、worker pod、gVisor 和 microVM
- 绿色是 actor，即你运行的工作负载
- 梅红色是 agent harness 及其模型调用：kagent 和模型
- 橄榄色是客户端和集群外的主机
- 靛蓝色是数据平面：`atenet-router`、`atenet-egress`、Envoy 和 agentgateway
- 琥珀色是生命周期状态，或两个状态之间的一步
- 青色是持久状态：Postgres、对象存储和快照
- 玫瑰色是故障：崩溃的 actor、500、503 或丢失的调用
- 灰色在 Substrate 之外：Kubernetes、节点和运维人员

```figure-index
```

来源：the figure blocks of front.md and of every file under sections/; manual.json (palette)
