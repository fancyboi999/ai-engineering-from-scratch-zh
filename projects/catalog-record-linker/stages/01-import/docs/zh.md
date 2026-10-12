# 导入两份目录并保留稳定的来源标识

第 1 阶段，共 4 阶段。保留稳定 ID 和原始目录字段。

## 构建机制

left:map-1 和 right:r-7 可能描述同一本地图集，但两条源记录都不会被丢弃。

```figure
pj-catalog-record-linker-1
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

实现 import_catalog(text, source)；要求 id,title 列，并保留 source/source_id 字段供程序使用。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py catalog-record-linker --stage 1 --path learning-artifacts/catalog-record-linker --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

重复 ID 会让审核决定产生歧义。生成候选前就应拒绝它们。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
