# 公开实现契约

导入 run(payload, provider)。provider 只接收经过校验的操作和范围内资源。可选 Strands 模型提出计划，但绝不会绕过确定性校验器。

默认模式读取附带的录制数据。--mode aws 是主动启用的 AWS CLI 适配器，用于读取 ECS 服务、CloudWatch CPU 和受限日志；它需要调用方配置、凭据和 AWS 权限。这里不意味着完成了部署或在线验证。

### executor.py

```python
def execute(plan, provider, max_steps=5, max_chars=4000)
```

### plan.py

```python
def validate_plan(raw, scope)
```

### retry.py

```python
def request_key(operation, resource)
def cached_read(operation, resource, provider, cache, retries=2)
```

### strands_adapter.py

```python
def parse_model_plan(text, scope)
def run_strands(prompt, reply)
def bedrock_agent(model_id, region)
```

阶段测试规定正常结果和应拒绝的输入。不要用参考实现的导入替换学习者实现的导入。最后一个阶段还会针对你的累积实现运行附带的输入驱动程序。
