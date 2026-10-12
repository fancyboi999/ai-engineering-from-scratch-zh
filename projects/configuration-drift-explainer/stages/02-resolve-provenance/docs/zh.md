# 带来源追踪地解析优先级

> 选择最后声明的值，同时保留每个被覆盖的设置。

**类型：** Build
**语言：** Go
**阶段：** 第 2 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的此前阶段。
**预计时间：** 约 2 小时

## 构建内容

对已验证的层实现 `Resolve`。后面的层覆盖前面的层。按顺序保留每个键的所有来源名称和值。解析是内部操作，可能含秘密；只有报告可以安全导出。

## 示例推演

timeout 的历史是 [(defaults.json,30),(env:TIMEOUT,5)]，生效值为 5。无关的 region 值仍留在本地。显式 null 替换先前的值，而不是删除键。

```figure
pj-configuration-drift-explainer-2
```

## 实现契约

`Resolve(layers []Layer) map[string]Effective`，其中类型为 `Effective{Value any, History []Source}` 和 `Source{Layer string, Value any}`。空层生成空映射。

在生成部分产物前拒绝格式错误的输入。测试包含独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py configuration-drift-explainer --init /tmp/configuration-drift-explainer-work
python3 scripts/project_test.py configuration-drift-explainer --stage 2 --path /tmp/configuration-drift-explainer-work --strict
```

初始化复制累积脚手架，不替换你的工作。实现第一阶段 starter 的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学员工作区。阶段通过后，用自己的输入运行 README 中的命令。

## 检查与扩展

比较显式 null、缺失的键和空字符串。它们代表三种不同的生效配置。

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
