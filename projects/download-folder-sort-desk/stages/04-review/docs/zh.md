# 为文件管理器导出经审核的归档计划

第 4 阶段，共 4 阶段。消费选定移动项前检查源文件标识。

## 构建机制

选择 handout.txt 会让该文件得到 approved=true。盘点后若内容变化，校验会拒绝计划。

```figure
pj-download-folder-sort-desk-4
```

更改控件，预测中间结果，再与计算出的证据比较。可视化解释本阶段；评分会执行你的 Python 函数。

## 精确契约

输入 JSON 包含相对该 JSON 文件的 folder，以及可选的已有目标路径字符串 occupied。输出：moves.json、duplicates.json、review.html。下载并编辑 decisions.json，保留 fingerprint 并填写包含源路径的 approved 数组，然后用 --decisions decisions.json 重跑。文件管理器导入 review_plan(folder, json.load(open("moves.json")), decisions)，检查目标可用性后仅执行获批移动。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一个起始实现提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。保持前面函数通过测试，因为后续阶段会组合调用它们。

## 验证

```bash
python3 scripts/project_test.py download-folder-sort-desk --stage 4 --path learning-artifacts/download-folder-sort-desk --strict
```

阶段测试包含独立于演示的留出输入、边界、畸形数据和对抗案例。更改规则前先检查失败断言。

## 失败边界与扩展

本项目不会移动任何文件。文件管理器必须预留目标，并在移动前立即复查文件标识；这个规划门禁不是事务或操作系统沙箱。

完成全部四阶段后，在学习者工作区内运行 `python3 cli.py samples/input.json --output my-output`。用自己的 JSON 文档替换样本路径，检查文件，再将导出的产物交给项目 README 中介绍的消费者。
