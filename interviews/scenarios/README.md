# 故障与排障场景

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

来自本站手册的实测故障。一次读一份证据，找出原因。

| 场景 | 难度 | 系统 | 分钟 |
|---|---|---|---|
| [KV 池只用了 5%，服务器还是崩了](auto-fraction-oom-at-concurrency-32/README.md) | 1 基础 | SGLang 0.5.22，搭配 MLX 后端，一台配备统一内存的笔记本电脑，与桌面会话的其他程序共享 | 15 |
| [发布的端口只在一个回环地址上响应](port-published-on-ipv4-only/README.md) | 1 基础 | sbx v0.47.0，一台配备 microVM 运行时的 Mac | 15 |
| [长回答请求收到 400](request-400-max-tokens/README.md) | 1 基础 | vLLM 0.31.0，双 GPU 节点中共享的第二张 L4，其上运行着其他用户的进程 | 15 |
| [沙箱自行停止](the-sandbox-stopped-itself/README.md) | 1 基础 | sbx v0.47.0，一台配备 microVM 运行时的 Mac | 15 |
| [启动时中断运行的 tracker 参数](tracker-without-a-group/README.md) | 1 基础 | Miles main 08752a12，自带 SGLang 0.5.22 构建，一台配备 128 GB 统一内存的 GB10 | 15 |
| [训练器拒绝注意力实现名称](trainer-rejects-the-attention-backend/README.md) | 1 基础 | Miles main 08752a12，自带 SGLang 0.5.22 构建，一台配备 128 GB 统一内存的 GB10 | 15 |
| [关停流程陷入取消操作的无限重试](cancel-a-finished-task/README.md) | 2 应用 | A2A 1.0.1 搭配技术手册采集套件（test-runner、code-reviewer 与 deployer agent），一台机器，localhost，无网络 | 20 |
| [调大 prefill 分块后服务器起不来了](chunked-prefill-8192-graph-oom/README.md) | 2 应用 | SGLang 0.5.22，一张 L4，双 GPU 节点中的第一张 GPU | 20 |
| [GB10 上五分钟的冷启动](cold-start-on-gb10/README.md) | 2 应用 | vLLM 0.31.0，运行于其发布容器中，一台配备 128 GB 统一内存的 GB10 | 15 |
| [两次拒绝，两种措辞，同一个 agent 文件](denied-by-policy-or-by-the-user/README.md) | 2 应用 | docker-agent v1.149.0 与 sbx v0.47.0，一台 Mac，无 GPU | 20 |
| [声明了 2,048 个位置的草稿模型](eagle3-draft-refused-context-length/README.md) | 2 应用 | SGLang 0.5.22，一台配备统一内存的 GB10，以及作为第二台机器的一张 L4 | 20 |
| [五次相同调用后自行终止的运行](five-identical-calls/README.md) | 2 应用 | docker-agent v1.149.0 与 sbx v0.47.0，一台 Mac，无 GPU | 20 |
| [FP8 在 64 用户并发下清空请求队列](fp8-cleared-the-queue-at-64-users/README.md) | 2 应用 | SGLang 0.5.22，一张配备 24 GB 显存的 L4 | 20 |
| [引擎内存比例设为 0.02 导致采样耗时暴增六倍](fraction-too-low-six-times-slower/README.md) | 2 应用 | Miles main 08752a12，自带 SGLang 0.5.22 构建，一台配备 128 GB 统一内存的 GB10 | 20 |
| [为加快启动关闭 CUDA 图优化](graphs-off-to-start-faster/README.md) | 2 应用 | SGLang 0.5.22，一台配备 128 GB 统一内存的 GB10 | 20 |
| [在高负载下加剧雪崩的健康探测](health-probes-add-load/README.md) | 2 应用 | SGLang 0.5.22 对比 vLLM 0.31.0，一张配备 24 GB 显存的 L4 | 15 |
| [被误判为网络故障的隐式拒绝策略](implicit-deny-looked-like-an-outage/README.md) | 2 应用 | sbx v0.47.0，一台配备 microVM 运行时的 Mac | 20 |
| [模型真的在学习吗：读懂前十步训练日志](is-it-learning-read-ten-steps/README.md) | 2 应用 | Miles main 08752a12，自带 SGLang 0.5.22 构建，一台配备 128 GB 统一内存的 GB10 | 20 |
| [源自本地私有镜像仓库 Kit 的三次被拒](kit-from-a-local-registry/README.md) | 2 应用 | sbx v0.47.0，一台配备 microVM 运行时的 Mac | 20 |
| [pip 安装后遭遇的连续四次启动失败](pip-install-four-failed-starts/README.md) | 2 应用 | 通过 pip 安装的 SGLang 0.5.22，以及通过 uv 安装的 vLLM 0.31.0，一个包含两张 L4 GPU、具备 NVIDIA 驱动但没有 CUDA 工具包的节点 | 20 |
| [轮询了一小时，任务其实在等我们](polling-a-parked-task/README.md) | 2 应用 | A2A 1.0.1 搭配技术手册采集套件（test-runner、code-reviewer 与 deployer agent），一台机器，localhost，无网络 | 20 |
| [为让结果可预测而关闭 radix 缓存](radix-cache-off-for-predictability/README.md) | 2 应用 | SGLang 0.5.22，以及作为第二引擎的 vLLM 0.31.0，一台配备 128 GB 统一内存的 GB10，以及一张配备 24 GB 显存的 L4 | 20 |
| [放在 prompt 开头的请求 ID](request-id-at-prompt-start/README.md) | 2 应用 | SGLang 0.5.22，一张配备 24 GB 显存的 L4，以及作为第二台机器的一台 GB10 | 15 |
| [续训的运行悄悄从第 0 步重新开始](resume-that-started-fresh/README.md) | 2 应用 | Miles main 08752a12，自带 SGLang 0.5.22 构建，一台配备 128 GB 统一内存的 GB10 | 20 |
| [奖励模块导入失败，运行一直不停](reward-module-not-found-run-hangs/README.md) | 2 应用 | Miles main 08752a12，自带 SGLang 0.5.22 构建，一台配备 128 GB 统一内存的 GB10 | 20 |
| [中断所有正在生成的回答的滚动更新](sigterm-to-the-process-group/README.md) | 2 应用 | SGLang 0.5.22，基于 MLX 路径，一台配备统一内存的笔记本电脑，不捕获 CUDA 图 | 20 |
| [共享 GPU 上的启动显存不足](startup-oom-shared-gpu/README.md) | 2 应用 | vLLM 0.31.0，双 GPU 节点中共享的第二张 L4，其上运行着其他团队的进程 | 15 |
| [同一个错误，两种状态码](task-not-found-in-two-bindings/README.md) | 2 应用 | A2A 1.0.1 搭配技术手册采集套件（test-runner、code-reviewer 与 deployer agent），一台机器，localhost，无网络 | 20 |
| [日志中的 key 只是占位符](the-key-that-was-a-placeholder/README.md) | 2 应用 | sbx v0.47.0，一台配备 microVM 运行时的 Mac | 20 |
| [使 A/B 测试失效的温控降频](thermal-throttle-voided-ab-test/README.md) | 2 应用 | SGLang 0.5.22，一张配备 24 GB 显存的 L4，所在节点的第二张 L4 运行着其他租户 | 20 |
| [哪一边失败了，引擎还是输入](which-side-failed-the-engine-or-the-input/README.md) | 2 应用 | rea 6.7.0（提交 27dc42d），搭配 Ghidra provider，一台 aarch64 Mac | 20 |
| [一条驱动日志告警在一下午呼叫了九次](alert-on-the-driver-line/README.md) | 3 高级 | SGLang 0.5.22，一台配备 121.7 GiB 统一内存的 GB10，与其他用户共享 | 25 |
| [agent 把空列表读成了“没有”](an-empty-list-is-not-none/README.md) | 3 高级 | rea 6.7.0（提交 27dc42d），搭配 Ghidra provider，一台 aarch64 Mac | 25 |
| [一张声称部署到生产环境的 agent 名片](card-changed-in-transit/README.md) | 3 高级 | A2A 1.0.1 搭配技术手册采集套件（test-runner、code-reviewer 与 deployer agent），一台机器，localhost，无网络 | 25 |
| [停止运行的 rollout 引擎与会终止任务的看门狗](dead-engine-and-watchdog/README.md) | 3 高级 | Miles main 08752a12，自带 SGLang 0.5.22 构建，一台配备 128 GB 统一内存的 GB10 | 25 |
| [把失败计为成功的 prefill/decode 分离压测](disaggregated-benchmark-false-success/README.md) | 3 高级 | SGLang 0.5.22，搭配 mooncake_tcp 传输后端，单节点内两张 L4，第二张与其他团队共享 | 20 |
| [流断开一次，测试套件就跑了两遍](dropped-stream-resent-the-message/README.md) | 3 高级 | A2A 1.0.1 搭配技术手册采集套件（test-runner、code-reviewer 与 deployer agent），一台机器，localhost，无网络 | 25 |
| [两个评测全部失败，可一个也没运行](eval-failed-with-zero-cost/README.md) | 3 高级 | docker-agent v1.149.0 与 sbx v0.47.0，一台 Mac，无 GPU | 25 |
| [第 0 轮就发生首次分歧的不稳定检查](first-divergence-at-turn-zero/README.md) | 3 高级 | docker-agent v1.149.0 与 sbx v0.47.0，一台 Mac，无 GPU | 25 |
| [FP8 KV cache 静默回退至 1.0 缩放因子](fp8-kv-scale-silently-one/README.md) | 3 高级 | vLLM 0.31.0，一张配备 24 GB 显存的 L4 | 20 |
| [负载拐点与让卡顿恶化的并发上限配置](load-knee-and-admission-cap/README.md) | 3 高级 | vLLM 0.31.0 对比 SGLang 0.5.22，一张配备 24 GB 显存的 L4；首次扫描以满频运行，重跑将 SM 频率锁定在 900 MHz | 25 |
| [因切换推理引擎导致 logprob 差距跳变](logprobs-after-top-p/README.md) | 3 高级 | SGLang 0.5.22 与 vLLM 0.31.0 作为采样引擎，搭配 Miles main 08752a12，双 GPU 节点中共享的第二张 L4，未锁定频率 | 25 |
| [负载更高，首 token 反而更快](prefix-cache-inflated-benchmark/README.md) | 3 高级 | SGLang 0.5.22，一台 GB10（DGX Spark） | 25 |
| [Ray 在统一内存上停掉了训练器](ray-oom-unified-memory/README.md) | 3 高级 | Miles main 08752a12，自带 SGLang 0.5.22 构建，一台配备 128 GB 统一内存的 GB10 | 20 |
| [读写挂载上的只读数据库](readonly-database-inside-the-sandbox/README.md) | 3 高级 | 宿主机上的 sbx v0.47.0 与 docker-agent v1.149.0，以及模板内的 docker-agent main 构建，一台配备 microVM 运行时的 Mac | 25 |
| [并非真实效果的 RL 提速](rl-experiment-hygiene/README.md) | 3 高级 | Miles main 08752a12，自带 SGLang 0.5.22 构建，一台配备 128 GB 统一内存的 GB10，带有一个在 84 C 时暂停运行的温度保护 | 25 |
| [小池子里的 LRU 抖动，随后崩溃](small-pool-lru-thrash/README.md) | 3 高级 | SGLang 0.5.22，双 GPU 节点中共享的第二张 L4，未锁定频率 | 25 |
| [在随机 prompt 上选定的推测解码](speculation-chosen-on-random-prompts/README.md) | 3 高级 | SGLang 0.5.22，一张配备 24 GB 显存的 L4，SM 频率锁定在 900 MHz | 25 |
| [推测深度与批大小的取舍](speculation-depth-vs-batch/README.md) | 3 高级 | vLLM 0.31.0 与 SGLang 0.5.22，一张配备 24 GB 显存的 L4，SM 频率锁定在 900 MHz，以及作为第二台机器的一台 GB10 | 25 |
| [温度为 0 仍得到两种回答](temperature-zero-two-answers/README.md) | 3 高级 | SGLang 0.5.22 与 vLLM 0.31.0，一台配备 128 GB 统一内存的 GB10，以及双 GPU 节点中共享的第二张 L4 | 25 |
| [张量并行启动被拒，数据并行缺少资源](tp2-refused-then-dp2-starved/README.md) | 3 高级 | SGLang 0.5.22，一个包含两张 L4 GPU 的节点，第二张与另一个团队的 Pod 共享 | 25 |
| [两个客户端，两个数字，一台服务器](two-clients-two-numbers/README.md) | 3 高级 | vLLM 0.31.0，由 SGLang 0.5.22 客户端与 vllm bench serve 测得，双 GPU 节点中共享的第二张 L4，虽被限频但稳定在 420 至 495 MHz | 25 |
| [统一的 prompt 长度掩盖了卡顿](uniform-prompts-hid-the-stall/README.md) | 3 高级 | vLLM 0.31.0 对比 SGLang 0.5.22，一张配备 24 GB 显存的 L4 | 25 |
| [一致性得分 32.3%](conformance-score-of-32-percent/README.md) | 4 架构与规模 | A2A 1.0.1 搭配技术手册采集套件（test-runner、code-reviewer 与 deployer agent），一台机器，localhost，无网络 | 30 |
| [第 0 步之前就让运行停下的评测](eval-at-step-zero-503/README.md) | 4 架构与规模 | Miles main 08752a12，自带 SGLang 0.5.22 构建，一台配备 128 GB 统一内存的 GB10 | 30 |
| [退出码为 0 但并未通过的比对检查](exit-zero-was-not-a-pass/README.md) | 4 架构与规模 | rea 6.7.0（提交 27dc42d），搭配 Ghidra provider，一台 aarch64 Mac | 30 |
| [内存守护进程在启动中途挂起调度器](memory-guard-paused-the-scheduler/README.md) | 4 架构与规模 | SGLang 0.5.22，一台配备统一内存的 GB10，与其他用户共享的台式机 | 30 |
| [看似合理却不等价的重建函数](plausible-is-not-equal/README.md) | 4 架构与规模 | rea 6.7.0（提交 27dc42d），搭配 Ghidra provider，一台 aarch64 Mac | 30 |
| [从未进入稳态的速率扫描](rate-sweep-never-reached-steady-state/README.md) | 4 架构与规模 | vLLM 0.31.0 与 SGLang 0.5.22，一张配备 24 GB 显存的 L4 | 30 |
| [RL 负载下一天内发生三次重启](three-reboots-in-one-day/README.md) | 4 架构与规模 | Miles main 08752a12，自带 SGLang 0.5.22 构建，一台配备 128 GB 统一内存的 GB10，处于 48 步强化学习运行下的台式机 | 30 |

[全部主题](../README.md)
