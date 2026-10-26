## 提示 1

创建从 doc id 到分数的字典。`collections.defaultdict(float)` 会将新 ID 的分数初始化为 0。

## 提示 2

排名从 1 开始。`enumerate(ranking, start=1)` 会给出每个 ID 的排名。

## 提示 3

使用 `zip` 将每个列表与其权重配对。先检查 `weights` 的长度，因为 `zip` 遇到较短输入时会静默停止，不会报错。

## 提示 4

用排序键 `(-score, doc_id)` 排序 `(doc_id, score)` 对。负号会让高分排在前面，doc id 用于打破并列。
