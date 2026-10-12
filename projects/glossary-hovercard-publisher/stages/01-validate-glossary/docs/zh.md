# 校验术语、别名和原创定义

**类型：** Build
**语言：** TypeScript
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

构建经过审核的词典，让短语身份无歧义。

## 公开契约

```typescript
validateGlossary(value: unknown): Term[]
```

Term 为 `{id,term,aliases:string[],definition}`；aliases 默认为 []。ID 匹配 `[a-z][a-z0-9-]*`。要求非空文本，全部标准术语和别名的短语在不区分大小写时唯一。返回记录副本。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

术语 `map scale` 带别名 `scale ratio`，生成两个指向同一 id 的短语。新增术语若使用别名 `MAP SCALE`，必须在注解前失败。

```figure
pj-glossary-hovercard-publisher-1
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py glossary-hovercard-publisher --init my-glossary-hovercard-publisher
python3 scripts/project_test.py glossary-hovercard-publisher --stage 1 --path my-glossary-hovercard-publisher --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

不要让两个定义悄悄占用同一别名。预期 aliases 数组却收到字符串时要拒绝。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-glossary-hovercard-publisher
node cli.ts sample.json output
```

带注解的 HTML 课程、glossary.json 和术语覆盖报告。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

增加定义审核时间戳，不改变匹配行为。

范围：输入 HTML 是刻意限定的小子集中的配对完整片段，不是任意网页 HTML。短语绝不跨越元素或实体边界。原生按钮提供键盘交互；术语质量仍需编辑判断。
