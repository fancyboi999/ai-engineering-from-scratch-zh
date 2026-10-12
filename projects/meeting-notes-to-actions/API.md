# 公开实现契约

使用 schema_version 为 1 的 actions.json 回执，带稳定的行动 id 和原始源行。CSV 列为 id、owner、due 和 task，只包含已批准行动。

决策必须为 JSON 对象，将当前行动 id 映射到 `pending`、`approved` 或 `rejected`。未知或过期 id 会在导出任何产物前导致整个输入被拒绝。源行变化会改变 id，因此应重新生成收件箱并再次审核。下载另一份决策文件时，HTML 选择器保留已有决策。

ACTION 行是权威候选；NAME will TASK by YYYY-MM-DD 是保守的提案语法。不符合这些语法的非结构化建议保持未分配状态。HTML 审核不会发布任务或发送消息。

### main.py

```python
def parse_notes(text)
def validate_action(action)
def deduplicate(actions)
def publish(actions, today)
```

阶段测试规定正常结果和应拒绝的输入。不要用参考实现的导入替换学习者实现的导入。最后一个阶段还会针对你的累积实现运行附带的输入驱动程序。
