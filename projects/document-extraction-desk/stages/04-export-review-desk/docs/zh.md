# 展示证据并导出审核后的值

**类型：** Build
**语言：** Python
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时，完成所链接前置课程后
**前置要求：** 前一阶段以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

## 构建内容

本阶段是文档抽取审核台的一部分：从文本文档抽取结构化字段，检查精确来源片段，导出前批准有歧义的值。

公共契约为 `render_review(report)`。提供的 CLI 和样本文件在你的工作区中；在 `main.py` 实现领域函数。保留签名，让其他应用也能调用同一边界。

## 推演机制

围绕未解决选择构建界面。选择候选会高亮精确来源片段，来源仍显示在字段旁。下载决定仅创建本地 JSON 文件，不向任何地方提交值。用 --approve 再次运行 CLI，重新校验并导出已批准值。

在每字段中将批准候选保留为 `selected` start/end 对。重新打开已批准报告时，渲染该候选并勾选其单选输入。不编辑就再次下载，必须保留原决定。

使用安全 DOM 文本操作和转义 HTML。文档可能包含必须保持普通文本的标记。在决定文件中保留来源指纹，让 CLI 即使审核页一直开着也能拒绝过期选择。

| 产物 | 使用方 |
|---|---|
| review.html | 人类阅读来源并选择 |
| approvals.json | CLI 校验所选片段 |
| review.json approvedValues | 其他应用导入审核后的字段 |

## 运行前预测

在浏览器选择一个 Seats 候选，验证高亮文本与它完全匹配。应用前下载并检查决定 JSON。

```figure
pj-document-extraction-desk-4
```

改变图表输入并检查计算值。将一个变化结果对应到实现中的一行；图表是解释模型，不替代真实程序。

## 构建并验证

从仓库根目录初始化一次。这会复制公共类型、函数桩、真实命令包装器和原创样本输入。新工作区首次运行第一阶段时应失败，因为领域函数尚未实现。

```bash
python3 scripts/project_test.py document-extraction-desk --init my-document-extraction-desk
python3 scripts/project_test.py document-extraction-desk --stage 4 --path my-document-extraction-desk --strict
```

用标准库实现契约。先手动推演示例。保持调用方输入不变，对格式错误数据给出可采取行动的错误。测试导入你的工作区，绝不导入参考实现。

## 分层提示

1. 将控件绑定偏移，而非复制标签。
2. 转义文档内容和序列化脚本数据。
3. 保持缺失字段可见，不隐藏它们。

## 预期结果

本阶段评分器报告第 1 到第 4 阶段的真实通过测试。完成全部四阶段后，用提供的样本运行工具，再换成自己的输入：

```bash
cd my-document-extraction-desk
python3 cli.py sample.txt --schema schema.json --output output/review.html
```

最终产物为本地 HTML 审核台，可下载绑定来源的批准决定和已批准 JSON 值映射。打开 HTML 并检查配套 JSON，不要只信退出码。改变一项输入，准确解释哪个结果必须变化。

## 扩展

编写小型下游程序，拒绝 status 为 needs_review 的报告。

范围：核心读取 UTF-8 文本和明确标注的字段，不声称支持 OCR 或 PDF 解析。外部 OCR 或模型适配器可通过 --proposals 提供提案，但每条引用与偏移都会检查。来源正确不等于字段含义正确。

主要参考：[Python 正则表达式匹配偏移](https://docs.python.org/3/library/re.html#match-objects)。实现与练习数据均为原创教学示例。
