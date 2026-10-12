# 比较生效值

> 区分相等、变化、缺失和意外的键。

**类型：** Build
**语言：** Go
**阶段：** 第 3 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的此前阶段。
**预计时间：** 约 2 小时

## 构建内容

比较预期解析值和观测到的标量映射。对键的并集中每个键输出一行并排序。缺失的键不同于存在且为 null 的键。先比较是否相等再脱敏，使两个不同秘密值仍报告 changed。

## 示例推演

生效的 timeout 是 5，但观测值是 30，所以 kind 为 changed。api_token 也改变了，但两个展示值及全部历史值都变为 [REDACTED]。region 保持 equal。

```figure
pj-configuration-drift-explainer-3
```

## 实现契约

`Compare(in Input) Report` 返回 `schemaVersion:1`、`drift:boolean` 和排序后的 `changes`。每行包含 `key`、`kind`、`expected`、`observed`、`history`、`redacted`。敏感键不区分大小写匹配 password/secret/token/api-key/credential，或匹配显式 sensitive 列表。

在生成部分产物前拒绝格式错误的输入。测试包含独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py configuration-drift-explainer --init /tmp/configuration-drift-explainer-work
python3 scripts/project_test.py configuration-drift-explainer --stage 3 --path /tmp/configuration-drift-explainer-work --strict
```

初始化复制累积脚手架，不替换你的工作。实现第一阶段 starter 的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学员工作区。阶段通过后，用自己的输入运行 README 中的命令。

## 检查与扩展

为 CI 消费者添加显式允许列表，只将选中的漂移行视为阻断项。

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
