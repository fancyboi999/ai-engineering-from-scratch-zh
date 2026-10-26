import numpy as np

from practice_check import check, close, fixture, fixtures, numeric_grad, shape, true

X = np.array([2.0, -1.0, 0.5, -3.0])
Y = np.array([1.0, 1.0, 0.0, 0.0])
L = np.array([[2.0, 1.0, 0.1], [0.5, 2.5, 0.3]])
T = np.array([0, 1])


def bce(logits, targets):
    return float(np.mean(np.logaddexp(0.0, logits) - targets * logits))


def cross_entropy(logits, targets):
    shifted = logits - np.max(logits, axis=1, keepdims=True)
    log_probs = shifted - np.log(np.sum(np.exp(shifted), axis=1, keepdims=True))
    return float(-np.mean(log_probs[np.arange(len(targets)), targets]))


@check("examples", "gamma 为 0 和 2 时的二分类焦点损失", "正类目标的 p_t 为 sigmoid(x)，负类目标的 p_t 为 1 - sigmoid(x)。损失是 -(1 - p_t)^gamma log(p_t) 的平均值。")
def example_binary(sub):
    close(sub.binary_focal_loss(X, Y, 0.0), 0.6157135085787611, rtol=1e-9, what="gamma = 0 时的损失")
    close(sub.binary_focal_loss(X, Y, 2.0), 0.270298187607633, rtol=1e-9, what="gamma = 2 时的损失")


@check("examples", "alpha 为 0.25 时的二分类焦点损失和梯度", "正类目标的 alpha_t 为 alpha，负类目标的 alpha_t 为 1 - alpha。")
def example_alpha(sub):
    close(sub.binary_focal_loss(X, Y, 2.0, 0.25), 0.1147646574248966, rtol=1e-9, what="损失")
    close(sub.binary_focal_grad(X, Y, 2.0, 0.25), [-3.04433762e-04, -4.80146702e-02, 9.86534666e-02, 5.90384712e-05], rtol=1e-6, what="梯度")


@check("examples", "多分类焦点损失", "p_t 是目标类别的 softmax 概率。逐类别 alpha 会将每个样本的损失乘以 alpha[target]。")
def example_multiclass(sub):
    close(sub.focal_loss(L, T, 0.0), 0.31853976964918573, rtol=1e-9, what="gamma = 0 时的损失")
    close(sub.focal_loss(L, T, 2.0), 0.02853873533647399, rtol=1e-9, what="gamma = 2 时的损失")
    close(sub.focal_loss(L, T, 2.0, np.array([0.5, 1.0, 2.0])), 0.016415649484550623, rtol=1e-9, what="使用逐类别 alpha 时的损失")


@check("properties", "gamma 为 0 且未设置 alpha 时，结果等于交叉熵", "gamma = 0 时，因子 (1 - p_t)^gamma 等于 1。未设置 alpha 时，焦点损失就是普通交叉熵。")
def equals_cross_entropy(sub):
    rng = np.random.default_rng(0)
    x = rng.normal(size=9) * 3
    y = (rng.random(9) < 0.5).astype(float)
    close(sub.binary_focal_loss(x, y, 0.0), bce(x, y), rtol=1e-12, what="二分类损失")
    logits = rng.normal(size=(6, 5)) * 2
    targets = rng.integers(0, 5, size=6)
    close(sub.focal_loss(logits, targets, 0.0), cross_entropy(logits, targets), rtol=1e-12, what="多分类损失")


@check("properties", "焦点损失不超过交叉熵，且随 gamma 增大而减小", "(1 - p_t)^gamma 最大为 1，并会随着 gamma 增大而减小。因此 gamma 越大，损失越小。")
def below_cross_entropy(sub):
    rng = np.random.default_rng(1)
    logits = rng.normal(size=(8, 4)) * 2
    targets = rng.integers(0, 4, size=8)
    losses = [sub.focal_loss(logits, targets, g) for g in [0.0, 0.5, 1.0, 2.0, 5.0]]
    true(all(a > b for a, b in zip(losses, losses[1:])), "gamma 增大时损失未减小", "损失递减列表", losses)


@check("properties", "简单样本的权重较小", "当单个样本的 p_t = 0.9 且 gamma = 2 时，焦点损失是交叉熵的 (0.1)^2 = 0.01 倍。若 p_t = 0.1，调制因子为 0.81。")
def easy_down_weighted(sub):
    for pt, factor in [(0.9, 0.01), (0.1, 0.81)]:
        x = np.array([np.log(pt / (1.0 - pt))])
        y = np.array([1.0])
        close(sub.binary_focal_loss(x, y, 2.0), factor * -np.log(pt), rtol=1e-9, what=f"p_t = {pt} 时的损失")


@check("properties", "两个类别时与二分类损失一致", "对 logits [0, x] 计算 softmax，类别 1 的概率等于 sigmoid(x)。因此使用这些 logits 的多分类损失等于 logit 为 x 的二分类损失。")
def two_class_matches_binary(sub):
    rng = np.random.default_rng(2)
    x = rng.normal(size=7) * 2
    y = rng.integers(0, 2, size=7)
    logits = np.stack([np.zeros(7), x], axis=1)
    close(sub.focal_loss(logits, y, 2.0, np.array([0.75, 0.25])), sub.binary_focal_loss(x, y.astype(float), 2.0, 0.25), rtol=1e-12, what="多分类损失")


@check("properties", "梯度与有限差分结果一致", "稍微改变一个 logit，损失的变化量应等于梯度乘以该改变量。因子 (1 - p_t)^gamma 也依赖 logit。")
def finite_differences(sub):
    rng = np.random.default_rng(3)
    x = rng.normal(size=6) * 2
    y = (rng.random(6) < 0.5).astype(float)
    for gamma, alpha in [(0.0, None), (2.0, None), (1.5, 0.25)]:
        numeric = numeric_grad(lambda z: sub.binary_focal_loss(z, y, gamma, alpha), x)
        grad = sub.binary_focal_grad(x, y, gamma, alpha)
        shape(grad, (6,), what="梯度")
        close(grad, numeric, rtol=1e-5, atol=1e-8, what=f"gamma = {gamma}、alpha = {alpha} 时的梯度")


@check("properties", "输入保持不变", "若函数修改 logits 或目标，就会破坏调用它的训练循环。")
def inputs_unchanged(sub):
    x, y, logits, targets = X.copy(), Y.copy(), L.copy(), T.copy()
    sub.binary_focal_loss(x, y, 2.0, 0.25)
    sub.binary_focal_grad(x, y, 2.0, 0.25)
    sub.focal_loss(logits, targets, 2.0, np.array([1.0, 2.0, 3.0]))
    for name, before, after in [("二分类 logits", X, x), ("二分类目标", Y, y), ("logits", L, logits), ("目标", T, targets)]:
        true(np.array_equal(before, after), f"函数修改了 {name}", before, after)


@check("edge", "极大 logit 下结果仍有限", "当 logit 为 -1000 且目标为正类时，sigmoid 会舍入为 0，log(0) 会变成负无穷。使用 np.logaddexp 计算 -log(1 + exp(-s)) 作为 log p_t。该样本的损失为 1000。")
def large_logits(sub):
    x = np.array([1000.0, -1000.0])
    y = np.array([1.0, 1.0])
    close(sub.binary_focal_loss(x, y, 2.0), 500.0, rtol=1e-12, what="损失")
    close(sub.binary_focal_grad(x, y, 2.0), [0.0, -0.5], atol=1e-12, what="梯度")
    close(sub.focal_loss(np.array([[1000.0, 0.0], [-1000.0, 0.0]]), np.array([0, 0]), 2.0), 500.0, rtol=1e-12, what="多分类损失")


@check("edge", "alpha 为 0.25 时负类权重为 0.75", "gamma = 0 时，负类样本的损失是其交叉熵乘以 (1 - alpha)，正类样本则乘以 alpha。")
def alpha_negatives(sub):
    x = np.array([0.3])
    close(sub.binary_focal_loss(x, np.array([0.0]), 0.0, 0.25), 0.75 * bce(x, np.array([0.0])), rtol=1e-12, what="负类样本的损失")
    close(sub.binary_focal_loss(x, np.array([1.0]), 0.0, 0.25), 0.25 * bce(x, np.array([1.0])), rtol=1e-12, what="正类样本的损失")


@fixture("cases")
def cases(ref):
    rng = np.random.default_rng(42)
    for n, c, gamma, alpha in [(3, 2, 0.5, None), (5, 3, 2.0, 0.25), (8, 4, 1.0, 0.6), (4, 6, 3.0, None)]:
        x = rng.normal(size=n) * 3
        y = (rng.random(n) < 0.4).astype(float)
        logits = rng.normal(size=(n, c)) * 2
        targets = rng.integers(0, c, size=n)
        class_alpha = None if alpha is None else rng.random(c) + 0.1
        yield {"x": x, "y": y, "logits": logits, "targets": targets, "gamma": gamma, "alpha": alpha, "class_alpha": class_alpha}, {"binary": ref.binary_focal_loss(x, y, gamma, alpha), "grad": ref.binary_focal_grad(x, y, gamma, alpha), "multi": ref.focal_loss(logits, targets, gamma, class_alpha)}


@check("reference", "损失和梯度与参考结果一致", "在多个 gamma 和 alpha 值的随机批次上，函数结果都应与参考实现一致。")
def reference_cases(sub):
    for case, expected in fixtures("cases"):
        label = f"N = {case['x'].size}，gamma = {case['gamma']}，alpha = {case['alpha']}"
        close(sub.binary_focal_loss(case["x"], case["y"], case["gamma"], case["alpha"]), expected["binary"], rtol=1e-9, what=f"{label} 时的二分类损失")
        close(sub.binary_focal_grad(case["x"], case["y"], case["gamma"], case["alpha"]), expected["grad"], rtol=1e-9, atol=1e-14, what=f"{label} 时的梯度")
        close(sub.focal_loss(case["logits"], case["targets"], case["gamma"], case["class_alpha"]), expected["multi"], rtol=1e-9, what=f"{label} 时的多分类损失")
