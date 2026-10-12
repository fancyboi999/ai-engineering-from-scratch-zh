# 导出课程和可复用术语包

**类型：** Build
**语言：** TypeScript
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

交付一个独立课程，以及生成它时使用的准确术语表。

## 公开契约

```typescript
publishGlossary(lesson: string, terms: Term[]): {html: string; glossary: Term[]; coverage: Coverage[]}
```

返回完整 HTML 页面、术语表副本和覆盖率。页面包含真实注解课程和术语表下载按钮。每个术语按钮切换相邻定义 span 和 aria-expanded；原生按钮支持 Enter 和 Space 激活。JSON 导出必须通过 validateGlossary 往返校验。定义和嵌入 JSON 不得引入可执行 HTML。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

发布样本，打开生成课程，用 Tab 聚焦 map scale，再按 Enter。导出的术语表应原样通过校验，覆盖报告统计标准短语和别名。

```figure
pj-glossary-hovercard-publisher-4
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py glossary-hovercard-publisher --init my-glossary-hovercard-publisher
python3 scripts/project_test.py glossary-hovercard-publisher --stage 4 --path my-glossary-hovercard-publisher --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

含尖括号的定义是文本。完整页面必须保留未改动的代码和链接。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-glossary-hovercard-publisher
node cli.ts sample.json output
```

带注解的 HTML 课程、glossary.json 和术语覆盖报告。打开 `output/report.html`，检查配套机器可读文件。CLI 将 glossary.json 保存为普通 Term 数组。将其复用为下一输入文件的 glossary 字段，或从其他编辑器调用 validateGlossary(JSON.parse(...))。

## 扩展

为零覆盖术语增加审核队列。

范围：输入 HTML 是刻意限定的小子集中的配对完整片段，不是任意网页 HTML。短语绝不跨越元素或实体边界。原生按钮提供键盘交互；术语质量仍需编辑判断。
