`Group(Bundle)([]Row,error)`。行保留 object、reason、type、count、firstOccurrence、lastOccurrence、observedAt 和排序的 eventUIDs。拒绝将同一事件 UID 复用于其他对象、原因或类型。

先去重事件快照，再累加不同序列。
