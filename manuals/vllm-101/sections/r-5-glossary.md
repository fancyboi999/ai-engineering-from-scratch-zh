# 术语表

> 本节定义本手册使用的术语，并列出对应的 SGLang 术语。

遇到不熟悉的术语时，可在此查找。

| 术语 | 含义 | SGLang 中的对应术语 |
|---|---|---|
| API server | 处理 HTTP、分词并流式返回答案的进程 | 主进程中的 tokenizer manager |
| async scheduling | GPU 运行当前步骤时规划下一步 | overlap scheduler |
| attention backend | 负责计算 attention 的 kernel 家族 | attention backend |
| block | KV cache 中包含 16 个 token 的固定大小单元 | 默认 page size 为 1 的 page |
| block pool | 启动时分配的全部 KV block | KV pool |
| chunked prefill | 将长 prompt 分散到多个步骤处理 | chunked prefill |
| clock floor | sweep 工具允许一次测试使用的最低 SM clock 中位数；低于该值时会重跑 | SGLang 中无此术语 |
| CUDA graph | 记录一系列 kernel 启动，并通过一次调用重放 | CUDA graph |
| engine core | 运行调度器和 KV cache 管理器的进程 | scheduler process |
| fixed pool | 用 `--num-gpu-blocks-override` 手动固定 KV pool，让两个 engine 使用相同空间 | SGLang 中无此术语 |
| ITL | inter-token latency，即一个输出流中相邻 token 的间隔 | ITL |
| knee | 延迟开始快速上升、吞吐量不再增长的并发点 | SGLang 中无此术语 |
| KV cache | 为后续步骤保留的历史 token 的 key 和 value | KV cache |
| KV connector | 在 GPU 之外加载和保存 KV block 的接口 | disaggregation transfer backend 和 HiCache storage |
| Model Runner V2 | 在 worker 中构建 batch 并执行前向计算的新代码 | model runner |
| preemption | 停止正在运行的请求以释放 block，之后再重新计算 | retraction |
| prefix caching | 重用匹配 prompt 前缀的 KV block | radix cache |
| reasoning parser | 将推理模型的思考内容从答案文本中分离出来的 server 选项 | reasoning parser |
| throttled | GPU 过热或与其他工作共享电力，导致运行频率低于上限 | SGLang 中无此术语 |
| token budget | 调度器每步发放的 token 数上限 | chunked prefill size 与运行请求上限共同决定 |
| TPOT | time per output token，即单个请求每个输出 token 的平均耗时 | TPOT |
| TTFT | time to first token，即首 token 时间 | TTFT |
| waves | 我们的负载：16 个用户发送 64 个 prompt，length ratio 控制长度差异 | SGLang 中无此术语 |
| worker | 在一块 GPU 上持有权重的进程 | TP worker |

Sources: vLLM documentation at v0.31.0 (docs/design/arch_overview.md, docs/design/prefix_caching.md), the SGLang 101 manual of this course.
