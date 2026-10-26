import itertools

import numpy as np

from practice_check import check, close, equal, fixture, fixtures, true

BOS = 4
EOS = 0
TABLE = {
    (4,): [0.05, 0.5, 0.4, 0.05],
    (4, 1): [0.25, 0.25, 0.25, 0.25],
    (4, 2): [0.9, 0.04, 0.03, 0.03],
}


def toy(prefix):
    return np.log(np.array(TABLE.get(tuple(prefix), [0.6, 0.2, 0.1, 0.1])))


def hashed_step(seed, vocab, eos_boost=0.0):
    def step(prefix):
        code = seed
        for token in prefix:
            code = (code * 1000003 + int(token) + 1) % 4294967291
        rng = np.random.default_rng(code)
        logits = rng.normal(size=vocab) * 1.5
        logits[EOS] += eos_boost
        return logits - np.log(np.sum(np.exp(logits)))
    return step


def greedy(step_fn, bos, eos, max_len):
    tokens = (bos,)
    score = 0.0
    for _ in range(max_len):
        log_probs = np.asarray(step_fn(tokens), dtype=float)
        token = int(np.argmax(log_probs))
        tokens = tokens + (token,)
        score += float(log_probs[token])
        if token == eos:
            break
    return tokens, score


def exhaustive(step_fn, bos, eos, vocab, max_len):
    best = None
    for length in range(1, max_len + 1):
        for tail in itertools.product(range(vocab), repeat=length):
            if eos in tail[:-1]:
                continue
            if length < max_len and tail[-1] != eos:
                continue
            tokens = (bos,) + tail
            score = sum(float(step_fn(tokens[:i])[tokens[i]]) for i in range(1, len(tokens)))
            if best is None or score > best[1] + 1e-12:
                best = (tokens, score)
    return best


def as_pairs(result, what):
    true(isinstance(result, (list, tuple)) and len(result) > 0, f"在{what}时，beam_search 必须返回非空列表", "由 (tokens, score) 对组成的列表", result)
    return [(tuple(int(t) for t in tokens), float(score)) for tokens, score in result]


def check_pairs(got, expected, what):
    equal([tokens for tokens, _ in got], [tuple(tokens) for tokens, _ in expected], what=f"{what}时排序后的序列")
    close([score for _, score in got], [score for _, score in expected], rtol=1e-9, atol=1e-12, what=f"{what}时的分数")


@check("examples", '简化模型上的宽度 1 搜索', '宽度 1 等同于贪心解码。token 1 后各 token 的概率都是 0.25。平局时选择最小的 token ID，也就是 EOS。')
def example_greedy(sub):
    got = as_pairs(sub.beam_search(toy, BOS, EOS, 1, 3), "宽度为 1")
    check_pairs(got, [((4, 1, 0), -2.0794415416798357)], "宽度为 1")


@check("examples", '宽度 2 能跳出贪心陷阱', '宽度 2 在第一步同时保留 token 1 和 2。token 2 后 EOS 的概率为 0.9，因此 0.4 * 0.9 大于 0.5 * 0.25。')
def example_width_two(sub):
    got = as_pairs(sub.beam_search(toy, BOS, EOS, 2, 3), "宽度为 2")
    check_pairs(got, [((4, 2, 0), -1.0216512475319812), ((4, 1, 0), -2.0794415416798357)], "宽度为 2")


@check("examples", '宽度 2 且 length_penalty 为 1.0', '最终分数是对数概率之和除以生成 token 数的 length_penalty 次方。BOS 不计数，EOS 计数。')
def example_length_penalty(sub):
    got = as_pairs(sub.beam_search(toy, BOS, EOS, 2, 3, length_penalty=1.0), "length_penalty 为 1.0")
    check_pairs(got, [((4, 2, 0), -0.5108256237659906), ((4, 1, 0), -1.0397207708399179)], "length_penalty 为 1.0")


@check("properties", '宽度 1 等同于贪心解码', '每一步只保留最佳 token，因此就是贪心解码；分数并列时，选择 ID 最小的 token。')
def width_one_is_greedy(sub):
    for seed in range(6):
        step = hashed_step(seed, 5, eos_boost=0.5)
        got = as_pairs(sub.beam_search(step, 9, EOS, 1, 6), f"随机种子为 {seed}")
        tokens, score = greedy(step, 9, EOS, 6)
        equal(got[0][0], tokens, what=f"随机种子为 {seed} 时的最佳序列")
        close(got[0][1], score, rtol=1e-9, what=f"随机种子为 {seed} 时的最佳分数")


@check("properties", '足够宽的 beam 可找到穷举最优解，较窄的 beam 不会超过它', '足够宽的 beam 会保留每个候选，因此其最高分就是所有序列中的最优分数。任何 beam 都不可能超过这个最优值。')
def exhaustive_bound(sub):
    for seed in range(4):
        step = hashed_step(100 + seed, 3, eos_boost=0.3)
        tokens, score = exhaustive(step, 7, EOS, 3, 3)
        wide = as_pairs(sub.beam_search(step, 7, EOS, 27, 3), f"宽度为 27，随机种子为 {seed}")
        equal(wide[0][0], tokens, what=f"随机种子为 {seed} 时，完整候选集中的最佳序列")
        close(wide[0][1], score, rtol=1e-9, what=f"随机种子为 {seed} 时，完整候选集中的最佳分数")
        for width in [1, 2, 3]:
            best = as_pairs(sub.beam_search(step, 7, EOS, width, 3), f"宽度为 {width}")[0][1]
            true(best <= score + 1e-9, f"宽度为 {width}、随机种子为 {seed} 时的分数超过了穷举最优值", score, best)


@check("properties", '在这些 step 函数上，加宽 beam 不会降低得分', 'beam 越宽，搜索的候选越多。在这些 step 函数上，宽度从 1 增至 4 时最高分不会下降。但 beam search 不保证所有模型都如此。')
def wider_not_worse(sub):
    for seed in [8, 1, 5]:
        step = hashed_step(seed, 6, eos_boost=0.2)
        scores = [as_pairs(sub.beam_search(step, 9, EOS, width, 5), f"宽度为 {width}")[0][1] for width in [1, 2, 3, 4]]
        true(all(b >= a - 1e-12 for a, b in zip(scores, scores[1:])), f"随机种子为 {seed} 时，宽度增大后最佳分数反而降低", "单调不减的列表", scores)


@check("properties", '每个分数都是各步对数概率之和', '候选序列的原始分数是各个生成 token 的 log p(token | prefix) 之和。')
def scores_are_sums(sub):
    step = hashed_step(55, 5, eos_boost=0.4)
    for tokens, score in as_pairs(sub.beam_search(step, 9, EOS, 3, 5), "随机种子为 55"):
        expected = sum(float(step(tokens[:i])[tokens[i]]) for i in range(1, len(tokens)))
        close(score, expected, rtol=1e-9, what=f"序列 {tokens} 的分数")


@check("properties", '已完成的 beam 会停止，候选数不会超过宽度', '以 EOS 结尾的 beam 已完成。不要对这样的前缀调用 step_fn。每一步最多扩展 beam_width 条未完成序列。')
def finished_beams_stop(sub):
    base = hashed_step(77, 5, eos_boost=1.0)
    calls = []

    def recording(prefix):
        calls.append(tuple(int(t) for t in prefix))
        return base(prefix)

    result = as_pairs(sub.beam_search(recording, 9, EOS, 3, 6), "随机种子为 77")
    true(all(prefix[-1] != EOS for prefix in calls), "对以 EOS 结尾的前缀调用了 step_fn", "没有以 0 结尾的前缀", [p for p in calls if p[-1] == EOS])
    for length in range(1, 8):
        count = sum(1 for prefix in calls if len(prefix) == length)
        true(count <= 3, f"step_fn 被调用 {count} 次，所用前缀长度为 {length}", "不超过 3", count)
    for tokens, _ in result:
        true(tokens[0] == 9 and EOS not in tokens[1:-1] and len(tokens) <= 7, f"序列 {tokens} 不符合要求", "BOS 位于开头，EOS 只出现在末尾，生成的 token 数不超过 max_len", tokens)


@check("edge", 'max_len 为 1', 'max_len 为 1 时，每条候选只生成一个 token。达到 max_len 后，未完成候选也属于结果。')
def max_len_one(sub):
    got = as_pairs(sub.beam_search(toy, BOS, EOS, 3, 1), "max_len 为 1")
    check_pairs(got, [((4, 1), -0.6931471805599453), ((4, 2), -0.916290731874155), ((4, 0), -2.995732273553991)], "max_len 为 1")


@check("edge", '达到 max_len 时返回未完成候选', '如果在 max_len 内没有 beam 遇到 EOS，就原样返回未完成候选。')
def no_eos(sub):
    def never_eos(prefix):
        return np.log(np.array([1e-12, 0.5, 0.3, 0.2 - 1e-12]))

    got = as_pairs(sub.beam_search(never_eos, BOS, EOS, 2, 2), "不生成 EOS 的模型")
    check_pairs(got, [((4, 1, 1), -1.3862943611198906), ((4, 1, 2), -1.8971199848858813)], "不生成 EOS 的模型")


@check("edge", '分数相同时，token ID 较小的排在前面', '按分数从高到低排序。分数相同时，token ID 较小的序列排在前面。')
def uniform_ties(sub):
    def uniform(prefix):
        return np.full(4, np.log(0.25))

    got = as_pairs(sub.beam_search(uniform, 8, 3, 2, 2), "各 token 概率相同的模型")
    check_pairs(got, [((8, 0, 0), -2.772588722239781), ((8, 0, 1), -2.772588722239781)], "各 token 概率相同的模型")


@check("edge", 'EOS 是首选 token 时立即结束搜索', 'EOS 是第一步最佳 token 且宽度为 1 时，搜索一步后就得到 BOS、EOS 组成的结果。')
def eos_first(sub):
    calls = []

    def eos_heavy(prefix):
        calls.append(tuple(prefix))
        return np.log(np.array([0.7, 0.1, 0.1, 0.1]))

    got = as_pairs(sub.beam_search(eos_heavy, BOS, EOS, 1, 5), "首先选择 EOS 的模型")
    check_pairs(got, [((4, 0), -0.35667494393873245)], "首先选择 EOS 的模型")
    equal(len(calls), 1, what='step_fn 的调用次数')


@fixture("cases")
def cases(ref):
    settings = [(1, 6, 2, 4, 0.0, 0.0), (2, 5, 2, 5, 0.5, 0.0), (3, 7, 3, 5, 0.3, 1.0), (4, 4, 4, 6, 0.8, 0.6), (5, 6, 5, 4, 0.0, 2.0), (6, 3, 8, 4, 1.2, 1.0), (7, 8, 3, 3, -0.5, 0.0)]
    for seed, vocab, width, max_len, boost, alpha in settings:
        step = hashed_step(1000 + seed, vocab, eos_boost=boost)
        result = ref.beam_search(step, vocab, EOS, width, max_len, length_penalty=alpha)
        yield {"seed": 1000 + seed, "vocab": vocab, "width": width, "max_len": max_len, "boost": boost, "alpha": alpha}, [[list(tokens), score] for tokens, score in result]


@check("reference", '7 个随机模型的候选排序与参考实现一致', '在多种 beam 宽度、序列长度和长度惩罚下，序列排序和分数都与参考实现一致。')
def reference_cases(sub):
    for case, expected in fixtures("cases"):
        step = hashed_step(case["seed"], case["vocab"], eos_boost=case["boost"])
        label = f"V = {case['vocab']}，宽度为 {case['width']}，max_len = {case['max_len']}，length_penalty = {case['alpha']}"
        got = as_pairs(sub.beam_search(step, case["vocab"], EOS, case["width"], case["max_len"], length_penalty=case["alpha"]), label)
        check_pairs(got, expected, label)
