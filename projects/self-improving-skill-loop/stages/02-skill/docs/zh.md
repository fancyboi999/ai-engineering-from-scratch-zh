# 执行透明路由技能并评分

**第 2 阶段，共 4 阶段。** Python。预计约 2 小时。

路由技能是有序的合取规则列表。匹配全部词项使多词规则比独立关键词集合更具体，首次匹配顺序也是契约的一部分。评估逐案例保存预测与预期标签，让汇总无法隐藏谁退步了。

```figure
pj-self-improving-skill-loop-2
```

## 实现边界

```python
def route(text,rules,default='unknown'):
    raise NotImplementedError("Implement the stage contract")
```

主要参考：[参考资料 1](https://docs.python.org/3/library/hashlib.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[模型评估](../../../../../phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md)。先完成[第 1 阶段](../../01-dataset/docs/zh.md)。

路由技能是透明的有序列表。规则要求全部词项命中，首个匹配规则获胜。计算准确率前记录每个预期/预测对，让错误能驱动提案。

```text
rule terms=[password,reset], label=access
"password reset expired" -> access
"password rejected" -> unknown
```

## 构建与检查

输入词只规范化一次。空词项集合绝不能成为匹配所有内容的规则。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py self-improving-skill-loop --stage 2 --path learning-artifacts/self-improving-skill-loop
```

预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案通过不代表你的学习者工作区已完成。

## 下一步探究

靠前的宽泛规则遮蔽后面更精确的规则时会怎样？
