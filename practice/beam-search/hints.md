## 提示 1

维护两个列表：`alive` 和 `finished`。每一项由 token 元组和原始分数组成。初始值为 `alive = [((bos_id,), 0.0)]`。

## 提示 2

每一步先从所有未完成候选生成全部扩展候选，再统一排序。不要分别为每条 beam 保留局部最优 token。

## 提示 3

排序键 `(-score, tokens)` 会让高分排在前面。分数相同时，Python 会比较元组，因此 token ID 较小的排在前面。

## 提示 4

将以 EOS 结尾的保留候选移到 `finished`。循环结束时，把剩余的未完成候选也加入 `finished`。最后才将每条原始分数除以 `(len(tokens) - 1) ** length_penalty`，再用相同的规则排序。
