import numpy as np

from practice_check import check, close, equal, fixture, fixtures, numeric_grad, shape, true

X_EX = np.array([[1.0, 2.0], [2.0, 1.0], [3.0, 4.0], [4.0, 3.0]])
Y_EX = np.array([0.0, 0.0, 1.0, 1.0])
W_EX = np.array([0.5, -0.25])
B_EX = 0.1


@check("examples", '五个数的 sigmoid', 'sigmoid(z) = 1 / (1 + exp(-z))。z = 0 时结果为 0.5，两端分别趋近 0 和 1。')
def example_sigmoid(sub):
    close(sub.sigmoid(np.array([-2.0, 0.0, 2.0, 1000.0, -1000.0])), [0.11920292, 0.5, 0.88079708, 1.0, 0.0], rtol=1e-6, atol=1e-12, what="sigmoid 值")


@check("examples", '小型示例中的损失和梯度', '损失是平均二元交叉熵。权重梯度为 X^T (p - y) / n，偏置梯度为 p - y 的均值。')
def example_loss_grad(sub):
    close(sub.compute_loss(X_EX, Y_EX, W_EX, B_EX), 0.6545645625913818, rtol=1e-9, what="损失")
    dw, db = sub.compute_gradients(X_EX, Y_EX, W_EX, B_EX)
    close(dw, [0.00990023, -0.07111509], rtol=1e-6, what="权重梯度")
    close(db, 0.1663330660944403, rtol=1e-9, what="偏置梯度")


@check("examples", "训练三轮", "fit 从零权重和零偏置开始。每轮执行一次梯度更新，再记录损失。")
def example_fit(sub):
    w, b, history = sub.fit(X_EX, Y_EX, 0.1, 3)
    close(w, [0.10335357, 0.10335357], rtol=1e-6, what="权重")
    close(b, -0.016102386795294854, rtol=1e-9, what="偏置")
    close(history, [0.6521696016041545, 0.6346023820290841, 0.6258174296603579], rtol=1e-9, what="损失历史记录")


@check("properties", 'sigmoid 满足对称关系且取值在 [0, 1] 内', 'sigmoid(-z) 等于 1 - sigmoid(z)，输出始终在 0 到 1 之间。')
def sigmoid_symmetry(sub):
    z = np.linspace(-30.0, 30.0, 41)
    s = sub.sigmoid(z)
    shape(s, z.shape, what="sigmoid 的输出")
    close(sub.sigmoid(-z), 1.0 - s, atol=1e-12, what="sigmoid(-z)")
    true(np.all((s >= 0) & (s <= 1)), "存在超出 [0, 1] 范围的 sigmoid 值", "0 到 1 之间的值", s)


@check("properties", '梯度与有限差分一致', '微调一个权重时，若损失变化量约等于梯度乘以该权重的变化量，则梯度正确。')
def finite_differences(sub):
    rng = np.random.default_rng(0)
    X = rng.normal(size=(7, 3))
    y = (rng.random(7) < 0.5).astype(float)
    w = rng.normal(size=3)
    b = 0.3
    dw, db = sub.compute_gradients(X, y, w, b)
    close(dw, numeric_grad(lambda v: sub.compute_loss(X, y, v, b), w), atol=1e-7, rtol=1e-5, what="权重梯度")
    numeric_b = numeric_grad(lambda v: sub.compute_loss(X, y, w, float(v[0])), np.array([b]))[0]
    close(db, numeric_b, atol=1e-7, rtol=1e-5, what="偏置梯度")


@check("properties", "每轮训练后的损失都会下降", '损失是凸函数。学习率较小时，每次梯度更新都会降低损失。')
def loss_decreases(sub):
    rng = np.random.default_rng(1)
    X = np.vstack([rng.normal(2.0, 1.0, size=(20, 2)), rng.normal(5.0, 1.0, size=(20, 2))])
    y = np.array([0.0] * 20 + [1.0] * 20)
    _, _, history = sub.fit(X, y, 0.05, 30)
    equal(len(history), 30, what="损失历史记录的长度")
    true(np.all(np.diff(history) < 0), "某一轮训练后的损失上升了", "逐轮下降的损失历史记录", np.array(history))
    true(history[0] < np.log(2.0), "首次记录的损失没有低于零参数模型的损失 log(2)", float(np.log(2.0)), history[0])


@check("properties", '输入不会被修改', '若函数修改输入数组，会破坏调用方的后续逻辑。')
def inputs_unchanged(sub):
    X, y, w = X_EX.copy(), Y_EX.copy(), W_EX.copy()
    z = np.array([-3.0, 0.5, 4.0])
    saved = [X.copy(), y.copy(), w.copy(), z.copy()]
    sub.sigmoid(z)
    sub.compute_loss(X, y, w, B_EX)
    sub.compute_gradients(X, y, w, B_EX)
    sub.fit(X, y, 0.1, 2)
    for name, now, before in zip(["X", "y", "w", "z"], [X, y, w, z], saved):
        close(now, before, rtol=0, atol=0, what=f"调用后的 {name}")


@check("edge", '极大输入的 sigmoid', 'exp(1000) 会溢出。改用不会大于 1 的 exp(-|z|)，并根据 z 的符号选择公式。')
def sigmoid_large(sub):
    z = np.array([-800.0, -40.0, 40.0, 800.0])
    close(sub.sigmoid(z), [0.0, 4.248354255291589e-18, 1.0, 1.0], rtol=1e-9, atol=0, what="极大输入的 sigmoid 值")


@check("edge", '错误且高置信度的预测仍有有限损失', '不要直接计算 log(sigmoid(z))。z = 800、y = 0 时，1 - sigmoid(z) 为 0，取对数会得到负无穷。用 np.logaddexp 计算 log(1 + exp(z)) - y z。')
def confident_wrong(sub):
    close(sub.compute_loss(np.array([[1.0]]), np.array([0.0]), np.array([800.0]), 0.0), 800.0, rtol=1e-9, what="z = 800 且 y = 0 时的损失")
    close(sub.compute_loss(np.array([[1.0]]), np.array([1.0]), np.array([-60.0]), 0.0), 60.0, rtol=1e-9, what="z = -60 且 y = 1 时的损失")


@check("edge", "训练零轮和单条样本", 'epochs 为 0 时，fit 返回零权重、零偏置和空历史列表。批次只有一个样本也有效。')
def tiny_cases(sub):
    w, b, history = sub.fit(X_EX, Y_EX, 0.1, 0)
    close(w, [0.0, 0.0], what="权重")
    close(b, 0.0, what="偏置")
    equal(len(history), 0, what="历史记录的长度")
    dw, db = sub.compute_gradients(np.array([[2.0, -1.0]]), np.array([1.0]), np.zeros(2), 0.0)
    close(dw, [-1.0, 0.5], what="单个样本的权重梯度")
    close(db, -0.5, what="单个样本的偏置梯度")


@fixture("datasets")
def datasets(ref):
    rng = np.random.default_rng(42)
    for n, d, lr, epochs in [(5, 1, 0.5, 10), (12, 3, 0.1, 25), (30, 2, 1.0, 40), (8, 5, 0.01, 15), (20, 4, 0.3, 30)]:
        X = rng.normal(size=(n, d)) * 2.0
        y = (rng.random(n) < 0.5).astype(float)
        w = rng.normal(size=d)
        b = float(rng.normal())
        dw, db = ref.compute_gradients(X, y, w, b)
        fw, fb, history = ref.fit(X, y, lr, epochs)
        yield {"X": X, "y": y, "w": w, "b": b, "lr": lr, "epochs": epochs}, {
            "loss": ref.compute_loss(X, y, w, b),
            "dw": dw,
            "db": db,
            "fit_w": fw,
            "fit_b": fb,
            "history": np.array(history),
        }


@check("reference", '损失和梯度与参考实现一致', '随机数据集上的损失和梯度都与参考实现一致。')
def reference_loss(sub):
    for case, expected in fixtures("datasets"):
        label = f"X 形状为 {case['X'].shape}"
        close(sub.compute_loss(case["X"], case["y"], case["w"], case["b"]), expected["loss"], rtol=1e-9, what=f"{label}时的损失")
        dw, db = sub.compute_gradients(case["X"], case["y"], case["w"], case["b"])
        close(dw, expected["dw"], rtol=1e-8, atol=1e-12, what=f"{label}时的权重梯度")
        close(db, expected["db"], rtol=1e-8, atol=1e-12, what=f"{label}时的偏置梯度")


@check("reference", '训练结果与参考实现一致', 'fit 返回的权重、偏置和损失历史都与参考实现一致。')
def reference_fit(sub):
    for case, expected in fixtures("datasets"):
        label = f"X 形状为 {case['X'].shape}，训练 {case['epochs']} 轮"
        w, b, history = sub.fit(case["X"], case["y"], case["lr"], case["epochs"])
        close(w, expected["fit_w"], rtol=1e-8, atol=1e-12, what=f"{label}时的权重")
        close(b, expected["fit_b"], rtol=1e-8, atol=1e-12, what=f"{label}时的偏置")
        close(history, expected["history"], rtol=1e-8, what=f"{label}时的损失历史记录")
