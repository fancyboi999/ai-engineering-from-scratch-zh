import numpy as np

from practice_check import check, close, equal, fixture, fixtures, raises, shape, true

X3 = np.array([[[1.0, 0.0, 0.0, 1.0], [0.0, 2.0, 1.0, 0.0], [1.0, 1.0, 1.0, 1.0]]])


def projections(rng, d):
    return [rng.normal(size=(d, d)) / np.sqrt(d) for _ in range(4)]


def one_head(q, k, v):
    scores = q @ np.swapaxes(k, -1, -2) / np.sqrt(q.shape[-1])
    scores = scores - np.max(scores, axis=-1, keepdims=True)
    weights = np.exp(scores)
    weights = weights / np.sum(weights, axis=-1, keepdims=True)
    return weights @ v, weights


@check("examples", "将形状为 (1, 2, 4) 的数组拆分为 2 个头", "每个 token 的 h * d_head 到 (h + 1) * d_head - 1 列属于第 h 个头。头轴位于 token 轴之前。")
def example_split(sub):
    x = np.arange(8.0).reshape(1, 2, 4)
    close(sub.split_heads(x, 2), [[[[0.0, 1.0], [4.0, 5.0]], [[2.0, 3.0], [6.0, 7.0]]]], what="split_heads(x, 2)")


@check("examples", "将两个头合并回来", "merge_heads 是 split_heads 的逆操作，会将各个头的列放回原来的分块位置。")
def example_merge(sub):
    heads = np.array([[[[0.0, 1.0], [4.0, 5.0]], [[2.0, 3.0], [6.0, 7.0]]]])
    close(sub.merge_heads(heads), np.arange(8.0).reshape(1, 2, 4), what="对示例拆分结果调用 merge_heads 的结果")


@check("examples", "使用恒等投影的多头注意力", "投影为恒等矩阵时，Q、K 和 V 都等于 x。每个头在自己的两列上计算 softmax(Q K^T / sqrt(d_head)) V。")
def example_mha(sub):
    eye = np.eye(4)
    output, weights = sub.multi_head_attention(X3, eye, eye, eye, eye, 2)
    close(weights, [[[[0.40111209, 0.19777581, 0.40111209], [0.04538836, 0.76791794, 0.1866937], [0.19777581, 0.40111209, 0.40111209]], [[0.40111209, 0.19777581, 0.40111209], [0.19777581, 0.40111209, 0.40111209], [0.24825508, 0.24825508, 0.50348984]]]], rtol=1e-6, what="注意力权重")
    close(output, [[[0.80222419, 0.79666372, 0.59888791, 0.80222419], [0.23208206, 1.72252957, 0.80222419, 0.59888791], [0.59888791, 1.20333628, 0.75174492, 0.75174492]]], rtol=1e-6, what="输出")


@check("properties", 'merge_heads(split_heads(x)) 会还原 x', "拆分和合并只重新排列数值。无论头数是多少，来回转换都必须精确还原输入。")
def round_trip(sub):
    rng = np.random.default_rng(0)
    x = rng.normal(size=(2, 5, 12))
    for h in [1, 2, 3, 4, 6, 12]:
        heads = sub.split_heads(x, h)
        shape(heads, (2, h, 5, 12 // h), what=f"拆分为 {h} 个头时的 split_heads 结果")
        close(sub.merge_heads(heads), x, rtol=0, atol=0, what=f"拆分为 {h} 个头后再合并的结果")


@check("properties", "第 h 个头使用指定的连续列块", "split_heads(x, H)[:, h] 必须等于 x[:, :, h * d_head:(h + 1) * d_head]。步长式布局可能通过往返检查，但会让每个头取错列。")
def head_columns(sub):
    rng = np.random.default_rng(1)
    x = rng.normal(size=(3, 4, 12))
    heads = np.asarray(sub.split_heads(x, 3))
    shape(heads, (3, 3, 4, 4), what="拆分为 3 个头时的 split_heads 结果")
    for h in range(3):
        close(heads[:, h], x[:, :, h * 4:(h + 1) * 4], rtol=0, atol=0, what=f"第 {h} 个头")


@check("properties", '输出形状及权重行和为 1', "输出形状与 x 相同。权重形状为 (B, H, T, T)，每行是在键轴上的 softmax。")
def mha_shapes(sub):
    rng = np.random.default_rng(2)
    x = rng.normal(size=(2, 5, 8))
    output, weights = sub.multi_head_attention(x, *projections(rng, 8), 4)
    shape(output, (2, 5, 8), what="输出")
    shape(weights, (2, 4, 5, 5), what="注意力权重")
    close(np.sum(weights, axis=-1), np.ones((2, 4, 5)), atol=1e-9, what="各行注意力权重之和")


@check("properties", "每个头独立处理自己的列", "第 h 个头使用 Q、K、V 中 h * d_head 到 (h + 1) * d_head 的列计算注意力，并除以 sqrt(d_head)。")
def heads_independent(sub):
    rng = np.random.default_rng(3)
    x = rng.normal(size=(1, 4, 6))
    w_q, w_k, w_v, w_o = projections(rng, 6)
    _, weights = sub.multi_head_attention(x, w_q, w_k, w_v, w_o, 3)
    q, k, v = x[0] @ w_q, x[0] @ w_k, x[0] @ w_v
    for h in range(3):
        cols = slice(2 * h, 2 * h + 2)
        _, expected = one_head(q[:, cols], k[:, cols], v[:, cols])
        close(np.asarray(weights)[0, h], expected, atol=1e-9, what=f"第 {h} 个头的注意力权重")


@check("properties", '输入不会被修改', '若函数修改 x 或权重矩阵，会破坏调用方的后续逻辑。')
def inputs_unchanged(sub):
    rng = np.random.default_rng(4)
    x = rng.normal(size=(2, 3, 4))
    mats = projections(rng, 4)
    saved = [x.copy()] + [m.copy() for m in mats]
    sub.split_heads(x, 2)
    sub.multi_head_attention(x, *mats, 2)
    for name, before, after in zip(["x", "w_q", "w_k", "w_v", "w_o"], saved, [x] + mats):
        true(np.array_equal(before, after), f"函数修改了 {name}", before, after)


@check("edge", 'D 不能被 n_heads 整除时抛出 ValueError', "每个头都需要相同的列数。D % n_heads 不为 0 时，应抛出 ValueError。")
def not_divisible(sub):
    raises(ValueError, sub.split_heads, np.zeros((1, 2, 6)), 4)


@check("edge", "只有一个头，以及每个头只有一列", "只有 1 个头时，多头注意力等于除以 sqrt(D) 的单头注意力。头数为 D 时，每个头只有一列。")
def extreme_head_counts(sub):
    rng = np.random.default_rng(5)
    x = rng.normal(size=(2, 3, 4))
    w_q, w_k, w_v, w_o = projections(rng, 4)
    output, weights = sub.multi_head_attention(x, w_q, w_k, w_v, w_o, 1)
    expected_out, expected_w = one_head(x @ w_q, x @ w_k, x @ w_v)
    close(np.asarray(weights)[:, 0], expected_w, atol=1e-9, what="只有一个头时的注意力权重")
    close(output, expected_out @ w_o, atol=1e-9, what="只有一个头时的输出")
    heads = sub.split_heads(x, 4)
    shape(heads, (2, 4, 3, 1), what="拆分为 4 个头、每个头只有一列时的 split_heads 结果")
    close(np.asarray(heads)[:, :, :, 0], np.transpose(x, (0, 2, 1)), rtol=0, atol=0, what="每个头只有一列时的拆分结果")


@check("edge", '较大激活值不会溢出', '分数大于 709 时 np.exp 会溢出。调用 np.exp 前减去每行最大值。')
def large_activations(sub):
    x = np.array([[[40.0, -30.0, 25.0, 35.0], [-35.0, 40.0, 30.0, -20.0], [30.0, 30.0, -40.0, 40.0]]])
    eye = np.eye(4)
    output, weights = sub.multi_head_attention(x, eye, eye, eye, eye, 2)
    true(np.all(np.isfinite(np.asarray(output, dtype=float))), "输出包含 NaN 或无穷值", "有限数值", output)
    close(np.sum(weights, axis=-1), np.ones((1, 2, 3)), atol=1e-9, what="各行注意力权重之和")


@fixture("cases")
def cases(ref):
    rng = np.random.default_rng(42)
    for b, t, d, h in [(1, 3, 4, 2), (2, 4, 6, 3), (2, 5, 8, 4), (1, 6, 8, 1), (3, 2, 12, 6)]:
        x = rng.normal(size=(b, t, d))
        mats = projections(rng, d)
        output, weights = ref.multi_head_attention(x, *mats, h)
        yield {"x": x, "w_q": mats[0], "w_k": mats[1], "w_v": mats[2], "w_o": mats[3], "n_heads": h}, {"split": ref.split_heads(x, h), "output": output, "weights": weights}


@check("reference", 'split_heads 与参考实现一致', '随机输入的拆分结果与参考实现一致。')
def reference_split(sub):
    for case, expected in fixtures("cases"):
        close(sub.split_heads(case["x"], case["n_heads"]), expected["split"], rtol=0, atol=0, what=f"x 形状为 {case['x'].shape}、拆分为 {case['n_heads']} 个头时的 split_heads 结果")


@check("reference", "多头注意力与参考实现一致", '5 个随机用例的输出和权重都与参考实现一致。')
def reference_mha(sub):
    for case, expected in fixtures("cases"):
        output, weights = sub.multi_head_attention(case["x"], case["w_q"], case["w_k"], case["w_v"], case["w_o"], case["n_heads"])
        label = f"x 形状为 {case['x'].shape}，头数为 {case['n_heads']}"
        close(weights, expected["weights"], rtol=1e-7, atol=1e-12, what=f"{label}时的注意力权重")
        close(output, expected["output"], rtol=1e-7, atol=1e-12, what=f"{label}时的输出")
