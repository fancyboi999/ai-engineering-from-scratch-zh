import numpy as np

import practice_check
from practice_check import check, clear_progress, close, equal, fixture, fixtures, progress, shape, true
from support import make_sine

BUDGET = 1500
TARGET = 0.01
HELD_OUT_SEED = 70913
_runs = {}


def train_data():
    return make_sine(200, np.random.default_rng(0))


def held_out_x():
    return np.random.default_rng(HELD_OUT_SEED).uniform(-np.pi, np.pi, size=2000)


def fresh_run(sub, x, y, seed):
    saved = list(progress())
    clear_progress()
    try:
        model = sub.train(x, y, np.random.default_rng(seed))
        points = list(progress())
    finally:
        clear_progress()
        practice_check._progress.extend(saved)
    return model, points


def main_run(sub):
    key = id(sub)
    if key not in _runs:
        x, y = train_data()
        x_in, y_in = x.copy(), y.copy()
        clear_progress()
        model = sub.train(x_in, y_in, np.random.default_rng(1))
        _runs[key] = {"model": model, "points": list(progress()), "x": x, "y": y, "x_in": x_in, "y_in": y_in}
    return _runs[key]


def predictions(sub, model, x):
    out = np.asarray(sub.predict(model, x), dtype=float)
    shape(out, x.shape, what="predict 的输出")
    return out


def curve_mse(sub, model, x):
    return float(np.mean((predictions(sub, model, x) - np.sin(x)) ** 2))


@check("examples", 'predict 为每个输入返回一个值', '输入形状为 (M,) 时，predict 返回形状为 (M,) 的浮点数组。')
def example_shape(sub):
    run = main_run(sub)
    predictions(sub, run["model"], run["x"])


@check("examples", '模型拟合训练点', '训练结束后，与带噪训练目标相比的均方误差不得超过 0.02。噪声本身约产生 0.01 的误差。')
def example_train_mse(sub):
    run = main_run(sub)
    mse = float(np.mean((predictions(sub, run["model"], run["x"]) - run["y"]) ** 2))
    true(mse <= 0.02, f"训练均方误差为 {mse:.5f}，超过 0.02", "<= 0.02", mse)


@check("properties", '训练不超过步数预算', '每次更新都调用一次 report(step, loss)，step 从 0 开始递增。最多训练 1500 步。')
def budget(sub):
    points = main_run(sub)["points"]
    true(len(points) >= 1, "train 没有调用 report(step, loss)", "至少调用 1 次", 0)
    true(len(points) <= BUDGET, f"train 使用了 {len(points)} 步，预算为 {BUDGET} 步", f"<= {BUDGET}", len(points))
    equal([point[0] for point in points], list(range(len(points))), what="传给 report 的步数")


@check("properties", '报告的损失持续下降', '梯度下降应降低损失。最后 10 次报告损失的均值必须低于第一次损失。')
def loss_goes_down(sub):
    losses = np.array([point[1] for point in main_run(sub)["points"]])
    true(losses.size >= 1 and np.all(np.isfinite(losses)), "报告的损失含有 NaN 或无穷值", "有限的损失值", losses)
    true(np.mean(losses[-10:]) < losses[0], "损失没有下降", f"低于 {losses[0]:.4f}", float(np.mean(losses[-10:])))


@check("properties", '相同种子会得到相同模型', '所有随机数都从 rng 参数获取。相同种子的两次运行应给出相同预测。')
def deterministic(sub):
    run = main_run(sub)
    x, y = train_data()
    model, points = fresh_run(sub, x, y, 1)
    x_test = held_out_x()
    equal(predictions(sub, model, x_test), predictions(sub, run["model"], x_test), what="第二次运行的预测值")
    equal([point[1] for point in points], [point[1] for point in run["points"]], what="第二次运行的损失")


@check("properties", '输入不会被修改', '不要写入 x 或 y，也不要改变其形状。请创建新数组，例如使用 x.reshape(-1, 1)。')
def inputs_unchanged(sub):
    run = main_run(sub)
    equal(run["x_in"], run["x"], what="train 调用后的 x")
    equal(run["y_in"], run["y"], what="train 调用后的 y")


@check("edge", '曲线的关键位置', '拟合结果在 0、正负 pi / 2 和区间端点处都应接近 sin(x)。每处误差必须低于 0.15。')
def key_points(sub):
    x = np.array([-np.pi, -np.pi / 2, 0.0, np.pi / 2, np.pi])
    close(predictions(sub, main_run(sub)["model"], x), np.sin(x), rtol=0, atol=0.15, what="关键位置的预测值")


@check("edge", '对单个输入进行预测', 'predict 必须支持单个输入，且返回形状为 (1,) 的数组。')
def one_input(sub):
    predictions(sub, main_run(sub)["model"], np.array([1.0]))


@check("edge", '较小数据集与新种子', '训练不能依赖某个偶然有利的种子。使用另一个种子和 100 个点时，留出误差也必须不超过 0.01。')
def other_seed(sub):
    x, y = make_sine(100, np.random.default_rng(5))
    model, _ = fresh_run(sub, x, y, 7)
    mse = curve_mse(sub, model, held_out_x())
    true(mse <= TARGET, f"留出集均方误差为 {mse:.5f}，超过 {TARGET}", f"<= {TARGET}", mse)


@fixture("held_out")
def reference_mse(ref):
    x, y = train_data()
    model = ref.train(x, y, np.random.default_rng(1))
    x_test = held_out_x()
    yield {"target": TARGET}, float(np.mean((ref.predict(model, x_test) - np.sin(x_test)) ** 2))


@check("reference", '留出误差达到目标', '检查会在从负 pi 到 pi 的 2000 个新 x 值上评估模型。与真实曲线 sin(x) 的均方误差必须不超过 0.01。')
def held_out_mse(sub):
    (case, reference), = fixtures("held_out")
    mse = curve_mse(sub, main_run(sub)["model"], held_out_x())
    true(mse <= case["target"], f"留出集均方误差为 {mse:.5f}，超过 {case['target']}。参考实现达到 {reference:.5f}", f"<= {case['target']}", mse)
