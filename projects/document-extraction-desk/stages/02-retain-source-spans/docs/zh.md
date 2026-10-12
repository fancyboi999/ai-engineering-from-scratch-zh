# 抽取候选，不丢失证据

**类型：** Build
**语言：** Python
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时，完成所链接前置课程后
**前置要求：** 前一阶段以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

## 构建内容

本阶段是文档抽取审核台的一部分：从文本文档抽取结构化字段，检查精确来源片段，导出前批准有歧义的值。

公共契约为 `extract_candidates(text, schema)`。提供的 CLI 和样本文件在你的工作区中；在 `main.py` 实现领域函数。保留签名，让其他应用也能调用同一边界。

## 推演机制

把候选当作提案，不是事实。重复 Seats 标签产生两个候选，而非静默选择最后一个。每个提案含精确引用和半开字符区间：text[start:end] 必须等于 quote。

偏移指原始文本中的 Python Unicode 字符位置。不要规范化整个文档后，再把偏移应用到原文。去除候选两端空白会改变 start 和 end，因此计算偏移时需计入前导空白。

| 来源 | 候选状态 |
|---|---|
| Seats: 18 | 第一个 seats 提案 |
| Seats: 24 | 第二个 seats 提案 |
| Delivery: 2026-10-14 | 一个日期提案 |

## 运行前预测

在 Seats 前放一个非 ASCII 名称，手动计算候选片段。验证切片，不做字节计数运算。

```figure
pj-document-extraction-desk-2
```

改变图表输入并检查计算值。将一个变化结果对应到实现中的一行；图表是解释模型，不替代真实程序。

## 构建并验证

从仓库根目录初始化一次。这会复制公共类型、函数桩、真实命令包装器和原创样本输入。新工作区首次运行第一阶段时应失败，因为领域函数尚未实现。

```bash
python3 scripts/project_test.py document-extraction-desk --init my-document-extraction-desk
python3 scripts/project_test.py document-extraction-desk --stage 2 --path my-document-extraction-desk --strict
```

用标准库实现契约。先手动推演示例。保持调用方输入不变，对格式错误数据给出可采取行动的错误。测试导入你的工作区，绝不导入参考实现。

## 分层提示

1. 对捕获值使用 match.start。
2. 保留每次识别出的出现。
3. 批准前比较切片与引用。

## 预期结果

本阶段评分器报告第 1 到第 2 阶段的真实通过测试。完成全部四阶段后，用提供的样本运行工具，再换成自己的输入：

```bash
cd my-document-extraction-desk
python3 cli.py sample.txt --schema schema.json --output output/review.html
```

最终产物为本地 HTML 审核台，可下载绑定来源的批准决定和已批准 JSON 值映射。打开 HTML 并检查配套 JSON，不要只信退出码。改变一项输入，准确解释哪个结果必须变化。

## 扩展

向外部抽取器输入伪造引用，要求明确可见的拒绝。

范围：核心读取 UTF-8 文本和明确标注的字段，不声称支持 OCR 或 PDF 解析。外部 OCR 或模型适配器可通过 --proposals 提供提案，但每条引用与偏移都会检查。来源正确不等于字段含义正确。

主要参考：[Python 正则表达式匹配偏移](https://docs.python.org/3/library/re.html#match-objects)。实现与练习数据均为原创教学示例。
