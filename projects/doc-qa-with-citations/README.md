# 带引用的文档问答与 LangChain

区分精确来源支持和问题相关性的引用回执。

Python 3.10+；pathlib、字符串、偏移、字典和回调函数。可选 LangChain 依赖单独固定版本。核心使用标准库。评分器检查你选择的工作区，不从参考实现填补缺失行为。

## 构建并运行你自己的版本

从仓库根目录初始化一次。新的起始代码会故意失败。

```bash
python3 scripts/project_test.py doc-qa-with-citations --init learning-artifacts/doc-qa-with-citations
python3 scripts/project_test.py doc-qa-with-citations --stage 1 --path learning-artifacts/doc-qa-with-citations --strict
```

实现每个阶段，再运行累积评分器和提供的输入驱动器：

```bash
python3 scripts/project_test.py doc-qa-with-citations --all --path learning-artifacts/doc-qa-with-citations --strict
cd learning-artifacts/doc-qa-with-citations
python3 cli.py samples/docs "When does cache expire?" --output answer.json --html answer.html
```

驱动器和离线样本是提供的脚手架。它导入的是你的实现。公共输入类型和函数签名在起始代码与 [API 契约](API.md) 中。

## 单独检查参考实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py doc-qa-with-citations --all --solution --strict
cd projects/doc-qa-with-citations/solution
python3 cli.py samples/docs "When does cache expire?" --output answer.json --html answer.html
```

## 观察变化

cache 问题选中缓存句子，返回精确来源片段、行号和 SHA-256。查询 zebras 会拒答；对 cache 问题逐字引用香蕉句子会变为 needs_review。

编辑样本副本并重跑命令。将输入保存在输出旁，方便他人复现结果；提供的样本是原创教学数据。

## 集成与限制

导入 query(directory, question, model)。模型回调返回 JSON {source:chunk_id,quote:exact_text}。--response 接受已记录响应并应用同一门禁。

默认回答器是本地抽取式实现。词汇重叠无法证明语义蕴含。有效引用仍可能无关或过时；内容哈希让读者检测来源变化。

## 阶段

1. [加载本地文档并保留稳定来源](stages/01-documents/docs/zh.md)
2. [用可检查的关键词分数排序分块](stages/02-retrieval/docs/zh.md)
3. [只接受有检索片段依据的答案](stages/03-answer/docs/zh.md)
4. [使用框架分块器而不丢失偏移](stages/04-adapter/docs/zh.md)

## 可选框架集成

基线阶段仅使用标准库。框架适配器已有实现，并提供单独冒烟测试，以本地假模型使用真实安装的 SDK。它绝不联系云服务。

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r projects/doc-qa-with-citations/requirements-framework.txt
.venv/bin/python scripts/project_test.py doc-qa-with-citations --solution --optional --strict
.venv/bin/python projects/doc-qa-with-citations/solution/framework_demo.py
```

上游集成验证版本为 `langchain-text-splitters==1.1.2`。若存在云 provider 路径，仍需主动启用并使用自己的环境凭据；不执行云部署。

默认评分器覆盖离线核心和输入集成。`--optional` 添加 5 个使用真实 SDK 和确定性本地模型的测试。缺少 SDK 会报告 SKIP 和安装提示；`--optional --strict` 在缺依赖时失败。只通过默认测试不代表框架验证。

## 主要参考资料
