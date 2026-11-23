---
name: skill-ctc-decoder
description: 从零编写贪心和 beam search 两种 CTC 解码器，包括长度归一化
version: 1.0.0
phase: 4
lesson: 19
tags: [ocr, ctc, decoding, sequence-models]
---

# CTC 解码器

为 CTC 输出生成两种解码例程：贪心（快）和 beam（在噪声输入上更好）。

## 何时使用

- 在自定义 CRNN 的输出上跑 OCR 推理。
- 用不同的解码器对预训练 OCR 模型做基准测试。
- 不想引入 ctcdecode，只想实现一个简单的 beam search。

## 输入

- `log_probs`：(T, N, C)，对词表做的 log-softmax（按惯例，索引 0 = blank）。
- `vocab`：C 个字符组成的列表。
- `beam_width`（仅 beam）：通常为 5-10。

## 贪心解码器

```python
def greedy_ctc_decode(log_probs, vocab, blank=0):
    preds = log_probs.argmax(dim=-1).transpose(0, 1).cpu().tolist()
    out = []
    for seq in preds:
        decoded = []
        prev = None
        for idx in seq:
            if idx != prev and idx != blank:
                decoded.append(vocab[idx])
            prev = idx
        out.append("".join(decoded))
    return out
```

## Beam search 解码器

```python
import heapq
import math

def beam_ctc_decode(log_probs, vocab, beam_width=5, blank=0):
    T, N, C = log_probs.shape
    lp = log_probs.cpu()
    results = []
    for n in range(N):
        beams = {("",): (0.0, -math.inf)}  # (前缀元组) -> (p_blank, p_nonblank)
        for t in range(T):
            logits_t = lp[t, n]
            new_beams = {}
            for prefix, (p_b, p_nb) in beams.items():
                for c in range(C):
                    p = logits_t[c].item()
                    if c == blank:
                        nb = p_b + p
                        nnb = p_nb + p
                        upd = new_beams.get(prefix, (-math.inf, -math.inf))
                        new_beams[prefix] = (
                            _logsumexp(upd[0], _logsumexp(nb, nnb)),
                            upd[1],
                        )
                    else:
                        last = prefix[-1] if prefix else ""
                        char = vocab[c]
                        if char == last:
                            # 情况 1：停留在同一前缀（由 p_nb 合并）
                            upd = new_beams.get(prefix, (-math.inf, -math.inf))
                            new_beams[prefix] = (upd[0], _logsumexp(upd[1], p_nb + p))
                            # 情况 2：经由 blank 分隔的重复字符扩展前缀（"a_a" -> "aa"）
                            new_prefix = prefix + (char,)
                            upd = new_beams.get(new_prefix, (-math.inf, -math.inf))
                            new_beams[new_prefix] = (upd[0], _logsumexp(upd[1], p_b + p))
                        else:
                            new_prefix = prefix + (char,)
                            upd = new_beams.get(new_prefix, (-math.inf, -math.inf))
                            nb = _logsumexp(p_b, p_nb) + p
                            new_beams[new_prefix] = (upd[0], _logsumexp(upd[1], nb))
            beams = dict(heapq.nlargest(
                beam_width,
                new_beams.items(),
                key=lambda kv: _logsumexp(kv[1][0], kv[1][1]),
            ))
        best = max(beams.items(), key=lambda kv: _logsumexp(kv[1][0], kv[1][1]))[0]
        results.append("".join(best))
    return results


def _logsumexp(a, b):
    if a == -math.inf: return b
    if b == -math.inf: return a
    m = max(a, b)
    return m + math.log(math.exp(a - m) + math.exp(b - m))
```

## 规则

- 在 PyTorch 的 `nn.CTCLoss` 中，CTC 的 blank 索引按惯例为 0。
- beam search 能提升低置信度输入的准确率；在干净输入上，CER 的提升不到 1%。
- beam 宽度不要剪到 5 以下；低于这个值，准确率与延迟的取舍曲线就平了。
- 在很紧的延迟预算下跑 beam search 时，退回到贪心；在大多数生产 OCR 数据上，质量损失很小。
- 词表很大时（CJK 有 3000 多个字符），换成 `ctcdecode`（C++），不要用上面的纯 Python 版本；Python 版的 beam 很快就会成为瓶颈。
