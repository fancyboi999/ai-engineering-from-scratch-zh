import numpy as np

from practice_check import check, close, fixture, fixtures, shape, true

X0 = np.array([[0.0, 1.0], [2.0, -1.0]])
X1 = np.array([[1.0, 1.0], [0.0, 3.0]])
T2 = np.array([0.25, 0.5])


def half_x(x, t):
    return 0.5 * x


def linear_field(x, t):
    return -0.3 * x + np.sin(3.0 * t).reshape((-1,) + (1,) * (x.ndim - 1))


@check("examples", '两对样本的插值与目标速度', 'x_t 等于 (1 - t) * x0 + t * x1，每行使用一个 t。目标速度为 x1 - x0。')
def example_interp(sub):
    close(sub.interpolate(X0, X1, T2), [[0.25, 1.0], [1.0, 1.0]], rtol=1e-12, what="x_t")
    close(sub.target_velocity(X0, X1), [[1.0, 0.0], [-2.0, 4.0]], rtol=1e-12, what="目标速度")


@check("examples", 'v(x, t) = 0.5 x 时的 flow matching 损失', '在 x_t 处计算速度。对每个样本沿特征轴求误差平方和，再对批次求均值。')
def example_loss(sub):
    close(sub.flow_matching_loss(half_x, X0, X1, T2), 9.7578125, rtol=1e-12, what="损失")


@check("examples", '对 dx/dt = x 和 dx/dt = t 进行 Euler 积分', '第 k 步在 t = k / n 时读取速度，并将 x 沿该速度移动 1 / n。v = x 且执行 4 步时，x 连乘 1.25 四次。v = t 时，x 等于 (0 + 0.25 + 0.5 + 0.75) / 4。')
def example_euler(sub):
    close(sub.euler_sample(lambda x, t: x, np.array([[1.0]]), 4), [[2.44140625]], rtol=1e-12, what="v = x 时的样本")
    close(sub.euler_sample(lambda x, t: np.ones_like(x) * t[:, None], np.array([[0.0]]), 4), [[0.375]], rtol=1e-12, what="v = t 时的样本")


@check("properties", '路径从 x0 开始并在 x1 结束', 't = 0 时插值结果为 x0，t = 1 时为 x1。标量 t 会应用于每一行。')
def endpoints(sub):
    rng = np.random.default_rng(0)
    x0 = rng.normal(size=(3, 2, 2))
    x1 = rng.normal(size=(3, 2, 2))
    close(sub.interpolate(x0, x1, 0.0), x0, atol=1e-12, what="t = 0 时的 x_t")
    close(sub.interpolate(x0, x1, 1.0), x1, atol=1e-12, what="t = 1 时的 x_t")
    mixed = sub.interpolate(x0, x1, np.array([0.0, 1.0, 0.5]))
    shape(mixed, (3, 2, 2), what="每行使用一个 t 时的 x_t")
    close(np.asarray(mixed)[2], (x0[2] + x1[2]) / 2, atol=1e-12, what="第 2 行的中点")


@check("properties", '精确直线速度对应损失 0', '直线路径的速度恒定，等于 x1 - x0。速度函数若返回该值，则任意 t 下的损失都为 0。')
def exact_velocity_zero_loss(sub):
    rng = np.random.default_rng(1)
    x0 = rng.normal(size=(5, 3))
    x1 = rng.normal(size=(5, 3))
    t = rng.random(5)
    close(sub.flow_matching_loss(lambda x, tt: x1 - x0, x0, x1, t), 0.0, atol=1e-12, what="使用精确速度时的损失")
    close(sub.flow_matching_loss(lambda x, tt: np.zeros_like(x), x0, x1, t), float(np.mean(np.sum((x1 - x0) ** 2, axis=1))), rtol=1e-12, what="速度为 0 时的损失")


@check("properties", '使用精确直线速度的 Euler 积分会到达 x1', 'Euler 步在直线上是精确的。v = x1 - x0 时，无论执行几步（包括一步），采样器都会到达 x1。')
def euler_reaches_x1(sub):
    rng = np.random.default_rng(2)
    x0 = rng.normal(size=(4, 3))
    x1 = rng.normal(size=(4, 3))
    for n in [1, 3, 10]:
        close(sub.euler_sample(lambda x, t: x1 - x0, x0, n), x1, atol=1e-12, what=f"{n} 步后的样本")
    pull = lambda x, t: (x1 - x) / (1.0 - t)[:, None]
    close(sub.euler_sample(pull, x0, 5), x1, atol=1e-10, what="v = (x1 - x) / (1 - t) 时的样本")


@check("properties", '采样器为每行传入一个 t', '速度函数接收形状为 (B, ...) 的 x 和形状为 (B,) 的 t。t 的每一项都是当前时间 k / n。')
def euler_time_arg(sub):
    seen = []

    def record(x, t):
        seen.append(np.array(t, dtype=float))
        return np.zeros_like(x)

    sub.euler_sample(record, np.zeros((3, 2)), 4)
    true(len(seen) == 4, "采样器必须在每一步调用一次速度函数", 4, len(seen))
    for k, t in enumerate(seen):
        close(t, np.full(3, k / 4), atol=1e-12, what=f"第 {k} 步的 t")


@check("properties", '输入不会被修改', '采样器必须从 x0 的副本开始。原地更新会修改调用方数组。')
def inputs_unchanged(sub):
    rng = np.random.default_rng(3)
    x0 = rng.normal(size=(3, 2))
    x1 = rng.normal(size=(3, 2))
    t = rng.random(3)
    saved = [x0.copy(), x1.copy(), t.copy()]
    sub.interpolate(x0, x1, t)
    sub.flow_matching_loss(half_x, x0, x1, t)
    sub.euler_sample(half_x, x0, 3)
    for name, before, after in zip(["x0", "x1", "t"], saved, [x0, x1, t]):
        true(np.array_equal(before, after), f"函数修改了 {name}", before, after)


@check("edge", '多特征轴的单个样本', '损失沿第一个轴之后的每个轴累加误差平方，再对批次求均值。')
def one_sample(sub):
    x0 = np.zeros((1, 2, 2))
    x1 = np.ones((1, 2, 2))
    close(sub.flow_matching_loss(lambda x, t: np.zeros_like(x), x0, x1, np.array([0.3])), 4.0, rtol=1e-12, what="损失")


@check("edge", '采样器的整数输入', '即使 x0 为整数类型，采样器也必须用浮点数计算。')
def integer_input(sub):
    close(sub.euler_sample(lambda x, t: 0.5 * np.ones_like(x), np.array([[1, 2]]), 2), [[1.5, 2.5]], rtol=1e-12, what="样本")


@fixture("cases")
def cases(ref):
    rng = np.random.default_rng(42)
    for b, feat, n in [(1, (1,), 1), (4, (3,), 2), (3, (2, 2), 5), (6, (4,), 8)]:
        x0 = rng.normal(size=(b,) + feat)
        x1 = rng.normal(size=(b,) + feat)
        t = rng.random(b)
        yield {"x0": x0, "x1": x1, "t": t, "steps": n}, {"x_t": ref.interpolate(x0, x1, t), "loss": ref.flow_matching_loss(linear_field, x0, x1, t), "sample": ref.euler_sample(linear_field, x0, n)}


@check("reference", '4 个用例的插值、损失和采样结果与参考实现一致', '对于速度场 v(x, t) = -0.3 x + sin(3 t)，x_t、损失和 Euler 采样结果都与参考实现一致。')
def reference_cases(sub):
    for case, expected in fixtures("cases"):
        label = f"x0 形状为 {case['x0'].shape} 且执行 {case['steps']} 步"
        close(sub.interpolate(case["x0"], case["x1"], case["t"]), expected["x_t"], rtol=1e-12, atol=1e-12, what=f"{label} 时的 x_t")
        close(sub.flow_matching_loss(linear_field, case["x0"], case["x1"], case["t"]), expected["loss"], rtol=1e-10, what=f"{label} 时的损失")
        close(sub.euler_sample(linear_field, case["x0"], case["steps"]), expected["sample"], rtol=1e-10, atol=1e-12, what=f"{label} 时的样本")
