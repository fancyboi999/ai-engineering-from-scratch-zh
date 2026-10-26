import numpy as np

from practice_check import check, close, equal, fixture, fixtures, numeric_grad, shape, true

LINE_X = np.array([[1.0], [2.0], [3.0], [4.0]])
LINE_Y = np.array([3.0, 5.0, 7.0, 9.0])


@check("examples", "零参数模型在直线 y = 2x + 1 上的损失", "损失是平方误差的平均值。当 w = 0 且 b = 0 时，所有预测值都是 0。")
def example_cost(sub):
    close(sub.compute_cost(LINE_X, LINE_Y, np.zeros(1), 0.0), 41.0, what="损失")


@check("examples", "零参数模型的梯度", "dw 等于 2/n 乘以 X 的转置再乘以误差向量。db 等于 2/n 乘以误差总和。误差是预测值减去目标值。")
def example_gradients(sub):
    dw, db = sub.compute_gradients(LINE_X, LINE_Y, np.zeros(1), 0.0)
    close(dw, [-35.0], what="dw")
    close(db, -12.0, what="db")


@check("examples", "fit 拟合出直线 y = 2x + 1", "从 w = 0、b = 0 开始。每轮先计算两个梯度，再以相同学习率更新 w 和 b。")
def example_fit(sub):
    w, b, history = sub.fit(LINE_X, LINE_Y, 0.05, 500)
    shape(w, (1,), what="w")
    close(w, [2.00005173], rtol=1e-6, what="w")
    close(b, 0.9998479052895004, rtol=1e-6, what="b")
    equal(len(history), 500, what="损失历史记录的长度")


@check("properties", "predict 计算 X 乘以 w 再加 b", "每行的预测值等于该行与 w 的点积，再加上 b。")
def predict_matches(sub):
    rng = np.random.default_rng(3)
    X = rng.normal(size=(6, 3))
    w = rng.normal(size=3)
    out = sub.predict(X, w, 0.5)
    shape(out, (6,), what="预测值")
    close(out, X @ w + 0.5, what="预测值")


@check("properties", "梯度与有限差分一致", "参数发生微小变化时，损失的变化应近似等于梯度乘以该参数变化量。")
def finite_differences(sub):
    rng = np.random.default_rng(4)
    X = rng.normal(size=(7, 3))
    y = rng.normal(size=7)
    w = rng.normal(size=3)
    b = 0.3
    dw, db = sub.compute_gradients(X, y, w, b)
    numeric_w = numeric_grad(lambda v: sub.compute_cost(X, y, v, b), w)
    numeric_b = numeric_grad(lambda v: sub.compute_cost(X, y, w, float(v[0])), np.array([b]))
    close(dw, numeric_w, rtol=1e-5, atol=1e-7, what="dw")
    close(db, numeric_b[0], rtol=1e-5, atol=1e-7, what="db")


@check("properties", "最小二乘拟合点的梯度为零", "最小二乘直线使损失达到最小值。此时两个梯度都为 0。")
def zero_at_optimum(sub):
    rng = np.random.default_rng(5)
    X = rng.normal(size=(9, 2))
    y = rng.normal(size=9)
    design = np.hstack([X, np.ones((9, 1))])
    params = np.linalg.lstsq(design, y, rcond=None)[0]
    dw, db = sub.compute_gradients(X, y, params[:2], float(params[2]))
    close(dw, np.zeros(2), atol=1e-9, what="最优点处的 dw")
    close(db, 0.0, atol=1e-9, what="最优点处的 db")


@check("properties", "历史记录保存每次更新后的损失", "更新 w 和 b 后再记录损失。这样最后一项就是返回的 w 和 b 对应的损失。")
def history_after_update(sub):
    rng = np.random.default_rng(6)
    X = rng.normal(size=(8, 2))
    y = X @ np.array([1.5, -0.5]) + 2.0
    w, b, history = sub.fit(X, y, 0.1, 25)
    equal(len(history), 25, what="历史记录的长度")
    close(history[-1], sub.compute_cost(X, y, w, b), rtol=1e-9, what="历史记录中的最后一个损失")
    true(history[0] < sub.compute_cost(X, y, np.zeros(2), 0.0), "第一项必须是首次更新后的损失，并且小于零参数模型的损失。", "小于零参数模型损失的值", history[0])
    true(all(later <= earlier + 1e-12 for earlier, later in zip(history, history[1:])), "学习率较小时，损失不应上升。", "不再上升的损失", history)


@check("properties", "输入未被修改", "函数写入输入数组会破坏调用方的代码。")
def inputs_unchanged(sub):
    X = np.array([[1.0, 2.0], [3.0, -1.0], [0.5, 0.5]])
    y = np.array([1.0, 2.0, 3.0])
    w = np.array([0.2, -0.1])
    saved = (X.copy(), y.copy(), w.copy())
    sub.compute_cost(X, y, w, 0.1)
    sub.compute_gradients(X, y, w, 0.1)
    sub.fit(X, y, 0.05, 5)
    for name, now, before in zip(("X", "y", "w"), (X, y, w), saved):
        close(now, before, rtol=0, atol=0, what=f"调用后的 {name}")


@check("edge", "训练轮数为零时返回初始状态", "训练轮数为零时不执行循环。返回 w = 0、b = 0 和空的历史记录。")
def zero_epochs(sub):
    w, b, history = sub.fit(LINE_X, LINE_Y, 0.05, 0)
    close(w, [0.0], what="w")
    close(b, 0.0, what="b")
    equal(len(history), 0, what="历史记录的长度")


@check("edge", "仅靠偏置拟合常量目标", "当所有特征都为 0 时，只有偏置能减小损失。偏置必须趋近于 y 的均值。")
def bias_only(sub):
    X = np.zeros((3, 2))
    y = np.array([5.0, 5.0, 5.0])
    w, b, history = sub.fit(X, y, 0.1, 200)
    close(w, [0.0, 0.0], what="w")
    close(b, 5.0, rtol=1e-9, what="b")


@check("edge", "单个样本和单个特征", "当 n = 1 时，函数也必须正常工作。单个样本的均值就是该样本本身。")
def single_sample(sub):
    X = np.array([[2.0]])
    y = np.array([4.0])
    close(sub.compute_cost(X, y, np.array([1.0]), 1.0), 1.0, what="损失")
    dw, db = sub.compute_gradients(X, y, np.array([1.0]), 1.0)
    close(dw, [-4.0], what="dw")
    close(db, -2.0, what="db")


@fixture("models")
def models(ref):
    rng = np.random.default_rng(42)
    for n, d, lr, epochs in [(5, 1, 0.05, 10), (12, 3, 0.02, 30), (20, 4, 0.1, 15), (8, 2, 0.3, 20)]:
        X = rng.normal(size=(n, d))
        y = X @ rng.normal(size=d) + rng.normal() + 0.1 * rng.normal(size=n)
        w = rng.normal(size=d)
        b = float(rng.normal())
        dw, db = ref.compute_gradients(X, y, w, b)
        fit_w, fit_b, history = ref.fit(X, y, lr, epochs)
        yield {"X": X, "y": y, "w": w, "b": b, "lr": lr, "epochs": epochs}, {
            "cost": ref.compute_cost(X, y, w, b),
            "dw": dw,
            "db": db,
            "fit_w": fit_w,
            "fit_b": fit_b,
            "history": np.array(history),
        }


@check("reference", "损失和梯度与参考解一致", "在随机数据上，损失和梯度应与参考解一致。")
def reference_gradients(sub):
    for case, expected in fixtures("models"):
        size = case["X"].shape
        close(sub.compute_cost(case["X"], case["y"], case["w"], case["b"]), expected["cost"], rtol=1e-9, what=f"X 形状为 {size} 时的损失")
        dw, db = sub.compute_gradients(case["X"], case["y"], case["w"], case["b"])
        close(dw, expected["dw"], rtol=1e-9, atol=1e-12, what=f"X 形状为 {size} 时的 dw")
        close(db, expected["db"], rtol=1e-9, atol=1e-12, what=f"X 形状为 {size} 时的 db")


@check("reference", "fit 与参考解一致", "训练循环得到的权重、偏置和损失历史记录应与参考解一致。")
def reference_fit(sub):
    for case, expected in fixtures("models"):
        size = case["X"].shape
        w, b, history = sub.fit(case["X"], case["y"], case["lr"], case["epochs"])
        close(w, expected["fit_w"], rtol=1e-9, atol=1e-12, what=f"X 形状为 {size} 时的 w")
        close(b, expected["fit_b"], rtol=1e-9, atol=1e-12, what=f"X 形状为 {size} 时的 b")
        close(np.asarray(history, dtype=float), expected["history"], rtol=1e-9, atol=1e-12, what=f"X 形状为 {size} 时的损失历史记录")
