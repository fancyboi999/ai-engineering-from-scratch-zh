import numpy as np

from practice_check import check, close, fixture, fixtures, shape, true

BASIS = np.array([[1.0, 0.0, 1.0, 0.0], [1.0, 0.0, 1.0, 0.0], [1.0, 0.0, 1.0, 0.0]])
Q1 = np.array([[1.0, 2.0, 3.0, 4.0]])
K1 = np.array([[0.5, -1.0, 2.0, 1.0]])


def rotated_dot(sub, q, k, m, n, base=10000.0):
    qm = np.asarray(sub.apply_rope(q[None, :], np.array([m]), base))[0]
    kn = np.asarray(sub.apply_rope(k[None, :], np.array([n]), base))[0]
    return float(qm @ kn)


@check("examples", 'd = 8 时的频率', 'theta_i = base 的 -2i / d 次幂，i 从 0 到 d // 2 - 1。')
def example_frequencies(sub):
    close(sub.rope_frequencies(8), [1.0, 0.1, 0.01, 0.001], rtol=1e-9, what="rope_frequencies(8)")


@check("examples", '在位置 0、1、2 旋转向量 [1, 0, 1, 0]', '第 (2i, 2i+1) 对按 pos * theta_i 旋转。第一项变为 a cos(angle) - b sin(angle)，第二项变为 a sin(angle) + b cos(angle)。')
def example_basis(sub):
    out = sub.apply_rope(BASIS, np.arange(3))
    close(out, [[1.0, 0.0, 1.0, 0.0], [0.54030231, 0.84147098, 0.99995, 0.00999983], [-0.41614684, 0.90929743, 0.99980001, 0.01999867]], rtol=1e-6, atol=1e-9, what="旋转后的向量")


@check("examples", '分数只取决于位置差', '位置 2 的 q 与位置 5 的 k 相差 3。位置 10 的 q 和位置 13 的 k 也相差 3，因此两组点积相同。')
def example_gap(sub):
    first = rotated_dot(sub, Q1[0], K1[0], 2, 5)
    second = rotated_dot(sub, Q1[0], K1[0], 10, 13)
    close(first, 11.912706599522757, rtol=1e-8, what="位置 2 和位置 5 对应的点积")
    close(second, 11.912706599522759, rtol=1e-8, what="位置 10 和位置 13 对应的点积")


@check("properties", '旋转会保持每对坐标的范数', '旋转不会改变长度。每对 (2i, 2i+1) 范数不变，因此整个向量的范数也不变。')
def norm_preserved(sub):
    rng = np.random.default_rng(0)
    x = rng.normal(size=(2, 7, 12))
    out = np.asarray(sub.apply_rope(x, np.arange(7) * 3))
    shape(out, x.shape, what="输出")
    pairs_in = np.sqrt(x[..., 0::2] ** 2 + x[..., 1::2] ** 2)
    pairs_out = np.sqrt(out[..., 0::2] ** 2 + out[..., 1::2] ** 2)
    close(pairs_out, pairs_in, atol=1e-10, what="每对坐标 (2i, 2i+1) 的范数")


@check("properties", 'q 与 k 的点积只取决于位置差', 'q 旋转 m theta、k 旋转 n theta 后，每对坐标都会留下 cos((m - n) theta) 项。两个位置同时平移相同距离，分数不变。')
def relative_property(sub):
    rng = np.random.default_rng(1)
    q = rng.normal(size=16)
    k = rng.normal(size=16)
    for m, n in [(0, 4), (3, 1), (7, 7)]:
        base_score = rotated_dot(sub, q, k, m, n)
        for offset in [5, 100, 1000]:
            close(rotated_dot(sub, q, k, m + offset, n + offset), base_score, rtol=1e-8, atol=1e-9, what=f"位置 {m + offset} 和位置 {n + offset} 对应的分数")


@check("properties", '位置 0 不改变向量，连续旋转角度相加', '位置 0 的角度均为 0。先按位置 m 旋转，再按位置 n 旋转，等同于按位置 m + n 旋转。')
def identity_and_composition(sub):
    rng = np.random.default_rng(2)
    x = rng.normal(size=(4, 6))
    close(sub.apply_rope(x, np.zeros(4)), x, atol=1e-12, what="位置 0 对应的输出")
    m = np.array([1, 2, 5, 9])
    n = np.array([3, 0, 4, 11])
    twice = sub.apply_rope(sub.apply_rope(x, m), n)
    close(twice, sub.apply_rope(x, m + n), atol=1e-10, what="先按位置 m、再按位置 n 旋转与一次按位置 m + n 旋转的比较")


@check("properties", '前置轴是批次轴', '位置对应倒数第二个轴。每个批次项和每个 attention head 都应用相同旋转。')
def batch_axes(sub):
    rng = np.random.default_rng(3)
    x = rng.normal(size=(2, 3, 5, 8))
    pos = np.array([0, 2, 4, 6, 8])
    out = np.asarray(sub.apply_rope(x, pos))
    shape(out, x.shape, what="批次输出")
    for b in range(2):
        for h in range(3):
            close(out[b, h], sub.apply_rope(x[b, h], pos), atol=1e-12, what=f"批次中的第 {b} 项、第 {h} 个注意力头")


@check("properties", 'base 会改变旋转频率', 'theta_i = base 的 -2i / d 次幂。请使用 base 参数，而非固定使用 10000。')
def base_argument(sub):
    close(sub.rope_frequencies(4, base=100.0), [1.0, 0.1], rtol=1e-9, what="rope_frequencies(4, base=100)")
    x = np.array([[0.0, 0.0, 1.0, 0.0]])
    close(sub.apply_rope(x, np.array([3]), base=100.0), [[0.0, 0.0, np.cos(0.3), np.sin(0.3)]], atol=1e-12, what="base=100 时的 apply_rope 输出")


@check("properties", '输入数组不会被修改', 'apply_rope 必须返回新数组。若写入 x，就会修改调用方的 query 或 key。')
def input_unchanged(sub):
    rng = np.random.default_rng(4)
    x = rng.normal(size=(3, 4))
    saved = x.copy()
    sub.apply_rope(x, np.arange(3))
    true(np.array_equal(x, saved), "apply_rope 修改了 x", saved, x)


@check("edge", 'd 为奇数时最后一个元素不变', 'd 为奇数时共有 d // 2 对。最后一个元素没有配对项，因此保持不变。')
def odd_dimension(sub):
    out = sub.apply_rope(np.array([[1.0, 2.0, 3.0]]), np.array([1]))
    close(out, [[-1.14263966, 1.9220756, 3.0]], rtol=1e-7, what="在位置 1 对三维向量应用 apply_rope 的结果")
    close(sub.rope_frequencies(5), [1.0, 10000.0 ** -0.4], rtol=1e-9, what="rope_frequencies(5)")


@check("edge", '位置值很大时结果仍有限', '位置 100000 对应的角度很大，但 cos 和 sin 仍在 [-1, 1] 内。输出有限且范数保持不变。')
def large_positions(sub):
    rng = np.random.default_rng(5)
    x = rng.normal(size=(2, 8))
    out = np.asarray(sub.apply_rope(x, np.array([100000, 250000])))
    true(np.all(np.isfinite(out)), "输出含有 NaN 或无穷值", "有限数值", out)
    close(np.linalg.norm(out, axis=-1), np.linalg.norm(x, axis=-1), rtol=1e-10, what="每个向量的范数")


@check("edge", '一对坐标和一个 token', 'd = 2 时只有一对坐标，theta_0 = 1。位置 p 上的向量 [1, 0] 会变成 [cos p, sin p]。')
def one_pair(sub):
    out = sub.apply_rope(np.array([[1.0, 0.0]]), np.array([2]))
    close(out, [[np.cos(2.0), np.sin(2.0)]], atol=1e-12, what="apply_rope([[1, 0]], [2])")


@fixture("cases")
def cases(ref):
    rng = np.random.default_rng(42)
    for lead, t, d, base in [((), 3, 4, 10000.0), ((2,), 5, 8, 10000.0), ((2, 2), 4, 6, 500.0), ((), 6, 7, 10000.0), ((3,), 2, 16, 1000000.0)]:
        x = rng.normal(size=lead + (t, d))
        positions = np.sort(rng.integers(0, 4096, size=t))
        yield {"x": x, "positions": positions, "base": base}, ref.apply_rope(x, positions, base)
    for d, base in [(2, 10000.0), (6, 10000.0), (9, 10000.0), (8, 50.0)]:
        yield {"d": d, "base": base}, ref.rope_frequencies(d, base)


@check("reference", '5 个随机用例的 apply_rope 与参考实现一致', '对于批次输入、多种 base 和奇数 d，旋转结果都与参考实现一致。')
def reference_rope(sub):
    for case, expected in fixtures("cases"):
        if "x" not in case:
            continue
        out = sub.apply_rope(case["x"], case["positions"], case["base"])
        close(out, expected, rtol=1e-8, atol=1e-10, what=f"x 形状为 {case['x'].shape}、base 为 {case['base']} 时的 apply_rope 输出")


@check("reference", 'rope_frequencies 与参考实现一致', '多种维度和 base 对应的频率都与参考实现一致。')
def reference_frequencies(sub):
    for case, expected in fixtures("cases"):
        if "d" not in case:
            continue
        close(sub.rope_frequencies(case["d"], case["base"]), expected, rtol=1e-9, what=f"rope_frequencies({case['d']}, base={case['base']})")
