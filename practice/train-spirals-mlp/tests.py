import numpy as np

import practice_check
from practice_check import check, clear_progress, equal, fixture, fixtures, progress, shape, true
from support import make_spirals

BUDGET = 1500
TARGET = 0.95
HELD_OUT_SEED = 52903
ARM_T = np.linspace(1.5, 12.0, 24)
ARM_RADIUS = 3.0 * ARM_T / (4.0 * np.pi)
ARMS = np.concatenate([np.stack([ARM_RADIUS * np.cos(ARM_T + np.pi * k), ARM_RADIUS * np.sin(ARM_T + np.pi * k)], axis=1) for k in (0, 1)])
ARM_LABELS = np.repeat([0, 1], 24)
_runs = {}


def train_data():
    return make_spirals(400, np.random.default_rng(0))


def held_out():
    return make_spirals(2000, np.random.default_rng(HELD_OUT_SEED))


def fresh_run(sub, X, y, seed):
    saved = list(progress())
    clear_progress()
    try:
        model = sub.train(X, y, np.random.default_rng(seed))
        points = list(progress())
    finally:
        clear_progress()
        practice_check._progress.extend(saved)
    return model, points


def main_run(sub):
    key = id(sub)
    if key not in _runs:
        X, y = train_data()
        X_in, y_in = X.copy(), y.copy()
        clear_progress()
        model = sub.train(X_in, y_in, np.random.default_rng(1))
        _runs[key] = {"model": model, "points": list(progress()), "X": X, "y": y, "X_in": X_in, "y_in": y_in}
    return _runs[key]


def accuracy(sub, model, X, y):
    labels = np.asarray(sub.predict(model, X))
    shape(labels, y.shape, what="predict 返回的标签")
    return float(np.mean(labels == y))


@check("examples", "predict 为每个点给出一个标签", "predict 返回形状为 (N,) 的整数数组，为 X 的每行给出值 0 或 1。")
def example_shape(sub):
    run = main_run(sub)
    labels = np.asarray(sub.predict(run["model"], run["X"]))
    shape(labels, (400,), what="400 个训练点的标签")
    true(set(np.unique(labels).tolist()) <= {0, 1}, "predict 返回了 0 和 1 以外的值", "仅 0 和 1", np.unique(labels))


@check("examples", "模型拟合训练点", "训练后，至少 95% 的训练点必须得到正确标签。")
def example_train_accuracy(sub):
    run = main_run(sub)
    acc = accuracy(sub, run["model"], run["X"], run["y"])
    true(acc >= TARGET, f"训练准确率 {acc:.3f} 低于 {TARGET}", f">= {TARGET}", acc)


@check("properties", "训练不超过步数预算", "每次更新调用一次 report(step, loss)，step 从 0、1、2 依次递增。最多使用 1500 步。")
def budget(sub):
    points = main_run(sub)["points"]
    true(len(points) >= 1, "train 未调用 report(step, loss)", "至少调用 1 次", 0)
    true(len(points) <= BUDGET, f"train 使用了 {len(points)} 步，预算为 {BUDGET}", f"<= {BUDGET}", len(points))
    steps = [point[0] for point in points]
    equal(steps, list(range(len(points))), what="传给 report 的步数编号")


@check("properties", "报告的损失下降", "梯度下降必须降低损失。最后 10 次报告损失的均值必须低于首次损失。")
def loss_goes_down(sub):
    losses = np.array([point[1] for point in main_run(sub)["points"]])
    true(losses.size >= 1 and np.all(np.isfinite(losses)), "报告的损失含 NaN 或无穷值", "有限的损失值", losses)
    true(np.mean(losses[-10:]) < losses[0], "损失没有下降", f"低于 {losses[0]:.4f}", float(np.mean(losses[-10:])))


@check("properties", "相同种子得到相同模型", "所有随机数均取自 rng 参数。相同种子的两次运行应得到相同的预测。")
def deterministic(sub):
    run = main_run(sub)
    X, y = train_data()
    model, points = fresh_run(sub, X, y, 1)
    X_test, _ = held_out()
    equal(np.asarray(sub.predict(model, X_test)), np.asarray(sub.predict(run["model"], X_test)), what="第二次运行的预测")
    equal([point[1] for point in points], [point[1] for point in run["points"]], what="第二次运行的损失")


@check("properties", "输入不变", "不得修改 X 或 y。改变数据时创建新数组。")
def inputs_unchanged(sub):
    run = main_run(sub)
    equal(run["X_in"], run["X"], what="train 后的 X")
    equal(run["y_in"], run["y"], what="train 后的 y")


@check("edge", "各螺旋臂中心线上的点", "螺旋臂中心线上无噪声的点应得到该臂的标签。48 个点中至少 44 个必须正确，也包括两臂靠近的内圈。")
def arm_center_lines(sub):
    labels = np.asarray(sub.predict(main_run(sub)["model"], ARMS))
    shape(labels, ARM_LABELS.shape, what="两条螺旋臂上 48 个点的标签")
    correct = int(np.sum(labels == ARM_LABELS))
    true(correct >= 44, f"螺旋臂上 48 个点中只有 {correct} 个标签正确", ">= 44", correct)


@check("edge", "单点的 predict", "predict 必须支持单行输入，并返回形状 (1,)。")
def one_point(sub):
    labels = np.asarray(sub.predict(main_run(sub)["model"], ARMS[5:6]))
    shape(labels, (1,), what="单个点的标签")


@check("edge", "较小数据集与新种子", "训练不能依赖某个碰巧成功的种子。使用 300 个点和另一个种子时，模型也必须达到目标。")
def other_seed(sub):
    X, y = make_spirals(300, np.random.default_rng(5))
    model, _ = fresh_run(sub, X, y, 7)
    X_test, y_test = held_out()
    acc = accuracy(sub, model, X_test, y_test)
    true(acc >= TARGET, f"留出集准确率 {acc:.3f} 低于 {TARGET}", f">= {TARGET}", acc)


@fixture("held_out")
def reference_score(ref):
    X, y = train_data()
    model = ref.train(X, y, np.random.default_rng(1))
    X_test, y_test = held_out()
    yield {"target": TARGET}, float(np.mean(ref.predict(model, X_test) == y_test))


@check("reference", "留出集准确率达到目标", "检查器在 train 从未见过的 2000 个新点上评估模型。准确率必须至少为 0.95。")
def held_out_accuracy(sub):
    (case, reference), = fixtures("held_out")
    run = main_run(sub)
    X_test, y_test = held_out()
    acc = accuracy(sub, run["model"], X_test, y_test)
    true(acc >= case["target"], f"留出集准确率 {acc:.3f} 低于 {case['target']}。参考解达到 {reference:.3f}", f">= {case['target']}", acc)
