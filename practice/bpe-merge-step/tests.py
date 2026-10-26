import numpy as np

from practice_check import check, equal, fixture, fixtures, true

UNITS = {(1, 2, 3): 5, (1, 2): 3, (2, 3, 2, 3): 2}
WORDS = {(108, 111, 119): 5, (108, 111, 119, 101, 114): 2, (110, 101, 119, 101, 115, 116): 6, (119, 105, 100, 101, 115, 116): 3}


def weighted_length(units):
    return sum(len(symbols) * count for symbols, count in units.items())


def random_units(rng, words, alphabet, max_len, max_count):
    units = {}
    for _ in range(words):
        length = int(rng.integers(1, max_len + 1))
        symbols = tuple(int(v) for v in rng.integers(0, alphabet, size=length))
        units[symbols] = units.get(symbols, 0) + int(rng.integers(1, max_count + 1))
    return units


@check("examples", '小型语料的符号对计数', '词中的每个相邻符号对按词频计数。累加词频，而不是加 1。')
def example_counts(sub):
    equal(sub.count_pairs(UNITS), {(1, 2): 8, (2, 3): 9, (3, 2): 2}, what="count_pairs(units)")


@check("examples", '小型语料中的最佳符号对', '最佳符号对是计数最高的一对。')
def example_best(sub):
    equal(sub.best_pair({(1, 2): 8, (2, 3): 9, (3, 2): 2}), (2, 3), what="best_pair(pairs)")


@check("examples", '合并不重叠', '从左向右扫描。匹配后跳过两个符号，因此用 (7, 7) 合并 [7, 7, 7] 会得到 [300, 7]。')
def example_merge(sub):
    equal(sub.apply_merge((7, 7, 7), (7, 7), 300), (300, 7), what="apply_merge((7, 7, 7), (7, 7), 300)")


@check("examples", '词语语料上的四次合并', '(101, 115) 和 (115, 116) 的计数都是 9。并列时选择较小的一对。')
def example_train(sub):
    merges, units = sub.train(dict(WORDS), 4)
    equal(merges, [((101, 115), 256), ((256, 116), 257), ((108, 111), 258), ((258, 119), 259)], what='合并列表')
    equal(units, {(259,): 5, (259, 101, 114): 2, (110, 101, 119, 257): 6, (119, 105, 100, 257): 3}, what='合并后的符号')


@check("properties", '符号对总数与词长一致', '长度为 L 的词有 L - 1 个相邻符号对。总计数等于所有词的 (L - 1) 乘词频后求和。')
def total_pairs(sub):
    rng = np.random.default_rng(3)
    units = random_units(rng, 30, 5, 8, 6)
    pairs = sub.count_pairs(units)
    expected = sum((len(symbols) - 1) * count for symbols, count in units.items())
    equal(sum(pairs.values()), expected, what='符号对计数之和')


@check("properties", '每次合并都会缩短语料', '一次合并会把两个符号替换成一个，因此语料的加权总长度每次都会减少，词频总和保持不变。')
def merges_shrink(sub):
    rng = np.random.default_rng(4)
    units = random_units(rng, 25, 4, 7, 5)
    total = sum(units.values())
    previous = weighted_length(units)
    for steps in range(1, 6):
        merges, merged = sub.train(dict(units), steps)
        true(len(merges) == steps, f"train 在合并 {len(merges)} 次后停止，但语料中仍有计数不小于 2 的符号对", steps, len(merges))
        now = weighted_length(merged)
        true(now < previous, f"第 {steps} 次合并未使语料变短", f"less than {previous}", now)
        equal(sum(merged.values()), total, what=f"合并 {steps} 次后的词频总和")
        previous = now


@check("properties", '新 ID 从 first_id 开始递增', '第 i 次合并使用 ID first_id + i。ID 不会跳号或重复。')
def ids_count_up(sub):
    merges, _ = sub.train(dict(WORDS), 6, first_id=1000)
    equal([new_id for _, new_id in merges], list(range(1000, 1000 + len(merges))), what='新 ID')


@check("properties", '按顺序重放合并会得到训练语料', '编码会按训练顺序应用合并操作。处理后，每个语料词都应与训练得到的符号序列一致。')
def replay(sub):
    rng = np.random.default_rng(5)
    units = random_units(rng, 20, 4, 9, 4)
    merges, trained = sub.train(dict(units), 8)
    replayed = {}
    for symbols, count in units.items():
        for pair, new_id in merges:
            symbols = sub.apply_merge(symbols, pair, new_id)
        replayed[tuple(symbols)] = replayed.get(tuple(symbols), 0) + count
    equal(replayed, trained, what='按顺序应用每次合并后的语料')


@check("properties", '输入语料不会被修改', 'train 必须创建新字典。调用方会保留原语料，以便再次编码。')
def input_unchanged(sub):
    units = dict(WORDS)
    sub.train(units, 3)
    sub.count_pairs(units)
    equal(units, WORDS, what='调用后的语料字典')


@check("edge", '连续相同符号按对合并', '不重叠合并会把四个相同符号变为两个新符号；五个相同符号会变为两个新符号和一个原符号。')
def runs(sub):
    equal(sub.apply_merge((4, 4, 4, 4), (4, 4), 9), (9, 9), what="apply_merge((4, 4, 4, 4), (4, 4), 9)")
    equal(sub.apply_merge((4, 4, 4, 4, 4), (4, 4), 9), (9, 9, 4), what="apply_merge((4, 4, 4, 4, 4), (4, 4), 9)")
    equal(sub.apply_merge((1, 2, 1, 2, 1), (1, 2), 300), (300, 300, 1), what="apply_merge((1, 2, 1, 2, 1), (1, 2), 300)")


@check("edge", '短输入和空输入', '只有一个符号的词不包含符号对。符号对表为空时没有最佳符号对，因此 best_pair 返回 None。')
def short_inputs(sub):
    equal(sub.apply_merge((), (1, 2), 9), (), what="apply_merge((), (1, 2), 9)")
    equal(sub.apply_merge((5,), (5, 5), 9), (5,), what="apply_merge((5,), (5, 5), 9)")
    equal(sub.count_pairs({(5,): 3}), {}, what="count_pairs({(5,): 3})")
    equal(sub.count_pairs({}), {}, what="count_pairs({})")
    equal(sub.best_pair({}), None, what="best_pair({})")


@check("edge", '并列时选择最小符号对', '把并列符号对按元组比较。(2, 9) 排在 (5, 1) 前面，因为 2 小于 5。')
def ties(sub):
    equal(sub.best_pair({(5, 1): 4, (2, 9): 4, (3, 3): 1}), (2, 9), what='最高计数为 4 时的 best_pair 结果')
    equal(sub.best_pair({(3, 8): 2, (3, 4): 2}), (3, 4), what='首个 ID 相同时的 best_pair 结果')


@check("edge", '符号对不再重复时停止训练', '符号对至少出现两次才能合并。最高计数为 1 或语料没有符号对时，train 会提前停止。')
def stops_early(sub):
    equal(sub.train({(1, 2): 1}, 3), ([], {(1, 2): 1}), what="train({(1, 2): 1}, 3)")
    equal(sub.train({(1, 2, 3, 4): 1, (3, 4): 1}, 5), ([((3, 4), 256)], {(1, 2, 256): 1, (256,): 1}), what='只含一个重复符号对的语料训练结果')
    equal(sub.train({(7,): 4}, 2), ([], {(7,): 4}), what='单符号词的训练结果')
    equal(sub.train(dict(WORDS), 0), ([], WORDS), what='num_merges = 0 时的训练结果')


@fixture("pairs")
def pair_cases(ref):
    rng = np.random.default_rng(11)
    for words, alphabet in [(5, 3), (12, 4), (20, 6)]:
        units = random_units(rng, words, alphabet, 8, 7)
        yield {"units": units}, ref.count_pairs(units)


@fixture("merges")
def merge_cases(ref):
    rng = np.random.default_rng(12)
    for length, alphabet in [(6, 2), (15, 2), (25, 3), (40, 3)]:
        symbols = tuple(int(v) for v in rng.integers(0, alphabet, size=length))
        pair = (int(rng.integers(0, alphabet)), int(rng.integers(0, alphabet)))
        yield {"symbols": symbols, "pair": pair}, ref.apply_merge(symbols, pair, 99)


@fixture("training")
def train_cases(ref):
    rng = np.random.default_rng(13)
    for words, alphabet, steps in [(10, 3, 5), (30, 5, 12), (40, 4, 20)]:
        units = random_units(rng, words, alphabet, 9, 6)
        merges, trained = ref.train(dict(units), steps)
        yield {"units": units, "steps": steps}, {"merges": merges, "units": trained}


@check("reference", '符号对计数与参考实现一致', '随机加权语料的符号对计数与参考实现一致。')
def reference_pairs(sub):
    for case, expected in fixtures("pairs"):
        equal(sub.count_pairs(case["units"]), expected, what=f"语料包含 {len(case['units'])} 个词时的 count_pairs 结果")


@check("reference", '合并结果与参考实现一致', '对包含长重复序列的随机输入，合并结果与参考实现一致。')
def reference_merges(sub):
    for case, expected in fixtures("merges"):
        equal(tuple(sub.apply_merge(case["symbols"], case["pair"], 99)), expected, what=f"对 {case['symbols']} 应用符号对 {case['pair']} 时的 apply_merge 结果")


@check("reference", '训练结果与参考实现一致', '随机语料的合并列表和最终结果都与参考实现一致。')
def reference_train(sub):
    for case, expected in fixtures("training"):
        merges, units = sub.train(dict(case["units"]), case["steps"])
        equal(merges, expected["merges"], what=f"执行 {case['steps']} 次合并时的合并列表")
        equal(units, expected["units"], what=f"合并 {case['steps']} 次后的语料")
