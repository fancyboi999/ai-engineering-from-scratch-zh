# 导出可编辑集合和进度文件

**类型：** Build
**语言：** TypeScript
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

在浏览器审核和下一次命令运行之间传递阅读顺序与完成状态。

## 公开契约

```typescript
applyProgress(items: Reading[], value?: unknown): {items: Reading[]; progress: Progress}; renderCollection(items: Reading[], progress: Progress): string
```

进度为 `{schemaVersion:1,order:string[],completed:string[]}`。order 是当前 ID 的完整排列；completed 包含唯一且已知的 ID。浏览器提供上移/下移、已读复选框和 JSON 下载。所有可见文本都经过转义，或通过 textContent 赋值。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

当前 ID 为 `["a","b"]` 时，审核 `{schemaVersion:1,order:["b","a"],completed:["a"]}` 将 b 渲染在 a 之前，并把 a 勾为已读。`["a","a"]` 不是排列，必须失败。

```figure
pj-bookmark-path-organizer-4
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py bookmark-path-organizer --init my-bookmark-path-organizer
python3 scripts/project_test.py bookmark-path-organizer --stage 4 --path my-bookmark-path-organizer --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

拒绝过时进度，而不是悄悄丢弃未知 ID。嵌入 JSON 时转义关闭 script 的文本。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-bookmark-path-organizer
node cli.ts sample.json output
```

独立阅读路径页面，以及保留原始 URL 的 bookmarks.json。打开 `output/report.html`，检查配套机器可读文件。用 `node cli.ts sample.json resumed-output progress.json` 传回下载的进度；比较新 progress.json 与显示顺序。

## 扩展

用明确的冲突报告，合并修订后集合之间的进度。

范围：导入器读取文档规定的 JSON 文件夹树，不接受任意浏览器 HTML。由于移除了片段标识，URL 相等以文档为单位；查询字符串仍有意义。排序使用词法 token，不用远程模型。从不获取链接内容。
