# 来源

> 本节按权威性为手册使用的来源排序。

可用本节判断手册中一项陈述的证据强度。

两个来源相互矛盾时，以排名较高的来源为准；手册会说明该选择。

| 排名 | 来源 | 手册采用的内容 |
|---|---|---|
| 1 | vLLM 0.31.0 发布版本的源码 | 第 8 部分中的所有默认值、flag 名称和机制 |
| 2 | 我们在 NVIDIA L4 和 DGX Spark 上的运行记录 | 所有标注为实测的数值 |
| 3 | vLLM issue 和 pull request | 已知故障及各项功能的历史 |
| 4 | vLLM release notes | 各版本新增、修改或删除的内容 |
| 5 | vLLM 0.31.0 文档 | 文档描述的行为，并已对照源码检查 |
| 6 | 论文 | PagedAttention 和 speculative decoding 的原始设计 |
| 7 | vLLM 团队和其他人的博客与演讲 | 背景和历史；不作为默认值或数据依据 |

## 未采用的来源 {#s-ref-sources-what-we-did-not-use}

我们没有用厂商或其他团队的 benchmark 数字来作为决策证据。手册如需报告其他团队的结果，会明确标注团队名称和数据归属。

Sources: this manual.
