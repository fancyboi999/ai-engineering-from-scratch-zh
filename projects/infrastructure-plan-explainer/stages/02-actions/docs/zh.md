# 分类创建、更新、替换和删除动作

第 2 阶段，共 4 阶段。区分替换与普通更新。

## 构建机制

["delete","create"] 和 ["create","delete"] 都替换资源。保留原始 actions 供检查顺序。

```figure
pj-infrastructure-plan-explainer-2
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

实现 classify(actions)；拒绝不支持的序列，不猜测含义。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py infrastructure-plan-explainer --stage 2 --path learning-artifacts/infrastructure-plan-explainer --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

forget 表示 Terraform 停止管理对象，不等于删除远程对象。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
