import numpy as np

from practice_check import check, close, fixture, fixtures, numeric_grad, shape, true

PW = np.array([-12.0, -20.0, -8.0])
PL = np.array([-15.0, -18.0, -9.0])
RW = np.array([-13.0, -19.0, -8.5])
RL = np.array([-14.0, -19.0, -8.5])


def random_batch(rng, n):
    ref_w = rng.normal(-20.0, 5.0, size=n)
    ref_l = rng.normal(-20.0, 5.0, size=n)
    return ref_w + rng.normal(size=n), ref_l + rng.normal(size=n), ref_w, ref_l


@check("examples", "示例批次的隐式奖励", "隐式奖励等于 beta 乘以策略模型与参考模型对数概率之差。")
def example_rewards(sub):
    close(sub.implicit_reward(PW, RW, 0.1), [0.1, -0.1, 0.05], rtol=1e-9, what="偏好回答的奖励")
    close(sub.implicit_reward(PL, RL, 0.1), [-0.1, 0.1, -0.05], rtol=1e-9, what="拒绝回答的奖励")


@check("examples", "示例批次的损失", "损失是批次中各奖励差值的负对数 sigmoid 的平均值。")
def example_loss(sub):
    close(sub.dpo_loss(PW, PL, RW, RL, 0.1), 0.6802247996122515, rtol=1e-7, what="损失")


@check("examples", "示例批次的梯度", "对偏好回答的对数概率的梯度为 -beta 乘以 sigmoid(负奖励差值)，再除以 N。对拒绝回答的对数概率的梯度数值相同、符号相反。")
def example_grad(sub):
    grad_w, grad_l = sub.dpo_grad(PW, PL, RW, RL, 0.1)
    close(grad_w, [-0.01500553, -0.0183278, -0.01583403], rtol=1e-6, what="对偏好回答的对数概率的梯度")
    close(grad_l, [0.01500553, 0.0183278, 0.01583403], rtol=1e-6, what="对拒绝回答的对数概率的梯度")


@check("properties", "策略等于参考模型时，损失为 log 2", "策略模型与参考模型给出的对数概率相同时，两个奖励都为 0，间隔也为 0。此时 -log(sigmoid(0)) 等于 log 2，与 beta 的取值无关。")
def log_two_at_reference(sub):
    rng = np.random.default_rng(0)
    _, _, ref_w, ref_l = random_batch(rng, 7)
    for beta in [0.01, 0.1, 1.0, 5.0]:
        close(sub.dpo_loss(ref_w, ref_l, ref_w, ref_l, beta), np.log(2.0), rtol=1e-12, what=f"beta = {beta} 时的损失")


@check("properties", "梯度符号正确", "梯度下降会提高偏好回答的对数概率，降低拒绝回答的对数概率。因此偏好回答的梯度为负，拒绝回答的梯度为正。")
def gradient_sign(sub):
    rng = np.random.default_rng(1)
    pw, pl, rw, rl = random_batch(rng, 9)
    grad_w, grad_l = sub.dpo_grad(pw, pl, rw, rl, 0.3)
    shape(grad_w, (9,), what="偏好回答的梯度")
    shape(grad_l, (9,), what="拒绝回答的梯度")
    true(np.all(np.asarray(grad_w) < 0), "偏好回答的梯度不为负", "所有值均小于 0", grad_w)
    true(np.all(np.asarray(grad_l) > 0), "拒绝回答的梯度不为正", "所有值均大于 0", grad_l)
    close(np.asarray(grad_w) + np.asarray(grad_l), np.zeros(9), atol=1e-15, what="两个梯度的和")


@check("properties", "梯度与有限差分结果一致", "小幅改变一个策略对数概率，损失的变化量应等于梯度乘以该改变量。")
def finite_differences(sub):
    rng = np.random.default_rng(2)
    pw, pl, rw, rl = random_batch(rng, 4)
    beta = 0.7
    num_w = numeric_grad(lambda x: sub.dpo_loss(x, pl, rw, rl, beta), pw)
    num_l = numeric_grad(lambda x: sub.dpo_loss(pw, x, rw, rl, beta), pl)
    grad_w, grad_l = sub.dpo_grad(pw, pl, rw, rl, beta)
    close(grad_w, num_w, rtol=1e-5, atol=1e-8, what="偏好回答的梯度")
    close(grad_l, num_l, rtol=1e-5, atol=1e-8, what="拒绝回答的梯度")


@check("properties", "奖励差值越大，损失越小", "损失只取决于间隔，即 beta 乘以偏好回答与拒绝回答的对数概率比之差。间隔越大，损失越小。")
def loss_monotone(sub):
    ref = np.array([-10.0])
    losses = [sub.dpo_loss(ref + d, ref, ref, ref, 0.5) for d in [-4.0, -1.0, 0.0, 1.0, 4.0]]
    true(all(a > b for a, b in zip(losses, losses[1:])), "偏好回答的对数概率增大时，损失未减小", "损失递减列表", losses)


@check("properties", "参考模型会抵消共同平移", "对同一回答的策略和参考对数概率加上相同常数，对数概率比不变，因此损失也不变。")
def shift_invariance(sub):
    rng = np.random.default_rng(3)
    pw, pl, rw, rl = random_batch(rng, 5)
    base = sub.dpo_loss(pw, pl, rw, rl, 0.2)
    close(sub.dpo_loss(pw + 3.0, pl - 7.0, rw + 3.0, rl - 7.0, 0.2), base, rtol=1e-12, what="平移后的损失")


@check("properties", "输入保持不变", "如果函数修改输入数组，就会破坏调用它的训练循环。")
def inputs_unchanged(sub):
    arrays = [PW.copy(), PL.copy(), RW.copy(), RL.copy()]
    saved = [a.copy() for a in arrays]
    sub.implicit_reward(arrays[0], arrays[2], 0.1)
    sub.dpo_loss(*arrays, 0.1)
    sub.dpo_grad(*arrays, 0.1)
    for name, before, after in zip(["策略模型的偏好回答", "策略模型的拒绝回答", "参考模型的偏好回答", "参考模型的拒绝回答"], saved, arrays):
        true(np.array_equal(before, after), f"函数修改了{name}的对数概率", before, after)


@check("edge", "奖励差值很大时损失接近 0", "奖励差值为 4000 时，sigmoid 会舍入为 1，损失应为 0。在 log 内加入小常数会算出错误结果。")
def large_positive_margin(sub):
    close(sub.dpo_loss(np.array([0.0]), np.array([-2000.0]), np.array([-2000.0]), np.array([0.0]), 1.0), 0.0, atol=1e-12, what="损失")


@check("edge", "负奖励差值很大时结果仍有限", "奖励差值为 -4000 时，sigmoid 会舍入为 0，log(0) 会变成负无穷。应使用 np.logaddexp 计算 log(1 + exp(-z))，也就是负 log sigmoid(z)。损失为 4000。")
def large_negative_margin(sub):
    close(sub.dpo_loss(np.array([-2000.0]), np.array([0.0]), np.array([0.0]), np.array([-2000.0]), 1.0), 4000.0, rtol=1e-12, what="损失")
    grad_w, grad_l = sub.dpo_grad(np.array([-2000.0]), np.array([0.0]), np.array([0.0]), np.array([-2000.0]), 1.0)
    close(grad_w, [-1.0], rtol=1e-12, what="偏好回答的梯度")
    close(grad_l, [1.0], rtol=1e-12, what="拒绝回答的梯度")


@check("edge", "一对回答", "只包含一对回答的批次也必须能正常计算；此时平均值就是该对回答的损失。")
def one_pair(sub):
    loss = sub.dpo_loss(np.array([-3.0]), np.array([-3.0]), np.array([-3.0]), np.array([-4.0]), 2.0)
    close(loss, np.logaddexp(0.0, 2.0), rtol=1e-12, what="损失")


@fixture("batches")
def batches(ref):
    rng = np.random.default_rng(42)
    for n, beta in [(1, 0.1), (4, 0.05), (6, 0.5), (10, 2.0)]:
        pw, pl, rw, rl = random_batch(rng, n)
        args = {"pw": pw, "pl": pl, "rw": rw, "rl": rl, "beta": beta}
        grad_w, grad_l = ref.dpo_grad(pw, pl, rw, rl, beta)
        yield args, {"loss": ref.dpo_loss(pw, pl, rw, rl, beta), "reward_w": ref.implicit_reward(pw, rw, beta), "grad_w": grad_w, "grad_l": grad_l}


@check("reference", "损失、奖励和梯度与参考结果一致", "在多种 beta 值的随机批次上，你的函数都应与参考实现一致。")
def reference_batches(sub):
    for case, expected in fixtures("batches"):
        label = f"N = {case['pw'].size}，beta = {case['beta']}"
        args = (case["pw"], case["pl"], case["rw"], case["rl"], case["beta"])
        close(sub.dpo_loss(*args), expected["loss"], rtol=1e-9, what=f"{label} 时的损失")
        close(sub.implicit_reward(case["pw"], case["rw"], case["beta"]), expected["reward_w"], rtol=1e-9, what=f"{label} 时偏好回答的奖励")
        grad_w, grad_l = sub.dpo_grad(*args)
        close(grad_w, expected["grad_w"], rtol=1e-9, what=f"{label} 时偏好回答的梯度")
        close(grad_l, expected["grad_l"], rtol=1e-9, what=f"{label} 时拒绝回答的梯度")
