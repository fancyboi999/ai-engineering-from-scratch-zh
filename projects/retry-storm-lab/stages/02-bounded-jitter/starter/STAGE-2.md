`Delay(p Policy,client,attempt int) int`，第一次重试等待的 attempt 编号为 1。抖动公式：用 uint64 算术计算 ((client+1)*1103515245 + attempt*12345 + seed)，对 (cap+1) 取模。`Validate` 拒绝无效边界。

用可复现的客户端专属序列分散计划重试。
