import numpy as np

from practice_check import check, close, fixture, fixtures, numeric_grad, shape, true

BATCH = np.array([[2.0, 1.0, 0.1], [0.5, 2.5, 0.3]])
BATCH_TARGETS = np.array([0, 1])


@check("examples", '[1, 2, 3] 的 softmax', '每个概率等于该 logit 的指数除以整行指数之和。')
def example_softmax(sub):
    close(sub.softmax(np.array([[1.0, 2.0, 3.0]])), [[0.09003057, 0.24472847, 0.66524096]], rtol=1e-6)


@check("examples", '两条样本的批次损失', '损失是批次中正确类别负对数概率的均值。')
def example_loss(sub):
    close(sub.cross_entropy(BATCH, BATCH_TARGETS), 0.31853977, rtol=1e-6, what="损失")


@check("examples", '梯度各行之和为 0', '每行梯度等于 softmax 减 one-hot 向量，因此行和为 0。')
def example_grad(sub):
    grad = sub.cross_entropy_grad(BATCH, BATCH_TARGETS)
    shape(grad, (2, 3), what="梯度")
    close(np.sum(grad, axis=1), [0.0, 0.0], atol=1e-9, what="梯度逐行之和")


@check("properties", '每行 softmax 概率之和为 1', 'Softmax 返回概率分布，因此每行之和必须为 1。')
def rows_sum_to_one(sub):
    rng = np.random.default_rng(0)
    logits = rng.normal(size=(6, 9)) * 3
    probs = sub.softmax(logits)
    shape(probs, logits.shape, what="概率")
    close(np.sum(probs, axis=1), np.ones(6), atol=1e-9, what="逐行之和")
    true(np.all(probs >= 0), "softmax 返回了负概率", "0 到 1 之间的值", probs)


@check("properties", '给一行加常数不会改变 softmax', 'Softmax 只取决于同一行 logit 之间的差值。')
def shift_invariance(sub):
    rng = np.random.default_rng(1)
    logits = rng.normal(size=(4, 5))
    close(sub.softmax(logits + 7.5), sub.softmax(logits), atol=1e-9, what="每行加上常数后的 softmax 输出")


@check("properties", '梯度与有限差分一致', '微调某个 logit 时，若损失变化约等于梯度乘以该 logit 的变化量，则梯度正确。')
def finite_differences(sub):
    rng = np.random.default_rng(2)
    logits = rng.normal(size=(3, 4))
    targets = np.array([1, 3, 0])
    numeric = numeric_grad(lambda z: sub.cross_entropy(z, targets), logits)
    close(sub.cross_entropy_grad(logits, targets), numeric, atol=1e-6, rtol=1e-4, what="解析梯度")


@check("properties", '输入不会被修改', '若函数修改输入数组，会破坏调用方的后续逻辑。')
def inputs_unchanged(sub):
    logits = np.array([[0.3, -1.2, 2.0], [1.0, 1.0, 1.0]])
    saved = logits.copy()
    sub.softmax(logits)
    sub.cross_entropy(logits, np.array([2, 0]))
    sub.cross_entropy_grad(logits, np.array([2, 0]))
    close(logits, saved, atol=0, rtol=0, what="调用后的 logits")


@check("edge", '大 logit 不会造成溢出', 'float64 中 exp(1000) 会变成无穷大。计算指数前减去行最大值，使最大指数为 0。')
def large_logits(sub):
    logits = np.array([[1000.0, 1001.0, 1002.0]])
    close(sub.softmax(logits), [[0.09003057, 0.24472847, 0.66524096]], rtol=1e-6, what="大 logits 对应的 softmax 输出")


@check("edge", '对错误答案很确信时损失仍有限', '正确类别概率极小时，直接计算 log-softmax。log(0) 会变成负无穷。')
def confident_wrong(sub):
    logits = np.array([[800.0, 0.0, -800.0]])
    close(sub.cross_entropy(logits, np.array([2])), 1600.0, rtol=1e-9, what="损失")


@check("edge", '一个样本和两个类别', '函数必须支持最小批次：N = 1 且 C = 2。')
def smallest_batch(sub):
    logits = np.array([[0.0, 0.0]])
    close(sub.softmax(logits), [[0.5, 0.5]], what="softmax")
    close(sub.cross_entropy(logits, np.array([1])), np.log(2.0), what="损失")
    close(sub.cross_entropy_grad(logits, np.array([1])), [[0.5, -0.5]], what="梯度")


@check("edge", '损失是均值，而不是总和', '批次损失会除以 N。若不除，学习率效果就会依赖批次大小。')
def loss_is_mean(sub):
    logits = np.tile(np.array([[1.0, 2.0, 0.5]]), (8, 1))
    targets = np.zeros(8, dtype=int)
    single = sub.cross_entropy(logits[:1], targets[:1])
    close(sub.cross_entropy(logits, targets), single, rtol=1e-9, what="8 条相同样本的损失")


@fixture("batches")
def batches(ref):
    rng = np.random.default_rng(42)
    for n, c, scale in [(1, 3, 1.0), (5, 4, 2.0), (16, 10, 5.0), (7, 2, 30.0), (12, 20, 1.0), (3, 6, 400.0)]:
        logits = rng.normal(size=(n, c)) * scale
        targets = rng.integers(0, c, size=n)
        yield {"logits": logits, "targets": targets}, {
            "softmax": ref.softmax(logits),
            "loss": ref.cross_entropy(logits, targets),
            "grad": ref.cross_entropy_grad(logits, targets),
        }


@check("reference", '6 个随机批次的 softmax 与参考实现一致', '多种形状和尺度的批次中，softmax 概率都与参考实现一致。')
def reference_softmax(sub):
    for case, expected in fixtures("batches"):
        close(sub.softmax(case["logits"]), expected["softmax"], rtol=1e-7, atol=1e-12, what=f"批次形状为 {case['logits'].shape} 时的 softmax 输出")


@check("reference", '损失和梯度与参考实现一致', '相同随机批次上的损失和梯度均与参考实现一致。')
def reference_loss(sub):
    for case, expected in fixtures("batches"):
        close(sub.cross_entropy(case["logits"], case["targets"]), expected["loss"], rtol=1e-7, what=f"批次形状为 {case['logits'].shape} 时的损失")
        close(sub.cross_entropy_grad(case["logits"], case["targets"]), expected["grad"], rtol=1e-7, atol=1e-12, what=f"批次形状为 {case['logits'].shape} 时的梯度")
