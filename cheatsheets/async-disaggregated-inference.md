---
id: async-disaggregated-inference
title: 异步、Hogwild 与分离式推理
code: AD
subtitle: KV 缓存的共享、拆分、路由与卸载。包含公式、收益分界数值和各方法不适用的情况。
hue: 170
sources: phases/10-llms-from-scratch/22-async-hogwild-inference, phases/17-infrastructure-and-production/11-multi-region-kv-locality, phases/17-infrastructure-and-production/17-disaggregated-prefill-decode, phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache
source_hash: d862651b76bcf26a
---

## 核心概念
type: concepts
from: phases/10-llms-from-scratch/22-async-hogwild-inference/docs/zh.md, phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/docs/zh.md, phases/17-infrastructure-and-production/11-multi-region-kv-locality/docs/zh.md, phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache/docs/zh.md

- **预填充**：对整个 prompt 做一次前向传播。受计算限制。
- **解码**：每次生成一个 token，读取全部权重。受内存带宽限制。
- **Hogwild!**：同一 LLM 的 N 个副本写入一个共享 KV 缓存。
- **涌现协作**：推理模型无需微调就能分工。
- **RoPE**：位置通过旋转表达，因此共享缓存条目仍然有效。
- **分离式推理**：预填充池与解码池分开，KV 在两者间传输。
- **缓存感知路由**：将请求发往持有其前缀的副本。
- **KV 卸载**：KV 缓存从 GPU 移至 CPU DRAM，再移至磁盘。

## 四种方法对比
type: comparison
span: 2
from: phases/10-llms-from-scratch/22-async-hogwild-inference/docs/zh.md, phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/docs/zh.md, phases/17-infrastructure-and-production/11-multi-region-kv-locality/docs/zh.md, phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache/docs/zh.md

| 维度 | Hogwild! | 分离式推理 | 缓存感知路由 | LMCache |
|---|---|---|---|---|
| 做什么 | N 个 worker 共享一个 KV 缓存 | 预填充和解码使用独立资源池 | 根据前缀 hash 匹配路由 | CPU DRAM + 磁盘上的跨引擎 KV |
| 适用条件 | 长推理、高 p | prompt >512 tokens，输出 >200 tokens | 多副本重复使用前缀 | KV 超出 HBM |
| 不适用条件 | 简短交互聊天 | 小集群（< 4 GPU） | 跨区域 RTT 超过节省的预填充时间 | 短上下文（<1K tokens） |
| 数值 | p = 0.7、N = 4 时为 1.8x | GB200 NVL72 上 DeepSeek-R1 约 6x | 命中约 80 ms，未命中约 800 ms | 低压力下开销 3-5% |
| 状态 | 2026 年 4 月研究 | Dynamo 1.0 GA、llm-d 0.5 | vLLM Router、llm-d router | vLLM 0.11.0 异步路径 |

## 分离式服务栈
type: architecture
from: phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/docs/zh.md, phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache/docs/zh.md, phases/17-infrastructure-and-production/11-multi-region-kv-locality/docs/zh.md

```arch
node | client | 1,1 | 客户端 | 请求 | client
node | router | 2,1 | 路由器 | 缓存感知、KV 事件 | process
node | prefill | 3,1 | 预填充池 | 计算密集 | gpu
node | decode | 3,2 | 解码池 | 内存密集 | gpu
node | lmc | 2,2 | LMCache | CPU DRAM + Ceph/S3 | store
edge | client | router | prompt
edge | router | prefill | 仅 prompt
edge | prefill | decode | 通过 NIXL 传输 KV
edge | decode | lmc | 未使用的 KV
edge | decode | client | tokens
```

## 一步 Hogwild!
type: flow
from: phases/10-llms-from-scratch/22-async-hogwild-inference/docs/zh.md, phases/10-llms-from-scratch/22-async-hogwild-inference/code/main.py

1. **prompt**：告诉每个 worker 自己是 N 个实例之一，并避免重复工作。
2. **worker**：读取整个共享缓存，包括其他 worker 的 token。
3. **worker**：看到已完成的工作，选择不同的子目标。
4. **worker**：在下一个缓存位置写入一个 token。
5. **缓存**：顺序由写入到达时间决定。没有独立的 worker 索引。
6. **其他 worker**：下一步立即看到这个 token。

## 代码中的成本模型
type: annotated-code
lang: python
from: phases/10-llms-from-scratch/22-async-hogwild-inference/code/main.py, phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/code/main.py

```python
def expected_speedup(T_serial: int, p: float, c: int, N: int,
                     steps_per_worker: int) -> float:
    parallel = T_serial * ((1 - p) + p / N) + c * N  # Amdahl 定律加协作开销
    return T_serial / parallel

def ms_disaggregated(prompt: int, output: int, use_rdma: bool = True) -> float:
    prefill_ms = prompt / PREFILL_TOK_PER_MS
    kv_bytes = prompt * KV_BYTES_PER_TOKEN_70B_FP8
    transport = NIXL_RDMA_GB_S if use_rdma else NIXL_TCP_GB_S
    transfer_ms = (kv_bytes / 1e9) / transport * 1000  # 传输开销
    decode_ms = output / DECODE_TOK_PER_MS_DECODE_GPU  # 更快的解码池
    return prefill_ms + transfer_ms + decode_ms
```

## 运行模拟器
type: task-table
span: 2
from: phases/10-llms-from-scratch/22-async-hogwild-inference/code/main.py, phases/17-infrastructure-and-production/11-multi-region-kv-locality/code/main.py, phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/code/main.py, phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache/code/main.py

| 任务 | 代码 |
|---|---|
| Hogwild! 基线，单 worker | `run_hogwild(n_workers=1, step_budget=200, target_per_category=100, coordination_weight=0.8)` |
| 双 worker 的 Hogwild! | `run_hogwild(n_workers=2, step_budget=200, target_per_category=100, coordination_weight=0.8)` |
| 扫描协作参数 | `for cw in (0.0, 0.2, 0.5, 0.8, 1.0):` |
| 比较三种路由器 | `for strategy in ("ROUND_ROBIN", "REGIONAL", "GLOBAL"):` |
| 共置请求耗时 | `ms_colocated(prompt, output)` |
| 经 TCP 分离式推理 | `ms_disaggregated(prompt, output, use_rdma=False)` |
| 比较卸载配置 | `for cfg in ("NATIVE_ONLY", "CPU_OFFLOAD", "LMCACHE"):` |

## 模拟器中的常量
type: defaults
from: phases/17-infrastructure-and-production/11-multi-region-kv-locality/code/main.py, phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/code/main.py, phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `CACHE_HIT_MS` | 80 | 前缀驻留时的 TTFT |
| `CACHE_MISS_MS` | 800 | 冷预填充的 TTFT |
| `REPLICAS_PER_REGION` | 4 | 共三个区域 |
| `PREFILL_TOK_PER_MS` | 40.0 | 每 GPU |
| `KV_BYTES_PER_TOKEN_70B_FP8` | 125_000 | 每 token 的 KV 大小 |
| `NIXL_RDMA_GB_S` | 100 | RDMA 传输速率 |
| `NIXL_TCP_GB_S` | 10 | TCP 回退速率 |
| `KV_BLOCK_TOKENS` | 16 | 每 KV 块的 token 数 |

## 故障排查
type: troubleshooting
from: phases/17-infrastructure-and-production/11-multi-region-kv-locality/docs/zh.md, phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/docs/zh.md, phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache/docs/zh.md, phases/10-llms-from-scratch/22-async-hogwild-inference/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 前缀命中率降至 8% | 轮询 ALB | 使用按前缀 hash 路由的缓存感知路由器 |
| 故障转移后副本拒绝启动 | 缺少分词器或量化配置 | 使用三文件灾难恢复清单 |
| 分离式推理更慢 | prompt 短，传输开销高 | 对 < 512 tokens 的 prompt 使用共置 |
| 同一个 2K prompt 被重复预填充 | HBM 达到 100% 时发生抢占 | 使用 LMCache 或原生 CPU 卸载 |
| 跨区域路由增加 TTFT | 往返耗时 440 ms | 将路由限制在区域内 |
| 欧盟请求由 us-east-1 处理 | 路由器忽略数据驻留要求 | 按驻留要求划分路由器 |
| Hogwild! 加速比低于 1 | worker 重复工作 | 使用推理模型 |
| Hogwild! 收益低于 1.3x | 协作开销占主导 | 恢复为单 worker |

## 选择条件
type: tips
from: phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/docs/zh.md, phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache/docs/zh.md, phases/10-llms-from-scratch/22-async-hogwild-inference/docs/zh.md

- 需要上层托管编排器时使用 Dynamo。
- 需要 Kubernetes 原生组件时使用 llm-d。
- 单个引擎面临 HBM 压力时使用原生 CPU 卸载。
- 多个引擎共享前缀时使用 LMCache。
- Hogwild! 只在单节点使用。跨节点延迟很高。
- 只有双 worker 收益超过 1.5x 时才将 Hogwild! 扩至 N=4。

## 问答
type: qa
from: phases/10-llms-from-scratch/22-async-hogwild-inference/docs/zh.md, phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/docs/zh.md, phases/17-infrastructure-and-production/11-multi-region-kv-locality/docs/zh.md

- **KV 传输成本？** 70B FP8 的 4K prompt KV 经 NIXL 传输需 20-80 ms。
- **Hogwild! 能配合推测解码吗？** 加速比相乘。3x 和 1.8x 得到 5.4x。
- **为什么最小化预填充加网络时间？** 跨区域路由增加 440 ms 往返时间。应与缓存命中节省的预填充时间比较。
- **32% 的灾难恢复失败因何发生？** 缺少分词器或量化配置。
- **共置浪费多少？** 20-40% 的 GPU 时间用在不匹配的资源需求上。

## 术语表
type: glossary
from: phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/docs/zh.md, phases/17-infrastructure-and-production/11-multi-region-kv-locality/docs/zh.md, phases/10-llms-from-scratch/22-async-hogwild-inference/docs/zh.md

- **NIXL**：Dynamo 的 KV 传输层。使用 RDMA/InfiniBand 或回退 TCP。
- **RTT**：往返时间。美国至欧洲约 75 ms，美国至亚太约 220 ms。
- **p**：可并行执行的工作比例。
- **c**：每个 worker 的协作开销，以 token 计。
- **UCCL**：llm-d 0.5 网络层。
