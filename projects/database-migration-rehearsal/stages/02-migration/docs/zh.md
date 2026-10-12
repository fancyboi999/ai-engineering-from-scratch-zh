# 仅在可丢弃副本上应用迁移

第 2 阶段，共 4 阶段。在可丢弃内存副本上运行提供的 SQL。

## 构建机制

ALTER TABLE attendees ADD COLUMN city TEXT 改变的是副本。之后读取原文件，仍得到原模式和原始行。

```figure
pj-database-migration-rehearsal-2
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

实现 rehearse(source,migration)，即使多语句脚本部分成功后出错，也保留证据。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py database-migration-rehearsal --stage 2 --path learning-artifacts/database-migration-rehearsal --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

ATTACH 和危险 PRAGMA 会破坏仅限副本的行为。拒绝它们以及扩展/文件函数。这项政策不是操作系统沙箱。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
