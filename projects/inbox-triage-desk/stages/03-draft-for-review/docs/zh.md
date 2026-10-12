# 创建带来源引文的未发送草稿

> 生成可审核的邮件草稿，不虚构承诺。

**类型：** Build  
**语言：** Python  
**阶段：** 第 3 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 你要构建什么

分类不能告诉你回复应承诺什么。离线草稿引用来源首行，再留出明确标记的回复位置。用 EmailMessage 序列化邮件头和换行；不要靠字符串拼接组装原始邮件头。

```figure
pj-inbox-triage-desk-3
```

## 推演示例

发件人询问 Could you lend two chairs? 时，草稿指向该句并包含 [Write and check your response here.]。它不声称椅子可用。X-Unsent: 1 标识预期草稿流程；项目没有 SMTP 调用。

编码前，写下这个示例的返回字段和一个应失败的输入。将预期结果放在实现旁，以便区分契约变化与 bug。

## 实现契约

- `build_draft(message: dict, decision: dict) -> dict`
- `provider_proposal(message, endpoint, model, api_key="") -> dict`

检查决策属于该邮件，且每个证据跨度都匹配。返回 message_id、to、subject、body、eml、status=draft-only 和 source_quote。添加 In-Reply-To 与去重的 References。可选 HTTP 分类器必须拒绝不支持的类别、空引文和正文中不存在的引文，返回 review_required=True。远程端点要求 HTTPS。只有 localhost 或显式回环 IP 地址（IPv4 或 IPv6）可使用 HTTP，且主机名和端口须有效。拒绝 URL 凭据、片段和空白。使用专用 urllib opener，其 HTTPRedirectHandler.redirect_request 返回 None，让所有重定向在第二次请求转发凭据前失败。

保持之前阶段正常工作。在学习者工作区实现这些函数；推演示例时不要打开参考方案。

## 提示与失败案例

用 BytesParser 重新解析生成的 .eml，检查收件人和会话邮件头。适配器应在本地服务器或模拟传输上测试序列化请求；离线测试不能证明真实模型质量。

## 运行本阶段

在仓库根目录初始化一次，然后运行累积测试：

```bash
python3 scripts/project_test.py inbox-triage-desk --init my-inbox-triage-desk
python3 scripts/project_test.py inbox-triage-desk --stage 3 --path my-inbox-triage-desk
```

起始实现故意抛出实现错误。后续初始化保留而非替换源文件。通过结果要求每个选定测试都运行；跳过测试不是完成证据。

## 检查你的推理

为什么有来源依据的引文仍不足以验证模型选择的类别？在保留审核的前提下，你会更改哪个组件让回复草稿更有用？

## 关联最终产物

HTML 审核台、triage.json 和可下载的未发送 .eml 草稿。默认分类器使用明确短语规则，不是 LLM。它处理导出邮件文件夹，绝不连接邮箱或发送回复。不会推断日期、紧急程度或承诺行动。

完成项目后，尝试自己的输入：

```bash
cd my-inbox-triage-desk
python3 main.py --input ./fixtures --out ./inbox-output
```

在自己标注的留出集上将模型提案与短语基线比较。报告分歧；不要称每个模型输出都是改进。

## 主要参考

[官方 API 文档](https://docs.python.org/3/library/email.parser.html)。实现、示例和 fixture 均为原创。参考资料解释底层 API；项目专属政策在上文规定。
