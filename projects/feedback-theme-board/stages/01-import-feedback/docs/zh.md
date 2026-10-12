# 以稳定身份导入反馈

**类型：** Build
**语言：** TypeScript
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时，需先完成链接中的前置内容
**前置要求：** [开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

## 构建内容

本阶段推进反馈主题看板：用可检查的短语证据为产品反馈分组，统计不同来源，并导出本地 issue 草稿。

公开契约为 `parseFeedback(text); validateThemes(value)`。随附 CLI 和样本文件位于你的工作区；在 `main.ts` 中实现领域函数。保留签名，使其他应用也能调用同一边界。

## 推演机制

每条反馈记录都需要 ID、原始文本和来源标签。ID 标识记录，来源标签标识计数时使用的声明来源。它们不可互换：同一个来源可以提交多条记录。

逐物理行读取 JSONL，即使跳过空行，也保留错误行号。单独校验主题配置。主题具有稳定 ID、显示标题和少量单词短语。有界输入大小让教学流程可预测。

| 记录 | 来源 | 含义 |
|---|---|---|
| f-1 | interview-a | 一条反馈记录 |
| f-3 | interview-a | 另一条记录，相同来源标签 |
| f-4 | interview-c | 不同来源标签 |

## 运行前先预测

在错误 JSON 前插入空行，预测报告的物理行号。然后复制一个 ID，解释它为何必须失败。

```figure
pj-feedback-theme-board-1
```

修改图表输入并检查计算值。把一个改变后的结果对应到你的实现中的某一行；图表是解释模型，不是真实程序的替代品。

## 构建与验证

从仓库根目录初始化一次。这会复制公开类型、函数桩、真实命令包装器和原创样本输入。全新的第一阶段应当失败，因为领域函数尚未实现。

```bash
python3 scripts/project_test.py feedback-theme-board --init my-feedback-theme-board
python3 scripts/project_test.py feedback-theme-board --stage 1 --path my-feedback-theme-board --strict
```

用标准库实现契约。先手工推演示例。保持调用者输入不变，以可操作的错误拒绝不合法数据。测试导入你的工作区，绝不导入参考方案。

## 逐级提示

1. 过滤空行前先计数行号。
2. 拒绝重复记录 ID。
3. 匹配任何反馈前先校验有界短语。

## 预期结果

本阶段评分器应报告第 1 至第 1 阶段的真实测试通过。完成全部四阶段后，用随附样本运行交付工具，再换成自己的输入：

```bash
cd my-feedback-theme-board
node cli.ts sample.jsonl themes.json output
```

最终产物是可移植证据看板、JSON 摘要和未发送的 Markdown 调查草稿。打开 HTML 并检查配套 JSON，不要只相信退出码。修改一个输入，准确解释哪个结果必须改变。

## 扩展

为导出的支持工单 CSV 创建加载器，输出完全符合这个 JSONL 契约的数据。

范围：基线匹配显式单词短语，不判断语义情感或真相。不同来源标签不等于经过验证的人数或市场规模。可选模型建议生成独立的配置提案，使用前必须审核；不会向 issue 跟踪器发布任何内容。

主要参考：[JSON 文本交换，RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)。实现和练习数据均为原创教学示例。
