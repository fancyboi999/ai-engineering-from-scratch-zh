# Prompt Caching 与上下文缓存

> 你的 system prompt 是 4,000 token。你的 RAG 上下文是 20,000 token。你每个请求都把两者发过去。你也为两者付费——每一次。prompt caching 让 provider 在它那边把那段前缀保温，复用时只按正常费率的 10% 给你计费。用对了，它把推理成本砍掉 50–90%、首 token 延迟砍掉 40–85%。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 11 · 01（Prompt Engineering）、阶段 11 · 05（Context Engineering）、阶段 11 · 11（缓存与成本）
**预计时间：** ~60 分钟

## 问题背景

一个编码 agent 在一段对话的每一轮里都把同样的 15,000 token system prompt 发给 Claude。20 轮、$3/M 输入 token，光输入成本就是 $0.90——这还在用户任何真正的消息之前。乘以每天 10,000 段对话，账单就为一段从不改变的文本冲到 $9,000/天。

你不能在不伤害质量的前提下缩短 prompt。你也躲不开发它——模型每一轮都需要它。唯一的招是：别再为一段 provider 已经见过的前缀付全价。

那一招就是 prompt caching。Anthropic 在 2024 年 8 月推出（2025 年带了一个 1 小时扩展 TTL 的变体），OpenAI 当年晚些时候把它自动化，Google 随 Gemini 1.5 推出了显式的上下文缓存，如今三家都在自己的前沿模型上把它作为一等特性提供。

## 核心概念

![Prompt caching：写一次，读很便宜](../assets/prompt-caching.svg)

**机制。** 当一个请求的前缀匹配上近期某个请求时，provider 供应上一次运行的 KV-cache，而不是重新编码这些 token。你第一次付一点写入溢价，之后每次都享受很大的读取折扣。

**2026 年的三种 provider 口味。**

| Provider | API 风格 | 命中折扣 | 写入溢价 | 默认 TTL | 最小可缓存 |
|---------|-----------|--------------|---------------|-------------|---------------|
| Anthropic | 在内容块上显式打 `cache_control` 标记 | 输入打 9 折（省 90%） | 加收 25% | 5 分钟（可延至 1 小时） | 1,024 token（Sonnet/Opus），2,048（Haiku） |
| OpenAI | 自动前缀检测 | 输入打 5 折 | 无 | 最长 1 小时（尽力而为） | 1,024 token |
| Google（Gemini） | 显式 `CachedContent` API | 按存储计费；读取约为正常的 25% | 按 token·小时收存储费 | 用户设置（默认 1 小时） | 4,096 token（Flash），32,768（Pro） |

**不变量。** 三家都只缓存前缀。如果请求之间有任何 token 不同，从第一个不同的 token 之后的一切都是未命中。把*稳定*的部分放最上面，*可变*的部分放最下面。

### 对缓存友好的布局

```
[system prompt]          <-- 缓存它
[tool definitions]       <-- 缓存它
[few-shot examples]      <-- 缓存它
[retrieved documents]    <-- 复用就缓存，否则不缓存
[conversation history]   <-- 缓存到最后一轮为止
[current user message]   <-- 绝不缓存（每次都不同）
```

破坏这个顺序——把用户消息放在 system prompt 上面、在 few-shot 之间穿插动态检索——缓存就永远命不中。

### 收支平衡计算

Anthropic 的 25% 写入溢价意味着，一个缓存块至少要被读两次才能净省钱。1 次写 + 1 次读平均每请求 0.675 倍成本（省 32%）；1 次写 + 10 次读平均 0.205 倍（省 80%）。经验法则：任何你预期在 TTL 内至少复用 3 次的东西都缓存。

```figure
prompt-cache-hit
```

## 动手构建

### 第 1 步：用显式标记做 Anthropic prompt caching

```python
import anthropic

client = anthropic.Anthropic()

SYSTEM = [
    {
        "type": "text",
        "text": "You are a senior Python reviewer. Follow the rubric exactly.\n\n" + RUBRIC_15K_TOKENS,
        "cache_control": {"type": "ephemeral"},
    }
]

def review(code: str):
    return client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        system=SYSTEM,
        messages=[{"role": "user", "content": code}],
    )
```

`cache_control` 标记告诉 Anthropic 把这个块存 5 分钟。在那个窗口内复用就命中；过期后复用会再写一次。

**响应的 usage 字段：**

```python
response = review(code_a)
response.usage
# InputTokensUsage(
#     input_tokens=120,
#     cache_creation_input_tokens=15023,   # 按 1.25 倍计费
#     cache_read_input_tokens=0,
#     output_tokens=340,
# )

response_b = review(code_b)
response_b.usage
# cache_creation_input_tokens=0
# cache_read_input_tokens=15023           # 按 0.1 倍计费
```

在 CI 里检查这两个字段——如果 `cache_read_input_tokens` 在多个请求间一直是零，说明你的缓存键在漂移。

### 第 2 步：一小时扩展 TTL

对长时间运行的批处理任务，5 分钟的默认值在任务之间就过期了。设 `ttl`：

```python
{"type": "text", "text": RUBRIC, "cache_control": {"type": "ephemeral", "ttl": "1h"}}
```

1 小时 TTL 的写入溢价是 2 倍（高出基线 50% 而非 25%），但对任何把前缀复用超过 5 次的批处理都很快回本。

### 第 3 步：OpenAI 自动缓存

OpenAI 没有什么要你配置的。任何超过 1,024 token、匹配上近期请求的前缀都自动拿到 50% 折扣。

```python
from openai import OpenAI
client = OpenAI()

resp = client.chat.completions.create(
    model="gpt-5",
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT},   # 又长又稳定
        {"role": "user", "content": user_msg},
    ],
)
resp.usage.prompt_tokens_details.cached_tokens  # 享受折扣的那部分
```

同样的对缓存友好的布局规则适用。有两样东西会搞垮 OpenAI 的缓存、却搞不垮 Anthropic 的：改变 `user` 字段（被当作缓存键的一部分）和给工具重新排序。

### 第 4 步：Gemini 显式上下文缓存

Gemini 把缓存当成一个你创建并命名的一等对象：

```python
from google import genai
from google.genai import types

client = genai.Client()

cache = client.caches.create(
    model="gemini-3-pro",
    config=types.CreateCachedContentConfig(
        display_name="rubric-v3",
        system_instruction=RUBRIC,
        contents=[FEW_SHOT_EXAMPLES],
        ttl="3600s",
    ),
)

resp = client.models.generate_content(
    model="gemini-3-pro",
    contents=["Review this code:\n" + code],
    config=types.GenerateContentConfig(cached_content=cache.name),
)
```

只要缓存还活着，Gemini 就按 token·小时收存储费，读取约为正常输入费率的 25%。当你跨多个会话、连着好几天复用同一个巨大 prompt 时，这才是对的形态。

### 第 5 步：在生产中测量命中率

`code/main.py` 里有一个模拟的三 provider 记账器，跟踪写/读/未命中计数，计算每 1K 请求的混合成本。按目标命中率给部署设门禁——大多数生产 Anthropic 配置在预热后应当看到 >80% 的读取占比。

## 到 2026 仍在出现的坑

- **顶部的动态时间戳。** system prompt 顶部的 `"Current time: 2026-04-22 15:30:02"`。每个请求都未命中。把时间戳移到缓存断点下面。
- **工具重排序。** 用稳定的顺序序列化工具——两次部署之间字典的重排会破坏每一次命中。
- **自由文本近重复。** "You are helpful." vs "You are a helpful assistant."——差一个字节 = 完全未命中。
- **块太小。** Anthropic 强制 1,024 token 的下限（Haiku 是 2,048）。更小的块会悄悄不缓存。
- **盲目的成本看板。** 把"输入 token"拆成缓存的 vs 未缓存的。否则流量下降看起来会像是缓存的胜利。

## 实际使用

2026 年的缓存技术栈：

| 场景 | 选择 |
|-----------|------|
| 带稳定 10k+ system prompt、多轮的 agent | Anthropic `cache_control` 配 5 分钟 TTL |
| 把前缀复用 30+ 分钟的批处理任务 | Anthropic 配 `ttl: "1h"` |
| GPT-5 上的无服务器端点、无定制基础设施 | OpenAI 自动（只要让你的前缀稳定且长） |
| 跨多天复用一个巨大的代码/文档语料 | Gemini 显式 `CachedContent` |
| 跨 provider 兜底 | 让可缓存的前缀布局在各 provider 间保持一致，这样任意一家命中都行 |

为用户消息那一层配上语义缓存（阶段 11 · 11）：prompt caching 处理 *token 完全相同* 的复用，语义缓存处理 *语义相同* 的复用。

## 拿去用

保存 `outputs/skill-prompt-caching-planner.md`：

```markdown
---
name: prompt-caching-planner
description: Design a cache-friendly prompt layout and pick the right provider caching mode.
version: 1.0.0
phase: 11
lesson: 15
tags: [llm-engineering, caching, cost]
---

给定一个 prompt（system + tools + few-shot + 检索 + 历史 + 用户）和一份用量画像（每小时请求数、所需 TTL、provider），输出：

1. 布局。重排后的各段，标出单个缓存断点；说明哪些段稳定、哪些易变。
2. provider 模式。Anthropic cache_control、OpenAI 自动，或 Gemini CachedContent。从 TTL 和复用模式给出理由。
3. 收支平衡。TTL 内每次写预期的读次数；附数学的净成本 vs 无缓存。
4. 验证方案。在第二个相同请求上断言 cache_read_input_tokens > 0 的 CI；按缓存的 vs 未缓存的 token 拆分的看板。
5. 失败模式。列出这套配置里缓存最可能未命中的三个原因（动态时间戳、工具重排、近重复文本），以及你将如何各自防范。

拒绝交付任何把动态字段放在断点上方的缓存方案。拒绝在没有一个能让 2 倍写入溢价回本的复用次数的情况下开启 1h TTL。
```

## 练习

1. **简单。** 拿一段 10 轮、带 5,000 token system prompt 的对话发给 Claude。不带 `cache_control` 跑一遍，再带着跑一遍。报告各自的输入 token 账单。
2. **中等。** 写一个测试框架，给定一个 prompt 模板和一份请求日志，计算每个 provider（Anthropic 5m、Anthropic 1h、OpenAI 自动、Gemini 显式）的预期命中率和美元节省。
3. **困难。** 构建一个布局优化器：给定一个 prompt 和一份标了 `stable=True/False` 的字段列表，在不丢信息的前提下重写 prompt，把单个缓存断点放在最对缓存友好的位置上。在一个真实的 Anthropic 端点上验证。

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| Prompt caching | "让长 prompt 变便宜" | 为匹配的前缀复用一份 provider 侧的 KV-cache；重复的输入 token 享 50-90% 折扣。 |
| `cache_control` | "Anthropic 的标记" | 声明"到这里为止的一切都可缓存"的内容块属性；`{"type": "ephemeral"}`。 |
| 缓存写入 | "付溢价" | 填充缓存的第一个请求；Anthropic 按约 1.25 倍输入费率计费，OpenAI 免费。 |
| 缓存读取 | "折扣" | 匹配前缀的后续请求；按 10%（Anthropic）、50%（OpenAI）、约 25%（Gemini）计费。 |
| TTL | "它活多久" | 缓存保温的秒数；Anthropic 默认 5m（可延 1h），OpenAI 尽力而为最长 1h，Gemini 用户设置。 |
| 扩展 TTL | "Anthropic 的 1 小时缓存" | `{"type": "ephemeral", "ttl": "1h"}`；2 倍写入溢价，但对批处理复用值得。 |
| 前缀匹配 | "为什么我的缓存没命中" | 只有从开头到断点的每个 token 都逐字节相同，缓存才命中。 |
| 上下文缓存（Gemini） | "显式的那个" | Google 的有名字、按存储计费的缓存对象；最适合多天复用大语料。 |

## 延伸阅读

- [Anthropic — Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)——`cache_control`、1h TTL、收支平衡表。
- [OpenAI — Prompt caching](https://platform.openai.com/docs/guides/prompt-caching)——自动前缀匹配。
- [Google — Context caching](https://ai.google.dev/gemini-api/docs/caching)——`CachedContent` API 和存储定价。
- [Anthropic engineering — Prompt caching for long-context workloads](https://www.anthropic.com/news/prompt-caching)——带延迟数字的原始发布博客。
- 阶段 11 · 05（Context Engineering）——在哪里切 prompt，缓存才能落地。
- 阶段 11 · 11（缓存与成本）——把 prompt caching 和用户消息上的语义缓存配对。
- [Pope et al., "Efficiently Scaling Transformer Inference" (2022)](https://arxiv.org/abs/2211.05102)——prompt caching 向用户暴露的 KV-cache 内存模型；解释为什么重读一个缓存前缀比重新计算便宜约 10 倍。
- [Agrawal et al., "SARATHI: Efficient LLM Inference by Piggybacking Decodes with Chunked Prefills" (2023)](https://arxiv.org/abs/2308.16369)——prefill 是 prompt caching 抄近路的那个阶段；本文解释为什么命中缓存时 TTFT 大幅下降而 TPOT 不受影响。
- [Leviathan et al., "Fast Inference from Transformers via Speculative Decoding" (2023)](https://arxiv.org/abs/2211.17192)——prompt caching 和投机解码、Flash Attention、MQA/GQA 一样，都是弯折推理成本曲线的杠杆；想了解另外三个就读它。
