# 快照本地数据库并定义不变量

第 1 阶段，共 4 阶段。从只读源捕获模式、行数和内容身份。

## 构建机制

源表有两名参与者。快照记录 CREATE TABLE 语句、计数 2 和排序后行表示的哈希。

```figure
pj-database-migration-rehearsal-1
```

调整控件，预测中间结果，再与计算所得的证据比较。图表解释本阶段的机制；评分时运行的是你的 Python 函数。

## 精确契约

实现 snapshot(source)。用 SQLite 备份到内存，在不以可写方式打开源文件的情况下纳入 WAL 可见的已提交状态。

阅读 [API.md](../../../API.md)，包括返回字段和失败行为。第一阶段起始代码提供文件 I/O 和 HTML 展示；在 `main.py` 中实现领域函数。让先前函数继续通过测试，因为后续阶段会组合使用它们。

## 验证

```bash
python3 scripts/project_test.py database-migration-rehearsal --stage 1 --path learning-artifacts/database-migration-rehearsal --strict
```

阶段测试包含独立于演示的留出输入、边界情况、格式错误的数据和一个对抗案例。修改规则前，先检查失败的断言。

## 失败边界与扩展

仅凭行数无法发现把 Ada 换成另一个人。内容哈希能检测行数相同的数据变化。

完成全部四个阶段后，在学习工作区运行 `python3 cli.py samples/input.json --output my-output`。将样本路径替换为自己的 JSON 文档，检查输出文件，并把导出产物交给项目 README 中描述的下游使用方。
