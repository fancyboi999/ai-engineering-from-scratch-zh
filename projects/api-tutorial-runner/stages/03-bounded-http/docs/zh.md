# 针对测试服务运行有界请求

**类型：** Build
**语言：** TypeScript
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

用有界的本地请求或明确选择的请求，测试真实 HTTP 通信。

## 公开契约

```typescript
runTutorial(steps:RequestStep[],baseURL:string,options?):Promise<Receipt[]>
```

Base URL 必须是无凭据的纯 HTTP(S) origin。默认仅允许字面回环地址；allowNetwork:true 表示明确选择提供的测试端点。单请求超时默认 1500 ms（最大 30000），响应 maxBytes 为 65536（最大 1048576）。URL 变量进行百分号编码，拒绝重定向，响应解析为 JSON，捕获前检查状态和深度相等断言。失败后停止其余请求并记录 skip 回执。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

样本本地服务器返回 title，但 read-loan 示例断言 bookName。create-loan 通过，read-loan 失败并记录源行号和响应体；return-loan 被跳过，不发送 DELETE。

```figure
pj-api-tutorial-runner-3
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py api-tutorial-runner --init my-api-tutorial-runner
python3 scripts/project_test.py api-tutorial-runner --stage 3 --path my-api-tutorial-runner --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

限制整个响应流，而不仅是连接建立。绝不跟随重定向离开所选 origin。缺失字段产生关联源文档的失败，而不是编造值。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-api-tutorial-runner
node cli.ts sample.json output
```

可重放请求清单、JUnit 结果和带注解的教程 HTML。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

只对幂等示例增加明确声明的重试策略。

范围：默认 fixture 是一个真实的临时回环 HTTP 服务器，提供编写好的 JSON 路由。这是教程检查器，不是生产负载测试器。外部测试端点需要 --allow-network 标志。响应为 JSON；重定向、流式协议、凭据和完整 OpenAPI 校验不在本子集范围内。
