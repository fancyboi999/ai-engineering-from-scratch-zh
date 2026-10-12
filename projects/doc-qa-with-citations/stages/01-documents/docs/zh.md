# 加载本地文档并保留稳定来源

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在先前契约之上。

## 变化内容

检索前保留来源身份、内容哈希和精确偏移。字符窗口是有意简化的基线：重叠保留边界附近上下文，但不产生新证据。加载器拒绝逃出根目录的符号链接，避免扫描文档时静默读取其他目录。

## 推演一个具体案例

对文本 abcdef，size 4 和 overlap 1 产生 [0,4)="abcd"，然后 [3,6)="def"。偏移以 Unicode 字符而非 UTF-8 字节计，文件 SHA-256 标识精确来源版本。

```figure
pj-doc-qa-with-citations-1
```

改变实验输入，在查看指标前计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

实现 `documents.py`：`load_documents`、`chunk_document`。这是带引用的文档问答与 LangChain 的第 1 阶段产物。它接受明确输入，返回供下一阶段使用的可检查结果。

使用[公共 API 契约](../../../API.md)和带类型的起始签名。核心函数返回值，让提供的驱动器负责文件输入、参数解析和展示。

分块到达源末尾后立即停止，否则短尾块可能产生另一个冗余窗口。解析每个路径，拒绝逃出根目录的符号链接。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py doc-qa-with-citations --init learning-artifacts/doc-qa-with-citations` 初始化一次。然后累积评分：

```bash
python3 scripts/project_test.py doc-qa-with-citations --stage 1 --path learning-artifacts/doc-qa-with-citations --strict
```

实现契约前，新工作区应失败。完成全部阶段后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/doc-qa-with-citations
python3 cli.py samples/docs "When does cache expire?" --output answer.json --html answer.html
```

## 探查失败边界

在引用片段前放一个多字节字符。验证 Python 字符串切片、返回偏移和渲染器使用同一单位。




## 参考资料

[参考资料 1](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)
