# 使用 AWS Strands 的云端 agent

限定范围的云端故障读取器，为每次缓存命中和重试保留执行回执。

Python 3.10+；JSON、集合、异常、回调和环境配置。可选 SDK 对照使用 requirements-framework.txt。核心使用标准库。评分器检查你选择的工作区，绝不会用参考实现补齐缺失的行为。

## 构建并运行你的版本

在仓库根目录执行一次初始化。全新的起始实现会故意失败。

```bash
python3 scripts/project_test.py cloud-agent-with-aws-strands --init learning-artifacts/cloud-agent-with-aws-strands
python3 scripts/project_test.py cloud-agent-with-aws-strands --stage 1 --path learning-artifacts/cloud-agent-with-aws-strands --strict
```

实现每个阶段，然后运行累积评分器和附带的输入驱动程序：

```bash
python3 scripts/project_test.py cloud-agent-with-aws-strands --all --path learning-artifacts/cloud-agent-with-aws-strands --strict
cd learning-artifacts/cloud-agent-with-aws-strands
python3 cli.py samples/input.json --output incident.json
```

驱动程序和离线样本是附带的脚手架，其导入指向你的实现。公开输入类型和函数签名见起始实现和 [API 契约](API.md)。

## 单独检查参考实现

在仓库根目录执行：

```bash
python3 scripts/project_test.py cloud-agent-with-aws-strands --all --solution --strict
cd projects/cloud-agent-with-aws-strands/solution
python3 cli.py samples/input.json --output incident.json
```

## 观察变化

三次计划读取保留三个结果，但重复的 metrics.read 使用请求级缓存，因此只读取 provider 两次。回执同时展示调用和复用。

编辑样本的副本并重新运行命令。将输入与输出放在一起，让他人能够复现结果；附带样本是专门编写的教学数据。

## 集成与限制

导入 run(payload, provider)。provider 只接收经过校验的操作和范围内资源。可选 Strands 模型提出计划，但绝不会绕过确定性校验器。

默认模式读取附带的录制数据。--mode aws 是主动启用的 AWS CLI 适配器，用于读取 ECS 服务、CloudWatch CPU 和受限日志；它需要调用方配置、凭据和 AWS 权限。这里不意味着完成了部署或在线验证。

## 阶段

1. [校验限定范围的云端检查计划](stages/01-plan/docs/zh.md)
2. [在步骤和响应预算内执行读取](stages/02-executor/docs/zh.md)
3. [重试暂时性读取失败并复用已完成请求](stages/03-retry/docs/zh.md)
4. [用本地模型驱动真正的 Strands 循环](stages/04-strands-adapter/docs/zh.md)

## 可选框架集成

基础阶段只使用标准库。框架适配器已经实现，并有独立冒烟测试，用真实安装的 SDK 和本地假模型运行。它绝不会访问云服务。

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r projects/cloud-agent-with-aws-strands/requirements-framework.txt
.venv/bin/python scripts/project_test.py cloud-agent-with-aws-strands --solution --optional --strict
.venv/bin/python projects/cloud-agent-with-aws-strands/solution/framework_demo.py
```

上游集成验证使用 `strands-agents==1.57.1`。存在云端 provider 路径时，仍须主动启用并提供自己的环境凭据；不会执行云部署。

默认评分器覆盖离线核心和输入集成。`--optional` 增加 5 个使用真实 SDK 和确定性本地模型的测试。缺少 SDK 会报告 SKIP 并提示安装；`--optional --strict` 会因依赖缺失而失败。仅通过默认测试不代表框架已验证。

## 主要参考资料

[Strands 自定义模型 provider](https://strandsagents.com/docs/user-guide/concepts/model-providers/custom_model_provider/)介绍了可选的确定性模型适配器。

## 配置可选 AWS 读取器

使用 --mode aws 前，添加以各范围内服务为键的 aws 对象。每项都需要 region。inventory.list 和 metrics.read 还需要 cluster；logs.read 需要 log_group。metrics.read 要求 start 和 end 是带时区的 ISO 时间戳，例如 2026-01-01T00:00:00Z 和 2026-01-01T01:00:00Z。logs.read 接受同样的可选时间对，并转成纪元毫秒供 --start-time 和 --end-time 使用。两者都省略时保留不限定时间窗口的日志读取；只提供一个则报错。两种操作都拒绝无效、无时区、纪元之前或非递增的窗口。适配器调用 ECS describe-services、CloudWatch get-metric-statistics 读取 CPUUtilization，以及 limit 为 20 的 Logs filter-log-events。

凭据来自 AWS CLI 的环境或已配置的凭据链。范围校验不能代替 IAM：只为目标读取和服务资源配置权限。区域和时间窗口是调用方配置，不是模型提供的可执行参数。每次 CLI 调用有十秒超时；只重试超时错误。
