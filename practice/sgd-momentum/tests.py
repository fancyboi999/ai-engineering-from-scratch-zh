import numpy as np

from practice_check import check, close, fixture, fixtures, shape, true

A = np.array([[3.0, 0.0], [0.0, 1.0]])
B = np.array([3.0, -1.0])
X0 = np.array([0.0, 0.0])


def spd(rng, d):
    q = rng.normal(size=(d, d))
    return q @ q.T / d + 0.5 * np.eye(d)


@check("examples", '执行一步 momentum 更新', '新速度等于 beta 乘旧速度再加上梯度。参数随后沿新速度移动 lr 倍。')
def example_step(sub):
    params, velocity = sub.momentum_step(np.array([1.0, -2.0]), np.array([0.5, 0.5]), np.array([1.0, 0.0]), lr=0.1, beta=0.9)
    close(params, [0.86, -2.05], what="更新后的参数")
    close(velocity, [1.4, 0.5], what="更新后的速度")


@check("examples", '在示例二次函数上执行三步', '轨迹从 x0 开始。之后每行都是再执行一步更新后的位置，梯度为 A x - b。')
def example_trajectory(sub):
    expected = [[0.0, 0.0], [0.3, -0.1], [0.78, -0.28], [1.278, -0.514]]
    close(sub.minimize_quadratic(A, B, X0, lr=0.1, beta=0.9, steps=3), expected, what="轨迹")


@check("examples", '在示例二次函数上执行三步 Nesterov 更新', 'Nesterov momentum 在前瞻点 x - lr * beta * velocity 处计算梯度。')
def example_nesterov(sub):
    expected = [[0.0, 0.0], [0.3, -0.1], [0.699, -0.271], [1.04067, -0.48241]]
    close(sub.minimize_quadratic(A, B, X0, lr=0.1, beta=0.9, steps=3, nesterov=True), expected, what="Nesterov 更新的轨迹")


@check("properties", 'beta 为 0 时就是普通梯度下降', 'beta 为 0 时，速度就是梯度，因此更新为 params 减 lr 乘梯度。')
def beta_zero(sub):
    rng = np.random.default_rng(3)
    params = rng.normal(size=(3, 2))
    grads = rng.normal(size=(3, 2))
    new_params, velocity = sub.momentum_step(params, grads, rng.normal(size=(3, 2)), lr=0.05, beta=0.0)
    close(new_params, params - 0.05 * grads, what="beta 为 0 时的参数")
    close(velocity, grads, what="beta 为 0 时的速度")


@check("properties", '恒定梯度会累积为几何级数速度', '梯度 g 连续作用 k 步后，速度为 g 乘 (1 - beta^k) 再除以 (1 - beta)。课程定义不会将梯度乘以 1 - beta。')
def geometric_velocity(sub):
    grads = np.array([2.0, -1.0])
    params = np.zeros(2)
    velocity = np.zeros(2)
    for _ in range(5):
        params, velocity = sub.momentum_step(params, grads, velocity, lr=0.1, beta=0.8)
    close(velocity, grads * (1 - 0.8 ** 5) / (1 - 0.8), what="5 步更新后的速度")


@check("properties", '轨迹会到达极小值', '二次函数的极小值满足 A x = b。学习率足够小时，轨迹最终应到达此处。')
def converges(sub):
    rng = np.random.default_rng(4)
    a = spd(rng, 3)
    b = rng.normal(size=3)
    for nesterov in (False, True):
        path = sub.minimize_quadratic(a, b, np.zeros(3), lr=0.1, beta=0.8, steps=300, nesterov=nesterov)
        shape(path, (301, 3), what="轨迹")
        close(path[-1], np.linalg.solve(a, b), atol=1e-6, what=f"nesterov={nesterov} 时轨迹的最后一个点")


@check("properties", '输入不会被修改', '更新函数会返回新数组，不能修改 params、grads、velocity 或 x0。')
def inputs_unchanged(sub):
    params = np.array([1.0, 2.0])
    grads = np.array([0.5, -0.5])
    velocity = np.array([0.1, 0.2])
    x0 = np.array([0.5, 0.5])
    saved = [params.copy(), grads.copy(), velocity.copy(), x0.copy()]
    sub.momentum_step(params, grads, velocity, lr=0.1, beta=0.9)
    sub.minimize_quadratic(A, B, x0, lr=0.1, beta=0.9, steps=4)
    for name, before, after in zip(["params", "grads", "velocity", "x0"], saved, [params, grads, velocity, x0]):
        close(after, before, atol=0, rtol=0, what=f"调用后的 {name}")


@check("edge", '步数为 0 时只返回起点', '轨迹有 steps + 1 行。steps 为 0 时，轨迹只包含 x0。')
def zero_steps(sub):
    path = sub.minimize_quadratic(A, B, np.array([2.0, 5.0]), lr=0.1, beta=0.9, steps=0)
    close(path, [[2.0, 5.0]], what="更新步数为 0 时的轨迹")


@check("edge", '从极小值开始不会移动', '极小值处梯度为 0，初始速度也为 0，因此每个位置都相同。')
def start_at_minimum(sub):
    for nesterov in (False, True):
        path = sub.minimize_quadratic(A, B, np.array([1.0, -1.0]), lr=0.1, beta=0.9, steps=5, nesterov=nesterov)
        close(path, np.tile([1.0, -1.0], (6, 1)), atol=1e-12, what=f"nesterov={nesterov} 时的轨迹")


@check("edge", 'Nesterov 且 beta 为 0 时等同于普通梯度下降', 'beta 为 0 时，前瞻位置就是 x，因此两种方法的轨迹相同。')
def nesterov_beta_zero(sub):
    a = np.array([[2.0]])
    b = np.array([4.0])
    plain = sub.minimize_quadratic(a, b, np.array([0.0]), lr=0.2, beta=0.0, steps=6)
    ahead = sub.minimize_quadratic(a, b, np.array([0.0]), lr=0.2, beta=0.0, steps=6, nesterov=True)
    shape(plain, (7, 1), what="一维问题的轨迹")
    close(ahead, plain, what="beta 为 0 时 Nesterov 更新的轨迹")
    true(abs(plain[-1, 0] - 2.0) < abs(plain[1, 0] - 2.0), "轨迹没有向极小值点 x = 2 移动", 2.0, plain[-1, 0])


@fixture("steps")
def steps(ref):
    rng = np.random.default_rng(11)
    for shp, lr, beta in [((4,), 0.1, 0.9), ((2, 3), 0.01, 0.5), ((5,), 0.3, 0.99)]:
        params = rng.normal(size=shp)
        grads = rng.normal(size=shp)
        velocity = rng.normal(size=shp)
        yield {"params": params, "grads": grads, "velocity": velocity, "lr": lr, "beta": beta}, ref.momentum_step(params, grads, velocity, lr, beta)


@fixture("paths")
def paths(ref):
    rng = np.random.default_rng(12)
    for d, lr, beta, n, nesterov in [(2, 0.1, 0.9, 8, False), (3, 0.05, 0.7, 10, True), (4, 0.2, 0.5, 6, False), (3, 0.1, 0.95, 12, True)]:
        a = spd(rng, d)
        b = rng.normal(size=d)
        x0 = rng.normal(size=d)
        yield {"A": a, "b": b, "x0": x0, "lr": lr, "beta": beta, "steps": n, "nesterov": nesterov}, ref.minimize_quadratic(a, b, x0, lr, beta, n, nesterov)


@check("reference", 'Momentum 更新与参考实现一致', '对于随机数组，更新后的参数和速度都与参考实现一致。')
def reference_steps(sub):
    for case, expected in fixtures("steps"):
        params, velocity = sub.momentum_step(case["params"], case["grads"], case["velocity"], lr=case["lr"], beta=case["beta"])
        close(params, expected[0], rtol=1e-9, what=f"lr 为 {case['lr']}、beta 为 {case['beta']} 时的参数")
        close(velocity, expected[1], rtol=1e-9, what=f"lr 为 {case['lr']}、beta 为 {case['beta']} 时的速度")


@check("reference", '轨迹与参考实现一致', '对于随机二次函数，无论是否使用 Nesterov，轨迹点都与参考实现一致。')
def reference_paths(sub):
    for case, expected in fixtures("paths"):
        path = sub.minimize_quadratic(case["A"], case["b"], case["x0"], lr=case["lr"], beta=case["beta"], steps=case["steps"], nesterov=case["nesterov"])
        close(path, expected, rtol=1e-9, atol=1e-12, what=f"nesterov={case['nesterov']}、beta 为 {case['beta']} 时的轨迹")
