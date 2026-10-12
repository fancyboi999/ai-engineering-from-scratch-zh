# 导出关联地址的审核解释

第 4 阶段，共 4 阶段。在脱敏变更证据旁发布精确资源身份。

## 构建机制

替换保留地址和稳定章节锚点。审核者可用 id 将该章节连接到资源影响图。

```figure
pj-infrastructure-plan-explainer-4
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

直接传入保存的 Terraform JSON：terraform show -json saved.plan > input.json，然后 python3 cli.py input.json --output review。输出 change-brief.md、resource-impact.json、review.html。下游加载 resource-impact.json，按 id 将 graph.edges 的 from/to 关联到 resources。解释已有 JSON 文件不需要 Terraform 二进制程序或 provider 凭据。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py infrastructure-plan-explainer --stage 4 --path learning-artifacts/infrastructure-plan-explainer --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

工具绝不应用计划。不预测停机时长、完整执行顺序、成本或运行时依赖发现；配置引用是带有明确未解决项的证据。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
