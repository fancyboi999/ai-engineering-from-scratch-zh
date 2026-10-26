import numpy as np

from practice_check import check, close, equal, fixture, fixtures, raises, shape, true

X1 = np.array([[[1.0, 0.0, 0.0, 1.0], [0.0, 1.0, 1.0, 0.0], [1.0, 1.0, 0.0, 0.0]]])
WQ1 = np.eye(4)
WK1 = np.array([[1.0, 0.0], [0.0, 1.0], [0.0, 0.0], [0.0, 0.0]])
WV1 = np.array([[1.0, 0.0], [0.0, 2.0], [0.0, 0.0], [1.0, 0.0]])
WO1 = np.eye(4)


def heads(x, n):
    B, T, D = x.shape
    return x.reshape(B, T, n, D // n).transpose(0, 2, 1, 3)


def attend(q, k, v):
    scores = q @ np.swapaxes(k, -1, -2) / np.sqrt(q.shape[-1])
    scores = scores - np.max(scores, axis=-1, keepdims=True)
    weights = np.exp(scores)
    weights = weights / np.sum(weights, axis=-1, keepdims=True)
    return weights @ v, weights


def mha(x, w_q, w_k, w_v, w_o, n_heads):
    out, weights = attend(heads(x @ w_q, n_heads), heads(x @ w_k, n_heads), heads(x @ w_v, n_heads))
    B, H, T, d = out.shape
    return out.transpose(0, 2, 1, 3).reshape(B, T, H * d) @ w_o, weights


def mqa(x, w_q, w_k, w_v, w_o, n_heads):
    q = heads(x @ w_q, n_heads)
    out, weights = attend(q, (x @ w_k)[:, None], (x @ w_v)[:, None])
    B, H, T, d = out.shape
    return out.transpose(0, 2, 1, 3).reshape(B, T, H * d) @ w_o, weights


def random_weights(rng, D, H, G):
    d_head = D // H
    return rng.normal(size=(D, D)) / np.sqrt(D), rng.normal(size=(D, G * d_head)) / np.sqrt(D), rng.normal(size=(D, G * d_head)) / np.sqrt(D), rng.normal(size=(D, D)) / np.sqrt(D)


@check("examples", "将两组重复为四个头", "查询头 h 使用第 h // (H / G) 组。因此，头 0 和头 1 使用第 0 组，头 2 和头 3 使用第 1 组。")
def example_repeat(sub):
    kv = np.arange(8.0).reshape(1, 2, 2, 2)
    out = sub.repeat_kv(kv, 4)
    shape(out, (1, 4, 2, 2), what="重复后的数组")
    close(out, [[[[0.0, 1.0], [2.0, 3.0]], [[0.0, 1.0], [2.0, 3.0]], [[4.0, 5.0], [6.0, 7.0]], [[4.0, 5.0], [6.0, 7.0]]]], what="重复后的数组")


@check("examples", "两个查询头共享一个键头和值头", "两个查询头使用相同的键和值。查询不同，因此注意力权重也不同。")
def example_gqa(sub):
    output, weights = sub.grouped_query_attention(X1, WQ1, WK1, WV1, WO1, 2, 1)
    close(weights, [[[[0.40111209, 0.19777581, 0.40111209], [0.19777581, 0.40111209, 0.40111209], [0.24825508, 0.24825508, 0.50348984]], [[0.19777581, 0.40111209, 0.40111209], [0.40111209, 0.19777581, 0.40111209], [0.33333333, 0.33333333, 0.33333333]]]], rtol=1e-7, what="注意力权重")
    close(output, [[[1.20333628, 1.19777581, 0.79666372, 1.60444837], [0.79666372, 1.60444837, 1.20333628, 1.19777581], [1.0, 1.50348984, 1.0, 1.33333333]]], rtol=1e-7, what="输出")


@check("examples", "将四个头均值池化为两组", "第 g 组是第 g * r 到第 g * r + r - 1 个头的均值，其中 r = H / G。每个头占据连续的 d_head 列。")
def example_pool(sub):
    close(sub.mean_pool_kv_heads(np.arange(16.0).reshape(2, 8), 4, 2), [[1.0, 2.0, 5.0, 6.0], [9.0, 10.0, 13.0, 14.0]], what="池化后的投影")


@check("properties", "G = H 时等同于多头注意力", "每个查询头各有一个键头和值头时，不共享任何头。结果必须等于标准多头注意力。")
def g_equals_h(sub):
    rng = np.random.default_rng(0)
    x = rng.normal(size=(2, 5, 8))
    w_q, w_k, w_v, w_o = random_weights(rng, 8, 4, 4)
    output, weights = sub.grouped_query_attention(x, w_q, w_k, w_v, w_o, 4, 4)
    expected, expected_w = mha(x, w_q, w_k, w_v, w_o, 4)
    close(weights, expected_w, atol=1e-10, what="注意力权重")
    close(output, expected, atol=1e-10, what="输出")


@check("properties", "G = 1 时等同于多查询注意力", "只有一组时，每个查询头都使用同一个键头和同一个值头。")
def g_equals_one(sub):
    rng = np.random.default_rng(1)
    x = rng.normal(size=(1, 6, 8))
    w_q, w_k, w_v, w_o = random_weights(rng, 8, 4, 1)
    output, weights = sub.grouped_query_attention(x, w_q, w_k, w_v, w_o, 4, 1)
    expected, expected_w = mqa(x, w_q, w_k, w_v, w_o, 4)
    close(weights, expected_w, atol=1e-10, what="注意力权重")
    close(output, expected, atol=1e-10, what="输出")


@check("properties", "同组的头读取相同的键", "为两个查询头设置相同的查询权重。同组时，它们的注意力权重相等；不同组时，注意力权重不相等。")
def same_group_same_keys(sub):
    rng = np.random.default_rng(2)
    D, H, G = 8, 4, 2
    x = rng.normal(size=(1, 5, D))
    w_q, w_k, w_v, w_o = random_weights(rng, D, H, G)
    w_q[:, 2:4] = w_q[:, 0:2]
    w_q[:, 4:6] = w_q[:, 0:2]
    _, weights = sub.grouped_query_attention(x, w_q, w_k, w_v, w_o, H, G)
    weights = np.asarray(weights)
    shape(weights, (1, H, 5, 5), what="注意力权重")
    close(weights[0, 1], weights[0, 0], atol=1e-12, what="第 1 个头的注意力权重，该头与第 0 个头同属第 0 组")
    true(not np.allclose(weights[0, 2], weights[0, 0]), "第 2 个头属于第 1 组，却得到了与第 0 个头相同的注意力权重", "不同的注意力权重", weights[0, 2])


@check("properties", "对相同的头做池化后注意力不变", "当每组的头已经具有相同的键和值投影权重时，均值池化不会改变它们。此时使用池化权重的 GQA 等于多头注意力。")
def pool_identity(sub):
    rng = np.random.default_rng(3)
    D, H, G = 8, 4, 2
    x = rng.normal(size=(1, 4, D))
    w_q, small_k, small_v, w_o = random_weights(rng, D, H, G)
    full_k = np.repeat(small_k.reshape(D, G, 1, 2), 2, axis=2).reshape(D, H * 2)
    full_v = np.repeat(small_v.reshape(D, G, 1, 2), 2, axis=2).reshape(D, H * 2)
    pooled_k = sub.mean_pool_kv_heads(full_k, H, G)
    pooled_v = sub.mean_pool_kv_heads(full_v, H, G)
    close(pooled_k, small_k, atol=1e-12, what="池化后的键投影")
    output, _ = sub.grouped_query_attention(x, w_q, pooled_k, pooled_v, w_o, H, G)
    expected, _ = mha(x, w_q, full_k, full_v, w_o, H)
    close(output, expected, atol=1e-10, what="使用池化权重的输出")


@check("properties", "输入未被修改", "函数写入 x 或权重矩阵会破坏调用方的模型。")
def inputs_unchanged(sub):
    rng = np.random.default_rng(4)
    x = rng.normal(size=(1, 3, 4))
    ws = list(random_weights(rng, 4, 2, 1))
    saved = [x.copy()] + [w.copy() for w in ws]
    sub.grouped_query_attention(x, *ws, 2, 1)
    big = rng.normal(size=(4, 8))
    big_saved = big.copy()
    sub.mean_pool_kv_heads(big, 4, 2)
    kv = rng.normal(size=(1, 2, 3, 2))
    kv_saved = kv.copy()
    sub.repeat_kv(kv, 4)
    for name, before, after in zip(["x", "w_q", "w_k", "w_v", "w_o", "池化后的矩阵", "kv"], saved + [big_saved, kv_saved], [x] + ws + [big, kv]):
        true(np.array_equal(before, after), f"函数修改了 {name}", before, after)


@check("edge", "H 不是 G 的整数倍时抛出 ValueError", "每组必须包含相同数量的查询头。当 n_heads 不是 n_kv_heads 的整数倍时，应抛出 ValueError。")
def bad_groups(sub):
    rng = np.random.default_rng(5)
    x = rng.normal(size=(1, 2, 6))
    raises(ValueError, sub.grouped_query_attention, x, np.eye(6), rng.normal(size=(6, 4)), rng.normal(size=(6, 4)), np.eye(6), 3, 2)
    raises(ValueError, sub.repeat_kv, rng.normal(size=(1, 2, 2, 2)), 3)
    raises(ValueError, sub.mean_pool_kv_heads, rng.normal(size=(6, 6)), 3, 2)


@check("edge", "单个 token 和单个头", "只有一个 token 时，注意力权重为 1，输出等于值乘以 W_o。当 H = G = 1 时，GQA 就是单头注意力。")
def one_token(sub):
    x = np.array([[[0.5, -1.0, 2.0]]])
    w_v = np.array([[1.0, 0.0, 0.0], [0.0, 2.0, 0.0], [0.0, 0.0, 3.0]])
    w_o = np.array([[0.0, 1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]])
    output, weights = sub.grouped_query_attention(x, np.eye(3), np.eye(3), w_v, w_o, 1, 1)
    close(weights, [[[[1.0]]]], what="注意力权重")
    close(output, [[[-2.0, 0.5, 6.0]]], what="输出")


@check("edge", "使用 d_head 而不是 D 缩放", "将分数除以单个头维度的平方根，其中 d_head = D / H。")
def scale_by_head(sub):
    rng = np.random.default_rng(6)
    x = rng.normal(size=(1, 4, 12)) * 2
    w_q, w_k, w_v, w_o = random_weights(rng, 12, 6, 3)
    _, weights = sub.grouped_query_attention(x, w_q, w_k, w_v, w_o, 6, 3)
    q = heads(x @ w_q, 6)
    k = np.repeat(heads(x @ w_k, 3), 2, axis=1)
    _, expected = attend(q, k, k)
    close(weights, expected, atol=1e-10, what="注意力权重")


@fixture("cases")
def cases(ref):
    rng = np.random.default_rng(42)
    for B, T, D, H, G in [(1, 3, 4, 2, 1), (2, 4, 8, 4, 2), (1, 5, 12, 6, 3), (2, 3, 8, 8, 4), (1, 6, 6, 3, 3)]:
        x = rng.normal(size=(B, T, D))
        w_q, w_k, w_v, w_o = random_weights(rng, D, H, G)
        output, weights = ref.grouped_query_attention(x, w_q, w_k, w_v, w_o, H, G)
        full = rng.normal(size=(D, D))
        yield {"x": x, "w_q": w_q, "w_k": w_k, "w_v": w_v, "w_o": w_o, "H": H, "G": G, "full": full}, {"output": output, "weights": weights, "pooled": ref.mean_pool_kv_heads(full, H, G)}


@check("reference", "5 个随机用例的 GQA 和池化与参考解一致", "在不同头数和组数下，输出、注意力权重和池化投影都应与参考解一致。")
def reference_cases(sub):
    for case, expected in fixtures("cases"):
        label = f"x 形状为 {case['x'].shape}，H = {case['H']}，G = {case['G']}"
        output, weights = sub.grouped_query_attention(case["x"], case["w_q"], case["w_k"], case["w_v"], case["w_o"], case["H"], case["G"])
        close(weights, expected["weights"], rtol=1e-8, atol=1e-12, what=f"{label} 时的注意力权重")
        close(output, expected["output"], rtol=1e-8, atol=1e-12, what=f"{label} 时的输出")
        close(sub.mean_pool_kv_heads(case["full"], case["H"], case["G"]), expected["pooled"], rtol=1e-10, atol=1e-12, what=f"{label} 时池化后的投影")
