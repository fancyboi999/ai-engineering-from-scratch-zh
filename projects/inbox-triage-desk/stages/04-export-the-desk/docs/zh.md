# 导出可审计的收件箱工作台

> 从同一审核记录写出可移植 HTML、JSON 和草稿文件。

**类型：** Build  
**语言：** Python  
**阶段：** 第 4 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 你要构建什么

导出是实用的最终产物。无需运行 Python，也应能查看输入、类别、原因和精确匹配短语。按优先级再按邮件 ID 排序，让重复导出易于比较。将 JSON 报告作为与其他应用的集成边界。

```figure
pj-inbox-triage-desk-4
```

## 推演示例

编写的维修活动 fixture 有一封行动邮件、一封信息回复和一条不明确的便笺。它变成两个会话和三个队列项。打开 index.html 可查看每封完整正文并下载未发送草稿；triage.json 保留会话成员和证据偏移。

编码前，写下这个示例的返回字段和一个应失败的输入。将预期结果放在实现旁，以便区分契约变化与 bug。

## 实现契约

- `export_desk(messages, out: Path, rules=None) -> dict`

写出 index.html、triage.json，以及每封唯一邮件一个摘要命名的 .eml。绝不直接用主题或发件人作文件名。在 HTML 中转义全部邮件文本与主题。包含 schema 版本、规则方法和需审核状态。空输入也须导出有效的空工作台。

保持之前阶段正常工作。在学习者工作区实现这些函数；推演示例时不要打开参考方案。

## 提示与失败案例

JSON 与 HTML 渲染共用一个报告结构，防止总数不一致。在测试主题里放入类似 HTML 的字符串并验证转义。验证草稿文件确实存在，而非仅测试显示链接。

## 运行本阶段

在仓库根目录初始化一次，然后运行累积测试：

```bash
python3 scripts/project_test.py inbox-triage-desk --init my-inbox-triage-desk
python3 scripts/project_test.py inbox-triage-desk --stage 4 --path my-inbox-triage-desk
```

起始实现故意抛出实现错误。后续初始化保留而非替换源文件。通过结果要求每个选定测试都运行；跳过测试不是完成证据。

## 检查你的推理

将输出目录移到另一台计算机后，哪些内容仍可用？消费者依赖你的 JSON 格式前还需要什么约定？

## 关联最终产物

HTML 审核台、triage.json 和可下载的未发送 .eml 草稿。默认分类器使用明确短语规则，不是 LLM。它处理导出邮件文件夹，绝不连接邮箱或发送回复。不会推断日期、紧急程度或承诺行动。

完成项目后，尝试自己的输入：

```bash
cd my-inbox-triage-desk
python3 main.py --input ./fixtures --out ./inbox-output
```

把 triage.json 导入本地仪表盘，或加入以邮件 ID 为键的审核决策文件。编辑内容与原始证据保持分离。

## 主要参考

[官方 API 文档](https://docs.python.org/3/library/email.parser.html)。实现、示例和 fixture 均为原创。参考资料解释底层 API；项目专属政策在上文规定。
