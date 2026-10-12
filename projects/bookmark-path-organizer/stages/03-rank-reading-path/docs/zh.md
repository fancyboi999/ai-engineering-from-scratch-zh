# 为主题排序并组装阅读路径

**类型：** Build
**语言：** TypeScript
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

用可见的关键词证据为阅读集合排序。

## 公开契约

```typescript
readingPath(groups: Group[], topics: Record<string,string[]>): Reading[]
```

匹配小写 Unicode 单词 token。每个唯一关键词若出现在任一分组标题中，得 3 分；若出现在任一 notes 中，得 1 分；重复书签不增加分数。汇总主题分数，按分数降序再按 ID 排序。返回 `{id,title,url,originals,folders,topics,score,evidence}`，以第一条保存记录作为身份。主题关键词必须是非空字符串，设计上应为单个 token。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

对于主题 `Mapping:["map"]`，标题 `Map basics` 加 3 分；notes `Read this map first` 加 1 分，共 4 分。重复保存同一标题不会再加分。`Mapping guide` 不含 token `map`。

```figure
pj-bookmark-path-organizer-3
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py bookmark-path-organizer --init my-bookmark-path-organizer
python3 scripts/project_test.py bookmark-path-organizer --stage 3 --path my-bookmark-path-organizer --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

测试只出现在 notes 中的关键词，以及嵌在另一个词中的词。未匹配记录保留为零分。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-bookmark-path-organizer
node cli.ts sample.json output
```

独立阅读路径页面，以及保留原始 URL 的 bookmarks.json。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

先支持用户指定的前置依赖边，再为独立主题排序。

范围：导入器读取文档规定的 JSON 文件夹树，不接受任意浏览器 HTML。由于移除了片段标识，URL 相等以文档为单位；查询字符串仍有意义。排序使用词法 token，不用远程模型。从不获取链接内容。
