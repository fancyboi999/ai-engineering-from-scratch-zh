# 按引用分组并解释队列

> 用邮件引用构建会话，用明确短语进行分流。

**类型：** Build  
**语言：** Python  
**阶段：** 第 2 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 你要构建什么

主题不是可靠的会话键。不相关发件人可使用相同主题，一个会话也可更改主题。只有 References 或 In-Reply-To ID 在导入集合中存在时才建立连接。相连邮件形成会话，不受输入顺序变化影响。

```figure
pj-inbox-triage-desk-2
```

## 推演示例

三封邮件 a、引用 a 的 b、引用 b 的 c 属于同一会话。主题相同但无引用的第四封独立存在。分流时，Please confirm 匹配 action，For your information 匹配 information。正文同时含两者则为 uncertain，因为只选一个获胜规则会隐藏冲突。

编码前，写下这个示例的返回字段和一个应失败的输入。将预期结果放在实现旁，以便区分契约变化与 bug。

## 实现契约

- `group_threads(messages: list[dict]) -> list[dict]`
- `triage(message: dict, rules: dict | None = None) -> dict`

返回稳定会话 ID 和按 ID 排序的邮件。完全相同的重复项合并；同一 ID 下冲突记录抛出 ValueError。规则类别为 action 和 information；未匹配或类别冲突则为 uncertain。每次命中包含 category、quote、start 和 end，且 text[start:end] 等于 quote。优先级为 action=0、uncertain=1、information=2。

保持之前阶段正常工作。在学习者工作区实现这些函数；推演示例时不要打开参考方案。

## 提示与失败案例

会话连接的表示应独立于显示顺序。检查短语边界，防止 please 匹配 displeased。在原始正文上做不区分大小写匹配以查找跨度，不要搜索可能改变偏移的大小写折叠字符串。

## 运行本阶段

在仓库根目录初始化一次，然后运行累积测试：

```bash
python3 scripts/project_test.py inbox-triage-desk --init my-inbox-triage-desk
python3 scripts/project_test.py inbox-triage-desk --stage 2 --path my-inbox-triage-desk
```

起始实现故意抛出实现错误。后续初始化保留而非替换源文件。通过结果要求每个选定测试都运行；跳过测试不是完成证据。

## 检查你的推理

匹配短语能证明请求紧急或正当吗？为什么不确定项应排在信息类项之前？

## 关联最终产物

HTML 审核台、triage.json 和可下载的未发送 .eml 草稿。默认分类器使用明确短语规则，不是 LLM。它处理导出邮件文件夹，绝不连接邮箱或发送回复。不会推断日期、紧急程度或承诺行动。

完成项目后，尝试自己的输入：

```bash
cd my-inbox-triage-desk
python3 main.py --input ./fixtures --out ./inbox-output
```

把用户维护的发件人偏好加入为独立、明确的排序信号。保持匹配短语和规则方法可见。

## 主要参考

[官方 API 文档](https://docs.python.org/3/library/email.parser.html)。实现、示例和 fixture 均为原创。参考资料解释底层 API；项目专属政策在上文规定。
