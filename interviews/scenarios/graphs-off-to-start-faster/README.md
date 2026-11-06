---
id: graphs-off-to-start-faster
title: 为加快启动关闭 CUDA 图优化
card: scenarios
kind: incident
level: 2
roles: [inference-engineer]
rounds: [debugging, ml-breadth, design-review]
tags: [cuda-graphs, cold-start, startup, decode, tpot, autoscaling]
minutes: 20
lessons: []
manuals: [sglang-101#s-forwardmode-and-cuda-graphs, sglang-101#s-operating-sglang]
practice: []
cheatsheet: [sglang-serving]
related: [scenarios/cold-start-on-gb10, scenarios/thermal-throttle-voided-ab-test]
updated: 2026-11-03
system:
  version: SGLang 0.5.22
  model: Qwen/Qwen3-30B-A3B-Instruct-2507
  hardware: one GB10 with 128 GB of unified memory
source:
  - manuals/sglang-101/capture/gpu/out-gb10/server-no-cuda-graph.command.txt
  - manuals/sglang-101/capture/gpu/out-gb10/server-default.command.txt
  - manuals/sglang-101/capture/gpu/out-gb10/server-default.log
  - manuals/sglang-101/capture/gpu/out-gb10/server-no-cuda-graph.log
  - manuals/sglang-101/capture/gpu/out-gb10/bench-random-c1.txt
  - manuals/sglang-101/capture/gpu/out-gb10/no-cuda-graph-bench-random-c1.txt
  - manuals/sglang-101/capture/gpu/out-gb10/bench-random-c8.txt
  - manuals/sglang-101/capture/gpu/out-gb10/no-cuda-graph-bench-random-c8.txt
  - manuals/sglang-101/sections/4-1-forwardmode-and-cuda-graphs.md
  - manuals/sglang-101/sections/7-1-operating-sglang.md
---

## Situation

一个团队在弹性扩缩容组背后的 GB10 节点集群上运行 `Qwen/Qwen3-30B-A3B-Instruct-2507`。新 Pod 需要六分多钟才能达到就绪状态，导致扩缩容组在每次流量攀升期间都拉起过多冗余 Pod，大幅推高了基础设施开销。一名工程师查看启动日志，发现它捕获了两次 CUDA 图，提议将两处图后端彻底关闭：“捕获完全属于冷启动沉没成本，仅 prefill 图捕获一项就耗费了半分钟”。一名审查者阻拦了该改动：“图优化是解码性能的基石，关闭它会使单 token 耗时翻倍”。

双方都读了同一份日志，但谁也没做过实际测量。团队针对两种设置分别重启了 Pod，两台服务器的完整测试套件输出均保存在共享存储中。

## Evidence

- [关闭两类图优化后启动服务器的完整命令](evidence/the-change.txt)
- [默认配置服务器启动阶段的末尾内容及各阶段耗时输出行](evidence/startup-with-graphs.txt)
- [未开启 CUDA 图的服务器各启动阶段耗时明细](evidence/startup-without-graphs.txt)
- [在三种随机种子与 1 至 64 用户并发下的中位数 TPOT 与吞吐对比](evidence/decode-on-the-gb10.txt)
- [单用户并发且开启图优化时测试套件的单次运行数据](evidence/one-user-with-graphs.txt)
- [单用户并发且关闭图优化时测试套件的单次运行数据](evidence/one-user-without-graphs.txt)
- [技术手册关于图优化、显存开销与启动耗时的权威立场](evidence/the-position.txt)

## Questions

1. 根据启动阶段耗时行，六分多钟主要消耗在哪里，其中图捕获占据了多大比例？
2. CUDA 图在解码步中消除了什么开销，在何种模型结构与 GPU 硬件组合下该优化的价值最大？
3. 阅读单用户下的两次单次测试数据。图优化对典型 token 间隔和最差尾部延迟带来了何种改变？
4. 三种子测试表在 GB10 上得出的结论与手册在 L4 上的结论不尽相同。为什么两块显卡对同一项功能会表现出分歧？
5. 关闭图优化能否解决弹性扩缩容的滞后问题？真正有效的解法是什么？
6. 在什么情况下审查者的担忧会成为现实？指出具体模型结构特征与负载条件。

## Walkthrough

1. **分析默认服务器的耗时汇总行。** 日志清晰记录：`load_weight=323.61`，`kv_cache_allocation=2.09`，`scheduler_e2e=369.03`，`cuda_graph={prefill=35.06, decode=4.61, ...}`，`tokenizer_e2e=373.52`。权重加载在总计 373.52 s 的启动耗时中占据了 323.61 s。prefill 图捕获耗时 35.06 s，decode 图捕获耗时 4.61 s。捕获同时需要占用显存：手册指明 prefill 占用 2.14 GB，decode 占用 1.73 GB。
2. **分析关闭图优化后的启动日志。** 服务器记录由于配置将后端解析为 `disabled`，prefill 图捕获已被跳过，显存池分配了 258017 个 token（对比开启图优化时的 227243），并最终以 `scheduler_e2e=341.39`、`tokenizer_e2e=346.34` 结束启动，所有图相关统计项均为 0.00。其权重加载依然耗费了 322.24 s。该调整确实省去了图捕获耗时并换取了稍大的显存池，但总启动耗时依然高达 346.34 s，因为占据统治地位的 322.24 s 权重加载分毫未减。
3. **理解 CUDA 图的核心优化原理。** 单个解码步包含数百个微小算子内核的发射过程（每个请求一个 token）。CUDA 图仅需在初始化时捕获记录一次，后续便能通过一次 CPU 调用完成全量重放。其消除的是内核发射开销（发射属于每步固定的时间常数）。当解码步本身的计算耗时极短时，该项优化才最为关键：在高速 GPU 上以 batch 1 运行小型稠密模型正是该机制诞生的初衷场景。
4. **解读三种子实测数据。** 在 GB10 上运行该混合专家模型时：单用户下中位数 TPOT 在开启图优化时为 32.52 ms，关闭时为 33.09 ms；8 用户下为 102.21 ms 对比 104.77 ms；64 用户下为 254.06 ms 对比 253.77 ms。输出吞吐在各并发档位下分别为 29.14 对 28.72、74.11 对 73.46 以及 235.38 对 235.79。手册给出的专业解读：该模型在 batch 1 下单步耗时约 32 ms，受显存带宽严格限制，CUDA 图所省去的那点微秒级发射时间在显存读取开销面前完全可以忽略不计。
5. **对比单次运行的尾部延迟。** 单用户下开启图优化时：中位数 TPOT 为 30.84 ms，中位数 ITL 为 30.79 ms，P99 ITL 为 32.21 ms；关闭图优化时分别为 31.29 ms、31.40 ms 和 41.72 ms。中位数表现与三种子统计吻合。P99 ITL 变动较大（从 32.21 升至 41.72 ms），但这属于没有时钟记录的单次运行，因此该尾部数据是一条有待测量的线索而非定论。在 8 用户下套件记录为 97.30 对比 100.03 ms。请勿使用这些运行的首字时间列做对比，因为套件在各次运行之间从未清理过缓存。
6. **明确官方技术立场。** 始终保持图优化开启，并根据业务流量特征调整规模。切勿为了省显存而粗暴关闭图优化，应改为调小 `--cuda-graph-max-bs-decode` 或降低 `--mem-fraction-static`。在 GB10 上图优化对解码耗时的影响在 3% 以内，在搭载稠密 8B 模型的 L4 上图优化为每步节省了约 1% 的时间。旧参数 `--disable-cuda-graph` 在 v0.5.22 下依然兼容，但已被推荐废弃，转而采用按阶段细化的专用参数。

## Resolution

两位工程师在规模量级上的预估均存在偏差。关闭图优化省去了 35.06 s 的 prefill 捕获和 4.61 s 的 decode 捕获，但启动总耗时依然高达 346.34 s（对比原先的 373.52 s），因为耗时 322.24 s 的权重加载才是决定性因素。在解码吞吐侧，审查者所担忧的单字耗时翻倍在该模型与显卡上并未发生：从 1 到 64 用户并发，单 token 中位数耗时的变化幅度不超过 3%，输出完全处于随机误差范围内。

因此该改动根本无法解决扩缩容滞后的问题，权重加载才是必须攻坚的真正瓶颈。将模型权重固化在本地高速硬盘中，在扩容间隙保持服务常驻运行，将内核缓存与模型缓存挂载在跨 Pod 生命周期的持久化数据卷上，并根据实测的 373.52 s 启动基准重新设定 readiness 探针与扩缩容策略。坚持开启图优化，因为缺少解码图优化的服务器在每个用户的每个 token 上都需要付出底层发射时间代价，该开销在计算步更短的轻量稠密模型上会变得极为显著。如果团队希望回收显存空间，正确的抓手是调整 `--cuda-graph-max-bs-decode` 而非关闭图优化。在推进类似决策前，必须在锁定时钟并采用三种子复核的前提下开展对比实测，同时关注中位数与尾部延迟。

## Wrong turns

- "捕获纯属冷启动沉没成本，应彻底移除。" 捕获仅占 35.06+4.61 s，而权重加载耗费了 323.61 s。关闭优化使启动时间从 373.52 降至 346.34 s，扩缩容滞后问题依然如故。
- "关闭图优化会使单 token 耗时翻倍。" 在 GB10 上的该 MoE 模型中，中位数 TPOT 在单用户下仅从 32.52 变为 33.09 ms，在 64 用户下从 254.06 变为 253.77 ms。瓶颈在于内存带宽而非内核发射。
- "GB10 的结论适用于所有模型。" 在运行稠密 8B 模型的 L4 上，图优化为每步节省了约 1% 的时间，而在高速显卡运行小模型时发射占比会更高。收益大小取决于单步计算的物理耗时。
- "关闭图优化以回收 KV 显存池容量。" 显存池虽然从 227243 增至 258017 个 token，但手册明确建议调低图捕获最大批次或调低显存比例，以保留解码图优化。
- "直接参考测试套件的首字时间列来评估尾部表现。" 测试套件在测试间从未清理缓存，首字时间不具备可比性。单用户下 P99 ITL 从 32.21 到 41.72 ms 的差距需要在锁定时钟与多随机种子下重新验证。

## Generalize

在移除某个流程阶段之前，必须先厘清总耗时的时间分配结构。冷启动与解码步类似，都是由各阶段极不均衡的时间开销累加而成的，容易被砍掉的部分往往脱离了绝对主导的地位。在自有模型、硬件和负载组合下，用固定时钟和多随机种子实测某项优化的实际成本与收益；在一个步长下真实存在的收益，在另一个步长下可能完全等同于系统噪声。

## Taught in

SGLang 手册在[CUDA 图页面](../../../manuals/sglang-101/sections/4-1-forwardmode-and-cuda-graphs.md#what-we-measured-on-a-gb10)记录了 GB10 与 L4 上的实测数据，并在[运维页面](../../../manuals/sglang-101/sections/7-1-operating-sglang.md#cold-start-is-weights-plus-compilers)将冷启动拆解为了权重与编译等具体构成阶段。
