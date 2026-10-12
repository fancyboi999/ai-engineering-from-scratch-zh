# 在交接中保留实际响应

> begin 后对 invoice 执行 classify，再以 Check the invoice reference 执行 respond，得到 answered 并保留 response="Check the invoice reference"。历史记录 classify 和 respond。对 invoice login 分类后 respond 会失败；escalate 才是有效转换。

**类型：** Build
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 实用边界

将工单建模为 received、routed，然后 answered 或 escalated。分类前响应无效。human 路由不能自动变成 answered。返回新状态并复制历史，让失败操作不会部分修改调用方旧状态。

```figure
pj-support-agent-with-google-adk-3
```

## 推演示例

begin 后对 invoice 执行 classify，再以 Check the invoice reference 执行 respond，得到 answered 并保留 response="Check the invoice reference"。历史记录 classify 和 respond。对 invoice login 分类后 respond 会失败；escalate 才是有效转换。

编码前写下返回字段和预期副作用次数。保留第二个应失败输入，让成功示例不能变成硬编码答案。

## 构建契约

在学习者工作区实现 `begin(ticket), transition(session, event, payload=None) in handoff.py`。保留导出名称，继续使用前面阶段，不重复它们的政策。

Respond 要求非空文本，并将其保存到 response。升级保存 escalation_reason。answered 和 escalated 是终态。导出的响应必须来自此状态，让成功执行产生可用草稿，而不只是转换日志。

`begin` 返回 `ticket_id`、`state="received"`、`route=None` 和空 `history`。每次成功转换向复制历史追加 `{"event": event, "state": next_state}`。分类通过第 2 阶段设置 `route`。Respond 去掉首尾空白并保存 `response`；升级保存提供的原因，未提供时用 `Human review required`。无效转换抛出 `ValueError`，不改变输入会话。

## 提示

比较转换前后的原始状态。断言它不变，而返回历史增加一项。再断言响应文本确实保留，不只是 state 等于 answered。

## 验证你的实现

```bash
python3 scripts/project_test.py support-agent-with-google-adk --init my-support-agent-with-google-adk
python3 scripts/project_test.py support-agent-with-google-adk --stage 3 --path my-support-agent-with-google-adk --strict
```

初始化一次。累积测试导入工作区并保留之前源文件。参考方案运行验证教学实现，绝不会授予学习者证书。可选 SDK 检查需要项目 README 中的依赖和命令。

## 检查结果

为了在进程重启后恢复状态，你会保存什么？保留的回答能证明模型从获授权证据生成了它吗？

完成的项目生成 HTML 审核页和 support.json，包含脱敏工单、选定能力、来源指引、回复或升级和状态历史。

```bash
cd projects/support-agent-with-google-adk/solution
python3 main.py --ticket fixtures/ticket.json --out support-output
```

用自己工作流程的小型输入替换 fixture。预期结果与观察证据一起保存，再另留一组案例用于评估。provider 请求测试证明序列化和控制流，不证明模型质量。

## 主要参考

[官方 API 文档](https://google.github.io/adk-docs/)。实现、政策选择和示例均为原创。
