`dominated(data):string[]`；`sensitivity(data,id,steps=10)` 返回 steps+1 条 `{weight,weights,winner,scores}` 记录。要求 steps 为 1..100 的整数，且另一项标准的基线权重为正。

找到偏好变化何时会逆转排名。
