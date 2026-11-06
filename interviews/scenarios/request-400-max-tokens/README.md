---
id: request-400-max-tokens
title: 长回答请求收到 400
card: scenarios
kind: incident
level: 1
roles: [applied-ai-engineer, forward-deployed-ai-engineer, inference-engineer]
rounds: [screen, debugging]
tags: [http-400, max-tokens, max-model-len, kv-pool, support]
minutes: 15
lessons: []
manuals: [vllm-101#s-troubleshoot-by-symptom, vllm-101#s-count-the-memory-before-you-pick-a-gpu, vllm-101#s-fix-out-of-memory-at-startup]
practice: []
cheatsheet: []
related: [scenarios/startup-oom-shared-gpu]
updated: 2026-11-03
system:
  version: vLLM 0.31.0
  model: Qwen/Qwen3-0.6B
  hardware: the shared second L4 of a two-GPU node, with another user's processes on it
source:
  - manuals/vllm-101/capture/gpu/out-l4/livecheck-2026-10-22.txt
  - manuals/vllm-101/sections/7-1-troubleshoot-by-symptom.md
  - manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md
  - manuals/vllm-101/sections/2-2-fix-out-of-memory-at-startup.md
---


## Situation

一个产品团队在一台 vLLM 服务器上运行 `Qwen/Qwen3-0.6B`，给一个内部写作工具用。一张支持工单进来了："API 拒绝长回答"。客户端把 `max_tokens` 设为 50000，好让模型永远不会截断回答，而每个这样的请求都立即返回 HTTP 400，一个 token 都没流出来。短一些的请求正常。

工单要求平台团队"把限制关掉"。你接手这张工单，手上有错误响应体、服务器的启动日志和手册。

## Evidence

- [客户端收到的响应](evidence/the-error.txt)
- [该服务器启动时的内存池和最大长度](evidence/the-pool-at-startup.txt)
- [一个被服务器按自身上限截断的请求](evidence/a-cut-answer.txt)
- [这个状态码的排障条目](evidence/the-troubleshooting-entry.txt)
- [内存池容纳的用户太少时的四种选择](evidence/four-ways-to-fit-more.txt)

## Questions

1. 读错误响应体。它比较的是哪两个数？指出的是哪个参数？
2. 服务器的第二个数从哪里来？它和 KV 池有什么关系？
3. 工单要求关掉限制。两种站得住的修复是什么？各由谁来改？
4. 第二张工单报告了同样的状态码，但消息里提到的是 prompt 长度。区别在哪里？怎么修？

## Walkthrough

1. **读响应体。** 消息说 `max_tokens=50000` 不能大于 `max_model_len=40960`，`param` 字段指出的是 `max_tokens`。服务器在调度之前先检查请求里的数字，所以 400 是立即返回的，没有生成任何 token。客户端要求的输出超过了一个请求能容纳的量。
2. **读启动日志。** 服务器根据模型配置得出最长请求为 40,960 个 token，并根据 9.02 GiB 的 KV cache 内存把池子定为 84,480 个 token。第二行说，满长度的请求同时能放下 2.06 个。最大长度是一个请求的预算，池子是所有人的预算。一个要求 50,000 个输出 token 的请求，即使在空闲的服务器上也会超出第一个预算。
3. **看被截断的回答是什么样子。** 在同一次检查中，一个 `max_tokens` 为 64 的请求运行了，服务器以结束原因 `length` 停止了它。客户端就是这样知道回答被截断的：流以 `length` 而不是 `stop` 结束。避免截断的办法不是一个巨大的 `max_tokens`；看到截断的办法是结束原因。
4. **读这个错误的两种形式。** 排障条目两种都给了。prompt token 加上 `max_tokens` 超过限制时，消息会提到模型的最大上下文长度并给出各项数量。只有 `max_tokens` 本身超过限制时，消息就是这张工单里的那条。两种情况的修复是同一对：在客户端缩短 prompt 或减小 `max_tokens`，或者在池子允许时调大服务器的最大长度。
5. **读服务器侧选项的顺序。** 手册列出了池子容纳的用户太少时的四种做法，按代价排序，第一种是把最大长度降到用户实际发送的最长上下文。这张工单的方向正好相反：提高限制会让一个请求占用池子更大的份额。启动日志已经说了，满长度的请求大约只能放下两个。更大的限制意味着满长度时用户更少，所以这是一个要先测量再做的决定，不能只为关闭工单就提高限制。

## Resolution

这个限制是预算，不是 bug。客户端在一台最长请求为 40,960 token 的服务器上要求 50,000 个输出 token，服务器在做任何工作之前就拒绝了。客户端的修复是把 `max_tokens` 设成产品需要的值，远低于这个限制，并检查结束原因，让被截断的回答对用户可见。64 token 的那次检查展示的就是这一点：服务器截断时会报告 `length`。

服务器侧的修复也有，但有条件。只有在测量过用户发送的最长 prompt 加回答之后，并且一个这么长的请求放进池子后仍能与其他用户并存时，才提高 `--max-model-len`。在 84,480 token 的池子上，限制每提高一档，能放下的满长度请求数就从启动日志里的 2.06 往下降。启动检查从另一侧执行同一条规则：一个满长度请求都放不下的服务器会拒绝启动，就像手册中共享 GPU 的那次启动，只能放下 2,912 个 token，需要的却是 2,928 个。

## Wrong turns

- "在服务器上关掉限制。" 最大长度是一个请求能占用的 KV cache，由池子决定。没有它，一个请求就能占掉池子的大部分，让其他所有用户得不到资源。
- "把 max_tokens 设成正好等于限制。" 那样 prompt 加回答会超过上下文，服务器会返回同一个 400 的另一种形式，就是提到 prompt token 的那种。
- "一直调大最大长度，直到工单不再出现。" 限制越长，同时能放下的请求越少。先测量真实的最长请求，再确认它能放进池子。
- "重试这个请求。" 400 是对请求中数字的检查，同样的请求会得到同样的回答。

## Generalize

模型服务器返回的 400 通常是运维有意设定的预算。读消息里的两个数，找出每个数归哪一方管，然后改错的那一方：客户端的请求，或者服务器经过测量的限制。不要为了关闭工单而移除限制；要教客户端读结束原因，而不是要求无上限的回答。

## Taught in

vLLM 手册在[排障页](../../../manuals/vllm-101/sections/7-1-troubleshoot-by-symptom.md#a-request-returns-http-400-about-the-maximum-context-length)列出了这个状态码，在[内存计算页](../../../manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md#decide-what-to-change)给服务器侧选项排了序，并在[内存不足页](../../../manuals/vllm-101/sections/2-2-fix-out-of-memory-at-startup.md#fix-a-shared-gpu)展示了启动时的同一个预算。
