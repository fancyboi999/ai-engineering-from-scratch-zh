import numpy as np

from practice_check import check, close, fixture, fixtures, shape, true

B5 = np.array([0.1, 0.2, 0.3, 0.4, 0.5])
AB5 = np.array([0.9, 0.72, 0.504, 0.3024, 0.1512])
X0 = np.array([1.0, -2.0])
EPS = np.array([0.5, 0.5])
XT = np.array([1.06206591, -1.06772281])


def ref_schedule(T):
    betas = 1e-4 + (0.02 - 1e-4) * np.arange(T) / (T - 1)
    return betas, np.cumprod(1.0 - betas)


@check("examples", "包含 5 步、beta 从 0.1 递增到 0.5 的调度", "beta 从 t = 0 时的 beta_start 到 t = T - 1 时的 beta_end 等距递增。alpha 为 1 - beta，alpha_bar 是 alpha 的累积乘积。")
def example_schedule(sub):
    betas, alphas, alpha_bars = sub.make_schedule(5, 0.1, 0.5)
    close(betas, B5, rtol=1e-12, what="beta 调度")
    close(alphas, 1.0 - B5, rtol=1e-12, what="alpha 调度")
    close(alpha_bars, AB5, rtol=1e-12, what="alpha_bar 调度")


@check("examples", "在 t = 2 时按闭式公式采样", "x_t 等于 sqrt(alpha_bar_t) 乘 x0，再加上 sqrt(1 - alpha_bar_t) 乘噪声。")
def example_q_sample(sub):
    close(sub.q_sample(X0, 2, AB5, EPS), XT, rtol=1e-7, what="x_t")


@check("examples", "t = 2 时的后验均值和方差", "后验均值用论文给出的两个系数组合 x0 和 x_t。方差等于 beta_t 乘以 (1 - alpha_bar_{t-1}) / (1 - alpha_bar_t)。")
def example_posterior(sub):
    mean, variance = sub.posterior_mean_variance(X0, XT, 2, B5, AB5)
    close(mean, [1.01484497, -1.53073944], rtol=1e-7, what="后验均值")
    close(variance, 0.1693548387096774, rtol=1e-9, what="后验方差")


@check("properties", "默认的 1000 步调度", "使用默认值时，beta 从 1e-4 开始，在 0.02 结束。alpha_bar 从 0.9999 逐步下降并始终大于 0。")
def default_schedule(sub):
    betas, alphas, alpha_bars = sub.make_schedule(1000)
    shape(betas, (1000,), what="beta 调度")
    exp_b, exp_ab = ref_schedule(1000)
    close(betas, exp_b, rtol=1e-12, what="beta 调度")
    close(alpha_bars, exp_ab, rtol=1e-10, what="alpha_bar 调度")
    ab = np.asarray(alpha_bars)
    true(np.all(np.diff(ab) < 0) and ab[-1] > 0, "alpha_bar 每步都必须下降且始终大于 0", "严格递减且大于 0 的序列", ab)


@check("properties", "信号和噪声系数的平方和为 1", "两个系数分别是 sqrt(alpha_bar) 和 sqrt(1 - alpha_bar)，平方和为 1。因此，单位方差数据在每个时间步仍保持单位方差。")
def variance_preserving(sub):
    _, _, alpha_bars = sub.make_schedule(50)
    for t in [0, 10, 49]:
        signal = sub.q_sample(np.array([1.0]), t, alpha_bars, np.array([0.0]))
        noise = sub.q_sample(np.array([0.0]), t, alpha_bars, np.array([1.0]))
        close(np.asarray(signal) ** 2 + np.asarray(noise) ** 2, [1.0], rtol=1e-12, what=f"t = {t} 时系数的平方和")


@check("properties", "后验均值与论文中的噪声形式一致", "当 x_t 由 x0 和噪声 eps 生成时，后验均值为 (x_t - beta_t / sqrt(1 - alpha_bar_t) 乘 eps) / sqrt(alpha_t)。课程采样器使用的就是这个形式。")
def eps_form(sub):
    rng = np.random.default_rng(0)
    betas, _ = ref_schedule(40)
    _, _, alpha_bars = sub.make_schedule(40)
    alpha_bars = np.asarray(alpha_bars)
    x0 = rng.normal(size=(3, 4))
    for t in [1, 7, 39]:
        eps = rng.normal(size=(3, 4))
        x_t = sub.q_sample(x0, t, alpha_bars, eps)
        mean, _ = sub.posterior_mean_variance(x0, x_t, t, betas, alpha_bars)
        expected = (np.asarray(x_t) - betas[t] / np.sqrt(1.0 - alpha_bars[t]) * eps) / np.sqrt(1.0 - betas[t])
        close(mean, expected, rtol=1e-9, atol=1e-12, what=f"t = {t} 时的后验均值")


@check("properties", "批量时间步与逐样本计算一致", "当 t 是形状为 (B,) 的数组时，x0 的第 b 行使用时间步 t[b]。将系数重塑为 (B, 1, ...)，使其能沿其他轴广播。")
def batched_t(sub):
    rng = np.random.default_rng(1)
    betas, alpha_bars = ref_schedule(20)
    x0 = rng.normal(size=(4, 3, 2))
    eps = rng.normal(size=(4, 3, 2))
    t = np.array([0, 5, 19, 5])
    x_t = sub.q_sample(x0, t, alpha_bars, eps)
    shape(x_t, (4, 3, 2), what="批量计算的 x_t")
    mean, variance = sub.posterior_mean_variance(x0, x_t, t, betas, alpha_bars)
    shape(mean, (4, 3, 2), what="批量计算的后验均值")
    for b in range(4):
        one = sub.q_sample(x0[b], int(t[b]), alpha_bars, eps[b])
        close(np.asarray(x_t)[b], one, atol=1e-12, what=f"第 {b} 个样本的 x_t")
        one_mean, one_var = sub.posterior_mean_variance(x0[b], one, int(t[b]), betas, alpha_bars)
        close(np.asarray(mean)[b], one_mean, atol=1e-12, what=f"第 {b} 个样本的后验均值")
        close(np.asarray(variance).reshape(-1)[b], one_var, atol=1e-15, what=f"第 {b} 个样本的后验方差")


@check("properties", "输入保持不变", "函数不得修改 x0、x_t、噪声数组或调度数组。")
def inputs_unchanged(sub):
    rng = np.random.default_rng(2)
    betas, alpha_bars = ref_schedule(10)
    x0 = rng.normal(size=(3,))
    eps = rng.normal(size=(3,))
    saved = [x0.copy(), eps.copy(), betas.copy(), alpha_bars.copy()]
    x_t = sub.q_sample(x0, 4, alpha_bars, eps)
    sub.posterior_mean_variance(x0, np.asarray(x_t), 4, betas, alpha_bars)
    for name, before, after in zip(["x0", "noise", "betas", "alpha_bars"], saved, [x0, eps, betas, alpha_bars]):
        true(np.array_equal(before, after), f"函数修改了 {name}", before, after)


@check("edge", "t = 0 时后验均值为 x0，方差为 0", "第 0 步之前没有噪声，因此 alpha_bar_{-1} = 1。后验均值恰好等于 x0，方差为 0。不要读取 alpha_bars[-1]，它表示最后一个时间步。")
def t_zero(sub):
    mean, variance = sub.posterior_mean_variance(X0, XT, 0, B5, AB5)
    close(mean, X0, rtol=1e-12, atol=1e-12, what="t = 0 时的后验均值")
    close(variance, 0.0, atol=1e-15, what="t = 0 时的后验方差")


@check("edge", "最后一步几乎全是噪声", "默认的 1000 步调度在 t = T - 1 时，alpha_bar 约为 4e-5，因此 x_t 已很接近噪声。")
def last_step(sub):
    _, _, alpha_bars = sub.make_schedule(1000)
    close(np.asarray(alpha_bars)[-1], 4.0358297653756754e-05, rtol=1e-8, what="最后一步的 alpha_bar")
    x_t = sub.q_sample(np.array([3.0]), 999, alpha_bars, np.array([-1.0]))
    close(x_t, [-0.98092137], rtol=1e-7, what="最后一步的 x_t")


@check("edge", "两步调度", "T = 2 时，两个 beta 值恰好分别为 beta_start 和 beta_end。")
def two_steps(sub):
    betas, alphas, alpha_bars = sub.make_schedule(2, 0.1, 0.5)
    close(betas, [0.1, 0.5], rtol=1e-12, what="beta 调度")
    close(alpha_bars, [0.9, 0.45], rtol=1e-12, what="alpha_bar 调度")


@fixture("cases")
def cases(ref):
    rng = np.random.default_rng(42)
    for T, shape_, t in [(10, (4,), 3), (50, (2, 3), 0), (50, (2, 3), 49), (100, (5, 2), np.array([0, 10, 50, 99, 1]))]:
        betas, _, alpha_bars = ref.make_schedule(T)
        x0 = rng.normal(size=shape_)
        eps = rng.normal(size=shape_)
        x_t = ref.q_sample(x0, t, alpha_bars, eps)
        mean, variance = ref.posterior_mean_variance(x0, x_t, t, betas, alpha_bars)
        yield {"T": T, "x0": x0, "noise": eps, "t": t}, {"betas": betas, "alpha_bars": alpha_bars, "x_t": x_t, "mean": mean, "variance": np.asarray(variance)}


@check("reference", "调度、采样和后验在 4 个用例上与参考实现一致", "调度、x_t、后验均值和方差都与参考实现一致。")
def reference_cases(sub):
    for case, expected in fixtures("cases"):
        label = f"T = {case['T']}，t = {case['t']}"
        betas, _, alpha_bars = sub.make_schedule(case["T"])
        close(betas, expected["betas"], rtol=1e-12, what=f"{label} 时的 beta 调度")
        close(alpha_bars, expected["alpha_bars"], rtol=1e-10, what=f"{label} 时的 alpha_bar 调度")
        x_t = sub.q_sample(case["x0"], case["t"], expected["alpha_bars"], case["noise"])
        close(x_t, expected["x_t"], rtol=1e-10, atol=1e-12, what=f"{label} 时的 x_t")
        mean, variance = sub.posterior_mean_variance(case["x0"], expected["x_t"], case["t"], expected["betas"], expected["alpha_bars"])
        close(mean, expected["mean"], rtol=1e-10, atol=1e-12, what=f"{label} 时的后验均值")
        close(variance, expected["variance"], rtol=1e-10, atol=1e-15, what=f"{label} 时的后验方差")
