---
id: inference-load-testing
title: 推理指标与负载测试
code: IM
subtitle: 找出负载测试失真的原因：TTFT、TPOT、goodput、P99、真实 prompt、重试风暴与对冲读取。
hue: 352
sources: phases/17-infrastructure-and-production/08-inference-metrics-goodput, phases/17-infrastructure-and-production/22-load-testing-llm-apis, projects/retry-storm-lab, projects/hedged-request-lab
source_hash: 898c821b33f84f6a
---

## 现象、原因与修正
type: troubleshooting
from: phases/17-infrastructure-and-production/08-inference-metrics-goodput, phases/17-infrastructure-and-production/22-load-testing-llm-apis, projects/retry-storm-lab, projects/hedged-request-lab

| 现象 | 原因 | 修正 |
|---|---|---|
| 测试撑住 500 用户，生产 200 就崩 | 相同 prompt 命中前缀缓存 | `--mean-input-tokens` 加 `--stddev-input-tokens` |
| Locust 的 ITL 高，服务端正常 | GIL 陷阱：客户端分词积压 | LLM-Locust 或编译型测试工具 |
| GenAI-Perf 的 TPOT 为 6 ms，LLMPerf 为 11 ms | GenAI-Perf 的 ITL 排除 TTFT | 披露工具和定义 |
| 吞吐高，用户仍离开 | goodput 低，尾延迟超 SLO | 用 goodput 把守部署 |
| 平均 TPOT 9 ms，用户仍抱怨 | 右偏长尾，P99 TPOT 为 65 ms | 报告 P50、P90、P99 |
| TPOT 突增至 50 ms | 相邻序列的长预填充 | 分块预填充 |
| 所有客户端同时重试 | 指数等待同步 | `--jitter=true` 加共享 `--budget` |
| 对冲看起来没有成本 | 取消未停止服务端工作 | 在延迟旁记录测试服务工作量 |

## 指标公式
type: annotated-code
lang: text
span: 2
from: phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md

```text
TTFT = queue_time + network_request + prefill_time  # 开始流式输出之前
TPOT = (decode_forward_time + scheduler_overhead) / tokens_produced  # 与 ITL 相同
E2E = TTFT + TPOT * output_tokens + network_response  # 超过 500 个 token 后由 TPOT 主导
throughput = total_output_tokens / elapsed_time  # 仅反映集群效率
goodput = fraction of requests meeting (TTFT <= a) AND (TPOT <= b) AND (E2E <= c)
```

## main.py 中的 SLO 配置
type: comparison
from: phases/17-infrastructure-and-production/08-inference-metrics-goodput

| 因素 | loose | target | tight |
|---|---|---|---|
| TTFT 毫秒 | 800 | 500 | 300 |
| TPOT 毫秒 | 25 | 15 | 10 |
| E2E 毫秒 | 3000 | 2000 | 1500 |
| 判定 | 99% 时 SHIPPABLE | 95% 时 DEGRADED | 更低则 FAILING |

## 四种负载模式
type: comparison
span: 2
from: phases/17-infrastructure-and-production/22-load-testing-llm-apis/docs/zh.md

| 因素 | 稳态 | 爬坡 | 突刺 | 长时浸泡 |
|---|---|---|---|---|
| 形态 | 固定 RPS | 从 0 升至目标 RPS | 突然升至 3-10x RPS，再回落 | 稳态 |
| 时长 | 30-60 分钟 | 15 分钟 | 2 分钟 | 4-8 小时 |
| 发现问题 | 基线回归 | 容量拐点、预热异常 | 自动扩缩容延迟、队列饱和、冷启动 | 内存泄漏、连接池漂移 |

## 各工具适用场景
type: concepts
from: phases/17-infrastructure-and-production/22-load-testing-llm-apis/docs/zh.md

- **LLMPerf**：基准测试，使用 Rust 分词，支持均值与标准差控制 prompt。
- **GenAI-Perf**：需要 NVIDIA 参考实现时使用，ITL 不含 TTFT。
- **LLM-Locust**：团队使用 Locust 时选择，它修正了 GIL 陷阱。
- **guidellm**：大规模合成基准测试。
- **k6 v2026.1.0**：CI/CD 关卡与 SLA 测试，理解流式响应，无 GIL。
- **k6 Operator**：通过 TestRun / PrivateLoadZone CRD 分布式测试。
- **Vegeta**：以固定速率使网关或限流饱和。
- **原版 Locust 2.43.3**：不要单独用于 LLM，它有 GIL 陷阱。

## 运行实验
type: annotated-code
lang: bash
span: 2
from: projects/retry-storm-lab/README.md, projects/hedged-request-lab/README.md

```bash
python3 scripts/project_test.py retry-storm-lab --init /tmp/retry-storm-lab-work
python3 scripts/project_test.py retry-storm-lab --all --solution --strict
cd projects/retry-storm-lab/solution
go run . --clients 20 --budget 60 --jitter=false --out /tmp/synchronized.json  # 同步等待
go run . --clients 20 --budget 60 --jitter=true --seed 7 --out /tmp/jittered.json  # 固定种子的分散等待
go run . --local-http --clients 20 --budget 12 --out /tmp/retry-wire.json  # 真实回环 HTTP
node --experimental-strip-types cli.ts /tmp/retry-wire.json  # 核验计数器
cd projects/hedged-request-lab/solution
go run . --samples 3 --delay-ms 10 --out /tmp/hedge-report.json  # 主请求 80ms，次请求 5ms
```

## 实验参数默认值
type: defaults
from: projects/retry-storm-lab/solution/main.go, projects/retry-storm-lab/README.md, projects/hedged-request-lab/solution/main.go, projects/hedged-request-lab/README.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `--clients` | 20 | 并发客户端数 |
| `--budget` | 12 | 共享重试次数 |
| `--base-ms` | 10 | 初始退避时间 |
| `--max-ms` | 80 | 最大重试等待时间 |
| `--attempts` | 4 | 每个客户端的最大尝试次数 |
| `--capacity` | 5 | 每个精确毫秒的模拟容量 |
| `--delay-ms` | 10 | 对冲延迟 |
| `--samples` | 3 | 每种策略的样本数 |

## 实验错误字符串
type: command-table
from: projects/retry-storm-lab/solution/main.go, projects/hedged-request-lab/solution/main.go

| 命令 | 作用 |
|---|---|
| `invalid bounded policy` | 基值低于 1、上限低于基值，或尝试超过 10 次 |
| `non-retryable HTTP status` | 状态不是 429、502、503 或 504 |
| `server delay exceeds policy cap` | Retry-After 超过策略上限 |
| `retry attempts or shared budget exhausted` | 尝试次数或预算已耗尽 |
| `winner requires HTTP 200` | 快速错误不能成为对冲胜者 |
| `body exceeds 64 KiB` | 响应正文超过读取上限 |
| `no valid response` | 两次对冲尝试都失败 |
| `samples must be 1..100` | 样本数越界 |

## 一次对冲读取
type: flow
from: projects/hedged-request-lab/stages, projects/hedged-request-lab/README.md

1. **客户端**：发起主 GET 请求并启动延迟计时器。
2. **客户端**：计时结束前收到有效主响应则不发对冲。
3. **客户端**：否则最多发起一次次请求，延迟为 0 至 1 秒。
4. **校验器**：只有带非空 JSON 值的 HTTP 200 才能胜出。
5. **客户端**：取消落败请求，最多再观察 100ms。
6. **回执**：记录迟到与未观察到的尝试，以及胜者延迟。
7. **测试服务**：统计取消后仍继续的服务端工作。

## 数字示例
type: qa
from: phases/17-infrastructure-and-production/08-inference-metrics-goodput, projects/retry-storm-lab/stages, projects/hedged-request-lab/stages

- **TTFT 500 ms，解码 100 个 token 用 700 ms？** GenAI-Perf `ITL = 700/99 = 7.07 ms`，LLMPerf `ITL = 1200/100 = 12.00 ms`。
- **20 个客户端、4 次尝试、预算 12？** 总调用数最多 32。
- **基值 10、上限 25、不加抖动？** 等待为 10、20、25、25。
- **3 个基线样本与 3 个对冲样本？** 分别为 3 次与 6 次调用，测试服务共记录 9 次。
- **样本 [2,4,10,20,80]？** P50=10，P95=80，最大值=80。
- **主请求 1ms 返回 HTTP 500，次请求 15ms 有效？** 次请求胜出，快速错误不能胜出。

## 参考数字与关卡
type: tips
from: phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md, phases/17-infrastructure-and-production/22-load-testing-llm-apis/docs/zh.md

- TRT-LLM 上的 Llama-3.1-8B-Instruct：平均 TTFT 162 ms，平均 TPOT 7.33 ms。
- 面向消费者的 70B SLO：TTFT P99 <= 800 ms，TPOT P99 <= 25 ms，goodput >= 99%。
- 以峰值并发的 2x 运行，执行 30-50 次迭代。
- 使用 `--mean-input-tokens 800 --stddev-input-tokens 300 --mean-output-tokens 150`。
- CI 关卡：P50/P95 TTFT、5xx < 5%、TPOT 低于阈值，超限使构建失败。
- 公布工具名、工具版本、模型、硬件、并发度与 prompt 分布。
