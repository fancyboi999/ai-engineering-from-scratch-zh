# 在上下文中渲染无障碍定义

**类型：** Build
**语言：** TypeScript
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

插入可用键盘操作的定义，不改变代码或链接。

## 公开契约

```typescript
annotateLesson(html: string, terms: Term[]): {html: string; coverage: Coverage[]}
```

使用文档规定的有界 HTML 片段子集。合格文本排除具有 a、pre 和 code 祖先的文本。原生按钮通过键盘和指针展示定义。每个按钮及其初始隐藏定义都用 span 包装，使注解在段落、标题和强调中仍合法。切换时让 aria-expanded 与定义的 hidden 状态同步。Coverage 对每个术语返回一个 `{id,term,count}`，包括零匹配项。实体拆开匹配范围。要求嵌套配对完整，允许的属性带引号。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

对于 `<p>Map</p><code>map</code><a href="https://example.invalid">map</a>`，coverage 为 1。只有段落得到内联展开按钮和定义 span；代码和链接原样保留。

```figure
pj-glossary-hovercard-publisher-3
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py glossary-hovercard-publisher --init my-glossary-hovercard-publisher
python3 scripts/project_test.py glossary-hovercard-publisher --stage 3 --path my-glossary-hovercard-publisher --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

允许 p、h1-h4、ul、ol、li、em、strong、span、div、section、article、blockquote、code、pre、a、br 和 hr。属性为 class,id,title,lang，以及 a 上的 href。只允许 HTTP(S) 和本地片段链接。拒绝脚本、事件、不带引号的属性和错误嵌套。这是受限解析器，不是通用 HTML 清洗器。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-glossary-hovercard-publisher
node cli.ts sample.json output
```

带注解的 HTML 课程、glossary.json 和术语覆盖报告。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

若扩展到这个明确测试的子集之外，使用持续维护的 HTML 解析器。

范围：输入 HTML 是刻意限定的小子集中的配对完整片段，不是任意网页 HTML。短语绝不跨越元素或实体边界。原生按钮提供键盘交互；术语质量仍需编辑判断。
