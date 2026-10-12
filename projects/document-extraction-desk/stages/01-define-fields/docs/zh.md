# 抽取值前先定义字段

**类型：** Build
**语言：** Python
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时，完成所链接前置课程后
**前置要求：** [开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

## 构建内容

本阶段是文档抽取审核台的一部分：从文本文档抽取结构化字段，检查精确来源片段，导出前批准有歧义的值。

公共契约为 `validate_schema(schema)`。提供的 CLI 和样本文件在你的工作区中；在 `main.py` 实现领域函数。保留签名，让其他应用也能调用同一边界。

## 推演机制

模式是文档读取者与下游应用的约定。每个字段有稳定机器名称、可接受行标签、类型和必需标志。一个标签只能属于一个字段；否则任何模型参与前，同一源行就已有两个不兼容去向。

将模式校验与抽取分开。缺少必需值是文档问题，无效字段类型是编写模式的问题。区分两者能给出有用错误，而非看似成功的空答案。

| 字段 | 标签 | 类型 | 必需 |
|---|---|---|---|
| requester | Requester, Requested by | text | 是 |
| seats | Seats, Attendees | integer | 是 |
| delivery | Delivery, Delivery date | date | 是 |

## 运行前预测

给两个字段添加 Seats 标签，预测程序应在哪里停止。不读取来源也能找到这个冲突。

```figure
pj-document-extraction-desk-1
```

改变图表输入并检查计算值。将一个变化结果对应到实现中的一行；图表是解释模型，不替代真实程序。

## 构建并验证

从仓库根目录初始化一次。这会复制公共类型、函数桩、真实命令包装器和原创样本输入。新工作区首次运行第一阶段时应失败，因为领域函数尚未实现。

```bash
python3 scripts/project_test.py document-extraction-desk --init my-document-extraction-desk
python3 scripts/project_test.py document-extraction-desk --stage 1 --path my-document-extraction-desk --strict
```

用标准库实现契约。先手动推演示例。保持调用方输入不变，对格式错误数据给出可采取行动的错误。测试导入你的工作区，绝不导入参考实现。

## 分层提示

1. 遍历标签前校验字段形状。
2. 分别追踪字段名和规范化标签身份。
3. 比较大小写折叠形式，同时保留展示标签。

## 预期结果

本阶段评分器报告第 1 到第 1 阶段的真实通过测试。完成全部四阶段后，用提供的样本运行工具，再换成自己的输入：

```bash
cd my-document-extraction-desk
python3 cli.py sample.txt --schema schema.json --output output/review.html
```

最终产物为本地 HTML 审核台，可下载绑定来源的批准决定和已批准 JSON 值映射。打开 HTML 并检查配套 JSON，不要只信退出码。改变一项输入，准确解释哪个结果必须变化。

## 扩展

添加可选 contact 字段，说明为何其缺失不能阻止必需字段完成。

范围：核心读取 UTF-8 文本和明确标注的字段，不声称支持 OCR 或 PDF 解析。外部 OCR 或模型适配器可通过 --proposals 提供提案，但每条引用与偏移都会检查。来源正确不等于字段含义正确。

主要参考：[Python 正则表达式匹配偏移](https://docs.python.org/3/library/re.html#match-objects)。实现与练习数据均为原创教学示例。
