import numpy as np

from practice_check import check, close, equal, fixture, fixtures, true

X_1D = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0])
Y_EX = np.array([0, 0, 1, 0, 1, 1])
X_2D = np.array([[1.0, 1.0], [2.0, 2.0], [3.0, 9.0], [4.0, 3.0], [5.0, 8.0], [6.0, 7.0]])


def brute_best(X, y):
    n, d = X.shape
    best = None
    for f in range(d):
        values = np.unique(X[:, f])
        for i in range(len(values) - 1):
            t = (values[i] + values[i + 1]) / 2.0
            score = 0.0
            for side in (y[X[:, f] <= t], y[X[:, f] > t]):
                if len(side):
                    p = np.array([np.mean(side == c) for c in np.unique(side)])
                    score += len(side) / n * (1.0 - np.sum(p ** 2))
            if best is None or score < best[2] - 1e-12:
                best = (f, t, score)
    return best


def check_split(result, expected, what):
    if expected is None:
        true(result is None, f"{what} 必须为 None", None, result)
        return
    true(result is not None and len(result) == 3, f"{what} 必须为元组 (feature, threshold, impurity)", expected, result)
    equal(int(result[0]), int(expected[0]), what=f"{what} 的特征索引")
    close(result[1], expected[1], rtol=1e-12, what=f"{what} 的阈值")
    close(result[2], expected[2], rtol=1e-9, atol=1e-12, what=f"{what} 的不纯度")


@check("examples", "六个标签的基尼不纯度", "基尼不纯度等于 1 减去各类别占比的平方和。这里的占比分别为 2/6、3/6 和 1/6。")
def example_gini(sub):
    close(sub.gini_impurity(np.array([0, 0, 1, 1, 1, 2])), 0.6111111111111112, rtol=1e-12, what="不纯度")


@check("examples", "出现平局时的最佳阈值", "阈值 2.5 和 4.5 的加权不纯度均为 0.25。根据平局规则，保留较小的阈值。")
def example_threshold(sub):
    close(sub.split_impurity(X_1D.copy(), Y_EX.copy(), 2.5), 0.25, rtol=1e-12, what="阈值为 2.5 时的加权不纯度")
    result = sub.best_threshold(X_1D.copy(), Y_EX.copy())
    true(result is not None and len(result) == 2, "best_threshold 必须返回元组 (threshold, impurity)", (2.5, 0.25), result)
    close(result[0], 2.5, what="阈值")
    close(result[1], 0.25, rtol=1e-12, what="不纯度")


@check("examples", "两个特征中的最佳切分", "特征 1 在阈值 5.0 处完全分开两个类别，因此加权不纯度为 0。")
def example_split(sub):
    check_split(sub.best_split(X_2D.copy(), Y_EX.copy()), (1, 5.0, 0.0), "最佳切分")


@check("properties", "基尼不纯度在规定范围内", "纯标签集的基尼不纯度为 0。对于 C 个类别，不纯度最大为 1 - 1/C。它与标签顺序无关。")
def gini_range(sub):
    rng = np.random.default_rng(0)
    for c in [2, 3, 5]:
        labels = rng.integers(0, c, size=40)
        value = sub.gini_impurity(labels)
        true(0.0 <= value <= 1.0 - 1.0 / c + 1e-12, f"{c} 个类别的不纯度超出了 [0, 1 - 1/C]", f"0 到 {1.0 - 1.0 / c:.4f}", value)
        close(sub.gini_impurity(rng.permutation(labels)), value, rtol=1e-12, what="打乱标签顺序后的不纯度")
    close(sub.gini_impurity(np.array([4, 4, 4])), 0.0, what="纯标签集的不纯度")
    close(sub.gini_impurity(np.array([0, 1, 2, 3])), 0.75, rtol=1e-12, what="四个等量类别的不纯度")


@check("properties", "最佳切分的不纯度不高于父节点", "最佳切分的加权不纯度不应超过全部标签的不纯度。")
def no_worse_than_parent(sub):
    rng = np.random.default_rng(1)
    for _ in range(4):
        X = rng.normal(size=(15, 3))
        y = rng.integers(0, 3, size=15)
        result = sub.best_split(X, y)
        true(result is not None, "数据包含多个不同值，但 best_split 返回了 None", "一个切分", result)
        true(result[2] <= sub.gini_impurity(y) + 1e-12, "最佳切分的不纯度大于父节点", sub.gini_impurity(y), result[2])


@check("properties", "结果与遍历所有候选项的搜索一致", "尝试每个特征，以及排序去重后每对相邻值的中点。保留加权不纯度最低的切分。")
def matches_brute(sub):
    rng = np.random.default_rng(2)
    for _ in range(3):
        X = np.round(rng.normal(size=(12, 3)), 1)
        y = rng.integers(0, 2, size=12)
        check_split(sub.best_split(X, y), brute_best(X, y), "最佳切分")


@check("properties", "结果与行顺序无关", "对每个特征的唯一值排序。改变样本行顺序不应改变答案。")
def row_order(sub):
    rng = np.random.default_rng(3)
    X = rng.normal(size=(10, 2))
    y = rng.integers(0, 2, size=10)
    order = rng.permutation(10)
    check_split(sub.best_split(X[order], y[order]), sub.best_split(X, y), "打乱行顺序后的切分")


@check("properties", "输入未被修改", "函数写入输入数组会破坏调用方的代码。")
def inputs_unchanged(sub):
    X = np.array([[3.0, 1.0], [1.0, 2.0], [2.0, 0.5]])
    y = np.array([1, 0, 1])
    saved_x, saved_y = X.copy(), y.copy()
    sub.gini_impurity(y)
    sub.split_impurity(X[:, 0], y, 1.5)
    sub.best_threshold(X[:, 0], y)
    sub.best_split(X, y)
    close(X, saved_x, rtol=0, atol=0, what="调用后的 X")
    equal(y.tolist(), saved_y.tolist(), what="调用后的 y")


@check("edge", "空集合的不纯度为 0", "没有标签的集合没有不纯度。返回 0.0，不要除以 0。")
def empty_labels(sub):
    close(sub.gini_impurity(np.array([], dtype=int)), 0.0, what="空集合的不纯度")


@check("edge", "常量特征没有切分点", "只有一个唯一值的特征没有中点。best_threshold 返回 None，best_split 跳过该特征。")
def constant_features(sub):
    true(sub.best_threshold(np.array([3.0, 3.0, 3.0]), np.array([0, 1, 0])) is None, "常量特征的 best_threshold 必须为 None", None, sub.best_threshold(np.array([3.0, 3.0, 3.0]), np.array([0, 1, 0])))
    check_split(sub.best_split(np.array([[1.0, 5.0]]), np.array([1])), None, "单行数据的切分")
    X = np.array([[7.0, 1.0], [7.0, 2.0], [7.0, 3.0], [7.0, 4.0]])
    check_split(sub.best_split(X, np.array([0, 0, 1, 1])), (1, 2.5, 0.0), "第 0 个特征为常量时的切分")


@check("edge", "特征间平局时保留索引最小的特征", "当两个特征的不纯度相同时，保留先出现的特征。只有新不纯度比当前最佳值低超过 1e-12 时才替换。")
def feature_tie(sub):
    X = np.array([[1.0, 1.0], [2.0, 2.0], [3.0, 3.0], [4.0, 4.0]])
    check_split(sub.best_split(X, np.array([0, 0, 1, 1])), (0, 2.5, 0.0), "两个相同特征的切分")
    X = np.array([[1.0, 4.0], [2.0, 3.0], [3.0, 2.0], [4.0, 1.0]])
    check_split(sub.best_split(X, np.array([0, 1, 0, 1])), (0, 1.5, 0.3333333333333333), "两个镜像特征的切分")


@check("edge", "重复特征值和非 0、1 标签", "用特征去重后的值计算中点。标签可以是任意整数。")
def repeated_values(sub):
    x = np.array([1.0, 1.0, 1.0, 2.0, 2.0, 5.0])
    y = np.array([7, 7, 3, 3, 3, 3])
    result = sub.best_threshold(x, y)
    true(result is not None and len(result) == 2, "best_threshold 必须返回元组 (threshold, impurity)", (1.5, 0.2222222222222222), result)
    close(result[0], 1.5, what="阈值")
    close(result[1], 0.2222222222222222, rtol=1e-9, what="不纯度")


@fixture("datasets")
def datasets(ref):
    rng = np.random.default_rng(42)
    for n, d, c, decimals in [(6, 1, 2, 1), (10, 2, 2, 0), (15, 3, 3, 1), (20, 4, 2, 0), (12, 5, 4, 2), (25, 2, 3, 0)]:
        X = np.round(rng.normal(size=(n, d)) * 3.0, decimals)
        y = rng.integers(0, c, size=n)
        thresholds = [ref.best_threshold(X[:, f], y) for f in range(d)]
        yield {"X": X, "y": y}, {"split": ref.best_split(X, y), "thresholds": thresholds}


@check("reference", "最佳阈值与参考解一致", "每个特征的最佳阈值应与参考解一致。许多特征包含重复值，也会产生并列切分。")
def reference_thresholds(sub):
    for case, expected in fixtures("datasets"):
        for f, want in enumerate(expected["thresholds"]):
            got = sub.best_threshold(case["X"][:, f], case["y"])
            label = f"形状为 {case['X'].shape} 的 X 的第 {f} 个特征"
            if want is None:
                true(got is None, f"{label} 的 best_threshold 必须为 None", None, got)
                continue
            true(got is not None and len(got) == 2, f"{label} 的 best_threshold 必须返回元组", want, got)
            close(got[0], want[0], rtol=1e-12, what=f"{label} 的阈值")
            close(got[1], want[1], rtol=1e-9, atol=1e-12, what=f"{label} 的不纯度")


@check("reference", "最佳切分与参考解一致", "在随机数据集上，最佳切分应与参考解一致。")
def reference_splits(sub):
    for case, expected in fixtures("datasets"):
        check_split(sub.best_split(case["X"], case["y"]), expected["split"], f"形状为 {case['X'].shape} 的 X 的切分")
