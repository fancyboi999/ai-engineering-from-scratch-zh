# 计算可比较的分数

> 归一化单位，不掩盖缺失值或硬约束。

**类型：** Build
**语言：** TypeScript
**阶段：** 第 2 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的前面阶段。
**预计时间：** 约 2 小时

## 构建内容

收益归一化为 (value-min)/(max-min)；成本归一化为 (max-value)/(max-min)。把当前权重归一化，使其和为一。成本限制是最大值；收益限制是最小值。任何缺失值或违反限制都会使总分为 null。

## 示例推演

Open gallery 归一化后 access 为 .9、setup 为 .2、flow 为 .8。在权重 .5,.3,.2 下得分 .67。Pods 得 .68，排名第一。未知的 archive flow 产生 null，而不是重新归一化的分数。

```figure
pj-decision-tradeoff-explorer-2
```

## 实现契约

`normalize(c:Criterion,v:number):number`；`score(data,weights={}):Row[]` 按分数降序再按 ID 排序。行包含 `{id,label,score,missing,violations,normalized}`。权重覆盖值是原始非负大小；无效、溢出或全零权重抛出错误。只从自身属性读取权重覆盖；constructor 等标准 ID 是合法数据。

生成部分产物前先拒绝格式错误的输入。测试包括独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py decision-tradeoff-explorer --init /tmp/decision-tradeoff-explorer-work
python3 scripts/project_test.py decision-tradeoff-explorer --stage 2 --path /tmp/decision-tradeoff-explorer-work --strict
```

初始化复制累积脚手架，不替换你的工作。在第一阶段 starter 中实现 TODO 函数；后续阶段 starter 笔记描述新增行为。测试导入学习者工作区。阶段通过后，按 README 中的命令运行自己的输入。

## 检查与扩展

如果用当前方案重新缩放每项标准，为何加入一个无关方案也会改变答案？

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。全部 fixture 和实现均为原创。
