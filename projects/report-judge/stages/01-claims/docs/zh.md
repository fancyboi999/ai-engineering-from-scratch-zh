# 解析主张与引用标记

**第 1 阶段，共 4 阶段。** Python。预计约 2 小时。

引用解析器识别引用，不决定它们是否真实。对每句内标记去重，保留主张文本，忽略 Markdown 标题。这个有意收窄的语法每行处理一段，不假装能解析任意 Markdown 或缩写。

```figure
pj-report-judge-1
```

## 实现边界

```python
def parse_claims(text):
    raise NotImplementedError("Implement the stage contract")
```

主要参考：[参考资料 1](https://www.rfc-editor.org/rfc/rfc8259)。

## Orchard 示例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。

分别审计每个事实句。Orchard 有带来源的重试限制及无关部署主张；一个有效标记不能让整个段落通过。

```text
Worker A invokes worker B [S1]. Retry limit is 99 [S2].
claim 1 -> cites [S1]
claim 2 -> cites [S2]
```

## 构建与检查

从主张文本移除标记前先提取。对重复标记去重，不丢弃句子身份。

在学习工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替代参考实现。

```bash
python3 scripts/project_test.py report-judge --init learning-artifacts/report-judge
python3 scripts/project_test.py report-judge --stage 1 --path learning-artifacts/report-judge
```

预测上面的中间状态，再运行阶段。新的桩代码会失败；参考实现通过不证明学习工作区已完成。

## 接下来探查

证据映射缺少 [S2] 时应怎样处理？
