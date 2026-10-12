# 使用 Google ADK 的支持 agent

准备脱敏支持回复或人工升级，再通过真正的 ADK agent 运行相同路由和能力规则。实用结果是 HTML 审核页和 JSON，包含来源指引、保留的回复文本和交接历史。

Python 3.10 或更新版本。从字典、异常和模块开始；可选阶段增加异步模型事件。必需核心使用标准库和编写的支持指引。

```bash
python3 scripts/project_test.py support-agent-with-google-adk --init my-support
python3 scripts/project_test.py support-agent-with-google-adk --stage 1 --path my-support --strict
python3 scripts/project_test.py support-agent-with-google-adk --all --solution --strict
cd projects/support-agent-with-google-adk/solution
python3 main.py --ticket fixtures/ticket.json --out support-output
```

打开 support-output/index.html。工单文件含 id 和 text。未知主题和同分会升级；选中的专家只能读取允许的本地指引。不连接账单系统、账户服务或外发邮件。

1. [开始会话前校验](stages/01-intake/docs/zh.md)：限制输入并移除规定的邮件/API-key 模式。
2. [路由与授权](stages/02-routing/docs/zh.md)：区分领域评分与读取能力允许列表。
3. [保留实际响应](stages/03-handoff/docs/zh.md)：强制执行 received、routed、answered 和 escalated 转换。
4. [在 ADK 内复用政策](stages/04-adk-adapter/docs/zh.md)：构造真实 agent 前组合前面的契约。

脱敏模式刻意保持狭窄，不能保证移除每个敏感值。默认回复来自编写的本地指引记录，不是语言模型生成。

## 真实 SDK 对照

在仓库根目录执行：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r projects/support-agent-with-google-adk/requirements-framework.txt
.venv/bin/python scripts/project_test.py support-agent-with-google-adk --all --solution --optional --strict
.venv/bin/python projects/support-agent-with-google-adk/solution/framework_demo.py
```

适配器固定为 google-adk 2.10.0。它用确定性本地 BaseLlm fixture 运行真实 Workflow 和 LlmAgent 对。测试检查事件作者、最终状态、脱敏模型请求、被阻止能力和人工升级。框架无关组合也能在未安装包时运行。缺失依赖产生 SKIP；严格可选评分遇到跳过会失败。

通过 SDK 处理你自己的脱敏工单：

```bash
.venv/bin/python projects/support-agent-with-google-adk/solution/main.py --ticket YOUR_TICKET.json --adk --out support-adk-output
```

追加 --model YOUR_ADK_MODEL 会明确选择在线模型，需要该 provider 文档规定的凭据。模型收到清洗后工单和选定来源指引。回答仍是待审核草稿；仅靠 prompt 不能证明有来源依据。模型路由提案无法覆盖确定性路由和能力门禁。

可扩展一个带来源 ID 的真实只读支持知识适配器。保持工单接收和授权在适配器之前，并将无依据回答评估与 SDK 控制流测试分开。

[官方 ADK 文档](https://google.github.io/adk-docs/)。所有项目实现、示例和 fixture 指引均为原创。
