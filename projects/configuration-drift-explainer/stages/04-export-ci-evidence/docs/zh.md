# 导出脱敏 CI 证据

> 生成助手无需接收秘密值也能使用的报告。

**类型：** Build
**语言：** Go
**阶段：** 第 4 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的此前阶段。
**预计时间：** 约 2 小时

## 构建内容

在 CLI 中组合各阶段。JSON 输出到 stdout，也可写入权限为 0600 的文件。报告是唯一导出的数据结构。`--check` 有漂移时退出 2，相等时退出 0，输入无效或 I/O 失败时退出 1。

## 示例推演

运行 README 命令，用 Python 加载报告：schemaVersion 为 1，变化的键是 api_token 和 timeout。在序列化字节中搜索任一 fixture token 都不应有结果。

```figure
pj-configuration-drift-explainer-4
```

## 实现契约

`Export(in Input) ([]byte,error)` 仅序列化 `Compare(in)`。CLI：`go run . --input PATH --out PATH [--check]`。Go run 会包装子进程退出码，因此检查精确退出码 2 时要构建二进制。

在生成部分产物前拒绝格式错误的输入。测试包含独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py configuration-drift-explainer --init /tmp/configuration-drift-explainer-work
python3 scripts/project_test.py configuration-drift-explainer --stage 4 --path /tmp/configuration-drift-explainer-work --strict
```

初始化复制累积脚手架，不替换你的工作。实现第一阶段 starter 的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学员工作区。阶段通过后，用自己的输入运行 README 中的命令。

## 检查与扩展

将构建后的二进制集成进 CI，把脱敏 JSON 作为助手附件传递。来源名称和非秘密值仍可见；请有意识地选择敏感键。

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
