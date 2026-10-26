import numpy as np

from practice_check import check, close, equal, fixture, fixtures, shape, true

X_EX = np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 1.0], [5.0, 5.0], [6.0, 5.0], [5.0, 6.0]])
C_EX = np.array([[0.0, 0.0], [1.0, 1.0]])
X_LINE = np.array([[0.0], [1.0], [2.0], [10.0], [11.0], [12.0], [20.0]])
C_LINE = np.array([[0.0], [1.0], [2.0]])


def blobs(seed, n_per, k, d):
    rng = np.random.default_rng(seed)
    centers = rng.normal(size=(k, d)) * 6.0
    return np.vstack([c + rng.normal(size=(n_per, d)) for c in centers])


def inertia(X, assignments, centroids):
    return float(np.sum((X - centroids[assignments]) ** 2))


@check("examples", "分配步骤中的距离平局", "每个点都分配到平方距离最小的质心。[1, 0] 和 [0, 1] 到两个质心距离相同，因此按规则分到较小索引 0。")
def example_assign(sub):
    equal(np.asarray(sub.assign(X_EX.copy(), C_EX.copy())).tolist(), [0, 0, 0, 1, 1, 1], what="分配结果")


@check("examples", "更新步骤", "每个新质心都是分配给该簇的数据点的均值。")
def example_update(sub):
    result = sub.update(X_EX.copy(), np.array([0, 0, 0, 1, 1, 1]), C_EX.copy())
    close(result, [[0.33333333, 0.33333333], [5.33333333, 5.33333333]], rtol=1e-7, what="新质心")


@check("examples", "对直线上的点执行完整聚类", "交替执行质心更新和点分配。分配结果不再变化时停止，并返回更新步数。")
def example_kmeans(sub):
    centroids, assignments, iters = sub.kmeans(X_LINE.copy(), C_LINE.copy())
    close(centroids, [[0.0], [1.5], [13.25]], what="最终质心")
    equal(np.asarray(assignments).tolist(), [0, 1, 1, 2, 2, 2, 2], what="最终分配")
    equal(int(iters), 2, what="迭代次数")


@check("properties", "分配结果与逐点计算一致", "每个点都应分配到欧氏距离最近的质心索引。")
def assign_matches_loop(sub):
    rng = np.random.default_rng(0)
    X = rng.normal(size=(30, 3))
    C = rng.normal(size=(5, 3))
    result = np.asarray(sub.assign(X, C))
    shape(result, (30,), what="分配结果")
    expected = [int(np.argmin([np.sum((x - c) ** 2) for c in C])) for x in X]
    equal(result.tolist(), expected, what="分配结果")


@check("properties", "最终状态一致", "算法结束时，每个点都应属于最近的质心；非空簇的质心应等于簇内点的均值。")
def final_consistent(sub):
    X = blobs(1, 15, 3, 2)
    rng = np.random.default_rng(11)
    init = X[rng.choice(len(X), size=3, replace=False)]
    centroids, assignments, _ = sub.kmeans(X, init)
    assignments = np.asarray(assignments)
    equal(np.asarray(sub.assign(X, centroids)).tolist(), assignments.tolist(), what="assign(X, 最终质心)")
    for j in range(3):
        members = X[assignments == j]
        if len(members):
            close(centroids[j], members.mean(axis=0), rtol=1e-9, what=f"质心 {j}")


@check("properties", "每一步都不会增大 inertia", "分配和更新步骤都会降低平方距离总和，或保持不变。")
def inertia_falls(sub):
    X = blobs(2, 12, 4, 3)
    centroids = X[:4].copy()
    assignments = np.asarray(sub.assign(X, centroids))
    previous = inertia(X, assignments, centroids)
    for _ in range(6):
        centroids = np.asarray(sub.update(X, assignments, centroids))
        after_update = inertia(X, assignments, centroids)
        assignments = np.asarray(sub.assign(X, centroids))
        after_assign = inertia(X, assignments, centroids)
        true(after_update <= previous + 1e-9, "更新步骤增大了簇内平方距离之和", previous, after_update)
        true(after_assign <= after_update + 1e-9, "分配步骤增大了簇内平方距离之和", after_update, after_assign)
        previous = after_assign


@check("properties", "输入保持不变", "如果函数修改输入数组，就会破坏调用代码。请返回新数组。")
def inputs_unchanged(sub):
    X = np.array([[0.0, 1.0], [2.0, 0.0], [9.0, 9.0], [8.0, 10.0]])
    C = np.array([[0.0, 0.0], [10.0, 10.0]])
    labels = np.array([0, 0, 1, 1])
    saved_x, saved_c, saved_l = X.copy(), C.copy(), labels.copy()
    sub.assign(X, C)
    sub.update(X, labels, C)
    sub.kmeans(X, C)
    close(X, saved_x, rtol=0, atol=0, what="调用后的 X")
    close(C, saved_c, rtol=0, atol=0, what="调用后的质心")
    equal(labels.tolist(), saved_l.tolist(), what="调用后的分配结果")


@check("edge", "空簇保留原质心", "没有点分配给质心时，更新步骤应保留旧质心。空集合的均值未定义，NumPy 会返回 NaN。")
def empty_cluster(sub):
    C = np.array([[0.0, 0.0], [100.0, -100.0], [5.0, 5.0]])
    result = sub.update(X_EX.copy(), np.array([0, 0, 0, 2, 2, 2]), C.copy())
    close(result, [[0.33333333, 0.33333333], [100.0, -100.0], [5.33333333, 5.33333333]], rtol=1e-7, what="新质心")
    centroids, assignments, iters = sub.kmeans(X_EX.copy(), C)
    close(centroids[1], [100.0, -100.0], what="运行后远离数据的质心")
    equal(np.asarray(assignments).tolist(), [0, 0, 0, 2, 2, 2], what="分配结果")
    equal(int(iters), 1, what="迭代次数")


@check("edge", "距离平局时选择较小索引", "两个质心距离相同时，np.argmin 会选择第一个。其他选择会违反平局规则。")
def ties(sub):
    X = np.array([[0.0, 0.0], [2.0, 0.0], [1.0, 1.0]])
    C = np.array([[1.0, 0.0], [-1.0, 0.0], [1.0, 0.0]])
    equal(np.asarray(sub.assign(X, C)).tolist(), [0, 0, 0], what="分配结果")


@check("edge", "运行在 max_iterations 时停止", "max_iterations = 1 时，kmeans 只执行一次更新并返回 1，即使簇分配仍在变化。")
def max_iterations(sub):
    centroids, assignments, iters = sub.kmeans(X_LINE.copy(), C_LINE.copy(), max_iterations=1)
    close(centroids, [[0.0], [1.0], [11.0]], what="质心")
    equal(np.asarray(assignments).tolist(), [0, 1, 1, 2, 2, 2, 2], what="这些质心对应的分配结果")
    equal(int(iters), 1, what="迭代次数")


@check("edge", "只有一个簇", "k = 1 时所有点都分到簇 0，质心是所有点的均值。")
def one_cluster(sub):
    centroids, assignments, iters = sub.kmeans(X_EX.copy(), np.array([[9.0, -9.0]]))
    close(centroids, [X_EX.mean(axis=0)], rtol=1e-9, what="质心")
    equal(np.asarray(assignments).tolist(), [0] * 6, what="分配结果")
    equal(int(iters), 1, what="迭代次数")


@fixture("runs")
def runs(ref):
    rng = np.random.default_rng(42)
    for n_per, k, d, max_iterations in [(4, 2, 2, 100), (8, 3, 2, 100), (6, 4, 3, 100), (10, 3, 5, 3), (5, 5, 2, 100)]:
        X = blobs(int(rng.integers(0, 1000)), n_per, k, d)
        init = X[rng.choice(len(X), size=k, replace=False)] + rng.normal(size=(k, d)) * 0.1
        labels = rng.integers(0, k, size=len(X))
        centroids, assignments, iters = ref.kmeans(X, init, max_iterations=max_iterations)
        yield {"X": X, "init": init, "labels": labels, "max_iterations": max_iterations}, {
            "assign": ref.assign(X, init),
            "update": ref.update(X, labels, init),
            "centroids": centroids,
            "assignments": assignments,
            "iters": int(iters),
        }


@check("reference", "分配和更新步骤与参考实现一致", "随机数据上的两步结果与参考实现一致。")
def reference_steps(sub):
    for case, expected in fixtures("runs"):
        label = f"X 形状为 {case['X'].shape}、k = {case['init'].shape[0]}"
        equal(np.asarray(sub.assign(case["X"], case["init"])).tolist(), expected["assign"].tolist(), what=f"{label} 时的分配结果")
        close(sub.update(case["X"], case["labels"], case["init"]), expected["update"], rtol=1e-9, what=f"{label} 时更新后的质心")


@check("reference", "完整聚类与参考实现一致", "kmeans 返回的质心、分配结果和迭代次数都与参考实现一致。")
def reference_runs(sub):
    for case, expected in fixtures("runs"):
        label = f"X 形状为 {case['X'].shape}、k = {case['init'].shape[0]}"
        centroids, assignments, iters = sub.kmeans(case["X"], case["init"], max_iterations=case["max_iterations"])
        close(centroids, expected["centroids"], rtol=1e-9, what=f"{label} 时的质心")
        equal(np.asarray(assignments).tolist(), expected["assignments"].tolist(), what=f"{label} 时的分配结果")
        equal(int(iters), expected["iters"], what=f"{label} 时的迭代次数")
