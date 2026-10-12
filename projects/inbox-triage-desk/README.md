# 收件箱分流台

将导出的邮件变成有证据支撑的审核队列和未发送回复草稿。

你将构建 HTML 审核台、triage.json 和可下载的未发送 .eml 草稿。输入：导出 .eml 邮件的目录。只对纯文本正文分类；仅含 HTML 的邮件仍展示给人工审核。

## 开始之前

Python 3.10 或更新版本。必需的核心使用标准库，离线运行。Python 标准库自带 MIME 解析、结构化邮件生成和可移植文档导出能力。

- 能读写 Python 字典和列表。
- 理解函数返回值或抛出 ValueError。
- 知道邮件头与 MIME 正文是不同的数据结构。

## 动手构建

```bash
python3 scripts/project_test.py inbox-triage-desk --init my-inbox-triage-desk
python3 scripts/project_test.py inbox-triage-desk --stage 1 --path my-inbox-triage-desk
python3 scripts/project_test.py inbox-triage-desk --all --solution --strict
```

第一条命令创建刻意未完成的工作区。后续阶段扩展同一个源文件；测试包含新的留出输入。参考方案通过仅验证示例，不会为学习者赢得证书。

## 实际使用

```bash
cd projects/inbox-triage-desk/solution
python3 main.py --input ./fixtures --out ./inbox-output
```

在本地打开生成的 index.html。将 HTML 和 JSON 复制进你的工作流程，或从 main 导入具名函数。附带演示在原创 fixture 上运行同一实现：

```bash
python3 demo.py
```

## 阶段

1. [读取 MIME 并保留邮件标识](stages/01-parse-messages/docs/zh.md)
2. [按引用分组并解释队列](stages/02-group-and-triage/docs/zh.md)
3. [创建带来源引文的未发送草稿](stages/03-draft-for-review/docs/zh.md)
4. [导出可审计的收件箱工作台](stages/04-export-the-desk/docs/zh.md)

## 结果能说明什么

默认分类器使用明确的短语规则，不是 LLM。它处理导出邮件文件夹，绝不连接邮箱或发送回复。不会推断日期、紧急程度或承诺行动。

可选：追加 --provider-url http://127.0.0.1:1234/v1/chat/completions --model YOUR_MODEL。只有明确选择时，兼容 OpenAI 的聊天端点才会收到邮件正文。需要认证时由 INBOX_MODEL_API_KEY 提供。远程 provider 必须使用 HTTPS；HTTP 仅接受 localhost 和显式回环 IP 地址。拒绝 URL 凭据和重定向。提案必须含精确来源引文，保留在 model-proposals.json 中供审核；不会覆盖规则决策。

provider 测试使用受控响应或回环 HTTP。它们验证请求和响应契约，不验证模型质量或在线服务可用性。本项目不配置账户连接、外发邮件、周期任务或云部署。

## 改成你自己的版本

用自己工作流程中的小规模导出替换编写的 fixture，运行前写下预期结果。保留另一组示例用于评估。有用的前后对照应展示输入、可检查的中间证据和可移植输出；不能用受欢迎程度代替测量结果。

## 主要参考

[官方 API 文档](https://docs.python.org/3/library/email.parser.html)。所有项目代码、课程正文和 fixture 均为原创。
