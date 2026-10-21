---
id: gpu-kubernetes
title: Kubernetes 上的 GPU 自动扩缩容
code: GP
subtitle: Karpenter 管节点、KAI Scheduler 管成组调度，按队列深度扩副本，结合缓存感知路由与事件时间线。
hue: 212
sources: phases/17-infrastructure-and-production/03-gpu-autoscaling-kubernetes, phases/17-infrastructure-and-production/10-cold-start-mitigation, phases/17-infrastructure-and-production/11-multi-region-kv-locality, projects/kubernetes-event-storyboard
source_hash: 584a9bc56a5b6874
---

## 任务
type: task-table
from: phases/17-infrastructure-and-production/03-gpu-autoscaling-kubernetes, phases/17-infrastructure-and-production/10-cold-start-mitigation, phases/17-infrastructure-and-production/11-multi-region-kv-locality

| 任务 | 代码 |
|---|---|
| 防止 GPU 作业被驱逐 | `consolidationPolicy: WhenEmpty` |
| 空节点一小时后合并 | `consolidateAfter: 1h` |
| 避开默认驱逐策略 | 不使用 `WhenEmptyOrUnderutilized` |
| 不按忙碌时间占比扩缩容 | 不使用 `DCGM_FI_DEV_GPU_UTIL` |
| 保持一个就绪副本 | `min_workers=1` |
| 启动时权重已在 NVMe 上的节点 | 在 `EC2NodeClass` 中设置快照 ID |
| 根据缓存前缀路由 | `kv.cache.block_added` |
| 比较三种扩缩容器 | `simulate(strategy, reqs)` |

## GPU 池的安全缩减
type: annotated-code
lang: yaml
from: phases/17-infrastructure-and-production/03-gpu-autoscaling-kubernetes/docs/zh.md

```yaml
# Karpenter NodePool，GPU 池
disruption:
  consolidationPolicy: WhenEmpty  # 绝不驱逐正在运行的作业
  consolidateAfter: 1h  # 一小时后合并空节点
```

## 三层自动扩缩容
type: architecture
from: phases/17-infrastructure-and-production/03-gpu-autoscaling-kubernetes

```arch
node | pend | 1,1 | 等待中的 pod | 需要 8 张 H100 | client
node | karp | 2,1 | Karpenter | NodePool，约 45-60s | process
node | node | 3,1 | GPU 节点 | NVLink 域 | gpu
node | kai | 2,2 | KAI Scheduler | 成组、拓扑、队列 | process
node | app | 1,3 | Dynamo Planner / llm-d WVA | 副本数 | process
node | sig | 2,3 | 信号 | 队列深度、KV 利用率 | queue
node | vllm | 3,3 | vLLM 副本 | 处理请求 | model
edge | pend | karp | 供应
edge | karp | node | 添加节点
edge | pend | kai | 全部或全不
edge | kai | node | 放置
edge | sig | app | 消费
edge | app | vllm | 扩缩容
edge | vllm | sig | 发布
```

## main.py 中的扩缩容策略
type: comparison
span: 2
from: phases/17-infrastructure-and-production/03-gpu-autoscaling-kubernetes/code/main.py, phases/17-infrastructure-and-production/03-gpu-autoscaling-kubernetes/docs/zh.md

| 维度 | DUTY_CYCLE | QUEUE_DEPTH | KAI_GANG |
|---|---|---|---|
| 信号 | `DCGM_FI_DEV_GPU_UTIL` | `len(queue)` | `len(queue)` |
| 扩容条件 | `util > TARGET_GPU_UTIL` | `qd > 5` | `qd > 3` |
| 扩容步幅 | `replicas_target += 1` | `max(1, qd // 5)` | `max(2, qd // 3)` |
| 缩容条件 | `util < 20` | `qd == 0` | `qd == 0` |
| 结果 | 丢弃请求 | 响应积压 | 避免部分分配导致停滞 |

## 模拟器常量
type: defaults
from: phases/17-infrastructure-and-production/03-gpu-autoscaling-kubernetes/code/main.py, phases/17-infrastructure-and-production/11-multi-region-kv-locality/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `NODE_PROVISION_SEC` | 50 | Karpenter 约 45-60s |
| `CLUSTER_AUTOSCALER_SEC` | 110 | 较慢的对照实现 |
| `MODEL_LOAD_SEC` | 45 | 70B 权重加载加引擎初始化 |
| `HPA_TICK_SEC` | 15 | 控制循环间隔 |
| `TARGET_GPU_UTIL` | 70 | 忙碌时间占比目标 |
| `MAX_REPLICAS` | 16 | 副本上限 |
| `CACHE_HIT_MS` | 80 | 前缀已驻留时的 TTFT |
| `CACHE_MISS_MS` | 800 | 冷预填充的 TTFT |

## 缓存感知路由
type: flow
from: phases/17-infrastructure-and-production/11-multi-region-kv-locality

1. **路由器**：对前缀计算 hash，例如前 512 个 token。
2. **副本**：分配和驱逐块时发布 KV 缓存事件。
3. **vLLM Router**：将 `kv.cache.block_added` 索引为前缀 hash 到副本的映射。
4. **路由器**：将请求发给前缀匹配的副本。
5. **路由器**：没有匹配时选择队列最短的副本。
6. **全局路由器**：将 RTT 加入命中成本；成本超过 `CACHE_MISS_MS` 时留在本地。
7. **数据驻留**：先按驻留边界划分路由器，再考虑缓存。

## 故障排查
type: troubleshooting
from: phases/17-infrastructure-and-production/03-gpu-autoscaling-kubernetes, phases/17-infrastructure-and-production/11-multi-region-kv-locality, phases/17-infrastructure-and-production/10-cold-start-mitigation

| 现象 | 原因 | 修正 |
|---|---|---|
| 100% 时 HPA 始终不扩容 | 忙碌时间占比无法体现 10 个或 100 个请求的差异 | 按队列深度或 KV 利用率扩容 |
| 内存 HPA 始终不缩容 | vLLM 预分配 KV 缓存 | 不再使用内存作为信号 |
| 8 个 pod 中 7 个等待并持续花钱 | 没有成组调度 | 使用 KAI Scheduler，全分配或全不分配 |
| 运行中的推理被驱逐 | `WhenEmptyOrUnderutilized` | 使用 `WhenEmpty` 加 `consolidateAfter: 1h` |
| 凌晨 2 点请求超时 | 节点供应耗时 3 分钟 | Karpenter 加预热池 |
| 缓存命中率降至 8% | 轮询负载均衡 | 使用缓存感知路由器 |
| 灾备中副本拒绝启动 | 分词器或量化配置未同步 | 备份三文件灾备清单 |
| 预填充与解码共用一个 HPA | 两类 pod 需要两种触发信号 | 独立 `Services`，按角色设置 HPA |

## 事件时间线项目
type: annotated-code
lang: bash
span: 2
from: projects/kubernetes-event-storyboard/README.md, projects/kubernetes-event-storyboard/stages/01-parse-snapshots/docs/zh.md

```bash
python3 scripts/project_test.py kubernetes-event-storyboard --init /tmp/kubernetes-event-storyboard-work
python3 scripts/project_test.py kubernetes-event-storyboard --stage 1 --path /tmp/kubernetes-event-storyboard-work --strict
python3 scripts/project_test.py kubernetes-event-storyboard --all --solution --strict
cd projects/kubernetes-event-storyboard/solution
go run . --input fixtures/rollout.json --out /tmp/context-pack.json  # Go 生成数据包
node --experimental-strip-types cli.ts /tmp/context-pack.json /tmp/timeline.html  # 生成 HTML
kubectl get events -A -o json  # 导出自己的快照
```

## 时间线处理阶段
type: flow
from: projects/kubernetes-event-storyboard/solution/main.go, projects/kubernetes-event-storyboard/solution/main.ts, projects/kubernetes-event-storyboard/stages

1. **解析**：`Parse([]byte)(Bundle,error)` 检查 `observedAt` 与两个 items 数组。
2. **分组**：`Group(Bundle)([]Row,error)` 先保留每个事件 UID 的最大计数，再求和。
3. **关联**：沿 ownerReferences 找到 `deployment.kubernetes.io/revision`。
4. **导出**：`Export(Bundle)(Pack,error)` 写出 `schemaVersion` 为 1 且已脱敏的数据。
5. **parsePack**：`parsePack(text)` 检查版本、计数和时间顺序。
6. **timeline**：`timeline(pack)` 返回转义后的 HTML，带 Warning 过滤器。

## 时间线错误
type: command-table
from: projects/kubernetes-event-storyboard/solution/main.go, projects/kubernetes-event-storyboard/solution/main.ts

| 命令 | 作用 |
|---|---|
| `bundle exceeds one MiB` | 输入超过 1<<20 字节 |
| `trailing JSON` | 数据包后还有额外数据 |
| `observedAt must be RFC3339` | 捕获时间戳无效 |
| `invalid occurrence range or count` | 最后时间早于首次时间，或计数低于 1 |
| `event UID changed identity` | UID 被另一对象或原因复用 |
| `invalid or duplicate workload UID` | 工作负载 UID 为空或重复 |
| `invalid context pack` | TypeScript 拒绝 Go 数据包 |

## 问答
type: qa
from: phases/17-infrastructure-and-production/03-gpu-autoscaling-kubernetes, phases/17-infrastructure-and-production/11-multi-region-kv-locality, projects/kubernetes-event-storyboard/stages

- **Karpenter 还是 Cluster Autoscaler？** GPU 节点上，Karpenter 约 45-60s，Cluster Autoscaler 约 90-120s。
- **预填充 pod 用什么信号？** 队列深度。解码 pod 按 KV 缓存压力扩缩容。
- **跨区域路由吗？** 很少需要。440 ms 往返会抵消从 800 到 80 ms 的收益。
- **轮询有什么成本？** 缓存命中约 80 ms，未命中约 800 ms，相差 10 倍。
- **两份快照计数为 2 和 4 呢？** 属于同一序列，计数是 4，不是 6。
- **找到两个修订版本呢？** 修订版本保持未知，绝不根据名称猜测。

## 提示
type: tips
from: phases/17-infrastructure-and-production/11-multi-region-kv-locality, phases/17-infrastructure-and-production/03-gpu-autoscaling-kubernetes, phases/17-infrastructure-and-production/10-cold-start-mitigation

- 将 `tokenizer.json` 或 `tokenizer.model` 与权重一起备份。
- 备份 `quantize_config.json` 和 `vllm_config.yaml`。
- 每季度做一次灾备演练。
- 将 KAI 作为次级调度器，通过注解让工作负载使用它。
- 将张量并行工作负载放在同一 NVLink 域内。
- 仅为实时聊天和语音路径设置 `min_workers=1-2`。
