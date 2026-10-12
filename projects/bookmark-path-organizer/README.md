# 书签阅读路径整理器

帮助读者从导出的杂乱书签中整理出有用的集合。保守地归一化 URL、合并完全重复项，根据保存的标题和笔记为用户定义的主题评分，并将可编辑阅读路径导出为 HTML 和 JSON。

你将构建独立阅读路径页面，以及保留原始 URL 的 bookmarks.json。

## 用你自己的输入运行工具

需要 Node 22.18 或更新版本。无需安装包、API key、网络账号或 provider。

```bash
cd projects/bookmark-path-organizer/solution
node cli.ts sample.json output
```

`sample.json` 是原创项目数据。复制它、编辑值，再把新文件名传给同一命令。`node cli.ts --help` 说明各参数。导出 bookmarks.json、progress.json 和 report.html。将下载的进度文件作为第三个参数传入，即可恢复编辑后的顺序和已完成复选框。

## 自己动手构建

```bash
python3 scripts/project_test.py bookmark-path-organizer --init my-bookmark-path-organizer
python3 scripts/project_test.py bookmark-path-organizer --stage 1 --path my-bookmark-path-organizer --strict
python3 scripts/project_test.py bookmark-path-organizer --all --path my-bookmark-path-organizer --strict --report completion.json
```

在你实现第一阶段之前，首次运行会失败。初始 starter 提供全部公开类型、函数签名、CLI 包装器和输入 fixture。后续阶段在同一文件里增加行为。

1. [按原始层级导入书签](stages/01-import-hierarchy/docs/zh.md)
2. [归一化链接并解释重复分组](stages/02-explain-duplicates/docs/zh.md)
3. [为主题排序并组装阅读路径](stages/03-rank-reading-path/docs/zh.md)
4. [导出可编辑集合和进度文件](stages/04-export-progress/docs/zh.md)

## 契约与集成

- `importBookmarks(input: unknown): Bookmark[]`
- `normalizeURL(value: string): string; groupDuplicates(items: Bookmark[]): Group[]`
- `readingPath(groups: Group[], topics: Record<string,string[]>): Reading[]`
- `applyProgress(items: Reading[], value?: unknown): {items: Reading[]; progress: Progress}; renderCollection(items: Reading[], progress: Progress): string`

阅读阶段文档，了解准确的输入和返回结构、中间值推演、失败行为和留出案例。从 `main.ts` 导入这些函数，可在另一 TypeScript 程序中复用工具。HTML 在本地运行；按文档说明，下载的审核文件可以传回 CLI，它从不向第三方服务提交数据。

## 验证与范围

```bash
python3 scripts/project_test.py bookmark-path-organizer --all --solution --strict
```

导入器读取文档规定的 JSON 文件夹树，不接受任意浏览器 HTML。由于移除了片段标识，URL 相等以文档为单位；查询字符串仍有意义。排序使用词法 token，不用远程模型。从不获取链接内容。

核心实现、fixture 和课程正文均为原创。本地参考检查不授予学习者证书。学习者完成记录是完整评分器生成的自报证据，不是外部认证。
