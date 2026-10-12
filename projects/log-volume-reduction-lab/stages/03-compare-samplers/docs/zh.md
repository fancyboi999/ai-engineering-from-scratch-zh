# 比较采样策略对稀有事件的表现

> 将固定记录预算用于常见或稀有模板。

**类型：** Build
**语言：** Rust, Python
**阶段：** 3 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

均匀采样选择索引 floor(i*N/budget)。稀有度采样按模板频次、再按源行号排序，先为每个模板选择一个代表，再按该排序填满剩余预算。不需要随机种子或模型。

## 示例推演

200 条记录、预算为 8 时，均匀采样选择索引 0,25,50,75,100,125,150,175，漏掉索引 137 的 disk-full。稀有度采样先选这个仅出现一次的模板。两者最多返回八条记录。

```figure
pj-log-volume-reduction-lab-3
```

## 实现契约

`sample(records:&[Record],budget:usize,policy:&str)->Result<Vec<Record>,String>`。策略只能是 uniform 或 rarity。预算为零或输入为空时返回空向量；预算超过输入时，每条记录返回一次。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py log-volume-reduction-lab --init /tmp/log-volume-reduction-lab-work
python3 scripts/project_test.py log-volume-reduction-lab --stage 3 --path /tmp/log-volume-reduction-lab-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

把稀有事件移到均匀采样的索引上。演示中的优势应在此 fixture 上消失，说明一个例子无法证明普遍优越性。

[Go 标准库](https://pkg.go.dev/std) 和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
