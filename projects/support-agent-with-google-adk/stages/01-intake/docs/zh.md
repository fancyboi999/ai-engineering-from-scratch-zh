# 开始会话前校验

> 对 invoice for sam@example.invalid api_key=EXAMPLE_TOKEN，可用工单文本变成 invoice for [email] api_key=[redacted]。空字符串在路由前失败。相同清洗文本必须进入基线和 ADK 路径。

**类型：** Build
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 实用边界

支持请求是外部输入。创建任何会话前要求非空 ID 和 1 到 10,000 字符的文本。把规定邮件模式替换为 [email]，API-key 值替换为 [redacted]。保留工单 ID，让后续事件引用它，无需保存原始联系方式。

```figure
pj-support-agent-with-google-adk-1
```

## 推演示例

对 invoice for sam@example.invalid api_key=EXAMPLE_TOKEN，可用工单文本变成 invoice for [email] api_key=[redacted]。空字符串在路由前失败。相同清洗文本必须进入基线和 ADK 路径。

编码前写下返回字段和预期副作用次数。保留第二个应失败输入，让成功示例不能变成硬编码答案。

## 构建契约

在学习者工作区实现 `ticket(raw) in intake.py`。保留导出名称，继续使用前面阶段，不重复它们的政策。

正则只覆盖规定模式，不能证明任意个人数据、密码或全部凭据格式已移除。模型请求和导出报告不得含原始文本，在最终集成边界测试已知模式。

## 提示

从原始输入一路跟踪到返回字典。同时测试邮件和 key，而非只分开测试。报告校验错误时不要记录原始输入。

## 验证你的实现

```bash
python3 scripts/project_test.py support-agent-with-google-adk --init my-support-agent-with-google-adk
python3 scripts/project_test.py support-agent-with-google-adk --stage 1 --path my-support-agent-with-google-adk --strict
```

初始化一次。累积测试导入工作区并保留之前源文件。参考方案运行验证教学实现，绝不会授予学习者证书。可选 SDK 检查需要项目 README 中的依赖和命令。

## 检查结果

这两次替换后，真实工单哪些部分仍敏感？生产环境的数据最小化政策应放在哪里？

完成的项目生成 HTML 审核页和 support.json，包含脱敏工单、选定能力、来源指引、回复或升级和状态历史。

```bash
cd projects/support-agent-with-google-adk/solution
python3 main.py --ticket fixtures/ticket.json --out support-output
```

用自己工作流程的小型输入替换 fixture。预期结果与观察证据一起保存，再另留一组案例用于评估。provider 请求测试证明序列化和控制流，不证明模型质量。

## 主要参考

[官方 API 文档](https://google.github.io/adk-docs/)。实现、政策选择和示例均为原创。
