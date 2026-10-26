import numpy as np

import practice_check
from practice_check import check, clear_progress, close, equal, fixture, fixtures, progress, shape, true
from support import CENTERS, make_blobs

BUDGET = 500
TARGET_ACCURACY = 0.95
TARGET_LOG_LOSS = 0.11
HELD_OUT_SEED = 61021
_runs = {}


def train_data():
    return make_blobs(400, np.random.default_rng(0))


def held_out():
    return make_blobs(4000, np.random.default_rng(HELD_OUT_SEED))


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


def probabilities(sub, model, X):
    probs = np.asarray(sub.predict_proba(model, X), dtype=float)
    shape(probs, (X.shape[0], len(CENTERS)), what="predict_proba 返回的概率")
    return probs


def scores(sub, model, X, y):
    probs = probabilities(sub, model, X)
    accuracy = float(np.mean(np.argmax(probs, axis=1) == y))
    log_loss = float(-np.mean(np.log(np.maximum(probs[np.arange(y.size), y], 1e-15))))
    return accuracy, log_loss


@check("examples", "每个类别对应一个概率", "predict_proba 返回形状为 (N, 4) 的数组。第 i 行保存点 i 属于各类别的概率。")
def example_shape(sub):
    run = main_run(sub)
    probabilities(sub, run["model"], run["X"])


@check("examples", "模型拟合训练点", "训练后，训练准确率必须至少为 0.95，训练对数损失不超过 0.11。")
def example_train_scores(sub):
    run = main_run(sub)
    accuracy, log_loss = scores(sub, run["model"], run["X"], run["y"])
    true(accuracy >= TARGET_ACCURACY, f"训练准确率 {accuracy:.3f} 低于 {TARGET_ACCURACY}", f">= {TARGET_ACCURACY}", accuracy)
    true(log_loss <= TARGET_LOG_LOSS, f"训练对数损失 {log_loss:.4f} 高于 {TARGET_LOG_LOSS}", f"<= {TARGET_LOG_LOSS}", log_loss)


@check("properties", "每行概率之和为 1", "Softmax 给出 4 个类别的概率分布，因此每行的值在 0 到 1 之间，总和为 1。")
def rows_sum_to_one(sub):
    run = main_run(sub)
    probs = probabilities(sub, run["model"], run["X"])
    close(probs.sum(axis=1), np.ones(probs.shape[0]), atol=1e-9, what="各行之和")
    true(np.all(probs >= 0) and np.all(probs <= 1), "存在不在 0 到 1 之间的概率", "0 到 1 之间的值", probs)


@check("properties", "训练不超过步数预算", "每次更新调用一次 report(step, loss)，step 从 0、1、2 依次递增。最多使用 500 步。")
def budget(sub):
    points = main_run(sub)["points"]
    true(len(points) >= 1, "train 未调用 report(step, loss)", "至少调用 1 次", 0)
    true(len(points) <= BUDGET, f"train 使用了 {len(points)} 步，预算为 {BUDGET}", f"<= {BUDGET}", len(points))
    equal([point[0] for point in points], list(range(len(points))), what="传给 report 的步数编号")


@check("properties", "报告的损失下降", "梯度下降必须降低损失。最后 10 次报告损失的均值必须低于首次损失。")
def loss_goes_down(sub):
    losses = np.array([point[1] for point in main_run(sub)["points"]])
    true(losses.size >= 1 and np.all(np.isfinite(losses)), "报告的损失含 NaN 或无穷值", "有限的损失值", losses)
    true(np.mean(losses[-10:]) < losses[0], "损失没有下降", f"低于 {losses[0]:.4f}", float(np.mean(losses[-10:])))


@check("properties", "相同种子得到相同模型", "所有随机数均取自 rng 参数。相同种子的两次运行应得到相同的概率。")
def deterministic(sub):
    run = main_run(sub)
    X, y = train_data()
    model, points = fresh_run(sub, X, y, 1)
    X_test, _ = held_out()
    equal(probabilities(sub, model, X_test), probabilities(sub, run["model"], X_test), what="第二次运行的概率")
    equal([point[1] for point in points], [point[1] for point in run["points"]], what="第二次运行的损失")


@check("properties", "输入不变", "不得修改 X 或 y。缩放数据时创建新数组。")
def inputs_unchanged(sub):
    run = main_run(sub)
    equal(run["X_in"], run["X"], what="train 后的 X")
    equal(run["y_in"], run["y"], what="train 后的 y")


@check("edge", "每个点簇中心对应其自身类别", "点簇 k 中心处的点，其类别 k 的概率必须最大。")
def centers(sub):
    probs = probabilities(sub, main_run(sub)["model"], CENTERS)
    equal(np.argmax(probs, axis=1).tolist(), [0, 1, 2, 3], what="各中心处概率最大的类别")


@check("edge", "远离数据的点仍给出有限值", "远处点产生很大的分数。在 np.exp 前减去行最大值，否则概率会变成 NaN。")
def far_points(sub):
    far = np.array([[1000.0, 1000.0], [-800.0, 50.0], [3.0, -900.0]])
    probs = probabilities(sub, main_run(sub)["model"], far)
    true(np.all(np.isfinite(probs)), "概率中含 NaN 或无穷值", "有限值", probs)
    close(probs.sum(axis=1), np.ones(3), atol=1e-9, what="远处点的各行之和")


@check("edge", "某类别远比其他类别常见", "85% 的点属于类别 0 时，偏置必须学到类别频率。权重和偏置都要更新。")
def imbalanced(sub):
    weights = [0.85, 0.05, 0.05, 0.05]
    X, y = make_blobs(400, np.random.default_rng(11), weights=weights)
    model, _ = fresh_run(sub, X, y, 3)
    X_test, y_test = make_blobs(4000, np.random.default_rng(HELD_OUT_SEED + 1), weights=weights)
    accuracy, log_loss = scores(sub, model, X_test, y_test)
    true(accuracy >= TARGET_ACCURACY, f"留出集准确率 {accuracy:.3f} 低于 {TARGET_ACCURACY}", f">= {TARGET_ACCURACY}", accuracy)
    true(log_loss <= TARGET_LOG_LOSS, f"留出集对数损失 {log_loss:.4f} 高于 {TARGET_LOG_LOSS}", f"<= {TARGET_LOG_LOSS}", log_loss)


@check("edge", "单点的 predict_proba", "predict_proba 必须支持单行输入，并返回形状 (1, 4)。")
def one_point(sub):
    probabilities(sub, main_run(sub)["model"], CENTERS[2:3])


@check("edge", "较小数据集与新种子", "使用 200 个点和另一个种子时，模型也必须在留出集上达到两个目标。")
def other_seed(sub):
    X, y = make_blobs(200, np.random.default_rng(5))
    model, _ = fresh_run(sub, X, y, 7)
    X_test, y_test = held_out()
    accuracy, log_loss = scores(sub, model, X_test, y_test)
    true(accuracy >= TARGET_ACCURACY, f"留出集准确率 {accuracy:.3f} 低于 {TARGET_ACCURACY}", f">= {TARGET_ACCURACY}", accuracy)
    true(log_loss <= TARGET_LOG_LOSS, f"留出集对数损失 {log_loss:.4f} 高于 {TARGET_LOG_LOSS}", f"<= {TARGET_LOG_LOSS}", log_loss)


@fixture("held_out")
def reference_scores(ref):
    X, y = train_data()
    model = ref.train(X, y, np.random.default_rng(1))
    X_test, y_test = held_out()
    probs = ref.predict_proba(model, X_test)
    accuracy = float(np.mean(np.argmax(probs, axis=1) == y_test))
    log_loss = float(-np.mean(np.log(probs[np.arange(y_test.size), y_test])))
    yield {"accuracy": TARGET_ACCURACY, "log_loss": TARGET_LOG_LOSS}, {"accuracy": accuracy, "log_loss": log_loss}


@check("reference", "留出集准确率达到目标", "检查器在 train 从未见过的 4000 个新点上评估模型。准确率必须至少为 0.95。")
def held_out_accuracy(sub):
    (target, reference), = fixtures("held_out")
    X_test, y_test = held_out()
    accuracy, _ = scores(sub, main_run(sub)["model"], X_test, y_test)
    true(accuracy >= target["accuracy"], f"留出集准确率 {accuracy:.3f} 低于 {target['accuracy']}。参考解达到 {reference['accuracy']:.3f}", f">= {target['accuracy']}", accuracy)


@check("reference", "留出集对数损失达到目标", "对数损失是 4000 个新点上正确类别的负 log p 均值，必须不超过 0.11。预测正确但不确信的模型会有较高的对数损失。")
def held_out_log_loss(sub):
    (target, reference), = fixtures("held_out")
    X_test, y_test = held_out()
    _, log_loss = scores(sub, main_run(sub)["model"], X_test, y_test)
    true(log_loss <= target["log_loss"], f"留出集对数损失 {log_loss:.4f} 高于 {target['log_loss']}。参考解达到 {reference['log_loss']:.4f}", f"<= {target['log_loss']}", log_loss)
