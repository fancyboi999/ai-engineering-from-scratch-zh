# 公开实现契约

导入 execute_jobs，并提供 invoke(job) -> (value, actual_cost)。只有费率和回执确实已换算为该单位时，才使用 unit=nano_dollars。

费用是调用方提供的整数回执。单调时钟的截止时间控制派发，但无法中断同步回调。账本仅在单进程内存中保存。

回放（`schedule`）和执行（`execute_jobs`）都输出 `events[].status`。回放结果为 `completed` 或 `rejected`；拒绝事件包含值为 `deadline` 或 `budget exceeded` 的 `reason`。实际用量未知或超过预留时，执行还可能返回 `needs_reconciliation`。各模式的费用和时间字段保留各自不同的含义。

### main.py

```python
def nonnegative(value)
def estimate(input_tokens, output_limit, input_rate, output_rate)
def ledger(limit)
def reserve(state, request_id, amount)
def settle(state, request_id, actual)
def schedule(jobs, limit, deadline_ms)
```

阶段测试规定正常结果和应拒绝的输入。不要用参考实现的导入替换学习者实现的导入。最后一个阶段还会针对你的累积实现运行附带的输入驱动程序。
