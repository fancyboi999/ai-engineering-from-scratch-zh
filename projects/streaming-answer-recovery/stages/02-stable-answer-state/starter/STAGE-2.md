`initial():Answer`；`apply(state,event):Answer`。Answer 包含 text、citations、status、lastID 和已接受事件。`interrupt(state)` 保留文本并标记 interrupted。`cancel(state)` 将未完成回答标记为 cancelled；取消的回答忽略后续事件。

让重复投递无害，同时保留未完成状态。
