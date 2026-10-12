# 在合格文本节点中匹配短语

**类型：** Build
**语言：** TypeScript
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

在每个单词边界定位最长合格短语。

## 公开契约

```typescript
matchTerms(text: string, terms: Term[]): Match[]
```

返回有序且不重叠的 `{termId,start,end,text}`，使用从零开始的 UTF-16 偏移，end 不包含在内。匹配不区分大小写。单词字符为 Unicode 字母、数字和下划线。每个位置优先最长短语。HTML 解析在下一阶段实现。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

在 `Map scale, then map` 中，偏移 0..9 选中 map scale，16..19 选中 map。独立 map 定义不能占用更长短语的起点。

```figure
pj-glossary-hovercard-publisher-2
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py glossary-hovercard-publisher --init my-glossary-hovercard-publisher
python3 scripts/project_test.py glossary-hovercard-publisher --stage 2 --path my-glossary-hovercard-publisher --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

map 不能在 mapping 内部匹配。同一起点上 map scale 优先于 map。保留原始显示大小写。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-glossary-hovercard-publisher
node cli.ts sample.json output
```

带注解的 HTML 课程、glossary.json 和术语覆盖报告。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

增加特定语言区域的分词，解释边界变化。

范围：输入 HTML 是刻意限定的小子集中的配对完整片段，不是任意网页 HTML。短语绝不跨越元素或实体边界。原生按钮提供键盘交互；术语质量仍需编辑判断。
