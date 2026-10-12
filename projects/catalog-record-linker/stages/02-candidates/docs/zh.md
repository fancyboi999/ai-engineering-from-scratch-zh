# 生成候选配对并解释相似度

第 2 阶段，共 4 阶段。用加权 token 重叠率对可解释的配对排序。

## 构建机制

“River Atlas”与“Atlas”的标题重叠率为 1/2。作者 Ada 相同，得到 0.8×0.5+0.2×1=0.6。

```figure
pj-catalog-record-linker-2
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

实现 candidates(left,right,threshold=0.25)，同时报告两个分项分数。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py catalog-record-linker --stage 2 --path learning-artifacts/catalog-record-linker --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

词语相同只能产生候选。“River Atlas”和“River Atlas Junior”可能是不同版本。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
