import numpy as np

import practice_check
from practice_check import check, clear_progress, close, equal, fixture, fixtures, progress, shape, true
from support import TEXT, VOCAB, encode

BUDGET = 300
TARGET = 2.55
V = len(VOCAB)
HELD_OUT_TEXT = (
    'a lexical ranking function that scores a document from query term matches while '
    'accounting for term rarity, repeated occurrences, and document length. a subword '
    'tokenization method that repeatedly merges frequent adjacent units to construct a '
    'fixed vocabulary from training text. the agreement between a system s stated '
    'confidence and the observed frequency with which predictions at that confidence are '
    'correct. a deployment strategy that exposes a new version to a limited slice of '
    'traffic or infrastructure before expanding the rollout. intermediate reasoning used '
    'to decompose a task before producing an answer. a prompt can request a visible '
    'rationale, while some systems use internal reasoning that is not returned to the '
    'user. a durable snapshot used to resume from a known boundary. in a workflow, it '
    'stores operational state and artifact references. in model training, it can store '
    'parameters, optimizer state, scheduler state, and the training position. a serving '
    'technique that divides a long prompt s prefill work into smaller schedulable pieces '
    'so prompt processing can interleave with decode work from other requests. dividing '
    'source material into retrievable units before indexing. chunk boundaries, overlap, '
    'metadata, and document structure determine whether retrieval returns enough context '
    'without flooding the prompt.'
)
_runs = {}


def fresh_run(sub, ids, seed):
    saved = list(progress())
    clear_progress()
    try:
        model = sub.train(ids, V, np.random.default_rng(seed))
        points = list(progress())
    finally:
        clear_progress()
        practice_check._progress.extend(saved)
    return model, points


def main_run(sub):
    key = id(sub)
    if key not in _runs:
        ids = encode(TEXT)
        ids_in = ids.copy()
        clear_progress()
        model = sub.train(ids_in, V, np.random.default_rng(1))
        _runs[key] = {"model": model, "points": list(progress()), "ids": ids, "ids_in": ids_in}
    return _runs[key]


def log_probs(sub, model, prev_ids):
    out = np.asarray(sub.next_log_probs(model, prev_ids), dtype=float)
    shape(out, (len(prev_ids), V), what="next_log_probs 返回的对数概率")
    return out


def mean_nll(sub, model, ids):
    out = log_probs(sub, model, ids[:-1])
    return float(-np.mean(out[np.arange(ids.size - 1), ids[1:]]))


def unigram_nll(train_ids, test_ids):
    counts = np.bincount(train_ids[1:], minlength=V).astype(float)
    return float(-np.mean(np.log(counts[test_ids[1:]] / counts.sum())))


@check("examples", "每个上下文对应一行对数概率", "next_log_probs 返回形状为 (M, 29) 的数组。第 i 行保存 29 个字符各自的 log P(next character | prev_ids[i])。")
def example_shape(sub):
    log_probs(sub, main_run(sub)["model"], encode("the "))


@check("examples", "模型拟合训练文本", "训练后，训练文本上下一字符的平均负对数似然必须不超过 2.55 nat。")
def example_train_nll(sub):
    run = main_run(sub)
    nll = mean_nll(sub, run["model"], run["ids"])
    true(nll <= TARGET, f"训练负对数似然 {nll:.4f} 高于 {TARGET}", f"<= {TARGET}", nll)


@check("properties", "每行都是对数概率分布", "next_log_probs 每行保存对数概率。所有值不大于 0，每行取指数后的值之和为 1。对 logit 应用 log softmax。")
def rows_normalized(sub):
    out = log_probs(sub, main_run(sub)["model"], np.arange(V))
    true(np.all(out <= 1e-12), "存在大于 0 的对数概率", "值 <= 0", out)
    close(np.exp(out).sum(axis=1), np.ones(V), atol=1e-9, what="每行指数值之和")


@check("properties", "训练不超过步数预算", "每次更新调用一次 report(step, loss)，step 从 0、1、2 依次递增。最多使用 300 步。")
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


@check("properties", "相同种子得到相同模型", "所有随机数均取自 rng 参数。相同种子的两次运行应得到相同的对数概率。")
def deterministic(sub):
    run = main_run(sub)
    model, points = fresh_run(sub, encode(TEXT), 1)
    contexts = np.arange(V)
    equal(log_probs(sub, model, contexts), log_probs(sub, run["model"], contexts), what="第二次运行的对数概率")
    equal([point[1] for point in points], [point[1] for point in run["points"]], what="第二次运行的损失")


@check("properties", "输入 ids 不变", "不得修改 ids。为上下文和目标创建新数组。")
def inputs_unchanged(sub):
    run = main_run(sub)
    equal(run["ids_in"], run["ids"], what="train 后的 ids")


@check("edge", "模型学会常见字符对", "模型预测上下文后面的字符。训练文本中，q 后面是 u，句点后面是空格，t 后面最常见的是 h。")
def common_pairs(sub):
    out = log_probs(sub, main_run(sub)["model"], encode("q.t"))
    equal(np.argmax(out, axis=1).tolist(), encode("u h").tolist(), what="q、. 和 t 后面概率最大的字符")


@check("edge", "未见字符对保留有限对数概率", "训练文本中未出现 b 后接 x。从小 logit 开始的梯度下降为其保留小概率，而非 0。直接使用计数会得到负无穷。")
def unseen_pair(sub):
    out = log_probs(sub, main_run(sub)["model"], encode("b"))
    value = out[0, VOCAB.index("x")]
    true(np.isfinite(value), "log P(x | b) 不是有限值", "有限值", value)


@check("edge", "单个上下文", "next_log_probs 必须支持单个上下文，并返回形状 (1, 29)。")
def one_context(sub):
    log_probs(sub, main_run(sub)["model"], encode("a"))


@fixture("held_out")
def reference_nll(ref):
    model = ref.train(encode(TEXT), V, np.random.default_rng(1))
    held = encode(HELD_OUT_TEXT)
    out = ref.next_log_probs(model, held[:-1])
    nll = float(-np.mean(out[np.arange(held.size - 1), held[1:]]))
    yield {"target": TARGET}, {"reference": nll, "unigram": unigram_nll(encode(TEXT), held)}


@check("reference", "留出集负对数似然达到目标", "检查器在其他术语词条组成的留出文本上评估模型。下一字符的平均负对数似然必须不超过 2.55 nat。忽略上下文的一元模型无法达到此目标。")
def held_out_nll(sub):
    (case, expected), = fixtures("held_out")
    nll = mean_nll(sub, main_run(sub)["model"], encode(HELD_OUT_TEXT))
    message = f"留出集负对数似然 {nll:.4f} 高于 {case['target']}。参考解达到 {expected['reference']:.4f}。一元模型得到 {expected['unigram']:.4f}"
    true(nll <= case["target"], message, f"<= {case['target']}", nll)
