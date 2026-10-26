import numpy as np

from practice_check import check, close, fixture, fixtures, numeric_grad, shape, true

X = np.array([[0.0, 1.0], [1.0, 0.0]])
Y = np.array([[1.0], [0.0]])
NAMES = ("W1", "b1", "W2", "b2")


def example_params():
    return {
        "W1": np.array([[0.5, -0.5, 1.0], [0.25, 0.75, -1.0]]),
        "b1": np.array([0.0, 0.1, -0.1]),
        "W2": np.array([[1.0], [-1.0], [0.5]]),
        "b2": np.array([0.2]),
    }


def random_params(rng, n_in, n_hidden, n_out, scale=1.0):
    return {
        "W1": rng.normal(size=(n_in, n_hidden)) * scale,
        "b1": rng.normal(size=n_hidden) * scale,
        "W2": rng.normal(size=(n_hidden, n_out)) * scale,
        "b2": rng.normal(size=n_out) * scale,
    }


def grads_of(sub, x, params, target):
    _, cache = sub.mlp_forward(x, params)
    return sub.mlp_backward(params, cache, target)


def loss_of(sub, x, params, target):
    predicted, _ = sub.mlp_forward(x, params)
    return sub.mse_loss(predicted, target)


def check_against_finite_differences(sub, x, params, target):
    grads = grads_of(sub, x, params, target)
    for name in NAMES:
        def f(value, name=name):
            changed = dict(params)
            changed[name] = value
            return loss_of(sub, x, changed, target)
        numeric = numeric_grad(f, params[name])
        close(grads[name], numeric, atol=1e-7, rtol=1e-4, what=f"{name} 的梯度")


@check("examples", '两条样本的前向传播', '输出为 sigmoid(sigmoid(x W1 + b1) W2 + b2)，每条样本对应一行。')
def example_forward(sub):
    predicted, _ = sub.mlp_forward(X, example_params())
    close(predicted, [[0.5464852], [0.68495157]], rtol=1e-6, what="网络输出")


@check("examples", '两条样本的批次损失', '损失是输出中所有元素的平方差均值。')
def example_loss(sub):
    predicted, _ = sub.mlp_forward(X, example_params())
    close(sub.mse_loss(predicted, Y), 0.33741716, rtol=1e-6, what="损失")


@check("examples", '两条样本的梯度', '每个梯度都与其参数形状相同，数值由链式法则计算得到。')
def example_backward(sub):
    grads = grads_of(sub, X, example_params(), Y)
    close(grads["W2"], [[0.02881637], [-0.01942579], [0.07701337]], rtol=1e-6, what="W2 的梯度")
    close(grads["b2"], [0.03540898], rtol=1e-6, what="b2 的梯度")
    close(grads["W1"], [[0.03473536, -0.03551239, 0.01518726], [-0.02766515, 0.0235782, -0.01053007]], rtol=1e-6, what="W1 的梯度")
    close(grads["b1"], [0.0070702, -0.01193419, 0.0046572], rtol=1e-6, what="b1 的梯度")


@check("properties", '所有梯度都与有限差分一致', '微调某个参数时，若损失变化量等于梯度乘该参数变化量，则梯度正确。')
def finite_differences(sub):
    rng = np.random.default_rng(3)
    x = rng.normal(size=(5, 3))
    target = rng.random(size=(5, 2))
    check_against_finite_differences(sub, x, random_params(rng, 3, 4, 2), target)


@check("properties", '每个梯度与参数形状相同', 'W1 梯度形状为 (n_in, n_hidden)，b1 梯度形状为 (n_hidden,)。W2 和 b2 也遵循相同规则。')
def gradient_shapes(sub):
    rng = np.random.default_rng(4)
    params = random_params(rng, 3, 5, 2)
    grads = grads_of(sub, rng.normal(size=(7, 3)), params, rng.random(size=(7, 2)))
    for name in NAMES:
        true(name in grads, f"梯度字典缺少键 {name!r}", list(NAMES), sorted(grads))
        shape(grads[name], params[name].shape, what=f"{name} 的梯度")


@check("properties", '输出位于 0 到 1 之间', '输出层是 sigmoid，因此所有输出都严格位于 0 和 1 之间。')
def output_range(sub):
    rng = np.random.default_rng(5)
    predicted, _ = sub.mlp_forward(rng.normal(size=(6, 3)) * 3, random_params(rng, 3, 4, 2))
    shape(predicted, (6, 2), what="网络输出")
    true(np.all((predicted > 0) & (predicted < 1)), "存在不在 0 到 1 之间的输出", "(0, 1) 内的值", predicted)


@check("properties", '预测完全正确时梯度为 0', '目标值等于输出时，损失为 0，所有梯度也为 0。')
def zero_at_target(sub):
    rng = np.random.default_rng(6)
    x = rng.normal(size=(4, 3))
    params = random_params(rng, 3, 4, 2)
    predicted, _ = sub.mlp_forward(x, params)
    target = np.array(predicted, dtype=float)
    close(sub.mse_loss(predicted, target), 0.0, atol=1e-15, what="损失")
    grads = grads_of(sub, x, params, target)
    for name in NAMES:
        close(grads[name], np.zeros(params[name].shape), atol=1e-15, what=f"{name} 的梯度")


@check("properties", '输入不会被修改', '如果函数修改输入数组，会破坏调用方的后续逻辑。')
def inputs_unchanged(sub):
    rng = np.random.default_rng(7)
    x = rng.normal(size=(3, 2))
    target = rng.random(size=(3, 1))
    params = random_params(rng, 2, 3, 1)
    saved = {name: params[name].copy() for name in NAMES}
    saved_x, saved_target = x.copy(), target.copy()
    grads_of(sub, x, params, target)
    close(x, saved_x, atol=0, rtol=0, what="调用后的 x")
    close(target, saved_target, atol=0, rtol=0, what="调用后的目标值")
    for name in NAMES:
        close(params[name], saved[name], atol=0, rtol=0, what=f"调用后的 {name}")


@check("edge", '一条样本、一个输出', '函数必须支持最小批次：N = 1 且 n_out = 1。')
def smallest_batch(sub):
    rng = np.random.default_rng(8)
    x = rng.normal(size=(1, 2))
    check_against_finite_differences(sub, x, random_params(rng, 2, 3, 1), np.array([[0.3]]))


@check("edge", '损失除以输出元素总数', '均值覆盖 N * n_out 个元素。若只除以 N，梯度会大 n_out 倍。')
def many_outputs(sub):
    rng = np.random.default_rng(9)
    x = rng.normal(size=(2, 2))
    check_against_finite_differences(sub, x, random_params(rng, 2, 2, 4), rng.random(size=(2, 4)))


@check("edge", '较大的激活前数值仍保持有限', 'Sigmoid 饱和时输出接近 0 或 1，梯度接近 0。任何值都不能是 NaN 或无穷大。')
def saturated(sub):
    x = np.array([[1.0, -1.0]])
    params = {"W1": np.array([[900.0, -900.0], [-900.0, 900.0]]), "b1": np.zeros(2), "W2": np.array([[800.0], [-800.0]]), "b2": np.zeros(1)}
    predicted, cache = sub.mlp_forward(x, params)
    close(predicted, [[1.0]], atol=1e-12, what="网络输出")
    grads = sub.mlp_backward(params, cache, np.array([[0.0]]))
    for name in NAMES:
        close(grads[name], np.zeros(params[name].shape), atol=1e-12, what=f"{name} 的梯度")


@fixture("networks")
def networks(ref):
    rng = np.random.default_rng(42)
    for n, n_in, n_hidden, n_out in [(1, 2, 2, 1), (4, 3, 5, 2), (8, 4, 6, 3), (16, 2, 8, 1)]:
        x = rng.normal(size=(n, n_in))
        target = rng.random(size=(n, n_out))
        params = random_params(rng, n_in, n_hidden, n_out)
        predicted, cache = ref.mlp_forward(x, params)
        yield {"x": x, "target": target, "params": params}, {
            "output": predicted,
            "loss": ref.mse_loss(predicted, target),
            "grads": ref.mlp_backward(params, cache, target),
        }


@check("reference", '前向传播和损失与参考实现一致', '四种大小的随机网络中，输出和损失都与参考实现一致。')
def reference_forward(sub):
    for case, expected in fixtures("networks"):
        predicted, _ = sub.mlp_forward(case["x"], case["params"])
        size = case["x"].shape
        close(predicted, expected["output"], rtol=1e-7, atol=1e-12, what=f"x 形状为 {size} 时的输出")
        close(sub.mse_loss(predicted, case["target"]), expected["loss"], rtol=1e-7, what=f"x 形状为 {size} 时的损失")


@check("reference", '梯度与参考实现一致', '相同随机网络上的四个梯度都与参考实现一致。')
def reference_backward(sub):
    for case, expected in fixtures("networks"):
        grads = grads_of(sub, case["x"], case["params"], case["target"])
        for name in NAMES:
            close(grads[name], expected["grads"][name], rtol=1e-7, atol=1e-12, what=f"{name} 的梯度（x 形状为 {case['x'].shape}）")
