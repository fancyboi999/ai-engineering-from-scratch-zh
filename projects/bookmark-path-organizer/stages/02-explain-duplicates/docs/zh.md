# 归一化链接并解释重复分组

**类型：** Build
**语言：** TypeScript
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

准确解释两个保存的链接为何指向同一文档。

## 公开契约

```typescript
normalizeURL(value: string): string; groupDuplicates(items: Bookmark[]): Group[]
```

使用 WHATWG URL 表示：主机名转小写，移除默认端口和片段标识。保留查询及其顺序、路径大小写和尾斜杠。按首次出现顺序返回分组 `{url,items,reason}`，其中原始记录是副本。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

`https://EXAMPLE.invalid:443/maps#intro` 和 `https://example.invalid/maps#scale` 都归一化为 `https://example.invalid/maps`。`?view=print` 仍是独立分组。样本将 12 条保存记录导入为 11 个文档分组。

```figure
pj-bookmark-path-organizer-2
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py bookmark-path-organizer --init my-bookmark-path-organizer
python3 scripts/project_test.py bookmark-path-organizer --stage 2 --path my-bookmark-path-organizer --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

看似追踪用途的查询也可能改变页面。不要删除查询参数，也不要合并 HTTP 与 HTTPS。拒绝凭据。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-bookmark-path-organizer
node cli.ts sample.json output
```

独立阅读路径页面，以及保留原始 URL 的 bookmarks.json。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

增加用户明确批准的追踪参数策略，并生成单独回执。

范围：导入器读取文档规定的 JSON 文件夹树，不接受任意浏览器 HTML。由于移除了片段标识，URL 相等以文档为单位；查询字符串仍有意义。排序使用词法 token，不用远程模型。从不获取链接内容。
