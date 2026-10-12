# 声明方案与证据

> 明确范围、约束和不确定性。

**类型：** Build
**语言：** TypeScript
**阶段：** 第 1 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的前面阶段。
**预计时间：** 约 2 小时

## 构建内容

创建标准和方案表。每项标准声明固定 min/max 范围、成本或收益方向，以及非负权重。每个方案为每项标准提供数值或 null，并附来源笔记。null 表示未测量，绝不是零。

## 示例推演

Open gallery 的 access 为 9、setup 为 8、flow 为 8。Exhibition pods 为 6,2,7。archive 布局的 flow 未知，仍显示但不合格。三个 fixture 都是原创教学数据。

```figure
pj-decision-tradeoff-explorer-1
```

## 实现契约

`parse(text:string):Decision`。标准：`{id,label,weight,direction,min,max,limit?}`。方案：`{id,label,values:{criterion:number|null},notes:{criterion:string}}`。拒绝重复 ID、缺失笔记、越界数字、未知标准键、为零或非有限的总权重，以及非有限的范围宽度。最多 30 项标准、200 个方案和一 MiB。

生成部分产物前先拒绝格式错误的输入。测试包括独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py decision-tradeoff-explorer --init /tmp/decision-tradeoff-explorer-work
python3 scripts/project_test.py decision-tradeoff-explorer --stage 1 --path /tmp/decision-tradeoff-explorer-work --strict
```

初始化复制累积脚手架，不替换你的工作。在第一阶段 starter 中实现 TODO 函数；后续阶段 starter 笔记描述新增行为。测试导入学习者工作区。阶段通过后，按 README 中的命令运行自己的输入。

## 检查与扩展

把展览表换成你工作中的一个决策。记录哪些值来自测量，哪些是估计。

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。全部 fixture 和实现均为原创。
