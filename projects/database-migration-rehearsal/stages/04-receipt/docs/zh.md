# 导出证据供明确的发布决策使用

第 4 阶段，共 4 阶段。组合模式差异、不变量和回滚，生成发布证据。

## 构建机制

样本添加一列后删除一名参与者。same_rows 失败，回滚无法恢复丢失的人，因此 release_ready 保持 false。

```figure
pj-database-migration-rehearsal-4
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

输入 JSON 含 database（相对于 JSON 的路径）、migration SQL、rollback SQL 和 invariants。未提供 database 时，演示在输出目录创建原创 SQLite fixture。输出 rehearsal.json、schema-diff.json、review.html。发布门禁读取 rehearsal.json，要求 release_ready=true，同时保留各项不变量和回滚证据供人工审核。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py database-migration-rehearsal --stage 4 --path learning-artifacts/database-migration-rehearsal --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

工具不在原数据库上应用迁移，也不批准部署。大型表的演练可能占用大量内存；使用小型本地快照。两秒 SQL 进度期限限制语句，不限制所有备份或哈希工作。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
