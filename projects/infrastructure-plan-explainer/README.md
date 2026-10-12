# 基础设施计划解释器

为审核拟议变更的开发者读取保存的 Terraform 计划 JSON。保留未知与敏感值标记，区分替换和原地更新，追踪声明的依赖。生成解释链接到精确计划地址的审核简报；绝不应用计划。

实现使用 Python 3.10+ 和标准库。样本为原创教学数据。精确的输入、输出和错误契约见 [API.md](API.md)。

## 构建你自己的版本

```bash
python3 scripts/project_test.py infrastructure-plan-explainer --init learning-artifacts/infrastructure-plan-explainer
python3 scripts/project_test.py infrastructure-plan-explainer --stage 1 --path learning-artifacts/infrastructure-plan-explainer --strict
```

在实现第一个契约前，新初始化的起始代码会明确失败。后续阶段保留你的源文件。提供的 CLI 和展示辅助函数只是脚手架；所有领域决策都会调用你的实现。

```bash
python3 scripts/project_test.py infrastructure-plan-explainer --all --path learning-artifacts/infrastructure-plan-explainer --strict
cd learning-artifacts/infrastructure-plan-explainer
python3 cli.py samples/input.json --output my-output
```

## 运行参考实现与自己的输入

```bash
python3 scripts/project_test.py infrastructure-plan-explainer --all --solution --strict
cd projects/infrastructure-plan-explainer/solution
python3 cli.py samples/input.json --output demo-output
python3 cli.py /absolute/path/to/your-input.json --output your-output
```

直接传入保存的 Terraform JSON：terraform show -json saved.plan > input.json，然后 python3 cli.py input.json --output review。输出 change-brief.md、resource-impact.json、review.html。下游加载 resource-impact.json，按 id 将 graph.edges 的 from/to 关联到 resources。解释已有 JSON 文件不需要 Terraform 二进制程序或 provider 凭据。

## 示例推演与限制

数据库密码变为 [sensitive]，包括数组内嵌套密码。计算所得 endpoint 变为 [unknown]，即使 after 对象省略该键。

工具绝不应用计划。不预测停机时长、完整执行顺序、成本或运行时依赖发现；配置引用是带有明确未解决项的证据。

## 阶段

1. [加载版本化计划，不暴露敏感值](stages/01-load/docs/zh.md)
2. [分类创建、更新、替换和删除动作](stages/02-actions/docs/zh.md)
3. [追踪声明的依赖与未知结果](stages/03-dependencies/docs/zh.md)
4. [导出关联地址的审核解释](stages/04-brief/docs/zh.md)

## 主要参考资料

- [技术参考](https://developer.hashicorp.com/terraform/internals/json-format)
