# 匹配短语并保留原始文本范围

**类型：** Build
**语言：** TypeScript
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时，需先完成链接中的前置内容
**前置要求：** 前一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

## 构建内容

本阶段推进反馈主题看板：用可检查的短语证据为产品反馈分组，统计不同来源，并导出本地 issue 草稿。

公开契约为 `findEvidence(row, phrase)`。随附 CLI 和样本文件位于你的工作区；在 `main.ts` 中实现领域函数。保留签名，使其他应用也能调用同一边界。

## 推演机制

对原始文本分词，保留每个 token 的开始和结束位置。归一化 token 值用于匹配，但从原始字符串提取引文。连续 token 比较可以避免子串错误，例如在 slowdown 中匹配 slow。

本阶段证明规则为何匹配，不证明反馈符合事实或情感为负面。否定句仍可包含该短语。这个限制应保持可见，使后续用户能审核证据，而不是盲信分类标签。

| 文本 | 短语 | 结果 |
|---|---|---|
| Search results show old pages. | old pages | 准确的原文引文 |
| The old homepage changed. | old pages | 不匹配 |
| No more old pages appear. | old pages | 匹配，但需要解释 |

## 运行前先预测

在匹配短语前加一个 emoji。验证 JavaScript slice 用 UTF-16 偏移仍能还原引文。

```figure
pj-feedback-theme-board-2
```

修改图表输入并检查计算值。把一个改变后的结果对应到你的实现中的某一行；图表是解释模型，不是真实程序的替代品。

## 构建与验证

从仓库根目录初始化一次。这会复制公开类型、函数桩、真实命令包装器和原创样本输入。全新的第一阶段应当失败，因为领域函数尚未实现。

```bash
python3 scripts/project_test.py feedback-theme-board --init my-feedback-theme-board
python3 scripts/project_test.py feedback-theme-board --stage 2 --path my-feedback-theme-board --strict
```

用标准库实现契约。先手工推演示例。保持调用者输入不变，以可操作的错误拒绝不合法数据。测试导入你的工作区，绝不导入参考方案。

## 逐级提示

1. 保留每个原始 token 的 match.index。
2. 比较归一化 token 值，不比较归一化全文的偏移。
3. 返回最小匹配范围。

## 预期结果

本阶段评分器应报告第 1 至第 2 阶段的真实测试通过。完成全部四阶段后，用随附样本运行交付工具，再换成自己的输入：

```bash
cd my-feedback-theme-board
node cli.ts sample.jsonl themes.json output
```

最终产物是可移植证据看板、JSON 摘要和未发送的 Markdown 调查草稿。打开 HTML 并检查配套 JSON，不要只相信退出码。修改一个输入，准确解释哪个结果必须改变。

## 扩展

将否定审核标记作为独立启发式规则加入，测量其误报率。

范围：基线匹配显式单词短语，不判断语义情感或真相。不同来源标签不等于经过验证的人数或市场规模。可选模型建议生成独立的配置提案，使用前必须审核；不会向 issue 跟踪器发布任何内容。

主要参考：[JSON 文本交换，RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)。实现和练习数据均为原创教学示例。
