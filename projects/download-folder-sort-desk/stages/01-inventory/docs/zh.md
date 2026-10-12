# 盘点文件并计算内容标识

第 1 阶段，共 4 阶段。对字节计算哈希，保留相对根目录的文件标识。

## 构建机制

handout.txt 和 duplicate.txt 内容字节相同。文件名不同，SHA-256 值却一致。

```figure
pj-download-folder-sort-desk-1
```

更改控件，预测中间结果，再与计算出的证据比较。可视化解释本阶段；评分会执行你的 Python 函数。

## 精确契约

实现 inventory(folder)，流式处理普通文件并拒绝符号链接。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一个起始实现提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。保持前面函数通过测试，因为后续阶段会组合调用它们。

## 验证

```bash
python3 scripts/project_test.py download-folder-sort-desk --stage 1 --path learning-artifacts/download-folder-sort-desk --strict
```

阶段测试包含独立于演示的留出输入、边界、畸形数据和对抗案例。更改规则前先检查失败断言。

## 失败边界与扩展

符号链接可能逃出选定根目录。盘点过程拒绝它；绝不执行文件内容。

完成全部四阶段后，在学习者工作区内运行 `python3 cli.py samples/input.json --output my-output`。用自己的 JSON 文档替换样本路径，检查文件，再将导出的产物交给项目 README 中介绍的消费者。
