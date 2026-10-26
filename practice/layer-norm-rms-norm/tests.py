import numpy as np

from practice_check import check, close, fixture, fixtures, shape, true

X = np.array([[1.0, 2.0, 3.0, 4.0], [2.0, -2.0, 0.0, 4.0]])
GAMMA = np.array([1.0, 1.0, 2.0, 0.5])
BETA = np.array([0.0, 0.5, 0.0, -1.0])


@check("examples", '2×4 批次的 LayerNorm', '每行减去自身均值，再除以 sqrt(var + eps)。随后每个特征乘 gamma 并加 beta。')
def example_layer_norm(sub):
    close(sub.layer_norm(X, GAMMA, BETA), [[-1.34163542, 0.05278819, 0.89442361, -0.32918229], [0.44721315, -0.84163944, -0.8944263, -0.32918028]], rtol=1e-6, what="LayerNorm 的输出")


@check("examples", '同一批次的 RMSNorm', '每行除以 sqrt(mean(x^2) + eps)，不减均值。随后每个特征乘 weight。')
def example_rms_norm(sub):
    close(sub.rms_norm(X, GAMMA), [[0.36514835, 0.73029669, 2.19089008, 0.73029669], [0.81649651, -0.81649651, 0.0, 0.81649651]], rtol=1e-6, atol=1e-12, what="RMSNorm 的输出")


@check("properties", 'LayerNorm 各行均值为 0，方差接近 1', 'gamma = 1、beta = 0 时，每行输出均值为 0，方差为 var / (var + eps)。')
def layer_norm_stats(sub):
    rng = np.random.default_rng(1)
    x = rng.normal(size=(7, 12)) * 3 + 2
    out = sub.layer_norm(x, np.ones(12), np.zeros(12))
    shape(out, x.shape, what="LayerNorm 的输出")
    close(np.mean(out, axis=-1), np.zeros(7), atol=1e-12, what="各行的均值")
    var = np.var(x, axis=-1)
    close(np.var(out, axis=-1), var / (var + 1e-5), rtol=1e-9, what="各行的方差")


@check("properties", 'RMSNorm 各行均方根接近 1', 'weight = 1 时，每行输出满足 mean(out^2) = ms / (ms + eps)，其中 ms 为输入行的 mean(x^2)。')
def rms_norm_stats(sub):
    rng = np.random.default_rng(2)
    x = rng.normal(size=(6, 10)) + 1.5
    out = sub.rms_norm(x, np.ones(10))
    shape(out, x.shape, what="RMSNorm 的输出")
    ms = np.mean(x * x, axis=-1)
    close(np.mean(out * out, axis=-1), ms / (ms + 1e-6), rtol=1e-9, what="每个输出行的均方值")


@check("properties", '两种归一化只沿最后一个轴计算', '每行独立归一化。其他行变化不会影响当前行输出。')
def row_independence(sub):
    rng = np.random.default_rng(3)
    x = rng.normal(size=(5, 6))
    gamma, beta = rng.normal(size=6), rng.normal(size=6)
    y = x.copy()
    y[1:] = rng.normal(size=(4, 6)) * 10
    close(sub.layer_norm(y, gamma, beta)[0], sub.layer_norm(x, gamma, beta)[0], rtol=1e-12, what="第 0 行的 LayerNorm 结果")
    close(sub.rms_norm(y, gamma)[0], sub.rms_norm(x, gamma)[0], rtol=1e-12, what="第 0 行的 RMSNorm 结果")


@check("properties", 'LayerNorm 忽略行平移，RMSNorm 忽略行缩放', 'LayerNorm 会减去均值，因此给一行加常数不改变结果。两种归一化都会除以行的尺度，因此乘以正数几乎不改变结果。')
def invariances(sub):
    rng = np.random.default_rng(4)
    x = rng.normal(size=(4, 8)) * 2
    gamma, beta = rng.normal(size=8), rng.normal(size=8)
    close(sub.layer_norm(x + 5.0, gamma, beta), sub.layer_norm(x, gamma, beta), atol=1e-9, what="x + 5 的 LayerNorm 结果")
    close(sub.rms_norm(x * 10.0, gamma), sub.rms_norm(x, gamma), atol=1e-5, what="10 x 的 RMSNorm 结果")


@check("properties", '支持任意数量的前置轴', 'Transformer 输入形状为 (batch, seq, d_model)。归一化沿最后一个轴执行，输出形状与输入相同。')
def leading_axes(sub):
    rng = np.random.default_rng(5)
    x = rng.normal(size=(2, 3, 4))
    gamma, beta = rng.normal(size=4), rng.normal(size=4)
    out = sub.layer_norm(x, gamma, beta)
    shape(out, (2, 3, 4), what="LayerNorm 的输出")
    close(out.reshape(6, 4), sub.layer_norm(x.reshape(6, 4), gamma, beta), rtol=1e-12, what="三维输入的 LayerNorm 结果")
    out = sub.rms_norm(x, gamma)
    shape(out, (2, 3, 4), what="RMSNorm 的输出")
    close(out.reshape(6, 4), sub.rms_norm(x.reshape(6, 4), gamma), rtol=1e-12, what="三维输入的 RMSNorm 结果")


@check("properties", '输入不会被修改', '如果函数修改输入数组，会破坏调用方的后续逻辑。')
def inputs_unchanged(sub):
    x, gamma, beta = X.copy(), GAMMA.copy(), BETA.copy()
    sub.layer_norm(x, gamma, beta)
    sub.rms_norm(x, gamma)
    for name, after, before in (("x", x, X), ("gamma", gamma, GAMMA), ("beta", beta, BETA)):
        close(after, before, atol=0, rtol=0, what=f"调用后的 {name}")


@check("edge", '常量行和零行', '常量行经过 LayerNorm 后得到 beta。全零行经过 RMSNorm 后仍为零。两者都不应产生 NaN。')
def degenerate_rows(sub):
    gamma, beta = np.array([2.0, 3.0, 4.0]), np.array([0.1, 0.2, 0.3])
    out = sub.layer_norm(np.array([[5.0, 5.0, 5.0]]), gamma, beta)
    close(out, [[0.1, 0.2, 0.3]], atol=1e-12, what="常量行的 LayerNorm 结果")
    out = sub.rms_norm(np.zeros((1, 3)), gamma)
    close(out, [[0.0, 0.0, 0.0]], atol=0, what="全零行的 RMSNorm 结果")


@check("edge", '小数值情况下 eps 位于平方根内', '分母分别是 sqrt(var + eps) 和 sqrt(mean(x^2) + eps)。数值接近 sqrt(eps) 时，sqrt(var) + eps 会产生明显不同的结果。')
def small_values(sub):
    x = np.array([[0.001, -0.002, 0.003, 0.0]])
    ones, zeros = np.ones(4), np.zeros(4)
    mean = np.mean(x, axis=-1, keepdims=True)
    var = np.mean((x - mean) ** 2, axis=-1, keepdims=True)
    close(sub.layer_norm(x, ones, zeros), (x - mean) / np.sqrt(var + 1e-5), rtol=1e-9, what="小数值输入的 LayerNorm 结果")
    ms = np.mean(x * x, axis=-1, keepdims=True)
    close(sub.rms_norm(x, ones), x / np.sqrt(ms + 1e-6), rtol=1e-9, what="小数值输入的 RMSNorm 结果")


@check("edge", '自定义 eps', 'eps 参数会改变分母。应使用调用方传入的 eps。')
def custom_eps(sub):
    x = np.array([[0.0, 1.0]])
    close(sub.layer_norm(x, np.ones(2), np.zeros(2), eps=0.75), [[-0.5, 0.5]], rtol=1e-12, what="eps = 0.75 时的 LayerNorm 结果")
    close(sub.rms_norm(x, np.ones(2), eps=1.5), [[0.0, 0.70710678]], rtol=1e-6, what="eps = 1.5 时的 RMSNorm 结果")


@check("edge", '单个特征', 'D = 1 时，行减去自身均值后为 0，因此 LayerNorm 返回 beta。RMSNorm 返回 x / sqrt(x^2 + eps)，接近 x 的符号。')
def one_feature(sub):
    x = np.array([[3.0], [-2.0]])
    close(sub.layer_norm(x, np.array([5.0]), np.array([0.25])), [[0.25], [0.25]], atol=1e-12, what="只有一个特征时的 LayerNorm 结果")
    close(sub.rms_norm(x, np.array([1.0])), [[1.0], [-1.0]], atol=1e-6, what="只有一个特征时的 RMSNorm 结果")


@fixture("batches")
def batches(ref):
    rng = np.random.default_rng(42)
    for shape_, scale in [((1, 3), 1.0), ((4, 8), 5.0), ((2, 3, 6), 0.5), ((6, 16), 20.0)]:
        x = rng.normal(size=shape_) * scale + rng.normal()
        d = shape_[-1]
        gamma, beta = rng.normal(size=d), rng.normal(size=d)
        yield {"x": x, "gamma": gamma, "beta": beta}, {"layer": ref.layer_norm(x, gamma, beta), "rms": ref.rms_norm(x, gamma)}


@check("reference", 'LayerNorm 与参考实现一致', '四种形状和尺度的随机输入上，LayerNorm 结果都与参考实现一致。')
def reference_layer(sub):
    for case, expected in fixtures("batches"):
        close(sub.layer_norm(case["x"], case["gamma"], case["beta"]), expected["layer"], rtol=1e-7, atol=1e-12, what=f"x 形状为 {case['x'].shape} 时的 LayerNorm 结果")


@check("reference", 'RMSNorm 与参考实现一致', '相同输入下，RMSNorm 结果与参考实现一致。')
def reference_rms(sub):
    for case, expected in fixtures("batches"):
        close(sub.rms_norm(case["x"], case["gamma"]), expected["rms"], rtol=1e-7, atol=1e-12, what=f"x 形状为 {case['x'].shape} 时的 RMSNorm 结果")
