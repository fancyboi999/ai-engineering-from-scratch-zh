# 导出映射表和合并目录

第 4 阶段，共 4 阶段。导出保留来源的映射表及经过审核的实体。

## 构建机制

用 csv.DictReader 读取 crosswalk.csv，把 source_id 关联到原目录，再在 merged-catalog.json 中找到对应实体。

```figure
pj-catalog-record-linker-4
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

输入含 left_csv、right_csv 和可选 threshold。输出为 crosswalk.csv、merged-catalog.json、review.html。下载 decisions.json，在 pairs 中添加 {left,right,match,values} 条目，然后传入 --decisions decisions.json。指纹会拒绝针对不同源输入的审核。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py catalog-record-linker --stage 4 --path learning-artifacts/catalog-record-linker --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

任何相似度都不会自动合并记录。ready 表示被接受的合并已解决冲突，不声称所有候选都已检查。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
