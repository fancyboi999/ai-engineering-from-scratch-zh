# 用本地模型驱动真正的 Strands 循环

第 4 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 有何变化

真正的 Strands Agent 消费注入的 Model 子类所产生的流事件。这样无需凭据或云调用也能运行框架循环。模型仍只提出计划；用前面的校验器解析结果并检查范围。另设明确的 Bedrock 构造函数，离线演示和测试不会调用它。

## 推演一个具体案例

可选 Strands Agent 通过真正的流式 Model 接口输出 JSON 计划。提案随后经过与 cli.py 相同的范围校验器、重试包装器和有界执行器。

```figure
pj-cloud-agent-with-aws-strands-4
```

更改实验输入，先自行计算，再查看指标。图表根据这些输入计算；下面的实现测试仍是完成情况的证据来源。

## 实现契约

实现 `strands_adapter.py`：`parse_model_plan`、`run_strands`、`bedrock_agent`。这是“使用 AWS Strands 的云端 agent”的第 4 阶段产物。它消费显式输入，返回可检查、供下一阶段使用的结果。

使用[公开 API 契约](../../../API.md)和起始实现中的类型签名。核心函数返回值，由附带驱动程序负责文件输入、参数解析和展示。

明确区分三种模式：纯离线核心、已安装 SDK 的本地模型对照、主动启用的 AWS 读取。安装的 SDK 通过假模型测试是有用的集成证据，但不能说明 IAM 或 Bedrock 可用。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py cloud-agent-with-aws-strands --init learning-artifacts/cloud-agent-with-aws-strands` 初始化一次。然后运行累积评分：

```bash
python3 scripts/project_test.py cloud-agent-with-aws-strands --stage 4 --path learning-artifacts/cloud-agent-with-aws-strands --strict
```

在你实现契约之前，全新工作区应当失败。所有阶段完成后，用附带样本运行你的实际产物：

```bash
cd learning-artifacts/cloud-agent-with-aws-strands
python3 cli.py samples/input.json --output incident.json
```

## 探究失败边界

通过 cli.py 运行样本，检查重复指标读取上的 cached=true。然后用固定版本 SDK 运行 --optional --strict，在不发云请求的情况下检查框架事件。

默认模式读取附带的录制数据。--mode aws 是主动启用的 AWS CLI 适配器，用于读取 ECS 服务、CloudWatch CPU 和受限日志；它需要调用方配置、凭据和 AWS 权限。这里不意味着完成了部署或在线验证。

## 验证真实框架

五个默认阶段测试不导入 SDK，只检查适配器契约。安装固定版本的可选依赖后，显式加入五个真实 SDK 测试：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r projects/cloud-agent-with-aws-strands/requirements-framework.txt
.venv/bin/python scripts/project_test.py cloud-agent-with-aws-strands --solution --optional --strict
.venv/bin/python projects/cloud-agent-with-aws-strands/solution/framework_demo.py
```

用 `--path my-cloud-agent-with-aws-strands` 替代 `--solution` 来评分你的实现。依赖缺失时，可选模式跳过，严格可选模式失败。上游验证的 SDK 版本是 `strands-agents==1.57.1`；所有模型回复都是本地 fixture。

## 参考资料

[参考资料 1](https://strandsagents.com/docs/user-guide/concepts/model-providers/custom_model_provider/)
