import numpy as np

from practice_check import check, close, fixture, fixtures, shape, true


@check("examples", 'max_len = 3、d_model = 4 时的位置编码表', '第 2i 列保存 sin(pos / base^(2i / d_model))，第 2i+1 列保存相同角度的 cos。')
def example_even(sub):
    close(sub.sinusoidal_pe(3, 4), [[0.0, 1.0, 0.0, 1.0], [0.84147098, 0.54030231, 0.00999983, 0.99995], [0.90929743, -0.41614684, 0.01999867, 0.99980001]], rtol=1e-6, atol=1e-9, what='sinusoidal_pe(3, 4) 的结果')


@check("examples", 'd_model = 5（奇数）', 'd_model 为奇数时，有 d_model // 2 对列。指数仍除以 d_model。最后一列没有配对，保持为 0。')
def example_odd(sub):
    close(sub.sinusoidal_pe(2, 5), [[0.0, 1.0, 0.0, 1.0, 0.0], [0.84147098, 0.54030231, 0.02511622, 0.99968454, 0.0]], rtol=1e-6, atol=1e-9, what='sinusoidal_pe(2, 5) 的结果')


@check("examples", '将位置编码表加到一批 embedding 上', 'add_positional_encoding 会把表中的第 t 行加到第 t 个 token 的向量上。')
def example_add(sub):
    close(sub.add_positional_encoding(np.ones((2, 2))), [[1.0, 2.0], [1.84147098, 1.54030231]], rtol=1e-6, what='将位置编码加到 2×2 的全 1 数组')


@check("properties", '每对 sin 和 cos 的范数为 1', '第 2i 和第 2i+1 列保存相同角度的 sin 和 cos，因此每行中两者平方和为 1。')
def pair_norm(sub):
    pe = np.asarray(sub.sinusoidal_pe(50, 16))
    shape(pe, (50, 16), what='位置编码表')
    close(pe[:, 0::2] ** 2 + pe[:, 1::2] ** 2, np.ones((50, 8)), atol=1e-12, what='每对列的 sin² + cos²')
    true(np.all(np.abs(pe) <= 1.0), "存在超出 [-1, 1] 的数值", "-1 到 1 之间的值", pe)


@check("properties", '位置 0 与第一对列', '位置 0 的角度都为 0，因此 sin 列是 0，cos 列是 1。第 0 对的频率为 1，所以第 0 列是 sin(pos)。')
def position_zero(sub):
    pe = np.asarray(sub.sinusoidal_pe(20, 6))
    close(pe[0], [0.0, 1.0, 0.0, 1.0, 0.0, 1.0], atol=1e-12, what='第 0 行')
    close(pe[:, 0], np.sin(np.arange(20.0)), atol=1e-12, what='第 0 列')


@check("properties", '位置偏移会让每对列旋转', 'sin(a + b) 和 cos(a + b) 可以由 sin(a)、cos(a)、sin(b)、cos(b) 推出。因此，对所有 p 而言，第 p + k 行都是第 p 行旋转固定角度后的结果。')
def shift_is_rotation(sub):
    pe = np.asarray(sub.sinusoidal_pe(40, 8))
    k = 7
    s, c = pe[k, 0::2], pe[k, 1::2]
    sin_p, cos_p = pe[:-k, 0::2], pe[:-k, 1::2]
    close(sin_p * c + cos_p * s, pe[k:, 0::2], atol=1e-10, what='第 p + 7 行的 sin 列')
    close(cos_p * c - sin_p * s, pe[k:, 1::2], atol=1e-10, what='第 p + 7 行的 cos 列')


@check("properties", '长表以前缀形式包含短表', '第 p 行只取决于 p、d_model 和 base。因此 sinusoidal_pe(30, d)[:10] 等于 sinusoidal_pe(10, d)。base 参数会改变频率。')
def prefix_and_base(sub):
    close(np.asarray(sub.sinusoidal_pe(30, 10))[:10], sub.sinusoidal_pe(10, 10), atol=1e-12, what='sinusoidal_pe(30, 10) 的前 10 行')
    pe = np.asarray(sub.sinusoidal_pe(4, 4, base=100.0))
    close(pe[:, 2], np.sin(np.arange(4.0) / 10.0), atol=1e-12, what='base 为 100 时的第 2 列')


@check("properties", '批次轴与输入数组', 'add_positional_encoding 会把同一张表加到批次中的每个样本，返回新数组且不修改 x。')
def add_batch(sub):
    rng = np.random.default_rng(0)
    x = rng.normal(size=(3, 5, 6))
    saved = x.copy()
    out = np.asarray(sub.add_positional_encoding(x))
    true(np.array_equal(x, saved), "add_positional_encoding 修改了 x", saved, x)
    shape(out, (3, 5, 6), what='输出')
    for b in range(3):
        close(out[b] - x[b], sub.sinusoidal_pe(5, 6), atol=1e-12, what=f"加到批次中第 {b} 项的位置编码表")


@check("edge", 'd_model = 1 且 max_len = 1', 'd_model = 1 时没有配对列，因此整张表为 0。max_len = 1 时，表中只有位置 0 对应的一行。')
def tiny(sub):
    close(sub.sinusoidal_pe(4, 1), np.zeros((4, 1)), what='sinusoidal_pe(4, 1) 的结果')
    close(sub.sinusoidal_pe(1, 4), [[0.0, 1.0, 0.0, 1.0]], what='sinusoidal_pe(1, 4) 的结果')


@check("edge", '长表数值仍有限且正确', '位置 4095 处的高频列已经旋转多圈，但 sin 和 cos 仍在 [-1, 1] 内。第 4095 行必须使用位置 4095，而不是 4096。')
def long_table(sub):
    pe = np.asarray(sub.sinusoidal_pe(4096, 8))
    true(np.all(np.isfinite(pe)), "位置编码表含有 NaN 或无穷值", "有限数值", pe)
    close(pe[4095, 0:2], [np.sin(4095.0), np.cos(4095.0)], atol=1e-12, what='第 4095 行的第 0、1 列')


@check("edge", '较大的奇数 d_model', 'd_model = 7 时，最后一对的 i = 2，指数为 4 / 7。最后一列保持为 0。')
def odd_large(sub):
    pe = np.asarray(sub.sinusoidal_pe(6, 7))
    close(pe[:, 6], np.zeros(6), what='最后一列')
    close(pe[:, 4], np.sin(np.arange(6.0) / 10000.0 ** (4 / 7)), atol=1e-12, what='第 4 列')


@fixture("tables")
def tables(ref):
    for max_len, d_model, base in [(6, 4, 10000.0), (9, 8, 10000.0), (5, 7, 10000.0), (8, 6, 100.0), (4, 16, 500000.0)]:
        yield {"max_len": max_len, "d_model": d_model, "base": base}, ref.sinusoidal_pe(max_len, d_model, base)


@fixture("adds")
def adds(ref):
    rng = np.random.default_rng(42)
    for shape_ in [(3, 4), (2, 5, 6), (2, 2, 3, 5)]:
        x = rng.normal(size=shape_)
        yield {"x": x}, ref.add_positional_encoding(x)


@check("reference", 'sinusoidal_pe 与参考实现一致', '对于多个长度、base 参数以及奇数或偶数 d_model，生成的位置编码表都与参考实现一致。')
def reference_tables(sub):
    for case, expected in fixtures("tables"):
        close(sub.sinusoidal_pe(case["max_len"], case["d_model"], case["base"]), expected, rtol=1e-9, atol=1e-12, what=f"sinusoidal_pe({case['max_len']}, {case['d_model']}, base={case['base']})")


@check("reference", 'add_positional_encoding 与参考实现一致', '在随机批次中，求和结果与参考实现一致。')
def reference_adds(sub):
    for case, expected in fixtures("adds"):
        close(sub.add_positional_encoding(case["x"]), expected, rtol=1e-9, atol=1e-12, what=f"x 形状为 {case['x'].shape} 时的 add_positional_encoding 输出")
