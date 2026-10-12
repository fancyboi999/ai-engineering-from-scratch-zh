# 发布证据和可审核的调查草稿

**类型：** Build
**语言：** TypeScript
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时，需先完成链接中的前置内容
**前置要求：** 前一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

## 构建内容

本阶段推进反馈主题看板：用可检查的短语证据为产品反馈分组，统计不同来源，并导出本地 issue 草稿。

公开契约为 `draftIssue(theme); renderBoard(board)`。随附 CLI 和样本文件位于你的工作区；在 `main.ts` 中实现领域函数。保留签名，使其他应用也能调用同一边界。

## 推演机制

看板应让来源引文比标题计数更容易检查。在每个主题旁渲染证据、来源标签和偏移；包含未匹配记录和重复计数。转义全部用户文本，包括来源标签。

每个主题导出一份本地 Markdown 调查草稿。草稿建议复现报告中的使用阻碍，不能把关键词匹配当作已确认缺陷。可选模型可通过 --suggest 建议主题规则，但其输出单独保存，在人工采纳前经过同样的 schema 校验。

| 产物 | 下一步 |
|---|---|
| board.html | 审核准确引文 |
| board.json | 在其他工具中比较运行 |
| first-run.md | 本地编辑调查草稿 |
| themes.proposed.json | 审核可选模型建议 |

## 运行前先预测

查看 first-run 计数及旁边两段引文。解释草稿为什么说一个来源标签，而不是两个客户。

```figure
pj-feedback-theme-board-4
```

修改图表输入并检查计算值。把一个改变后的结果对应到你的实现中的某一行；图表是解释模型，不是真实程序的替代品。

## 构建与验证

从仓库根目录初始化一次。这会复制公开类型、函数桩、真实命令包装器和原创样本输入。全新的第一阶段应当失败，因为领域函数尚未实现。

```bash
python3 scripts/project_test.py feedback-theme-board --init my-feedback-theme-board
python3 scripts/project_test.py feedback-theme-board --stage 4 --path my-feedback-theme-board --strict
```

用标准库实现契约。先手工推演示例。保持调用者输入不变，以可操作的错误拒绝不合法数据。测试导入你的工作区，绝不导入参考方案。

## 逐级提示

1. 用导出为 JSON 的同一个 board 对象渲染。
2. issue 写作保持本地且明确。
3. 模型建议配置与已采纳配置分开保存。

## 预期结果

本阶段评分器应报告第 1 至第 4 阶段的真实测试通过。完成全部四阶段后，用随附样本运行交付工具，再换成自己的输入：

```bash
cd my-feedback-theme-board
node cli.ts sample.jsonl themes.json output
```

最终产物是可移植证据看板、JSON 摘要和未发送的 Markdown 调查草稿。打开 HTML 并检查配套 JSON，不要只相信退出码。修改一个输入，准确解释哪个结果必须改变。

## 扩展

把 board.json 传给优先级工具，要求保留原始证据链接。

范围：基线匹配显式单词短语，不判断语义情感或真相。不同来源标签不等于经过验证的人数或市场规模。可选模型建议生成独立的配置提案，使用前必须审核；不会向 issue 跟踪器发布任何内容。

主要参考：[JSON 文本交换，RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)。实现和练习数据均为原创教学示例。
