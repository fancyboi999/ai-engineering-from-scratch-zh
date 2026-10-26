import numpy as np

from practice_check import check, close, equal, fixture, fixtures, shape, true

Q2 = np.array([[1.0, 0.0], [0.0, 1.0]])
K3 = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
V3 = np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]])


def reference_attention(Q, K, V, mask=None):
    scores = Q @ np.swapaxes(K, -1, -2) / np.sqrt(Q.shape[-1])
    if mask is not None:
        scores = np.where(mask, -np.inf, scores)
    scores = scores - np.max(scores, axis=-1, keepdims=True)
    weights = np.exp(scores)
    weights = weights / np.sum(weights, axis=-1, keepdims=True)
    return weights @ V, weights


def random_mask(rng, shape_):
    mask = rng.random(shape_) < 0.5
    mask[..., 0] = False
    return mask


@check("examples", '不带掩码的 attention', '分数为 Q 乘 K 的转置，再除以 sqrt(d_k)。权重是逐行 softmax 的结果，输出为权重乘 V。')
def example_unmasked(sub):
    output, weights = sub.scaled_dot_product_attention(Q2, K3, V3)
    close(weights, [[0.40111209, 0.19777581, 0.40111209], [0.19777581, 0.40111209, 0.40111209]], rtol=1e-6, what="权重")
    close(output, [[3.0, 4.0], [3.40667256, 4.40667256]], rtol=1e-6, what="输出")


@check("examples", 'T = 3 时的因果掩码', '因果掩码在对角线以上为 True，表示 key 位于 query 之后。对角线为 False。')
def example_causal_mask(sub):
    mask = sub.causal_mask(3)
    shape(mask, (3, 3), what="掩码")
    true(np.asarray(mask).dtype == bool, "掩码必须是布尔数组", "bool 数据类型", np.asarray(mask).dtype)
    equal(np.asarray(mask), np.array([[False, True, True], [False, False, True], [False, False, False]]), what="因果掩码")


@check("examples", '三个 token 的因果 attention', 'mask 中的 True 会屏蔽对应 key。Token i 只能读取 token 0 到 i，其权重之和仍为 1。')
def example_causal(sub):
    X = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
    output, weights = sub.scaled_dot_product_attention(X, X, V3, mask=sub.causal_mask(3))
    close(weights, [[1.0, 0.0, 0.0], [0.33023845, 0.66976155, 0.0], [0.24825508, 0.24825508, 0.50348984]], rtol=1e-6, atol=1e-9, what="权重")
    close(output, [[1.0, 2.0], [2.3395231, 3.3395231], [3.51046953, 4.51046953]], rtol=1e-6, what="输出")


@check("properties", '批次形状及行和为 1', '前置轴是 batch 轴。权重形状为 (..., Tq, Tk)，输出形状为 (..., Tq, d_v)，每行权重之和为 1。')
def batched_shapes(sub):
    rng = np.random.default_rng(0)
    Q = rng.normal(size=(2, 3, 4, 5))
    K = rng.normal(size=(2, 3, 6, 5))
    V = rng.normal(size=(2, 3, 6, 7))
    output, weights = sub.scaled_dot_product_attention(Q, K, V)
    shape(weights, (2, 3, 4, 6), what="权重")
    shape(output, (2, 3, 4, 7), what="输出")
    close(np.sum(weights, axis=-1), np.ones((2, 3, 4)), atol=1e-9, what="权重逐行之和")
    true(np.all(np.asarray(weights) >= 0), "存在负权重", "0 到 1 之间的值", weights)


@check("properties", '批次结果与逐项计算一致', '批次中的每一项独立计算 attention。只转置 K 的最后两个轴，例如使用 np.swapaxes(K, -1, -2)。')
def batch_matches_loop(sub):
    rng = np.random.default_rng(1)
    Q = rng.normal(size=(3, 4, 2))
    K = rng.normal(size=(3, 5, 2))
    V = rng.normal(size=(3, 5, 3))
    output, weights = sub.scaled_dot_product_attention(Q, K, V)
    shape(output, (3, 4, 3), what="批次输出")
    for b in range(3):
        one_out, one_w = sub.scaled_dot_product_attention(Q[b], K[b], V[b])
        close(output[b], one_out, atol=1e-9, what=f"批次中第 {b} 项的输出")
        close(weights[b], one_w, atol=1e-9, what=f"批次中第 {b} 项的权重")


@check("properties", '被屏蔽权重恰好为 0，行和仍为 1', '在 softmax 前将被屏蔽的分数设为负无穷，这样对应权重恰好为 0，允许访问的权重之和为 1。')
def masked_weights_zero(sub):
    rng = np.random.default_rng(2)
    Q = rng.normal(size=(2, 5, 4))
    K = rng.normal(size=(2, 6, 4))
    V = rng.normal(size=(2, 6, 3))
    mask = random_mask(rng, (2, 5, 6))
    output, weights = sub.scaled_dot_product_attention(Q, K, V, mask=mask)
    weights = np.asarray(weights)
    shape(weights, (2, 5, 6), what="权重")
    true(np.all(weights[mask] == 0.0), "被屏蔽位置的权重不为 0", "掩码中每个 True 位置的权重均为 0", weights)
    close(np.sum(weights, axis=-1), np.ones((2, 5)), atol=1e-9, what="应用掩码后的权重逐行之和")


@check("properties", '(Tq, Tk) 掩码会广播到批次', '掩码的轴数可以少于分数矩阵。numpy 广播会将相同掩码应用于批次中的每项。')
def mask_broadcasts(sub):
    rng = np.random.default_rng(3)
    Q = rng.normal(size=(2, 4, 3))
    V = rng.normal(size=(2, 4, 2))
    mask = sub.causal_mask(4)
    output, weights = sub.scaled_dot_product_attention(Q, Q, V, mask=mask)
    expected_out, expected_w = reference_attention(Q, Q, V, np.triu(np.ones((4, 4), dtype=bool), k=1))
    close(weights, expected_w, atol=1e-9, what="应用因果掩码后的权重")
    close(output, expected_out, atol=1e-9, what="应用因果掩码后的输出")


@check("properties", '输入不会被修改', '若函数修改 Q、K、V 或 mask，会破坏调用方的后续逻辑。')
def inputs_unchanged(sub):
    rng = np.random.default_rng(4)
    Q = rng.normal(size=(3, 2))
    K = rng.normal(size=(4, 2))
    V = rng.normal(size=(4, 2))
    mask = np.array([[False, True, False, True], [False, False, True, True], [True, True, True, False]])
    saved = [Q.copy(), K.copy(), V.copy(), mask.copy()]
    sub.scaled_dot_product_attention(Q, K, V, mask=mask)
    for name, before, after in zip(["Q", "K", "V", "mask"], saved, [Q, K, V, mask]):
        true(np.array_equal(before, after), f"函数修改了 {name}", before, after)


@check("edge", '只允许访问一个 key', 'mask 只允许一个 key 时，该 key 权重为 1，输出行恰好等于对应的 value 行。')
def one_key_allowed(sub):
    rng = np.random.default_rng(5)
    Q = rng.normal(size=(3, 4))
    K = rng.normal(size=(5, 4))
    V = rng.normal(size=(5, 2))
    mask = np.ones((3, 5), dtype=bool)
    mask[0, 2] = False
    mask[1, 0] = False
    mask[2, 4] = False
    output, weights = sub.scaled_dot_product_attention(Q, K, V, mask=mask)
    expected = np.zeros((3, 5))
    expected[0, 2] = expected[1, 0] = expected[2, 4] = 1.0
    close(weights, expected, atol=1e-12, what="权重")
    close(output, V[[2, 0, 4]], atol=1e-12, what="输出")


@check("edge", '大分数不会溢出', 'float64 中 exp(1414) 会溢出。调用 np.exp 前减去行最大值，使最大指数为 0。')
def large_scores(sub):
    Q = np.array([[2000.0, 0.0]])
    K = np.array([[1.0, 0.0], [0.999, 0.0], [0.0, 1.0]])
    V = np.array([[1.0, 0.0], [0.0, 1.0], [5.0, 5.0]])
    output, weights = sub.scaled_dot_product_attention(Q, K, V)
    close(weights, [[0.8044296825, 0.1955703175, 0.0]], rtol=1e-8, atol=1e-12, what="权重")
    close(output, [[0.8044296825, 0.1955703175]], rtol=1e-8, atol=1e-12, what="输出")


@check("edge", '一个 token', '只有一个 query 和一个 key 时，权重为 1，输出就是 value。causal_mask(1) 仅包含一个 False。')
def one_token(sub):
    V = np.array([[2.5, -1.0, 4.0]])
    output, weights = sub.scaled_dot_product_attention(np.array([[0.3, 0.7]]), np.array([[-1.0, 2.0]]), V, mask=sub.causal_mask(1))
    close(weights, [[1.0]], what="权重")
    close(output, V, what="输出")
    equal(np.asarray(sub.causal_mask(1)), np.array([[False]]), what="causal_mask(1)")


@fixture("cases")
def cases(ref):
    rng = np.random.default_rng(42)
    for lead, tq, tk, dk, dv, masked in [((), 3, 3, 4, 2, False), ((2,), 4, 4, 8, 3, True), ((2,), 3, 5, 2, 2, True), ((2, 2), 5, 5, 4, 4, True), ((3,), 1, 6, 16, 5, False)]:
        Q = rng.normal(size=lead + (tq, dk))
        K = rng.normal(size=lead + (tk, dk))
        V = rng.normal(size=lead + (tk, dv))
        mask = random_mask(rng, lead + (tq, tk)) if masked else None
        output, weights = ref.scaled_dot_product_attention(Q, K, V, mask=mask)
        yield {"Q": Q, "K": K, "V": V, "mask": mask}, {"output": output, "weights": weights}
    for t in [1, 2, 5, 8]:
        yield {"T": t}, {"causal": ref.causal_mask(t)}


@check("reference", '5 个随机用例的 attention 与参考实现一致', '有掩码和无掩码的批次输入中，输出和权重都与参考实现一致。')
def reference_attention_cases(sub):
    for case, expected in fixtures("cases"):
        if "T" in case:
            continue
        output, weights = sub.scaled_dot_product_attention(case["Q"], case["K"], case["V"], mask=case["mask"])
        label = f"Q 形状为 {case['Q'].shape}" + ("，带掩码" if case["mask"] is not None else "")
        close(weights, expected["weights"], rtol=1e-7, atol=1e-12, what=f"{label} 时的权重")
        close(output, expected["output"], rtol=1e-7, atol=1e-12, what=f"{label} 时的输出")


@check("reference", '因果掩码与参考实现一致', '对于多种尺寸，causal_mask 都返回与参考实现相同的布尔数组。')
def reference_causal(sub):
    for case, expected in fixtures("cases"):
        if "T" not in case:
            continue
        equal(np.asarray(sub.causal_mask(case["T"])), expected["causal"], what=f"causal_mask({case['T']})")
