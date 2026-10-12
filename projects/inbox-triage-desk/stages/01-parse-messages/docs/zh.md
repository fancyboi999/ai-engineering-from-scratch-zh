# 读取 MIME 并保留邮件标识

> 解析导出邮件并保留其精确的纯文本证据。

**类型：** Build  
**语言：** Python  
**阶段：** 第 1 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 你要构建什么

邮件是结构化消息，不是从第一个空行处分割出来的正文。MIME 可包含多个备选内容、附件和传输编码。用显式 policy 的 BytesParser，选择纯文本正文。在文本旁保留发件人、主题、邮件 ID、引用 ID 和正文状态。

```figure
pj-inbox-triage-desk-1
```

## 推演示例

邮件带有 From: Ada <ada@example.invalid>、Message-ID: <a@example.invalid>，正文为 Please reserve a chair，将产生发件人 ada@example.invalid 和精确正文文本。第二个 HTML 备选内容不能替代该文本。缺少 Message-ID 时，原始字节的摘要提供稳定的本地标识。

编码前，写下这个示例的返回字段和一个应失败的输入。将预期结果放在实现旁，以便区分契约变化与 bug。

## 实现契约

- `parse_message(raw: bytes) -> dict`

返回 id、sender、subject、text、references 和 body_status。拒绝空输入、超过 1,000,000 字节的输入和缺少发件人地址的输入。合并主题中的空白，但保留正文换行。引用 ID 去重。仅含 HTML 的正文变成空 text，状态为 no-plain-body。

保持之前阶段正常工作。在学习者工作区实现这些函数；推演示例时不要打开参考方案。

## 提示与失败案例

先处理一封纯文本邮件，再构建 multipart/alternative。优先用解析器的 get_body，而不是遍历每个文本部分：附加的文本文件不是邮件正文。对同一字节解析两次，测试回退 ID。

## 运行本阶段

在仓库根目录初始化一次，然后运行累积测试：

```bash
python3 scripts/project_test.py inbox-triage-desk --init my-inbox-triage-desk
python3 scripts/project_test.py inbox-triage-desk --stage 1 --path my-inbox-triage-desk
```

起始实现故意抛出实现错误。后续初始化保留而非替换源文件。通过结果要求每个选定测试都运行；跳过测试不是完成证据。

## 检查你的推理

为什么主题相同的两封邮件仍须保留独立标识？如果悄悄把 HTML 转成纯文本，会丢失哪些信息？

## 关联最终产物

HTML 审核台、triage.json 和可下载的未发送 .eml 草稿。默认分类器使用明确短语规则，不是 LLM。它处理导出邮件文件夹，绝不连接邮箱或发送回复。不会推断日期、紧急程度或承诺行动。

完成项目后，尝试自己的输入：

```bash
cd my-inbox-triage-desk
python3 main.py --input ./fixtures --out ./inbox-output
```

增加本地附件清单，记录名称和大小。将附件与用于分流的文本分开。

## 主要参考

[官方 API 文档](https://docs.python.org/3/library/email.parser.html)。实现、示例和 fixture 均为原创。参考资料解释底层 API；项目专属政策在上文规定。
