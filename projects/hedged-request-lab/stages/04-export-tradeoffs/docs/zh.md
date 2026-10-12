# 导出延迟与重复工作权衡

> 同时报告更快的响应和产生它们的额外请求。

**类型：** Build
**语言：** Go
**阶段：** 第 4 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的此前阶段。
**预计时间：** 约 2 小时

## 构建内容

针对同一受控端点顺序运行基线与对冲样本。导出分布、发起调用数、独立对冲回执和单独测量的 fixture 工作。客户端取消后，本地 fixture 刻意继续睡眠。

## 示例推演

三个基线样本发三次调用；三个对冲样本通常发六次。fixture 记录全部九次启动和完成，观测到的客户端取消另行报告。更快胜出延迟不会抹掉重复工作。

```figure
pj-hedged-request-lab-4
```

## 实现契约

`Compare(samples int,delay time.Duration)(Comparison,error)` 运行回环 fixture。`CompareEndpoints(samples,delay,client,primary,secondary,workCallback)` 复用运行器。样本数须为 1..100。JSON schemaVersion 为 1。

在生成部分产物前拒绝格式错误的输入。测试包含独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py hedged-request-lab --init /tmp/hedged-request-lab-work
python3 scripts/project_test.py hedged-request-lab --stage 4 --path /tmp/hedged-request-lab-work --strict
```

初始化复制累积脚手架，不替换你的工作。实现第一阶段 starter 的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学员工作区。阶段通过后，用自己的输入运行 README 中的命令。

## 检查与扩展

读取导出 JSON，计算 hedgedCalls/baselineCalls。重复几个延迟，勾勒延迟与工作量曲线；不要由本地端点外推远程服务。

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
