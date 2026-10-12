# 执行回滚并检测数据丢失

第 3 阶段，共 4 阶段。执行声明的逆操作并比较所有捕获状态。

## 构建机制

删除参与者 2 后再删除新添加的列，并不能恢复参与者。语法上成功的回滚仍可能不具备可逆性。

```figure
pj-database-migration-rehearsal-3
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

实现 test_rollback(source,migration,rollback)。与原快照比较模式、内容哈希、计数和序列值。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py database-migration-rehearsal --stage 3 --path learning-artifacts/database-migration-rehearsal --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

这只针对当前输入快照检查提供的回滚，不证明所有生产数据集都能恢复，也不保留连接级配置。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
