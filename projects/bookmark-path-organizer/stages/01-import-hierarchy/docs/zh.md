# 按原始层级导入书签

**类型：** Build
**语言：** TypeScript
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

展开文件夹树，同时保留原始 URL 和每一级祖先文件夹。

## 公开契约

```typescript
importBookmarks(input: unknown): Bookmark[]
```

输入是文件夹 `{title,children}` 或书签 `{id,title,url,notes?}` 的数组。返回 `{id,title,url,notes,folders:string[]}`。ID 必须唯一；notes 默认为空字符串。校验无凭据的绝对 HTTP(S) URL。文件夹嵌套最多 32 层。第 1 阶段可直接校验 URL；normalizeURL 在第 2 阶段引入。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

文件夹 `Maps / Basics` 包含书签 `a` 时，生成 `folders:["Maps","Basics"]`；原始 `https://EXAMPLE.invalid/#intro` 原样保留。空输入返回 `[]`。

```figure
pj-bookmark-path-organizer-1
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py bookmark-path-organizer --init my-bookmark-path-organizer
python3 scripts/project_test.py bookmark-path-organizer --stage 1 --path my-bookmark-path-organizer --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

拒绝重复 ID、缺失标题、非字符串 notes 和不安全协议。递归时复制祖先数组，不要共用一个数组。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-bookmark-path-organizer
node cli.ts sample.json output
```

独立阅读路径页面，以及保留原始 URL 的 bookmarks.json。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

为一种浏览器导出格式添加导入适配器，保留这个带类型的边界。

范围：导入器读取文档规定的 JSON 文件夹树，不接受任意浏览器 HTML。由于移除了片段标识，URL 相等以文档为单位；查询字符串仍有意义。排序使用词法 token，不用远程模型。从不获取链接内容。
