# 重试暂时性读取失败并复用已完成请求

第 3 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 有何变化

只重试暂时性超时失败，按规范动作标识缓存成功读取。权限失败不是暂时性错误，必须立即向外抛出。这个缓存仅限单个请求：真实云状态会变化，长期缓存需要明确 TTL 或版本，不能悄悄复用旧数据。

## 推演一个具体案例

计划两次读取 checkout 指标。首次调用超时一次后成功；第二次逻辑读取复用缓存值。provider 调用次数=2，完成的逻辑读取=2，缓存命中=1。

```figure
pj-cloud-agent-with-aws-strands-3
```

更改实验输入，先自行计算，再查看指标。图表根据这些输入计算；下面的实现测试仍是完成情况的证据来源。

## 实现契约

实现 `retry.py`：`request_key`、`cached_read`。这是“使用 AWS Strands 的云端 agent”的第 3 阶段产物。它消费显式输入，返回可检查、供下一阶段使用的结果。

使用[公开 API 契约](../../../API.md)和起始实现中的类型签名。核心函数返回值，由附带驱动程序负责文件输入、参数解析和展示。

只按规范的 operation 与 resource 对缓存成功结果。权限错误绕过超时重试循环；重复调用不会授予权限。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py cloud-agent-with-aws-strands --init learning-artifacts/cloud-agent-with-aws-strands` 初始化一次。然后运行累积评分：

```bash
python3 scripts/project_test.py cloud-agent-with-aws-strands --stage 3 --path learning-artifacts/cloud-agent-with-aws-strands --strict
```

在你实现契约之前，全新工作区应当失败。所有阶段完成后，用附带样本运行你的实际产物：

```bash
cd learning-artifacts/cloud-agent-with-aws-strands
python3 cli.py samples/input.json --output incident.json
```

## 探究失败边界

将第二个资源改为范围内另一个服务。即使操作相同，也必须产生不同缓存键。




## 参考资料

[参考资料 1](https://strandsagents.com/docs/user-guide/concepts/model-providers/custom_model_provider/)
