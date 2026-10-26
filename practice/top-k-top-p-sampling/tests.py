import numpy as np

from practice_check import check, close, equal, fixture, fixtures, shape, true

LOGITS = np.array([2.0, 1.0, 0.5, 0.5, -1.0])


def plain_softmax(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(z - np.max(z))
    return e / np.sum(e)


def inverse_cdf(probs, u):
    cum = np.cumsum(probs)
    for i in range(len(cum)):
        if u < cum[i]:
            return i
    return int(np.nonzero(probs)[0][-1])


def kept(filtered):
    return np.nonzero(np.isfinite(np.asarray(filtered, dtype=float)))[0].tolist()


@check("examples", "k = 3 且有并列值的 top-k", "保留最大的 k 个 logit，其余设为负无穷。索引 2 和 3 的 logit 相同，因此保留较小的索引 2。")
def example_top_k(sub):
    out = sub.top_k_filter(LOGITS, 3)
    shape(out, (5,), what="过滤后的 logit")
    equal(kept(out), [0, 1, 2], what="保留的索引")
    close(np.asarray(out)[[0, 1, 2]], [2.0, 1.0, 0.5], what="保留的 logit")


@check("examples", "p = 0.8 的 top-p 保留跨过 p 的 token", "排序后的累计概率为 0.5365、0.7339 和 0.8536。第三个 token 使累计和达到 0.8，因此要保留。")
def example_top_p(sub):
    out = sub.top_p_filter(LOGITS, 0.8)
    shape(out, (5,), what="过滤后的 logit")
    equal(kept(out), [0, 1, 2], what="保留的索引")


@check("examples", "温度 0.5、top-k 3 时的概率", "先将 logit 除以温度，再应用 top-k，最后对保留的 logit 计算 softmax。")
def example_probs(sub):
    close(sub.sampling_probs(LOGITS, temperature=0.5, top_k=3), [0.84379473, 0.1141952, 0.04201007, 0.0, 0.0], rtol=1e-6, atol=1e-12, what="概率")


@check("examples", "种子 0 的一次抽样", "种子 0 的第一次 rng.random() 为 0.637。累计概率大于 0.637 的最小索引为 1。")
def example_sample(sub):
    equal(int(sub.sample(LOGITS, np.random.default_rng(0), top_k=3)), 1, what="抽样索引")


@check("properties", "概率之和为 1，被过滤 token 的概率恰好为 0", "最终分布是保留 logit 的 softmax。被过滤器移除的 token 概率为 0。")
def probs_valid(sub):
    rng = np.random.default_rng(1)
    for _ in range(5):
        z = rng.normal(size=12) * 2
        probs = np.asarray(sub.sampling_probs(z, temperature=0.8, top_k=6, top_p=0.7), dtype=float)
        shape(probs, (12,), what="概率")
        close(np.sum(probs), 1.0, atol=1e-9, what="概率之和")
        true(np.all(probs >= 0), "存在负概率", "0 到 1 之间的值", probs)
        true(np.count_nonzero(probs) <= 6, "概率大于 0 的 token 数量超过 k", "最多 6 个非零值", probs)


@check("properties", "top-k 恰好原样保留最大的 k 个 logit", "top_k_filter 返回相同形状的数组。最大的 k 个 logit 保持原值，其余元素为负无穷。")
def top_k_property(sub):
    rng = np.random.default_rng(2)
    for k in [1, 3, 7]:
        z = rng.normal(size=10)
        out = np.asarray(sub.top_k_filter(z, k), dtype=float)
        shape(out, (10,), what=f"k = {k} 时过滤后的 logit")
        idx = kept(out)
        equal(sorted(idx), sorted(np.argsort(-z)[:k].tolist()), what=f"k = {k} 时保留的索引")
        close(out[idx], z[idx], atol=0, rtol=0, what=f"k = {k} 时保留的 logit")
        true(np.all(np.isneginf(np.delete(out, idx))), "被移除的元素不是负无穷", "-inf", out)


@check("properties", "top-p 保留累计概率达到 p 的最小高概率 token 集合", "按概率从高到低排序 token，保留到累计和达到 p。保留的概率质量至少为 p，去掉其中概率最小的 token 后则低于 p。")
def top_p_property(sub):
    rng = np.random.default_rng(3)
    for p in [0.3, 0.6, 0.9, 0.95]:
        z = rng.normal(size=9) * 1.5
        probs = plain_softmax(z)
        idx = kept(sub.top_p_filter(z, p))
        true(len(idx) >= 1, "top_p_filter 移除了全部 token", "至少保留一个 token", idx)
        order = np.argsort(-probs, kind="stable")
        equal(sorted(idx), sorted(order[:len(idx)].tolist()), what=f"p = {p} 时保留的索引")
        mass = float(np.sum(probs[idx]))
        smallest = float(np.min(probs[idx]))
        true(mass >= p - 1e-12, f"保留的概率质量 {mass:.4f} 低于 p = {p}", f">= {p}", mass)
        true(mass - smallest < p, f"p = {p} 时保留的集合不是最小集合", f"去掉最后一个 token 后的概率质量 < {p}", mass - smallest)


@check("properties", "温度缩放两个 token 的概率对数比", "温度为 t 时，log(p_i / p_j) 等于 (z_i - z_j) / t。")
def temperature_property(sub):
    z = np.array([1.5, -0.5, 0.25, 2.0])
    for t in [0.25, 1.0, 3.0]:
        probs = np.asarray(sub.sampling_probs(z, temperature=t), dtype=float)
        close(np.log(probs[3] / probs[1]), (z[3] - z[1]) / t, rtol=1e-9, what=f"t = {t} 时的 log(p_3 / p_1)")


@check("properties", "sample 调用一次 rng.random() 并使用逆 CDF", "每次调用只抽取一次 u = rng.random()。按词表顺序累计概率，返回累计概率大于 u 的最小索引 i。")
def sample_method(sub):
    rng_a = np.random.default_rng(11)
    rng_b = np.random.default_rng(11)
    z = np.array([0.2, 1.4, -0.3, 0.9, 0.9, -2.0, 0.1])
    probs = plain_softmax(np.where(np.isin(np.arange(7), [0, 1, 3, 4, 6]), z / 0.9, -np.inf))
    got = [int(sub.sample(z, rng_a, temperature=0.9, top_k=5)) for _ in range(40)]
    expected = [inverse_cdf(probs, rng_b.random()) for _ in range(40)]
    equal(got, expected, what="种子 11 的 40 次抽样")


@check("properties", "输入不变", "过滤器若将负无穷写入输入数组，会破坏调用方代码。")
def inputs_unchanged(sub):
    z = np.array([0.3, -1.2, 2.0, 0.7, 0.7])
    saved = z.copy()
    sub.top_k_filter(z, 2)
    sub.top_p_filter(z, 0.5)
    sub.sampling_probs(z, temperature=0.5, top_k=3, top_p=0.9)
    sub.sample(z, np.random.default_rng(0), temperature=2.0, top_k=4, top_p=0.8)
    close(z, saved, atol=0, rtol=0, what="调用后的 logit")


@check("edge", "top-k 并列时保留较小索引", "logit 相等时使用稳定排序，使较小索引在前。")
def top_k_ties(sub):
    equal(kept(sub.top_k_filter(np.zeros(6), 2)), [0, 1], what="6 个相同 logit 保留的索引")
    equal(kept(sub.top_k_filter(np.array([0.0, 1.0, 1.0, 1.0]), 2)), [1, 2], what="[0, 1, 1, 1] 保留的索引")


@check("edge", "top-p 保留使累计和恰好等于 p 的 token", "规则为累计和 >= p。两个等概率 token 各为 0.5，因此 p = 0.5 时只保留第一个。")
def top_p_exact(sub):
    equal(kept(sub.top_p_filter(np.array([0.0, 0.0]), 0.5)), [0], what="保留的索引")


@check("edge", "极小的 p 只保留概率最大的 token", "排序后的第一个 token 总会保留，因此 top-p 不会移除全部 token。")
def top_p_small(sub):
    equal(kept(sub.top_p_filter(np.array([0.1, 3.0, 3.0, -1.0]), 1e-9)), [1], what="保留的索引")


@check("edge", "k 不小于词表大小及 p = 1 时保留全部 token", "k >= V 的 top_k_filter 和 p = 1.0 的 top_p_filter 不改变输入值。累计和可能因舍入略低于 1，因此没有前缀达到 p 时保留全部 token。")
def keep_all(sub):
    rng = np.random.default_rng(4)
    z = rng.normal(size=8)
    close(sub.top_k_filter(z, 8), z, atol=0, rtol=0, what="k = 8 的 top-k")
    close(sub.top_k_filter(z, 20), z, atol=0, rtol=0, what="k = 20 的 top-k")
    close(sub.top_p_filter(z, 1.0), z, atol=0, rtol=0, what="p = 1.0 的 top-p")


@check("edge", "大 logit 不溢出", "float64 中 exp(1000) 为无穷。在 np.exp 前减去最大值。")
def large_logits(sub):
    close(sub.sampling_probs(np.array([1000.0, 1001.0, 1002.0])), [0.09003057, 0.24472847, 0.66524096], rtol=1e-6, what="概率")
    close(sub.sampling_probs(np.array([1000.0, 1001.0, 1002.0]), top_p=0.5), [0.0, 0.0, 1.0], atol=1e-12, what="p = 0.5 时的概率")


@check("edge", "top-k = 1 时为贪心采样", "只保留一个 token 时，每次抽样都返回最大 logit 的索引。")
def greedy(sub):
    rng = np.random.default_rng(5)
    z = np.array([0.5, 2.5, 2.5, 1.0])
    equal({int(sub.sample(z, rng, top_k=1)) for _ in range(20)}, {1}, what="20 次抽样的索引集合")


@fixture("cases")
def cases(ref):
    rng = np.random.default_rng(42)
    settings = [(1.0, None, None), (0.7, None, None), (1.0, 4, None), (1.0, None, 0.9), (0.5, 5, 0.8), (1.5, 8, 0.6), (2.0, None, 0.5), (0.8, 3, 0.99)]
    for t, k, p in settings:
        z = rng.normal(size=10) * 2
        seed = int(rng.integers(0, 1000))
        draws_rng = np.random.default_rng(seed)
        draws = [int(ref.sample(z, draws_rng, temperature=t, top_k=k, top_p=p)) for _ in range(15)]
        filtered_k = kept(ref.top_k_filter(z, k)) if k is not None else None
        filtered_p = kept(ref.top_p_filter(z, p)) if p is not None else None
        yield {"logits": z, "temperature": t, "top_k": k, "top_p": p, "seed": seed}, {
            "probs": ref.sampling_probs(z, temperature=t, top_k=k, top_p=p),
            "draws": draws,
            "top_k": filtered_k,
            "top_p": filtered_p,
        }


@check("reference", "8 个随机用例的过滤结果与参考解一致", "top_k_filter 和 top_p_filter 保留的 token 应与参考解一致。")
def reference_filters(sub):
    for case, expected in fixtures("cases"):
        if case["top_k"] is not None:
            out = sub.top_k_filter(case["logits"], case["top_k"])
            equal(kept(out), expected["top_k"], what=f"k = {case['top_k']} 时 top_k_filter 保留的索引")
            close(np.asarray(out)[expected["top_k"]], case["logits"][expected["top_k"]], atol=0, rtol=0, what=f"k = {case['top_k']} 时保留的 logit")
        if case["top_p"] is not None:
            out = sub.top_p_filter(case["logits"], case["top_p"])
            equal(kept(out), expected["top_p"], what=f"p = {case['top_p']} 时 top_p_filter 保留的索引")
            close(np.asarray(out)[expected["top_p"]], case["logits"][expected["top_p"]], atol=0, rtol=0, what=f"p = {case['top_p']} 时保留的 logit")


@check("reference", "概率与抽样结果和参考解一致", "相同设置和种子下，sampling_probs 和 sample 的结果应与参考解一致。")
def reference_probs(sub):
    for case, expected in fixtures("cases"):
        label = f"t = {case['temperature']}, k = {case['top_k']}, p = {case['top_p']}"
        close(sub.sampling_probs(case["logits"], temperature=case["temperature"], top_k=case["top_k"], top_p=case["top_p"]), expected["probs"], rtol=1e-7, atol=1e-12, what=f"{label} 时的概率")
        rng = np.random.default_rng(case["seed"])
        draws = [int(sub.sample(case["logits"], rng, temperature=case["temperature"], top_k=case["top_k"], top_p=case["top_p"])) for _ in range(15)]
        equal(draws, expected["draws"], what=f"{label} 时的 15 次抽样")
