# 规划目标并暴露命名冲突

第 3 阶段，共 4 阶段。先预留当前目标，再规划下一个文件。

## 构建机制

两个 note.txt 文件变成 documents/note.txt 和 documents/note-2.txt。已有 occupied 路径参与同一冲突集合。

```figure
pj-download-folder-sort-desk-3
```

更改控件，预测中间结果，再与计算出的证据比较。可视化解释本阶段；评分会执行你的 Python 函数。

## 精确契约

实现 plan_moves(records, occupied=None)；groups 包含共享同一内容摘要的全部源文件。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一个起始实现提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。保持前面函数通过测试，因为后续阶段会组合调用它们。

## 验证

```bash
python3 scripts/project_test.py download-folder-sort-desk --stage 3 --path learning-artifacts/download-folder-sort-desk --strict
```

阶段测试包含独立于演示的留出输入、边界、畸形数据和对抗案例。更改规则前先检查失败断言。

## 失败边界与扩展

对目标路径做大小写折叠，避免常见的不区分大小写文件系统冲突。重复字节只报告，绝不删除。

完成全部四阶段后，在学习者工作区内运行 `python3 cli.py samples/input.json --output my-output`。用自己的 JSON 文档替换样本路径，检查文件，再将导出的产物交给项目 README 中介绍的消费者。
