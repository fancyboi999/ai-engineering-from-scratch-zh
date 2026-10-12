# 跨步骤解析带类型的变量

**类型：** Build
**语言：** TypeScript
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

明确依赖关系，并保留捕获值的基本类型。

## 公开契约

```typescript
resolveValue(value:unknown,variables:Record<string,string|number|boolean>):unknown; captureVariables(body,declarations,previous?):Record<string,string|number|boolean>
```

完整字符串 {{name}} 解析为基本类型值；嵌入式占位符按字符串插值。遍历嵌套数组/对象，不修改输入。点分捕获路径只读取自身属性，包括数组索引。要求与声明的基本类型完全一致；名称不能覆盖先前变量。未知变量抛出错误。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

POST /loans 返回 `{id:41}`。以 number 类型捕获 loanId 得到 `{loanId:41}`；JSON `{"loan":"{{loanId}}"}` 解析为 `{"loan":41}`，请求路径则变为 /loans/41。

```figure
pj-api-tutorial-runner-2
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py api-tutorial-runner --init my-api-tutorial-runner
python3 scripts/project_test.py api-tutorial-runner --stage 2 --path my-api-tutorial-runner --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

不要求值表达式。捕获的数字 41 在 JSON body 中仍是数字，在路径替换中则是编码文本。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-api-tutorial-runner
node cli.ts sample.json output
```

可重放请求清单、JUnit 结果和带注解的教程 HTML。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

增加声明式 nullable 类型，明确处理，而不是宽松强制转换。

范围：默认 fixture 是一个真实的临时回环 HTTP 服务器，提供编写好的 JSON 路由。这是教程检查器，不是生产负载测试器。外部测试端点需要 --allow-network 标志。响应为 JSON；重定向、流式协议、凭据和完整 OpenAPI 校验不在本子集范围内。
