# 使用框架分块器而不丢失偏移

第 4 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在先前契约之上。

## 变化内容

适配器保留从零构建的检索和答案校验器。可选 LangChain 路径提供递归分块和假模型接口，再把每块转换回精确来源偏移。分块器改写文本时应拒绝，而非编造来源。重复重叠子串必须让搜索游标前进一个位置，而不是整个分块长度。

## 推演一个具体案例

框架分块器从“ababa”返回两个重叠“aba”。位置为 0 和 2；将游标前进整个分块长度会错过第二个有效出现。

```figure
pj-doc-qa-with-citations-4
```

改变实验输入，在查看指标前计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

实现 `adapter.py`：`adapt_splits`、`framework_qa`。这是带引用的文档问答与 LangChain 的第 4 阶段产物。它接受明确输入，返回供下一阶段使用的可检查结果。

使用[公共 API 契约](../../../API.md)和带类型的起始签名。核心函数返回值，让提供的驱动器负责文件输入、参数解析和展示。

将游标移动到上次匹配后一个字符，逐一对照原文验证返回片段。在可选 SDK 路径外围保留从零构建的检索和引用校验器。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py doc-qa-with-citations --init learning-artifacts/doc-qa-with-citations` 初始化一次。然后累积评分：

```bash
python3 scripts/project_test.py doc-qa-with-citations --stage 4 --path learning-artifacts/doc-qa-with-citations --strict
```

实现契约前，新工作区应失败。完成全部阶段后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/doc-qa-with-citations
python3 cli.py samples/docs "When does cache expire?" --output answer.json --html answer.html
```

## 探查失败边界

用自己的两个文本文件运行目录 CLI。然后安装固定版本的可选依赖，比较分块偏移，而不只是分块数量。

默认回答器是本地抽取式实现。词汇重叠无法证明语义蕴含。有效引用仍可能无关或过时；内容哈希让读者检测来源变化。

## 验证实际框架

五个默认阶段测试不导入 SDK，只检查适配器契约。安装固定版本可选依赖后，明确加入五个真实 SDK 测试：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r projects/doc-qa-with-citations/requirements-framework.txt
.venv/bin/python scripts/project_test.py doc-qa-with-citations --solution --optional --strict
.venv/bin/python projects/doc-qa-with-citations/solution/framework_demo.py
```

用 `--path my-doc-qa-with-citations` 替代 `--solution` 评分你的实现。缺依赖在可选模式下跳过，在严格可选模式下失败。上游验证 SDK 版本为 `langchain-text-splitters==1.1.2`；所有模型回复都是本地 fixture。

## 参考资料

[参考资料 1](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)
