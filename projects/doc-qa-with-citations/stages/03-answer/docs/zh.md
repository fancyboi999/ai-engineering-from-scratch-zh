# 只接受有检索片段依据的答案

第 3 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在先前契约之上。

## 变化内容

让模型选择精确引用和来源 ID，再校验两者。引用子串给出可检查片段，不保证来源真实。空检索直接显式拒答，不调用模型。后续改写生成器需要不同的支持门禁。

## 推演一个具体案例

来源写着“Cache expires in sixty seconds. Bananas are yellow.”。两句都能引用。对 cache 问题，香蕉句通过精确子串检查，但组合 CLI 因没有有意义的查询词重叠，将其标为 needs_review。

```figure
pj-doc-qa-with-citations-3
```

改变实验输入，在查看指标前计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

实现 `answer.py`：`answer`。这是带引用的文档问答与 LangChain 的第 3 阶段产物。它接受明确输入，返回供下一阶段使用的可检查结果。

使用[公共 API 契约](../../../API.md)和带类型的起始签名。核心函数返回值，让提供的驱动器负责文件输入、参数解析和展示。

先校验来源 ID 和精确引用，再从引用分块恢复偏移。将相关性保留为独立、明确受限的政策，不假装引用就证明了答案。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py doc-qa-with-citations --init learning-artifacts/doc-qa-with-citations` 初始化一次。然后累积评分：

```bash
python3 scripts/project_test.py doc-qa-with-citations --stage 3 --path learning-artifacts/doc-qa-with-citations --strict
```

实现契约前，新工作区应失败。完成全部阶段后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/doc-qa-with-citations
python3 cli.py samples/docs "When does cache expire?" --output answer.json --html answer.html
```

## 探查失败边界

返回来自另一分块 ID 的精确引用。即使相同文本存在于语料其他位置，答案门禁也必须拒绝。




## 参考资料

[参考资料 1](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)
