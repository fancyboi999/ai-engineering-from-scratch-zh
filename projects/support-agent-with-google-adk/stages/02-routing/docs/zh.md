# 将路由与授权分开决策

> invoice refund 选择 billing，可使用 read_invoice。invoice login 让 billing 和 access 同分，因此升级。billing 路由请求 read_account 会被拒绝，尽管该工具对其他专家有效。

**类型：** Build
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 实用边界

对 billing、access 和 platform 的不同领域词计数。只有一个领域取得唯一正分时才选择路由。未知主题和同分交给人工审核。随后按读取能力允许列表检查选定专家。领域标签从不授予全部工具权限。

```figure
pj-support-agent-with-google-adk-2
```

## 推演示例

invoice refund 选择 billing，可使用 read_invoice。invoice login 让 billing 和 access 同分，因此升级。billing 路由请求 read_account 会被拒绝，尽管该工具对其他专家有效。

编码前写下返回字段和预期副作用次数。保留第二个应失败输入，让成功示例不能变成硬编码答案。

## 构建契约

在学习者工作区实现 `route(text), authorize(specialist, tool) in routing.py`。保留导出名称，继续使用前面阶段，不重复它们的政策。

路由器是透明关键词基线，不是语义模型。能力检查是确定性的，与分类置信度无关。组合流程在选择支持证据或构造 agent 图之前调用它。

起始实现提供这些原创政策输入。与评分算法分开，后续政策变化就无需重写分类器。

| 专家 | 不同小写单词 | 允许能力 |
| --- | --- | --- |
| billing | invoice, refund, payment | read_invoice |
| access | password, login, account | read_account |
| platform | outage, latency, error | read_status |

`route` 返回一个专家名称或 `human`。`authorize` 返回布尔值；未知专家或能力返回 false。比较完整词 token，因此 `payment` 匹配而 `repayment` 不匹配。

## 提示

用单词集合，防止重复 invoice 二十次主导分数。测试未知工具名和 human 专家。明确处理同分，不按字母顺序选择。

## 验证你的实现

```bash
python3 scripts/project_test.py support-agent-with-google-adk --init my-support-agent-with-google-adk
python3 scripts/project_test.py support-agent-with-google-adk --stage 2 --path my-support-agent-with-google-adk --strict
```

初始化一次。累积测试导入工作区并保留之前源文件。参考方案运行验证教学实现，绝不会授予学习者证书。可选 SDK 检查需要项目 README 中的依赖和命令。

## 检查结果

为什么即使用模型标注请求，仍需要此授权函数？增加写入能力前，你需要什么证据？

完成的项目生成 HTML 审核页和 support.json，包含脱敏工单、选定能力、来源指引、回复或升级和状态历史。

```bash
cd projects/support-agent-with-google-adk/solution
python3 main.py --ticket fixtures/ticket.json --out support-output
```

用自己工作流程的小型输入替换 fixture。预期结果与观察证据一起保存，再另留一组案例用于评估。provider 请求测试证明序列化和控制流，不证明模型质量。

## 主要参考

[官方 API 文档](https://google.github.io/adk-docs/)。实现、政策选择和示例均为原创。
