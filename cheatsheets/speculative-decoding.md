---
id: speculative-decoding
title: 推测解码：草稿、EAGLE、MTP
code: SD
subtitle: 在不损失质量的前提下起草与验证。普通草稿、Medusa、EAGLE-3、MTP、加速公式、vLLM 配置与门禁。
hue: 252
sources: phases/07-transformers-deep-dive/16-speculative-decoding, phases/10-llms-from-scratch/15-speculative-decoding-eagle3, phases/10-llms-from-scratch/18-multi-token-prediction, phases/10-llms-from-scratch/25-speculative-decoding, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding, phases/19-capstone-projects/14-speculative-decoding-server
source_hash: f0647dffc516f27f
---

## 草稿类型对比
type: comparison
from: phases/10-llms-from-scratch/15-speculative-decoding-eagle3/docs/zh.md, phases/10-llms-from-scratch/18-multi-token-prediction/docs/zh.md, phases/07-transformers-deep-dive/16-speculative-decoding/docs/zh.md

| 因素 | 普通草稿 | Medusa | EAGLE-3 | MTP（DeepSeek-V3） |
|---|---|---|---|---|
| 草稿 | 独立小型 LLM | 验证器上的额外语言模型头 | 多层特征融合 + TTT | 1 个 transformer 模块 + 投影 |
| 训练时机 | 复用已有模型 | 验证器 SFT 阶段 | 预训练后 | 预训练期间 |
| 训练成本 | 无 | 约 1B SFT token | 约 60-200B token | 预训练约慢 10% |
| `α` | 0.55-0.70 | 0.65-0.75 | 0.88-0.92 | 深度 1 时为 0.80+ |
| 加速比 | 1.8-2.3× | 2-3× | 3.5-6.5× | 1.8× |
| 第二个模型 | 是 | 否 | 微型草稿头 | 否，属于模型本身 |
| 已有权重 | 是 | 需要微调 | 是 | 否，重新训练 |

## 一次推测步骤
type: flow
from: phases/07-transformers-deep-dive/16-speculative-decoding/docs/zh.md, phases/10-llms-from-scratch/15-speculative-decoding-eagle3/docs/zh.md

1. **草稿**：低成本模型 $M_p$ 提出 $N$ 个 token，概率为 $p_1 \ldots p_N$。
2. **验证**：验证器 $M_q$ 对前缀加草稿运行一次，返回 $q_1 \ldots q_{N+1}$。
3. **接受**：从左到右检查，以概率 $\min(1, q_i(d_i) / p_i(d_i))$ 接受。
4. **拒绝**：首次拒绝时，从归一化的 $(q_j - p_j)_+$ 采样。丢弃后续草稿。
5. **额外 token**：全部 $N$ 个均被接受时，再从 $q_{N+1}$ 采样一个 token。
6. **回滚**：将 KV 缓存设为已接受前缀的长度。
7. **结果**：输出与仅使用验证器时同分布。

## 循环代码
type: annotated-code
lang: python
from: phases/10-llms-from-scratch/15-speculative-decoding-eagle3/code/main.py

```python
for i, d in enumerate(drafts):
    u = rng.random()
    ratio = q_prob / p_prob if p_prob > 0 else float("inf")   # q 为验证器，p 为草稿
    if u < min(1.0, ratio):
        emitted.append(d)
        kv.extend(1)   # 接受：缓存增长一项
    else:
        correction = sample(residual(q, p), rng)   # 对 (q - p)+ 重新归一化
        emitted.append(correction)
        kv.truncate_to(prefix_len + len(emitted))   # KV 回滚
        return emitted, 1   # 一次验证器前向传播
bonus = sample(q, rng)   # 全部 N 个被接受：额外获得一个 token
emitted.append(bonus)
```

## 服务栈
type: architecture
from: phases/19-capstone-projects/14-speculative-decoding-server/docs/zh.md

```arch
node | client | 1,1 | 请求入口 | 聊天补全 | client
node | server | 2,1 | vLLM 或 SGLang | 每 GPU 一个副本 | process
node | draft | 3,1 | 草稿 | EAGLE-3 头或 ngram | model
node | target | 4,1 | 目标 | FP8 或 INT4 量化 | gpu
node | verify | 4,2 | 验证传播 | 一次验证 k 个草稿 token | process
node | stream | 3,2 | Token 流 | 将接受的前缀返回客户端 | client
node | metrics | 2,2 | Prometheus 指标 | 接受率、排队等待、p99 | store
node | hpa | 1,2 | HPA | 按排队等待扩缩容 | queue
edge | client | server |
edge | server | draft |
edge | draft | target | k tokens
edge | target | verify |
edge | verify | stream | 接受、重采样
edge | stream | metrics |
edge | metrics | hpa |
```

## 命令
type: command-table
span: 2
from: phases/07-transformers-deep-dive/16-speculative-decoding/docs/zh.md, phases/10-llms-from-scratch/15-speculative-decoding-eagle3/docs/zh.md, phases/10-llms-from-scratch/25-speculative-decoding/code/main.py

| 命令 | 作用 |
|---|---|
| `vllm serve <model> --speculative-config '{"method": "eagle", "model": "<draft>", "num_speculative_tokens": 5}'` | EAGLE 草稿头 |
| `--speculative-config '{"method": "draft_model", "model": "meta-llama/Llama-3.2-1B-Instruct", "num_speculative_tokens": 5}'` | 普通草稿模型 |
| `--speculative-config '{"model": "<draft>", "num_speculative_tokens": 5, "method": "eagle3"}'` | EAGLE-3 草稿 |
| `python main.py --vocab 64 --alpha 0.75 --k 4 --samples 50000` | 拒绝规则、alpha 扫描、树掩码演示 |

## 课程函数
type: task-table
from: phases/07-transformers-deep-dive/16-speculative-decoding/code/main.py, phases/10-llms-from-scratch/15-speculative-decoding-eagle3/code/main.py, phases/10-llms-from-scratch/18-multi-token-prediction/code/main.py, phases/10-llms-from-scratch/25-speculative-decoding/code/main.py, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/code/main.py, phases/19-capstone-projects/14-speculative-decoding-server/code/main.py

| 任务 | 代码 |
|---|---|
| 拒绝时的残差分布 | `residual(q, p)` |
| 带 KV 回滚的一步 | `spec_step(q, p, N, kv, rng)` |
| 每次验证的 token 数 | `expected_tokens_per_verify(alpha, N)` |
| 每 token 墙钟时间 | `wall_time_per_token(alpha, N, c)` |
| 某配置的加速比 | `expected_speedup(p)` |
| 树验证掩码 | `tree_attention_mask(tree)` |
| 分布检查 | `chi_square(observed, expected)` |
| 实测接受率 | `m.acceptance_rate(k)` |

## 加速公式
type: concepts
from: phases/10-llms-from-scratch/15-speculative-decoding-eagle3/docs/zh.md, phases/10-llms-from-scratch/25-speculative-decoding/docs/zh.md, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md, phases/10-llms-from-scratch/18-multi-token-prediction/docs/zh.md

- **每次验证的 token 数**：$\mathbb{E}[\text{accepted}] = \frac{1 - \alpha^{N+1}}{1 - \alpha}$
- **示例**：`α = 0.8, K = 4` 时，每次前向传播得到 3.36 个 token。
- **每 token 墙钟时间**：`(N * c + 1) / E[accepted]`，其中 `c = cost(draft) / cost(verifier)`。
- **最大影响因素**：接受率 `α` 对加速比的影响大于草稿长度 `N`。
- **生产形式**：`S(alpha, K) = (1 + K*alpha) / (1 + verify_overhead)`
- **盈亏平衡**：`alpha_breakeven = verify_overhead / K`，随并发增大而上升。
- **MTP 损失**：$L_{\text{MTP}} = \frac{\lambda}{D} \sum_{k=1}^{D} L_k$，`lambda` 先为 0.3，再为 0.1。

## 脚本默认值
type: defaults
from: phases/10-llms-from-scratch/25-speculative-decoding/code/main.py, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `--vocab` | 32 | 词表大小，至少为 2 |
| `--alpha` | 0.75 | 目标接受率，范围 (0, 1] |
| `--k` | 4 | 草稿长度，至少为 1 |
| `--samples` | 20000 | 样本数 |
| `--seed` | 0 | 随机种子 |
| `n_tokens` | 1000 | `simulate_tail` 每次运行的 token 数 |

## 故障排查
type: troubleshooting
from: phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md, phases/07-transformers-deep-dive/16-speculative-decoding/docs/zh.md, phases/10-llms-from-scratch/15-speculative-decoding-eagle3/docs/zh.md, phases/10-llms-from-scratch/25-speculative-decoding/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 部署后没有加速 | 推测解码需主动开启 | 显式设置 `speculative_config` |
| 平均 ITL 下降，P99 ITL 上升 | 被拒绝的草稿需要两次传播 | 关注 P99 ITL，发布前调优 |
| 真实流量 `α` 低于 0.55 | 草稿使用通用数据训练 | 训练领域草稿或关闭 |
| `α` 崩溃 | 高温度创意采样 | 回退至普通解码 |
| 高并发无收益 | 批处理已用满算力 | 在对应并发下测量盈亏平衡点 |
| 拒绝后缓存错误 | `j-1` 之后的条目仍保留 | 截断至已接受前缀 |
| 小模型收益很小 | 草稿并未便宜多少 | 3B 以下跳过推测解码 |

## 各草稿的使用条件
type: tips
from: phases/07-transformers-deep-dive/16-speculative-decoding/docs/zh.md, phases/10-llms-from-scratch/18-multi-token-prediction/docs/zh.md, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md, phases/10-llms-from-scratch/15-speculative-decoding-eagle3/docs/zh.md

- 无需训练的快速原型使用普通草稿。
- 能微调验证器时，使用 Medusa 头。
- 生产环境追求最高速度时，使用 EAGLE-2 或 EAGLE-3。
- 不想要草稿、训练或额外参数时，使用 lookahead。预期加速 1.3 至 1.6×。
- 能控制预训练且隐藏维度至少为 4096 时，使用 MTP。
- 聊天延迟、代码与 JSON 输出、长文本生成适合推测解码。
- 少于 50 token 的输出及 batch-1 离线任务跳过推测解码。

## 缩写
type: glossary
from: phases/10-llms-from-scratch/15-speculative-decoding-eagle3/docs/zh.md, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md, phases/10-llms-from-scratch/18-multi-token-prediction/docs/zh.md, phases/19-capstone-projects/14-speculative-decoding-server/docs/zh.md

- **α**：接受率。验证器接受单个草稿 token 的概率。
- **K 或 N**：草稿长度。每次目标前向传播通常 4-8 个 token。
- **EAGLE**：以验证器隐藏状态为条件的微型草稿模型。
- **TTT**：训练时测试。草稿在训练期间看到自身输出。
- **MTP**：多 token 预测。模块预测后方第 `k` 个位置的 token。
- **P99 ITL**：开启推测解码后应关注的尾部指标。不是 P50。
- **HPA**：按排队等待时间而非 CPU 对服务端自动扩缩容。

## 问答
type: qa
from: phases/07-transformers-deep-dive/16-speculative-decoding/docs/zh.md, phases/10-llms-from-scratch/15-speculative-decoding-eagle3/docs/zh.md, phases/10-llms-from-scratch/18-multi-token-prediction/docs/zh.md, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md

- **推测解码改变输出质量吗？** 不会。输出与验证器分布完全一致。
- **为何解码有这项优化的空间？** 解码受内存带宽限制，算力处于空闲。
- **vLLM V1 如何读取 alpha？** 将 `spec_decode_metrics.accepted_tokens_per_request` 除以草稿长度。
- **EAGLE-3 改了什么？** 移除特征损失，采用训练时测试。
- **为何 MTP 是好的草稿？** 顺序模块像解码器一样保留因果链。
