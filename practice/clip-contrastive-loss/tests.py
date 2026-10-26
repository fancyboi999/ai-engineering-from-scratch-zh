import numpy as np

from practice_check import check, close, fixture, fixtures, numeric_grad, shape, true

I3 = np.array([[1.0, 0.0], [0.0, 2.0], [1.0, 1.0]])
T3 = np.array([[2.0, 0.0], [1.0, 1.0], [0.0, 3.0]])
S3 = np.array([[2.0, 1.41421356237309515, 0.0], [0.0, 1.41421356237309515, 2.0], [1.41421356237309515, 2.0, 1.41421356237309515]])


@check("examples", "三组图文对的相似度 logits", "将图像和文本嵌入分别按 L2 范数归一化。logits 等于图像行乘以转置后的文本行，再除以温度。")
def example_logits(sub):
    close(sub.similarity_logits(I3, T3, 0.5), S3, rtol=1e-8, atol=1e-12, what="logits")


@check("examples", "对称损失及其梯度", "损失是两项交叉熵的平均值。图像项逐行计算，文本项逐列计算，目标是对角线。")
def example_loss(sub):
    close(sub.symmetric_infonce(S3), 0.9905556060000382, rtol=1e-9, what="损失")
    close(sub.symmetric_infonce_grad(S3), [[-0.13632819, 0.09873442, 0.02666175], [0.02666175, -0.23459891, 0.19700514], [0.09873442, 0.15772852, -0.23459891]], rtol=1e-6, what="梯度")


@check("examples", "logits 相等时损失为 log N", "所有 logits 相等时，每个 softmax 都在 N 个项上均匀分布，因此两项交叉熵都是 log N。")
def example_equal(sub):
    close(sub.symmetric_infonce(np.zeros((4, 4))), 1.3862943611198906, rtol=1e-12, what="N = 4 时的损失")


@check("properties", "损失对两种模态具有对称性", "交换图像与文本嵌入后，logits 矩阵会转置，但损失保持不变。")
def symmetric(sub):
    rng = np.random.default_rng(0)
    img = rng.normal(size=(6, 5))
    txt = rng.normal(size=(6, 5))
    a = sub.similarity_logits(img, txt, 0.1)
    b = sub.similarity_logits(txt, img, 0.1)
    shape(a, (6, 6), what="logits")
    close(b, np.asarray(a).T, atol=1e-12, what="交换模态后的 logits")
    close(sub.symmetric_infonce(np.asarray(a).T), sub.symmetric_infonce(a), rtol=1e-12, what="转置 logits 后的损失")


@check("properties", "logits 与嵌入向量的长度无关", "先归一化每个嵌入。每个 logit 都是余弦相似度除以温度，因此绝对值不超过 1 / temperature。")
def scale_invariant(sub):
    rng = np.random.default_rng(1)
    img = rng.normal(size=(4, 3))
    txt = rng.normal(size=(4, 3))
    scales = np.array([[0.1], [3.0], [50.0], [1.0]])
    base = np.asarray(sub.similarity_logits(img, txt, 0.07))
    close(sub.similarity_logits(img * scales, txt * scales[::-1], 0.07), base, atol=1e-10, what="重新缩放嵌入后的 logits")
    true(np.all(np.abs(base) <= 1 / 0.07 + 1e-9), "logit 超过了 1 / temperature", "范围为 -1/0.07 到 1/0.07 的值", base)


@check("properties", "正确配对的损失低于打乱配对", "图文正确匹配时，对角线分数较高，损失较小。错配会让高分离开对角线，损失随之增大。")
def matched_lower(sub):
    rng = np.random.default_rng(2)
    img = rng.normal(size=(8, 16))
    txt = img + 0.1 * rng.normal(size=(8, 16))
    matched = sub.symmetric_infonce(sub.similarity_logits(img, txt, 0.1))
    shuffled = sub.symmetric_infonce(sub.similarity_logits(img, txt[np.roll(np.arange(8), 1)], 0.1))
    true(matched < 0.5, "正确匹配的样本对的损失不够小", "小于 0.5", matched)
    true(shuffled > matched + 1.0, "错误配对未使损失增大", f"大于 {matched + 1.0}", shuffled)


@check("properties", "梯度与有限差分结果一致", "每项交叉熵的梯度等于 softmax 减去独热目标。文本项使用列 softmax。两项取平均后再除以 N。")
def gradient(sub):
    rng = np.random.default_rng(3)
    logits = rng.normal(size=(5, 5)) * 2.0
    grad = sub.symmetric_infonce_grad(logits)
    close(grad, numeric_grad(sub.symmetric_infonce, logits, eps=1e-6), rtol=1e-5, atol=1e-8, what="梯度")
    close(np.sum(grad), 0.0, atol=1e-12, what="所有梯度元素的总和")


@check("properties", "输入保持不变", "函数不能修改嵌入数组或 logits。")
def inputs_unchanged(sub):
    rng = np.random.default_rng(4)
    img = rng.normal(size=(3, 4))
    txt = rng.normal(size=(3, 4))
    logits = rng.normal(size=(3, 3))
    saved = [img.copy(), txt.copy(), logits.copy()]
    sub.similarity_logits(img, txt, 0.5)
    sub.symmetric_infonce(logits)
    sub.symmetric_infonce_grad(logits)
    for name, before, after in zip(["image_emb", "text_emb", "logits"], saved, [img, txt, logits]):
        true(np.array_equal(before, after), f"函数修改了 {name}", before, after)


@check("edge", "单组图文对", "N = 1 时，每个 softmax 只有一个元素，因此损失和梯度都为 0。")
def one_pair(sub):
    logits = sub.similarity_logits(np.array([[3.0, 4.0]]), np.array([[1.0, 0.0]]), 0.2)
    close(logits, [[3.0]], rtol=1e-12, what="logits")
    close(sub.symmetric_infonce(logits), 0.0, atol=1e-12, what="损失")
    close(sub.symmetric_infonce_grad(logits), [[0.0]], atol=1e-12, what="梯度")


@check("edge", "大 logits 不会溢出", "float64 中 exp(1000) 会溢出。按行和按列计算 log-softmax 时，都要先减去对应最大值。")
def large_logits(sub):
    close(sub.symmetric_infonce(np.array([[1000.0, 0.0], [0.0, 1000.0]])), 0.0, atol=1e-12, what="高置信度且预测正确的批次的损失")
    close(sub.symmetric_infonce(np.array([[0.0, 1000.0], [0.0, 0.0]])), 500.34657359027995, rtol=1e-12, what="包含一个极大错误 logit 时的损失")
    grad = np.asarray(sub.symmetric_infonce_grad(np.array([[0.0, 1000.0], [0.0, 0.0]])))
    true(np.all(np.isfinite(grad)), "梯度包含 NaN 或无穷值", "有限值", grad)


@fixture("cases")
def cases(ref):
    rng = np.random.default_rng(42)
    for n, d, tau in [(2, 3, 1.0), (4, 8, 0.07), (6, 5, 0.5), (8, 16, 0.1)]:
        img = rng.normal(size=(n, d))
        txt = rng.normal(size=(n, d))
        logits = ref.similarity_logits(img, txt, tau)
        yield {"image_emb": img, "text_emb": txt, "temperature": tau}, {"logits": logits, "loss": ref.symmetric_infonce(logits), "grad": ref.symmetric_infonce_grad(logits)}


@check("reference", "logits、损失和梯度在 4 个随机批次上与参考结果一致", "在多种批次大小和温度下，logits、损失和梯度都与参考实现一致。")
def reference_cases(sub):
    for case, expected in fixtures("cases"):
        label = f"N = {case['image_emb'].shape[0]}，温度为 {case['temperature']}"
        logits = sub.similarity_logits(case["image_emb"], case["text_emb"], case["temperature"])
        close(logits, expected["logits"], rtol=1e-9, atol=1e-12, what=f"{label} 时的 logits")
        close(sub.symmetric_infonce(expected["logits"]), expected["loss"], rtol=1e-9, what=f"{label} 时的损失")
        close(sub.symmetric_infonce_grad(expected["logits"]), expected["grad"], rtol=1e-8, atol=1e-12, what=f"{label} 时的梯度")
