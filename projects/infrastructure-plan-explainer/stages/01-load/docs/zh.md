# 加载版本化计划，不暴露敏感值

第 1 阶段，共 4 阶段。保留未知和敏感标记，丢弃原始计划字段。

## 构建机制

数据库密码变为 [sensitive]，包括数组内嵌套密码。计算所得 endpoint 变为 [unknown]，即使 after 对象省略该键。

```figure
pj-infrastructure-plan-explainer-1
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

实现 load_plan(document)。接受格式主版本 1；忽略无关字段，仅保留脱敏资源证据和依赖引用。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py infrastructure-plan-explainer --stage 1 --path learning-artifacts/infrastructure-plan-explainer --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

保存的计划可能包含秘密。阅读导出的脱敏产物；绝不把原始 variables 或 prior_state 复制进简报。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
