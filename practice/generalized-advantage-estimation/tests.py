import numpy as np

from practice_check import check, close, fixture, fixtures, shape, true

R1 = np.array([1.0, 0.0, 1.0])
V1 = np.array([0.5, 0.4, 0.3, 0.2])
D1 = np.array([False, False, True])
R2 = np.array([1.0, 1.0, 1.0, 1.0])
V2 = np.array([1.0, 2.0, 1.0, 2.0, 3.0])
D2 = np.array([False, True, False, False])


def discounted_minus_values(rewards, values, dones, gamma):
    T = rewards.shape[0]
    G = values[T]
    out = np.zeros(T)
    for t in reversed(range(T)):
        G = rewards[t] + gamma * (0.0 if dones[t] else G)
        out[t] = G
    return out - values[:T]


@check("examples", "三步回合的 TD 误差", "delta[t] 等于 rewards[t] + gamma * values[t + 1] - values[t]。在终止步，下一状态价值按 0 处理。")
def example_td(sub):
    close(sub.td_errors(R1, V1, D1, 0.9), [0.86, -0.13, 0.7], what="TD 误差")


@check("examples", "三步回合的 GAE", "A[t] 等于 delta[t] + gamma * lam * A[t + 1]。回报等于优势值加上 values[t]。")
def example_gae(sub):
    adv, ret = sub.gae(R1, V1, D1, 0.9, 0.8)
    close(adv, [1.12928, 0.374, 0.7], what="优势值")
    close(ret, [1.62928, 0.774, 1.0], what="回报")


@check("examples", "带自举值的两个回合的 GAE", "第 1 步的终止标记会截断求和。最后一步没有终止标记，因此使用 values[T] 作为自举值。")
def example_two_episodes(sub):
    adv, ret = sub.gae(R2, V2, D2, 0.5, 0.5)
    close(adv, [0.75, -1.0, 1.125, 0.5], what="优势值")
    close(ret, [1.75, 1.0, 2.125, 2.5], what="回报")


@check("properties", "lam = 0 时得到 TD 误差", "当 lam = 0 时，后续的 delta 不参与求和。每个优势值就是一步 TD 误差。")
def lam_zero(sub):
    rng = np.random.default_rng(0)
    rewards, values = rng.normal(size=10), rng.normal(size=11)
    dones = rng.random(10) < 0.3
    adv, _ = sub.gae(rewards, values, dones, 0.95, 0.0)
    close(adv, sub.td_errors(rewards, values, dones, 0.95), what="lam = 0 时的优势值")


@check("properties", "lam = 1 时得到折扣回报减去状态价值", "当 lam = 1 时，TD 误差之和等于从 t 开始、以 values[T] 自举的折扣回报，再减去 values[t]。")
def lam_one(sub):
    rng = np.random.default_rng(1)
    rewards, values = rng.normal(size=10), rng.normal(size=11)
    dones = np.array([False, False, True, False, False, False, True, False, False, False])
    adv, _ = sub.gae(rewards, values, dones, 0.9, 1.0)
    close(adv, discounted_minus_values(rewards, values, dones, 0.9), what="lam = 1 时的优势值")


@check("properties", "优势值满足递推关系", "在最后一步之前，A[t] 等于 delta[t] + gamma * lam * A[t + 1]。在终止步，后续优势值项按 0 处理。")
def recursion(sub):
    rng = np.random.default_rng(2)
    rewards, values = rng.normal(size=12), rng.normal(size=13)
    dones = rng.random(12) < 0.25
    gamma, lam = 0.97, 0.9
    adv, ret = sub.gae(rewards, values, dones, gamma, lam)
    shape(adv, (12,), what="优势值")
    shape(ret, (12,), what="回报")
    delta = rewards + gamma * values[1:] * (1.0 - dones) - values[:-1]
    adv = np.asarray(adv, dtype=float)
    close(adv[:-1], delta[:-1] + gamma * lam * (1.0 - dones[:-1]) * adv[1:], what="delta[t] + gamma * lam * A[t + 1]")
    close(ret, adv + values[:12], what="优势值 + values[:T]")


@check("properties", "整批计算等于逐回合计算后拼接", "当每个回合都以终止标记结束时，整批的 GAE 等于分别计算各回合的 GAE 后按顺序拼接。")
def batch_is_concatenation(sub):
    rng = np.random.default_rng(3)
    lengths = [4, 1, 3]
    T = sum(lengths)
    rewards, values = rng.normal(size=T), rng.normal(size=T + 1)
    dones = np.zeros(T, dtype=bool)
    dones[np.cumsum(lengths) - 1] = True
    parts = []
    start = 0
    for n in lengths:
        ep_values = np.append(values[start:start + n], 0.0)
        parts.append(np.asarray(sub.gae(rewards[start:start + n], ep_values, dones[start:start + n], 0.9, 0.95)[0]))
        start += n
    close(sub.gae(rewards, values, dones, 0.9, 0.95)[0], np.concatenate(parts), what="整个批次的优势值")


@check("properties", "输入未被修改", "函数写入输入数组会破坏调用方的代码。")
def inputs_unchanged(sub):
    rewards, values, dones = R2.copy(), V2.copy(), D2.copy()
    sub.td_errors(rewards, values, dones, 0.5)
    sub.gae(rewards, values, dones, 0.5, 0.5)
    close(rewards, R2, atol=0, rtol=0, what="调用后的奖励数组")
    close(values, V2, atol=0, rtol=0, what="调用后的价值数组")
    true(np.array_equal(dones, D2), "dones 数组被修改", D2, dones)


@check("edge", "只有一步且没有终止标记", "单步未结束时会使用自举值：A = r + gamma * values[1] - values[0]。")
def single_step(sub):
    adv, ret = sub.gae(np.array([2.0]), np.array([1.0, 3.0]), np.array([False]), 0.5, 0.9)
    close(adv, [2.5], what="优势值")
    close(ret, [3.5], what="回报")


@check("edge", "每一步都终止", "当每一步都结束一个回合时，后续状态价值不参与计算。每个优势值等于 rewards[t] - values[t]。")
def done_every_step(sub):
    rewards = np.array([1.0, -1.0, 0.5])
    values = np.array([0.2, 0.4, -0.3, 9.0])
    adv, _ = sub.gae(rewards, values, np.ones(3, dtype=bool), 0.99, 0.95)
    close(adv, rewards - values[:3], what="优势值")


@check("edge", "自举值只影响未结束的回合", "values[T] 只会通过最后一个终止标记之后的步骤参与计算。已经结束的批次不会使用它。")
def bootstrap_reach(sub):
    rewards = np.array([1.0, 0.0, 1.0, 0.0])
    dones = np.array([False, True, False, False])
    low = np.array([0.1, 0.2, 0.3, 0.4, 0.0])
    high = low.copy()
    high[4] = 10.0
    a_low = np.asarray(sub.gae(rewards, low, dones, 0.9, 0.95)[0])
    a_high = np.asarray(sub.gae(rewards, high, dones, 0.9, 0.95)[0])
    close(a_high[:2], a_low[:2], what="已结束回合的优势值")
    close(a_high[2:] - a_low[2:], [0.9 * 0.95 * 0.9 * 10.0, 0.9 * 10.0], what="values[T] 增大 10 时最后两个优势值的变化量")
    done_all = np.array([False, True, False, True])
    close(sub.gae(rewards, high, done_all, 0.9, 0.95)[0], sub.gae(rewards, low, done_all, 0.9, 0.95)[0], what="最后一步有终止标记时的优势值")


@check("edge", "gamma = 0", "当 gamma = 0 时，只考虑该步的奖励。无论 lam 为何值，每个优势值都等于 rewards[t] - values[t]。")
def gamma_zero(sub):
    rewards = np.array([1.0, 2.0, 3.0])
    values = np.array([0.5, 0.5, 0.5, 0.5])
    adv, _ = sub.gae(rewards, values, np.zeros(3, dtype=bool), 0.0, 0.95)
    close(adv, rewards - values[:3], what="优势值")


@fixture("rollouts")
def rollouts(ref):
    rng = np.random.default_rng(42)
    for T, gamma, lam, p_done in [(1, 0.99, 0.95, 0.5), (5, 0.9, 0.8, 0.3), (16, 0.99, 0.95, 0.15), (12, 0.8, 0.5, 0.4), (20, 0.97, 1.0, 0.1)]:
        rewards = np.round(rng.normal(size=T), 3)
        values = np.round(rng.normal(size=T + 1), 3)
        dones = rng.random(T) < p_done
        adv, ret = ref.gae(rewards, values, dones, gamma, lam)
        yield {"rewards": rewards, "values": values, "dones": dones, "gamma": gamma, "lam": lam}, {
            "td": ref.td_errors(rewards, values, dones, gamma),
            "advantages": adv,
            "returns": ret,
        }


@check("reference", "5 条随机轨迹的 TD 误差与参考解一致", "在不同长度、不同终止标记分布的采样轨迹上，TD 误差应与参考解一致。")
def reference_td(sub):
    for case, expected in fixtures("rollouts"):
        close(sub.td_errors(case["rewards"], case["values"], case["dones"], case["gamma"]), expected["td"], what=f"T = {case['rewards'].shape[0]} 时的 TD 误差")


@check("reference", "优势值和回报与参考解一致", "在相同采样轨迹上，GAE 应与参考解一致。")
def reference_gae(sub):
    for case, expected in fixtures("rollouts"):
        adv, ret = sub.gae(case["rewards"], case["values"], case["dones"], case["gamma"], case["lam"])
        T = case["rewards"].shape[0]
        close(adv, expected["advantages"], what=f"T = {T} 时的优势值")
        close(ret, expected["returns"], what=f"T = {T} 时的回报")
