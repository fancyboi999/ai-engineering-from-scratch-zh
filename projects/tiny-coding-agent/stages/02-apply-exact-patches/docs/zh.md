# 应用带前置条件的精确补丁

**第 2 阶段，共 4 阶段。** Python。预计约 2 小时。

补丁是对当前文件的断言，不是盲目覆盖指令。要求旧文本恰好出现一次。模型猜了过期代码或歧义片段时，拒绝补丁并保留文件。

将替换内容写到同目录临时文件，保留目标权限位，再原子替换目标。这样写入时进程失败不会留下半写源文件，也能保持脚本可执行。

```figure
pj-tiny-coding-agent-2
```

主要参考：[主要技术参考](https://docs.python.org/3/library/subprocess.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和 [Agent 循环](../../../../../phases/14-agent-engineering/01-the-agent-loop/docs/zh.md)。先完成[第 1 阶段](../../01-confine-paths/docs/zh.md)。

补丁准确声明预期替换内容。损坏的 basket 没有把价格和数量相乘，而是返回 price + quantity。只有表达式出现一次时才替换。

```text
old: price + quantity
new: price * quantity
occurrences=1 -> write; occurrences=0 or 2 -> reject
```

## 构建与检查

打开临时输出文件前统计精确匹配。替换原文件时保留权限。写入前记录临时路径，在 `finally` 中删除，包括写入、关闭或替换失败时。替换成功前原文件保持不变。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py tiny-coding-agent --stage 2 --path learning-artifacts/tiny-coding-agent
```

预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案通过不代表你的学习者工作区已完成。

## 下一步探究

规划器提出补丁后，另一位编辑者已经修好文件，应怎么办？
