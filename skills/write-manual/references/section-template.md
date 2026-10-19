# 章节模板

复制骨架到 sections/<n>-<m>-<slug>.md，替换全部值，保留块顺序。示例的规范原文与运行记录保持英文原样，中文正文与可见标签对应翻译。

`````text
# CancelJob and terminal states

> Three terminal states end a job, the server chooses two of them, and CancelJob asks for the third.

Your client starts a long job and the user closes the window. The job keeps running and keeps spending money.

When you finish this section, you can tell the three endings apart, call `CancelJob`, and predict what a finished job answers.

## Terminal states

**Terminal state:** one of the three states that end a job: `DONE`, `FAILED`, and `CANCELED`.

```rule
label: the terminal rule
source: spec §3.4
---
"Once a job reaches a terminal state, it cannot restart."
```

```figure
id: fig-job-endings
kind: comparison
title: three ways a job ends
claim: The server chose two of these endings and the client chose one, and no call moves a job out of any of them.
caption: Each card is one job from the kit. Read the owner of the ending, then the final status. From capture/out/04-cancel.http.
```

```listing
title: the job after the cancel
source: capture/out/04-cancel.http
lang: json
note: Cut to the id and the state.
---
{
  "id": "job-0003",
  …
  "state": "CANCELED"
}
```

A second cancel gets an error, as §3.4 says for a job that is "already in a terminal state" {{spec §3.4}}.

```takeaways
- Stop every poll loop on all three terminal states.
- After a cancel that errors, read the job and act on its state.
```

Sources: spec §3.4 (research/sources/spec.md); capture/out/04-cancel.http
`````

## 各块规则

| 块 | 规则 |
|---|---|
| 标题 | 第一行，一个 #，使用规范名称 |
| 中心论点 | 标题下直接一行 >，一句，英文最多 30 词 |
| 开头 | 具体场景，前两段含“读完本节，你可以……” |
| 定义 | 段落以粗体术语加冒号开头，只定义一次，并加入术语表 |
| rule | label、source、分隔线、引文。source 第一个词为引用键 |
| figure | id、kind、title、claim、caption。id 小写连字符，figures 中存在对应 SVG |
| listing | title、source、lang、可选 note、分隔线、从源文件复制的行 |
| takeaways | 恰好一块，至少两项，每项为指令，英文最多 20 词 |
| 来源行 | 最后段以 Sources: 开头，列出全部来源文件和章节 |

## 示例截取

每行去掉两端空白后必须存在于源文件。行含 … 时，两侧至少三字符的每个片段都必须存在。单独一行 … 表示省略整行。note 说明省略内容。

## 引文

格式为 `{{key reference}}`，例如 `{{spec §3.1.5}}`、`{{proto TaskState}}`、`{{sdk src/server/handler.py}}`。首词为键，quoteSources 必须声明。至少 24 字符且后接引文的引用，会与对应归档来源逐字核对。

## 交叉引用

节链接使用 `[CancelJob](#s-4-4)`，图链接使用 `[图](#fig-job-endings)`，打印版补页码。仓库课程或文件使用路径，例如 `[课程](phases/13-tools-and-protocols/19-a2a-protocol)`。

## 参考节

参考节有标题、中心论点、Sources 行，不需要成果句和要点块。参考篇包含方法表、对象字段、状态、错误、术语，最后是来源、冲突表和空 figure-index 块。
