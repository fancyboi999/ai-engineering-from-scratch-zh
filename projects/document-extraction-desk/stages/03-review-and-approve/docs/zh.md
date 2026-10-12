# 将批准绑定到一个文档版本

**类型：** Build
**语言：** Python
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时，完成所链接前置课程后
**前置要求：** 前一阶段以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

## 构建内容

本阶段是文档抽取审核台的一部分：从文本文档抽取结构化字段，检查精确来源片段，导出前批准有歧义的值。

公共契约为 `typed_value(quote, kind); review_document(text, schema, candidates, decisions=None)`。提供的 CLI 和样本文件在你的工作区中；在 `main.py` 实现领域函数。保留签名，让其他应用也能调用同一边界。

## 推演机制

类型校验检查引用能否变为所请求值：ISO 日期必须是真实日历日期，数值必须有限。证据校验检查引用是否存在于声明位置。人类仍需决定该值是否属于目标字段。这是三个独立判断。

对 `number`，接受 Python `float` 文本语法，包括符号、小数、指数和数字间下划线：`-2.5`、`.5`、`1e3`、`1_000` 有效。逗号和单位后缀如 `1,000`、`3.5 kg` 无效。拒绝非有限结果，包括 `inf`、`NaN` 和 `1e309` 这类溢出。`integer` 更严格：可选符号后接数字。

批准包含来源指纹及每字段所选 start/end 对。文档变化后，旧决定不能静默批准同位置的不同值。missing、invalid、ambiguous、proposed、approved 状态让工作流可检查。

| 情况 | 状态 | 导出影响 |
|---|---|---|
| 一个有效引用，无决定 | proposed | 未批准 |
| 两个 Seats 引用 | ambiguous | 审核者选择 |
| 所选片段和匹配指纹 | approved | 可以导出值 |

## 运行前预测

批准 18 个座位，在顶部插入新行，预测为何必须拒绝旧批准。

```figure
pj-document-extraction-desk-3
```

改变图表输入并检查计算值。将一个变化结果对应到实现中的一行；图表是解释模型，不替代真实程序。

## 构建并验证

从仓库根目录初始化一次。这会复制公共类型、函数桩、真实命令包装器和原创样本输入。新工作区首次运行第一阶段时应失败，因为领域函数尚未实现。

```bash
python3 scripts/project_test.py document-extraction-desk --init my-document-extraction-desk
python3 scripts/project_test.py document-extraction-desk --stage 3 --path my-document-extraction-desk --strict
```

用标准库实现契约。先手动推演示例。保持调用方输入不变，对格式错误数据给出可采取行动的错误。测试导入你的工作区，绝不导入参考实现。

## 分层提示

1. 读取选择前检查指纹。
2. 选择必须标识一个有效的现有候选。
3. 根据所有必需字段计算就绪状态，而非决定数量。

## 预期结果

本阶段评分器报告第 1 到第 3 阶段的真实通过测试。完成全部四阶段后，用提供的样本运行工具，再换成自己的输入：

```bash
cd my-document-extraction-desk
python3 cli.py sample.txt --schema schema.json --output output/review.html
```

最终产物为本地 HTML 审核台，可下载绑定来源的批准决定和已批准 JSON 值映射。打开 HTML 并检查配套 JSON，不要只信退出码。改变一项输入，准确解释哪个结果必须变化。

## 扩展

添加独立审核者身份和决定时间戳，但不把它们当作密码学认证。

范围：核心读取 UTF-8 文本和明确标注的字段，不声称支持 OCR 或 PDF 解析。外部 OCR 或模型适配器可通过 --proposals 提供提案，但每条引用与偏移都会检查。来源正确不等于字段含义正确。

主要参考：[Python 正则表达式匹配偏移](https://docs.python.org/3/library/re.html#match-objects)。实现与练习数据均为原创教学示例。
