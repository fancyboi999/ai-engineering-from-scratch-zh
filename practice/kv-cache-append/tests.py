import numpy as np

from practice_check import check, close, equal, fixture, fixtures, raises, shape, true

K2 = np.array([[1.0, 0.0], [0.0, 1.0]])
V2 = np.array([[1.0, 2.0], [3.0, 4.0]])


def causal_attention(Q, K, V):
    T = Q.shape[0]
    scores = Q @ K.T / np.sqrt(Q.shape[-1])
    scores = np.where(np.triu(np.ones((T, T), dtype=bool), k=1), -np.inf, scores)
    scores = scores - np.max(scores, axis=-1, keepdims=True)
    weights = np.exp(scores)
    weights = weights / np.sum(weights, axis=-1, keepdims=True)
    return weights @ V


def example_cache(sub):
    cache = sub.KVCache(4, 2, 2)
    cache.append(K2, V2)
    cache.append(np.array([1.0, 1.0]), np.array([5.0, 6.0]))
    return cache


@check("examples", "先追加两个时间步，再追加一个", "append 会将新行写在缓存已有行之后。len(cache) 统计已存储的时间步数。一维 k 或 v 表示一个时间步。")
def example_append(sub):
    cache = sub.KVCache(4, 2, 2)
    cache.append(K2, V2)
    equal(len(cache), 2, what="追加两个时间步后的 len(cache)")
    close(cache.keys(), K2, what="追加两个时间步后的 keys()")
    cache.append(np.array([1.0, 1.0]), np.array([5.0, 6.0]))
    equal(len(cache), 3, what="追加三个时间步后的 len(cache)")
    close(cache.values(), [[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]], what="追加三个时间步后的 values()")


@check("examples", "在缓存的三个时间步上执行一步解码", "分数等于缓存 key 与 q 的乘积除以 sqrt(d_k)，权重为分数的 softmax，输出为权重乘以缓存的 value。")
def example_decode(sub):
    output, weights = sub.decode_step(np.array([1.0, 0.0]), example_cache(sub))
    close(weights, [0.40111209, 0.19777581, 0.40111209], rtol=1e-6, what="权重")
    close(output, [3.0, 4.0], rtol=1e-6, what="输出")


@check("examples", "缓存已满时抛出 ValueError", "max_len 为 4 且已有 3 步时，只剩一个位置。追加两步必须抛出 ValueError，并保持缓存不变。")
def example_overflow(sub):
    cache = example_cache(sub)
    raises(ValueError, cache.append, np.zeros((2, 2)), np.zeros((2, 2)))
    equal(len(cache), 3, what="追加失败后的 len(cache)")


@check("properties", "增量解码等于完整因果 attention", "使用缓存时，第 t 步只关注 0 到 t 步的 key 和 value。这应等于完整序列因果 attention 的第 t 行。")
def incremental_equals_full(sub):
    rng = np.random.default_rng(0)
    T, dk, dv = 7, 4, 3
    Q = rng.normal(size=(T, dk))
    K = rng.normal(size=(T, dk))
    V = rng.normal(size=(T, dv))
    full = causal_attention(Q, K, V)
    cache = sub.KVCache(T, dk, dv)
    for t in range(T):
        cache.append(K[t], V[t])
        output, weights = sub.decode_step(Q[t], cache)
        shape(weights, (t + 1,), what=f"第 {t} 步的权重")
        close(output, full[t], atol=1e-10, what=f"第 {t} 步的输出")


@check("properties", "一次追加 prompt，再逐步追加 token", "一次追加 P 步与连续 P 次各追加一步得到相同缓存。prompt 之后的解码结果仍应与因果 attention 一致。")
def prefill_then_decode(sub):
    rng = np.random.default_rng(1)
    T, P, dk, dv = 8, 5, 3, 2
    Q = rng.normal(size=(T, dk))
    K = rng.normal(size=(T, dk))
    V = rng.normal(size=(T, dv))
    full = causal_attention(Q, K, V)
    cache = sub.KVCache(T, dk, dv)
    cache.append(K[:P], V[:P])
    equal(len(cache), P, what="追加 prompt 后的 len(cache)")
    close(cache.keys(), K[:P], what="追加 prompt 后的 keys()")
    for t in range(P, T):
        cache.append(K[t:t + 1], V[t:t + 1])
        output, _ = sub.decode_step(Q[t], cache)
        close(output, full[t], atol=1e-10, what=f"第 {t} 步的输出")
    close(cache.values(), V, what="运行结束时的 values()")


@check("properties", "权重和为 1，输入保持不变", "每步解码会对缓存时间步生成概率分布。缓存会复制 k 和 v，因此调用方之后修改数组不会影响缓存。")
def weights_and_copies(sub):
    rng = np.random.default_rng(2)
    k = rng.normal(size=(3, 4))
    v = rng.normal(size=(3, 5))
    q = rng.normal(size=4)
    saved = [k.copy(), v.copy(), q.copy()]
    cache = sub.KVCache(6, 4, 5)
    cache.append(k, v)
    output, weights = sub.decode_step(q, cache)
    for name, before, after in zip(["k", "v", "q"], saved, [k, v, q]):
        true(np.array_equal(before, after), f"代码修改了 {name}", before, after)
    close(np.sum(weights), 1.0, atol=1e-12, what="权重之和")
    shape(output, (5,), what="输出")
    k[:] = 0.0
    v[:] = 0.0
    close(cache.keys(), saved[0], what="调用方修改 k 后的 keys()")
    close(cache.values(), saved[1], what="调用方修改 v 后的 values()")


@check("edge", "刚好填满缓存", "追加后刚好达到 max_len 是允许的。只有超出 max_len 才抛出 ValueError。")
def fill_exactly(sub):
    cache = sub.KVCache(3, 2, 1)
    cache.append(np.ones((2, 2)), np.ones((2, 1)))
    cache.append(np.array([2.0, 2.0]), np.array([7.0]))
    equal(len(cache), 3, what="缓存填满时的 len(cache)")
    close(cache.values(), [[1.0], [1.0], [7.0]], what="缓存填满时的 values()")
    raises(ValueError, cache.append, np.ones(2), np.ones(1))


@check("edge", "追加失败时缓存保持不变", "写入或更新计数前先检查剩余容量。抛出 ValueError 后，长度、key 和 value 都必须与之前相同。")
def failed_append_unchanged(sub):
    cache = sub.KVCache(4, 2, 2)
    cache.append(K2, V2)
    raises(ValueError, cache.append, np.ones((3, 2)), np.ones((3, 2)))
    equal(len(cache), 2, what="追加失败后的 len(cache)")
    close(cache.keys(), K2, what="追加失败后的 keys()")
    cache.append(np.array([1.0, 1.0]), np.array([5.0, 6.0]))
    equal(len(cache), 3, what="再次追加后的 len(cache)")
    close(cache.values(), [[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]], what="再次追加后的 values()")


@check("edge", "k 和 v 的步数不同时抛出 ValueError", "每个时间步都要有一个 key 和一个 value。追加 2 个 key 和 1 个 value 时必须抛出 ValueError。")
def mismatched_steps(sub):
    cache = sub.KVCache(4, 2, 2)
    raises(ValueError, cache.append, np.ones((2, 2)), np.ones((1, 2)))
    equal(len(cache), 0, what="追加失败后的 len(cache)")


@check("edge", "单步缓存和大分数", "缓存只有一步时，权重为 1，输出就是该 value。大分数不能溢出，因此调用 np.exp 前应减去最大分数。")
def one_step_and_large(sub):
    cache = sub.KVCache(2, 2, 2)
    cache.append(np.array([3.0, -1.0]), np.array([2.5, -4.0]))
    output, weights = sub.decode_step(np.array([0.2, 0.9]), cache)
    close(weights, [1.0], what="只有一个时间步时的权重")
    close(output, [2.5, -4.0], what="只有一个时间步时的输出")
    cache.append(np.array([2999.0, 0.0]), np.array([1.0, 1.0]))
    output, weights = sub.decode_step(np.array([1.0, 0.0]), cache)
    true(np.all(np.isfinite(output)), "输出含有 NaN 或无穷值", "有限数值", output)
    close(weights, [0.0, 1.0], atol=1e-12, what="分数很大时的权重")


@fixture("runs")
def runs(ref):
    rng = np.random.default_rng(42)
    for max_len, dk, dv, chunks in [(5, 2, 3, [2, 1, 1]), (8, 4, 4, [3, 2, 2, 1]), (6, 8, 2, [1, 1, 1, 1, 1, 1]), (10, 3, 5, [6, 1, 2])]:
        steps = []
        outputs = []
        weights = []
        cache = ref.KVCache(max_len, dk, dv)
        for n in chunks:
            k = rng.normal(size=(n, dk))
            v = rng.normal(size=(n, dv))
            q = rng.normal(size=dk)
            cache.append(k, v)
            out, w = ref.decode_step(q, cache)
            steps.append({"k": k, "v": v, "q": q})
            outputs.append(out)
            weights.append(w)
        yield {"max_len": max_len, "dk": dk, "dv": dv, "steps": steps}, {"outputs": outputs, "weights": weights}


@check("reference", "4 次随机运行中的解码步骤与参考实现一致", "不同追加长度下，缓存和 decode_step 都与参考实现一致。")
def reference_runs(sub):
    for case, expected in fixtures("runs"):
        cache = sub.KVCache(case["max_len"], case["dk"], case["dv"])
        for index, step in enumerate(case["steps"]):
            cache.append(step["k"], step["v"])
            output, weights = sub.decode_step(step["q"], cache)
            label = f"第 {index} 步（本次运行 max_len 为 {case['max_len']}）"
            close(weights, expected["weights"][index], rtol=1e-8, atol=1e-12, what=f"{label}的权重")
            close(output, expected["outputs"][index], rtol=1e-8, atol=1e-12, what=f"{label}的输出")
