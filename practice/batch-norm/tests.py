import numpy as np

from practice_check import check, close, fixture, fixtures, numeric_grad, shape, true

X = np.array([[1.0, 2.0], [3.0, 6.0], [5.0, 10.0]])
GAMMA = np.array([1.0, 0.5])
BETA = np.array([0.0, 1.0])
GRAD = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])


def train(sub, x, gamma, beta, momentum=0.1, eps=1e-5):
    d = x.shape[1]
    return sub.batchnorm_forward(x, gamma, beta, np.zeros(d), np.ones(d), momentum=momentum, eps=eps, training=True)


@check("examples", '三条样本的训练前向传播', '每个特征列使用该列均值和有偏方差归一化，再用 gamma 缩放、用 beta 平移。')
def example_forward(sub):
    out, _, _, _ = train(sub, X, GAMMA, BETA)
    close(out, [[-1.22474258, 0.38762785], [0.0, 1.0], [1.22474258, 1.61237215]], rtol=1e-6, what='输出')


@check("examples", '更新一步后的运行统计量', '新的运行值等于 (1 - momentum) 乘旧值，再加 momentum 乘当前批次统计量。')
def example_running(sub):
    _, _, new_mean, new_var = train(sub, X, GAMMA, BETA)
    close(new_mean, [0.3, 0.6], rtol=1e-6, what='新的运行均值')
    close(new_var, [1.16666667, 1.96666667], rtol=1e-6, what='新的运行方差')


@check("examples", '三条样本的反向传播', 'dbeta 是上游梯度按列求和。dgamma 是上游梯度乘 x_hat 后按列求和。')
def example_backward(sub):
    _, cache, _, _ = train(sub, X, GAMMA, BETA)
    dx, dgamma, dbeta = sub.batchnorm_backward(GRAD, cache)
    close(dx, [[0.20412376, -0.02551558], [-0.40824753, 0.05103101], [0.20412376, -0.02551543]], rtol=1e-6, atol=1e-9, what="dx")
    close(dgamma, [0.0, 1.2247443], rtol=1e-6, atol=1e-9, what="dgamma")
    close(dbeta, [2.0, 2.0], rtol=1e-6, what="dbeta")


@check("examples", '推理前向传播使用运行统计量', '推理模式下，层使用运行均值和方差，不使用当前批次的统计量。')
def example_inference(sub):
    out, _, mean, var = sub.batchnorm_forward(np.array([[2.0, 4.0]]), GAMMA, BETA, np.array([0.3, 0.6]), np.array([1.16666667, 1.96666667]), training=False)
    close(out, [[1.57388742, 2.21222277]], rtol=1e-6, what='推理输出')
    close(mean, [0.3, 0.6], rtol=0, atol=0, what='推理模式返回的运行均值')
    close(var, [1.16666667, 1.96666667], rtol=0, atol=0, what='推理模式返回的运行方差')


@check("properties", '训练输出各列的均值为 beta', 'x_hat 的各列均值为 0。缩放并平移后，每列均值为 beta。')
def column_mean(sub):
    rng = np.random.default_rng(1)
    x = rng.normal(size=(16, 5)) * 4 + 3
    gamma = rng.normal(size=5)
    beta = rng.normal(size=5)
    out, _, _, _ = train(sub, x, gamma, beta)
    shape(out, x.shape, what='输出')
    close(np.mean(out, axis=0), beta, atol=1e-9, what='输出的列均值')


@check("properties", 'x_hat 的方差接近 1', 'gamma = 1 且 beta = 0 时，输出每列的方差是 var / (var + eps)，接近 1。')
def column_variance(sub):
    rng = np.random.default_rng(2)
    x = rng.normal(size=(32, 4)) * 2
    out, _, _, _ = train(sub, x, np.ones(4), np.zeros(4))
    var = np.var(x, axis=0)
    close(np.var(out, axis=0), var / (var + 1e-5), rtol=1e-9, what='输出的列方差')


@check("properties", '所有梯度都符合有限差分', '这里的损失是固定 G 下的 sum(out * G)。正确的 dx 还要包括 x 对批次均值和方差的影响。')
def finite_differences(sub):
    rng = np.random.default_rng(3)
    x = rng.normal(size=(5, 3))
    gamma = rng.normal(size=3)
    beta = rng.normal(size=3)
    upstream = rng.normal(size=(5, 3))
    _, cache, _, _ = train(sub, x, gamma, beta)
    dx, dgamma, dbeta = sub.batchnorm_backward(upstream, cache)
    def loss(x_, g_, b_):
        return float(np.sum(train(sub, x_, g_, b_)[0] * upstream))
    close(dx, numeric_grad(lambda v: loss(v, gamma, beta), x), atol=1e-6, rtol=1e-4, what="dx")
    close(dgamma, numeric_grad(lambda v: loss(x, v, beta), gamma), atol=1e-6, rtol=1e-4, what="dgamma")
    close(dbeta, numeric_grad(lambda v: loss(x, gamma, v), beta), atol=1e-6, rtol=1e-4, what="dbeta")


@check("properties", 'dx 的每列之和为 0', '给 x 的某列加常数不会改变输出，因此该方向上的梯度为 0。')
def dx_sums_to_zero(sub):
    rng = np.random.default_rng(4)
    x = rng.normal(size=(8, 3))
    _, cache, _, _ = train(sub, x, rng.normal(size=3), rng.normal(size=3))
    dx, _, _ = sub.batchnorm_backward(rng.normal(size=(8, 3)), cache)
    close(np.sum(dx, axis=0), np.zeros(3), atol=1e-12, what='dx 的列和')


@check("properties", '输入不会被修改', '返回新的运行统计量，不要修改调用方传入的 x、gamma、beta 或运行数组。')
def inputs_unchanged(sub):
    rng = np.random.default_rng(5)
    x = rng.normal(size=(4, 3))
    gamma, beta = rng.normal(size=3), rng.normal(size=3)
    running_mean, running_var = rng.normal(size=3), rng.random(size=3) + 0.5
    upstream = rng.normal(size=(4, 3))
    saved = [a.copy() for a in (x, gamma, beta, running_mean, running_var, upstream)]
    _, cache, _, _ = sub.batchnorm_forward(x, gamma, beta, running_mean, running_var, training=True)
    sub.batchnorm_backward(upstream, cache)
    sub.batchnorm_forward(x, gamma, beta, running_mean, running_var, training=False)
    for name, before, after in zip(("x", "gamma", "beta", "running_mean", "running_var", "grad_output"), saved, (x, gamma, beta, running_mean, running_var, upstream)):
        close(after, before, atol=0, rtol=0, what=f"调用后的 {name}")


@check("edge", '小方差时 eps 位于平方根内', '分母是 sqrt(var + eps)。方差接近 eps 时，sqrt(var) + eps 会产生明显不同的结果。')
def small_variance(sub):
    x = np.array([[0.0, 1.0], [0.002, 1.0], [0.004, 1.0005]])
    out, _, _, _ = train(sub, x, np.ones(2), np.zeros(2))
    var = np.var(x, axis=0)
    expected = (x - np.mean(x, axis=0)) / np.sqrt(var + 1e-5)
    close(out, expected, rtol=1e-9, atol=1e-12, what='低方差特征的输出')


@check("edge", '常量列的输出为 beta', '某列所有值都相同，则方差为 0、x_hat 为 0，该列输出就是 beta。')
def constant_column(sub):
    x = np.array([[2.0, 1.0], [2.0, 3.0], [2.0, 5.0]])
    out, cache, _, _ = train(sub, x, np.array([3.0, 1.0]), np.array([0.5, 0.0]))
    close(out[:, 0], [0.5, 0.5, 0.5], atol=1e-12, what='常量列的输出')
    dx, _, _ = sub.batchnorm_backward(np.ones((3, 2)), cache)
    true(np.all(np.isfinite(dx)), "dx 包含 NaN 或无穷值", "finite values", dx)


@check("edge", 'momentum 为 1 和 0', 'momentum 为 1 时，运行统计量变为当前批次统计量；momentum 为 0 时，运行统计量保持不变。')
def momentum_limits(sub):
    x = np.array([[1.0, -2.0], [3.0, 0.0], [8.0, 5.0]])
    old_mean, old_var = np.array([0.5, -0.5]), np.array([2.0, 3.0])
    _, _, mean1, var1 = sub.batchnorm_forward(x, np.ones(2), np.zeros(2), old_mean, old_var, momentum=1.0, training=True)
    close(mean1, np.mean(x, axis=0), rtol=1e-12, what='momentum 为 1 时的运行均值')
    close(var1, np.var(x, axis=0), rtol=1e-12, what='momentum 为 1 时的运行方差')
    _, _, mean0, var0 = sub.batchnorm_forward(x, np.ones(2), np.zeros(2), old_mean, old_var, momentum=0.0, training=True)
    close(mean0, old_mean, rtol=1e-12, what='momentum 为 0 时的运行均值')
    close(var0, old_var, rtol=1e-12, what='momentum 为 0 时的运行方差')


@check("edge", '推理结果不依赖批次', '推理模式下，每行只使用运行统计量。单独处理某行或将它放入批次，输出都相同。')
def inference_rows(sub):
    rng = np.random.default_rng(6)
    x = rng.normal(size=(5, 3))
    args = (rng.normal(size=3), rng.normal(size=3), rng.normal(size=3), rng.random(size=3) + 0.5)
    full, _, _, _ = sub.batchnorm_forward(x, *args, training=False)
    single, _, _, _ = sub.batchnorm_forward(x[2:3], *args, training=False)
    close(single, full[2:3], rtol=1e-12, what='单独推理第 2 行时的输出')


@fixture("batches")
def batches(ref):
    rng = np.random.default_rng(42)
    for n, d, momentum in [(2, 1, 0.1), (4, 3, 0.1), (8, 5, 0.2), (16, 4, 0.05)]:
        x = rng.normal(size=(n, d)) * 3 + 1
        gamma = rng.normal(size=d)
        beta = rng.normal(size=d)
        running_mean = rng.normal(size=d)
        running_var = rng.random(size=d) + 0.5
        upstream = rng.normal(size=(n, d))
        out, cache, new_mean, new_var = ref.batchnorm_forward(x, gamma, beta, running_mean, running_var, momentum=momentum, training=True)
        dx, dgamma, dbeta = ref.batchnorm_backward(upstream, cache)
        infer, _, _, _ = ref.batchnorm_forward(x, gamma, beta, new_mean, new_var, momentum=momentum, training=False)
        yield {"x": x, "gamma": gamma, "beta": beta, "running_mean": running_mean, "running_var": running_var, "momentum": momentum, "upstream": upstream}, {
            "out": out, "mean": new_mean, "var": new_var, "dx": dx, "dgamma": dgamma, "dbeta": dbeta, "infer": infer,
        }


@check("reference", '前向结果和运行统计量与参考实现一致', '对于随机批次，训练输出、运行统计量和推理输出都与参考实现一致。')
def reference_forward(sub):
    for case, expected in fixtures("batches"):
        out, _, mean, var = sub.batchnorm_forward(case["x"], case["gamma"], case["beta"], case["running_mean"], case["running_var"], momentum=case["momentum"], training=True)
        size = case["x"].shape
        close(out, expected["out"], rtol=1e-7, atol=1e-12, what=f"x 形状为 {size} 时的训练输出")
        close(mean, expected["mean"], rtol=1e-7, atol=1e-12, what=f"x 形状为 {size} 时的运行均值")
        close(var, expected["var"], rtol=1e-7, atol=1e-12, what=f"x 形状为 {size} 时的运行方差")
        infer, _, _, _ = sub.batchnorm_forward(case["x"], case["gamma"], case["beta"], expected["mean"], expected["var"], momentum=case["momentum"], training=False)
        close(infer, expected["infer"], rtol=1e-7, atol=1e-12, what=f"x 形状为 {size} 时的推理输出")


@check("reference", '梯度与参考实现一致', '对于相同的随机批次，dx、dgamma 和 dbeta 都与参考实现一致。')
def reference_backward(sub):
    for case, expected in fixtures("batches"):
        _, cache, _, _ = sub.batchnorm_forward(case["x"], case["gamma"], case["beta"], case["running_mean"], case["running_var"], momentum=case["momentum"], training=True)
        dx, dgamma, dbeta = sub.batchnorm_backward(case["upstream"], cache)
        size = case["x"].shape
        close(dx, expected["dx"], rtol=1e-7, atol=1e-12, what=f"x 形状为 {size} 时的 dx")
        close(dgamma, expected["dgamma"], rtol=1e-7, atol=1e-12, what=f"x 形状为 {size} 时的 dgamma")
        close(dbeta, expected["dbeta"], rtol=1e-7, atol=1e-12, what=f"x 形状为 {size} 时的 dbeta")
