# 用可检查的关键词分数排序分块

第 2 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在先前契约之上。

## 变化内容

词频通过对数趋于饱和，文档频率降低常见词权重。返回完整分块契约及分数，而不只是文本，因为下一阶段需要来源偏移。词汇基线会漏掉同义词；加入嵌入（embedding）服务前先测量它。

## 推演一个具体案例

cache 查询应将缓存政策排在请求期限文档之前。重复 cache 会按对数增加词频；许多分块都出现的词，其贡献小于罕见词。

```figure
pj-doc-qa-with-citations-2
```

改变实验输入，在查看指标前计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

实现 `retrieval.py`：`retrieve`。这是带引用的文档问答与 LangChain 的第 2 阶段产物。它接受明确输入，返回供下一阶段使用的可检查结果。

使用[公共 API 契约](../../../API.md)和带类型的起始签名。核心函数返回值，让提供的驱动器负责文件输入、参数解析和展示。

对两侧一致地分词和大小写折叠。仅正分进入结果；未知查询必须返回空候选列表，供第 3 阶段拒答。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py doc-qa-with-citations --init learning-artifacts/doc-qa-with-citations` 初始化一次。然后累积评分：

```bash
python3 scripts/project_test.py doc-qa-with-citations --stage 2 --path learning-artifacts/doc-qa-with-citations --strict
```

实现契约前，新工作区应失败。完成全部阶段后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/doc-qa-with-citations
python3 cli.py samples/docs "When does cache expire?" --output answer.json --html answer.html
```

## 探查失败边界

添加大量重复无关词的文档。确认仅长度不会让它变得相关。




## 参考资料

[参考资料 1](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)
