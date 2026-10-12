# 导出可编辑学习地图与集成契约

第 4 阶段，共 4 阶段。导出学习地图并校验完成回执。

## 构建机制

标记基础已完成会减少剩余分钟数，但保留原计划。未完成采集就标记发布已完成会被拒绝。

```figure
pj-community-learning-path-finder-4
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

输入 JSON 含 resources、goals、budget 和可选 completed ID。输出 learning-map.html、path.json、unmet-prerequisites.json。编辑 HTML 中的进度 JSON，下载 decisions.json，再以 --decisions decisions.json 重跑。课程平台按数组顺序导入 path.json 中的 path 条目，保留 id、prerequisites、minutes 和 completed 字段。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py community-learning-path-finder --stage 4 --path learning-artifacts/community-learning-path-finder --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

HTML 编辑代表自报进度。导入器校验依赖一致性和指纹，不验证学习者身份或评估是否通过。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
