# 在真实 ADK 路径内复用政策

> login 工单选择 read_account 和 access-recovery 指引。fixture 专家据此回复，最终交接保存回复。access 路由请求 read_invoice，会在图运行前抛出 PermissionError。可选测试检查模型请求，保证原始邮件和示例 key 没有跨越边界。

**类型：** Build
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 实用边界

导入或调用框架前先组合前面课程。清洗并路由的工单得到一个获授权读取能力和带来源 ID 的编写指引。含歧义工单在模型调用前升级。提供的模型路由不能覆盖此门禁。随后 ADK 用包含两个 LlmAgent 实例的真实 Workflow 传播 route 和 response。

```figure
pj-support-agent-with-google-adk-4
```

## 推演示例

login 工单选择 read_account 和 access-recovery 指引。fixture 专家据此回复，最终交接保存回复。access 路由请求 read_invoice，会在图运行前抛出 PermissionError。可选测试检查模型请求，保证原始邮件和示例 key 没有跨越边界。

编码前写下返回字段和预期副作用次数。保留第二个应失败输入，让成功示例不能变成硬编码答案。

## 构建契约

在学习者工作区实现 `prepare_support, support_ticket, export_support in support.py; collect_events, run_adk in adk_adapter.py`。保留导出名称，继续使用前面阶段，不重复它们的政策。

默认 ADK 模型是显式注入的确定性 fixture。传入 --adk --model YOUR_MODEL 会选择真实 ADK provider，需要其凭据。即使在线回复仍是需审核草稿；prompt 不能证明来源依据。此示例能力是读取本地编写知识，不连接账单或账户服务。

起始实现提供 `KNOWLEDGE`，一个以专家为键的原创三记录字典。每项含稳定来源 ID 和指引文本：`billing-receipts`、`access-recovery` 或 `platform-status`。将它视为输入数据，围绕它实现校验、授权、组合和导出。

`prepare_support` 返回 `ticket`、`session`、`tool` 和 `evidence`。证据是 `{"source_id": id, "text": guidance}`。不支持或同分路由返回已升级会话及 null tool/evidence。不允许的显式工具抛出 `PermissionError`。`support_ticket` 添加方法标签，确定性基线将选定指引保存为会话响应。`export_support` 写出 support.json 和经转义的 index.html 审核页。

`collect_events` 接受含 `author`、`text` 和可选 `state_delta` 的字典。要求非空作者，跳过空文本，返回含 `agent`、`text` 和复制 `state_delta` 的行。ADK 结果保留准备字段，增加 `events`、`state`、`handoff_prompt`、`model_requests` 和 `method`。state 保存 route 和 response。billing 工单的解析后专家 prompt 以 `Use the route billing` 开头。记录本地 fixture 请求，让测试检查精确脱敏边界。升级会在导入或运行模型前返回空事件和请求。

## 提示

一起检查事件、最终会话状态和导出草稿。框架无关测试验证组合；--optional 运行真实 ADK 2.10.0 测试。缺少 SDK 算跳过，严格可选评分会失败，而非暗示掌握了框架。

## 验证你的实现

```bash
python3 scripts/project_test.py support-agent-with-google-adk --init my-support-agent-with-google-adk
python3 scripts/project_test.py support-agent-with-google-adk --stage 4 --path my-support-agent-with-google-adk --strict
```

初始化一次。累积测试导入工作区并保留之前源文件。参考方案运行验证教学实现，绝不会授予学习者证书。可选 SDK 检查需要项目 README 中的依赖和命令。

## 检查结果

确定性基线和 ADK 共享哪些数据？为什么必须防止模型提出的路由悄悄扩大权限？

完成的项目生成 HTML 审核页和 support.json，包含脱敏工单、选定能力、来源指引、回复或升级和状态历史。

```bash
cd projects/support-agent-with-google-adk/solution
python3 main.py --ticket fixtures/ticket.json --out support-output
```

用自己工作流程的小型输入替换 fixture。预期结果与观察证据一起保存，再另留一组案例用于评估。provider 请求测试证明序列化和控制流，不证明模型质量。

## 主要参考

[官方 API 文档](https://google.github.io/adk-docs/)。实现、政策选择和示例均为原创。
