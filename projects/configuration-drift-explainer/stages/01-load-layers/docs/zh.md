# 加载具名配置层

> 比较环境前，先拒绝含糊的配置。

**类型：** Build
**语言：** Go
**阶段：** 第 1 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的此前阶段。
**预计时间：** 约 2 小时

## 构建内容

构建 `Load`，处理上限为一 MiB 的 JSON 对象，包含有序 `layers`、必需的 `observed` 和可选的 `sensitive` 精确键名。层名必须唯一。工具使用扁平标量键；使用前应显式展平嵌套配置。

## 示例推演

fixture 在 defaults.json 声明 timeout 30，又在 env:TIMEOUT 声明 timeout 5。两个值都在输入解析后保留。嵌套 timeout 对象会被拒绝，因为契约并未约定深度合并策略。

```figure
pj-configuration-drift-explainer-1
```

## 实现契约

`Load(data []byte) (Input, error)` 返回类型化的 `Layer{Name, Values}` 记录。拒绝未知的顶层或层字段、尾随 JSON、null 映射、重复名称和空白键。标量可以是 null、字符串、布尔值或数字。

在生成部分产物前拒绝格式错误的输入。测试包含独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py configuration-drift-explainer --init /tmp/configuration-drift-explainer-work
python3 scripts/project_test.py configuration-drift-explainer --stage 1 --path /tmp/configuration-drift-explainer-work --strict
```

初始化复制累积脚手架，不替换你的工作。实现第一阶段 starter 的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学员工作区。阶段通过后，用自己的输入运行 README 中的命令。

## 检查与扩展

添加独立的 JSON 展平适配器，并明确数组是否应作为原子值。

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
